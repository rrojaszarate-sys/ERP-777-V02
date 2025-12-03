/**
 * FORMULARIO DE GASTOS - CON TEMA DINÁMICO
 * - Usa paleta de colores dinámica
 * - Estilo homogéneo con IncomeForm y ProvisionForm
 * - Soporte para Facturas (XML CFDI + PDF) y Tickets (imagen con OCR)
 * - Lógica homologada con IncomeForm y SimpleExpenseForm
 */
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  TrendingDown, FileText, Calculator, Loader2, Calendar,
  Upload, X, Save, Camera, DollarSign, Tag, Building2
} from 'lucide-react';
import { useTheme } from '../../../../shared/components/theme';
import { useFileUpload } from '../../hooks/useFileUpload';
import { useExpenseCategories } from '../../hooks/useFinances';
import { formatCurrency } from '../../../../shared/utils/formatters';
import { MEXICAN_CONFIG } from '../../../../core/config/constants';
import { Expense } from '../../types/Finance';
import { parseCFDIXml } from '../../utils/cfdiXmlParser';
import { processFileWithOCR } from '../../../ocr/services/dualOCRService';
import { supabase } from '../../../../core/config/supabase';
import { useAuth } from '../../../../core/auth/AuthProvider';
import toast from 'react-hot-toast';

// IVA desde config
const IVA_PORCENTAJE = MEXICAN_CONFIG.ivaRate;
const IVA_RATE = IVA_PORCENTAJE / 100;

interface ExpenseFormProps {
  expense?: Expense | null;
  eventId: string;
  onSave: (data: Partial<Expense>) => void;
  onCancel: () => void;
  className?: string;
}

// Componente de input de moneda
interface CurrencyInputProps {
  value: number;
  onChange: (value: number) => void;
  readOnly?: boolean;
  className?: string;
  placeholder?: string;
  style?: React.CSSProperties;
}

const CurrencyInput = ({ value, onChange, readOnly = false, className = '', placeholder = '', style }: CurrencyInputProps) => {
  const [displayValue, setDisplayValue] = useState('');

  const formatCurrencyDisplay = (num: number): string => {
    if (num === 0 || isNaN(num)) return '';
    return num.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const parseValue = (str: string): number => {
    const cleaned = str.replace(/[^0-9.]/g, '');
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? 0 : parsed;
  };

  useEffect(() => {
    setDisplayValue(value === 0 ? '' : formatCurrencyDisplay(value));
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value;
    const cleaned = input.replace(/[^0-9.,]/g, '');
    const normalized = cleaned.replace(/,/g, '.');
    const parts = normalized.split('.');
    let finalValue = parts[0];
    if (parts.length > 1) {
      finalValue += '.' + parts.slice(1).join('').substring(0, 2);
    }
    setDisplayValue(finalValue);
  };

  const handleBlur = () => {
    const numValue = parseValue(displayValue);
    onChange(numValue);
    setDisplayValue(numValue > 0 ? formatCurrencyDisplay(numValue) : '');
  };

  const handleFocus = () => {
    if (value > 0) setDisplayValue(value.toString());
  };

  return (
    <div className="relative">
      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
      <input
        type="text"
        inputMode="decimal"
        value={displayValue}
        onChange={handleChange}
        onBlur={handleBlur}
        onFocus={handleFocus}
        readOnly={readOnly}
        placeholder={placeholder || '0.00'}
        className={`w-full pl-9 pr-4 py-2.5 border-2 rounded-lg font-mono text-right transition-all ${className}`}
        style={style}
      />
    </div>
  );
};

export const ExpenseForm: React.FC<ExpenseFormProps> = ({
  expense,
  eventId,
  onSave,
  onCancel,
  className = ''
}) => {
  // Hook de tema para colores dinámicos
  const { paletteConfig, isDark } = useTheme();
  const { user } = useAuth();

  // Refs para inputs de archivos
  const xmlInputRef = useRef<HTMLInputElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);
  const ticketInputRef = useRef<HTMLInputElement>(null);

  // Estado para tipo de documento y archivos
  const [tipoDocumento, setTipoDocumento] = useState<'factura' | 'ticket' | null>(null);
  const [xmlFile, setXmlFile] = useState<File | null>(null);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [ticketFile, setTicketFile] = useState<File | null>(null);
  const [processingDoc, setProcessingDoc] = useState(false);

  // Colores dinámicos - Rojo para gastos
  const themeColors = useMemo(() => ({
    primary: '#EF4444', // Rojo para gastos
    primaryLight: '#FEE2E2',
    primaryDark: '#DC2626',
    bg: isDark ? '#1E293B' : '#FFFFFF',
    text: isDark ? '#F8FAFC' : '#1E293B',
    textSecondary: isDark ? '#CBD5E1' : '#64748B',
    border: isDark ? '#334155' : '#E2E8F0',
    accent: paletteConfig.accent
  }), [paletteConfig, isDark]);

  const [formData, setFormData] = useState({
    concepto: expense?.concepto || '',
    descripcion: expense?.descripcion || '',
    subtotal: expense?.subtotal || 0,
    iva: expense?.iva || 0,
    total: expense?.total || 0,
    retenciones: 0,
    iva_porcentaje: expense?.iva_porcentaje || IVA_PORCENTAJE,
    proveedor: expense?.proveedor || '',
    rfc_proveedor: expense?.rfc_proveedor || '',
    fecha_gasto: expense?.fecha_gasto || new Date().toISOString().split('T')[0],
    categoria_id: expense?.categoria_id || '',
    forma_pago: expense?.forma_pago || 'transferencia',
    referencia: expense?.referencia || '',
    archivo_adjunto: expense?.archivo_adjunto || '',
    archivo_nombre: expense?.archivo_nombre || '',
    pagado: true,
    comprobado: true
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorCuadre, setErrorCuadre] = useState<string | null>(null);

  const { uploadFile, isUploading } = useFileUpload();
  const { data: categories } = useExpenseCategories();

  // Validar cuadre fiscal
  useEffect(() => {
    const calculado = Math.round((formData.subtotal + formData.iva - formData.retenciones) * 100) / 100;
    const diferencia = Math.abs(calculado - formData.total);
    if (formData.total > 0 && diferencia > 0.01) {
      setErrorCuadre(`No cuadra: $${formData.subtotal.toFixed(2)} + $${formData.iva.toFixed(2)} - $${formData.retenciones.toFixed(2)} = $${calculado.toFixed(2)}, pero Total es $${formData.total.toFixed(2)}`);
    } else {
      setErrorCuadre(null);
    }
  }, [formData.subtotal, formData.iva, formData.total, formData.retenciones]);

  // Calcular IVA desde subtotal
  const calcularIvaDesdeSubtotal = useCallback(() => {
    if (formData.subtotal > 0) {
      const nuevoIva = Math.round(formData.subtotal * IVA_RATE * 100) / 100;
      const nuevoTotal = Math.round((formData.subtotal + nuevoIva - formData.retenciones) * 100) / 100;
      setFormData(prev => ({ ...prev, iva: nuevoIva, total: nuevoTotal }));
      toast.success(`IVA calculado: $${nuevoIva.toFixed(2)} (${IVA_PORCENTAJE}%)`);
    }
  }, [formData.subtotal, formData.retenciones]);

  // Calcular total
  const calcularTotal = useCallback(() => {
    const nuevoTotal = Math.round((formData.subtotal + formData.iva - formData.retenciones) * 100) / 100;
    setFormData(prev => ({ ...prev, total: nuevoTotal }));
    toast.success(`Total calculado: $${nuevoTotal.toFixed(2)}`);
  }, [formData.subtotal, formData.iva, formData.retenciones]);

  // ============================================================================
  // PROCESAMIENTO DE DOCUMENTOS - HOMOLOGADO CON INCOMEFORM Y SIMPLEEXPENSEFORM
  // ============================================================================
  // 1. FACTURA: XML CFDI + PDF (procesar XML, adjuntar PDF)
  // 2. TICKET: Solo imagen (procesar con OCR)
  // ============================================================================

  // Seleccionar archivo XML para factura
  const handleXMLSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.xml')) {
      toast.error('Solo se permiten archivos XML');
      return;
    }

    setXmlFile(file);
    setTipoDocumento('factura');
    // Limpiar ticket si había uno
    setTicketFile(null);
    toast.success('XML seleccionado - Ahora suba el PDF');
  };

  // Seleccionar PDF para factura
  const handlePDFSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      toast.error('Solo se permiten archivos PDF');
      return;
    }

    setPdfFile(file);
    toast.success('PDF seleccionado');
  };

  // Seleccionar imagen de ticket
  const handleTicketSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      toast.error('Solo se permiten imágenes (JPG, PNG, WEBP) para tickets');
      return;
    }

    setTicketFile(file);
    setTipoDocumento('ticket');
    // Limpiar factura si había una
    setXmlFile(null);
    setPdfFile(null);
    toast.success('Imagen de ticket seleccionada');
  };

  // Procesar XML CFDI (para facturas)
  const processXMLCFDI = async (xmlFileToProcess: File) => {
    try {
      const text = await xmlFileToProcess.text();
      const cfdiData = await parseCFDIXml(text);

      if (cfdiData) {
        setFormData(prev => ({
          ...prev,
          concepto: cfdiData.concepto || prev.concepto,
          proveedor: cfdiData.emisor?.nombre || prev.proveedor,
          rfc_proveedor: cfdiData.emisor?.rfc || prev.rfc_proveedor,
          fecha_gasto: cfdiData.fecha?.split('T')[0] || prev.fecha_gasto,
          subtotal: cfdiData.subtotal || prev.subtotal,
          iva: cfdiData.iva || prev.iva,
          total: cfdiData.total || prev.total,
        }));

        toast.success(`XML procesado: ${cfdiData.emisor?.nombre} - $${cfdiData.total?.toFixed(2)}`);
      }
    } catch (error: any) {
      console.error('Error procesando XML:', error);
      toast.error(`Error procesando XML: ${error.message}`);
    }
  };

  // Procesar ticket con OCR
  const processTicketOCR = async (file: File) => {
    setProcessingDoc(true);
    toast.loading('Procesando ticket con OCR...', { id: 'ocr' });

    try {
      // Subir archivo a Supabase Storage
      const fileName = `${Date.now()}_${file.name}`;
      const filePath = `comprobantes/${user?.company_id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('documentos')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Obtener URL pública
      const { data: urlData } = supabase.storage
        .from('documentos')
        .getPublicUrl(filePath);

      setFormData(prev => ({
        ...prev,
        archivo_adjunto: urlData.publicUrl,
        archivo_nombre: file.name
      }));

      // Procesar con OCR
      const ocrResult = await processFileWithOCR(file);

      if (ocrResult) {
        setFormData(prev => ({
          ...prev,
          concepto: ocrResult.concepto_sugerido || prev.concepto,
          proveedor: ocrResult.establecimiento || prev.proveedor,
          rfc_proveedor: ocrResult.rfc || prev.rfc_proveedor,
          fecha_gasto: ocrResult.fecha || prev.fecha_gasto,
          subtotal: ocrResult.subtotal || prev.subtotal,
          iva: ocrResult.iva || prev.iva,
          total: ocrResult.total || prev.total,
        }));
        toast.success('Datos extraídos del ticket', { id: 'ocr' });
      } else {
        toast.success('Ticket subido (sin datos OCR)', { id: 'ocr' });
      }
    } catch (error: any) {
      console.error('Error procesando ticket:', error);
      toast.error('Error al procesar ticket', { id: 'ocr' });
    } finally {
      setProcessingDoc(false);
    }
  };

  // Procesar documentos según el tipo seleccionado
  const processDocuments = async () => {
    if (tipoDocumento === 'factura') {
      if (!xmlFile) {
        toast.error('Se requiere el XML CFDI para facturas');
        return;
      }

      setProcessingDoc(true);
      try {
        // Procesar XML
        await processXMLCFDI(xmlFile);

        // Subir PDF si existe
        if (pdfFile) {
          const fileName = `${Date.now()}_${pdfFile.name}`;
          const filePath = `comprobantes/${user?.company_id}/${fileName}`;

          const { error: uploadError } = await supabase.storage
            .from('documentos')
            .upload(filePath, pdfFile);

          if (uploadError) throw uploadError;

          const { data: urlData } = supabase.storage
            .from('documentos')
            .getPublicUrl(filePath);

          setFormData(prev => ({
            ...prev,
            archivo_adjunto: urlData.publicUrl,
            archivo_nombre: pdfFile.name
          }));
          toast.success('XML procesado + PDF adjunto');
        }
      } catch (error: any) {
        console.error('Error procesando factura:', error);
        toast.error(`Error: ${error.message}`);
      } finally {
        setProcessingDoc(false);
      }
    } else if (tipoDocumento === 'ticket') {
      if (!ticketFile) {
        toast.error('Se requiere una imagen del ticket');
        return;
      }
      await processTicketOCR(ticketFile);
    } else {
      toast.error('Seleccione un tipo de documento (Factura o Ticket)');
    }
  };

  // Limpiar documentos
  const clearDocuments = () => {
    setTipoDocumento(null);
    setXmlFile(null);
    setPdfFile(null);
    setTicketFile(null);
    setFormData(prev => ({
      ...prev,
      archivo_adjunto: '',
      archivo_nombre: ''
    }));
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }));
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.concepto.trim()) newErrors.concepto = 'Concepto requerido';
    if (formData.total <= 0) newErrors.total = 'Total debe ser mayor a 0';
    if (!formData.categoria_id) newErrors.categoria_id = 'Categoría requerida';
    if (!formData.fecha_gasto) newErrors.fecha_gasto = 'Fecha requerida';

    // Validar RFC si se proporciona
    if (formData.rfc_proveedor) {
      const rfcMoral = /^[A-Z&Ñ]{3}[0-9]{6}[A-Z0-9]{3}$/;
      const rfcFisica = /^[A-Z&Ñ]{4}[0-9]{6}[A-Z0-9]{3}$/;
      const rfcClean = formData.rfc_proveedor.toUpperCase().trim();
      if (!rfcMoral.test(rfcClean) && !rfcFisica.test(rfcClean)) {
        newErrors.rfc_proveedor = 'RFC inválido';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!validateForm()) return;

    // Validar cuadre
    const totalCalculado = Math.round((formData.subtotal + formData.iva - formData.retenciones) * 100) / 100;
    if (Math.abs(totalCalculado - formData.total) > 0.01) {
      toast.error('Los montos no cuadran');
      return;
    }

    setIsSubmitting(true);
    try {
      const dataToSave = {
        ...formData,
        evento_id: eventId,
        precio_unitario: formData.total,
        cantidad: 1,
        updated_at: new Date().toISOString()
      };
      onSave(dataToSave);
    } catch (error) {
      toast.error('Error al guardar');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className={`rounded-xl shadow-lg overflow-hidden ${className}`}
      style={{ backgroundColor: themeColors.bg }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-6 py-4 border-b"
        style={{
          background: `linear-gradient(135deg, ${themeColors.primary} 0%, ${themeColors.primaryDark} 100%)`,
          borderColor: themeColors.border
        }}
      >
        <div className="flex items-center gap-3">
          <TrendingDown className="w-6 h-6 text-white" />
          <h2 className="text-xl font-semibold text-white">
            {expense ? 'Editar Gasto' : 'Nuevo Gasto'}
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleSubmit()}
            disabled={isSubmitting}
            className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-white font-medium"
          >
            {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
            <span className="hidden sm:inline">Guardar</span>
          </button>
          <button onClick={onCancel} className="p-2 hover:bg-white/20 rounded-lg">
            <X className="w-5 h-5 text-white" />
          </button>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">

        {/* ============================================================== */}
        {/* ZONA DE DOCUMENTOS - HOMOLOGADA CON INCOMEFORM */}
        {/* ============================================================== */}
        <div className="border-2 rounded-lg p-4" style={{ borderColor: themeColors.primary }}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold uppercase tracking-wide" style={{ color: themeColors.primary }}>
              Tipo de Documento
            </h3>
            {tipoDocumento && (
              <button
                type="button"
                onClick={clearDocuments}
                className="text-xs text-red-500 hover:text-red-700"
              >
                Limpiar
              </button>
            )}
          </div>

          {/* Selector de tipo de documento */}
          {!tipoDocumento ? (
            <div className="grid grid-cols-2 gap-3">
              {/* Opción: Factura (XML + PDF) */}
              <button
                type="button"
                onClick={() => {
                  setTipoDocumento('factura');
                  xmlInputRef.current?.click();
                }}
                className="flex flex-col items-center justify-center gap-2 p-4 border-2 border-dashed rounded-lg hover:bg-blue-50 transition-colors"
                style={{ borderColor: '#3B82F6' }}
              >
                <FileText className="w-8 h-8 text-blue-600" />
                <span className="font-medium text-blue-600">Factura</span>
                <span className="text-xs text-gray-500">XML CFDI + PDF</span>
              </button>
              <input
                ref={xmlInputRef}
                type="file"
                accept=".xml"
                onChange={handleXMLSelect}
                className="hidden"
              />

              {/* Opción: Ticket (imagen con OCR) */}
              <button
                type="button"
                onClick={() => {
                  setTipoDocumento('ticket');
                  ticketInputRef.current?.click();
                }}
                className="flex flex-col items-center justify-center gap-2 p-4 border-2 border-dashed rounded-lg hover:bg-amber-50 transition-colors"
                style={{ borderColor: '#F59E0B' }}
              >
                <Camera className="w-8 h-8 text-amber-600" />
                <span className="font-medium text-amber-600">Ticket</span>
                <span className="text-xs text-gray-500">Imagen con OCR</span>
              </button>
              <input
                ref={ticketInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleTicketSelect}
                className="hidden"
              />
            </div>
          ) : tipoDocumento === 'factura' ? (
            /* Vista para FACTURA */
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                {/* XML */}
                <div className={`p-3 border-2 rounded-lg ${xmlFile ? 'bg-blue-50 border-blue-300' : 'border-dashed'}`}
                  style={{ borderColor: xmlFile ? '#3B82F6' : themeColors.border }}>
                  <label className="block text-xs font-medium mb-1 text-blue-600">XML CFDI *</label>
                  {!xmlFile ? (
                    <button
                      type="button"
                      onClick={() => xmlInputRef.current?.click()}
                      className="w-full flex items-center justify-center gap-2 p-2 rounded hover:bg-gray-50"
                    >
                      <Upload className="w-4 h-4 text-blue-600" />
                      <span className="text-sm text-blue-600">Seleccionar XML</span>
                    </button>
                  ) : (
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-blue-600" />
                      <span className="text-sm text-blue-700 truncate">{xmlFile.name}</span>
                      <button type="button" onClick={() => setXmlFile(null)} className="text-red-500 text-xs">✕</button>
                    </div>
                  )}
                </div>

                {/* PDF */}
                <div className={`p-3 border-2 rounded-lg ${pdfFile ? 'bg-green-50 border-green-300' : 'border-dashed'}`}
                  style={{ borderColor: pdfFile ? '#10B981' : themeColors.border }}>
                  <label className="block text-xs font-medium mb-1 text-green-600">PDF Factura</label>
                  {!pdfFile ? (
                    <button
                      type="button"
                      onClick={() => pdfInputRef.current?.click()}
                      className="w-full flex items-center justify-center gap-2 p-2 rounded hover:bg-gray-50"
                    >
                      <Upload className="w-4 h-4 text-green-600" />
                      <span className="text-sm text-green-600">Seleccionar PDF</span>
                    </button>
                  ) : (
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-green-600" />
                      <span className="text-sm text-green-700 truncate">{pdfFile.name}</span>
                      <button type="button" onClick={() => setPdfFile(null)} className="text-red-500 text-xs">✕</button>
                    </div>
                  )}
                  <input
                    ref={pdfInputRef}
                    type="file"
                    accept=".pdf"
                    onChange={handlePDFSelect}
                    className="hidden"
                  />
                </div>
              </div>

              {xmlFile && (
                <button
                  type="button"
                  onClick={processDocuments}
                  disabled={processingDoc}
                  className="w-full py-2.5 rounded-lg font-medium text-white flex items-center justify-center gap-2"
                  style={{ backgroundColor: '#3B82F6' }}
                >
                  {processingDoc ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Calculator className="w-4 h-4" />
                  )}
                  {processingDoc ? 'Procesando...' : 'Procesar Factura'}
                </button>
              )}
            </div>
          ) : (
            /* Vista para TICKET */
            <div className="space-y-3">
              <div className={`p-3 border-2 rounded-lg ${ticketFile ? 'bg-amber-50 border-amber-300' : 'border-dashed'}`}
                style={{ borderColor: ticketFile ? '#F59E0B' : themeColors.border }}>
                <label className="block text-xs font-medium mb-1 text-amber-600">Imagen del Ticket *</label>
                {!ticketFile ? (
                  <button
                    type="button"
                    onClick={() => ticketInputRef.current?.click()}
                    className="w-full flex items-center justify-center gap-2 p-3 rounded hover:bg-gray-50"
                  >
                    <Camera className="w-5 h-5 text-amber-600" />
                    <span className="text-sm text-amber-600">Seleccionar imagen (JPG, PNG)</span>
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <Camera className="w-4 h-4 text-amber-600" />
                    <span className="text-sm text-amber-700 truncate">{ticketFile.name}</span>
                    <button type="button" onClick={() => setTicketFile(null)} className="text-red-500 text-xs">✕</button>
                  </div>
                )}
              </div>

              {ticketFile && (
                <button
                  type="button"
                  onClick={processDocuments}
                  disabled={processingDoc}
                  className="w-full py-2.5 rounded-lg font-medium text-white flex items-center justify-center gap-2"
                  style={{ backgroundColor: '#F59E0B' }}
                >
                  {processingDoc ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Camera className="w-4 h-4" />
                  )}
                  {processingDoc ? 'Procesando OCR...' : 'Procesar Ticket con OCR'}
                </button>
              )}
            </div>
          )}

          {/* Archivo adjunto procesado */}
          {formData.archivo_adjunto && (
            <div className="mt-3 flex items-center gap-2 p-2 bg-green-50 rounded-lg border border-green-200">
              <FileText className="w-4 h-4 text-green-600" />
              <span className="text-sm text-green-700 truncate flex-1">{formData.archivo_nombre}</span>
              <a href={formData.archivo_adjunto} target="_blank" className="text-sm text-blue-600 hover:underline">
                Ver
              </a>
            </div>
          )}
        </div>

        {/* Proveedor y Categoría */}
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wide mb-3" style={{ color: themeColors.primary }}>
            Proveedor y Categoría
          </h3>
          <div className="grid grid-cols-2 gap-4">
            {/* Proveedor */}
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: themeColors.text }}>
                <Building2 className="w-4 h-4 inline mr-1" />Proveedor
              </label>
              <input
                type="text"
                value={formData.proveedor}
                onChange={(e) => handleInputChange('proveedor', e.target.value)}
                placeholder="Nombre del proveedor"
                className="w-full px-4 py-2.5 border-2 rounded-lg"
                style={{ borderColor: themeColors.border, backgroundColor: themeColors.bg, color: themeColors.text }}
              />
            </div>

            {/* RFC */}
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: themeColors.text }}>
                RFC Proveedor
              </label>
              <input
                type="text"
                value={formData.rfc_proveedor}
                onChange={(e) => handleInputChange('rfc_proveedor', e.target.value.toUpperCase())}
                placeholder="ABC123456XYZ"
                maxLength={13}
                className="w-full px-4 py-2.5 border-2 rounded-lg uppercase"
                style={{ borderColor: errors.rfc_proveedor ? '#EF4444' : themeColors.border, backgroundColor: themeColors.bg, color: themeColors.text }}
              />
              {errors.rfc_proveedor && <p className="text-red-500 text-xs mt-1">{errors.rfc_proveedor}</p>}
            </div>
          </div>

          {/* Categoría */}
          <div className="mt-4">
            <label className="block text-sm font-medium mb-1" style={{ color: themeColors.text }}>
              <Tag className="w-4 h-4 inline mr-1" />Categoría *
            </label>
            <select
              value={formData.categoria_id}
              onChange={(e) => handleInputChange('categoria_id', e.target.value)}
              className="w-full px-4 py-2.5 border-2 rounded-lg"
              style={{ borderColor: errors.categoria_id ? '#EF4444' : themeColors.border, backgroundColor: themeColors.bg, color: themeColors.text }}
            >
              <option value="">Seleccionar categoría...</option>
              {categories?.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.nombre}</option>
              ))}
            </select>
            {errors.categoria_id && <p className="text-red-500 text-xs mt-1">{errors.categoria_id}</p>}
          </div>
        </div>

        {/* Concepto */}
        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: themeColors.text }}>
            Concepto *
          </label>
          <input
            type="text"
            value={formData.concepto}
            onChange={(e) => handleInputChange('concepto', e.target.value)}
            placeholder="Descripción del gasto"
            className="w-full px-4 py-2.5 border-2 rounded-lg"
            style={{ borderColor: errors.concepto ? '#EF4444' : themeColors.border, backgroundColor: themeColors.bg, color: themeColors.text }}
          />
          {errors.concepto && <p className="text-red-500 text-xs mt-1">{errors.concepto}</p>}
        </div>

        {/* Montos */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold uppercase tracking-wide" style={{ color: themeColors.primary }}>
              Montos
            </h3>
            {formData.total > 0 && (
              <span className={`px-3 py-1 rounded-lg text-sm font-medium ${errorCuadre ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                {errorCuadre ? 'No cuadra' : 'Cuadre OK'}
              </span>
            )}
          </div>

          <div className="p-2 rounded-lg text-xs text-center mb-3" style={{ backgroundColor: themeColors.primaryLight, color: themeColors.primaryDark }}>
            <strong>Fórmula:</strong> Total = Subtotal + IVA - Retenciones
          </div>

          <div className="grid grid-cols-5 gap-3">
            {/* Subtotal */}
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: themeColors.text }}>Subtotal *</label>
              <CurrencyInput
                value={formData.subtotal}
                onChange={(v) => handleInputChange('subtotal', v)}
                style={{ borderColor: themeColors.border, backgroundColor: themeColors.bg, color: themeColors.text }}
              />
            </div>

            {/* IVA */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-medium" style={{ color: themeColors.text }}>IVA</label>
                <button type="button" onClick={calcularIvaDesdeSubtotal}
                  className="px-2 py-0.5 rounded text-xs font-medium"
                  style={{ backgroundColor: themeColors.primaryLight, color: themeColors.primaryDark }}>
                  <Calculator className="w-3 h-3 inline mr-1" />{IVA_PORCENTAJE}%
                </button>
              </div>
              <CurrencyInput
                value={formData.iva}
                onChange={(v) => handleInputChange('iva', v)}
                style={{ borderColor: themeColors.border, backgroundColor: themeColors.bg, color: themeColors.text }}
              />
            </div>

            {/* Retenciones */}
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: themeColors.text }}>Retenciones</label>
              <CurrencyInput
                value={formData.retenciones}
                onChange={(v) => handleInputChange('retenciones', v)}
                style={{ borderColor: themeColors.border, backgroundColor: themeColors.bg, color: themeColors.text }}
              />
            </div>

            {/* Total */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-medium" style={{ color: themeColors.text }}>Total *</label>
                <button type="button" onClick={calcularTotal}
                  className="px-2 py-0.5 rounded text-xs font-medium"
                  style={{ backgroundColor: themeColors.primaryLight, color: themeColors.primaryDark }}>
                  <Calculator className="w-3 h-3 inline mr-1" />Calc
                </button>
              </div>
              <CurrencyInput
                value={formData.total}
                onChange={(v) => handleInputChange('total', v)}
                className="font-bold"
                style={{
                  borderColor: errorCuadre ? '#EF4444' : '#10B981',
                  backgroundColor: errorCuadre ? '#FEF2F2' : '#F0FDF4',
                  color: errorCuadre ? '#EF4444' : '#10B981'
                }}
              />
            </div>

            {/* Fecha */}
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: themeColors.text }}>Fecha *</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="date"
                  value={formData.fecha_gasto}
                  onChange={(e) => handleInputChange('fecha_gasto', e.target.value)}
                  className="w-full pl-9 pr-2 py-2.5 border-2 rounded-lg"
                  style={{ borderColor: themeColors.border, backgroundColor: themeColors.bg, color: themeColors.text }}
                />
              </div>
            </div>
          </div>

          {errorCuadre && (
            <div className="mt-2 p-2 rounded-lg text-sm bg-red-100 text-red-600">{errorCuadre}</div>
          )}
        </div>

        {/* Forma de Pago */}
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wide mb-3" style={{ color: themeColors.primary }}>
            Pago
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: themeColors.text }}>Forma de Pago</label>
              <select
                value={formData.forma_pago}
                onChange={(e) => handleInputChange('forma_pago', e.target.value)}
                className="w-full px-4 py-2.5 border-2 rounded-lg"
                style={{ borderColor: themeColors.border, backgroundColor: themeColors.bg, color: themeColors.text }}
              >
                <option value="efectivo">Efectivo</option>
                <option value="transferencia">Transferencia</option>
                <option value="cheque">Cheque</option>
                <option value="tarjeta">Tarjeta</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: themeColors.text }}>Referencia</label>
              <input
                type="text"
                value={formData.referencia}
                onChange={(e) => handleInputChange('referencia', e.target.value)}
                placeholder="Número de factura, folio, etc."
                className="w-full px-4 py-2.5 border-2 rounded-lg"
                style={{ borderColor: themeColors.border, backgroundColor: themeColors.bg, color: themeColors.text }}
              />
            </div>
          </div>
        </div>

        {/* Descripción */}
        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: themeColors.text }}>
            Descripción (opcional)
          </label>
          <textarea
            value={formData.descripcion}
            onChange={(e) => handleInputChange('descripcion', e.target.value)}
            rows={2}
            placeholder="Detalles adicionales..."
            className="w-full px-4 py-2.5 border-2 rounded-lg resize-none"
            style={{ borderColor: themeColors.border, backgroundColor: themeColors.bg, color: themeColors.text }}
          />
        </div>
      </form>

      {/* Footer */}
      <div
        className="flex justify-between items-center px-6 py-4 border-t"
        style={{ backgroundColor: `${themeColors.border}30`, borderColor: themeColors.border }}
      >
        <div className="text-sm" style={{ color: themeColors.textSecondary }}>
          IVA: {IVA_PORCENTAJE}% | Total: {formatCurrency(formData.total)}
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-6 py-2.5 border-2 rounded-lg font-medium transition-colors hover:bg-gray-100"
            style={{ borderColor: themeColors.border, color: themeColors.text }}
          >
            Cancelar
          </button>
          <button
            onClick={() => handleSubmit()}
            disabled={isSubmitting}
            className="px-8 py-2.5 rounded-lg font-medium flex items-center gap-2 text-white disabled:opacity-50"
            style={{ backgroundColor: themeColors.primary }}
          >
            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {expense ? 'Actualizar' : 'Crear Gasto'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExpenseForm;
