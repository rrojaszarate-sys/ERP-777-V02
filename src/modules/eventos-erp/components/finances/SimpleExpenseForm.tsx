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
  DollarSign, Calendar, Building2, Tag, ChevronDown, ChevronUp
} from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../../../../core/config/supabase';
import { useAuth } from '../../../../core/auth/AuthProvider';
import { useTheme } from '../../../../shared/components/theme';
import { useExpenseCategories } from '../../hooks/useFinances';
import { parseCFDIXml } from '../../utils/cfdiXmlParser';
import { processFileWithOCR } from '../../../ocr/services/dualOCRService';

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
}

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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const xmlInputRef = useRef<HTMLInputElement>(null);

  const [saving, setSaving] = useState(false);
  const [processingOCR, setProcessingOCR] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [archivoAdjunto, setArchivoAdjunto] = useState<string | null>(item?.archivo_adjunto || null);
  const [archivoNombre, setArchivoNombre] = useState<string | null>(item?.archivo_nombre || null);

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

  // Procesar archivo con OCR
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar tipo
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (!validTypes.includes(file.type)) {
      toast.error('Solo se permiten imágenes (JPG, PNG, WEBP) o PDF');
      return;
    }

    setProcessingOCR(true);
    toast.loading('Procesando comprobante con OCR...', { id: 'ocr' });

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
        // Aplicar datos del OCR
        setFormData(prev => ({
          ...prev,
          concepto: ocrResult.concepto_sugerido || prev.concepto,
          proveedor: ocrResult.establecimiento || prev.proveedor,
          rfc_proveedor: ocrResult.rfc || prev.rfc_proveedor,
          fecha: ocrResult.fecha || prev.fecha,
          subtotal: ocrResult.subtotal || prev.subtotal,
          iva: ocrResult.iva || prev.iva,
          total: ocrResult.total || prev.total,
          uuid_cfdi: ocrResult.uuid_cfdi || prev.uuid_cfdi,
          folio_fiscal: ocrResult.folio_fiscal || prev.folio_fiscal,
        }));

        toast.success('Datos extraídos del comprobante', { id: 'ocr' });
      } else {
        toast.success('Archivo subido (sin datos OCR)', { id: 'ocr' });
      }
    } catch (error: any) {
      console.error('Error procesando archivo:', error);
      toast.error('Error al procesar archivo', { id: 'ocr' });
    } finally {
      setProcessingOCR(false);
    }
  };

  // Procesar XML CFDI
  const handleXMLUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.xml')) {
      toast.error('Solo se permiten archivos XML');
      return;
    }

    try {
      const text = await file.text();
      const cfdiData = parseCFDIXml(text);

      if (cfdiData) {
        setFormData(prev => ({
          ...prev,
          concepto: cfdiData.concepto || prev.concepto,
          proveedor: cfdiData.emisor?.nombre || prev.proveedor,
          rfc_proveedor: cfdiData.emisor?.rfc || prev.rfc_proveedor,
          fecha: cfdiData.fecha?.split('T')[0] || prev.fecha,
          subtotal: cfdiData.subtotal || prev.subtotal,
          iva: cfdiData.iva || prev.iva,
          total: cfdiData.total || prev.total,
          uuid_cfdi: cfdiData.uuid || prev.uuid_cfdi,
          folio_fiscal: cfdiData.folio || prev.folio_fiscal,
        }));

        toast.success('Datos extraídos del XML CFDI');
        setShowAdvanced(true); // Mostrar campos avanzados con UUID
      }
    } catch (error) {
      console.error('Error procesando XML:', error);
      toast.error('Error al leer XML');
    }
  };

  // Guardar
  const handleSubmit = async () => {
    // Validaciones
    if (!formData.concepto.trim()) {
      toast.error('El concepto es obligatorio');
      return;
    }
    if (formData.total <= 0) {
      toast.error('El total debe ser mayor a 0');
      return;
    }

    setSaving(true);

    try {
      const table = mode === 'gasto' ? 'evt_gastos_erp' : 'evt_provisiones_erp';
      const fechaField = mode === 'gasto' ? 'fecha_gasto' : 'fecha_estimada';

      const dataToSave: any = {
        evento_id: eventoId,
        company_id: user?.company_id,
        concepto: formData.concepto,
        descripcion: formData.descripcion,
        proveedor: formData.proveedor,
        rfc_proveedor: formData.rfc_proveedor,
        [fechaField]: formData.fecha,
        categoria_id: formData.categoria_id,
        subtotal: formData.subtotal,
        iva: formData.iva,
        total: formData.total,
        notas: formData.notas,
      };

      // Campos de fecha según tabla (gastos usa fecha_actualizacion, provisiones usa updated_at)
      if (mode === 'gasto') {
        dataToSave.fecha_actualizacion = new Date().toISOString();
      } else {
        dataToSave.updated_at = new Date().toISOString();
      }

      // Campos específicos según modo
      if (mode === 'gasto') {
        dataToSave.forma_pago = formData.forma_pago;
        dataToSave.status_aprobacion = formData.estado;
        dataToSave.archivo_adjunto = archivoAdjunto;
        dataToSave.archivo_nombre = archivoNombre;
        dataToSave.uuid_cfdi = formData.uuid_cfdi || null;
        dataToSave.folio_fiscal = formData.folio_fiscal || null;
      } else {
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
          {/* Zona de carga de archivos */}
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={processingOCR}
              className="flex items-center justify-center gap-2 p-4 border-2 border-dashed rounded-lg hover:bg-gray-50 transition-colors"
              style={{ borderColor: themeColors.accent }}
            >
              {processingOCR ? (
                <Loader2 className="w-6 h-6 animate-spin" style={{ color: themeColors.accent }} />
              ) : (
                <Camera className="w-6 h-6" style={{ color: themeColors.accent }} />
              )}
              <span className="font-medium" style={{ color: themeColors.accent }}>
                {processingOCR ? 'Procesando...' : 'Escanear Comprobante'}
              </span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,application/pdf"
              onChange={handleFileUpload}
              className="hidden"
            />

            <button
              type="button"
              onClick={() => xmlInputRef.current?.click()}
              className="flex items-center justify-center gap-2 p-4 border-2 border-dashed rounded-lg hover:bg-gray-50 transition-colors"
              style={{ borderColor: themeColors.border }}
            >
              <FileText className="w-6 h-6 text-blue-600" />
              <span className="font-medium text-blue-600">Cargar XML CFDI</span>
            </button>
            <input
              ref={xmlInputRef}
              type="file"
              accept=".xml"
              onChange={handleXMLUpload}
              className="hidden"
            />
          </div>

          {/* Archivo adjunto */}
          {archivoAdjunto && (
            <div className="flex items-center gap-2 p-2 bg-green-50 rounded-lg">
              <FileText className="w-4 h-4 text-green-600" />
              <span className="text-sm text-green-700 truncate flex-1">{archivoNombre}</span>
              <a href={archivoAdjunto} target="_blank" className="text-sm text-blue-600 hover:underline">
                Ver
              </a>
            </div>
          )}

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
