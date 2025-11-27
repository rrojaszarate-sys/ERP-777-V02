import { supabase } from '../../../core/config/supabase';
import type {
  DocumentoInventario,
  DocumentoInventarioResumen,
  DetalleDocumentoInventario,
  DocumentoInventarioFormData,
  TipoDocumentoInventario,
  EstadoDocumentoInventario,
} from '../types';

// ============================================================================
// DOCUMENTOS DE INVENTARIO
// ============================================================================

/**
 * Obtener documentos de inventario con filtros opcionales
 */
export const fetchDocumentosInventario = async (
  companyId: string,
  options?: {
    tipo?: TipoDocumentoInventario;
    estado?: EstadoDocumentoInventario;
    fechaDesde?: string;
    fechaHasta?: string;
    almacenId?: number;
    eventoId?: number;
    limit?: number;
    offset?: number;
  }
): Promise<{ data: DocumentoInventarioResumen[]; count: number }> => {
  let query = supabase
    .from('vista_documentos_inventario_erp')
    .select('*', { count: 'exact' })
    .eq('company_id', companyId)
    .order('fecha', { ascending: false });

  // Aplicar filtros
  if (options?.tipo) {
    query = query.eq('tipo', options.tipo);
  }
  if (options?.estado) {
    query = query.eq('estado', options.estado);
  }
  if (options?.fechaDesde) {
    query = query.gte('fecha', options.fechaDesde);
  }
  if (options?.fechaHasta) {
    query = query.lte('fecha', options.fechaHasta);
  }
  if (options?.almacenId) {
    query = query.eq('almacen_id', options.almacenId);
  }
  if (options?.eventoId) {
    query = query.eq('evento_id', options.eventoId);
  }

  // Paginación
  if (options?.limit) {
    query = query.limit(options.limit);
  }
  if (options?.offset) {
    query = query.range(options.offset, options.offset + (options.limit || 50) - 1);
  }

  const { data, error, count } = await query;

  if (error) throw error;
  return { data: data || [], count: count || 0 };
};

/**
 * Obtener un documento con sus detalles
 */
export const fetchDocumentoById = async (
  documentoId: number
): Promise<DocumentoInventario | null> => {
  // Obtener documento
  const { data: documento, error: docError } = await supabase
    .from('documentos_inventario_erp')
    .select(`
      *,
      almacen:almacenes_erp(id, nombre, codigo),
      evento:eventos_erp(id, nombre)
    `)
    .eq('id', documentoId)
    .single();

  if (docError) throw docError;
  if (!documento) return null;

  // Obtener detalles
  const { data: detalles, error: detError } = await supabase
    .from('detalles_documento_inventario_erp')
    .select(`
      *,
      producto:productos_erp(
        id, nombre, codigo, sku, codigo_qr, unidad_medida,
        categoria:categorias_productos_erp(id, nombre)
      )
    `)
    .eq('documento_id', documentoId)
    .order('id', { ascending: true });

  if (detError) throw detError;

  return {
    ...documento,
    detalles: detalles || [],
  };
};

/**
 * Crear documento con sus detalles (transacción)
 */
export const createDocumentoInventario = async (
  data: DocumentoInventarioFormData,
  companyId: string,
  userId?: string
): Promise<DocumentoInventario> => {
  // 1. Crear documento principal
  const { data: documento, error: docError } = await supabase
    .from('documentos_inventario_erp')
    .insert([
      {
        tipo: data.tipo,
        fecha: data.fecha,
        almacen_id: data.almacen_id,
        evento_id: data.evento_id || null,
        nombre_entrega: data.nombre_entrega || null,
        firma_entrega: data.firma_entrega || null,
        nombre_recibe: data.nombre_recibe || null,
        firma_recibe: data.firma_recibe || null,
        observaciones: data.observaciones || null,
        estado: 'borrador',
        company_id: companyId,
        created_by: userId || null,
      },
    ])
    .select()
    .single();

  if (docError) throw docError;

  // 2. Crear detalles
  if (data.detalles && data.detalles.length > 0) {
    const detallesData = data.detalles.map((d) => ({
      documento_id: documento.id,
      producto_id: d.producto_id,
      cantidad: d.cantidad,
      observaciones: d.observaciones || null,
    }));

    const { error: detError } = await supabase
      .from('detalles_documento_inventario_erp')
      .insert(detallesData);

    if (detError) {
      // Rollback: eliminar documento si falla la inserción de detalles
      await supabase.from('documentos_inventario_erp').delete().eq('id', documento.id);
      throw detError;
    }
  }

  // 3. Retornar documento completo
  return (await fetchDocumentoById(documento.id))!;
};

/**
 * Actualizar documento y sus detalles
 */
export const updateDocumentoInventario = async (
  documentoId: number,
  data: Partial<DocumentoInventarioFormData>
): Promise<DocumentoInventario> => {
  // Solo permitir edición si está en borrador
  const { data: existing, error: checkError } = await supabase
    .from('documentos_inventario_erp')
    .select('estado')
    .eq('id', documentoId)
    .single();

  if (checkError) throw checkError;
  if (existing?.estado !== 'borrador') {
    throw new Error('Solo se pueden editar documentos en estado borrador');
  }

  // Actualizar documento principal
  const updateData: Record<string, any> = {};
  if (data.fecha !== undefined) updateData.fecha = data.fecha;
  if (data.almacen_id !== undefined) updateData.almacen_id = data.almacen_id;
  if (data.evento_id !== undefined) updateData.evento_id = data.evento_id;
  if (data.nombre_entrega !== undefined) updateData.nombre_entrega = data.nombre_entrega;
  if (data.firma_entrega !== undefined) updateData.firma_entrega = data.firma_entrega;
  if (data.nombre_recibe !== undefined) updateData.nombre_recibe = data.nombre_recibe;
  if (data.firma_recibe !== undefined) updateData.firma_recibe = data.firma_recibe;
  if (data.observaciones !== undefined) updateData.observaciones = data.observaciones;

  if (Object.keys(updateData).length > 0) {
    const { error: updateError } = await supabase
      .from('documentos_inventario_erp')
      .update(updateData)
      .eq('id', documentoId);

    if (updateError) throw updateError;
  }

  // Actualizar detalles si se proporcionan
  if (data.detalles !== undefined) {
    // Eliminar detalles existentes
    const { error: deleteError } = await supabase
      .from('detalles_documento_inventario_erp')
      .delete()
      .eq('documento_id', documentoId);

    if (deleteError) throw deleteError;

    // Insertar nuevos detalles
    if (data.detalles.length > 0) {
      const detallesData = data.detalles.map((d) => ({
        documento_id: documentoId,
        producto_id: d.producto_id,
        cantidad: d.cantidad,
        observaciones: d.observaciones || null,
      }));

      const { error: insertError } = await supabase
        .from('detalles_documento_inventario_erp')
        .insert(detallesData);

      if (insertError) throw insertError;
    }
  }

  return (await fetchDocumentoById(documentoId))!;
};

/**
 * Confirmar documento (genera movimientos de inventario)
 */
export const confirmarDocumento = async (documentoId: number): Promise<DocumentoInventario> => {
  const { data: documento, error: checkError } = await supabase
    .from('documentos_inventario_erp')
    .select('estado, firma_entrega, firma_recibe, nombre_entrega, nombre_recibe')
    .eq('id', documentoId)
    .single();

  if (checkError) throw checkError;

  if (documento?.estado !== 'borrador') {
    throw new Error('Solo se pueden confirmar documentos en estado borrador');
  }

  // Validar que tenga firmas
  if (!documento.firma_entrega || !documento.firma_recibe) {
    throw new Error('El documento debe tener ambas firmas para ser confirmado');
  }
  if (!documento.nombre_entrega || !documento.nombre_recibe) {
    throw new Error('El documento debe tener los nombres de quien entrega y recibe');
  }

  // Actualizar estado a confirmado (el trigger creará los movimientos)
  const { error: updateError } = await supabase
    .from('documentos_inventario_erp')
    .update({ estado: 'confirmado' })
    .eq('id', documentoId);

  if (updateError) throw updateError;

  return (await fetchDocumentoById(documentoId))!;
};

/**
 * Cancelar documento
 */
export const cancelarDocumento = async (
  documentoId: number,
  motivo?: string
): Promise<DocumentoInventario> => {
  const { data: documento, error: checkError } = await supabase
    .from('documentos_inventario_erp')
    .select('estado')
    .eq('id', documentoId)
    .single();

  if (checkError) throw checkError;

  if (documento?.estado === 'cancelado') {
    throw new Error('El documento ya está cancelado');
  }

  const { error: updateError } = await supabase
    .from('documentos_inventario_erp')
    .update({
      estado: 'cancelado',
      observaciones: motivo
        ? `[CANCELADO] ${motivo}`
        : documento?.estado === 'confirmado'
        ? '[CANCELADO] Documento cancelado después de confirmación'
        : '[CANCELADO]',
    })
    .eq('id', documentoId);

  if (updateError) throw updateError;

  return (await fetchDocumentoById(documentoId))!;
};

/**
 * Eliminar documento (solo borradores)
 */
export const deleteDocumentoInventario = async (documentoId: number): Promise<void> => {
  const { data: documento, error: checkError } = await supabase
    .from('documentos_inventario_erp')
    .select('estado')
    .eq('id', documentoId)
    .single();

  if (checkError) throw checkError;

  if (documento?.estado !== 'borrador') {
    throw new Error('Solo se pueden eliminar documentos en estado borrador');
  }

  // Los detalles se eliminan por CASCADE
  const { error: deleteError } = await supabase
    .from('documentos_inventario_erp')
    .delete()
    .eq('id', documentoId);

  if (deleteError) throw deleteError;
};

// ============================================================================
// DETALLES DE DOCUMENTO
// ============================================================================

/**
 * Agregar producto a documento existente (solo borradores)
 */
export const agregarDetalleDocumento = async (
  documentoId: number,
  productoId: number,
  cantidad: number,
  observaciones?: string
): Promise<DetalleDocumentoInventario> => {
  // Verificar que el documento esté en borrador
  const { data: documento, error: checkError } = await supabase
    .from('documentos_inventario_erp')
    .select('estado')
    .eq('id', documentoId)
    .single();

  if (checkError) throw checkError;
  if (documento?.estado !== 'borrador') {
    throw new Error('Solo se pueden agregar productos a documentos en borrador');
  }

  // Verificar si ya existe el producto en el documento
  const { data: existing } = await supabase
    .from('detalles_documento_inventario_erp')
    .select('id, cantidad')
    .eq('documento_id', documentoId)
    .eq('producto_id', productoId)
    .single();

  if (existing) {
    // Actualizar cantidad existente
    const { data, error } = await supabase
      .from('detalles_documento_inventario_erp')
      .update({ cantidad: existing.cantidad + cantidad })
      .eq('id', existing.id)
      .select(`
        *,
        producto:productos_erp(id, nombre, codigo, sku, codigo_qr, unidad_medida)
      `)
      .single();

    if (error) throw error;
    return data;
  } else {
    // Crear nuevo detalle
    const { data, error } = await supabase
      .from('detalles_documento_inventario_erp')
      .insert([
        {
          documento_id: documentoId,
          producto_id: productoId,
          cantidad,
          observaciones: observaciones || null,
        },
      ])
      .select(`
        *,
        producto:productos_erp(id, nombre, codigo, sku, codigo_qr, unidad_medida)
      `)
      .single();

    if (error) throw error;
    return data;
  }
};

/**
 * Actualizar cantidad de un detalle
 */
export const actualizarDetalleDocumento = async (
  detalleId: number,
  cantidad: number,
  observaciones?: string
): Promise<DetalleDocumentoInventario> => {
  // Verificar que el documento esté en borrador
  const { data: detalle, error: checkError } = await supabase
    .from('detalles_documento_inventario_erp')
    .select('documento_id')
    .eq('id', detalleId)
    .single();

  if (checkError) throw checkError;

  const { data: documento, error: docError } = await supabase
    .from('documentos_inventario_erp')
    .select('estado')
    .eq('id', detalle?.documento_id)
    .single();

  if (docError) throw docError;
  if (documento?.estado !== 'borrador') {
    throw new Error('Solo se pueden editar detalles de documentos en borrador');
  }

  const { data, error } = await supabase
    .from('detalles_documento_inventario_erp')
    .update({ cantidad, observaciones: observaciones || null })
    .eq('id', detalleId)
    .select(`
      *,
      producto:productos_erp(id, nombre, codigo, sku, codigo_qr, unidad_medida)
    `)
    .single();

  if (error) throw error;
  return data;
};

/**
 * Eliminar detalle de documento
 */
export const eliminarDetalleDocumento = async (detalleId: number): Promise<void> => {
  // Verificar que el documento esté en borrador
  const { data: detalle, error: checkError } = await supabase
    .from('detalles_documento_inventario_erp')
    .select('documento_id')
    .eq('id', detalleId)
    .single();

  if (checkError) throw checkError;

  const { data: documento, error: docError } = await supabase
    .from('documentos_inventario_erp')
    .select('estado')
    .eq('id', detalle?.documento_id)
    .single();

  if (docError) throw docError;
  if (documento?.estado !== 'borrador') {
    throw new Error('Solo se pueden eliminar detalles de documentos en borrador');
  }

  const { error } = await supabase
    .from('detalles_documento_inventario_erp')
    .delete()
    .eq('id', detalleId);

  if (error) throw error;
};

// ============================================================================
// BÚSQUEDA POR QR
// ============================================================================

/**
 * Buscar producto por código QR o código
 */
export const buscarProductoPorQR = async (
  codigo: string,
  companyId: string
) => {
  // Buscar por código QR
  let { data, error } = await supabase
    .from('productos_erp')
    .select(`
      id, nombre, codigo, sku, codigo_qr, unidad_medida,
      categoria:categorias_productos_erp(id, nombre)
    `)
    .eq('company_id', companyId)
    .eq('codigo_qr', codigo)
    .single();

  if (!data) {
    // Buscar por código
    ({ data, error } = await supabase
      .from('productos_erp')
      .select(`
        id, nombre, codigo, sku, codigo_qr, unidad_medida,
        categoria:categorias_productos_erp(id, nombre)
      `)
      .eq('company_id', companyId)
      .eq('codigo', codigo)
      .single());
  }

  if (!data) {
    // Buscar por SKU
    ({ data, error } = await supabase
      .from('productos_erp')
      .select(`
        id, nombre, codigo, sku, codigo_qr, unidad_medida,
        categoria:categorias_productos_erp(id, nombre)
      `)
      .eq('company_id', companyId)
      .eq('sku', codigo)
      .single());
  }

  if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows found
  return data;
};

// ============================================================================
// ESTADÍSTICAS
// ============================================================================

/**
 * Obtener estadísticas de documentos
 */
export const getEstadisticasDocumentos = async (companyId: string) => {
  const { data, error } = await supabase
    .from('documentos_inventario_erp')
    .select('tipo, estado')
    .eq('company_id', companyId);

  if (error) throw error;

  const stats = {
    total: data?.length || 0,
    entradas: data?.filter((d) => d.tipo === 'entrada').length || 0,
    salidas: data?.filter((d) => d.tipo === 'salida').length || 0,
    borradores: data?.filter((d) => d.estado === 'borrador').length || 0,
    confirmados: data?.filter((d) => d.estado === 'confirmado').length || 0,
    cancelados: data?.filter((d) => d.estado === 'cancelado').length || 0,
  };

  return stats;
};
