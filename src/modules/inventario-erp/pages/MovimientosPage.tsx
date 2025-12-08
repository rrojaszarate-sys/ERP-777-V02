import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Package, Plus, Search, ArrowUpCircle, ArrowDownCircle,
  RefreshCw, Calendar, FileText, TrendingUp, TrendingDown
} from 'lucide-react';
import { useMovimientos, useCreateMovimiento } from '../hooks/useInventario';
import { useProductos } from '../hooks/useProductos';
import { useAlmacenes } from '../hooks/useInventario';
import { useTheme } from '../../../shared/components/theme';

interface Movimiento {
  id?: number;
  company_id?: string;
  tipo: 'entrada' | 'salida' | 'ajuste';
  producto_id: number;
  almacen_id: number;
  cantidad: number;
  costo_unitario: number;
  referencia: string;
  notas: string;
  fecha: string;
}

export const MovimientosPage: React.FC = () => {
  const { data: movimientos = [], isLoading } = useMovimientos();
  const { productos = [] } = useProductos();
  const { data: almacenes = [] } = useAlmacenes();
  const createMutation = useCreateMovimiento();
  const { paletteConfig, isDark } = useTheme();

  const colors = useMemo(() => ({
    primary: paletteConfig.primary,
    secondary: paletteConfig.secondary,
    bg: isDark ? '#111827' : '#f9fafb',
    card: isDark ? '#1f2937' : '#ffffff',
    cardHover: isDark ? '#374151' : '#f3f4f6',
    border: isDark ? '#374151' : '#e5e7eb',
    text: isDark ? '#f9fafb' : '#111827',
    textMuted: isDark ? '#9ca3af' : '#6b7280',
    textSecondary: isDark ? '#d1d5db' : '#4b5563',
  }), [paletteConfig, isDark]);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterTipo, setFilterTipo] = useState<string>('todos');
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState<Movimiento>({
    tipo: 'entrada',
    producto_id: 0,
    almacen_id: 0,
    cantidad: 0,
    costo_unitario: 0,
    referencia: '',
    notas: '',
    fecha: new Date().toISOString().split('T')[0]
  });

  // Filtrar movimientos
  const filteredMovimientos = movimientos.filter((mov: any) => {
    const matchSearch =
      mov.producto?.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      mov.almacen?.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      mov.referencia?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchTipo = filterTipo === 'todos' || mov.tipo === filterTipo;

    return matchSearch && matchTipo;
  });

  // Estadísticas
  const stats = {
    total: movimientos.length,
    entradas: movimientos.filter((m: any) => m.tipo === 'entrada').length,
    salidas: movimientos.filter((m: any) => m.tipo === 'salida').length,
    ajustes: movimientos.filter((m: any) => m.tipo === 'ajuste').length
  };

  const openModal = () => {
    setFormData({
      tipo: 'entrada',
      producto_id: 0,
      almacen_id: 0,
      cantidad: 0,
      costo_unitario: 0,
      referencia: '',
      notas: '',
      fecha: new Date().toISOString().split('T')[0]
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.producto_id === 0) {
      alert('Por favor selecciona un producto');
      return;
    }

    if (formData.almacen_id === 0) {
      alert('Por favor selecciona un almacén');
      return;
    }

    try {
      await createMutation.mutateAsync(formData);
      closeModal();
    } catch (error) {
      console.error('Error al registrar movimiento:', error);
    }
  };

  const getTipoColor = (tipo: string) => {
    switch (tipo) {
      case 'entrada':
        return 'bg-green-100 text-green-800';
      case 'salida':
        return 'bg-red-100 text-red-800';
      case 'ajuste':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getTipoIcon = (tipo: string) => {
    switch (tipo) {
      case 'entrada':
        return <ArrowUpCircle className="w-4 h-4" />;
      case 'salida':
        return <ArrowDownCircle className="w-4 h-4" />;
      case 'ajuste':
        return <RefreshCw className="w-4 h-4" />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen p-6 space-y-6" style={{ backgroundColor: colors.bg }}>
      {/* Encabezado */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-3 rounded-lg" style={{ backgroundColor: `${colors.primary}20` }}>
            <Package className="w-8 h-8" style={{ color: colors.primary }} />
          </div>
          <div>
            <h1 className="text-3xl font-bold" style={{ color: colors.text }}>Movimientos de Inventario</h1>
            <p style={{ color: colors.textMuted }}>Registro de entradas, salidas y ajustes</p>
          </div>
        </div>
        <button
          onClick={openModal}
          className="flex items-center space-x-2 px-4 py-2 text-white rounded-lg hover:opacity-90 transition-colors"
          style={{ backgroundColor: colors.primary }}
        >
          <Plus className="w-5 h-5" />
          <span>Nuevo Movimiento</span>
        </button>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-lg shadow p-6"
          style={{ backgroundColor: colors.card }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm" style={{ color: colors.textMuted }}>Total Movimientos</p>
              <p className="text-2xl font-bold" style={{ color: colors.text }}>{stats.total}</p>
            </div>
            <Package className="w-10 h-10" style={{ color: colors.primary }} />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-lg shadow p-6"
          style={{ backgroundColor: colors.card }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm" style={{ color: colors.textMuted }}>Entradas</p>
              <p className="text-2xl font-bold text-green-600">{stats.entradas}</p>
            </div>
            <TrendingUp className="w-10 h-10 text-green-500" />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="rounded-lg shadow p-6"
          style={{ backgroundColor: colors.card }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm" style={{ color: colors.textMuted }}>Salidas</p>
              <p className="text-2xl font-bold text-red-600">{stats.salidas}</p>
            </div>
            <TrendingDown className="w-10 h-10 text-red-500" />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="rounded-lg shadow p-6"
          style={{ backgroundColor: colors.card }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm" style={{ color: colors.textMuted }}>Ajustes</p>
              <p className="text-2xl font-bold text-yellow-600">{stats.ajustes}</p>
            </div>
            <RefreshCw className="w-10 h-10 text-yellow-500" />
          </div>
        </motion.div>
      </div>

      {/* Filtros */}
      <div className="rounded-lg shadow p-4 space-y-4" style={{ backgroundColor: colors.card }}>
        <div className="flex items-center space-x-2" style={{ color: colors.textMuted }}>
          <Search className="w-5 h-5" />
          <input
            type="text"
            placeholder="Buscar por producto, almacén o referencia..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 outline-none"
            style={{ backgroundColor: 'transparent', color: colors.text }}
          />
        </div>

        <div className="flex space-x-2">
          <button
            onClick={() => setFilterTipo('todos')}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            style={{
              backgroundColor: filterTipo === 'todos' ? colors.primary : (isDark ? '#374151' : '#f3f4f6'),
              color: filterTipo === 'todos' ? '#ffffff' : colors.textSecondary
            }}
          >
            Todos
          </button>
          <button
            onClick={() => setFilterTipo('entrada')}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            style={{
              backgroundColor: filterTipo === 'entrada' ? '#16a34a' : (isDark ? '#374151' : '#f3f4f6'),
              color: filterTipo === 'entrada' ? '#ffffff' : colors.textSecondary
            }}
          >
            Entradas
          </button>
          <button
            onClick={() => setFilterTipo('salida')}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            style={{
              backgroundColor: filterTipo === 'salida' ? '#dc2626' : (isDark ? '#374151' : '#f3f4f6'),
              color: filterTipo === 'salida' ? '#ffffff' : colors.textSecondary
            }}
          >
            Salidas
          </button>
          <button
            onClick={() => setFilterTipo('ajuste')}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            style={{
              backgroundColor: filterTipo === 'ajuste' ? '#ca8a04' : (isDark ? '#374151' : '#f3f4f6'),
              color: filterTipo === 'ajuste' ? '#ffffff' : colors.textSecondary
            }}
          >
            Ajustes
          </button>
        </div>
      </div>

      {/* Tabla de movimientos */}
      <div className="rounded-lg shadow overflow-hidden" style={{ backgroundColor: colors.card }}>
        {isLoading ? (
          <div className="p-8 text-center" style={{ color: colors.textMuted }}>Cargando movimientos...</div>
        ) : filteredMovimientos.length === 0 ? (
          <div className="p-8 text-center" style={{ color: colors.textMuted }}>No se encontraron movimientos</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead style={{ backgroundColor: isDark ? '#374151' : '#f9fafb' }}>
                <tr>
                  <th className="px-2 py-1.5 text-left text-[10px] font-semibold uppercase" style={{ color: colors.textMuted }}>Fecha</th>
                  <th className="px-2 py-1.5 text-left text-[10px] font-semibold uppercase" style={{ color: colors.textMuted }}>Tipo</th>
                  <th className="px-2 py-1.5 text-left text-[10px] font-semibold uppercase" style={{ color: colors.textMuted }}>Producto</th>
                  <th className="px-2 py-1.5 text-left text-[10px] font-semibold uppercase" style={{ color: colors.textMuted }}>Almacén</th>
                  <th className="px-2 py-1.5 text-right text-[10px] font-semibold uppercase" style={{ color: colors.textMuted }}>Cant.</th>
                  <th className="px-2 py-1.5 text-right text-[10px] font-semibold uppercase" style={{ color: colors.textMuted }}>C.Unit.</th>
                  <th className="px-2 py-1.5 text-left text-[10px] font-semibold uppercase" style={{ color: colors.textMuted }}>Ref.</th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: colors.border }}>
                {filteredMovimientos.map((movimiento: any) => (
                  <tr
                    key={movimiento.id}
                    className="transition-colors hover:bg-gray-50"
                    style={{ backgroundColor: colors.card }}
                  >
                    <td className="px-2 py-1 text-xs" style={{ color: colors.text }}>
                      {new Date(movimiento.created_at || movimiento.fecha).toLocaleDateString('es-MX')}
                    </td>
                    <td className="px-2 py-1">
                      <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-semibold rounded ${getTipoColor(movimiento.tipo)}`}>
                        {getTipoIcon(movimiento.tipo)}
                        <span>{movimiento.tipo.charAt(0).toUpperCase()}</span>
                      </span>
                    </td>
                    <td className="px-2 py-1">
                      <div className="text-xs font-medium truncate max-w-[150px]" style={{ color: colors.text }} title={movimiento.producto?.nombre}>{movimiento.producto?.nombre || 'N/A'}</div>
                    </td>
                    <td className="px-2 py-1 text-xs" style={{ color: colors.text }}>{movimiento.almacen?.nombre || 'N/A'}</td>
                    <td className="px-2 py-1 text-right">
                      <span className={`font-mono text-xs font-semibold ${
                        movimiento.tipo === 'entrada' ? 'text-green-600' :
                        movimiento.tipo === 'salida' ? 'text-red-600' :
                        'text-yellow-600'
                      }`}>
                        {movimiento.tipo === 'entrada' ? '+' : movimiento.tipo === 'salida' ? '-' : '±'}
                        {movimiento.cantidad}
                      </span>
                    </td>
                    <td className="px-2 py-1 text-right text-xs font-mono" style={{ color: colors.text }}>
                      {movimiento.costo_unitario > 0 ? `$${movimiento.costo_unitario.toLocaleString()}` : '-'}
                    </td>
                    <td className="px-2 py-1 text-xs truncate max-w-[100px]" style={{ color: colors.textSecondary }} title={movimiento.referencia}>{movimiento.referencia || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal de Formulario */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            style={{ backgroundColor: colors.card }}
          >
            <div className="sticky top-0 border-b px-6 py-4 flex items-center justify-between" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
              <h2 className="text-xl font-bold" style={{ color: colors.text }}>Registrar Movimiento de Inventario</h2>
              <button onClick={closeModal} className="hover:opacity-70" style={{ color: colors.textMuted }}>
                <span className="text-2xl">&times;</span>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* Tipo de Movimiento */}
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: colors.textSecondary }}>
                  Tipo de Movimiento *
                </label>
                <div className="grid grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, tipo: 'entrada' })}
                    className="p-4 border-2 rounded-lg text-center transition-all"
                    style={{
                      borderColor: formData.tipo === 'entrada' ? '#16a34a' : colors.border,
                      backgroundColor: formData.tipo === 'entrada' ? '#f0fdf4' : 'transparent',
                      color: formData.tipo === 'entrada' ? '#15803d' : colors.text
                    }}
                  >
                    <ArrowUpCircle className="w-8 h-8 mx-auto mb-2" />
                    <div className="font-semibold">Entrada</div>
                    <div className="text-xs" style={{ color: colors.textMuted }}>Compras, devoluciones</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, tipo: 'salida' })}
                    className="p-4 border-2 rounded-lg text-center transition-all"
                    style={{
                      borderColor: formData.tipo === 'salida' ? '#dc2626' : colors.border,
                      backgroundColor: formData.tipo === 'salida' ? '#fef2f2' : 'transparent',
                      color: formData.tipo === 'salida' ? '#b91c1c' : colors.text
                    }}
                  >
                    <ArrowDownCircle className="w-8 h-8 mx-auto mb-2" />
                    <div className="font-semibold">Salida</div>
                    <div className="text-xs" style={{ color: colors.textMuted }}>Ventas, consumo</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, tipo: 'ajuste' })}
                    className="p-4 border-2 rounded-lg text-center transition-all"
                    style={{
                      borderColor: formData.tipo === 'ajuste' ? '#ca8a04' : colors.border,
                      backgroundColor: formData.tipo === 'ajuste' ? '#fefce8' : 'transparent',
                      color: formData.tipo === 'ajuste' ? '#a16207' : colors.text
                    }}
                  >
                    <RefreshCw className="w-8 h-8 mx-auto mb-2" />
                    <div className="font-semibold">Ajuste</div>
                    <div className="text-xs" style={{ color: colors.textMuted }}>Correcciones</div>
                  </button>
                </div>
              </div>

              {/* Producto y Almacén */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: colors.textSecondary }}>
                    Producto *
                  </label>
                  <select
                    required
                    value={formData.producto_id}
                    onChange={(e) => setFormData({ ...formData, producto_id: Number(e.target.value) })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:border-transparent"
                    style={{ backgroundColor: colors.bg, borderColor: colors.border, color: colors.text }}
                  >
                    <option value={0}>Seleccionar producto...</option>
                    {productos.map((prod: any) => (
                      <option key={prod.id} value={prod.id}>
                        {prod.codigo} - {prod.nombre}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: colors.textSecondary }}>
                    Almacén *
                  </label>
                  <select
                    required
                    value={formData.almacen_id}
                    onChange={(e) => setFormData({ ...formData, almacen_id: Number(e.target.value) })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:border-transparent"
                    style={{ backgroundColor: colors.bg, borderColor: colors.border, color: colors.text }}
                  >
                    <option value={0}>Seleccionar almacén...</option>
                    {almacenes.map((alm: any) => (
                      <option key={alm.id} value={alm.id}>
                        {alm.codigo} - {alm.nombre}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Cantidad y Costo */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: colors.textSecondary }}>
                    Cantidad *
                  </label>
                  <input
                    type="number"
                    required
                    min="0.01"
                    step="0.01"
                    value={formData.cantidad}
                    onChange={(e) => setFormData({ ...formData, cantidad: Number(e.target.value) })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:border-transparent"
                    style={{ backgroundColor: colors.bg, borderColor: colors.border, color: colors.text }}
                    placeholder="0.00"
                  />
                </div>

                {formData.tipo === 'entrada' && (
                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: colors.textSecondary }}>
                      Costo Unitario
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2" style={{ color: colors.textMuted }}>$</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={formData.costo_unitario}
                        onChange={(e) => setFormData({ ...formData, costo_unitario: Number(e.target.value) })}
                        className="w-full pl-7 pr-3 py-2 border rounded-lg focus:ring-2 focus:border-transparent"
                        style={{ backgroundColor: colors.bg, borderColor: colors.border, color: colors.text }}
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Fecha y Referencia */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: colors.textSecondary }}>
                    Fecha *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.fecha}
                    onChange={(e) => setFormData({ ...formData, fecha: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:border-transparent"
                    style={{ backgroundColor: colors.bg, borderColor: colors.border, color: colors.text }}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: colors.textSecondary }}>
                    Referencia / No. Documento
                  </label>
                  <input
                    type="text"
                    value={formData.referencia}
                    onChange={(e) => setFormData({ ...formData, referencia: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:border-transparent"
                    style={{ backgroundColor: colors.bg, borderColor: colors.border, color: colors.text }}
                    placeholder="Ej: OC-001, FC-123"
                  />
                </div>
              </div>

              {/* Notas */}
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: colors.textSecondary }}>
                  Notas
                </label>
                <textarea
                  rows={3}
                  value={formData.notas}
                  onChange={(e) => setFormData({ ...formData, notas: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:border-transparent"
                  style={{ backgroundColor: colors.bg, borderColor: colors.border, color: colors.text }}
                  placeholder="Notas adicionales sobre el movimiento..."
                />
              </div>

              {/* Botones */}
              <div className="flex justify-end space-x-3 pt-4 border-t" style={{ borderColor: colors.border }}>
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 border rounded-lg hover:opacity-80 transition-colors"
                  style={{ borderColor: colors.border, color: colors.textSecondary }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="flex items-center space-x-2 px-4 py-2 text-white rounded-lg hover:opacity-90 disabled:opacity-50"
                  style={{ backgroundColor: colors.primary }}
                >
                  <FileText className="w-5 h-5" />
                  <span>Registrar Movimiento</span>
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
};
