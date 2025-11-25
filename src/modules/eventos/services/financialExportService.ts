import { EventFinancialAnalysis, PortfolioFinancialSummary } from '../types/Event';

/**
 * Servicio para exportar análisis financiero a PDF y Excel
 */
export class FinancialExportService {

  /**
   * Exporta análisis financiero a Excel
   */
  static async exportToExcel(
    eventsAnalysis: EventFinancialAnalysis[],
    portfolioSummary: PortfolioFinancialSummary
  ): Promise<void> {
    try {
      // Preparar datos para Excel
      const data = this.prepareDataForExport(eventsAnalysis, portfolioSummary);

      // Crear CSV (simple implementation - puede mejorarse con librerías como xlsx)
      const csv = this.generateCSV(data);

      // Descargar archivo
      this.downloadFile(csv, 'analisis-financiero-eventos.csv', 'text/csv');
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      throw error;
    }
  }

  /**
   * Exporta análisis financiero a PDF
   */
  static async exportToPDF(
    eventsAnalysis: EventFinancialAnalysis[],
    portfolioSummary: PortfolioFinancialSummary
  ): Promise<void> {
    try {
      // Esta es una implementación básica
      // Para una mejor implementación, usar librerías como jsPDF o react-pdf

      const htmlContent = this.generateHTMLReport(eventsAnalysis, portfolioSummary);

      // Abrir en nueva ventana para imprimir
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(htmlContent);
        printWindow.document.close();
        printWindow.print();
      }
    } catch (error) {
      console.error('Error exporting to PDF:', error);
      throw error;
    }
  }

  /**
   * Prepara los datos para exportación
   */
  private static prepareDataForExport(
    eventsAnalysis: EventFinancialAnalysis[],
    portfolioSummary: PortfolioFinancialSummary
  ) {
    return {
      summary: portfolioSummary,
      events: eventsAnalysis.map(analysis => ({
        evento: analysis.event_name,
        cliente: analysis.cliente_nombre || 'N/A',
        fecha: analysis.fecha_evento,
        tipo: analysis.tipo_evento || 'N/A',
        responsable: analysis.responsable_nombre || 'N/A',

        // Proyección
        ingreso_estimado: analysis.projection.ingreso_estimado,
        provisiones: analysis.projection.provisiones,
        utilidad_estimada: analysis.projection.utilidad_estimada,
        margen_estimado: analysis.projection.margen_estimado,

        // Real
        ingreso_real: analysis.result.ingreso_real,
        gastos_pagados: analysis.result.gastos_pagados,
        gastos_pendientes: analysis.result.gastos_pendientes,
        utilidad_real: analysis.result.utilidad_real,
        margen_real: analysis.result.margen_real,

        // Comparación
        diferencia_absoluta: analysis.comparison.diferencia_absoluta,
        diferencia_porcentaje: analysis.comparison.diferencia_porcentaje,
        variacion_ingresos: analysis.comparison.variacion_ingresos,
        variacion_gastos: analysis.comparison.variacion_gastos,
        variacion_margen: analysis.comparison.variacion_margen,

        status: analysis.status,
        alert_level: analysis.alert_level
      }))
    };
  }

  /**
   * Genera CSV desde los datos
   */
  private static generateCSV(data: any): string {
    const headers = [
      'Evento',
      'Cliente',
      'Fecha',
      'Tipo',
      'Responsable',
      'Ingreso Estimado',
      'Gastos Estimados',
      'Utilidad Estimada',
      'Margen Estimado (%)',
      'Ingreso Real',
      'Gastos Reales',
      'Utilidad Real',
      'Margen Real (%)',
      'Diferencia Absoluta',
      'Diferencia Porcentaje (%)',
      'Variación Ingresos (%)',
      'Variación Gastos (%)',
      'Variación Margen (%)',
      'Estado',
      'Nivel de Alerta'
    ];

    const rows = data.events.map((event: any) => [
      event.evento,
      event.cliente,
      new Date(event.fecha).toLocaleDateString('es-MX'),
      event.tipo,
      event.responsable,
      event.ingreso_estimado.toFixed(2),
      event.provisiones.toFixed(2),
      event.utilidad_estimada.toFixed(2),
      event.margen_estimado.toFixed(2),
      event.ingreso_real.toFixed(2),
      event.gastos_pagados.toFixed(2),
      event.gastos_pendientes.toFixed(2),
      event.utilidad_real.toFixed(2),
      event.margen_real.toFixed(2),
      event.diferencia_absoluta.toFixed(2),
      event.diferencia_porcentaje.toFixed(2),
      event.variacion_ingresos.toFixed(2),
      event.variacion_gastos.toFixed(2),
      event.variacion_margen.toFixed(2),
      event.status,
      event.alert_level
    ]);

    // Agregar resumen al final
    const summaryRows = [
      [],
      ['RESUMEN DEL PORTAFOLIO'],
      ['Total Eventos', data.summary.total_eventos],
      [],
      ['Total Ingresos Estimados', data.summary.total_ingresos_estimados.toFixed(2)],
      ['Total Ingresos Reales', data.summary.total_ingresos_reales.toFixed(2)],
      ['Total Provisiones', data.summary.total_provisiones.toFixed(2)],
      ['Total Gastos Pagados', data.summary.total_gastos_pagados.toFixed(2)],
      ['Total Gastos Pendientes', data.summary.total_gastos_pendientes.toFixed(2)],
      ['Total Utilidad Estimada', data.summary.total_utilidad_estimada.toFixed(2)],
      ['Total Utilidad Real', data.summary.total_utilidad_real.toFixed(2)],
      [],
      ['Promedio Margen Estimado (%)', data.summary.promedio_margen_estimado.toFixed(2)],
      ['Promedio Margen Real (%)', data.summary.promedio_margen_real.toFixed(2)],
      [],
      ['Desviación Ingresos (%)', data.summary.desviacion_ingresos.toFixed(2)],
      ['Desviación Gastos (%)', data.summary.desviacion_gastos.toFixed(2)],
      ['Desviación Utilidad (%)', data.summary.desviacion_utilidad.toFixed(2)],
      ['Desviación Global (%)', data.summary.desviacion_global.toFixed(2)],
      [],
      ['Eventos Sobre Estimación', data.summary.eventos_sobre_estimacion],
      ['Eventos Bajo Estimación', data.summary.eventos_bajo_estimacion],
      ['Eventos con Margen Crítico', data.summary.eventos_con_margen_critico],
      ['Tasa de Precisión (%)', data.summary.tasa_precision_estimacion.toFixed(2)]
    ];

    const allRows = [headers, ...rows, ...summaryRows];

    return allRows.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
  }

  /**
   * Genera reporte HTML para PDF
   */
  private static generateHTMLReport(
    eventsAnalysis: EventFinancialAnalysis[],
    portfolioSummary: PortfolioFinancialSummary
  ): string {
    const formatCurrency = (value: number) => {
      return new Intl.NumberFormat('es-MX', {
        style: 'currency',
        currency: 'MXN'
      }).format(value);
    };

    const formatPercentage = (value: number) => `${value.toFixed(2)}%`;

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Análisis Financiero de Eventos</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            margin: 20px;
            font-size: 12px;
          }
          h1 {
            color: #1e40af;
            border-bottom: 3px solid #1e40af;
            padding-bottom: 10px;
          }
          h2 {
            color: #4b5563;
            margin-top: 30px;
            border-bottom: 2px solid #d1d5db;
            padding-bottom: 5px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 15px;
            page-break-inside: avoid;
          }
          th, td {
            border: 1px solid #d1d5db;
            padding: 8px;
            text-align: left;
          }
          th {
            background-color: #f3f4f6;
            font-weight: bold;
          }
          .summary-box {
            background-color: #eff6ff;
            padding: 15px;
            border-radius: 8px;
            margin: 20px 0;
            border-left: 4px solid #3b82f6;
          }
          .positive {
            color: #059669;
            font-weight: bold;
          }
          .negative {
            color: #dc2626;
            font-weight: bold;
          }
          .warning {
            color: #d97706;
            font-weight: bold;
          }
          @media print {
            body { margin: 0; }
            .page-break { page-break-before: always; }
          }
        </style>
      </head>
      <body>
        <h1>📊 Análisis Financiero de Eventos</h1>
        <p>Fecha de generación: ${new Date().toLocaleString('es-MX')}</p>

        <div class="summary-box">
          <h2>Resumen del Portafolio</h2>
          <p><strong>Total de Eventos:</strong> ${portfolioSummary.total_eventos}</p>

          <h3>Totales</h3>
          <table>
            <tr>
              <th>Concepto</th>
              <th>Estimado</th>
              <th>Real</th>
              <th>Desviación</th>
            </tr>
            <tr>
              <td>Ingresos</td>
              <td>${formatCurrency(portfolioSummary.total_ingresos_estimados)}</td>
              <td>${formatCurrency(portfolioSummary.total_ingresos_reales)}</td>
              <td class="${portfolioSummary.desviacion_ingresos >= 0 ? 'positive' : 'negative'}">
                ${formatPercentage(portfolioSummary.desviacion_ingresos)}
              </td>
            </tr>
            <tr>
              <td>Provisiones</td>
              <td>${formatCurrency(portfolioSummary.total_provisiones)}</td>
              <td>${formatCurrency(portfolioSummary.total_gastos_pagados)}</td>
              <td class="${portfolioSummary.desviacion_gastos <= 0 ? 'positive' : 'negative'}">
                ${formatPercentage(portfolioSummary.desviacion_gastos)}
              </td>
            </tr>
            <tr>
              <td>Utilidad</td>
              <td>${formatCurrency(portfolioSummary.total_utilidad_estimada)}</td>
              <td>${formatCurrency(portfolioSummary.total_utilidad_real)}</td>
              <td class="${portfolioSummary.desviacion_utilidad >= 0 ? 'positive' : 'negative'}">
                ${formatPercentage(portfolioSummary.desviacion_utilidad)}
              </td>
            </tr>
          </table>

          <h3>Métricas de Desempeño</h3>
          <ul>
            <li>Margen Estimado Promedio: ${formatPercentage(portfolioSummary.promedio_margen_estimado)}</li>
            <li>Margen Real Promedio: ${formatPercentage(portfolioSummary.promedio_margen_real)}</li>
            <li>Desviación Global: ${formatPercentage(portfolioSummary.desviacion_global)}</li>
            <li>Tasa de Precisión: ${formatPercentage(portfolioSummary.tasa_precision_estimacion)}</li>
            <li>Eventos Sobre Estimación: ${portfolioSummary.eventos_sobre_estimacion}</li>
            <li>Eventos Bajo Estimación: ${portfolioSummary.eventos_bajo_estimacion}</li>
            <li>Eventos con Margen Crítico: ${portfolioSummary.eventos_con_margen_critico}</li>
          </ul>
        </div>

        <div class="page-break"></div>

        <h2>Análisis Detallado por Evento</h2>
        ${eventsAnalysis.map(analysis => `
          <div style="margin-bottom: 30px; page-break-inside: avoid;">
            <h3>${analysis.event_name}</h3>
            <p>
              <strong>Cliente:</strong> ${analysis.cliente_nombre || 'N/A'} |
              <strong>Fecha:</strong> ${new Date(analysis.fecha_evento).toLocaleDateString('es-MX')} |
              <strong>Estado:</strong> <span class="${
                analysis.status === 'excelente' ? 'positive' :
                analysis.status === 'critico' ? 'negative' : 'warning'
              }">${analysis.status.toUpperCase()}</span>
            </p>

            <table>
              <tr>
                <th>Concepto</th>
                <th>Estimado</th>
                <th>Real</th>
                <th>Diferencia</th>
              </tr>
              <tr>
                <td>Ingreso</td>
                <td>${formatCurrency(analysis.projection.ingreso_estimado)}</td>
                <td>${formatCurrency(analysis.result.ingreso_real)}</td>
                <td class="${analysis.comparison.variacion_ingresos >= 0 ? 'positive' : 'negative'}">
                  ${formatPercentage(analysis.comparison.variacion_ingresos)}
                </td>
              </tr>
              <tr>
                <td>Provisiones</td>
                <td>${formatCurrency(analysis.projection.provisiones)}</td>
                <td>${formatCurrency(analysis.result.gastos_pagados)}</td>
                <td class="${analysis.comparison.variacion_gastos <= 0 ? 'positive' : 'negative'}">
                  ${formatPercentage(analysis.comparison.variacion_gastos)}
                </td>
              </tr>
              <tr>
                <td>Utilidad</td>
                <td>${formatCurrency(analysis.projection.utilidad_estimada)}</td>
                <td>${formatCurrency(analysis.result.utilidad_real)}</td>
                <td class="${analysis.comparison.diferencia_absoluta >= 0 ? 'positive' : 'negative'}">
                  ${formatCurrency(analysis.comparison.diferencia_absoluta)}
                </td>
              </tr>
              <tr>
                <td>Margen (%)</td>
                <td>${formatPercentage(analysis.projection.margen_estimado)}</td>
                <td>${formatPercentage(analysis.result.margen_real)}</td>
                <td class="${analysis.comparison.variacion_margen >= 0 ? 'positive' : 'negative'}">
                  ${formatPercentage(analysis.comparison.variacion_margen)}
                </td>
              </tr>
            </table>
          </div>
        `).join('')}
      </body>
      </html>
    `;
  }

  /**
   * Descarga un archivo
   */
  private static downloadFile(content: string, filename: string, mimeType: string) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}
