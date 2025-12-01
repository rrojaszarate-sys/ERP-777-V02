import React, { useState, useMemo, useCallback } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { jsPDF } from 'jspdf';
import JsBarcode from 'jsbarcode';
import { useTheme } from '../../../shared/components/theme';
import type { Producto } from '../types';

// ============================================================================
// CONFIGURACIÓN DE ETIQUETAS
// ============================================================================

const A4_CONFIG = {
  pageWidth: 210,
  pageHeight: 297,
  columns: 3,
  rows: 5,
  labelWidth: 70,
  labelHeight: 59.4,
  padding: 3,
};

const THERMAL_CONFIG = {
  labelWidth: 58,
  labelHeight: 40,
  padding: 2,
};

type LabelFormat = 'a4' | 'thermal';
type CodeType = 'qr' | 'barcode' | 'both';

interface ProductLabel {
  codigo: string;
  codigoBarras: string;
  nombre: string;
  categoria: string;
  precio?: number;
}

interface LabelGeneratorProps {
  productos: Producto[];
  onClose: () => void;
}

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

export const LabelGenerator: React.FC<LabelGeneratorProps> = ({
  productos,
  onClose,
}) => {
  const { paletteConfig, isDark } = useTheme();
  const [selectedProducts, setSelectedProducts] = useState<Set<number>>(new Set());
  const [labelFormat, setLabelFormat] = useState<LabelFormat>('a4');
  const [codeType, setCodeType] = useState<CodeType>('both');
  const [copiesPerProduct, setCopiesPerProduct] = useState(1);
  const [isGenerating, setIsGenerating] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showPrice, setShowPrice] = useState(false);
  const [barcodeFormat, setBarcodeFormat] = useState<'CODE128' | 'EAN13'>('CODE128');

  const themeColors = useMemo(() => ({
    primary: paletteConfig.primary,
    secondary: paletteConfig.secondary,
    background: isDark ? '#1f2937' : '#ffffff',
    cardBg: isDark ? '#374151' : '#f9fafb',
    border: isDark ? '#4b5563' : '#e5e7eb',
    text: isDark ? '#f3f4f6' : '#111827',
    textMuted: isDark ? '#9ca3af' : '#6b7280',
  }), [paletteConfig, isDark]);

  // Filtrar productos
  const filteredProducts = useMemo(() => {
    if (!searchTerm) return productos;
    const term = searchTerm.toLowerCase();
    return productos.filter(p =>
      p.nombre.toLowerCase().includes(term) ||
      p.clave?.toLowerCase().includes(term) ||
      p.codigo_qr?.toLowerCase().includes(term)
    );
  }, [productos, searchTerm]);

  // Generar lista de etiquetas
  const labelsToGenerate = useMemo((): ProductLabel[] => {
    const labels: ProductLabel[] = [];
    selectedProducts.forEach(productId => {
      const producto = productos.find(p => p.id === productId);
      if (producto) {
        for (let i = 0; i < copiesPerProduct; i++) {
          const codigo = producto.codigo_qr || producto.clave || `PROD-${producto.id}`;
          labels.push({
            codigo,
            codigoBarras: producto.clave || codigo,
            nombre: producto.nombre,
            categoria: typeof producto.categoria === 'string' 
              ? producto.categoria 
              : producto.categoria?.nombre || 'Sin categoría',
            precio: producto.precio_venta || producto.precio_base,
          });
        }
      }
    });
    return labels;
  }, [selectedProducts, productos, copiesPerProduct]);

  // Toggle producto
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

  // Seleccionar todos
  const toggleAll = useCallback(() => {
    if (selectedProducts.size === filteredProducts.length) {
      setSelectedProducts(new Set());
    } else {
      setSelectedProducts(new Set(filteredProducts.map(p => p.id)));
    }
  }, [filteredProducts, selectedProducts.size]);

  // Generar código de barras como imagen
  const generateBarcodeImage = async (value: string, width: number, height: number): Promise<string> => {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      try {
        JsBarcode(canvas, value, {
          format: barcodeFormat,
          width: 2,
          height: height,
          displayValue: true,
          fontSize: 10,
          margin: 2,
          background: '#ffffff',
          lineColor: '#000000',
        });
        resolve(canvas.toDataURL('image/png'));
      } catch (error) {
        // Si falla, usar CODE128 como fallback
        try {
          JsBarcode(canvas, value, {
            format: 'CODE128',
            width: 2,
            height: height,
            displayValue: true,
            fontSize: 10,
            margin: 2,
          });
          resolve(canvas.toDataURL('image/png'));
        } catch (err) {
          reject(err);
        }
      }
    });
  };

  // Generar QR como imagen
  const generateQRImage = async (value: string, size: number): Promise<string> => {
    return new Promise((resolve) => {
      const container = document.createElement('div');
      container.style.position = 'absolute';
      container.style.left = '-9999px';
      document.body.appendChild(container);

      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('width', String(size * 4));
      svg.setAttribute('height', String(size * 4));
      container.appendChild(svg);

      // Crear QR usando la librería
      import('qrcode.react').then(({ QRCodeSVG }) => {
        const tempDiv = document.createElement('div');
        document.body.appendChild(tempDiv);
        
        // Usar el enfoque de canvas para obtener la imagen
        const canvas = document.createElement('canvas');
        canvas.width = size * 4;
        canvas.height = size * 4;
        
        // Crear un QR simple manualmente
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          
          // Usar qrcode para generar el QR
          import('qrcode.react').then(async () => {
            // Simplificamos usando el enfoque directo
            const QRCode = await import('qrcode');
            QRCode.toCanvas(canvas, value, { width: size * 4 }, (error) => {
              if (error) {
                console.error(error);
              }
              resolve(canvas.toDataURL('image/png'));
              document.body.removeChild(container);
              document.body.removeChild(tempDiv);
            });
          });
        }
      });
    });
  };

  // Generar PDF A4 con ambos códigos
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
            const labelW = config.labelWidth - config.padding * 2;
            const labelH = config.labelHeight - config.padding * 2;

            // Borde de etiqueta
            pdf.setDrawColor(200);
            pdf.setLineWidth(0.1);
            pdf.rect(col * config.labelWidth, row * config.labelHeight, config.labelWidth, config.labelHeight);

            let codeY = y + 2;

            // QR Code (si aplica)
            if (codeType === 'qr' || codeType === 'both') {
              try {
                const qrSize = codeType === 'both' ? 20 : 30;
                const canvas = document.createElement('canvas');
                const QRCode = await import('qrcode');
                await QRCode.toCanvas(canvas, label.codigo, { width: qrSize * 4, margin: 1 });
                const qrDataUrl = canvas.toDataURL('image/png');
                
                if (codeType === 'both') {
                  pdf.addImage(qrDataUrl, 'PNG', x + 2, codeY, qrSize, qrSize);
                } else {
                  pdf.addImage(qrDataUrl, 'PNG', x + (labelW - qrSize) / 2, codeY, qrSize, qrSize);
                }
                codeY += qrSize + 2;
              } catch (e) {
                console.error('Error generando QR:', e);
              }
            }

            // Código de barras (si aplica)
            if (codeType === 'barcode' || codeType === 'both') {
              try {
                const barcodeDataUrl = await generateBarcodeImage(label.codigoBarras, 50, 20);
                if (codeType === 'both') {
                  pdf.addImage(barcodeDataUrl, 'PNG', x + 24, y + 4, 40, 18);
                } else {
                  pdf.addImage(barcodeDataUrl, 'PNG', x + (labelW - 50) / 2, codeY, 50, 22);
                  codeY += 24;
                }
              } catch (e) {
                console.error('Error generando código de barras:', e);
              }
            }

            // Código de texto
            const textStartY = codeType === 'both' ? y + 26 : codeY + 2;
            pdf.setFontSize(7);
            pdf.setFont('helvetica', 'bold');
            pdf.setTextColor(0);
            const codeText = label.codigo.length > 18 ? label.codigo.substring(0, 18) + '...' : label.codigo;
            pdf.text(codeText, x + labelW / 2, textStartY, { align: 'center' });

            // Nombre del producto
            pdf.setFontSize(6);
            pdf.setFont('helvetica', 'normal');
            const nameLines = pdf.splitTextToSize(label.nombre, labelW - 4);
            pdf.text(nameLines.slice(0, 2), x + labelW / 2, textStartY + 4, { align: 'center' });

            // Categoría
            pdf.setFontSize(5);
            pdf.setTextColor(100);
            const catText = label.categoria.length > 20 ? label.categoria.substring(0, 20) + '...' : label.categoria;
            pdf.text(catText, x + labelW / 2, textStartY + 10, { align: 'center' });

            // Precio (opcional)
            if (showPrice && label.precio) {
              pdf.setFontSize(8);
              pdf.setFont('helvetica', 'bold');
              pdf.setTextColor(0);
              pdf.text(`$${label.precio.toFixed(2)}`, x + labelW / 2, textStartY + 15, { align: 'center' });
            }

            pdf.setTextColor(0);
            currentLabel++;
          }
        }
      }

      const dateStr = new Date().toISOString().split('T')[0];
      pdf.save(`etiquetas_${codeType}_${dateStr}.pdf`);
    } catch (error) {
      console.error('Error generando PDF:', error);
      alert('Error al generar el PDF. Intente nuevamente.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Generar PDF térmico
  const generateThermalPDF = async () => {
    if (labelsToGenerate.length === 0) return;

    setIsGenerating(true);
    try {
      const config = THERMAL_CONFIG;
      const totalHeight = config.labelHeight * labelsToGenerate.length + 4;
      
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [config.labelWidth + 4, totalHeight],
      });

      for (let i = 0; i < labelsToGenerate.length; i++) {
        const label = labelsToGenerate[i];
        const y = i * config.labelHeight + 2;
        const x = 2;
        const labelW = config.labelWidth;

        // Línea separadora
        if (i > 0) {
          pdf.setDrawColor(180);
          pdf.setLineWidth(0.2);
          pdf.setLineDashPattern([1, 1], 0);
          pdf.line(0, y, config.labelWidth + 4, y);
          pdf.setLineDashPattern([], 0);
        }

        let codeY = y + 2;

        // QR + Código de barras lado a lado para térmico
        if (codeType === 'qr' || codeType === 'both') {
          try {
            const qrSize = 18;
            const canvas = document.createElement('canvas');
            const QRCode = await import('qrcode');
            await QRCode.toCanvas(canvas, label.codigo, { width: qrSize * 4, margin: 1 });
            const qrDataUrl = canvas.toDataURL('image/png');
            pdf.addImage(qrDataUrl, 'PNG', x, codeY, qrSize, qrSize);
          } catch (e) {
            console.error('Error generando QR:', e);
          }
        }

        if (codeType === 'barcode' || codeType === 'both') {
          try {
            const barcodeDataUrl = await generateBarcodeImage(label.codigoBarras, 32, 15);
            const barcodeX = codeType === 'both' ? x + 20 : x + 5;
            pdf.addImage(barcodeDataUrl, 'PNG', barcodeX, codeY, 34, 16);
          } catch (e) {
            console.error('Error generando código de barras:', e);
          }
        }

        // Texto debajo
        const textY = y + 22;
        pdf.setFontSize(7);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(0);
        pdf.text(label.codigo, x, textY);

        pdf.setFontSize(6);
        pdf.setFont('helvetica', 'normal');
        const nameText = label.nombre.length > 30 ? label.nombre.substring(0, 30) + '...' : label.nombre;
        pdf.text(nameText, x, textY + 4);

        if (showPrice && label.precio) {
          pdf.setFontSize(8);
          pdf.setFont('helvetica', 'bold');
          pdf.text(`$${label.precio.toFixed(2)}`, labelW - 2, textY, { align: 'right' });
        }
      }

      const dateStr = new Date().toISOString().split('T')[0];
      pdf.save(`etiquetas_termico_${codeType}_${dateStr}.pdf`);
    } catch (error) {
      console.error('Error generando PDF:', error);
      alert('Error al generar el PDF. Intente nuevamente.');
    } finally {
      setIsGenerating(false);
    }
  };

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
        className="w-full max-w-5xl max-h-[90vh] rounded-xl shadow-2xl overflow-hidden flex flex-col"
        style={{ backgroundColor: themeColors.background }}
      >
        {/* Header */}
        <div
          className="px-6 py-4 flex items-center justify-between"
          style={{ background: `linear-gradient(135deg, ${themeColors.primary}, ${themeColors.secondary})` }}
        >
          <div className="flex items-center gap-3">
            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            <h2 className="text-xl font-bold text-white">Generador de Etiquetas</h2>
          </div>
          <button onClick={onClose} className="text-white hover:opacity-80">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Panel izquierdo: Lista de productos */}
            <div className="lg:col-span-2 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold" style={{ color: themeColors.text }}>Seleccionar Productos</h3>
                <span className="text-sm" style={{ color: themeColors.textMuted }}>
                  {selectedProducts.size} seleccionados
                </span>
              </div>

              {/* Búsqueda y acciones */}
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Buscar por nombre o código..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-lg border focus:ring-2 transition-all"
                  style={{
                    backgroundColor: themeColors.cardBg,
                    borderColor: themeColors.border,
                    color: themeColors.text,
                  }}
                />
                <button
                  onClick={toggleAll}
                  className="px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                  style={{
                    backgroundColor: themeColors.cardBg,
                    color: themeColors.primary,
                    border: `1px solid ${themeColors.primary}`,
                  }}
                >
                  {selectedProducts.size === filteredProducts.length ? 'Ninguno' : 'Todos'}
                </button>
              </div>

              {/* Lista de productos */}
              <div
                className="h-72 overflow-y-auto rounded-lg border p-2 grid grid-cols-1 md:grid-cols-2 gap-2"
                style={{ borderColor: themeColors.border }}
              >
                {filteredProducts.map(producto => (
                  <label
                    key={producto.id}
                    className="flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all hover:shadow-sm"
                    style={{ 
                      backgroundColor: selectedProducts.has(producto.id) ? `${themeColors.primary}15` : themeColors.cardBg,
                      border: `1px solid ${selectedProducts.has(producto.id) ? themeColors.primary : 'transparent'}`,
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={selectedProducts.has(producto.id)}
                      onChange={() => toggleProduct(producto.id)}
                      className="w-4 h-4 rounded"
                      style={{ accentColor: themeColors.primary }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate" style={{ color: themeColors.text }}>
                        {producto.nombre}
                      </p>
                      <p className="text-xs truncate" style={{ color: themeColors.textMuted }}>
                        {producto.clave || producto.codigo_qr || `ID: ${producto.id}`}
                      </p>
                    </div>
                  </label>
                ))}
                {filteredProducts.length === 0 && (
                  <p className="col-span-2 text-center py-8" style={{ color: themeColors.textMuted }}>
                    No se encontraron productos
                  </p>
                )}
              </div>
            </div>

            {/* Panel derecho: Configuración */}
            <div className="space-y-4">
              <h3 className="font-semibold" style={{ color: themeColors.text }}>Configuración</h3>

              {/* Tipo de código */}
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: themeColors.textMuted }}>
                  Tipo de código
                </label>
                <div className="space-y-2">
                  {(['both', 'qr', 'barcode'] as CodeType[]).map(type => (
                    <button
                      key={type}
                      onClick={() => setCodeType(type)}
                      className="w-full p-3 rounded-lg text-left transition-all flex items-center gap-3"
                      style={{
                        backgroundColor: codeType === type ? `${themeColors.primary}15` : themeColors.cardBg,
                        border: `2px solid ${codeType === type ? themeColors.primary : themeColors.border}`,
                      }}
                    >
                      {type === 'qr' && (
                        <svg className="w-5 h-5" style={{ color: codeType === type ? themeColors.primary : themeColors.textMuted }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                        </svg>
                      )}
                      {type === 'barcode' && (
                        <svg className="w-5 h-5" style={{ color: codeType === type ? themeColors.primary : themeColors.textMuted }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h2v12H4zM8 6h1v12H8zM11 6h3v12h-3zM16 6h2v12h-2zM20 6h1v12h-1z" />
                        </svg>
                      )}
                      {type === 'both' && (
                        <svg className="w-5 h-5" style={{ color: codeType === type ? themeColors.primary : themeColors.textMuted }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v14a1 1 0 01-1 1H5a1 1 0 01-1-1V5z" />
                        </svg>
                      )}
                      <div>
                        <p className="font-medium text-sm" style={{ color: themeColors.text }}>
                          {type === 'qr' ? 'Solo QR' : type === 'barcode' ? 'Solo Código de Barras' : 'QR + Código de Barras'}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Formato de barcode (solo si incluye barcode) */}
              {(codeType === 'barcode' || codeType === 'both') && (
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: themeColors.textMuted }}>
                    Formato de código de barras
                  </label>
                  <select
                    value={barcodeFormat}
                    onChange={(e) => setBarcodeFormat(e.target.value as 'CODE128' | 'EAN13')}
                    className="w-full px-3 py-2 rounded-lg border"
                    style={{
                      backgroundColor: themeColors.cardBg,
                      borderColor: themeColors.border,
                      color: themeColors.text,
                    }}
                  >
                    <option value="CODE128">CODE 128 (Universal)</option>
                    <option value="EAN13">EAN-13 (Retail)</option>
                  </select>
                </div>
              )}

              {/* Formato de etiqueta */}
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: themeColors.textMuted }}>
                  Formato de impresión
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setLabelFormat('a4')}
                    className="p-3 rounded-lg text-left transition-all"
                    style={{
                      backgroundColor: labelFormat === 'a4' ? `${themeColors.primary}15` : themeColors.cardBg,
                      border: `2px solid ${labelFormat === 'a4' ? themeColors.primary : themeColors.border}`,
                    }}
                  >
                    <p className="font-medium text-sm" style={{ color: themeColors.text }}>A4</p>
                    <p className="text-xs" style={{ color: themeColors.textMuted }}>15 etiquetas</p>
                  </button>
                  <button
                    onClick={() => setLabelFormat('thermal')}
                    className="p-3 rounded-lg text-left transition-all"
                    style={{
                      backgroundColor: labelFormat === 'thermal' ? `${themeColors.primary}15` : themeColors.cardBg,
                      border: `2px solid ${labelFormat === 'thermal' ? themeColors.primary : themeColors.border}`,
                    }}
                  >
                    <p className="font-medium text-sm" style={{ color: themeColors.text }}>Térmico</p>
                    <p className="text-xs" style={{ color: themeColors.textMuted }}>58mm rollo</p>
                  </button>
                </div>
              </div>

              {/* Copias */}
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: themeColors.textMuted }}>
                  Copias por producto
                </label>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCopiesPerProduct(Math.max(1, copiesPerProduct - 1))}
                    className="w-10 h-10 rounded-lg flex items-center justify-center border"
                    style={{ borderColor: themeColors.border, color: themeColors.text }}
                  >
                    -
                  </button>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={copiesPerProduct}
                    onChange={(e) => setCopiesPerProduct(Math.max(1, parseInt(e.target.value) || 1))}
                    className="flex-1 text-center px-3 py-2 rounded-lg border"
                    style={{
                      backgroundColor: themeColors.cardBg,
                      borderColor: themeColors.border,
                      color: themeColors.text,
                    }}
                  />
                  <button
                    onClick={() => setCopiesPerProduct(copiesPerProduct + 1)}
                    className="w-10 h-10 rounded-lg flex items-center justify-center border"
                    style={{ borderColor: themeColors.border, color: themeColors.text }}
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Mostrar precio */}
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showPrice}
                  onChange={(e) => setShowPrice(e.target.checked)}
                  className="w-4 h-4 rounded"
                  style={{ accentColor: themeColors.primary }}
                />
                <span className="text-sm" style={{ color: themeColors.text }}>
                  Mostrar precio en etiqueta
                </span>
              </label>

              {/* Resumen */}
              <div className="p-4 rounded-lg" style={{ backgroundColor: themeColors.cardBg }}>
                <p className="text-sm font-medium mb-2" style={{ color: themeColors.text }}>Resumen</p>
                <div className="space-y-1 text-sm" style={{ color: themeColors.textMuted }}>
                  <p>Total etiquetas: <span style={{ color: themeColors.primary, fontWeight: 600 }}>{labelsToGenerate.length}</span></p>
                  {labelFormat === 'a4' && (
                    <p>Hojas A4: <span style={{ color: themeColors.primary, fontWeight: 600 }}>{Math.ceil(labelsToGenerate.length / 15)}</span></p>
                  )}
                </div>
              </div>
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
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
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
      </div>
    </div>
  );
};

export default LabelGenerator;
