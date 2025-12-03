/**
 * Servicio de Exportación PDF/Excel - FASE 2.3
 * Genera reportes profesionales en múltiples formatos
 */
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Event as EventoType } from '../types/Event';
import { Income, Expense } from '../types/Finance';

// Extender jsPDF con autoTable
declare module 'jspdf' {
  interface jsPDF {
    lastAutoTable: { finalY: number };
  }
}

interface ExportOptions {
  titulo?: string;
  subtitulo?: string;
  fechaGeneracion?: Date;
  incluirLogo?: boolean;
  orientacion?: 'portrait' | 'landscape';
}

class ExportService {
  private static instance: ExportService;

  private constructor() {}

  public static getInstance(): ExportService {
    if (!ExportService.instance) {
      ExportService.instance = new ExportService();
    }
    return ExportService.instance;
  }

  // ============================================================================
  // EXPORTACIÓN EXCEL
  // ============================================================================

  /**
   * Exporta eventos a Excel con formato profesional
   */
  exportEventosToExcel(eventos: EventoType[], options?: ExportOptions): void {
    const titulo = options?.titulo || 'Reporte de Eventos';

    // Preparar datos
    const data = eventos.map(evento => ({
      'Clave': evento.clave_evento,
      'Nombre': evento.nombre_proyecto,
      'Cliente ID': evento.cliente_id,
      'Fecha Inicio': this.formatDate(evento.fecha_inicio),
      'Fecha Fin': this.formatDate(evento.fecha_fin),
      'Estado': this.getEstadoNombre(evento.estado_id || 1),
      'Ganancia Estimada': evento.ganancia_estimada || 0,
      'Provisión Combustible': evento.provision_combustible_peaje || 0,
      'Provisión Materiales': evento.provision_materiales || 0,
      'Provisión RH': evento.provision_recursos_humanos || 0,
      'Provisión SP': evento.provision_solicitudes_pago || 0,
      'Lugar': evento.lugar || '',
      'Notas': evento.notas || '',
    }));

    // Crear workbook
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data);

    // Ajustar anchos de columna
    const colWidths = [
      { wch: 15 }, // Clave
      { wch: 40 }, // Nombre
      { wch: 10 }, // Cliente ID
      { wch: 12 }, // Fecha Inicio
      { wch: 12 }, // Fecha Fin
      { wch: 12 }, // Estado
      { wch: 15 }, // Ganancia
      { wch: 15 }, // Prov Comb
      { wch: 15 }, // Prov Mat
      { wch: 15 }, // Prov RH
      { wch: 15 }, // Prov SP
      { wch: 30 }, // Lugar
      { wch: 40 }, // Notas
    ];
    ws['!cols'] = colWidths;

    // Agregar hoja
    XLSX.utils.book_append_sheet(wb, ws, 'Eventos');

    // Agregar hoja de resumen
    const resumenData = [
      { 'Métrica': 'Total Eventos', 'Valor': eventos.length },
      { 'Métrica': 'Ganancia Total Estimada', 'Valor': eventos.reduce((sum, e) => sum + (e.ganancia_estimada || 0), 0) },
      { 'Métrica': 'Fecha Generación', 'Valor': new Date().toLocaleString('es-MX') },
    ];
    const wsResumen = XLSX.utils.json_to_sheet(resumenData);
    XLSX.utils.book_append_sheet(wb, wsResumen, 'Resumen');

    // Descargar archivo
    const filename = `${titulo.replace(/\s+/g, '_')}_${this.formatDateForFilename(new Date())}.xlsx`;
    XLSX.writeFile(wb, filename);
  }

  /**
   * Exporta ingresos a Excel
   */
  exportIngresosToExcel(ingresos: Income[], eventoNombre: string): void {
    const data = ingresos.map(ing => ({
      'Concepto': ing.concepto,
      'Descripción': ing.descripcion || '',
      'Subtotal': ing.subtotal,
      'IVA': ing.iva,
      'Total': ing.total,
      'Fecha Ingreso': this.formatDate(ing.fecha_ingreso),
      'Fecha Facturación': this.formatDate(ing.fecha_facturacion),
      'Fecha Cobro': this.formatDate(ing.fecha_cobro),
      'Facturado': ing.facturado ? 'Sí' : 'No',
      'Cobrado': ing.cobrado ? 'Sí' : 'No',
      'UUID CFDI': ing.uuid_cfdi || '',
      'RFC Cliente': ing.rfc_cliente || '',
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data);

    ws['!cols'] = [
      { wch: 40 }, { wch: 40 }, { wch: 12 }, { wch: 12 }, { wch: 12 },
      { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 10 }, { wch: 10 },
      { wch: 40 }, { wch: 15 }
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'Ingresos');

    const filename = `Ingresos_${eventoNombre}_${this.formatDateForFilename(new Date())}.xlsx`;
    XLSX.writeFile(wb, filename);
  }

  /**
   * Exporta gastos a Excel
   */
  exportGastosToExcel(gastos: Expense[], eventoNombre: string): void {
    const data = gastos.map(gasto => ({
      'Concepto': gasto.concepto,
      'Categoría': gasto.categoria?.nombre || 'Sin categoría',
      'Proveedor': gasto.proveedor || '',
      'Cantidad': gasto.cantidad,
      'P. Unitario': gasto.precio_unitario,
      'Subtotal': gasto.subtotal,
      'IVA': gasto.iva,
      'Total': gasto.total,
      'Fecha Gasto': this.formatDate(gasto.fecha_gasto),
      'Forma Pago': gasto.forma_pago,
      'Pagado': gasto.pagado ? 'Sí' : 'No',
      'Aprobado': gasto.aprobado,
      'RFC Proveedor': gasto.rfc_proveedor || '',
      'UUID CFDI': gasto.uuid_cfdi || '',
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data);

    ws['!cols'] = [
      { wch: 40 }, { wch: 20 }, { wch: 30 }, { wch: 10 }, { wch: 12 },
      { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 15 },
      { wch: 10 }, { wch: 12 }, { wch: 15 }, { wch: 40 }
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'Gastos');

    // Agregar hoja de resumen por categoría
    const porCategoria = gastos.reduce((acc, g) => {
      const cat = g.categoria?.nombre || 'Sin categoría';
      if (!acc[cat]) acc[cat] = { cantidad: 0, total: 0 };
      acc[cat].cantidad++;
      acc[cat].total += g.total;
      return acc;
    }, {} as Record<string, { cantidad: number; total: number }>);

    const resumenData = Object.entries(porCategoria).map(([cat, datos]) => ({
      'Categoría': cat,
      'Cantidad Gastos': datos.cantidad,
      'Total': datos.total
    }));

    const wsResumen = XLSX.utils.json_to_sheet(resumenData);
    XLSX.utils.book_append_sheet(wb, wsResumen, 'Resumen por Categoría');

    const filename = `Gastos_${eventoNombre}_${this.formatDateForFilename(new Date())}.xlsx`;
    XLSX.writeFile(wb, filename);
  }

  // ============================================================================
  // EXPORTACIÓN PDF
  // ============================================================================

  /**
   * Exporta eventos a PDF con formato profesional
   */
  exportEventosToPDF(eventos: EventoType[], options?: ExportOptions): void {
    const titulo = options?.titulo || 'Reporte de Eventos';
    const orientacion = options?.orientacion || 'landscape';

    const doc = new jsPDF({ orientation: orientacion });

    // Header
    doc.setFontSize(20);
    doc.setTextColor(41, 128, 185);
    doc.text(titulo, 14, 22);

    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Generado: ${new Date().toLocaleString('es-MX')}`, 14, 30);
    doc.text(`Total eventos: ${eventos.length}`, 14, 36);

    // Tabla de eventos
    const tableData = eventos.map(evento => [
      evento.clave_evento,
      evento.nombre_proyecto.substring(0, 40),
      this.formatDate(evento.fecha_inicio),
      this.getEstadoNombre(evento.estado_id || 1),
      this.formatCurrency(evento.ganancia_estimada || 0),
      evento.lugar?.substring(0, 30) || 'N/A'
    ]);

    autoTable(doc, {
      head: [['Clave', 'Nombre', 'Fecha', 'Estado', 'Ganancia Est.', 'Lugar']],
      body: tableData,
      startY: 42,
      styles: {
        fontSize: 9,
        cellPadding: 3,
      },
      headStyles: {
        fillColor: [41, 128, 185],
        textColor: 255,
        fontStyle: 'bold',
      },
      alternateRowStyles: {
        fillColor: [245, 245, 245],
      },
      columnStyles: {
        0: { cellWidth: 30 },
        1: { cellWidth: 60 },
        2: { cellWidth: 25 },
        3: { cellWidth: 25 },
        4: { cellWidth: 30, halign: 'right' },
        5: { cellWidth: 40 },
      },
    });

    // Footer
    const pageCount = doc.internal.pages.length - 1;
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text(
        `Página ${i} de ${pageCount} - ERP MADE 777`,
        doc.internal.pageSize.getWidth() / 2,
        doc.internal.pageSize.getHeight() - 10,
        { align: 'center' }
      );
    }

    const filename = `${titulo.replace(/\s+/g, '_')}_${this.formatDateForFilename(new Date())}.pdf`;
    doc.save(filename);
  }

  /**
   * Exporta reporte financiero de un evento a PDF
   */
  exportEventoFinancieroPDF(
    evento: EventoType,
    ingresos: Income[],
    gastos: Expense[],
    options?: ExportOptions
  ): void {
    const doc = new jsPDF({ orientation: 'portrait' });

    // Header con logo y datos del evento
    doc.setFontSize(18);
    doc.setTextColor(41, 128, 185);
    doc.text('Reporte Financiero de Evento', 14, 22);

    doc.setFontSize(14);
    doc.setTextColor(0);
    doc.text(`${evento.clave_evento} - ${evento.nombre_proyecto}`, 14, 32);

    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Fecha: ${this.formatDate(evento.fecha_inicio)}`, 14, 40);
    doc.text(`Generado: ${new Date().toLocaleString('es-MX')}`, 14, 46);

    // Resumen financiero
    const totalIngresos = ingresos.reduce((sum, i) => sum + i.total, 0);
    const totalGastos = gastos.reduce((sum, g) => sum + g.total, 0);
    const utilidad = totalIngresos - totalGastos;
    const margen = totalIngresos > 0 ? (utilidad / totalIngresos * 100) : 0;

    doc.setFontSize(12);
    doc.setTextColor(0);
    doc.text('Resumen Financiero', 14, 58);

    autoTable(doc, {
      body: [
        ['Total Ingresos', this.formatCurrency(totalIngresos)],
        ['Total Gastos', this.formatCurrency(totalGastos)],
        ['Utilidad', this.formatCurrency(utilidad)],
        ['Margen', `${margen.toFixed(2)}%`],
      ],
      startY: 62,
      theme: 'grid',
      styles: { fontSize: 10 },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 80 },
        1: { halign: 'right', cellWidth: 60 },
      },
    });

    // Tabla de ingresos
    let startY = doc.lastAutoTable.finalY + 15;

    doc.setFontSize(12);
    doc.text('Ingresos', 14, startY);

    const ingresosData = ingresos.map(ing => [
      ing.concepto.substring(0, 35),
      this.formatCurrency(ing.subtotal),
      this.formatCurrency(ing.iva),
      this.formatCurrency(ing.total),
      ing.cobrado ? 'Cobrado' : ing.facturado ? 'Facturado' : 'Pendiente'
    ]);

    autoTable(doc, {
      head: [['Concepto', 'Subtotal', 'IVA', 'Total', 'Estado']],
      body: ingresosData,
      startY: startY + 4,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [39, 174, 96] },
    });

    // Tabla de gastos
    startY = doc.lastAutoTable.finalY + 15;

    // Si no cabe en la página, agregar nueva
    if (startY > 250) {
      doc.addPage();
      startY = 20;
    }

    doc.setFontSize(12);
    doc.text('Gastos', 14, startY);

    const gastosData = gastos.map(g => [
      g.concepto.substring(0, 30),
      g.categoria?.nombre || 'N/A',
      this.formatCurrency(g.total),
      g.pagado ? 'Pagado' : 'Pendiente'
    ]);

    autoTable(doc, {
      head: [['Concepto', 'Categoría', 'Total', 'Estado']],
      body: gastosData,
      startY: startY + 4,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [231, 76, 60] },
    });

    // Footer
    const pageCount = doc.internal.pages.length - 1;
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text(
        `Página ${i} de ${pageCount} - ERP MADE 777`,
        doc.internal.pageSize.getWidth() / 2,
        doc.internal.pageSize.getHeight() - 10,
        { align: 'center' }
      );
    }

    const filename = `Reporte_Financiero_${evento.clave_evento}_${this.formatDateForFilename(new Date())}.pdf`;
    doc.save(filename);
  }

  // ============================================================================
  // UTILIDADES
  // ============================================================================

  private formatDate(dateStr?: string | null): string {
    if (!dateStr) return 'N/A';
    try {
      return new Date(dateStr).toLocaleDateString('es-MX');
    } catch {
      return dateStr;
    }
  }

  private formatDateForFilename(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  private formatCurrency(amount: number): string {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(amount);
  }

  private getEstadoNombre(estadoId: number): string {
    const estados: Record<number, string> = {
      1: 'Borrador',
      2: 'Cotizado',
      3: 'Aprobado',
      4: 'En Proceso',
      5: 'Completado',
      6: 'Facturado',
      7: 'Cobrado',
    };
    return estados[estadoId] || 'Desconocido';
  }
}

export const exportService = ExportService.getInstance();
