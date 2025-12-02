import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Plus, Eye, Edit, Trash2, Calendar,
  Filter, X, Download, Search
} from 'lucide-react';
import { supabase } from '../../core/config/supabase';
import { usePermissions } from '../../core/permissions/usePermissions';
import { Button } from '../../shared/components/ui/Button';
import { Badge } from '../../shared/components/ui/Badge';
import { formatDate } from '../../shared/utils/formatters';
import { PageSkeleton } from '../../shared/components/ui/LoadingSpinner';
import { EventoModal } from './components/EventoModal';
import { EventoDetailModal } from './components/EventoDetailModal';
import { GaugeChart } from './components/GaugeChart'; // ⚡ NUEVO: Gauge Chart para Utilidad
import { useTheme } from '../../shared/components/theme'; // 🎨 Paleta dinámica
import {
  useEventosFinancialList,
  useEventosFinancialDashboard,
  EventosFinancialFilters
} from './hooks/useEventosFinancialList';
import { useClients } from './hooks/useClients';
import { useConfiguracionERP } from './hooks/useConfiguracionERP';

/**
 * 🎯 MÓDULO DE GESTIÓN DE EVENTOS MEJORADO
 * 
 * Características:
 * - Listado con campos de análisis financiero
 * - Filtros por año, mes y cliente
 * - Dashboard con sumatorias automáticas
 * - Datos actualizados desde vw_eventos_analisis_financiero
 */
export const EventosListPage: React.FC = () => {
  const [showFilters, setShowFilters] = useState(true);

  // 🎨 PALETA DINÁMICA
  const { paletteConfig, isDark } = useTheme();
  const themeColors = useMemo(() => ({
    primary: paletteConfig.primary,
    secondary: paletteConfig.secondary,
    accent: paletteConfig.accent,
    shades: paletteConfig.shades,
    cardBg: isDark ? '#1f2937' : '#ffffff',
    headerBg: isDark ? '#111827' : '#f9fafb',
    textPrimary: isDark ? '#f3f4f6' : '#111827',
    textSecondary: isDark ? '#9ca3af' : '#6b7280',
    border: isDark ? '#374151' : '#e5e7eb',
    hoverBg: isDark ? '#374151' : `${paletteConfig.primary}10`,
  }), [paletteConfig, isDark]);

  // Estados para los modales
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [editingEvento, setEditingEvento] = useState<any>(null);
  const [viewingEvento, setViewingEvento] = useState<any>(null);

  // Estado ÚNICO para controlar TODAS las tarjetas del dashboard simultáneamente
  const [showAllCardDetails, setShowAllCardDetails] = useState(false);

  // Estado para filas expandidas en la tabla (mostrar detalles de categorías)
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);

  // 🔧 CONFIGURACIÓN: Usar hook que persiste en localStorage
  const { config, updateDashboard, toggleCentavos, setFormatoNumeros } = useConfiguracionERP();
  const showCentavos = config.dashboard.mostrarCentavos;
  const moneyFormat = config.dashboard.formatoNumeros;
  const setShowCentavos = (value: boolean) => updateDashboard({ mostrarCentavos: value });
  const setMoneyFormat = (value: 'normal' | 'miles' | 'millones') => setFormatoNumeros(value);

  // Helper para formatear dinero respetando showCentavos y formato (miles/millones)
  const formatMoney = (amount: number, forceDecimals = false): string => {
    let value = amount;
    let suffix = '';
    let decimals = 0;

    // Aplicar formato de miles o millones
    if (moneyFormat === 'miles') {
      value = amount / 1000;
      suffix = 'K';
      decimals = 1; // Siempre 1 decimal en miles
    } else if (moneyFormat === 'millones') {
      value = amount / 1000000;
      suffix = 'M';
      decimals = 1; // Siempre 1 decimal en millones
    } else {
      // Formato normal: respetar showCentavos
      decimals = (showCentavos || forceDecimals) ? 2 : 0;
    }

    const formatted = value.toLocaleString('es-MX', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    });

    return suffix ? `${formatted}${suffix}` : formatted;
  };
  
  // Estados de filtros
  const currentYear = new Date().getFullYear();
  const [filters, setFilters] = useState<EventosFinancialFilters>({
    año: currentYear,
    mes: undefined,
    cliente_id: undefined,
    search: undefined,
  });

  // Filtro adicional para color de KPI (no incluido en EventosFinancialFilters)
  const [kpiColorFilter, setKpiColorFilter] = useState<string>('');

  const { canCreate, canUpdate, canDelete } = usePermissions();

  // Cargar datos con filtros
  const { clients: clientes } = useClients();
  const { data: eventos = [], isLoading, refetch } = useEventosFinancialList(filters);
  const { data: dashboard } = useEventosFinancialDashboard(filters);

  // Filtrar eventos por color de KPI
  const eventosFiltrados = useMemo(() => {
    if (!kpiColorFilter) return eventos;

    return eventos.filter((evento: any) => {
      // Usar campos directamente de la vista
      const margenPlaneado = evento.margen_real_pct || 0;

      const colorCategoria = getKpiColorCategory(margenPlaneado);
      return colorCategoria === kpiColorFilter;
    });
  }, [eventos, kpiColorFilter]);

  // Generar opciones de años (últimos 5 años + próximo año)
  const yearOptions = useMemo(() => {
    const years = [];
    for (let i = -2; i <= 2; i++) {
      years.push(currentYear + i);
    }
    return years;
  }, [currentYear]);

  // Opciones de meses
  const monthOptions = [
    { value: 1, label: 'Enero' },
    { value: 2, label: 'Febrero' },
    { value: 3, label: 'Marzo' },
    { value: 4, label: 'Abril' },
    { value: 5, label: 'Mayo' },
    { value: 6, label: 'Junio' },
    { value: 7, label: 'Julio' },
    { value: 8, label: 'Agosto' },
    { value: 9, label: 'Septiembre' },
    { value: 10, label: 'Octubre' },
    { value: 11, label: 'Noviembre' },
    { value: 12, label: 'Diciembre' },
  ];

  // Helper para determinar la categoría de color del KPI según el porcentaje de utilidad
  const getKpiColorCategory = (margenPorcentaje: number): string => {
    if (margenPorcentaje >= 35) return 'verde';
    if (margenPorcentaje >= 25) return 'amarillo';
    if (margenPorcentaje >= 1) return 'rojo';
    return 'ninguno';
  };

  // Función para alternar expansión de fila
  const toggleRowExpansion = (eventoId: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(eventoId)) {
      newExpanded.delete(eventoId);
    } else {
      newExpanded.add(eventoId);
    }
    setExpandedRows(newExpanded);
  };

  // Funciones de manejo de eventos
  const handleViewEvento = (evento: any) => {
    setViewingEvento(evento);
    setShowDetailModal(true);
  };

  const handleEditEvento = async (evento: any) => {
    try {
      console.log('📝 Cargando evento completo para edición, ID:', evento.id);

      // Cargar evento completo desde evt_eventos (no desde la vista)
      // La vista vw_eventos_analisis_financiero no incluye responsable_id, solicitante_id, etc.
      const { data, error } = await supabase
        .from('evt_eventos_erp')
        .select('*')
        .eq('id', evento.id)
        .single();

      if (error) {
        console.error('❌ Error al cargar evento:', error);
        throw error;
      }

      console.log('✅ Evento completo cargado:', {
        id: data.id,
        responsable_id: data.responsable_id,
        solicitante_id: data.solicitante_id,
        ganancia_estimada: data.ganancia_estimada,
      });

      setEditingEvento(data);
      setShowModal(true);
    } catch (error) {
      console.error('Error al cargar evento para editar:', error);
      alert('Error al cargar el evento. Ver consola para detalles.');
    }
  };

  const handleDeleteEvento = async (evento: any) => {
    if (!confirm(`¿Está seguro de que desea eliminar el evento "${evento.nombre_proyecto}"?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('evt_eventos_erp')
        .delete()
        .eq('id', evento.id);
      
      if (error) throw error;
      // Refrescar datos después de eliminar
      window.location.reload();
    } catch (error) {
      console.error('Error al eliminar evento:', error);
      alert('Error al eliminar el evento. Ver consola para detalles.');
    }
  };

  const handleExportData = () => {
    console.log('Exportar datos:', eventos);
    alert('Función de exportación en desarrollo');
  };

  const handleSaveEvento = async (formData: any) => {
    try {
      console.log('💾 Guardando evento:', formData);

      if (editingEvento?.id) {
        // 🔄 Actualizar evento existente
        console.log('🔄 Actualizando evento ID:', editingEvento.id);

        const { data, error } = await supabase
          .from('evt_eventos_erp')
          .update({
            ...formData,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingEvento.id)
          .select();

        if (error) {
          console.error('❌ Error al actualizar:', error);
          throw error;
        }

        console.log('✅ Evento actualizado:', data);
        alert('✅ Evento actualizado correctamente');
      } else {
        // 🆕 Crear evento nuevo
        console.log('🆕 Creando evento nuevo');

        const { data, error } = await supabase
          .from('evt_eventos_erp')
          .insert([{
            ...formData,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }])
          .select();

        if (error) {
          console.error('❌ Error al insertar:', error);
          throw error;
        }

        console.log('✅ Evento creado:', data);
        alert('✅ Evento creado correctamente');
      }

      // Cerrar modal y recargar datos
      setShowModal(false);
      setEditingEvento(null);
      refetch();
    } catch (err: any) {
      console.error('❌ Error guardando el evento:', err);
      alert(`Error al guardar el evento: ${err.message || 'Ver consola para detalles'}`);
    }
  };

  const handleClearFilters = () => {
    setFilters({
      año: currentYear,
      mes: undefined,
      cliente_id: undefined,
      search: undefined,
    });
  };

  // Definición de columnas fuera del render principal
  const columns = [
    {
      key: 'expand',
      label: '',
      width: '50px',
      render: (_value: any, row: any) => {
        const isExpanded = expandedRows.has(row.id);
        return (
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleRowExpansion(row.id);
            }}
            className="transition-colors p-1 rounded"
            style={{ color: themeColors.textSecondary }}
            onMouseEnter={(e) => e.currentTarget.style.color = themeColors.primary}
            onMouseLeave={(e) => e.currentTarget.style.color = themeColors.textSecondary}
            title={isExpanded ? 'Ocultar detalles' : 'Mostrar detalles'}
          >
            {isExpanded ? '▼' : '▶'}
          </button>
        );
      },
    },
    {
      key: 'clave_evento',
      label: 'Clave',
      filterType: 'text' as const,
      width: '100px',
      render: (value: string) => (
        <div className="font-mono text-sm font-semibold" style={{ color: themeColors.textPrimary }}>
          {value}
        </div>
      )
    },
    {
      key: 'nombre_proyecto',
      label: 'Proyecto',
      filterType: 'text' as const,
      render: (value: string, row: any) => (
        <div>
          <div className="font-medium" style={{ color: themeColors.textPrimary }}>{value}</div>
          <div className="text-xs" style={{ color: themeColors.textSecondary }}>
            {formatDate(row.fecha_evento)}
          </div>
        </div>
      )
    },
    {
      key: 'cliente_nombre',
      label: 'Cliente',
      filterType: 'text' as const,
      render: (value: string) => (
        <div className="text-sm" style={{ color: themeColors.textPrimary }}>{value}</div>
      )
    },
    {
      key: 'estado_nombre',
      label: 'Estado',
      filterType: 'select' as const,
      render: (value: string) => (
        <Badge variant="info" size="sm">
          {value}
        </Badge>
      )
    },
    {
      key: 'ingresos_totales',
      label: 'Ingresos',
      filterType: 'number' as const,
      align: 'right' as const,
      render: (value: number, row: any) => {
        const isExpanded = hoveredRow === row.id || expandedRows.has(row.id);
        return (
          <div className="text-right">
            <div className="font-bold text-base" style={{ color: themeColors.primary }}>
              ${formatMoney(row.ingresos_totales || 0)}
            </div>
            {isExpanded && (
              <div className="text-xs mt-1 space-y-0.5 border-t pt-1" style={{ color: themeColors.textSecondary }}>
                <div className="flex justify-between gap-2">
                  <span>Cobrados:</span>
                  <span className="font-medium" style={{ color: themeColors.shades[700] }}>${formatMoney(row.ingresos_cobrados || 0)}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span>Pendientes:</span>
                  <span className="font-medium" style={{ color: themeColors.secondary }}>${formatMoney(row.ingresos_pendientes || 0)}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span>Estimados:</span>
                  <span style={{ color: themeColors.textSecondary }}>${formatMoney(row.ingreso_estimado || 0)}</span>
                </div>
              </div>
            )}
          </div>
        );
      }
    },
    {
      key: 'gastos_totales',
      label: 'Gastos',
      filterType: 'number' as const,
      align: 'right' as const,
      render: (_value: number, row: any) => {
        const isExpanded = hoveredRow === row.id || expandedRows.has(row.id);
        const gastosPagados = row.gastos_pagados_total || 0;
        const gastosPendientes = row.gastos_pendientes_total || 0;
        const gastosTotal = gastosPagados + gastosPendientes;

        // Desglose por categoría
        const combustible = (row.gastos_combustible_pagados || 0) + (row.gastos_combustible_pendientes || 0);
        const materiales = (row.gastos_materiales_pagados || 0) + (row.gastos_materiales_pendientes || 0);
        const rh = (row.gastos_rh_pagados || 0) + (row.gastos_rh_pendientes || 0);
        const sps = (row.gastos_sps_pagados || 0) + (row.gastos_sps_pendientes || 0);

        return (
          <div className="text-right">
            <div className="font-bold text-base" style={{ color: themeColors.accent }}>
              ${formatMoney(gastosTotal)}
            </div>
            {isExpanded && (
              <div className="text-xs mt-1 space-y-0.5 border-t pt-1" style={{ color: themeColors.textSecondary }}>
                <div className="flex justify-between gap-2">
                  <span>🚗⛽ Comb:</span>
                  <span className="font-medium">${formatMoney(combustible)}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span>🛠️ Mat:</span>
                  <span className="font-medium">${formatMoney(materiales)}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span>👥 RH:</span>
                  <span className="font-medium">${formatMoney(rh)}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span>💳 SPs:</span>
                  <span className="font-medium">${formatMoney(sps)}</span>
                </div>
              </div>
            )}
          </div>
        );
      }
    },
    {
      key: 'disponible',
      label: 'Provisiones',
      filterType: 'number' as const,
      align: 'right' as const,
      render: (_value: any, row: any) => {
        const isExpanded = hoveredRow === row.id || expandedRows.has(row.id);
        // Usar campos directamente de la vista
        const provisionesTotal = row.provisiones_total || 0;
        const gastosTotales = row.gastos_totales || 0;
        const disponible = provisionesTotal - gastosTotales;

        // Desglose por categoría (provisiones)
        const provComb = row.provision_combustible || 0;
        const provMat = row.provision_materiales || 0;
        const provRH = row.provision_rh || 0;
        const provSPs = row.provision_sps || 0;

        const getColor = (val: number) => val > 0 ? themeColors.shades[700] : val < 0 ? themeColors.accent : themeColors.textSecondary;

        return (
          <div className="text-right">
            <div className="font-bold text-base" style={{ color: getColor(disponible) }}>
              ${formatMoney(Math.max(0, disponible))}
            </div>
            {isExpanded && (
              <div className="text-xs mt-1 space-y-0.5 border-t pt-1" style={{ color: themeColors.textSecondary }}>
                <div className="flex justify-between gap-2">
                  <span>🚗⛽ Comb:</span>
                  <span className="font-medium">${formatMoney(provComb)}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span>🛠️ Mat:</span>
                  <span className="font-medium">${formatMoney(provMat)}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span>👥 RH:</span>
                  <span className="font-medium">${formatMoney(provRH)}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span>💳 SPs:</span>
                  <span className="font-medium">${formatMoney(provSPs)}</span>
                </div>
                <div className="flex justify-between gap-2 font-bold border-t pt-1" style={{ color: getColor(disponible) }}>
                  <span>💰 Disp:</span>
                  <span>${formatMoney(disponible)}</span>
                </div>
              </div>
            )}
          </div>
        );
      }
    },
    {
      key: 'utilidad_estimada',
      label: 'Utilidad',
      filterType: 'number' as const,
      align: 'center' as const,
      width: '130px',
      render: (_value: number, row: any) => {
        const isExpanded = hoveredRow === row.id || expandedRows.has(row.id);
        // Usar campos directamente de la vista vw_eventos_analisis_financiero_erp
        const ingresosTotales = row.ingresos_totales || 0;
        const gastosTotales = row.gastos_totales || 0;
        const provisionesTotal = row.provisiones_total || 0;
        // La vista ya calcula utilidad_real y margen_real_pct
        const utilidadReal = row.utilidad_real ?? (ingresosTotales - gastosTotales - Math.max(0, provisionesTotal - gastosTotales));
        const margenReal = row.margen_real_pct ?? (ingresosTotales > 0 ? (utilidadReal / ingresosTotales) * 100 : 0);

        const getColorInfo = (margen: number) => {
          if (margen >= 35) return { color: themeColors.shades[700], label: 'Excelente' };
          if (margen >= 25) return { color: themeColors.secondary, label: 'Regular' };
          if (margen >= 1) return { color: themeColors.accent, label: 'Bajo' };
          return { color: themeColors.textSecondary, label: 'Ninguno' };
        };
        const colorInfo = getColorInfo(margenReal);

        // Tooltip con fórmula: Utilidad = Ingresos - Gastos - Provisiones
        const tooltip = `Margen: ${margenReal.toFixed(1)}% (${colorInfo.label})\n\nIngresos: $${formatMoney(ingresosTotales)}\n- Gastos: $${formatMoney(gastosTotales)}\n- Provisiones: $${formatMoney(provisionesTotal)}\n= Utilidad: $${formatMoney(utilidadReal)}`;

        return (
          <div className="text-center" title={tooltip}>
            {/* Monto - SIEMPRE VISIBLE */}
            <div className="font-bold text-base" style={{ color: colorInfo.color }}>
              ${formatMoney(utilidadReal)}
            </div>
            {/* Gauge - SOLO AL EXPANDIR */}
            {isExpanded && (
              <div className="flex justify-center mt-1">
                <GaugeChart
                  value={Math.max(0, Math.min(100, margenReal))}
                  size="sm"
                  showLabel={true}
                />
              </div>
            )}
          </div>
        );
      }
    }
  ];

  const actions = [
    {
      label: 'Ver Detalle',
      icon: Eye,
      onClick: handleViewEvento,
      tooltip: 'Ver detalles del evento'
    },
    {
      label: 'Editar',
      icon: Edit,
      onClick: handleEditEvento,
      show: () => canUpdate('eventos'),
      tooltip: canUpdate('eventos') ? 'Editar evento' : 'Sin permisos para editar'
    },
    {
      label: 'Eliminar',
      icon: Trash2,
      onClick: handleDeleteEvento,
      show: () => canDelete('eventos'),
      className: 'text-red-600 hover:text-red-700',
      tooltip: canDelete('eventos') ? 'Eliminar evento' : 'Sin permisos para eliminar'
    }
  ];

  if (isLoading) return <PageSkeleton />;

  return (
    <motion.div
      className="space-y-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Header con título y botones */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: themeColors.textPrimary }}>Gestión de Eventos</h1>
          <p className="mt-1" style={{ color: themeColors.textSecondary }}>
            Administra todos los eventos con control financiero y OCR integrado
          </p>
        </div>
        
        <div className="flex gap-2">
          {/* Botón de formato de números (Miles/Millones/Normal) */}
          <Button
            onClick={() => {
              if (moneyFormat === 'normal') setMoneyFormat('miles');
              else if (moneyFormat === 'miles') setMoneyFormat('millones');
              else setMoneyFormat('normal');
            }}
            variant="outline"
            className="border-gray-300 font-semibold"
          >
            💲 {moneyFormat === 'miles' ? 'K' : moneyFormat === 'millones' ? 'M' : '$'}
          </Button>

          <Button
            onClick={toggleCentavos}
            variant="outline"
            className="border-gray-300"
            disabled={moneyFormat !== 'normal'}
            title="Mostrar/ocultar centavos"
          >
            {showCentavos ? '💲 .00' : '💲'}
          </Button>

          <Button
            onClick={() => setShowFilters(!showFilters)}
            variant="outline"
            className="border-gray-300"
          >
            <Filter className="w-4 h-4 mr-2" />
            {showFilters ? 'Ocultar' : 'Mostrar'} Filtros
          </Button>

          <Button
            onClick={handleExportData}
            variant="outline"
            className="border-gray-300"
          >
            <Download className="w-4 h-4 mr-2" />
            Exportar
          </Button>

          {canCreate('eventos') && (
            <Button
              onClick={() => {
                setEditingEvento(null);
                setShowModal(true);
              }}
              style={{ backgroundColor: themeColors.primary }}
              className="hover:opacity-90 text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              Nuevo Evento
            </Button>
          )}
        </div>
      </div>

      {/* Panel de Filtros */}
      {showFilters && (
        <motion.div
          className="rounded-lg border p-4"
          style={{ backgroundColor: themeColors.cardBg, borderColor: themeColors.border }}
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
        >
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
            {/* Filtro de Año */}
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: themeColors.textPrimary }}>
                Año
              </label>
              <select
                value={filters.año || ''}
                onChange={(e) => setFilters({ ...filters, año: e.target.value ? parseInt(e.target.value) : undefined })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:border-transparent"
                style={{ borderColor: themeColors.border, backgroundColor: themeColors.cardBg, color: themeColors.textPrimary }}
              >
                <option value="">Todos los años</option>
                {yearOptions.map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>

            {/* Filtro de Mes */}
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: themeColors.textPrimary }}>
                Mes
              </label>
              <select
                value={filters.mes || ''}
                onChange={(e) => setFilters({ ...filters, mes: e.target.value ? parseInt(e.target.value) : undefined })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:border-transparent"
                style={{ borderColor: themeColors.border, backgroundColor: themeColors.cardBg, color: themeColors.textPrimary }}
                disabled={!filters.año}
              >
                <option value="">Todos los meses</option>
                {monthOptions.map(month => (
                  <option key={month.value} value={month.value}>
                    {month.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Filtro de Cliente */}
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: themeColors.textPrimary }}>
                Cliente
              </label>
              <select
                value={filters.cliente_id || ''}
                onChange={(e) => setFilters({ ...filters, cliente_id: e.target.value || undefined })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:border-transparent"
                style={{ borderColor: themeColors.border, backgroundColor: themeColors.cardBg, color: themeColors.textPrimary }}
              >
                <option value="">Todos los clientes</option>
                {clientes?.map((cliente: any) => (
                  <option key={cliente.id} value={cliente.id}>
                    {cliente.nombre_comercial || cliente.razon_social}
                  </option>
                ))}
              </select>
            </div>

            {/* Filtro de Provisiones */}
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: themeColors.textPrimary }}>
                Provisiones
              </label>
              <select
                value={filters.disponible_positivo ? 'disponible' : ''}
                onChange={(e) => setFilters({ ...filters, disponible_positivo: e.target.value === 'disponible' ? true : undefined })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:border-transparent"
                style={{ borderColor: themeColors.border, backgroundColor: themeColors.cardBg, color: themeColors.textPrimary }}
              >
                <option value="">Todos</option>
                <option value="disponible">Con disponible &gt; 0</option>
                <option value="cero">Con disponible = 0</option>
                <option value="negativo">Con disponible &lt; 0</option>
              </select>
            </div>

            {/* Filtro de Color KPI */}
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: themeColors.textPrimary }}>
                Color KPI
              </label>
              <select
                value={kpiColorFilter}
                onChange={(e) => setKpiColorFilter(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:border-transparent"
                style={{ borderColor: themeColors.border, backgroundColor: themeColors.cardBg, color: themeColors.textPrimary }}
              >
                <option value="">Todos</option>
                <option value="verde">🟢 Verde (≥35%)</option>
                <option value="amarillo">🟡 Amarillo (25-34%)</option>
                <option value="rojo">🔴 Rojo (1-24%)</option>
                <option value="ninguno">⚫ Ninguno (≤0%)</option>
              </select>
            </div>

            {/* Búsqueda */}
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: themeColors.textPrimary }}>
                Buscar
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4" style={{ color: themeColors.textSecondary }} />
                <input
                  type="text"
                  value={filters.search || ''}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value || undefined })}
                  placeholder="Clave, proyecto, cliente..."
                  className="w-full pl-10 pr-3 py-2 border rounded-lg focus:ring-2 focus:border-transparent"
                  style={{ borderColor: themeColors.border, backgroundColor: themeColors.cardBg, color: themeColors.textPrimary }}
                />
              </div>
            </div>
          </div>

          {/* Botón para limpiar filtros */}
          {(filters.año !== currentYear || filters.mes || filters.cliente_id || filters.search || filters.disponible_positivo || kpiColorFilter) && (
            <div className="mt-4 flex justify-end">
              <Button
                onClick={() => {
                  handleClearFilters();
                  setKpiColorFilter('');
                }}
                variant="outline"
                size="sm"
                className="border-gray-300"
              >
                <X className="w-4 h-4 mr-2" />
                Limpiar Filtros
              </Button>
            </div>
          )}
        </motion.div>
      )}

      {/* Dashboard de Sumatorias - Diseño con separadores verticales */}
      {dashboard && (
        <div
          className="rounded-lg border cursor-pointer hover:shadow-md transition-shadow"
          style={{ backgroundColor: themeColors.cardBg, borderColor: themeColors.border }}
          onClick={() => setShowAllCardDetails(!showAllCardDetails)}
        >
          <div className="flex flex-col lg:flex-row divide-y lg:divide-y-0 lg:divide-x divide-gray-200">

            {/* Total Eventos */}
            <div className="flex-1 p-4">
              <div className="flex flex-col">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="w-4 h-4" style={{ color: themeColors.primary }} />
                  <p className="text-sm font-medium" style={{ color: themeColors.textSecondary }}>Eventos</p>
                </div>
                <p className="text-2xl font-bold" style={{ color: themeColors.textPrimary }}>
                  {dashboard.total_eventos}
                </p>
              </div>
            </div>

            {/* Ingresos */}
            <div className="flex-1 p-4">
              <div className="flex flex-col">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium" style={{ color: themeColors.textSecondary }}>Ingresos</p>
                  <span className="text-xs" style={{ color: themeColors.primary }}>{showAllCardDetails ? '▲' : '▼'}</span>
                </div>
                <p className="text-xl font-bold" style={{ color: themeColors.primary }}>
                  ${formatMoney(dashboard.total_ingresos_reales)}
                </p>
                {showAllCardDetails && (
                  <div className="text-xs mt-2 pt-2 border-t space-y-1" style={{ color: themeColors.textSecondary }}>
                    <div className="flex justify-between"><span>Cobrados:</span><span style={{ color: themeColors.shades[700] }}>${formatMoney(dashboard.total_ingresos_cobrados)}</span></div>
                    <div className="flex justify-between"><span>Pendientes:</span><span style={{ color: themeColors.secondary }}>${formatMoney(dashboard.total_ingresos_pendientes)}</span></div>
                    <div className="flex justify-between"><span>Estimados:</span><span style={{ color: themeColors.textSecondary }}>${formatMoney(dashboard.total_ingresos_estimados)}</span></div>
                  </div>
                )}
              </div>
            </div>

            {/* Gastos Totales */}
            <div className="flex-1 p-4">
              <div className="flex flex-col">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium" style={{ color: themeColors.textSecondary }}>Gastos</p>
                  <span className="text-xs" style={{ color: themeColors.primary }}>{showAllCardDetails ? '▲' : '▼'}</span>
                </div>
                <p className="text-xl font-bold" style={{ color: themeColors.accent }}>
                  ${formatMoney(dashboard.total_gastos_totales)}
                </p>
                {showAllCardDetails && (
                  <div className="text-xs mt-2 pt-2 border-t space-y-1" style={{ color: themeColors.textSecondary }}>
                    <div className="flex justify-between"><span>🚗⛽ Combustible:</span><span>${formatMoney(dashboard.total_gastos_combustible_pagados + dashboard.total_gastos_combustible_pendientes)}</span></div>
                    <div className="flex justify-between"><span>🛠️ Materiales:</span><span>${formatMoney(dashboard.total_gastos_materiales_pagados + dashboard.total_gastos_materiales_pendientes)}</span></div>
                    <div className="flex justify-between"><span>👥 RH:</span><span>${formatMoney(dashboard.total_gastos_rh_pagados + dashboard.total_gastos_rh_pendientes)}</span></div>
                    <div className="flex justify-between"><span>💳 Solicitudes:</span><span>${formatMoney(dashboard.total_gastos_sps_pagados + dashboard.total_gastos_sps_pendientes)}</span></div>
                  </div>
                )}
              </div>
            </div>

            {/* Provisiones */}
            <div className="flex-1 p-4">
              <div className="flex flex-col">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium" style={{ color: themeColors.textSecondary }}>Provisiones</p>
                  <span className="text-xs" style={{ color: themeColors.primary }}>{showAllCardDetails ? '▲' : '▼'}</span>
                </div>
                {(() => {
                  const disponible = dashboard.total_provisiones - dashboard.total_gastos_totales;
                  const disponibleCombustible = dashboard.total_provision_combustible -
                    (dashboard.total_gastos_combustible_pagados + dashboard.total_gastos_combustible_pendientes);
                  const disponibleMateriales = dashboard.total_provision_materiales -
                    (dashboard.total_gastos_materiales_pagados + dashboard.total_gastos_materiales_pendientes);
                  const disponibleRH = dashboard.total_provision_rh -
                    (dashboard.total_gastos_rh_pagados + dashboard.total_gastos_rh_pendientes);
                  const disponibleSPs = dashboard.total_provision_sps -
                    (dashboard.total_gastos_sps_pagados + dashboard.total_gastos_sps_pendientes);

                  return (
                    <>
                      <p className="text-xl font-bold" style={{ color: disponible >= 0 ? themeColors.shades[700] : themeColors.accent }}>
                        ${formatMoney(Math.max(0, disponible))}
                      </p>
                      {showAllCardDetails && (
                        <div className="text-xs mt-2 pt-2 border-t space-y-1" style={{ color: themeColors.textSecondary }}>
                          <div className="flex justify-between" style={{ color: disponibleCombustible >= 0 ? 'inherit' : themeColors.accent }}>
                            <span>🚗⛽ Combustible:</span><span>${formatMoney(Math.max(0, disponibleCombustible))}</span>
                          </div>
                          <div className="flex justify-between" style={{ color: disponibleMateriales >= 0 ? 'inherit' : themeColors.accent }}>
                            <span>🛠️ Materiales:</span><span>${formatMoney(Math.max(0, disponibleMateriales))}</span>
                          </div>
                          <div className="flex justify-between" style={{ color: disponibleRH >= 0 ? 'inherit' : themeColors.accent }}>
                            <span>👥 RH:</span><span>${formatMoney(Math.max(0, disponibleRH))}</span>
                          </div>
                          <div className="flex justify-between" style={{ color: disponibleSPs >= 0 ? 'inherit' : themeColors.accent }}>
                            <span>💳 Solicitudes:</span><span>${formatMoney(Math.max(0, disponibleSPs))}</span>
                          </div>
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            </div>

            {/* Utilidad - Colapsado: solo monto, Expandido: monto + gauge */}
            <div className="flex-1 p-4">
              <div className="flex flex-col">
                {(() => {
                  // FÓRMULA DEL CLIENTE: Utilidad = Ingresos - Gastos - Provisiones Disponibles
                  const provisionesDisponibles = Math.max(0, dashboard.total_provisiones - dashboard.total_gastos_totales);
                  const utilidad = dashboard.total_ingresos_reales - dashboard.total_gastos_totales - provisionesDisponibles;
                  const margenUtilidad = dashboard.total_ingresos_reales > 0
                    ? (utilidad / dashboard.total_ingresos_reales) * 100
                    : 0;

                  return (
                    <>
                      {/* Etiqueta y flecha - SIEMPRE VISIBLE */}
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-medium" style={{ color: themeColors.textSecondary }}>UTILIDAD</p>
                        <span className="text-xs" style={{ color: themeColors.primary }}>{showAllCardDetails ? '▲' : '▼'}</span>
                      </div>
                      {/* Monto - SIEMPRE VISIBLE */}
                      <p className="text-xl font-bold" style={{ color: utilidad >= 0 ? themeColors.shades[700] : themeColors.accent }}>
                        ${formatMoney(utilidad)}
                      </p>
                      {/* Gauge - SOLO CUANDO EXPANDIDO */}
                      {showAllCardDetails && (
                        <div className="flex justify-center mt-2">
                          <GaugeChart
                            value={Math.max(0, Math.min(100, margenUtilidad))}
                            size="sm"
                            showLabel={true}
                          />
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Información de eventos filtrados */}
      <div className="flex items-center justify-between text-sm px-4 py-2 rounded-lg" style={{ color: themeColors.textSecondary, backgroundColor: themeColors.headerBg }}>
        <span>
          Mostrando <strong>{eventosFiltrados.length}</strong> eventos
          {filters.año && ` del año ${filters.año}`}
          {filters.mes && ` - ${monthOptions.find(m => m.value === filters.mes)?.label}`}
          {filters.cliente_id && ` - ${clientes?.find((c: any) => c.id === filters.cliente_id)?.nombre_comercial || 'Cliente seleccionado'}`}
          {kpiColorFilter && ` - KPI: ${kpiColorFilter.charAt(0).toUpperCase() + kpiColorFilter.slice(1)}`}
        </span>
      </div>

      {/* Tabla de eventos con filas expandibles */}
      <div className="rounded-lg border overflow-hidden" style={{ backgroundColor: themeColors.cardBg, borderColor: themeColors.border }}>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y" style={{ borderColor: themeColors.border }}>
            <thead style={{ backgroundColor: themeColors.headerBg }}>
              <tr>
                {columns.map((column) => (
                  <th
                    key={column.key}
                    className={`px-3 py-3 text-xs font-medium uppercase tracking-wider ${
                      column.align === 'right' ? 'text-right' :
                      column.align === 'center' ? 'text-center' : 'text-center'
                    }`}
                    style={{ width: column.width, color: themeColors.textSecondary }}
                  >
                    {column.label}
                  </th>
                ))}
                <th className="px-3 py-3 text-center text-xs font-medium uppercase tracking-wider w-24" style={{ color: themeColors.textSecondary }}>
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody style={{ backgroundColor: themeColors.cardBg }}>
              {eventosFiltrados.map((evento) => {
                return (
                  <tr
                    key={evento.id}
                    className="transition-colors cursor-pointer border-b"
                    style={{ borderColor: themeColors.border }}
                    onMouseEnter={(e) => { setHoveredRow(evento.id); e.currentTarget.style.backgroundColor = themeColors.hoverBg; }}
                    onMouseLeave={(e) => { setHoveredRow(null); e.currentTarget.style.backgroundColor = 'transparent'; }}
                    onClick={() => toggleRowExpansion(evento.id)}
                  >
                    {columns.map((column) => (
                      <td
                        key={column.key}
                        className={`px-3 py-4 text-sm ${
                          column.align === 'right' ? 'text-right' :
                          column.align === 'center' ? 'text-center' : 'text-center'
                        }`}
                        style={{ color: themeColors.textPrimary }}
                        onClick={(e) => {
                          // Si es la columna de expand, dejar que el botón maneje el click
                          if (column.key === 'expand') {
                            e.stopPropagation();
                          }
                        }}
                      >
                        {column.render
                          ? column.render((evento as any)[column.key], evento)
                          : (evento as any)[column.key]}
                      </td>
                    ))}
                    <td className="px-3 py-4 text-sm text-center" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        {actions.map((action, idx) => {
                          const show = typeof action.show === 'function' ? action.show() : true;
                          if (!show) return null;
                          const Icon = action.icon;
                          const isDelete = action.label === 'Eliminar';
                          return (
                            <button
                              key={idx}
                              onClick={(e) => {
                                e.stopPropagation();
                                action.onClick(evento);
                              }}
                              className="p-1.5 rounded transition-colors"
                              style={{ color: isDelete ? themeColors.accent : themeColors.textSecondary }}
                              onMouseEnter={(e) => e.currentTarget.style.color = isDelete ? themeColors.accent : themeColors.primary}
                              onMouseLeave={(e) => e.currentTarget.style.color = isDelete ? themeColors.accent : themeColors.textSecondary}
                              title={action.tooltip}
                            >
                              <Icon className="w-4 h-4" />
                            </button>
                          );
                        })}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Creación/Edición */}
      {showModal && (
        <EventoModal
          evento={editingEvento}
          onClose={() => {
            setShowModal(false);
            setEditingEvento(null);
          }}
          onSave={handleSaveEvento}
        />
      )}

      {/* Modal de Detalle */}
      {showDetailModal && viewingEvento && (
        <EventoDetailModal
          eventoId={viewingEvento.id}
          onClose={() => {
            setShowDetailModal(false);
            setViewingEvento(null);
          }}
          onEdit={(evento) => {
            setShowDetailModal(false);
            setViewingEvento(null);
            setEditingEvento(evento);
            setShowModal(true);
          }}
          onRefresh={() => window.location.reload()}
        />
      )}
    </motion.div>
  );
};
