import { supabase } from '../../../core/config/supabase';
import type {
  ConteoInventario,
  ConteoInventarioDetalle,
  TipoConteo,
  EstadoConteo,
  EstadoLineaConteo,
} from '../types';

// ============================================================================
// CONTEOS DE INVENTARIO (INVENTARIO FÍSICO)
// ============================================================================

/**
 * Obtener todos los conteos
 */
export const fetchConteos = async (
  companyId: string,
  options?: {
    almacenId?: number;
    estado?: EstadoConteo;
    fechaDesde?: string;
    fechaHasta?: string;
  }
): Promise<ConteoInventario[]> => {
  let query = supabase
    .from('conteos_inventario_erp')
    .select(`
      *,
      almacen:almacenes_erp(id, nombre, codigo)
    `)
    .eq('company_id', companyId)
    .order('fecha_programada', { ascending: false });

  if (options?.almacenId) {
    query = query.eq('almacen_id', options.almacenId);
  }
  if (options?.estado) {
    query = query.eq('estado', options.estado);
  }
  if (options?.fechaDesde) {
    query = query.gte('fecha_programada', options.fechaDesde);
  }
  if (options?.fechaHasta) {
    query = query.lte('fecha_programada', options.fechaHasta);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
};

/**
 * Obtener un conteo con sus detalles
 */
export const fetchConteoById = async (id: number): Promise<ConteoInventario | null> => {
  const { data: conteo, error: conteoError } = await supabase
    .from('conteos_inventario_erp')
    .select(`
      *,
      almacen:almacenes_erp(id, nombre, codigo)
    `)
    .eq('id', id)
    .single();

  if (conteoError) {
    if (conteoError.code === 'PGRST116') return null;
    throw conteoError;
  }
  if (!conteo) return null;

  // Obtener detalles
  const { data: detalles, error: detError } = await supabase
    .from('conteos_inventario_detalle_erp')
    .select(`
      *,
      producto:productos_erp(id, nombre, clave, unidad),
      ubicacion:ubicaciones_almacen_erp(id, codigo, nombre),
      lote:lotes_inventario_erp(id, numero_lote)
    `)
    .eq('conteo_id', id)
    .order('id', { ascending: true });

  if (detError) {
    console.error('Error cargando detalles del conteo:', detError);
  }

  return {
    ...conteo,
    detalles: detalles || [],
  };
};

/**
 * Crear nuevo conteo de inventario
 */
export const createConteo = async (
  conteo: {
    nombre: string;
    tipo_conteo: TipoConteo;
    almacen_id: number | null;
    fecha_programada: string;
    observaciones?: string;
  },
  companyId: string,
  userId?: string
): Promise<ConteoInventario> => {
  // Generar número de conteo
  const { count } = await supabase
    .from('conteos_inventario_erp')
    .select('*', { count: 'exact', head: true })
    .eq('company_id', companyId);

  const numeroConteo = `CNT-${new Date().getFullYear()}-${String((count || 0) + 1).padStart(4, '0')}`;

  const { data, error } = await supabase
    .from('conteos_inventario_erp')
    .insert([{
      numero_conteo: numeroConteo,
      nombre: conteo.nombre,
      tipo_conteo: conteo.tipo_conteo,
      almacen_id: conteo.almacen_id,
      fecha_programada: conteo.fecha_programada,
      observaciones: conteo.observaciones,
      estado: 'programado',
      company_id: companyId,
      created_by: userId,
    }])
    .select()
    .single();

  if (error) throw error;
  return data;
};

/**
 * Generar líneas de conteo basadas en el stock actual
 */
export const generarLineasConteo = async (
  conteoId: number,
  companyId: string,
  almacenId?: number
): Promise<number> => {
  // Obtener productos con stock en el almacén
  const stockQuery = supabase
    .from('movimientos_inventario_erp')
    .select('producto_id, almacen_id, tipo, cantidad');

  if (almacenId) {
    stockQuery.eq('almacen_id', almacenId);
  }

  const { data: movimientos, error: movError } = await stockQuery;
  if (movError) throw movError;

  // Calcular stock por producto/almacén
  const stockMap: Record<string, number> = {};
  (movimientos || []).forEach(m => {
    const key = `${m.producto_id}-${m.almacen_id}`;
    if (!stockMap[key]) stockMap[key] = 0;
    if (m.tipo === 'entrada' || m.tipo === 'ajuste') {
      stockMap[key] += m.cantidad;
    } else if (m.tipo === 'salida') {
      stockMap[key] -= m.cantidad;
    }
  });

  // Crear líneas de conteo
  const lineas = Object.entries(stockMap)
    .filter(([_, stock]) => stock > 0)
    .map(([key, stock]) => {
      const [productoId] = key.split('-');
      return {
        conteo_id: conteoId,
        producto_id: parseInt(productoId),
        cantidad_sistema: stock,
        estado: 'pendiente' as EstadoLineaConteo,
      };
    });

  if (lineas.length === 0) {
    return 0;
  }

  const { error: insertError } = await supabase
    .from('conteos_inventario_detalle_erp')
    .insert(lineas);

  if (insertError) throw insertError;

  // Actualizar totales del conteo
  await supabase
    .from('conteos_inventario_erp')
    .update({ total_productos: lineas.length })
    .eq('id', conteoId);

  return lineas.length;
};

/**
 * Iniciar conteo
 */
export const iniciarConteo = async (conteoId: number): Promise<ConteoInventario> => {
  const { data, error } = await supabase
    .from('conteos_inventario_erp')
    .update({
      estado: 'en_proceso',
      fecha_inicio: new Date().toISOString(),
    })
    .eq('id', conteoId)
    .select()
    .single();

  if (error) throw error;
  return data;
};

/**
 * Registrar conteo de una línea
 */
export const registrarConteoLinea = async (
  detalleId: number,
  cantidadContada: number,
  userId?: string,
  observaciones?: string
): Promise<ConteoInventarioDetalle> => {
  const { data, error } = await supabase
    .from('conteos_inventario_detalle_erp')
    .update({
      cantidad_contada: cantidadContada,
      estado: 'contado',
      contado_por: userId,
      fecha_conteo: new Date().toISOString(),
      observaciones: observaciones,
    })
    .eq('id', detalleId)
    .select()
    .single();

  if (error) throw error;

  // Actualizar contador del conteo padre
  await actualizarTotalesConteo(data.conteo_id);

  return data;
};

/**
 * Actualizar totales del conteo
 */
const actualizarTotalesConteo = async (conteoId: number): Promise<void> => {
  const { data: detalles } = await supabase
    .from('conteos_inventario_detalle_erp')
    .select('estado, cantidad_sistema, cantidad_contada')
    .eq('conteo_id', conteoId);

  const totales = {
    productos_contados: detalles?.filter(d => d.estado !== 'pendiente').length || 0,
    productos_con_diferencia: detalles?.filter(d => 
      d.cantidad_contada !== null && d.cantidad_contada !== d.cantidad_sistema
    ).length || 0,
  };

  await supabase
    .from('conteos_inventario_erp')
    .update(totales)
    .eq('id', conteoId);
};

/**
 * Finalizar conteo
 */
export const finalizarConteo = async (conteoId: number): Promise<ConteoInventario> => {
  // Verificar que todas las líneas estén contadas
  const { data: pendientes } = await supabase
    .from('conteos_inventario_detalle_erp')
    .select('id')
    .eq('conteo_id', conteoId)
    .eq('estado', 'pendiente');

  if (pendientes && pendientes.length > 0) {
    throw new Error(`Hay ${pendientes.length} productos sin contar`);
  }

  const { data, error } = await supabase
    .from('conteos_inventario_erp')
    .update({
      estado: 'completado',
      fecha_fin: new Date().toISOString(),
    })
    .eq('id', conteoId)
    .select()
    .single();

  if (error) throw error;
  return data;
};

/**
 * Aplicar ajustes de inventario basados en el conteo
 */
export const aplicarAjustesConteo = async (
  conteoId: number,
  userId?: string
): Promise<{ ajustes: number; errores: string[] }> => {
  const conteo = await fetchConteoById(conteoId);
  if (!conteo) throw new Error('Conteo no encontrado');
  if (conteo.estado !== 'completado') {
    throw new Error('El conteo debe estar completado para aplicar ajustes');
  }

  let ajustesAplicados = 0;
  const errores: string[] = [];

  for (const detalle of conteo.detalles || []) {
    if (detalle.cantidad_contada === null) continue;
    if (detalle.cantidad_contada === detalle.cantidad_sistema) continue;
    if (detalle.ajuste_aplicado) continue;

    const diferencia = detalle.cantidad_contada - detalle.cantidad_sistema;
    
    try {
      // Crear movimiento de ajuste
      const { data: movimiento, error: movError } = await supabase
        .from('movimientos_inventario_erp')
        .insert([{
          producto_id: detalle.producto_id,
          almacen_id: conteo.almacen_id,
          tipo: 'ajuste',
          cantidad: diferencia,
          referencia: `CONTEO-${conteo.numero_conteo}`,
          concepto: `Ajuste por conteo físico. Diferencia: ${diferencia}`,
        }])
        .select('id')
        .single();

      if (movError) throw movError;

      // Marcar línea como ajustada
      await supabase
        .from('conteos_inventario_detalle_erp')
        .update({
          estado: 'ajustado',
          ajuste_aplicado: true,
          movimiento_ajuste_id: movimiento.id,
        })
        .eq('id', detalle.id);

      ajustesAplicados++;
    } catch (e: any) {
      errores.push(`Producto ${detalle.producto_id}: ${e.message}`);
    }
  }

  return { ajustes: ajustesAplicados, errores };
};

/**
 * Cancelar conteo
 */
export const cancelarConteo = async (
  conteoId: number,
  motivo?: string
): Promise<ConteoInventario> => {
  const { data, error } = await supabase
    .from('conteos_inventario_erp')
    .update({
      estado: 'cancelado',
      observaciones: motivo ? `[CANCELADO] ${motivo}` : '[CANCELADO]',
    })
    .eq('id', conteoId)
    .select()
    .single();

  if (error) throw error;
  return data;
};

/**
 * Obtener resumen de diferencias del conteo
 */
export const getResumenDiferenciasConteo = async (conteoId: number) => {
  const { data: detalles, error } = await supabase
    .from('conteos_inventario_detalle_erp')
    .select(`
      *,
      producto:productos_erp(id, nombre, clave, costo)
    `)
    .eq('conteo_id', conteoId)
    .not('cantidad_contada', 'is', null);

  if (error) throw error;

  const conDiferencia = (detalles || []).filter(
    d => d.cantidad_contada !== d.cantidad_sistema
  );

  let valorDiferenciasPositivas = 0;
  let valorDiferenciasNegativas = 0;

  conDiferencia.forEach(d => {
    const diferencia = (d.cantidad_contada || 0) - d.cantidad_sistema;
    const valor = diferencia * (d.producto?.costo || 0);
    
    if (diferencia > 0) {
      valorDiferenciasPositivas += valor;
    } else {
      valorDiferenciasNegativas += Math.abs(valor);
    }
  });

  return {
    total_lineas: detalles?.length || 0,
    con_diferencia: conDiferencia.length,
    sin_diferencia: (detalles?.length || 0) - conDiferencia.length,
    diferencias_positivas: conDiferencia.filter(d => (d.cantidad_contada || 0) > d.cantidad_sistema).length,
    diferencias_negativas: conDiferencia.filter(d => (d.cantidad_contada || 0) < d.cantidad_sistema).length,
    valor_diferencias_positivas: valorDiferenciasPositivas,
    valor_diferencias_negativas: valorDiferenciasNegativas,
    valor_neto: valorDiferenciasPositivas - valorDiferenciasNegativas,
    detalle_diferencias: conDiferencia.map(d => ({
      producto_id: d.producto_id,
      producto_nombre: d.producto?.nombre,
      producto_clave: d.producto?.clave,
      cantidad_sistema: d.cantidad_sistema,
      cantidad_contada: d.cantidad_contada,
      diferencia: (d.cantidad_contada || 0) - d.cantidad_sistema,
      valor_diferencia: ((d.cantidad_contada || 0) - d.cantidad_sistema) * (d.producto?.costo || 0),
    })),
  };
};

/**
 * Estadísticas de conteos
 */
export const getEstadisticasConteos = async (companyId: string) => {
  const { data, error } = await supabase
    .from('conteos_inventario_erp')
    .select('estado, productos_con_diferencia')
    .eq('company_id', companyId);

  if (error) throw error;

  return {
    total: data?.length || 0,
    programados: data?.filter(c => c.estado === 'programado').length || 0,
    en_proceso: data?.filter(c => c.estado === 'en_proceso').length || 0,
    completados: data?.filter(c => c.estado === 'completado').length || 0,
    cancelados: data?.filter(c => c.estado === 'cancelado').length || 0,
    con_diferencias: data?.filter(c => c.productos_con_diferencia > 0).length || 0,
  };
};
