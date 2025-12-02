/**
 * FORMULARIO DE MATERIALES DE ALMACÉN
 *
 * Permite registrar:
 * - INGRESO: Compra/entrada de materiales (se suma a gastos)
 * - RETORNO: Devolución de material no utilizado (se resta de gastos)
 *
 * Integrado con el catálogo de productos del almacén.
 *
 * Características:
 * - Selector de productos del catálogo con búsqueda
 * - Costo automático desde el catálogo
 * - Opción de agregar nuevo producto al catálogo
 * - Cálculo automático de IVA y total
 * - Detalle de líneas guardado en JSON
 * - OPCIÓN: Afectar inventario (genera documento de entrada/salida con firmas)
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  X, Save, Loader2, Search, Plus, Package,
  DollarSign, Calendar, ArrowDownLeft, ArrowUpRight, Check,
  Warehouse, ClipboardCheck
} from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../../../../core/config/supabase';
import { useAuth } from '../../../../core/auth/AuthProvider';
import { useTheme } from '../../../../shared/components/theme';
import { DualSignaturePanel } from '../../../inventario-erp/components/SignatureCapture';
import { createDocumentoInventario, confirmarDocumento } from '../../../inventario-erp/services/documentosInventarioService';

// IVA desde variable de entorno
const IVA_PORCENTAJE = parseFloat(import.meta.env.VITE_IVA_PORCENTAJE || '16');
const IVA_RATE = IVA_PORCENTAJE / 100;

// ID de categoría Materiales
const CATEGORIA_MATERIALES_ID = 8;

// Tipos de movimiento
type TipoMovimiento = 'gasto' | 'retorno';

interface MaterialAlmacenFormProps {
  eventoId: number;
  tipoInicial?: TipoMovimiento; // 'gasto' para ingreso, 'retorno' para devolución
  item?: any; // Item existente para editar
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

interface LineaMaterial {
  producto_id: number | null;
  producto_nombre: string;
  producto_clave: string;
  cantidad: number;
  costo_unitario: number;
  unidad: string;
  subtotal: number;
}

export const MaterialAlmacenForm: React.FC<MaterialAlmacenFormProps> = ({
  eventoId,
  tipoInicial = 'gasto',
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

  // Tipo de movimiento
  const [tipoMovimiento, setTipoMovimiento] = useState<TipoMovimiento>(
    item?.tipo_movimiento || tipoInicial
  );

  // Datos del formulario
  const [concepto, setConcepto] = useState(item?.concepto || '');
  const [fecha, setFecha] = useState(item?.fecha_gasto || new Date().toISOString().split('T')[0]);
  const [notas, setNotas] = useState(item?.notas || '');
  const [lineas, setLineas] = useState<LineaMaterial[]>([]);

  // Nuevo producto
  const [nuevoProducto, setNuevoProducto] = useState({
    clave: '',
    nombre: '',
    categoria: 'Materiales',
    costo: 0,
    unidad: 'PZA'
  });

  // ============================================================================
  // AFECTAR INVENTARIO - Integración con sistema de almacén
  // ============================================================================
  const [afectarInventario, setAfectarInventario] = useState(false);
  const [almacenes, setAlmacenes] = useState<{ id: number; nombre: string }[]>([]);
  const [almacenId, setAlmacenId] = useState<number | null>(null);
  const [loadingAlmacenes, setLoadingAlmacenes] = useState(false);

  // Firmas para documento de inventario
  const [nombreEntrega, setNombreEntrega] = useState('');
  const [firmaEntrega, setFirmaEntrega] = useState<string | null>(null);
  const [nombreRecibe, setNombreRecibe] = useState('');
  const [firmaRecibe, setFirmaRecibe] = useState<string | null>(null);

  // Configuración según tipo
  const config = useMemo(() => {
    if (tipoMovimiento === 'retorno') {
      return {
        titulo: 'Retorno de Material',
        subtitulo: 'Devolución de material no utilizado',
        icono: ArrowDownLeft,
        colorPrimario: 'emerald',
        colorGradient: 'from-emerald-600 to-emerald-700',
        colorBg: 'bg-emerald-50',
        colorText: 'text-emerald-600',
        mensajeFooter: 'Este monto se restará del total de gastos',
        conceptoPrefix: 'Retorno: ',
        descripcionPrefix: 'Retorno de'
      };
    }
    return {
      titulo: 'Ingreso de Material',
      subtitulo: 'Compra/entrada de materiales',
      icono: ArrowUpRight,
      colorPrimario: 'blue',
      colorGradient: 'from-blue-600 to-blue-700',
      colorBg: 'bg-blue-50',
      colorText: 'text-blue-600',
      mensajeFooter: 'Este monto se sumará al total de gastos de materiales',
      conceptoPrefix: 'Material: ',
      descripcionPrefix: 'Ingreso de'
    };
  }, [tipoMovimiento]);

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

  // Cargar almacenes cuando se activa "Afectar Inventario"
  useEffect(() => {
    if (afectarInventario && almacenes.length === 0) {
      const fetchAlmacenes = async () => {
        setLoadingAlmacenes(true);
        try {
          const { data, error } = await supabase
            .from('almacenes_erp')
            .select('id, nombre')
            .eq('activo', true)
            .order('nombre');

          if (error) throw error;
          setAlmacenes(data || []);

          // Auto-seleccionar primer almacén si hay uno
          if (data && data.length > 0 && !almacenId) {
            setAlmacenId(data[0].id);
          }
        } catch (error) {
          console.error('Error cargando almacenes:', error);
          toast.error('Error al cargar almacenes');
        } finally {
          setLoadingAlmacenes(false);
        }
      };

      fetchAlmacenes();
    }
  }, [afectarInventario, almacenes.length, almacenId]);

  // Cargar líneas si es edición
  useEffect(() => {
    if (item?.detalle_retorno) {
      try {
        const detalle = typeof item.detalle_retorno === 'string'
          ? JSON.parse(item.detalle_retorno)
          : item.detalle_retorno;
        setLineas(detalle);
      } catch {
        // Si no hay detalle válido, crear línea desde datos existentes
        if (item.total > 0) {
          setLineas([{
            producto_id: null,
            producto_nombre: item.concepto || 'Material',
            producto_clave: '',
            cantidad: 1,
            costo_unitario: item.subtotal || item.total || 0,
            unidad: 'PZA',
            subtotal: item.subtotal || item.total || 0
          }]);
        }
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
  const actualizarLinea = useCallback((index: number, campo: keyof LineaMaterial, valor: any) => {
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

  // Guardar movimiento
  const handleSubmit = async () => {
    if (lineas.length === 0) {
      toast.error('Agrega al menos un material');
      return;
    }

    if (totales.total <= 0) {
      toast.error('El total debe ser mayor a 0');
      return;
    }

    // Validaciones para afectar inventario
    if (afectarInventario) {
      if (!almacenId) {
        toast.error('Selecciona un almacén');
        return;
      }
      if (!nombreEntrega || !firmaEntrega) {
        toast.error('Falta nombre y firma de quien entrega');
        return;
      }
      if (!nombreRecibe || !firmaRecibe) {
        toast.error('Falta nombre y firma de quien recibe');
        return;
      }
      // Validar que todos los productos tengan ID (para poder afectar inventario)
      const sinProductoId = lineas.filter(l => !l.producto_id);
      if (sinProductoId.length > 0) {
        toast.error('Todos los materiales deben estar en el catálogo para afectar inventario');
        return;
      }
    }

    setSaving(true);

    try {
      // Generar concepto automático si está vacío
      const conceptoFinal = concepto.trim() ||
        `${config.conceptoPrefix}${lineas.map(l => l.producto_nombre).join(', ')}`.substring(0, 200);

      // ================================================================
      // 1. AFECTAR INVENTARIO - Crear documento de entrada/salida
      // ================================================================
      let documentoInventarioId: number | null = null;

      if (afectarInventario && almacenId && user?.company_id) {
        try {
          // Para INGRESO de material → SALIDA del almacén (material sale hacia el evento)
          // Para RETORNO de material → ENTRADA al almacén (material regresa del evento)
          const tipoDocumento = tipoMovimiento === 'gasto' ? 'salida' : 'entrada';

          // Preparar detalles para el documento de inventario
          const detallesInventario = lineas
            .filter(l => l.producto_id) // Solo productos con ID
            .map(l => ({
              producto_id: l.producto_id!,
              cantidad: l.cantidad,
              observaciones: `Evento #${eventoId} - ${l.producto_nombre}`
            }));

          // Crear documento con firmas
          const documento = await createDocumentoInventario({
            tipo: tipoDocumento,
            fecha: fecha,
            almacen_id: almacenId,
            evento_id: eventoId,
            nombre_entrega: nombreEntrega,
            firma_entrega: firmaEntrega,
            nombre_recibe: nombreRecibe,
            firma_recibe: firmaRecibe,
            observaciones: `${tipoMovimiento === 'gasto' ? 'Ingreso' : 'Retorno'} de material - Evento #${eventoId}`,
            detalles: detallesInventario
          }, user.company_id, user.id);

          documentoInventarioId = documento.id;

          // Confirmar documento para generar movimientos de inventario
          await confirmarDocumento(documento.id);

          toast.success(`Documento de inventario ${documento.numero_documento || documento.id} confirmado`);
        } catch (invError: any) {
          console.error('Error creando documento de inventario:', invError);
          toast.error(`Error en inventario: ${invError.message}`);
          // Continuar sin afectar inventario (no bloqueamos el gasto)
        }
      }

      // ================================================================
      // 2. GUARDAR GASTO/RETORNO EN evt_gastos_erp
      // ================================================================
      const dataToSave = {
        evento_id: eventoId,
        company_id: user?.company_id,
        concepto: conceptoFinal,
        descripcion: `${config.descripcionPrefix} ${lineas.length} material(es)`,
        fecha_gasto: fecha,
        categoria_id: CATEGORIA_MATERIALES_ID,
        subtotal: totales.subtotal,
        iva: totales.iva,
        total: totales.total,
        tipo_movimiento: tipoMovimiento,
        notas: notas + (documentoInventarioId ? `\n[Doc. Inventario #${documentoInventarioId}]` : ''),
        detalle_retorno: JSON.stringify(lineas), // Usamos el mismo campo para ambos tipos
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
        toast.success(`${tipoMovimiento === 'retorno' ? 'Retorno' : 'Ingreso'} actualizado`);
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
        toast.success(`${tipoMovimiento === 'retorno' ? 'Retorno' : 'Ingreso'} de material registrado`);
      }

      onSave();
    } catch (error: any) {
      console.error('Error guardando:', error);
      toast.error(`Error: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const IconoTipo = config.icono;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div
        className="rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
        style={{ backgroundColor: themeColors.bg }}
      >
        {/* Header */}
        <div className={`flex items-center justify-between px-6 py-4 bg-gradient-to-r ${config.colorGradient}`}>
          <div className="flex items-center gap-3">
            <IconoTipo className="w-6 h-6 text-white" />
            <div>
              <h2 className="text-xl font-semibold text-white">
                {item ? 'Editar' : 'Nuevo'} {config.titulo}
              </h2>
              <p className="text-white/70 text-sm">{config.subtitulo}</p>
            </div>
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
          {/* Selector de tipo - Solo si no viene predefinido o es edición */}
          {!item && (
            <div className="flex gap-4 p-1 bg-gray-100 rounded-lg">
              <button
                onClick={() => setTipoMovimiento('gasto')}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-medium transition-all ${
                  tipoMovimiento === 'gasto'
                    ? 'bg-blue-600 text-white shadow-lg'
                    : 'text-gray-600 hover:bg-gray-200'
                }`}
              >
                <ArrowUpRight className="w-5 h-5" />
                Ingreso de Material
              </button>
              <button
                onClick={() => setTipoMovimiento('retorno')}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-medium transition-all ${
                  tipoMovimiento === 'retorno'
                    ? 'bg-emerald-600 text-white shadow-lg'
                    : 'text-gray-600 hover:bg-gray-200'
                }`}
              >
                <ArrowDownLeft className="w-5 h-5" />
                Retorno de Material
              </button>
            </div>
          )}

          {/* Información básica */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: themeColors.text }}>
                <Calendar className="w-4 h-4 inline mr-1" />
                Fecha
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
                          className={`w-full px-4 py-3 flex items-center justify-between hover:${config.colorBg} transition-colors text-left border-b last:border-b-0`}
                          style={{ borderColor: themeColors.border }}
                        >
                          <div>
                            <span className="font-medium" style={{ color: themeColors.text }}>
                              {producto.nombre}
                            </span>
                            <div className="text-xs text-gray-500">
                              {producto.clave} • {producto.categoria} • {producto.unidad}
                            </div>
                          </div>
                          <span className={`font-bold ${config.colorText}`}>
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
                className="px-4 py-2 bg-gray-700 hover:bg-gray-800 text-white rounded-lg flex items-center gap-2 whitespace-nowrap"
              >
                <Plus className="w-5 h-5" />
                Nuevo Producto
              </button>
            </div>
          </div>

          {/* Modal para nuevo producto */}
          {showNuevoProducto && (
            <div className="p-4 border-2 border-gray-300 bg-gray-50 rounded-lg space-y-3">
              <h4 className="font-semibold text-gray-800 flex items-center gap-2">
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
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-800 text-white rounded-lg flex items-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  Crear y Agregar
                </button>
              </div>
            </div>
          )}

          {/* Tabla de líneas */}
          {lineas.length > 0 && (
            <div className="border-2 rounded-lg overflow-hidden" style={{ borderColor: themeColors.border }}>
              <table className="w-full">
                <thead className={config.colorBg}>
                  <tr>
                    <th className={`px-4 py-2 text-left text-sm font-semibold ${config.colorText}`}>Material</th>
                    <th className={`px-4 py-2 text-center text-sm font-semibold ${config.colorText} w-24`}>Cantidad</th>
                    <th className={`px-4 py-2 text-center text-sm font-semibold ${config.colorText} w-20`}>Unidad</th>
                    <th className={`px-4 py-2 text-right text-sm font-semibold ${config.colorText} w-32`}>Costo Unit.</th>
                    <th className={`px-4 py-2 text-right text-sm font-semibold ${config.colorText} w-32`}>Subtotal</th>
                    <th className="px-4 py-2 w-12"></th>
                  </tr>
                </thead>
                <tbody>
                  {lineas.map((linea, index) => (
                    <tr key={index} className="border-t" style={{ borderColor: themeColors.border }}>
                      <td className="px-4 py-2">
                        <div>
                          <span className="font-medium" style={{ color: themeColors.text }}>
                            {linea.producto_nombre}
                          </span>
                          {linea.producto_clave && (
                            <span className="text-xs text-gray-500 ml-2">{linea.producto_clave}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="number"
                          min="1"
                          value={linea.cantidad}
                          onChange={(e) => actualizarLinea(index, 'cantidad', parseInt(e.target.value) || 1)}
                          className="w-full px-2 py-1 border rounded text-center"
                        />
                      </td>
                      <td className="px-4 py-2 text-center text-sm text-gray-600">
                        {linea.unidad}
                      </td>
                      <td className="px-4 py-2">
                        <div className="relative">
                          <DollarSign className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                          <input
                            type="number"
                            step="0.01"
                            value={linea.costo_unitario}
                            onChange={(e) => actualizarLinea(index, 'costo_unitario', parseFloat(e.target.value) || 0)}
                            className="w-full pl-7 pr-2 py-1 border rounded text-right"
                          />
                        </div>
                      </td>
                      <td className={`px-4 py-2 text-right font-bold ${config.colorText}`}>
                        ${linea.subtotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-2">
                        <button
                          onClick={() => eliminarLinea(index)}
                          className="p-1 hover:bg-red-100 rounded text-red-500"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* ================================================================ */}
          {/* AFECTAR INVENTARIO - Toggle y configuración */}
          {/* ================================================================ */}
          {lineas.length > 0 && (
            <div
              className="p-4 rounded-xl border-2 space-y-4"
              style={{
                borderColor: afectarInventario ? config.colorPrimario === 'emerald' ? '#10B981' : '#3B82F6' : themeColors.border,
                backgroundColor: afectarInventario ? (config.colorPrimario === 'emerald' ? '#ECFDF5' : '#EFF6FF') : 'transparent'
              }}
            >
              {/* Toggle principal */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Warehouse className={`w-5 h-5 ${afectarInventario ? config.colorText : 'text-gray-400'}`} />
                  <div>
                    <label className="font-semibold cursor-pointer" style={{ color: themeColors.text }}>
                      Afectar Inventario
                    </label>
                    <p className="text-xs text-gray-500">
                      {tipoMovimiento === 'gasto'
                        ? 'Genera SALIDA de almacén (material sale hacia el evento)'
                        : 'Genera ENTRADA a almacén (material regresa del evento)'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setAfectarInventario(!afectarInventario)}
                  className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors ${
                    afectarInventario
                      ? config.colorPrimario === 'emerald' ? 'bg-emerald-600' : 'bg-blue-600'
                      : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-lg transition-transform ${
                      afectarInventario ? 'translate-x-8' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* Configuración de inventario (visible cuando está activo) */}
              {afectarInventario && (
                <div className="space-y-4 pt-4 border-t border-gray-200">
                  {/* Selector de almacén */}
                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: themeColors.text }}>
                      <Warehouse className="w-4 h-4 inline mr-1" />
                      Almacén
                    </label>
                    {loadingAlmacenes ? (
                      <div className="flex items-center gap-2 text-gray-500">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span className="text-sm">Cargando almacenes...</span>
                      </div>
                    ) : (
                      <select
                        value={almacenId || ''}
                        onChange={(e) => setAlmacenId(parseInt(e.target.value) || null)}
                        className="w-full px-4 py-2 border-2 rounded-lg"
                        style={{ borderColor: themeColors.border, backgroundColor: themeColors.bg, color: themeColors.text }}
                      >
                        <option value="">Seleccionar almacén...</option>
                        {almacenes.map(alm => (
                          <option key={alm.id} value={alm.id}>{alm.nombre}</option>
                        ))}
                      </select>
                    )}
                  </div>

                  {/* Información del documento */}
                  <div className={`p-3 rounded-lg ${config.colorBg}`}>
                    <div className="flex items-center gap-2 mb-2">
                      <ClipboardCheck className={`w-4 h-4 ${config.colorText}`} />
                      <span className={`text-sm font-semibold ${config.colorText}`}>
                        Documento de {tipoMovimiento === 'gasto' ? 'Salida' : 'Entrada'}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600">
                      Se creará un documento de inventario tipo <strong>{tipoMovimiento === 'gasto' ? 'SALIDA' : 'ENTRADA'}</strong> con firmas de conformidad.
                      Los movimientos de stock se generarán automáticamente.
                    </p>
                  </div>

                  {/* Panel de firmas */}
                  <DualSignaturePanel
                    nombreEntrega={nombreEntrega}
                    firmaEntrega={firmaEntrega}
                    nombreRecibe={nombreRecibe}
                    firmaRecibe={firmaRecibe}
                    onNombreEntregaChange={setNombreEntrega}
                    onFirmaEntregaChange={setFirmaEntrega}
                    onNombreRecibeChange={setNombreRecibe}
                    onFirmaRecibeChange={setFirmaRecibe}
                    disabled={saving}
                  />
                </div>
              )}
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
              placeholder="Observaciones..."
              className="w-full px-4 py-2 border-2 rounded-lg resize-none"
              style={{ borderColor: themeColors.border, backgroundColor: themeColors.bg, color: themeColors.text }}
            />
          </div>
        </div>

        {/* Footer con totales */}
        <div className={`px-6 py-4 border-t ${config.colorBg}`} style={{ borderColor: themeColors.border }}>
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-600">
              {lineas.length} material(es) • {config.mensajeFooter}
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
                <div className={`text-sm ${config.colorText} font-medium`}>
                  Total {tipoMovimiento === 'retorno' ? 'Retorno' : 'Ingreso'}
                </div>
                <div className={`text-2xl font-bold ${config.colorText}`}>
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

export default MaterialAlmacenForm;
