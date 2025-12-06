/**
 * FORMULARIO UNIFICADO DE GASTOS
 * ================================
 * Usado en: Eventos ERP y Gastos No Impactados
 * 
 * Características:
 * - Parseo XML CFDI (100% precisión)
 * - Validación SAT
 * - OCR para tickets
 * - 4 tipos de documentos
 * - Campo Responsable
 * - Flujo: Provisión → Gasto
 */
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
    TrendingDown, FileText, Calculator, Loader2, Calendar,
    X, Save, DollarSign, Tag, Building2, UserCheck, Check, AlertTriangle
} from 'lucide-react';
import { useTheme } from '../theme';
import { useAuth } from '../../../core/auth/AuthProvider';
import { supabase } from '../../../core/config/supabase';
import { parseCFDIXml } from '../../../modules/eventos-erp/utils/cfdiXmlParser';
import { useSATValidation } from '../../../modules/eventos-erp/hooks/useSATValidation';
import { processFileWithOCR } from '../../../modules/ocr/services/dualOCRService';
import { DocumentUploader } from './DocumentUploader';
import type { GastoFormData, EstadoGasto, TipoDocumento } from './types';
import toast from 'react-hot-toast';

// IVA desde config
const IVA_PORCENTAJE = parseFloat(import.meta.env.VITE_IVA_PORCENTAJE || '16');
const IVA_RATE = IVA_PORCENTAJE / 100;

// Props del componente
interface UnifiedExpenseFormProps {
    // Datos
    gasto?: Partial<GastoFormData> | null;
    eventoId?: number | null;
    claveEvento?: string;       // Ej: DOT2025-003

    // Catálogos
    categorias?: { id: number; nombre: string; color?: string }[];
    proveedores?: { id: number; razon_social: string; rfc?: string }[];
    usuarios?: { id: string; nombre: string; email?: string }[];

    // Callbacks
    onSave: (data: GastoFormData) => Promise<void>;
    onCancel: () => void;

    // Config
    modo?: 'evento' | 'gni' | 'provision';
    className?: string;
}

// Input de moneda
const CurrencyInput = ({ value, onChange, readOnly = false, placeholder = '0.00', style }: {
    value: number;
    onChange: (v: number) => void;
    readOnly?: boolean;
    placeholder?: string;
    style?: React.CSSProperties;
}) => {
    const [display, setDisplay] = useState('');

    useEffect(() => {
        setDisplay(value > 0 ? value.toLocaleString('es-MX', { minimumFractionDigits: 2 }) : '');
    }, [value]);

    const handleBlur = () => {
        const num = parseFloat(display.replace(/[^0-9.]/g, '')) || 0;
        onChange(num);
        setDisplay(num > 0 ? num.toLocaleString('es-MX', { minimumFractionDigits: 2 }) : '');
    };

    return (
        <div className="relative">
            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
                type="text"
                inputMode="decimal"
                value={display}
                onChange={(e) => setDisplay(e.target.value.replace(/[^0-9.,]/g, ''))}
                onBlur={handleBlur}
                onFocus={() => value > 0 && setDisplay(value.toString())}
                readOnly={readOnly}
                placeholder={placeholder}
                className="w-full pl-9 pr-4 py-2.5 border-2 rounded-lg font-mono text-right"
                style={style}
            />
        </div>
    );
};

export const UnifiedExpenseForm: React.FC<UnifiedExpenseFormProps> = ({
    gasto,
    eventoId,
    claveEvento = 'SIN-EVENTO',
    categorias = [],
    proveedores: _proveedores = [],
    usuarios = [],
    onSave,
    onCancel,
    modo = 'evento',
    className = ''
}) => {
    const { paletteConfig, isDark } = useTheme();
    const { user } = useAuth();

    // Validación SAT
    const { validar: validarSAT, resultado: resultadoSAT, isValidating: validandoSAT, resetear: resetearSAT } = useSATValidation();

    // Estados
    const [formData, setFormData] = useState<GastoFormData>({
        concepto: gasto?.concepto || '',
        subtotal: gasto?.subtotal || 0,
        iva: gasto?.iva || 0,
        iva_porcentaje: gasto?.iva_porcentaje || IVA_PORCENTAJE,
        total: gasto?.total || 0,
        fecha_gasto: gasto?.fecha_gasto || new Date().toISOString().split('T')[0],
        estado: gasto?.estado || (modo === 'provision' ? 'provision' : 'pendiente'),
        pagado: gasto?.pagado || false,
        categoria_id: gasto?.categoria_id || null,
        proveedor_id: gasto?.proveedor_id || null,
        responsable_id: gasto?.responsable_id || user?.id || null,
        proveedor_nombre: gasto?.proveedor_nombre || '',
        rfc_proveedor: gasto?.rfc_proveedor || '',
        comprobante_pago_url: gasto?.comprobante_pago_url || null,
        factura_pdf_url: gasto?.factura_pdf_url || null,
        factura_xml_url: gasto?.factura_xml_url || null,
        ticket_url: gasto?.ticket_url || null,
        folio_fiscal: gasto?.folio_fiscal || null,
        notas: gasto?.notas || '',
        evento_id: eventoId || null
    });

    const [saving, setSaving] = useState(false);
    const [procesandoXml, setProcesandoXml] = useState(false);
    const [procesandoOcr, setProcesandoOcr] = useState(false);
    const [tipoDoc, setTipoDoc] = useState<TipoDocumento>(
        formData.factura_xml_url || formData.factura_pdf_url ? 'factura' :
            formData.ticket_url ? 'ticket' : null
    );

    // Archivos pendientes
    const [pendingXml, setPendingXml] = useState<File | null>(null);
    const [pendingPdf, setPendingPdf] = useState<File | null>(null);
    const [pendingTicket, setPendingTicket] = useState<File | null>(null);
    const [pendingComprobante, setPendingComprobante] = useState<File | null>(null);

    // Colores
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

    // Calcular IVA
    const calcularIva = useCallback(() => {
        if (formData.subtotal > 0) {
            const iva = Math.round(formData.subtotal * IVA_RATE * 100) / 100;
            const total = Math.round((formData.subtotal + iva) * 100) / 100;
            setFormData(prev => ({ ...prev, iva, total }));
            toast.success(`IVA: $${iva.toFixed(2)}`);
        }
    }, [formData.subtotal]);

    // Calcular total
    const calcularTotal = useCallback(() => {
        const total = Math.round((formData.subtotal + formData.iva) * 100) / 100;
        setFormData(prev => ({ ...prev, total }));
    }, [formData.subtotal, formData.iva]);

    // Procesar XML CFDI
    const procesarXml = async (file: File) => {
        setProcesandoXml(true);
        resetearSAT();

        try {
            const content = await file.text();
            const cfdi = await parseCFDIXml(content);

            if (!cfdi) throw new Error('XML no válido');

            // Extraer datos
            const uuid = cfdi.timbreFiscal?.uuid || '';
            const rfcEmisor = cfdi.emisor?.rfc || '';
            const rfcReceptor = cfdi.receptor?.rfc || '';

            // Actualizar formulario
            setFormData(prev => ({
                ...prev,
                concepto: cfdi.conceptos?.[0]?.descripcion || prev.concepto,
                proveedor_nombre: cfdi.emisor?.nombre || '',
                rfc_proveedor: rfcEmisor,
                fecha_gasto: cfdi.fecha?.split('T')[0] || prev.fecha_gasto,
                subtotal: cfdi.subtotal || 0,
                iva: cfdi.impuestos?.totalTraslados || 0,
                total: cfdi.total || 0,
                folio_fiscal: uuid
            }));

            // Validar con SAT
            if (uuid && rfcEmisor && rfcReceptor) {
                const satResult = await validarSAT({
                    uuid, rfcEmisor, rfcReceptor, total: cfdi.total || 0
                });

                if (satResult.esCancelada) {
                    toast.error('❌ FACTURA CANCELADA EN SAT', { duration: 5000 });
                    setProcesandoXml(false);
                    return;
                }

                if (satResult.esValida) {
                    toast.success('✅ Factura verificada - VIGENTE');
                }
            }

            setPendingXml(file);
            setTipoDoc('factura');
            toast.success(`XML procesado: ${cfdi.emisor?.nombre}`);

        } catch (error: any) {
            toast.error(`Error: ${error.message}`);
        } finally {
            setProcesandoXml(false);
        }
    };

    // Procesar Ticket con OCR
    const procesarTicket = async (file: File) => {
        setProcesandoOcr(true);

        try {
            const ocrResult = await processFileWithOCR(file) as any;

            if (ocrResult) {
                // Soportar ambos formatos: datos_extraidos (ocrService.v2) o directo
                const datos = ocrResult.datos_extraidos || ocrResult;
                setFormData(prev => ({
                    ...prev,
                    concepto: datos.establecimiento || prev.concepto,
                    proveedor_nombre: datos.establecimiento || '',
                    rfc_proveedor: datos.rfc || '',
                    fecha_gasto: datos.fecha || prev.fecha_gasto,
                    subtotal: datos.subtotal || 0,
                    iva: datos.iva || 0,
                    total: datos.total || 0
                }));
                toast.success('Datos extraídos del ticket');
            }

            setPendingTicket(file);
            setTipoDoc('ticket');

        } catch (error: any) {
            toast.error(`Error OCR: ${error.message}`);
        } finally {
            setProcesandoOcr(false);
        }
    };

    // Función para subir archivos con estructura de carpetas por gasto
    // Formato: eventos/{clave}/gastos/{seq}/{CLAVE}_{SEQ}_{NombreOriginal}.ext
    const subirArchivo = async (file: File, _tipo: string): Promise<string | null> => {
        if (!user?.company_id) return null;

        try {
            // Obtener secuencia del gasto (si es nuevo, usar timestamp)
            const secuencia = gasto?.id
                ? parseInt(String(gasto.id).slice(-3)) || 1
                : Math.floor(Date.now() / 1000) % 1000; // Temporal para nuevos

            const secStr = String(secuencia).padStart(3, '0');

            // Sanitizar nombre original del archivo
            const nombreOriginal = file.name
                .replace(/[^a-zA-Z0-9._-]/g, '_')
                .replace(/_+/g, '_');

            let path: string;

            if (modo === 'evento' && claveEvento && claveEvento !== 'SIN-EVENTO') {
                // eventos/DOT2025-003/gastos/001/DOT2025-003_001_Factura_Proveedor.pdf
                const nombreFinal = `${claveEvento}_${secStr}_${nombreOriginal}`;
                path = `eventos/${claveEvento}/gastos/${secStr}/${nombreFinal}`;
            } else {
                // contabilidad/gastos_externos/2025-12/001/GNI-2025-12_001_Factura.pdf
                const periodo = new Date().toISOString().slice(0, 7);
                const clave = `GNI-${periodo}`;
                const nombreFinal = `${clave}_${secStr}_${nombreOriginal}`;
                path = `contabilidad/gastos_externos/${periodo}/${secStr}/${nombreFinal}`;
            }

            const { error } = await supabase.storage
                .from('event_docs')
                .upload(path, file, { cacheControl: '3600', upsert: true });

            if (error) throw error;

            const { data } = supabase.storage.from('event_docs').getPublicUrl(path);
            return data.publicUrl;

        } catch (error: any) {
            console.error('Error subiendo archivo:', error);
            toast.error(`Error al subir ${file.name}`);
            return null;
        }
    };

    // Validar formulario
    const validar = (): boolean => {
        if (!formData.concepto.trim()) {
            toast.error('Concepto requerido');
            return false;
        }
        if (formData.total <= 0) {
            toast.error('Total debe ser mayor a 0');
            return false;
        }

        // Si es gasto (no provisión), requiere documentos
        if (modo !== 'provision' && formData.estado !== 'provision') {
            if (!pendingXml && !pendingTicket && !formData.factura_xml_url && !formData.ticket_url) {
                toast.error('Requiere factura o ticket');
                return false;
            }
            if (!pendingComprobante && !formData.comprobante_pago_url) {
                toast.error('Requiere comprobante de pago');
                return false;
            }
        }

        // Bloquear si factura cancelada
        if (resultadoSAT?.esCancelada) {
            toast.error('No se puede guardar: factura CANCELADA');
            return false;
        }

        return true;
    };

    // Guardar
    const handleSave = async () => {
        if (!validar()) return;

        setSaving(true);

        try {
            // Subir archivos pendientes
            let xmlUrl = formData.factura_xml_url;
            let pdfUrl = formData.factura_pdf_url;
            let ticketUrl = formData.ticket_url;
            let comprobanteUrl = formData.comprobante_pago_url;

            if (pendingXml) {
                xmlUrl = await subirArchivo(pendingXml, 'xml') || xmlUrl;
            }
            if (pendingPdf) {
                pdfUrl = await subirArchivo(pendingPdf, 'pdf') || pdfUrl;
            }
            if (pendingTicket) {
                ticketUrl = await subirArchivo(pendingTicket, 'ticket') || ticketUrl;
            }
            if (pendingComprobante) {
                comprobanteUrl = await subirArchivo(pendingComprobante, 'comprobante') || comprobanteUrl;
            }

            // Determinar estado
            let estado: EstadoGasto = formData.estado;
            if (modo !== 'provision' && (xmlUrl || ticketUrl) && comprobanteUrl) {
                estado = formData.pagado ? 'pagado' : 'pendiente';
            }

            const dataToSave: GastoFormData = {
                ...formData,
                factura_xml_url: xmlUrl,
                factura_pdf_url: pdfUrl,
                ticket_url: ticketUrl,
                comprobante_pago_url: comprobanteUrl,
                estado,
                evento_id: eventoId || null
            };

            await onSave(dataToSave);
            toast.success('Gasto guardado');

        } catch (error: any) {
            toast.error(`Error: ${error.message}`);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div
            className={`rounded-xl shadow-lg overflow-hidden ${className}`}
            style={{ backgroundColor: themeColors.bg }}
        >
            {/* Header */}
            <div
                className="flex items-center justify-between px-6 py-4"
                style={{
                    background: `linear-gradient(135deg, ${themeColors.primary} 0%, ${themeColors.primaryDark} 100%)`
                }}
            >
                <div className="flex items-center gap-3">
                    <TrendingDown className="w-6 h-6 text-white" />
                    <h2 className="text-xl font-semibold text-white">
                        {gasto?.id ? 'Editar Gasto' : modo === 'provision' ? 'Nueva Provisión' : 'Nuevo Gasto'}
                    </h2>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-white font-medium"
                    >
                        {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                        Guardar
                    </button>
                    <button onClick={onCancel} className="p-2 hover:bg-white/20 rounded-lg">
                        <X className="w-5 h-5 text-white" />
                    </button>
                </div>
            </div>

            {/* Form Content */}
            <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">

                {/* Estado SAT */}
                {resultadoSAT && (
                    <div className={`p-3 rounded-lg flex items-center gap-2 ${resultadoSAT.esValida ? 'bg-green-50 text-green-700' :
                        resultadoSAT.esCancelada ? 'bg-red-50 text-red-700' :
                            'bg-orange-50 text-orange-700'
                        }`}>
                        {resultadoSAT.esValida ? <Check className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
                        <span className="font-medium">
                            {resultadoSAT.esValida ? 'Factura vigente en SAT' :
                                resultadoSAT.esCancelada ? 'FACTURA CANCELADA' :
                                    'Factura no encontrada en SAT'}
                        </span>
                    </div>
                )}

                {/* Documentos */}
                {modo !== 'provision' && (
                    <DocumentUploader
                        facturaPdfUrl={formData.factura_pdf_url}
                        facturaXmlUrl={formData.factura_xml_url}
                        ticketUrl={formData.ticket_url}
                        comprobantePagoUrl={formData.comprobante_pago_url}
                        onFacturaPdfChange={(file) => setPendingPdf(file)}
                        onFacturaXmlChange={(file) => file && procesarXml(file)}
                        onTicketChange={(file) => file && procesarTicket(file)}
                        onComprobantePagoChange={(file) => setPendingComprobante(file)}
                        procesandoXml={procesandoXml}
                        validandoSat={validandoSAT}
                        satResult={resultadoSAT}
                        themeColors={themeColors}
                    />
                )}

                {/* Concepto */}
                <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: themeColors.text }}>
                        <FileText className="w-4 h-4 inline mr-1" />
                        Concepto *
                    </label>
                    <input
                        type="text"
                        value={formData.concepto}
                        onChange={(e) => setFormData(prev => ({ ...prev, concepto: e.target.value }))}
                        placeholder="Descripción del gasto..."
                        className="w-full px-4 py-2.5 border-2 rounded-lg"
                        style={{ borderColor: themeColors.border, backgroundColor: themeColors.bg, color: themeColors.text }}
                    />
                </div>

                {/* Proveedor */}
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium mb-1" style={{ color: themeColors.text }}>
                            <Building2 className="w-4 h-4 inline mr-1" />
                            Proveedor
                        </label>
                        <input
                            type="text"
                            value={formData.proveedor_nombre}
                            onChange={(e) => setFormData(prev => ({ ...prev, proveedor_nombre: e.target.value }))}
                            placeholder="Nombre del proveedor..."
                            className="w-full px-4 py-2.5 border-2 rounded-lg"
                            style={{ borderColor: themeColors.border, backgroundColor: themeColors.bg, color: themeColors.text }}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1" style={{ color: themeColors.text }}>
                            RFC
                        </label>
                        <input
                            type="text"
                            value={formData.rfc_proveedor || ''}
                            onChange={(e) => setFormData(prev => ({ ...prev, rfc_proveedor: e.target.value.toUpperCase() }))}
                            placeholder="RFC del proveedor"
                            className="w-full px-4 py-2.5 border-2 rounded-lg uppercase"
                            style={{ borderColor: themeColors.border, backgroundColor: themeColors.bg, color: themeColors.text }}
                        />
                    </div>
                </div>

                {/* Montos */}
                <div className="grid grid-cols-3 gap-4">
                    <div>
                        <label className="block text-sm font-medium mb-1" style={{ color: themeColors.text }}>
                            Subtotal
                        </label>
                        <CurrencyInput
                            value={formData.subtotal}
                            onChange={(v) => setFormData(prev => ({ ...prev, subtotal: v }))}
                            style={{ borderColor: themeColors.border, backgroundColor: themeColors.bg, color: themeColors.text }}
                        />
                    </div>
                    <div>
                        <div className="flex items-center justify-between mb-1">
                            <label className="text-sm font-medium" style={{ color: themeColors.text }}>
                                IVA ({IVA_PORCENTAJE}%)
                            </label>
                            <button
                                type="button"
                                onClick={calcularIva}
                                className="text-xs text-blue-600 hover:underline"
                            >
                                <Calculator className="w-3 h-3 inline mr-1" />
                                Calcular
                            </button>
                        </div>
                        <CurrencyInput
                            value={formData.iva}
                            onChange={(v) => setFormData(prev => ({ ...prev, iva: v }))}
                            style={{ borderColor: themeColors.border, backgroundColor: themeColors.bg, color: themeColors.text }}
                        />
                    </div>
                    <div>
                        <div className="flex items-center justify-between mb-1">
                            <label className="text-sm font-medium" style={{ color: themeColors.text }}>
                                Total *
                            </label>
                            <button
                                type="button"
                                onClick={calcularTotal}
                                className="text-xs text-blue-600 hover:underline"
                            >
                                <Calculator className="w-3 h-3 inline mr-1" />
                                Calcular
                            </button>
                        </div>
                        <CurrencyInput
                            value={formData.total}
                            onChange={(v) => setFormData(prev => ({ ...prev, total: v }))}
                            style={{ borderColor: themeColors.border, backgroundColor: themeColors.bg, color: themeColors.text }}
                        />
                    </div>
                </div>

                {/* Fecha, Categoría, Responsable */}
                <div className="grid grid-cols-3 gap-4">
                    <div>
                        <label className="block text-sm font-medium mb-1" style={{ color: themeColors.text }}>
                            <Calendar className="w-4 h-4 inline mr-1" />
                            Fecha *
                        </label>
                        <input
                            type="date"
                            value={formData.fecha_gasto}
                            onChange={(e) => setFormData(prev => ({ ...prev, fecha_gasto: e.target.value }))}
                            className="w-full px-4 py-2.5 border-2 rounded-lg"
                            style={{ borderColor: themeColors.border, backgroundColor: themeColors.bg, color: themeColors.text }}
                        />
                    </div>

                    {categorias.length > 0 && (
                        <div>
                            <label className="block text-sm font-medium mb-1" style={{ color: themeColors.text }}>
                                <Tag className="w-4 h-4 inline mr-1" />
                                Categoría
                            </label>
                            <select
                                value={formData.categoria_id || ''}
                                onChange={(e) => setFormData(prev => ({ ...prev, categoria_id: parseInt(e.target.value) || null }))}
                                className="w-full px-4 py-2.5 border-2 rounded-lg"
                                style={{ borderColor: themeColors.border, backgroundColor: themeColors.bg, color: themeColors.text }}
                            >
                                <option value="">Seleccionar...</option>
                                {categorias.map(cat => (
                                    <option key={cat.id} value={cat.id}>{cat.nombre}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium mb-1" style={{ color: themeColors.text }}>
                            <UserCheck className="w-4 h-4 inline mr-1" />
                            Responsable
                        </label>
                        <select
                            value={formData.responsable_id || ''}
                            onChange={(e) => setFormData(prev => ({ ...prev, responsable_id: e.target.value || null }))}
                            className="w-full px-4 py-2.5 border-2 rounded-lg"
                            style={{ borderColor: themeColors.border, backgroundColor: themeColors.bg, color: themeColors.text }}
                        >
                            <option value="">Seleccionar...</option>
                            {usuarios.map(u => (
                                <option key={u.id} value={u.id}>{u.nombre}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Estado y Pagado */}
                <div className="flex items-center gap-6">
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={formData.pagado}
                            onChange={(e) => setFormData(prev => ({
                                ...prev,
                                pagado: e.target.checked,
                                estado: e.target.checked ? 'pagado' : 'pendiente'
                            }))}
                            className="w-5 h-5 rounded border-2"
                        />
                        <span className="text-sm font-medium" style={{ color: themeColors.text }}>
                            Pagado
                        </span>
                    </label>

                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${formData.estado === 'pagado' ? 'bg-green-100 text-green-700' :
                        formData.estado === 'provision' ? 'bg-gray-100 text-gray-700' :
                            'bg-yellow-100 text-yellow-700'
                        }`}>
                        {formData.estado === 'pagado' ? '✓ Pagado' :
                            formData.estado === 'provision' ? '📋 Provisión' :
                                '⏳ Pendiente'}
                    </span>
                </div>

                {/* Notas */}
                <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: themeColors.text }}>
                        Notas
                    </label>
                    <textarea
                        value={formData.notas || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, notas: e.target.value }))}
                        rows={2}
                        placeholder="Observaciones..."
                        className="w-full px-4 py-2 border-2 rounded-lg resize-none"
                        style={{ borderColor: themeColors.border, backgroundColor: themeColors.bg, color: themeColors.text }}
                    />
                </div>

            </div>
        </div>
    );
};

export default UnifiedExpenseForm;
