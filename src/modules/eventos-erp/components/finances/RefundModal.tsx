/**
 * MODAL DE REGISTRO DE DEVOLUCIÓN DE GASTO
 * 
 * Flujo:
 * 1. Copia la información del gasto original con valores negativos
 * 2. Solo permite editar: Nota y Comprobante
 * 3. Guarda automáticamente con referencia al gasto original
 */

import React, { useState, useRef } from 'react';
import { X, Save, Loader2, Upload, FileText, Undo2, DollarSign } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../../../../core/config/supabase';
import { useAuth } from '../../../../core/auth/AuthProvider';
import { formatCurrency } from '../../../../shared/utils/formatters';
import { Expense } from '../../types/Finance';

interface RefundModalProps {
    gastoOriginal: Expense;
    eventoId: string;
    onSave: () => void;
    onClose: () => void;
}

export const RefundModal: React.FC<RefundModalProps> = ({
    gastoOriginal,
    eventoId,
    onSave,
    onClose
}) => {
    const { user } = useAuth();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [saving, setSaving] = useState(false);
    const [nota, setNota] = useState('');
    const [comprobanteUrl, setComprobanteUrl] = useState<string | null>(null);
    const [comprobanteNombre, setComprobanteNombre] = useState<string | null>(null);
    const [uploading, setUploading] = useState(false);

    // Valores negativos para la devolución
    const subtotalDevolucion = -Math.abs(gastoOriginal.subtotal || 0);
    const ivaDevolucion = -Math.abs(gastoOriginal.iva || 0);
    const totalDevolucion = -Math.abs(gastoOriginal.total || 0);

    // Subir comprobante
    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        try {
            const fileName = `${Date.now()}_devolucion_${file.name}`;
            const filePath = `comprobantes/${user?.company_id}/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('documentos')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data: urlData } = supabase.storage
                .from('documentos')
                .getPublicUrl(filePath);

            setComprobanteUrl(urlData.publicUrl);
            setComprobanteNombre(file.name);
            toast.success('Comprobante adjuntado');
        } catch (error: unknown) {
            console.error('Error subiendo comprobante:', error);
            toast.error('Error al subir comprobante');
        } finally {
            setUploading(false);
        }
    };

    // Guardar devolución
    const handleSubmit = async () => {
        if (!nota.trim()) {
            toast.error('Debe agregar una nota explicando la devolución');
            return;
        }

        setSaving(true);
        try {
            const devolucionData = {
                company_id: user?.company_id,
                evento_id: parseInt(eventoId),
                categoria_id: gastoOriginal.categoria_id,
                concepto: `[DEVOLUCIÓN] ${gastoOriginal.concepto}`,
                descripcion: `Devolución de gasto ID: ${gastoOriginal.id}. Motivo: ${nota}`,
                subtotal: subtotalDevolucion,
                iva: ivaDevolucion,
                total: totalDevolucion,
                pagado: true,
                fecha_gasto: new Date().toISOString().split('T')[0],
                fecha_creacion: new Date().toISOString(),
                notas: `[DEVOLUCIÓN REF: ${gastoOriginal.id}] ${nota}`,
                comprobante_url: comprobanteUrl,
                comprobante_nombre: comprobanteNombre,
                tipo_movimiento: 'retorno',
                status: 'aprobado',
                creado_por: user?.id
            };

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { error } = await supabase
                .from('evt_gastos_erp')
                .insert(devolucionData as any);

            if (error) throw error;

            toast.success(`Devolución registrada: ${formatCurrency(totalDevolucion)}`);
            onSave();
        } catch (error: unknown) {
            console.error('Error guardando devolución:', error);
            const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
            toast.error(`Error: ${errorMessage}`);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-red-600 to-red-700">
                    <div className="flex items-center gap-3">
                        <Undo2 className="w-6 h-6 text-white" />
                        <h2 className="text-xl font-semibold text-white">Registrar Devolución</h2>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-lg">
                        <X className="w-5 h-5 text-white" />
                    </button>
                </div>

                <div className="p-6 space-y-4">
                    {/* Información del gasto original (solo lectura) */}
                    <div className="bg-gray-50 rounded-lg p-4 border">
                        <h3 className="text-sm font-semibold text-gray-600 mb-3 uppercase">
                            Gasto Original
                        </h3>
                        <div className="space-y-2">
                            <div className="flex justify-between">
                                <span className="text-gray-600">Concepto:</span>
                                <span className="font-medium">{gastoOriginal.concepto}</span>
                            </div>
                            {gastoOriginal.categoria && (
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Categoría:</span>
                                    <span className="font-medium">{gastoOriginal.categoria.nombre}</span>
                                </div>
                            )}
                            <div className="border-t pt-2 mt-2">
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-500">Subtotal original:</span>
                                    <span>{formatCurrency(gastoOriginal.subtotal || 0)}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-500">IVA original:</span>
                                    <span>{formatCurrency(gastoOriginal.iva || 0)}</span>
                                </div>
                                <div className="flex justify-between font-bold mt-1 pt-1 border-t">
                                    <span>Total original:</span>
                                    <span className="text-gray-800">{formatCurrency(gastoOriginal.total || 0)}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Valores de la devolución */}
                    <div className="bg-red-50 rounded-lg p-4 border-2 border-red-200">
                        <h3 className="text-sm font-semibold text-red-700 mb-3 uppercase flex items-center gap-2">
                            <DollarSign className="w-4 h-4" />
                            Devolución (negativo)
                        </h3>
                        <div className="space-y-1">
                            <div className="flex justify-between text-sm">
                                <span className="text-red-600">Subtotal:</span>
                                <span className="text-red-700 font-mono">{formatCurrency(subtotalDevolucion)}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-red-600">IVA:</span>
                                <span className="text-red-700 font-mono">{formatCurrency(ivaDevolucion)}</span>
                            </div>
                            <div className="flex justify-between font-bold text-lg pt-2 border-t border-red-200">
                                <span className="text-red-700">Total devolución:</span>
                                <span className="text-red-700 font-mono">{formatCurrency(totalDevolucion)}</span>
                            </div>
                        </div>
                    </div>

                    {/* Nota de devolución (EDITABLE) */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Nota de devolución *
                        </label>
                        <textarea
                            value={nota}
                            onChange={(e) => setNota(e.target.value)}
                            placeholder="Explique el motivo de la devolución..."
                            rows={3}
                            className="w-full px-4 py-3 border-2 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                            required
                        />
                    </div>

                    {/* Comprobante (EDITABLE) */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Comprobante de devolución
                        </label>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*,.pdf"
                            onChange={handleFileSelect}
                            className="hidden"
                        />

                        {!comprobanteUrl ? (
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                disabled={uploading}
                                className="w-full flex items-center justify-center gap-2 p-4 border-2 border-dashed border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                            >
                                {uploading ? (
                                    <Loader2 className="w-5 h-5 animate-spin text-gray-500" />
                                ) : (
                                    <Upload className="w-5 h-5 text-gray-500" />
                                )}
                                <span className="text-gray-600">
                                    {uploading ? 'Subiendo...' : 'Adjuntar comprobante (imagen o PDF)'}
                                </span>
                            </button>
                        ) : (
                            <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                                <FileText className="w-5 h-5 text-green-600" />
                                <span className="text-green-700 flex-1 truncate">{comprobanteNombre}</span>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setComprobanteUrl(null);
                                        setComprobanteNombre(null);
                                    }}
                                    className="text-red-500 hover:text-red-700 text-sm"
                                >
                                    Quitar
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="flex justify-end gap-3 px-6 py-4 bg-gray-50 border-t">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 text-gray-600 hover:text-gray-800"
                    >
                        Cancelar
                    </button>
                    <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={saving || !nota.trim()}
                        className="flex items-center gap-2 px-6 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg disabled:opacity-50"
                    >
                        {saving ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <Save className="w-4 h-4" />
                        )}
                        Registrar Devolución
                    </button>
                </div>
            </div>
        </div>
    );
};

export default RefundModal;
