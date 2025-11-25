/**
 * 📧 Servicio de Alertas de Cobro por Email
 * 
 * ⚠️ DESHABILITADO - No se envían alertas automáticas
 * 
 * TODO: Implementar lógica de alertas cuando se requiera
 * Este archivo se mantiene para compatibilidad con código existente
 */

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
   * ⚠️ DESHABILITADO - Obtiene la configuración de alertas
   */
  async getAlertConfig(): Promise<AlertConfig | null> {
    console.warn('⚠️ AlertService deshabilitado - No se envían alertas automáticas');
    return null;
  }

  /**
   * ⚠️ DESHABILITADO - Verifica qué facturas necesitan alertas
   */
  async verificarFacturasParaAlertas(): Promise<{
    previas: Invoice[];
    compromiso: Invoice[];
    vencidas: Invoice[];
  }> {
    console.warn('⚠️ AlertService deshabilitado - No se verifican facturas para alertas');
    return { previas: [], compromiso: [], vencidas: [] };
  }

  /**
   * ⚠️ DESHABILITADO - Envía alertas de cobro
   */
  async enviarAlertas(facturas: Invoice[], tipo: 'previa' | 'compromiso' | 'vencida'): Promise<number> {
    console.warn('⚠️ AlertService deshabilitado - No se envían alertas de cobro');
    console.log(`   Tipo: ${tipo}, Facturas: ${facturas.length}`);
    return 0;
  }

  /**
   * ⚠️ DESHABILITADO - Genera el contenido del email
   */
  generateEmailContent(factura: Invoice, tipo: 'previa' | 'compromiso' | 'vencida'): {
    subject: string;
    html: string;
    text: string;
  } {
    console.warn('⚠️ AlertService deshabilitado - No se genera contenido de email');
    return {
      subject: '',
      html: '',
      text: ''
    };
  }
}

export const alertService = AlertService.getInstance();
