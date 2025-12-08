/**
 * FORMULARIO SIMPLIFICADO DE GASTOS/PROVISIONES
 * - Campos esenciales únicamente
 * - OCR para escanear comprobantes
 * - Soporte XML CFDI
 * - Usado tanto para Gastos como Provisiones
 */

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  X, Save, Loader2, Camera, Upload, FileText, Calculator,
  DollarSign, Calendar, Building2, Tag, ChevronDown, ChevronUp,
  Undo2, ArrowDownLeft, MinusCircle
} from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../../../../core/config/supabase';
import { useAuth } from '../../../../core/auth/AuthProvider';
import { useTheme } from '../../../../shared/components/theme';
import { useExpenseCategories } from '../../hooks/useFinances';
import { parseCFDIXml } from '../../utils/cfdiXmlParser';
import { processFileWithOCR } from '../../../ocr/services/dualOCRService';
import { useSATValidation } from '../../hooks/useSATValidation';
import SATStatusBadge, { SATAlertBox } from '../ui/SATStatusBadge';

// IVA desde variable de entorno
const IVA_PORCENTAJE = parseFloat(import.meta.env.VITE_IVA_PORCENTAJE || '16');
const IVA_RATE = IVA_PORCENTAJE / 100;

interface SimpleExpenseFormProps {
  mode: 'gasto' | 'provision';
  eventoId: number;
  item?: any; // Gasto o provisión existente
  onSave: () => void;
  onClose: () => void;
  onConvertToExpense?: (provision: any) => void; // Solo para provisiones
}

interface FormData {
  concepto: string;
  descripcion: string;
  proveedor: string;
  rfc_proveedor: string;
  fecha: string;
  categoria_id: number | null;
  subtotal: number;
  iva: number;
  total: number;
  forma_pago: string;
  estado: string;
  notas: string;
  // Campos CFDI (ocultos por defecto)
  uuid_cfdi: string;
  folio_fiscal: string;
  // Retornos de material
  tipo_movimiento: 'gasto' | 'retorno';
}

// ID de categoría Materiales (para mostrar opción de retorno)
const CATEGORIA_MATERIALES_ID = 8;

export const SimpleExpenseForm: React.FC<SimpleExpenseFormProps> = ({
  mode,
  eventoId,
  item,
  onSave,
  onClose,
  onConvertToExpense
}) => {
  const { user } = useAuth();
  const { paletteConfig, isDark } = useTheme();
  const { data: categorias } = useExpenseCategories();

  // Hook de validación SAT
  const { validar: validarSAT, resultado: resultadoSAT, isValidating: validandoSAT, resetear: resetearSAT } = useSATValidation();

  // Estado para datos CFDI necesarios para validación SAT
  const [cfdiDataSAT, setCfdiDataSAT] = useState<{
    rfcEmisor?: string;
    rfcReceptor?: string;
    total?: number;
    uuid?: string;
  }>({});

  const fileInputRef = useRef<HTMLInputElement>(null);
  const xmlInputRef = useRef<HTMLInputElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);

  const [saving, setSaving] = useState(false);
  const [processingOCR, setProcessingOCR] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [archivoAdjunto, setArchivoAdjunto] = useState<string | null>(item?.archivo_adjunto || null);
  const [archivoNombre, setArchivoNombre] = useState<string | null>(item?.archivo_nombre || null);

  // Tipo de documento: 'factura' (XML+PDF) o 'ticket' (imagen con OCR)
  const [tipoDocumento, setTipoDocumento] = useState<'factura' | 'ticket' | null>(null);
  const [xmlFile, setXmlFile] = useState<File | null>(null);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [ticketFile, setTicketFile] = useState<File | null>(null);

  const [formData, setFormData] = useState<FormData>({
    concepto: item?.concepto || '',
    descripcion: item?.descripcion || '',
    proveedor: item?.proveedor || item?.proveedor_nombre || '',
    rfc_proveedor: item?.rfc_proveedor || '',
    fecha: (mode === 'gasto' ? item?.fecha_gasto : item?.fecha_estimada) || new Date().toISOString().split('T')[0],
    categoria_id: item?.categoria_id || null,
    subtotal: item?.subtotal || 0,
    iva: item?.iva || 0,
    total: item?.total || 0,
    forma_pago: item?.forma_pago || 'transferencia',
    estado: item?.estado || item?.status_aprobacion || 'pendiente',
    notas: item?.notas || '',
    uuid_cfdi: item?.uuid_cfdi || '',
    folio_fiscal: item?.folio_fiscal || '',
    tipo_movimiento: item?.tipo_movimiento || 'gasto',
  });

  // Colores del tema - SIEMPRE DINÁMICOS DE LA PALETA
  const themeColors = useMemo(() => ({
    primary: paletteConfig.primary,
    primaryLight: paletteConfig.shades[100],
    primaryDark: paletteConfig.shades[700],
    secondary: paletteConfig.secondary,
    bg: isDark ? '#1E293B' : '#FFFFFF',
    text: isDark ? '#F8FAFC' : '#1E293B',
    border: isDark ? '#334155' : '#E2E8F0',
    // Usar colores de la paleta en lugar de hardcodeados
    accent: mode === 'gasto' ? paletteConfig.secondary : paletteConfig.primary
  }), [paletteConfig, isDark, mode]);

  // Calcular IVA automáticamente
  const calcularDesdeSubtotal = useCallback(() => {
    if (formData.subtotal > 0) {
      const iva = Math.round(formData.subtotal * IVA_RATE * 100) / 100;
      const total = Math.round((formData.subtotal + iva) * 100) / 100;
      setFormData(prev => ({ ...prev, iva, total }));
      toast.success(`IVA calculado: $${iva.toFixed(2)}`);
    }
  }, [formData.subtotal]);

  const calcularDesdeTotal = useCallback(() => {
    if (formData.total > 0) {
      const subtotal = Math.round((formData.total / (1 + IVA_RATE)) * 100) / 100;
      const iva = Math.round((formData.total - subtotal) * 100) / 100;
      setFormData(prev => ({ ...prev, subtotal, iva }));
      toast.success(`Subtotal: $${subtotal.toFixed(2)}, IVA: $${iva.toFixed(2)}`);
    }
  }, [formData.total]);

  // ============================================================================
  // PROCESAMIENTO DE DOCUMENTOS - HOMOLOGADO CON INCOMEFORM
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

  // Procesar XML CFDI (para facturas) + Validación SAT
  const processXMLCFDI = async (xmlFileToProcess: File): Promise<boolean> => {
    try {
      const text = await xmlFileToProcess.text();
      const cfdiData = await parseCFDIXml(text);

      if (cfdiData) {
        setFormData(prev => ({
          ...prev,
          concepto: cfdiData.conceptos?.[0]?.descripcion || prev.concepto,
          proveedor: cfdiData.emisor?.nombre || prev.proveedor,
          rfc_proveedor: cfdiData.emisor?.rfc || prev.rfc_proveedor,
          fecha: cfdiData.fecha?.split('T')[0] || prev.fecha,
          subtotal: cfdiData.subtotal || prev.subtotal,
          iva: cfdiData.impuestos?.totalTraslados || prev.iva,
          total: cfdiData.total || prev.total,
          uuid_cfdi: cfdiData.timbreFiscal?.uuid || prev.uuid_cfdi,
          folio_fiscal: cfdiData.folio || prev.folio_fiscal,
        }));

        // Guardar datos CFDI para validación SAT
        const cfdiValidationData = {
          rfcEmisor: cfdiData.emisor?.rfc,
          rfcReceptor: cfdiData.receptor?.rfc,
          total: cfdiData.total,
          uuid: cfdiData.timbreFiscal?.uuid
        };
        setCfdiDataSAT(cfdiValidationData);

        setShowAdvanced(true);
        toast.success(`XML procesado: ${cfdiData.emisor?.nombre} - $${cfdiData.total?.toFixed(2)}`);

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
    setProcessingOCR(true);
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

      setArchivoAdjunto(urlData.publicUrl);
      setArchivoNombre(file.name);

      // Procesar con OCR
      const ocrResult = await processFileWithOCR(file);

      if (ocrResult) {
        setFormData(prev => ({
          ...prev,
          concepto: ocrResult.concepto_sugerido || prev.concepto,
          proveedor: ocrResult.establecimiento || prev.proveedor,
          rfc_proveedor: ocrResult.rfc || prev.rfc_proveedor,
          fecha: ocrResult.fecha || prev.fecha,
          subtotal: ocrResult.subtotal || prev.subtotal,
          iva: ocrResult.iva || prev.iva,
          total: ocrResult.total || prev.total,
        }));
        // No hay UUID ni folio fiscal en tickets
        toast.success('Datos extraídos del ticket', { id: 'ocr' });
      } else {
        toast.success('Ticket subido (sin datos OCR)', { id: 'ocr' });
      }
    } catch (error: any) {
      console.error('Error procesando ticket:', error);
      toast.error('Error al procesar ticket', { id: 'ocr' });
    } finally {
      setProcessingOCR(false);
    }
  };

  // Procesar documentos según el tipo seleccionado
  const processDocuments = async () => {
    if (tipoDocumento === 'factura') {
      if (!xmlFile) {
        toast.error('Se requiere el XML CFDI para facturas');
        return;
      }

      // Procesar XML + Validación SAT
      const esValido = await processXMLCFDI(xmlFile);

      // Si la factura está cancelada o es apócrifa, NO continuar
      if (!esValido) {
        return; // No subir PDF ni continuar
      }

      // Subir PDF si existe (solo si la factura es válida)
      if (pdfFile) {
        try {
          const fileName = `${Date.now()}_${pdfFile.name}`;
          const filePath = `comprobantes/${user?.company_id}/${fileName}`;

          const { error: uploadError } = await supabase.storage
            .from('documentos')
            .upload(filePath, pdfFile);

          if (uploadError) throw uploadError;

          const { data: urlData } = supabase.storage
            .from('documentos')
            .getPublicUrl(filePath);

          setArchivoAdjunto(urlData.publicUrl);
          setArchivoNombre(pdfFile.name);
          toast.success('XML procesado + PDF adjunto');
        } catch (error) {
          console.error('Error subiendo PDF:', error);
        }
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
    setCfdiDataSAT({});
    resetearSAT();
    setXmlFile(null);
    setPdfFile(null);
    setTicketFile(null);
    setArchivoAdjunto(null);
    setArchivoNombre(null);
  };

  // Guardar
  const handleSubmit = async () => {
    // Validaciones
    if (!formData.concepto.trim()) {
      toast.error('El concepto es obligatorio');
      return;
    }
    // Para devoluciones, el total puede ser negativo o positivo (se convertirá a negativo)
    // Para gastos normales, debe ser mayor a 0
    if (formData.tipo_movimiento === 'gasto' && formData.total <= 0) {
      toast.error('El total debe ser mayor a 0');
      return;
    }
    if (formData.tipo_movimiento === 'retorno' && formData.total === 0) {
      toast.error('El total de la devolución no puede ser 0');
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

    setSaving(true);

    try {
      const table = mode === 'gasto' ? 'evt_gastos_erp' : 'evt_provisiones_erp';
      const fechaField = mode === 'gasto' ? 'fecha_gasto' : 'fecha_estimada';

      // =====================================================
      // MAPEO DE CAMPOS - evt_gastos_erp vs evt_provisiones_erp
      // =====================================================
      // Para devoluciones/retornos, convertir los montos a negativos
      const esRetorno = formData.tipo_movimiento === 'retorno';
      const factorSigno = esRetorno && formData.total > 0 ? -1 : 1;

      const dataToSave: any = {
        evento_id: eventoId,
        company_id: user?.company_id || '00000000-0000-0000-0000-000000000001',
        concepto: esRetorno ? `[DEVOLUCIÓN] ${formData.concepto}` : formData.concepto,
        descripcion: formData.descripcion,
        [fechaField]: formData.fecha,
        categoria_id: formData.categoria_id || null,
        subtotal: formData.subtotal * factorSigno,
        iva: formData.iva * factorSigno,
        total: formData.total * factorSigno,
        notas: formData.notas,
      };

      // Campos de fecha según tabla
      if (mode === 'gasto') {
        dataToSave.fecha_actualizacion = new Date().toISOString();
      } else {
        dataToSave.updated_at = new Date().toISOString();
      }

      // Campos específicos según modo - MAPEO CORRECTO A BD
      if (mode === 'gasto') {
        // evt_gastos_erp - usar nombres de columna correctos
        dataToSave.metodo_pago = formData.forma_pago;           // forma_pago → metodo_pago
        dataToSave.status = formData.estado || 'pendiente';      // status_aprobacion → status
        dataToSave.comprobante_url = archivoAdjunto;             // archivo_adjunto → comprobante_url
        dataToSave.comprobante_nombre = archivoNombre;           // archivo_nombre → comprobante_nombre
        dataToSave.uuid_factura = formData.uuid_cfdi || null;    // uuid_cfdi → uuid_factura
        dataToSave.factura_numero = formData.folio_fiscal || null; // folio_fiscal → factura_numero
        dataToSave.tipo_movimiento = formData.tipo_movimiento || 'gasto';
        // No hay columna 'proveedor' en evt_gastos_erp, es proveedor_id (FK)
        // Por ahora guardar en notas o descripción si hay nombre de proveedor
        if (formData.proveedor) {
          dataToSave.descripcion = dataToSave.descripcion
            ? `${dataToSave.descripcion} | Proveedor: ${formData.proveedor}`
            : `Proveedor: ${formData.proveedor}`;
        }
      } else {
        // evt_provisiones_erp
        dataToSave.proveedor = formData.proveedor;
        dataToSave.rfc_proveedor = formData.rfc_proveedor;
        dataToSave.estado = formData.estado;
        dataToSave.comprobante_pago_url = archivoAdjunto;
        dataToSave.comprobante_pago_nombre = archivoNombre;
        dataToSave.uuid_cfdi = formData.uuid_cfdi || null;
        dataToSave.folio_fiscal = formData.folio_fiscal || null;
      }

      if (item?.id) {
        // Actualizar
        const { error } = await supabase
          .from(table)
          .update(dataToSave)
          .eq('id', item.id);

        if (error) throw error;
        toast.success(`${mode === 'gasto' ? 'Gasto' : 'Provisión'} actualizado`);
      } else {
        // Crear - campos según tabla
        if (mode === 'gasto') {
          dataToSave.fecha_creacion = new Date().toISOString();
          dataToSave.creado_por = user?.id;
          // Gastos no tiene columna 'activo', usa deleted_at
        } else {
          dataToSave.created_at = new Date().toISOString();
          dataToSave.created_by = user?.id;
          dataToSave.activo = true;
        }

        const { error } = await supabase
          .from(table)
          .insert(dataToSave);

        if (error) throw error;
        toast.success(`${mode === 'gasto' ? 'Gasto' : 'Provisión'} creado`);
      }

      onSave();
    } catch (error: any) {
      console.error('Error guardando:', error);
      toast.error(`Error: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  // Convertir provisión a gasto
  const handleConvertToExpense = async () => {
    if (!item?.id || mode !== 'provision') return;

    if (!confirm('¿Convertir esta provisión en gasto? Se creará un nuevo gasto con estos datos.')) {
      return;
    }

    try {
      // Crear gasto desde la provisión
      const gastoData = {
        evento_id: eventoId,
        company_id: user?.company_id,
        concepto: formData.concepto,
        descripcion: formData.descripcion,
        proveedor: formData.proveedor,
        rfc_proveedor: formData.rfc_proveedor,
        fecha_gasto: formData.fecha,
        categoria_id: formData.categoria_id,
        subtotal: formData.subtotal,
        iva: formData.iva,
        total: formData.total,
        forma_pago: formData.forma_pago,
        status_aprobacion: 'aprobado',
        archivo_adjunto: archivoAdjunto,
        archivo_nombre: archivoNombre,
        uuid_cfdi: formData.uuid_cfdi,
        folio_fiscal: formData.folio_fiscal,
        notas: `Convertido desde provisión ID: ${item.id}`,
        created_at: new Date().toISOString(),
        created_by: user?.id,
        activo: true,
      };

      const { error: insertError } = await supabase
        .from('evt_gastos_erp')
        .insert(gastoData);

      if (insertError) throw insertError;

      // Marcar provisión como pagada
      const { error: updateError } = await supabase
        .from('evt_provisiones_erp')
        .update({
          estado: 'pagado',
          fecha_pago: new Date().toISOString().split('T')[0],
          updated_at: new Date().toISOString(),
        })
        .eq('id', item.id);

      if (updateError) throw updateError;

      toast.success('Provisión convertida a gasto');
      onSave();
    } catch (error: any) {
      console.error('Error convirtiendo:', error);
      toast.error(`Error: ${error.message}`);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div
        className="rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
        style={{ backgroundColor: themeColors.bg }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4 border-b"
          style={{ background: `linear-gradient(135deg, ${themeColors.accent} 0%, ${themeColors.accent}dd 100%)` }}
        >
          <h2 className="text-xl font-semibold text-white">
            {item ? 'Editar' : 'Nuevo'} {mode === 'gasto' ? 'Gasto' : 'Provisión'}
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={handleSubmit}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-white font-medium"
            >
              {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
              Guardar
            </button>
            <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-lg">
              <X className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>

        {/* Form */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* ============================================================== */}
          {/* ZONA DE DOCUMENTOS - HOMOLOGADA CON INCOMEFORM */}
          {/* ============================================================== */}
          <div className="border-2 rounded-lg p-4" style={{ borderColor: themeColors.accent }}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold uppercase tracking-wide" style={{ color: themeColors.accent }}>
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
                    fileInputRef.current?.click();
                  }}
                  className="flex flex-col items-center justify-center gap-2 p-4 border-2 border-dashed rounded-lg hover:bg-amber-50 transition-colors"
                  style={{ borderColor: '#F59E0B' }}
                >
                  <Camera className="w-8 h-8 text-amber-600" />
                  <span className="font-medium text-amber-600">Ticket</span>
                  <span className="text-xs text-gray-500">Imagen con OCR</span>
                </button>
                <input
                  ref={fileInputRef}
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
                    className="w-full py-2.5 rounded-lg font-medium text-white flex items-center justify-center gap-2"
                    style={{ backgroundColor: '#3B82F6' }}
                  >
                    <Calculator className="w-4 h-4" />
                    Procesar Factura
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
                      onClick={() => fileInputRef.current?.click()}
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
                    disabled={processingOCR}
                    className="w-full py-2.5 rounded-lg font-medium text-white flex items-center justify-center gap-2"
                    style={{ backgroundColor: '#F59E0B' }}
                  >
                    {processingOCR ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Camera className="w-4 h-4" />
                    )}
                    {processingOCR ? 'Procesando OCR...' : 'Procesar Ticket con OCR'}
                  </button>
                )}
              </div>
            )}

            {/* Archivo adjunto procesado */}
            {archivoAdjunto && (
              <div className="mt-3 flex items-center gap-2 p-2 bg-green-50 rounded-lg border border-green-200">
                <FileText className="w-4 h-4 text-green-600" />
                <span className="text-sm text-green-700 truncate flex-1">{archivoNombre}</span>
                <a href={archivoAdjunto} target="_blank" className="text-sm text-blue-600 hover:underline">
                  Ver
                </a>
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

          {/* Concepto */}
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: themeColors.text }}>
              Concepto *
            </label>
            <input
              type="text"
              value={formData.concepto}
              onChange={(e) => setFormData({ ...formData, concepto: e.target.value })}
              placeholder="Descripción del gasto..."
              className="w-full px-4 py-3 border-2 rounded-lg focus:ring-2"
              style={{ borderColor: themeColors.border, backgroundColor: themeColors.bg, color: themeColors.text }}
            />
          </div>

          {/* Proveedor y RFC */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: themeColors.text }}>
                <Building2 className="w-4 h-4 inline mr-1" />
                Proveedor
              </label>
              <input
                type="text"
                value={formData.proveedor}
                onChange={(e) => setFormData({ ...formData, proveedor: e.target.value })}
                placeholder="Nombre del proveedor"
                className="w-full px-4 py-2 border-2 rounded-lg"
                style={{ borderColor: themeColors.border, backgroundColor: themeColors.bg, color: themeColors.text }}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: themeColors.text }}>
                RFC
              </label>
              <input
                type="text"
                value={formData.rfc_proveedor}
                onChange={(e) => setFormData({ ...formData, rfc_proveedor: e.target.value.toUpperCase() })}
                placeholder="RFC del proveedor"
                maxLength={13}
                className="w-full px-4 py-2 border-2 rounded-lg font-mono"
                style={{ borderColor: themeColors.border, backgroundColor: themeColors.bg, color: themeColors.text }}
              />
            </div>
          </div>

          {/* ============================================================== */}
          {/* TIPO DE MOVIMIENTO: GASTO O DEVOLUCIÓN */}
          {/* Solo visible para gastos (no provisiones) */}
          {/* ============================================================== */}
          {mode === 'gasto' && (
            <div
              className="rounded-lg p-3 border-2"
              style={{
                backgroundColor: formData.tipo_movimiento === 'retorno' ? '#FEF2F2' : '#F0FDF4',
                borderColor: formData.tipo_movimiento === 'retorno' ? '#EF4444' : '#10B981'
              }}
            >
              <div className="flex items-center gap-4">
                <span className="text-sm font-semibold" style={{ color: themeColors.text }}>
                  Tipo de Movimiento:
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, tipo_movimiento: 'gasto' })}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${formData.tipo_movimiento === 'gasto'
                      ? 'bg-emerald-600 text-white shadow-md'
                      : 'bg-white text-gray-600 border hover:bg-gray-50'
                      }`}
                  >
                    <DollarSign className="w-4 h-4" />
                    Gasto
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, tipo_movimiento: 'retorno' })}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${formData.tipo_movimiento === 'retorno'
                      ? 'bg-red-600 text-white shadow-md'
                      : 'bg-white text-gray-600 border hover:bg-gray-50'
                      }`}
                  >
                    <Undo2 className="w-4 h-4" />
                    Devolución / Retorno
                  </button>
                </div>
              </div>
              {formData.tipo_movimiento === 'retorno' && (
                <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
                  <MinusCircle className="w-4 h-4" />
                  Los montos se registrarán como negativos (reducen el gasto total)
                </p>
              )}
            </div>
          )}

          {/* Montos */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-sm font-medium" style={{ color: themeColors.text }}>Subtotal</label>
                <button
                  type="button"
                  onClick={calcularDesdeSubtotal}
                  className="text-xs px-2 py-0.5 rounded bg-gray-100 hover:bg-gray-200"
                >
                  <Calculator className="w-3 h-3 inline mr-1" />
                  +IVA
                </button>
              </div>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="number"
                  step="0.01"
                  value={formData.subtotal || ''}
                  onChange={(e) => setFormData({ ...formData, subtotal: parseFloat(e.target.value) || 0 })}
                  placeholder="0.00"
                  className="w-full pl-9 pr-3 py-2 border-2 rounded-lg text-right font-mono"
                  style={{ borderColor: themeColors.border, backgroundColor: themeColors.bg, color: themeColors.text }}
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: themeColors.text }}>IVA ({IVA_PORCENTAJE}%)</label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="number"
                  step="0.01"
                  value={formData.iva || ''}
                  onChange={(e) => setFormData({ ...formData, iva: parseFloat(e.target.value) || 0 })}
                  placeholder="0.00"
                  className="w-full pl-9 pr-3 py-2 border-2 rounded-lg text-right font-mono"
                  style={{ borderColor: themeColors.border, backgroundColor: themeColors.bg, color: themeColors.text }}
                />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-sm font-medium" style={{ color: themeColors.text }}>Total *</label>
                <button
                  type="button"
                  onClick={calcularDesdeTotal}
                  className="text-xs px-2 py-0.5 rounded bg-gray-100 hover:bg-gray-200"
                >
                  <Calculator className="w-3 h-3 inline mr-1" />
                  -IVA
                </button>
              </div>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="number"
                  step="0.01"
                  value={formData.total || ''}
                  onChange={(e) => setFormData({ ...formData, total: parseFloat(e.target.value) || 0 })}
                  placeholder="0.00"
                  className="w-full pl-9 pr-3 py-2 border-2 rounded-lg text-right font-mono font-bold"
                  style={{
                    borderColor: formData.total > 0 ? '#059669' : themeColors.border,
                    backgroundColor: formData.total > 0 ? '#F0FDF4' : themeColors.bg,
                    color: formData.total > 0 ? '#059669' : themeColors.text
                  }}
                />
              </div>
            </div>
          </div>

          {/* Fecha y Categoría */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: themeColors.text }}>
                <Calendar className="w-4 h-4 inline mr-1" />
                {mode === 'gasto' ? 'Fecha del Gasto' : 'Fecha Estimada'}
              </label>
              <input
                type="date"
                value={formData.fecha}
                onChange={(e) => setFormData({ ...formData, fecha: e.target.value })}
                className="w-full px-4 py-2 border-2 rounded-lg"
                style={{ borderColor: themeColors.border, backgroundColor: themeColors.bg, color: themeColors.text }}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: themeColors.text }}>
                <Tag className="w-4 h-4 inline mr-1" />
                Categoría
              </label>
              <select
                value={formData.categoria_id || ''}
                onChange={(e) => setFormData({ ...formData, categoria_id: e.target.value ? parseInt(e.target.value) : null })}
                className="w-full px-4 py-2 border-2 rounded-lg"
                style={{ borderColor: themeColors.border, backgroundColor: themeColors.bg, color: themeColors.text }}
              >
                <option value="">Seleccionar...</option>
                {categorias?.map((cat: any) => (
                  <option key={cat.id} value={cat.id}>{cat.nombre}</option>
                ))}
              </select>
            </div>
          </div>

          {/* RETORNO DE MATERIAL - Solo visible para gastos de categoría Materiales */}
          {mode === 'gasto' && formData.categoria_id === CATEGORIA_MATERIALES_ID && (
            <div className="p-4 rounded-lg border-2" style={{
              borderColor: formData.tipo_movimiento === 'retorno' ? '#10B981' : themeColors.border,
              backgroundColor: formData.tipo_movimiento === 'retorno' ? '#ECFDF5' : 'transparent'
            }}>
              <label className="block text-sm font-semibold mb-2" style={{ color: themeColors.text }}>
                Tipo de Movimiento
              </label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="tipo_movimiento"
                    value="gasto"
                    checked={formData.tipo_movimiento === 'gasto'}
                    onChange={() => setFormData({ ...formData, tipo_movimiento: 'gasto' })}
                    className="w-4 h-4"
                  />
                  <span className="text-sm font-medium" style={{ color: themeColors.text }}>
                    Gasto (compra de material)
                  </span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="tipo_movimiento"
                    value="retorno"
                    checked={formData.tipo_movimiento === 'retorno'}
                    onChange={() => setFormData({ ...formData, tipo_movimiento: 'retorno' })}
                    className="w-4 h-4 accent-emerald-600"
                  />
                  <span className="text-sm font-medium text-emerald-700">
                    Retorno (devolución de material no utilizado)
                  </span>
                </label>
              </div>
              {formData.tipo_movimiento === 'retorno' && (
                <p className="text-xs text-emerald-600 mt-2">
                  Este monto se restará del total de gastos de materiales
                </p>
              )}
            </div>
          )}

          {/* Estado y Forma de Pago */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: themeColors.text }}>Estado</label>
              <select
                value={formData.estado}
                onChange={(e) => setFormData({ ...formData, estado: e.target.value })}
                className="w-full px-4 py-2 border-2 rounded-lg"
                style={{ borderColor: themeColors.border, backgroundColor: themeColors.bg, color: themeColors.text }}
              >
                <option value="pendiente">Pendiente</option>
                <option value="aprobado">Aprobado</option>
                {mode === 'provision' && <option value="pagado">Pagado</option>}
                <option value="rechazado">Rechazado</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: themeColors.text }}>Forma de Pago</label>
              <select
                value={formData.forma_pago}
                onChange={(e) => setFormData({ ...formData, forma_pago: e.target.value })}
                className="w-full px-4 py-2 border-2 rounded-lg"
                style={{ borderColor: themeColors.border, backgroundColor: themeColors.bg, color: themeColors.text }}
              >
                <option value="efectivo">Efectivo</option>
                <option value="transferencia">Transferencia</option>
                <option value="tarjeta">Tarjeta</option>
                <option value="cheque">Cheque</option>
              </select>
            </div>
          </div>

          {/* Notas */}
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: themeColors.text }}>Notas</label>
            <textarea
              value={formData.notas}
              onChange={(e) => setFormData({ ...formData, notas: e.target.value })}
              rows={2}
              placeholder="Observaciones..."
              className="w-full px-4 py-2 border-2 rounded-lg resize-none"
              style={{ borderColor: themeColors.border, backgroundColor: themeColors.bg, color: themeColors.text }}
            />
          </div>

          {/* Campos Avanzados (colapsables) */}
          <div>
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700"
            >
              {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              Datos Fiscales (CFDI)
            </button>

            {showAdvanced && (
              <div className="mt-3 p-4 bg-gray-50 rounded-lg space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-600">UUID CFDI</label>
                    <input
                      type="text"
                      value={formData.uuid_cfdi}
                      onChange={(e) => setFormData({ ...formData, uuid_cfdi: e.target.value })}
                      placeholder="UUID del comprobante"
                      className="w-full px-3 py-2 border rounded-lg text-sm font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-600">Folio Fiscal</label>
                    <input
                      type="text"
                      value={formData.folio_fiscal}
                      onChange={(e) => setFormData({ ...formData, folio_fiscal: e.target.value })}
                      placeholder="Folio del SAT"
                      className="w-full px-3 py-2 border rounded-lg text-sm font-mono"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center px-6 py-4 border-t" style={{ borderColor: themeColors.border }}>
          <div className="text-sm text-gray-500">
            {mode === 'provision' && item?.id && (
              <button
                type="button"
                onClick={handleConvertToExpense}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium"
              >
                <DollarSign className="w-4 h-4" />
                Convertir a Gasto
              </button>
            )}
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border-2 rounded-lg font-medium hover:bg-gray-50"
              style={{ borderColor: themeColors.border, color: themeColors.text }}
            >
              Cancelar
            </button>
            <button
              onClick={handleSubmit}
              disabled={saving}
              className="px-8 py-2 rounded-lg font-medium flex items-center gap-2 text-white"
              style={{ backgroundColor: themeColors.accent }}
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {item ? 'Actualizar' : 'Guardar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
