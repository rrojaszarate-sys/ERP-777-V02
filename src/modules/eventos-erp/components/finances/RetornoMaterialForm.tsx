/**
 * FORMULARIO DE RETORNO DE MATERIAL
 *
 * Permite registrar devoluciones de material no utilizado
 * integrado con el catálogo de productos del almacén.
 *
 * Características:
 * - Selector de productos del catálogo con búsqueda
 * - Costo automático desde el catálogo
 * - Opción de agregar nuevo producto al catálogo
 * - Cálculo automático de IVA y total
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  X, Save, Loader2, Search, Plus, Package, Calculator,
  DollarSign, Calendar, Tag, ArrowDownLeft, Check
} from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../../../../core/config/supabase';
import { useAuth } from '../../../../core/auth/AuthProvider';
import { useTheme } from '../../../../shared/components/theme';

// IVA desde variable de entorno
const IVA_PORCENTAJE = parseFloat(import.meta.env.VITE_IVA_PORCENTAJE || '16');
const IVA_RATE = IVA_PORCENTAJE / 100;

// ID de categoría Materiales
const CATEGORIA_MATERIALES_ID = 8;

interface RetornoMaterialFormProps {
  eventoId: number;
  item?: any; // Retorno existente para editar
  onSave: () => void;
  onClose: () => void;
}

interface Producto {
  id: number;
  clave: string;
  nombre: string;
  categoria: string;
  costo: number;
  unidad: string;
}

interface LineaRetorno {
  producto_id: number | null;
  producto_nombre: string;
  producto_clave: string;
  cantidad: number;
  costo_unitario: number;
  unidad: string;
  subtotal: number;
}

export const RetornoMaterialForm: React.FC<RetornoMaterialFormProps> = ({
  eventoId,
  item,
  onSave,
  onClose
}) => {
  const { user } = useAuth();
  const { paletteConfig, isDark } = useTheme();

  const [saving, setSaving] = useState(false);
  const [loadingProductos, setLoadingProductos] = useState(true);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showProductoDropdown, setShowProductoDropdown] = useState(false);
  const [showNuevoProducto, setShowNuevoProducto] = useState(false);

  // Datos del formulario
  const [concepto, setConcepto] = useState(item?.concepto || '');
  const [fecha, setFecha] = useState(item?.fecha_gasto || new Date().toISOString().split('T')[0]);
  const [notas, setNotas] = useState(item?.notas || '');
  const [lineas, setLineas] = useState<LineaRetorno[]>([]);

  // Nuevo producto
  const [nuevoProducto, setNuevoProducto] = useState({
    clave: '',
    nombre: '',
    categoria: 'Materiales',
    costo: 0,
    unidad: 'PZA'
  });

  // Colores del tema
  const themeColors = useMemo(() => ({
    primary: paletteConfig.primary,
    secondary: paletteConfig.secondary,
    bg: isDark ? '#1E293B' : '#FFFFFF',
    text: isDark ? '#F8FAFC' : '#1E293B',
    border: isDark ? '#334155' : '#E2E8F0',
  }), [paletteConfig, isDark]);

  // Cargar productos del catálogo
  useEffect(() => {
    const fetchProductos = async () => {
      setLoadingProductos(true);
      try {
        const { data, error } = await supabase
          .from('productos_erp')
          .select('id, clave, nombre, categoria, costo, unidad')
          .eq('activo', true)
          .order('nombre');

        if (error) throw error;
        setProductos(data || []);
      } catch (error) {
        console.error('Error cargando productos:', error);
        toast.error('Error al cargar catálogo de productos');
      } finally {
        setLoadingProductos(false);
      }
    };

    fetchProductos();
  }, []);

  // Cargar líneas si es edición
  useEffect(() => {
    if (item?.detalle_retorno) {
      try {
        const detalle = typeof item.detalle_retorno === 'string'
          ? JSON.parse(item.detalle_retorno)
          : item.detalle_retorno;
        setLineas(detalle);
      } catch {
        // Si no hay detalle, crear línea vacía
        setLineas([{
          producto_id: null,
          producto_nombre: item.concepto || '',
          producto_clave: '',
          cantidad: 1,
          costo_unitario: item.subtotal || item.total || 0,
          unidad: 'PZA',
          subtotal: item.subtotal || item.total || 0
        }]);
      }
    }
  }, [item]);

  // Filtrar productos por búsqueda
  const productosFiltrados = useMemo(() => {
    if (!searchTerm) return productos.slice(0, 50);
    const term = searchTerm.toLowerCase();
    return productos.filter(p =>
      p.nombre.toLowerCase().includes(term) ||
      p.clave.toLowerCase().includes(term) ||
      p.categoria?.toLowerCase().includes(term)
    ).slice(0, 50);
  }, [productos, searchTerm]);

  // Agregar línea de producto
  const agregarLinea = useCallback((producto: Producto) => {
    setLineas(prev => [...prev, {
      producto_id: producto.id,
      producto_nombre: producto.nombre,
      producto_clave: producto.clave,
      cantidad: 1,
      costo_unitario: producto.costo || 0,
      unidad: producto.unidad || 'PZA',
      subtotal: producto.costo || 0
    }]);
    setSearchTerm('');
    setShowProductoDropdown(false);
    toast.success(`${producto.nombre} agregado`);
  }, []);

  // Actualizar línea
  const actualizarLinea = useCallback((index: number, campo: keyof LineaRetorno, valor: any) => {
    setLineas(prev => {
      const nuevas = [...prev];
      nuevas[index] = { ...nuevas[index], [campo]: valor };

      // Recalcular subtotal si cambia cantidad o costo
      if (campo === 'cantidad' || campo === 'costo_unitario') {
        nuevas[index].subtotal = nuevas[index].cantidad * nuevas[index].costo_unitario;
      }

      return nuevas;
    });
  }, []);

  // Eliminar línea
  const eliminarLinea = useCallback((index: number) => {
    setLineas(prev => prev.filter((_, i) => i !== index));
  }, []);

  // Calcular totales
  const totales = useMemo(() => {
    const subtotal = lineas.reduce((sum, l) => sum + l.subtotal, 0);
    const iva = Math.round(subtotal * IVA_RATE * 100) / 100;
    const total = Math.round((subtotal + iva) * 100) / 100;
    return { subtotal, iva, total };
  }, [lineas]);

  // Crear nuevo producto en catálogo
  const crearNuevoProducto = async () => {
    if (!nuevoProducto.nombre || !nuevoProducto.clave) {
      toast.error('Nombre y clave son obligatorios');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('productos_erp')
        .insert({
          company_id: user?.company_id,
          clave: nuevoProducto.clave.toUpperCase(),
          nombre: nuevoProducto.nombre,
          categoria: nuevoProducto.categoria,
          costo: nuevoProducto.costo,
          unidad: nuevoProducto.unidad,
          activo: true,
          fecha_creacion: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      // Agregar a la lista local
      setProductos(prev => [...prev, data]);

      // Agregar como línea
      agregarLinea(data);

      // Limpiar y cerrar
      setNuevoProducto({ clave: '', nombre: '', categoria: 'Materiales', costo: 0, unidad: 'PZA' });
      setShowNuevoProducto(false);

      toast.success('Producto agregado al catálogo');
    } catch (error: any) {
      console.error('Error creando producto:', error);
      toast.error(`Error: ${error.message}`);
    }
  };

  // Guardar retorno
  const handleSubmit = async () => {
    if (lineas.length === 0) {
      toast.error('Agrega al menos un material');
      return;
    }

    if (totales.total <= 0) {
      toast.error('El total debe ser mayor a 0');
      return;
    }

    setSaving(true);

    try {
      // Generar concepto automático si está vacío
      const conceptoFinal = concepto.trim() ||
        `Retorno: ${lineas.map(l => l.producto_nombre).join(', ')}`.substring(0, 200);

      const dataToSave = {
        evento_id: eventoId,
        company_id: user?.company_id,
        concepto: conceptoFinal,
        descripcion: `Retorno de ${lineas.length} material(es)`,
        fecha_gasto: fecha,
        categoria_id: CATEGORIA_MATERIALES_ID,
        subtotal: totales.subtotal,
        iva: totales.iva,
        total: totales.total,
        tipo_movimiento: 'retorno',
        notas: notas,
        detalle_retorno: JSON.stringify(lineas),
        forma_pago: 'transferencia',
        status_aprobacion: 'aprobado',
        fecha_actualizacion: new Date().toISOString()
      };

      if (item?.id) {
        // Actualizar
        const { error } = await supabase
          .from('evt_gastos_erp')
          .update(dataToSave)
          .eq('id', item.id);

        if (error) throw error;
        toast.success('Retorno actualizado');
      } else {
        // Crear
        const { error } = await supabase
          .from('evt_gastos_erp')
          .insert({
            ...dataToSave,
            fecha_creacion: new Date().toISOString(),
            creado_por: user?.id
          });

        if (error) throw error;
        toast.success('Retorno de material registrado');
      }

      onSave();
    } catch (error: any) {
      console.error('Error guardando retorno:', error);
      toast.error(`Error: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div
        className="rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
        style={{ backgroundColor: themeColors.bg }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4"
          style={{ background: `linear-gradient(to right, ${themeColors.primary}, ${themeColors.secondary})` }}
        >
          <div className="flex items-center gap-3">
            <ArrowDownLeft className="w-6 h-6 text-white" />
            <h2 className="text-xl font-semibold text-white">
              {item ? 'Editar' : 'Nuevo'} Retorno de Material
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleSubmit}
              disabled={saving || lineas.length === 0}
              className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-white font-medium disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
              Guardar
            </button>
            <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-lg">
              <X className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Información básica */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: themeColors.text }}>
                <Calendar className="w-4 h-4 inline mr-1" />
                Fecha del Retorno
              </label>
              <input
                type="date"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                className="w-full px-4 py-2 border-2 rounded-lg"
                style={{ borderColor: themeColors.border, backgroundColor: themeColors.bg, color: themeColors.text }}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: themeColors.text }}>
                Concepto (opcional)
              </label>
              <input
                type="text"
                value={concepto}
                onChange={(e) => setConcepto(e.target.value)}
                placeholder="Se genera automáticamente..."
                className="w-full px-4 py-2 border-2 rounded-lg"
                style={{ borderColor: themeColors.border, backgroundColor: themeColors.bg, color: themeColors.text }}
              />
            </div>
          </div>

          {/* Buscador de productos */}
          <div className="relative">
            <label className="block text-sm font-medium mb-2" style={{ color: themeColors.text }}>
              <Package className="w-4 h-4 inline mr-1" />
              Agregar Material del Catálogo
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setShowProductoDropdown(true);
                  }}
                  onFocus={() => setShowProductoDropdown(true)}
                  placeholder="Buscar por nombre, clave o categoría..."
                  className="w-full pl-10 pr-4 py-3 border-2 rounded-lg"
                  style={{ borderColor: themeColors.border, backgroundColor: themeColors.bg, color: themeColors.text }}
                />

                {/* Dropdown de productos */}
                {showProductoDropdown && (
                  <div
                    className="absolute z-20 w-full mt-1 max-h-60 overflow-y-auto border-2 rounded-lg shadow-xl"
                    style={{ backgroundColor: themeColors.bg, borderColor: themeColors.border }}
                  >
                    {loadingProductos ? (
                      <div className="p-4 text-center text-gray-500">
                        <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                      </div>
                    ) : productosFiltrados.length === 0 ? (
                      <div className="p-4 text-center text-gray-500">
                        No se encontraron productos
                      </div>
                    ) : (
                      productosFiltrados.map(producto => (
                        <button
                          key={producto.id}
                          onClick={() => agregarLinea(producto)}
                          className="w-full px-4 py-3 flex items-center justify-between transition-colors text-left border-b last:border-b-0 hover:opacity-90"
                          style={{ borderColor: themeColors.border }}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = `${themeColors.primary}15`}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                        >
                          <div>
                            <span className="font-medium" style={{ color: themeColors.text }}>
                              {producto.nombre}
                            </span>
                            <div className="text-xs text-gray-500">
                              {producto.clave} • {producto.categoria} • {producto.unidad}
                            </div>
                          </div>
                          <span className="font-bold" style={{ color: themeColors.primary }}>
                            ${producto.costo.toLocaleString('es-MX')}
                          </span>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>

              <button
                onClick={() => {
                  setShowNuevoProducto(true);
                  setShowProductoDropdown(false);
                }}
                className="px-4 py-2 text-white rounded-lg flex items-center gap-2 whitespace-nowrap hover:opacity-90 transition-opacity"
                style={{ backgroundColor: themeColors.secondary }}
              >
                <Plus className="w-5 h-5" />
                Nuevo
              </button>
            </div>
          </div>

          {/* Modal para nuevo producto */}
          {showNuevoProducto && (
            <div
              className="p-4 border-2 rounded-lg space-y-3"
              style={{ borderColor: `${themeColors.secondary}60`, backgroundColor: `${themeColors.secondary}10` }}
            >
              <h4 className="font-semibold flex items-center gap-2" style={{ color: themeColors.secondary }}>
                <Plus className="w-4 h-4" />
                Agregar Nuevo Material al Catálogo
              </h4>
              <div className="grid grid-cols-3 gap-3">
                <input
                  type="text"
                  value={nuevoProducto.clave}
                  onChange={(e) => setNuevoProducto({ ...nuevoProducto, clave: e.target.value })}
                  placeholder="Clave (ej: MAT-001)"
                  className="px-3 py-2 border rounded-lg"
                />
                <input
                  type="text"
                  value={nuevoProducto.nombre}
                  onChange={(e) => setNuevoProducto({ ...nuevoProducto, nombre: e.target.value })}
                  placeholder="Nombre del material"
                  className="col-span-2 px-3 py-2 border rounded-lg"
                />
                <input
                  type="number"
                  value={nuevoProducto.costo || ''}
                  onChange={(e) => setNuevoProducto({ ...nuevoProducto, costo: parseFloat(e.target.value) || 0 })}
                  placeholder="Costo unitario"
                  className="px-3 py-2 border rounded-lg"
                />
                <select
                  value={nuevoProducto.unidad}
                  onChange={(e) => setNuevoProducto({ ...nuevoProducto, unidad: e.target.value })}
                  className="px-3 py-2 border rounded-lg"
                >
                  <option value="PZA">PZA (Pieza)</option>
                  <option value="MTS">MTS (Metros)</option>
                  <option value="KG">KG (Kilogramos)</option>
                  <option value="LT">LT (Litros)</option>
                  <option value="ROLLO">ROLLO</option>
                  <option value="SACO">SACO</option>
                  <option value="CUBO">CUBO</option>
                </select>
                <select
                  value={nuevoProducto.categoria}
                  onChange={(e) => setNuevoProducto({ ...nuevoProducto, categoria: e.target.value })}
                  className="px-3 py-2 border rounded-lg"
                >
                  <option value="Materiales">Materiales</option>
                  <option value="Material Eléctrico">Material Eléctrico</option>
                  <option value="Iluminación">Iluminación</option>
                  <option value="Ferretería">Ferretería</option>
                  <option value="Construcción">Construcción</option>
                  <option value="Otros">Otros</option>
                </select>
              </div>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setShowNuevoProducto(false)}
                  className="px-4 py-2 border rounded-lg hover:bg-gray-100"
                >
                  Cancelar
                </button>
                <button
                  onClick={crearNuevoProducto}
                  className="px-4 py-2 text-white rounded-lg flex items-center gap-2 hover:opacity-90 transition-opacity"
                  style={{ backgroundColor: themeColors.secondary }}
                >
                  <Check className="w-4 h-4" />
                  Crear y Agregar
                </button>
              </div>
            </div>
          )}

          {/* Tabla de líneas - COMPACTA (homogénea con MaterialAlmacenForm) */}
          {lineas.length > 0 && (
            <div className="border rounded-lg overflow-hidden" style={{ borderColor: themeColors.border }}>
              <table className="w-full text-sm">
                <thead style={{ backgroundColor: `${themeColors.secondary}15` }}>
                  <tr>
                    <th className="px-2 py-1.5 text-left text-xs font-semibold" style={{ color: themeColors.secondary }}>Material</th>
                    <th className="px-2 py-1.5 text-center text-xs font-semibold w-16" style={{ color: themeColors.secondary }}>Cant.</th>
                    <th className="px-2 py-1.5 text-center text-xs font-semibold w-14" style={{ color: themeColors.secondary }}>Unid.</th>
                    <th className="px-2 py-1.5 text-right text-xs font-semibold w-24" style={{ color: themeColors.secondary }}>$ Unit.</th>
                    <th className="px-2 py-1.5 text-right text-xs font-semibold w-24" style={{ color: themeColors.secondary }}>Subtotal</th>
                    <th className="px-1 py-1.5 w-8"></th>
                  </tr>
                </thead>
                <tbody>
                  {lineas.map((linea, index) => (
                    <tr key={index} className="border-t hover:bg-gray-50" style={{ borderColor: themeColors.border }}>
                      <td className="px-2 py-1">
                        <div className="flex items-center gap-1">
                          <Package className="w-3 h-3 text-emerald-500 flex-shrink-0" />
                          <span className="font-medium text-xs" style={{ color: themeColors.text }}>
                            {linea.producto_nombre}
                          </span>
                          {linea.producto_clave && (
                            <span className="text-[10px] text-gray-400">({linea.producto_clave})</span>
                          )}
                        </div>
                      </td>
                      <td className="px-2 py-1">
                        <input
                          type="number"
                          min="1"
                          value={linea.cantidad}
                          onChange={(e) => actualizarLinea(index, 'cantidad', parseInt(e.target.value) || 1)}
                          className="w-full px-1 py-0.5 border rounded text-center text-xs"
                        />
                      </td>
                      <td className="px-2 py-1 text-center text-xs text-gray-600">
                        {linea.unidad}
                      </td>
                      <td className="px-2 py-1">
                        <div className="relative">
                          <span className="absolute left-1 top-1/2 -translate-y-1/2 text-xs text-gray-400">$</span>
                          <input
                            type="number"
                            step="0.01"
                            value={linea.costo_unitario}
                            onChange={(e) => actualizarLinea(index, 'costo_unitario', parseFloat(e.target.value) || 0)}
                            className="w-full pl-3 pr-1 py-0.5 border rounded text-right text-xs"
                          />
                        </div>
                      </td>
                      <td className="px-2 py-1 text-right text-xs font-bold" style={{ color: themeColors.secondary }}>
                        ${linea.subtotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-1 py-1">
                        <button
                          onClick={() => eliminarLinea(index)}
                          className="p-0.5 hover:bg-red-100 rounded text-red-500"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Notas */}
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: themeColors.text }}>
              Notas (opcional)
            </label>
            <textarea
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              rows={2}
              placeholder="Observaciones del retorno..."
              className="w-full px-4 py-2 border-2 rounded-lg resize-none"
              style={{ borderColor: themeColors.border, backgroundColor: themeColors.bg, color: themeColors.text }}
            />
          </div>
        </div>

        {/* Footer con totales */}
        <div
          className="px-6 py-4 border-t"
          style={{ borderColor: themeColors.border, backgroundColor: `${themeColors.primary}10` }}
        >
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-600">
              {lineas.length} material(es) • Este monto se restará del total de gastos
            </div>
            <div className="flex items-center gap-6">
              <div className="text-right">
                <div className="text-sm text-gray-500">Subtotal</div>
                <div className="font-semibold">${totales.subtotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</div>
              </div>
              <div className="text-right">
                <div className="text-sm text-gray-500">IVA ({IVA_PORCENTAJE}%)</div>
                <div className="font-semibold">${totales.iva.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</div>
              </div>
              <div className="text-right">
                <div className="text-sm font-medium" style={{ color: themeColors.primary }}>Total Retorno</div>
                <div className="text-2xl font-bold" style={{ color: themeColors.primary }}>
                  ${totales.total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Click outside to close dropdown */}
      {showProductoDropdown && (
        <div
          className="fixed inset-0 z-10"
          onClick={() => setShowProductoDropdown(false)}
        />
      )}
    </div>
  );
};

export default RetornoMaterialForm;
