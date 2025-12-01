/**
 * SesionesMovilPage - Página para gestionar sesiones de escaneo móvil
 * 
 * Esta página permite:
 * - Ver sesiones pendientes de escaneo móvil
 * - Procesar sesiones y convertirlas en movimientos de inventario
 * - Generar QR para iniciar nuevas sesiones desde el móvil
 */

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../core/config/supabase';
import { QRCodeCanvas } from 'qrcode.react';
import { 
  Smartphone, 
  Package, 
  ArrowDownCircle, 
  ArrowUpCircle,
  Clock,
  CheckCircle,
  XCircle,
  RefreshCw,
  QrCode,
  Trash2,
  Play,
  AlertCircle,
  Link,
  Copy
} from 'lucide-react';
import toast from 'react-hot-toast';

// Tipos
interface ProductoSesion {
  id: number;
  clave: string;
  nombre: string;
  unidad: string;
  cantidad: number;
  costo_unitario?: number;
}

interface SesionMovil {
  id: string;
  tipo: 'entrada' | 'salida';
  almacen_id: number;
  productos: ProductoSesion[];
  estado: 'activa' | 'pendiente' | 'completada' | 'cancelada';
  creado_por?: string;
  notas?: string;
  fecha_creacion: string;
  fecha_actualizacion: string;
  fecha_completado?: string;
  movimientos_ids?: number[];
  almacen?: {
    nombre: string;
  };
}

interface Almacen {
  id: number;
  nombre: string;
  codigo?: string;
}

export const SesionesMovilPage: React.FC = () => {
  // Estado
  const [sesiones, setSesiones] = useState<SesionMovil[]>([]);
  const [almacenes, setAlmacenes] = useState<Almacen[]>([]);
  const [loading, setLoading] = useState(true);
  const [procesando, setProcesando] = useState<string | null>(null);
  const [filtroEstado, setFiltroEstado] = useState<string>('todas');
  const [showQRModal, setShowQRModal] = useState(false);
  const [nuevoTipo, setNuevoTipo] = useState<'entrada' | 'salida'>('entrada');
  const [nuevoAlmacen, setNuevoAlmacen] = useState<number | null>(null);
  const [sesionSeleccionada, setSesionSeleccionada] = useState<SesionMovil | null>(null);

  // Cargar datos
  const cargarDatos = useCallback(async () => {
    try {
      setLoading(true);
      
      // Cargar sesiones
      const { data: sesionesData, error: sesionesError } = await supabase
        .from('sesiones_movil_inventario')
        .select(`
          *,
          almacen:almacenes_erp(nombre)
        `)
        .order('fecha_creacion', { ascending: false });
      
      if (sesionesError) throw sesionesError;
      
      // Cargar almacenes
      const { data: almacenesData, error: almacenesError } = await supabase
        .from('almacenes_erp')
        .select('id, nombre, codigo')
        .eq('activo', true)
        .order('nombre');
      
      if (almacenesError) throw almacenesError;
      
      setSesiones(sesionesData || []);
      setAlmacenes(almacenesData || []);
      
      if (almacenesData && almacenesData.length > 0 && !nuevoAlmacen) {
        setNuevoAlmacen(almacenesData[0].id);
      }
    } catch (error) {
      console.error('Error cargando datos:', error);
      toast.error('Error al cargar sesiones');
    } finally {
      setLoading(false);
    }
  }, [nuevoAlmacen]);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  // Suscripción a cambios en tiempo real
  useEffect(() => {
    const channel = supabase
      .channel('sesiones_movil_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'sesiones_movil_inventario'
        },
        () => {
          cargarDatos();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [cargarDatos]);

  // Generar ID único para nueva sesión
  const generarSessionId = () => {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `MOV_${timestamp}_${random}`;
  };

  // Generar URL para escaneo móvil
  const generarURLEscaneo = (tipo: 'entrada' | 'salida', sessionId: string) => {
    const baseUrl = window.location.origin;
    return `${baseUrl}/inventario/scanner/${tipo}/${sessionId}?almacen=${nuevoAlmacen}`;
  };

  // Copiar URL al portapapeles
  const copiarURL = (url: string) => {
    navigator.clipboard.writeText(url);
    toast.success('URL copiada al portapapeles');
  };

  // Procesar sesión y crear movimientos
  const procesarSesion = async (sesion: SesionMovil) => {
    if (sesion.productos.length === 0) {
      toast.error('La sesión no tiene productos');
      return;
    }

    setProcesando(sesion.id);
    
    try {
      // Crear movimientos para cada producto
      const movimientos = sesion.productos.map(producto => ({
        producto_id: producto.id,
        almacen_id: sesion.almacen_id,
        tipo: sesion.tipo,
        cantidad: producto.cantidad,
        costo_unitario: producto.costo_unitario || 0,
        referencia: `Sesión móvil: ${sesion.id}`,
        notas: sesion.notas || 'Movimiento desde escaneo móvil',
        fecha: new Date().toISOString(),
        usuario: sesion.creado_por || 'sistema'
      }));

      const { data: movimientosCreados, error: movError } = await supabase
        .from('movimientos_inventario_erp')
        .insert(movimientos)
        .select('id');

      if (movError) throw movError;

      // Actualizar sesión como completada
      const movimientosIds = movimientosCreados?.map(m => m.id) || [];
      
      const { error: updateError } = await supabase
        .from('sesiones_movil_inventario')
        .update({
          estado: 'completada',
          movimientos_ids: movimientosIds
        })
        .eq('id', sesion.id);

      if (updateError) throw updateError;

      toast.success(`Sesión procesada: ${movimientosIds.length} movimientos creados`);
      cargarDatos();
    } catch (error) {
      console.error('Error procesando sesión:', error);
      toast.error('Error al procesar la sesión');
    } finally {
      setProcesando(null);
    }
  };

  // Cancelar sesión
  const cancelarSesion = async (sesionId: string) => {
    try {
      const { error } = await supabase
        .from('sesiones_movil_inventario')
        .update({ estado: 'cancelada' })
        .eq('id', sesionId);

      if (error) throw error;
      
      toast.success('Sesión cancelada');
      cargarDatos();
    } catch (error) {
      console.error('Error cancelando sesión:', error);
      toast.error('Error al cancelar la sesión');
    }
  };

  // Eliminar sesión
  const eliminarSesion = async (sesionId: string) => {
    if (!confirm('¿Está seguro de eliminar esta sesión?')) return;
    
    try {
      const { error } = await supabase
        .from('sesiones_movil_inventario')
        .delete()
        .eq('id', sesionId);

      if (error) throw error;
      
      toast.success('Sesión eliminada');
      cargarDatos();
    } catch (error) {
      console.error('Error eliminando sesión:', error);
      toast.error('Error al eliminar la sesión');
    }
  };

  // Filtrar sesiones
  const sesionesFiltradas = sesiones.filter(s => {
    if (filtroEstado === 'todas') return true;
    return s.estado === filtroEstado;
  });

  // Renderizar estado
  const renderEstado = (estado: string) => {
    const config = {
      activa: { icon: Clock, color: 'text-blue-500', bg: 'bg-blue-100', label: 'Activa' },
      pendiente: { icon: AlertCircle, color: 'text-yellow-500', bg: 'bg-yellow-100', label: 'Pendiente' },
      completada: { icon: CheckCircle, color: 'text-green-500', bg: 'bg-green-100', label: 'Completada' },
      cancelada: { icon: XCircle, color: 'text-red-500', bg: 'bg-red-100', label: 'Cancelada' }
    };
    
    const { icon: Icon, color, bg, label } = config[estado as keyof typeof config] || config.activa;
    
    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${bg} ${color}`}>
        <Icon className="w-3 h-3 mr-1" />
        {label}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center">
            <Smartphone className="w-7 h-7 mr-2 text-blue-600" />
            Sesiones de Escaneo Móvil
          </h1>
          <p className="text-gray-500 mt-1">
            Gestiona las sesiones de escaneo desde dispositivos móviles
          </p>
        </div>
        
        <div className="flex space-x-3">
          <button
            onClick={cargarDatos}
            className="px-4 py-2 border rounded-lg hover:bg-gray-50 flex items-center"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Actualizar
          </button>
          <button
            onClick={() => setShowQRModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center"
          >
            <QrCode className="w-4 h-4 mr-2" />
            Nueva Sesión
          </button>
        </div>
      </div>

      {/* Estadísticas rápidas */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Activas', estado: 'activa', icon: Clock, color: 'blue' },
          { label: 'Pendientes', estado: 'pendiente', icon: AlertCircle, color: 'yellow' },
          { label: 'Completadas', estado: 'completada', icon: CheckCircle, color: 'green' },
          { label: 'Canceladas', estado: 'cancelada', icon: XCircle, color: 'red' }
        ].map(({ label, estado, icon: Icon, color }) => {
          const count = sesiones.filter(s => s.estado === estado).length;
          return (
            <div 
              key={estado}
              className={`bg-white p-4 rounded-lg border cursor-pointer hover:shadow-md transition-shadow ${
                filtroEstado === estado ? `ring-2 ring-${color}-500` : ''
              }`}
              onClick={() => setFiltroEstado(filtroEstado === estado ? 'todas' : estado)}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">{label}</p>
                  <p className="text-2xl font-bold">{count}</p>
                </div>
                <Icon className={`w-8 h-8 text-${color}-500`} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Lista de sesiones */}
      <div className="bg-white rounded-lg border">
        <div className="p-4 border-b flex items-center justify-between">
          <h2 className="font-semibold">
            Sesiones {filtroEstado !== 'todas' ? `(${filtroEstado})` : ''}
          </h2>
          {filtroEstado !== 'todas' && (
            <button
              onClick={() => setFiltroEstado('todas')}
              className="text-sm text-blue-600 hover:underline"
            >
              Ver todas
            </button>
          )}
        </div>

        {sesionesFiltradas.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <Smartphone className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>No hay sesiones {filtroEstado !== 'todas' ? `con estado "${filtroEstado}"` : ''}</p>
            <button
              onClick={() => setShowQRModal(true)}
              className="mt-4 text-blue-600 hover:underline"
            >
              Crear nueva sesión
            </button>
          </div>
        ) : (
          <div className="divide-y">
            {sesionesFiltradas.map(sesion => (
              <div key={sesion.id} className="p-4 hover:bg-gray-50">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4">
                    {/* Icono de tipo */}
                    <div className={`p-3 rounded-full ${
                      sesion.tipo === 'entrada' ? 'bg-green-100' : 'bg-red-100'
                    }`}>
                      {sesion.tipo === 'entrada' ? (
                        <ArrowDownCircle className="w-6 h-6 text-green-600" />
                      ) : (
                        <ArrowUpCircle className="w-6 h-6 text-red-600" />
                      )}
                    </div>
                    
                    {/* Info */}
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-medium">{sesion.tipo === 'entrada' ? 'Entrada' : 'Salida'}</span>
                        {renderEstado(sesion.estado)}
                      </div>
                      <p className="text-sm text-gray-500 mt-1">
                        Almacén: {sesion.almacen?.nombre || `ID ${sesion.almacen_id}`}
                      </p>
                      <p className="text-sm text-gray-500">
                        {sesion.productos.length} producto(s) • 
                        {new Date(sesion.fecha_creacion).toLocaleString('es-MX')}
                      </p>
                      <p className="text-xs text-gray-400 font-mono mt-1">
                        ID: {sesion.id}
                      </p>
                    </div>
                  </div>

                  {/* Acciones */}
                  <div className="flex items-center space-x-2">
                    {sesion.estado === 'pendiente' && (
                      <button
                        onClick={() => procesarSesion(sesion)}
                        disabled={procesando === sesion.id}
                        className="px-3 py-1.5 bg-green-600 text-white text-sm rounded hover:bg-green-700 disabled:opacity-50 flex items-center"
                      >
                        {procesando === sesion.id ? (
                          <RefreshCw className="w-4 h-4 mr-1 animate-spin" />
                        ) : (
                          <Play className="w-4 h-4 mr-1" />
                        )}
                        Procesar
                      </button>
                    )}
                    
                    {(sesion.estado === 'activa' || sesion.estado === 'pendiente') && (
                      <button
                        onClick={() => cancelarSesion(sesion.id)}
                        className="px-3 py-1.5 border text-sm rounded hover:bg-gray-50 flex items-center"
                      >
                        <XCircle className="w-4 h-4 mr-1" />
                        Cancelar
                      </button>
                    )}
                    
                    <button
                      onClick={() => setSesionSeleccionada(sesion)}
                      className="px-3 py-1.5 border text-sm rounded hover:bg-gray-50"
                    >
                      Ver Detalles
                    </button>
                    
                    {(sesion.estado === 'completada' || sesion.estado === 'cancelada') && (
                      <button
                        onClick={() => eliminarSesion(sesion.id)}
                        className="p-1.5 text-red-500 hover:bg-red-50 rounded"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Preview de productos */}
                {sesion.productos.length > 0 && (
                  <div className="mt-3 ml-16 flex flex-wrap gap-2">
                    {sesion.productos.slice(0, 5).map((prod, idx) => (
                      <span 
                        key={idx}
                        className="inline-flex items-center px-2 py-1 bg-gray-100 rounded text-xs"
                      >
                        <Package className="w-3 h-3 mr-1" />
                        {prod.clave} × {prod.cantidad}
                      </span>
                    ))}
                    {sesion.productos.length > 5 && (
                      <span className="text-xs text-gray-500">
                        +{sesion.productos.length - 5} más
                      </span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal QR para nueva sesión */}
      {showQRModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h2 className="text-lg font-bold mb-4">Nueva Sesión de Escaneo</h2>
            
            <div className="space-y-4">
              {/* Tipo de movimiento */}
              <div>
                <label className="block text-sm font-medium mb-2">Tipo de Movimiento</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setNuevoTipo('entrada')}
                    className={`p-3 border rounded-lg flex items-center justify-center ${
                      nuevoTipo === 'entrada' ? 'border-green-500 bg-green-50' : ''
                    }`}
                  >
                    <ArrowDownCircle className={`w-5 h-5 mr-2 ${nuevoTipo === 'entrada' ? 'text-green-600' : ''}`} />
                    Entrada
                  </button>
                  <button
                    onClick={() => setNuevoTipo('salida')}
                    className={`p-3 border rounded-lg flex items-center justify-center ${
                      nuevoTipo === 'salida' ? 'border-red-500 bg-red-50' : ''
                    }`}
                  >
                    <ArrowUpCircle className={`w-5 h-5 mr-2 ${nuevoTipo === 'salida' ? 'text-red-600' : ''}`} />
                    Salida
                  </button>
                </div>
              </div>

              {/* Almacén */}
              <div>
                <label className="block text-sm font-medium mb-2">Almacén</label>
                <select
                  value={nuevoAlmacen || ''}
                  onChange={(e) => setNuevoAlmacen(Number(e.target.value))}
                  className="w-full border rounded-lg p-2"
                >
                  {almacenes.map(a => (
                    <option key={a.id} value={a.id}>
                      {a.nombre} {a.codigo ? `(${a.codigo})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* QR Code */}
              {nuevoAlmacen && (
                <div className="flex flex-col items-center p-4 bg-gray-50 rounded-lg">
                  <QRCodeCanvas
                    value={generarURLEscaneo(nuevoTipo, generarSessionId())}
                    size={200}
                    level="H"
                    includeMargin
                  />
                  <p className="text-sm text-gray-500 mt-2 text-center">
                    Escanea este código con tu teléfono para iniciar
                  </p>
                </div>
              )}

              {/* Link alternativo */}
              <div className="border-t pt-4">
                <p className="text-sm text-gray-500 mb-2">O comparte este enlace:</p>
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    readOnly
                    value={nuevoAlmacen ? generarURLEscaneo(nuevoTipo, generarSessionId()) : ''}
                    className="flex-1 text-xs border rounded p-2 bg-gray-50"
                  />
                  <button
                    onClick={() => copiarURL(generarURLEscaneo(nuevoTipo, generarSessionId()))}
                    className="p-2 border rounded hover:bg-gray-50"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            <div className="flex justify-end mt-6">
              <button
                onClick={() => setShowQRModal(false)}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de detalles de sesión */}
      {sesionSeleccionada && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-2xl max-h-[80vh] overflow-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">Detalles de la Sesión</h2>
              <button
                onClick={() => setSesionSeleccionada(null)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Info básica */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">ID</p>
                  <p className="font-mono text-sm">{sesionSeleccionada.id}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Estado</p>
                  {renderEstado(sesionSeleccionada.estado)}
                </div>
                <div>
                  <p className="text-sm text-gray-500">Tipo</p>
                  <p className="font-medium capitalize">{sesionSeleccionada.tipo}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Almacén</p>
                  <p>{sesionSeleccionada.almacen?.nombre || `ID ${sesionSeleccionada.almacen_id}`}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Creado</p>
                  <p>{new Date(sesionSeleccionada.fecha_creacion).toLocaleString('es-MX')}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Actualizado</p>
                  <p>{new Date(sesionSeleccionada.fecha_actualizacion).toLocaleString('es-MX')}</p>
                </div>
              </div>

              {/* Lista de productos */}
              <div>
                <p className="text-sm text-gray-500 mb-2">Productos ({sesionSeleccionada.productos.length})</p>
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left">Clave</th>
                        <th className="px-3 py-2 text-left">Nombre</th>
                        <th className="px-3 py-2 text-right">Cantidad</th>
                        <th className="px-3 py-2 text-left">Unidad</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {sesionSeleccionada.productos.map((prod, idx) => (
                        <tr key={idx}>
                          <td className="px-3 py-2 font-mono">{prod.clave}</td>
                          <td className="px-3 py-2">{prod.nombre}</td>
                          <td className="px-3 py-2 text-right font-medium">{prod.cantidad}</td>
                          <td className="px-3 py-2">{prod.unidad}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Notas */}
              {sesionSeleccionada.notas && (
                <div>
                  <p className="text-sm text-gray-500 mb-1">Notas</p>
                  <p className="bg-gray-50 p-3 rounded">{sesionSeleccionada.notas}</p>
                </div>
              )}

              {/* IDs de movimientos creados */}
              {sesionSeleccionada.movimientos_ids && sesionSeleccionada.movimientos_ids.length > 0 && (
                <div>
                  <p className="text-sm text-gray-500 mb-1">Movimientos Creados</p>
                  <p className="font-mono text-sm">
                    {sesionSeleccionada.movimientos_ids.join(', ')}
                  </p>
                </div>
              )}
            </div>

            <div className="flex justify-end mt-6 space-x-3">
              {sesionSeleccionada.estado === 'pendiente' && (
                <button
                  onClick={() => {
                    procesarSesion(sesionSeleccionada);
                    setSesionSeleccionada(null);
                  }}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center"
                >
                  <Play className="w-4 h-4 mr-2" />
                  Procesar Sesión
                </button>
              )}
              <button
                onClick={() => setSesionSeleccionada(null)}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
