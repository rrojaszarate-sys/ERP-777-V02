import React, { useState } from 'react';
import {
  TrendingDown,
  Calculator,
  Loader2,
  Bot,
  Zap,
  Camera,
  CheckCircle,
  AlertTriangle
} from 'lucide-react';
import { Button } from '../../../../shared/components/ui/Button';
import { useExpenseCategories } from '../../hooks/useFinances';
import { formatCurrency } from '../../../../shared/utils/formatters';
import { MEXICAN_CONFIG } from '../../../../core/config/constants';
import {
  Expense,
  OCRMetadata,
  SAT_FORMA_PAGO,
  SAT_METODO_PAGO
} from '../../types/Finance';
import {
  parseSmartMexicanTicket,
  validarYCorregirDatosOCR,
  generarDetalleCompra,
  type ExtendedOCRData
} from './smartTicketParser';

interface GoogleVisionExpenseFormProps {
  expense?: Expense | null;
  eventId: string;
  onSave: (data: Partial<Expense>) => void;
  onCancel: () => void;
  className?: string;
}

interface OCRData {
  establecimiento: string | null;
  rfc: string | null;
  telefono: string | null;
  fecha: string | null;
  hora: string | null;
  total: number | null;
  subtotal: number | null;
  iva: number | null;
  forma_pago: string | null;
  productos: Array<{ 
    nombre: string; 
    cantidad: number; 
    precio_unitario: number; 
  }>;
}

export const GoogleVisionExpenseForm: React.FC<GoogleVisionExpenseFormProps> = ({
  expense,
  eventId,
  onSave,
  onCancel,
  className = ''
}) => {
  const [formData, setFormData] = useState({
    concepto: expense?.concepto || '',
    descripcion: expense?.descripcion || '',
    total: expense?.total || 0,
    iva_porcentaje: expense?.iva_porcentaje || MEXICAN_CONFIG.ivaRate,
    proveedor: expense?.proveedor || '',
    rfc_proveedor: expense?.rfc_proveedor || '',
    fecha_gasto: expense?.fecha_gasto || new Date().toISOString().split('T')[0],
    categoria_id: expense?.categoria_id || '',
    forma_pago: expense?.forma_pago || 'transferencia',
    referencia: expense?.referencia || '',
    status_aprobacion: expense?.status_aprobacion || 'aprobado',

    // SAT CFDI 4.0 fields
    uuid_cfdi: expense?.uuid_cfdi || '',
    folio_fiscal: expense?.folio_fiscal || '',
    serie: expense?.serie || '',
    tipo_comprobante: expense?.tipo_comprobante || 'I',
    forma_pago_sat: expense?.forma_pago_sat || '',
    metodo_pago_sat: expense?.metodo_pago_sat || 'PUE',
    lugar_expedicion: expense?.lugar_expedicion || '',
    moneda: expense?.moneda || 'MXN',
    tipo_cambio: expense?.tipo_cambio || null,

    // Detalle de productos (JSONB)
    detalle_productos: expense?.detalle_productos || null,

    // Campos adicionales para tickets
    folio_interno: expense?.folio_interno || '',
    hora_emision: expense?.hora_emision || '',
    telefono_proveedor: expense?.telefono_proveedor || '',
    descuento: expense?.descuento || 0,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isProcessingOCR, setIsProcessingOCR] = useState(false);
  const [ocrResult, setOcrResult] = useState<any>(null);
  const [file, setFile] = useState<File | null>(null);
  const [ocrEngine, setOcrEngine] = useState<'google' | 'tesseract'>('google');
  const [ocrMetadata, setOcrMetadata] = useState<OCRMetadata | null>(null);

  const { data: categories } = useExpenseCategories();

  // Cálculos simplificados - Solo total
  const total = formData.total;
  const iva_factor = 1 + (formData.iva_porcentaje / 100);
  const subtotal = total / iva_factor;
  const iva = total - subtotal;

  // Función para autocompletar formulario con datos SAT
  const autoCompletarFormularioSAT = (datosOCR: ExtendedOCRData) => {
    console.log('🎯 Auto-completando formulario con datos SAT extraídos:', datosOCR);

    // Mapear forma de pago a código SAT
    let formaPagoSAT = '';
    if (datosOCR.forma_pago) {
      const pago = datosOCR.forma_pago.toLowerCase();
      if (pago.includes('efectivo')) formaPagoSAT = SAT_FORMA_PAGO.EFECTIVO;
      else if (pago.includes('transferencia')) formaPagoSAT = SAT_FORMA_PAGO.TRANSFERENCIA;
      else if (pago.includes('tarjeta') || pago.includes('credito')) formaPagoSAT = SAT_FORMA_PAGO.TARJETA_CREDITO;
      else if (pago.includes('debito')) formaPagoSAT = SAT_FORMA_PAGO.TARJETA_DEBITO;
      else formaPagoSAT = SAT_FORMA_PAGO.POR_DEFINIR;
    }

    // Convertir fecha a formato yyyy-mm-dd
    let fechaGasto = new Date().toISOString().split('T')[0];
    if (datosOCR.fecha) {
      try {
        const [dia, mes, año] = datosOCR.fecha.split('/');
        fechaGasto = `${año}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}`;
      } catch {
        console.log('⚠️  No se pudo convertir la fecha:', datosOCR.fecha);
      }
    }

    // Generar detalle_productos JSONB
    let detalleProductos = null;
    if (datosOCR.productos && datosOCR.productos.length > 0) {
      detalleProductos = {
        productos: datosOCR.productos.map((p, index) => ({
          numero: index + 1,
          codigo: p.codigo || '',
          clave_prod_serv: p.clave_prod_serv || '',
          descripcion: p.nombre,
          cantidad: p.cantidad,
          unidad: p.unidad || 'PZA',
          precio_unitario: p.precio_unitario,
          importe: p.subtotal,
          descuento: p.descuento || 0
        })),
        total_productos: datosOCR.productos.length,
        subtotal_productos: datosOCR.productos.reduce((sum, p) => sum + p.subtotal, 0)
      };
    }

    // Generar concepto automático
    const concepto = datosOCR.establecimiento || 'Gasto procesado con OCR';

    // Determinar tipo de comprobante
    let tipoComprobante: 'I' | 'E' | 'T' | 'N' | 'P' = 'I';
    if (datosOCR.metadata_adicional?.tipo_comprobante) {
      const tipo = datosOCR.metadata_adicional.tipo_comprobante.toUpperCase();
      if (['I', 'E', 'T', 'N', 'P'].includes(tipo)) {
        tipoComprobante = tipo as 'I' | 'E' | 'T' | 'N' | 'P';
      }
    }

    setFormData(prev => ({
      ...prev,
      // Campos básicos
      concepto,
      proveedor: datosOCR.establecimiento || prev.proveedor,
      rfc_proveedor: datosOCR.rfc || prev.rfc_proveedor,
      total: datosOCR.total || 0,
      fecha_gasto: fechaGasto,
      forma_pago: datosOCR.forma_pago?.toLowerCase() || 'transferencia',

      // SAT CFDI fields
      uuid_cfdi: datosOCR.metadata_adicional?.uuid_cfdi || '',
      folio_fiscal: datosOCR.metadata_adicional?.folio_fiscal || '',
      serie: datosOCR.metadata_adicional?.serie || '',
      tipo_comprobante: tipoComprobante,
      forma_pago_sat: formaPagoSAT,
      lugar_expedicion: datosOCR.metadata_adicional?.lugar_expedicion || '',

      // Detalle de productos (JSONB)
      detalle_productos: detalleProductos,

      // Campos adicionales
      folio_interno: datosOCR.metadata_adicional?.folio_interno || '',
      hora_emision: datosOCR.metadata_adicional?.hora || '',
      telefono_proveedor: datosOCR.metadata_adicional?.telefono || '',
      descuento: datosOCR.descuento || 0,

      // Descripción con resumen de productos
      descripcion: datosOCR.productos && datosOCR.productos.length > 0
        ? generarDetalleCompra(datosOCR.productos)
        : prev.descripcion
    }));

    // Guardar metadata OCR para auditoría
    setOcrMetadata({
      texto_completo: datosOCR.texto_completo,
      confianza_general: datosOCR.confianza_general,
      motor_usado: datosOCR.motor_usado,
      timestamp: datosOCR.timestamp,
      productos_detectados: datosOCR.productos,
      metadata_adicional: datosOCR.metadata_adicional,
      campos_confianza: datosOCR.campos_confianza,
      errores_detectados: datosOCR.errores_detectados
    });
  };

  // Función para optimizar imagen para OCR
  const optimizeImageForOCR = (canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D): void => {
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    // Convertir a escala de grises y aumentar contraste
    for (let i = 0; i < data.length; i += 4) {
      // Calcular escala de grises
      const gray = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
      
      // Aumentar contraste (threshold adaptativo)
      const enhanced = gray > 128 ? Math.min(255, gray * 1.2) : Math.max(0, gray * 0.8);
      
      data[i] = enhanced;     // Red
      data[i + 1] = enhanced; // Green  
      data[i + 2] = enhanced; // Blue
      // Alpha permanece igual
    }

    ctx.putImageData(imageData, 0, 0);
  };

  // Función para procesar con Google Vision API
  const processGoogleVisionOCR = async (file: File) => {
    setIsProcessingOCR(true);
    
    try {
      console.log('🚀 Procesando imagen con Google Vision API...');
      
      // Convertir archivo a base64
      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64String = (reader.result as string).split(',')[1];
          resolve(base64String);
        };
        reader.readAsDataURL(file);
      });

      // Llamar a Google Vision API
      const response = await fetch('https://vision.googleapis.com/v1/images:annotate?key=YOUR_GOOGLE_API_KEY', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requests: [{
            image: { content: base64 },
            features: [{ type: 'TEXT_DETECTION', maxResults: 1 }]
          }]
        })
      });

      const result = await response.json();
      const text = result.responses[0]?.textAnnotations[0]?.description || '';
      
      console.log('📄 Texto extraído con Google Vision:');
      console.log(text);

      // Usar el parser SAT inteligente
      const datosExtraidos = parseSmartMexicanTicket(text, 95);
      const datosValidados = validarYCorregirDatosOCR(datosExtraidos);

      const ocrResult = {
        success: true,
        confianza_general: 95,
        texto_completo: text,
        datos_extraidos: datosValidados,
        motor_usado: 'google_vision' as const,
        timestamp: new Date().toISOString()
      };

      setOcrResult(ocrResult);
      autoCompletarFormularioSAT(datosValidados);
      
    } catch (error) {
      console.error('❌ Error procesando con Google Vision:', error);
      setOcrResult({
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido',
        engine: 'Google Vision API'
      });
    } finally {
      setIsProcessingOCR(false);
    }
  };

  // Función para procesar con Tesseract.js optimizado
  const processTesseractOCR = async (file: File) => {
    setIsProcessingOCR(true);
    
    try {
      console.log('🚀 Procesando y optimizando imagen con Tesseract.js...');
      
      // Crear canvas para optimizar imagen
      const img = new Image();
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      
      await new Promise((resolve) => {
        img.onload = resolve;
        img.src = URL.createObjectURL(file);
      });

      // Redimensionar si es muy grande (mantener aspect ratio)
      let { width, height } = img;
      const maxSize = 1200;
      if (width > maxSize || height > maxSize) {
        const ratio = Math.min(maxSize / width, maxSize / height);
        width *= ratio;
        height *= ratio;
      }

      canvas.width = width;
      canvas.height = height;
      ctx.drawImage(img, 0, 0, width, height);
      
      // Optimizar imagen
      optimizeImageForOCR(canvas, ctx);

      // Convertir canvas a blob optimizado
      const optimizedBlob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((blob) => resolve(blob!), 'image/png', 1.0);
      });

      // Usar Tesseract.js con configuración optimizada
      const { createWorker } = await import('tesseract.js');
      
      const worker = await createWorker('spa+eng', 1, {
        logger: m => console.log('📊 OCR:', m.status, Math.round(m.progress * 100) + '%')
      });

      // Configurar Tesseract para facturas/tickets
      await worker.setParameters({
        tessedit_pageseg_mode: '6', // PSM 6: uniform block of text
        tessedit_char_whitelist: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyzÁÉÍÓÚáéíóúñÑ$.,:-/% ',
      });

      console.log('📄 Procesando imagen optimizada:', file.name);
      const { data: { text, confidence } } = await worker.recognize(optimizedBlob);
      
      await worker.terminate();
      URL.revokeObjectURL(img.src);
      
      console.log('📄 Texto extraído de tu imagen optimizada:');
      console.log(text);
      console.log('🎯 Confianza mejorada:', Math.round(confidence) + '%');

      // Usar el parser SAT inteligente
      const datosExtraidos = parseSmartMexicanTicket(text, Math.round(confidence));
      const datosValidados = validarYCorregirDatosOCR(datosExtraidos);

      const result = {
        success: true,
        confianza_general: Math.round(confidence),
        texto_completo: text,
        datos_extraidos: datosValidados,
        motor_usado: 'tesseract' as const,
        timestamp: new Date().toISOString()
      };

      setOcrResult(result);
      autoCompletarFormularioSAT(datosValidados);

      console.log('✅ OCR completado con Tesseract:', result);
      
    } catch (error) {
      console.error('❌ Error en Google Vision OCR:', error);
      setOcrResult({
        success: false,
        error: 'Error procesando con Google Vision',
        timestamp: new Date().toISOString()
      });
    } finally {
      setIsProcessingOCR(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      processGoogleVisionOCR(selectedFile);
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.concepto.trim()) {
      newErrors.concepto = 'El concepto es requerido';
    }
    if (formData.total <= 0) {
      newErrors.total = 'El total debe ser mayor a 0';
    }
    if (!formData.fecha_gasto) {
      newErrors.fecha_gasto = 'La fecha del gasto es requerida';
    }
    if (!formData.categoria_id) {
      newErrors.categoria_id = 'Debe seleccionar una categoría';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
      const dataToSave = {
        ...formData,
        // Campos calculados
        subtotal,
        iva,
        total,
        // Campos requeridos para compatibilidad
        cantidad: 1, // Siempre 1 para simplificar
        precio_unitario: formData.total, // Total = precio unitario cuando cantidad es 1
        evento_id: eventId,
        categoria_id: formData.categoria_id || undefined,

        // OCR metadata (si existe)
        ocr_confianza: ocrMetadata?.confianza_general || null,
        ocr_validado: false, // El usuario puede validar manualmente después
        ocr_datos_originales: ocrMetadata || null,

        created_at: expense ? undefined : new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      console.log('💾 Guardando gasto con datos SAT:', dataToSave);
      onSave(dataToSave);
    } catch (error) {
      console.error('Error saving expense:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  return (
    <div className={`bg-red-50 border border-red-200 rounded-lg p-6 ${className}`}>
      <h3 className="text-lg font-medium text-red-900 mb-6 flex items-center">
        <TrendingDown className="w-5 h-5 mr-2" />
        {expense ? 'Editar Gasto' : 'Nuevo Gasto'} 
        <span className="ml-2 text-sm font-normal text-red-700">con Google Vision OCR</span>
      </h3>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* OCR Section - MEJORADO */}
        <div className="bg-gradient-to-r from-green-50 to-blue-50 border-2 border-dashed border-green-300 rounded-lg p-6">
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center space-x-2">
              <Bot className="w-6 h-6 text-green-600" />
              <Zap className="w-4 h-4 text-yellow-500" />
              <h4 className="text-lg font-semibold text-green-800">
                OCR Real con Tesseract.js - Tu Imagen
              </h4>
            </div>
            
            {!ocrResult && (
              <div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                  id="ocr-upload-enhanced"
                  disabled={isProcessingOCR || isSubmitting}
                />
                <Button
                  type="button"
                  onClick={() => document.getElementById('ocr-upload-enhanced')?.click()}
                  disabled={isProcessingOCR || isSubmitting}
                  className="bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 text-white px-8 py-3"
                >
                  {isProcessingOCR ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin mr-2" />
                      Procesando TU imagen real...
                    </>
                  ) : (
                    <>
                      <Camera className="w-5 h-5 mr-2" />
                      📄 Subir TU Factura/Ticket Real
                    </>
                  )}
                </Button>
                <p className="text-sm text-gray-600 mt-2">
                  📄 <strong>OCR Real</strong> • Sube tu factura real y el sistema extraerá los datos de TU imagen
                </p>
              </div>
            )}

            {/* OCR Result */}
            {ocrResult && (
              <div className={`p-4 rounded-lg ${
                ocrResult.success ? 'bg-green-100 border border-green-300' : 'bg-red-100 border border-red-300'
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    {ocrResult.success ? (
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    ) : (
                      <AlertTriangle className="w-5 h-5 text-red-600" />
                    )}
                    <span className="font-semibold">
                      {ocrResult.success ? '✅ Datos extraídos de TU imagen real' : '❌ Error procesando tu imagen'}
                    </span>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setOcrResult(null);
                      setFile(null);
                    }}
                  >
                    Procesar otra factura
                  </Button>
                </div>
                
                {ocrResult.success && (
                  <div className="text-sm space-y-1">
                    <p><strong>🎯 Confianza:</strong> {ocrResult.confianza_general}% (Excelente)</p>
                    {ocrResult.datos_extraidos.establecimiento && (
                      <p><strong>🏪 Establecimiento:</strong> {ocrResult.datos_extraidos.establecimiento}</p>
                    )}
                    {ocrResult.datos_extraidos.total && (
                      <p><strong>💰 Total:</strong> ${ocrResult.datos_extraidos.total}</p>
                    )}
                    {ocrResult.datos_extraidos.productos.length > 0 && (
                      <p><strong>🛒 Productos:</strong> {ocrResult.datos_extraidos.productos.length} detectados</p>
                    )}
                    <p className="text-green-700 font-medium mt-2">
                      ✨ Formulario auto-completado con datos extraídos de TU factura real
                    </p>
                  </div>
                )}

                {ocrResult.error && (
                  <p className="text-red-600 text-sm">{ocrResult.error}</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Basic Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Concepto * {ocrResult?.success && <span className="text-green-600 text-xs">(Auto-completado)</span>}
            </label>
            <input
              type="text"
              value={formData.concepto}
              onChange={(e) => handleInputChange('concepto', e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent ${
                errors.concepto ? 'border-red-500' : 'border-gray-300'
              } ${ocrResult?.success ? 'bg-green-50' : ''}`}
              placeholder="Descripción del gasto"
              disabled={isSubmitting}
            />
            {errors.concepto && (
              <p className="text-red-600 text-sm mt-1">{errors.concepto}</p>
            )}
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Categoría *
            </label>
            <select
              value={formData.categoria_id}
              onChange={(e) => handleInputChange('categoria_id', e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent ${
                errors.categoria_id ? 'border-red-500' : 'border-gray-300'
              }`}
              disabled={isSubmitting}
            >
              <option value="">Seleccionar categoría...</option>
              {categories?.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.nombre}
                </option>
              ))}
            </select>
            {errors.categoria_id && (
              <p className="text-red-600 text-sm mt-1">{errors.categoria_id}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Proveedor {ocrResult?.success && <span className="text-green-600 text-xs">(Auto-completado)</span>}
            </label>
            <input
              type="text"
              value={formData.proveedor}
              onChange={(e) => handleInputChange('proveedor', e.target.value)}
              className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent ${
                ocrResult?.success ? 'bg-green-50' : ''
              }`}
              placeholder="Nombre del proveedor"
              disabled={isSubmitting}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              RFC Proveedor {ocrResult?.success && <span className="text-green-600 text-xs">(Auto-completado)</span>}
            </label>
            <input
              type="text"
              value={formData.rfc_proveedor}
              onChange={(e) => handleInputChange('rfc_proveedor', e.target.value.toUpperCase())}
              className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent ${
                ocrResult?.success ? 'bg-green-50' : ''
              }`}
              placeholder="ABC123456XYZ"
              maxLength={13}
              disabled={isSubmitting}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Total * {ocrResult?.success && <span className="text-green-600 text-xs">(Auto-completado)</span>}
            </label>
            <input
              type="number"
              value={formData.total}
              onChange={(e) => handleInputChange('total', parseFloat(e.target.value) || 0)}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent ${
                errors.total ? 'border-red-500' : 'border-gray-300'
              } ${ocrResult?.success ? 'bg-green-50' : ''}`}
              min="0"
              step="0.01"
              placeholder="0.00"
              disabled={isSubmitting}
            />
            {errors.total && (
              <p className="text-red-600 text-sm mt-1">{errors.total}</p>
            )}
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              IVA (%)
            </label>
            <input
              type="number"
              value={formData.iva_porcentaje}
              onChange={(e) => handleInputChange('iva_porcentaje', parseFloat(e.target.value) || MEXICAN_CONFIG.ivaRate)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              min="0"
              max="100"
              step="0.01"
              disabled={isSubmitting}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Fecha del Gasto * {ocrResult?.success && <span className="text-green-600 text-xs">(Auto-completado)</span>}
            </label>
            <input
              type="date"
              value={formData.fecha_gasto}
              onChange={(e) => handleInputChange('fecha_gasto', e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent ${
                errors.fecha_gasto ? 'border-red-500' : 'border-gray-300'
              } ${ocrResult?.success ? 'bg-green-50' : ''}`}
              disabled={isSubmitting}
            />
            {errors.fecha_gasto && (
              <p className="text-red-600 text-sm mt-1">{errors.fecha_gasto}</p>
            )}
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Forma de Pago {ocrResult?.success && <span className="text-green-600 text-xs">(Auto-completado)</span>}
            </label>
            <select
              value={formData.forma_pago}
              onChange={(e) => handleInputChange('forma_pago', e.target.value)}
              className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent ${
                ocrResult?.success ? 'bg-green-50' : ''
              }`}
              disabled={isSubmitting}
            >
              <option value="efectivo">Efectivo</option>
              <option value="transferencia">Transferencia</option>
              <option value="cheque">Cheque</option>
              <option value="tarjeta">Tarjeta</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Referencia
            </label>
            <input
              type="text"
              value={formData.referencia}
              onChange={(e) => handleInputChange('referencia', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              placeholder="Número de factura, folio, etc."
              disabled={isSubmitting}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Descripción {ocrResult?.success && <span className="text-green-600 text-xs">(Auto-completado con productos)</span>}
          </label>
          <textarea
            value={formData.descripcion}
            onChange={(e) => handleInputChange('descripcion', e.target.value)}
            rows={3}
            className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent ${
              ocrResult?.success ? 'bg-green-50' : ''
            }`}
            placeholder="Detalles adicionales del gasto..."
            disabled={isSubmitting}
          />
        </div>

        {/* Calculation Summary */}
        <div className="bg-white rounded-lg border p-4">
          <h4 className="font-medium text-gray-900 mb-3 flex items-center">
            <Calculator className="w-4 h-4 mr-2" />
            Resumen de Cálculo
          </h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span className="font-medium">{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span>IVA ({formData.iva_porcentaje}%):</span>
              <span className="font-medium">{formatCurrency(iva)}</span>
            </div>
            <div className="flex justify-between font-bold text-lg border-t pt-2">
              <span>Total:</span>
              <span className="text-red-600">{formatCurrency(total)}</span>
            </div>
          </div>
        </div>

        {/* Approval Status */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Estado de Aprobación
          </label>
          <select
            value={formData.status_aprobacion}
            onChange={(e) => handleInputChange('status_aprobacion', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
            disabled={isSubmitting}
          >
            <option value="pendiente">Pendiente</option>
            <option value="aprobado">Aprobado</option>
            <option value="rechazado">Rechazado</option>
          </select>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end space-x-3 pt-4 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isSubmitting || isProcessingOCR}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting || isProcessingOCR}
            className="bg-red-500 hover:bg-red-600"
          >
            {(isSubmitting || isProcessingOCR) && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {expense ? 'Actualizar' : 'Crear'} Gasto
          </Button>
        </div>
      </form>
    </div>
  );
};