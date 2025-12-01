import { supabase } from '../../../core/config/supabase';
import type { Almacen, MovimientoInventario } from '../types';

// ============================================================================
// PRODUCTOS
// ============================================================================

export const fetchProductos = async (companyId: string) => {
  const { data, error } = await supabase
    .from('productos_erp')
    .select('*')
    .eq('company_id', companyId)
    .order('nombre', { ascending: true });

  if (error) throw error;
  return data;
};

export const createProducto = async (producto: any) => {
  const { data, error } = await supabase
    .from('productos_erp')
    .insert([producto])
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const updateProducto = async (id: number, producto: any) => {
  const { data, error } = await supabase
    .from('productos_erp')
    .update(producto)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const deleteProducto = async (id: number) => {
  const { error } = await supabase
    .from('productos_erp')
    .delete()
    .eq('id', id);

  if (error) throw error;
};

// ============================================================================
// ALMACENES
// ============================================================================

export const fetchAlmacenes = async (companyId: string) => {
  const { data, error } = await supabase
    .from('almacenes_erp')
    .select('*')
    .eq('company_id', companyId)
    .order('nombre', { ascending: true });

  if (error) throw error;
  return data;
};

export const createAlmacen = async (almacen: any) => {
  const { data, error } = await supabase
    .from('almacenes_erp')
    .insert([almacen])
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const updateAlmacen = async (id: number, almacen: any) => {
  const { data, error } = await supabase
    .from('almacenes_erp')
    .update(almacen)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const deleteAlmacen = async (id: number) => {
  const { error } = await supabase
    .from('almacenes_erp')
    .delete()
    .eq('id', id);

  if (error) throw error;
};

// ============================================================================
// MOVIMIENTOS
// ============================================================================

export const fetchMovimientos = async (companyId: string) => {
  // Primero obtener almacenes de la empresa
  const { data: almacenes } = await supabase
    .from('almacenes_erp')
    .select('id')
    .eq('company_id', companyId);

  if (!almacenes || almacenes.length === 0) return [];

  const almacenIds = almacenes.map(a => a.id);

  const { data, error } = await supabase
    .from('movimientos_inventario_erp')
    .select(`
      *,
      producto:productos_erp(*),
      almacen:almacenes_erp(*)
    `)
    .in('almacen_id', almacenIds)
    .order('fecha_creacion', { ascending: false })
    .limit(500);
  if (error) throw error;
  return data;
};

export const createMovimiento = async (movimiento: Partial<MovimientoInventario>) => {
  const { data, error } = await supabase
    .from('movimientos_inventario_erp')
    .insert([movimiento])
    .select()
    .single();
  if (error) throw error;
  return data;
};

// ============================================================================
// OPERACIONES MASIVAS DE MOVIMIENTOS
// ============================================================================

export interface MovimientoMasivo {
  almacen_id: number;
  producto_id: number;
  tipo: 'entrada' | 'salida' | 'ajuste' | 'transferencia';
  cantidad: number;
  costo_unitario?: number;
  referencia?: string;
  concepto?: string;
}

/**
 * Registra múltiples movimientos de inventario en una sola operación
 * Útil para entradas/salidas de varios productos a la vez
 */
export const createMovimientosMasivos = async (movimientos: MovimientoMasivo[]) => {
  if (!movimientos || movimientos.length === 0) {
    throw new Error('No hay movimientos para registrar');
  }

  const { data, error } = await supabase
    .from('movimientos_inventario_erp')
    .insert(movimientos)
    .select();

  if (error) throw error;
  return data;
};

/**
 * Registra entrada masiva de productos
 * @param almacenId ID del almacén
 * @param items Array de productos con cantidad y costo
 * @param referencia Referencia del lote (ej: número de factura)
 * @param concepto Descripción del movimiento
 */
export const registrarEntradaMasiva = async (
  almacenId: number,
  items: Array<{ productoId: number; cantidad: number; costoUnitario?: number }>,
  referencia?: string,
  concepto?: string
) => {
  const movimientos: MovimientoMasivo[] = items.map(item => ({
    almacen_id: almacenId,
    producto_id: item.productoId,
    tipo: 'entrada',
    cantidad: item.cantidad,
    costo_unitario: item.costoUnitario,
    referencia: referencia || `ENT_${Date.now()}`,
    concepto: concepto || 'Entrada de mercancía',
  }));

  return createMovimientosMasivos(movimientos);
};

/**
 * Registra salida masiva de productos
 * @param almacenId ID del almacén
 * @param items Array de productos con cantidad
 * @param referencia Referencia del documento (ej: ticket de venta)
 * @param concepto Descripción del movimiento
 */
export const registrarSalidaMasiva = async (
  almacenId: number,
  items: Array<{ productoId: number; cantidad: number }>,
  referencia?: string,
  concepto?: string
) => {
  // Verificar stock disponible antes de la salida
  const stockErrors: string[] = [];
  
  for (const item of items) {
    const stock = await obtenerStockProducto(item.productoId, almacenId);
    if (stock < item.cantidad) {
      stockErrors.push(`Producto ID ${item.productoId}: stock disponible ${stock}, solicitado ${item.cantidad}`);
    }
  }

  if (stockErrors.length > 0) {
    throw new Error(`Stock insuficiente:\n${stockErrors.join('\n')}`);
  }

  const movimientos: MovimientoMasivo[] = items.map(item => ({
    almacen_id: almacenId,
    producto_id: item.productoId,
    tipo: 'salida',
    cantidad: item.cantidad,
    referencia: referencia || `SAL_${Date.now()}`,
    concepto: concepto || 'Salida de mercancía',
  }));

  return createMovimientosMasivos(movimientos);
};

/**
 * Obtiene el stock actual de un producto en un almacén específico
 */
export const obtenerStockProducto = async (productoId: number, almacenId: number): Promise<number> => {
  const { data: entradas } = await supabase
    .from('movimientos_inventario_erp')
    .select('cantidad')
    .eq('producto_id', productoId)
    .eq('almacen_id', almacenId)
    .in('tipo', ['entrada', 'ajuste']);

  const { data: salidas } = await supabase
    .from('movimientos_inventario_erp')
    .select('cantidad')
    .eq('producto_id', productoId)
    .eq('almacen_id', almacenId)
    .eq('tipo', 'salida');

  const totalEntradas = (entradas || []).reduce((sum, m) => sum + m.cantidad, 0);
  const totalSalidas = (salidas || []).reduce((sum, m) => sum + m.cantidad, 0);

  return totalEntradas - totalSalidas;
};

/**
 * Busca producto por código QR o código de barras
 */
export const buscarProductoPorCodigo = async (codigo: string, companyId: string) => {
  const { data, error } = await supabase
    .from('productos_erp')
    .select('*')
    .eq('company_id', companyId)
    .or(`codigo_qr.eq.${codigo},clave.eq.${codigo}`)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data;
};

// ============================================================================
// STOCK Y ANÁLISIS
// ============================================================================

export const calcularStockPorProducto = async (companyId: string) => {
  // Primero obtener almacenes de la empresa
  const { data: almacenes } = await supabase
    .from('almacenes_erp')
    .select('id')
    .eq('company_id', companyId);

  if (!almacenes || almacenes.length === 0) return {};

  const almacenIds = almacenes.map(a => a.id);

  // Obtener todos los movimientos de los almacenes de la empresa
  const { data: movimientos, error: movError } = await supabase
    .from('movimientos_inventario_erp')
    .select('producto_id, tipo, cantidad')
    .in('almacen_id', almacenIds);

  if (movError) throw movError;

  // Calcular stock por producto
  const stockMap: Record<number, number> = {};

  movimientos?.forEach(mov => {
    if (!stockMap[mov.producto_id]) {
      stockMap[mov.producto_id] = 0;
    }

    if (mov.tipo === 'entrada' || mov.tipo === 'ajuste') {
      stockMap[mov.producto_id] += mov.cantidad;
    } else if (mov.tipo === 'salida') {
      stockMap[mov.producto_id] -= mov.cantidad;
    }
  });

  return stockMap;
};

export const getProductosBajoStock = async (companyId: string, umbralMinimo: number = 10) => {
  // Obtener productos
  const productos = await fetchProductos(companyId);

  // Calcular stock actual
  const stockMap = await calcularStockPorProducto(companyId);

  // Filtrar productos con stock bajo (usando umbral por defecto ya que la tabla no tiene stock_minimo)
  // Si el producto tuviera un campo stock_minimo, lo usaríamos: p.stock_minimo || umbralMinimo
  const productosBajos = productos.filter(p => {
    const stockActual = stockMap[p.id!] || 0;
    return stockActual > 0 && stockActual < umbralMinimo;
  }).map(p => ({
    ...p,
    stock_actual: stockMap[p.id!] || 0
  }));

  return productosBajos;
};
