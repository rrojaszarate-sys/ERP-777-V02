import { supabase } from '../../../core/config/supabase';
import type {
  ChecklistEventoInventario,
  ChecklistEventoDetalle,
  TipoChecklist,
  EstadoChecklist,
  EstadoItemChecklist,
  FotoChecklist,
} from '../types';

// ============================================================================
// CHECKLIST DE INVENTARIO PARA EVENTOS
// ============================================================================

/**
 * Obtener todos los checklists
 */
export const fetchChecklists = async (
  companyId: string,
  options?: {
    eventoId?: number;
    tipo?: TipoChecklist;
    estado?: EstadoChecklist;
  }
): Promise<ChecklistEventoInventario[]> => {
  let query = supabase
    .from('checklist_evento_inventario_erp')
    .select(`
      *,
      evento:eventos_erp(id, nombre_proyecto, fecha_evento)
    `)
    .eq('company_id', companyId)
    .order('fecha_programada', { ascending: false });

  if (options?.eventoId) {
    query = query.eq('evento_id', options.eventoId);
  }
  if (options?.tipo) {
    query = query.eq('tipo', options.tipo);
  }
  if (options?.estado) {
    query = query.eq('estado', options.estado);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
};

/**
 * Obtener un checklist con sus detalles
 */
export const fetchChecklistById = async (id: number): Promise<ChecklistEventoInventario | null> => {
  const { data: checklist, error: checklistError } = await supabase
    .from('checklist_evento_inventario_erp')
    .select(`
      *,
      evento:eventos_erp(id, nombre_proyecto, fecha_evento)
    `)
    .eq('id', id)
    .single();

  if (checklistError) {
    if (checklistError.code === 'PGRST116') return null;
    throw checklistError;
  }
  if (!checklist) return null;

  // Obtener detalles
  const { data: detalles, error: detError } = await supabase
    .from('checklist_evento_detalle_erp')
    .select(`
      *,
      producto:productos_erp(id, nombre, clave, unidad, costo),
      numero_serie:numeros_serie_erp(id, numero_serie)
    `)
    .eq('checklist_id', id)
    .order('id', { ascending: true });

  if (detError) {
    console.error('Error cargando detalles del checklist:', detError);
  }

  return {
    ...checklist,
    detalles: detalles || [],
  };
};

/**
 * Crear checklist a partir de reservas del evento
 */
export const crearChecklistDesdeReservas = async (
  eventoId: number,
  tipo: TipoChecklist,
  fechaProgramada: string,
  companyId: string
): Promise<ChecklistEventoInventario> => {
  // Obtener reservas del evento
  const { data: reservas, error: resError } = await supabase
    .from('reservas_stock_erp')
    .select('producto_id, cantidad_reservada, cantidad_entregada, cantidad_devuelta')
    .eq('evento_id', eventoId)
    .neq('estado', 'cancelada');

  if (resError) throw resError;

  // Crear checklist principal
  const { data: checklist, error: checklistError } = await supabase
    .from('checklist_evento_inventario_erp')
    .insert([{
      evento_id: eventoId,
      tipo,
      estado: 'pendiente',
      fecha_programada: fechaProgramada,
      total_productos: reservas?.length || 0,
      company_id: companyId,
    }])
    .select()
    .single();

  if (checklistError) throw checklistError;

  // Crear detalles basados en reservas
  if (reservas && reservas.length > 0) {
    const detalles = reservas.map(r => ({
      checklist_id: checklist.id,
      producto_id: r.producto_id,
      cantidad_esperada: tipo === 'pre_evento' 
        ? r.cantidad_reservada 
        : r.cantidad_entregada - r.cantidad_devuelta,
      estado: 'pendiente',
    }));

    const { error: detError } = await supabase
      .from('checklist_evento_detalle_erp')
      .insert(detalles);

    if (detError) {
      // Rollback
      await supabase.from('checklist_evento_inventario_erp').delete().eq('id', checklist.id);
      throw detError;
    }
  }

  return (await fetchChecklistById(checklist.id))!;
};

/**
 * Iniciar checklist
 */
export const iniciarChecklist = async (checklistId: number): Promise<ChecklistEventoInventario> => {
  const { data, error } = await supabase
    .from('checklist_evento_inventario_erp')
    .update({
      estado: 'en_proceso',
      fecha_inicio: new Date().toISOString(),
    })
    .eq('id', checklistId)
    .select()
    .single();

  if (error) throw error;
  return data;
};

/**
 * Registrar verificación de item
 */
export const verificarItemChecklist = async (
  detalleId: number,
  datos: {
    cantidad_verificada: number;
    cantidad_dañada?: number;
    tipo_daño?: string;
    descripcion_daño?: string;
    foto_daño?: string;
    costo_reposicion?: number;
    notas?: string;
  },
  userId?: string
): Promise<ChecklistEventoDetalle> => {
  const cantidadFaltante = datos.cantidad_verificada < 0 ? 0 : 0; // Se calcula en BD
  const estado = datos.cantidad_dañada && datos.cantidad_dañada > 0 
    ? 'con_novedad' 
    : 'verificado';

  const { data, error } = await supabase
    .from('checklist_evento_detalle_erp')
    .update({
      cantidad_verificada: datos.cantidad_verificada,
      cantidad_dañada: datos.cantidad_dañada || 0,
      cantidad_faltante: datos.cantidad_verificada, // Calculado después
      estado,
      tipo_daño: datos.tipo_daño,
      descripcion_daño: datos.descripcion_daño,
      foto_daño: datos.foto_daño,
      costo_reposicion: datos.costo_reposicion,
      notas: datos.notas,
      verificado_por: userId,
      fecha_verificacion: new Date().toISOString(),
    })
    .eq('id', detalleId)
    .select()
    .single();

  if (error) throw error;

  // Actualizar cantidad faltante correctamente
  const detalle = await supabase
    .from('checklist_evento_detalle_erp')
    .select('cantidad_esperada')
    .eq('id', detalleId)
    .single();

  if (detalle.data) {
    const faltante = Math.max(0, detalle.data.cantidad_esperada - datos.cantidad_verificada);
    await supabase
      .from('checklist_evento_detalle_erp')
      .update({ cantidad_faltante: faltante })
      .eq('id', detalleId);
  }

  // Actualizar totales del checklist
  await actualizarTotalesChecklist(data.checklist_id);

  return data;
};

/**
 * Actualizar totales del checklist
 */
const actualizarTotalesChecklist = async (checklistId: number): Promise<void> => {
  const { data: detalles } = await supabase
    .from('checklist_evento_detalle_erp')
    .select('estado, cantidad_dañada, cantidad_faltante')
    .eq('checklist_id', checklistId);

  const totales = {
    total_verificados: detalles?.filter(d => d.estado !== 'pendiente').length || 0,
    total_con_daño: detalles?.filter(d => (d.cantidad_dañada || 0) > 0).length || 0,
    total_faltantes: detalles?.filter(d => (d.cantidad_faltante || 0) > 0).length || 0,
  };

  await supabase
    .from('checklist_evento_inventario_erp')
    .update(totales)
    .eq('id', checklistId);
};

/**
 * Agregar foto al checklist
 */
export const agregarFotoChecklist = async (
  checklistId: number,
  tipo: 'carga' | 'descarga',
  foto: FotoChecklist
): Promise<void> => {
  const campo = tipo === 'carga' ? 'fotos_carga' : 'fotos_descarga';
  
  // Obtener fotos actuales
  const { data: checklist } = await supabase
    .from('checklist_evento_inventario_erp')
    .select(campo)
    .eq('id', checklistId)
    .single();

  const fotosActuales = (checklist as any)?.[campo] || [];
  
  const { error } = await supabase
    .from('checklist_evento_inventario_erp')
    .update({ [campo]: [...fotosActuales, foto] })
    .eq('id', checklistId);

  if (error) throw error;
};

/**
 * Registrar firmas del checklist
 */
export const registrarFirmasChecklist = async (
  checklistId: number,
  firmas: {
    nombre_entrega?: string;
    firma_entrega?: string;
    nombre_recibe?: string;
    firma_recibe?: string;
  }
): Promise<ChecklistEventoInventario> => {
  const { data, error } = await supabase
    .from('checklist_evento_inventario_erp')
    .update(firmas)
    .eq('id', checklistId)
    .select()
    .single();

  if (error) throw error;
  return data;
};

/**
 * Finalizar checklist
 */
export const finalizarChecklist = async (checklistId: number): Promise<ChecklistEventoInventario> => {
  // Verificar que todos los items estén verificados
  const { data: pendientes } = await supabase
    .from('checklist_evento_detalle_erp')
    .select('id')
    .eq('checklist_id', checklistId)
    .eq('estado', 'pendiente');

  if (pendientes && pendientes.length > 0) {
    throw new Error(`Hay ${pendientes.length} productos sin verificar`);
  }

  const { data, error } = await supabase
    .from('checklist_evento_inventario_erp')
    .update({
      estado: 'completado',
      fecha_fin: new Date().toISOString(),
    })
    .eq('id', checklistId)
    .select()
    .single();

  if (error) throw error;
  return data;
};

/**
 * Obtener resumen de daños del checklist
 */
export const getResumenDañosChecklist = async (checklistId: number) => {
  const { data: detalles, error } = await supabase
    .from('checklist_evento_detalle_erp')
    .select(`
      *,
      producto:productos_erp(id, nombre, clave, costo)
    `)
    .eq('checklist_id', checklistId)
    .or('cantidad_dañada.gt.0,cantidad_faltante.gt.0');

  if (error) throw error;

  const costoTotalDaños = (detalles || []).reduce(
    (sum, d) => sum + ((d.costo_reposicion || 0)),
    0
  );

  const costoTotalFaltantes = (detalles || []).reduce(
    (sum, d) => sum + ((d.cantidad_faltante || 0) * (d.producto?.costo || 0)),
    0
  );

  return {
    items_con_daño: detalles?.filter(d => (d.cantidad_dañada || 0) > 0) || [],
    items_faltantes: detalles?.filter(d => (d.cantidad_faltante || 0) > 0) || [],
    total_unidades_dañadas: detalles?.reduce((sum, d) => sum + (d.cantidad_dañada || 0), 0) || 0,
    total_unidades_faltantes: detalles?.reduce((sum, d) => sum + (d.cantidad_faltante || 0), 0) || 0,
    costo_total_daños: costoTotalDaños,
    costo_total_faltantes: costoTotalFaltantes,
    costo_total: costoTotalDaños + costoTotalFaltantes,
  };
};

/**
 * Generar movimientos de inventario desde checklist post-evento
 */
export const generarMovimientosDesdeChecklist = async (
  checklistId: number,
  almacenId: number
): Promise<{ movimientos: number; errores: string[] }> => {
  const checklist = await fetchChecklistById(checklistId);
  if (!checklist) throw new Error('Checklist no encontrado');
  if (checklist.tipo !== 'post_evento') {
    throw new Error('Solo se pueden generar movimientos desde checklist post-evento');
  }
  if (checklist.estado !== 'completado') {
    throw new Error('El checklist debe estar completado');
  }

  let movimientos = 0;
  const errores: string[] = [];

  for (const detalle of checklist.detalles || []) {
    try {
      // Generar entrada por devolución
      if (detalle.cantidad_verificada > 0) {
        await supabase
          .from('movimientos_inventario_erp')
          .insert([{
            producto_id: detalle.producto_id,
            almacen_id: almacenId,
            tipo: 'entrada',
            cantidad: detalle.cantidad_verificada - (detalle.cantidad_dañada || 0),
            referencia: `CHECKLIST-${checklistId}`,
            concepto: `Devolución post-evento`,
          }]);
        movimientos++;
      }

      // Si hay daños, registrar como ajuste negativo
      if (detalle.cantidad_dañada && detalle.cantidad_dañada > 0) {
        await supabase
          .from('movimientos_inventario_erp')
          .insert([{
            producto_id: detalle.producto_id,
            almacen_id: almacenId,
            tipo: 'ajuste',
            cantidad: -detalle.cantidad_dañada,
            referencia: `CHECKLIST-${checklistId}-DAÑO`,
            concepto: `Baja por daño: ${detalle.tipo_daño || 'Sin especificar'}`,
          }]);
        movimientos++;
      }
    } catch (e: any) {
      errores.push(`Producto ${detalle.producto_id}: ${e.message}`);
    }
  }

  return { movimientos, errores };
};

/**
 * Obtener checklists pendientes
 */
// Alias para compatibilidad
export const getChecklistsPendientes = (companyId: string, dias?: number) =>
  fetchChecklistsPendientes(companyId, dias);

export const fetchChecklistsPendientes = async (
  companyId: string,
  dias: number = 7
): Promise<ChecklistEventoInventario[]> => {
  const hoy = new Date();
  const limite = new Date();
  limite.setDate(limite.getDate() + dias);

  const { data, error } = await supabase
    .from('checklist_evento_inventario_erp')
    .select(`
      *,
      evento:eventos_erp(id, nombre_proyecto, fecha_evento)
    `)
    .eq('company_id', companyId)
    .in('estado', ['pendiente', 'en_proceso'])
    .gte('fecha_programada', hoy.toISOString().split('T')[0])
    .lte('fecha_programada', limite.toISOString().split('T')[0])
    .order('fecha_programada', { ascending: true });

  if (error) throw error;
  return data || [];
};

/**
 * Estadísticas de checklists
 */
export const getEstadisticasChecklists = async (companyId: string) => {
  const { data, error } = await supabase
    .from('checklist_evento_inventario_erp')
    .select('tipo, estado, total_con_daño, total_faltantes')
    .eq('company_id', companyId);

  if (error) throw error;

  return {
    total: data?.length || 0,
    pre_evento: data?.filter(c => c.tipo === 'pre_evento').length || 0,
    post_evento: data?.filter(c => c.tipo === 'post_evento').length || 0,
    pendientes: data?.filter(c => c.estado === 'pendiente').length || 0,
    en_proceso: data?.filter(c => c.estado === 'en_proceso').length || 0,
    completados: data?.filter(c => c.estado === 'completado').length || 0,
    con_daños: data?.filter(c => (c.total_con_daño || 0) > 0).length || 0,
    con_faltantes: data?.filter(c => (c.total_faltantes || 0) > 0).length || 0,
  };
};

/**
 * Obtener checklist con detalles (alias de fetchChecklistById para compatibilidad)
 */
export const fetchChecklistConDetalle = fetchChecklistById;

/**
 * Actualizar estado de un checklist
 */
export const actualizarEstadoChecklist = async (
  checklistId: number,
  nuevoEstado: EstadoChecklist,
  userId?: string
): Promise<ChecklistEventoInventario> => {
  const updateData: Record<string, unknown> = {
    estado: nuevoEstado,
  };

  // Agregar timestamps según el estado
  if (nuevoEstado === 'en_proceso') {
    updateData.fecha_inicio = new Date().toISOString();
  } else if (nuevoEstado === 'completado') {
    updateData.fecha_completado = new Date().toISOString();
    if (userId) {
      updateData.completado_por = userId;
    }
  }

  const { data, error } = await supabase
    .from('checklist_evento_inventario_erp')
    .update(updateData)
    .eq('id', checklistId)
    .select()
    .single();

  if (error) throw error;
  return data;
};

/**
 * Actualizar item de checklist
 */
export const actualizarItemChecklist = async (
  detalleId: number,
  datos: {
    estado?: EstadoItemChecklist;
    cantidad_verificada?: number;
    cantidad_dañada?: number;
    tipo_daño?: string;
    descripcion_daño?: string;
    notas?: string;
    verificado_por?: string;
    fecha_verificacion?: string;
  }
): Promise<ChecklistEventoDetalle> => {
  const { data, error } = await supabase
    .from('checklist_evento_detalle_erp')
    .update({
      ...datos,
      fecha_verificacion: datos.fecha_verificacion || new Date().toISOString(),
    })
    .eq('id', detalleId)
    .select()
    .single();

  if (error) throw error;
  return data;
};
