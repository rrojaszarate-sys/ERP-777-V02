/**
 * MODAL: FORMULARIO DE GASTO NO IMPACTADO (MEJORADO V3)
 * - Layout 50% horizontal, 45% vertical
 * - Selector de dos niveles: Cuenta → Subclave
 * - Cálculo automático de IVA con toggle
 * - Máscara de dinero en campos numéricos
 * - Header con iconos de editar/guardar
 * - Colores dinámicos de la paleta activa
 * - Subida de PDF al bucket con estructura /gni/{año-mes}/
 * - 🆕 Soporte XML CFDI (100% precisión - igual que Eventos)
 * - 🆕 OCR inteligente para imágenes/PDF
 * - 🆕 Detección automática de tipo de archivo
 */

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { X, Search, Plus, Upload, FileText, Calculator, Loader2, Save, Pencil, DollarSign, Bot, Zap, FileCode } from 'lucide-react';
import { useAuth } from '../../../core/auth/AuthProvider';
import { supabase } from '../../../core/config/supabase';
import { useTheme } from '../../../shared/components/theme';
import { expenseOCRIntegration } from '../../ocr/services/expenseOCRIntegration';
// 🆕 Parser XML CFDI - Mismo motor que Eventos (100% precisión)
import { parseCFDIXml, cfdiToExpenseData } from '../../eventos-erp/utils/cfdiXmlParser';
import {
  createGasto,
  updateGasto,
  createProveedor
} from '../services/gastosNoImpactadosService';
import type {
  GastoNoImpactadoView,
  GastoNoImpactadoFormData,
  ClaveGasto,
  FormaPago,
  Proveedor,
  Ejecutivo
} from '../types/gastosNoImpactados';
import toast from 'react-hot-toast';

// IVA desde variable de entorno (default 16%)
const IVA_PORCENTAJE = parseFloat(import.meta.env.VITE_IVA_PORCENTAJE || '16');
const IVA_RATE = IVA_PORCENTAJE / 100;

interface Props {
  gasto: GastoNoImpactadoView | null;
  claves: ClaveGasto[];
  formasPago: FormaPago[];
  proveedores: Proveedor[];
  ejecutivos: Ejecutivo[];
  periodo: string;
  onClose: () => void;
  onSave: () => void;
}

// Componente de input de moneda con máscara
interface CurrencyInputProps {
  value: number;
  onChange: (value: number) => void;
  readOnly?: boolean;
  className?: string;
  placeholder?: string;
  themeColors?: {
    primary: string;
    secondary: string;
  };
  style?: React.CSSProperties;
}

const CurrencyInput = ({ value, onChange, readOnly = false, className = '', placeholder = '', themeColors, style }: CurrencyInputProps) => {
  const [displayValue, setDisplayValue] = useState('');

  // Formatear número a string con formato de moneda
  const formatCurrency = (num: number): string => {
    if (num === 0 || isNaN(num)) return '';
    return num.toLocaleString('es-MX', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  // Parsear string a número
  const parseValue = (str: string): number => {
    const cleaned = str.replace(/[^0-9.]/g, '');
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? 0 : parsed;
  };

  // Sincronizar con valor externo
  useEffect(() => {
    if (value === 0) {
      setDisplayValue('');
    } else {
      setDisplayValue(formatCurrency(value));
    }
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value;

    // Solo permitir números, puntos y comas
    const cleaned = input.replace(/[^0-9.,]/g, '');

    // Convertir comas a puntos
    const normalized = cleaned.replace(/,/g, '.');

    // Solo permitir un punto decimal
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
    if (numValue > 0) {
      setDisplayValue(formatCurrency(numValue));
    } else {
      setDisplayValue('');
    }
  };

  const handleFocus = () => {
    // Mostrar solo el número sin formato al enfocar
    if (value > 0) {
      setDisplayValue(value.toString());
    }
  };

  return (
    <div className="relative">
      <DollarSign
        className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
        style={themeColors ? { color: themeColors.secondary } : undefined}
      />
      <input
        type="text"
        inputMode="decimal"
        value={displayValue}
        onChange={handleChange}
        onBlur={handleBlur}
        onFocus={handleFocus}
        readOnly={readOnly}
        placeholder={placeholder || '0.00'}
        className={`w-full pl-9 pr-4 py-3 border-2 rounded-lg font-mono text-right ${className}`}
        style={style}
      />
    </div>
  );
};

export const GastoFormModal = ({
  gasto,
  claves,
  formasPago,
  proveedores: proveedoresInicial,
  ejecutivos,
  periodo,
  onClose,
  onSave
}: Props) => {
  const { user } = useAuth();
  const companyId = user?.company_id;
  const [saving, setSaving] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);

  // Estados para OCR (servicio inteligente igual que Eventos)
  const [isProcessingOCR, setIsProcessingOCR] = useState(false);
  const [ocrProgress, setOcrProgress] = useState<string>('');
  const ocrFileInputRef = useRef<HTMLInputElement>(null);
  const [shouldProcessOCR, setShouldProcessOCR] = useState(false); // true = procesar OCR, false = solo subir

  // 🆕 Estados para XML CFDI (igual que DualOCRExpenseForm de Eventos)
  const [xmlFile, setXmlFile] = useState<File | null>(null);
  const [visualFile, setVisualFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [lastProcessedMethod, setLastProcessedMethod] = useState<'xml' | 'ocr' | null>(null);

  // Hook de tema para colores dinámicos
  const { paletteConfig, isDark } = useTheme();

  // Lista de proveedores
  const [proveedores, setProveedores] = useState<Proveedor[]>(proveedoresInicial);

  // Autocomplete proveedor
  const [proveedorSearch, setProveedorSearch] = useState('');
  const [showProveedorDropdown, setShowProveedorDropdown] = useState(false);
  const proveedorInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Modal nuevo proveedor
  const [showNuevoProveedor, setShowNuevoProveedor] = useState(false);
  const [nuevoProveedorData, setNuevoProveedorData] = useState({
    razon_social: '',
    rfc: ''
  });

  // Selector de dos niveles: Cuenta → Subclave
  const [cuentaSeleccionada, setCuentaSeleccionada] = useState<string>('');

  // Toggle IVA
  const [calcularIVA, setCalcularIVA] = useState(true);

  // Form data
  const [formData, setFormData] = useState<GastoNoImpactadoFormData>({
    proveedor_id: null,
    concepto: '',
    clave_gasto_id: null,
    subtotal: 0,
    iva: 0,
    total: 0,
    validacion: 'pendiente',
    forma_pago_id: null,
    ejecutivo_id: null,
    status_pago: 'pagado',
    fecha_gasto: new Date().toISOString().split('T')[0],
    periodo: periodo,
    folio_factura: '',
    documento_url: null,
    notas: ''
  });

  // Estado para retenciones (no está en el form data original pero lo calculamos)
  const [retenciones, setRetenciones] = useState(0);

  // Estado de error de cuadre fiscal
  const [errorCuadre, setErrorCuadre] = useState<string | null>(null);

  // Colores dinámicos basados en la paleta activa
  const themeColors = useMemo(() => ({
    primary: paletteConfig.primary,
    secondary: paletteConfig.secondary,
    accent: paletteConfig.accent,
    primaryLight: paletteConfig.shades[100],
    primaryDark: paletteConfig.shades[700],
    bg: isDark ? '#1E293B' : '#FFFFFF',
    text: isDark ? '#F8FAFC' : '#1E293B',
    textSecondary: isDark ? '#CBD5E1' : '#64748B',
    border: isDark ? '#334155' : '#E2E8F0'
  }), [paletteConfig, isDark]);

  // Agrupar claves por cuenta
  const cuentasUnicas = useMemo(() => {
    const cuentas = [...new Set(claves.map(c => c.cuenta))];
    return cuentas.sort();
  }, [claves]);

  // Subclaves filtradas por cuenta seleccionada
  const subclavesFiltradas = useMemo(() => {
    if (!cuentaSeleccionada) return [];
    return claves
      .filter(c => c.cuenta === cuentaSeleccionada)
      .sort((a, b) => a.subcuenta.localeCompare(b.subcuenta));
  }, [claves, cuentaSeleccionada]);

  // Proveedores filtrados
  const proveedoresFiltrados = useMemo(() => {
    if (proveedorSearch.length < 2) return [];
    const searchLower = proveedorSearch.toLowerCase();
    return proveedores
      .filter(p =>
        p.razon_social.toLowerCase().includes(searchLower) ||
        (p.rfc && p.rfc.toLowerCase().includes(searchLower))
      )
      .slice(0, 10);
  }, [proveedorSearch, proveedores]);

  // Inicializar con datos del gasto a editar
  useEffect(() => {
    if (gasto) {
      const claveExistente = claves.find(c => c.clave === gasto.clave);

      setFormData({
        proveedor_id: gasto.proveedor_id,
        concepto: gasto.concepto || '',
        clave_gasto_id: claveExistente?.id || null,
        subtotal: gasto.subtotal || 0,
        iva: gasto.iva || 0,
        total: gasto.total || 0,
        validacion: gasto.validacion || 'pendiente',
        forma_pago_id: formasPago.find(f => f.nombre === gasto.forma_pago)?.id || null,
        ejecutivo_id: ejecutivos.find(e => e.nombre === gasto.ejecutivo)?.id || null,
        status_pago: gasto.status_pago || 'pagado',
        fecha_gasto: gasto.fecha_gasto?.split('T')[0] || new Date().toISOString().split('T')[0],
        periodo: gasto.periodo || periodo,
        folio_factura: gasto.folio_factura || '',
        documento_url: gasto.documento_url,
        notas: ''
      });

      setProveedorSearch(gasto.proveedor || '');

      // Establecer cuenta seleccionada
      if (claveExistente) {
        setCuentaSeleccionada(claveExistente.cuenta);
      }

      // Si ya tiene IVA diferente a 0, asumir que calcular IVA está activo
      setCalcularIVA(gasto.iva > 0);
    }
  }, [gasto, claves, formasPago, ejecutivos, periodo]);

  // =============================================
  // VALIDACIÓN DE CUADRE FISCAL
  // Fórmula: Total = Subtotal + IVA + Retenciones
  // =============================================

  // Validar cuadre cada vez que cambien los montos
  useEffect(() => {
    const calculado = Math.round((formData.subtotal + formData.iva + retenciones) * 100) / 100;
    const diferencia = Math.abs(calculado - formData.total);

    if (formData.total > 0 && diferencia > 0.01) {
      setErrorCuadre(`No cuadra: Subtotal ($${formData.subtotal.toFixed(2)}) + IVA ($${formData.iva.toFixed(2)}) + Retenciones ($${retenciones.toFixed(2)}) = $${calculado.toFixed(2)}, pero el Total es $${formData.total.toFixed(2)}`);
    } else {
      setErrorCuadre(null);
    }
  }, [formData.subtotal, formData.iva, formData.total, retenciones]);

  // Cambiar subtotal (NO calcula IVA automáticamente)
  const handleSubtotalChange = useCallback((newSubtotal: number) => {
    setFormData(prev => ({
      ...prev,
      subtotal: newSubtotal
    }));
  }, []);

  // Cambiar IVA manualmente
  const handleIvaChange = useCallback((newIva: number) => {
    setFormData(prev => ({
      ...prev,
      iva: newIva
    }));
  }, []);

  // Cambiar Total
  const handleTotalChange = useCallback((newTotal: number) => {
    setFormData(prev => ({
      ...prev,
      total: newTotal
    }));
  }, []);

  // Cambiar Retenciones
  const handleRetencionesChange = useCallback((newRetenciones: number) => {
    setRetenciones(newRetenciones);
  }, []);

  // BOTÓN: Calcular IVA desde el subtotal
  const calcularIvaDesdeSubtotal = useCallback(() => {
    if (formData.subtotal > 0) {
      const nuevoIva = Math.round(formData.subtotal * IVA_RATE * 100) / 100;
      const nuevoTotal = Math.round((formData.subtotal + nuevoIva + retenciones) * 100) / 100;
      setFormData(prev => ({
        ...prev,
        iva: nuevoIva,
        total: nuevoTotal
      }));
      toast.success(`IVA calculado: $${nuevoIva.toFixed(2)} (${IVA_PORCENTAJE}%)`);
    } else {
      toast.error('Ingresa primero el subtotal');
    }
  }, [formData.subtotal, retenciones]);

  // BOTÓN: Calcular Total desde los componentes (SOLO cuando retenciones es 0)
  const calcularTotalDesdeComponentes = useCallback(() => {
    // Solo calcular cuando retenciones es cero
    if (retenciones !== 0) {
      toast.error('Solo se puede calcular cuando Retenciones es 0');
      return;
    }
    const nuevoTotal = Math.round((formData.subtotal + formData.iva + retenciones) * 100) / 100;
    setFormData(prev => ({
      ...prev,
      total: nuevoTotal
    }));
    toast.success(`Total calculado: $${nuevoTotal.toFixed(2)}`);
  }, [formData.subtotal, formData.iva, retenciones]);

  // BOTÓN: Calcular Subtotal desde Total (inverso) - asume IVA = 0 o el actual
  const calcularSubtotalDesdeTotal = useCallback(() => {
    if (formData.total > 0) {
      // Subtotal = Total - IVA - Retenciones
      const nuevoSubtotal = Math.round((formData.total - formData.iva - retenciones) * 100) / 100;
      setFormData(prev => ({
        ...prev,
        subtotal: nuevoSubtotal
      }));
      toast.success(`Subtotal calculado: $${nuevoSubtotal.toFixed(2)}`);
    } else {
      toast.error('Ingresa primero el total');
    }
  }, [formData.total, formData.iva, retenciones]);

  // Cuando cambia la cuenta, limpiar subclave
  useEffect(() => {
    if (cuentaSeleccionada && !gasto) {
      setFormData(prev => ({ ...prev, clave_gasto_id: null }));
    }
  }, [cuentaSeleccionada, gasto]);

  const handleSelectProveedor = (proveedor: Proveedor) => {
    setFormData(prev => ({ ...prev, proveedor_id: proveedor.id }));
    setProveedorSearch(proveedor.razon_social);
    setShowProveedorDropdown(false);
  };

  const handleCrearNuevoProveedor = async () => {
    if (!companyId || !nuevoProveedorData.razon_social) return;

    try {
      const nuevo = await createProveedor({
        razon_social: nuevoProveedorData.razon_social,
        rfc: nuevoProveedorData.rfc,
        nombre_comercial: '',
        direccion: '',
        telefono: '',
        email: '',
        contacto_nombre: '',
        modulo_origen: 'contabilidad'
      }, companyId);

      setProveedores([...proveedores, nuevo]);
      handleSelectProveedor(nuevo);
      setShowNuevoProveedor(false);
      setNuevoProveedorData({ razon_social: '', rfc: '' });
      toast.success('Proveedor creado');
    } catch (error) {
      toast.error('Error al crear proveedor');
    }
  };

  // Subir archivo al bucket
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !companyId) return;

    // Solo PDFs e imágenes
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Solo se permiten archivos PDF o imágenes (JPG, PNG)');
      return;
    }

    setUploadingFile(true);
    try {
      // Generar nombre de archivo: {fecha}_{tipo_gasto}_{consecutivo}.ext
      const fechaArchivo = formData.fecha_gasto.replace(/-/g, '');
      const tipoGasto = cuentaSeleccionada?.replace(/\s+/g, '_') || 'GENERAL';
      const consecutivo = Date.now().toString().slice(-6);
      const extension = file.name.split('.').pop()?.toLowerCase() || 'pdf';

      // Carpeta por mes: /gni/{año-mes}/
      const periodoFolder = formData.fecha_gasto.substring(0, 7); // 2025-01
      const fileName = `${fechaArchivo}_${tipoGasto}_${consecutivo}.${extension}`;
      const filePath = `gni/${periodoFolder}/${fileName}`;

      // Subir al bucket 'event_docs'
      const { data, error } = await supabase.storage
        .from('event_docs')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        // Si el bucket no existe, mostrar error específico
        if (error.message.includes('not found')) {
          toast.error('Bucket "event_docs" no configurado en Supabase');
          return;
        }
        throw error;
      }

      // Obtener URL pública
      const { data: urlData } = supabase.storage
        .from('event_docs')
        .getPublicUrl(filePath);

      setFormData(prev => ({ ...prev, documento_url: urlData.publicUrl }));
      toast.success('Documento subido correctamente');
    } catch (error: any) {
      console.error('Error subiendo archivo:', error);
      toast.error('Error al subir documento: ' + (error.message || 'Error desconocido'));
    } finally {
      setUploadingFile(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // =============================================
  // FUNCIONALIDAD DE SUBIDA DE ARCHIVOS
  // =============================================

  // Solo subir archivo (sin OCR)
  const handleFileUploadOnly = async (file: File) => {
    if (!companyId) return;

    setUploadingFile(true);
    try {
      const fechaArchivo = formData.fecha_gasto.replace(/-/g, '');
      const tipoGasto = cuentaSeleccionada?.replace(/\s+/g, '_') || 'COMPROBANTE';
      const consecutivo = Date.now().toString().slice(-6);
      const extension = file.name.split('.').pop()?.toLowerCase() || 'pdf';
      const periodoFolder = formData.fecha_gasto.substring(0, 7);
      const fileName = `${fechaArchivo}_${tipoGasto}_${consecutivo}.${extension}`;
      const filePath = `gni/${periodoFolder}/${fileName}`;

      const { error } = await supabase.storage
        .from('event_docs')
        .upload(filePath, file, { cacheControl: '3600', upsert: false });

      if (error) {
        if (error.message.includes('not found')) {
          toast.error('Bucket "event_docs" no configurado');
          return;
        }
        throw error;
      }

      const { data: urlData } = supabase.storage
        .from('event_docs')
        .getPublicUrl(filePath);

      setFormData(prev => ({ ...prev, documento_url: urlData.publicUrl }));
      toast.success('Comprobante subido correctamente');
    } catch (error: any) {
      console.error('Error subiendo archivo:', error);
      toast.error('Error al subir: ' + (error.message || 'Error desconocido'));
    } finally {
      setUploadingFile(false);
      if (ocrFileInputRef.current) {
        ocrFileInputRef.current.value = '';
      }
    }
  };

  // =============================================
  // 🆕 FUNCIONALIDAD XML CFDI (100% PRECISIÓN - Igual que Eventos)
  // =============================================

  /**
   * Procesa archivo XML CFDI y extrae datos fiscales automáticamente
   * - 100% precisión (extracción directa del XML, sin OCR)
   * - Soporta CFDI 4.0 y versiones anteriores
   * - Extrae: emisor, receptor, montos, UUID, método de pago, etc.
   */
  const processXMLCFDI = async (xmlFileToProcess: File) => {
    setIsProcessingOCR(true);
    setOcrProgress('📄 Leyendo XML CFDI...');
    
    try {
      console.log('📄 Procesando XML CFDI:', xmlFileToProcess.name);
      
      // Leer el contenido del archivo XML
      const xmlContent = await xmlFileToProcess.text();
      console.log('📝 Contenido XML cargado, parseando...');
      
      // Parsear el XML usando el mismo motor que Eventos
      setOcrProgress('🔍 Extrayendo datos del CFDI...');
      const cfdiData = await parseCFDIXml(xmlContent);
      
      console.log('✅ CFDI parseado exitosamente:', cfdiData);
      console.log('  - Emisor:', cfdiData.emisor.nombre);
      console.log('  - Total:', cfdiData.total);
      console.log('  - UUID:', cfdiData.timbreFiscal?.uuid);
      
      // Convertir a formato del formulario
      setOcrProgress('📋 Aplicando datos al formulario...');
      const expenseData = cfdiToExpenseData(cfdiData);
      
      console.log('📋 Datos convertidos para el formulario:', expenseData);

      // Buscar proveedor por RFC o nombre
      let proveedorEncontrado: Proveedor | undefined;
      
      // Primero buscar por RFC (más preciso)
      if (expenseData.rfc_proveedor) {
        proveedorEncontrado = proveedores.find(p => 
          p.rfc?.toUpperCase() === expenseData.rfc_proveedor.toUpperCase()
        );
      }
      
      // Si no encuentra por RFC, buscar por nombre parcial
      if (!proveedorEncontrado && expenseData.proveedor) {
        proveedorEncontrado = proveedores.find(p =>
          p.razon_social.toLowerCase().includes(expenseData.proveedor!.toLowerCase().substring(0, 10))
        );
      }
      
      if (proveedorEncontrado) {
        setFormData(prev => ({ ...prev, proveedor_id: proveedorEncontrado!.id }));
        setProveedorSearch(proveedorEncontrado.razon_social);
        console.log('✅ Proveedor encontrado:', proveedorEncontrado.razon_social);
      } else {
        // Si no existe, poner el nombre para que el usuario lo cree
        setProveedorSearch(expenseData.proveedor || cfdiData.emisor.nombre);
        console.log('⚠️ Proveedor no encontrado, sugiriendo:', expenseData.proveedor);
        toast.success(`Proveedor "${cfdiData.emisor.nombre}" no existe. Puedes crearlo.`, { duration: 4000 });
      }

      // Actualizar montos (usar valores del XML que son 100% precisos)
      setFormData(prev => ({
        ...prev,
        subtotal: expenseData.subtotal,
        iva: expenseData.iva,
        total: expenseData.total,
        concepto: expenseData.concepto || prev.concepto,
        fecha_gasto: expenseData.fecha_gasto || prev.fecha_gasto,
        folio_factura: expenseData.uuid_cfdi || expenseData.folio || ''
      }));
      
      // Marcar método de procesamiento
      setLastProcessedMethod('xml');
      setXmlFile(xmlFileToProcess);

      // Guardar el XML en storage como comprobante
      if (companyId) {
        try {
          setOcrProgress('💾 Guardando comprobante XML...');
          const fechaArchivo = formData.fecha_gasto.replace(/-/g, '');
          const tipoGasto = cuentaSeleccionada?.replace(/\s+/g, '_') || 'XML';
          const consecutivo = Date.now().toString().slice(-6);
          const periodoFolder = formData.fecha_gasto.substring(0, 7);
          const fileName = `${fechaArchivo}_${tipoGasto}_${consecutivo}.xml`;
          const filePath = `gni/${periodoFolder}/${fileName}`;

          const { error: uploadError } = await supabase.storage
            .from('event_docs')
            .upload(filePath, xmlFileToProcess, { cacheControl: '3600', upsert: false });

          if (uploadError && !uploadError.message.includes('Bucket not found')) {
            console.warn('⚠️ No se pudo guardar comprobante XML:', uploadError.message);
          } else if (!uploadError) {
            const { data: urlData } = supabase.storage
              .from('event_docs')
              .getPublicUrl(filePath);
            setFormData(prev => ({ ...prev, documento_url: urlData.publicUrl }));
            console.log('✅ XML CFDI guardado como comprobante');
          }
        } catch (uploadErr) {
          console.warn('⚠️ Error guardando comprobante XML:', uploadErr);
        }
      }
      
      // Mensaje de éxito
      setOcrProgress('');
      toast.success(
        `✅ XML CFDI procesado con 100% precisión\n` +
        `Emisor: ${cfdiData.emisor.nombre}\n` +
        `Total: $${cfdiData.total.toFixed(2)}\n` +
        `UUID: ${cfdiData.timbreFiscal?.uuid?.substring(0, 8) || 'N/A'}...`,
        { duration: 5000 }
      );
      
      console.log('✅ Formulario actualizado con datos del CFDI');
      
    } catch (error: any) {
      console.error('❌ Error procesando XML CFDI:', error);
      setOcrProgress('');
      setLastProcessedMethod(null);
      
      // Mensaje de error detallado
      const errorMsg = error.message || 'Error desconocido';
      toast.error(
        `Error procesando XML CFDI:\n${errorMsg}\n\nVerifica que el archivo sea un CFDI válido.`,
        { duration: 6000 }
      );
    } finally {
      setIsProcessingOCR(false);
    }
  };

  // =============================================
  // 🆕 MANEJADOR UNIFICADO DE ARCHIVOS (XML + OCR)
  // =============================================

  /**
   * Detecta automáticamente el tipo de archivo y lo procesa:
   * - XML → processXMLCFDI (100% precisión)
   * - Imagen/PDF → OCR inteligente
   */
  const handleSmartFileUpload = async (file: File) => {
    if (!user?.id) return;

    // 🆕 DETECTAR XML AUTOMÁTICAMENTE
    const isXML = file.name.toLowerCase().endsWith('.xml') || 
                  file.type === 'text/xml' || 
                  file.type === 'application/xml';
    
    // Si es XML, procesarlo directamente (SIN OCR - 100% precisión)
    if (isXML) {
      console.log('📄 Archivo XML detectado - Procesando CFDI...');
      toast.success('XML detectado - Extrayendo datos fiscales...', { duration: 2000 });
      await processXMLCFDI(file);
      return;
    }
    
    // Validar tipo de archivo (imagen/PDF)
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
    if (!validTypes.includes(file.type)) {
      toast.error('Tipo de archivo no válido. Solo se permiten: JPG, PNG, PDF, XML');
      return;
    }
    
    // Validar tamaño (10MB máximo)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      toast.error('El archivo es demasiado grande. Máximo 10MB permitido.');
      return;
    }
    
    // Procesar con OCR
    setVisualFile(file);
    setShouldProcessOCR(true);
    
    // Simular evento de cambio para el handler existente
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(file);
    if (ocrFileInputRef.current) {
      ocrFileInputRef.current.files = dataTransfer.files;
      const event = new Event('change', { bubbles: true });
      ocrFileInputRef.current.dispatchEvent(event);
    }
  };

  // =============================================
  // 🆕 MANEJADORES DE DRAG & DROP (igual que Eventos)
  // =============================================

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };
  
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };
  
  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      await handleSmartFileUpload(droppedFile);
    }
  };

  // =============================================
  // FUNCIONALIDAD OCR INTELIGENTE (igual que Eventos)
  // =============================================

  // Procesar archivo: subir y opcionalmente procesar con OCR
  const handleOCRProcess = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user?.id) return;

    // 🆕 Detectar XML automáticamente
    const isXML = file.name.toLowerCase().endsWith('.xml') || 
                  file.type === 'text/xml' || 
                  file.type === 'application/xml';
    
    if (isXML) {
      await processXMLCFDI(file);
      return;
    }

    // Si no es modo OCR, solo subir el archivo
    if (!shouldProcessOCR) {
      await handleFileUploadOnly(file);
      setShouldProcessOCR(false);
      return;
    }

    setIsProcessingOCR(true);
    setOcrProgress('Procesando con OCR...');
    setLastProcessedMethod('ocr');

    try {
      console.log('🔍 Procesando PDF con OCR Inteligente:', file.name);

      // Usar el servicio inteligente (igual que Eventos)
      const result = await expenseOCRIntegration.processFileToExpense(
        file,
        'gni', // eventoId - usamos 'gni' como identificador
        user.id
      );

      if (!result.success && result.errors.length > 0) {
        toast.error(result.errors.join(', '));
        return;
      }

      const { expense, classification, warnings } = result;

      // Llenar formulario con datos extraídos
      if (expense) {
        // Buscar proveedor
        if (expense.proveedor) {
          const proveedorEncontrado = proveedores.find(p =>
            p.razon_social.toLowerCase().includes(expense.proveedor!.toLowerCase().substring(0, 10))
          );
          if (proveedorEncontrado) {
            setFormData(prev => ({ ...prev, proveedor_id: proveedorEncontrado.id }));
            setProveedorSearch(proveedorEncontrado.razon_social);
          } else {
            setProveedorSearch(expense.proveedor);
          }
        }

        // Montos
        if (expense.total && expense.total > 0) {
          setFormData(prev => ({
            ...prev,
            subtotal: expense.subtotal || Math.round((expense.total! / (1 + IVA_RATE)) * 100) / 100,
            iva: expense.iva || Math.round((expense.total! - (expense.total! / (1 + IVA_RATE))) * 100) / 100,
            total: expense.total!
          }));
        }

        // Concepto
        if (expense.concepto) {
          setFormData(prev => ({ ...prev, concepto: expense.concepto! }));
        }

        // Fecha
        if (expense.fecha_gasto) {
          setFormData(prev => ({ ...prev, fecha_gasto: expense.fecha_gasto! }));
        }

        // Folio/Referencia
        if (expense.referencia) {
          setFormData(prev => ({ ...prev, folio_factura: expense.referencia! }));
        }
      }

      // SUBIR EL PDF DEL OCR COMO COMPROBANTE
      if (companyId) {
        try {
          setOcrProgress('Guardando comprobante...');
          const fechaArchivo = formData.fecha_gasto.replace(/-/g, '');
          const tipoGasto = cuentaSeleccionada?.replace(/\s+/g, '_') || 'OCR';
          const consecutivo = Date.now().toString().slice(-6);
          const periodoFolder = formData.fecha_gasto.substring(0, 7);
          const fileName = `${fechaArchivo}_${tipoGasto}_${consecutivo}.pdf`;
          const filePath = `gni/${periodoFolder}/${fileName}`;

          const { error: uploadError } = await supabase.storage
            .from('event_docs')
            .upload(filePath, file, { cacheControl: '3600', upsert: false });

          if (uploadError && uploadError.message.includes('Bucket not found')) {
            toast.error('Error de configuración: El bucket "event_docs" no existe en Supabase.', { duration: 6000 });
            // No detenemos el flujo, solo advertimos y continuamos.
          }

          if (!uploadError) {
            const { data: urlData } = supabase.storage
              .from('event_docs')
              .getPublicUrl(filePath);
            setFormData(prev => ({ ...prev, documento_url: urlData.publicUrl }));
            console.log('✅ PDF OCR guardado como comprobante');
          } else {
            console.warn('⚠️ No se pudo guardar comprobante:', uploadError.message);
          }
        } catch (uploadErr) {
          console.warn('⚠️ Error guardando comprobante:', uploadErr);
        }
      }

      // Mostrar resultado
      const confianza = classification?.confianzaClasificacion || 0;
      toast.success(`PDF procesado (${confianza}% confianza)${warnings.length > 0 ? ' - Revise los datos' : ''}`);

      if (warnings.length > 0) {
        console.warn('Advertencias OCR:', warnings);
      }

    } catch (error: any) {
      console.error('❌ Error en OCR:', error);
      toast.error('Error procesando PDF: ' + (error.message || 'Error desconocido'));
    } finally {
      setIsProcessingOCR(false);
      setOcrProgress('');
      if (ocrFileInputRef.current) {
        ocrFileInputRef.current.value = '';
      }
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!companyId) return;

    // Validaciones
    if (!formData.proveedor_id) {
      toast.error('Selecciona un proveedor');
      return;
    }
    if (!formData.concepto.trim()) {
      toast.error('Ingresa el concepto');
      return;
    }
    if (formData.total <= 0) {
      toast.error('El total debe ser mayor a 0');
      return;
    }

    // ✅ VALIDACIÓN DE CUADRE FISCAL - NO PERMITE GUARDAR SI NO CUADRA
    const totalCalculado = Math.round((formData.subtotal + formData.iva + retenciones) * 100) / 100;
    const diferencia = Math.abs(totalCalculado - formData.total);
    if (diferencia > 0.01) {
      toast.error(`❌ Los montos no cuadran. Subtotal + IVA + Retenciones debe ser igual al Total. Diferencia: $${diferencia.toFixed(2)}`);
      return;
    }

    setSaving(true);
    try {
      if (gasto?.id) {
        await updateGasto(gasto.id, formData);
      } else {
        await createGasto(formData, companyId);
      }
      onSave();
    } catch (error) {
      console.error('Error guardando gasto:', error);
      toast.error('Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      {/* Modal con tamaño mejorado: 50% horizontal, 45% vertical mínimo */}
      <div
        className="rounded-xl shadow-2xl w-[50vw] min-w-[600px] max-w-[900px] min-h-[45vh] max-h-[85vh] overflow-hidden flex flex-col"
        style={{ backgroundColor: themeColors.bg }}
      >
        {/* Header con colores dinámicos e iconos */}
        <div
          className="flex items-center justify-between px-6 py-4 border-b"
          style={{
            background: `linear-gradient(135deg, ${themeColors.primary} 0%, ${themeColors.secondary} 100%)`,
            borderColor: themeColors.border
          }}
        >
          <div className="flex items-center gap-3">
            {gasto ? (
              <Pencil className="w-6 h-6 text-white" />
            ) : (
              <Plus className="w-6 h-6 text-white" />
            )}
            <h2 className="text-xl font-semibold text-white">
              {gasto ? 'Editar Gasto' : 'Nuevo Gasto'}
            </h2>
          </div>

          <div className="flex items-center gap-2">
            {/* Botón guardar en header */}
            <button
              onClick={() => handleSubmit()}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors text-white font-medium"
              title="Guardar gasto"
            >
              {saving ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Save className="w-5 h-5" />
              )}
              <span className="hidden sm:inline">Guardar</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4">
          {/* 🆕 Sección: Comprobante MEJORADA - XML CFDI + OCR + Drag & Drop */}
          <div 
            className={`mb-4 p-3 rounded-xl border-2 transition-all ${isDragging ? 'ring-4 ring-opacity-50' : ''}`} 
            style={{ 
              borderColor: isDragging ? themeColors.accent : themeColors.primary + '40', 
              backgroundColor: isDragging ? `${themeColors.accent}15` : themeColors.primaryLight + '10',
              ringColor: themeColors.accent
            }}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <h3
              className="text-sm font-semibold uppercase tracking-wide mb-3 flex items-center gap-2"
              style={{ color: themeColors.secondary }}
            >
              <FileCode className="w-4 h-4" />
              Comprobante (XML CFDI / PDF / Imagen)
              {lastProcessedMethod && (
                <span 
                  className="ml-auto text-xs font-normal px-2 py-0.5 rounded-full"
                  style={{ 
                    backgroundColor: lastProcessedMethod === 'xml' ? '#10B98120' : `${themeColors.accent}20`,
                    color: lastProcessedMethod === 'xml' ? '#10B981' : themeColors.accent
                  }}
                >
                  {lastProcessedMethod === 'xml' ? '✓ XML 100%' : '✓ OCR'}
                </span>
              )}
            </h3>

            {/* Input file oculto - Ahora acepta XML */}
            <input
              type="file"
              ref={ocrFileInputRef}
              accept=".xml,.pdf,.jpg,.jpeg,.png,text/xml,application/xml,application/pdf,image/*"
              onChange={handleOCRProcess}
              className="hidden"
            />

            {/* Preview del archivo si existe */}
            {formData.documento_url ? (
              <div className="flex items-center justify-between p-3 rounded-lg" style={{ backgroundColor: `${themeColors.primary}15` }}>
                <div className="flex items-center gap-2">
                  {xmlFile ? (
                    <FileCode className="w-5 h-5" style={{ color: '#10B981' }} />
                  ) : (
                    <FileText className="w-5 h-5" style={{ color: themeColors.primary }} />
                  )}
                  <span className="text-sm truncate max-w-[200px]" style={{ color: themeColors.text }}>
                    {xmlFile ? `XML: ${xmlFile.name}` : 'Archivo cargado'}
                  </span>
                </div>
                <div className="flex gap-2">
                  <a
                    href={formData.documento_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 text-xs rounded-lg transition-colors"
                    style={{ backgroundColor: themeColors.primary, color: '#fff' }}
                  >
                    Ver
                  </a>
                  <button
                    type="button"
                    onClick={() => {
                      setFormData(prev => ({ ...prev, documento_url: null }));
                      setXmlFile(null);
                      setVisualFile(null);
                      setLastProcessedMethod(null);
                    }}
                    className="px-3 py-1.5 text-xs rounded-lg border"
                    style={{ borderColor: themeColors.border, color: themeColors.textSecondary }}
                  >
                    Quitar
                  </button>
                </div>
              </div>
            ) : (
              /* 🆕 ZONA MEJORADA: Drag & Drop + 3 botones */
              <div className="space-y-3">
                {/* Zona de arrastre */}
                <div 
                  className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-all ${isDragging ? 'scale-[1.02]' : ''}`}
                  style={{ 
                    borderColor: isDragging ? themeColors.accent : themeColors.border,
                    backgroundColor: isDragging ? `${themeColors.accent}10` : 'transparent'
                  }}
                  onClick={() => {
                    setShouldProcessOCR(true);
                    ocrFileInputRef.current?.click();
                  }}
                >
                  <div className="flex flex-col items-center gap-2">
                    <div className="flex gap-2">
                      <FileCode className="w-6 h-6" style={{ color: '#10B981' }} />
                      <FileText className="w-6 h-6" style={{ color: themeColors.primary }} />
                    </div>
                    <p className="text-sm font-medium" style={{ color: themeColors.text }}>
                      {isDragging ? '¡Suelta el archivo aquí!' : 'Arrastra un archivo o haz clic'}
                    </p>
                    <p className="text-xs" style={{ color: themeColors.textSecondary }}>
                      XML CFDI (100% precisión) • PDF • JPG • PNG
                    </p>
                  </div>
                </div>

                {/* Tres botones en un renglón */}
                <div className="flex gap-2">
                  {/* Botón XML CFDI - Prioridad */}
                  <button
                    type="button"
                    onClick={() => {
                      setShouldProcessOCR(true);
                      ocrFileInputRef.current?.click();
                    }}
                    disabled={isProcessingOCR || uploadingFile}
                    className="flex-1 py-2.5 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-all text-xs font-medium"
                    style={{
                      background: 'linear-gradient(135deg, #10B981, #059669)',
                      color: '#fff',
                      opacity: isProcessingOCR || uploadingFile ? 0.7 : 1
                    }}
                  >
                    <FileCode className="w-4 h-4" />
                    XML CFDI
                  </button>

                  {/* Botón Procesar OCR */}
                  <button
                    type="button"
                    onClick={() => {
                      setShouldProcessOCR(true);
                      ocrFileInputRef.current?.click();
                    }}
                    disabled={isProcessingOCR || uploadingFile}
                    className={`flex-1 py-2.5 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-all text-xs font-medium ${isProcessingOCR ? 'animate-pulse' : ''}`}
                    style={{
                      background: isProcessingOCR
                        ? `linear-gradient(135deg, ${themeColors.primary}, ${themeColors.secondary})`
                        : `linear-gradient(135deg, ${themeColors.accent}, ${themeColors.primary})`,
                      color: '#fff',
                      boxShadow: isProcessingOCR ? `0 0 15px ${themeColors.primary}60` : 'none'
                    }}
                  >
                    {isProcessingOCR ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span className="truncate max-w-[80px]">{ocrProgress || 'Procesando...'}</span>
                      </>
                    ) : (
                      <>
                        <Bot className="w-4 h-4" />
                        <Zap className="w-3 h-3" />
                        OCR
                      </>
                    )}
                  </button>

                  {/* Botón Solo Subir */}
                  <button
                    type="button"
                    onClick={() => {
                      setShouldProcessOCR(false);
                      ocrFileInputRef.current?.click();
                    }}
                    disabled={uploadingFile || isProcessingOCR}
                    className="flex-1 py-2.5 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-all text-xs border-2"
                    style={{
                      borderColor: themeColors.border,
                      color: themeColors.text,
                      backgroundColor: themeColors.bg,
                      opacity: uploadingFile || isProcessingOCR ? 0.7 : 1
                    }}
                  >
                    {uploadingFile ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Subiendo...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4" />
                        Solo Subir
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
            <p className="text-xs mt-2 text-center" style={{ color: themeColors.textSecondary }}>
              💡 <strong>XML CFDI:</strong> Extracción 100% precisa • <strong>OCR:</strong> Para tickets e imágenes
            </p>
          </div>

          {/* Sección: Proveedor */}
          <div className="mb-4">
            <h3
              className="text-sm font-semibold uppercase tracking-wide mb-3"
              style={{ color: themeColors.secondary }}
            >
              Proveedor
            </h3>
            <div className="relative">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
                style={{ color: themeColors.secondary }}
              />
              <input
                ref={proveedorInputRef}
                type="text"
                value={proveedorSearch}
                onChange={(e) => {
                  setProveedorSearch(e.target.value);
                  setFormData(prev => ({ ...prev, proveedor_id: null }));
                }}
                onFocus={() => proveedorSearch.length >= 2 && setShowProveedorDropdown(true)}
                placeholder="Buscar proveedor por nombre o RFC..."
                className="w-full pl-10 pr-4 py-3 border-2 rounded-lg text-lg transition-all"
                style={{
                  borderColor: themeColors.border,
                  backgroundColor: themeColors.bg,
                  color: themeColors.text
                }}
                onFocusCapture={(e) => {
                  e.currentTarget.style.borderColor = themeColors.primary;
                  e.currentTarget.style.boxShadow = `0 0 0 3px ${themeColors.primaryLight}`;
                }}
                onBlurCapture={(e) => {
                  e.currentTarget.style.borderColor = themeColors.border;
                  e.currentTarget.style.boxShadow = 'none';
                }}
              />
              {formData.proveedor_id && (
                <span
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-medium px-2 py-1 rounded"
                  style={{
                    backgroundColor: `${themeColors.primary}20`,
                    color: themeColors.secondary
                  }}
                >
                  RFC: {proveedores.find(p => p.id === formData.proveedor_id)?.rfc || 'N/A'}
                </span>
              )}

              {/* Dropdown de proveedores */}
              {showProveedorDropdown && (
                <div
                  className="absolute z-20 w-full mt-1 border-2 rounded-lg shadow-xl max-h-48 overflow-y-auto"
                  style={{
                    backgroundColor: themeColors.bg,
                    borderColor: themeColors.border
                  }}
                >
                  {proveedoresFiltrados.length > 0 ? (
                    proveedoresFiltrados.map(p => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => handleSelectProveedor(p)}
                        className="w-full px-4 py-3 text-left flex justify-between items-center border-b last:border-0 transition-colors"
                        style={{
                          borderColor: themeColors.border,
                          color: themeColors.text
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = `${themeColors.primary}15`}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                      >
                        <span className="font-medium">{p.razon_social}</span>
                        <span style={{ color: themeColors.textSecondary }}>{p.rfc || ''}</span>
                      </button>
                    ))
                  ) : (
                    <div className="px-4 py-4 text-center" style={{ color: themeColors.textSecondary }}>
                      <p className="mb-3">No se encontraron proveedores</p>
                      <button
                        type="button"
                        onClick={() => {
                          setShowNuevoProveedor(true);
                          setNuevoProveedorData({ razon_social: proveedorSearch, rfc: '' });
                          setShowProveedorDropdown(false);
                        }}
                        className="flex items-center justify-center gap-2 font-medium"
                        style={{ color: themeColors.primary }}
                      >
                        <Plus className="w-4 h-4" />
                        Crear "{proveedorSearch}"
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Sección: Clasificación - Dos columnas */}
          <div className="mb-6">
            <h3
              className="text-sm font-semibold uppercase tracking-wide mb-3"
              style={{ color: themeColors.secondary }}
            >
              Clasificación del Gasto
            </h3>
            <div className="grid grid-cols-2 gap-4">
              {/* Selector de Cuenta */}
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: themeColors.text }}>
                  Cuenta (Tipo de Gasto)
                </label>
                <select
                  value={cuentaSeleccionada}
                  onChange={(e) => setCuentaSeleccionada(e.target.value)}
                  className="w-full px-4 py-3 border-2 rounded-lg"
                  style={{
                    borderColor: themeColors.border,
                    backgroundColor: themeColors.bg,
                    color: themeColors.text
                  }}
                >
                  <option value="">Seleccionar cuenta...</option>
                  {cuentasUnicas.map(cuenta => (
                    <option key={cuenta} value={cuenta}>{cuenta}</option>
                  ))}
                </select>
              </div>

              {/* Selector de Subclave */}
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: themeColors.text }}>
                  Subclave de Gasto
                </label>
                <select
                  value={formData.clave_gasto_id || ''}
                  onChange={(e) => setFormData({ ...formData, clave_gasto_id: e.target.value ? parseInt(e.target.value) : null })}
                  disabled={!cuentaSeleccionada}
                  className="w-full px-4 py-3 border-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    borderColor: themeColors.border,
                    backgroundColor: cuentaSeleccionada ? themeColors.bg : `${themeColors.border}40`,
                    color: themeColors.text
                  }}
                >
                  <option value="">
                    {cuentaSeleccionada ? 'Seleccionar subclave...' : 'Primero selecciona cuenta'}
                  </option>
                  {subclavesFiltradas.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.clave} - {c.subcuenta}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Sección: Concepto */}
          <div className="mb-6">
            <label className="block text-sm font-medium mb-1" style={{ color: themeColors.text }}>
              Concepto / Descripción *
            </label>
            <input
              type="text"
              value={formData.concepto}
              onChange={(e) => setFormData({ ...formData, concepto: e.target.value })}
              className="w-full px-4 py-3 border-2 rounded-lg"
              placeholder="Descripción detallada del gasto"
              style={{
                borderColor: themeColors.border,
                backgroundColor: themeColors.bg,
                color: themeColors.text
              }}
            />
          </div>

          {/* Sección: Montos - Grid de 5 columnas con máscara de dinero */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h3
                className="text-sm font-semibold uppercase tracking-wide"
                style={{ color: themeColors.secondary }}
              >
                Montos
              </h3>
              {/* Indicador de cuadre */}
              {formData.total > 0 && (
                <div
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium"
                  style={{
                    backgroundColor: errorCuadre ? '#FEE2E2' : '#D1FAE5',
                    color: errorCuadre ? '#DC2626' : '#059669'
                  }}
                >
                  {errorCuadre ? (
                    <>
                      <span className="text-lg">❌</span>
                      <span>No cuadra</span>
                    </>
                  ) : (
                    <>
                      <span className="text-lg">✅</span>
                      <span>Cuadre validado</span>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Fórmula visual */}
            <div className="mb-3 p-2 rounded-lg text-xs text-center" style={{ backgroundColor: `${themeColors.primary}10`, color: themeColors.textSecondary }}>
              <strong>Fórmula:</strong> Total = Subtotal + IVA + Retenciones
            </div>

            <div className="grid grid-cols-5 gap-3">
              {/* Subtotal */}
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: themeColors.text }}>
                  Subtotal *
                </label>
                <CurrencyInput
                  value={formData.subtotal}
                  onChange={handleSubtotalChange}
                  placeholder=""
                  themeColors={themeColors}
                  className="focus:ring-2"
                  style={{
                    borderColor: themeColors.border,
                    backgroundColor: themeColors.bg,
                    color: themeColors.text
                  }}
                />
              </div>

              {/* IVA con botón de calcular */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-sm font-medium" style={{ color: themeColors.text }}>
                    IVA
                  </label>
                  <button
                    type="button"
                    onClick={calcularIvaDesdeSubtotal}
                    className="flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium transition-colors hover:opacity-80"
                    style={{
                      backgroundColor: `${themeColors.primary}30`,
                      color: themeColors.secondary
                    }}
                    title={`Calcular IVA al ${IVA_PORCENTAJE}%`}
                  >
                    <Calculator className="w-3 h-3" />
                    {IVA_PORCENTAJE}%
                  </button>
                </div>
                <CurrencyInput
                  value={formData.iva}
                  onChange={handleIvaChange}
                  themeColors={themeColors}
                  style={{
                    borderColor: themeColors.border,
                    backgroundColor: themeColors.bg,
                    color: themeColors.text
                  }}
                />
              </div>

              {/* Retenciones */}
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: themeColors.text }}>
                  Retenciones
                </label>
                <CurrencyInput
                  value={retenciones}
                  onChange={handleRetencionesChange}
                  placeholder="0.00"
                  themeColors={themeColors}
                  style={{
                    borderColor: themeColors.border,
                    backgroundColor: themeColors.bg,
                    color: themeColors.text
                  }}
                />
              </div>

              {/* Total */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-sm font-medium" style={{ color: themeColors.text }}>
                    Total *
                  </label>
                  <button
                    type="button"
                    onClick={calcularTotalDesdeComponentes}
                    disabled={retenciones !== 0}
                    className="flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium transition-colors hover:opacity-80 disabled:opacity-40 disabled:cursor-not-allowed"
                    style={{
                      backgroundColor: retenciones === 0 ? `${themeColors.primary}30` : '#94a3b8',
                      color: retenciones === 0 ? themeColors.secondary : '#64748b'
                    }}
                    title={retenciones === 0 ? "Calcular Total = Subtotal + IVA + Retenciones" : "Solo se activa cuando Retenciones es 0"}
                  >
                    <Calculator className="w-3 h-3" />
                    Calc
                  </button>
                </div>
                <CurrencyInput
                  value={formData.total}
                  onChange={handleTotalChange}
                  themeColors={themeColors}
                  className="font-bold focus:ring-2"
                  style={{
                    borderColor: errorCuadre ? '#DC2626' : '#059669',
                    backgroundColor: errorCuadre ? '#FEF2F2' : '#F0FDF4',
                    color: errorCuadre ? '#DC2626' : '#059669'
                  }}
                />
              </div>

              {/* Fecha */}
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: themeColors.text }}>
                  Fecha *
                </label>
                <input
                  type="date"
                  value={formData.fecha_gasto}
                  onChange={(e) => setFormData({ ...formData, fecha_gasto: e.target.value })}
                  className="w-full px-4 py-3 border-2 rounded-lg"
                  style={{
                    borderColor: themeColors.border,
                    backgroundColor: themeColors.bg,
                    color: themeColors.text
                  }}
                />
              </div>
            </div>

            {/* Mensaje de error de cuadre */}
            {errorCuadre && (
              <div className="mt-2 p-2 rounded-lg text-sm" style={{ backgroundColor: '#FEE2E2', color: '#DC2626' }}>
                ⚠️ {errorCuadre}
              </div>
            )}
          </div>

          {/* Sección: Detalles - Grid de 4 columnas */}
          <div className="mb-6">
            <h3
              className="text-sm font-semibold uppercase tracking-wide mb-3"
              style={{ color: themeColors.secondary }}
            >
              Detalles
            </h3>
            <div className="grid grid-cols-3 gap-4">
              {/* Forma de pago */}
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: themeColors.text }}>
                  Forma de Pago
                </label>
                <select
                  value={formData.forma_pago_id || ''}
                  onChange={(e) => setFormData({ ...formData, forma_pago_id: e.target.value ? parseInt(e.target.value) : null })}
                  className="w-full px-4 py-2.5 border-2 rounded-lg"
                  style={{
                    borderColor: themeColors.border,
                    backgroundColor: themeColors.bg,
                    color: themeColors.text
                  }}
                >
                  <option value="">Seleccionar...</option>
                  {formasPago.map(f => (
                    <option key={f.id} value={f.id}>{f.nombre}</option>
                  ))}
                </select>
              </div>

              {/* Ejecutivo */}
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: themeColors.text }}>
                  Ejecutivo
                </label>
                <select
                  value={formData.ejecutivo_id || ''}
                  onChange={(e) => setFormData({ ...formData, ejecutivo_id: e.target.value ? parseInt(e.target.value) : null })}
                  className="w-full px-4 py-2.5 border-2 rounded-lg"
                  style={{
                    borderColor: themeColors.border,
                    backgroundColor: themeColors.bg,
                    color: themeColors.text
                  }}
                >
                  <option value="">Seleccionar...</option>
                  {ejecutivos.map(e => (
                    <option key={e.id} value={e.id}>{e.nombre}</option>
                  ))}
                </select>
              </div>

              {/* Validación */}
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: themeColors.text }}>
                  Validación
                </label>
                <select
                  value={formData.validacion}
                  onChange={(e) => setFormData({ ...formData, validacion: e.target.value })}
                  className="w-full px-4 py-2.5 border-2 rounded-lg"
                  style={{
                    borderColor: themeColors.border,
                    backgroundColor: themeColors.bg,
                    color: themeColors.text
                  }}
                >
                  <option value="pendiente">Pendiente</option>
                  <option value="correcto">Correcto</option>
                  <option value="revisar">Revisar</option>
                </select>
              </div>

              {/* Status de pago - SIEMPRE PAGADO (oculto - no se muestra al usuario) */}
            </div>
          </div>

          {/* Sección: Documentación - 2 columnas */}
          <div className="mb-6">
            <h3
              className="text-sm font-semibold uppercase tracking-wide mb-3"
              style={{ color: themeColors.secondary }}
            >
              Documentación
            </h3>
            <div className="grid grid-cols-2 gap-4">
              {/* Folio factura */}
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: themeColors.text }}>
                  Folio de Factura
                </label>
                <input
                  type="text"
                  value={formData.folio_factura}
                  onChange={(e) => setFormData({ ...formData, folio_factura: e.target.value })}
                  className="w-full px-4 py-2.5 border-2 rounded-lg"
                  placeholder="FACT-12345, N/A, etc."
                  style={{
                    borderColor: themeColors.border,
                    backgroundColor: themeColors.bg,
                    color: themeColors.text
                  }}
                />
              </div>

            </div>
          </div>

          {/* Notas */}
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: themeColors.text }}>
              Notas adicionales
            </label>
            <textarea
              value={formData.notas}
              onChange={(e) => setFormData({ ...formData, notas: e.target.value })}
              rows={2}
              className="w-full px-4 py-2.5 border-2 rounded-lg resize-none"
              placeholder="Observaciones o comentarios..."
              style={{
                borderColor: themeColors.border,
                backgroundColor: themeColors.bg,
                color: themeColors.text
              }}
            />
          </div>
        </form>

        {/* Footer */}
        <div
          className="flex justify-between items-center px-6 py-4 border-t"
          style={{
            backgroundColor: `${themeColors.border}30`,
            borderColor: themeColors.border
          }}
        >
          <div className="text-sm" style={{ color: themeColors.textSecondary }}>
            IVA configurado: {IVA_PORCENTAJE}%
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2.5 border-2 rounded-lg font-medium transition-colors"
              style={{
                borderColor: themeColors.border,
                color: themeColors.text
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = `${themeColors.border}40`}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              Cancelar
            </button>
            <button
              onClick={() => handleSubmit()}
              disabled={saving}
              className="px-8 py-2.5 rounded-lg font-medium flex items-center gap-2 transition-colors text-white disabled:opacity-50"
              style={{
                backgroundColor: themeColors.primary,
                color: isDark ? '#1E293B' : '#FFFFFF'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = themeColors.secondary}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = themeColors.primary}
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Guardando...
                </>
              ) : gasto ? (
                <>
                  <Save className="w-4 h-4" />
                  Actualizar
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Crear Gasto
                </>
              )}
            </button>
          </div>
        </div>

        {/* Modal nuevo proveedor */}
        {showNuevoProveedor && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center z-30">
            <div
              className="rounded-xl p-6 w-[400px] shadow-2xl"
              style={{ backgroundColor: themeColors.bg }}
            >
              <h3 className="text-lg font-semibold mb-4" style={{ color: themeColors.text }}>
                Nuevo Proveedor
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: themeColors.text }}>
                    Razón Social *
                  </label>
                  <input
                    type="text"
                    value={nuevoProveedorData.razon_social}
                    onChange={(e) => setNuevoProveedorData({ ...nuevoProveedorData, razon_social: e.target.value })}
                    className="w-full px-4 py-2.5 border-2 rounded-lg"
                    style={{
                      borderColor: themeColors.border,
                      backgroundColor: themeColors.bg,
                      color: themeColors.text
                    }}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: themeColors.text }}>
                    RFC
                  </label>
                  <input
                    type="text"
                    value={nuevoProveedorData.rfc}
                    onChange={(e) => setNuevoProveedorData({ ...nuevoProveedorData, rfc: e.target.value.toUpperCase() })}
                    className="w-full px-4 py-2.5 border-2 rounded-lg"
                    maxLength={13}
                    style={{
                      borderColor: themeColors.border,
                      backgroundColor: themeColors.bg,
                      color: themeColors.text
                    }}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowNuevoProveedor(false)}
                  className="px-4 py-2 border-2 rounded-lg transition-colors"
                  style={{
                    borderColor: themeColors.border,
                    color: themeColors.text
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleCrearNuevoProveedor}
                  className="px-4 py-2 rounded-lg text-white transition-colors"
                  style={{
                    backgroundColor: themeColors.primary,
                    color: isDark ? '#1E293B' : '#FFFFFF'
                  }}
                >
                  Crear Proveedor
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
