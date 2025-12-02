/**
 * TransferenciasPage - Página de Transferencias entre Almacenes
 * Gestiona el movimiento de stock entre diferentes almacenes
 */

import React, { useState, useEffect } from 'react';
import { 
  ArrowLeftRight, 
  Plus, 
  Search,
  Truck,
  CheckCircle,
  XCircle,
  Clock,
  Send,
  FileCheck,
  Trash2,
  Eye,
  Filter
} from 'lucide-react';
import { supabase } from '../../../core/config/supabase';
import { 
  obtenerTransferencias, 
  crearTransferencia,
  cambiarEstadoTransferencia,
  eliminarTransferencia,
  obtenerResumenTransferencias,
  type Transferencia,
  type EstadoTransferencia,
  type FiltrosTransferencia,
  type CrearTransferenciaInput
} from '../services/transferenciasService';

// Badge de estado
const EstadoBadge: React.FC<{ estado: EstadoTransferencia }> = ({ estado }) => {
  const config: Record<EstadoTransferencia, { color: string; texto: string; icon: React.ElementType }> = {
    'borrador': { color: 'bg-gray-100 text-gray-800', texto: 'Borrador', icon: Clock },
    'pendiente_aprobacion': { color: 'bg-yellow-100 text-yellow-800', texto: 'Pend. Aprobación', icon: Clock },
    'aprobada': { color: 'bg-blue-100 text-blue-800', texto: 'Aprobada', icon: FileCheck },
    'en_transito': { color: 'bg-purple-100 text-purple-800', texto: 'En Tránsito', icon: Truck },
    'recibida_parcial': { color: 'bg-orange-100 text-orange-800', texto: 'Recibida Parcial', icon: CheckCircle },
    'recibida': { color: 'bg-green-100 text-green-800', texto: 'Recibida', icon: CheckCircle },
    'cancelada': { color: 'bg-red-100 text-red-800', texto: 'Cancelada', icon: XCircle }
  };
  
  const { color, texto, icon: Icon } = config[estado] || config['borrador'];
  
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${color}`}>
      <Icon className="w-3 h-3" />
      {texto}
    </span>
  );
};

// Modal de Nueva Transferencia
const ModalNuevaTransferencia: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onGuardar: (data: CrearTransferenciaInput) => Promise<void>;
  almacenes: { id: string; nombre: string }[];
  productos: { id: string; nombre: string; sku: string; unidad_medida: string }[];
}> = ({ isOpen, onClose, onGuardar, almacenes, productos }) => {
  const [formData, setFormData] = useState({
    almacen_origen_id: '',
    almacen_destino_id: '',
    notas: ''
  });
  const [detalles, setDetalles] = useState<{
    producto_id: string;
    cantidad_solicitada: number;
    notas: string;
  }[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const agregarLinea = () => {
    setDetalles([...detalles, { producto_id: '', cantidad_solicitada: 1, notas: '' }]);
  };

  const eliminarLinea = (index: number) => {
    setDetalles(detalles.filter((_, i) => i !== index));
  };

  const actualizarLinea = (index: number, campo: string, valor: string | number) => {
    const nuevosDetalles = [...detalles];
    nuevosDetalles[index] = { ...nuevosDetalles[index], [campo]: valor };
    setDetalles(nuevosDetalles);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.almacen_origen_id || !formData.almacen_destino_id) {
      setError('Seleccione almacén de origen y destino');
      return;
    }
    if (formData.almacen_origen_id === formData.almacen_destino_id) {
      setError('El origen y destino deben ser diferentes');
      return;
    }
    if (detalles.length === 0) {
      setError('Agregue al menos un producto');
      return;
    }
    if (detalles.some(d => !d.producto_id || d.cantidad_solicitada <= 0)) {
      setError('Complete todos los productos con cantidades válidas');
      return;
    }

    setLoading(true);
    setError('');
    try {
      await onGuardar({
        ...formData,
        detalles
      });
      onClose();
      setFormData({ almacen_origen_id: '', almacen_destino_id: '', notas: '' });
      setDetalles([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear transferencia');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        <div className="px-6 py-4 border-b bg-gradient-to-r from-purple-600 to-indigo-600">
          <h2 className="text-xl font-semibold text-white flex items-center gap-2">
            <ArrowLeftRight className="w-6 h-6" />
            Nueva Transferencia entre Almacenes
          </h2>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Almacenes */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Almacén Origen *
              </label>
              <select
                value={formData.almacen_origen_id}
                onChange={(e) => setFormData({ ...formData, almacen_origen_id: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                required
              >
                <option value="">Seleccionar...</option>
                {almacenes.map(a => (
                  <option key={a.id} value={a.id}>{a.nombre}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Almacén Destino *
              </label>
              <select
                value={formData.almacen_destino_id}
                onChange={(e) => setFormData({ ...formData, almacen_destino_id: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                required
              >
                <option value="">Seleccionar...</option>
                {almacenes.filter(a => a.id !== formData.almacen_origen_id).map(a => (
                  <option key={a.id} value={a.id}>{a.nombre}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Notas */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notas / Motivo
            </label>
            <textarea
              value={formData.notas}
              onChange={(e) => setFormData({ ...formData, notas: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
              rows={2}
              placeholder="Ej: Reabastecimiento sucursal norte..."
            />
          </div>

          {/* Productos */}
          <div className="mb-4">
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm font-medium text-gray-700">
                Productos a Transferir
              </label>
              <button
                type="button"
                onClick={agregarLinea}
                className="text-sm text-purple-600 hover:text-purple-700 flex items-center gap-1"
              >
                <Plus className="w-4 h-4" />
                Agregar Producto
              </button>
            </div>
            
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Producto</th>
                    <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 w-24">Cantidad</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 w-32">Notas</th>
                    <th className="px-3 py-2 w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {detalles.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-3 py-8 text-center text-gray-400">
                        No hay productos agregados
                      </td>
                    </tr>
                  ) : (
                    detalles.map((det, index) => (
                      <tr key={index} className="border-t">
                        <td className="px-3 py-2">
                          <select
                            value={det.producto_id}
                            onChange={(e) => actualizarLinea(index, 'producto_id', e.target.value)}
                            className="w-full px-2 py-1 border rounded text-sm"
                            required
                          >
                            <option value="">Seleccionar...</option>
                            {productos.map(p => (
                              <option key={p.id} value={p.id}>
                                {p.sku} - {p.nombre}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="number"
                            value={det.cantidad_solicitada}
                            onChange={(e) => actualizarLinea(index, 'cantidad_solicitada', parseFloat(e.target.value) || 0)}
                            className="w-full px-2 py-1 border rounded text-sm text-center"
                            min="0.01"
                            step="0.01"
                            required
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="text"
                            value={det.notas}
                            onChange={(e) => actualizarLinea(index, 'notas', e.target.value)}
                            className="w-full px-2 py-1 border rounded text-sm"
                            placeholder="Opcional"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <button
                            type="button"
                            onClick={() => eliminarLinea(index)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Botones */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              disabled={loading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center gap-2"
            >
              {loading ? (
                <>
                  <span className="animate-spin">⏳</span>
                  Guardando...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  Crear Transferencia
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Modal de Detalle
const ModalDetalleTransferencia: React.FC<{
  transferencia: Transferencia | null;
  onClose: () => void;
  onCambiarEstado: (id: string, estado: EstadoTransferencia) => Promise<void>;
}> = ({ transferencia, onClose, onCambiarEstado }) => {
  const [loading, setLoading] = useState(false);

  if (!transferencia) return null;

  const handleCambiarEstado = async (nuevoEstado: EstadoTransferencia) => {
    if (!confirm(`¿Confirma cambiar el estado a "${nuevoEstado}"?`)) return;
    setLoading(true);
    try {
      await onCambiarEstado(transferencia.id, nuevoEstado);
      onClose();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al cambiar estado');
    } finally {
      setLoading(false);
    }
  };

  const botonesAccion = () => {
    switch (transferencia.estado) {
      case 'borrador':
        return (
          <button
            onClick={() => handleCambiarEstado('pendiente_aprobacion')}
            disabled={loading}
            className="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 flex items-center gap-2"
          >
            <Send className="w-4 h-4" />
            Enviar a Aprobación
          </button>
        );
      case 'pendiente_aprobacion':
        return (
          <button
            onClick={() => handleCambiarEstado('aprobada')}
            disabled={loading}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 flex items-center gap-2"
          >
            <FileCheck className="w-4 h-4" />
            Aprobar
          </button>
        );
      case 'aprobada':
        return (
          <button
            onClick={() => handleCambiarEstado('en_transito')}
            disabled={loading}
            className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 flex items-center gap-2"
          >
            <Truck className="w-4 h-4" />
            Marcar en Tránsito
          </button>
        );
      case 'en_transito':
        return (
          <button
            onClick={() => handleCambiarEstado('recibida')}
            disabled={loading}
            className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 flex items-center gap-2"
          >
            <CheckCircle className="w-4 h-4" />
            Confirmar Recepción
          </button>
        );
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-hidden">
        <div className="px-6 py-4 border-b bg-gradient-to-r from-purple-600 to-indigo-600 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-semibold text-white">
              Transferencia {transferencia.numero}
            </h2>
            <p className="text-purple-100 text-sm">
              {new Date(transferencia.fecha).toLocaleDateString('es-MX', { 
                day: 'numeric', month: 'long', year: 'numeric' 
              })}
            </p>
          </div>
          <EstadoBadge estado={transferencia.estado} />
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {/* Info de almacenes */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="p-4 bg-red-50 rounded-lg">
              <p className="text-xs text-red-600 font-medium mb-1">ORIGEN</p>
              <p className="font-semibold text-gray-800">
                {transferencia.almacen_origen?.nombre || 'N/A'}
              </p>
            </div>
            <div className="p-4 bg-green-50 rounded-lg">
              <p className="text-xs text-green-600 font-medium mb-1">DESTINO</p>
              <p className="font-semibold text-gray-800">
                {transferencia.almacen_destino?.nombre || 'N/A'}
              </p>
            </div>
          </div>

          {/* Notas */}
          {transferencia.notas && (
            <div className="mb-6 p-3 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-500 mb-1">Notas:</p>
              <p className="text-sm text-gray-700">{transferencia.notas}</p>
            </div>
          )}

          {/* Detalle de productos */}
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Producto</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500">Solicitado</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500">Enviado</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500">Recibido</th>
                </tr>
              </thead>
              <tbody>
                {transferencia.detalles?.map((det) => (
                  <tr key={det.id} className="border-t">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-800">{det.producto?.nombre}</p>
                      <p className="text-xs text-gray-500">{det.producto?.sku}</p>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="font-medium">{det.cantidad_solicitada}</span>
                      <span className="text-xs text-gray-500 ml-1">{det.producto?.unidad_medida}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {det.cantidad_enviada ?? '-'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {det.cantidad_recibida ?? '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Timeline de fechas */}
          <div className="mt-6 grid grid-cols-4 gap-2 text-xs">
            <div className="text-center">
              <p className="text-gray-500">Creada</p>
              <p className="font-medium">{new Date(transferencia.created_at).toLocaleDateString('es-MX')}</p>
            </div>
            <div className="text-center">
              <p className="text-gray-500">Aprobada</p>
              <p className="font-medium">
                {transferencia.fecha_aprobacion ? new Date(transferencia.fecha_aprobacion).toLocaleDateString('es-MX') : '-'}
              </p>
            </div>
            <div className="text-center">
              <p className="text-gray-500">Enviada</p>
              <p className="font-medium">
                {transferencia.fecha_envio ? new Date(transferencia.fecha_envio).toLocaleDateString('es-MX') : '-'}
              </p>
            </div>
            <div className="text-center">
              <p className="text-gray-500">Recibida</p>
              <p className="font-medium">
                {transferencia.fecha_recepcion ? new Date(transferencia.fecha_recepcion).toLocaleDateString('es-MX') : '-'}
              </p>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t bg-gray-50 flex justify-between">
          {transferencia.estado !== 'recibida' && transferencia.estado !== 'cancelada' && (
            <button
              onClick={() => handleCambiarEstado('cancelada')}
              disabled={loading}
              className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg flex items-center gap-2"
            >
              <XCircle className="w-4 h-4" />
              Cancelar
            </button>
          )}
          <div className="flex gap-3 ml-auto">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-white border rounded-lg hover:bg-gray-50"
            >
              Cerrar
            </button>
            {botonesAccion()}
          </div>
        </div>
      </div>
    </div>
  );
};

// Componente Principal
const TransferenciasPage: React.FC = () => {
  const [transferencias, setTransferencias] = useState<Transferencia[]>([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState<EstadoTransferencia | ''>('');
  const [modalNueva, setModalNueva] = useState(false);
  const [transferenciaSeleccionada, setTransferenciaSeleccionada] = useState<Transferencia | null>(null);
  const [almacenes, setAlmacenes] = useState<{ id: string; nombre: string }[]>([]);
  const [productos, setProductos] = useState<{ id: string; nombre: string; sku: string; unidad_medida: string }[]>([]);
  const [resumen, setResumen] = useState({ pendientes: 0, en_transito: 0, recibidas_hoy: 0, total_mes: 0 });

  // Cargar datos
  const cargarDatos = async () => {
    setLoading(true);
    try {
      const filtros: FiltrosTransferencia = {};
      if (filtroEstado) filtros.estado = filtroEstado;
      if (busqueda) filtros.busqueda = busqueda;
      
      const [trans, almacs, prods, res] = await Promise.all([
        obtenerTransferencias(filtros),
        supabase.from('almacenes').select('id, nombre').eq('activo', true).order('nombre'),
        supabase.from('productos').select('id, nombre, sku, unidad_medida').eq('activo', true).order('nombre'),
        obtenerResumenTransferencias()
      ]);
      
      setTransferencias(trans);
      setAlmacenes(almacs.data || []);
      setProductos(prods.data || []);
      setResumen(res);
    } catch (error) {
      console.error('Error cargando datos:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, [filtroEstado, busqueda]);

  // Handlers
  const handleCrearTransferencia = async (data: CrearTransferenciaInput) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuario no autenticado');
    
    await crearTransferencia(data, user.id);
    await cargarDatos();
  };

  const handleCambiarEstado = async (id: string, estado: EstadoTransferencia) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuario no autenticado');
    
    await cambiarEstadoTransferencia(id, estado, user.id);
    await cargarDatos();
  };

  const handleEliminar = async (transferencia: Transferencia) => {
    if (transferencia.estado !== 'borrador') {
      alert('Solo se pueden eliminar transferencias en borrador');
      return;
    }
    if (!confirm('¿Está seguro de eliminar esta transferencia?')) return;
    
    try {
      await eliminarTransferencia(transferencia.id);
      await cargarDatos();
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Error al eliminar');
    }
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <ArrowLeftRight className="w-7 h-7 text-purple-600" />
            Transferencias entre Almacenes
          </h1>
          <p className="text-gray-500 mt-1">
            Gestiona el movimiento de inventario entre diferentes almacenes
          </p>
        </div>
        <button
          onClick={() => setModalNueva(true)}
          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Nueva Transferencia
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow-sm p-4 border-l-4 border-yellow-500">
          <p className="text-sm text-gray-500">Pendientes</p>
          <p className="text-2xl font-bold text-gray-800">{resumen.pendientes}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4 border-l-4 border-purple-500">
          <p className="text-sm text-gray-500">En Tránsito</p>
          <p className="text-2xl font-bold text-gray-800">{resumen.en_transito}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4 border-l-4 border-green-500">
          <p className="text-sm text-gray-500">Recibidas Hoy</p>
          <p className="text-2xl font-bold text-gray-800">{resumen.recibidas_hoy}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4 border-l-4 border-blue-500">
          <p className="text-sm text-gray-500">Total Mes</p>
          <p className="text-2xl font-bold text-gray-800">{resumen.total_mes}</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por número..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
            />
          </div>
          <div className="relative">
            <Filter className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <select
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value as EstadoTransferencia | '')}
              className="pl-10 pr-8 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 appearance-none bg-white"
            >
              <option value="">Todos los estados</option>
              <option value="borrador">Borrador</option>
              <option value="pendiente_aprobacion">Pendiente Aprobación</option>
              <option value="aprobada">Aprobada</option>
              <option value="en_transito">En Tránsito</option>
              <option value="recibida">Recibida</option>
              <option value="cancelada">Cancelada</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-500">
            <div className="animate-spin w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full mx-auto mb-4"></div>
            Cargando transferencias...
          </div>
        ) : transferencias.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <ArrowLeftRight className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>No hay transferencias registradas</p>
            <button
              onClick={() => setModalNueva(true)}
              className="mt-4 text-purple-600 hover:text-purple-700"
            >
              Crear primera transferencia
            </button>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Número</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Origen → Destino</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Productos</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Estado</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {transferencias.map((trans) => (
                <tr key={trans.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <span className="font-mono font-medium text-purple-600">{trans.numero}</span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {new Date(trans.fecha).toLocaleDateString('es-MX')}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-800">{trans.almacen_origen?.nombre}</span>
                      <span className="text-gray-400">→</span>
                      <span className="text-sm text-gray-800">{trans.almacen_destino?.nombre}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="px-2 py-1 bg-gray-100 rounded-full text-xs font-medium">
                      {trans.detalles?.length || 0} items
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <EstadoBadge estado={trans.estado} />
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => setTransferenciaSeleccionada(trans)}
                        className="p-2 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg"
                        title="Ver detalle"
                      >
                        <Eye className="w-5 h-5" />
                      </button>
                      {trans.estado === 'borrador' && (
                        <button
                          onClick={() => handleEliminar(trans)}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                          title="Eliminar"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modales */}
      <ModalNuevaTransferencia
        isOpen={modalNueva}
        onClose={() => setModalNueva(false)}
        onGuardar={handleCrearTransferencia}
        almacenes={almacenes}
        productos={productos}
      />

      <ModalDetalleTransferencia
        transferencia={transferenciaSeleccionada}
        onClose={() => setTransferenciaSeleccionada(null)}
        onCambiarEstado={handleCambiarEstado}
      />
    </div>
  );
};

export default TransferenciasPage;
