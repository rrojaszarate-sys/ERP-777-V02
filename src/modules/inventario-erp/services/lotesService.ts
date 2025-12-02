import { supabase } from '../../../core/config/supabase';
import type {
  LoteInventario,
  EstadoLote,
} from '../types';

// ============================================================================
// LOTES DE INVENTARIO
// ============================================================================

/**
 * Obtener todos los lotes
 */
export const fetchLotes = async (
  companyId: string,
  options?: {
    productoId?: number;
    almacenId?: number;
    estado?: EstadoLote;
    soloConStock?: boolean;
    proximosAVencer?: number; // días
  }
): Promise<LoteInventario[]> => {
  let query = supabase
    .from('lotes_inventario_erp')
    .select(`
      *,
      producto:productos_erp(id, nombre, clave, unidad),
      almacen:almacenes_erp(id, nombre, codigo),
      ubicacion:ubicaciones_almacen_erp(id, codigo, nombre),
      proveedor:proveedores_erp(id, nombre)
    `)
    .eq('company_id', companyId)
    .order('fecha_caducidad', { ascending: true, nullsFirst: false });

  if (options?.productoId) {
    query = query.eq('producto_id', options.productoId);
  }
  if (options?.almacenId) {
    query = query.eq('almacen_id', options.almacenId);
  }
  if (options?.estado) {
    query = query.eq('estado', options.estado);
  }
  if (options?.soloConStock) {
    query = query.gt('cantidad_actual', 0);
  }
  if (options?.proximosAVencer) {
    const fechaLimite = new Date();
    fechaLimite.setDate(fechaLimite.getDate() + options.proximosAVencer);
    query = query.lte('fecha_caducidad', fechaLimite.toISOString().split('T')[0]);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
};

/**
 * Obtener un lote por ID
 */
export const fetchLoteById = async (id: number): Promise<LoteInventario | null> => {
  const { data, error } = await supabase
    .from('lotes_inventario_erp')
    .select(`
      *,
      producto:productos_erp(id, nombre, clave, unidad),
      almacen:almacenes_erp(id, nombre, codigo),
      ubicacion:ubicaciones_almacen_erp(id, codigo, nombre),
      proveedor:proveedores_erp(id, nombre)
    `)
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return data;
};

/**
 * Crear nuevo lote
 */
export const createLote = async (
  lote: Partial<LoteInventario>,
  companyId: string,
  userId?: string
): Promise<LoteInventario> => {
  const { data, error } = await supabase
    .from('lotes_inventario_erp')
    .insert([{
      ...lote,
      cantidad_actual: lote.cantidad_inicial || 0,
      company_id: companyId,
      created_by: userId,
    }])
    .select()
    .single();

  if (error) throw error;
  return data;
};

/**
 * Actualizar lote
 */
export const updateLote = async (
  id: number,
  lote: Partial<LoteInventario>
): Promise<LoteInventario> => {
  const { data, error } = await supabase
    .from('lotes_inventario_erp')
    .update({
      ...lote,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
};

/**
 * Ajustar cantidad de lote
 */
export const ajustarCantidadLote = async (
  id: number,
  nuevaCantidad: number
): Promise<LoteInventario> => {
  const lote = await fetchLoteById(id);
  if (!lote) throw new Error('Lote no encontrado');

  // Determinar nuevo estado
  let nuevoEstado: EstadoLote = 'activo';
  if (nuevaCantidad <= 0) {
    nuevoEstado = 'agotado';
  } else if (lote.fecha_caducidad && new Date(lote.fecha_caducidad) < new Date()) {
    nuevoEstado = 'vencido';
  }

  return updateLote(id, {
    cantidad_actual: nuevaCantidad,
    estado: nuevoEstado,
  });
};

/**
 * Consumir cantidad de un lote (FIFO)
 */
export const consumirDeLote = async (
  id: number,
  cantidad: number
): Promise<LoteInventario> => {
  const lote = await fetchLoteById(id);
  if (!lote) throw new Error('Lote no encontrado');
  if (lote.cantidad_actual < cantidad) {
    throw new Error(`Stock insuficiente en lote. Disponible: ${lote.cantidad_actual}, Solicitado: ${cantidad}`);
  }

  return ajustarCantidadLote(id, lote.cantidad_actual - cantidad);
};

/**
 * Obtener lotes próximos a vencer
 */
export const fetchLotesProximosAVencer = async (
  companyId: string,
  dias: number = 30
): Promise<LoteInventario[]> => {
  const fechaLimite = new Date();
  fechaLimite.setDate(fechaLimite.getDate() + dias);

  const { data, error } = await supabase
    .from('lotes_inventario_erp')
    .select(`
      *,
      producto:productos_erp(id, nombre, clave),
      almacen:almacenes_erp(id, nombre)
    `)
    .eq('company_id', companyId)
    .eq('estado', 'activo')
    .gt('cantidad_actual', 0)
    .not('fecha_caducidad', 'is', null)
    .lte('fecha_caducidad', fechaLimite.toISOString().split('T')[0])
    .order('fecha_caducidad', { ascending: true });

  if (error) throw error;
  return data || [];
};

/**
 * Obtener el lote más antiguo con stock (FIFO)
 */
export const fetchLoteFIFO = async (
  productoId: number,
  almacenId: number,
  cantidadRequerida: number
): Promise<LoteInventario | null> => {
  const { data, error } = await supabase
    .from('lotes_inventario_erp')
    .select('*')
    .eq('producto_id', productoId)
    .eq('almacen_id', almacenId)
    .eq('estado', 'activo')
    .gte('cantidad_actual', cantidadRequerida)
    .order('fecha_ingreso', { ascending: true })
    .limit(1)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return data;
};

/**
 * Marcar lotes vencidos
 */
export const marcarLotesVencidos = async (companyId: string): Promise<number> => {
  const hoy = new Date().toISOString().split('T')[0];
  
  const { data, error } = await supabase
    .from('lotes_inventario_erp')
    .update({ estado: 'vencido' })
    .eq('company_id', companyId)
    .eq('estado', 'activo')
    .lt('fecha_caducidad', hoy)
    .select('id');

  if (error) throw error;
  return data?.length || 0;
};

/**
 * Generar número de lote automático
 */
export const generarNumeroLote = (
  productoCode: string,
  fecha?: Date
): string => {
  const f = fecha || new Date();
  const año = f.getFullYear().toString().slice(-2);
  const mes = (f.getMonth() + 1).toString().padStart(2, '0');
  const dia = f.getDate().toString().padStart(2, '0');
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  
  return `${productoCode}-${año}${mes}${dia}-${random}`;
};

/**
 * Buscar lote por número
 */
export const buscarLotePorNumero = async (
  numeroLote: string,
  companyId: string
): Promise<LoteInventario | null> => {
  const { data, error } = await supabase
    .from('lotes_inventario_erp')
    .select(`
      *,
      producto:productos_erp(id, nombre, clave),
      almacen:almacenes_erp(id, nombre)
    `)
    .eq('company_id', companyId)
    .eq('numero_lote', numeroLote)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return data;
};

/**
 * Estadísticas de lotes
 */
export const getEstadisticasLotes = async (companyId: string) => {
  const { data, error } = await supabase
    .from('lotes_inventario_erp')
    .select('estado, cantidad_actual')
    .eq('company_id', companyId);

  if (error) throw error;

  const hoy = new Date();
  const en30Dias = new Date();
  en30Dias.setDate(en30Dias.getDate() + 30);

  // Obtener lotes por vencer
  const { data: porVencer } = await supabase
    .from('lotes_inventario_erp')
    .select('id')
    .eq('company_id', companyId)
    .eq('estado', 'activo')
    .gt('cantidad_actual', 0)
    .lte('fecha_caducidad', en30Dias.toISOString().split('T')[0])
    .gte('fecha_caducidad', hoy.toISOString().split('T')[0]);

  return {
    total: data?.length || 0,
    activos: data?.filter(l => l.estado === 'activo').length || 0,
    agotados: data?.filter(l => l.estado === 'agotado').length || 0,
    vencidos: data?.filter(l => l.estado === 'vencido').length || 0,
    bloqueados: data?.filter(l => l.estado === 'bloqueado').length || 0,
    porVencerEn30Dias: porVencer?.length || 0,
    unidadesActivas: data?.filter(l => l.estado === 'activo')
      .reduce((sum, l) => sum + l.cantidad_actual, 0) || 0,
  };
};
