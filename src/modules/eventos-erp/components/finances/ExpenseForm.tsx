import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { TrendingDown, FileText, Calculator, Loader2, AlertTriangle, Bot, Zap, Upload, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '../../../../shared/components/ui/Button';
import { FileUpload } from '../../../../shared/components/ui/FileUpload';
import { useFileUpload } from '../../hooks/useFileUpload';
import { useExpenseCategories } from '../../hooks/useFinances';
import { useAccountsGasto } from '../../hooks/useAccounts';
import { useUsers } from '../../hooks/useUsers';
import { formatCurrency } from '../../../../shared/utils/formatters';
import { MEXICAN_CONFIG } from '../../../../core/config/constants';
import { Expense } from '../../types/Finance';
import { useOCRIntegration } from '../../../ocr/hooks/useOCRIntegration';
import toast from 'react-hot-toast';

// IVA rate from env o default
const IVA_RATE = (parseFloat(import.meta.env.VITE_IVA_RATE) || MEXICAN_CONFIG.ivaRate) / 100;
const IVA_PORCENTAJE = IVA_RATE * 100;

interface ExpenseFormProps {
  expense?: Expense | null;
  eventId: string;
  onSave: (data: Partial<Expense>) => void;
  onCancel: () => void;
  className?: string;
}

export const ExpenseForm: React.FC<ExpenseFormProps> = ({
  expense,
  eventId,
  onSave,
  onCancel,
  className = ''
}) => {
  const [formData, setFormData] = useState({
    concepto: expense?.concepto || '',
    descripcion: expense?.descripcion || '',
    cantidad: expense?.cantidad || 1,
    // Campos fiscales separados (sin auto-cálculo)
    subtotal: expense?.subtotal || 0,
    iva: expense?.iva || 0,
    total: expense?.total || 0,
    retenciones: 0, // Campo de retenciones
    iva_porcentaje: expense?.iva_porcentaje || MEXICAN_CONFIG.ivaRate,
    proveedor: expense?.proveedor || '',
    rfc_proveedor: expense?.rfc_proveedor || '',
    fecha_gasto: expense?.fecha_gasto || new Date().toISOString().split('T')[0],
    categoria_id: expense?.categoria_id || '',
    forma_pago: expense?.forma_pago || 'transferencia',
    referencia: expense?.referencia || '',
    status_aprobacion: expense?.status_aprobacion || 'aprobado',
    archivo_adjunto: expense?.archivo_adjunto || '',
    archivo_nombre: expense?.archivo_nombre || '',
    archivo_tamaño: expense?.archivo_tamaño || 0,
    archivo_tipo: expense?.archivo_tipo || '',
    // Campos para control de pagos y cuentas (SIEMPRE PAGADO por defecto)
    cuenta_id: (expense as any)?.cuenta_id || '',
    comprobante_pago_url: (expense as any)?.comprobante_pago_url || '',
    comprobante_pago_nombre: (expense as any)?.comprobante_pago_nombre || '',
    fecha_pago: (expense as any)?.fecha_pago || new Date().toISOString().split('T')[0],
    responsable_pago_id: (expense as any)?.responsable_pago_id || '',
    pagado: true, // SIEMPRE pagado
    comprobado: true // SIEMPRE comprobado
  });

  // Estado de error de cuadre fiscal
  const [errorCuadre, setErrorCuadre] = useState<string | null>(null);

  // ========== VALIDACIÓN DE CUADRE FISCAL ==========
  // Total = Subtotal + IVA - Retenciones
  useEffect(() => {
    const calculado = Math.round((formData.subtotal + formData.iva - formData.retenciones) * 100) / 100;
    const diferencia = Math.abs(calculado - formData.total);

    if (formData.total > 0 && diferencia > 0.01) {
      setErrorCuadre(`No cuadra: Subtotal + IVA - Retenciones = ${calculado.toFixed(2)}, pero Total es ${formData.total.toFixed(2)}`);
    } else {
      setErrorCuadre(null);
    }
  }, [formData.subtotal, formData.iva, formData.total, formData.retenciones]);

  // Función para calcular IVA desde subtotal (botón opcional)
  const calcularIvaDesdeSubtotal = useCallback(() => {
    if (formData.subtotal > 0) {
      const nuevoIva = Math.round(formData.subtotal * IVA_RATE * 100) / 100;
      const nuevoTotal = Math.round((formData.subtotal + nuevoIva - formData.retenciones) * 100) / 100;
      setFormData(prev => ({ ...prev, iva: nuevoIva, total: nuevoTotal }));
      toast.success(`IVA calculado: $${nuevoIva.toFixed(2)} (${IVA_PORCENTAJE}%)`);
    } else {
      toast.error('Ingrese primero el subtotal');
    }
  }, [formData.subtotal, formData.retenciones]);

  // Función para calcular total desde componentes
  const calcularTotalDesdeComponentes = useCallback(() => {
    const nuevoTotal = Math.round((formData.subtotal + formData.iva - formData.retenciones) * 100) / 100;
    setFormData(prev => ({ ...prev, total: nuevoTotal }));
    toast.success(`Total calculado: $${nuevoTotal.toFixed(2)}`);
  }, [formData.subtotal, formData.iva, formData.retenciones]);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showOCRUpload, setShowOCRUpload] = useState(false);
  const { uploadFile, isUploading } = useFileUpload();
  const { data: categories } = useExpenseCategories();
  const { processOCRFile, isProcessing, error: ocrError } = useOCRIntegration(eventId);

  // Calcular totales multiplicados por cantidad (para resumen)
  const totalConCantidad = formData.total * formData.cantidad;
  const subtotalConCantidad = formData.subtotal * formData.cantidad;
  const ivaConCantidad = formData.iva * formData.cantidad;
  const precio_unitario = formData.total; // Para compatibilidad con el backend

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.concepto.trim()) {
      newErrors.concepto = 'El concepto es requerido';
    }

    if (formData.total <= 0) {
      newErrors.total = 'El total debe ser mayor a 0';
    }

    if (formData.cantidad <= 0) {
      newErrors.cantidad = 'La cantidad debe ser mayor a 0';
    }

    if (!formData.fecha_gasto) {
      newErrors.fecha_gasto = 'La fecha del gasto es requerida';
    }

    if (!formData.categoria_id) {
      newErrors.categoria_id = 'Debe seleccionar una categoría';
    }

    // Validate RFC if provided
    if (formData.rfc_proveedor && !validateRFC(formData.rfc_proveedor)) {
      newErrors.rfc_proveedor = 'Formato de RFC inválido';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateRFC = (rfc: string): boolean => {
    const rfcClean = rfc.toUpperCase().trim();
    const rfcMoral = /^[A-Z&Ñ]{3}[0-9]{6}[A-Z0-9]{3}$/;
    const rfcFisica = /^[A-Z&Ñ]{4}[0-9]{6}[A-Z0-9]{3}$/;
    return rfcMoral.test(rfcClean) || rfcFisica.test(rfcClean);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    // ========== VALIDACIÓN DE CUADRE FISCAL ==========
    const totalCalculado = Math.round((formData.subtotal + formData.iva - formData.retenciones) * 100) / 100;
    const diferencia = Math.abs(totalCalculado - formData.total);

    if (diferencia > 0.01) {
      toast.error(`❌ Los montos no cuadran. Diferencia: $${diferencia.toFixed(2)}`);
      return; // No permitir guardar
    }

    setIsSubmitting(true);

    try {
      const dataToSave = {
        ...formData,
        precio_unitario, // Para compatibilidad
        subtotal: formData.subtotal,
        iva: formData.iva,
        total: formData.total,
        evento_id: eventId,
        categoria_id: formData.categoria_id || undefined,
        created_at: expense ? undefined : new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

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

  const handleFileUploaded = (result: any) => {
    setFormData(prev => ({
      ...prev,
      archivo_adjunto: result.url,
      archivo_nombre: result.fileName,
      archivo_tamaño: result.fileSize,
      archivo_tipo: result.mimeType
    }));
  };

  const handleFileRemoved = () => {
    setFormData(prev => ({
      ...prev,
      archivo_adjunto: '',
      archivo_nombre: '',
      archivo_tamaño: 0,
      archivo_tipo: ''
    }));
  };

  const handleOCRFile = async (file: File) => {
    try {
      console.log('🔍 Procesando archivo OCR para prellenar formulario:', file.name);
      console.log(`📄 Tipo: ${file.type} → ${file.type === 'application/pdf' ? 'FACTURA' : 'TICKET'}`);

      const result = await processOCRFile(file);

      // Ahora aceptamos tanto tickets (imágenes) como facturas (PDFs)
      // Ambos son gastos válidos

      // Prellenar formulario con datos OCR
      const ocrData = result.formData;
      const warnings = result.formData._warnings || [];

      setFormData(prev => ({
        ...prev,
        concepto: ocrData.concepto || prev.concepto,
        descripcion: ocrData.descripcion || prev.descripcion,
        // Usar campos fiscales separados
        subtotal: ocrData.subtotal > 0 ? ocrData.subtotal : prev.subtotal,
        iva: ocrData.iva > 0 ? ocrData.iva : prev.iva,
        total: ocrData.total_con_iva > 0 ? ocrData.total_con_iva : prev.total,
        proveedor: ocrData.proveedor || prev.proveedor,
        fecha_gasto: ocrData.fecha_gasto || prev.fecha_gasto,
        forma_pago: ocrData.forma_pago || prev.forma_pago,
        categoria_id: ocrData.categoria_id || prev.categoria_id,
        rfc_proveedor: ocrData.rfc_proveedor || prev.rfc_proveedor,
        // Agregar notas sobre confianza OCR
        referencia: `OCR (${result.confidence}% confianza)${result.needsValidation ? ' - REVISAR' : ''}`
      }));

      // Subir archivo también
      if (file) {
        try {
          const uploadResult = await uploadFile({ file, type: 'expense', eventId });
          if (uploadResult) {
            handleFileUploaded(uploadResult);
          }
        } catch (uploadError) {
          console.warn('⚠️ Error subiendo archivo, pero continuamos con OCR:', uploadError);
          // No lanzamos error, solo advertimos
        }
      }

      // Construir mensaje de alerta con warnings
      let mensaje = `✅ Documento procesado con OCR!\n📊 Confianza: ${result.confidence}%\n\n`;

      if (warnings.length > 0) {
        mensaje += '⚠️ ADVERTENCIAS:\n';
        warnings.forEach((w: string) => {
          mensaje += `• ${w}\n`;
        });
        mensaje += '\n⚠️ Revise y complete los campos faltantes antes de guardar.';
      } else if (result.needsValidation) {
        mensaje += '⚠️ Revise los datos extraídos antes de guardar.';
      } else {
        mensaje += '✅ Alta confianza, datos listos para usar.';
      }

      alert(mensaje);

    } catch (error) {
      console.error('❌ Error procesando OCR:', error);
      alert('❌ Error al procesar el documento con OCR. Intente de nuevo o llene el formulario manualmente.');
    }
  };

  return (
    <div className={`bg-red-50 border border-red-200 rounded-lg p-6 ${className}`}>
      <h3 className="text-lg font-medium text-red-900 mb-6 flex items-center">
        <TrendingDown className="w-5 h-5 mr-2" />
        {expense ? 'Editar Gasto' : 'Nuevo Gasto'}
      </h3>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* File Upload Section */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Comprobante {formData.archivo_adjunto ? '' : '(Opcional)'}
          </label>
          <FileUpload
            type="expense"
            onFileUploaded={handleFileUploaded}
            onFileRemoved={handleFileRemoved}
            currentFile={formData.archivo_adjunto ? {
              url: formData.archivo_adjunto,
              name: formData.archivo_nombre,
              size: formData.archivo_tamaño
            } : undefined}
            required={false}
            disabled={isUploading || isSubmitting}
            eventId={eventId}
          />
          <p className="text-xs text-gray-500">
            Sube el comprobante de gasto (factura, ticket, recibo). Formatos aceptados: PDF, JPG, PNG.
          </p>
          
          {/* OCR Button */}
          <div className="flex items-center gap-2 pt-2">
            <div className="flex-1 border-t border-gray-200"></div>
            <span className="text-xs text-gray-500">o</span>
            <div className="flex-1 border-t border-gray-200"></div>
          </div>
          
          <div className="relative">
            <input
              type="file"
              id="ocr-upload"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  handleOCRFile(file);
                  e.target.value = ''; // Reset input
                }
              }}
              className="hidden"
              disabled={isProcessing || isSubmitting}
            />
            <Button
              type="button"
              onClick={() => document.getElementById('ocr-upload')?.click()}
              disabled={isProcessing || isSubmitting}
              variant="outline"
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200 hover:border-blue-300 text-blue-700 hover:text-blue-800"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Procesando OCR...
                </>
              ) : (
                <>
                  <Bot className="w-4 h-4" />
                  <Zap className="w-3 h-3" />
                  Extraer datos automáticamente (OCR)
                </>
              )}
            </Button>
            <p className="text-xs text-blue-600 mt-1 text-center">
              Sube una foto del ticket y el sistema llenará automáticamente los campos
            </p>
            
            {ocrError && (
              <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-600">
                {ocrError}
              </div>
            )}
          </div>
        </div>

        {/* Basic Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Concepto *
            </label>
            <input
              type="text"
              value={formData.concepto}
              onChange={(e) => handleInputChange('concepto', e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent ${
                errors.concepto ? 'border-red-500' : 'border-gray-300'
              }`}
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
              {categories?.map(categoria => (
                <option key={categoria.id} value={categoria.id}>
                  {categoria.nombre}
                </option>
              ))}
            </select>
            {errors.categoria_id && (
              <p className="text-red-600 text-sm mt-1">{errors.categoria_id}</p>
            )}
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Proveedor
            </label>
            <input
              type="text"
              value={formData.proveedor}
              onChange={(e) => handleInputChange('proveedor', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              placeholder="Nombre del proveedor"
              disabled={isSubmitting}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              RFC Proveedor
            </label>
            <input
              type="text"
              value={formData.rfc_proveedor}
              onChange={(e) => handleInputChange('rfc_proveedor', e.target.value.toUpperCase())}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent ${
                errors.rfc_proveedor ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="ABC123456XYZ"
              maxLength={13}
              disabled={isSubmitting}
            />
            {errors.rfc_proveedor && (
              <p className="text-red-600 text-sm mt-1">{errors.rfc_proveedor}</p>
            )}
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Cantidad *
            </label>
            <input
              type="number"
              value={formData.cantidad}
              onChange={(e) => handleInputChange('cantidad', parseFloat(e.target.value) || 1)}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent ${
                errors.cantidad ? 'border-red-500' : 'border-gray-300'
              }`}
              min="0.001"
              step="0.001"
              disabled={isSubmitting}
            />
            {errors.cantidad && (
              <p className="text-red-600 text-sm mt-1">{errors.cantidad}</p>
            )}
          </div>
          
        </div>

        {/* ========== SECCIÓN DE MONTOS FISCALES ========== */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <h4 className="font-medium text-gray-900 mb-3 flex items-center">
            <Calculator className="w-4 h-4 mr-2" />
            Montos Fiscales
            <span className="text-xs text-gray-500 ml-2">(Total = Subtotal + IVA - Retenciones)</span>
          </h4>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {/* Subtotal */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Subtotal *
              </label>
              <input
                type="number"
                value={formData.subtotal}
                onChange={(e) => handleInputChange('subtotal', parseFloat(e.target.value) || 0)}
                className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-red-500 focus:border-transparent"
                min="0"
                step="0.01"
                placeholder="0.00"
                disabled={isSubmitting}
              />
            </div>

            {/* IVA con botón de cálculo */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                IVA
              </label>
              <div className="flex gap-1">
                <input
                  type="number"
                  value={formData.iva}
                  onChange={(e) => handleInputChange('iva', parseFloat(e.target.value) || 0)}
                  className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-l focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  disabled={isSubmitting}
                />
                <button
                  type="button"
                  onClick={calcularIvaDesdeSubtotal}
                  className="px-2 py-1.5 bg-blue-500 hover:bg-blue-600 text-white text-xs rounded-r"
                  title={`Calcular IVA (${IVA_PORCENTAJE}%)`}
                  disabled={isSubmitting}
                >
                  %
                </button>
              </div>
            </div>

            {/* Retenciones */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Retenciones
              </label>
              <input
                type="number"
                value={formData.retenciones}
                onChange={(e) => handleInputChange('retenciones', parseFloat(e.target.value) || 0)}
                className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-red-500 focus:border-transparent"
                min="0"
                step="0.01"
                placeholder="0.00"
                disabled={isSubmitting}
              />
            </div>

            {/* Total con botón de cálculo y validación visual */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Total *
              </label>
              <div className="flex gap-1">
                <input
                  type="number"
                  value={formData.total}
                  onChange={(e) => handleInputChange('total', parseFloat(e.target.value) || 0)}
                  className={`w-full px-2 py-1.5 text-sm border rounded-l focus:ring-2 focus:ring-red-500 focus:border-transparent ${
                    errors.total ? 'border-red-500' : errorCuadre ? 'border-red-400' : !errorCuadre && formData.total > 0 ? 'border-green-500' : 'border-gray-300'
                  }`}
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  disabled={isSubmitting}
                />
                <button
                  type="button"
                  onClick={calcularTotalDesdeComponentes}
                  className="px-2 py-1.5 bg-green-500 hover:bg-green-600 text-white text-xs rounded-r"
                  title="Calcular Total"
                  disabled={isSubmitting}
                >
                  =
                </button>
              </div>
              {errors.total && (
                <p className="text-red-600 text-xs mt-1">{errors.total}</p>
              )}
            </div>

            {/* Fecha */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Fecha *
              </label>
              <input
                type="date"
                value={formData.fecha_gasto}
                onChange={(e) => handleInputChange('fecha_gasto', e.target.value)}
                className={`w-full px-2 py-1.5 text-sm border rounded focus:ring-2 focus:ring-red-500 focus:border-transparent ${
                  errors.fecha_gasto ? 'border-red-500' : 'border-gray-300'
                }`}
                disabled={isSubmitting}
              />
            </div>
          </div>

          {/* Indicador de cuadre fiscal */}
          {formData.total > 0 && (
            <div
              className={`mt-3 p-2 rounded-lg flex items-center gap-2 text-sm ${
                errorCuadre
                  ? 'bg-red-100 text-red-700 border border-red-200'
                  : 'bg-green-100 text-green-700 border border-green-200'
              }`}
            >
              {errorCuadre ? (
                <>
                  <XCircle className="w-4 h-4" />
                  <span className="font-medium">No cuadra:</span>
                  <span className="text-xs">{errorCuadre}</span>
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  <span className="font-medium">Cuadre validado</span>
                </>
              )}
            </div>
          )}
        </div>

        {/* Forma de Pago y Referencia */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Forma de Pago
            </label>
            <select
              value={formData.forma_pago}
              onChange={(e) => handleInputChange('forma_pago', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
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
            Descripción
          </label>
          <textarea
            value={formData.descripcion}
            onChange={(e) => handleInputChange('descripcion', e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
            placeholder="Detalles adicionales del gasto..."
            disabled={isSubmitting}
          />
        </div>

        {/* Resumen con cantidad */}
        {formData.cantidad > 1 && (
          <div className="bg-white rounded-lg border p-4">
            <h4 className="font-medium text-gray-900 mb-3 flex items-center">
              <Calculator className="w-4 h-4 mr-2" />
              Resumen (x{formData.cantidad} unidades)
            </h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Subtotal ({formData.cantidad}x):</span>
                <span className="font-medium">{formatCurrency(subtotalConCantidad)}</span>
              </div>
              <div className="flex justify-between">
                <span>IVA ({formData.cantidad}x):</span>
                <span className="font-medium">{formatCurrency(ivaConCantidad)}</span>
              </div>
              <div className="flex justify-between font-bold text-lg border-t pt-2">
                <span>Total Final:</span>
                <span className="text-red-600">{formatCurrency(totalConCantidad)}</span>
              </div>
            </div>
          </div>
        )}

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
            disabled={isSubmitting || isUploading}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting || isUploading}
            className="bg-red-500 hover:bg-red-600"
          >
            {(isSubmitting || isUploading) && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {expense ? 'Actualizar' : 'Crear'} Gasto
          </Button>
        </div>
      </form>
    </div>
  );
};