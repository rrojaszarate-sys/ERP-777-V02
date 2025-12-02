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
// UTILIDADES
// ============================================================================

/**
 * Wrapper para manejar errores de Supabase de forma consistente
 */
const handleSupabaseError = (error: any, context: string): never => {
  console.error(`[InventarioService] Error en ${context}:`, error);
  
  if (error.code === 'PGRST116') {
    throw new Error(`No se encontró el registro (${context})`);
  }
  if (error.code === '42P01') {
    throw new Error(`Tabla no encontrada: ${error.message}`);
  }
  if (error.code === '42703') {
    throw new Error(`Columna no encontrada: ${error.message}`);
  }
  if (error.message?.includes('JWT')) {
    throw new Error('Sesión expirada. Por favor, inicia sesión nuevamente.');
  }
  
  throw new Error(error.message || `Error en ${context}`);
};

// ============================================================================
// DOCUMENTOS DE INVENTARIO
// ============================================================================

/**
 * Obtener documentos de inventario con filtros opcionales
 * Optimizado: usa la tabla directa con joins simples en lugar de vista compleja
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
  console.log('[InventarioService] fetchDocumentosInventario - companyId:', companyId);
  
  // Usar tabla directa con select específico para mejor rendimiento
  let query = supabase
    .from('documentos_inventario_erp')
    .select(`
      id,
      numero_documento,
      tipo,
      estado,
      fecha,
      observaciones,
      company_id,
      almacen_id,
      almacen:almacenes_erp(id, nombre),
      evento_id,
      nombre_entrega,
      nombre_recibe,
      created_at,
      updated_at,
      archivo_pdf_firmado,
      archivo_pdf_nombre,
      archivo_pdf_fecha
    `, { count: 'exact' })
    .eq('company_id', companyId)
    .order('fecha', { ascending: false })
    .order('id', { ascending: false });

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
  const limit = options?.limit || 25;
  const offset = options?.offset || 0;
  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) {
    handleSupabaseError(error, 'fetchDocumentosInventario');
  }
  
  console.log('[InventarioService] fetchDocumentosInventario - resultados:', data?.length || 0);
  
  // Transformar datos para compatibilidad con el formato esperado
  const transformedData: DocumentoInventarioResumen[] = (data || []).map((doc: any) => ({
    id: doc.id,
    numero_documento: doc.numero_documento || `DOC-${doc.id}`,
    tipo: doc.tipo,
    estado: doc.estado,
    fecha: doc.fecha,
    observaciones: doc.observaciones,
    company_id: doc.company_id,
    almacen_id: doc.almacen_id,
    almacen_nombre: doc.almacen?.nombre || 'Sin almacén',
    evento_id: doc.evento_id,
    evento_nombre: null,
    nombre_entrega: doc.nombre_entrega,
    nombre_recibe: doc.nombre_recibe,
    created_at: doc.created_at,
    updated_at: doc.updated_at,
    total_lineas: 0,
    total_productos: 0,
    archivo_pdf_firmado: doc.archivo_pdf_firmado,
    archivo_pdf_nombre: doc.archivo_pdf_nombre,
    archivo_pdf_fecha: doc.archivo_pdf_fecha,
  }));
  
  return { data: transformedData, count: count || 0 };
};

/**
 * Obtener un documento con sus detalles
 */
export const fetchDocumentoById = async (
  documentoId: number
): Promise<DocumentoInventario | null> => {
  console.log('[InventarioService] fetchDocumentoById:', documentoId);
  
  // Obtener documento
  const { data: documento, error: docError } = await supabase
    .from('documentos_inventario_erp')
    .select(`
      *,
      almacen:almacenes_erp(id, nombre),
      evento:evt_eventos_erp(id, nombre_proyecto)
    `)
    .eq('id', documentoId)
    .single();

  if (docError) {
    if (docError.code === 'PGRST116') {
      console.warn('[InventarioService] Documento no encontrado:', documentoId);
      return null;
    }
    handleSupabaseError(docError, 'fetchDocumentoById');
  }
  if (!documento) return null;

  // Obtener detalles
  const { data: detalles, error: detError } = await supabase
    .from('detalles_documento_inventario_erp')
    .select(`
      *,
      producto:productos_erp(
        id, nombre, clave, codigo_qr, unidad
      )
    `)
    .eq('documento_id', documentoId)
    .order('id', { ascending: true });

  if (detError) {
    console.error('[InventarioService] Error cargando detalles:', detError);
    // No lanzamos error, simplemente retornamos sin detalles
  }

  console.log('[InventarioService] Documento cargado con', detalles?.length || 0, 'detalles');
  
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
        producto:productos_erp(id, nombre, clave, codigo_qr, unidad)
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
        producto:productos_erp(id, nombre, clave, codigo_qr, unidad)
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
      producto:productos_erp(id, nombre, clave, codigo_qr, unidad)
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
 * Buscar producto por código QR o clave
 */
export const buscarProductoPorQR = async (
  codigo: string,
  companyId: string
) => {
  // Buscar por código QR
  let { data, error } = await supabase
    .from('productos_erp')
    .select(`
      id, nombre, clave, codigo_qr, unidad, costo, precio_venta
    `)
    .eq('company_id', companyId)
    .eq('codigo_qr', codigo)
    .single();

  if (!data) {
    // Buscar por clave del producto
    ({ data, error } = await supabase
      .from('productos_erp')
      .select(`
        id, nombre, clave, codigo_qr, unidad, costo, precio_venta
      `)
      .eq('company_id', companyId)
      .eq('clave', codigo)
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

// ============================================================================
// SUBIDA DE PDF FIRMADO COMO EVIDENCIA
// ============================================================================

/**
 * Subir PDF firmado como evidencia del documento
 * @param documentoId - ID del documento de inventario
 * @param file - Archivo PDF a subir
 * @param companyId - ID de la empresa para organización de archivos
 * @returns URL del archivo subido
 */
export const subirPDFDocumento = async (
  documentoId: number,
  file: File,
  companyId: string
): Promise<{ url: string; nombre: string }> => {
  console.log('[InventarioService] Subiendo PDF para documento:', documentoId);
  
  // Validar que sea un PDF
  if (!file.type.includes('pdf')) {
    throw new Error('Solo se permiten archivos PDF');
  }
  
  // Validar tamaño (máximo 10MB)
  const MAX_SIZE = 10 * 1024 * 1024;
  if (file.size > MAX_SIZE) {
    throw new Error('El archivo es demasiado grande. Máximo 10MB.');
  }
  
  // Generar nombre único para el archivo
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const nombreArchivo = `${companyId}/documentos/${documentoId}_${timestamp}.pdf`;
  
  // Subir a Supabase Storage
  const { data: uploadData, error: uploadError } = await supabase
    .storage
    .from('documentos-inventario')
    .upload(nombreArchivo, file, {
      contentType: 'application/pdf',
      upsert: false
    });
  
  if (uploadError) {
    console.error('[InventarioService] Error subiendo PDF:', uploadError);
    throw new Error(`Error al subir archivo: ${uploadError.message}`);
  }
  
  // Obtener URL pública o firmada
  const { data: urlData } = supabase
    .storage
    .from('documentos-inventario')
    .getPublicUrl(nombreArchivo);
  
  const archivoUrl = urlData?.publicUrl || '';
  
  // Actualizar el documento con la referencia al PDF
  const { error: updateError } = await supabase
    .from('documentos_inventario_erp')
    .update({
      archivo_pdf_firmado: archivoUrl,
      archivo_pdf_nombre: file.name,
      archivo_pdf_fecha: new Date().toISOString()
    })
    .eq('id', documentoId);
  
  if (updateError) {
    console.error('[InventarioService] Error actualizando documento:', updateError);
    // Intentar eliminar el archivo subido
    await supabase.storage.from('documentos-inventario').remove([nombreArchivo]);
    throw new Error(`Error al actualizar documento: ${updateError.message}`);
  }
  
  console.log('[InventarioService] PDF subido correctamente:', archivoUrl);
  
  return {
    url: archivoUrl,
    nombre: file.name
  };
};

/**
 * Eliminar PDF firmado de un documento
 */
export const eliminarPDFDocumento = async (
  documentoId: number,
  archivoUrl: string
): Promise<void> => {
  console.log('[InventarioService] Eliminando PDF de documento:', documentoId);
  
  // Extraer el path del archivo de la URL
  const urlParts = archivoUrl.split('/documentos-inventario/');
  if (urlParts.length > 1) {
    const filePath = urlParts[1];
    
    // Eliminar de Storage
    const { error: deleteError } = await supabase
      .storage
      .from('documentos-inventario')
      .remove([filePath]);
    
    if (deleteError) {
      console.warn('[InventarioService] Error eliminando archivo:', deleteError);
    }
  }
  
  // Limpiar referencia en la base de datos
  const { error: updateError } = await supabase
    .from('documentos_inventario_erp')
    .update({
      archivo_pdf_firmado: null,
      archivo_pdf_nombre: null,
      archivo_pdf_fecha: null
    })
    .eq('id', documentoId);
  
  if (updateError) {
    throw new Error(`Error al actualizar documento: ${updateError.message}`);
  }
  
  console.log('[InventarioService] PDF eliminado correctamente');
};
