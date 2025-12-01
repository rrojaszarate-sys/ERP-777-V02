/**
 * 🧾 Servicio de Gestión de Facturas Electrónicas (XML CFDI)
 */

import { supabase } from '../../../core/config/supabase';
import { Invoice, InvoiceFilters, InvoiceStats } from '../types/Invoice';
import { parseCFDIXml, CFDIData } from '../utils/cfdiXmlParser';
import { calcularFechaCompromiso, calcularEstadoCobro } from '../utils/dateCalculator';

export class InvoiceService {
  private static instance: InvoiceService;

  private constructor() {}

  public static getInstance(): InvoiceService {
    if (!InvoiceService.instance) {
      InvoiceService.instance = new InvoiceService();
    }
    return InvoiceService.instance;
  }

  /**
   * Procesa un archivo XML CFDI y crea una factura
   */
  async createFromXML(
    xmlFile: File,
    eventoId: string,
    diasCredito: number = 30,
    notasCobro?: string
  ): Promise<Invoice> {
    try {
      console.log('📄 Procesando XML CFDI para crear factura...');
      
      // 1. Leer el contenido del XML
      const xmlContent = await xmlFile.text();
      
      // 2. Parsear el XML
      const cfdiData: CFDIData = await parseCFDIXml(xmlContent);
      
      // 3. Calcular fecha de compromiso
      const fechaEmision = new Date(cfdiData.fecha);
      const fechaCompromiso = calcularFechaCompromiso(fechaEmision, diasCredito);
      
      // 4. Subir el XML a storage
      const xmlUrl = await this.uploadXMLToStorage(xmlFile, cfdiData.timbreFiscal?.uuid || '');
      
      // 5. Preparar datos para inserción
      const facturaData = {
        evento_id: eventoId,
        
        // Datos del XML
        uuid_cfdi: cfdiData.timbreFiscal?.uuid || '',
        fecha_emision: cfdiData.fecha,
        rfc_emisor: cfdiData.emisor.rfc,
        nombre_emisor: cfdiData.emisor.nombre,
        rfc_receptor: cfdiData.receptor.rfc,
        nombre_receptor: cfdiData.receptor.nombre,
        
        // Montos
        subtotal: cfdiData.subtotal,
        iva: cfdiData.impuestos?.totalTraslados || 0,
        total: cfdiData.total,
        moneda: cfdiData.moneda || 'MXN',
        tipo_cambio: cfdiData.tipoCambio || 1,
        
        // Datos fiscales
        forma_pago_sat: cfdiData.formaPago || null,
        metodo_pago_sat: cfdiData.metodoPago || null,
        uso_cfdi: cfdiData.receptor.usoCFDI || null,
        tipo_comprobante: cfdiData.tipoComprobante || 'I',
        serie: cfdiData.serie || null,
        folio: cfdiData.folio || null,
        lugar_expedicion: cfdiData.lugarExpedicion || null,
        
        // Gestión de cobro
        dias_credito: diasCredito,
        fecha_compromiso: fechaCompromiso.toISOString().split('T')[0],
        status_cobro: 'pendiente' as const,
        monto_cobrado: 0,
        status_facturacion: 'facturado' as const,
        
        // Notas
        notas_cobro: notasCobro || null,
        
        // Archivo XML
        xml_url: xmlUrl,
        xml_nombre: xmlFile.name,
        
        // Metadata
        activo: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      console.log('📤 Insertando factura en base de datos...');
      
      // 6. Insertar en la base de datos
      const { data, error } = await supabase
        .from('evt_ingresos_erp')
        .insert([facturaData])
        .select(`
          *,
          evento:eventos_erp(
            id,
            clave_evento,
            nombre_proyecto,
            cliente:clientes_erp(
              id,
              razon_social,
              rfc,
              email,
              email_contacto
            ),
            responsable:users_erp(
              id,
              nombre,
              email
            )
          )
        `)
        .single();
      
      if (error) {
        console.error('❌ Error al insertar factura:', error);
        throw error;
      }
      
      console.log('✅ Factura creada exitosamente:', data.uuid_cfdi);
      
      return data as Invoice;
    } catch (error) {
      console.error('❌ Error al crear factura desde XML:', error);
      throw error;
    }
  }

  /**
   * Obtiene todas las facturas con filtros
   */
  async getInvoices(filters?: InvoiceFilters): Promise<Invoice[]> {
    try {
      let query = supabase
        .from('evt_ingresos_erp')
        .select(`
          *,
          evento:eventos_erp(
            id,
            clave_evento,
            nombre_proyecto,
            cliente:clientes_erp(
              id,
              razon_social,
              rfc,
              email,
              email_contacto
            ),
            responsable:users_erp(
              id,
              nombre,
              email
            )
          )
        `)
        .eq('activo', true)
        .not('uuid_cfdi', 'is', null);
      
      // Aplicar filtros
      if (filters?.year) {
        query = query.gte('fecha_emision', `${filters.year}-01-01`)
                    .lt('fecha_emision', `${filters.year + 1}-01-01`);
      }
      
      if (filters?.month) {
        const monthStr = filters.month.toString().padStart(2, '0');
        query = query.gte('fecha_emision', `${filters.year || new Date().getFullYear()}-${monthStr}-01`)
                    .lt('fecha_emision', `${filters.year || new Date().getFullYear()}-${monthStr === '12' ? '01' : (parseInt(monthStr) + 1).toString().padStart(2, '0')}-01`);
      }
      
      if (filters?.status_cobro && filters.status_cobro.length > 0) {
        query = query.in('status_cobro', filters.status_cobro);
      }
      
      if (filters?.cliente) {
        // Necesitamos hacer join para filtrar por cliente
        // Por ahora filtramos en el cliente
      }
      
      if (filters?.fecha_desde) {
        query = query.gte('fecha_compromiso', filters.fecha_desde);
      }
      
      if (filters?.fecha_hasta) {
        query = query.lte('fecha_compromiso', filters.fecha_hasta);
      }
      
      // Ordenar por fecha de compromiso (las más urgentes primero)
      query = query.order('fecha_compromiso', { ascending: true });
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      let facturas = data as Invoice[] || [];
      
      // Filtros adicionales en el cliente
      if (filters?.cliente) {
        facturas = facturas.filter(f => 
          f.evento?.cliente?.razon_social?.toLowerCase().includes(filters.cliente!.toLowerCase())
        );
      }
      
      if (filters?.proximas_vencer) {
        const hoy = new Date();
        const en7Dias = new Date(hoy);
        en7Dias.setDate(en7Dias.getDate() + 7);
        
        facturas = facturas.filter(f => {
          const fechaCompromiso = new Date(f.fecha_compromiso);
          return fechaCompromiso >= hoy && fechaCompromiso <= en7Dias && f.status_cobro === 'pendiente';
        });
      }
      
      if (filters?.vencidas) {
        const hoy = new Date();
        facturas = facturas.filter(f => {
          const fechaCompromiso = new Date(f.fecha_compromiso);
          return fechaCompromiso < hoy && f.status_cobro !== 'cobrado' && f.status_cobro !== 'cancelado';
        });
      }
      
      return facturas;
    } catch (error) {
      console.error('Error al obtener facturas:', error);
      return [];
    }
  }

  /**
   * Obtiene una factura por ID
   */
  async getInvoiceById(id: string): Promise<Invoice | null> {
    try {
      const { data, error } = await supabase
        .from('evt_ingresos_erp')
        .select(`
          *,
          evento:eventos_erp(
            id,
            clave_evento,
            nombre_proyecto,
            cliente:clientes_erp(
              id,
              razon_social,
              rfc,
              email,
              email_contacto
            ),
            responsable:users_erp(
              id,
              nombre,
              email
            )
          )
        `)
        .eq('id', id)
        .single();
      
      if (error) throw error;
      
      return data as Invoice;
    } catch (error) {
      console.error('Error al obtener factura:', error);
      return null;
    }
  }

  /**
   * Actualiza el estado de cobro de una factura
   */
  async updateCobroStatus(
    id: string,
    montoCobrado: number,
    notas?: string
  ): Promise<Invoice> {
    try {
      // Obtener factura actual
      const factura = await this.getInvoiceById(id);
      if (!factura) throw new Error('Factura no encontrada');
      
      // Calcular nuevo estado
      const nuevoEstado = calcularEstadoCobro(
        new Date(factura.fecha_compromiso),
        montoCobrado,
        factura.total,
        factura.status_cobro
      );
      
      // Actualizar
      const { data, error } = await supabase
        .from('evt_ingresos_erp')
        .update({
          monto_cobrado: montoCobrado,
          status_cobro: nuevoEstado,
          notas_cobro: notas || factura.notas_cobro,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      
      console.log(`✅ Estado de cobro actualizado: ${nuevoEstado}`);
      
      return data as Invoice;
    } catch (error) {
      console.error('Error al actualizar estado de cobro:', error);
      throw error;
    }
  }

  /**
   * Marca una factura como cobrada
   */
  async marcarComoCobrado(id: string, notas?: string): Promise<Invoice> {
    const factura = await this.getInvoiceById(id);
    if (!factura) throw new Error('Factura no encontrada');
    
    return this.updateCobroStatus(id, factura.total, notas);
  }

  /**
   * Cancela una factura
   */
  async cancelarFactura(id: string, motivo?: string): Promise<Invoice> {
    try {
      const { data, error } = await supabase
        .from('evt_ingresos_erp')
        .update({
          status_cobro: 'cancelado',
          status_facturacion: 'cancelado',
          notas_cobro: motivo ? `CANCELADA: ${motivo}` : 'CANCELADA',
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      
      console.log('✅ Factura cancelada');
      
      return data as Invoice;
    } catch (error) {
      console.error('Error al cancelar factura:', error);
      throw error;
    }
  }

  /**
   * Obtiene estadísticas de facturas
   */
  async getStats(filters?: InvoiceFilters): Promise<InvoiceStats> {
    const facturas = await this.getInvoices(filters);
    
    const stats: InvoiceStats = {
      total_facturas: facturas.length,
      total_monto: facturas.reduce((sum, f) => sum + f.total, 0),
      pendientes: facturas.filter(f => f.status_cobro === 'pendiente').length,
      monto_pendiente: facturas.filter(f => f.status_cobro === 'pendiente').reduce((sum, f) => sum + f.total, 0),
      vencidas: facturas.filter(f => f.status_cobro === 'vencido').length,
      monto_vencido: facturas.filter(f => f.status_cobro === 'vencido').reduce((sum, f) => sum + f.total, 0),
      proximas_vencer: 0,
      cobradas: facturas.filter(f => f.status_cobro === 'cobrado').length,
      monto_cobrado: facturas.filter(f => f.status_cobro === 'cobrado').reduce((sum, f) => sum + f.monto_cobrado, 0)
    };
    
    // Calcular próximas a vencer (7 días)
    const hoy = new Date();
    const en7Dias = new Date(hoy);
    en7Dias.setDate(en7Dias.getDate() + 7);
    
    stats.proximas_vencer = facturas.filter(f => {
      if (f.status_cobro !== 'pendiente') return false;
      const fechaCompromiso = new Date(f.fecha_compromiso);
      return fechaCompromiso >= hoy && fechaCompromiso <= en7Dias;
    }).length;
    
    return stats;
  }

  /**
   * Sube el archivo XML a Supabase Storage
   */
  private async uploadXMLToStorage(xmlFile: File, uuid: string): Promise<string> {
    try {
      const fileName = `${uuid}_${Date.now()}.xml`;
      const filePath = `facturas-xml/${fileName}`;
      
      const { data, error } = await supabase.storage
        .from('event_docs')
        .upload(filePath, xmlFile, {
          contentType: 'text/xml',
          upsert: false
        });
      
      if (error) {
        console.warn('⚠️ Error al subir XML a storage:', error);
        return ''; // No es crítico, continuar sin URL
      }
      
      // Obtener URL pública
      const { data: urlData } = supabase.storage
        .from('event_docs')
        .getPublicUrl(data.path);
      
      return urlData.publicUrl;
    } catch (error) {
      console.warn('⚠️ Error al subir XML:', error);
      return '';
    }
  }

  /**
   * Actualiza los estados de cobro automáticamente
   * (Para ejecutar diariamente)
   */
  async actualizarEstadosAutomaticos(): Promise<number> {
    try {
      console.log('🔄 Actualizando estados de cobro automáticamente...');
      
      const facturasPendientes = await this.getInvoices({
        status_cobro: ['pendiente', 'parcial']
      });
      
      let actualizadas = 0;
      
      for (const factura of facturasPendientes) {
        const nuevoEstado = calcularEstadoCobro(
          new Date(factura.fecha_compromiso),
          factura.monto_cobrado,
          factura.total,
          factura.status_cobro
        );
        
        if (nuevoEstado !== factura.status_cobro) {
          await supabase
            .from('evt_ingresos_erp')
            .update({ status_cobro: nuevoEstado })
            .eq('id', factura.id);
          
          actualizadas++;
        }
      }
      
      console.log(`✅ ${actualizadas} facturas actualizadas`);
      return actualizadas;
    } catch (error) {
      console.error('Error al actualizar estados:', error);
      return 0;
    }
  }
}

export const invoiceService = InvoiceService.getInstance();
