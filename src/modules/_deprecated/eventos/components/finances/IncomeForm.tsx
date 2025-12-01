import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { DollarSign, FileText, Calculator, Loader2, AlertTriangle, Calendar, Bot, Zap, Upload, UserCheck } from 'lucide-react';
import { Button } from '../../../../shared/components/ui/Button';
import { FileUpload } from '../../../../shared/components/ui/FileUpload';
import { useFileUpload } from '../../hooks/useFileUpload';
import { useUsers } from '../../hooks/useUsers';
import { useClients } from '../../hooks/useClients';
import { useCuentasContables } from '../../hooks/useCuentasContables';
import { formatCurrency } from '../../../../shared/utils/formatters';
import { MEXICAN_CONFIG, BUSINESS_RULES } from '../../../../core/config/constants';
import { Income } from '../../types/Finance';
import { useOCRIntegration } from '../../../ocr/hooks/useOCRIntegration';
import { parseCFDIXml, cfdiToIncomeData } from '../../utils/cfdiXmlParser';
import { toast } from 'react-hot-toast';
import { fileUploadService } from '../../../../services/fileUploadService';

interface IncomeFormProps {
  income?: Income | null;
  eventId: string;
  onSave: (data: Partial<Income>) => void;
  onCancel: () => void;
  className?: string;
}

export const IncomeForm: React.FC<IncomeFormProps> = ({
  income,
  eventId,
  onSave,
  onCancel,
  className = ''
}) => {
  const [formData, setFormData] = useState({
    concepto: income?.concepto || '',
    descripcion: income?.descripcion || '',
    total: income?.total || 0, // ✅ Solo el total importa (del XML)
    iva_porcentaje: income?.iva_porcentaje || MEXICAN_CONFIG.ivaRate,
    fecha_ingreso: income?.fecha_ingreso || new Date().toISOString().split('T')[0],
    referencia: income?.referencia || '',
    metodo_cobro: income?.metodo_cobro || 'transferencia',
    facturado: income?.facturado !== undefined ? income.facturado : true, // ✅ SIEMPRE empieza facturado
    cobrado: income?.cobrado || false,
    dias_credito: income?.dias_credito || 30, // ✅ NUEVO: Días de crédito para calcular vencimiento
    fecha_compromiso_pago: income?.fecha_compromiso_pago || '',
    fecha_facturacion: income?.fecha_facturacion || new Date().toISOString().split('T')[0], // ✅ Auto-llenar con fecha actual
    fecha_cobro: income?.fecha_cobro || '',
    responsable_id: income?.responsable_id || '', // ✅ Responsable del seguimiento (obligatorio)
    cuenta_contable_id: income?.cuenta_contable_id || '', // 💳 NUEVO: Cuenta contable (obligatorio)
    cliente_id: income?.cliente_id || '', // ✅ OBLIGATORIO: Cliente receptor de la factura
    cliente: income?.cliente || '', // ✅ Nombre del cliente
    rfc_cliente: income?.rfc_cliente || '', // ✅ RFC del cliente
    archivo_adjunto: income?.archivo_adjunto || '',
    archivo_nombre: income?.archivo_nombre || '',
    archivo_tamaño: income?.archivo_tamaño || 0,
    archivo_tipo: income?.archivo_tipo || '',
    documento_pago_url: income?.documento_pago_url || '', // ✅ NUEVO: Comprobante de pago
    documento_pago_nombre: income?.documento_pago_nombre || '',
    // ✅ NUEVOS CAMPOS PARA CONTROL DE FACTURACIÓN
    estado_id: (income as any)?.estado_id || 1, // Default: PLANEADO
    dias_facturacion: (income as any)?.dias_facturacion || 5, // Default: 5 días
    fecha_limite_facturacion: (income as any)?.fecha_limite_facturacion || '',
    orden_compra_url: (income as any)?.orden_compra_url || '',
    orden_compra_nombre: (income as any)?.orden_compra_nombre || '',
    alertas_enviadas: (income as any)?.alertas_enviadas || []
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { uploadFile, isUploading } = useFileUpload();
  const { processOCRFile, isProcessing, error: ocrError } = useOCRIntegration(eventId);
  const { data: users, loading: loadingUsers } = useUsers(); // ✅ Cargar usuarios activos
  const { clients, loading: loadingClients } = useClients(); // ✅ Cargar clientes
  const { data: cuentasContables } = useCuentasContables();

  // 🔒 Filtrar cuentas bancarias solo para ingresos (id >= 24) según reglas de negocio
  const filteredCuentas = useMemo(() => {
    if (!cuentasContables) return [];
    
    if (BUSINESS_RULES.limitBankAccountsForIncomes) {
      // Solo mostrar cuentas con id >= 24 para ingresos
      return cuentasContables.filter(c => {
        const cuentaId = parseInt(c.id);
        return cuentaId >= BUSINESS_RULES.minBankAccountIdForIncomes;
      });
    }
    
    return cuentasContables;
  }, [cuentasContables]);

  // 🆕 ESTADOS SEPARADOS PARA XML Y PDF (INGRESOS)
  const [xmlFile, setXmlFile] = useState<File | null>(null);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [ordenCompraFile, setOrdenCompraFile] = useState<File | null>(null); // ✅ NUEVO: Orden de compra
  const [comprobantePagoFile, setComprobantePagoFile] = useState<File | null>(null); // ✅ Comprobante de pago
  const [uploadingDocument, setUploadingDocument] = useState(false); // Estado de carga para documentos adicionales

  // 🎯 CALCULAR ESTADO AUTOMÁTICAMENTE BASADO EN DOCUMENTOS
  const calcularEstado = (): number => {
    // Estado 4: PAGADO - Requiere XML + PDF + Comprobante de Pago
    if (formData.archivo_adjunto && formData.documento_pago_url) {
      return 4; // PAGADO
    }
    // Estado 3: FACTURADO - Requiere XML + PDF
    if (formData.archivo_adjunto) {
      return 3; // FACTURADO
    }
    // Estado 2: ORDEN_COMPRA - Opcional, si hay orden de compra
    if (formData.orden_compra_url) {
      return 2; // ORDEN_COMPRA
    }
    // Estado 1: PLANEADO - Default
    return 1; // PLANEADO
  };

  // ✅ Actualizar estado automáticamente cuando cambien los documentos
  React.useEffect(() => {
    const nuevoEstado = calcularEstado();
    if (formData.estado_id !== nuevoEstado) {
      setFormData(prev => ({
        ...prev,
        estado_id: nuevoEstado,
        // Actualizar checkboxes basados en el estado
        facturado: nuevoEstado >= 3,
        cobrado: nuevoEstado >= 4
      }));
    }
  }, [formData.archivo_adjunto, formData.documento_pago_url, formData.orden_compra_url]);

  // ✅ Calculate totals FROM total (not from cantidad × precio_unitario)
  const total = formData.total;
  const iva_factor = 1 + (formData.iva_porcentaje / 100);
  const subtotal = total / iva_factor;
  const iva = total - subtotal;

  // ✅ AUTO-CALCULAR fecha de compromiso de pago basado en días de crédito
  React.useEffect(() => {
    if (formData.fecha_facturacion && formData.dias_credito) {
      const fechaFacturacion = new Date(formData.fecha_facturacion);
      fechaFacturacion.setDate(fechaFacturacion.getDate() + formData.dias_credito);
      const fechaCompromiso = fechaFacturacion.toISOString().split('T')[0];

      // Solo actualizar si es diferente para evitar loop infinito
      if (formData.fecha_compromiso_pago !== fechaCompromiso) {
        setFormData(prev => ({
          ...prev,
          fecha_compromiso_pago: fechaCompromiso
        }));
      }
    }
  }, [formData.fecha_facturacion, formData.dias_credito]);

  // ✅ AUTO-CALCULAR fecha límite de facturación basado en días_facturacion
  React.useEffect(() => {
    if (formData.fecha_ingreso && formData.dias_facturacion && !formData.fecha_limite_facturacion) {
      const fechaIngreso = new Date(formData.fecha_ingreso);
      fechaIngreso.setDate(fechaIngreso.getDate() + formData.dias_facturacion);
      const fechaLimite = fechaIngreso.toISOString().split('T')[0];

      setFormData(prev => ({
        ...prev,
        fecha_limite_facturacion: fechaLimite
      }));
    }
  }, [formData.fecha_ingreso, formData.dias_facturacion]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.concepto.trim()) {
      newErrors.concepto = 'El concepto es requerido';
    }

    if (formData.total <= 0) {
      newErrors.total = 'El total debe ser mayor a 0';
    }

    if (!formData.fecha_ingreso) {
      newErrors.fecha_ingreso = 'La fecha de ingreso es requerida';
    }

    // ✅ VALIDAR CLIENTE OBLIGATORIO (nombre del cliente)
    if (!formData.cliente || !formData.cliente.trim()) {
      newErrors.cliente_id = 'El cliente es obligatorio';
    }

    // ✅ VALIDAR RESPONSABLE OBLIGATORIO
    if (!formData.responsable_id || typeof formData.responsable_id !== 'string' || !formData.responsable_id.trim()) {
      newErrors.responsable_id = 'El responsable es obligatorio';
    }

    // ✅ CALCULAR ESTADO PARA VALIDACIONES
    const estadoCalculado = calcularEstado();

    // ✅ VALIDAR CUENTA CONTABLE: Solo obligatoria si está PAGADO (estado 4)
    if (estadoCalculado >= 4) {
      if (!formData.cuenta_contable_id || formData.cuenta_contable_id === '') {
        newErrors.cuenta_contable_id = 'La cuenta contable es obligatoria al realizar el pago';
      }
    }

    // Estado 3 (FACTURADO): Requiere XML + PDF
    if (estadoCalculado >= 3 && !formData.archivo_adjunto) {
      newErrors.archivo_adjunto = 'Para estar facturado, debe adjuntar XML + PDF de la factura';
    }

    // Estado 4 (PAGADO): Requiere XML + PDF + Comprobante de Pago
    if (estadoCalculado >= 4 && !formData.documento_pago_url) {
      newErrors.documento_pago_url = 'Para estar pagado, debe adjuntar el comprobante de pago';
    }

    // ✅ VALIDAR: Fecha de compromiso requerida si está facturado
    if (estadoCalculado >= 3 && !formData.fecha_compromiso_pago) {
      newErrors.fecha_compromiso_pago = 'La fecha de compromiso de pago es requerida para ingresos facturados';
    }

    // Validate that commitment date is after invoice date
    if (formData.fecha_facturacion && formData.fecha_compromiso_pago &&
        new Date(formData.fecha_compromiso_pago) < new Date(formData.fecha_facturacion)) {
      newErrors.fecha_compromiso_pago = 'La fecha de compromiso debe ser posterior a la fecha de facturación';
    }

    // Validate payment date if marked as paid
    if (estadoCalculado >= 4 && !formData.fecha_cobro) {
      newErrors.fecha_cobro = 'La fecha de cobro es requerida para ingresos pagados';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      // Mostrar errores al usuario
      const errorMessages = Object.entries(errors).map(([, message]) => message);
      toast.error(`❌ Por favor corrige los siguientes errores:\n${errorMessages.join('\n')}`);
      return;
    }

    setIsSubmitting(true);

    try {
      // Calcular el estado final basado en documentos
      const estadoFinal = calcularEstado();
      
      const dataToSave = {
        ...formData,
        subtotal,
        iva,
        total,
        evento_id: eventId,
        // Asegurar que el estado se guarde correctamente
        estado_id: estadoFinal,
        // Actualizar flags basados en el estado
        facturado: estadoFinal >= 3,
        cobrado: estadoFinal >= 4,
        // Asegurar fechas correctas
        fecha_facturacion: estadoFinal >= 3 ? (formData.fecha_facturacion || formData.fecha_ingreso) : formData.fecha_facturacion,
        fecha_cobro: estadoFinal >= 4 ? (formData.fecha_cobro || new Date().toISOString().split('T')[0]) : formData.fecha_cobro,
        created_at: income ? undefined : new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      onSave(dataToSave);
    } catch (error) {
      console.error('Error saving income:', error);
      toast.error('Error al guardar el ingreso');
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
    
    // Clear file error if it exists
    if (errors.archivo_adjunto) {
      setErrors(prev => ({ ...prev, archivo_adjunto: '' }));
    }

    // Auto-extract data from filename if possible
    if (result.fileName.toLowerCase().includes('factura')) {
      const match = result.fileName.match(/(\d+)/);
      if (match) {
        setFormData(prev => ({
          ...prev,
          referencia: `FACT-${match[1]}`
        }));
      }
    }
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

  // 🆕 FUNCIÓN PARA PROCESAR XML CFDI (INGRESOS)
  const processXMLCFDI = async (xmlFile: File) => {
    try {
      console.log('📄 Procesando XML CFDI de ingreso:', xmlFile.name);
      
      // Leer contenido del XML
      const xmlContent = await xmlFile.text();
      
      // Parsear XML con cfdiXmlParser
      const cfdiData = await parseCFDIXml(xmlContent);
      console.log('✅ CFDI parseado:', cfdiData);
      
      // Convertir a formato de ingreso
      const incomeData = cfdiToIncomeData(cfdiData);
      console.log('✅ Datos de ingreso:', incomeData);
      
      // Auto-rellenar formulario
      setFormData(prev => ({
        ...prev,
        ...incomeData,
        evento_id: eventId
      }));
      
      toast.success(
        `✅ XML CFDI procesado exitosamente\n` +
        `Cliente: ${cfdiData.receptor.nombre}\n` +
        `Total: $${cfdiData.total.toFixed(2)}`
      );
      
    } catch (error: any) {
      console.error('❌ Error procesando XML CFDI:', error);
      toast.error(`Error procesando XML: ${error.message || 'Error desconocido'}`);
    }
  };

  // 🆕 FUNCIÓN PRINCIPAL: Procesar XML + PDF simultáneamente
  const processDocuments = async () => {
    try {
      // ⚠️ Sin archivos
      if (!xmlFile && !pdfFile) {
        console.warn('⚠️ No hay archivos para procesar');
        toast.error('Por favor sube el XML CFDI y el PDF de la factura');
        return;
      }

      // ⚠️ Sin XML: Ingresos requieren factura formal con XML
      if (!xmlFile) {
        console.warn('⚠️ Sin XML - Los ingresos requieren XML CFDI');
        toast.error('⚠️ Los ingresos requieren el XML CFDI de la factura');
        return;
      }

      // 🎯 PRIORIDAD 1: Si hay XML, extraer datos de ahí (100% preciso)
      console.log('✅ XML detectado - Extrayendo datos del XML (sin OCR)');
      
      await processXMLCFDI(xmlFile);
      
      // 📎 Subir PDF si está disponible
      if (pdfFile) {
        console.log('📎 Subiendo PDF:', pdfFile.name);
        const uploadResult = await uploadFile({ file: pdfFile, type: 'income', eventId });
        
        // ✅ Actualizar formData con URL del archivo subido
        setFormData(prev => ({
          ...prev,
          archivo_adjunto: uploadResult.url,
          archivo_nombre: uploadResult.fileName,
          archivo_tamaño: uploadResult.fileSize,
          archivo_tipo: uploadResult.mimeType
        }));
        
        console.log('✅ PDF subido exitosamente:', uploadResult.url);
        toast.success('✅ XML procesado + PDF adjunto correctamente');
      } else {
        toast.success('✅ XML procesado correctamente');
      }

    } catch (error) {
      console.error('❌ Error procesando documentos:', error);
      toast.error('Error procesando documentos');
    }
  };

  const handleOCRFile = async (file: File) => {
    try {
      console.log('🔍 Procesando archivo OCR para prellenar formulario de ingreso:', file.name);

      const result = await processOCRFile(file);

      if (result.formData._documentType !== 'factura') {
        alert('⚠️ Este documento parece ser un ticket. Use el formulario de gastos para tickets.');
        return;
      }

      // Prellenar formulario con datos OCR
      const ocrData = result.formData;
      setFormData(prev => ({
        ...prev,
        concepto: ocrData.concepto || prev.concepto,
        descripcion: ocrData.descripcion || prev.descripcion,
        total: ocrData.total || prev.total, // ✅ Solo el total importa
        fecha_ingreso: ocrData.fecha_ingreso || prev.fecha_ingreso,
        referencia: ocrData.referencia || prev.referencia,
        // Marcar como facturado si viene de OCR de factura
        facturado: true,
        fecha_facturacion: ocrData.fecha_ingreso || prev.fecha_facturacion,
        // Agregar notas sobre confianza OCR
        metodo_cobro: `OCR (${result.confidence}% confianza)${result.needsValidation ? ' - REVISAR' : ''}`
      }));

      // Subir archivo también
      if (file) {
        const uploadResult = await uploadFile({ file, type: 'income', eventId });
        handleFileUploaded(uploadResult);
      }

      alert(`✅ Datos de factura extraídos automáticamente!\n📊 Confianza: ${result.confidence}%\n${result.needsValidation ? '⚠️ Revise los datos extraídos antes de guardar.' : '✅ Alta confianza, datos listos para usar.'}`);

    } catch (error) {
      console.error('❌ Error procesando OCR:', error);
      alert('❌ Error al procesar la factura con OCR. Intente de nuevo o llene el formulario manualmente.');
    }
  };

  // ✅ FUNCIÓN PARA SUBIR ORDEN DE COMPRA
  // Usa uploadEventDocument para seguir el formato: {ClaveEvento}_OrdenCompra_V{N}_{Descripcion}
  const handleOrdenCompraUpload = async (file: File) => {
    if (!eventId) {
      toast.error('❌ Debe guardar el evento antes de subir archivos');
      return;
    }

    try {
      setUploadingDocument(true);
      console.log('📎 Subiendo orden de compra:', file.name);
      
      // Usar uploadEventDocument para mantener el formato correcto
      const uploadResult = await fileUploadService.uploadEventDocument(
        file,
        eventId,
        'OrdenCompra' // Tipo de documento
      );

      setFormData(prev => ({
        ...prev,
        orden_compra_url: uploadResult.url,
        orden_compra_nombre: uploadResult.fileName
      }));

      toast.success('✅ Orden de compra adjuntada correctamente');
    } catch (error) {
      console.error('❌ Error subiendo orden de compra:', error);
      toast.error(error instanceof Error ? error.message : 'Error al subir la orden de compra');
    } finally {
      setUploadingDocument(false);
    }
  };

  return (
    <div className={`bg-green-50 border border-green-200 rounded-lg p-6 ${className}`}>
      <h3 className="text-lg font-medium text-green-900 mb-6 flex items-center">
        <DollarSign className="w-5 h-5 mr-2" />
        {income ? 'Editar Ingreso' : 'Nuevo Ingreso'}
      </h3>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 📎 SECCIÓN DE ARCHIVOS - SISTEMA DUAL XML + PDF (SOLO FACTURAS) */}
        <div className="mb-6 space-y-3">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Documentos de la Factura
            </div>
          </label>

          {/* � FLUJO DE ESTADOS - Indicador visual */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="flex items-center justify-between text-xs">
              <div className={`flex items-center gap-1 ${formData.estado_id >= 1 ? 'text-blue-700 font-medium' : 'text-gray-400'}`}>
                <span className={`w-6 h-6 rounded-full flex items-center justify-center ${formData.estado_id >= 1 ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}>
                  {formData.estado_id >= 1 ? '✓' : '1'}
                </span>
                <span>Planeado</span>
              </div>
              <div className={`flex-1 h-0.5 mx-2 ${formData.estado_id >= 2 ? 'bg-blue-500' : 'bg-gray-300'}`}></div>
              <div className={`flex items-center gap-1 ${formData.estado_id >= 2 ? 'text-indigo-700 font-medium' : 'text-gray-400'}`}>
                <span className={`w-6 h-6 rounded-full flex items-center justify-center ${formData.estado_id >= 2 ? 'bg-indigo-500 text-white' : 'bg-gray-200'}`}>
                  {formData.estado_id >= 2 ? '✓' : '2'}
                </span>
                <span>Orden Compra</span>
              </div>
              <div className={`flex-1 h-0.5 mx-2 ${formData.estado_id >= 3 ? 'bg-indigo-500' : 'bg-gray-300'}`}></div>
              <div className={`flex items-center gap-1 ${formData.estado_id >= 3 ? 'text-yellow-700 font-medium' : 'text-gray-400'}`}>
                <span className={`w-6 h-6 rounded-full flex items-center justify-center ${formData.estado_id >= 3 ? 'bg-yellow-500 text-white' : 'bg-gray-200'}`}>
                  {formData.estado_id >= 3 ? '✓' : '3'}
                </span>
                <span>Facturado</span>
              </div>
              <div className={`flex-1 h-0.5 mx-2 ${formData.estado_id >= 4 ? 'bg-yellow-500' : 'bg-gray-300'}`}></div>
              <div className={`flex items-center gap-1 ${formData.estado_id >= 4 ? 'text-green-700 font-medium' : 'text-gray-400'}`}>
                <span className={`w-6 h-6 rounded-full flex items-center justify-center ${formData.estado_id >= 4 ? 'bg-green-500 text-white' : 'bg-gray-200'}`}>
                  {formData.estado_id >= 4 ? '✓' : '4'}
                </span>
                <span>Pagado</span>
              </div>
            </div>
          </div>

          {/* 🆕 ZONA 1: XML CFDI + PDF (Compacto) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {/* XML */}
            <div className="border border-purple-300 rounded-lg p-2 bg-purple-50">
              <div className="flex items-center gap-2 mb-1">
                <FileText className="w-4 h-4 text-purple-600" />
                <h3 className="text-xs font-semibold text-gray-900">XML CFDI *</h3>
              </div>
              {!xmlFile ? (
                <div className="relative">
                  <input
                    type="file"
                    id="xmlInput"
                    accept=".xml,text/xml,application/xml"
                    onChange={(e) => {
                      const selectedFile = e.target.files?.[0];
                      if (selectedFile) {
                        console.log('📄 XML seleccionado:', selectedFile.name);
                        setXmlFile(selectedFile);
                      }
                    }}
                    className="hidden"
                    disabled={isSubmitting}
                  />
                  <label
                    htmlFor="xmlInput"
                    className="flex items-center justify-center gap-1 p-2 border border-dashed border-purple-300 rounded cursor-pointer hover:bg-purple-100 transition-colors"
                  >
                    <Upload className="w-3 h-3 text-purple-600" />
                    <span className="text-xs text-purple-700">Subir XML</span>
                  </label>
                </div>
              ) : (
                <div className="flex items-center justify-between p-1.5 bg-purple-100 border border-purple-300 rounded">
                  <div className="flex items-center gap-1">
                    <FileText className="w-3 h-3 text-purple-700" />
                    <p className="text-xs font-medium text-gray-900 truncate max-w-[120px]">
                      {xmlFile.name}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setXmlFile(null)}
                    className="px-1 py-0.5 text-xs text-purple-700 hover:bg-purple-200 rounded"
                  >
                    ✕
                  </button>
                </div>
              )}
            </div>

            {/* PDF */}
            <div className="border border-green-300 rounded-lg p-2 bg-green-50">
              <div className="flex items-center gap-2 mb-1">
                <FileText className="w-4 h-4 text-green-600" />
                <h3 className="text-xs font-semibold text-gray-900">PDF Factura *</h3>
              </div>
              {!pdfFile ? (
                <div className="relative">
                  <input
                    type="file"
                    id="pdfInput"
                    accept="application/pdf"
                    onChange={(e) => {
                      const selectedFile = e.target.files?.[0];
                      if (selectedFile) {
                        console.log('📄 PDF seleccionado:', selectedFile.name);
                        setPdfFile(selectedFile);
                      }
                    }}
                    className="hidden"
                    disabled={isSubmitting}
                  />
                  <label
                    htmlFor="pdfInput"
                    className="flex items-center justify-center gap-1 p-2 border border-dashed border-green-300 rounded cursor-pointer hover:bg-green-100 transition-colors"
                  >
                    <Upload className="w-3 h-3 text-green-600" />
                    <span className="text-xs text-green-700">Subir PDF</span>
                  </label>
                </div>
              ) : (
                <div className="flex items-center justify-between p-1.5 bg-green-100 border border-green-300 rounded">
                  <div className="flex items-center gap-1">
                    <FileText className="w-3 h-3 text-green-700" />
                    <p className="text-xs font-medium text-gray-900 truncate max-w-[120px]">
                      {pdfFile.name}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPdfFile(null)}
                    className="px-1 py-0.5 text-xs text-green-700 hover:bg-green-200 rounded"
                  >
                    ✕
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* 🚀 BOTÓN COMPACTO PARA PROCESAR DOCUMENTOS */}
          {(xmlFile || pdfFile) && (
            <button
              type="button"
              onClick={processDocuments}
              className="w-full py-2 px-3 bg-gradient-to-r from-purple-600 to-green-600 text-white text-sm font-medium rounded shadow hover:from-purple-700 hover:to-green-700 transition-all flex items-center justify-center gap-2"
              disabled={isSubmitting || isUploading}
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Procesando...</span>
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4" />
                  <span>Procesar y Extraer Datos</span>
                </>
              )}
            </button>
          )}

          {/* ⚠️ Error de archivo faltante */}
          {errors.archivo_adjunto && (
            <div className="p-2 bg-red-50 border border-red-300 rounded">
              <p className="text-xs text-red-700 font-medium">❌ {errors.archivo_adjunto}</p>
            </div>
          )}
        </div>

        {/* Basic Information - MÁS COMPACTO: 3 COLUMNAS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="md:col-span-3">
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Concepto *
            </label>
            <input
              type="text"
              value={formData.concepto}
              onChange={(e) => handleInputChange('concepto', e.target.value)}
              className={`w-full px-3 py-1.5 text-sm border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent ${
                errors.concepto ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Descripción del servicio o producto facturado"
              disabled={isSubmitting}
            />
            {errors.concepto && (
              <p className="text-red-600 text-xs mt-0.5">{errors.concepto}</p>
            )}
          </div>
          
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Total de la Factura (con IVA) *
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1.5 text-gray-500 text-sm">$</span>
              <input
                type="text"
                value={formData.total ? formData.total.toLocaleString('es-MX', { minimumFractionDigits: 2 }) : ''}
                onChange={(e) => {
                  const value = e.target.value.replace(/[^0-9.]/g, '');
                  handleInputChange('total', parseFloat(value) || 0);
                }}
                className={`w-full pl-8 pr-3 py-1.5 text-sm border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent ${
                  errors.total ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="0.00"
                disabled={isSubmitting}
                style={{ appearance: 'none' }}
              />
            </div>
            {errors.total && (
              <p className="text-red-600 text-xs mt-0.5">{errors.total}</p>
            )}
          </div>
          
          {/* ====== CLIENTE (OBLIGATORIO) ====== */}
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-200 mb-1 flex items-center gap-1">
              <DollarSign className="w-3 h-3 text-green-600" />
              Cliente *
            </label>
            <select
              value={formData.cliente_id}
              onChange={(e) => {
                const selectedCliente = clients?.find(c => c.id === parseInt(e.target.value));
                handleInputChange('cliente_id', e.target.value);
                if (selectedCliente) {
                  const nombreCliente = selectedCliente.nombre_comercial || selectedCliente.razon_social;
                  handleInputChange('cliente', nombreCliente);
                  handleInputChange('rfc_cliente', selectedCliente.rfc || '');
                }
              }}
              className={`w-full px-3 py-1.5 text-sm border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
                errors.cliente_id ? 'border-red-500' : 'border-gray-300'
              }`}
              disabled={isSubmitting || loadingClients}
            >
              <option value="">Selecciona un cliente</option>
              {clients?.map((cliente) => (
                <option key={cliente.id} value={cliente.id}>
                  {cliente.nombre_comercial || cliente.razon_social} {cliente.rfc ? `- ${cliente.rfc}` : ''}
                </option>
              ))}
            </select>
            {errors.cliente_id && (
              <p className="text-red-500 text-xs mt-0.5">{errors.cliente_id}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-200 mb-1 flex items-center gap-1">
              <UserCheck className="w-3 h-3" />
              Responsable del Seguimiento *
            </label>
            <select
              value={formData.responsable_id}
              onChange={(e) => handleInputChange('responsable_id', e.target.value)}
              className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:bg-gray-700 dark:border-gray-600 dark:text-white rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              disabled={isSubmitting || loadingUsers}
              required
            >
              <option value="">Seleccionar responsable</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.nombre} ({user.email})
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Trabajador que dará seguimiento al cobro
            </p>
          </div>

          {/* 💳 Cuenta Contable */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
              Cuenta Contable {formData.estado_id >= 4 && '*'}
              {formData.estado_id < 4 && (
                <span className="text-xs text-amber-600 ml-2">(Puede dejarse pendiente hasta el pago)</span>
              )}
              {BUSINESS_RULES.limitBankAccountsForIncomes && (
                <span className="text-xs text-gray-500 ml-2">(Solo cuentas de ingresos)</span>
              )}
            </label>
            <select
              value={formData.cuenta_contable_id}
              onChange={(e) => handleInputChange('cuenta_contable_id', e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
                errors.cuenta_contable_id ? 'border-red-500' : 'border-gray-300'
              }`}
              disabled={isSubmitting}
              required={formData.estado_id >= 4}
            >
              <option value="">
                {formData.estado_id >= 4 ? 'Seleccionar cuenta (obligatorio)' : 'Pendiente de asignación'}
              </option>
              {filteredCuentas?.map((cuenta) => (
                <option key={cuenta.id} value={cuenta.id}>
                  {cuenta.codigo} - {cuenta.nombre}
                </option>
              ))}
            </select>
            {errors.cuenta_contable_id && (
              <p className="text-red-600 text-sm mt-1">{errors.cuenta_contable_id}</p>
            )}
            {formData.cuenta_contable_id && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                💳 Cuenta: {filteredCuentas?.find(c => c.id === formData.cuenta_contable_id)?.codigo}
              </p>
            )}
            {!formData.cuenta_contable_id && formData.estado_id < 4 && (
              <p className="text-xs text-amber-600 mt-1">
                ℹ️ La cuenta contable se marcará como "pendiente" y será obligatoria al realizar el pago
              </p>
            )}
          </div>

          {/* ✅ Estado del Ingreso (SOLO LECTURA - Calculado automáticamente) */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
              Estado del Ingreso (Automático)
            </label>
            <div className="relative">
              <input
                type="text"
                value={
                  formData.estado_id === 1 ? '📋 PLANEADO' :
                  formData.estado_id === 2 ? '📄 ORDEN DE COMPRA' :
                  formData.estado_id === 3 ? '💰 FACTURADO' :
                  formData.estado_id === 4 ? '✅ PAGADO' : 'Desconocido'
                }
                className="w-full px-3 py-2 border border-gray-300 dark:bg-gray-700 dark:border-gray-600 dark:text-white rounded-lg bg-gray-50 cursor-not-allowed"
                disabled
                readOnly
              />
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              ℹ️ El estado se calcula automáticamente según los documentos adjuntos:
              <br />• Planeado → Sin documentos
              <br />• Orden Compra → Con orden de compra (opcional)
              <br />• Facturado → Con XML + PDF
              <br />• Pagado → Con XML + PDF + Comprobante de pago
            </p>
          </div>

          {/* ✅ ORDEN DE COMPRA (OPCIONAL) - Carga automática al seleccionar */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
              Orden de Compra (Opcional)
            </label>
            {!formData.orden_compra_url ? (
              <div>
                <input
                  type="file"
                  id="ordenCompraInput"
                  accept="application/pdf,image/jpeg,image/jpg,image/png"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setOrdenCompraFile(file);
                      // Subir automáticamente al seleccionar
                      await handleOrdenCompraUpload(file);
                    }
                  }}
                  className="hidden"
                  disabled={isSubmitting || uploadingDocument}
                />
                <label
                  htmlFor="ordenCompraInput"
                  className={`flex items-center gap-1.5 px-3 py-2 border rounded cursor-pointer transition-colors ${
                    uploadingDocument
                      ? 'border-gray-300 bg-gray-100 cursor-not-allowed'
                      : 'border-indigo-300 bg-indigo-50 hover:bg-indigo-100'
                  }`}
                >
                  <Upload className="w-4 h-4 text-indigo-600" />
                  <span className="text-sm text-indigo-700">
                    {uploadingDocument ? 'Subiendo...' : 'Subir Orden de Compra (PDF o Imagen)'}
                  </span>
                </label>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Opcional. Acepta PDF, JPG y PNG. Se guardará como: ClaveEvento_OrdenCompra_V1_NombreArchivo
                </p>
              </div>
            ) : (
              <div className="flex items-center justify-between p-2 bg-indigo-100 border border-indigo-300 rounded">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-indigo-700" />
                  <p className="text-sm font-medium text-gray-900">{formData.orden_compra_nombre}</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setFormData(prev => ({
                      ...prev,
                      orden_compra_url: '',
                      orden_compra_nombre: ''
                    }));
                    setOrdenCompraFile(null);
                  }}
                  className="px-2 py-1 text-xs text-indigo-700 hover:bg-indigo-200 rounded"
                  disabled={isSubmitting}
                >
                  Eliminar
                </button>
              </div>
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
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              min="0"
              max="100"
              step="0.01"
              disabled={isSubmitting}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Fecha de Ingreso *
            </label>
            <input
              type="date"
              value={formData.fecha_ingreso}
              onChange={(e) => handleInputChange('fecha_ingreso', e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent ${
                errors.fecha_ingreso ? 'border-red-500' : 'border-gray-300'
              }`}
              disabled={isSubmitting}
            />
            {errors.fecha_ingreso && (
              <p className="text-red-600 text-sm mt-1">{errors.fecha_ingreso}</p>
            )}
          </div>
        </div>

        {/* Additional Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Método de Cobro
            </label>
            <select
              value={formData.metodo_cobro}
              onChange={(e) => handleInputChange('metodo_cobro', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              disabled={isSubmitting}
            >
              <option value="transferencia">Transferencia Bancaria</option>
              <option value="efectivo">Efectivo</option>
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
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
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
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            placeholder="Detalles adicionales del ingreso..."
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
              <span className="text-green-600">{formatCurrency(total)}</span>
            </div>
          </div>
        </div>

        {/* Payment Management Section */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-medium text-blue-900 mb-4 flex items-center">
            <Calendar className="w-4 h-4 mr-2" />
            Gestión de Pagos y Facturación
          </h4>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fecha de Facturación *
              </label>
              <input
                type="date"
                value={formData.fecha_facturacion}
                onChange={(e) => handleInputChange('fecha_facturacion', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={isSubmitting}
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Fecha de emisión de la factura
              </p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Días de Crédito *
              </label>
              <input
                type="number"
                min="0"
                max="365"
                value={formData.dias_credito}
                onChange={(e) => handleInputChange('dias_credito', parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={isSubmitting}
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Días para el pago (30, 60, 90, etc.)
              </p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fecha de Vencimiento {formData.facturado && '*'}
              </label>
              <input
                type="date"
                value={formData.fecha_compromiso_pago}
                onChange={(e) => handleInputChange('fecha_compromiso_pago', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 ${
                  errors.fecha_compromiso_pago ? 'border-red-500' : 'border-gray-300'
                }`}
                disabled={isSubmitting}
                readOnly
              />
              {errors.fecha_compromiso_pago && (
                <p className="text-red-600 text-sm mt-1">{errors.fecha_compromiso_pago}</p>
              )}
              <p className="text-xs text-blue-600 mt-1">
                ✓ Calculado automáticamente
              </p>
            </div>
            
            {formData.cobrado && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Fecha de Cobro *
                </label>
                <input
                  type="date"
                  value={formData.fecha_cobro}
                  onChange={(e) => handleInputChange('fecha_cobro', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.fecha_cobro ? 'border-red-500' : 'border-gray-300'
                  }`}
                  disabled={isSubmitting}
                />
                {errors.fecha_cobro && (
                  <p className="text-red-600 text-sm mt-1">{errors.fecha_cobro}</p>
                )}
              </div>
            )}
          </div>

          {/* ✅ Sección de comprobante de pago (obligatorio para estado PAGADO) */}
          <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
            <h5 className="text-sm font-medium text-green-900 mb-2 flex items-center">
              <FileText className="w-4 h-4 mr-2" />
              Comprobante de Pago {formData.cobrado && '*'}
            </h5>
            
            {!formData.documento_pago_url ? (
              <div>
                <input
                  type="file"
                  id="comprobantePagoInput"
                  accept="application/pdf,image/jpeg,image/jpg,image/png"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      if (!eventId) {
                        toast.error('❌ Debe guardar el evento antes de subir archivos');
                        return;
                      }

                      try {
                        setComprobantePagoFile(file);
                        setUploadingDocument(true);
                        
                        // Usar uploadEventDocument con formato correcto
                        const uploadResult = await fileUploadService.uploadEventDocument(
                          file,
                          eventId,
                          'ComprobantePago' // Tipo de documento
                        );
                        
                        setFormData(prev => ({
                          ...prev,
                          documento_pago_url: uploadResult.url,
                          documento_pago_nombre: uploadResult.fileName
                        }));
                        
                        // Limpiar error si existe
                        if (errors.documento_pago_url) {
                          setErrors(prev => ({ ...prev, documento_pago_url: '' }));
                        }
                        toast.success('✅ Comprobante de pago cargado');
                      } catch (err) {
                        console.error('Error al procesar comprobante:', err);
                        toast.error(err instanceof Error ? err.message : '❌ Error al cargar comprobante');
                      } finally {
                        setUploadingDocument(false);
                      }
                    }
                  }}
                  className="hidden"
                  disabled={isSubmitting || uploadingDocument}
                />
                <label
                  htmlFor="comprobantePagoInput"
                  className={`flex items-center justify-center gap-2 p-2 border rounded cursor-pointer transition-colors ${
                    uploadingDocument
                      ? 'border-gray-300 bg-gray-100 cursor-not-allowed'
                      : errors.documento_pago_url 
                        ? 'border-red-500 bg-red-50 hover:bg-red-100' 
                        : 'border-green-300 bg-white hover:bg-green-50'
                  }`}
                >
                  <Upload className={`w-4 h-4 ${
                    uploadingDocument 
                      ? 'text-gray-400' 
                      : errors.documento_pago_url 
                        ? 'text-red-600' 
                        : 'text-green-600'
                  }`} />
                  <span className={`text-sm font-medium ${
                    uploadingDocument 
                      ? 'text-gray-500' 
                      : errors.documento_pago_url 
                        ? 'text-red-700' 
                        : 'text-green-700'
                  }`}>
                    {uploadingDocument ? 'Subiendo...' : 'Subir comprobante de pago (PDF o Imagen)'}
                  </span>
                </label>
                {errors.documento_pago_url && (
                  <p className="text-red-600 text-xs mt-1">{errors.documento_pago_url}</p>
                )}
                <p className="text-xs text-gray-600 mt-1">
                  Obligatorio para estado PAGADO. Se guardará como: ClaveEvento_ComprobantePago_V1_NombreArchivo
                </p>
              </div>
            ) : (
              <div className="flex items-center justify-between p-2 bg-white border border-green-300 rounded">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-green-700" />
                  <div>
                    <p className="text-sm font-semibold text-gray-900">
                      {formData.documento_pago_nombre}
                    </p>
                    <p className="text-xs text-green-600">
                      ✓ Comprobante cargado
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setFormData(prev => ({
                      ...prev,
                      documento_pago_url: '',
                      documento_pago_nombre: ''
                    }));
                    setComprobantePagoFile(null);
                  }}
                  className="px-2 py-1 text-xs text-red-700 hover:bg-red-100 rounded"
                  disabled={isSubmitting}
                >
                  Eliminar
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Estado del Ingreso - Informativo */}
        <div className="bg-white border rounded-lg p-4">
          <h4 className="font-medium text-gray-900 mb-3">Estado del Ingreso (Automático)</h4>
          
          {/* ℹ️ Mensaje informativo sobre el flujo */}
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-xs text-blue-800">
              <strong>📋 Flujo Automático:</strong>
              <br />1. <strong>Planeado</strong> - Ingreso creado sin documentos
              <br />2. <strong>Orden de Compra</strong> - Se adjunta orden de compra (opcional)
              <br />3. <strong>Facturado</strong> - Se adjuntan XML + PDF de la factura (obligatorio)
              <br />4. <strong>Pagado</strong> - Se adjunta comprobante de pago (obligatorio)
            </p>
          </div>
          
          {/* Estado actual */}
          <div className="p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm font-medium">Estado actual: </span>
                <span className={`font-bold ${
                  formData.estado_id === 4 ? 'text-green-600' :
                  formData.estado_id === 3 ? 'text-yellow-600' :
                  formData.estado_id === 2 ? 'text-indigo-600' : 'text-blue-600'
                }`}>
                  {formData.estado_id === 4 ? '✅ PAGADO' :
                   formData.estado_id === 3 ? '💰 FACTURADO' :
                   formData.estado_id === 2 ? '📄 ORDEN DE COMPRA' : '📋 PLANEADO'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {formData.archivo_adjunto && (
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                    ✓ Factura
                  </span>
                )}
                {formData.orden_compra_url && (
                  <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded">
                    ✓ Orden
                  </span>
                )}
                {formData.documento_pago_url && (
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                    ✓ Pagado
                  </span>
                )}
              </div>
            </div>
            
            {/* Información adicional según estado */}
            {formData.estado_id >= 3 && !formData.documento_pago_url && formData.fecha_compromiso_pago && (
              <div className="text-xs text-gray-500 mt-2">
                <strong>Compromiso de pago:</strong> {new Date(formData.fecha_compromiso_pago).toLocaleDateString('es-MX')}
              </div>
            )}
            {formData.estado_id < 3 && (
              <div className="text-xs text-yellow-700 mt-2 bg-yellow-50 p-2 rounded">
                ⚠️ Para cambiar a "Facturado", adjunta XML + PDF de la factura
              </div>
            )}
            {formData.estado_id === 3 && !formData.documento_pago_url && (
              <div className="text-xs text-yellow-700 mt-2 bg-yellow-50 p-2 rounded">
                ⚠️ Para cambiar a "Pagado", adjunta el comprobante de pago
              </div>
            )}
          </div>
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
            className="bg-green-500 hover:bg-green-600"
          >
            {(isSubmitting || isUploading) && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {income ? 'Actualizar' : 'Crear'} Ingreso
          </Button>
        </div>
      </form>
    </div>
  );
};