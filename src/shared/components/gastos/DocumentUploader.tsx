/**
 * COMPONENTE: Subida de Documentos para Gastos
 * Soporta: Factura (PDF+XML), Ticket, Comprobante de Pago
 */
import React, { useRef, useState } from 'react';
import { FileText, Upload, X, Check, Loader2, Camera, FileCode, Receipt, CreditCard, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';

interface DocumentUploaderProps {
    // URLs actuales
    facturaPdfUrl?: string | null;
    facturaXmlUrl?: string | null;
    ticketUrl?: string | null;
    comprobantePagoUrl?: string | null;

    // Callbacks
    onFacturaPdfChange: (file: File | null, url?: string) => void;
    onFacturaXmlChange: (file: File | null, url?: string) => void;
    onTicketChange: (file: File | null, url?: string) => void;
    onComprobantePagoChange: (file: File | null, url?: string) => void;
    onXmlProcessed?: (data: any) => void;

    // Estado
    procesandoXml?: boolean;
    validandoSat?: boolean;
    satResult?: { esValida?: boolean; esCancelada?: boolean; noEncontrada?: boolean } | null;

    // Config
    disabled?: boolean;
    themeColors?: {
        primary: string;
        border: string;
        bg: string;
        text: string;
    };
}

export const DocumentUploader: React.FC<DocumentUploaderProps> = ({
    facturaPdfUrl,
    facturaXmlUrl,
    ticketUrl,
    comprobantePagoUrl,
    onFacturaPdfChange,
    onFacturaXmlChange,
    onTicketChange,
    onComprobantePagoChange,
    onXmlProcessed,
    procesandoXml = false,
    validandoSat = false,
    satResult = null,
    disabled = false,
    themeColors = {
        primary: '#3B82F6',
        border: '#E2E8F0',
        bg: '#FFFFFF',
        text: '#1E293B'
    }
}) => {
    const [tipoDoc, setTipoDoc] = useState<'factura' | 'ticket' | null>(
        facturaXmlUrl || facturaPdfUrl ? 'factura' : ticketUrl ? 'ticket' : null
    );

    const xmlInputRef = useRef<HTMLInputElement>(null);
    const pdfInputRef = useRef<HTMLInputElement>(null);
    const ticketInputRef = useRef<HTMLInputElement>(null);
    const comprobanteInputRef = useRef<HTMLInputElement>(null);

    // Manejar selección de XML
    const handleXmlSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.name.toLowerCase().endsWith('.xml')) {
            toast.error('Solo se permiten archivos XML');
            return;
        }

        setTipoDoc('factura');
        onFacturaXmlChange(file);
        toast.success(`XML seleccionado: ${file.name}`);
    };

    // Manejar selección de PDF
    const handlePdfSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.type !== 'application/pdf') {
            toast.error('Solo se permiten archivos PDF');
            return;
        }

        onFacturaPdfChange(file);
        toast.success(`PDF seleccionado: ${file.name}`);
    };

    // Manejar selección de Ticket
    const handleTicketSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
        if (!validTypes.includes(file.type)) {
            toast.error('Solo se permiten imágenes (JPG, PNG, WEBP)');
            return;
        }

        setTipoDoc('ticket');
        // Limpiar factura si selecciona ticket
        onFacturaPdfChange(null);
        onFacturaXmlChange(null);
        onTicketChange(file);
        toast.success('Ticket seleccionado');
    };

    // Manejar selección de Comprobante de Pago
    const handleComprobanteSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const validTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
        if (!validTypes.includes(file.type)) {
            toast.error('Solo se permiten PDF o imágenes');
            return;
        }

        onComprobantePagoChange(file);
        toast.success('Comprobante de pago seleccionado');
    };

    // Limpiar todos los documentos
    const clearAll = () => {
        setTipoDoc(null);
        onFacturaPdfChange(null);
        onFacturaXmlChange(null);
        onTicketChange(null);
        onComprobantePagoChange(null);
    };

    // Indicador de estado SAT
    const SATIndicator = () => {
        if (validandoSat) {
            return (
                <div className="flex items-center gap-1 text-blue-600">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-xs">Validando SAT...</span>
                </div>
            );
        }

        if (!satResult) return null;

        if (satResult.esValida) {
            return (
                <div className="flex items-center gap-1 text-green-600">
                    <Check className="w-4 h-4" />
                    <span className="text-xs font-medium">Vigente en SAT</span>
                </div>
            );
        }

        if (satResult.esCancelada) {
            return (
                <div className="flex items-center gap-1 text-red-600">
                    <AlertTriangle className="w-4 h-4" />
                    <span className="text-xs font-medium">CANCELADA</span>
                </div>
            );
        }

        if (satResult.noEncontrada) {
            return (
                <div className="flex items-center gap-1 text-orange-600">
                    <AlertTriangle className="w-4 h-4" />
                    <span className="text-xs font-medium">No encontrada</span>
                </div>
            );
        }

        return null;
    };

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold" style={{ color: themeColors.text }}>
                    📎 Documentos
                </h4>
                {(facturaPdfUrl || facturaXmlUrl || ticketUrl || comprobantePagoUrl) && (
                    <button
                        type="button"
                        onClick={clearAll}
                        disabled={disabled}
                        className="text-xs text-red-500 hover:text-red-700"
                    >
                        Limpiar todo
                    </button>
                )}
            </div>

            {/* Selector de tipo (si no hay documentos) */}
            {!tipoDoc && !facturaPdfUrl && !facturaXmlUrl && !ticketUrl && (
                <div className="grid grid-cols-2 gap-3">
                    <button
                        type="button"
                        onClick={() => {
                            setTipoDoc('factura');
                            setTimeout(() => xmlInputRef.current?.click(), 100);
                        }}
                        disabled={disabled}
                        className="flex flex-col items-center gap-2 p-4 border-2 border-dashed rounded-lg hover:bg-blue-50 transition-colors"
                        style={{ borderColor: '#3B82F6' }}
                    >
                        <FileCode className="w-8 h-8 text-blue-600" />
                        <span className="text-sm font-medium text-blue-700">Factura (XML+PDF)</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => {
                            setTipoDoc('ticket');
                            setTimeout(() => ticketInputRef.current?.click(), 100);
                        }}
                        disabled={disabled}
                        className="flex flex-col items-center gap-2 p-4 border-2 border-dashed rounded-lg hover:bg-amber-50 transition-colors"
                        style={{ borderColor: '#F59E0B' }}
                    >
                        <Camera className="w-8 h-8 text-amber-600" />
                        <span className="text-sm font-medium text-amber-700">Ticket (imagen)</span>
                    </button>
                </div>
            )}

            {/* Factura: XML + PDF */}
            {tipoDoc === 'factura' && (
                <div className="space-y-3 p-3 border rounded-lg" style={{ borderColor: themeColors.border, backgroundColor: `${themeColors.primary}08` }}>
                    <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-blue-700">📄 Factura</span>
                        <SATIndicator />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                        {/* XML */}
                        <div
                            onClick={() => !disabled && xmlInputRef.current?.click()}
                            className={`flex items-center gap-2 p-2 border rounded cursor-pointer transition-colors ${facturaXmlUrl ? 'bg-green-50 border-green-300' : 'hover:bg-gray-50'
                                }`}
                            style={{ borderColor: facturaXmlUrl ? '#22C55E' : themeColors.border }}
                        >
                            {procesandoXml ? (
                                <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
                            ) : facturaXmlUrl ? (
                                <Check className="w-5 h-5 text-green-600" />
                            ) : (
                                <FileCode className="w-5 h-5 text-gray-400" />
                            )}
                            <span className="text-xs truncate">
                                {facturaXmlUrl ? 'XML ✓' : 'Subir XML *'}
                            </span>
                        </div>

                        {/* PDF */}
                        <div
                            onClick={() => !disabled && pdfInputRef.current?.click()}
                            className={`flex items-center gap-2 p-2 border rounded cursor-pointer transition-colors ${facturaPdfUrl ? 'bg-green-50 border-green-300' : 'hover:bg-gray-50'
                                }`}
                            style={{ borderColor: facturaPdfUrl ? '#22C55E' : themeColors.border }}
                        >
                            {facturaPdfUrl ? (
                                <Check className="w-5 h-5 text-green-600" />
                            ) : (
                                <FileText className="w-5 h-5 text-gray-400" />
                            )}
                            <span className="text-xs truncate">
                                {facturaPdfUrl ? 'PDF ✓' : 'Subir PDF *'}
                            </span>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={() => {
                            setTipoDoc(null);
                            onFacturaPdfChange(null);
                            onFacturaXmlChange(null);
                        }}
                        className="text-xs text-gray-500 hover:text-gray-700"
                    >
                        Cambiar a ticket
                    </button>
                </div>
            )}

            {/* Ticket */}
            {tipoDoc === 'ticket' && (
                <div className="space-y-3 p-3 border rounded-lg" style={{ borderColor: '#F59E0B', backgroundColor: '#FFFBEB' }}>
                    <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-amber-700">🎫 Ticket</span>
                    </div>

                    <div
                        onClick={() => !disabled && ticketInputRef.current?.click()}
                        className={`flex items-center gap-2 p-2 border rounded cursor-pointer transition-colors ${ticketUrl ? 'bg-green-50 border-green-300' : 'hover:bg-gray-50'
                            }`}
                        style={{ borderColor: ticketUrl ? '#22C55E' : themeColors.border }}
                    >
                        {ticketUrl ? (
                            <Check className="w-5 h-5 text-green-600" />
                        ) : (
                            <Camera className="w-5 h-5 text-gray-400" />
                        )}
                        <span className="text-xs truncate">
                            {ticketUrl ? 'Imagen ✓' : 'Subir imagen *'}
                        </span>
                    </div>

                    <button
                        type="button"
                        onClick={() => {
                            setTipoDoc(null);
                            onTicketChange(null);
                        }}
                        className="text-xs text-gray-500 hover:text-gray-700"
                    >
                        Cambiar a factura
                    </button>
                </div>
            )}

            {/* Comprobante de Pago (siempre visible si hay tipo seleccionado) */}
            {tipoDoc && (
                <div
                    onClick={() => !disabled && comprobanteInputRef.current?.click()}
                    className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${comprobantePagoUrl ? 'bg-green-50 border-green-300' : 'hover:bg-gray-50'
                        }`}
                    style={{ borderColor: comprobantePagoUrl ? '#22C55E' : themeColors.border }}
                >
                    {comprobantePagoUrl ? (
                        <Check className="w-6 h-6 text-green-600" />
                    ) : (
                        <CreditCard className="w-6 h-6 text-gray-400" />
                    )}
                    <div>
                        <span className="text-sm font-medium" style={{ color: themeColors.text }}>
                            Comprobante de Pago
                        </span>
                        <span className="text-xs text-gray-500 block">
                            {comprobantePagoUrl ? '✓ Subido' : 'Transferencia, voucher, etc. *'}
                        </span>
                    </div>
                </div>
            )}

            {/* Inputs ocultos */}
            <input
                ref={xmlInputRef}
                type="file"
                accept=".xml"
                onChange={handleXmlSelect}
                className="hidden"
            />
            <input
                ref={pdfInputRef}
                type="file"
                accept="application/pdf"
                onChange={handlePdfSelect}
                className="hidden"
            />
            <input
                ref={ticketInputRef}
                type="file"
                accept="image/*"
                onChange={handleTicketSelect}
                className="hidden"
            />
            <input
                ref={comprobanteInputRef}
                type="file"
                accept="application/pdf,image/*"
                onChange={handleComprobanteSelect}
                className="hidden"
            />
        </div>
    );
};

export default DocumentUploader;
