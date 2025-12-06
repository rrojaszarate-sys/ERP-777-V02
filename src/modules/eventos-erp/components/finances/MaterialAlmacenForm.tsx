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

  // 🆕 Materiales con salida previa (para retornos)
  const [materialesSalidos, setMaterialesSalidos] = useState<{
    producto_id: number;
    producto_nombre: string;
    producto_clave: string;
    cantidad_salida: number;
    cantidad_retornada: number;
    disponible_retorno: number;
    costo_unitario: number;
    unidad: string;
  }[]>([]);
  const [loadingMaterialesSalidos, setLoadingMaterialesSalidos] = useState(false);

  // Colores del tema
  const themeColors = useMemo(() => ({
    primary: paletteConfig.primary,
    secondary: paletteConfig.secondary,
    bg: isDark ? '#1E293B' : '#FFFFFF',
    text: isDark ? '#F8FAFC' : '#1E293B',
    border: isDark ? '#334155' : '#E2E8F0',
  }), [paletteConfig, isDark]);

  // Configuración según tipo - USA COLORES DE LA PALETA
  const config = useMemo(() => {
    if (tipoMovimiento === 'retorno') {
      return {
        titulo: 'Retorno de Material',
        subtitulo: 'Devolución de material no utilizado',
        icono: ArrowDownLeft,
        colorPrimario: themeColors.secondary,
        colorGradientEnd: themeColors.primary,
        colorBg: themeColors.secondary + '15',
        colorText: themeColors.secondary,
        mensajeFooter: 'Este monto se restará del total de gastos',
        conceptoPrefix: 'Retorno: ',
        descripcionPrefix: 'Retorno de'
      };
    }
    return {
      titulo: 'Ingreso de Material',
      subtitulo: 'Compra/entrada de materiales',
      icono: ArrowUpRight,
      colorPrimario: themeColors.primary,
      colorGradientEnd: themeColors.secondary,
      colorBg: themeColors.primary + '15',
      colorText: themeColors.primary,
      mensajeFooter: 'Este monto se sumará al total de gastos de materiales',
      conceptoPrefix: 'Material: ',
      descripcionPrefix: 'Ingreso de'
    };
  }, [tipoMovimiento, themeColors]);

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

  // 🆕 Cargar materiales que han salido del evento (para retornos)
  useEffect(() => {
    if (tipoMovimiento !== 'retorno') {
      setMaterialesSalidos([]);
      return;
    }

    const fetchMaterialesSalidos = async () => {
      setLoadingMaterialesSalidos(true);
      try {
        // Buscar gastos de materiales (ingresos) de este evento
        const { data: gastosIngreso, error: errorGastos } = await supabase
          .from('evt_gastos_erp')
          .select('id, detalle_retorno')
          .eq('evento_id', eventoId)
          .eq('tipo_movimiento', 'gasto')
          .eq('categoria_id', CATEGORIA_MATERIALES_ID);

        if (errorGastos) throw errorGastos;

        // Buscar retornos ya hechos
        const { data: gastosRetorno, error: errorRetornos } = await supabase
          .from('evt_gastos_erp')
          .select('id, detalle_retorno')
          .eq('evento_id', eventoId)
          .eq('tipo_movimiento', 'retorno')
          .eq('categoria_id', CATEGORIA_MATERIALES_ID);

        if (errorRetornos) throw errorRetornos;

        // Calcular materiales disponibles para retorno
        const materialesMap = new Map<number, {
          producto_id: number;
          producto_nombre: string;
          producto_clave: string;
          cantidad_salida: number;
          cantidad_retornada: number;
          costo_unitario: number;
          unidad: string;
        }>();

        // Sumar salidas
        gastosIngreso?.forEach(g => {
          try {
            const detalle = typeof g.detalle_retorno === 'string'
              ? JSON.parse(g.detalle_retorno)
              : g.detalle_retorno;

            if (Array.isArray(detalle)) {
              detalle.forEach((linea: any) => {
                if (linea.producto_id) {
                  const existing = materialesMap.get(linea.producto_id);
                  if (existing) {
                    existing.cantidad_salida += linea.cantidad || 0;
                  } else {
                    materialesMap.set(linea.producto_id, {
                      producto_id: linea.producto_id,
                      producto_nombre: linea.producto_nombre || '',
                      producto_clave: linea.producto_clave || '',
                      cantidad_salida: linea.cantidad || 0,
                      cantidad_retornada: 0,
                      costo_unitario: linea.costo_unitario || 0,
                      unidad: linea.unidad || 'PZA'
                    });
                  }
                }
              });
            }
          } catch { /* ignorar errores de parseo */ }
        });

        // Restar retornos ya hechos
        gastosRetorno?.forEach(g => {
          try {
            const detalle = typeof g.detalle_retorno === 'string'
              ? JSON.parse(g.detalle_retorno)
              : g.detalle_retorno;

            if (Array.isArray(detalle)) {
              detalle.forEach((linea: any) => {
                if (linea.producto_id) {
                  const existing = materialesMap.get(linea.producto_id);
                  if (existing) {
                    existing.cantidad_retornada += linea.cantidad || 0;
                  }
                }
              });
            }
          } catch { /* ignorar errores de parseo */ }
        });

        // Convertir a array con disponible > 0
        const disponibles = Array.from(materialesMap.values())
          .map(m => ({
            ...m,
            disponible_retorno: m.cantidad_salida - m.cantidad_retornada
          }))
          .filter(m => m.disponible_retorno > 0);

        setMaterialesSalidos(disponibles);

        if (disponibles.length === 0) {
          toast.error('No hay materiales disponibles para retorno en este evento', { duration: 4000 });
        }
      } catch (error) {
        console.error('Error cargando materiales salidos:', error);
      } finally {
        setLoadingMaterialesSalidos(false);
      }
    };

    fetchMaterialesSalidos();
  }, [tipoMovimiento, eventoId]);

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

    // 🆕 Validar cantidades de retorno no excedan disponible
    if (tipoMovimiento === 'retorno') {
      for (const linea of lineas) {
        const materialSalido = materialesSalidos.find(m => m.producto_id === linea.producto_id);
        if (!materialSalido) {
          toast.error(`El material "${linea.producto_nombre}" no tiene salida previa en este evento`);
          return;
        }
        if (linea.cantidad > materialSalido.disponible_retorno) {
          toast.error(
            `No puedes retornar ${linea.cantidad} de "${linea.producto_nombre}". ` +
            `Máximo disponible: ${materialSalido.disponible_retorno} ${linea.unidad}`
          );
          return;
        }
      }
    }

    // Validaciones para afectar inventario (firmas son OPCIONALES)
    if (afectarInventario) {
      if (!almacenId) {
        toast.error('Selecciona un almacén');
        return;
      }
      // ✅ FIRMAS OPCIONALES - Solo advertir si no hay firmas, no bloquear
      if (!nombreEntrega || !firmaEntrega || !nombreRecibe || !firmaRecibe) {
        console.warn('⚠️ Documento sin firmas completas - se creará igual');
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

          // Crear documento (firmas opcionales)
          const documento = await createDocumentoInventario({
            tipo: tipoDocumento,
            fecha: fecha,
            almacen_id: almacenId,
            evento_id: eventoId,
            nombre_entrega: nombreEntrega || 'Pendiente',
            firma_entrega: firmaEntrega || null,
            nombre_recibe: nombreRecibe || 'Pendiente',
            firma_recibe: firmaRecibe || null,
            observaciones: `${tipoMovimiento === 'gasto' ? 'Ingreso' : 'Retorno'} de material - Evento #${eventoId}`,
            detalles: detallesInventario
          }, user.company_id, user.id);

          documentoInventarioId = documento.id;

          // Solo confirmar si hay firmas completas (genera movimientos de inventario)
          const tieneTodasLasFirmas = firmaEntrega && firmaRecibe && nombreEntrega && nombreRecibe;

          if (tieneTodasLasFirmas) {
            await confirmarDocumento(documento.id);
            toast.success(`Documento ${documento.numero_documento || documento.id} confirmado con firmas`);
          } else {
            // Dejar en borrador para completar firmas después
            toast.success(`Documento ${documento.numero_documento || documento.id} creado (pendiente de firmas)`);
          }
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
        metodo_pago: 'transferencia',
        status: 'aprobado',
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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2">
      <div
        className="rounded-xl shadow-2xl w-full max-w-6xl h-[95vh] overflow-hidden flex flex-col"
        style={{ backgroundColor: themeColors.bg }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4" style={{ background: `linear-gradient(to right, ${config.colorPrimario}, ${config.colorGradientEnd})` }}>
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
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Selector de tipo - Solo si no viene predefinido o es edición */}
          {!item && (
            <div className="flex gap-4 p-1 bg-gray-100 rounded-lg">
              <button
                onClick={() => setTipoMovimiento('gasto')}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-medium transition-all ${tipoMovimiento === 'gasto'
                  ? 'text-white shadow-lg'
                  : 'text-gray-600 hover:bg-gray-200'
                  }`}
                style={tipoMovimiento === 'gasto' ? { backgroundColor: themeColors.primary } : {}}
              >
                <ArrowUpRight className="w-5 h-5" />
                Ingreso de Material
              </button>
              <button
                onClick={() => setTipoMovimiento('retorno')}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-medium transition-all ${tipoMovimiento === 'retorno'
                  ? 'text-white shadow-lg'
                  : 'text-gray-600 hover:bg-gray-200'
                  }`}
                style={tipoMovimiento === 'retorno' ? { backgroundColor: themeColors.secondary } : {}}
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

          {/* ============================================================ */}
          {/* SELECTOR DE MATERIALES - DIFERENTE PARA INGRESO VS RETORNO */}
          {/* ============================================================ */}
          {tipoMovimiento === 'gasto' ? (
            /* INGRESO: Buscador de catálogo (como antes) */
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
                            <span className="font-bold" style={{ color: config.colorText }}>
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
          ) : (
            /* RETORNO: Lista de materiales que han salido del evento */
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: themeColors.text }}>
                <ArrowDownLeft className="w-4 h-4 inline mr-1" />
                Seleccionar Material para Retorno
              </label>
              <p className="text-xs text-gray-500 mb-3">
                Solo puedes retornar materiales que hayan tenido una salida previa en este evento.
              </p>

              {loadingMaterialesSalidos ? (
                <div className="flex items-center justify-center p-6 border-2 border-dashed rounded-lg" style={{ borderColor: themeColors.border }}>
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                  <span className="text-gray-500">Cargando materiales disponibles...</span>
                </div>
              ) : materialesSalidos.length === 0 ? (
                <div className="p-6 border-2 border-dashed rounded-lg text-center" style={{ borderColor: themeColors.border }}>
                  <Package className="w-10 h-10 mx-auto text-gray-400 mb-2" />
                  <p className="text-gray-500 font-medium">No hay materiales disponibles para retorno</p>
                  <p className="text-xs text-gray-400 mt-1">
                    Primero debes registrar un ingreso de materiales en este evento
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-1.5 max-h-32 overflow-y-auto p-1">
                  {materialesSalidos.map(mat => {
                    // Verificar si ya está agregado en las líneas
                    const yaAgregado = lineas.some(l => l.producto_id === mat.producto_id);
                    const lineaExistente = lineas.find(l => l.producto_id === mat.producto_id);

                    return (
                      <button
                        key={mat.producto_id}
                        disabled={yaAgregado}
                        onClick={() => {
                          setLineas(prev => [...prev, {
                            producto_id: mat.producto_id,
                            producto_nombre: mat.producto_nombre,
                            producto_clave: mat.producto_clave,
                            cantidad: Math.min(1, mat.disponible_retorno),
                            costo_unitario: mat.costo_unitario,
                            unidad: mat.unidad,
                            subtotal: mat.costo_unitario * Math.min(1, mat.disponible_retorno)
                          }]);
                          toast.success(`${mat.producto_nombre} agregado`);
                        }}
                        className={`px-2 py-1.5 border rounded text-left transition-all ${yaAgregado
                          ? 'opacity-50 cursor-not-allowed bg-gray-100'
                          : 'hover:border-green-400 hover:bg-green-50'
                          }`}
                        style={{ borderColor: yaAgregado ? themeColors.border : themeColors.secondary }}
                      >
                        <div className="flex items-center justify-between gap-1">
                          <div className="flex-1 min-w-0">
                            <span className="font-medium text-xs block truncate" style={{ color: themeColors.text }}>
                              {mat.producto_nombre}
                            </span>
                            <span className="text-[10px] text-gray-400 block truncate">
                              {mat.producto_clave && `${mat.producto_clave} • `}Disp: {mat.disponible_retorno} {mat.unidad}
                            </span>
                          </div>
                          <div className="flex flex-col items-end flex-shrink-0">
                            <span className="text-[10px] font-semibold" style={{ color: themeColors.secondary }}>
                              ${mat.costo_unitario.toLocaleString('es-MX')}
                            </span>
                            {yaAgregado && <Check className="w-3 h-3 text-green-500" />}
                          </div>
                        </div>
                        {lineaExistente && (
                          <div className="text-[10px] text-green-600 mt-0.5 truncate">
                            ✓ {lineaExistente.cantidad} {mat.unidad}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

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

          {/* Tabla de líneas - COMPACTA */}
          {lineas.length > 0 && (
            <div className="border rounded-lg overflow-hidden" style={{ borderColor: themeColors.border }}>
              <table className="w-full text-sm">
                <thead style={{ backgroundColor: config.colorBg }}>
                  <tr>
                    <th className="px-2 py-1.5 text-left text-xs font-semibold" style={{ color: config.colorText }}>Material</th>
                    <th className="px-2 py-1.5 text-center text-xs font-semibold w-16" style={{ color: config.colorText }}>Cant.</th>
                    <th className="px-2 py-1.5 text-center text-xs font-semibold w-14" style={{ color: config.colorText }}>Unid.</th>
                    <th className="px-2 py-1.5 text-right text-xs font-semibold w-24" style={{ color: config.colorText }}>$ Unit.</th>
                    <th className="px-2 py-1.5 text-right text-xs font-semibold w-24" style={{ color: config.colorText }}>Subtotal</th>
                    <th className="px-1 py-1.5 w-8"></th>
                  </tr>
                </thead>
                <tbody>
                  {lineas.map((linea, index) => (
                    <tr key={index} className="border-t hover:bg-gray-50" style={{ borderColor: themeColors.border }}>
                      <td className="px-2 py-1">
                        <span className="font-medium text-sm" style={{ color: themeColors.text }}>
                          {linea.producto_nombre}
                        </span>
                        {linea.producto_clave && (
                          <span className="text-xs text-gray-400 ml-1">({linea.producto_clave})</span>
                        )}
                      </td>
                      <td className="px-1 py-1">
                        <input
                          type="number"
                          min="1"
                          value={linea.cantidad}
                          onChange={(e) => actualizarLinea(index, 'cantidad', parseInt(e.target.value) || 1)}
                          className="w-full px-1 py-0.5 border rounded text-center text-sm"
                        />
                      </td>
                      <td className="px-1 py-1 text-center text-xs text-gray-500">
                        {linea.unidad}
                      </td>
                      <td className="px-1 py-1">
                        <input
                          type="number"
                          step="0.01"
                          value={linea.costo_unitario}
                          onChange={(e) => actualizarLinea(index, 'costo_unitario', parseFloat(e.target.value) || 0)}
                          className="w-full px-1 py-0.5 border rounded text-right text-sm"
                        />
                      </td>
                      <td className="px-2 py-1 text-right font-semibold text-sm" style={{ color: config.colorText }}>
                        ${linea.subtotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-1 py-1">
                        <button
                          onClick={() => eliminarLinea(index)}
                          className="p-0.5 hover:bg-red-100 rounded text-red-500"
                        >
                          <X className="w-3.5 h-3.5" />
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
                borderColor: afectarInventario ? config.colorPrimario : themeColors.border,
                backgroundColor: afectarInventario ? config.colorBg : 'transparent'
              }}
            >
              {/* Toggle principal */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Warehouse className="w-5 h-5" style={{ color: afectarInventario ? config.colorText : '#9CA3AF' }} />
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
                  className="relative inline-flex h-7 w-14 items-center rounded-full transition-colors"
                  style={{ backgroundColor: afectarInventario ? config.colorPrimario : '#D1D5DB' }}
                >
                  <span
                    className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-lg transition-transform ${afectarInventario ? 'translate-x-8' : 'translate-x-1'
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
                  <div className="p-3 rounded-lg" style={{ backgroundColor: config.colorBg }}>
                    <div className="flex items-center gap-2 mb-2">
                      <ClipboardCheck className="w-4 h-4" style={{ color: config.colorText }} />
                      <span className="text-sm font-semibold" style={{ color: config.colorText }}>
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

        </div>

        {/* Footer con totales y notas - FIJO */}
        <div className="px-4 py-2 border-t flex-shrink-0" style={{ borderColor: themeColors.border, backgroundColor: config.colorBg }}>
          {/* Notas compactas */}
          <div className="flex items-center gap-2 mb-2">
            <input
              type="text"
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              placeholder="Notas / Observaciones (opcional)..."
              className="flex-1 px-3 py-1.5 border rounded text-sm"
              style={{ borderColor: themeColors.border, backgroundColor: themeColors.bg, color: themeColors.text }}
            />
          </div>
          {/* Totales */}
          <div className="flex justify-between items-center">
            <div className="text-xs text-gray-600">
              {lineas.length} material(es) • {config.mensajeFooter}
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="text-xs text-gray-500">Subtotal</div>
                <div className="font-semibold text-sm">${totales.subtotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</div>
              </div>
              <div className="text-right">
                <div className="text-xs text-gray-500">IVA {IVA_PORCENTAJE}%</div>
                <div className="font-semibold text-sm">${totales.iva.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</div>
              </div>
              <div className="text-right pl-2 border-l" style={{ borderColor: themeColors.border }}>
                <div className="text-xs font-medium" style={{ color: config.colorText }}>
                  Total
                </div>
                <div className="text-xl font-bold" style={{ color: config.colorText }}>
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
