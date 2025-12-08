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
import { useSATValidation } from '../../hooks/useSATValidation';
import SATStatusBadge, { SATAlertBox } from '../ui/SATStatusBadge';
import { validarQRvsXML, ResultadoValidacionQR, validarPDFConSAT, ResultadoValidacionPDFSAT } from '../../../../services/qrValidationService';
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
      <DollarSign className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
      <input
        type="text"
        inputMode="decimal"
        value={displayValue}
        onChange={handleChange}
        onBlur={handleBlur}
        onFocus={handleFocus}
        readOnly={readOnly}
        placeholder={placeholder || '0.00'}
        className={`w-full pl-7 pr-2 py-1.5 border rounded font-mono text-right transition-all ${className}`}
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

  // Hook de validación SAT
  const { validar: validarSAT, resultado: resultadoSAT, isValidating: validandoSAT, resetear: resetearSAT } = useSATValidation();

  // Estado para datos CFDI necesarios para validación SAT
  const [cfdiData, setCfdiData] = useState<{
    rfcEmisor?: string;
    rfcReceptor?: string;
    total?: number;
    uuid?: string;
  }>({});

  // Estado para validación QR vs XML
  const [resultadoQR, setResultadoQR] = useState<ResultadoValidacionQR | null>(null);
  const [validandoQR, setValidandoQR] = useState(false);

  // Estado para validación de PDF solo (sin XML)
  const [validandoPDFSolo, setValidandoPDFSolo] = useState(false);
  const [resultadoPDFSAT, setResultadoPDFSAT] = useState<ResultadoValidacionPDFSAT | null>(null);

  // Refs para inputs de archivos
  const xmlInputRef = useRef<HTMLInputElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);
  const ticketInputRef = useRef<HTMLInputElement>(null);
  const pdfSoloInputRef = useRef<HTMLInputElement>(null);

  // Estado para tipo de documento y archivos (HOMOLOGADO con GastoFormModal)
  const [tipoDocumento, setTipoDocumento] = useState<'factura' | 'ticket' | null>(null);
  const [ticketFile, setTicketFile] = useState<File | null>(null);
  const [processingDoc, setProcessingDoc] = useState(false);

  // 🆕 Estados para nueva interfaz de factura (archivos pendientes antes de procesar)
  const [pendingXmlFile, setPendingXmlFile] = useState<File | null>(null);
  const [pendingPdfFile, setPendingPdfFile] = useState<File | null>(null);
  const [procesandoFactura, setProcesandoFactura] = useState(false);
  const [etapaProceso, setEtapaProceso] = useState<string>('');
  const [lastProcessedMethod, setLastProcessedMethod] = useState<'xml' | 'ocr' | null>(null);

  // 🆕 Estados para indicadores de carga
  const [cargandoXml, setCargandoXml] = useState(false);
  const [cargandoPdf, setCargandoPdf] = useState(false);

  // Colores dinámicos - Usa la paleta configurada
  const themeColors = useMemo(() => ({
    primary: paletteConfig.primary,
    primaryLight: paletteConfig.shades[100],
    primaryDark: paletteConfig.shades[700],
    bg: isDark ? '#1E293B' : '#FFFFFF',
    bgCard: isDark ? '#0F172A' : '#F8FAFC',
    text: isDark ? '#F8FAFC' : '#1E293B',
    textSecondary: isDark ? '#CBD5E1' : '#64748B',
    textMuted: isDark ? '#94A3B8' : '#9CA3AF',
    border: isDark ? '#334155' : '#E2E8F0',
    accent: paletteConfig.accent,
    secondary: paletteConfig.secondary,
    // Colores sobrios para filas alternadas (blanco/gris muy tenue + hover menta)
    rowEven: isDark ? '#1E293B' : '#FFFFFF',
    rowOdd: isDark ? '#263244' : '#F8FAFC',
    rowHover: isDark ? '#334155' : '#E0F2F1',
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
  // PROCESAMIENTO DE DOCUMENTOS - HOMOLOGADO CON GastoFormModal
  // ============================================================================
  // 1. FACTURA: XML CFDI + PDF (archivos pendientes → procesar)
  // 2. TICKET: Solo imagen (procesar con OCR)
  // ============================================================================

  // Limpiar archivos pendientes
  const limpiarArchivosPendientes = () => {
    setPendingXmlFile(null);
    setPendingPdfFile(null);
    setEtapaProceso('');
    setProcesandoFactura(false);
  };

  // Seleccionar archivo XML para factura (solo guarda como pendiente)
  const handleXMLSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.xml')) {
      toast.error('Solo se permiten archivos XML');
      return;
    }

    setPendingXmlFile(file);
    setTipoDocumento('factura');
    setTicketFile(null);
    toast.success(`XML seleccionado: ${file.name}`);
  };

  // Seleccionar PDF para factura (solo guarda como pendiente)
  const handlePDFSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      toast.error('Solo se permiten archivos PDF');
      return;
    }

    setPendingPdfFile(file);
    toast.success(`PDF seleccionado: ${file.name}`);
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
    limpiarArchivosPendientes();
    toast.success('Imagen de ticket seleccionada');
  };

  // Procesar XML CFDI (para facturas) + Validación SAT
  const processXMLCFDI = async (xmlFileToProcess: File): Promise<boolean> => {
    try {
      const text = await xmlFileToProcess.text();
      const parsedCfdi = await parseCFDIXml(text);

      if (parsedCfdi) {
        // Actualizar formulario con datos del CFDI
        setFormData(prev => ({
          ...prev,
          concepto: parsedCfdi.conceptos?.[0]?.descripcion || prev.concepto,
          proveedor: parsedCfdi.emisor?.nombre || prev.proveedor,
          rfc_proveedor: parsedCfdi.emisor?.rfc || prev.rfc_proveedor,
          fecha_gasto: parsedCfdi.fecha?.split('T')[0] || prev.fecha_gasto,
          subtotal: parsedCfdi.subtotal || prev.subtotal,
          iva: parsedCfdi.impuestos?.totalTraslados || prev.iva,
          total: parsedCfdi.total || prev.total,
        }));

        // Guardar datos CFDI para validación SAT
        const cfdiValidationData = {
          rfcEmisor: parsedCfdi.emisor?.rfc,
          rfcReceptor: parsedCfdi.receptor?.rfc,
          total: parsedCfdi.total,
          uuid: parsedCfdi.timbreFiscal?.uuid
        };
        setCfdiData(cfdiValidationData);

        toast.success(`XML procesado: ${parsedCfdi.emisor?.nombre} - $${parsedCfdi.total?.toFixed(2)}`);

        // ============================================================
        // VALIDACIÓN SAT - OBLIGATORIA PARA FACTURAS
        // ============================================================
        if (cfdiValidationData.uuid && cfdiValidationData.rfcEmisor && cfdiValidationData.rfcReceptor && cfdiValidationData.total) {
          toast.loading('Validando factura con SAT...', { id: 'sat' });

          const satResult = await validarSAT({
            rfcEmisor: cfdiValidationData.rfcEmisor,
            rfcReceptor: cfdiValidationData.rfcReceptor,
            total: cfdiValidationData.total,
            uuid: cfdiValidationData.uuid
          });

          toast.dismiss('sat');

          if (satResult.esCancelada) {
            toast.error('FACTURA CANCELADA - No se puede registrar este gasto', { duration: 5000 });
            return false;
          } else if (satResult.noEncontrada) {
            toast.error('FACTURA NO ENCONTRADA EN SAT - Posible factura apócrifa', { duration: 5000 });
            return false;
          } else if (satResult.esValida) {
            toast.success('Factura vigente en SAT', { duration: 3000 });
            return true;
          } else if (!satResult.success && satResult.permitirGuardar) {
            toast.error(`Advertencia: ${satResult.mensaje}`, { duration: 4000 });
            return true; // Permitir con advertencia si hay error de conexión
          }
        } else {
          console.warn('No se pudo validar SAT: faltan datos del CFDI');
          toast.error('No se pudo validar con SAT: UUID o RFCs no encontrados en el XML');
        }

        return true;
      }
      return false;
    } catch (error: any) {
      console.error('Error procesando XML:', error);
      toast.error(`Error procesando XML: ${error.message}`);
      return false;
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

  // =============================================
  // 🆕 FUNCIÓN UNIFICADA: PROCESAR FACTURA COMPLETA
  // (HOMOLOGADA con GastoFormModal)
  // =============================================
  /**
   * Procesa XML + PDF en un solo paso:
   * 1. Parsea el XML CFDI
   * 2. Valida con SAT
   * 3. Si hay PDF, valida QR vs XML
   * 4. Rellena el formulario con los datos
   */
  const procesarFacturaCompleta = async () => {
    if (!pendingXmlFile) {
      toast.error('Selecciona un archivo XML CFDI');
      return;
    }

    setProcesandoFactura(true);
    setEtapaProceso('Leyendo XML...');
    resetearSAT();
    setResultadoQR(null);

    try {
      // PASO 1: Leer y parsear XML
      console.log('📄 Procesando XML CFDI:', pendingXmlFile.name);
      const xmlContent = await pendingXmlFile.text();

      setEtapaProceso('Extrayendo datos del CFDI...');
      const parsedCfdi = await parseCFDIXml(xmlContent);

      if (!parsedCfdi) {
        throw new Error('No se pudo parsear el XML CFDI');
      }

      console.log('✅ CFDI parseado:', parsedCfdi.emisor?.nombre, '- Total:', parsedCfdi.total);

      // Extraer datos para validación
      const uuid = parsedCfdi.timbreFiscal?.uuid || '';
      const rfcEmisor = parsedCfdi.emisor?.rfc || '';
      const rfcReceptor = parsedCfdi.receptor?.rfc || '';
      const total = parsedCfdi.total || 0;

      // Guardar datos CFDI para referencia
      setCfdiData({ rfcEmisor, rfcReceptor, total, uuid });

      // Actualizar formulario con datos del CFDI
      setFormData(prev => ({
        ...prev,
        concepto: parsedCfdi.conceptos?.[0]?.descripcion || prev.concepto,
        proveedor: parsedCfdi.emisor?.nombre || prev.proveedor,
        rfc_proveedor: parsedCfdi.emisor?.rfc || prev.rfc_proveedor,
        fecha_gasto: parsedCfdi.fecha?.split('T')[0] || prev.fecha_gasto,
        subtotal: parsedCfdi.subtotal || prev.subtotal,
        iva: parsedCfdi.impuestos?.totalTraslados || prev.iva,
        total: parsedCfdi.total || prev.total,
        referencia: uuid ? uuid.substring(0, 8) : prev.referencia
      }));

      // PASO 2: Validar con SAT
      if (uuid && rfcEmisor && rfcReceptor) {
        setEtapaProceso('Validando con SAT...');

        const satResult = await validarSAT({ rfcEmisor, rfcReceptor, total, uuid });

        console.log('📋 Resultado SAT:', satResult);

        if (satResult.esCancelada) {
          toast.error('❌ FACTURA CANCELADA EN SAT\n\nNo se puede registrar esta factura.', { duration: 6000 });
          setProcesandoFactura(false);
          setEtapaProceso('');
          return;
        }

        if (satResult.noEncontrada) {
          toast.error('⚠️ FACTURA NO ENCONTRADA EN SAT\n\nPosible factura apócrifa.', { duration: 6000 });
          // Continuar pero con advertencia
        }

        if (satResult.esValida) {
          toast.success('✅ Factura verificada con SAT - VIGENTE', { duration: 3000 });
        }
      }

      // PASO 3: Validar QR del PDF vs XML (si hay PDF)
      if (pendingPdfFile && uuid && rfcEmisor && rfcReceptor) {
        setEtapaProceso('Validando QR del PDF...');
        setValidandoQR(true);

        const qrResult = await validarQRvsXML(pendingPdfFile, {
          uuid, rfcEmisor, rfcReceptor, total
        });

        setResultadoQR(qrResult);
        setValidandoQR(false);

        if (qrResult.bloqueante && !qrResult.esValida) {
          toast.error('❌ El PDF NO corresponde al XML - QR no coincide', { duration: 6000 });
          setProcesandoFactura(false);
          setEtapaProceso('');
          return;
        }

        if (qrResult.esValida) {
          toast.success('✅ QR del PDF coincide con XML', { duration: 2000 });
        }
      }

      // PASO 4: Subir PDF como comprobante
      if (pendingPdfFile && user?.company_id) {
        setEtapaProceso('Guardando comprobante...');
        const fileName = `${Date.now()}_${pendingPdfFile.name}`;
        const filePath = `comprobantes/${user.company_id}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('documentos')
          .upload(filePath, pendingPdfFile);

        if (!uploadError) {
          const { data: urlData } = supabase.storage
            .from('documentos')
            .getPublicUrl(filePath);

          setFormData(prev => ({
            ...prev,
            archivo_adjunto: urlData.publicUrl,
            archivo_nombre: pendingPdfFile.name
          }));
        }
      }

      setLastProcessedMethod('xml');
      setEtapaProceso('');

      toast.success(
        `✅ Factura procesada correctamente\n` +
        `Emisor: ${parsedCfdi.emisor?.nombre}\n` +
        `Total: $${total.toFixed(2)}`,
        { duration: 4000 }
      );

    } catch (error: any) {
      console.error('Error procesando factura:', error);
      toast.error(`Error: ${error.message}`);
      setEtapaProceso('');
    } finally {
      setProcesandoFactura(false);
    }
  };

  // Procesar ticket con OCR (cuando se presiona el botón)
  const processTicket = async () => {
    if (!ticketFile) {
      toast.error('Se requiere una imagen del ticket');
      return;
    }
    await processTicketOCR(ticketFile);
  };

  // Limpiar documentos (HOMOLOGADO con GastoFormModal)
  const clearDocuments = () => {
    setTipoDocumento(null);
    setPendingXmlFile(null);
    setPendingPdfFile(null);
    setTicketFile(null);
    setCfdiData({});
    resetearSAT();
    setResultadoQR(null);
    setValidandoQR(false);
    setResultadoPDFSAT(null);
    setLastProcessedMethod(null);
    setEtapaProceso('');
    setProcesandoFactura(false);
    setFormData(prev => ({
      ...prev,
      archivo_adjunto: '',
      archivo_nombre: ''
    }));
  };

  // ============================================================================
  // VALIDACIÓN SOLO PDF (SIN XML) - Extrae datos con OCR y valida con SAT
  // ============================================================================
  const validarPDFSoloConSAT = async (file?: File) => {
    const pdfFile = file || (pdfSoloInputRef.current?.files?.[0]);
    if (!pdfFile) {
      toast.error('Seleccione un archivo PDF');
      return;
    }

    setValidandoPDFSolo(true);
    setResultadoPDFSAT(null);
    toast.loading('Extrayendo datos del PDF y validando con SAT...', { id: 'pdf-sat' });

    try {
      const resultado = await validarPDFConSAT(pdfFile);
      setResultadoPDFSAT(resultado);

      if (resultado.success && resultado.datosExtraidos) {
        // Actualizar datos CFDI con los extraídos del PDF
        setCfdiData({
          uuid: resultado.datosExtraidos.uuid,
          rfcEmisor: resultado.datosExtraidos.rfcEmisor,
          rfcReceptor: resultado.datosExtraidos.rfcReceptor,
          total: resultado.datosExtraidos.total
        });

        // Actualizar formulario con los datos extraídos
        setFormData(prev => ({
          ...prev,
          total: resultado.datosExtraidos!.total || prev.total,
          rfc_proveedor: resultado.datosExtraidos!.rfcEmisor || prev.rfc_proveedor
        }));

        // Mostrar resultado según validación SAT
        if (resultado.validacionSAT?.esValida) {
          toast.success('PDF validado con SAT - Factura VIGENTE', { id: 'pdf-sat', duration: 4000 });
        } else if (resultado.validacionSAT?.esCancelada) {
          toast.error('FACTURA CANCELADA en SAT', { id: 'pdf-sat', duration: 5000 });
        } else if (resultado.validacionSAT?.noEncontrada) {
          toast.error('Factura NO ENCONTRADA en SAT', { id: 'pdf-sat', duration: 5000 });
        } else {
          toast.error(`Advertencia: ${resultado.validacionSAT?.mensaje || 'Estado desconocido'}`, { id: 'pdf-sat' });
        }
      } else {
        // No se pudieron extraer todos los datos
        toast.error(resultado.error || 'No se pudieron extraer los datos fiscales del PDF', { id: 'pdf-sat' });
      }
    } catch (error: any) {
      console.error('Error validando PDF solo:', error);
      toast.error(`Error: ${error.message}`, { id: 'pdf-sat' });
    } finally {
      setValidandoPDFSolo(false);
    }
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

    // ============================================================
    // BLOQUEO POR VALIDACIÓN QR - Si el PDF no coincide con XML
    // ============================================================
    if (tipoDocumento === 'factura' && resultadoQR && resultadoQR.bloqueante && !resultadoQR.esValida) {
      toast.error('No se puede guardar: El PDF no corresponde al XML (QR no coincide)');
      return;
    }

    // ============================================================
    // BLOQUEO POR VALIDACIÓN SAT - Si es factura y no pasó SAT
    // ============================================================
    if (tipoDocumento === 'factura' && resultadoSAT) {
      if (resultadoSAT.esCancelada) {
        toast.error('No se puede guardar: La factura está CANCELADA en el SAT');
        return;
      }
      if (resultadoSAT.noEncontrada) {
        toast.error('No se puede guardar: La factura NO EXISTE en el SAT (posible apócrifa)');
        return;
      }
    }

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
        // Guardar datos de validación SAT
        sat_estado: resultadoSAT?.estado,
        sat_validado: resultadoSAT?.success ? true : false,
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
            <div className="space-y-3">
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

              {/* Opción: Validar solo PDF (sin XML) */}
              <button
                type="button"
                onClick={() => pdfSoloInputRef.current?.click()}
                disabled={validandoPDFSolo}
                className="w-full flex items-center justify-center gap-2 p-3 border-2 border-dashed rounded-lg hover:bg-purple-50 transition-colors"
                style={{ borderColor: '#8B5CF6' }}
              >
                {validandoPDFSolo ? (
                  <Loader2 className="w-5 h-5 text-purple-600 animate-spin" />
                ) : (
                  <FileText className="w-5 h-5 text-purple-600" />
                )}
                <span className="font-medium text-purple-600">
                  {validandoPDFSolo ? 'Validando...' : 'Validar solo PDF'}
                </span>
                <span className="text-xs text-gray-500">(Sin XML - Extrae datos con OCR)</span>
              </button>
              <input
                ref={pdfSoloInputRef}
                type="file"
                accept=".pdf"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) validarPDFSoloConSAT(file);
                }}
                className="hidden"
              />

              {/* Resultado de validación PDF solo */}
              {resultadoPDFSAT && (
                <div className={`p-3 rounded-lg border ${
                  resultadoPDFSAT.validacionSAT?.esValida
                    ? 'bg-green-50 border-green-300'
                    : resultadoPDFSAT.validacionSAT?.esCancelada
                    ? 'bg-red-50 border-red-300'
                    : 'bg-yellow-50 border-yellow-300'
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-sm">
                      {resultadoPDFSAT.validacionSAT?.esValida
                        ? '✅ Factura VIGENTE en SAT'
                        : resultadoPDFSAT.validacionSAT?.esCancelada
                        ? '❌ Factura CANCELADA en SAT'
                        : resultadoPDFSAT.validacionSAT?.noEncontrada
                        ? '⚠️ Factura NO ENCONTRADA en SAT'
                        : `⚠️ ${resultadoPDFSAT.error || 'Estado desconocido'}`
                      }
                    </span>
                    <button
                      type="button"
                      onClick={() => setResultadoPDFSAT(null)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  {resultadoPDFSAT.datosExtraidos && (
                    <div className="text-xs text-gray-600 space-y-1">
                      <p><strong>UUID:</strong> {resultadoPDFSAT.datosExtraidos.uuid}</p>
                      <p><strong>RFC Emisor:</strong> {resultadoPDFSAT.datosExtraidos.rfcEmisor}</p>
                      <p><strong>RFC Receptor:</strong> {resultadoPDFSAT.datosExtraidos.rfcReceptor}</p>
                      <p><strong>Total:</strong> ${resultadoPDFSAT.datosExtraidos.total?.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</p>
                    </div>
                  )}
                  {resultadoPDFSAT.datosFaltantes && (
                    <div className="text-xs text-red-600 mt-2">
                      <p><strong>Datos no encontrados en el PDF:</strong></p>
                      <ul className="list-disc list-inside">
                        {resultadoPDFSAT.datosFaltantes.uuid && <li>UUID (Folio Fiscal)</li>}
                        {resultadoPDFSAT.datosFaltantes.rfcEmisor && <li>RFC Emisor</li>}
                        {resultadoPDFSAT.datosFaltantes.rfcReceptor && <li>RFC Receptor</li>}
                        {resultadoPDFSAT.datosFaltantes.total && <li>Total</li>}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : tipoDocumento === 'factura' ? (
            /* ========================================== */
            /* Vista para FACTURA (XML + PDF) - HOMOLOGADO */
            /* ========================================== */
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                {/* XML */}
                <div className={`p-3 border-2 rounded-lg ${pendingXmlFile ? 'bg-blue-50 border-blue-300' : 'border-dashed'}`}
                  style={{ borderColor: pendingXmlFile ? '#3B82F6' : themeColors.border }}>
                  <label className="block text-xs font-medium mb-1 text-blue-600">XML CFDI *</label>
                  {!pendingXmlFile ? (
                    <button
                      type="button"
                      onClick={() => xmlInputRef.current?.click()}
                      disabled={cargandoXml}
                      className="w-full flex items-center justify-center gap-2 p-2 rounded hover:bg-gray-50"
                    >
                      {cargandoXml ? (
                        <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
                      ) : (
                        <Upload className="w-4 h-4 text-blue-600" />
                      )}
                      <span className="text-sm text-blue-600">{cargandoXml ? 'Cargando...' : 'Seleccionar XML'}</span>
                    </button>
                  ) : (
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-blue-600" />
                      <span className="text-sm text-blue-700 truncate">{pendingXmlFile.name}</span>
                      <button type="button" onClick={() => setPendingXmlFile(null)} className="text-red-500 text-xs">✕</button>
                    </div>
                  )}
                </div>

                {/* PDF */}
                <div className={`p-3 border-2 rounded-lg ${pendingPdfFile ? 'bg-green-50 border-green-300' : 'border-dashed'}`}
                  style={{ borderColor: pendingPdfFile ? '#10B981' : themeColors.border }}>
                  <label className="block text-xs font-medium mb-1 text-green-600">PDF Factura</label>
                  {!pendingPdfFile ? (
                    <button
                      type="button"
                      onClick={() => pdfInputRef.current?.click()}
                      disabled={cargandoPdf}
                      className="w-full flex items-center justify-center gap-2 p-2 rounded hover:bg-gray-50"
                    >
                      {cargandoPdf ? (
                        <Loader2 className="w-4 h-4 text-green-600 animate-spin" />
                      ) : (
                        <Upload className="w-4 h-4 text-green-600" />
                      )}
                      <span className="text-sm text-green-600">{cargandoPdf ? 'Cargando...' : 'Seleccionar PDF'}</span>
                    </button>
                  ) : (
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-green-600" />
                      <span className="text-sm text-green-700 truncate">{pendingPdfFile.name}</span>
                      <button type="button" onClick={() => setPendingPdfFile(null)} className="text-red-500 text-xs">✕</button>
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

              {pendingXmlFile && (
                <button
                  type="button"
                  onClick={procesarFacturaCompleta}
                  disabled={procesandoFactura}
                  className="w-full py-2.5 rounded-lg font-medium text-white flex items-center justify-center gap-2"
                  style={{ backgroundColor: '#3B82F6' }}
                >
                  {procesandoFactura ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      {etapaProceso || 'Procesando...'}
                    </>
                  ) : (
                    <>
                      <Calculator className="w-4 h-4" />
                      Procesar Factura
                    </>
                  )}
                </button>
              )}
            </div>
          ) : (
            /* ========================================== */
            /* Vista para TICKET (imagen con OCR) - HOMOLOGADO */
            /* ========================================== */
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
                  onClick={processTicket}
                  disabled={processingDoc}
                  className="w-full py-2.5 rounded-lg font-medium text-white flex items-center justify-center gap-2"
                  style={{ backgroundColor: '#F59E0B' }}
                >
                  {processingDoc ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Procesando OCR...
                    </>
                  ) : (
                    <>
                      <Camera className="w-4 h-4" />
                      Procesar Ticket con OCR
                    </>
                  )}
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

          {/* Estado de validación QR */}
          {(validandoQR || resultadoQR) && tipoDocumento === 'factura' && (
            <div className="mt-3 p-3 rounded-lg border" style={{ borderColor: themeColors.border, backgroundColor: `${themeColors.border}20` }}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium" style={{ color: themeColors.text }}>
                  Validación QR vs XML:
                </span>
                {validandoQR ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Validando...
                  </span>
                ) : resultadoQR?.esValida ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                    Coincide
                  </span>
                ) : resultadoQR?.bloqueante ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
                    No coincide
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
                    {resultadoQR?.mensaje || 'Advertencia'}
                  </span>
                )}
              </div>
              {resultadoQR && !resultadoQR.esValida && resultadoQR.comparacion?.diferencias && (
                <div className="mt-2 p-2 rounded bg-red-50 border border-red-200">
                  <p className="text-sm font-medium text-red-700 mb-1">Diferencias encontradas:</p>
                  <ul className="text-xs text-red-600 space-y-1">
                    {resultadoQR.comparacion.diferencias.map((dif, idx) => (
                      <li key={idx}>
                        <strong>{dif.campo}:</strong> XML: {dif.valorXML} | QR: {dif.valorQR}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Estado de validación SAT */}
          {(validandoSAT || resultadoSAT) && tipoDocumento === 'factura' && (
            <div className="mt-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium" style={{ color: themeColors.text }}>
                  Validación SAT:
                </span>
                <SATStatusBadge resultado={resultadoSAT} isValidating={validandoSAT} size="md" />
              </div>
              {resultadoSAT && !resultadoSAT.esValida && (
                <SATAlertBox resultado={resultadoSAT} onClose={clearDocuments} />
              )}
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
                  borderColor: errorCuadre ? '#EF4444' : themeColors.primary,
                  backgroundColor: errorCuadre ? '#FEF2F2' : `${themeColors.primary}10`,
                  color: errorCuadre ? '#EF4444' : themeColors.primary
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
