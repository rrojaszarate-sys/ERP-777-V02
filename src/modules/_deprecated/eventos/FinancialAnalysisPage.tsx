import React, { useState, useMemo } from 'react';
import { BarChart3, Download, FileSpreadsheet, FileText } from 'lucide-react';
import { useEvents } from './hooks/useEvents';
import { useClients } from './hooks/useClients';
import { useEventTypes } from './hooks/useEventTypes';
import { useUsers } from './hooks/useUsers';
import { useEventFinancialAnalysis } from './hooks/useEventFinancialAnalysis';
import { FinancialBalancePanel } from './components/financial/FinancialBalancePanel';
import { PortfolioFinancialSummaryComponent } from './components/financial/PortfolioFinancialSummary';
import { FinancialFiltersComponent } from './components/financial/FinancialFilters';
import { FinancialFilters, EventoCompleto } from './types/Event';
import { Button } from '../../shared/components/ui/Button';
import { FinancialExportService } from './services/financialExportService';

/**
 * Página Principal de Análisis Financiero de Eventos
 */
export const FinancialAnalysisPage: React.FC = () => {
  const [filters, setFilters] = useState<FinancialFilters>({});
  const [showIndividualAnalysis, setShowIndividualAnalysis] = useState(false);

  // Fetch data
  const { events = [], isLoading: eventsLoading } = useEvents();
  const { data: clients = [] } = useClients();
  const { data: eventTypes = [] } = useEventTypes();
  const { data: users = [] } = useUsers();

  // Debug logs
  console.log('📊 Financial Analysis - Events loaded:', events.length);
  console.log('📊 Sample event:', events[0]);

  // Financial analysis hook
  const { calculateMultipleEventsAnalysis, calculatePortfolioSummary } = useEventFinancialAnalysis();

  // Filter events
  const filteredEvents = useMemo(() => {
    return events.filter((event: EventoCompleto) => {
      // Cliente filter
      if (filters.cliente_id && event.cliente_id !== filters.cliente_id) {
        return false;
      }

      // Tipo de evento filter
      if (filters.tipo_evento_id && event.tipo_evento_id !== filters.tipo_evento_id) {
        return false;
      }

      // Responsable filter
      if (filters.responsable_id && event.responsable_id !== filters.responsable_id) {
        return false;
      }

      // Año filter
      if (filters.año) {
        const eventYear = new Date(event.fecha_evento).getFullYear();
        if (eventYear !== filters.año) return false;
      }

      // Mes filter
      if (filters.mes && filters.año) {
        const eventDate = new Date(event.fecha_evento);
        if (eventDate.getMonth() + 1 !== filters.mes) return false;
      }

      // Fecha inicio filter
      if (filters.fecha_inicio) {
        if (new Date(event.fecha_evento) < new Date(filters.fecha_inicio)) {
          return false;
        }
      }

      // Fecha fin filter
      if (filters.fecha_fin) {
        if (new Date(event.fecha_evento) > new Date(filters.fecha_fin)) {
          return false;
        }
      }

      // Margen mínimo filter
      if (filters.margen_minimo !== undefined) {
        const margin = event.margen_utilidad || 0;
        if (margin < filters.margen_minimo) return false;
      }

      // Solo completados filter
      if (filters.solo_completados) {
        if (event.estado_id !== 5 && event.estado_id !== 6 && event.estado_id !== 7) {
          return false;
        }
      }

      return true;
    });
  }, [events, filters]);

  // Calculate analyses
  const eventsAnalysis = useMemo(() => {
    console.log('📊 Calculating analysis for events:', filteredEvents.length);
    const analysis = calculateMultipleEventsAnalysis(filteredEvents);
    console.log('📊 Events analysis result:', analysis);
    return analysis;
  }, [filteredEvents, calculateMultipleEventsAnalysis]);

  const portfolioSummary = useMemo(() => {
    console.log('📊 Calculating portfolio summary...');
    const summary = calculatePortfolioSummary(filteredEvents);
    console.log('📊 Portfolio summary:', summary);
    return summary;
  }, [filteredEvents, calculatePortfolioSummary]);

  // Export handlers
  const handleExportPDF = async () => {
    try {
      await FinancialExportService.exportToPDF(eventsAnalysis, portfolioSummary);
    } catch (error) {
      console.error('Error exporting to PDF:', error);
      alert('Error al exportar a PDF. Ver consola para detalles.');
    }
  };

  const handleExportExcel = async () => {
    try {
      await FinancialExportService.exportToExcel(eventsAnalysis, portfolioSummary);
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      alert('Error al exportar a Excel. Ver consola para detalles.');
    }
  };

  if (eventsLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <BarChart3 className="w-16 h-16 text-blue-600 animate-pulse mx-auto mb-4" />
          <p className="text-gray-600">Cargando análisis financiero...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Debug Info */}
      <div className="mb-4 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <h3 className="font-semibold text-yellow-900 mb-2">🔍 Información de Debug</h3>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div><strong>Total eventos cargados:</strong> {events.length}</div>
          <div><strong>Eventos filtrados:</strong> {filteredEvents.length}</div>
          <div><strong>Análisis calculados:</strong> {eventsAnalysis.length}</div>
          <div><strong>Filtros activos:</strong> {Object.keys(filters).length}</div>
        </div>
        {events.length > 0 && (
          <details className="mt-2">
            <summary className="cursor-pointer text-yellow-800 font-medium">Ver muestra de datos</summary>
            <pre className="mt-2 text-xs bg-white p-2 rounded overflow-auto max-h-40">
              {JSON.stringify(events[0], null, 2)}
            </pre>
          </details>
        )}
      </div>

      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <BarChart3 className="w-8 h-8 mr-3 text-blue-600" />
            Análisis Financiero de Eventos
          </h1>

          <div className="flex space-x-3">
            <Button
              onClick={handleExportExcel}
              variant="outline"
              className="flex items-center"
            >
              <FileSpreadsheet className="w-4 h-4 mr-2" />
              Exportar Excel
            </Button>
            <Button
              onClick={handleExportPDF}
              variant="outline"
              className="flex items-center"
            >
              <FileText className="w-4 h-4 mr-2" />
              Exportar PDF
            </Button>
          </div>
        </div>
        <p className="text-gray-600">
          Análisis comparativo de proyecciones vs resultados reales
        </p>
      </div>

      {/* Filters */}
      <div className="mb-6">
        <FinancialFiltersComponent
          filters={filters}
          onFiltersChange={setFilters}
          clients={clients}
          eventTypes={eventTypes}
          users={users}
        />
      </div>

      {/* Portfolio Summary */}
      <div className="mb-6">
        <PortfolioFinancialSummaryComponent summary={portfolioSummary} />
      </div>

      {/* Toggle Individual Analysis */}
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">
          Análisis por Evento ({eventsAnalysis.length})
        </h2>
        <Button
          onClick={() => setShowIndividualAnalysis(!showIndividualAnalysis)}
          variant="outline"
        >
          {showIndividualAnalysis ? 'Ocultar' : 'Mostrar'} Detalles por Evento
        </Button>
      </div>

      {/* Individual Event Analysis */}
      {showIndividualAnalysis && (
        <div className="space-y-6">
          {eventsAnalysis.length === 0 ? (
            <div className="bg-white rounded-lg shadow-md p-12 text-center">
              <BarChart3 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-700 mb-2">
                No hay eventos que coincidan con los filtros
              </h3>
              <p className="text-gray-500">
                Intenta ajustar los filtros para ver resultados
              </p>
            </div>
          ) : (
            eventsAnalysis.map((analysis) => (
              <FinancialBalancePanel
                key={analysis.event_id}
                analysis={analysis}
                showComparison={true}
              />
            ))
          )}
        </div>
      )}

      {/* Empty State */}
      {eventsAnalysis.length === 0 && !showIndividualAnalysis && (
        <div className="bg-white rounded-lg shadow-md p-12 text-center">
          <BarChart3 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-700 mb-2">
            No hay eventos para analizar
          </h3>
          <p className="text-gray-500">
            Ajusta los filtros o crea nuevos eventos con datos financieros
          </p>
        </div>
      )}
    </div>
  );
};
