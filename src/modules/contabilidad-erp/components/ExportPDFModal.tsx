/**
 * MODAL: EXPORTAR A PDF CON MEMBRETE
 * Genera reporte PDF de gastos con membrete personalizable
 */

import { useState, useEffect } from 'react';
import { X, FileText, Download, Settings, Eye } from 'lucide-react';
import { jsPDF } from 'jspdf';
import { useAuth } from '../../../core/auth/AuthProvider';
import { fetchMembreteConfig } from '../services/gastosNoImpactadosService';
import type { GastoNoImpactadoView, MembreteConfig } from '../types/gastosNoImpactados';
import toast from 'react-hot-toast';

interface Props {
  gastos: GastoNoImpactadoView[];
  periodo: string;
  totales: {
    subtotal: number;
    iva: number;
    total: number;
    cantidad: number;
  };
  onClose: () => void;
}

export const ExportPDFModal = ({ gastos, periodo, totales, onClose }: Props) => {
  const { user } = useAuth();
  const companyId = user?.company_id;
  const [membrete, setMembrete] = useState<MembreteConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [showConfig, setShowConfig] = useState(false);

  // Opciones de exportación
  const [options, setOptions] = useState({
    incluirMembrete: true,
    incluirLogo: true,
    incluirTotales: true,
    orientacion: 'landscape' as 'portrait' | 'landscape',
    tamanoPagina: 'letter' as 'letter' | 'a4'
  });

  useEffect(() => {
    loadMembrete();
  }, [companyId]);

  const loadMembrete = async () => {
    if (!companyId) return;
    try {
      const data = await fetchMembreteConfig(companyId);
      setMembrete(data);
    } catch (error) {
      console.error('Error cargando membrete:', error);
    } finally {
      setLoading(false);
    }
  };

  const getPeriodoLabel = (periodo: string) => {
    const [anio, mes] = periodo.split('-');
    const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    return `${meses[parseInt(mes) - 1]} ${anio}`;
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 2
    }).format(value);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('es-MX', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const generatePDF = async () => {
    setGenerating(true);
    try {
      const doc = new jsPDF({
        orientation: options.orientacion,
        unit: 'mm',
        format: options.tamanoPagina
      });

      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 15;
      let y = margin;

      // ============ MEMBRETE ============
      if (options.incluirMembrete && membrete) {
        // Logo (si existe)
        if (options.incluirLogo && membrete.logo_url) {
          try {
            // Nota: Para logos reales se necesita cargar la imagen
            // doc.addImage(membrete.logo_url, 'PNG', margin, y, 30, 15);
          } catch (e) {
            console.warn('No se pudo cargar el logo');
          }
        }

        // Nombre de empresa
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text(membrete.nombre_empresa || company?.name || 'Empresa', margin, y + 5);

        // RFC
        if (membrete.rfc) {
          doc.setFontSize(10);
          doc.setFont('helvetica', 'normal');
          doc.text(`RFC: ${membrete.rfc}`, margin, y + 12);
        }

        // Dirección y contacto (lado derecho)
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        let rightY = y;
        if (membrete.direccion) {
          doc.text(membrete.direccion, pageWidth - margin, rightY, { align: 'right' });
          rightY += 4;
        }
        if (membrete.telefono) {
          doc.text(`Tel: ${membrete.telefono}`, pageWidth - margin, rightY, { align: 'right' });
          rightY += 4;
        }
        if (membrete.email) {
          doc.text(membrete.email, pageWidth - margin, rightY, { align: 'right' });
        }

        y += 25;

        // Línea separadora
        doc.setDrawColor(200, 200, 200);
        doc.line(margin, y, pageWidth - margin, y);
        y += 10;
      }

      // ============ TÍTULO DEL REPORTE ============
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('REPORTE DE GASTOS NO IMPACTADOS', pageWidth / 2, y, { align: 'center' });
      y += 7;

      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      doc.text(`Período: ${getPeriodoLabel(periodo)}`, pageWidth / 2, y, { align: 'center' });
      y += 10;

      // ============ TABLA DE GASTOS ============
      const columns = [
        { header: 'Fecha', width: 22 },
        { header: 'Proveedor', width: 50 },
        { header: 'Concepto', width: 60 },
        { header: 'Clave', width: 25 },
        { header: 'Subtotal', width: 25 },
        { header: 'IVA', width: 20 },
        { header: 'Total', width: 25 },
        { header: 'Ejecutivo', width: 25 }
      ];

      const tableWidth = columns.reduce((sum, col) => sum + col.width, 0);
      const startX = (pageWidth - tableWidth) / 2;

      // Header de tabla
      doc.setFillColor(66, 139, 202);
      doc.rect(startX, y, tableWidth, 8, 'F');

      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(255, 255, 255);

      let x = startX;
      columns.forEach(col => {
        doc.text(col.header, x + 2, y + 5.5);
        x += col.width;
      });

      y += 8;
      doc.setTextColor(0, 0, 0);

      // Filas de datos
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);

      let rowIndex = 0;
      for (const gasto of gastos) {
        // Nueva página si es necesario
        if (y > pageHeight - 30) {
          doc.addPage();
          y = margin;

          // Repetir header en nueva página
          doc.setFillColor(66, 139, 202);
          doc.rect(startX, y, tableWidth, 8, 'F');
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(255, 255, 255);
          x = startX;
          columns.forEach(col => {
            doc.text(col.header, x + 2, y + 5.5);
            x += col.width;
          });
          y += 8;
          doc.setTextColor(0, 0, 0);
          doc.setFont('helvetica', 'normal');
        }

        // Fondo alternado
        if (rowIndex % 2 === 0) {
          doc.setFillColor(245, 245, 245);
          doc.rect(startX, y, tableWidth, 6, 'F');
        }

        x = startX;

        // Fecha
        doc.text(formatDate(gasto.fecha_gasto).substring(0, 12), x + 2, y + 4);
        x += columns[0].width;

        // Proveedor
        const proveedor = (gasto.proveedor || '-').substring(0, 28);
        doc.text(proveedor, x + 2, y + 4);
        x += columns[1].width;

        // Concepto
        const concepto = (gasto.concepto || '-').substring(0, 35);
        doc.text(concepto, x + 2, y + 4);
        x += columns[2].width;

        // Clave
        doc.text((gasto.clave || '-').substring(0, 15), x + 2, y + 4);
        x += columns[3].width;

        // Subtotal
        doc.text(formatCurrency(gasto.subtotal || 0), x + columns[4].width - 2, y + 4, { align: 'right' });
        x += columns[4].width;

        // IVA
        doc.text(formatCurrency(gasto.iva || 0), x + columns[5].width - 2, y + 4, { align: 'right' });
        x += columns[5].width;

        // Total
        doc.setFont('helvetica', 'bold');
        doc.text(formatCurrency(gasto.total || 0), x + columns[6].width - 2, y + 4, { align: 'right' });
        doc.setFont('helvetica', 'normal');
        x += columns[6].width;

        // Ejecutivo
        doc.text((gasto.ejecutivo || '-').substring(0, 12), x + 2, y + 4);

        y += 6;
        rowIndex++;
      }

      // ============ TOTALES ============
      if (options.incluirTotales) {
        y += 5;

        // Línea de totales
        doc.setDrawColor(66, 139, 202);
        doc.setLineWidth(0.5);
        doc.line(startX, y, startX + tableWidth, y);
        y += 5;

        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');

        const totalesX = startX + columns[0].width + columns[1].width + columns[2].width;

        doc.text('TOTALES:', totalesX + 2, y + 4);
        doc.text(
          formatCurrency(totales.subtotal),
          totalesX + columns[3].width + columns[4].width - 2,
          y + 4,
          { align: 'right' }
        );
        doc.text(
          formatCurrency(totales.iva),
          totalesX + columns[3].width + columns[4].width + columns[5].width - 2,
          y + 4,
          { align: 'right' }
        );
        doc.setTextColor(66, 139, 202);
        doc.text(
          formatCurrency(totales.total),
          totalesX + columns[3].width + columns[4].width + columns[5].width + columns[6].width - 2,
          y + 4,
          { align: 'right' }
        );
        doc.setTextColor(0, 0, 0);

        y += 10;

        // Resumen
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.text(`Total de registros: ${totales.cantidad}`, startX, y);
      }

      // ============ PIE DE PÁGINA ============
      const footerY = pageHeight - 10;
      doc.setFontSize(7);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(128, 128, 128);

      if (membrete?.footer) {
        doc.text(membrete.footer, pageWidth / 2, footerY - 4, { align: 'center' });
      }

      doc.text(
        `Generado el ${new Date().toLocaleDateString('es-MX')} a las ${new Date().toLocaleTimeString('es-MX')}`,
        pageWidth / 2,
        footerY,
        { align: 'center' }
      );

      // Guardar PDF
      const fileName = `GNI_${periodo}_${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(fileName);
      toast.success('PDF generado correctamente');
    } catch (error) {
      console.error('Error generando PDF:', error);
      toast.error('Error al generar el PDF');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div className="flex items-center gap-3">
            <FileText className="w-6 h-6 text-red-600" />
            <h2 className="text-xl font-semibold text-gray-900">
              Exportar a PDF
            </h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Info del reporte */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-medium text-gray-900 mb-2">Resumen del Reporte</h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="text-gray-600">Período:</div>
              <div className="font-medium">{getPeriodoLabel(periodo)}</div>
              <div className="text-gray-600">Registros:</div>
              <div className="font-medium">{totales.cantidad}</div>
              <div className="text-gray-600">Total:</div>
              <div className="font-medium text-blue-600">{formatCurrency(totales.total)}</div>
            </div>
          </div>

          {/* Opciones */}
          <div className="space-y-4">
            <h3 className="font-medium text-gray-900">Opciones de exportación</h3>

            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={options.incluirMembrete}
                onChange={(e) => setOptions({ ...options, incluirMembrete: e.target.checked })}
                className="w-4 h-4 text-blue-600 rounded"
              />
              <span className="text-gray-700">Incluir membrete de empresa</span>
            </label>

            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={options.incluirTotales}
                onChange={(e) => setOptions({ ...options, incluirTotales: e.target.checked })}
                className="w-4 h-4 text-blue-600 rounded"
              />
              <span className="text-gray-700">Incluir totales</span>
            </label>

            <div className="flex gap-4">
              <div className="flex-1">
                <label className="block text-sm text-gray-600 mb-1">Orientación</label>
                <select
                  value={options.orientacion}
                  onChange={(e) => setOptions({ ...options, orientacion: e.target.value as 'portrait' | 'landscape' })}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="landscape">Horizontal</option>
                  <option value="portrait">Vertical</option>
                </select>
              </div>
              <div className="flex-1">
                <label className="block text-sm text-gray-600 mb-1">Tamaño</label>
                <select
                  value={options.tamanoPagina}
                  onChange={(e) => setOptions({ ...options, tamanoPagina: e.target.value as 'letter' | 'a4' })}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="letter">Carta</option>
                  <option value="a4">A4</option>
                </select>
              </div>
            </div>
          </div>

          {/* Membrete actual */}
          {membrete && options.incluirMembrete && (
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-medium text-blue-900">Membrete configurado</h4>
                <button
                  onClick={() => setShowConfig(!showConfig)}
                  className="text-blue-600 text-sm hover:underline flex items-center gap-1"
                >
                  <Settings className="w-3 h-3" />
                  Configurar
                </button>
              </div>
              <p className="text-sm text-blue-800">{membrete.nombre_empresa || 'Sin nombre'}</p>
              {membrete.rfc && <p className="text-xs text-blue-600">RFC: {membrete.rfc}</p>}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 border rounded-lg hover:bg-gray-100"
          >
            Cancelar
          </button>
          <button
            onClick={generatePDF}
            disabled={generating || gastos.length === 0}
            className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center gap-2"
          >
            {generating ? (
              <>
                <span className="animate-spin">⏳</span>
                Generando...
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                Descargar PDF
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
