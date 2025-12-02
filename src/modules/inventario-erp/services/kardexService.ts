/**
 * Servicio de Kardex
 * Vista de movimientos por producto con saldo acumulado
 */

import { supabase } from '../../../core/config/supabase';

// Tipos
export interface MovimientoKardex {
  id: string;
  fecha: string;
  tipo: 'entrada' | 'salida' | 'ajuste_positivo' | 'ajuste_negativo';
  documento_tipo?: string;
  documento_numero?: string;
  cantidad: number;
  costo_unitario?: number;
  costo_total?: number;
  saldo_cantidad: number;
  saldo_costo?: number;
  almacen: string;
  referencia?: string;
  notas?: string;
}

export interface KardexProducto {
  producto: {
    id: string;
    nombre: string;
    sku: string;
    unidad_medida: string;
    costo_promedio?: number;
  };
  saldo_inicial: number;
  total_entradas: number;
  total_salidas: number;
  saldo_final: number;
  movimientos: MovimientoKardex[];
}

export interface FiltrosKardex {
  producto_id: string;
  almacen_id?: string;
  fecha_desde?: string;
  fecha_hasta?: string;
  tipo?: 'entrada' | 'salida' | 'ajuste_positivo' | 'ajuste_negativo';
}

/**
 * Obtener Kardex de un producto
 */
export async function obtenerKardex(filtros: FiltrosKardex): Promise<KardexProducto | null> {
  // Obtener datos del producto
  const { data: producto, error: errorProd } = await supabase
    .from('productos')
    .select('id, nombre, sku, unidad_medida, costo_promedio')
    .eq('id', filtros.producto_id)
    .single();

  if (errorProd || !producto) {
    throw new Error('Producto no encontrado');
  }

  // Query de movimientos
  let query = supabase
    .from('movimientos_inventario')
    .select(`
      id,
      fecha,
      tipo,
      cantidad,
      costo_unitario,
      documento_tipo,
      documento_id,
      notas,
      almacen:almacenes(id, nombre)
    `)
    .eq('producto_id', filtros.producto_id)
    .order('fecha', { ascending: true })
    .order('created_at', { ascending: true });

  if (filtros.almacen_id) {
    query = query.eq('almacen_id', filtros.almacen_id);
  }
  if (filtros.fecha_desde) {
    query = query.gte('fecha', filtros.fecha_desde);
  }
  if (filtros.fecha_hasta) {
    query = query.lte('fecha', filtros.fecha_hasta);
  }
  if (filtros.tipo) {
    query = query.eq('tipo', filtros.tipo);
  }

  const { data: movimientos, error: errorMov } = await query;

  if (errorMov) throw errorMov;

  // Calcular saldos acumulados
  let saldoCantidad = 0;
  let saldoCosto = 0;
  let totalEntradas = 0;
  let totalSalidas = 0;

  // Si hay fecha_desde, necesitamos calcular el saldo inicial
  let saldoInicial = 0;
  if (filtros.fecha_desde) {
    const { data: movPrevios } = await supabase
      .from('movimientos_inventario')
      .select('tipo, cantidad')
      .eq('producto_id', filtros.producto_id)
      .lt('fecha', filtros.fecha_desde);

    if (movPrevios) {
      for (const mov of movPrevios) {
        if (mov.tipo === 'entrada' || mov.tipo === 'ajuste_positivo') {
          saldoInicial += mov.cantidad;
        } else if (mov.tipo === 'salida' || mov.tipo === 'ajuste_negativo') {
          saldoInicial -= mov.cantidad;
        }
      }
    }
    saldoCantidad = saldoInicial;
  }

  const movimientosKardex: MovimientoKardex[] = (movimientos || []).map(mov => {
    const esEntrada = mov.tipo === 'entrada' || mov.tipo === 'ajuste_positivo';
    const cantidad = mov.cantidad || 0;
    const costoUnit = mov.costo_unitario || producto.costo_promedio || 0;

    if (esEntrada) {
      saldoCantidad += cantidad;
      saldoCosto += cantidad * costoUnit;
      totalEntradas += cantidad;
    } else {
      saldoCantidad -= cantidad;
      saldoCosto -= cantidad * costoUnit;
      totalSalidas += cantidad;
    }

    return {
      id: mov.id,
      fecha: mov.fecha,
      tipo: mov.tipo,
      documento_tipo: mov.documento_tipo,
      documento_numero: mov.documento_id, // TODO: obtener número real del documento
      cantidad: cantidad,
      costo_unitario: costoUnit,
      costo_total: cantidad * costoUnit,
      saldo_cantidad: saldoCantidad,
      saldo_costo: saldoCosto,
      almacen: (mov.almacen as { nombre: string })?.nombre || 'N/A',
      notas: mov.notas
    };
  });

  return {
    producto,
    saldo_inicial: saldoInicial,
    total_entradas: totalEntradas,
    total_salidas: totalSalidas,
    saldo_final: saldoCantidad,
    movimientos: movimientosKardex
  };
}

/**
 * Obtener resumen de Kardex para varios productos
 */
export async function obtenerResumenKardexMultiple(
  producto_ids: string[], 
  almacen_id?: string
): Promise<{
  producto_id: string;
  producto_nombre: string;
  sku: string;
  stock_actual: number;
  valor_inventario: number;
}[]> {
  const resultados = [];

  for (const producto_id of producto_ids) {
    try {
      const kardex = await obtenerKardex({ producto_id, almacen_id });
      if (kardex) {
        resultados.push({
          producto_id: kardex.producto.id,
          producto_nombre: kardex.producto.nombre,
          sku: kardex.producto.sku,
          stock_actual: kardex.saldo_final,
          valor_inventario: kardex.saldo_final * (kardex.producto.costo_promedio || 0)
        });
      }
    } catch {
      // Ignorar errores individuales
    }
  }

  return resultados;
}

/**
 * Exportar Kardex a formato para Excel
 */
export function exportarKardexCSV(kardex: KardexProducto): string {
  const headers = [
    'Fecha',
    'Tipo',
    'Documento',
    'Almacén',
    'Entrada',
    'Salida',
    'Saldo',
    'Costo Unit.',
    'Costo Total',
    'Saldo Costo',
    'Notas'
  ].join(',');

  const rows = kardex.movimientos.map(mov => {
    const esEntrada = mov.tipo === 'entrada' || mov.tipo === 'ajuste_positivo';
    return [
      mov.fecha,
      mov.tipo,
      mov.documento_tipo ? `${mov.documento_tipo}` : '',
      mov.almacen,
      esEntrada ? mov.cantidad : '',
      !esEntrada ? mov.cantidad : '',
      mov.saldo_cantidad,
      mov.costo_unitario?.toFixed(2) || '',
      mov.costo_total?.toFixed(2) || '',
      mov.saldo_costo?.toFixed(2) || '',
      `"${(mov.notas || '').replace(/"/g, '""')}"`
    ].join(',');
  });

  return [
    `KARDEX - ${kardex.producto.nombre} (${kardex.producto.sku})`,
    '',
    headers,
    ...rows,
    '',
    `Saldo Inicial:,${kardex.saldo_inicial}`,
    `Total Entradas:,${kardex.total_entradas}`,
    `Total Salidas:,${kardex.total_salidas}`,
    `Saldo Final:,${kardex.saldo_final}`
  ].join('\n');
}

export default {
  obtenerKardex,
  obtenerResumenKardexMultiple,
  exportarKardexCSV
};
