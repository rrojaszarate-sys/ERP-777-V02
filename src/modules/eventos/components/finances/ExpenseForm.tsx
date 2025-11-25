import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { TrendingDown, FileText, Calculator, Loader2, AlertTriangle, Bot, Zap, Upload } from 'lucide-react';
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
    total_con_iva: expense?.total || 0,
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
    // ✅ NUEVOS CAMPOS PARA CONTROL DE PAGOS Y CUENTAS
    cuenta_id: (expense as any)?.cuenta_id || '',
    comprobante_pago_url: (expense as any)?.comprobante_pago_url || '',
    comprobante_pago_nombre: (expense as any)?.comprobante_pago_nombre || '',
    fecha_pago: (expense as any)?.fecha_pago || '',
    responsable_pago_id: (expense as any)?.responsable_pago_id || '',
    pagado: (expense as any)?.pagado || false,
    comprobado: (expense as any)?.comprobado || false
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showOCRUpload, setShowOCRUpload] = useState(false);
  const { uploadFile, isUploading } = useFileUpload();
  const { data: categories } = useExpenseCategories();
  const { processOCRFile, isProcessing, error: ocrError } = useOCRIntegration(eventId);

  // Calculate totals (nueva lógica: del total hacia atrás)
  const total = formData.total_con_iva * formData.cantidad;
  const iva_factor = 1 + (formData.iva_porcentaje / 100);
  const subtotal = total / iva_factor;
  const iva = total - subtotal;
  const precio_unitario = formData.total_con_iva; // Para compatibilidad con el backend

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.concepto.trim()) {
      newErrors.concepto = 'El concepto es requerido';
    }

    if (formData.total_con_iva <= 0) {
      newErrors.total_con_iva = 'El total debe ser mayor a 0';
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

    setIsSubmitting(true);

    try {
      const dataToSave = {
        ...formData,
        precio_unitario, // Calculado automáticamente
        subtotal,
        iva,
        total,
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

      const result = await processOCRFile(file);

      if (result.formData._documentType !== 'ticket') {
        alert('⚠️ Este documento parece ser una factura. Use el formulario de ingresos para facturas.');
        return;
      }

      // Prellenar formulario con datos OCR
      const ocrData = result.formData;
      const warnings = result.formData._warnings || [];

      setFormData(prev => ({
        ...prev,
        concepto: ocrData.concepto || prev.concepto,
        descripcion: ocrData.descripcion || prev.descripcion,
        total_con_iva: ocrData.total_con_iva > 0 ? ocrData.total_con_iva : prev.total_con_iva,
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
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Total (con IVA incluido) *
            </label>
            <input
              type="number"
              value={formData.total_con_iva}
              onChange={(e) => handleInputChange('total_con_iva', parseFloat(e.target.value) || 0)}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent ${
                errors.total_con_iva ? 'border-red-500' : 'border-gray-300'
              }`}
              min="0"
              step="0.01"
              placeholder="0.00"
              disabled={isSubmitting}
            />
            {errors.total_con_iva && (
              <p className="text-red-600 text-sm mt-1">{errors.total_con_iva}</p>
            )}
            <p className="text-xs text-gray-500 mt-1">
              Ingrese el monto total que aparece en su comprobante (ya incluye IVA)
            </p>
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
              Fecha del Gasto *
            </label>
            <input
              type="date"
              value={formData.fecha_gasto}
              onChange={(e) => handleInputChange('fecha_gasto', e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent ${
                errors.fecha_gasto ? 'border-red-500' : 'border-gray-300'
              }`}
              disabled={isSubmitting}
            />
            {errors.fecha_gasto && (
              <p className="text-red-600 text-sm mt-1">{errors.fecha_gasto}</p>
            )}
          </div>
          
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