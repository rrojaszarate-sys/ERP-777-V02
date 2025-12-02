/**
 * Servicio de Valoración de Inventario
 * Calcula el valor total del inventario por diferentes métodos
 */

import { supabase } from '../../../core/config/supabase';

// Tipos
export type MetodoValuacion = 'promedio' | 'peps' | 'ueps';

export interface ItemValuacion {
  producto_id: string;
  producto_nombre: string;
  sku: string;
  categoria: string;
  unidad_medida: string;
  cantidad: number;
  costo_unitario: number;
  valor_total: number;
  ultima_entrada?: string;
  ultima_salida?: string;
}

export interface ResumenValuacion {
  fecha_corte: string;
  metodo: MetodoValuacion;
  almacen?: { id: string; nombre: string };
  total_productos: number;
  total_unidades: number;
  valor_total: number;
  items: ItemValuacion[];
  por_categoria: { categoria: string; cantidad: number; valor: number }[];
}

export interface FiltrosValuacion {
  almacen_id?: string;
  categoria_id?: string;
  metodo?: MetodoValuacion;
  fecha_corte?: string;
  incluir_sin_stock?: boolean;
}

/**
 * Calcular stock de un producto en un almacén
 */
async function calcularStockProducto(
  producto_id: string, 
  almacen_id?: string,
  fecha_corte?: string
): Promise<number> {
  let query = supabase
    .from('movimientos_inventario')
    .select('tipo, cantidad')
    .eq('producto_id', producto_id);

  if (almacen_id) {
    query = query.eq('almacen_id', almacen_id);
  }

  if (fecha_corte) {
    query = query.lte('fecha', fecha_corte);
  }

  const { data, error } = await query;
  
  if (error) throw error;

  let stock = 0;
  for (const mov of data || []) {
    if (mov.tipo === 'entrada' || mov.tipo === 'ajuste_positivo') {
      stock += mov.cantidad;
    } else if (mov.tipo === 'salida' || mov.tipo === 'ajuste_negativo') {
      stock -= mov.cantidad;
    }
  }

  return Math.max(0, stock);
}

/**
 * Calcular costo promedio ponderado
 */
async function calcularCostoPromedio(
  producto_id: string,
  almacen_id?: string
): Promise<number> {
  let query = supabase
    .from('movimientos_inventario')
    .select('tipo, cantidad, costo_unitario')
    .eq('producto_id', producto_id)
    .in('tipo', ['entrada', 'ajuste_positivo']);

  if (almacen_id) {
    query = query.eq('almacen_id', almacen_id);
  }

  const { data, error } = await query;
  
  if (error) throw error;

  let totalCantidad = 0;
  let totalCosto = 0;

  for (const mov of data || []) {
    if (mov.costo_unitario && mov.cantidad) {
      totalCantidad += mov.cantidad;
      totalCosto += mov.cantidad * mov.costo_unitario;
    }
  }

  return totalCantidad > 0 ? totalCosto / totalCantidad : 0;
}

/**
 * Obtener última fecha de movimiento
 */
async function obtenerUltimaFechaMovimiento(
  producto_id: string,
  tipo: 'entrada' | 'salida',
  almacen_id?: string
): Promise<string | undefined> {
  let query = supabase
    .from('movimientos_inventario')
    .select('fecha')
    .eq('producto_id', producto_id)
    .order('fecha', { ascending: false })
    .limit(1);

  if (tipo === 'entrada') {
    query = query.in('tipo', ['entrada', 'ajuste_positivo']);
  } else {
    query = query.in('tipo', ['salida', 'ajuste_negativo']);
  }

  if (almacen_id) {
    query = query.eq('almacen_id', almacen_id);
  }

  const { data } = await query;
  return data?.[0]?.fecha;
}

/**
 * Generar reporte de valoración de inventario
 */
export async function generarValuacion(filtros: FiltrosValuacion): Promise<ResumenValuacion> {
  const metodo = filtros.metodo || 'promedio';
  const fechaCorte = filtros.fecha_corte || new Date().toISOString().split('T')[0];

  // Obtener productos
  let queryProductos = supabase
    .from('productos')
    .select(`
      id,
      nombre,
      sku,
      unidad_medida,
      costo_promedio,
      categoria:categorias_producto(id, nombre)
    `)
    .eq('activo', true)
    .order('nombre');

  if (filtros.categoria_id) {
    queryProductos = queryProductos.eq('categoria_id', filtros.categoria_id);
  }

  const { data: productos, error } = await queryProductos;
  if (error) throw error;

  // Obtener info del almacén si se filtró
  let almacenInfo = undefined;
  if (filtros.almacen_id) {
    const { data } = await supabase
      .from('almacenes')
      .select('id, nombre')
      .eq('id', filtros.almacen_id)
      .single();
    almacenInfo = data || undefined;
  }

  // Calcular valuación para cada producto
  const items: ItemValuacion[] = [];
  const categoriaMap = new Map<string, { cantidad: number; valor: number }>();

  for (const prod of productos || []) {
    const cantidad = await calcularStockProducto(prod.id, filtros.almacen_id, fechaCorte);
    
    // Saltar productos sin stock si no se pide incluirlos
    if (cantidad <= 0 && !filtros.incluir_sin_stock) continue;

    let costoUnitario = 0;

    switch (metodo) {
      case 'promedio':
        costoUnitario = await calcularCostoPromedio(prod.id, filtros.almacen_id);
        if (costoUnitario === 0) costoUnitario = prod.costo_promedio || 0;
        break;
      case 'peps':
      case 'ueps':
        // Para PEPS/UEPS se necesitaría implementar lógica más compleja
        // Por ahora usar costo promedio
        costoUnitario = prod.costo_promedio || 0;
        break;
    }

    const valorTotal = cantidad * costoUnitario;
    const categoriaNombre = (prod.categoria as { nombre: string })?.nombre || 'Sin Categoría';

    items.push({
      producto_id: prod.id,
      producto_nombre: prod.nombre,
      sku: prod.sku,
      categoria: categoriaNombre,
      unidad_medida: prod.unidad_medida,
      cantidad,
      costo_unitario: costoUnitario,
      valor_total: valorTotal,
      ultima_entrada: await obtenerUltimaFechaMovimiento(prod.id, 'entrada', filtros.almacen_id),
      ultima_salida: await obtenerUltimaFechaMovimiento(prod.id, 'salida', filtros.almacen_id)
    });

    // Agregar a resumen por categoría
    const catActual = categoriaMap.get(categoriaNombre) || { cantidad: 0, valor: 0 };
    categoriaMap.set(categoriaNombre, {
      cantidad: catActual.cantidad + cantidad,
      valor: catActual.valor + valorTotal
    });
  }

  // Ordenar items por valor (mayor a menor)
  items.sort((a, b) => b.valor_total - a.valor_total);

  // Convertir mapa de categorías a array
  const porCategoria = Array.from(categoriaMap.entries()).map(([categoria, datos]) => ({
    categoria,
    cantidad: datos.cantidad,
    valor: datos.valor
  })).sort((a, b) => b.valor - a.valor);

  return {
    fecha_corte: fechaCorte,
    metodo,
    almacen: almacenInfo,
    total_productos: items.length,
    total_unidades: items.reduce((sum, i) => sum + i.cantidad, 0),
    valor_total: items.reduce((sum, i) => sum + i.valor_total, 0),
    items,
    por_categoria: porCategoria
  };
}

/**
 * Análisis ABC (Pareto) del inventario
 */
export async function generarAnalisisABC(almacen_id?: string): Promise<{
  clasificacion_a: ItemValuacion[];
  clasificacion_b: ItemValuacion[];
  clasificacion_c: ItemValuacion[];
  resumen: {
    a: { productos: number; porcentaje_productos: number; valor: number; porcentaje_valor: number };
    b: { productos: number; porcentaje_productos: number; valor: number; porcentaje_valor: number };
    c: { productos: number; porcentaje_productos: number; valor: number; porcentaje_valor: number };
  };
}> {
  const valuacion = await generarValuacion({ almacen_id });
  const valorTotal = valuacion.valor_total;
  
  // Ordenar por valor (ya viene ordenado)
  const items = valuacion.items;
  
  // Clasificar según regla 80-15-5
  const clasificacion_a: ItemValuacion[] = [];
  const clasificacion_b: ItemValuacion[] = [];
  const clasificacion_c: ItemValuacion[] = [];
  
  let valorAcumulado = 0;
  
  for (const item of items) {
    const porcentajeAcumulado = (valorAcumulado / valorTotal) * 100;
    
    if (porcentajeAcumulado < 80) {
      clasificacion_a.push(item);
    } else if (porcentajeAcumulado < 95) {
      clasificacion_b.push(item);
    } else {
      clasificacion_c.push(item);
    }
    
    valorAcumulado += item.valor_total;
  }

  const totalProductos = items.length;
  const valorA = clasificacion_a.reduce((s, i) => s + i.valor_total, 0);
  const valorB = clasificacion_b.reduce((s, i) => s + i.valor_total, 0);
  const valorC = clasificacion_c.reduce((s, i) => s + i.valor_total, 0);

  return {
    clasificacion_a,
    clasificacion_b,
    clasificacion_c,
    resumen: {
      a: {
        productos: clasificacion_a.length,
        porcentaje_productos: (clasificacion_a.length / totalProductos) * 100,
        valor: valorA,
        porcentaje_valor: (valorA / valorTotal) * 100
      },
      b: {
        productos: clasificacion_b.length,
        porcentaje_productos: (clasificacion_b.length / totalProductos) * 100,
        valor: valorB,
        porcentaje_valor: (valorB / valorTotal) * 100
      },
      c: {
        productos: clasificacion_c.length,
        porcentaje_productos: (clasificacion_c.length / totalProductos) * 100,
        valor: valorC,
        porcentaje_valor: (valorC / valorTotal) * 100
      }
    }
  };
}

/**
 * Exportar valuación a CSV
 */
export function exportarValuacionCSV(valuacion: ResumenValuacion): string {
  const headers = [
    'SKU',
    'Producto',
    'Categoría',
    'Unidad',
    'Cantidad',
    'Costo Unitario',
    'Valor Total',
    'Última Entrada',
    'Última Salida'
  ].join(',');

  const rows = valuacion.items.map(item => [
    item.sku,
    `"${item.producto_nombre.replace(/"/g, '""')}"`,
    `"${item.categoria}"`,
    item.unidad_medida,
    item.cantidad,
    item.costo_unitario.toFixed(2),
    item.valor_total.toFixed(2),
    item.ultima_entrada || '',
    item.ultima_salida || ''
  ].join(','));

  return [
    `VALUACIÓN DE INVENTARIO`,
    `Fecha de Corte: ${valuacion.fecha_corte}`,
    `Método: ${valuacion.metodo.toUpperCase()}`,
    valuacion.almacen ? `Almacén: ${valuacion.almacen.nombre}` : 'Todos los almacenes',
    '',
    headers,
    ...rows,
    '',
    `Total Productos:,${valuacion.total_productos}`,
    `Total Unidades:,${valuacion.total_unidades}`,
    `Valor Total:,$${valuacion.valor_total.toFixed(2)}`,
    '',
    'RESUMEN POR CATEGORÍA',
    'Categoría,Cantidad,Valor',
    ...valuacion.por_categoria.map(c => `"${c.categoria}",${c.cantidad},$${c.valor.toFixed(2)}`)
  ].join('\n');
}

export default {
  generarValuacion,
  generarAnalisisABC,
  exportarValuacionCSV
};
