import React, { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Plus, Eye, Edit, Trash2, Calendar,
  Filter, X, Download, Search, ToggleLeft, ToggleRight
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

  // 💱 Toggle IVA / Subtotales (por defecto: Subtotales)
  const [showConIVA, setShowConIVA] = useState(false);

  // Helper: Obtener valor de ingresos según toggle IVA (usa campos de la vista SQL)
  const getIngresos = (row: any) => showConIVA ? (row.ingresos_totales || 0) : (row.ingresos_subtotal || row.ingresos_totales / 1.16 || 0);

  // Helper: Obtener valor de gastos según toggle IVA (usa campos de la vista SQL)
  const getGastos = (row: any) => showConIVA ? (row.gastos_totales || 0) : (row.gastos_subtotal || row.gastos_totales / 1.16 || 0);

  // Helper: Obtener valor de provisiones según toggle IVA (usa campos de la vista SQL)
  const getProvisiones = (row: any) => showConIVA ? (row.provisiones_total || 0) : (row.provisiones_subtotal || row.provisiones_total / 1.16 || 0);

  // Helper: Obtener utilidad según toggle IVA (usa campos pre-calculados de la vista SQL)
  const getUtilidad = (row: any) => showConIVA ? (row.utilidad_real || 0) : (row.utilidad_bruta || row.utilidad_real / 1.16 || 0);

  // Helper: Obtener margen según toggle IVA (usa campos pre-calculados de la vista SQL)
  const getMargen = (row: any) => showConIVA ? (row.margen_real_pct || 0) : (row.margen_bruto_pct || row.margen_real_pct || 0);

  // Helper: Obtener valor simple según toggle IVA (para valores individuales sin row)
  const getValor = (valorConIVA: number, valorSinIVA?: number) => {
    if (showConIVA) return valorConIVA;
    return valorSinIVA !== undefined ? valorSinIVA : valorConIVA / 1.16;
  };

  // Helper para formatear dinero respetando showCentavos y formato (miles/millones)
  // NOTA: Ya NO aplica toggle IVA automáticamente, los valores deben venir ya procesados
  const formatMoney = (amount: number, forceDecimals = false): string => {
    let value = amount;
    let suffix = '';
    let decimals = 0;

    // Aplicar formato de miles o millones
    if (moneyFormat === 'miles') {
      value = value / 1000;
      suffix = 'K';
      decimals = 1;
    } else if (moneyFormat === 'millones') {
      value = value / 1000000;
      suffix = 'M';
      decimals = 1;
    } else {
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

  // 🔍 Estado local para búsqueda con debounce (evita recargar en cada tecla)
  const [searchTerm, setSearchTerm] = useState<string>(filters.search || '');

  // Debounce del término de búsqueda (800ms para dar más tiempo al usuario)
  useEffect(() => {
    // No hacer nada si el valor no cambió
    if (searchTerm === (filters.search || '')) return;

    const timer = setTimeout(() => {
      setFilters(prev => ({ ...prev, search: searchTerm || undefined }));
    }, 800);

    return () => clearTimeout(timer);
  }, [searchTerm, filters.search]);

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
    setSearchTerm(''); // Limpiar también el estado local del buscador
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
      label: showConIVA ? 'Ingresos (+IVA)' : 'Ingresos',
      filterType: 'number' as const,
      align: 'right' as const,
      render: (_value: number, row: any) => {
        const isExpanded = hoveredRow === row.id || expandedRows.has(row.id);
        return (
          <div className="text-right">
            <div className="font-bold text-base" style={{ color: themeColors.primary }}>
              ${formatMoney(getIngresos(row))}
            </div>
            {isExpanded && (
              <div className="text-xs mt-1 space-y-0.5 border-t pt-1" style={{ color: themeColors.textSecondary }}>
                <div className="flex justify-between gap-2">
                  <span>Cobrados:</span>
                  <span className="font-medium" style={{ color: themeColors.shades[700] }}>${formatMoney(getValor(row.ingresos_cobrados || 0))}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span>Pendientes:</span>
                  <span className="font-medium" style={{ color: themeColors.secondary }}>${formatMoney(getValor(row.ingresos_pendientes || 0))}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span>Estimados:</span>
                  <span style={{ color: themeColors.textSecondary }}>${formatMoney(getValor(row.ingreso_estimado || 0))}</span>
                </div>
              </div>
            )}
          </div>
        );
      }
    },
    {
      key: 'gastos_totales',
      label: showConIVA ? 'Gastos (+IVA)' : 'Gastos',
      filterType: 'number' as const,
      align: 'right' as const,
      render: (_value: number, row: any) => {
        const isExpanded = hoveredRow === row.id || expandedRows.has(row.id);
        const gastosTotal = getGastos(row);

        // Desglose por categoría (aplicar IVA toggle)
        const combustible = getValor((row.gastos_combustible_pagados || 0) + (row.gastos_combustible_pendientes || 0));
        const materiales = getValor((row.gastos_materiales_pagados || 0) + (row.gastos_materiales_pendientes || 0));
        const rh = getValor((row.gastos_rh_pagados || 0) + (row.gastos_rh_pendientes || 0));
        const sps = getValor((row.gastos_sps_pagados || 0) + (row.gastos_sps_pendientes || 0));

        return (
          <div className="text-right">
            <div className="font-bold text-base" style={{ color: themeColors.accent }}>
              ${formatMoney(gastosTotal)}
            </div>
            {isExpanded && (
              <div className="text-xs mt-1 space-y-0.5 border-t pt-1" style={{ color: themeColors.textSecondary }}>
                <div className="flex justify-between gap-2">
                  <span>🚗⛽</span>
                  <span className="font-medium">${formatMoney(combustible)}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span>🛠️</span>
                  <span className="font-medium">${formatMoney(materiales)}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span>👥</span>
                  <span className="font-medium">${formatMoney(rh)}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span>💳</span>
                  <span className="font-medium">${formatMoney(sps)}</span>
                </div>
              </div>
            )}
          </div>
        );
      }
    },
    {
      key: 'provisiones',
      label: showConIVA ? 'Provisiones (+IVA)' : 'Provisiones',
      filterType: 'number' as const,
      align: 'right' as const,
      render: (_value: any, row: any) => {
        const isExpanded = hoveredRow === row.id || expandedRows.has(row.id);
        const provisionesTotal = getProvisiones(row);

        // Desglose por categoría (aplicar IVA toggle)
        const provComb = getValor(row.provision_combustible || 0);
        const provMat = getValor(row.provision_materiales || 0);
        const provRH = getValor(row.provision_rh || 0);
        const provSPs = getValor(row.provision_sps || 0);

        return (
          <div className="text-right">
            <div className="font-bold text-base" style={{ color: themeColors.shades[700] }}>
              ${formatMoney(provisionesTotal)}
            </div>
            {isExpanded && (
              <div className="text-xs mt-1 space-y-0.5 border-t pt-1" style={{ color: themeColors.textSecondary }}>
                <div className="flex justify-between gap-2">
                  <span>🚗⛽</span>
                  <span className="font-medium">${formatMoney(provComb)}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span>🛠️</span>
                  <span className="font-medium">${formatMoney(provMat)}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span>👥</span>
                  <span className="font-medium">${formatMoney(provRH)}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span>💳</span>
                  <span className="font-medium">${formatMoney(provSPs)}</span>
                </div>
              </div>
            )}
          </div>
        );
      }
    },
    {
      key: 'utilidad_estimada',
      label: showConIVA ? 'Utilidad (+IVA)' : 'Utilidad',
      filterType: 'number' as const,
      align: 'center' as const,
      width: '130px',
      render: (_value: number, row: any) => {
        const isExpanded = hoveredRow === row.id || expandedRows.has(row.id);

        // Usar campos PRE-CALCULADOS de la vista SQL según toggle IVA
        const utilidadReal = getUtilidad(row);
        const margenReal = getMargen(row);
        const ingresosDisplay = getIngresos(row);
        const gastosDisplay = getGastos(row);
        const provisionesDisplay = getProvisiones(row);

        const getColorInfo = (margen: number) => {
          if (margen >= 35) return { color: themeColors.shades[700], label: 'Excelente' };
          if (margen >= 25) return { color: themeColors.secondary, label: 'Regular' };
          if (margen >= 1) return { color: themeColors.accent, label: 'Bajo' };
          return { color: themeColors.textSecondary, label: 'Ninguno' };
        };
        const colorInfo = getColorInfo(margenReal);

        // Tooltip con fórmula: Utilidad = Ingresos - Gastos - Provisiones
        const tooltip = `Margen: ${margenReal.toFixed(1)}% (${colorInfo.label})\n\nIngresos: $${formatMoney(ingresosDisplay)}\n- Gastos: $${formatMoney(gastosDisplay)}\n- Provisiones: $${formatMoney(provisionesDisplay)}\n= Utilidad: $${formatMoney(utilidadReal)}`;

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
          {/* Selector de formato de números - Estilo homologado con GastosNoImpactados */}
          <div className="flex items-center border rounded-lg overflow-hidden" style={{ borderColor: themeColors.border }}>
            <button
              onClick={() => setMoneyFormat('normal')}
              className="px-3 py-2 text-sm font-medium transition-all"
              style={{
                backgroundColor: moneyFormat === 'normal' ? themeColors.primary : themeColors.cardBg,
                color: moneyFormat === 'normal' ? '#fff' : themeColors.textSecondary
              }}
              title="Sin agrupación"
            >
              $
            </button>
            <button
              onClick={() => setMoneyFormat('miles')}
              className="px-3 py-2 text-sm font-medium transition-all border-x"
              style={{
                backgroundColor: moneyFormat === 'miles' ? themeColors.primary : themeColors.cardBg,
                color: moneyFormat === 'miles' ? '#fff' : themeColors.textSecondary,
                borderColor: themeColors.border
              }}
              title="Agrupar en miles (K)"
            >
              K
            </button>
            <button
              onClick={() => setMoneyFormat('millones')}
              className="px-3 py-2 text-sm font-medium transition-all"
              style={{
                backgroundColor: moneyFormat === 'millones' ? themeColors.primary : themeColors.cardBg,
                color: moneyFormat === 'millones' ? '#fff' : themeColors.textSecondary
              }}
              title="Agrupar en millones (M)"
            >
              M
            </button>
          </div>

          {/* Toggle IVA / Subtotales */}
          <button
            onClick={() => setShowConIVA(!showConIVA)}
            className="flex items-center px-3 py-2 border rounded-lg text-sm font-medium transition-all"
            style={{
              borderColor: themeColors.border,
              backgroundColor: showConIVA ? themeColors.primary : themeColors.cardBg,
              color: showConIVA ? '#fff' : themeColors.textSecondary
            }}
            title={showConIVA ? 'Mostrando totales con IVA incluido' : 'Mostrando subtotales (sin IVA)'}
          >
            {showConIVA ? (
              <>
                <ToggleRight className="w-4 h-4 mr-1" />
                +IVA
              </>
            ) : (
              <>
                <ToggleLeft className="w-4 h-4 mr-1" />
                Subtotal
              </>
            )}
          </button>

          {/* Botón centavos - Solo cuando está en formato normal */}
          {moneyFormat === 'normal' && (
            <Button
              onClick={toggleCentavos}
              variant="outline"
              className="border-gray-300"
              title="Mostrar/ocultar centavos"
            >
              {showCentavos ? '.00' : '.--'}
            </Button>
          )}

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
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
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
      {dashboard && (() => {
        // Calcular totales directamente desde los eventos filtrados para que coincidan con la tabla
        // Usar los campos correctos según el toggle IVA
        const totalEventos = eventosFiltrados.length;

        // Ingresos: usar ingresos_subtotal o ingresos_totales según toggle
        const totalIngresosReales = eventosFiltrados.reduce((sum, e: any) =>
          sum + (showConIVA ? (e.ingresos_totales || 0) : (e.ingresos_subtotal || e.ingresos_totales / 1.16 || 0)), 0);
        const totalIngresosCobrados = eventosFiltrados.reduce((sum, e: any) =>
          sum + getValor(e.ingresos_cobrados || 0), 0);
        const totalIngresosPendientes = eventosFiltrados.reduce((sum, e: any) =>
          sum + getValor(e.ingresos_pendientes || 0), 0);
        const totalIngresosEstimados = eventosFiltrados.reduce((sum, e: any) =>
          sum + getValor(e.ingreso_estimado || 0), 0);

        // Gastos: usar gastos_subtotal o gastos_totales según toggle
        const totalGastosTotales = eventosFiltrados.reduce((sum, e: any) =>
          sum + (showConIVA ? (e.gastos_totales || 0) : (e.gastos_subtotal || e.gastos_totales / 1.16 || 0)), 0);

        // Provisiones: usar provisiones_subtotal o provisiones_total según toggle
        const totalProvisiones = eventosFiltrados.reduce((sum, e: any) =>
          sum + (showConIVA ? (e.provisiones_total || 0) : (e.provisiones_subtotal || e.provisiones_total / 1.16 || 0)), 0);

        // Gastos por categoría (aplicar toggle IVA)
        const totalGastosCombustible = eventosFiltrados.reduce((sum, e: any) =>
          sum + getValor((e.gastos_combustible_pagados || 0) + (e.gastos_combustible_pendientes || 0)), 0);
        const totalGastosMateriales = eventosFiltrados.reduce((sum, e: any) =>
          sum + getValor((e.gastos_materiales_pagados || 0) + (e.gastos_materiales_pendientes || 0)), 0);
        const totalGastosRH = eventosFiltrados.reduce((sum, e: any) =>
          sum + getValor((e.gastos_rh_pagados || 0) + (e.gastos_rh_pendientes || 0)), 0);
        const totalGastosSPS = eventosFiltrados.reduce((sum, e: any) =>
          sum + getValor((e.gastos_sps_pagados || 0) + (e.gastos_sps_pendientes || 0)), 0);

        // Provisiones por categoría (aplicar toggle IVA)
        const provCombustible = getValor(dashboard.total_provision_combustible || 0);
        const provMateriales = getValor(dashboard.total_provision_materiales || 0);
        const provRH = getValor(dashboard.total_provision_rh || 0);
        const provSPS = getValor(dashboard.total_provision_sps || 0);

        // Utilidad: sumar campos pre-calculados de la vista SQL
        const utilidadTotal = eventosFiltrados.reduce((sum, e: any) =>
          sum + (showConIVA ? (e.utilidad_real || 0) : (e.utilidad_bruta || e.utilidad_real / 1.16 || 0)), 0);

        // Margen: calcular desde totales
        const margenUtilidad = totalIngresosReales > 0 ? (utilidadTotal / totalIngresosReales) * 100 : 0;

        return (
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
                    {totalEventos}
                  </p>
                </div>
              </div>

              {/* Ingresos */}
              <div className="flex-1 p-4">
                <div className="flex flex-col">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium" style={{ color: themeColors.textSecondary }}>
                      {showConIVA ? 'Ingresos (+IVA)' : 'Ingresos'}
                    </p>
                    <span className="text-xs" style={{ color: themeColors.primary }}>{showAllCardDetails ? '▲' : '▼'}</span>
                  </div>
                  <p className="text-xl font-bold" style={{ color: themeColors.primary }}>
                    ${formatMoney(totalIngresosReales)}
                  </p>
                  {showAllCardDetails && (
                    <div className="text-xs mt-2 pt-2 border-t space-y-1" style={{ color: themeColors.textSecondary }}>
                      <div className="flex justify-between"><span>Cobrados:</span><span style={{ color: themeColors.shades[700] }}>${formatMoney(totalIngresosCobrados)}</span></div>
                      <div className="flex justify-between"><span>Pendientes:</span><span style={{ color: themeColors.secondary }}>${formatMoney(totalIngresosPendientes)}</span></div>
                      <div className="flex justify-between"><span>Estimados:</span><span style={{ color: themeColors.textSecondary }}>${formatMoney(totalIngresosEstimados)}</span></div>
                    </div>
                  )}
                </div>
              </div>

              {/* Gastos Totales */}
              <div className="flex-1 p-4">
                <div className="flex flex-col">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium" style={{ color: themeColors.textSecondary }}>
                      {showConIVA ? 'Gastos (+IVA)' : 'Gastos'}
                    </p>
                    <span className="text-xs" style={{ color: themeColors.primary }}>{showAllCardDetails ? '▲' : '▼'}</span>
                  </div>
                  <p className="text-xl font-bold" style={{ color: themeColors.accent }}>
                    ${formatMoney(totalGastosTotales)}
                  </p>
                  {showAllCardDetails && (
                    <div className="text-xs mt-2 pt-2 border-t space-y-1" style={{ color: themeColors.textSecondary }}>
                      <div className="flex justify-between"><span>🚗⛽</span><span>${formatMoney(totalGastosCombustible)}</span></div>
                      <div className="flex justify-between"><span>🛠️</span><span>${formatMoney(totalGastosMateriales)}</span></div>
                      <div className="flex justify-between"><span>👥</span><span>${formatMoney(totalGastosRH)}</span></div>
                      <div className="flex justify-between"><span>💳</span><span>${formatMoney(totalGastosSPS)}</span></div>
                    </div>
                  )}
                </div>
              </div>

              {/* Provisiones - Gastos pendientes de pago */}
              <div className="flex-1 p-4">
                <div className="flex flex-col">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium" style={{ color: themeColors.textSecondary }}>
                      {showConIVA ? 'Provisiones (+IVA)' : 'Provisiones'}
                    </p>
                    <span className="text-xs" style={{ color: themeColors.primary }}>{showAllCardDetails ? '▲' : '▼'}</span>
                  </div>
                  <p className="text-xl font-bold" style={{ color: themeColors.shades[700] }}>
                    ${formatMoney(totalProvisiones)}
                  </p>
                  {showAllCardDetails && (
                    <div className="text-xs mt-2 pt-2 border-t space-y-1" style={{ color: themeColors.textSecondary }}>
                      <div className="flex justify-between"><span>🚗⛽</span><span>${formatMoney(provCombustible)}</span></div>
                      <div className="flex justify-between"><span>🛠️</span><span>${formatMoney(provMateriales)}</span></div>
                      <div className="flex justify-between"><span>👥</span><span>${formatMoney(provRH)}</span></div>
                      <div className="flex justify-between"><span>💳</span><span>${formatMoney(provSPS)}</span></div>
                    </div>
                  )}
                </div>
              </div>

              {/* Utilidad - Colapsado: solo monto, Expandido: monto + gauge */}
              <div className="flex-1 p-4">
                <div className="flex flex-col">
                  {/* Etiqueta y flecha - SIEMPRE VISIBLE */}
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium" style={{ color: themeColors.textSecondary }}>
                      {showConIVA ? 'UTILIDAD (+IVA)' : 'UTILIDAD'}
                    </p>
                    <span className="text-xs" style={{ color: themeColors.primary }}>{showAllCardDetails ? '▲' : '▼'}</span>
                  </div>
                  {/* Monto - SIEMPRE VISIBLE */}
                  <p className="text-xl font-bold" style={{ color: utilidadTotal >= 0 ? themeColors.shades[700] : themeColors.accent }}>
                    ${formatMoney(utilidadTotal, false, false)}
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
                </div>
              </div>
            </div>
          </div>
        );
      })()}

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
                    className={`px-3 py-3 text-xs font-medium uppercase tracking-wider ${column.align === 'right' ? 'text-right' :
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
                        className={`px-3 py-4 text-sm ${column.align === 'right' ? 'text-right' :
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
