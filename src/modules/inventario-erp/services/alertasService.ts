import { supabase } from '../../../core/config/supabase';
import type {
  AlertaInventario,
  TipoAlerta,
  PrioridadAlerta,
  EstadoAlerta,
} from '../types';

// ============================================================================
// ALERTAS DE INVENTARIO
// ============================================================================

/**
 * Obtener todas las alertas
 */
export const fetchAlertas = async (
  companyId: string,
  options?: {
    tipo?: TipoAlerta;
    estado?: EstadoAlerta;
    prioridad?: PrioridadAlerta;
    soloActivas?: boolean;
  }
): Promise<AlertaInventario[]> => {
  let query = supabase
    .from('alertas_inventario_erp')
    .select(`
      *,
      producto:productos_erp(id, nombre, clave),
      lote:lotes_inventario_erp(id, numero_lote, fecha_caducidad)
    `)
    .eq('company_id', companyId)
    .order('prioridad', { ascending: false })
    .order('fecha_alerta', { ascending: false });

  if (options?.tipo) {
    query = query.eq('tipo', options.tipo);
  }
  if (options?.estado) {
    query = query.eq('estado', options.estado);
  }
  if (options?.prioridad) {
    query = query.eq('prioridad', options.prioridad);
  }
  if (options?.soloActivas) {
    query = query.eq('estado', 'activa');
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
};

/**
 * Obtener conteo de alertas activas por prioridad
 */
// Alias para compatibilidad
export const getEstadisticasAlertas = async (companyId: string) => getConteoAlertas(companyId);

export const getConteoAlertas = async (companyId: string) => {
  const { data, error } = await supabase
    .from('alertas_inventario_erp')
    .select('prioridad, tipo')
    .eq('company_id', companyId)
    .eq('estado', 'activa');

  if (error) throw error;

  return {
    total: data?.length || 0,
    criticas: data?.filter(a => a.prioridad === 'critica').length || 0,
    altas: data?.filter(a => a.prioridad === 'alta').length || 0,
    medias: data?.filter(a => a.prioridad === 'media').length || 0,
    bajas: data?.filter(a => a.prioridad === 'baja').length || 0,
    por_tipo: {
      stock_bajo: data?.filter(a => a.tipo === 'stock_bajo').length || 0,
      lote_vencer: data?.filter(a => a.tipo === 'lote_vencer').length || 0,
      conteo_pendiente: data?.filter(a => a.tipo === 'conteo_pendiente').length || 0,
      reserva_vencida: data?.filter(a => a.tipo === 'reserva_vencida').length || 0,
    },
  };
};

/**
 * Crear alerta manualmente
 */
export const createAlerta = async (
  alerta: {
    tipo: TipoAlerta;
    titulo: string;
    mensaje?: string;
    prioridad?: PrioridadAlerta;
    producto_id?: number;
    lote_id?: number;
    conteo_id?: number;
    reserva_id?: number;
    fecha_vencimiento?: string;
  },
  companyId: string
): Promise<AlertaInventario> => {
  const { data, error } = await supabase
    .from('alertas_inventario_erp')
    .insert([{
      ...alerta,
      prioridad: alerta.prioridad || 'media',
      estado: 'activa',
      company_id: companyId,
    }])
    .select()
    .single();

  if (error) throw error;
  return data;
};

/**
 * Marcar alerta como leída
 */
export const marcarAlertaLeida = async (alertaId: number): Promise<void> => {
  const { error } = await supabase
    .from('alertas_inventario_erp')
    .update({
      estado: 'leida',
      fecha_lectura: new Date().toISOString(),
    })
    .eq('id', alertaId);

  if (error) throw error;
};

/**
 * Resolver alerta
 */
export const resolverAlerta = async (
  alertaId: number,
  userId?: string
): Promise<void> => {
  const { error } = await supabase
    .from('alertas_inventario_erp')
    .update({
      estado: 'resuelta',
      fecha_resolucion: new Date().toISOString(),
      resuelta_por: userId,
    })
    .eq('id', alertaId);

  if (error) throw error;
};

/**
 * Ignorar alerta
 */
export const ignorarAlerta = async (alertaId: number): Promise<void> => {
  const { error } = await supabase
    .from('alertas_inventario_erp')
    .update({ estado: 'ignorada' })
    .eq('id', alertaId);

  if (error) throw error;
};

/**
 * Generar alertas de stock bajo
 */
export const generarAlertasStockBajo = async (companyId: string): Promise<number> => {
  // Obtener productos con stock bajo
  const { data: productos } = await supabase
    .from('productos_erp')
    .select('id, nombre, clave, stock_minimo')
    .eq('company_id', companyId)
    .eq('activo', true)
    .gt('stock_minimo', 0);

  if (!productos || productos.length === 0) return 0;

  let alertasCreadas = 0;

  for (const producto of productos) {
    // Calcular stock actual
    const { data: movimientos } = await supabase
      .from('movimientos_inventario_erp')
      .select('tipo, cantidad')
      .eq('producto_id', producto.id);

    let stockActual = 0;
    (movimientos || []).forEach(m => {
      if (m.tipo === 'entrada' || m.tipo === 'ajuste') {
        stockActual += m.cantidad;
      } else if (m.tipo === 'salida') {
        stockActual -= m.cantidad;
      }
    });

    if (stockActual < producto.stock_minimo) {
      // Verificar si ya existe alerta activa
      const { data: alertaExistente } = await supabase
        .from('alertas_inventario_erp')
        .select('id')
        .eq('producto_id', producto.id)
        .eq('tipo', 'stock_bajo')
        .eq('estado', 'activa')
        .single();

      if (!alertaExistente) {
        const prioridad: PrioridadAlerta = stockActual <= 0 ? 'critica' : 'alta';
        
        await createAlerta({
          tipo: 'stock_bajo',
          titulo: `Stock bajo: ${producto.nombre}`,
          mensaje: `El producto "${producto.clave || producto.nombre}" tiene ${stockActual} unidades (mínimo: ${producto.stock_minimo})`,
          prioridad,
          producto_id: producto.id,
        }, companyId);
        
        alertasCreadas++;
      }
    }
  }

  return alertasCreadas;
};

/**
 * Generar alertas de lotes por vencer
 */
export const generarAlertasLotesVencer = async (
  companyId: string,
  diasAnticipacion: number = 30
): Promise<number> => {
  const fechaLimite = new Date();
  fechaLimite.setDate(fechaLimite.getDate() + diasAnticipacion);

  const { data: lotes } = await supabase
    .from('lotes_inventario_erp')
    .select(`
      id, numero_lote, fecha_caducidad, cantidad_actual,
      producto:productos_erp(id, nombre, clave)
    `)
    .eq('company_id', companyId)
    .eq('estado', 'activo')
    .gt('cantidad_actual', 0)
    .not('fecha_caducidad', 'is', null)
    .lte('fecha_caducidad', fechaLimite.toISOString().split('T')[0]);

  if (!lotes || lotes.length === 0) return 0;

  let alertasCreadas = 0;
  const hoy = new Date();

  for (const lote of lotes) {
    // Verificar si ya existe alerta activa
    const { data: alertaExistente } = await supabase
      .from('alertas_inventario_erp')
      .select('id')
      .eq('lote_id', lote.id)
      .eq('tipo', 'lote_vencer')
      .eq('estado', 'activa')
      .single();

    if (!alertaExistente) {
      const fechaCaducidad = new Date(lote.fecha_caducidad!);
      const diasParaVencer = Math.ceil((fechaCaducidad.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
      
      let prioridad: PrioridadAlerta = 'media';
      if (diasParaVencer <= 0) prioridad = 'critica';
      else if (diasParaVencer <= 7) prioridad = 'alta';
      else if (diasParaVencer <= 15) prioridad = 'media';
      else prioridad = 'baja';

      await createAlerta({
        tipo: 'lote_vencer',
        titulo: diasParaVencer <= 0 
          ? `Lote VENCIDO: ${lote.numero_lote}`
          : `Lote por vencer: ${lote.numero_lote}`,
        mensaje: `El lote "${lote.numero_lote}" del producto "${(lote.producto as any)?.nombre}" ${
          diasParaVencer <= 0 
            ? 'está VENCIDO' 
            : `vence en ${diasParaVencer} días`
        }. Cantidad: ${lote.cantidad_actual}`,
        prioridad,
        lote_id: lote.id,
        producto_id: (lote.producto as any)?.id,
        fecha_vencimiento: lote.fecha_caducidad,
      }, companyId);
      
      alertasCreadas++;
    }
  }

  return alertasCreadas;
};

/**
 * Generar alertas de reservas vencidas (no entregadas a tiempo)
 */
export const generarAlertasReservasVencidas = async (companyId: string): Promise<number> => {
  const hoy = new Date().toISOString().split('T')[0];

  const { data: reservas } = await supabase
    .from('reservas_stock_erp')
    .select(`
      id, fecha_necesidad, cantidad_reservada, cantidad_entregada,
      evento:eventos_erp(id, nombre_proyecto),
      producto:productos_erp(id, nombre, clave)
    `)
    .eq('company_id', companyId)
    .in('estado', ['activa', 'parcial'])
    .lt('fecha_necesidad', hoy);

  if (!reservas || reservas.length === 0) return 0;

  let alertasCreadas = 0;

  for (const reserva of reservas) {
    // Verificar si ya existe alerta activa
    const { data: alertaExistente } = await supabase
      .from('alertas_inventario_erp')
      .select('id')
      .eq('reserva_id', reserva.id)
      .eq('tipo', 'reserva_vencida')
      .eq('estado', 'activa')
      .single();

    if (!alertaExistente) {
      const pendiente = reserva.cantidad_reservada - reserva.cantidad_entregada;
      
      await createAlerta({
        tipo: 'reserva_vencida',
        titulo: `Reserva vencida: ${(reserva.producto as any)?.nombre}`,
        mensaje: `La reserva para el evento "${(reserva.evento as any)?.nombre_proyecto}" tiene ${pendiente} unidades pendientes de entregar. Fecha de necesidad: ${reserva.fecha_necesidad}`,
        prioridad: 'alta',
        reserva_id: reserva.id,
        producto_id: (reserva.producto as any)?.id,
      }, companyId);
      
      alertasCreadas++;
    }
  }

  return alertasCreadas;
};

/**
 * Ejecutar todas las generaciones de alertas
 */
export const ejecutarGeneracionAlertas = async (companyId: string): Promise<{
  stock_bajo: number;
  lotes_vencer: number;
  reservas_vencidas: number;
  total: number;
}> => {
  const [stockBajo, lotesVencer, reservasVencidas] = await Promise.all([
    generarAlertasStockBajo(companyId),
    generarAlertasLotesVencer(companyId),
    generarAlertasReservasVencidas(companyId),
  ]);

  return {
    stock_bajo: stockBajo,
    lotes_vencer: lotesVencer,
    reservas_vencidas: reservasVencidas,
    total: stockBajo + lotesVencer + reservasVencidas,
  };
};

/**
 * Limpiar alertas resueltas antiguas
 */
export const limpiarAlertasAntiguas = async (
  companyId: string,
  diasAntiguedad: number = 30
): Promise<number> => {
  const fechaLimite = new Date();
  fechaLimite.setDate(fechaLimite.getDate() - diasAntiguedad);

  const { data, error } = await supabase
    .from('alertas_inventario_erp')
    .delete()
    .eq('company_id', companyId)
    .in('estado', ['resuelta', 'ignorada'])
    .lt('fecha_alerta', fechaLimite.toISOString())
    .select('id');

  if (error) throw error;
  return data?.length || 0;
};

// ============================================================================
// ALIAS PARA COMPATIBILIDAD CON PÁGINAS
// ============================================================================

/** Alias de marcarAlertaLeida */
export const marcarAlertaComoLeida = marcarAlertaLeida;

/** Alias de resolverAlerta */
export const marcarAlertaResuelta = resolverAlerta;

/** Alias de ignorarAlerta */
export const descartarAlerta = ignorarAlerta;

/** Alias de ejecutarGeneracionAlertas */
export const generarAlertasAutomaticas = ejecutarGeneracionAlertas;
