/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabase } from '../../../core/config/supabase';
import type {
  KitEvento,
  KitEventoDetalle,
  KitEventoFormData,
} from '../types';

// Usar supabase sin tipos estrictos para tablas no definidas en el schema
const db = supabase as any;

// ============================================================================
// KITS DE MATERIALES PARA EVENTOS
// ============================================================================

/**
 * Obtener todos los kits
 */
export const fetchKits = async (
  companyId: string,
  options?: {
    tipoEvento?: string;
    categoria?: string;
    activo?: boolean;
  }
): Promise<KitEvento[]> => {
  let query = db
    .from('kits_evento_erp')
    .select(`
      *,
      detalles:kits_evento_detalle_erp(
        *,
        producto:productos_erp(id, nombre, clave, unidad, costo, precio_venta)
      )
    `)
    .eq('company_id', companyId)
    .order('nombre', { ascending: true });

  if (options?.tipoEvento) {
    query = query.eq('tipo_evento', options.tipoEvento);
  }
  if (options?.categoria) {
    query = query.eq('categoria', options.categoria);
  }
  if (options?.activo !== undefined) {
    query = query.eq('activo', options.activo);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data || []) as KitEvento[];
};

/**
 * Obtener un kit por ID con sus detalles
 */
export const fetchKitById = async (id: number): Promise<KitEvento | null> => {
  const { data, error } = await db
    .from('kits_evento_erp')
    .select(`
      *,
      detalles:kits_evento_detalle_erp(
        *,
        producto:productos_erp(id, nombre, clave, unidad, costo, precio_venta)
      )
    `)
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return data as KitEvento;
};

// Alias para compatibilidad
export const fetchKitConDetalle = fetchKitById;

/**
 * Crear nuevo kit
 */
export const createKit = async (
  kit: KitEventoFormData,
  companyId: string,
  userId?: string
): Promise<KitEvento> => {
  // Crear kit principal
  const { data: kitData, error: kitError } = await db
    .from('kits_evento_erp')
    .insert([{
      codigo: kit.codigo,
      nombre: kit.nombre,
      descripcion: kit.descripcion,
      tipo_evento: kit.tipo_evento,
      categoria: kit.categoria,
      personas_base: kit.personas_base,
      es_escalable: kit.es_escalable,
      precio_renta_sugerido: kit.precio_renta_sugerido,
      activo: true,
      company_id: companyId,
      created_by: userId,
    }])
    .select()
    .single();

  if (kitError) throw kitError;

  // Crear detalles
  if (kit.detalles && kit.detalles.length > 0) {
    const detallesData = kit.detalles.map(d => ({
      kit_id: kitData.id,
      producto_id: d.producto_id,
      cantidad_fija: d.cantidad_fija,
      cantidad_por_persona: d.cantidad_por_persona,
      es_obligatorio: d.es_obligatorio,
      notas: d.notas,
    }));

    const { error: detError } = await db
      .from('kits_evento_detalle_erp')
      .insert(detallesData);

    if (detError) {
      // Rollback: eliminar kit si falla
      await db.from('kits_evento_erp').delete().eq('id', kitData.id);
      throw detError;
    }
  }

  return (await fetchKitById(kitData.id))!;
};

/**
 * Actualizar kit
 */
export const updateKit = async (
  id: number,
  kit: Partial<KitEventoFormData>
): Promise<KitEvento> => {
  // Actualizar kit principal
  const updateData: Record<string, any> = {};
  if (kit.codigo !== undefined) updateData.codigo = kit.codigo;
  if (kit.nombre !== undefined) updateData.nombre = kit.nombre;
  if (kit.descripcion !== undefined) updateData.descripcion = kit.descripcion;
  if (kit.tipo_evento !== undefined) updateData.tipo_evento = kit.tipo_evento;
  if (kit.categoria !== undefined) updateData.categoria = kit.categoria;
  if (kit.personas_base !== undefined) updateData.personas_base = kit.personas_base;
  if (kit.es_escalable !== undefined) updateData.es_escalable = kit.es_escalable;
  if (kit.precio_renta_sugerido !== undefined) updateData.precio_renta_sugerido = kit.precio_renta_sugerido;

  if (Object.keys(updateData).length > 0) {
    updateData.updated_at = new Date().toISOString();
    const { error } = await db
      .from('kits_evento_erp')
      .update(updateData)
      .eq('id', id);

    if (error) throw error;
  }

  // Actualizar detalles si se proporcionan
  if (kit.detalles !== undefined) {
    // Eliminar detalles existentes
    await db
      .from('kits_evento_detalle_erp')
      .delete()
      .eq('kit_id', id);

    // Insertar nuevos
    if (kit.detalles.length > 0) {
      const detallesData = kit.detalles.map(d => ({
        kit_id: id,
        producto_id: d.producto_id,
        cantidad_fija: d.cantidad_fija,
        cantidad_por_persona: d.cantidad_por_persona,
        es_obligatorio: d.es_obligatorio,
        notas: d.notas,
      }));

      const { error: detError } = await db
        .from('kits_evento_detalle_erp')
        .insert(detallesData);

      if (detError) throw detError;
    }
  }

  return (await fetchKitById(id))!;
};

/**
 * Eliminar kit
 */
export const deleteKit = async (id: number): Promise<void> => {
  // Los detalles se eliminan por CASCADE
  const { error } = await db
    .from('kits_evento_erp')
    .delete()
    .eq('id', id);

  if (error) throw error;
};

/**
 * Activar/Desactivar kit
 */
export const toggleKitActivo = async (id: number, activo: boolean): Promise<KitEvento> => {
  const { data, error } = await db
    .from('kits_evento_erp')
    .update({ activo, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as KitEvento;
};

/**
 * Duplicar kit
 */
export const duplicarKit = async (
  kitId: number,
  nuevoCodigo: string,
  nuevoNombre: string,
  companyId: string,
  userId?: string
): Promise<KitEvento> => {
  const kitOriginal = await fetchKitById(kitId);
  if (!kitOriginal) throw new Error('Kit original no encontrado');

  const nuevoKit: KitEventoFormData = {
    codigo: nuevoCodigo,
    nombre: nuevoNombre,
    descripcion: kitOriginal.descripcion || '',
    tipo_evento: kitOriginal.tipo_evento || '',
    categoria: kitOriginal.categoria || '',
    personas_base: kitOriginal.personas_base,
    es_escalable: kitOriginal.es_escalable,
    precio_renta_sugerido: kitOriginal.precio_renta_sugerido,
    detalles: (kitOriginal.detalles || []).map(d => ({
      producto_id: d.producto_id,
      cantidad_fija: d.cantidad_fija,
      cantidad_por_persona: d.cantidad_por_persona,
      es_obligatorio: d.es_obligatorio,
      notas: d.notas || '',
    })),
  };

  return createKit(nuevoKit, companyId, userId);
};

/**
 * Calcular materiales necesarios para un kit dado el número de personas
 */
export const calcularMaterialesKit = async (
  kitId: number,
  numPersonas: number
): Promise<{
  producto_id: number;
  producto_nombre: string;
  producto_clave: string;
  cantidad_calculada: number;
  costo_unitario: number;
  costo_total: number;
  es_obligatorio: boolean;
}[]> => {
  const kit = await fetchKitById(kitId);
  if (!kit) throw new Error('Kit no encontrado');

  return (kit.detalles || []).map(d => {
    const cantidadCalculada = Math.ceil(
      d.cantidad_fija + (d.cantidad_por_persona * (kit.es_escalable ? numPersonas : kit.personas_base))
    );

    const producto = d.producto as any;
    return {
      producto_id: d.producto_id,
      producto_nombre: producto?.nombre || '',
      producto_clave: producto?.clave || '',
      cantidad_calculada: cantidadCalculada,
      costo_unitario: producto?.costo || 0,
      costo_total: cantidadCalculada * (producto?.costo || 0),
      es_obligatorio: d.es_obligatorio,
    };
  });
};

/**
 * Verificar disponibilidad de kit
 */
export const verificarDisponibilidadKit = async (
  kitId: number,
  numPersonas: number,
  almacenId: number,
  _companyId: string,
  _fechaEvento?: string
): Promise<{
  disponible: boolean;
  productos: {
    producto_id: number;
    producto_nombre: string;
    cantidad_necesaria: number;
    stock_disponible: number;
    stock_reservado: number;
    faltante: number;
    disponible: boolean;
  }[];
}> => {
  const materiales = await calcularMaterialesKit(kitId, numPersonas);

  const productos = await Promise.all(
    materiales.map(async (m) => {
      // Obtener stock actual
      const { data: movimientos } = await db
        .from('movimientos_inventario_erp')
        .select('tipo, cantidad')
        .eq('producto_id', m.producto_id)
        .eq('almacen_id', almacenId);

      let stockActual = 0;
      ((movimientos || []) as any[]).forEach((mov: any) => {
        if (mov.tipo === 'entrada' || mov.tipo === 'ajuste') {
          stockActual += mov.cantidad;
        } else if (mov.tipo === 'salida') {
          stockActual -= mov.cantidad;
        }
      });

      // Obtener reservas activas
      const { data: reservas } = await db
        .from('reservas_stock_erp')
        .select('cantidad_reservada, cantidad_entregada')
        .eq('producto_id', m.producto_id)
        .eq('almacen_id', almacenId)
        .in('estado', ['activa', 'parcial']);

      const stockReservado = ((reservas || []) as any[]).reduce(
        (sum: number, r: any) => sum + (r.cantidad_reservada - r.cantidad_entregada),
        0
      );

      const stockDisponible = stockActual - stockReservado;
      const faltante = Math.max(0, m.cantidad_calculada - stockDisponible);

      return {
        producto_id: m.producto_id,
        producto_nombre: m.producto_nombre,
        cantidad_necesaria: m.cantidad_calculada,
        stock_disponible: stockDisponible,
        stock_reservado: stockReservado,
        faltante,
        disponible: faltante === 0,
      };
    })
  );

  return {
    disponible: productos.every(p => p.disponible),
    productos,
  };
};

/**
 * Obtener tipos de evento únicos
 */
export const fetchTiposEvento = async (companyId: string): Promise<string[]> => {
  const { data, error } = await db
    .from('kits_evento_erp')
    .select('tipo_evento')
    .eq('company_id', companyId)
    .not('tipo_evento', 'is', null);

  if (error) throw error;

  const tipos = [...new Set(((data || []) as any[]).map((k: any) => k.tipo_evento).filter(Boolean))];
  return tipos.sort();
};

/**
 * Obtener categorías únicas
 */
export const fetchCategoriasKit = async (companyId: string): Promise<string[]> => {
  const { data, error } = await db
    .from('kits_evento_erp')
    .select('categoria')
    .eq('company_id', companyId)
    .not('categoria', 'is', null);

  if (error) throw error;

  const categorias = [...new Set(((data || []) as any[]).map((k: any) => k.categoria).filter(Boolean))];
  return categorias.sort();
};

/**
 * Estadísticas de kits
 */
export const getEstadisticasKits = async (companyId: string) => {
  const { data, error } = await db
    .from('kits_evento_erp')
    .select('activo, tipo_evento')
    .eq('company_id', companyId);

  if (error) throw error;

  const dataTyped = (data || []) as any[];
  const tiposEvento = [...new Set(dataTyped.map((k: any) => k.tipo_evento).filter(Boolean))];

  return {
    total: dataTyped.length,
    activos: dataTyped.filter((k: any) => k.activo).length,
    inactivos: dataTyped.filter((k: any) => !k.activo).length,
    tipos_evento: tiposEvento.length,
  };
};

// ============================================================================
// OPERACIONES DE DETALLE DE KIT
// ============================================================================

/**
 * Agregar producto a un kit existente
 */
export const agregarProductoAKit = async (
  kitId: number,
  detalle: {
    producto_id: number;
    cantidad_fija?: number;
    cantidad_por_persona?: number;
    es_obligatorio?: boolean;
    notas?: string;
  }
): Promise<KitEventoDetalle> => {
  const insertData = {
    kit_id: kitId,
    producto_id: detalle.producto_id,
    cantidad_fija: detalle.cantidad_fija || 0,
    cantidad_por_persona: detalle.cantidad_por_persona || 0,
    es_obligatorio: detalle.es_obligatorio ?? true,
    notas: detalle.notas || null,
  };

  const { data, error } = await db
    .from('kits_evento_detalle_erp')
    .insert(insertData)
    .select(`
      *,
      producto:productos_erp(id, nombre, clave, unidad, costo, precio_venta)
    `)
    .single();

  if (error) throw error;
  return data as KitEventoDetalle;
};

/**
 * Actualizar producto en un kit
 */
export const actualizarProductoKit = async (
  detalleId: number,
  detalle: {
    cantidad_fija?: number;
    cantidad_por_persona?: number;
    es_obligatorio?: boolean;
    notas?: string;
  }
): Promise<KitEventoDetalle> => {
  const updatePayload: Record<string, number | boolean | string | null> = {};
  if (detalle.cantidad_fija !== undefined) updatePayload.cantidad_fija = detalle.cantidad_fija;
  if (detalle.cantidad_por_persona !== undefined) updatePayload.cantidad_por_persona = detalle.cantidad_por_persona;
  if (detalle.es_obligatorio !== undefined) updatePayload.es_obligatorio = detalle.es_obligatorio;
  if (detalle.notas !== undefined) updatePayload.notas = detalle.notas;

  // Primero actualizamos
  const { error: updateError } = await db
    .from('kits_evento_detalle_erp')
    .update(updatePayload)
    .eq('id', detalleId);

  if (updateError) throw updateError;

  // Luego obtenemos el registro con relaciones
  const { data, error } = await db
    .from('kits_evento_detalle_erp')
    .select(`
      *,
      producto:productos_erp(id, nombre, clave, unidad, costo, precio_venta)
    `)
    .eq('id', detalleId)
    .single();

  if (error) throw error;
  return data as KitEventoDetalle;
};

/**
 * Eliminar producto de un kit
 */
export const eliminarProductoDeKit = async (detalleId: number): Promise<void> => {
  const { error } = await db
    .from('kits_evento_detalle_erp')
    .delete()
    .eq('id', detalleId);

  if (error) throw error;
};
