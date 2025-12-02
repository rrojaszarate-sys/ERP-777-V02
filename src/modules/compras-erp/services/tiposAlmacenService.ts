/**
 * Servicio para gestión de Tipos de Almacén
 */

import { supabase } from '../../../core/config/supabase';
import type { TipoAlmacen, TipoAlmacenConfig } from '../types';

// Configuración por defecto para nuevos tipos
export const CONFIG_DEFAULT: TipoAlmacenConfig = {
  usa_lotes: false,
  usa_fecha_caducidad: false,
  usa_ubicaciones: true,
  usa_numero_serie: false,
  usa_peso: false,
  usa_dimensiones: false,
  requiere_inspeccion_entrada: false,
  requiere_inspeccion_salida: false,
  permite_reservas: true,
  permite_transferencias: true,
  control_temperatura: false,
  es_consumible: true,
  es_reutilizable: false,
  dias_alerta_stock_bajo: 7,
  porcentaje_stock_minimo: 20,
};

/**
 * Obtener todos los tipos de almacén de una empresa
 */
export async function fetchTiposAlmacen(empresaId: string, soloActivos = true): Promise<TipoAlmacen[]> {
  let query = supabase
    .from('tipos_almacen_erp')
    .select('*')
    .eq('empresa_id', empresaId)
    .order('orden', { ascending: true });

  if (soloActivos) {
    query = query.eq('activo', true);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data || [];
}

/**
 * Obtener un tipo de almacén por ID
 */
export async function fetchTipoAlmacen(id: number): Promise<TipoAlmacen | null> {
  const { data, error } = await supabase
    .from('tipos_almacen_erp')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data;
}

/**
 * Obtener tipo de almacén por código
 */
export async function fetchTipoAlmacenPorCodigo(empresaId: string, codigo: string): Promise<TipoAlmacen | null> {
  const { data, error } = await supabase
    .from('tipos_almacen_erp')
    .select('*')
    .eq('empresa_id', empresaId)
    .eq('codigo', codigo)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data;
}

/**
 * Crear un nuevo tipo de almacén
 */
export async function createTipoAlmacen(
  tipo: Omit<TipoAlmacen, 'id' | 'created_at' | 'updated_at'>
): Promise<TipoAlmacen> {
  const { data, error } = await supabase
    .from('tipos_almacen_erp')
    .insert({
      ...tipo,
      config: { ...CONFIG_DEFAULT, ...tipo.config },
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Actualizar un tipo de almacén
 */
export async function updateTipoAlmacen(
  id: number,
  updates: Partial<TipoAlmacen>
): Promise<TipoAlmacen> {
  const { data, error } = await supabase
    .from('tipos_almacen_erp')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Actualizar solo la configuración de un tipo
 */
export async function updateTipoAlmacenConfig(
  id: number,
  config: Partial<TipoAlmacenConfig>
): Promise<TipoAlmacen> {
  // Primero obtener la config actual
  const tipo = await fetchTipoAlmacen(id);
  if (!tipo) throw new Error('Tipo de almacén no encontrado');

  const nuevaConfig = { ...tipo.config, ...config };

  const { data, error } = await supabase
    .from('tipos_almacen_erp')
    .update({ config: nuevaConfig })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Eliminar un tipo de almacén (soft delete - desactivar)
 */
export async function deleteTipoAlmacen(id: number): Promise<void> {
  const { error } = await supabase
    .from('tipos_almacen_erp')
    .update({ activo: false })
    .eq('id', id);

  if (error) throw error;
}

/**
 * Reactivar un tipo de almacén
 */
export async function reactivarTipoAlmacen(id: number): Promise<void> {
  const { error } = await supabase
    .from('tipos_almacen_erp')
    .update({ activo: true })
    .eq('id', id);

  if (error) throw error;
}

/**
 * Establecer tipo como default
 */
export async function setTipoAlmacenDefault(id: number, empresaId: string): Promise<void> {
  // Quitar default de otros
  await supabase
    .from('tipos_almacen_erp')
    .update({ es_default: false })
    .eq('empresa_id', empresaId);

  // Establecer este como default
  const { error } = await supabase
    .from('tipos_almacen_erp')
    .update({ es_default: true })
    .eq('id', id);

  if (error) throw error;
}

/**
 * Reordenar tipos de almacén
 */
export async function reordenarTiposAlmacen(
  tiposOrdenados: { id: number; orden: number }[]
): Promise<void> {
  for (const item of tiposOrdenados) {
    await supabase
      .from('tipos_almacen_erp')
      .update({ orden: item.orden })
      .eq('id', item.id);
  }
}

/**
 * Inicializar tipos de almacén predeterminados para una empresa
 */
export async function inicializarTiposAlmacen(empresaId: string, userId?: string): Promise<void> {
  const { error } = await supabase.rpc('inicializar_tipos_almacen', {
    p_empresa_id: empresaId,
    p_user_id: userId || null,
  });

  if (error) throw error;
}

/**
 * Obtener configuración efectiva de un almacén
 * (combina tipo + override del almacén específico)
 */
export async function getConfiguracionEfectivaAlmacen(almacenId: number): Promise<TipoAlmacenConfig> {
  const { data, error } = await supabase
    .from('almacenes_erp')
    .select(`
      config_override,
      tipo_almacen:tipos_almacen_erp(config)
    `)
    .eq('id', almacenId)
    .single();

  if (error) throw error;

  const tipoConfig = (data?.tipo_almacen as any)?.config || CONFIG_DEFAULT;
  const override = data?.config_override || {};

  return { ...tipoConfig, ...override };
}

/**
 * Verificar si una funcionalidad está habilitada para un almacén
 */
export async function funcionalidadHabilitada(
  almacenId: number,
  funcionalidad: keyof TipoAlmacenConfig
): Promise<boolean> {
  const config = await getConfiguracionEfectivaAlmacen(almacenId);
  return !!config[funcionalidad];
}
