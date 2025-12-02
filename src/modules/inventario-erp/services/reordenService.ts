/**
 * Servicio de Punto de Reorden
 * Genera requisiciones automáticas cuando el stock baja del mínimo
 */

import { supabase } from '../../../core/config/supabase';

// Tipos
export interface ProductoBajoStock {
  producto_id: string;
  producto_nombre: string;
  sku: string;
  almacen_id: string;
  almacen_nombre: string;
  stock_actual: number;
  stock_minimo: number;
  stock_maximo: number;
  punto_reorden: number;
  cantidad_sugerida: number;
  proveedor_preferido_id?: string;
  proveedor_preferido_nombre?: string;
  dias_sin_stock_estimado: number;
  unidad_medida: string;
}

export interface ConfiguracionReorden {
  producto_id: string;
  almacen_id: string;
  stock_minimo: number;
  stock_maximo: number;
  punto_reorden: number;
  cantidad_reorden?: number;
  proveedor_preferido_id?: string;
  tiempo_entrega_dias?: number;
  activo: boolean;
}

export interface RequisicionAutoGenerada {
  productos: {
    producto_id: string;
    cantidad: number;
    proveedor_id?: string;
  }[];
  almacen_id: string;
  total_items: number;
  notas: string;
}

/**
 * Calcular stock actual de un producto en un almacén
 */
async function calcularStockActual(producto_id: string, almacen_id: string): Promise<number> {
  const { data, error } = await supabase
    .from('movimientos_inventario')
    .select('tipo, cantidad')
    .eq('producto_id', producto_id)
    .eq('almacen_id', almacen_id);

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
 * Calcular consumo promedio diario
 */
async function calcularConsumoDiario(producto_id: string, almacen_id: string, dias: number = 30): Promise<number> {
  const fechaInicio = new Date();
  fechaInicio.setDate(fechaInicio.getDate() - dias);

  const { data, error } = await supabase
    .from('movimientos_inventario')
    .select('cantidad')
    .eq('producto_id', producto_id)
    .eq('almacen_id', almacen_id)
    .in('tipo', ['salida', 'ajuste_negativo'])
    .gte('fecha', fechaInicio.toISOString().split('T')[0]);

  if (error) throw error;

  const totalSalidas = (data || []).reduce((sum, mov) => sum + mov.cantidad, 0);
  return totalSalidas / dias;
}

/**
 * Obtener productos bajo el punto de reorden
 */
export async function obtenerProductosBajoReorden(almacen_id?: string): Promise<ProductoBajoStock[]> {
  // Obtener productos con configuración de stock
  let query = supabase
    .from('productos')
    .select(`
      id,
      nombre,
      sku,
      unidad_medida,
      stock_minimo,
      stock_maximo,
      punto_reorden,
      proveedor_preferido_id,
      proveedor:proveedores!productos_proveedor_preferido_id_fkey(id, nombre)
    `)
    .eq('activo', true)
    .gt('stock_minimo', 0);

  const { data: productos, error } = await query;
  if (error) throw error;

  // Obtener almacenes activos
  let queryAlmacenes = supabase
    .from('almacenes')
    .select('id, nombre')
    .eq('activo', true);

  if (almacen_id) {
    queryAlmacenes = queryAlmacenes.eq('id', almacen_id);
  }

  const { data: almacenes } = await queryAlmacenes;

  const productosBajos: ProductoBajoStock[] = [];

  for (const prod of productos || []) {
    for (const almacen of almacenes || []) {
      const stockActual = await calcularStockActual(prod.id, almacen.id);
      const puntoReorden = prod.punto_reorden || prod.stock_minimo;

      if (stockActual <= puntoReorden) {
        const consumoDiario = await calcularConsumoDiario(prod.id, almacen.id);
        const diasSinStock = consumoDiario > 0 ? Math.floor(stockActual / consumoDiario) : 999;
        const cantidadSugerida = (prod.stock_maximo || prod.stock_minimo * 2) - stockActual;

        productosBajos.push({
          producto_id: prod.id,
          producto_nombre: prod.nombre,
          sku: prod.sku,
          almacen_id: almacen.id,
          almacen_nombre: almacen.nombre,
          stock_actual: stockActual,
          stock_minimo: prod.stock_minimo,
          stock_maximo: prod.stock_maximo || prod.stock_minimo * 2,
          punto_reorden: puntoReorden,
          cantidad_sugerida: Math.max(1, Math.ceil(cantidadSugerida)),
          proveedor_preferido_id: prod.proveedor_preferido_id,
          proveedor_preferido_nombre: (prod.proveedor as { nombre: string })?.nombre,
          dias_sin_stock_estimado: diasSinStock,
          unidad_medida: prod.unidad_medida
        });
      }
    }
  }

  // Ordenar por urgencia (días sin stock)
  productosBajos.sort((a, b) => a.dias_sin_stock_estimado - b.dias_sin_stock_estimado);

  return productosBajos;
}

/**
 * Generar requisición de compra automática
 */
export async function generarRequisicionAutomatica(
  productos: ProductoBajoStock[],
  usuario_id: string
): Promise<string> {
  if (productos.length === 0) {
    throw new Error('No hay productos seleccionados');
  }

  // Agrupar por almacén
  const porAlmacen = new Map<string, ProductoBajoStock[]>();
  for (const prod of productos) {
    const lista = porAlmacen.get(prod.almacen_id) || [];
    lista.push(prod);
    porAlmacen.set(prod.almacen_id, lista);
  }

  // Generar número de requisición
  const fecha = new Date();
  const año = fecha.getFullYear().toString().slice(-2);
  const mes = (fecha.getMonth() + 1).toString().padStart(2, '0');
  
  const { data: ultimaReq } = await supabase
    .from('requisiciones')
    .select('numero')
    .ilike('numero', `REQ${año}${mes}%`)
    .order('numero', { ascending: false })
    .limit(1);

  let siguiente = 1;
  if (ultimaReq && ultimaReq.length > 0) {
    const numActual = parseInt(ultimaReq[0].numero.slice(-4)) || 0;
    siguiente = numActual + 1;
  }

  const numero = `REQ${año}${mes}${siguiente.toString().padStart(4, '0')}`;

  // Tomar el primer almacén (simplificación)
  const primerAlmacen = porAlmacen.keys().next().value;
  const productosAlmacen = porAlmacen.get(primerAlmacen) || [];

  // Crear requisición
  const { data: requisicion, error: errorReq } = await supabase
    .from('requisiciones')
    .insert({
      numero,
      fecha: fecha.toISOString().split('T')[0],
      almacen_id: primerAlmacen,
      estado: 'pendiente',
      usuario_solicita_id: usuario_id,
      notas: `Requisición automática por punto de reorden. ${productosAlmacen.length} productos bajo mínimo.`,
      origen: 'automatico'
    })
    .select()
    .single();

  if (errorReq) throw errorReq;

  // Crear detalles
  const detalles = productosAlmacen.map(prod => ({
    requisicion_id: requisicion.id,
    producto_id: prod.producto_id,
    cantidad_solicitada: prod.cantidad_sugerida,
    proveedor_sugerido_id: prod.proveedor_preferido_id,
    notas: `Stock actual: ${prod.stock_actual}. Días estimados sin stock: ${prod.dias_sin_stock_estimado}`
  }));

  const { error: errorDet } = await supabase
    .from('requisiciones_detalle')
    .insert(detalles);

  if (errorDet) throw errorDet;

  // Crear alerta para el usuario de compras
  await supabase
    .from('alertas_inventario')
    .insert({
      tipo: 'requisicion_automatica',
      titulo: `Requisición ${numero} generada automáticamente`,
      mensaje: `Se generó requisición de compra para ${productosAlmacen.length} productos bajo punto de reorden`,
      producto_id: productosAlmacen[0]?.producto_id,
      almacen_id: primerAlmacen,
      prioridad: 'alta',
      estado: 'pendiente'
    });

  return numero;
}

/**
 * Actualizar configuración de reorden de un producto
 */
export async function actualizarConfiguracionReorden(
  producto_id: string,
  config: Partial<ConfiguracionReorden>
): Promise<void> {
  const { error } = await supabase
    .from('productos')
    .update({
      stock_minimo: config.stock_minimo,
      stock_maximo: config.stock_maximo,
      punto_reorden: config.punto_reorden,
      proveedor_preferido_id: config.proveedor_preferido_id
    })
    .eq('id', producto_id);

  if (error) throw error;
}

/**
 * Obtener resumen de alertas de reorden
 */
export async function obtenerResumenReorden(): Promise<{
  productos_bajo_minimo: number;
  productos_criticos: number;
  requisiciones_pendientes: number;
  valor_sugerido_compra: number;
}> {
  const productosBajos = await obtenerProductosBajoReorden();
  
  // Obtener precios promedio
  const { data: precios } = await supabase
    .from('productos')
    .select('id, costo_promedio')
    .in('id', productosBajos.map(p => p.producto_id));

  const precioMap = new Map(precios?.map(p => [p.id, p.costo_promedio || 0]) || []);

  let valorSugerido = 0;
  let criticos = 0;

  for (const prod of productosBajos) {
    valorSugerido += prod.cantidad_sugerida * (precioMap.get(prod.producto_id) || 0);
    if (prod.dias_sin_stock_estimado < 3) criticos++;
  }

  // Contar requisiciones pendientes
  const { count: reqPendientes } = await supabase
    .from('requisiciones')
    .select('id', { count: 'exact', head: true })
    .eq('estado', 'pendiente');

  return {
    productos_bajo_minimo: productosBajos.length,
    productos_criticos: criticos,
    requisiciones_pendientes: reqPendientes || 0,
    valor_sugerido_compra: valorSugerido
  };
}

/**
 * Verificar y generar alertas de reorden (para ejecutar periódicamente)
 */
export async function verificarYGenerarAlertas(): Promise<number> {
  const productosBajos = await obtenerProductosBajoReorden();
  let alertasCreadas = 0;

  for (const prod of productosBajos) {
    // Verificar si ya existe alerta activa para este producto/almacén
    const { data: alertaExistente } = await supabase
      .from('alertas_inventario')
      .select('id')
      .eq('producto_id', prod.producto_id)
      .eq('almacen_id', prod.almacen_id)
      .in('tipo', ['stock_bajo', 'stock_critico'])
      .eq('estado', 'pendiente')
      .limit(1);

    if (!alertaExistente || alertaExistente.length === 0) {
      const esCritico = prod.dias_sin_stock_estimado < 3;
      
      await supabase
        .from('alertas_inventario')
        .insert({
          tipo: esCritico ? 'stock_critico' : 'stock_bajo',
          titulo: `${esCritico ? '🚨 CRÍTICO' : '⚠️'} Stock bajo: ${prod.producto_nombre}`,
          mensaje: `Stock actual: ${prod.stock_actual} ${prod.unidad_medida}. Mínimo: ${prod.stock_minimo}. Días estimados: ${prod.dias_sin_stock_estimado}`,
          producto_id: prod.producto_id,
          almacen_id: prod.almacen_id,
          prioridad: esCritico ? 'critica' : 'alta',
          estado: 'pendiente',
          datos: {
            stock_actual: prod.stock_actual,
            stock_minimo: prod.stock_minimo,
            cantidad_sugerida: prod.cantidad_sugerida,
            proveedor_id: prod.proveedor_preferido_id
          }
        });

      alertasCreadas++;
    }
  }

  return alertasCreadas;
}

export default {
  obtenerProductosBajoReorden,
  generarRequisicionAutomatica,
  actualizarConfiguracionReorden,
  obtenerResumenReorden,
  verificarYGenerarAlertas
};
