/**
 * 📧 Servicio de Alertas de Cobro por Email
 *
 * Funcionalidades:
 * - Enviar alertas previas al vencimiento
 * - Alertas el día del compromiso de pago
 * - Alertas por facturas vencidas
 */

import { supabase } from '../../../core/config/supabase';
import type { Invoice, AlertConfig } from '../types/Invoice';

export class AlertService {
  private static instance: AlertService;

  private constructor() {}

  public static getInstance(): AlertService {
    if (!AlertService.instance) {
      AlertService.instance = new AlertService();
    }
    return AlertService.instance;
  }

  /**
   * Obtiene la configuración de alertas desde la base de datos
   */
  async getAlertConfig(companyId: string): Promise<AlertConfig | null> {
    const { data, error } = await supabase
      .from('config_alertas_cobro')
      .select('*')
      .eq('company_id', companyId)
      .eq('activo', true)
      .single();

    if (error || !data) {
      return null;
    }

    return data as AlertConfig;
  }

  /**
   * Guarda la configuración de alertas
   */
  async saveAlertConfig(companyId: string, config: Partial<AlertConfig>): Promise<AlertConfig> {
    const { data: existing } = await supabase
      .from('config_alertas_cobro')
      .select('id')
      .eq('company_id', companyId)
      .single();

    if (existing) {
      const { data, error } = await supabase
        .from('config_alertas_cobro')
        .update({ ...config, updated_at: new Date().toISOString() })
        .eq('company_id', companyId)
        .select()
        .single();

      if (error) throw error;
      return data as AlertConfig;
    } else {
      const { data, error } = await supabase
        .from('config_alertas_cobro')
        .insert([{ ...config, company_id: companyId }])
        .select()
        .single();

      if (error) throw error;
      return data as AlertConfig;
    }
  }

  /**
   * Verifica qué facturas necesitan alertas basado en fechas de vencimiento
   */
  async verificarFacturasParaAlertas(companyId: string): Promise<{
    previas: Invoice[];
    compromiso: Invoice[];
    vencidas: Invoice[];
  }> {
    const config = await this.getAlertConfig(companyId);

    if (!config || !config.activo) {
      return { previas: [], compromiso: [], vencidas: [] };
    }

    const hoy = new Date();
    const diasPrevios = config.dias_antes_vencimiento || 3;

    // Fecha para alertas previas (X días antes del vencimiento)
    const fechaPreviaInicio = new Date(hoy);
    fechaPreviaInicio.setDate(fechaPreviaInicio.getDate() + diasPrevios);
    const fechaPreviaFin = new Date(fechaPreviaInicio);
    fechaPreviaFin.setDate(fechaPreviaFin.getDate() + 1);

    // Obtener facturas pendientes
    const { data: facturas, error } = await supabase
      .from('eventos_invoices')
      .select(`
        *,
        evento:eventos_events(nombre, cliente_nombre, cliente_email)
      `)
      .eq('company_id', companyId)
      .eq('status', 'pendiente')
      .gt('monto_pendiente', 0);

    if (error || !facturas) {
      return { previas: [], compromiso: [], vencidas: [] };
    }

    const previas: Invoice[] = [];
    const compromiso: Invoice[] = [];
    const vencidas: Invoice[] = [];

    facturas.forEach((factura: any) => {
      const fechaVencimiento = new Date(factura.fecha_vencimiento);
      const diffDias = Math.ceil((fechaVencimiento.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));

      if (diffDias < 0) {
        // Factura vencida
        vencidas.push(factura);
      } else if (diffDias === 0) {
        // Vence hoy (compromiso)
        compromiso.push(factura);
      } else if (diffDias <= diasPrevios) {
        // Próxima a vencer
        previas.push(factura);
      }
    });

    return { previas, compromiso, vencidas };
  }

  /**
   * Envía alertas de cobro por email usando Supabase Edge Function
   */
  async enviarAlertas(
    companyId: string,
    facturas: Invoice[],
    tipo: 'previa' | 'compromiso' | 'vencida'
  ): Promise<{ enviados: number; errores: string[] }> {
    if (facturas.length === 0) {
      return { enviados: 0, errores: [] };
    }

    const errores: string[] = [];
    let enviados = 0;

    for (const factura of facturas) {
      try {
        const emailContent = this.generateEmailContent(factura, tipo);

        // Registrar la alerta en la base de datos
        await supabase.from('log_alertas_cobro').insert([{
          company_id: companyId,
          invoice_id: factura.id,
          tipo_alerta: tipo,
          destinatario: factura.evento?.cliente_email || '',
          asunto: emailContent.subject,
          enviado: false,
          fecha_programada: new Date().toISOString()
        }]);

        // Llamar a la Edge Function para enviar el email
        const { error } = await supabase.functions.invoke('send-collection-alert', {
          body: {
            to: factura.evento?.cliente_email,
            subject: emailContent.subject,
            html: emailContent.html,
            text: emailContent.text,
            invoiceId: factura.id,
            companyId
          }
        });

        if (error) {
          errores.push(`Factura ${factura.numero_factura}: ${error.message}`);
        } else {
          enviados++;
          // Actualizar log como enviado
          await supabase
            .from('log_alertas_cobro')
            .update({ enviado: true, fecha_envio: new Date().toISOString() })
            .eq('invoice_id', factura.id)
            .eq('tipo_alerta', tipo)
            .is('fecha_envio', null);
        }
      } catch (err: any) {
        errores.push(`Factura ${factura.numero_factura}: ${err.message}`);
      }
    }

    return { enviados, errores };
  }

  /**
   * Genera el contenido del email según el tipo de alerta
   */
  generateEmailContent(factura: Invoice, tipo: 'previa' | 'compromiso' | 'vencida'): {
    subject: string;
    html: string;
    text: string;
  } {
    const clienteNombre = factura.evento?.cliente_nombre || 'Cliente';
    const numeroFactura = factura.numero_factura || `FAC-${factura.id}`;
    const monto = new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(factura.monto_pendiente || 0);
    const fechaVencimiento = new Date(factura.fecha_vencimiento).toLocaleDateString('es-MX');

    const templates = {
      previa: {
        subject: `Recordatorio: Factura ${numeroFactura} próxima a vencer`,
        greeting: 'Le recordamos amablemente que',
        message: `su factura ${numeroFactura} por un monto de ${monto} vencerá el ${fechaVencimiento}.`,
        action: 'Agradecemos su pronto pago para evitar inconvenientes.'
      },
      compromiso: {
        subject: `Aviso: Factura ${numeroFactura} vence hoy`,
        greeting: 'Le informamos que',
        message: `su factura ${numeroFactura} por un monto de ${monto} vence el día de hoy.`,
        action: 'Por favor realice su pago para evitar recargos.'
      },
      vencida: {
        subject: `Urgente: Factura ${numeroFactura} vencida`,
        greeting: 'Le notificamos que',
        message: `su factura ${numeroFactura} por un monto de ${monto} se encuentra vencida desde el ${fechaVencimiento}.`,
        action: 'Le solicitamos regularizar su situación a la brevedad posible.'
      }
    };

    const template = templates[tipo];

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #1a56db; color: white; padding: 20px; text-align: center; }
          .content { padding: 30px; background: #f9fafb; }
          .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
          .amount { font-size: 24px; font-weight: bold; color: #1a56db; }
          .date { color: #dc2626; font-weight: bold; }
          .cta {
            display: inline-block;
            padding: 12px 24px;
            background: #1a56db;
            color: white;
            text-decoration: none;
            border-radius: 6px;
            margin-top: 20px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Aviso de Cobro</h1>
          </div>
          <div class="content">
            <p>Estimado(a) <strong>${clienteNombre}</strong>,</p>
            <p>${template.greeting} ${template.message}</p>
            <p class="amount">Monto: ${monto}</p>
            <p>Fecha de vencimiento: <span class="date">${fechaVencimiento}</span></p>
            <p>${template.action}</p>
            <p>Si ya realizó el pago, por favor haga caso omiso de este mensaje.</p>
          </div>
          <div class="footer">
            <p>Este es un mensaje automático del sistema de cobranza.</p>
            <p>Por favor no responda a este correo.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
Estimado(a) ${clienteNombre},

${template.greeting} ${template.message}

Monto: ${monto}
Fecha de vencimiento: ${fechaVencimiento}

${template.action}

Si ya realizó el pago, por favor haga caso omiso de este mensaje.

Este es un mensaje automático del sistema de cobranza.
    `.trim();

    return {
      subject: template.subject,
      html,
      text
    };
  }

  /**
   * Ejecuta el proceso completo de alertas para una empresa
   */
  async ejecutarProcesaAlertas(companyId: string): Promise<{
    resumen: {
      previas: { total: number; enviadas: number };
      compromiso: { total: number; enviadas: number };
      vencidas: { total: number; enviadas: number };
    };
    errores: string[];
  }> {
    const { previas, compromiso, vencidas } = await this.verificarFacturasParaAlertas(companyId);

    const resultPrevias = await this.enviarAlertas(companyId, previas, 'previa');
    const resultCompromiso = await this.enviarAlertas(companyId, compromiso, 'compromiso');
    const resultVencidas = await this.enviarAlertas(companyId, vencidas, 'vencida');

    return {
      resumen: {
        previas: { total: previas.length, enviadas: resultPrevias.enviados },
        compromiso: { total: compromiso.length, enviadas: resultCompromiso.enviados },
        vencidas: { total: vencidas.length, enviadas: resultVencidas.enviados }
      },
      errores: [
        ...resultPrevias.errores,
        ...resultCompromiso.errores,
        ...resultVencidas.errores
      ]
    };
  }
}

export const alertService = AlertService.getInstance();
