/**
 * MODAL: FORMULARIO DE PROVISIÓN PARA EVENTOS
 * - Similar a GastoFormModal pero para provisiones (gastos estimados)
 * - Campos: proveedor, concepto, categoría, montos, estado, fecha estimada
 * - Validación fiscal: Total = Subtotal + IVA - Retenciones
 */

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { X, Search, Plus, Loader2, Save, Pencil, DollarSign, Calculator, Calendar } from 'lucide-react';
import { useAuth } from '../../../core/auth/AuthProvider';
import { supabase } from '../../../core/config/supabase';
import { useTheme } from '../../../shared/components/theme';
import {
  getCategoriasGasto,
  getProveedores,
  createProveedor,
  getFormasPago,
  getEjecutivos
} from '../../contabilidad-erp/services/catalogosCentralizadosService';
import toast from 'react-hot-toast';

// IVA desde variable de entorno (default 16%)
const IVA_PORCENTAJE = parseFloat(import.meta.env.VITE_IVA_PORCENTAJE || '16');
const IVA_RATE = IVA_PORCENTAJE / 100;

interface ProvisionFormData {
  evento_id: number;
  proveedor_id: number | null;
  concepto: string;
  descripcion: string;
  categoria_id: number | null;
  subtotal: number;
  iva_porcentaje: number;
  iva: number;
  retenciones: number;
  total: number;
  forma_pago_id: number | null;
  ejecutivo_id: number | null;
  estado: string;
  fecha_estimada: string;
  notas: string;
}

interface Props {
  provision: any | null;
  eventoId: number;
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

  const formatCurrency = (num: number): string => {
    if (num === 0 || isNaN(num)) return '';
    return num.toLocaleString('es-MX', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  const parseValue = (str: string): number => {
    const cleaned = str.replace(/[^0-9.]/g, '');
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? 0 : parsed;
  };

  useEffect(() => {
    if (value === 0) {
      setDisplayValue('');
    } else {
      setDisplayValue(formatCurrency(value));
    }
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
    if (numValue > 0) {
      setDisplayValue(formatCurrency(numValue));
    } else {
      setDisplayValue('');
    }
  };

  const handleFocus = () => {
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

export const ProvisionFormModal = ({
  provision,
  eventoId,
  onClose,
  onSave
}: Props) => {
  const { user } = useAuth();
  const companyId = user?.company_id;
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  // Hook de tema para colores dinámicos
  const { paletteConfig, isDark } = useTheme();

  // Catálogos
  const [categorias, setCategorias] = useState<any[]>([]);
  const [proveedores, setProveedores] = useState<any[]>([]);
  const [formasPago, setFormasPago] = useState<any[]>([]);
  const [ejecutivos, setEjecutivos] = useState<any[]>([]);

  // Autocomplete proveedor
  const [proveedorSearch, setProveedorSearch] = useState('');
  const [showProveedorDropdown, setShowProveedorDropdown] = useState(false);
  const proveedorInputRef = useRef<HTMLInputElement>(null);

  // Modal nuevo proveedor
  const [showNuevoProveedor, setShowNuevoProveedor] = useState(false);
  const [nuevoProveedorData, setNuevoProveedorData] = useState({
    razon_social: '',
    rfc: ''
  });

  // Form data
  const [formData, setFormData] = useState<ProvisionFormData>({
    evento_id: eventoId,
    proveedor_id: null,
    concepto: '',
    descripcion: '',
    categoria_id: null,
    subtotal: 0,
    iva_porcentaje: IVA_PORCENTAJE,
    iva: 0,
    retenciones: 0,
    total: 0,
    forma_pago_id: null,
    ejecutivo_id: null,
    estado: 'pendiente',
    fecha_estimada: new Date().toISOString().split('T')[0],
    notas: ''
  });

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

  // Cargar catálogos
  useEffect(() => {
    async function loadCatalogos() {
      if (!companyId) return;
      try {
        const [cats, provs, fps, ejecs] = await Promise.all([
          getCategoriasGasto(companyId),
          getProveedores(companyId),
          getFormasPago(companyId),
          getEjecutivos(companyId)
        ]);
        setCategorias(cats);
        setProveedores(provs);
        setFormasPago(fps);
        setEjecutivos(ejecs);
      } catch (error) {
        console.error('Error loading catalogs:', error);
        toast.error('Error cargando catálogos');
      } finally {
        setLoading(false);
      }
    }
    loadCatalogos();
  }, [companyId]);

  // Inicializar con datos de la provisión a editar
  useEffect(() => {
    if (provision) {
      setFormData({
        evento_id: eventoId,
        proveedor_id: provision.proveedor_id,
        concepto: provision.concepto || '',
        descripcion: provision.descripcion || '',
        categoria_id: provision.categoria_id,
        subtotal: provision.subtotal || 0,
        iva_porcentaje: provision.iva_porcentaje || IVA_PORCENTAJE,
        iva: provision.iva || 0,
        retenciones: provision.retenciones || 0,
        total: provision.total || 0,
        forma_pago_id: provision.forma_pago_id,
        ejecutivo_id: provision.ejecutivo_id,
        estado: provision.estado || 'pendiente',
        fecha_estimada: provision.fecha_estimada?.split('T')[0] || new Date().toISOString().split('T')[0],
        notas: provision.notas || ''
      });

      if (provision.proveedor?.razon_social) {
        setProveedorSearch(provision.proveedor.razon_social);
      }
    }
  }, [provision, eventoId]);

  // Proveedores filtrados
  const proveedoresFiltrados = useMemo(() => {
    if (proveedorSearch.length < 2) return [];
    const searchLower = proveedorSearch.toLowerCase();
    return proveedores
      .filter(p =>
        (p.razon_social || p.nombre || '').toLowerCase().includes(searchLower) ||
        (p.rfc && p.rfc.toLowerCase().includes(searchLower))
      )
      .slice(0, 10);
  }, [proveedorSearch, proveedores]);

  // Validar cuadre cada vez que cambien los montos
  useEffect(() => {
    const calculado = Math.round((formData.subtotal + formData.iva - formData.retenciones) * 100) / 100;
    const diferencia = Math.abs(calculado - formData.total);

    if (formData.total > 0 && diferencia > 0.01) {
      setErrorCuadre(`No cuadra: Subtotal ($${formData.subtotal.toFixed(2)}) + IVA ($${formData.iva.toFixed(2)}) - Retenciones ($${formData.retenciones.toFixed(2)}) = $${calculado.toFixed(2)}, pero el Total es $${formData.total.toFixed(2)}`);
    } else {
      setErrorCuadre(null);
    }
  }, [formData.subtotal, formData.iva, formData.total, formData.retenciones]);

  // Handlers de montos
  const handleSubtotalChange = useCallback((newSubtotal: number) => {
    setFormData(prev => ({ ...prev, subtotal: newSubtotal }));
  }, []);

  const handleIvaChange = useCallback((newIva: number) => {
    setFormData(prev => ({ ...prev, iva: newIva }));
  }, []);

  const handleTotalChange = useCallback((newTotal: number) => {
    setFormData(prev => ({ ...prev, total: newTotal }));
  }, []);

  const handleRetencionesChange = useCallback((newRetenciones: number) => {
    setFormData(prev => ({ ...prev, retenciones: newRetenciones }));
  }, []);

  // Calcular IVA desde el subtotal
  const calcularIvaDesdeSubtotal = useCallback(() => {
    if (formData.subtotal > 0) {
      const nuevoIva = Math.round(formData.subtotal * IVA_RATE * 100) / 100;
      const nuevoTotal = Math.round((formData.subtotal + nuevoIva - formData.retenciones) * 100) / 100;
      setFormData(prev => ({
        ...prev,
        iva: nuevoIva,
        total: nuevoTotal
      }));
      toast.success(`IVA calculado: $${nuevoIva.toFixed(2)} (${IVA_PORCENTAJE}%)`);
    } else {
      toast.error('Ingresa primero el subtotal');
    }
  }, [formData.subtotal, formData.retenciones]);

  // Calcular Total desde los componentes
  const calcularTotalDesdeComponentes = useCallback(() => {
    const nuevoTotal = Math.round((formData.subtotal + formData.iva - formData.retenciones) * 100) / 100;
    setFormData(prev => ({ ...prev, total: nuevoTotal }));
    toast.success(`Total calculado: $${nuevoTotal.toFixed(2)}`);
  }, [formData.subtotal, formData.iva, formData.retenciones]);

  // Calcular Subtotal desde Total (inverso)
  const calcularSubtotalDesdeTotal = useCallback(() => {
    if (formData.total > 0) {
      const nuevoSubtotal = Math.round((formData.total - formData.iva + formData.retenciones) * 100) / 100;
      setFormData(prev => ({ ...prev, subtotal: nuevoSubtotal }));
      toast.success(`Subtotal calculado: $${nuevoSubtotal.toFixed(2)}`);
    } else {
      toast.error('Ingresa primero el total');
    }
  }, [formData.total, formData.iva, formData.retenciones]);

  const handleSelectProveedor = (proveedor: any) => {
    setFormData(prev => ({ ...prev, proveedor_id: proveedor.id }));
    setProveedorSearch(proveedor.razon_social || proveedor.nombre);
    setShowProveedorDropdown(false);
  };

  const handleCrearNuevoProveedor = async () => {
    if (!companyId || !nuevoProveedorData.razon_social) return;

    try {
      const nuevo = await createProveedor(companyId, {
        razon_social: nuevoProveedorData.razon_social,
        rfc: nuevoProveedorData.rfc,
        nombre: nuevoProveedorData.razon_social,
        nombre_comercial: '',
        direccion: '',
        telefono: '',
        email: '',
        contacto_nombre: '',
        modulo_origen: 'eventos'
      });

      setProveedores([...proveedores, nuevo]);
      handleSelectProveedor(nuevo);
      setShowNuevoProveedor(false);
      setNuevoProveedorData({ razon_social: '', rfc: '' });
      toast.success('Proveedor creado');
    } catch (error) {
      toast.error('Error al crear proveedor');
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
    if (!formData.categoria_id) {
      toast.error('Selecciona una categoría');
      return;
    }
    if (formData.total <= 0) {
      toast.error('El total debe ser mayor a 0');
      return;
    }

    // Validación de cuadre fiscal
    const totalCalculado = Math.round((formData.subtotal + formData.iva - formData.retenciones) * 100) / 100;
    const diferencia = Math.abs(totalCalculado - formData.total);
    if (diferencia > 0.01) {
      toast.error(`Los montos no cuadran. Subtotal + IVA - Retenciones debe ser igual al Total. Diferencia: $${diferencia.toFixed(2)}`);
      return;
    }

    setSaving(true);
    try {
      const dataToSave = {
        ...formData,
        company_id: companyId,
        created_by: user?.id,
        updated_at: new Date().toISOString()
      };

      if (provision?.id) {
        // Actualizar
        const { error } = await supabase
          .from('evt_provisiones_erp')
          .update(dataToSave)
          .eq('id', provision.id);

        if (error) throw error;
        toast.success('Provisión actualizada');
      } else {
        // Crear
        const { error } = await supabase
          .from('evt_provisiones_erp')
          .insert({
            ...dataToSave,
            created_at: new Date().toISOString()
          });

        if (error) throw error;
        toast.success('Provisión creada');
      }
      onSave();
    } catch (error: any) {
      console.error('Error guardando provisión:', error);
      toast.error('Error al guardar: ' + (error.message || 'Error desconocido'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl p-8 flex items-center gap-4">
          <Loader2 className="w-6 h-6 animate-spin text-amber-600" />
          <span>Cargando catálogos...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div
        className="rounded-xl shadow-2xl w-[50vw] min-w-[600px] max-w-[900px] min-h-[45vh] max-h-[85vh] overflow-hidden flex flex-col"
        style={{ backgroundColor: themeColors.bg }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4 border-b"
          style={{
            background: `linear-gradient(135deg, #F59E0B 0%, #D97706 100%)`,
            borderColor: themeColors.border
          }}
        >
          <div className="flex items-center gap-3">
            {provision ? (
              <Pencil className="w-6 h-6 text-white" />
            ) : (
              <Plus className="w-6 h-6 text-white" />
            )}
            <h2 className="text-xl font-semibold text-white">
              {provision ? 'Editar Provisión' : 'Nueva Provisión'}
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleSubmit()}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors text-white font-medium"
              title="Guardar provisión"
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
          {/* Sección: Proveedor */}
          <div className="mb-4">
            <h3 className="text-sm font-semibold uppercase tracking-wide mb-3 text-amber-600">
              Proveedor
            </h3>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-600" />
              <input
                ref={proveedorInputRef}
                type="text"
                value={proveedorSearch}
                onChange={(e) => {
                  setProveedorSearch(e.target.value);
                  setFormData(prev => ({ ...prev, proveedor_id: null }));
                  setShowProveedorDropdown(true);
                }}
                onFocus={() => proveedorSearch.length >= 2 && setShowProveedorDropdown(true)}
                placeholder="Buscar proveedor por nombre o RFC..."
                className="w-full pl-10 pr-4 py-3 border-2 rounded-lg text-lg transition-all focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
                style={{
                  borderColor: themeColors.border,
                  backgroundColor: themeColors.bg,
                  color: themeColors.text
                }}
              />
              {formData.proveedor_id && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-medium px-2 py-1 rounded bg-amber-100 text-amber-700">
                  Seleccionado
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
                        className="w-full px-4 py-3 text-left flex justify-between items-center border-b last:border-0 transition-colors hover:bg-amber-50"
                        style={{
                          borderColor: themeColors.border,
                          color: themeColors.text
                        }}
                      >
                        <span className="font-medium">{p.razon_social || p.nombre}</span>
                        <span className="text-gray-500">{p.rfc || ''}</span>
                      </button>
                    ))
                  ) : proveedorSearch.length >= 2 ? (
                    <div className="px-4 py-4 text-center text-gray-500">
                      <p className="mb-3">No se encontraron proveedores</p>
                      <button
                        type="button"
                        onClick={() => {
                          setShowNuevoProveedor(true);
                          setNuevoProveedorData({ razon_social: proveedorSearch, rfc: '' });
                          setShowProveedorDropdown(false);
                        }}
                        className="flex items-center justify-center gap-2 font-medium text-amber-600"
                      >
                        <Plus className="w-4 h-4" />
                        Crear "{proveedorSearch}"
                      </button>
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          </div>

          {/* Sección: Categoría y Estado */}
          <div className="mb-4">
            <h3 className="text-sm font-semibold uppercase tracking-wide mb-3 text-amber-600">
              Clasificación
            </h3>
            <div className="grid grid-cols-2 gap-4">
              {/* Selector de Categoría */}
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: themeColors.text }}>
                  Categoría *
                </label>
                <select
                  value={formData.categoria_id || ''}
                  onChange={(e) => setFormData({ ...formData, categoria_id: e.target.value ? parseInt(e.target.value) : null })}
                  className="w-full px-4 py-3 border-2 rounded-lg focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
                  style={{
                    borderColor: themeColors.border,
                    backgroundColor: themeColors.bg,
                    color: themeColors.text
                  }}
                >
                  <option value="">Seleccionar categoría...</option>
                  {categorias.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.nombre}</option>
                  ))}
                </select>
              </div>

              {/* Estado */}
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: themeColors.text }}>
                  Estado
                </label>
                <select
                  value={formData.estado}
                  onChange={(e) => setFormData({ ...formData, estado: e.target.value })}
                  className="w-full px-4 py-3 border-2 rounded-lg focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
                  style={{
                    borderColor: themeColors.border,
                    backgroundColor: themeColors.bg,
                    color: themeColors.text
                  }}
                >
                  <option value="pendiente">Pendiente</option>
                  <option value="aprobado">Aprobado</option>
                  <option value="pagado">Pagado</option>
                  <option value="cancelado">Cancelado</option>
                </select>
              </div>
            </div>
          </div>

          {/* Sección: Concepto */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1" style={{ color: themeColors.text }}>
              Concepto *
            </label>
            <input
              type="text"
              value={formData.concepto}
              onChange={(e) => setFormData({ ...formData, concepto: e.target.value })}
              className="w-full px-4 py-3 border-2 rounded-lg focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
              placeholder="Descripción breve del gasto estimado"
              style={{
                borderColor: themeColors.border,
                backgroundColor: themeColors.bg,
                color: themeColors.text
              }}
            />
          </div>

          {/* Descripción (opcional) */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1" style={{ color: themeColors.text }}>
              Descripción (opcional)
            </label>
            <textarea
              value={formData.descripcion}
              onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
              rows={2}
              className="w-full px-4 py-3 border-2 rounded-lg resize-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
              placeholder="Detalles adicionales..."
              style={{
                borderColor: themeColors.border,
                backgroundColor: themeColors.bg,
                color: themeColors.text
              }}
            />
          </div>

          {/* Sección: Montos */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-amber-600">
                Montos
              </h3>
              {formData.total > 0 && (
                <div
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium ${errorCuadre ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}
                >
                  {errorCuadre ? (
                    <><span>No cuadra</span></>
                  ) : (
                    <><span>Cuadre OK</span></>
                  )}
                </div>
              )}
            </div>

            {/* Fórmula visual */}
            <div className="mb-3 p-2 rounded-lg text-xs text-center bg-amber-50 text-amber-700">
              <strong>Fórmula:</strong> Total = Subtotal + IVA - Retenciones
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
                  style={{
                    borderColor: themeColors.border,
                    backgroundColor: themeColors.bg,
                    color: themeColors.text
                  }}
                />
              </div>

              {/* IVA */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-sm font-medium" style={{ color: themeColors.text }}>
                    IVA
                  </label>
                  <button
                    type="button"
                    onClick={calcularIvaDesdeSubtotal}
                    className="flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-700 hover:bg-amber-200"
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
                  value={formData.retenciones}
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
                    className="flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-700 hover:bg-amber-200"
                    title="Calcular Total"
                  >
                    <Calculator className="w-3 h-3" />
                    Calc
                  </button>
                </div>
                <CurrencyInput
                  value={formData.total}
                  onChange={handleTotalChange}
                  themeColors={themeColors}
                  className="font-bold"
                  style={{
                    borderColor: errorCuadre ? '#DC2626' : '#059669',
                    backgroundColor: errorCuadre ? '#FEF2F2' : '#F0FDF4',
                    color: errorCuadre ? '#DC2626' : '#059669'
                  }}
                />
              </div>

              {/* Fecha Estimada */}
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: themeColors.text }}>
                  Fecha Est. *
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="date"
                    value={formData.fecha_estimada}
                    onChange={(e) => setFormData({ ...formData, fecha_estimada: e.target.value })}
                    className="w-full pl-9 pr-2 py-3 border-2 rounded-lg"
                    style={{
                      borderColor: themeColors.border,
                      backgroundColor: themeColors.bg,
                      color: themeColors.text
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Mensaje de error de cuadre */}
            {errorCuadre && (
              <div className="mt-2 p-2 rounded-lg text-sm bg-red-100 text-red-600">
                {errorCuadre}
              </div>
            )}
          </div>

          {/* Sección: Detalles */}
          <div className="mb-4">
            <h3 className="text-sm font-semibold uppercase tracking-wide mb-3 text-amber-600">
              Detalles
            </h3>
            <div className="grid grid-cols-2 gap-4">
              {/* Forma de pago */}
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: themeColors.text }}>
                  Forma de Pago
                </label>
                <select
                  value={formData.forma_pago_id || ''}
                  onChange={(e) => setFormData({ ...formData, forma_pago_id: e.target.value ? parseInt(e.target.value) : null })}
                  className="w-full px-4 py-2.5 border-2 rounded-lg focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
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
                  className="w-full px-4 py-2.5 border-2 rounded-lg focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
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
              className="w-full px-4 py-2.5 border-2 rounded-lg resize-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
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
          <div className="text-sm text-gray-500">
            IVA configurado: {IVA_PORCENTAJE}%
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2.5 border-2 rounded-lg font-medium transition-colors hover:bg-gray-100"
              style={{
                borderColor: themeColors.border,
                color: themeColors.text
              }}
            >
              Cancelar
            </button>
            <button
              onClick={() => handleSubmit()}
              disabled={saving}
              className="px-8 py-2.5 rounded-lg font-medium flex items-center gap-2 transition-colors text-white disabled:opacity-50 bg-amber-500 hover:bg-amber-600"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Guardando...
                </>
              ) : provision ? (
                <>
                  <Save className="w-4 h-4" />
                  Actualizar
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Crear Provisión
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
                  className="px-4 py-2 rounded-lg text-white transition-colors bg-amber-500 hover:bg-amber-600"
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
