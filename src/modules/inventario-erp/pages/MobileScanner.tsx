import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { supabase } from '../../../core/config/supabase';
import { useTheme } from '../../../shared/components/theme';

// ============================================================================
// TIPOS
// ============================================================================

interface ProductoEscaneado {
  id: number;
  clave: string;
  nombre: string;
  unidad: string;
  cantidad: number;
  costo_unitario?: number;
  stock_disponible?: number;
  categoria?: string;
}

interface SesionMovil {
  id: string;
  tipo: 'entrada' | 'salida';
  almacen_id: number;
  almacen_nombre: string;
  productos: ProductoEscaneado[];
  estado: 'activa' | 'pendiente' | 'completada' | 'cancelada';
  creado_por: string;
  fecha_creacion: string;
  fecha_actualizacion: string;
  notas?: string;
}

// Formatos soportados
const SUPPORTED_FORMATS = [
  Html5QrcodeSupportedFormats.QR_CODE,
  Html5QrcodeSupportedFormats.EAN_13,
  Html5QrcodeSupportedFormats.EAN_8,
  Html5QrcodeSupportedFormats.UPC_A,
  Html5QrcodeSupportedFormats.CODE_128,
  Html5QrcodeSupportedFormats.CODE_39,
];

// ============================================================================
// COMPONENTE PRINCIPAL - ESCÁNER MÓVIL
// ============================================================================

export const MobileScanner: React.FC = () => {
  const { paletteConfig, isDark } = useTheme();
  
  // Estados principales
  const [sesion, setSesion] = useState<SesionMovil | null>(null);
  const [productos, setProductos] = useState<ProductoEscaneado[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [showQuantityModal, setShowQuantityModal] = useState(false);
  const [productoActual, setProductoActual] = useState<ProductoEscaneado | null>(null);
  const [cantidad, setCantidad] = useState('1');
  const [costoUnitario, setCostoUnitario] = useState('');
  
  // Estados de UI
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [almacenes, setAlmacenes] = useState<any[]>([]);
  const [selectedAlmacen, setSelectedAlmacen] = useState<number | null>(null);
  const [tipoMovimiento, setTipoMovimiento] = useState<'entrada' | 'salida'>('salida');
  const [showSetup, setShowSetup] = useState(true);
  
  // Scanner ref
  const [scanner, setScanner] = useState<Html5Qrcode | null>(null);
  const [cameras, setCameras] = useState<{ id: string; label: string }[]>([]);
  const [selectedCamera, setSelectedCamera] = useState<string>('');

  const themeColors = useMemo(() => ({
    primary: paletteConfig.primary,
    secondary: paletteConfig.secondary,
    background: isDark ? '#111827' : '#f9fafb',
    card: isDark ? '#1f2937' : '#ffffff',
    border: isDark ? '#374151' : '#e5e7eb',
    text: isDark ? '#f9fafb' : '#111827',
    textMuted: isDark ? '#9ca3af' : '#6b7280',
    success: '#10b981',
    warning: '#f59e0b',
    danger: '#ef4444',
  }), [paletteConfig, isDark]);

  // ============================================================================
  // INICIALIZACIÓN
  // ============================================================================

  useEffect(() => {
    const init = async () => {
      try {
        // Verificar si hay sesión activa en localStorage
        const sesionGuardada = localStorage.getItem('sesion_movil_inventario');
        if (sesionGuardada) {
          const sesionData = JSON.parse(sesionGuardada);
          setSesion(sesionData);
          setProductos(sesionData.productos || []);
          setSelectedAlmacen(sesionData.almacen_id);
          setTipoMovimiento(sesionData.tipo);
          setShowSetup(false);
        }

        // Cargar almacenes
        const { data: almacenesData } = await supabase
          .from('almacenes_erp')
          .select('id, nombre')
          .eq('activo', true);
        
        setAlmacenes(almacenesData || []);

        // Obtener cámaras
        const devices = await Html5Qrcode.getCameras();
        setCameras(devices);
        
        // Preferir cámara trasera
        const backCamera = devices.find(d => 
          d.label.toLowerCase().includes('back') || 
          d.label.toLowerCase().includes('rear') ||
          d.label.toLowerCase().includes('trasera')
        );
        setSelectedCamera(backCamera?.id || devices[0]?.id || '');

      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    init();

    return () => {
      if (scanner) {
        scanner.stop().catch(() => {});
      }
    };
  }, []);

  // ============================================================================
  // FUNCIONES DE SESIÓN
  // ============================================================================

  const iniciarSesion = useCallback(() => {
    if (!selectedAlmacen) {
      setError('Seleccione un almacén');
      return;
    }

    const almacen = almacenes.find(a => a.id === selectedAlmacen);
    const nuevaSesion: SesionMovil = {
      id: `MOV_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      tipo: tipoMovimiento,
      almacen_id: selectedAlmacen,
      almacen_nombre: almacen?.nombre || '',
      productos: [],
      estado: 'activa',
      creado_por: 'mobile_user', // Se puede cambiar por el usuario real
      fecha_creacion: new Date().toISOString(),
      fecha_actualizacion: new Date().toISOString(),
    };

    setSesion(nuevaSesion);
    setProductos([]);
    localStorage.setItem('sesion_movil_inventario', JSON.stringify(nuevaSesion));
    setShowSetup(false);
  }, [selectedAlmacen, tipoMovimiento, almacenes]);

  const guardarSesion = useCallback(() => {
    if (sesion) {
      const sesionActualizada = {
        ...sesion,
        productos,
        fecha_actualizacion: new Date().toISOString(),
      };
      localStorage.setItem('sesion_movil_inventario', JSON.stringify(sesionActualizada));
      setSesion(sesionActualizada);
    }
  }, [sesion, productos]);

  const finalizarYEnviar = useCallback(async () => {
    if (!sesion || productos.length === 0) {
      setError('No hay productos para enviar');
      return;
    }

    try {
      setLoading(true);

      // Guardar en Supabase para que la computadora lo recoja
      const { error: dbError } = await supabase
        .from('sesiones_movil_inventario')
        .upsert({
          id: sesion.id,
          tipo: sesion.tipo,
          almacen_id: sesion.almacen_id,
          productos: productos,
          estado: 'pendiente',
          creado_por: sesion.creado_por,
          fecha_creacion: sesion.fecha_creacion,
          fecha_actualizacion: new Date().toISOString(),
        });

      if (dbError) {
        // Si la tabla no existe, solo guardar en localStorage con estado pendiente
        console.log('Guardando localmente:', dbError);
      }

      // Actualizar sesión local
      const sesionFinalizada = {
        ...sesion,
        productos,
        estado: 'pendiente' as const,
        fecha_actualizacion: new Date().toISOString(),
      };
      
      localStorage.setItem('sesion_movil_inventario', JSON.stringify(sesionFinalizada));
      setSesion(sesionFinalizada);
      
      setSuccessMessage(`Sesión ${sesion.id} lista para continuar en computadora`);
      
      // Detener scanner
      if (scanner) {
        await scanner.stop();
        setIsScanning(false);
      }

    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [sesion, productos, scanner]);

  const cancelarSesion = useCallback(() => {
    if (scanner) {
      scanner.stop().catch(() => {});
    }
    localStorage.removeItem('sesion_movil_inventario');
    setSesion(null);
    setProductos([]);
    setShowSetup(true);
    setIsScanning(false);
  }, [scanner]);

  // ============================================================================
  // FUNCIONES DE ESCANEO
  // ============================================================================

  const iniciarScanner = useCallback(async () => {
    if (!selectedCamera) {
      setError('No hay cámara disponible');
      return;
    }

    try {
      const html5QrCode = new Html5Qrcode('mobile-scanner-container', {
        formatsToSupport: SUPPORTED_FORMATS,
        verbose: false,
      });

      await html5QrCode.start(
        selectedCamera,
        {
          fps: 15,
          qrbox: { width: 280, height: 180 },
        },
        async (decodedText) => {
          // Buscar producto por código
          await buscarProducto(decodedText);
          
          // Vibración de feedback
          if (navigator.vibrate) {
            navigator.vibrate(100);
          }
        },
        () => {} // Silenciar errores de escaneo
      );

      setScanner(html5QrCode);
      setIsScanning(true);
      setError(null);

    } catch (err: any) {
      setError(`Error iniciando cámara: ${err.message}`);
    }
  }, [selectedCamera]);

  const detenerScanner = useCallback(async () => {
    if (scanner) {
      try {
        await scanner.stop();
      } catch (err) {
        console.error('Error deteniendo scanner:', err);
      }
      setScanner(null);
      setIsScanning(false);
    }
  }, [scanner]);

  const buscarProducto = useCallback(async (codigo: string) => {
    try {
      // Pausar scanner mientras se procesa
      if (scanner) {
        await scanner.pause();
      }

      const { data: producto, error: err } = await supabase
        .from('productos_erp')
        .select('id, clave, nombre, unidad, categoria, costo, precio_venta')
        .or(`codigo_qr.eq.${codigo},clave.eq.${codigo}`)
        .single();

      if (err || !producto) {
        setError(`Producto no encontrado: ${codigo}`);
        if (scanner) scanner.resume();
        return;
      }

      // Obtener stock si es salida
      let stockDisponible = 0;
      if (tipoMovimiento === 'salida' && selectedAlmacen) {
        const { data: entradas } = await supabase
          .from('movimientos_inventario_erp')
          .select('cantidad')
          .eq('producto_id', producto.id)
          .eq('almacen_id', selectedAlmacen)
          .in('tipo', ['entrada', 'ajuste']);

        const { data: salidas } = await supabase
          .from('movimientos_inventario_erp')
          .select('cantidad')
          .eq('producto_id', producto.id)
          .eq('almacen_id', selectedAlmacen)
          .eq('tipo', 'salida');

        const totalEntradas = (entradas || []).reduce((s, m) => s + m.cantidad, 0);
        const totalSalidas = (salidas || []).reduce((s, m) => s + m.cantidad, 0);
        stockDisponible = totalEntradas - totalSalidas;
      }

      // Verificar si ya está en la lista
      const existente = productos.find(p => p.id === producto.id);
      
      setProductoActual({
        id: producto.id,
        clave: producto.clave,
        nombre: producto.nombre,
        unidad: producto.unidad || 'PZA',
        cantidad: existente?.cantidad || 1,
        costo_unitario: producto.costo || 0,
        stock_disponible: stockDisponible,
        categoria: producto.categoria,
      });

      setCantidad(existente ? String(existente.cantidad) : '1');
      setCostoUnitario(producto.costo ? String(producto.costo) : '');
      setShowQuantityModal(true);

    } catch (err: any) {
      setError(err.message);
      if (scanner) scanner.resume();
    }
  }, [scanner, productos, tipoMovimiento, selectedAlmacen]);

  // ============================================================================
  // FUNCIONES DE PRODUCTOS
  // ============================================================================

  const agregarProducto = useCallback(() => {
    if (!productoActual) return;

    const cantidadNum = parseFloat(cantidad) || 0;
    const costoNum = parseFloat(costoUnitario) || 0;

    if (cantidadNum <= 0) {
      setError('La cantidad debe ser mayor a 0');
      return;
    }

    // Validar stock en salidas
    if (tipoMovimiento === 'salida' && productoActual.stock_disponible !== undefined) {
      if (cantidadNum > productoActual.stock_disponible) {
        setError(`Stock insuficiente. Disponible: ${productoActual.stock_disponible}`);
        return;
      }
    }

    const productoConCantidad: ProductoEscaneado = {
      ...productoActual,
      cantidad: cantidadNum,
      costo_unitario: tipoMovimiento === 'entrada' ? costoNum : undefined,
    };

    // Actualizar o agregar
    setProductos(prev => {
      const existente = prev.findIndex(p => p.id === productoActual.id);
      if (existente >= 0) {
        const nuevos = [...prev];
        nuevos[existente] = productoConCantidad;
        return nuevos;
      }
      return [...prev, productoConCantidad];
    });

    setShowQuantityModal(false);
    setProductoActual(null);
    setCantidad('1');
    setCostoUnitario('');
    setSuccessMessage(`${productoConCantidad.nombre} agregado`);
    
    // Reanudar scanner
    if (scanner) {
      setTimeout(() => scanner.resume(), 500);
    }

    // Guardar sesión
    setTimeout(guardarSesion, 100);
  }, [productoActual, cantidad, costoUnitario, tipoMovimiento, scanner, guardarSesion]);

  const eliminarProducto = useCallback((id: number) => {
    setProductos(prev => prev.filter(p => p.id !== id));
    setTimeout(guardarSesion, 100);
  }, [guardarSesion]);

  const editarCantidad = useCallback((producto: ProductoEscaneado) => {
    setProductoActual(producto);
    setCantidad(String(producto.cantidad));
    setCostoUnitario(producto.costo_unitario ? String(producto.costo_unitario) : '');
    setShowQuantityModal(true);
    
    if (scanner && isScanning) {
      scanner.pause();
    }
  }, [scanner, isScanning]);

  // ============================================================================
  // EFECTOS PARA MENSAJES
  // ============================================================================

  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  // ============================================================================
  // RENDER - CONFIGURACIÓN INICIAL
  // ============================================================================

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: themeColors.background }}>
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-t-transparent rounded-full animate-spin mx-auto mb-4" 
               style={{ borderColor: themeColors.primary, borderTopColor: 'transparent' }} />
          <p style={{ color: themeColors.textMuted }}>Cargando...</p>
        </div>
      </div>
    );
  }

  if (showSetup) {
    return (
      <div className="min-h-screen p-4" style={{ backgroundColor: themeColors.background }}>
        <div className="max-w-md mx-auto">
          {/* Header */}
          <div className="text-center mb-8 pt-8">
            <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center"
                 style={{ background: `linear-gradient(135deg, ${themeColors.primary}, ${themeColors.secondary})` }}>
              <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                      d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold mb-2" style={{ color: themeColors.text }}>
              Escaneo Móvil
            </h1>
            <p className="text-sm" style={{ color: themeColors.textMuted }}>
              Escanee productos con QR o código de barras
            </p>
          </div>

          {/* Formulario de configuración */}
          <div className="rounded-2xl p-6 space-y-6" style={{ backgroundColor: themeColors.card }}>
            {/* Tipo de movimiento */}
            <div>
              <label className="block text-sm font-medium mb-3" style={{ color: themeColors.text }}>
                Tipo de Movimiento
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setTipoMovimiento('entrada')}
                  className="p-4 rounded-xl border-2 transition-all"
                  style={{
                    borderColor: tipoMovimiento === 'entrada' ? themeColors.success : themeColors.border,
                    backgroundColor: tipoMovimiento === 'entrada' ? `${themeColors.success}15` : 'transparent',
                  }}
                >
                  <svg className="w-8 h-8 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke={tipoMovimiento === 'entrada' ? themeColors.success : themeColors.textMuted}>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  <span className="block font-medium" style={{ color: tipoMovimiento === 'entrada' ? themeColors.success : themeColors.text }}>
                    Entrada
                  </span>
                </button>
                
                <button
                  onClick={() => setTipoMovimiento('salida')}
                  className="p-4 rounded-xl border-2 transition-all"
                  style={{
                    borderColor: tipoMovimiento === 'salida' ? themeColors.warning : themeColors.border,
                    backgroundColor: tipoMovimiento === 'salida' ? `${themeColors.warning}15` : 'transparent',
                  }}
                >
                  <svg className="w-8 h-8 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke={tipoMovimiento === 'salida' ? themeColors.warning : themeColors.textMuted}>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                  </svg>
                  <span className="block font-medium" style={{ color: tipoMovimiento === 'salida' ? themeColors.warning : themeColors.text }}>
                    Salida
                  </span>
                </button>
              </div>
            </div>

            {/* Almacén */}
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: themeColors.text }}>
                Almacén
              </label>
              <select
                value={selectedAlmacen || ''}
                onChange={(e) => setSelectedAlmacen(Number(e.target.value))}
                className="w-full p-4 rounded-xl border text-lg"
                style={{
                  backgroundColor: themeColors.background,
                  borderColor: themeColors.border,
                  color: themeColors.text,
                }}
              >
                <option value="">Seleccionar almacén...</option>
                {almacenes.map(a => (
                  <option key={a.id} value={a.id}>{a.nombre}</option>
                ))}
              </select>
            </div>

            {/* Botón iniciar */}
            <button
              onClick={iniciarSesion}
              disabled={!selectedAlmacen}
              className="w-full py-4 rounded-xl font-bold text-white text-lg transition-all disabled:opacity-50"
              style={{ backgroundColor: themeColors.primary }}
            >
              Iniciar Escaneo
            </button>
          </div>

          {/* Info */}
          <p className="text-center text-xs mt-6" style={{ color: themeColors.textMuted }}>
            Los productos escaneados se guardarán y podrá continuar desde la computadora
          </p>
        </div>
      </div>
    );
  }

  // ============================================================================
  // RENDER - INTERFAZ DE ESCANEO
  // ============================================================================

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: themeColors.background }}>
      {/* Header compacto */}
      <div className="p-3 flex items-center justify-between" style={{ backgroundColor: themeColors.card }}>
        <div className="flex items-center gap-2">
          <div 
            className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ backgroundColor: tipoMovimiento === 'entrada' ? themeColors.success : themeColors.warning }}
          >
            {tipoMovimiento === 'entrada' ? (
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" />
              </svg>
            ) : (
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M20 12H4" />
              </svg>
            )}
          </div>
          <div>
            <p className="font-bold text-sm" style={{ color: themeColors.text }}>
              {tipoMovimiento === 'entrada' ? 'Entrada' : 'Salida'}
            </p>
            <p className="text-xs" style={{ color: themeColors.textMuted }}>
              {sesion?.almacen_nombre}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded-full text-sm font-bold text-white"
                style={{ backgroundColor: themeColors.primary }}>
            {productos.length}
          </span>
          <button
            onClick={cancelarSesion}
            className="p-2 rounded-full"
            style={{ backgroundColor: `${themeColors.danger}20` }}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke={themeColors.danger}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Mensajes */}
      {error && (
        <div className="mx-3 mt-2 p-3 rounded-lg" style={{ backgroundColor: `${themeColors.danger}20` }}>
          <p className="text-sm font-medium" style={{ color: themeColors.danger }}>{error}</p>
        </div>
      )}
      {successMessage && (
        <div className="mx-3 mt-2 p-3 rounded-lg" style={{ backgroundColor: `${themeColors.success}20` }}>
          <p className="text-sm font-medium" style={{ color: themeColors.success }}>{successMessage}</p>
        </div>
      )}

      {/* Área del scanner */}
      <div className="flex-shrink-0 p-3">
        <div 
          className="rounded-2xl overflow-hidden relative"
          style={{ backgroundColor: '#000', minHeight: isScanning ? '220px' : '120px' }}
        >
          {isScanning ? (
            <>
              <div id="mobile-scanner-container" className="w-full h-full" />
              <button
                onClick={detenerScanner}
                className="absolute bottom-3 right-3 px-4 py-2 rounded-lg bg-white/20 backdrop-blur-sm"
              >
                <span className="text-white text-sm font-medium">Pausar</span>
              </button>
            </>
          ) : (
            <button
              onClick={iniciarScanner}
              className="w-full h-full flex flex-col items-center justify-center py-8"
            >
              <svg className="w-12 h-12 text-white mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} 
                      d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
              </svg>
              <span className="text-white font-medium">Tocar para escanear</span>
              <span className="text-white/60 text-xs mt-1">QR o código de barras</span>
            </button>
          )}
        </div>
      </div>

      {/* Lista de productos */}
      <div className="flex-1 overflow-auto px-3 pb-24">
        {productos.length === 0 ? (
          <div className="text-center py-12">
            <svg className="w-16 h-16 mx-auto mb-4" fill="none" viewBox="0 0 24 24" 
                 stroke={themeColors.textMuted} strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" 
                    d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
            <p style={{ color: themeColors.textMuted }}>
              Escanee productos para agregarlos
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {productos.map((producto, index) => (
              <div
                key={producto.id}
                className="rounded-xl p-3 flex items-center gap-3"
                style={{ backgroundColor: themeColors.card }}
              >
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white"
                     style={{ backgroundColor: themeColors.primary }}>
                  {index + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate" style={{ color: themeColors.text }}>
                    {producto.nombre}
                  </p>
                  <p className="text-xs" style={{ color: themeColors.textMuted }}>
                    {producto.clave} • {producto.unidad}
                  </p>
                </div>
                <button
                  onClick={() => editarCantidad(producto)}
                  className="px-3 py-1 rounded-lg text-lg font-bold"
                  style={{ backgroundColor: `${themeColors.primary}20`, color: themeColors.primary }}
                >
                  {producto.cantidad}
                </button>
                <button
                  onClick={() => eliminarProducto(producto.id)}
                  className="p-2 rounded-full"
                  style={{ backgroundColor: `${themeColors.danger}15` }}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke={themeColors.danger}>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Barra inferior fija */}
      <div 
        className="fixed bottom-0 left-0 right-0 p-4 border-t"
        style={{ backgroundColor: themeColors.card, borderColor: themeColors.border }}
      >
        <div className="flex gap-3">
          <button
            onClick={guardarSesion}
            className="flex-1 py-3 rounded-xl font-medium border"
            style={{ borderColor: themeColors.border, color: themeColors.text }}
          >
            Guardar
          </button>
          <button
            onClick={finalizarYEnviar}
            disabled={productos.length === 0}
            className="flex-1 py-3 rounded-xl font-bold text-white disabled:opacity-50"
            style={{ backgroundColor: themeColors.primary }}
          >
            Enviar a PC →
          </button>
        </div>
        <p className="text-center text-xs mt-2" style={{ color: themeColors.textMuted }}>
          ID: {sesion?.id}
        </p>
      </div>

      {/* Modal de cantidad */}
      {showQuantityModal && productoActual && (
        <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div 
            className="w-full max-w-md rounded-t-3xl p-6 animate-slide-up"
            style={{ backgroundColor: themeColors.card }}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold" style={{ color: themeColors.text }}>
                {productoActual.nombre}
              </h3>
              <button
                onClick={() => {
                  setShowQuantityModal(false);
                  setProductoActual(null);
                  if (scanner) scanner.resume();
                }}
                className="p-2"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke={themeColors.textMuted}>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <p className="text-sm mb-4" style={{ color: themeColors.textMuted }}>
              {productoActual.clave} • {productoActual.unidad}
              {tipoMovimiento === 'salida' && productoActual.stock_disponible !== undefined && (
                <span className="ml-2 px-2 py-0.5 rounded text-xs" 
                      style={{ backgroundColor: `${themeColors.warning}20`, color: themeColors.warning }}>
                  Stock: {productoActual.stock_disponible}
                </span>
              )}
            </p>

            {/* Cantidad */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2" style={{ color: themeColors.text }}>
                Cantidad
              </label>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setCantidad(String(Math.max(1, (parseFloat(cantidad) || 1) - 1)))}
                  className="w-14 h-14 rounded-xl text-2xl font-bold"
                  style={{ backgroundColor: themeColors.background, color: themeColors.text }}
                >
                  -
                </button>
                <input
                  type="number"
                  value={cantidad}
                  onChange={(e) => setCantidad(e.target.value)}
                  className="flex-1 text-center text-3xl font-bold py-3 rounded-xl border"
                  style={{
                    backgroundColor: themeColors.background,
                    borderColor: themeColors.border,
                    color: themeColors.text,
                  }}
                />
                <button
                  onClick={() => setCantidad(String((parseFloat(cantidad) || 0) + 1))}
                  className="w-14 h-14 rounded-xl text-2xl font-bold"
                  style={{ backgroundColor: themeColors.background, color: themeColors.text }}
                >
                  +
                </button>
              </div>
            </div>

            {/* Costo unitario (solo en entradas) */}
            {tipoMovimiento === 'entrada' && (
              <div className="mb-6">
                <label className="block text-sm font-medium mb-2" style={{ color: themeColors.text }}>
                  Costo Unitario (opcional)
                </label>
                <input
                  type="number"
                  value={costoUnitario}
                  onChange={(e) => setCostoUnitario(e.target.value)}
                  placeholder="0.00"
                  className="w-full text-center text-xl py-3 rounded-xl border"
                  style={{
                    backgroundColor: themeColors.background,
                    borderColor: themeColors.border,
                    color: themeColors.text,
                  }}
                />
              </div>
            )}

            <button
              onClick={agregarProducto}
              className="w-full py-4 rounded-xl font-bold text-white text-lg"
              style={{ backgroundColor: themeColors.primary }}
            >
              {productos.find(p => p.id === productoActual.id) ? 'Actualizar' : 'Agregar'}
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slide-up {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
      `}</style>
    </div>
  );
};

export default MobileScanner;
