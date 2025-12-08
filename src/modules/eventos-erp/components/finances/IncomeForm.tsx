/**
 * FORMULARIO DE INGRESOS - SIMPLIFICADO Y CON TEMA DINÁMICO
 * - Usa paleta de colores dinámica
 * - Campos simplificados: concepto, cliente, total, fecha, responsable
 * - Estilo homogéneo con GastoForm y ProvisionForm
 */
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  DollarSign, FileText, Calculator, Loader2, Calendar,
  Upload, UserCheck, X, Save, Building2, CreditCard
} from 'lucide-react';
import { useTheme } from '../../../../shared/components/theme';
import { useFileUpload } from '../../hooks/useFileUpload';
import { useUsers } from '../../hooks/useUsers';
import { useClients } from '../../hooks/useClients';
import { useCuentasContables } from '../../hooks/useCuentasContables';
import { useAuth } from '../../../../core/auth/AuthProvider';
import { formatCurrency } from '../../../../shared/utils/formatters';
import { MEXICAN_CONFIG, BUSINESS_RULES } from '../../../../core/config/constants';
import { Income } from '../../types/Finance';
import { parseCFDIXml, cfdiToIncomeData } from '../../utils/cfdiXmlParser';
import { toast } from 'react-hot-toast';
import { useSATValidation } from '../../hooks/useSATValidation';
import SATStatusBadge, { SATAlertBox } from '../ui/SATStatusBadge';

// IVA desde config
const IVA_PORCENTAJE = MEXICAN_CONFIG.ivaRate;
const IVA_RATE = IVA_PORCENTAJE / 100;

interface IncomeFormProps {
  income?: Income | null;
  eventId: string;
  onSave: (data: Partial<Income>) => void;
  onCancel: () => void;
  className?: string;
}

// Componente de input de moneda con máscara
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

export const IncomeForm: React.FC<IncomeFormProps> = ({
  income,
  eventId,
  onSave,
  onCancel,
  className = ''
}) => {
  // Hook de autenticación para company_id
  const { user } = useAuth();

  // Hook de tema para colores dinámicos
  const { paletteConfig, isDark } = useTheme();

  // Hook de validación SAT
  const { validar: validarSAT, resultado: resultadoSAT, isValidating: validandoSAT, resetear: resetearSAT } = useSATValidation();

  // Estado para datos CFDI necesarios para validación SAT
  const [cfdiData, setCfdiData] = useState<{
    rfcEmisor?: string;
    rfcReceptor?: string;
    total?: number;
    uuid?: string;
  }>({});

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
    concepto: income?.concepto || '',
    descripcion: income?.descripcion || '',
    subtotal: income?.subtotal || 0,
    iva: income?.iva || 0,
    total: income?.total || 0,
    iva_porcentaje: income?.iva_porcentaje || IVA_PORCENTAJE,
    fecha_ingreso: income?.fecha_ingreso || new Date().toISOString().split('T')[0],
    metodo_cobro: income?.metodo_cobro || 'transferencia',
    facturado: income?.facturado || false,
    cobrado: income?.cobrado || false,
    dias_credito: income?.dias_credito || 30,
    fecha_compromiso_pago: income?.fecha_compromiso_pago || '',
    fecha_facturacion: income?.fecha_facturacion || new Date().toISOString().split('T')[0],
    fecha_cobro: income?.fecha_cobro || '',
    responsable_id: income?.responsable_id || '',
    cuenta_contable_id: (income as any)?.cuenta_contable_id || '',
    cliente_id: income?.cliente_id || '',
    cliente: income?.cliente || '',
    rfc_cliente: income?.rfc_cliente || '',
    archivo_adjunto: income?.archivo_adjunto || '',
    archivo_nombre: income?.archivo_nombre || ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorCuadre, setErrorCuadre] = useState<string | null>(null);

  // Archivos
  const [xmlFile, setXmlFile] = useState<File | null>(null);
  const [pdfFile, setPdfFile] = useState<File | null>(null);

  const { uploadFile, isUploading } = useFileUpload();
  const { data: users, loading: loadingUsers } = useUsers();
  const { clients, isLoading: loadingClients } = useClients();
  const { data: cuentasContables } = useCuentasContables();

  // Filtrar cuentas bancarias para ingresos
  const filteredCuentas = useMemo(() => {
    if (!cuentasContables) return [];
    if (BUSINESS_RULES.limitBankAccountsForIncomes) {
      return cuentasContables.filter(c => Number(c.id) >= BUSINESS_RULES.minBankAccountIdForIncomes);
    }
    return cuentasContables;
  }, [cuentasContables]);

  // Validar cuadre fiscal
  useEffect(() => {
    const calculado = Math.round((formData.subtotal + formData.iva) * 100) / 100;
    const diferencia = Math.abs(calculado - formData.total);
    if (formData.total > 0 && diferencia > 0.01) {
      setErrorCuadre(`No cuadra: Subtotal + IVA = $${calculado.toFixed(2)}, pero Total es $${formData.total.toFixed(2)}`);
    } else {
      setErrorCuadre(null);
    }
  }, [formData.subtotal, formData.iva, formData.total]);

  // Calcular fecha de compromiso basada en días de crédito
  useEffect(() => {
    if (formData.fecha_facturacion && formData.dias_credito) {
      const fecha = new Date(formData.fecha_facturacion);
      fecha.setDate(fecha.getDate() + formData.dias_credito);
      const fechaCompromiso = fecha.toISOString().split('T')[0];
      if (formData.fecha_compromiso_pago !== fechaCompromiso) {
        setFormData(prev => ({ ...prev, fecha_compromiso_pago: fechaCompromiso }));
      }
    }
  }, [formData.fecha_facturacion, formData.dias_credito]);

  // Calcular IVA desde subtotal
  const calcularIvaDesdeSubtotal = useCallback(() => {
    if (formData.subtotal > 0) {
      const nuevoIva = Math.round(formData.subtotal * IVA_RATE * 100) / 100;
      const nuevoTotal = Math.round((formData.subtotal + nuevoIva) * 100) / 100;
      setFormData(prev => ({ ...prev, iva: nuevoIva, total: nuevoTotal }));
      toast.success(`IVA calculado: $${nuevoIva.toFixed(2)} (${IVA_PORCENTAJE}%)`);
    }
  }, [formData.subtotal]);

  // Calcular total
  const calcularTotal = useCallback(() => {
    const nuevoTotal = Math.round((formData.subtotal + formData.iva) * 100) / 100;
    setFormData(prev => ({ ...prev, total: nuevoTotal }));
    toast.success(`Total calculado: $${nuevoTotal.toFixed(2)}`);
  }, [formData.subtotal, formData.iva]);

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }));
  };

  // Procesar XML CFDI con validación SAT
  const processXMLCFDI = async (xmlFile: File) => {
    try {
      const xmlContent = await xmlFile.text();
      const parsedCfdi = await parseCFDIXml(xmlContent);
      const incomeData = cfdiToIncomeData(parsedCfdi);

      // Guardar datos CFDI para validación SAT
      setCfdiData({
        rfcEmisor: parsedCfdi.emisor?.rfc,
        rfcReceptor: parsedCfdi.receptor?.rfc,
        total: parsedCfdi.total,
        uuid: parsedCfdi.timbreFiscal?.uuid
      });

      setFormData(prev => ({ ...prev, ...incomeData, evento_id: eventId }));
      toast.success(`XML procesado: ${parsedCfdi.receptor?.nombre || 'Cliente'} - $${parsedCfdi.total.toFixed(2)}`);

      // Validar con SAT si hay UUID
      if (parsedCfdi.timbreFiscal?.uuid) {
        toast.loading('Validando con SAT...', { id: 'sat-validation' });
        const satResult = await validarSAT({
          rfcEmisor: parsedCfdi.emisor?.rfc || '',
          rfcReceptor: parsedCfdi.receptor?.rfc || '',
          total: parsedCfdi.total,
          uuid: parsedCfdi.timbreFiscal.uuid
        });
        toast.dismiss('sat-validation');

        if (satResult.esValida) {
          toast.success('✅ CFDI válido ante el SAT');
        } else if (satResult.esCancelada) {
          toast.error('❌ CFDI CANCELADO - No se puede registrar');
        } else if (satResult.noEncontrada) {
          toast.error('⚠️ CFDI no encontrado en el SAT');
        } else {
          toast.error(`⚠️ ${satResult.mensaje || 'Error en validación SAT'}`);
        }
      }
    } catch (error: any) {
      toast.error(`Error procesando XML: ${error.message}`);
    }
  };

  // Procesar documentos
  const processDocuments = async () => {
    if (!xmlFile) {
      toast.error('Se requiere el XML CFDI para ingresos');
      return;
    }

    await processXMLCFDI(xmlFile);

    if (pdfFile) {
      const uploadResult = await uploadFile({ file: pdfFile, type: 'income', eventId });
      setFormData(prev => ({
        ...prev,
        archivo_adjunto: uploadResult.url,
        archivo_nombre: uploadResult.fileName
      }));
      toast.success('XML procesado + PDF adjunto');
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.concepto.trim()) newErrors.concepto = 'Concepto requerido';
    if (formData.total <= 0) newErrors.total = 'Total debe ser mayor a 0';
    // Cliente y responsable son opcionales - se auto-asignan si no se seleccionan
    if (!formData.fecha_ingreso) newErrors.fecha_ingreso = 'Fecha requerida';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!validateForm()) return;

    // Validar cuadre
    const totalCalculado = Math.round((formData.subtotal + formData.iva) * 100) / 100;
    if (Math.abs(totalCalculado - formData.total) > 0.01) {
      toast.error('Los montos no cuadran');
      return;
    }

    // Validar que el CFDI no esté cancelado (si hay resultado SAT)
    if (resultadoSAT) {
      if (resultadoSAT.esCancelada) {
        toast.error('❌ No se puede guardar: CFDI CANCELADO ante el SAT');
        return;
      }
      if (resultadoSAT.noEncontrada) {
        toast.error('⚠️ No se puede guardar: CFDI no encontrado en el SAT');
        return;
      }
    }

    setIsSubmitting(true);
    try {
      // Auto-asignar responsable si no hay uno seleccionado
      let responsableId = formData.responsable_id;
      if (!responsableId && users && users.length > 0) {
        // Asignar el primer usuario disponible o uno al azar
        const randomUser = users[Math.floor(Math.random() * users.length)];
        responsableId = randomUser.id;
        toast.info(`Responsable asignado automáticamente: ${randomUser.nombre}`);
      }

      // Auto-asignar cliente si no hay uno seleccionado
      let clienteId = formData.cliente_id;
      let clienteNombre = formData.cliente;
      if (!clienteId && clients && clients.length > 0) {
        const randomClient = clients[0]; // Usar el primero
        clienteId = String(randomClient.id);
        clienteNombre = randomClient.nombre_comercial || randomClient.razon_social || '';
      }

      // Mapear campos del formulario a los nombres de columna de la BD
      const dataToSave = {
        // ✅ CAMPO OBLIGATORIO: company_id
        company_id: user?.company_id || '00000000-0000-0000-0000-000000000001',
        concepto: formData.concepto,
        descripcion: formData.descripcion,
        subtotal: formData.subtotal,
        iva: formData.iva,
        total: formData.total,
        iva_porcentaje: formData.iva_porcentaje,
        fecha_ingreso: formData.fecha_ingreso || null,
        metodo_pago: formData.metodo_cobro, // BD usa metodo_pago
        facturado: formData.facturado,
        cobrado: formData.cobrado,
        dias_credito: formData.dias_credito,
        fecha_compromiso_pago: formData.fecha_compromiso_pago || null,
        fecha_facturacion: formData.fecha_facturacion || null,
        fecha_cobro: formData.fecha_cobro || null,
        responsable_id: responsableId || null,
        cuenta_contable_id: formData.cuenta_contable_id ? parseInt(formData.cuenta_contable_id) : null,
        cliente_id: clienteId ? parseInt(clienteId) : null,
        cliente: clienteNombre,
        rfc_cliente: formData.rfc_cliente,
        // Campos de archivo - usar pdf_url si archivo_adjunto no existe
        pdf_url: formData.archivo_adjunto,
        archivo_nombre: formData.archivo_nombre,
        // Campos CFDI
        proveedor: (formData as any).proveedor,
        rfc_proveedor: (formData as any).rfc_proveedor,
        uuid_cfdi: (formData as any).uuid_cfdi,
        folio_fiscal: (formData as any).folio_fiscal,
        serie: (formData as any).serie,
        folio: (formData as any).folio,
        tipo_comprobante: (formData as any).tipo_comprobante,
        forma_pago_sat: (formData as any).forma_pago_sat,
        metodo_pago_sat: (formData as any).metodo_pago_sat,
        moneda: (formData as any).moneda,
        tipo_cambio: (formData as any).tipo_cambio,
        lugar_expedicion: (formData as any).lugar_expedicion,
        uso_cfdi: (formData as any).uso_cfdi,
        regimen_fiscal_receptor: (formData as any).regimen_fiscal_receptor,
        regimen_fiscal_emisor: (formData as any).regimen_fiscal_emisor,
        detalle_compra: (formData as any).detalle_compra,
        // Campos de validación SAT
        sat_estado: resultadoSAT?.estado,
        sat_validado: resultadoSAT?.success ? true : false,
        // Campos de evento y timestamp
        evento_id: parseInt(eventId),
        fecha_actualizacion: new Date().toISOString()
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
      className={`rounded-lg shadow-lg overflow-hidden ${className}`}
      style={{ backgroundColor: themeColors.bg }}
    >
      {/* Header compacto */}
      <div
        className="flex items-center justify-between px-4 py-2"
        style={{
          background: `linear-gradient(135deg, ${themeColors.primary} 0%, ${themeColors.primaryDark} 100%)`
        }}
      >
        <div className="flex items-center gap-2">
          <DollarSign className="w-5 h-5 text-white" />
          <h2 className="text-base font-semibold text-white">
            {income ? 'Editar Ingreso' : 'Nuevo Ingreso'}
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleSubmit()}
            disabled={isSubmitting}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded text-white text-sm font-medium"
          >
            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Guardar
          </button>
          <button onClick={onCancel} className="p-1.5 hover:bg-white/20 rounded">
            <X className="w-4 h-4 text-white" />
          </button>
        </div>
      </div>

      {/* Form compacto */}
      <form onSubmit={handleSubmit} className="p-3 space-y-3 max-h-[75vh] overflow-y-auto">

        {/* Documentos XML + PDF - Compacto en línea */}
        <div className="flex gap-2 items-center">
          {/* XML */}
          <div className="flex-1">
            {!xmlFile ? (
              <label className="flex items-center gap-1.5 px-2 py-1.5 border border-dashed rounded cursor-pointer hover:bg-gray-50 text-sm"
                style={{ borderColor: themeColors.border }}>
                <Upload className="w-3.5 h-3.5" style={{ color: themeColors.primary }} />
                <span style={{ color: themeColors.textSecondary }}>XML CFDI</span>
                <input type="file" accept=".xml" className="hidden"
                  onChange={(e) => e.target.files?.[0] && setXmlFile(e.target.files[0])} />
              </label>
            ) : (
              <div className="flex items-center gap-1 px-2 py-1 rounded text-xs" style={{ backgroundColor: themeColors.primaryLight }}>
                <span className="font-medium truncate max-w-[120px]" style={{ color: themeColors.primaryDark }}>{xmlFile.name}</span>
                <button type="button" onClick={() => setXmlFile(null)} className="text-gray-500 hover:text-red-500">✕</button>
              </div>
            )}
          </div>

          {/* PDF */}
          <div className="flex-1">
            {!pdfFile ? (
              <label className="flex items-center gap-1.5 px-2 py-1.5 border border-dashed rounded cursor-pointer hover:bg-gray-50 text-sm"
                style={{ borderColor: themeColors.border }}>
                <FileText className="w-3.5 h-3.5" style={{ color: themeColors.primary }} />
                <span style={{ color: themeColors.textSecondary }}>PDF</span>
                <input type="file" accept=".pdf" className="hidden"
                  onChange={(e) => e.target.files?.[0] && setPdfFile(e.target.files[0])} />
              </label>
            ) : (
              <div className="flex items-center gap-1 px-2 py-1 rounded text-xs" style={{ backgroundColor: themeColors.primaryLight }}>
                <span className="font-medium truncate max-w-[120px]" style={{ color: themeColors.primaryDark }}>{pdfFile.name}</span>
                <button type="button" onClick={() => setPdfFile(null)} className="text-gray-500 hover:text-red-500">✕</button>
              </div>
            )}
          </div>

          {/* Botón procesar */}
          {(xmlFile || pdfFile) && (
            <button type="button" onClick={processDocuments} disabled={isUploading}
              className="px-3 py-1.5 rounded text-xs font-medium text-white flex items-center gap-1"
              style={{ backgroundColor: themeColors.primary }}>
              {isUploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Calculator className="w-3 h-3" />}
              Procesar
            </button>
          )}
        </div>

        {/* Estado de validación SAT */}
        {(validandoSAT || resultadoSAT) && (
          <div className="px-2 py-2 rounded-lg" style={{ backgroundColor: themeColors.bgCard, border: `1px solid ${themeColors.border}` }}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium" style={{ color: themeColors.textSecondary }}>Estado SAT:</span>
              <SATStatusBadge resultado={resultadoSAT} isValidating={validandoSAT} size="md" />
            </div>
            {resultadoSAT && !resultadoSAT.esValida && (
              <SATAlertBox resultado={resultadoSAT} onClose={() => { resetearSAT(); setXmlFile(null); }} />
            )}
          </div>
        )}

        {/* Cliente, Responsable y Concepto - Todo en una fila */}
        <div className="grid grid-cols-4 gap-2">
          {/* Cliente */}
          <div>
            <label className="block text-xs font-medium mb-0.5 text-gray-500">
              <Building2 className="w-3 h-3 inline mr-0.5" />Cliente
            </label>
            <select
              value={formData.cliente_id}
              onChange={(e) => {
                const cliente = clients?.find(c => String(c.id) === e.target.value);
                handleInputChange('cliente_id', e.target.value);
                if (cliente) {
                  handleInputChange('cliente', cliente.nombre_comercial || cliente.razon_social);
                  handleInputChange('rfc_cliente', cliente.rfc || '');
                }
              }}
              className="w-full px-2 py-1.5 border rounded text-sm"
              style={{ borderColor: themeColors.border, backgroundColor: themeColors.bg, color: themeColors.text }}
              disabled={loadingClients}
            >
              <option value="">Seleccionar...</option>
              {clients?.map(c => (
                <option key={c.id} value={c.id}>{c.nombre_comercial || c.razon_social}</option>
              ))}
            </select>
          </div>

          {/* Responsable */}
          <div>
            <label className="block text-xs font-medium mb-0.5 text-gray-500">
              <UserCheck className="w-3 h-3 inline mr-0.5" />Responsable
            </label>
            <select
              value={formData.responsable_id}
              onChange={(e) => handleInputChange('responsable_id', e.target.value)}
              className="w-full px-2 py-1.5 border rounded text-sm"
              style={{ borderColor: themeColors.border, backgroundColor: themeColors.bg, color: themeColors.text }}
              disabled={loadingUsers}
            >
              <option value="">Seleccionar...</option>
              {users?.map(u => (
                <option key={u.id} value={u.id}>{u.nombre}</option>
              ))}
            </select>
          </div>

          {/* Concepto - más ancho */}
          <div className="col-span-2">
            <label className="block text-xs font-medium mb-0.5 text-gray-500">Concepto *</label>
            <input
              type="text"
              value={formData.concepto}
              onChange={(e) => handleInputChange('concepto', e.target.value)}
              placeholder="Descripción del servicio facturado"
              className="w-full px-2 py-1.5 border rounded text-sm"
              style={{ borderColor: errors.concepto ? '#EF4444' : themeColors.border, backgroundColor: themeColors.bg, color: themeColors.text }}
            />
          </div>
        </div>

        {/* Montos - Compacto en una línea */}
        <div className="flex gap-2 items-end">
          {/* Subtotal */}
          <div className="w-28">
            <label className="block text-xs font-medium mb-0.5 text-gray-500">Subtotal</label>
            <CurrencyInput
              value={formData.subtotal}
              onChange={(v) => handleInputChange('subtotal', v)}
              className="text-sm"
              style={{ borderColor: themeColors.border, backgroundColor: themeColors.bg, color: themeColors.text }}
            />
          </div>

          {/* IVA */}
          <div className="w-24">
            <div className="flex items-center justify-between mb-0.5">
              <label className="text-xs font-medium text-gray-500">IVA</label>
              <button type="button" onClick={calcularIvaDesdeSubtotal}
                className="px-1 py-0 rounded text-[10px] font-medium bg-slate-100 text-slate-600 hover:bg-slate-200">
                {IVA_PORCENTAJE}%
              </button>
            </div>
            <CurrencyInput
              value={formData.iva}
              onChange={(v) => handleInputChange('iva', v)}
              className="text-sm"
              style={{ borderColor: themeColors.border, backgroundColor: themeColors.bg, color: themeColors.text }}
            />
          </div>

          {/* Total */}
          <div className="w-32">
            <div className="flex items-center justify-between mb-0.5">
              <label className="text-xs font-medium" style={{ color: themeColors.textSecondary }}>Total</label>
              <span
                className="px-1.5 py-0 rounded text-[10px] font-medium"
                style={{
                  backgroundColor: errorCuadre ? '#FEE2E2' : `${themeColors.primary}20`,
                  color: errorCuadre ? '#EF4444' : themeColors.primary
                }}
              >
                {errorCuadre ? '✗' : '✓'}
              </span>
            </div>
            <CurrencyInput
              value={formData.total}
              onChange={(v) => handleInputChange('total', v)}
              className="text-sm font-bold"
              style={{
                borderColor: errorCuadre ? '#EF4444' : themeColors.primary,
                backgroundColor: errorCuadre ? '#FEF2F2' : `${themeColors.primary}10`,
                color: errorCuadre ? '#EF4444' : themeColors.primary
              }}
            />
          </div>

          {/* Fecha */}
          <div className="w-32">
            <label className="block text-xs font-medium mb-0.5 text-gray-500">
              <Calendar className="w-3 h-3 inline mr-0.5" />Fecha
            </label>
            <input
              type="date"
              value={formData.fecha_ingreso}
              onChange={(e) => handleInputChange('fecha_ingreso', e.target.value)}
              className="w-full px-2 py-1.5 border rounded text-sm"
              style={{ borderColor: themeColors.border, backgroundColor: themeColors.bg, color: themeColors.text }}
            />
          </div>

          {/* Método cobro */}
          <div className="flex-1">
            <label className="block text-xs font-medium mb-0.5 text-gray-500">Método</label>
            <select
              value={formData.metodo_cobro}
              onChange={(e) => handleInputChange('metodo_cobro', e.target.value)}
              className="w-full px-2 py-1.5 border rounded text-sm"
              style={{ borderColor: themeColors.border, backgroundColor: themeColors.bg, color: themeColors.text }}
            >
              <option value="transferencia">Transferencia</option>
              <option value="efectivo">Efectivo</option>
              <option value="cheque">Cheque</option>
              <option value="tarjeta">Tarjeta</option>
            </select>
          </div>
        </div>

        {/* Crédito y Cuenta - En una línea */}
        <div className="flex gap-2 items-end">
          <div className="w-20">
            <label className="block text-xs font-medium mb-0.5 text-gray-500">Días Créd.</label>
            <input
              type="number"
              min="0"
              value={formData.dias_credito}
              onChange={(e) => handleInputChange('dias_credito', parseInt(e.target.value) || 0)}
              className="w-full px-2 py-1.5 border rounded text-sm text-center"
              style={{ borderColor: themeColors.border, backgroundColor: themeColors.bg, color: themeColors.text }}
            />
          </div>

          <div className="w-32">
            <label className="block text-xs font-medium mb-0.5 text-gray-500">Vencimiento</label>
            <input
              type="date"
              value={formData.fecha_compromiso_pago}
              readOnly
              className="w-full px-2 py-1.5 border rounded text-sm bg-gray-50 text-gray-500"
              style={{ borderColor: themeColors.border }}
            />
          </div>

          <div className="flex-1">
            <label className="block text-xs font-medium mb-0.5 text-gray-500">
              <CreditCard className="w-3 h-3 inline mr-0.5" />Cuenta Contable
            </label>
            <select
              value={formData.cuenta_contable_id}
              onChange={(e) => handleInputChange('cuenta_contable_id', e.target.value)}
              className="w-full px-2 py-1.5 border rounded text-sm"
              style={{ borderColor: themeColors.border, backgroundColor: themeColors.bg, color: themeColors.text }}
            >
              <option value="">Seleccionar...</option>
              {filteredCuentas?.map(c => (
                <option key={c.id} value={c.id}>{c.codigo} - {c.nombre}</option>
              ))}
            </select>
          </div>

          {/* Descripción inline */}
          <div className="flex-1">
            <label className="block text-xs font-medium mb-0.5 text-gray-500">Descripción</label>
            <input
              type="text"
              value={formData.descripcion}
              onChange={(e) => handleInputChange('descripcion', e.target.value)}
              placeholder="Detalles adicionales..."
              className="w-full px-2 py-1.5 border rounded text-sm"
              style={{ borderColor: themeColors.border, backgroundColor: themeColors.bg, color: themeColors.text }}
            />
          </div>
        </div>
      </form>

      {/* Footer compacto */}
      <div
        className="flex justify-between items-center px-3 py-1.5 border-t"
        style={{ backgroundColor: themeColors.primaryLight, borderColor: themeColors.border }}
      >
        <div className="text-xs" style={{ color: themeColors.primaryDark }}>
          Total: <b>{formatCurrency(formData.total)}</b>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-3 py-1.5 border rounded text-sm font-medium hover:bg-gray-100"
            style={{ borderColor: themeColors.border, color: themeColors.text }}
          >
            Cancelar
          </button>
          <button
            onClick={() => handleSubmit()}
            disabled={isSubmitting}
            className="px-4 py-1.5 rounded text-sm font-medium flex items-center gap-1.5 text-white disabled:opacity-50"
            style={{ backgroundColor: themeColors.primary }}
          >
            {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            {income ? 'Actualizar' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default IncomeForm;
