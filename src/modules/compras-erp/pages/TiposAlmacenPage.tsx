/**
 * TiposAlmacenPage - Configuración de tipos de almacén
 * Permite configurar qué funcionalidades aplican a cada tipo
 */

import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  Settings,
  Plus,
  Edit3,
  Trash2,
  Save,
  X,
  Package,
  Layers,
  Calendar,
  MapPin,
  Hash,
  CalendarCheck,
  AlertTriangle,
  Check,
} from 'lucide-react';
import { useTheme } from '../../../shared/components/theme';
import { useCompany } from '../../../core/context/CompanyContext';
import {
  fetchTiposAlmacen,
  createTipoAlmacen,
  updateTipoAlmacen,
  deleteTipoAlmacen,
} from '../services/tiposAlmacenService';
import type { TipoAlmacen, TipoAlmacenCreate } from '../types';

const FUNCIONALIDADES = [
  { key: 'usa_lotes', label: 'Lotes', icon: Layers, description: 'Control por lotes de producción' },
  { key: 'usa_fechas_vencimiento', label: 'Vencimientos', icon: Calendar, description: 'Control de fechas de caducidad' },
  { key: 'usa_numeros_serie', label: 'Números de Serie', icon: Hash, description: 'Seguimiento individual por serie' },
  { key: 'usa_ubicaciones', label: 'Ubicaciones', icon: MapPin, description: 'Control por ubicación física' },
  { key: 'usa_reservas_evento', label: 'Reservas Evento', icon: CalendarCheck, description: 'Reservar para eventos' },
] as const;

const ICONOS_TIPO = ['📦', '🪑', '💊', '🍎', '🔧', '🎨', '📚', '🖥️', '👔', '🏗️'];

export const TiposAlmacenPage: React.FC = () => {
  const { paletteConfig, isDark } = useTheme();
  const { selectedCompany } = useCompany();
  const queryClient = useQueryClient();
  const companyId = selectedCompany?.id || '';

  // Estados
  const [showModal, setShowModal] = useState(false);
  const [editando, setEditando] = useState<TipoAlmacen | null>(null);
  const [form, setForm] = useState<Partial<TipoAlmacenCreate>>({
    codigo: '',
    nombre: '',
    descripcion: '',
    icono: '📦',
    usa_lotes: false,
    usa_fechas_vencimiento: false,
    usa_numeros_serie: false,
    usa_ubicaciones: true,
    usa_reservas_evento: true,
    dias_alerta_vencimiento: 30,
    activo: true,
  });

  // Colores dinámicos
  const colors = useMemo(() => ({
    primary: paletteConfig.primary,
    secondary: paletteConfig.secondary,
    bg: isDark ? '#1a1a2e' : '#f8fafc',
    card: isDark ? '#16213e' : '#ffffff',
    text: isDark ? '#e2e8f0' : '#1e293b',
    textMuted: isDark ? '#94a3b8' : '#64748b',
    border: isDark ? '#334155' : '#e2e8f0',
  }), [paletteConfig, isDark]);

  // Query
  const { data: tiposAlmacen = [], isLoading } = useQuery({
    queryKey: ['tipos-almacen', companyId],
    queryFn: () => fetchTiposAlmacen(companyId),
    enabled: !!companyId,
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: (data: TipoAlmacenCreate) => createTipoAlmacen({ ...data, empresa_id: companyId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tipos-almacen'] });
      toast.success('Tipo de almacén creado');
      cerrarModal();
    },
    onError: (error: any) => toast.error(error.message || 'Error al crear'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<TipoAlmacen> }) =>
      updateTipoAlmacen(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tipos-almacen'] });
      toast.success('Tipo de almacén actualizado');
      cerrarModal();
    },
    onError: (error: any) => toast.error(error.message || 'Error al actualizar'),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteTipoAlmacen,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tipos-almacen'] });
      toast.success('Tipo de almacén eliminado');
    },
    onError: (error: any) => toast.error(error.message || 'Error al eliminar'),
  });

  const cerrarModal = () => {
    setShowModal(false);
    setEditando(null);
    setForm({
      codigo: '',
      nombre: '',
      descripcion: '',
      icono: '📦',
      usa_lotes: false,
      usa_fechas_vencimiento: false,
      usa_numeros_serie: false,
      usa_ubicaciones: true,
      usa_reservas_evento: true,
      dias_alerta_vencimiento: 30,
      activo: true,
    });
  };

  const abrirEdicion = (tipo: TipoAlmacen) => {
    setEditando(tipo);
    setForm({
      codigo: tipo.codigo,
      nombre: tipo.nombre,
      descripcion: tipo.descripcion || '',
      icono: tipo.icono || '📦',
      usa_lotes: tipo.usa_lotes,
      usa_fechas_vencimiento: tipo.usa_fechas_vencimiento,
      usa_numeros_serie: tipo.usa_numeros_serie,
      usa_ubicaciones: tipo.usa_ubicaciones,
      usa_reservas_evento: tipo.usa_reservas_evento,
      dias_alerta_vencimiento: tipo.dias_alerta_vencimiento,
      activo: tipo.activo,
    });
    setShowModal(true);
  };

  const handleSubmit = () => {
    if (!form.codigo || !form.nombre) {
      toast.error('Código y nombre son requeridos');
      return;
    }

    if (editando) {
      updateMutation.mutate({ id: editando.id, data: form as Partial<TipoAlmacen> });
    } else {
      createMutation.mutate(form as TipoAlmacenCreate);
    }
  };

  const toggleFuncionalidad = (key: string) => {
    setForm(prev => ({ ...prev, [key]: !prev[key as keyof typeof prev] }));
  };

  return (
    <div className="p-6 min-h-screen" style={{ backgroundColor: colors.bg }}>
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div
              className="p-3 rounded-xl"
              style={{ backgroundColor: `${colors.primary}20` }}
            >
              <Settings size={28} style={{ color: colors.primary }} />
            </div>
            <div>
              <h1 className="text-2xl font-bold" style={{ color: colors.text }}>
                Tipos de Almacén
              </h1>
              <p style={{ color: colors.textMuted }}>
                Configura las funcionalidades para cada tipo de almacén
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-white"
            style={{ backgroundColor: colors.primary }}
          >
            <Plus size={20} />
            Nuevo Tipo
          </button>
        </div>

        {/* Info */}
        <div
          className="p-4 rounded-xl mb-4"
          style={{ backgroundColor: '#3B82F620', border: '1px solid #3B82F6' }}
        >
          <div className="flex items-start gap-3">
            <AlertTriangle className="text-blue-500 mt-0.5" size={20} />
            <div>
              <p className="font-medium text-blue-600">Configuración por tipo de almacén</p>
              <p className="text-sm text-blue-600 opacity-80">
                Define qué funcionalidades aplican a cada tipo. Por ejemplo, los alimentos perecederos 
                usan control de vencimientos, mientras que la materia prima para fabricación no lo requiere.
                Esta configuración aplica a todos los almacenes de ese tipo.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Lista de tipos */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <div
            className="animate-spin rounded-full h-12 w-12 border-4 border-t-transparent"
            style={{ borderColor: colors.primary, borderTopColor: 'transparent' }}
          />
        </div>
      ) : tiposAlmacen.length === 0 ? (
        <div
          className="text-center py-12 rounded-xl"
          style={{ backgroundColor: colors.card, border: `1px solid ${colors.border}` }}
        >
          <Package size={48} className="mx-auto mb-4" style={{ color: colors.textMuted }} />
          <p style={{ color: colors.textMuted }}>No hay tipos de almacén configurados</p>
          <button
            onClick={() => setShowModal(true)}
            className="mt-4 px-4 py-2 rounded-lg text-white"
            style={{ backgroundColor: colors.primary }}
          >
            Crear primer tipo
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tiposAlmacen.map((tipo) => (
            <div
              key={tipo.id}
              className="p-4 rounded-xl transition-all hover:shadow-lg"
              style={{
                backgroundColor: colors.card,
                border: `1px solid ${tipo.activo ? colors.border : '#EF4444'}`,
                opacity: tipo.activo ? 1 : 0.7,
              }}
            >
              {/* Header del tipo */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{tipo.icono || '📦'}</span>
                  <div>
                    <h3 className="font-bold" style={{ color: colors.text }}>
                      {tipo.nombre}
                    </h3>
                    <code className="text-xs" style={{ color: colors.textMuted }}>
                      {tipo.codigo}
                    </code>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => abrirEdicion(tipo)}
                    className="p-2 rounded-lg transition-colors"
                    style={{ backgroundColor: colors.bg }}
                  >
                    <Edit3 size={16} style={{ color: colors.textMuted }} />
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`¿Eliminar tipo "${tipo.nombre}"?`)) {
                        deleteMutation.mutate(tipo.id);
                      }
                    }}
                    className="p-2 rounded-lg transition-colors"
                    style={{ backgroundColor: '#EF444410', color: '#EF4444' }}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              {/* Descripción */}
              {tipo.descripcion && (
                <p className="text-sm mb-4" style={{ color: colors.textMuted }}>
                  {tipo.descripcion}
                </p>
              )}

              {/* Funcionalidades activas */}
              <div className="space-y-2">
                <p className="text-xs font-medium" style={{ color: colors.textMuted }}>
                  Funcionalidades:
                </p>
                <div className="flex flex-wrap gap-2">
                  {FUNCIONALIDADES.map(({ key, label, icon: Icon }) => {
                    const activo = tipo[key as keyof TipoAlmacen];
                    return (
                      <span
                        key={key}
                        className="px-2 py-1 rounded-full text-xs flex items-center gap-1"
                        style={{
                          backgroundColor: activo ? '#10B98120' : colors.bg,
                          color: activo ? '#10B981' : colors.textMuted,
                        }}
                      >
                        {activo ? <Check size={12} /> : <X size={12} />}
                        {label}
                      </span>
                    );
                  })}
                </div>
              </div>

              {/* Días alerta */}
              {tipo.usa_fechas_vencimiento && (
                <div className="mt-3 pt-3 border-t" style={{ borderColor: colors.border }}>
                  <p className="text-xs" style={{ color: colors.textMuted }}>
                    ⏰ Alerta de vencimiento: {tipo.dias_alerta_vencimiento} días
                  </p>
                </div>
              )}

              {/* Badge inactivo */}
              {!tipo.activo && (
                <div className="mt-3 pt-3 border-t" style={{ borderColor: colors.border }}>
                  <span className="text-xs text-red-500">⚠️ Tipo inactivo</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div
            className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl shadow-2xl"
            style={{ backgroundColor: colors.card }}
          >
            <div className="p-6 border-b" style={{ borderColor: colors.border }}>
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold" style={{ color: colors.text }}>
                  {editando ? 'Editar Tipo de Almacén' : 'Nuevo Tipo de Almacén'}
                </h2>
                <button onClick={cerrarModal} className="p-2 rounded-lg hover:bg-gray-100">
                  <X size={20} style={{ color: colors.textMuted }} />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Información básica */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: colors.text }}>
                    Código *
                  </label>
                  <input
                    type="text"
                    value={form.codigo}
                    onChange={(e) => setForm({ ...form, codigo: e.target.value.toUpperCase() })}
                    placeholder="Ej: MATERIA_PRIMA"
                    className="w-full px-3 py-2 rounded-lg border"
                    style={{ backgroundColor: colors.bg, borderColor: colors.border, color: colors.text }}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: colors.text }}>
                    Nombre *
                  </label>
                  <input
                    type="text"
                    value={form.nombre}
                    onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                    placeholder="Ej: Materia Prima"
                    className="w-full px-3 py-2 rounded-lg border"
                    style={{ backgroundColor: colors.bg, borderColor: colors.border, color: colors.text }}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: colors.text }}>
                  Descripción
                </label>
                <textarea
                  value={form.descripcion}
                  onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
                  placeholder="Descripción del tipo de almacén..."
                  rows={2}
                  className="w-full px-3 py-2 rounded-lg border"
                  style={{ backgroundColor: colors.bg, borderColor: colors.border, color: colors.text }}
                />
              </div>

              {/* Icono */}
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: colors.text }}>
                  Icono
                </label>
                <div className="flex flex-wrap gap-2">
                  {ICONOS_TIPO.map((icono) => (
                    <button
                      key={icono}
                      onClick={() => setForm({ ...form, icono })}
                      className="p-2 text-2xl rounded-lg border-2 transition-all"
                      style={{
                        borderColor: form.icono === icono ? colors.primary : colors.border,
                        backgroundColor: form.icono === icono ? `${colors.primary}10` : 'transparent',
                      }}
                    >
                      {icono}
                    </button>
                  ))}
                </div>
              </div>

              {/* Funcionalidades */}
              <div>
                <label className="block text-sm font-medium mb-3" style={{ color: colors.text }}>
                  Funcionalidades del Almacén
                </label>
                <div className="space-y-3">
                  {FUNCIONALIDADES.map(({ key, label, icon: Icon, description }) => (
                    <div
                      key={key}
                      className="flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all"
                      style={{
                        backgroundColor: form[key as keyof typeof form] ? '#10B98110' : colors.bg,
                        border: `1px solid ${form[key as keyof typeof form] ? '#10B981' : colors.border}`,
                      }}
                      onClick={() => toggleFuncionalidad(key)}
                    >
                      <div className="flex items-center gap-3">
                        <Icon
                          size={20}
                          style={{ color: form[key as keyof typeof form] ? '#10B981' : colors.textMuted }}
                        />
                        <div>
                          <p className="font-medium" style={{ color: colors.text }}>{label}</p>
                          <p className="text-xs" style={{ color: colors.textMuted }}>{description}</p>
                        </div>
                      </div>
                      <div
                        className="w-10 h-6 rounded-full relative transition-all"
                        style={{
                          backgroundColor: form[key as keyof typeof form] ? '#10B981' : colors.border,
                        }}
                      >
                        <div
                          className="w-5 h-5 rounded-full bg-white absolute top-0.5 transition-all"
                          style={{
                            left: form[key as keyof typeof form] ? '18px' : '2px',
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Días alerta vencimiento */}
              {form.usa_fechas_vencimiento && (
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: colors.text }}>
                    Días de alerta antes del vencimiento
                  </label>
                  <input
                    type="number"
                    value={form.dias_alerta_vencimiento}
                    onChange={(e) => setForm({ ...form, dias_alerta_vencimiento: parseInt(e.target.value) || 30 })}
                    min={1}
                    max={365}
                    className="w-32 px-3 py-2 rounded-lg border"
                    style={{ backgroundColor: colors.bg, borderColor: colors.border, color: colors.text }}
                  />
                </div>
              )}

              {/* Activo */}
              <div
                className="flex items-center justify-between p-3 rounded-lg cursor-pointer"
                style={{ backgroundColor: colors.bg, border: `1px solid ${colors.border}` }}
                onClick={() => setForm({ ...form, activo: !form.activo })}
              >
                <div>
                  <p className="font-medium" style={{ color: colors.text }}>Estado</p>
                  <p className="text-xs" style={{ color: colors.textMuted }}>
                    {form.activo ? 'El tipo de almacén está activo' : 'El tipo de almacén está inactivo'}
                  </p>
                </div>
                <div
                  className="w-10 h-6 rounded-full relative transition-all"
                  style={{ backgroundColor: form.activo ? '#10B981' : colors.border }}
                >
                  <div
                    className="w-5 h-5 rounded-full bg-white absolute top-0.5 transition-all"
                    style={{ left: form.activo ? '18px' : '2px' }}
                  />
                </div>
              </div>
            </div>

            {/* Footer */}
            <div
              className="p-6 border-t flex justify-end gap-3"
              style={{ borderColor: colors.border }}
            >
              <button
                onClick={cerrarModal}
                className="px-4 py-2 rounded-lg font-medium"
                style={{ backgroundColor: colors.bg, color: colors.text }}
              >
                Cancelar
              </button>
              <button
                onClick={handleSubmit}
                disabled={createMutation.isPending || updateMutation.isPending}
                className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-white"
                style={{ backgroundColor: colors.primary }}
              >
                <Save size={18} />
                {editando ? 'Actualizar' : 'Crear'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TiposAlmacenPage;
