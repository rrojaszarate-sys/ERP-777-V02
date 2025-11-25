import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';
import { EventoCompleto, Ingreso, Gasto } from '../core/types/events';
import { formatCurrency, formatDate } from '../shared/utils/formatters';

export class ExportService {
  private static instance: ExportService;

  private constructor() {}

  public static getInstance(): ExportService {
    if (!ExportService.instance) {
      ExportService.instance = new ExportService();
    }
    return ExportService.instance;
  }

  async exportEventsToPDF(
    eventos: EventoCompleto[],
    filters?: {
      fechaInicio?: string;
      fechaFin?: string;
      cliente?: string;
      responsable?: string;
    }
  ): Promise<void> {
    if (!eventos || eventos.length === 0) {
      throw new Error('No hay eventos para exportar');
    }

    const pdf = new jsPDF('l', 'mm', 'a4'); // Landscape orientation
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    
    // Add company logo and header
    this.addPDFHeader(pdf, pageWidth);
    
    // Add filters information
    let yPosition = 40;
    if (filters) {
      yPosition = this.addFiltersInfo(pdf, filters, yPosition);
    }
    
    // Add table headers
    yPosition += 10;
    const headers = [
      'Clave', 'Evento', 'Cliente', 'Responsable', 
      'Fecha Inicio', 'Fecha Fin', 'Status', 'Total', 'Utilidad'
    ];
    
    const columnWidths = [25, 45, 40, 35, 25, 25, 30, 30, 30];
    let xPosition = 10;
    
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    
    headers.forEach((header, index) => {
      pdf.text(header, xPosition, yPosition);
      xPosition += columnWidths[index];
    });
    
    // Add line under headers
    yPosition += 2;
    pdf.line(10, yPosition, pageWidth - 10, yPosition);
    yPosition += 5;
    
    // Add data rows
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    
    eventos.forEach((evento, index) => {
      if (yPosition > pageHeight - 20) {
        pdf.addPage();
        yPosition = 20;
        this.addPDFHeader(pdf, pageWidth);
        yPosition = 40;
      }
      
      xPosition = 10;
      const rowData = [
        evento.clave_unica,
        this.truncateText(evento.nombre, 20),
        this.truncateText(evento.cliente?.razon_social || '', 18),
        this.truncateText(evento.responsable?.nombre || '', 15),
        formatDate(evento.fecha_inicio),
        formatDate(evento.fecha_fin),
        this.getStatusLabel(evento.status_workflow),
        formatCurrency(evento.total),
        formatCurrency(evento.utilidad)
      ];
      
      rowData.forEach((data, colIndex) => {
        pdf.text(data, xPosition, yPosition);
        xPosition += columnWidths[colIndex];
      });
      
      yPosition += 5;
      
      // Add alternating row background
      if (index % 2 === 0) {
        pdf.setFillColor(245, 245, 245);
        pdf.rect(10, yPosition - 4, pageWidth - 20, 4, 'F');
      }
    });
    
    // Add summary
    this.addPDFSummary(pdf, eventos, yPosition + 10);
    
    // Add footer
    this.addPDFFooter(pdf, pageWidth, pageHeight);
    
    pdf.save(`eventos_${new Date().toISOString().split('T')[0]}.pdf`);
  }

  async exportEventsToExcel(
    eventos: EventoCompleto[],
    includeDetails: boolean = false
  ): Promise<void> {
    if (!eventos || eventos.length === 0) {
      throw new Error('No hay eventos para exportar');
    }

    const workbook = XLSX.utils.book_new();
    
    // Main events sheet
    const eventsData = eventos.map(evento => ({
      'Clave Única': evento.clave_unica,
      'Nombre del Evento': evento.nombre,
      'Cliente': evento.cliente?.razon_social || '',
      'Responsable': evento.responsable?.nombre || '',
      'Fecha Inicio': formatDate(evento.fecha_inicio),
      'Fecha Fin': formatDate(evento.fecha_fin),
      'Status': this.getStatusLabel(evento.status_workflow),
      'Subtotal': evento.subtotal,
      'IVA': evento.iva,
      'Total': evento.total,
      'Utilidad': evento.utilidad,
      'Margen %': evento.total > 0 ? ((evento.utilidad / evento.total) * 100).toFixed(2) : '0.00'
    }));
    
    const eventsSheet = XLSX.utils.json_to_sheet(eventsData);
    
    // Apply formatting
    const range = XLSX.utils.decode_range(eventsSheet['!ref'] || 'A1');
    
    // Format currency columns
    const currencyColumns = ['H', 'I', 'J', 'K']; // Subtotal, IVA, Total, Utilidad
    for (let row = 1; row <= range.e.r; row++) {
      currencyColumns.forEach(col => {
        const cellAddress = col + (row + 1);
        if (eventsSheet[cellAddress]) {
          eventsSheet[cellAddress].z = '"$"#,##0.00';
        }
      });
    }
    
    // Format percentage column
    for (let row = 1; row <= range.e.r; row++) {
      const cellAddress = 'L' + (row + 1);
      if (eventsSheet[cellAddress]) {
        eventsSheet[cellAddress].z = '0.00"%"';
      }
    }
    
    // Set column widths
    eventsSheet['!cols'] = [
      { width: 15 }, // Clave
      { width: 30 }, // Nombre
      { width: 25 }, // Cliente
      { width: 20 }, // Responsable
      { width: 12 }, // Fecha Inicio
      { width: 12 }, // Fecha Fin
      { width: 15 }, // Status
      { width: 12 }, // Subtotal
      { width: 12 }, // IVA
      { width: 12 }, // Total
      { width: 12 }, // Utilidad
      { width: 10 }  // Margen %
    ];
    
    // Add autofilter
    eventsSheet['!autofilter'] = { ref: eventsSheet['!ref'] || 'A1' };
    
    XLSX.utils.book_append_sheet(workbook, eventsSheet, 'Eventos');
    
    // Add detailed sheets if requested
    if (includeDetails) {
      this.addIncomeSheet(workbook, eventos);
      this.addExpensesSheet(workbook, eventos);
      this.addSummarySheet(workbook, eventos);
    }
    
    XLSX.writeFile(workbook, `eventos_detallado_${new Date().toISOString().split('T')[0]}.xlsx`);
  }

  exportDataToPDF(data: any[], columns: any[], filename: string): void {
    if (!data || data.length === 0) {
      throw new Error('No hay datos para exportar a PDF.');
      return;
    }

    try {
      const pdf = new jsPDF('l', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      let yPosition = 20;

      // Encabezado del documento
      pdf.setFontSize(16);
      pdf.setFont('helvetica', 'bold');
      pdf.text(filename, pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 10;
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`Generado: ${formatDate(new Date().toISOString(), true)}`, pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 10;
      pdf.line(10, yPosition, pageWidth - 10, yPosition);
      yPosition += 10;

      // Preparar encabezados y anchos de columna
      const tableHeaders = columns.map((col: any) => col.label);
      const tableColumnKeys = columns.map((col: any) => col.key);
      const defaultColumnWidth = (pageWidth - 20) / tableHeaders.length;
      const columnWidths = columns.map(() => defaultColumnWidth);

      // Dibuja los encabezados de la tabla
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'bold');
      let currentX = 10;
      tableHeaders.forEach((header, index) => {
        pdf.text(header, currentX, yPosition);
        currentX += columnWidths[index];
      });
      yPosition += 2;
      pdf.line(10, yPosition, pageWidth - 10, yPosition);
      yPosition += 5;

      // Dibuja las filas de datos
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(7);
      data.forEach((row, rowIndex) => {
        if (yPosition > pageHeight - 20) {
          pdf.addPage();
          yPosition = 20;
          pdf.setFontSize(10);
          pdf.setFont('helvetica', 'bold');
          pdf.text(filename, pageWidth / 2, yPosition, { align: 'center' });
          yPosition += 10;
          pdf.setFontSize(7);
          pdf.setFont('helvetica', 'bold');
          currentX = 10;
          tableHeaders.forEach((header, index) => {
            pdf.text(header, currentX, yPosition);
            currentX += columnWidths[index];
          });
          yPosition += 2;
          pdf.line(10, yPosition, pageWidth - 10, yPosition);
          yPosition += 5;
          pdf.setFont('helvetica', 'normal');
        }

        currentX = 10;
        tableColumnKeys.forEach((key, colIndex) => {
          let cellValue = this.extractCellValue(row[key], row, columns.find(c => c.key === key));
          
          pdf.text(this.truncateText(cellValue, Math.floor(columnWidths[colIndex] / 2)), currentX, yPosition);
          currentX += columnWidths[colIndex];
        });
        yPosition += 5;

        if (rowIndex % 2 === 0) {
          pdf.setFillColor(245, 245, 245);
          pdf.rect(10, yPosition - 4, pageWidth - 20, 4, 'F');
        }
      });

      // Pie de página
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'normal');
      pdf.text(
        `Página ${pdf.getCurrentPageInfo().pageNumber} - Generado por MADE ERP v2.0`,
        pageWidth / 2,
        pageHeight - 10,
        { align: 'center' }
      );

      pdf.save(`${filename}_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      throw new Error('Error al generar el archivo PDF.');
    }
  }

  exportDataToExcel(data: any[], columns: any[], filename: string): void {
    if (!data || data.length === 0) {
      throw new Error('No hay datos para exportar a Excel.');
      return;
    }

    try {
      const workbook = XLSX.utils.book_new();
      const sheetData = data.map(row => {
        const newRow: { [key: string]: any } = {};
        columns.forEach((col: any) => {
          const value = this.extractCellValue(row[col.key], row, col);
          newRow[col.label] = value;
        });
        return newRow;
      });

      const worksheet = XLSX.utils.json_to_sheet(sheetData);
      
      // Configurar anchos de columna automáticamente
      const columnWidths = columns.map((col: any) => ({
        width: Math.max(col.label.length, 15)
      }));
      worksheet['!cols'] = columnWidths;
      
      // Añadir autofiltro
      worksheet['!autofilter'] = { ref: worksheet['!ref'] || 'A1' };
      
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Datos');
      XLSX.writeFile(workbook, `${filename}_${new Date().toISOString().split('T')[0]}.xlsx`);
    } catch (error) {
      console.error('Error generating Excel:', error);
      throw new Error('Error al generar el archivo Excel.');
    }
  }

  /**
   * Extrae el valor de una celda, manejando objetos anidados y funciones de renderizado.
   * @param {any} value - El valor original de la celda.
   * @param {any} row - La fila completa de datos.
   * @param {any} columnDef - La definición de la columna.
   * @returns {string} El valor extraído como string.
   */
  private extractCellValue(value: any, row: any, columnDef?: any): string {
    // Si hay una función de renderizado personalizada, intenta extraer texto de ella
    if (columnDef?.render) {
      try {
        const rendered = columnDef.render(value, row);
        if (typeof rendered === 'string') {
          return rendered;
        }
        // Para elementos React, intenta extraer el texto
        if (rendered && typeof rendered === 'object' && rendered.props) {
          if (typeof rendered.props.children === 'string') {
            return rendered.props.children;
          }
          // Si children es un array, concatena los strings
          if (Array.isArray(rendered.props.children)) {
            return rendered.props.children
              .filter((child: any) => typeof child === 'string')
              .join(' ');
          }
        }
      } catch (error) {
        console.warn('Error extracting rendered value:', error);
      }
    }
    
    // Manejo de objetos anidados
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return value.nombre || value.razon_social || value.label || JSON.stringify(value);
    }
    
    // Manejo de arrays
    if (Array.isArray(value)) {
      return value.join(', ');
    }
    
    return String(value || '');
  }

  private addPDFHeader(pdf: jsPDF, pageWidth: number): void {
    pdf.setFontSize(16);
    pdf.setFont('helvetica', 'bold');
    pdf.text('MADE Events SA de CV', pageWidth / 2, 15, { align: 'center' });
    
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'normal');
    pdf.text('Reporte de Eventos - Sistema de Gestión', pageWidth / 2, 22, { align: 'center' });
    
    pdf.setFontSize(10);
    pdf.text(`Generado: ${formatDate(new Date().toISOString(), true)}`, pageWidth / 2, 28, { align: 'center' });
    
    // Add line
    pdf.line(10, 32, pageWidth - 10, 32);
  }

  private addFiltersInfo(pdf: jsPDF, filters: any, yPosition: number): number {
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Filtros aplicados:', 10, yPosition);
    
    yPosition += 5;
    pdf.setFont('helvetica', 'normal');
    
    if (filters.fechaInicio) {
      pdf.text(`Fecha inicio: ${formatDate(filters.fechaInicio)}`, 10, yPosition);
      yPosition += 4;
    }
    
    if (filters.fechaFin) {
      pdf.text(`Fecha fin: ${formatDate(filters.fechaFin)}`, 10, yPosition);
      yPosition += 4;
    }
    
    if (filters.cliente) {
      pdf.text(`Cliente: ${filters.cliente}`, 10, yPosition);
      yPosition += 4;
    }
    
    if (filters.responsable) {
      pdf.text(`Responsable: ${filters.responsable}`, 10, yPosition);
      yPosition += 4;
    }
    
    return yPosition;
  }

  private addPDFSummary(pdf: jsPDF, eventos: EventoCompleto[], yPosition: number): void {
    const totalEventos = eventos.length;
    const totalIngresos = eventos.reduce((sum, e) => sum + e.total, 0);
    const totalUtilidad = eventos.reduce((sum, e) => sum + e.utilidad, 0);
    
    yPosition += 10;
    pdf.line(10, yPosition, pdf.internal.pageSize.getWidth() - 10, yPosition);
    yPosition += 8;
    
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(12);
    pdf.text('RESUMEN EJECUTIVO', 10, yPosition);
    
    yPosition += 8;
    pdf.setFontSize(10);
    pdf.text(`Total de Eventos: ${totalEventos}`, 10, yPosition);
    pdf.text(`Ingresos Totales: ${formatCurrency(totalIngresos)}`, 80, yPosition);
    pdf.text(`Utilidad Total: ${formatCurrency(totalUtilidad)}`, 160, yPosition);
  }

  private addPDFFooter(pdf: jsPDF, pageWidth: number, pageHeight: number): void {
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'normal');
    pdf.text(
      `Página ${pdf.getCurrentPageInfo().pageNumber} - Generado por MADE ERP v2.0`,
      pageWidth / 2,
      pageHeight - 10,
      { align: 'center' }
    );
  }

  private addIncomeSheet(workbook: XLSX.WorkBook, eventos: EventoCompleto[]): void {
    const incomeData: any[] = [];
    
    eventos.forEach(evento => {
      evento.ingresos?.forEach(ingreso => {
        incomeData.push({
          'Clave Evento': evento.clave_unica,
          'Nombre Evento': evento.nombre,
          'Cliente': evento.cliente?.razon_social || '',
          'Concepto': ingreso.concepto,
          'Monto': ingreso.monto,
          'Fecha Registro': formatDate(ingreso.fecha_registro),
          'Usuario Registro': ingreso.usuario_registro?.nombre || ''
        });
      });
    });
    
    const incomeSheet = XLSX.utils.json_to_sheet(incomeData);
    
    // Format currency column
    const range = XLSX.utils.decode_range(incomeSheet['!ref'] || 'A1');
    for (let row = 1; row <= range.e.r; row++) {
      const cellAddress = 'E' + (row + 1);
      if (incomeSheet[cellAddress]) {
        incomeSheet[cellAddress].z = '"$"#,##0.00';
      }
    }
    
    incomeSheet['!cols'] = [
      { width: 15 }, // Clave Evento
      { width: 30 }, // Nombre Evento
      { width: 25 }, // Cliente
      { width: 30 }, // Concepto
      { width: 12 }, // Monto
      { width: 12 }, // Fecha
      { width: 20 }  // Usuario
    ];
    
    incomeSheet['!autofilter'] = { ref: incomeSheet['!ref'] || 'A1' };
    XLSX.utils.book_append_sheet(workbook, incomeSheet, 'Ingresos');
  }

  private addExpensesSheet(workbook: XLSX.WorkBook, eventos: EventoCompleto[]): void {
    const expensesData: any[] = [];
    
    eventos.forEach(evento => {
      evento.gastos?.forEach(gasto => {
        expensesData.push({
          'Clave Evento': evento.clave_unica,
          'Nombre Evento': evento.nombre,
          'Cliente': evento.cliente?.razon_social || '',
          'Concepto': gasto.concepto,
          'Categoría': this.getCategoryLabel(gasto.categoria),
          'Monto': gasto.monto,
          'Fecha': formatDate(gasto.fecha),
          'Status': this.getExpenseStatusLabel(gasto.status),
          'Proveedor': gasto.proveedor || '',
          'Usuario Registro': gasto.usuario_registro?.nombre || ''
        });
      });
    });
    
    const expensesSheet = XLSX.utils.json_to_sheet(expensesData);
    
    // Format currency column
    const range = XLSX.utils.decode_range(expensesSheet['!ref'] || 'A1');
    for (let row = 1; row <= range.e.r; row++) {
      const cellAddress = 'F' + (row + 1);
      if (expensesSheet[cellAddress]) {
        expensesSheet[cellAddress].z = '"$"#,##0.00';
      }
    }
    
    expensesSheet['!cols'] = [
      { width: 15 }, // Clave Evento
      { width: 30 }, // Nombre Evento
      { width: 25 }, // Cliente
      { width: 30 }, // Concepto
      { width: 20 }, // Categoría
      { width: 12 }, // Monto
      { width: 12 }, // Fecha
      { width: 15 }, // Status
      { width: 20 }, // Proveedor
      { width: 20 }  // Usuario
    ];
    
    expensesSheet['!autofilter'] = { ref: expensesSheet['!ref'] || 'A1' };
    XLSX.utils.book_append_sheet(workbook, expensesSheet, 'Gastos');
  }

  private addSummarySheet(workbook: XLSX.WorkBook, eventos: EventoCompleto[]): void {
    const summaryData = [
      { 'Métrica': 'Total de Eventos', 'Valor': eventos.length },
      { 'Métrica': 'Ingresos Totales', 'Valor': eventos.reduce((sum, e) => sum + e.total, 0) },
      { 'Métrica': 'Gastos Totales', 'Valor': eventos.reduce((sum, e) => sum + (e.total - e.utilidad), 0) },
      { 'Métrica': 'Utilidad Total', 'Valor': eventos.reduce((sum, e) => sum + e.utilidad, 0) },
      { 'Métrica': 'Margen Promedio (%)', 'Valor': eventos.length > 0 ? (eventos.reduce((sum, e) => sum + (e.total > 0 ? (e.utilidad / e.total) * 100 : 0), 0) / eventos.length).toFixed(2) : 0 }
    ];
    
    const summarySheet = XLSX.utils.json_to_sheet(summaryData);
    
    // Format currency rows
    ['B2', 'B3', 'B4'].forEach(cell => {
      if (summarySheet[cell]) {
        summarySheet[cell].z = '"$"#,##0.00';
      }
    });
    
    // Format percentage row
    if (summarySheet['B5']) {
      summarySheet['B5'].z = '0.00"%"';
    }
    
    summarySheet['!cols'] = [
      { width: 25 }, // Métrica
      { width: 15 }  // Valor
    ];
    
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Resumen');
  }

  private truncateText(text: string, maxLength: number): string {
    return text.length > maxLength ? text.substring(0, maxLength - 3) + '...' : text;
  }

  private getStatusLabel(status: string): string {
    const labels = {
      'pendiente_facturar': 'Pend. Fact.',
      'facturado': 'Facturado',
      'pago_pendiente': 'Pago Pend.',
      'pagado': 'Pagado'
    };
    return labels[status as keyof typeof labels] || status;
  }

  private getCategoryLabel(category: string): string {
    const labels = {
      'sps': 'SPs',
      'rrhh': 'RRHH',
      'materiales': 'Materiales',
      'combustible_casetas': 'Combustible/Casetas',
      'otros': 'Otros'
    };
    return labels[category as keyof typeof labels] || category;
  }

  private getExpenseStatusLabel(status: string): string {
    const labels = {
      'pendiente': 'Pendiente',
      'aprobado': 'Aprobado',
      'rechazado': 'Rechazado'
    };
    return labels[status as keyof typeof labels] || status;
  }
}

export const exportService = ExportService.getInstance();