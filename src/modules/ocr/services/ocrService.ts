import { supabase } from '../../../core/config/supabase';
import { googleVisionService } from './googleVisionService';
import { tesseractOCRService } from './tesseractOCRService';
import type { OCRDocument, OCRProcessingResult, ProcessingConfig, OCRQueryParams } from '../types/OCRTypes';

class OCRService {
  /**
   * Procesa un documento usando Google Vision API
   */
  async processDocument(params: {
    file: File;
    config: ProcessingConfig;
    evento_id: string;
    user_id: string;
  }): Promise<OCRProcessingResult> {
    const { file, config, evento_id, user_id } = params;
    const startTime = Date.now();

    try {
      // 1. Subir archivo a Supabase Storage
      const fileName = `${Date.now()}_${file.name}`;
      const storagePath = `${evento_id}/ocr/${fileName}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('event_docs')
        .upload(storagePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        throw new Error(`Error subiendo archivo: ${uploadError.message}`);
      }

      // 2. Crear registro en base de datos
      const docData = {
        evento_id,
        nombre_archivo: file.name,
        ruta_storage: storagePath,
        tipo_documento: config.tipo_documento,
        estado_procesamiento: 'processing',
        validado: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data: docRecord, error: insertError } = await supabase
        .from('evt_documentos_ocr')
        .insert(docData)
        .select()
        .single();

      if (insertError) {
        throw new Error(`Error creando registro: ${insertError.message}`);
      }

      // 3. Procesar con OCR REAL usando Tesseract.js
      console.log('🔍 Iniciando procesamiento OCR REAL...');
      await this.processWithTesseractOCR(docRecord.id, file, config);

      // 4. Obtener documento actualizado
      const { data: updatedDoc, error: fetchError } = await supabase
        .from('evt_documentos_ocr')
        .select('*')
        .eq('id', docRecord.id)
        .single();

      if (fetchError) {
        throw new Error(`Error obteniendo documento: ${fetchError.message}`);
      }

      const processingTime = Date.now() - startTime;

      return {
        success: true,
        document: {
          ...updatedDoc,
          tiempo_procesamiento_ms: processingTime
        }
      };
    } catch (error: any) {
      console.error('Error processing document:', error);
      return {
        success: false,
        error: error.message || 'Error desconocido al procesar documento'
      };
    }
  }

  /**
   * Procesa un documento con Tesseract.js OCR REAL
   */
  private async processWithTesseractOCR(
    docId: string,
    file: File,
    config: ProcessingConfig
  ): Promise<void> {
    try {
      console.log('🔍 Procesando con Tesseract OCR REAL...', file.name);
      
      // Usar el servicio OCR real de Tesseract
      const ocrResult = await tesseractOCRService.processDocument(file);
      
      // Preparar datos para actualizar en BD
      console.log('📊 Resultado OCR completo:', ocrResult);
      
      const updateData: any = {
        estado_procesamiento: 'completed',
        texto_completo: ocrResult.texto_completo || '',
        confianza_general: Math.round(ocrResult.confianza_general || 0),
        tiempo_procesamiento_ms: 25000,
        updated_at: new Date().toISOString(),
      };

      console.log('📝 Datos a actualizar:', updateData);

      // Agregar datos específicos según el tipo de documento
      if (ocrResult.datos_ticket) {
        // Limpiar y validar datos del ticket
        const cleanTicketData = this.cleanTicketData(ocrResult.datos_ticket);
        updateData.datos_ticket = cleanTicketData;
        updateData.tipo_documento = 'ticket';
        console.log('🎫 Datos de ticket limpiados:', cleanTicketData);
      }
      
      if (ocrResult.datos_factura) {
        // Limpiar y validar datos de la factura
        const cleanFacturaData = this.cleanFacturaData(ocrResult.datos_factura);
        updateData.datos_factura = cleanFacturaData;
        updateData.tipo_documento = 'factura';
        console.log('📄 Datos de factura limpiados:', cleanFacturaData);
      }

      // Si no se detectó tipo específico, usar auto
      if (!updateData.tipo_documento) {
        updateData.tipo_documento = 'auto';
      }

      // Actualizar registro en BD
      console.log('🔄 Actualizando documento en Supabase con ID:', docId);
      
      const { data: updateResult, error: updateError } = await supabase
        .from('evt_documentos_ocr')
        .update(updateData)
        .eq('id', docId)
        .select();

      if (updateError) {
        console.error('❌ Error actualizando documento OCR:', updateError);
        console.error('📊 Datos que causaron el error:', updateData);
        console.error('🆔 ID del documento:', docId);
        throw updateError;
      }

      console.log('✅ Documento actualizado exitosamente:', updateResult);

      console.log('✅ Procesamiento OCR REAL completado exitosamente');
      console.log('📊 Texto extraído:', ocrResult.texto_completo.substring(0, 200) + '...');
      console.log('🎯 Confianza:', ocrResult.confianza_general + '%');
      
    } catch (error) {
      console.error('❌ Error en procesamiento OCR real:', error);
      
      // Actualizar estado de error en BD
      await supabase
        .from('evt_documentos_ocr')
        .update({
          estado_procesamiento: 'error', // Usar 'error' según el schema CHECK constraint
          error_mensaje: error instanceof Error ? error.message : 'Error desconocido en OCR',
          updated_at: new Date().toISOString()
        })
        .eq('id', docId);
      
      throw error;
    }
  }

  /**
   * Procesa un documento con Google Vision API real
   */
  private async processWithGoogleVision(
    docId: string,
    file: File,
    config: ProcessingConfig
  ): Promise<void> {
    const startTime = Date.now();
    
    try {
      console.log('🤖 Procesando con Google Vision API real...', { docId, fileName: file.name });
      
      // Verificar que Google Vision está disponible
      if (!googleVisionService.isAvailable()) {
        throw new Error('Google Vision API no está disponible');
      }

      // Procesar con Google Vision
      const result = await googleVisionService.processDocument(file);
      
      // Usar config si es necesario (evita warning de TypeScript)
      console.log('📋 Configuración OCR:', config.tipo_documento);
      
      // Calcular tiempo de procesamiento real
      const processingTime = Date.now() - startTime;
      
      // Preparar datos para actualizar (sin cambiar tipo_documento)
      const updateData: any = {
        estado_procesamiento: 'completed',
        confianza_general: Math.round(result.confianza_general || 0), // Asegurar que sea INTEGER
        texto_completo: result.texto_completo || '',
        tiempo_procesamiento_ms: Math.round(processingTime),
        updated_at: new Date().toISOString()
      };

      // Agregar datos específicos según el tipo (sin modificar tipo_documento)
      if (result.datos_ticket) {
        updateData.datos_ticket = result.datos_ticket;
      }
      
      if (result.datos_factura) {
        updateData.datos_factura = result.datos_factura;
      }

      // Actualizar en base de datos
      console.log('📝 Datos a actualizar:', updateData);
      
      const { data, error } = await supabase
        .from('evt_documentos_ocr')
        .update(updateData)
        .eq('id', docId)
        .select();

      if (error) {
        console.error('❌ Error de Supabase:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        throw new Error(`Error BD: ${error.message} - ${error.details || ''}`);
      }
      
      console.log('✅ Documento actualizado en BD:', data);

      console.log('✅ Documento procesado exitosamente con Google Vision', { docId, confidence: result.confianza_general });
      
    } catch (error: any) {
      console.error('❌ Error procesando con Google Vision:', {
        message: error.message,
        stack: error.stack,
        docId,
        fileName: file.name
      });
      
      // Marcar como error en base de datos
      try {
        await supabase
          .from('evt_documentos_ocr')
          .update({
            estado_procesamiento: 'error',
            error_mensaje: error.message || 'Error en procesamiento OCR',
            updated_at: new Date().toISOString()
          })
          .eq('id', docId);
      } catch (updateError) {
        console.error('❌ Error actualizando estado de error:', updateError);
      }
        
      throw error;
    }
  }

  /**
   * Simula el procesamiento OCR
   * En producción, esto llamaría a Google Vision API
   */
  private async simulateOCRProcessing(
    docId: string,
    file: File,
    config: ProcessingConfig
  ): Promise<void> {
    // Simular delay de procesamiento
    await new Promise(resolve => setTimeout(resolve, 2000));

    const isTicket = config.tipo_documento === 'ticket' || 
                     (config.tipo_documento === 'auto' && file.name.toLowerCase().includes('ticket'));

    let updateData: any = {
      estado_procesamiento: 'completed',
      confianza_general: Math.floor(Math.random() * 20) + 80, // 80-100%
      updated_at: new Date().toISOString()
    };

    if (isTicket) {
      updateData.datos_ticket = {
        establecimiento: 'Restaurante Demo',
        direccion: 'Av. Principal 123, CDMX',
        fecha: new Date().toISOString().split('T')[0],
        hora: '14:30',
        total: 450.50,
        subtotal: 390.00,
        iva: 60.50,
        forma_pago: 'Tarjeta',
        productos: [
          { nombre: 'Producto 1', cantidad: 2, precio_unitario: 150.00, precio_total: 300.00 },
          { nombre: 'Producto 2', cantidad: 1, precio_unitario: 90.00, precio_total: 90.00 }
        ]
      };
      updateData.texto_completo = 'RESTAURANTE DEMO\nAv. Principal 123\nTotal: $450.50';
    } else {
      updateData.datos_factura = {
        uuid: '12345678-1234-1234-1234-123456789ABC',
        serie: 'A',
        folio: '001234',
        rfc_emisor: 'AAA010101AAA',
        nombre_emisor: 'Empresa Demo SA de CV',
        rfc_receptor: 'BBB020202BBB',
        subtotal: 1000.00,
        iva: 160.00,
        total: 1160.00,
        forma_pago: '03',
        metodo_pago: 'PUE',
        fecha_emision: new Date().toISOString().split('T')[0],
        estado: 'Vigente',
        validado_sat: true
      };
      updateData.texto_completo = 'FACTURA ELECTRONICA\nUUID: 12345678...\nTotal: $1,160.00';
    }

    const { error } = await supabase
      .from('evt_documentos_ocr')
      .update(updateData)
      .eq('id', docId);

    if (error) {
      throw error;
    }
  }

  /**
   * Obtiene documentos OCR con filtros
   */
  async getDocuments(params: OCRQueryParams = {}): Promise<OCRDocument[]> {
    console.log('🔍 Consultando documentos OCR con parámetros:', params);
    
    let query = supabase
      .from('evt_documentos_ocr')
      .select('*');

    if (params.evento_id) {
      query = query.eq('evento_id', params.evento_id);
    }

    if (params.tipo_documento) {
      query = query.eq('tipo_documento', params.tipo_documento);
    }

    if (params.estado_procesamiento) {
      query = query.eq('estado_procesamiento', params.estado_procesamiento);
    }

    if (params.validado !== undefined) {
      query = query.eq('validado', params.validado);
    }

    if (params.fecha_desde) {
      query = query.gte('created_at', params.fecha_desde);
    }

    if (params.fecha_hasta) {
      query = query.lte('created_at', params.fecha_hasta);
    }

    const orderBy = params.orderBy || 'created_at';
    const order = params.order || 'desc';
    query = query.order(orderBy, { ascending: order === 'asc' });

    if (params.limit) {
      query = query.limit(params.limit);
    }

    if (params.offset) {
      query = query.range(params.offset, params.offset + (params.limit || 10) - 1);
    }

    const { data, error } = await query;

    if (error) {
      console.error('❌ Error obteniendo documentos:', error);
      throw error;
    }

    console.log('✅ Documentos obtenidos de Supabase:', data?.length || 0);
    console.log('📊 Primeros documentos:', data?.slice(0, 2));

    return data || [];
  }

  /**
   * Obtiene un documento por ID
   */
  async getDocumentById(id: string): Promise<OCRDocument | null> {
    const { data, error } = await supabase
      .from('evt_documentos_ocr')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching document:', error);
      return null;
    }

    return data;
  }

  /**
   * Valida manualmente un documento OCR
   */
  async validateDocument(
    docId: string,
    userId: string,
    notas?: string
  ): Promise<void> {
    const { error } = await supabase
      .from('evt_documentos_ocr')
      .update({
        validado: true,
        validado_por: userId,
        validado_fecha: new Date().toISOString(),
        notas_validacion: notas,
        updated_at: new Date().toISOString()
      })
      .eq('id', docId);

    if (error) {
      throw error;
    }
  }

  /**
   * Elimina un documento OCR
   */
  async deleteDocument(docId: string): Promise<void> {
    // Primero obtener la ruta del archivo
    const { data: doc } = await supabase
      .from('evt_documentos_ocr')
      .select('ruta_storage')
      .eq('id', docId)
      .single();

    if (doc?.ruta_storage) {
      // Eliminar archivo de storage
      await supabase.storage
        .from('event_docs')
        .remove([doc.ruta_storage]);
    }

    // Eliminar registro
    const { error } = await supabase
      .from('evt_documentos_ocr')
      .delete()
      .eq('id', docId);

    if (error) {
      throw error;
    }
  }

  /**
   * Limpia y valida datos de ticket para evitar errores de BD
   */
  private cleanTicketData(ticketData: any): any {
    if (!ticketData) return null;

    const cleaned: any = {};

    // Campos de texto - limpiar y truncar
    if (ticketData.establecimiento) {
      cleaned.establecimiento = String(ticketData.establecimiento).substring(0, 255);
    }
    if (ticketData.direccion) {
      cleaned.direccion = String(ticketData.direccion).substring(0, 500);
    }
    if (ticketData.telefono) {
      cleaned.telefono = String(ticketData.telefono).substring(0, 20);
    }
    if (ticketData.fecha) {
      cleaned.fecha = String(ticketData.fecha).substring(0, 50);
    }
    if (ticketData.hora) {
      cleaned.hora = String(ticketData.hora).substring(0, 20);
    }
    if (ticketData.forma_pago) {
      cleaned.forma_pago = String(ticketData.forma_pago).substring(0, 50);
    }

    // Campos numéricos - asegurar que sean números válidos
    if (ticketData.total !== undefined && ticketData.total !== null) {
      const total = parseFloat(ticketData.total);
      if (!isNaN(total)) cleaned.total = total;
    }
    if (ticketData.subtotal !== undefined && ticketData.subtotal !== null) {
      const subtotal = parseFloat(ticketData.subtotal);
      if (!isNaN(subtotal)) cleaned.subtotal = subtotal;
    }
    if (ticketData.iva !== undefined && ticketData.iva !== null) {
      const iva = parseFloat(ticketData.iva);
      if (!isNaN(iva)) cleaned.iva = iva;
    }

    // Productos - limpiar array si existe
    if (Array.isArray(ticketData.productos)) {
      cleaned.productos = ticketData.productos.slice(0, 20).map((producto: any) => ({
        nombre: producto.nombre ? String(producto.nombre).substring(0, 200) : '',
        precio_total: producto.precio_total && !isNaN(parseFloat(producto.precio_total)) 
          ? parseFloat(producto.precio_total) : 0
      }));
    }

    return Object.keys(cleaned).length > 0 ? cleaned : null;
  }

  /**
   * Limpia y valida datos de factura para evitar errores de BD
   */
  private cleanFacturaData(facturaData: any): any {
    if (!facturaData) return null;

    const cleaned: any = {};

    // Campos de texto
    if (facturaData.uuid) {
      cleaned.uuid = String(facturaData.uuid).substring(0, 100);
    }
    if (facturaData.serie) {
      cleaned.serie = String(facturaData.serie).substring(0, 20);
    }
    if (facturaData.folio) {
      cleaned.folio = String(facturaData.folio).substring(0, 20);
    }
    if (facturaData.rfc_emisor) {
      cleaned.rfc_emisor = String(facturaData.rfc_emisor).substring(0, 15);
    }
    if (facturaData.rfc_receptor) {
      cleaned.rfc_receptor = String(facturaData.rfc_receptor).substring(0, 15);
    }
    if (facturaData.nombre_emisor) {
      cleaned.nombre_emisor = String(facturaData.nombre_emisor).substring(0, 255);
    }
    if (facturaData.fecha_emision) {
      cleaned.fecha_emision = String(facturaData.fecha_emision).substring(0, 50);
    }
    if (facturaData.estado) {
      cleaned.estado = String(facturaData.estado).substring(0, 50);
    }

    // Campos numéricos
    if (facturaData.total !== undefined && facturaData.total !== null) {
      const total = parseFloat(facturaData.total);
      if (!isNaN(total)) cleaned.total = total;
    }
    if (facturaData.subtotal !== undefined && facturaData.subtotal !== null) {
      const subtotal = parseFloat(facturaData.subtotal);
      if (!isNaN(subtotal)) cleaned.subtotal = subtotal;
    }
    if (facturaData.iva !== undefined && facturaData.iva !== null) {
      const iva = parseFloat(facturaData.iva);
      if (!isNaN(iva)) cleaned.iva = iva;
    }

    // Campos boolean
    if (facturaData.validado_sat !== undefined) {
      cleaned.validado_sat = Boolean(facturaData.validado_sat);
    }

    return Object.keys(cleaned).length > 0 ? cleaned : null;
  }

  /**
   * Reintenta el procesamiento de un documento fallido
   */
  async retryProcessing(docId: string): Promise<OCRProcessingResult> {
    const { error } = await supabase
      .from('evt_documentos_ocr')
      .update({
        estado_procesamiento: 'processing',
        error_mensaje: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', docId);

    if (error) {
      return { success: false, error: error.message };
    }

    // Aquí se reiniciaría el procesamiento real
    return { success: true };
  }
}

export const ocrService = new OCRService();
