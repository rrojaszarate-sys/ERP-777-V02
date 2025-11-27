import React, { useState, useRef, useCallback, useMemo } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { useTheme } from '../../../shared/components/theme';
import type { Producto, ProductoQRLabel } from '../types';

// ============================================================================
// CONFIGURACIÓN DE ETIQUETAS
// ============================================================================

// A4: 210mm x 297mm, 24 etiquetas (4 columnas x 6 filas)
const A4_CONFIG = {
  pageWidth: 210,
  pageHeight: 297,
  columns: 4,
  rows: 6,
  labelWidth: 52.5, // 210/4
  labelHeight: 49.5, // 297/6
  qrSize: 30,
  padding: 2,
};

// Rollo térmico 58mm (común en impresoras de tickets)
const THERMAL_CONFIG = {
  labelWidth: 50,
  labelHeight: 35,
  qrSize: 25,
  padding: 2,
};

type LabelFormat = 'a4' | 'thermal';

interface QRLabelGeneratorProps {
  productos: Producto[];
  onClose: () => void;
}

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

export const QRLabelGenerator: React.FC<QRLabelGeneratorProps> = ({
  productos,
  onClose,
}) => {
  const { paletteConfig, isDark } = useTheme();
  const [selectedProducts, setSelectedProducts] = useState<Set<number>>(new Set());
  const [labelFormat, setLabelFormat] = useState<LabelFormat>('a4');
  const [copiesPerProduct, setCopiesPerProduct] = useState(1);
  const [isGenerating, setIsGenerating] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const printAreaRef = useRef<HTMLDivElement>(null);

  const themeColors = useMemo(() => ({
    primary: paletteConfig.primary,
    secondary: paletteConfig.secondary,
    background: isDark ? '#1f2937' : '#ffffff',
    cardBg: isDark ? '#374151' : '#f9fafb',
    border: isDark ? '#4b5563' : '#e5e7eb',
    text: isDark ? '#f3f4f6' : '#111827',
    textMuted: isDark ? '#9ca3af' : '#6b7280',
  }), [paletteConfig, isDark]);

  // Filtrar productos por búsqueda
  const filteredProducts = useMemo(() => {
    if (!searchTerm) return productos;
    const term = searchTerm.toLowerCase();
    return productos.filter(p =>
      p.nombre.toLowerCase().includes(term) ||
      p.codigo?.toLowerCase().includes(term) ||
      p.sku?.toLowerCase().includes(term)
    );
  }, [productos, searchTerm]);

  // Generar lista de etiquetas a imprimir
  const labelsToGenerate = useMemo((): ProductoQRLabel[] => {
    const labels: ProductoQRLabel[] = [];
    selectedProducts.forEach(productId => {
      const producto = productos.find(p => p.id === productId);
      if (producto) {
        for (let i = 0; i < copiesPerProduct; i++) {
          labels.push({
            codigo: producto.codigo_qr || producto.codigo || producto.sku || `PROD-${producto.id}`,
            nombre: producto.nombre,
            categoria: producto.categoria?.nombre || 'Sin categoría',
          });
        }
      }
    });
    return labels;
  }, [selectedProducts, productos, copiesPerProduct]);

  // Toggle selección de producto
  const toggleProduct = useCallback((productId: number) => {
    setSelectedProducts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(productId)) {
        newSet.delete(productId);
      } else {
        newSet.add(productId);
      }
      return newSet;
    });
  }, []);

  // Seleccionar/deseleccionar todos
  const toggleAll = useCallback(() => {
    if (selectedProducts.size === filteredProducts.length) {
      setSelectedProducts(new Set());
    } else {
      setSelectedProducts(new Set(filteredProducts.map(p => p.id)));
    }
  }, [filteredProducts, selectedProducts.size]);

  // Generar PDF de etiquetas A4
  const generateA4PDF = async () => {
    if (labelsToGenerate.length === 0) return;

    setIsGenerating(true);
    try {
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const config = A4_CONFIG;
      const labelsPerPage = config.columns * config.rows;
      let currentLabel = 0;

      for (let pageNum = 0; pageNum < Math.ceil(labelsToGenerate.length / labelsPerPage); pageNum++) {
        if (pageNum > 0) {
          pdf.addPage();
        }

        for (let row = 0; row < config.rows && currentLabel < labelsToGenerate.length; row++) {
          for (let col = 0; col < config.columns && currentLabel < labelsToGenerate.length; col++) {
            const label = labelsToGenerate[currentLabel];
            const x = col * config.labelWidth + config.padding;
            const y = row * config.labelHeight + config.padding;

            // Borde de la etiqueta
            pdf.setDrawColor(200);
            pdf.setLineWidth(0.1);
            pdf.rect(
              col * config.labelWidth,
              row * config.labelHeight,
              config.labelWidth,
              config.labelHeight
            );

            // Crear QR temporal para obtener data URL
            const qrCanvas = document.createElement('canvas');
            const qrDiv = document.createElement('div');
            qrDiv.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 29 29" width="${config.qrSize * 4}" height="${config.qrSize * 4}">
              ${generateQRPath(label.codigo)}
            </svg>`;
            document.body.appendChild(qrDiv);

            const svgElement = qrDiv.querySelector('svg');
            if (svgElement) {
              const svgData = new XMLSerializer().serializeToString(svgElement);
              const img = new Image();
              img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
              await new Promise(resolve => { img.onload = resolve; });

              // Dibujar QR centrado
              const qrX = x + (config.labelWidth - config.padding * 2 - config.qrSize) / 2;
              const qrY = y + 2;

              qrCanvas.width = config.qrSize * 4;
              qrCanvas.height = config.qrSize * 4;
              const ctx = qrCanvas.getContext('2d');
              if (ctx) {
                ctx.drawImage(img, 0, 0);
                pdf.addImage(qrCanvas.toDataURL(), 'PNG', qrX, qrY, config.qrSize, config.qrSize);
              }
            }
            document.body.removeChild(qrDiv);

            // Código debajo del QR
            pdf.setFontSize(7);
            pdf.setFont('helvetica', 'bold');
            const codeText = label.codigo.length > 15 ? label.codigo.substring(0, 15) + '...' : label.codigo;
            pdf.text(codeText, x + config.labelWidth / 2 - config.padding, y + config.qrSize + 6, { align: 'center' });

            // Nombre del producto
            pdf.setFontSize(6);
            pdf.setFont('helvetica', 'normal');
            const nameText = label.nombre.length > 25 ? label.nombre.substring(0, 25) + '...' : label.nombre;
            pdf.text(nameText, x + config.labelWidth / 2 - config.padding, y + config.qrSize + 10, { align: 'center' });

            // Categoría
            pdf.setFontSize(5);
            pdf.setTextColor(128);
            const catText = label.categoria.length > 20 ? label.categoria.substring(0, 20) + '...' : label.categoria;
            pdf.text(catText, x + config.labelWidth / 2 - config.padding, y + config.qrSize + 14, { align: 'center' });
            pdf.setTextColor(0);

            currentLabel++;
          }
        }
      }

      // Descargar PDF
      pdf.save(`etiquetas_qr_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
      console.error('Error generando PDF:', error);
      alert('Error al generar el PDF. Intente nuevamente.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Generar PDF para rollo térmico
  const generateThermalPDF = async () => {
    if (labelsToGenerate.length === 0) return;

    setIsGenerating(true);
    try {
      const config = THERMAL_CONFIG;
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [config.labelWidth + 4, config.labelHeight * labelsToGenerate.length + 4],
      });

      for (let i = 0; i < labelsToGenerate.length; i++) {
        const label = labelsToGenerate[i];
        const y = i * config.labelHeight + 2;

        // Línea separadora
        if (i > 0) {
          pdf.setDrawColor(200);
          pdf.setLineWidth(0.2);
          pdf.setLineDashPattern([1, 1], 0);
          pdf.line(0, y, config.labelWidth + 4, y);
          pdf.setLineDashPattern([], 0);
        }

        // Crear QR temporal
        const qrCanvas = document.createElement('canvas');
        const qrDiv = document.createElement('div');
        qrDiv.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 29 29" width="${config.qrSize * 4}" height="${config.qrSize * 4}">
          ${generateQRPath(label.codigo)}
        </svg>`;
        document.body.appendChild(qrDiv);

        const svgElement = qrDiv.querySelector('svg');
        if (svgElement) {
          const svgData = new XMLSerializer().serializeToString(svgElement);
          const img = new Image();
          img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
          await new Promise(resolve => { img.onload = resolve; });

          // QR a la izquierda
          qrCanvas.width = config.qrSize * 4;
          qrCanvas.height = config.qrSize * 4;
          const ctx = qrCanvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0);
            pdf.addImage(qrCanvas.toDataURL(), 'PNG', 2, y + 2, config.qrSize, config.qrSize);
          }
        }
        document.body.removeChild(qrDiv);

        // Texto a la derecha del QR
        const textX = config.qrSize + 4;

        pdf.setFontSize(7);
        pdf.setFont('helvetica', 'bold');
        pdf.text(label.codigo, textX, y + 8);

        pdf.setFontSize(6);
        pdf.setFont('helvetica', 'normal');
        const nameLines = pdf.splitTextToSize(label.nombre, config.labelWidth - config.qrSize - 6);
        pdf.text(nameLines.slice(0, 2), textX, y + 14);

        pdf.setFontSize(5);
        pdf.setTextColor(128);
        pdf.text(label.categoria, textX, y + 24);
        pdf.setTextColor(0);
      }

      pdf.save(`etiquetas_termico_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
      console.error('Error generando PDF:', error);
      alert('Error al generar el PDF. Intente nuevamente.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Generar path SVG del QR (simplificado)
  const generateQRPath = (data: string): string => {
    // Este es un placeholder - qrcode.react genera el SVG real
    return '';
  };

  // Función principal de generación
  const handleGenerate = async () => {
    if (labelFormat === 'a4') {
      await generateA4PDF();
    } else {
      await generateThermalPDF();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div
        className="w-full max-w-4xl max-h-[90vh] rounded-xl shadow-2xl overflow-hidden flex flex-col"
        style={{ backgroundColor: themeColors.background }}
      >
        {/* Header */}
        <div
          className="px-6 py-4 flex items-center justify-between"
          style={{ background: `linear-gradient(135deg, ${themeColors.primary}, ${themeColors.secondary})` }}
        >
          <div className="flex items-center gap-3">
            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
            </svg>
            <h2 className="text-xl font-bold text-white">Generador de Etiquetas QR</h2>
          </div>
          <button onClick={onClose} className="text-white hover:opacity-80">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Panel izquierdo: Selección de productos */}
            <div className="space-y-4">
              <h3 className="font-semibold" style={{ color: themeColors.text }}>Seleccionar Productos</h3>

              {/* Búsqueda */}
              <input
                type="text"
                placeholder="Buscar por nombre, código o SKU..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border focus:ring-2 transition-all"
                style={{
                  backgroundColor: themeColors.cardBg,
                  borderColor: themeColors.border,
                  color: themeColors.text,
                }}
              />

              {/* Botón seleccionar todos */}
              <button
                onClick={toggleAll}
                className="text-sm px-3 py-1 rounded-lg transition-colors"
                style={{
                  backgroundColor: themeColors.cardBg,
                  color: themeColors.primary,
                  border: `1px solid ${themeColors.primary}`,
                }}
              >
                {selectedProducts.size === filteredProducts.length ? 'Deseleccionar todos' : 'Seleccionar todos'}
              </button>

              {/* Lista de productos */}
              <div
                className="max-h-64 overflow-y-auto rounded-lg border p-2 space-y-1"
                style={{ borderColor: themeColors.border }}
              >
                {filteredProducts.map(producto => (
                  <label
                    key={producto.id}
                    className="flex items-center gap-3 p-2 rounded-lg cursor-pointer hover:opacity-80 transition-opacity"
                    style={{ backgroundColor: selectedProducts.has(producto.id) ? `${themeColors.primary}20` : 'transparent' }}
                  >
                    <input
                      type="checkbox"
                      checked={selectedProducts.has(producto.id)}
                      onChange={() => toggleProduct(producto.id)}
                      className="w-4 h-4 rounded"
                      style={{ accentColor: themeColors.primary }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate" style={{ color: themeColors.text }}>
                        {producto.nombre}
                      </p>
                      <p className="text-xs truncate" style={{ color: themeColors.textMuted }}>
                        {producto.codigo_qr || producto.codigo || producto.sku || `PROD-${producto.id}`}
                        {producto.categoria && ` • ${producto.categoria.nombre}`}
                      </p>
                    </div>
                  </label>
                ))}
                {filteredProducts.length === 0 && (
                  <p className="text-center py-4" style={{ color: themeColors.textMuted }}>
                    No se encontraron productos
                  </p>
                )}
              </div>
            </div>

            {/* Panel derecho: Configuración */}
            <div className="space-y-4">
              <h3 className="font-semibold" style={{ color: themeColors.text }}>Configuración de Etiquetas</h3>

              {/* Formato */}
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: themeColors.textMuted }}>
                  Formato de impresión
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setLabelFormat('a4')}
                    className="p-3 rounded-lg border-2 transition-all text-left"
                    style={{
                      borderColor: labelFormat === 'a4' ? themeColors.primary : themeColors.border,
                      backgroundColor: labelFormat === 'a4' ? `${themeColors.primary}10` : 'transparent',
                    }}
                  >
                    <p className="font-medium" style={{ color: themeColors.text }}>Hoja A4</p>
                    <p className="text-xs" style={{ color: themeColors.textMuted }}>24 etiquetas (4x6)</p>
                  </button>
                  <button
                    onClick={() => setLabelFormat('thermal')}
                    className="p-3 rounded-lg border-2 transition-all text-left"
                    style={{
                      borderColor: labelFormat === 'thermal' ? themeColors.primary : themeColors.border,
                      backgroundColor: labelFormat === 'thermal' ? `${themeColors.primary}10` : 'transparent',
                    }}
                  >
                    <p className="font-medium" style={{ color: themeColors.text }}>Rollo Térmico</p>
                    <p className="text-xs" style={{ color: themeColors.textMuted }}>58mm continuo</p>
                  </button>
                </div>
              </div>

              {/* Copias por producto */}
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: themeColors.textMuted }}>
                  Copias por producto
                </label>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setCopiesPerProduct(Math.max(1, copiesPerProduct - 1))}
                    className="w-10 h-10 rounded-lg flex items-center justify-center border transition-colors hover:opacity-80"
                    style={{ borderColor: themeColors.border, color: themeColors.text }}
                  >
                    -
                  </button>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={copiesPerProduct}
                    onChange={(e) => setCopiesPerProduct(Math.max(1, Math.min(100, parseInt(e.target.value) || 1)))}
                    className="w-20 text-center px-3 py-2 rounded-lg border"
                    style={{
                      backgroundColor: themeColors.cardBg,
                      borderColor: themeColors.border,
                      color: themeColors.text,
                    }}
                  />
                  <button
                    onClick={() => setCopiesPerProduct(Math.min(100, copiesPerProduct + 1))}
                    className="w-10 h-10 rounded-lg flex items-center justify-center border transition-colors hover:opacity-80"
                    style={{ borderColor: themeColors.border, color: themeColors.text }}
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Resumen */}
              <div
                className="p-4 rounded-lg"
                style={{ backgroundColor: themeColors.cardBg }}
              >
                <h4 className="font-medium mb-2" style={{ color: themeColors.text }}>Resumen</h4>
                <div className="space-y-1 text-sm" style={{ color: themeColors.textMuted }}>
                  <p>Productos seleccionados: <span style={{ color: themeColors.primary }}>{selectedProducts.size}</span></p>
                  <p>Copias por producto: <span style={{ color: themeColors.primary }}>{copiesPerProduct}</span></p>
                  <p>Total de etiquetas: <span style={{ color: themeColors.primary }}>{labelsToGenerate.length}</span></p>
                  {labelFormat === 'a4' && (
                    <p>Hojas necesarias: <span style={{ color: themeColors.primary }}>{Math.ceil(labelsToGenerate.length / 24)}</span></p>
                  )}
                </div>
              </div>

              {/* Vista previa de una etiqueta */}
              {selectedProducts.size > 0 && (
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: themeColors.textMuted }}>
                    Vista previa
                  </label>
                  <div
                    className="p-4 rounded-lg border flex items-center gap-4"
                    style={{ borderColor: themeColors.border, backgroundColor: '#ffffff' }}
                  >
                    <QRCodeSVG
                      value={labelsToGenerate[0]?.codigo || 'PREVIEW'}
                      size={60}
                      level="M"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm text-gray-900 truncate">
                        {labelsToGenerate[0]?.codigo}
                      </p>
                      <p className="text-xs text-gray-700 truncate">
                        {labelsToGenerate[0]?.nombre}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {labelsToGenerate[0]?.categoria}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          className="px-6 py-4 flex items-center justify-between border-t"
          style={{ borderColor: themeColors.border }}
        >
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg border transition-colors hover:opacity-80"
            style={{ borderColor: themeColors.border, color: themeColors.text }}
          >
            Cancelar
          </button>
          <button
            onClick={handleGenerate}
            disabled={selectedProducts.size === 0 || isGenerating}
            className="px-6 py-2 rounded-lg font-medium text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            style={{ backgroundColor: themeColors.primary }}
          >
            {isGenerating ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Generando...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Generar PDF
              </>
            )}
          </button>
        </div>

        {/* Área oculta para renderizar QRs */}
        <div ref={printAreaRef} className="hidden" />
      </div>
    </div>
  );
};

export default QRLabelGenerator;
