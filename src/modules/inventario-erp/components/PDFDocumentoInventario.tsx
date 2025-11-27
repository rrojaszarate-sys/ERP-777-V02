import React, { useState, useEffect, useMemo, useRef } from 'react';
import { jsPDF } from 'jspdf';
import { useTheme } from '../../../shared/components/theme';
import { APP_CONFIG } from '../../../core/config/constants';
import { fetchDocumentoById } from '../services/documentosInventarioService';
import type { DocumentoInventario } from '../types';

interface PDFDocumentoInventarioProps {
  documentoId: number;
  onClose: () => void;
}

export const PDFDocumentoInventario: React.FC<PDFDocumentoInventarioProps> = ({
  documentoId,
  onClose,
}) => {
  const { paletteConfig, isDark } = useTheme();
  const [documento, setDocumento] = useState<DocumentoInventario | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);

  const themeColors = useMemo(() => ({
    primary: paletteConfig.primary,
    secondary: paletteConfig.secondary,
    background: isDark ? '#1f2937' : '#ffffff',
    cardBg: isDark ? '#374151' : '#f9fafb',
    border: isDark ? '#4b5563' : '#e5e7eb',
    text: isDark ? '#f3f4f6' : '#111827',
    textMuted: isDark ? '#9ca3af' : '#6b7280',
  }), [paletteConfig, isDark]);

  useEffect(() => {
    const loadDocumento = async () => {
      try {
        const doc = await fetchDocumentoById(documentoId);
        setDocumento(doc);
      } catch (err: any) {
        setError(err.message || 'Error al cargar el documento');
      } finally {
        setLoading(false);
      }
    };
    loadDocumento();
  }, [documentoId]);

  const isEntrada = documento?.tipo === 'entrada';
  const totalProductos = documento?.detalles?.reduce((sum, d) => sum + d.cantidad, 0) || 0;

  const generatePDF = async () => {
    if (!documento) return;

    setGenerating(true);

    try {
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const pageWidth = 210;
      const pageHeight = 297;
      const margin = 15;
      let currentY = margin;

      // Colores
      const primaryColor = paletteConfig.primary || '#74F1C8';
      const hexToRgb = (hex: string) => {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16)
        } : { r: 116, g: 241, b: 200 };
      };
      const rgb = hexToRgb(primaryColor);

      // ============================================
      // HEADER / MEMBRETE
      // ============================================
      pdf.setFillColor(rgb.r, rgb.g, rgb.b);
      pdf.rect(0, 0, pageWidth, 35, 'F');

      // Logo/Nombre empresa
      pdf.setFontSize(20);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(255, 255, 255);
      pdf.text(APP_CONFIG.company || 'MADE Events', margin, 18);

      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      pdf.text('Sistema de Gestión de Inventario', margin, 26);

      // Número de documento
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.text(documento.numero_documento, pageWidth - margin, 18, { align: 'right' });

      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'normal');
      const tipoLabel = isEntrada ? 'DOCUMENTO DE ENTRADA' : 'DOCUMENTO DE SALIDA';
      pdf.text(tipoLabel, pageWidth - margin, 26, { align: 'right' });

      currentY = 45;

      // ============================================
      // INFORMACIÓN GENERAL
      // ============================================
      pdf.setTextColor(0, 0, 0);
      pdf.setFontSize(10);

      // Recuadro de información
      pdf.setDrawColor(200);
      pdf.setLineWidth(0.3);
      pdf.rect(margin, currentY, pageWidth - 2 * margin, 30);

      // Grid de información
      const col1 = margin + 3;
      const col2 = margin + 60;
      const col3 = margin + 110;

      currentY += 7;

      pdf.setFont('helvetica', 'bold');
      pdf.text('Fecha:', col1, currentY);
      pdf.setFont('helvetica', 'normal');
      pdf.text(new Date(documento.fecha).toLocaleDateString('es-MX', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }), col1 + 15, currentY);

      pdf.setFont('helvetica', 'bold');
      pdf.text('Almacén:', col2, currentY);
      pdf.setFont('helvetica', 'normal');
      pdf.text(documento.almacen?.nombre || '-', col2 + 18, currentY);

      pdf.setFont('helvetica', 'bold');
      pdf.text('Estado:', col3, currentY);
      pdf.setFont('helvetica', 'normal');
      const estadoText = documento.estado === 'confirmado' ? 'Confirmado' :
                        documento.estado === 'cancelado' ? 'CANCELADO' : 'Borrador';
      pdf.text(estadoText, col3 + 16, currentY);

      currentY += 10;

      if (documento.evento?.nombre) {
        pdf.setFont('helvetica', 'bold');
        pdf.text('Evento:', col1, currentY);
        pdf.setFont('helvetica', 'normal');
        pdf.text(documento.evento.nombre, col1 + 15, currentY);
      }

      if (documento.observaciones) {
        currentY += 10;
        pdf.setFont('helvetica', 'bold');
        pdf.text('Observaciones:', col1, currentY);
        pdf.setFont('helvetica', 'normal');
        const obsLines = pdf.splitTextToSize(documento.observaciones, pageWidth - 2 * margin - 35);
        pdf.text(obsLines.slice(0, 2), col1 + 30, currentY);
      }

      currentY = 85;

      // ============================================
      // TABLA DE PRODUCTOS
      // ============================================
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Detalle de Productos', margin, currentY);
      currentY += 8;

      // Encabezados de tabla
      pdf.setFillColor(240, 240, 240);
      pdf.rect(margin, currentY, pageWidth - 2 * margin, 8, 'F');
      pdf.setDrawColor(200);
      pdf.rect(margin, currentY, pageWidth - 2 * margin, 8);

      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'bold');
      pdf.text('#', margin + 3, currentY + 5.5);
      pdf.text('Código', margin + 12, currentY + 5.5);
      pdf.text('Producto', margin + 45, currentY + 5.5);
      pdf.text('Cantidad', pageWidth - margin - 25, currentY + 5.5);

      currentY += 8;

      // Filas de productos
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(8);

      documento.detalles?.forEach((detalle, index) => {
        const rowHeight = 7;

        // Alternar color de fondo
        if (index % 2 === 0) {
          pdf.setFillColor(250, 250, 250);
          pdf.rect(margin, currentY, pageWidth - 2 * margin, rowHeight, 'F');
        }

        // Borde de fila
        pdf.setDrawColor(220);
        pdf.rect(margin, currentY, pageWidth - 2 * margin, rowHeight);

        // Contenido
        pdf.text((index + 1).toString(), margin + 3, currentY + 5);
        pdf.text(
          (detalle.producto?.codigo_qr || detalle.producto?.codigo || detalle.producto?.sku || '-').substring(0, 18),
          margin + 12,
          currentY + 5
        );
        pdf.text(
          (detalle.producto?.nombre || 'Producto').substring(0, 45),
          margin + 45,
          currentY + 5
        );
        pdf.text(
          detalle.cantidad.toString(),
          pageWidth - margin - 15,
          currentY + 5,
          { align: 'right' }
        );

        currentY += rowHeight;

        // Nueva página si es necesario
        if (currentY > pageHeight - 80) {
          pdf.addPage();
          currentY = margin;
        }
      });

      // Total
      pdf.setFillColor(rgb.r, rgb.g, rgb.b);
      pdf.rect(margin, currentY, pageWidth - 2 * margin, 8, 'F');
      pdf.setTextColor(255, 255, 255);
      pdf.setFont('helvetica', 'bold');
      pdf.text('TOTAL PRODUCTOS:', margin + 3, currentY + 5.5);
      pdf.text(totalProductos.toString(), pageWidth - margin - 15, currentY + 5.5, { align: 'right' });
      pdf.setTextColor(0, 0, 0);

      currentY += 20;

      // ============================================
      // FIRMAS
      // ============================================
      // Verificar si hay espacio, sino nueva página
      if (currentY > pageHeight - 80) {
        pdf.addPage();
        currentY = margin;
      }

      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Firmas de Conformidad', margin, currentY);
      currentY += 8;

      const firmaWidth = 80;
      const firmaHeight = 40;
      const firmaY = currentY;

      // Firma de quien entrega
      pdf.setDrawColor(180);
      pdf.setLineWidth(0.3);
      pdf.rect(margin, firmaY, firmaWidth, firmaHeight);

      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'bold');
      pdf.text('ENTREGA:', margin + 3, firmaY + 5);
      pdf.setFont('helvetica', 'normal');
      pdf.text(documento.nombre_entrega || 'Sin nombre', margin + 3, firmaY + 10);

      // Imagen de firma entrega
      if (documento.firma_entrega) {
        try {
          pdf.addImage(documento.firma_entrega, 'PNG', margin + 5, firmaY + 12, firmaWidth - 10, 25);
        } catch (e) {
          console.error('Error agregando firma entrega:', e);
        }
      } else {
        pdf.setTextColor(150);
        pdf.text('(Sin firma)', margin + 30, firmaY + 25);
        pdf.setTextColor(0);
      }

      // Firma de quien recibe
      const firma2X = pageWidth - margin - firmaWidth;
      pdf.rect(firma2X, firmaY, firmaWidth, firmaHeight);

      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'bold');
      pdf.text('RECIBE:', firma2X + 3, firmaY + 5);
      pdf.setFont('helvetica', 'normal');
      pdf.text(documento.nombre_recibe || 'Sin nombre', firma2X + 3, firmaY + 10);

      // Imagen de firma recibe
      if (documento.firma_recibe) {
        try {
          pdf.addImage(documento.firma_recibe, 'PNG', firma2X + 5, firmaY + 12, firmaWidth - 10, 25);
        } catch (e) {
          console.error('Error agregando firma recibe:', e);
        }
      } else {
        pdf.setTextColor(150);
        pdf.text('(Sin firma)', firma2X + 30, firmaY + 25);
        pdf.setTextColor(0);
      }

      // ============================================
      // PIE DE PÁGINA
      // ============================================
      pdf.setFontSize(7);
      pdf.setTextColor(128);
      pdf.text(
        `Documento generado el ${new Date().toLocaleString('es-MX')} - ${APP_CONFIG.name} v${APP_CONFIG.version}`,
        pageWidth / 2,
        pageHeight - 10,
        { align: 'center' }
      );

      // Descargar
      pdf.save(`${documento.numero_documento}.pdf`);

    } catch (err: any) {
      console.error('Error generando PDF:', err);
      alert('Error al generar el PDF');
    } finally {
      setGenerating(false);
    }
  };

  const handlePrint = () => {
    if (previewRef.current) {
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <head>
              <title>${documento?.numero_documento || 'Documento'}</title>
              <style>
                body { font-family: Arial, sans-serif; margin: 20px; }
                .header { background: ${themeColors.primary}; color: white; padding: 20px; margin-bottom: 20px; }
                .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 20px; }
                table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
                th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                th { background: #f5f5f5; }
                .firmas { display: flex; justify-content: space-between; margin-top: 40px; }
                .firma-box { width: 45%; border: 1px solid #ccc; padding: 10px; min-height: 100px; }
                .firma-img { max-width: 100%; height: 60px; object-fit: contain; }
                @media print { body { margin: 0; } }
              </style>
            </head>
            <body>${previewRef.current.innerHTML}</body>
          </html>
        `);
        printWindow.document.close();
        printWindow.print();
      }
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
        <div className="bg-white p-8 rounded-xl text-center">
          <svg className="w-8 h-8 animate-spin mx-auto mb-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <p>Cargando documento...</p>
        </div>
      </div>
    );
  }

  if (error || !documento) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
        <div className="bg-white p-8 rounded-xl text-center max-w-md">
          <p className="text-red-500 mb-4">{error || 'Documento no encontrado'}</p>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg border hover:opacity-80"
          >
            Cerrar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div
        className="w-full max-w-3xl max-h-[95vh] rounded-xl shadow-2xl overflow-hidden flex flex-col"
        style={{ backgroundColor: themeColors.background }}
      >
        {/* Header */}
        <div
          className="px-6 py-4 flex items-center justify-between"
          style={{ background: `linear-gradient(135deg, ${themeColors.primary}, ${themeColors.secondary})` }}
        >
          <div className="flex items-center gap-3">
            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            <h2 className="text-xl font-bold text-white">Vista Previa PDF</h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3 py-2 rounded-lg bg-white/20 text-white hover:bg-white/30 transition-all flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              Imprimir
            </button>
            <button
              onClick={generatePDF}
              disabled={generating}
              className="px-3 py-2 rounded-lg bg-white text-gray-800 hover:bg-gray-100 transition-all flex items-center gap-2 font-medium"
            >
              {generating ? (
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              )}
              Descargar PDF
            </button>
            <button onClick={onClose} className="text-white hover:opacity-80 p-1 ml-2">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Preview */}
        <div className="flex-1 overflow-auto p-6 bg-gray-100">
          <div
            ref={previewRef}
            className="bg-white shadow-lg mx-auto"
            style={{ maxWidth: '210mm', minHeight: '297mm', padding: '15mm' }}
          >
            {/* Membrete */}
            <div
              className="rounded-lg p-4 mb-6 text-white"
              style={{ backgroundColor: themeColors.primary }}
            >
              <div className="flex justify-between items-start">
                <div>
                  <h1 className="text-xl font-bold">{APP_CONFIG.company}</h1>
                  <p className="text-sm opacity-80">Sistema de Gestión de Inventario</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-mono font-bold">{documento.numero_documento}</p>
                  <p className="text-sm opacity-80">
                    {isEntrada ? 'DOCUMENTO DE ENTRADA' : 'DOCUMENTO DE SALIDA'}
                  </p>
                </div>
              </div>
            </div>

            {/* Info General */}
            <div className="grid grid-cols-3 gap-4 mb-6 text-sm">
              <div>
                <span className="font-semibold">Fecha:</span>{' '}
                {new Date(documento.fecha).toLocaleDateString('es-MX', {
                  year: 'numeric', month: 'long', day: 'numeric'
                })}
              </div>
              <div>
                <span className="font-semibold">Almacén:</span>{' '}
                {documento.almacen?.nombre}
              </div>
              <div>
                <span className="font-semibold">Estado:</span>{' '}
                <span className={documento.estado === 'confirmado' ? 'text-green-600' : documento.estado === 'cancelado' ? 'text-red-600' : 'text-yellow-600'}>
                  {documento.estado === 'confirmado' ? 'Confirmado' : documento.estado === 'cancelado' ? 'CANCELADO' : 'Borrador'}
                </span>
              </div>
              {documento.evento?.nombre && (
                <div className="col-span-3">
                  <span className="font-semibold">Evento:</span>{' '}
                  {documento.evento.nombre}
                </div>
              )}
              {documento.observaciones && (
                <div className="col-span-3">
                  <span className="font-semibold">Observaciones:</span>{' '}
                  {documento.observaciones}
                </div>
              )}
            </div>

            {/* Tabla de productos */}
            <h3 className="font-bold text-lg mb-2">Detalle de Productos</h3>
            <table className="w-full border-collapse mb-6">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border p-2 text-left text-sm">#</th>
                  <th className="border p-2 text-left text-sm">Código</th>
                  <th className="border p-2 text-left text-sm">Producto</th>
                  <th className="border p-2 text-right text-sm">Cantidad</th>
                </tr>
              </thead>
              <tbody>
                {documento.detalles?.map((detalle, index) => (
                  <tr key={index} className={index % 2 === 0 ? 'bg-gray-50' : ''}>
                    <td className="border p-2 text-sm">{index + 1}</td>
                    <td className="border p-2 text-sm font-mono">
                      {detalle.producto?.codigo_qr || detalle.producto?.codigo || detalle.producto?.sku || '-'}
                    </td>
                    <td className="border p-2 text-sm">{detalle.producto?.nombre}</td>
                    <td className="border p-2 text-sm text-right font-bold">{detalle.cantidad}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ backgroundColor: themeColors.primary }} className="text-white">
                  <td colSpan={3} className="border p-2 text-sm font-bold">TOTAL PRODUCTOS</td>
                  <td className="border p-2 text-sm text-right font-bold">{totalProductos}</td>
                </tr>
              </tfoot>
            </table>

            {/* Firmas */}
            <h3 className="font-bold text-lg mb-4">Firmas de Conformidad</h3>
            <div className="grid grid-cols-2 gap-8">
              <div className="border rounded-lg p-4">
                <p className="font-semibold text-sm mb-1">ENTREGA:</p>
                <p className="text-sm mb-2">{documento.nombre_entrega || 'Sin nombre'}</p>
                {documento.firma_entrega ? (
                  <img src={documento.firma_entrega} alt="Firma Entrega" className="firma-img h-16 object-contain" />
                ) : (
                  <div className="h-16 flex items-center justify-center text-gray-400 text-sm">
                    (Sin firma)
                  </div>
                )}
              </div>
              <div className="border rounded-lg p-4">
                <p className="font-semibold text-sm mb-1">RECIBE:</p>
                <p className="text-sm mb-2">{documento.nombre_recibe || 'Sin nombre'}</p>
                {documento.firma_recibe ? (
                  <img src={documento.firma_recibe} alt="Firma Recibe" className="firma-img h-16 object-contain" />
                ) : (
                  <div className="h-16 flex items-center justify-center text-gray-400 text-sm">
                    (Sin firma)
                  </div>
                )}
              </div>
            </div>

            {/* Pie */}
            <div className="mt-8 pt-4 border-t text-center text-xs text-gray-400">
              Documento generado el {new Date().toLocaleString('es-MX')} - {APP_CONFIG.name} v{APP_CONFIG.version}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PDFDocumentoInventario;
