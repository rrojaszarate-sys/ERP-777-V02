import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../../../core/config/supabase';
import { useTheme } from '../../../shared/components/theme';
import { registrarEntradaMasiva, registrarSalidaMasiva } from '../services/inventarioService';

// ============================================================================
// TIPOS
// ============================================================================

interface ProductoSesion {
  id: number;
  clave: string;
  nombre: string;
  unidad: string;
  cantidad: number;
  costo_unitario?: number;
  stock_disponible?: number;
}

interface SesionMovil {
  id: string;
  tipo: 'entrada' | 'salida';
  almacen_id: number;
  almacen_nombre: string;
  productos: ProductoSesion[];
  estado: 'activa' | 'pendiente' | 'completada' | 'cancelada';
  creado_por: string;
  fecha_creacion: string;
  fecha_actualizacion: string;
  notas?: string;
}

interface SesionReceiverProps {
  companyId: string;
  onMovimientoRegistrado?: () => void;
}

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

export const SesionReceiver: React.FC<SesionReceiverProps> = ({
  companyId,
  onMovimientoRegistrado,
}) => {
  const { paletteConfig, isDark } = useTheme();
  
  const [sesiones, setSesiones] = useState<SesionMovil[]>([]);
  const [sesionActiva, setSesionActiva] = useState<SesionMovil | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [referencia, setReferencia] = useState('');
  const [concepto, setConcepto] = useState('');
  const [codigoSesion, setCodigoSesion] = useState('');

  const themeColors = useMemo(() => ({
    primary: paletteConfig.primary,
    secondary: paletteConfig.secondary,
    background: isDark ? '#111827' : '#ffffff',
    card: isDark ? '#1f2937' : '#f9fafb',
    border: isDark ? '#374151' : '#e5e7eb',
    text: isDark ? '#f9fafb' : '#111827',
    textMuted: isDark ? '#9ca3af' : '#6b7280',
    success: '#10b981',
    warning: '#f59e0b',
    danger: '#ef4444',
  }), [paletteConfig, isDark]);

  // ============================================================================
  // CARGAR SESIONES
  // ============================================================================

  const cargarSesiones = useCallback(async () => {
    try {
      setLoading(true);

      // Intentar cargar desde Supabase
      const { data, error: dbError } = await supabase
        .from('sesiones_movil_inventario')
        .select('*')
        .eq('estado', 'pendiente')
        .order('fecha_creacion', { ascending: false });

      if (!dbError && data) {
        setSesiones(data);
      }

    } catch (err: any) {
      console.error('Error cargando sesiones:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargarSesiones();

    // Polling cada 10 segundos para nuevas sesiones
    const interval = setInterval(cargarSesiones, 10000);
    return () => clearInterval(interval);
  }, [cargarSesiones]);

  // ============================================================================
  // BUSCAR POR CÓDIGO
  // ============================================================================

  const buscarSesionPorCodigo = useCallback(async () => {
    if (!codigoSesion.trim()) {
      setError('Ingrese el código de sesión');
      return;
    }

    try {
      setLoading(true);

      // Buscar en Supabase
      const { data, error: dbError } = await supabase
        .from('sesiones_movil_inventario')
        .select('*')
        .eq('id', codigoSesion.trim())
        .single();

      if (dbError || !data) {
        // Si no está en DB, verificar si está en localStorage (mismo navegador)
        const localData = localStorage.getItem('sesion_movil_inventario');
        if (localData) {
          const sesionLocal = JSON.parse(localData);
          if (sesionLocal.id === codigoSesion.trim()) {
            setSesionActiva(sesionLocal);
            setShowModal(true);
            setError(null);
            return;
          }
        }
        setError('Sesión no encontrada');
        return;
      }

      setSesionActiva(data);
      setShowModal(true);
      setError(null);

    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [codigoSesion]);

  // ============================================================================
  // PROCESAR SESIÓN
  // ============================================================================

  const procesarSesion = useCallback(async () => {
    if (!sesionActiva) return;

    try {
      setProcessing(true);
      setError(null);

      const items = sesionActiva.productos.map(p => ({
        productoId: p.id,
        cantidad: p.cantidad,
        costoUnitario: p.costo_unitario,
      }));

      const referenciaFinal = referencia || `${sesionActiva.tipo.toUpperCase()}_${sesionActiva.id}`;
      const conceptoFinal = concepto || `${sesionActiva.tipo === 'entrada' ? 'Entrada' : 'Salida'} desde escaneo móvil`;

      if (sesionActiva.tipo === 'entrada') {
        await registrarEntradaMasiva(
          sesionActiva.almacen_id,
          items,
          referenciaFinal,
          conceptoFinal
        );
      } else {
        await registrarSalidaMasiva(
          sesionActiva.almacen_id,
          items,
          referenciaFinal,
          conceptoFinal
        );
      }

      // Actualizar estado de la sesión
      await supabase
        .from('sesiones_movil_inventario')
        .update({ estado: 'completada', fecha_actualizacion: new Date().toISOString() })
        .eq('id', sesionActiva.id);

      // Limpiar localStorage si existe
      const localData = localStorage.getItem('sesion_movil_inventario');
      if (localData) {
        const sesionLocal = JSON.parse(localData);
        if (sesionLocal.id === sesionActiva.id) {
          localStorage.removeItem('sesion_movil_inventario');
        }
      }

      setSuccess(`${sesionActiva.tipo === 'entrada' ? 'Entrada' : 'Salida'} registrada exitosamente con ${sesionActiva.productos.length} productos`);
      setShowModal(false);
      setSesionActiva(null);
      setReferencia('');
      setConcepto('');
      setCodigoSesion('');
      
      // Recargar sesiones
      cargarSesiones();
      
      // Callback
      if (onMovimientoRegistrado) {
        onMovimientoRegistrado();
      }

    } catch (err: any) {
      setError(err.message);
    } finally {
      setProcessing(false);
    }
  }, [sesionActiva, referencia, concepto, cargarSesiones, onMovimientoRegistrado]);

  // ============================================================================
  // CANCELAR SESIÓN
  // ============================================================================

  const cancelarSesion = useCallback(async (sesionId: string) => {
    try {
      await supabase
        .from('sesiones_movil_inventario')
        .update({ estado: 'cancelada' })
        .eq('id', sesionId);

      cargarSesiones();
    } catch (err: any) {
      setError(err.message);
    }
  }, [cargarSesiones]);

  // ============================================================================
  // CALCULAR TOTALES
  // ============================================================================

  const calcularTotales = (productos: ProductoSesion[]) => {
    const totalProductos = productos.length;
    const totalUnidades = productos.reduce((sum, p) => sum + p.cantidad, 0);
    const totalCosto = productos.reduce((sum, p) => sum + (p.cantidad * (p.costo_unitario || 0)), 0);
    return { totalProductos, totalUnidades, totalCosto };
  };

  // ============================================================================
  // EFECTOS PARA MENSAJES
  // ============================================================================

  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold" style={{ color: themeColors.text }}>
            Sesiones desde Móvil
          </h2>
          <p className="text-sm" style={{ color: themeColors.textMuted }}>
            Reciba y complete movimientos escaneados desde el teléfono
          </p>
        </div>
        <button
          onClick={cargarSesiones}
          className="px-4 py-2 rounded-lg flex items-center gap-2"
          style={{ backgroundColor: themeColors.card, color: themeColors.text }}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Actualizar
        </button>
      </div>

      {/* Mensajes */}
      {error && (
        <div className="mb-4 p-4 rounded-lg" style={{ backgroundColor: `${themeColors.danger}15` }}>
          <p className="font-medium" style={{ color: themeColors.danger }}>{error}</p>
        </div>
      )}
      {success && (
        <div className="mb-4 p-4 rounded-lg" style={{ backgroundColor: `${themeColors.success}15` }}>
          <p className="font-medium" style={{ color: themeColors.success }}>{success}</p>
        </div>
      )}

      {/* Buscar por código */}
      <div className="mb-6 p-4 rounded-xl" style={{ backgroundColor: themeColors.card }}>
        <h3 className="font-medium mb-3" style={{ color: themeColors.text }}>
          Buscar Sesión por Código
        </h3>
        <div className="flex gap-3">
          <input
            type="text"
            value={codigoSesion}
            onChange={(e) => setCodigoSesion(e.target.value)}
            placeholder="Ingrese el código de sesión (ej: MOV_1234567890_abc123)"
            className="flex-1 px-4 py-3 rounded-lg border"
            style={{
              backgroundColor: themeColors.background,
              borderColor: themeColors.border,
              color: themeColors.text,
            }}
          />
          <button
            onClick={buscarSesionPorCodigo}
            disabled={loading}
            className="px-6 py-3 rounded-lg font-medium text-white"
            style={{ backgroundColor: themeColors.primary }}
          >
            Buscar
          </button>
        </div>
        <p className="text-xs mt-2" style={{ color: themeColors.textMuted }}>
          El código aparece en la parte inferior de la pantalla del teléfono
        </p>
      </div>

      {/* Lista de sesiones pendientes */}
      <div className="mb-4">
        <h3 className="font-medium mb-3" style={{ color: themeColors.text }}>
          Sesiones Pendientes ({sesiones.length})
        </h3>
      </div>

      {loading && sesiones.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-8 h-8 border-4 border-t-transparent rounded-full animate-spin mx-auto mb-4"
               style={{ borderColor: themeColors.primary, borderTopColor: 'transparent' }} />
          <p style={{ color: themeColors.textMuted }}>Cargando sesiones...</p>
        </div>
      ) : sesiones.length === 0 ? (
        <div className="text-center py-12 rounded-xl" style={{ backgroundColor: themeColors.card }}>
          <svg className="w-16 h-16 mx-auto mb-4" fill="none" viewBox="0 0 24 24" 
               stroke={themeColors.textMuted} strokeWidth={1}>
            <path strokeLinecap="round" strokeLinejoin="round" 
                  d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
          <p className="font-medium mb-2" style={{ color: themeColors.text }}>
            No hay sesiones pendientes
          </p>
          <p className="text-sm" style={{ color: themeColors.textMuted }}>
            Las sesiones escaneadas desde el teléfono aparecerán aquí
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sesiones.map(sesion => {
            const { totalProductos, totalUnidades, totalCosto } = calcularTotales(sesion.productos);
            
            return (
              <div
                key={sesion.id}
                className="rounded-xl p-4 cursor-pointer hover:shadow-lg transition-shadow"
                style={{ backgroundColor: themeColors.card }}
                onClick={() => {
                  setSesionActiva(sesion);
                  setShowModal(true);
                }}
              >
                {/* Header de la tarjeta */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-10 h-10 rounded-full flex items-center justify-center"
                      style={{ 
                        backgroundColor: sesion.tipo === 'entrada' ? `${themeColors.success}20` : `${themeColors.warning}20`
                      }}
                    >
                      {sesion.tipo === 'entrada' ? (
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke={themeColors.success}>
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke={themeColors.warning}>
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                        </svg>
                      )}
                    </div>
                    <div>
                      <p className="font-bold text-sm" style={{ color: themeColors.text }}>
                        {sesion.tipo === 'entrada' ? 'Entrada' : 'Salida'}
                      </p>
                      <p className="text-xs" style={{ color: themeColors.textMuted }}>
                        {sesion.almacen_nombre}
                      </p>
                    </div>
                  </div>
                  <span 
                    className="px-2 py-1 rounded text-xs font-medium"
                    style={{ 
                      backgroundColor: `${themeColors.warning}20`,
                      color: themeColors.warning 
                    }}
                  >
                    Pendiente
                  </span>
                </div>

                {/* Estadísticas */}
                <div className="grid grid-cols-3 gap-2 mb-3">
                  <div className="text-center p-2 rounded-lg" style={{ backgroundColor: themeColors.background }}>
                    <p className="text-lg font-bold" style={{ color: themeColors.primary }}>{totalProductos}</p>
                    <p className="text-xs" style={{ color: themeColors.textMuted }}>Productos</p>
                  </div>
                  <div className="text-center p-2 rounded-lg" style={{ backgroundColor: themeColors.background }}>
                    <p className="text-lg font-bold" style={{ color: themeColors.primary }}>{totalUnidades}</p>
                    <p className="text-xs" style={{ color: themeColors.textMuted }}>Unidades</p>
                  </div>
                  <div className="text-center p-2 rounded-lg" style={{ backgroundColor: themeColors.background }}>
                    <p className="text-lg font-bold" style={{ color: themeColors.primary }}>
                      ${totalCosto.toLocaleString()}
                    </p>
                    <p className="text-xs" style={{ color: themeColors.textMuted }}>Valor</p>
                  </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between text-xs" style={{ color: themeColors.textMuted }}>
                  <span>
                    {new Date(sesion.fecha_creacion).toLocaleString('es-MX', { 
                      day: '2-digit', 
                      month: 'short', 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </span>
                  <span className="font-mono">{sesion.id.slice(-12)}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de confirmación */}
      {showModal && sesionActiva && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
        >
          <div 
            className="w-full max-w-2xl max-h-[90vh] rounded-2xl overflow-hidden flex flex-col"
            style={{ backgroundColor: themeColors.background }}
          >
            {/* Header del modal */}
            <div 
              className="px-6 py-4 flex items-center justify-between"
              style={{ 
                background: `linear-gradient(135deg, ${
                  sesionActiva.tipo === 'entrada' ? themeColors.success : themeColors.warning
                }, ${themeColors.primary})`
              }}
            >
              <div>
                <h3 className="text-xl font-bold text-white">
                  Confirmar {sesionActiva.tipo === 'entrada' ? 'Entrada' : 'Salida'}
                </h3>
                <p className="text-white/80 text-sm">
                  {sesionActiva.almacen_nombre} • {sesionActiva.productos.length} productos
                </p>
              </div>
              <button
                onClick={() => {
                  setShowModal(false);
                  setSesionActiva(null);
                }}
                className="p-2 rounded-full bg-white/20 text-white"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Contenido */}
            <div className="flex-1 overflow-auto p-6">
              {/* Referencia y concepto */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: themeColors.text }}>
                    Referencia (opcional)
                  </label>
                  <input
                    type="text"
                    value={referencia}
                    onChange={(e) => setReferencia(e.target.value)}
                    placeholder="Ej: FAC-001, OC-123"
                    className="w-full px-4 py-3 rounded-lg border"
                    style={{
                      backgroundColor: themeColors.card,
                      borderColor: themeColors.border,
                      color: themeColors.text,
                    }}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: themeColors.text }}>
                    Concepto (opcional)
                  </label>
                  <input
                    type="text"
                    value={concepto}
                    onChange={(e) => setConcepto(e.target.value)}
                    placeholder="Descripción del movimiento"
                    className="w-full px-4 py-3 rounded-lg border"
                    style={{
                      backgroundColor: themeColors.card,
                      borderColor: themeColors.border,
                      color: themeColors.text,
                    }}
                  />
                </div>
              </div>

              {/* Lista de productos */}
              <h4 className="font-medium mb-3" style={{ color: themeColors.text }}>
                Productos a registrar
              </h4>
              <div className="space-y-2 max-h-64 overflow-auto">
                {sesionActiva.productos.map((producto, index) => (
                  <div
                    key={producto.id}
                    className="flex items-center gap-4 p-3 rounded-lg"
                    style={{ backgroundColor: themeColors.card }}
                  >
                    <div 
                      className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white"
                      style={{ backgroundColor: themeColors.primary }}
                    >
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate" style={{ color: themeColors.text }}>
                        {producto.nombre}
                      </p>
                      <p className="text-sm" style={{ color: themeColors.textMuted }}>
                        {producto.clave} • {producto.unidad}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold" style={{ color: themeColors.primary }}>
                        {producto.cantidad}
                      </p>
                      {producto.costo_unitario && (
                        <p className="text-xs" style={{ color: themeColors.textMuted }}>
                          ${producto.costo_unitario.toFixed(2)} c/u
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Totales */}
              <div className="mt-4 p-4 rounded-lg" style={{ backgroundColor: themeColors.card }}>
                <div className="flex justify-between items-center">
                  <span style={{ color: themeColors.textMuted }}>Total de unidades:</span>
                  <span className="font-bold text-lg" style={{ color: themeColors.text }}>
                    {sesionActiva.productos.reduce((s, p) => s + p.cantidad, 0)}
                  </span>
                </div>
                {sesionActiva.tipo === 'entrada' && (
                  <div className="flex justify-between items-center mt-2">
                    <span style={{ color: themeColors.textMuted }}>Valor total estimado:</span>
                    <span className="font-bold text-lg" style={{ color: themeColors.success }}>
                      ${sesionActiva.productos.reduce((s, p) => s + (p.cantidad * (p.costo_unitario || 0)), 0).toLocaleString()}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Footer del modal */}
            <div 
              className="px-6 py-4 border-t flex items-center justify-between"
              style={{ borderColor: themeColors.border }}
            >
              <button
                onClick={() => cancelarSesion(sesionActiva.id)}
                className="px-4 py-2 rounded-lg"
                style={{ color: themeColors.danger }}
              >
                Cancelar Sesión
              </button>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowModal(false);
                    setSesionActiva(null);
                  }}
                  className="px-6 py-3 rounded-lg border"
                  style={{ borderColor: themeColors.border, color: themeColors.text }}
                >
                  Cerrar
                </button>
                <button
                  onClick={procesarSesion}
                  disabled={processing}
                  className="px-6 py-3 rounded-lg font-bold text-white disabled:opacity-50 flex items-center gap-2"
                  style={{ backgroundColor: themeColors.primary }}
                >
                  {processing ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Procesando...
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Confirmar y Registrar
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Link para móvil */}
      <div className="mt-8 p-6 rounded-xl border-2 border-dashed" style={{ borderColor: themeColors.border }}>
        <div className="flex items-center gap-4">
          <div 
            className="w-12 h-12 rounded-full flex items-center justify-center"
            style={{ backgroundColor: `${themeColors.primary}20` }}
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke={themeColors.primary}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                    d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
          </div>
          <div className="flex-1">
            <h4 className="font-bold" style={{ color: themeColors.text }}>
              Escanear desde el teléfono
            </h4>
            <p className="text-sm" style={{ color: themeColors.textMuted }}>
              Abra este link en su teléfono para escanear productos con la cámara
            </p>
          </div>
          <button
            onClick={() => {
              const url = `${window.location.origin}/inventario-erp/scanner`;
              navigator.clipboard.writeText(url);
              setSuccess('Link copiado al portapapeles');
            }}
            className="px-4 py-2 rounded-lg flex items-center gap-2"
            style={{ backgroundColor: themeColors.primary, color: 'white' }}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                    d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            Copiar Link
          </button>
        </div>
        <div 
          className="mt-4 p-3 rounded-lg font-mono text-sm break-all"
          style={{ backgroundColor: themeColors.card, color: themeColors.textMuted }}
        >
          {window.location.origin}/inventario-erp/scanner
        </div>
      </div>
    </div>
  );
};

export default SesionReceiver;
