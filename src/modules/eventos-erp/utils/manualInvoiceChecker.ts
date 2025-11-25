/**
 * 🤖 Utilidad para ejecutar verificación manual de alertas de facturas
 * 
 * Ejecuta la verificación de facturas y envío de alertas manualmente
 * sin necesidad de esperar al cron job programado
 */

import { alertService } from '../services/alertService';
import { invoiceService } from '../services/invoiceService';

export class ManualInvoiceChecker {
  /**
   * Ejecuta verificación completa y envía alertas
   */
  static async runCheck(): Promise<{
    success: boolean;
    facturasActualizadas: number;
    alertasEnviadas: number;
    desglose: {
      previas: number;
      compromiso: number;
      vencidas: number;
    };
    errors?: string[];
  }> {
    console.log('🤖 [MANUAL] Iniciando verificación manual de facturas...');
    const errors: string[] = [];
    
    try {
      // 1. Actualizar estados de cobro
      console.log('📊 [MANUAL] Actualizando estados de cobro...');
      const facturasActualizadas = await invoiceService.actualizarEstadosAutomaticos();
      console.log(`✅ [MANUAL] ${facturasActualizadas} facturas actualizadas`);
      
      // 2. Verificar facturas que necesitan alertas
      console.log('🔍 [MANUAL] Verificando facturas para alertas...');
      const { previas, compromiso, vencidas } = await alertService.verificarFacturasParaAlertas();
      
      console.log(`📧 [MANUAL] Facturas a procesar:
        - Alertas previas: ${previas.length}
        - Alertas de compromiso: ${compromiso.length}
        - Alertas de vencidas: ${vencidas.length}
      `);
      
      // 3. Enviar alertas
      let totalEnviadas = 0;
      
      if (previas.length > 0) {
        try {
          console.log('📤 [MANUAL] Enviando alertas previas...');
          const enviadas = await alertService.enviarAlertas(previas, 'previa');
          totalEnviadas += enviadas;
          console.log(`✅ [MANUAL] ${enviadas} alertas previas enviadas`);
        } catch (error) {
          const msg = `Error enviando alertas previas: ${error instanceof Error ? error.message : 'Error desconocido'}`;
          console.error('❌ [MANUAL]', msg);
          errors.push(msg);
        }
      }
      
      if (compromiso.length > 0) {
        try {
          console.log('📤 [MANUAL] Enviando alertas de compromiso...');
          const enviadas = await alertService.enviarAlertas(compromiso, 'compromiso');
          totalEnviadas += enviadas;
          console.log(`✅ [MANUAL] ${enviadas} alertas de compromiso enviadas`);
        } catch (error) {
          const msg = `Error enviando alertas de compromiso: ${error instanceof Error ? error.message : 'Error desconocido'}`;
          console.error('❌ [MANUAL]', msg);
          errors.push(msg);
        }
      }
      
      if (vencidas.length > 0) {
        try {
          console.log('📤 [MANUAL] Enviando alertas de vencidas...');
          const enviadas = await alertService.enviarAlertas(vencidas, 'vencida');
          totalEnviadas += enviadas;
          console.log(`✅ [MANUAL] ${enviadas} alertas de vencidas enviadas`);
        } catch (error) {
          const msg = `Error enviando alertas de vencidas: ${error instanceof Error ? error.message : 'Error desconocido'}`;
          console.error('❌ [MANUAL]', msg);
          errors.push(msg);
        }
      }
      
      return {
        success: true,
        facturasActualizadas,
        alertasEnviadas: totalEnviadas,
        desglose: {
          previas: previas.length,
          compromiso: compromiso.length,
          vencidas: vencidas.length
        },
        ...(errors.length > 0 && { errors })
      };
    } catch (error) {
      console.error('❌ [MANUAL] Error general:', error);
      return {
        success: false,
        facturasActualizadas: 0,
        alertasEnviadas: 0,
        desglose: {
          previas: 0,
          compromiso: 0,
          vencidas: 0
        },
        errors: [error instanceof Error ? error.message : 'Error desconocido']
      };
    }
  }
  
  /**
   * Ejecuta verificación solo para un evento específico
   */
  static async runCheckForEvent(eventoId: string): Promise<{
    success: boolean;
    alertasEnviadas: number;
  }> {
    console.log(`🤖 [MANUAL] Verificando facturas del evento ${eventoId}...`);
    
    try {
      // Aquí puedes agregar lógica específica para un evento
      // Por ahora ejecutamos la verificación general
      const result = await this.runCheck();
      
      return {
        success: result.success,
        alertasEnviadas: result.alertasEnviadas
      };
    } catch (error) {
      console.error('❌ [MANUAL] Error:', error);
      return {
        success: false,
        alertasEnviadas: 0
      };
    }
  }
}
