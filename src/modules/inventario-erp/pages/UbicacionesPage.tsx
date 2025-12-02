/**
 * UbicacionesPage - Gestión de ubicaciones dentro de almacenes
 * 
 * Permite crear y gestionar ubicaciones físicas (racks, estantes, niveles)
 * dentro de cada almacén para organizar los productos.
 */

import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  MapPin,
  Plus,
  Edit,
  Trash2,
  Search,
  Package,
  Layers,
  Grid3X3,
  ChevronDown,
  ChevronRight,
  Warehouse,
  CheckCircle,
  XCircle,
  Filter,
} from 'lucide-react';
import { useTheme } from '../../../shared/components/theme';
import { useCompany } from '../../../core/context/CompanyContext';
import {
  fetchUbicaciones,
  createUbicacion,
  updateUbicacion,
  deleteUbicacion,
  generarCodigoUbicacion,
} from '../services/ubicacionesService';
import { fetchAlmacenes } from '../services/inventarioService';
import type { UbicacionAlmacen, TipoUbicacion, Almacen } from '../types';

// Tipos de ubicación con iconos y colores
const TIPOS_UBICACION: Record<TipoUbicacion, { label: string; color: string; icon: string }> = {
  estante: { label: 'Estante', color: '#3B82F6', icon: '📦' },
  piso: { label: 'Piso', color: '#10B981', icon: '🏗️' },
  colgante: { label: 'Colgante', color: '#8B5CF6', icon: '🪝' },
  refrigerado: { label: 'Refrigerado', color: '#06B6D4', icon: '❄️' },
  exterior: { label: 'Exterior', color: '#F59E0B', icon: '🌳' },
};

export const UbicacionesPage: React.FC = () => {
  const { paletteConfig, isDark } = useTheme();
  const { selectedCompany } = useCompany();
  const queryClient = useQueryClient();
  const companyId = selectedCompany?.id || '';

  // Estados
  const [busqueda, setBusqueda] = useState('');
  const [almacenFiltro, setAlmacenFiltro] = useState<number | null>(null);
  const [tipoFiltro, setTipoFiltro] = useState<TipoUbicacion | ''>('');
  const [showForm, setShowForm] = useState(false);
  const [editingUbicacion, setEditingUbicacion] = useState<UbicacionAlmacen | null>(null);
  const [expandedAlmacenes, setExpandedAlmacenes] = useState<Set<number>>(new Set());

  // Form state
  const [formData, setFormData] = useState({
    almacen_id: 0,
    pasillo: '',
    rack: '',
    nivel: '',
    posicion: '',
    nombre: '',
    tipo: 'estante' as TipoUbicacion,
    capacidad_kg: '',
    capacidad_unidades: '',
    es_picking: false,
  });

  // Colores dinámicos
  const colors = {
    primary: paletteConfig.primary,
    secondary: paletteConfig.secondary,
    accent: paletteConfig.accent,
    bg: isDark ? '#1a1a2e' : '#f8fafc',
    card: isDark ? '#16213e' : '#ffffff',
    text: isDark ? '#e2e8f0' : '#1e293b',
    textMuted: isDark ? '#94a3b8' : '#64748b',
    border: isDark ? '#334155' : '#e2e8f0',
  };

  // Queries
  const { data: almacenes = [] } = useQuery({
    queryKey: ['almacenes', companyId],
    queryFn: () => fetchAlmacenes(companyId),
    enabled: !!companyId,
  });

  const { data: ubicaciones = [], isLoading } = useQuery({
    queryKey: ['ubicaciones', companyId, almacenFiltro],
    queryFn: () => fetchUbicaciones(companyId, almacenFiltro || undefined),
    enabled: !!companyId,
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: (data: Partial<UbicacionAlmacen>) => createUbicacion(data, companyId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ubicaciones'] });
      toast.success('Ubicación creada correctamente');
      resetForm();
    },
    onError: (error: any) => {
      toast.error(error.message || 'Error al crear ubicación');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<UbicacionAlmacen> }) =>
      updateUbicacion(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ubicaciones'] });
      toast.success('Ubicación actualizada');
      resetForm();
    },
    onError: (error: any) => {
      toast.error(error.message || 'Error al actualizar');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteUbicacion,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ubicaciones'] });
      toast.success('Ubicación eliminada');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Error al eliminar');
    },
  });

  // Filtrar ubicaciones
  const ubicacionesFiltradas = useMemo(() => {
    return ubicaciones.filter((u) => {
      const matchBusqueda =
        !busqueda ||
        u.codigo.toLowerCase().includes(busqueda.toLowerCase()) ||
        u.nombre?.toLowerCase().includes(busqueda.toLowerCase());
      const matchTipo = !tipoFiltro || u.tipo === tipoFiltro;
      return matchBusqueda && matchTipo;
    });
  }, [ubicaciones, busqueda, tipoFiltro]);

  // Agrupar por almacén
  const ubicacionesPorAlmacen = useMemo(() => {
    const grouped: Record<number, { almacen: Almacen; ubicaciones: UbicacionAlmacen[] }> = {};
    
    ubicacionesFiltradas.forEach((u) => {
      if (!grouped[u.almacen_id]) {
        const almacen = almacenes.find((a) => a.id === u.almacen_id);
        if (almacen) {
          grouped[u.almacen_id] = { almacen, ubicaciones: [] };
        }
      }
      if (grouped[u.almacen_id]) {
        grouped[u.almacen_id].ubicaciones.push(u);
      }
    });

    return Object.values(grouped);
  }, [ubicacionesFiltradas, almacenes]);

  // Handlers
  const resetForm = () => {
    setFormData({
      almacen_id: 0,
      pasillo: '',
      rack: '',
      nivel: '',
      posicion: '',
      nombre: '',
      tipo: 'estante',
      capacidad_kg: '',
      capacidad_unidades: '',
      es_picking: false,
    });
    setEditingUbicacion(null);
    setShowForm(false);
  };

  const handleEdit = (ubicacion: UbicacionAlmacen) => {
    setEditingUbicacion(ubicacion);
    setFormData({
      almacen_id: ubicacion.almacen_id,
      pasillo: ubicacion.pasillo || '',
      rack: ubicacion.rack || '',
      nivel: ubicacion.nivel || '',
      posicion: ubicacion.posicion || '',
      nombre: ubicacion.nombre || '',
      tipo: ubicacion.tipo,
      capacidad_kg: ubicacion.capacidad_kg?.toString() || '',
      capacidad_unidades: ubicacion.capacidad_unidades?.toString() || '',
      es_picking: ubicacion.es_picking,
    });
    setShowForm(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.almacen_id) {
      toast.error('Selecciona un almacén');
      return;
    }
    if (!formData.pasillo || !formData.rack || !formData.nivel) {
      toast.error('Completa pasillo, rack y nivel');
      return;
    }

    const codigo = generarCodigoUbicacion(
      formData.pasillo,
      formData.rack,
      formData.nivel,
      formData.posicion || undefined
    );

    const data: Partial<UbicacionAlmacen> = {
      almacen_id: formData.almacen_id,
      codigo,
      nombre: formData.nombre || codigo,
      pasillo: formData.pasillo.toUpperCase(),
      rack: formData.rack,
      nivel: formData.nivel,
      posicion: formData.posicion || null,
      tipo: formData.tipo,
      capacidad_kg: formData.capacidad_kg ? parseFloat(formData.capacidad_kg) : null,
      capacidad_unidades: formData.capacidad_unidades ? parseInt(formData.capacidad_unidades) : null,
      es_picking: formData.es_picking,
      activo: true,
    };

    if (editingUbicacion) {
      updateMutation.mutate({ id: editingUbicacion.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const toggleAlmacen = (almacenId: number) => {
    const newExpanded = new Set(expandedAlmacenes);
    if (newExpanded.has(almacenId)) {
      newExpanded.delete(almacenId);
    } else {
      newExpanded.add(almacenId);
    }
    setExpandedAlmacenes(newExpanded);
  };

  // Preview del código
  const codigoPreview = useMemo(() => {
    if (formData.pasillo && formData.rack && formData.nivel) {
      return generarCodigoUbicacion(
        formData.pasillo,
        formData.rack,
        formData.nivel,
        formData.posicion || undefined
      );
    }
    return '';
  }, [formData.pasillo, formData.rack, formData.nivel, formData.posicion]);

  return (
    <div className="p-6" style={{ backgroundColor: colors.bg, minHeight: '100vh' }}>
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div
              className="p-3 rounded-xl"
              style={{ backgroundColor: `${colors.primary}20` }}
            >
              <MapPin size={28} style={{ color: colors.primary }} />
            </div>
            <div>
              <h1 className="text-2xl font-bold" style={{ color: colors.text }}>
                Ubicaciones de Almacén
              </h1>
              <p style={{ color: colors.textMuted }}>
                Gestiona racks, estantes y zonas de almacenamiento
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-white transition-all hover:opacity-90"
            style={{ backgroundColor: colors.primary }}
          >
            <Plus size={20} />
            Nueva Ubicación
          </button>
        </div>

        {/* Filtros */}
        <div className="flex flex-wrap gap-4">
          <div className="relative flex-1 min-w-[200px]">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2"
              style={{ color: colors.textMuted }}
            />
            <input
              type="text"
              placeholder="Buscar por código o nombre..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg border focus:outline-none focus:ring-2"
              style={{
                backgroundColor: colors.card,
                borderColor: colors.border,
                color: colors.text,
              }}
            />
          </div>

          <select
            value={almacenFiltro || ''}
            onChange={(e) => setAlmacenFiltro(e.target.value ? parseInt(e.target.value) : null)}
            className="px-4 py-2 rounded-lg border focus:outline-none"
            style={{
              backgroundColor: colors.card,
              borderColor: colors.border,
              color: colors.text,
            }}
          >
            <option value="">Todos los almacenes</option>
            {almacenes.map((a) => (
              <option key={a.id} value={a.id}>
                {a.nombre}
              </option>
            ))}
          </select>

          <select
            value={tipoFiltro}
            onChange={(e) => setTipoFiltro(e.target.value as TipoUbicacion | '')}
            className="px-4 py-2 rounded-lg border focus:outline-none"
            style={{
              backgroundColor: colors.card,
              borderColor: colors.border,
              color: colors.text,
            }}
          >
            <option value="">Todos los tipos</option>
            {Object.entries(TIPOS_UBICACION).map(([key, value]) => (
              <option key={key} value={key}>
                {value.icon} {value.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div
          className="p-4 rounded-xl"
          style={{ backgroundColor: colors.card, border: `1px solid ${colors.border}` }}
        >
          <div className="flex items-center gap-3">
            <Layers size={24} style={{ color: colors.primary }} />
            <div>
              <p className="text-2xl font-bold" style={{ color: colors.text }}>
                {ubicaciones.length}
              </p>
              <p className="text-sm" style={{ color: colors.textMuted }}>
                Total ubicaciones
              </p>
            </div>
          </div>
        </div>
        <div
          className="p-4 rounded-xl"
          style={{ backgroundColor: colors.card, border: `1px solid ${colors.border}` }}
        >
          <div className="flex items-center gap-3">
            <Warehouse size={24} style={{ color: colors.secondary }} />
            <div>
              <p className="text-2xl font-bold" style={{ color: colors.text }}>
                {almacenes.length}
              </p>
              <p className="text-sm" style={{ color: colors.textMuted }}>
                Almacenes
              </p>
            </div>
          </div>
        </div>
        <div
          className="p-4 rounded-xl"
          style={{ backgroundColor: colors.card, border: `1px solid ${colors.border}` }}
        >
          <div className="flex items-center gap-3">
            <Package size={24} style={{ color: '#10B981' }} />
            <div>
              <p className="text-2xl font-bold" style={{ color: colors.text }}>
                {ubicaciones.filter((u) => u.es_picking).length}
              </p>
              <p className="text-sm" style={{ color: colors.textMuted }}>
                Zonas picking
              </p>
            </div>
          </div>
        </div>
        <div
          className="p-4 rounded-xl"
          style={{ backgroundColor: colors.card, border: `1px solid ${colors.border}` }}
        >
          <div className="flex items-center gap-3">
            <CheckCircle size={24} style={{ color: '#3B82F6' }} />
            <div>
              <p className="text-2xl font-bold" style={{ color: colors.text }}>
                {ubicaciones.filter((u) => u.activo).length}
              </p>
              <p className="text-sm" style={{ color: colors.textMuted }}>
                Activas
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Lista agrupada por almacén */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <div
            className="animate-spin rounded-full h-12 w-12 border-4 border-t-transparent"
            style={{ borderColor: colors.primary, borderTopColor: 'transparent' }}
          />
        </div>
      ) : ubicacionesPorAlmacen.length === 0 ? (
        <div
          className="text-center py-12 rounded-xl"
          style={{ backgroundColor: colors.card, border: `1px solid ${colors.border}` }}
        >
          <MapPin size={48} className="mx-auto mb-4" style={{ color: colors.textMuted }} />
          <p style={{ color: colors.textMuted }}>No hay ubicaciones registradas</p>
          <button
            onClick={() => setShowForm(true)}
            className="mt-4 px-4 py-2 rounded-lg text-white"
            style={{ backgroundColor: colors.primary }}
          >
            Crear primera ubicación
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {ubicacionesPorAlmacen.map(({ almacen, ubicaciones: ubis }) => (
            <div
              key={almacen.id}
              className="rounded-xl overflow-hidden"
              style={{ backgroundColor: colors.card, border: `1px solid ${colors.border}` }}
            >
              {/* Header del almacén */}
              <button
                onClick={() => toggleAlmacen(almacen.id)}
                className="w-full flex items-center justify-between p-4 hover:opacity-90 transition-opacity"
                style={{ backgroundColor: `${colors.primary}10` }}
              >
                <div className="flex items-center gap-3">
                  <Warehouse size={24} style={{ color: colors.primary }} />
                  <div className="text-left">
                    <h3 className="font-semibold" style={{ color: colors.text }}>
                      {almacen.nombre}
                    </h3>
                    <p className="text-sm" style={{ color: colors.textMuted }}>
                      {almacen.codigo} • {ubis.length} ubicaciones
                    </p>
                  </div>
                </div>
                {expandedAlmacenes.has(almacen.id) ? (
                  <ChevronDown size={20} style={{ color: colors.textMuted }} />
                ) : (
                  <ChevronRight size={20} style={{ color: colors.textMuted }} />
                )}
              </button>

              {/* Ubicaciones del almacén */}
              {expandedAlmacenes.has(almacen.id) && (
                <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {ubis.map((u) => (
                    <div
                      key={u.id}
                      className="p-3 rounded-lg border flex items-start justify-between"
                      style={{
                        borderColor: colors.border,
                        backgroundColor: isDark ? '#1e293b' : '#f8fafc',
                      }}
                    >
                      <div className="flex items-start gap-3">
                        <span className="text-2xl">{TIPOS_UBICACION[u.tipo]?.icon || '📦'}</span>
                        <div>
                          <p className="font-mono font-bold" style={{ color: colors.text }}>
                            {u.codigo}
                          </p>
                          {u.nombre && u.nombre !== u.codigo && (
                            <p className="text-sm" style={{ color: colors.textMuted }}>
                              {u.nombre}
                            </p>
                          )}
                          <div className="flex items-center gap-2 mt-1">
                            <span
                              className="text-xs px-2 py-0.5 rounded-full"
                              style={{
                                backgroundColor: `${TIPOS_UBICACION[u.tipo]?.color}20`,
                                color: TIPOS_UBICACION[u.tipo]?.color,
                              }}
                            >
                              {TIPOS_UBICACION[u.tipo]?.label}
                            </span>
                            {u.es_picking && (
                              <span
                                className="text-xs px-2 py-0.5 rounded-full"
                                style={{
                                  backgroundColor: '#10B98120',
                                  color: '#10B981',
                                }}
                              >
                                Picking
                              </span>
                            )}
                            {!u.activo && (
                              <span
                                className="text-xs px-2 py-0.5 rounded-full"
                                style={{
                                  backgroundColor: '#EF444420',
                                  color: '#EF4444',
                                }}
                              >
                                Inactiva
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleEdit(u)}
                          className="p-1.5 rounded hover:opacity-80"
                          style={{ color: colors.primary }}
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm('¿Eliminar esta ubicación?')) {
                              deleteMutation.mutate(u.id);
                            }
                          }}
                          className="p-1.5 rounded hover:opacity-80"
                          style={{ color: '#EF4444' }}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal de formulario */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div
            className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-xl p-6"
            style={{ backgroundColor: colors.card }}
          >
            <h2 className="text-xl font-bold mb-4" style={{ color: colors.text }}>
              {editingUbicacion ? 'Editar Ubicación' : 'Nueva Ubicación'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Almacén */}
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: colors.text }}>
                  Almacén *
                </label>
                <select
                  value={formData.almacen_id}
                  onChange={(e) => setFormData({ ...formData, almacen_id: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 rounded-lg border focus:outline-none"
                  style={{
                    backgroundColor: colors.bg,
                    borderColor: colors.border,
                    color: colors.text,
                  }}
                  required
                >
                  <option value={0}>Seleccionar almacén</option>
                  {almacenes.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.nombre}
                    </option>
                  ))}
                </select>
              </div>

              {/* Código automático */}
              <div className="grid grid-cols-4 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: colors.text }}>
                    Pasillo *
                  </label>
                  <input
                    type="text"
                    value={formData.pasillo}
                    onChange={(e) => setFormData({ ...formData, pasillo: e.target.value.toUpperCase() })}
                    placeholder="A"
                    maxLength={3}
                    className="w-full px-3 py-2 rounded-lg border focus:outline-none text-center font-mono"
                    style={{
                      backgroundColor: colors.bg,
                      borderColor: colors.border,
                      color: colors.text,
                    }}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: colors.text }}>
                    Rack *
                  </label>
                  <input
                    type="text"
                    value={formData.rack}
                    onChange={(e) => setFormData({ ...formData, rack: e.target.value })}
                    placeholder="01"
                    maxLength={3}
                    className="w-full px-3 py-2 rounded-lg border focus:outline-none text-center font-mono"
                    style={{
                      backgroundColor: colors.bg,
                      borderColor: colors.border,
                      color: colors.text,
                    }}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: colors.text }}>
                    Nivel *
                  </label>
                  <input
                    type="text"
                    value={formData.nivel}
                    onChange={(e) => setFormData({ ...formData, nivel: e.target.value })}
                    placeholder="01"
                    maxLength={3}
                    className="w-full px-3 py-2 rounded-lg border focus:outline-none text-center font-mono"
                    style={{
                      backgroundColor: colors.bg,
                      borderColor: colors.border,
                      color: colors.text,
                    }}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: colors.text }}>
                    Posición
                  </label>
                  <input
                    type="text"
                    value={formData.posicion}
                    onChange={(e) => setFormData({ ...formData, posicion: e.target.value })}
                    placeholder="A"
                    maxLength={3}
                    className="w-full px-3 py-2 rounded-lg border focus:outline-none text-center font-mono"
                    style={{
                      backgroundColor: colors.bg,
                      borderColor: colors.border,
                      color: colors.text,
                    }}
                  />
                </div>
              </div>

              {/* Preview del código */}
              {codigoPreview && (
                <div
                  className="p-3 rounded-lg text-center"
                  style={{ backgroundColor: `${colors.primary}10` }}
                >
                  <p className="text-sm" style={{ color: colors.textMuted }}>
                    Código generado:
                  </p>
                  <p
                    className="text-xl font-mono font-bold"
                    style={{ color: colors.primary }}
                  >
                    {codigoPreview}
                  </p>
                </div>
              )}

              {/* Nombre descriptivo */}
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: colors.text }}>
                  Nombre descriptivo
                </label>
                <input
                  type="text"
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  placeholder="Ej: Estante de sillas plegables"
                  className="w-full px-3 py-2 rounded-lg border focus:outline-none"
                  style={{
                    backgroundColor: colors.bg,
                    borderColor: colors.border,
                    color: colors.text,
                  }}
                />
              </div>

              {/* Tipo */}
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: colors.text }}>
                  Tipo de ubicación
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {Object.entries(TIPOS_UBICACION).map(([key, value]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setFormData({ ...formData, tipo: key as TipoUbicacion })}
                      className="p-2 rounded-lg border text-center transition-all"
                      style={{
                        borderColor: formData.tipo === key ? value.color : colors.border,
                        backgroundColor: formData.tipo === key ? `${value.color}20` : 'transparent',
                      }}
                    >
                      <span className="text-xl">{value.icon}</span>
                      <p className="text-xs mt-1" style={{ color: colors.text }}>
                        {value.label}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Capacidades */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: colors.text }}>
                    Capacidad (kg)
                  </label>
                  <input
                    type="number"
                    value={formData.capacidad_kg}
                    onChange={(e) => setFormData({ ...formData, capacidad_kg: e.target.value })}
                    placeholder="0"
                    className="w-full px-3 py-2 rounded-lg border focus:outline-none"
                    style={{
                      backgroundColor: colors.bg,
                      borderColor: colors.border,
                      color: colors.text,
                    }}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: colors.text }}>
                    Capacidad (unidades)
                  </label>
                  <input
                    type="number"
                    value={formData.capacidad_unidades}
                    onChange={(e) => setFormData({ ...formData, capacidad_unidades: e.target.value })}
                    placeholder="0"
                    className="w-full px-3 py-2 rounded-lg border focus:outline-none"
                    style={{
                      backgroundColor: colors.bg,
                      borderColor: colors.border,
                      color: colors.text,
                    }}
                  />
                </div>
              </div>

              {/* Zona picking */}
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.es_picking}
                  onChange={(e) => setFormData({ ...formData, es_picking: e.target.checked })}
                  className="w-4 h-4 rounded"
                />
                <span style={{ color: colors.text }}>
                  Es zona de picking (acceso rápido)
                </span>
              </label>

              {/* Botones */}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={resetForm}
                  className="flex-1 px-4 py-2 rounded-lg border"
                  style={{ borderColor: colors.border, color: colors.text }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 rounded-lg text-white font-medium"
                  style={{ backgroundColor: colors.primary }}
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  {createMutation.isPending || updateMutation.isPending
                    ? 'Guardando...'
                    : editingUbicacion
                    ? 'Actualizar'
                    : 'Crear'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UbicacionesPage;
