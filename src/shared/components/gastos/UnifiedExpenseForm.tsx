/**
 * FORMULARIO UNIFICADO DE GASTOS - COMPACTO
 * ==========================================
 * - Todos los campos caben sin scroll
 * - Campos y botones pequeños
 * - Mensajes homologados con GastoFormModal
 */
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
    TrendingDown, FileText, Calculator, Loader2, Calendar,
    X, Save, DollarSign, Tag, Building2, UserCheck, Check, AlertTriangle
} from 'lucide-react';
import { useTheme } from '../theme';
import { useAuth } from '../../../core/auth/AuthProvider';
import { supabase } from '../../../core/config/supabase';
import { useSATValidation } from '../../../modules/eventos-erp/hooks/useSATValidation';
import { DocumentUploader } from './DocumentUploader';
import type { GastoFormData, EstadoGasto } from './types';
import toast from 'react-hot-toast';

const IVA_PORCENTAJE = parseFloat(import.meta.env.VITE_IVA_PORCENTAJE || '16');
const IVA_RATE = IVA_PORCENTAJE / 100;

interface UnifiedExpenseFormProps {
    gasto?: Partial<GastoFormData> | null;
    eventoId?: number | null;
    claveEvento?: string;
    categorias?: { id: number; nombre: string; color?: string }[];
    proveedores?: { id: number; razon_social: string; rfc?: string }[];
    usuarios?: { id: string; nombre: string; email?: string }[];
    formasPago?: { id: number; nombre: string }[];  // Formas de pago
    ejecutivos?: { id: number; nombre: string }[];  // Ejecutivos
    onSave: (data: GastoFormData) => Promise<void>;
    onCancel: () => void;
    modo?: 'evento' | 'gni' | 'provision';
    className?: string;
}

// Input compacto de moneda
const CurrencyInput = ({ value, onChange, readOnly = false, placeholder = '0.00', style }: {
    value: number; onChange: (v: number) => void; readOnly?: boolean; placeholder?: string;
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
            <DollarSign className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400" />
            <input
                type="text" inputMode="decimal" value={display}
                onChange={(e) => setDisplay(e.target.value.replace(/[^0-9.,]/g, ''))}
                onBlur={handleBlur}
                onFocus={() => value > 0 && setDisplay(value.toString())}
                readOnly={readOnly} placeholder={placeholder}
                className="w-full pl-6 pr-2 py-1.5 border rounded text-sm font-mono text-right"
                style={style}
            />
        </div>
    );
};

export const UnifiedExpenseForm: React.FC<UnifiedExpenseFormProps> = ({
    gasto, eventoId, claveEvento = 'SIN-EVENTO',
    categorias = [], proveedores: _proveedores = [], usuarios: _usuarios = [],
    formasPago = [], ejecutivos = [],
    onSave, onCancel, modo = 'evento', className = ''
}) => {
    const { paletteConfig, isDark } = useTheme();
    const { user } = useAuth();
    const { validar: validarSAT, resultado: resultadoSAT, isValidating: validandoSAT } = useSATValidation();

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
        evento_id: eventoId || null,
        clave_gasto_id: gasto?.clave_gasto_id || null,
        ejecutivo_id: gasto?.ejecutivo_id || null
    });

    const [saving, setSaving] = useState(false);
    const [pendingXml, setPendingXml] = useState<File | null>(null);
    const [pendingPdf, setPendingPdf] = useState<File | null>(null);
    const [pendingTicket, setPendingTicket] = useState<File | null>(null);
    const [pendingComprobante, setPendingComprobante] = useState<File | null>(null);

    const themeColors = useMemo(() => ({
        primary: '#EF4444',
        primaryDark: '#DC2626',
        bg: isDark ? '#1E293B' : '#FFFFFF',
        text: isDark ? '#F8FAFC' : '#1E293B',
        border: isDark ? '#334155' : '#E2E8F0',
        accent: paletteConfig.accent
    }), [paletteConfig, isDark]);

    const calcularIva = useCallback(() => {
        if (formData.subtotal > 0) {
            const iva = Math.round(formData.subtotal * IVA_RATE * 100) / 100;
            const total = Math.round((formData.subtotal + iva) * 100) / 100;
            setFormData(prev => ({ ...prev, iva, total }));
            toast.success(`IVA calculado: $${iva.toFixed(2)}`);
        }
    }, [formData.subtotal]);

    const subirArchivo = async (file: File, _tipo: string): Promise<string | null> => {
        if (!user?.company_id) return null;
        try {
            const secuencia = gasto?.id ? parseInt(String(gasto.id).slice(-3)) || 1 : Math.floor(Date.now() / 1000) % 1000;
            const secStr = String(secuencia).padStart(3, '0');
            const nombreOriginal = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').replace(/_+/g, '_');
            let path: string;
            if (modo === 'evento' && claveEvento && claveEvento !== 'SIN-EVENTO') {
                path = `eventos/${claveEvento}/gastos/${secStr}/${claveEvento}_${secStr}_${nombreOriginal}`;
            } else {
                const periodo = new Date().toISOString().slice(0, 7);
                path = `contabilidad/gastos_externos/${periodo}/${secStr}/GNI-${periodo}_${secStr}_${nombreOriginal}`;
            }
            const { error } = await supabase.storage.from('event_docs').upload(path, file, { cacheControl: '3600', upsert: true });
            if (error) throw error;
            const { data } = supabase.storage.from('event_docs').getPublicUrl(path);
            return data.publicUrl;
        } catch (error: any) {
            console.error('Error subiendo archivo:', error);
            toast.error(`Error al subir ${file.name}`);
            return null;
        }
    };

    const validar = (): boolean => {
        // Validaciones básicas
        if (!formData.concepto.trim()) {
            toast.error('El concepto es requerido');
            return false;
        }
        if (formData.total <= 0) {
            toast.error('El total debe ser mayor a $0');
            return false;
        }

        // Categoría es OBLIGATORIA
        if (categorias.length > 0 && !formData.categoria_id) {
            toast.error('La categoría de gasto es obligatoria');
            return false;
        }

        // Forma de Pago es OBLIGATORIA (si hay formas de pago disponibles)
        if (formasPago.length > 0 && !formData.forma_pago_id) {
            toast.error('La forma de pago es obligatoria');
            return false;
        }

        // Validar que subtotal + IVA = total (con tolerancia de 1 centavo)
        const totalCalculado = (formData.subtotal || 0) + (formData.iva || 0);
        const diferencia = Math.abs(totalCalculado - formData.total);
        if (diferencia > 0.01) {
            toast.error(`Subtotal ($${formData.subtotal?.toFixed(2)}) + IVA ($${formData.iva?.toFixed(2)}) no coincide con Total ($${formData.total?.toFixed(2)})`);
            return false;
        }

        // Validar documentos (excepto provisión) - COMPROBANTE NO ES OBLIGATORIO
        if (modo !== 'provision' && formData.estado !== 'provision') {
            if (!pendingXml && !pendingTicket && !formData.factura_xml_url && !formData.ticket_url) {
                toast.error('Por favor adjunta factura XML o ticket');
                return false;
            }
            // NOTA: Comprobante de pago NO es obligatorio - removida validación
        }

        // Validar que la factura no esté cancelada en SAT
        if (resultadoSAT?.esCancelada) {
            toast.error('❌ No se puede guardar: la factura está CANCELADA en el SAT');
            return false;
        }

        return true;
    };

    const handleSave = async () => {
        if (!validar()) return;
        setSaving(true);
        try {
            let xmlUrl = formData.factura_xml_url;
            let pdfUrl = formData.factura_pdf_url;
            let ticketUrl = formData.ticket_url;
            let comprobanteUrl = formData.comprobante_pago_url;
            if (pendingXml) xmlUrl = await subirArchivo(pendingXml, 'xml') || xmlUrl;
            if (pendingPdf) pdfUrl = await subirArchivo(pendingPdf, 'pdf') || pdfUrl;
            if (pendingTicket) ticketUrl = await subirArchivo(pendingTicket, 'ticket') || ticketUrl;
            if (pendingComprobante) comprobanteUrl = await subirArchivo(pendingComprobante, 'comprobante') || comprobanteUrl;

            let estado: EstadoGasto = formData.estado;
            // El estado depende del documento fiscal (XML o ticket), NO del comprobante
            if (modo !== 'provision' && (xmlUrl || ticketUrl)) {
                estado = formData.pagado ? 'pagado' : 'pendiente';
            }

            await onSave({
                ...formData,
                factura_xml_url: xmlUrl, factura_pdf_url: pdfUrl,
                ticket_url: ticketUrl, comprobante_pago_url: comprobanteUrl,
                estado, evento_id: eventoId || null
            });
            toast.success('✅ Gasto guardado correctamente');
        } catch (error: any) {
            toast.error(`Error: ${error.message}`);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className={`rounded-lg shadow-lg overflow-hidden ${className}`} style={{ backgroundColor: themeColors.bg, maxWidth: '600px' }}>
            {/* Header compacto */}
            <div className="flex items-center justify-between px-3 py-2" style={{ background: `linear-gradient(135deg, ${themeColors.primary} 0%, ${themeColors.primaryDark} 100%)` }}>
                <div className="flex items-center gap-2">
                    <TrendingDown className="w-4 h-4 text-white" />
                    <h2 className="text-sm font-semibold text-white">
                        {gasto?.id ? 'Editar Gasto' : modo === 'provision' ? 'Nueva Provisión' : 'Nuevo Gasto'}
                    </h2>
                </div>
                <div className="flex items-center gap-1">
                    <button onClick={handleSave} disabled={saving} className="flex items-center gap-1 px-2 py-1 bg-white/20 hover:bg-white/30 rounded text-white text-xs font-medium">
                        {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                        Guardar
                    </button>
                    <button onClick={onCancel} className="p-1 hover:bg-white/20 rounded">
                        <X className="w-4 h-4 text-white" />
                    </button>
                </div>
            </div>

            {/* Form Content - Ultra compacto */}
            <div className="p-3 space-y-2">
                {/* SAT Alert */}
                {resultadoSAT && (
                    <div className={`px-2 py-1 rounded text-xs flex items-center gap-1 ${resultadoSAT.esValida ? 'bg-green-50 text-green-700' :
                        resultadoSAT.esCancelada ? 'bg-red-50 text-red-700' : 'bg-orange-50 text-orange-700'
                        }`}>
                        {resultadoSAT.esValida ? <Check className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
                        {resultadoSAT.esValida ? 'Factura vigente en SAT' : resultadoSAT.esCancelada ? 'FACTURA CANCELADA EN SAT' : 'No encontrada en SAT'}
                    </div>
                )}

                {/* Documentos - Compacto */}
                <DocumentUploader
                    facturaPdfUrl={formData.factura_pdf_url}
                    facturaXmlUrl={formData.factura_xml_url}
                    ticketUrl={formData.ticket_url}
                    comprobantePagoUrl={formData.comprobante_pago_url}
                    pendingXml={pendingXml} pendingPdf={pendingPdf}
                    pendingTicket={pendingTicket} pendingComprobante={pendingComprobante}
                    onXmlChange={setPendingXml} onPdfChange={setPendingPdf}
                    onTicketChange={setPendingTicket} onComprobanteChange={setPendingComprobante}
                    onDatosExtraidos={(datos) => {
                        setFormData(prev => ({
                            ...prev,
                            concepto: datos.concepto || prev.concepto,
                            proveedor_nombre: datos.proveedor || prev.proveedor_nombre,
                            rfc_proveedor: datos.rfc || prev.rfc_proveedor,
                            fecha_gasto: datos.fecha || prev.fecha_gasto,
                            subtotal: datos.subtotal || prev.subtotal,
                            iva: datos.iva || prev.iva,
                            total: datos.total || prev.total,
                            folio_fiscal: datos.uuid || prev.folio_fiscal
                        }));
                        toast.success('✅ Datos aplicados automáticamente');
                    }}
                    validandoSat={validandoSAT}
                    satResult={resultadoSAT}
                    onSatValidation={async (datos) => {
                        const result = await validarSAT(datos);
                        if (result.esCancelada) toast.error('❌ FACTURA CANCELADA EN SAT - No se puede usar');
                        else if (result.esValida) toast.success('✅ Factura verificada y VIGENTE en SAT');
                        else toast.error('⚠️ Factura no encontrada en SAT');
                    }}
                    modo={modo}
                    themeColors={themeColors}
                />

                {/* Concepto - Campo pequeño */}
                <div>
                    <label className="text-xs font-medium flex items-center gap-1 mb-0.5" style={{ color: themeColors.text }}>
                        <FileText className="w-3 h-3" /> Concepto *
                    </label>
                    <input
                        type="text" value={formData.concepto}
                        onChange={(e) => setFormData(prev => ({ ...prev, concepto: e.target.value }))}
                        placeholder="Descripción del gasto..."
                        className="w-full px-2 py-1.5 border rounded text-sm"
                        style={{ borderColor: themeColors.border, backgroundColor: themeColors.bg, color: themeColors.text }}
                    />
                </div>

                {/* Proveedor + RFC en una fila */}
                <div className="grid grid-cols-2 gap-2">
                    <div>
                        <label className="text-xs font-medium flex items-center gap-1 mb-0.5" style={{ color: themeColors.text }}>
                            <Building2 className="w-3 h-3" /> Proveedor
                        </label>
                        <input
                            type="text" value={formData.proveedor_nombre}
                            onChange={(e) => setFormData(prev => ({ ...prev, proveedor_nombre: e.target.value }))}
                            placeholder="Nombre..."
                            className="w-full px-2 py-1.5 border rounded text-sm"
                            style={{ borderColor: themeColors.border, backgroundColor: themeColors.bg, color: themeColors.text }}
                        />
                    </div>
                    <div>
                        <label className="text-xs font-medium mb-0.5 block" style={{ color: themeColors.text }}>RFC</label>
                        <input
                            type="text" value={formData.rfc_proveedor || ''}
                            onChange={(e) => setFormData(prev => ({ ...prev, rfc_proveedor: e.target.value.toUpperCase() }))}
                            placeholder="RFC..."
                            className="w-full px-2 py-1.5 border rounded text-sm uppercase"
                            style={{ borderColor: themeColors.border, backgroundColor: themeColors.bg, color: themeColors.text }}
                        />
                    </div>
                </div>

                {/* Montos en fila de 3 */}
                <div className="grid grid-cols-3 gap-2">
                    <div>
                        <label className="text-xs font-medium mb-0.5 block" style={{ color: themeColors.text }}>Subtotal</label>
                        <CurrencyInput
                            value={formData.subtotal}
                            onChange={(v) => setFormData(prev => ({ ...prev, subtotal: v }))}
                            style={{ borderColor: themeColors.border, backgroundColor: themeColors.bg, color: themeColors.text }}
                        />
                    </div>
                    <div>
                        <div className="flex items-center justify-between mb-0.5">
                            <label className="text-xs font-medium" style={{ color: themeColors.text }}>IVA</label>
                            <button type="button" onClick={calcularIva} className="text-[10px] text-blue-600 hover:underline flex items-center gap-0.5">
                                <Calculator className="w-2.5 h-2.5" /> Calc
                            </button>
                        </div>
                        <CurrencyInput
                            value={formData.iva}
                            onChange={(v) => setFormData(prev => ({ ...prev, iva: v }))}
                            style={{ borderColor: themeColors.border, backgroundColor: themeColors.bg, color: themeColors.text }}
                        />
                    </div>
                    <div>
                        <label className="text-xs font-medium mb-0.5 block" style={{ color: themeColors.text }}>Total *</label>
                        <CurrencyInput
                            value={formData.total}
                            onChange={(v) => setFormData(prev => ({ ...prev, total: v }))}
                            style={{ borderColor: themeColors.border, backgroundColor: themeColors.bg, color: themeColors.text }}
                        />
                    </div>
                </div>

                {/* Fecha + Categoría */}
                <div className="grid grid-cols-2 gap-2">
                    <div>
                        <label className="text-xs font-medium flex items-center gap-1 mb-0.5" style={{ color: themeColors.text }}>
                            <Calendar className="w-3 h-3" /> Fecha
                        </label>
                        <input
                            type="date" value={formData.fecha_gasto}
                            onChange={(e) => setFormData(prev => ({ ...prev, fecha_gasto: e.target.value }))}
                            className="w-full px-2 py-1.5 border rounded text-xs"
                            style={{ borderColor: themeColors.border, backgroundColor: themeColors.bg, color: themeColors.text }}
                        />
                    </div>
                    {categorias.length > 0 && (
                        <div>
                            <label className="text-xs font-medium flex items-center gap-1 mb-0.5" style={{ color: themeColors.text }}>
                                <Tag className="w-3 h-3" /> Categoría
                            </label>
                            <select
                                value={formData.categoria_id || ''}
                                onChange={(e) => setFormData(prev => ({ ...prev, categoria_id: parseInt(e.target.value) || null }))}
                                className="w-full px-2 py-1.5 border rounded text-xs"
                                style={{ borderColor: themeColors.border, backgroundColor: themeColors.bg, color: themeColors.text }}
                            >
                                <option value="">Seleccionar...</option>
                                {categorias.map(cat => <option key={cat.id} value={cat.id}>{cat.nombre}</option>)}
                            </select>
                        </div>
                    )}
                </div>

                {/* Forma de Pago + Ejecutivo */}
                <div className="grid grid-cols-2 gap-2">
                    {formasPago.length > 0 && (
                        <div>
                            <label className="text-xs font-medium flex items-center gap-1 mb-0.5" style={{ color: themeColors.text }}>
                                <DollarSign className="w-3 h-3" /> Forma de Pago
                            </label>
                            <select
                                value={formData.forma_pago_id || ''}
                                onChange={(e) => setFormData(prev => ({ ...prev, forma_pago_id: parseInt(e.target.value) || null }))}
                                className="w-full px-2 py-1.5 border rounded text-xs"
                                style={{ borderColor: themeColors.border, backgroundColor: themeColors.bg, color: themeColors.text }}
                            >
                                <option value="">Seleccionar...</option>
                                {formasPago.map(f => <option key={f.id} value={f.id}>{f.nombre}</option>)}
                            </select>
                        </div>
                    )}
                    {ejecutivos.length > 0 && (
                        <div>
                            <label className="text-xs font-medium flex items-center gap-1 mb-0.5" style={{ color: themeColors.text }}>
                                <UserCheck className="w-3 h-3" /> Ejecutivo
                            </label>
                            <select
                                value={formData.ejecutivo_id || ''}
                                onChange={(e) => setFormData(prev => ({ ...prev, ejecutivo_id: parseInt(e.target.value) || null }))}
                                className="w-full px-2 py-1.5 border rounded text-xs"
                                style={{ borderColor: themeColors.border, backgroundColor: themeColors.bg, color: themeColors.text }}
                            >
                                <option value="">Seleccionar...</option>
                                {ejecutivos.map(e => <option key={e.id} value={e.id}>{e.nombre}</option>)}
                            </select>
                        </div>
                    )}
                </div>

                {/* Pagado + Estado en fila */}
                <div className="flex items-center justify-between pt-1 border-t" style={{ borderColor: themeColors.border }}>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                            type="checkbox" checked={formData.pagado}
                            onChange={(e) => setFormData(prev => ({ ...prev, pagado: e.target.checked, estado: e.target.checked ? 'pagado' : 'pendiente' }))}
                            className="w-4 h-4 rounded"
                        />
                        <span className="text-xs font-medium" style={{ color: themeColors.text }}>Pagado</span>
                    </label>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${formData.estado === 'pagado' ? 'bg-green-100 text-green-700' :
                        formData.estado === 'provision' ? 'bg-gray-100 text-gray-700' : 'bg-yellow-100 text-yellow-700'
                        }`}>
                        {formData.estado === 'pagado' ? '✓ Pagado' : formData.estado === 'provision' ? '📋 Provisión' : '⏳ Pendiente'}
                    </span>
                </div>

                {/* Notas compacto */}
                <div>
                    <label className="text-xs font-medium mb-0.5 block" style={{ color: themeColors.text }}>Notas</label>
                    <textarea
                        value={formData.notas || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, notas: e.target.value }))}
                        rows={1}
                        placeholder="Observaciones..."
                        className="w-full px-2 py-1 border rounded text-xs resize-none"
                        style={{ borderColor: themeColors.border, backgroundColor: themeColors.bg, color: themeColors.text }}
                    />
                </div>
            </div>
        </div>
    );
};

export default UnifiedExpenseForm;
