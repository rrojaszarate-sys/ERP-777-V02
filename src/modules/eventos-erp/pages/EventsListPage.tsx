import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Plus, Eye, Edit, Trash2, Calendar, DollarSign, TrendingUp,
  TrendingDown, Users, Filter, X, Download, Search, ToggleLeft, ToggleRight
} from 'lucide-react';
import { supabase } from '../../../core/config/supabase';
import { usePermissions } from '../../../core/permissions/usePermissions';
import { DataTable } from '../../../shared/components/tables/DataTable';
import { Button } from '../../../shared/components/ui/Button';
import { Badge } from '../../../shared/components/ui/Badge';
import { formatCurrency, formatDate } from '../../../shared/utils/formatters';
import { PageSkeleton } from '../../../shared/components/ui/LoadingSpinner';
import { EventoModal } from '../components/EventoModal';
import { EventoDetailModal } from '../components/EventoDetailModal';
import {
  useEventosFinancialList,
  useEventosFinancialDashboard,
  EventosFinancialFilters
} from '../hooks/useEventosFinancialList';
import { useClients } from '../hooks/useClients';

/**
 * 🎯 MÓDULO DE GESTIÓN DE EVENTOS MEJORADO
 * 
 * Características:
 * - Listado con campos de análisis financiero
 * - Filtros por año, mes y cliente
 * - Dashboard con sumatorias automáticas
 * - Datos actualizados desde vw_eventos_analisis_financiero
 */
export const EventsListPage: React.FC = () => {
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [editingEvento, setEditingEvento] = useState<any>(null);
  const [viewingEvento, setViewingEvento] = useState<any>(null);
  const [showFilters, setShowFilters] = useState(true);
  const [showConIVA, setShowConIVA] = useState(false); // Toggle para mostrar con IVA o subtotales (default: subtotales)

  // Estados de filtros
  const currentYear = new Date().getFullYear();
  const [filters, setFilters] = useState<EventosFinancialFilters>({
    año: currentYear,
    mes: undefined,
    cliente_id: undefined,
    search: undefined,
  });

  const { canCreate, canUpdate, canDelete } = usePermissions();

  // Cargar datos con filtros
  const { clients: clientes } = useClients();
  const { data: eventos = [], isLoading, refetch } = useEventosFinancialList(filters);
  const { data: dashboard } = useEventosFinancialDashboard(filters);

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

  const handleEditEvento = (evento: any) => {
    setEditingEvento(evento);
    setShowModal(true);
  };

  const handleViewEvento = (evento: any) => {
    setViewingEvento(evento);
    setShowDetailModal(true);
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
      refetch();
    } catch (error) {
      console.error('Error al eliminar evento:', error);
      alert('Error al eliminar el evento. Ver consola para detalles.');
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

  const handleExportData = () => {
    // TODO: Implementar exportación a Excel
    console.log('Exportar datos:', eventos);
    alert('Función de exportación en desarrollo');
  };

  // Helper: Obtener valor según toggle IVA
  const getValor = (valorConIVA: number) => {
    if (showConIVA) return valorConIVA;
    return valorConIVA / 1.16; // Subtotal sin IVA
  };

  // Helper: Calcular utilidad (Ingresos - Gastos - Provisiones)
  const calcularUtilidad = (ingresos: number, gastos: number, provisiones: number) => {
    if (showConIVA) {
      return ingresos - gastos - provisiones;
    }
    // Sin IVA
    return (ingresos / 1.16) - (gastos / 1.16) - (provisiones / 1.16);
  };

  // Helper: Calcular margen (Utilidad / Ingresos * 100)
  const calcularMargen = (ingresos: number, gastos: number, provisiones: number) => {
    const utilidad = calcularUtilidad(ingresos, gastos, provisiones);
    const base = showConIVA ? ingresos : (ingresos / 1.16);
    return base > 0 ? (utilidad / base) * 100 : 0;
  };

  // Definición de columnas de la tabla
  const columns = [
    {
      key: 'clave_evento',
      label: 'Clave',
      filterType: 'text' as const,
      width: '100px',
      render: (value: string) => (
        <div className="font-mono text-sm font-semibold text-gray-900">
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
          <div className="font-medium text-gray-900">{value}</div>
          <div className="text-xs text-gray-500">
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
        <div className="text-sm text-gray-900">{value}</div>
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
      render: (value: number, row: any) => (
        <div>
          <div className="font-semibold text-green-600">
            {formatCurrency(getValor(value || 0))}
          </div>
          {row.ingreso_estimado > 0 && (
            <div className={`text-xs ${value >= row.ingreso_estimado
              ? 'text-green-600'
              : 'text-yellow-600'
              }`}>
              Est: {formatCurrency(getValor(row.ingreso_estimado))}
            </div>
          )}
        </div>
      )
    },
    {
      key: 'gastos_totales',
      label: showConIVA ? 'Gastos (+IVA)' : 'Gastos',
      filterType: 'number' as const,
      align: 'right' as const,
      render: (value: number, row: any) => (
        <div>
          <div className="font-semibold text-red-600">
            {formatCurrency(getValor(value || 0))}
          </div>
          {row.provisiones_total > 0 && (
            <div className={`text-xs ${value <= row.provisiones_total
              ? 'text-green-600'
              : 'text-red-600'
              }`}>
              Prov: {formatCurrency(getValor(row.provisiones_total))}
            </div>
          )}
        </div>
      )
    },
    {
      key: 'provisiones_total',
      label: showConIVA ? 'Provisiones (+IVA)' : 'Provisiones',
      filterType: 'number' as const,
      align: 'right' as const,
      render: (value: number) => (
        <div className="font-semibold text-purple-600">
          {formatCurrency(getValor(value || 0))}
        </div>
      )
    },
    {
      key: 'utilidad_real',
      label: showConIVA ? 'Utilidad (+IVA)' : 'Utilidad',
      filterType: 'number' as const,
      align: 'right' as const,
      render: (_value: number, row: any) => {
        const ingresos = row.ingresos_totales || 0;
        const gastos = row.gastos_totales || 0;
        const provisiones = row.provisiones_total || 0;
        const utilidad = calcularUtilidad(ingresos, gastos, provisiones);
        const margen = calcularMargen(ingresos, gastos, provisiones);
        const isPositive = utilidad >= 0;
        return (
          <div>
            <div className={`font-bold ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(utilidad)}
            </div>
            <div className={`text-xs font-medium ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
              {margen.toFixed(1)}%
            </div>
          </div>
        );
      }
    },
    {
      key: 'status_cobro',
      label: 'Cobro',
      filterType: 'select' as const,
      render: (value: string, row: any) => {
        const variants: Record<string, any> = {
          'cobrado_completo': 'success',
          'cobrado_parcial': 'warning',
          'pendiente_cobro': 'warning',
          'sin_ingresos': 'secondary'
        };

        const labels: Record<string, string> = {
          'cobrado_completo': 'Cobrado',
          'cobrado_parcial': 'Parcial',
          'pendiente_cobro': 'Pendiente',
          'sin_ingresos': 'Sin Ingresos'
        };

        return (
          <div>
            <Badge variant={variants[value]} size="sm">
              {labels[value] || value}
            </Badge>
            {row.porcentaje_cobro > 0 && (
              <div className="text-xs text-gray-600 mt-1">
                {row.porcentaje_cobro.toFixed(0)}%
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
          <h1 className="text-2xl font-bold text-gray-900">Gestión de Eventos</h1>
          <p className="text-gray-600 mt-1">
            Administra todos los eventos con control financiero y OCR integrado
          </p>
        </div>

        <div className="flex gap-2">
          <Button
            onClick={() => setShowFilters(!showFilters)}
            variant="outline"
            className="border-gray-300"
          >
            <Filter className="w-4 h-4 mr-2" />
            {showFilters ? 'Ocultar' : 'Mostrar'} Filtros
          </Button>

          {/* Toggle IVA / Subtotales */}
          <Button
            onClick={() => setShowConIVA(!showConIVA)}
            variant="outline"
            className={`border-gray-300 ${showConIVA ? 'bg-blue-50 border-blue-300' : ''}`}
            title={showConIVA ? 'Mostrando totales con IVA incluido' : 'Mostrando subtotales (sin IVA)'}
          >
            {showConIVA ? (
              <>
                <ToggleRight className="w-4 h-4 mr-2 text-blue-600" />
                <span className="text-blue-700">Totales (+IVA)</span>
              </>
            ) : (
              <>
                <ToggleLeft className="w-4 h-4 mr-2" />
                <span>Subtotales</span>
              </>
            )}
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
              className="bg-mint-500 hover:bg-mint-600"
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
          className="bg-white rounded-lg border p-4"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
        >
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Filtro de Año */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Año
              </label>
              <select
                value={filters.año || ''}
                onChange={(e) => setFilters({ ...filters, año: e.target.value ? parseInt(e.target.value) : undefined })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-mint-500 focus:border-transparent"
              >
                <option value="">Todos los años</option>
                {yearOptions.map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>

            {/* Filtro de Mes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Mes
              </label>
              <select
                value={filters.mes || ''}
                onChange={(e) => setFilters({ ...filters, mes: e.target.value ? parseInt(e.target.value) : undefined })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-mint-500 focus:border-transparent"
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
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Cliente
              </label>
              <select
                value={filters.cliente_id || ''}
                onChange={(e) => setFilters({ ...filters, cliente_id: e.target.value || undefined })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-mint-500 focus:border-transparent"
              >
                <option value="">Todos los clientes</option>
                {clientes?.map((cliente: any) => (
                  <option key={cliente.id} value={cliente.id}>
                    {cliente.nombre_comercial || cliente.razon_social}
                  </option>
                ))}
              </select>
            </div>

            {/* Búsqueda */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Buscar
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={filters.search || ''}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value || undefined })}
                  placeholder="Clave, proyecto, cliente..."
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-mint-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Botón para limpiar filtros */}
          {(filters.año !== currentYear || filters.mes || filters.cliente_id || filters.search) && (
            <div className="mt-4 flex justify-end">
              <Button
                onClick={handleClearFilters}
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

      {/* Dashboard de Sumatorias - 2 Filas x 4 Columnas */}
      {dashboard && (() => {
        // Recalcular totales desde los eventos para que coincidan con la tabla
        const ingresosReales = eventos.reduce((sum, e) => sum + (e.ingresos_totales || 0), 0);
        const ingresosEstimados = eventos.reduce((sum, e) => sum + (e.ingreso_estimado || 0), 0);
        const gastosReales = eventos.reduce((sum, e) => sum + (e.gastos_totales || 0), 0);
        const provisionesReales = eventos.reduce((sum, e) => sum + (e.provisiones_total || 0), 0);

        // Aplicar toggle IVA
        const ingresosDashboard = getValor(ingresosReales);
        const ingresosEstimadosDashboard = getValor(ingresosEstimados);
        const gastosDashboard = getValor(gastosReales);
        const provisionesDashboard = getValor(provisionesReales);

        // Utilidad = Ingresos - Gastos - Provisiones
        const utilidadDashboard = ingresosDashboard - gastosDashboard - provisionesDashboard;
        const utilidadEstimada = getValor(dashboard.total_utilidad_estimada);

        // Margen = (Utilidad / Ingresos) * 100
        const margenDashboard = ingresosDashboard > 0
          ? (utilidadDashboard / ingresosDashboard) * 100
          : 0;

        return (
          <div className="space-y-4">
            {/* Primera Fila - 4 Tarjetas */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Total Eventos */}
              <div className="bg-white rounded-lg border p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Total Eventos</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">
                      {eventos.length}
                    </p>
                  </div>
                  <div className="p-3 bg-blue-100 rounded-lg">
                    <Calendar className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
              </div>

              {/* Ingresos Totales */}
              <div className="bg-white rounded-lg border p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">
                      {showConIVA ? 'Ingresos (+IVA)' : 'Ingresos'}
                    </p>
                    <p className="text-xl font-bold text-green-600 mt-1">
                      {formatCurrency(ingresosDashboard)}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Est: {formatCurrency(ingresosEstimadosDashboard)}
                    </p>
                  </div>
                  <div className="p-3 bg-green-100 rounded-lg">
                    <TrendingUp className="w-6 h-6 text-green-600" />
                  </div>
                </div>
              </div>

              {/* Gastos Totales */}
              <div className="bg-white rounded-lg border p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">
                      {showConIVA ? 'Gastos (+IVA)' : 'Gastos'}
                    </p>
                    <p className="text-xl font-bold text-red-600 mt-1">
                      {formatCurrency(gastosDashboard)}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Prov: {formatCurrency(provisionesDashboard)}
                    </p>
                  </div>
                  <div className="p-3 bg-red-100 rounded-lg">
                    <TrendingDown className="w-6 h-6 text-red-600" />
                  </div>
                </div>
              </div>

              {/* Utilidad Total */}
              <div className="bg-white rounded-lg border p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">
                      {showConIVA ? 'Utilidad (+IVA)' : 'Utilidad'}
                    </p>
                    <p className={`text-xl font-bold mt-1 ${utilidadDashboard >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                      {formatCurrency(utilidadDashboard)}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Est: {formatCurrency(utilidadEstimada)}
                    </p>
                  </div>
                  <div className="p-3 bg-mint-100 rounded-lg">
                    <DollarSign className="w-6 h-6 text-mint-600" />
                  </div>
                </div>
              </div>
            </div>

            {/* Segunda Fila - 4 Tarjetas (1 activa + 3 placeholders) */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Margen Promedio */}
              <div className="bg-white rounded-lg border p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">
                      {showConIVA ? 'Margen (+IVA)' : 'Margen'}
                    </p>
                    <p className={`text-xl font-bold mt-1 ${margenDashboard >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                      {margenDashboard.toFixed(1)}%
                    </p>
                    <div className="flex gap-2 mt-1">
                      <span className="text-xs text-gray-500">
                        Cobro: {dashboard.tasa_cobro_promedio?.toFixed(0) || 0}%
                      </span>
                    </div>
                  </div>
                  <div className="p-3 bg-purple-100 rounded-lg">
                    <Users className="w-6 h-6 text-purple-600" />
                  </div>
                </div>
              </div>

              {/* Placeholder 1 - Eventos Pendientes */}
              <div className="bg-gray-50 rounded-lg border border-dashed border-gray-300 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Eventos Próximos</p>
                    <p className="text-xl font-bold text-gray-400 mt-1">
                      Disponible pronto
                    </p>
                  </div>
                  <div className="p-3 bg-gray-200 rounded-lg">
                    <Calendar className="w-6 h-6 text-gray-400" />
                  </div>
                </div>
              </div>

              {/* Placeholder 2 - ROI */}
              <div className="bg-gray-50 rounded-lg border border-dashed border-gray-300 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">ROI Promedio</p>
                    <p className="text-xl font-bold text-gray-400 mt-1">
                      Disponible pronto
                    </p>
                  </div>
                  <div className="p-3 bg-gray-200 rounded-lg">
                    <TrendingUp className="w-6 h-6 text-gray-400" />
                  </div>
                </div>
              </div>

              {/* Placeholder 3 - Clientes Activos */}
              <div className="bg-gray-50 rounded-lg border border-dashed border-gray-300 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Clientes Activos</p>
                    <p className="text-xl font-bold text-gray-400 mt-1">
                      Disponible pronto
                    </p>
                  </div>
                  <div className="p-3 bg-gray-200 rounded-lg">
                    <Users className="w-6 h-6 text-gray-400" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Información de eventos filtrados */}
      <div className="flex items-center justify-between text-sm text-gray-600 bg-gray-50 px-4 py-2 rounded-lg">
        <span>
          Mostrando <strong>{eventos.length}</strong> eventos
          {filters.año && ` del año ${filters.año}`}
          {filters.mes && ` - ${monthOptions.find(m => m.value === filters.mes)?.label}`}
          {filters.cliente_id && ` - ${clientes?.find((c: any) => c.id === filters.cliente_id)?.nombre_comercial || 'Cliente seleccionado'}`}
        </span>
      </div>

      {/* Tabla de eventos */}
      <DataTable
        data={eventos}
        columns={columns}
        actions={actions}
        exportable={false}
        selectable={false}
        filterable={false}
        onRowClick={handleViewEvento}
      />

      {/* Modal de creación/edición de evento */}
      {showModal && (
        <EventoModal
          evento={editingEvento}
          onClose={() => {
            setShowModal(false);
            setEditingEvento(null);
          }}
          onSave={() => {
            setShowModal(false);
            setEditingEvento(null);
            refetch();
          }}
        />
      )}

      {/* Modal de detalle */}
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
          onRefresh={refetch}
        />
      )}
    </motion.div>
  );
};
