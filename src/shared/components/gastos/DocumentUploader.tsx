/**
 * COMPONENTE: Subida de Documentos COMPACTO
 * ==========================================
 * Usa servicios modulares para procesamiento
 * - xmlProcessingService
 * - pdfProcessingService  
 * - imageProcessingService
 */
import React, { useRef, useState, useCallback } from 'react';
import {
    FileText, Check, Loader2, Camera, FileCode, CreditCard, Eye, Trash2
} from 'lucide-react';
import toast from 'react-hot-toast';

// Servicios modulares
import { documentService, DatosGastoUnificados } from '../../../services/documentProcessingService';

export interface DatosExtraidos {
    proveedor?: string;
    rfc?: string;
    concepto?: string;
    fecha?: string;
    subtotal?: number;
    iva?: number;
    total?: number;
    uuid?: string;
    folio?: string;
}

interface DocumentUploaderProps {
    facturaPdfUrl?: string | null;
    facturaXmlUrl?: string | null;
    ticketUrl?: string | null;
    comprobantePagoUrl?: string | null;
    pendingXml?: File | null;
    pendingPdf?: File | null;
    pendingTicket?: File | null;
    pendingComprobante?: File | null;
    onXmlChange: (file: File | null) => void;
    onPdfChange: (file: File | null) => void;
    onTicketChange: (file: File | null) => void;
    onComprobanteChange: (file: File | null) => void;
    onDatosExtraidos?: (datos: DatosExtraidos) => void;
    validandoSat?: boolean;
    satResult?: { esValida?: boolean; esCancelada?: boolean; noEncontrada?: boolean } | null;
    onSatValidation?: (datos: { uuid: string; rfcEmisor: string; rfcReceptor: string; total: number }) => Promise<void>;
    disabled?: boolean;
    modo?: 'evento' | 'gni' | 'provision';
    themeColors?: { primary: string; border: string; bg: string; text: string; };
}

type TipoDoc = 'factura' | 'ticket' | 'pdfSolo' | null;

export const DocumentUploader: React.FC<DocumentUploaderProps> = ({
    facturaPdfUrl, facturaXmlUrl, ticketUrl, comprobantePagoUrl,
    pendingXml, pendingPdf, pendingTicket, pendingComprobante,
    onXmlChange, onPdfChange, onTicketChange, onComprobanteChange,
    onDatosExtraidos, validandoSat = false, satResult = null, onSatValidation,
    disabled = false, modo = 'evento',
    themeColors = { primary: '#3B82F6', border: '#E2E8F0', bg: '#FFFFFF', text: '#1E293B' }
}) => {
    const [tipoDoc, setTipoDoc] = useState<TipoDoc>(
        facturaXmlUrl || facturaPdfUrl || pendingXml || pendingPdf ? 'factura' :
            ticketUrl || pendingTicket ? 'ticket' : null
    );
    const [procesando, setProcesando] = useState(false);
    const [mensaje, setMensaje] = useState('');

    // Preview URLs
    const [xmlPreviewName, setXmlPreviewName] = useState<string | null>(null);
    const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);
    const [ticketPreviewUrl, setTicketPreviewUrl] = useState<string | null>(null);
    const [comprobantePreviewUrl, setComprobantePreviewUrl] = useState<string | null>(null);

    // Refs
    const xmlRef = useRef<HTMLInputElement>(null);
    const pdfRef = useRef<HTMLInputElement>(null);
    const ticketRef = useRef<HTMLInputElement>(null);
    const comprobanteRef = useRef<HTMLInputElement>(null);
    const pdfSoloRef = useRef<HTMLInputElement>(null);

    // Estado
    const tieneXml = Boolean(facturaXmlUrl || pendingXml);
    const tienePdf = Boolean(facturaPdfUrl || pendingPdf);
    const tieneTicket = Boolean(ticketUrl || pendingTicket);
    const tieneComprobante = Boolean(comprobantePagoUrl || pendingComprobante);
    const tieneDocumentos = tieneXml || tienePdf || tieneTicket;

    // Convertir datos unificados a formato de extraídos
    const convertirDatos = (datos: DatosGastoUnificados): DatosExtraidos => ({
        proveedor: datos.proveedor,
        rfc: datos.rfc,
        concepto: datos.concepto,
        fecha: datos.fecha,
        subtotal: datos.subtotal,
        iva: datos.iva,
        total: datos.total,
        uuid: datos.uuid,
        folio: datos.folio
    });

    // Procesar XML usando servicio modular
    const procesarXML = useCallback(async (file: File) => {
        setProcesando(true);
        setMensaje('Procesando XML CFDI...');
        try {
            const resultado = await documentService.procesarXML(file);

            if (!resultado.success || !resultado.datos) {
                throw new Error(resultado.error || 'Error procesando XML');
            }

            // Obtener datos para SAT
            const datosSAT = await documentService.obtenerDatosSAT(file);
            if (datosSAT && onSatValidation) {
                setMensaje('Validando con SAT...');
                await onSatValidation(datosSAT);
            }

            // Aplicar datos extraídos
            onDatosExtraidos?.(convertirDatos(resultado.datos));
            onXmlChange(file);
            setXmlPreviewName(file.name);
            setTipoDoc('factura');

            toast.success(`✅ XML: ${resultado.datos.proveedor} - $${resultado.datos.total?.toFixed(2)}`);
        } catch (e: unknown) {
            const error = e as Error;
            toast.error(error.message || 'Error procesando XML');
        } finally {
            setProcesando(false);
            setMensaje('');
        }
    }, [onXmlChange, onDatosExtraidos, onSatValidation]);

    // Procesar Ticket OCR usando servicio modular
    const procesarTicket = useCallback(async (file: File) => {
        setProcesando(true);
        setMensaje('Extrayendo datos con OCR...');
        try {
            const resultado = await documentService.procesarImagen(file);

            if (!resultado.success || !resultado.datos) {
                throw new Error(resultado.error || 'No se pudieron extraer datos');
            }

            onDatosExtraidos?.(convertirDatos(resultado.datos));
            onTicketChange(file);
            onXmlChange(null);
            onPdfChange(null);
            setTicketPreviewUrl(URL.createObjectURL(file));
            setTipoDoc('ticket');

            toast.success(`✅ Ticket: ${resultado.datos.proveedor || 'Establecimiento'} - $${resultado.datos.total?.toFixed(2)}`);
        } catch (e: unknown) {
            const error = e as Error;
            toast.error(error.message || 'Error procesando ticket');
        } finally {
            setProcesando(false);
            setMensaje('');
        }
    }, [onTicketChange, onXmlChange, onPdfChange, onDatosExtraidos]);

    // Validar solo PDF usando servicio modular
    const validarPdfSolo = useCallback(async (file: File) => {
        setProcesando(true);
        setMensaje('Validando PDF con SAT...');
        try {
            const resultado = await documentService.procesarPDF(file);

            if (!resultado.success) {
                throw new Error(resultado.error || 'Error validando PDF');
            }

            if (resultado.datos) {
                onDatosExtraidos?.(convertirDatos(resultado.datos));
            }

            // Mostrar resultado SAT
            if (resultado.validacionSAT?.esValida) {
                toast.success('✅ Factura VIGENTE en SAT');
            } else if (resultado.validacionSAT?.esCancelada) {
                toast.error('❌ Factura CANCELADA en SAT');
            } else {
                toast.error('⚠️ Factura no encontrada en SAT');
            }

            onPdfChange(file);
            setPdfPreviewUrl(URL.createObjectURL(file));
            setTipoDoc('pdfSolo');
        } catch (e: unknown) {
            const error = e as Error;
            toast.error(error.message || 'Error validando PDF');
        } finally {
            setProcesando(false);
            setMensaje('');
        }
    }, [onPdfChange, onDatosExtraidos]);

    // Handlers de archivos
    const handleXml = (e: React.ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files?.[0];
        if (f) procesarXML(f);
        if (xmlRef.current) xmlRef.current.value = '';
    };

    const handlePdf = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files?.[0];
        if (!f) return;

        // Si hay XML cargado, validar correspondencia
        if (pendingXml) {
            setProcesando(true);
            setMensaje('Comparando PDF con XML...');
            try {
                const resultado = await documentService.verificarCorrespondenciaXMLPDF(pendingXml, f);

                if (!resultado.corresponden) {
                    toast.error(`❌ ${resultado.mensaje || 'PDF y XML no corresponden al mismo CFDI'}`);
                    setProcesando(false);
                    setMensaje('');
                    if (pdfRef.current) pdfRef.current.value = '';
                    return;
                }

                toast.success('✅ PDF corresponde al XML cargado');
            } catch (error) {
                console.error('Error comparando documentos:', error);
                // Si falla la comparación, permitir pero advertir
                toast.error('⚠️ No se pudo verificar correspondencia XML-PDF');
            } finally {
                setProcesando(false);
                setMensaje('');
            }
        }

        onPdfChange(f);
        setPdfPreviewUrl(URL.createObjectURL(f));
        toast.success(`PDF cargado: ${f.name.slice(0, 25)}...`);
        if (pdfRef.current) pdfRef.current.value = '';
    };

    const handleTicket = (e: React.ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files?.[0];
        if (f) procesarTicket(f);
        if (ticketRef.current) ticketRef.current.value = '';
    };

    const handleComprobante = (e: React.ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files?.[0];
        if (f) {
            onComprobanteChange(f);
            setComprobantePreviewUrl(URL.createObjectURL(f));
            toast.success('Comprobante cargado');
        }
        if (comprobanteRef.current) comprobanteRef.current.value = '';
    };

    const handlePdfSolo = (e: React.ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files?.[0];
        if (f) validarPdfSolo(f);
        if (pdfSoloRef.current) pdfSoloRef.current.value = '';
    };

    // Limpiar todo
    const limpiar = () => {
        onXmlChange(null);
        onPdfChange(null);
        onTicketChange(null);
        onComprobanteChange(null);
        setTipoDoc(null);
        setXmlPreviewName(null);
        if (pdfPreviewUrl) URL.revokeObjectURL(pdfPreviewUrl);
        if (ticketPreviewUrl) URL.revokeObjectURL(ticketPreviewUrl);
        if (comprobantePreviewUrl) URL.revokeObjectURL(comprobantePreviewUrl);
        setPdfPreviewUrl(null);
        setTicketPreviewUrl(null);
        setComprobantePreviewUrl(null);
    };

    // Abrir archivo en nueva pestaña
    const abrirArchivo = (url: string | null | undefined) => {
        if (url) window.open(url, '_blank');
    };

    // Badge de estado SAT
    const SATBadge = () => {
        if (validandoSat) return <span className="text-xs text-blue-600 animate-pulse">Validando...</span>;
        if (!satResult) return null;
        if (satResult.esValida) return <span className="text-xs text-green-600 font-medium">✓ SAT Vigente</span>;
        if (satResult.esCancelada) return <span className="text-xs text-red-600 font-medium">✗ CANCELADA</span>;
        return <span className="text-xs text-orange-600">⚠ No encontrada</span>;
    };

    // === RENDER: PROCESANDO ===
    if (procesando) {
        return (
            <div className="p-2 border rounded flex items-center gap-2 bg-blue-50 border-blue-200">
                <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                <span className="text-xs text-blue-700">{mensaje}</span>
            </div>
        );
    }

    // === RENDER: PROVISIÓN (Deshabilitado) ===
    if (modo === 'provision') {
        return (
            <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <span className="text-xs font-medium" style={{ color: themeColors.text }}>📎 Documentos</span>
                    <span className="text-[10px] text-gray-400">(Se adjuntan al pagar)</span>
                </div>
                <div className="grid grid-cols-3 gap-1">
                    {[
                        { icon: FileCode, color: 'blue', label: 'Factura' },
                        { icon: Camera, color: 'amber', label: 'Ticket' },
                        { icon: FileText, color: 'purple', label: 'PDF' }
                    ].map(({ icon: Icon, color, label }) => (
                        <div key={label} className="p-2 border rounded text-center opacity-40">
                            <Icon className={`w-4 h-4 mx-auto text-${color}-400`} />
                            <span className={`text-[10px] text-${color}-400 block`}>{label}</span>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    // === RENDER: DOCUMENTOS YA CARGADOS ===
    if (tieneDocumentos) {
        return (
            <div className="space-y-2">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <span className="text-xs font-medium" style={{ color: themeColors.text }}>📎 Documentos</span>
                    <button onClick={limpiar} className="text-[10px] text-red-500 hover:text-red-700 flex items-center gap-0.5">
                        <Trash2 className="w-3 h-3" /> Limpiar
                    </button>
                </div>

                {/* Factura (XML + PDF) */}
                {tipoDoc === 'factura' && (
                    <div className="p-2 rounded border bg-blue-50 border-blue-200 space-y-1">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-blue-700">📄 Factura CFDI</span>
                            <SATBadge />
                        </div>
                        <div className="grid grid-cols-2 gap-1">
                            {/* XML */}
                            <div
                                onClick={() => !tieneXml && !disabled && xmlRef.current?.click()}
                                className={`flex items-center gap-1 p-1.5 rounded border text-xs cursor-pointer ${tieneXml ? 'bg-green-50 border-green-300' : 'hover:bg-gray-50'
                                    }`}
                            >
                                {tieneXml ? <Check className="w-3 h-3 text-green-600" /> : <FileCode className="w-3 h-3 text-gray-400" />}
                                <span className="truncate flex-1">{tieneXml ? (xmlPreviewName?.slice(0, 12) || 'XML ✓') : 'XML *'}</span>
                                {tieneXml && facturaXmlUrl && (
                                    <Eye className="w-3 h-3 text-blue-500 hover:text-blue-700" onClick={(e) => { e.stopPropagation(); abrirArchivo(facturaXmlUrl); }} />
                                )}
                            </div>
                            {/* PDF */}
                            <div
                                onClick={() => !disabled && pdfRef.current?.click()}
                                className={`flex items-center gap-1 p-1.5 rounded border text-xs cursor-pointer ${tienePdf ? 'bg-green-50 border-green-300' : 'hover:bg-gray-50'
                                    }`}
                            >
                                {tienePdf ? <Check className="w-3 h-3 text-green-600" /> : <FileText className="w-3 h-3 text-gray-400" />}
                                <span className="truncate flex-1">{tienePdf ? 'PDF ✓' : 'PDF'}</span>
                                {(pdfPreviewUrl || facturaPdfUrl) && (
                                    <Eye className="w-3 h-3 text-blue-500 hover:text-blue-700" onClick={(e) => { e.stopPropagation(); abrirArchivo(pdfPreviewUrl || facturaPdfUrl); }} />
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Ticket OCR */}
                {tipoDoc === 'ticket' && tieneTicket && (
                    <div className="p-2 rounded border bg-amber-50 border-amber-200 flex items-center justify-between">
                        <div className="flex items-center gap-1">
                            <Camera className="w-4 h-4 text-amber-600" />
                            <span className="text-xs text-amber-700">Ticket (OCR)</span>
                        </div>
                        {(ticketPreviewUrl || ticketUrl) && (
                            <Eye className="w-4 h-4 text-amber-600 cursor-pointer hover:text-amber-800"
                                onClick={() => abrirArchivo(ticketPreviewUrl || ticketUrl)} />
                        )}
                    </div>
                )}

                {/* PDF Solo */}
                {tipoDoc === 'pdfSolo' && (
                    <div className="p-2 rounded border bg-purple-50 border-purple-200 flex items-center justify-between">
                        <div className="flex items-center gap-1">
                            <FileText className="w-4 h-4 text-purple-600" />
                            <span className="text-xs text-purple-700">PDF validado</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <SATBadge />
                            {pdfPreviewUrl && (
                                <Eye className="w-4 h-4 text-purple-600 cursor-pointer" onClick={() => abrirArchivo(pdfPreviewUrl)} />
                            )}
                        </div>
                    </div>
                )}

                {/* Comprobante de Pago */}
                <div
                    onClick={() => !disabled && comprobanteRef.current?.click()}
                    className={`flex items-center gap-2 p-1.5 border rounded cursor-pointer ${tieneComprobante ? 'bg-green-50 border-green-300' : 'hover:bg-gray-50'
                        }`}
                >
                    {tieneComprobante ? <Check className="w-4 h-4 text-green-600" /> : <CreditCard className="w-4 h-4 text-gray-400" />}
                    <span className="text-xs flex-1" style={{ color: themeColors.text }}>
                        {tieneComprobante ? 'Comprobante ✓' : 'Comprobante de pago *'}
                    </span>
                    {(comprobantePreviewUrl || comprobantePagoUrl) && (
                        <Eye className="w-3 h-3 text-blue-500" onClick={(e) => { e.stopPropagation(); abrirArchivo(comprobantePreviewUrl || comprobantePagoUrl); }} />
                    )}
                </div>

                {/* Inputs ocultos */}
                <input ref={xmlRef} type="file" accept=".xml" onChange={handleXml} className="hidden" />
                <input ref={pdfRef} type="file" accept=".pdf" onChange={handlePdf} className="hidden" />
                <input ref={ticketRef} type="file" accept="image/*" onChange={handleTicket} className="hidden" />
                <input ref={comprobanteRef} type="file" accept=".pdf,image/*" onChange={handleComprobante} className="hidden" />
            </div>
        );
    }

    // === RENDER: SELECTOR INICIAL (Sin documentos) ===
    return (
        <div className="space-y-2">
            <span className="text-xs font-medium" style={{ color: themeColors.text }}>📎 Tipo de documento</span>

            <div className="grid grid-cols-3 gap-1.5">
                {/* Factura */}
                <button
                    type="button"
                    onClick={() => { setTipoDoc('factura'); setTimeout(() => xmlRef.current?.click(), 50); }}
                    disabled={disabled}
                    className="flex flex-col items-center gap-1 p-2 border-2 border-dashed rounded hover:bg-blue-50 transition-colors"
                    style={{ borderColor: '#3B82F6' }}
                >
                    <FileCode className="w-5 h-5 text-blue-600" />
                    <span className="text-[10px] font-medium text-blue-600">Factura</span>
                </button>

                {/* Ticket */}
                <button
                    type="button"
                    onClick={() => { setTipoDoc('ticket'); setTimeout(() => ticketRef.current?.click(), 50); }}
                    disabled={disabled}
                    className="flex flex-col items-center gap-1 p-2 border-2 border-dashed rounded hover:bg-amber-50 transition-colors"
                    style={{ borderColor: '#F59E0B' }}
                >
                    <Camera className="w-5 h-5 text-amber-600" />
                    <span className="text-[10px] font-medium text-amber-600">Ticket</span>
                </button>

                {/* Solo PDF */}
                <button
                    type="button"
                    onClick={() => pdfSoloRef.current?.click()}
                    disabled={disabled}
                    className="flex flex-col items-center gap-1 p-2 border-2 border-dashed rounded hover:bg-purple-50 transition-colors"
                    style={{ borderColor: '#8B5CF6' }}
                >
                    <FileText className="w-5 h-5 text-purple-600" />
                    <span className="text-[10px] font-medium text-purple-600">Solo PDF</span>
                </button>
            </div>

            {/* Inputs ocultos */}
            <input ref={xmlRef} type="file" accept=".xml" onChange={handleXml} className="hidden" />
            <input ref={pdfRef} type="file" accept=".pdf" onChange={handlePdf} className="hidden" />
            <input ref={ticketRef} type="file" accept="image/*" onChange={handleTicket} className="hidden" />
            <input ref={comprobanteRef} type="file" accept=".pdf,image/*" onChange={handleComprobante} className="hidden" />
            <input ref={pdfSoloRef} type="file" accept=".pdf" onChange={handlePdfSolo} className="hidden" />
        </div>
    );
};

export default DocumentUploader;
