import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useAuth } from '../../../core/auth/AuthProvider';
import { useTheme } from '../../../shared/components/theme';
import { supabase } from '../../../core/config/supabase';
import {
  fetchDocumentoById,
  createDocumentoInventario,
  updateDocumentoInventario,
  buscarProductoPorQR,
} from '../services/documentosInventarioService';
import { fetchAlmacenes, fetchProductos } from '../services/inventarioService';
import { DualSignaturePanel } from './SignatureCapture';
import { QRScanner } from './QRScanner';
import type {
  TipoDocumentoInventario,
  DocumentoInventario,
  DocumentoInventarioFormData,
  DetalleFormData,
  Almacen,
  Producto,
} from '../types';

// Utilidad para timeout en promesas
const withTimeout = <T,>(promise: Promise<T>, ms: number, errorMsg: string): Promise<T> => {
  const timeout = new Promise<never>((_, reject) => 
    setTimeout(() => reject(new Error(`Timeout: ${errorMsg}`)), ms)
  );
  return Promise.race([promise, timeout]);
};

interface DocumentoInventarioFormProps {
  tipo: TipoDocumentoInventario;
  documentoId?: number | null;
  readOnly?: boolean;
  onClose: () => void;
  onSave: () => void;
}

export const DocumentoInventarioForm: React.FC<DocumentoInventarioFormProps> = ({
  tipo,
  documentoId,
  readOnly = false,
  onClose,
  onSave,
}) => {
  const { user } = useAuth();
  const companyId = user?.company_id;
  const { paletteConfig, isDark } = useTheme();

  // Estado del formulario
  const [formData, setFormData] = useState<DocumentoInventarioFormData>({
    tipo,
    fecha: new Date().toISOString().split('T')[0],
    almacen_id: null,
    evento_id: null,
    nombre_entrega: '',
    firma_entrega: null,
    nombre_recibe: '',
    firma_recibe: null,
    observaciones: '',
    detalles: [],
  });

  // Datos auxiliares
  const [almacenes, setAlmacenes] = useState<Almacen[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [eventos, setEventos] = useState<{ id: number; nombre: string }[]>([]);
  const [documento, setDocumento] = useState<DocumentoInventario | null>(null);

  // UI State
  const [loading, setLoading] = useState(true);
  const [loadingStep, setLoadingStep] = useState<string>('Iniciando...');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showScanner, setShowScanner] = useState(false);
  const [searchProduct, setSearchProduct] = useState('');
  const [showProductSelector, setShowProductSelector] = useState(false);
  
  // Lector USB/Inalámbrico
  const [scannerInput, setScannerInput] = useState('');
  const [scannerStatus, setScannerStatus] = useState<'idle' | 'scanning' | 'success' | 'error'>('idle');
  const [scannerMessage, setScannerMessage] = useState('');
  const scannerInputRef = useRef<HTMLInputElement>(null);

  const themeColors = useMemo(() => ({
    primary: paletteConfig.primary,
    secondary: paletteConfig.secondary,
    background: isDark ? '#1f2937' : '#ffffff',
    cardBg: isDark ? '#374151' : '#f9fafb',
    border: isDark ? '#4b5563' : '#e5e7eb',
    text: isDark ? '#f3f4f6' : '#111827',
    textMuted: isDark ? '#9ca3af' : '#6b7280',
  }), [paletteConfig, isDark]);

  const isEntrada = tipo === 'entrada';
  const isEditing = !!documentoId && !readOnly;
  const isViewing = readOnly;

  // Cargar datos iniciales con mejor manejo de errores
  useEffect(() => {
    const controller = new AbortController();
    let isMounted = true;

    const loadInitialData = async () => {
      if (!companyId) {
        setError('No se encontró el ID de la empresa');
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      
      try {
        // Cargar almacenes (con timeout de 10s)
        setLoadingStep('Cargando almacenes...');
        console.log('[DocumentoForm] Cargando almacenes...');
        const almacenesData = await withTimeout(
          fetchAlmacenes(companyId),
          10000,
          'La carga de almacenes tardó demasiado'
        );
        if (!isMounted) return;
        setAlmacenes(almacenesData || []);
        console.log('[DocumentoForm] Almacenes cargados:', almacenesData?.length || 0);
        
        // Cargar productos (con timeout de 15s)
        setLoadingStep('Cargando productos...');
        console.log('[DocumentoForm] Cargando productos...');
        const productosData = await withTimeout(
          fetchProductos(companyId, { limit: 100 }),
          15000,
          'La carga de productos tardó demasiado'
        );
        if (!isMounted) return;
        setProductos(productosData || []);
        console.log('[DocumentoForm] Productos cargados:', productosData?.length || 0);
        
        // Cargar eventos (opcional, con timeout corto)
        setLoadingStep('Cargando eventos...');
        try {
          const { data: eventosData, error: evtError } = await withTimeout(
            supabase
              .from('evt_eventos_erp')
              .select('id, nombre')
              .eq('company_id', companyId)
              .order('created_at', { ascending: false })
              .limit(50),
            5000,
            'Carga de eventos'
          );
          if (!isMounted) return;
          if (evtError) {
            console.warn('[DocumentoForm] Error cargando eventos:', evtError.message);
          }
          setEventos(eventosData || []);
        } catch (evtError: any) {
          console.warn('[DocumentoForm] No se pudieron cargar eventos:', evtError.message);
          setEventos([]);
        }

        // Si hay documento existente, cargarlo
        if (documentoId) {
          setLoadingStep('Cargando documento...');
          console.log('[DocumentoForm] Cargando documento:', documentoId);
          const doc = await withTimeout(
            fetchDocumentoById(documentoId),
            10000,
            'La carga del documento tardó demasiado'
          );
          if (!isMounted) return;
          if (doc) {
            setDocumento(doc);
            setFormData({
              tipo: doc.tipo,
              fecha: doc.fecha.split('T')[0],
              almacen_id: doc.almacen_id,
              evento_id: doc.evento_id,
              nombre_entrega: doc.nombre_entrega || '',
              firma_entrega: doc.firma_entrega,
              nombre_recibe: doc.nombre_recibe || '',
              firma_recibe: doc.firma_recibe,
              observaciones: doc.observaciones || '',
              detalles: doc.detalles?.map(d => ({
                producto_id: d.producto_id,
                producto: d.producto,
                cantidad: d.cantidad,
                observaciones: d.observaciones || '',
              })) || [],
            });
            console.log('[DocumentoForm] Documento cargado');
          }
        }
        
        setLoadingStep('Listo');
      } catch (err: any) {
        console.error('[DocumentoForm] Error cargando datos:', err);
        if (isMounted) {
          setError(`Error: ${err.message || 'Error desconocido al cargar datos'}`);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadInitialData();

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [companyId, documentoId]);

  // Manejar escaneo QR
  const handleQRScan = useCallback(async (code: string) => {
    if (!companyId) return;

    try {
      const producto = await buscarProductoPorQR(code, companyId);
      if (producto) {
        // Verificar si ya está en la lista
        const existingIndex = formData.detalles.findIndex(d => d.producto_id === producto.id);
        if (existingIndex >= 0) {
          // Incrementar cantidad
          const newDetalles = [...formData.detalles];
          newDetalles[existingIndex].cantidad += 1;
          setFormData(prev => ({ ...prev, detalles: newDetalles }));
        } else {
          // Agregar nuevo
          setFormData(prev => ({
            ...prev,
            detalles: [...prev.detalles, {
              producto_id: producto.id,
              producto: producto as Producto,
              cantidad: 1,
              observaciones: '',
            }],
          }));
        }
        setShowScanner(false);
      } else {
        alert(`Producto no encontrado: ${code}`);
      }
    } catch (err: any) {
      console.error('Error buscando producto:', err);
      alert('Error al buscar el producto');
    }
  }, [companyId, formData.detalles]);

  // Agregar producto manualmente
  const handleAddProduct = useCallback((producto: Producto) => {
    const existingIndex = formData.detalles.findIndex(d => d.producto_id === producto.id);
    if (existingIndex >= 0) {
      const newDetalles = [...formData.detalles];
      newDetalles[existingIndex].cantidad += 1;
      setFormData(prev => ({ ...prev, detalles: newDetalles }));
    } else {
      setFormData(prev => ({
        ...prev,
        detalles: [...prev.detalles, {
          producto_id: producto.id,
          producto,
          cantidad: 1,
          observaciones: '',
        }],
      }));
    }
    setShowProductSelector(false);
    setSearchProduct('');
  }, [formData.detalles]);

  // Procesar código del lector USB/Inalámbrico
  const handleScannerInput = useCallback(async (code: string) => {
    if (!code.trim()) return;
    
    setScannerStatus('scanning');
    setScannerMessage('Buscando producto...');
    
    try {
      // Buscar por código QR, clave, o código de barras
      const producto = productos.find(p => 
        p.codigo_qr === code || 
        p.clave === code ||
        p.codigo_qr?.toLowerCase() === code.toLowerCase() ||
        p.clave?.toLowerCase() === code.toLowerCase()
      );
      
      if (producto) {
        handleAddProduct(producto);
        setScannerStatus('success');
        setScannerMessage(`✓ ${producto.nombre}`);
        // Vibración de éxito si está disponible
        if (navigator.vibrate) navigator.vibrate(100);
      } else {
        // Buscar en la base de datos si no está en la lista local
        const result = await buscarProductoPorQR(code, companyId || '');
        if (result) {
          handleAddProduct(result);
          setScannerStatus('success');
          setScannerMessage(`✓ ${result.nombre}`);
          if (navigator.vibrate) navigator.vibrate(100);
        } else {
          setScannerStatus('error');
          setScannerMessage(`✗ Producto no encontrado: ${code}`);
          if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
        }
      }
    } catch (err: any) {
      setScannerStatus('error');
      setScannerMessage(`Error: ${err.message}`);
    }
    
    // Limpiar input y resetear estado después de 2 segundos
    setScannerInput('');
    setTimeout(() => {
      setScannerStatus('idle');
      setScannerMessage('');
      scannerInputRef.current?.focus();
    }, 2000);
  }, [productos, companyId, handleAddProduct]);

  // Manejar Enter en el campo del lector
  const handleScannerKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleScannerInput(scannerInput);
    }
  }, [scannerInput, handleScannerInput]);

  // Actualizar cantidad
  const handleUpdateCantidad = useCallback((index: number, cantidad: number) => {
    if (cantidad < 1) return;
    const newDetalles = [...formData.detalles];
    newDetalles[index].cantidad = cantidad;
    setFormData(prev => ({ ...prev, detalles: newDetalles }));
  }, [formData.detalles]);

  // Eliminar producto
  const handleRemoveProduct = useCallback((index: number) => {
    setFormData(prev => ({
      ...prev,
      detalles: prev.detalles.filter((_, i) => i !== index),
    }));
  }, []);

  // Guardar documento
  const handleSave = async () => {
    if (!companyId || !formData.almacen_id) {
      alert('Selecciona un almacén');
      return;
    }
    if (formData.detalles.length === 0) {
      alert('Agrega al menos un producto');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      if (documentoId) {
        await updateDocumentoInventario(documentoId, formData);
      } else {
        await createDocumentoInventario(formData, companyId, user?.id);
      }
      onSave();
      onClose();
    } catch (err: any) {
      console.error('Error guardando:', err);
      setError(err.message || 'Error al guardar el documento');
    } finally {
      setSaving(false);
    }
  };

  // Productos filtrados para selector
  const filteredProducts = useMemo(() => {
    if (!searchProduct) return productos.slice(0, 20);
    const term = searchProduct.toLowerCase();
    return productos.filter(p =>
      p.nombre.toLowerCase().includes(term) ||
      p.clave?.toLowerCase().includes(term) ||
      p.codigo_qr?.toLowerCase().includes(term)
    ).slice(0, 20);
  }, [productos, searchProduct]);

  // Total de productos
  const totalProductos = formData.detalles.reduce((sum, d) => sum + d.cantidad, 0);

  // Pantalla de carga con información de progreso
  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
        <div className="bg-white p-8 rounded-xl shadow-xl text-center max-w-md">
          <svg className="w-12 h-12 animate-spin mx-auto text-blue-600 mb-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <p className="text-gray-700 font-medium">{loadingStep}</p>
          <p className="text-gray-400 text-sm mt-2">Preparando formulario...</p>
          <button
            onClick={onClose}
            className="mt-4 px-4 py-2 text-sm text-gray-500 hover:text-gray-700"
          >
            Cancelar
          </button>
        </div>
      </div>
    );
  }

  // Pantalla de error
  if (error && !almacenes.length) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
        <div className="bg-white p-8 rounded-xl shadow-xl text-center max-w-md">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
            <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Error al cargar</h3>
          <p className="text-red-600 mb-4">{error}</p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
            >
              Cerrar
            </button>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Reintentar
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div
        className="w-full max-w-5xl max-h-[95vh] rounded-xl shadow-2xl overflow-hidden flex flex-col"
        style={{ backgroundColor: themeColors.background }}
      >
        {/* Header */}
        <div
          className="px-6 py-4 flex items-center justify-between"
          style={{ background: `linear-gradient(135deg, ${isEntrada ? '#3b82f6' : themeColors.primary}, ${themeColors.secondary})` }}
        >
          <div className="flex items-center gap-3">
            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <div>
              <h2 className="text-xl font-bold text-white">
                {isViewing ? 'Ver' : isEditing ? 'Editar' : 'Nuevo'} Documento de {isEntrada ? 'Entrada' : 'Salida'}
              </h2>
              {documento?.numero_documento && (
                <p className="text-sm text-white/80 font-mono">{documento.numero_documento}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!isViewing && (
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 rounded-lg font-medium bg-white/20 text-white hover:bg-white/30 transition-all disabled:opacity-50 flex items-center gap-2"
              >
                {saving ? (
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                )}
                Guardar
              </button>
            )}
            <button onClick={onClose} className="text-white hover:opacity-80 p-1">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6 space-y-6">
          {error && (
            <div className="p-4 rounded-lg bg-red-100 text-red-700">
              {error}
            </div>
          )}

          {/* Datos principales */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: themeColors.textMuted }}>
                Fecha <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={formData.fecha}
                onChange={(e) => setFormData(prev => ({ ...prev, fecha: e.target.value }))}
                disabled={isViewing}
                className="w-full px-3 py-2 rounded-lg border focus:ring-2 transition-all disabled:opacity-60"
                style={{
                  backgroundColor: themeColors.cardBg,
                  borderColor: themeColors.border,
                  color: themeColors.text,
                }}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: themeColors.textMuted }}>
                Almacén <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.almacen_id || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, almacen_id: e.target.value ? Number(e.target.value) : null }))}
                disabled={isViewing}
                className="w-full px-3 py-2 rounded-lg border focus:ring-2 transition-all disabled:opacity-60"
                style={{
                  backgroundColor: themeColors.cardBg,
                  borderColor: themeColors.border,
                  color: themeColors.text,
                }}
              >
                <option value="">Seleccionar...</option>
                {almacenes.map(a => (
                  <option key={a.id} value={a.id}>{a.nombre}</option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1" style={{ color: themeColors.textMuted }}>
                Evento (opcional)
              </label>
              <select
                value={formData.evento_id || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, evento_id: e.target.value ? Number(e.target.value) : null }))}
                disabled={isViewing}
                className="w-full px-3 py-2 rounded-lg border focus:ring-2 transition-all disabled:opacity-60"
                style={{
                  backgroundColor: themeColors.cardBg,
                  borderColor: themeColors.border,
                  color: themeColors.text,
                }}
              >
                <option value="">Sin evento</option>
                {eventos.map(e => (
                  <option key={e.id} value={e.id}>{e.nombre}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Productos */}
          <div className="rounded-xl border p-4" style={{ borderColor: themeColors.border, backgroundColor: themeColors.cardBg }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold flex items-center gap-2" style={{ color: themeColors.text }}>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
                Productos ({totalProductos})
              </h3>

              {!isViewing && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowScanner(true)}
                    className="px-3 py-1.5 rounded-lg flex items-center gap-2 text-sm font-medium text-white transition-all hover:opacity-90"
                    style={{ backgroundColor: themeColors.primary }}
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                    </svg>
                    Escanear QR
                  </button>
                  <button
                    onClick={() => setShowProductSelector(true)}
                    className="px-3 py-1.5 rounded-lg flex items-center gap-2 text-sm font-medium border transition-all hover:opacity-80"
                    style={{ borderColor: themeColors.border, color: themeColors.text }}
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Agregar manual
                  </button>
                </div>
              )}
            </div>

            {/* Campo de entrada para lector USB/Inalámbrico */}
            {!isViewing && (
              <div className="mb-4">
                <div className="flex items-center gap-2">
                  <div className="flex-1 relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2">
                      <svg className="w-5 h-5" style={{ color: scannerStatus === 'success' ? '#10b981' : scannerStatus === 'error' ? '#ef4444' : themeColors.textMuted }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                      </svg>
                    </div>
                    <input
                      ref={scannerInputRef}
                      type="text"
                      value={scannerInput}
                      onChange={(e) => setScannerInput(e.target.value)}
                      onKeyDown={handleScannerKeyDown}
                      placeholder="📟 Escanea con lector USB o escribe código..."
                      autoComplete="off"
                      className="w-full pl-10 pr-4 py-2.5 rounded-lg border-2 focus:ring-2 transition-all text-sm"
                      style={{
                        backgroundColor: themeColors.background,
                        borderColor: scannerStatus === 'success' ? '#10b981' : scannerStatus === 'error' ? '#ef4444' : scannerStatus === 'scanning' ? themeColors.primary : themeColors.border,
                        color: themeColors.text,
                      }}
                    />
                    {scannerStatus === 'scanning' && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <svg className="w-5 h-5 animate-spin" style={{ color: themeColors.primary }} fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => handleScannerInput(scannerInput)}
                    disabled={!scannerInput.trim() || scannerStatus === 'scanning'}
                    className="px-4 py-2.5 rounded-lg text-white font-medium text-sm disabled:opacity-50 transition-all"
                    style={{ backgroundColor: themeColors.primary }}
                  >
                    Buscar
                  </button>
                </div>
                {scannerMessage && (
                  <p className={`mt-1 text-sm font-medium ${scannerStatus === 'success' ? 'text-green-600' : scannerStatus === 'error' ? 'text-red-500' : ''}`}>
                    {scannerMessage}
                  </p>
                )}
                <p className="mt-1 text-xs" style={{ color: themeColors.textMuted }}>
                  💡 Conecta tu lector USB/Bluetooth y escanea. El código se agregará automáticamente.
                </p>
              </div>
            )}

            {formData.detalles.length === 0 ? (
              <div className="py-8 text-center" style={{ color: themeColors.textMuted }}>
                <svg className="w-12 h-12 mx-auto mb-2 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
                <p>No hay productos agregados</p>
                {!isViewing && <p className="text-sm">Escanea un QR o agrega productos manualmente</p>}
              </div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {formData.detalles.map((detalle, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-4 p-3 rounded-lg"
                    style={{ backgroundColor: themeColors.background }}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate" style={{ color: themeColors.text }}>
                        {detalle.producto?.nombre}
                      </p>
                      <p className="text-xs truncate" style={{ color: themeColors.textMuted }}>
                        {detalle.producto?.codigo_qr || detalle.producto?.codigo || detalle.producto?.sku}
                        {detalle.producto?.categoria && ` • ${(detalle.producto.categoria as any)?.nombre || detalle.producto.categoria}`}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      {!isViewing ? (
                        <>
                          <button
                            onClick={() => handleUpdateCantidad(index, detalle.cantidad - 1)}
                            disabled={detalle.cantidad <= 1}
                            className="w-8 h-8 rounded-lg flex items-center justify-center border disabled:opacity-30"
                            style={{ borderColor: themeColors.border, color: themeColors.text }}
                          >
                            -
                          </button>
                          <input
                            type="number"
                            min="1"
                            value={detalle.cantidad}
                            onChange={(e) => handleUpdateCantidad(index, Math.max(1, parseInt(e.target.value) || 1))}
                            className="w-16 text-center px-2 py-1 rounded-lg border"
                            style={{
                              backgroundColor: themeColors.background,
                              borderColor: themeColors.border,
                              color: themeColors.text,
                            }}
                          />
                          <button
                            onClick={() => handleUpdateCantidad(index, detalle.cantidad + 1)}
                            className="w-8 h-8 rounded-lg flex items-center justify-center border"
                            style={{ borderColor: themeColors.border, color: themeColors.text }}
                          >
                            +
                          </button>
                          <button
                            onClick={() => handleRemoveProduct(index)}
                            className="w-8 h-8 rounded-lg flex items-center justify-center"
                            style={{ backgroundColor: '#fee2e2', color: '#991b1b' }}
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </>
                      ) : (
                        <span className="font-bold text-lg" style={{ color: themeColors.primary }}>
                          x{detalle.cantidad}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Observaciones */}
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: themeColors.textMuted }}>
              Observaciones
            </label>
            <textarea
              value={formData.observaciones}
              onChange={(e) => setFormData(prev => ({ ...prev, observaciones: e.target.value }))}
              disabled={isViewing}
              rows={2}
              placeholder="Notas adicionales..."
              className="w-full px-3 py-2 rounded-lg border focus:ring-2 transition-all disabled:opacity-60 resize-none"
              style={{
                backgroundColor: themeColors.cardBg,
                borderColor: themeColors.border,
                color: themeColors.text,
              }}
            />
          </div>

          {/* Firmas */}
          <DualSignaturePanel
            nombreEntrega={formData.nombre_entrega}
            firmaEntrega={formData.firma_entrega}
            nombreRecibe={formData.nombre_recibe}
            firmaRecibe={formData.firma_recibe}
            onNombreEntregaChange={(v) => setFormData(prev => ({ ...prev, nombre_entrega: v }))}
            onFirmaEntregaChange={(v) => setFormData(prev => ({ ...prev, firma_entrega: v }))}
            onNombreRecibeChange={(v) => setFormData(prev => ({ ...prev, nombre_recibe: v }))}
            onFirmaRecibeChange={(v) => setFormData(prev => ({ ...prev, firma_recibe: v }))}
            disabled={isViewing}
          />
        </div>

        {/* Footer */}
        <div
          className="px-6 py-4 flex items-center justify-between border-t"
          style={{ borderColor: themeColors.border }}
        >
          <div className="text-sm" style={{ color: themeColors.textMuted }}>
            {formData.detalles.length} producto(s) • {totalProductos} unidad(es)
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg border transition-colors hover:opacity-80"
              style={{ borderColor: themeColors.border, color: themeColors.text }}
            >
              {isViewing ? 'Cerrar' : 'Cancelar'}
            </button>
            {!isViewing && (
              <button
                onClick={handleSave}
                disabled={saving || formData.detalles.length === 0 || !formData.almacen_id}
                className="px-6 py-2 rounded-lg font-medium text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                style={{ backgroundColor: themeColors.primary }}
              >
                {saving && (
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                )}
                Guardar Documento
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Scanner QR */}
      <QRScanner
        isOpen={showScanner}
        onScan={handleQRScan}
        onClose={() => setShowScanner(false)}
      />

      {/* Selector de producto manual */}
      {showProductSelector && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div
            className="w-full max-w-md max-h-[80vh] rounded-xl shadow-2xl overflow-hidden flex flex-col"
            style={{ backgroundColor: themeColors.background }}
          >
            <div className="p-4 border-b" style={{ borderColor: themeColors.border }}>
              <h3 className="font-semibold mb-3" style={{ color: themeColors.text }}>Seleccionar Producto</h3>
              <input
                type="text"
                value={searchProduct}
                onChange={(e) => setSearchProduct(e.target.value)}
                placeholder="Buscar por nombre, código, SKU..."
                autoFocus
                className="w-full px-3 py-2 rounded-lg border focus:ring-2 transition-all"
                style={{
                  backgroundColor: themeColors.cardBg,
                  borderColor: themeColors.border,
                  color: themeColors.text,
                }}
              />
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              {filteredProducts.length === 0 ? (
                <p className="text-center py-4" style={{ color: themeColors.textMuted }}>
                  No se encontraron productos
                </p>
              ) : (
                <div className="space-y-1">
                  {filteredProducts.map(producto => (
                    <button
                      key={producto.id}
                      onClick={() => handleAddProduct(producto)}
                      className="w-full text-left p-3 rounded-lg hover:opacity-80 transition-all"
                      style={{ backgroundColor: themeColors.cardBg }}
                    >
                      <p className="font-medium truncate" style={{ color: themeColors.text }}>
                        {producto.nombre}
                      </p>
                      <p className="text-xs truncate" style={{ color: themeColors.textMuted }}>
                        {producto.codigo_qr || producto.codigo || producto.sku || `ID: ${producto.id}`}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="p-4 border-t" style={{ borderColor: themeColors.border }}>
              <button
                onClick={() => { setShowProductSelector(false); setSearchProduct(''); }}
                className="w-full px-4 py-2 rounded-lg border transition-colors hover:opacity-80"
                style={{ borderColor: themeColors.border, color: themeColors.text }}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DocumentoInventarioForm;
