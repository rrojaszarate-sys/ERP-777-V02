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

  // Colores dinámicos - Verde para ingresos
  const themeColors = useMemo(() => ({
    primary: '#10B981', // Verde esmeralda para ingresos
    primaryLight: '#D1FAE5',
    primaryDark: '#059669',
    bg: isDark ? '#1E293B' : '#FFFFFF',
    text: isDark ? '#F8FAFC' : '#1E293B',
    textSecondary: isDark ? '#CBD5E1' : '#64748B',
    border: isDark ? '#334155' : '#E2E8F0',
    accent: paletteConfig.accent
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

  // Procesar XML CFDI
  const processXMLCFDI = async (xmlFile: File) => {
    try {
      const xmlContent = await xmlFile.text();
      const cfdiData = await parseCFDIXml(xmlContent);
      const incomeData = cfdiToIncomeData(cfdiData);

      setFormData(prev => ({ ...prev, ...incomeData, evento_id: eventId }));
      toast.success(`XML procesado: ${cfdiData.receptor.nombre} - $${cfdiData.total.toFixed(2)}`);
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
          <DollarSign className="w-6 h-6 text-white" />
          <h2 className="text-xl font-semibold text-white">
            {income ? 'Editar Ingreso' : 'Nuevo Ingreso'}
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

        {/* Documentos XML + PDF */}
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wide mb-3" style={{ color: themeColors.primary }}>
            Documentos de Factura
          </h3>
          <div className="grid grid-cols-2 gap-3">
            {/* XML */}
            <div className="border-2 rounded-lg p-3" style={{ borderColor: xmlFile ? themeColors.primary : themeColors.border }}>
              <label className="block text-xs font-medium mb-2" style={{ color: themeColors.text }}>
                XML CFDI *
              </label>
              {!xmlFile ? (
                <label className="flex items-center justify-center gap-2 p-3 border-2 border-dashed rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                  style={{ borderColor: themeColors.border }}>
                  <Upload className="w-4 h-4" style={{ color: themeColors.primary }} />
                  <span className="text-sm" style={{ color: themeColors.textSecondary }}>Subir XML</span>
                  <input type="file" accept=".xml" className="hidden"
                    onChange={(e) => e.target.files?.[0] && setXmlFile(e.target.files[0])} />
                </label>
              ) : (
                <div className="flex items-center justify-between p-2 rounded-lg" style={{ backgroundColor: themeColors.primaryLight }}>
                  <span className="text-sm font-medium truncate" style={{ color: themeColors.primaryDark }}>{xmlFile.name}</span>
                  <button type="button" onClick={() => setXmlFile(null)} className="text-xs px-2 py-1 hover:bg-white/50 rounded">✕</button>
                </div>
              )}
            </div>

            {/* PDF */}
            <div className="border-2 rounded-lg p-3" style={{ borderColor: pdfFile ? themeColors.primary : themeColors.border }}>
              <label className="block text-xs font-medium mb-2" style={{ color: themeColors.text }}>
                PDF Factura
              </label>
              {!pdfFile ? (
                <label className="flex items-center justify-center gap-2 p-3 border-2 border-dashed rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                  style={{ borderColor: themeColors.border }}>
                  <FileText className="w-4 h-4" style={{ color: themeColors.primary }} />
                  <span className="text-sm" style={{ color: themeColors.textSecondary }}>Subir PDF</span>
                  <input type="file" accept=".pdf" className="hidden"
                    onChange={(e) => e.target.files?.[0] && setPdfFile(e.target.files[0])} />
                </label>
              ) : (
                <div className="flex items-center justify-between p-2 rounded-lg" style={{ backgroundColor: themeColors.primaryLight }}>
                  <span className="text-sm font-medium truncate" style={{ color: themeColors.primaryDark }}>{pdfFile.name}</span>
                  <button type="button" onClick={() => setPdfFile(null)} className="text-xs px-2 py-1 hover:bg-white/50 rounded">✕</button>
                </div>
              )}
            </div>
          </div>

          {(xmlFile || pdfFile) && (
            <button type="button" onClick={processDocuments} disabled={isUploading}
              className="w-full mt-3 py-2.5 rounded-lg font-medium text-white flex items-center justify-center gap-2 transition-colors"
              style={{ backgroundColor: themeColors.primary }}>
              {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Calculator className="w-4 h-4" />}
              Procesar y Extraer Datos
            </button>
          )}
        </div>

        {/* Cliente y Responsable */}
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wide mb-3" style={{ color: themeColors.primary }}>
            Cliente y Responsable
          </h3>
          <div className="grid grid-cols-2 gap-4">
            {/* Cliente */}
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: themeColors.text }}>
                <Building2 className="w-4 h-4 inline mr-1" />Cliente *
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
                className="w-full px-4 py-2.5 border-2 rounded-lg focus:ring-2"
                style={{ borderColor: errors.cliente_id ? '#EF4444' : themeColors.border, backgroundColor: themeColors.bg, color: themeColors.text }}
                disabled={loadingClients}
              >
                <option value="">Seleccionar cliente...</option>
                {clients?.map(c => (
                  <option key={c.id} value={c.id}>{c.nombre_comercial || c.razon_social}</option>
                ))}
              </select>
              {errors.cliente_id && <p className="text-red-500 text-xs mt-1">{errors.cliente_id}</p>}
            </div>

            {/* Responsable */}
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: themeColors.text }}>
                <UserCheck className="w-4 h-4 inline mr-1" />Responsable *
              </label>
              <select
                value={formData.responsable_id}
                onChange={(e) => handleInputChange('responsable_id', e.target.value)}
                className="w-full px-4 py-2.5 border-2 rounded-lg focus:ring-2"
                style={{ borderColor: errors.responsable_id ? '#EF4444' : themeColors.border, backgroundColor: themeColors.bg, color: themeColors.text }}
                disabled={loadingUsers}
              >
                <option value="">Seleccionar...</option>
                {users?.map(u => (
                  <option key={u.id} value={u.id}>{u.nombre}</option>
                ))}
              </select>
              {errors.responsable_id && <p className="text-red-500 text-xs mt-1">{errors.responsable_id}</p>}
            </div>
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
            placeholder="Descripción del servicio facturado"
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
            <strong>Fórmula:</strong> Total = Subtotal + IVA
          </div>

          <div className="grid grid-cols-4 gap-3">
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
                  value={formData.fecha_ingreso}
                  onChange={(e) => handleInputChange('fecha_ingreso', e.target.value)}
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

        {/* Pago y Crédito */}
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wide mb-3" style={{ color: themeColors.primary }}>
            Pago y Crédito
          </h3>
          <div className="grid grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: themeColors.text }}>Método Cobro</label>
              <select
                value={formData.metodo_cobro}
                onChange={(e) => handleInputChange('metodo_cobro', e.target.value)}
                className="w-full px-3 py-2.5 border-2 rounded-lg"
                style={{ borderColor: themeColors.border, backgroundColor: themeColors.bg, color: themeColors.text }}
              >
                <option value="transferencia">Transferencia</option>
                <option value="efectivo">Efectivo</option>
                <option value="cheque">Cheque</option>
                <option value="tarjeta">Tarjeta</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: themeColors.text }}>Días Crédito</label>
              <input
                type="number"
                min="0"
                value={formData.dias_credito}
                onChange={(e) => handleInputChange('dias_credito', parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2.5 border-2 rounded-lg"
                style={{ borderColor: themeColors.border, backgroundColor: themeColors.bg, color: themeColors.text }}
              />
            </div>

            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: themeColors.text }}>Fecha Vencimiento</label>
              <input
                type="date"
                value={formData.fecha_compromiso_pago}
                readOnly
                className="w-full px-3 py-2.5 border-2 rounded-lg bg-gray-50"
                style={{ borderColor: themeColors.border, color: themeColors.textSecondary }}
              />
            </div>

            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: themeColors.text }}>
                <CreditCard className="w-3 h-3 inline mr-1" />Cuenta Contable
              </label>
              <select
                value={formData.cuenta_contable_id}
                onChange={(e) => handleInputChange('cuenta_contable_id', e.target.value)}
                className="w-full px-3 py-2.5 border-2 rounded-lg"
                style={{ borderColor: themeColors.border, backgroundColor: themeColors.bg, color: themeColors.text }}
              >
                <option value="">Seleccionar...</option>
                {filteredCuentas?.map(c => (
                  <option key={c.id} value={c.id}>{c.codigo} - {c.nombre}</option>
                ))}
              </select>
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
            {income ? 'Actualizar' : 'Crear Ingreso'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default IncomeForm;
