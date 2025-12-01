/**
 * 🤖 Cron Job - Verificación Diaria de Alertas de Facturas
 * 
 * Este script debe ejecutarse diariamente (recomendado: 9:00 AM)
 * 
 * CONFIGURACIÓN EN VERCEL:
 * 1. Crear archivo vercel.json con:
 *    {
 *      "crons": [{
 *        "path": "/api/cron/check-invoices",
 *        "schedule": "0 9 * * *"
 *      }]
 *    }
 * 
 * CONFIGURACIÓN EN SUPABASE:
 * 1. Ir a Database → Extensions → pg_cron
 * 2. Ejecutar:
 *    SELECT cron.schedule(
 *      'check-invoices-daily',
 *      '0 9 * * *',
 *      $$
 *      SELECT net.http_post(
 *        url:='https://tu-app.vercel.app/api/cron/check-invoices',
 *        headers:='{"Content-Type": "application/json", "Authorization": "Bearer YOUR_SECRET"}'::jsonb
 *      )
 *      $$
 *    );
 */

import { NextRequest, NextResponse } from 'next/server';
import { alertService } from '@/modules/eventos-erp/services/alertService';
import { invoiceService } from '@/modules/eventos-erp/services/invoiceService';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  try {
    console.log('🤖 [CRON] Iniciando verificación diaria de facturas...');
    
    // Verificar autorización
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      console.warn('⚠️ [CRON] Intento de acceso no autorizado');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const startTime = Date.now();
    
    // 1. Actualizar estados de cobro automáticamente
    console.log('📊 [CRON] Actualizando estados de cobro...');
    const facturasActualizadas = await invoiceService.actualizarEstadosAutomaticos();
    console.log(`✅ [CRON] ${facturasActualizadas} facturas actualizadas`);
    
    // 2. Verificar facturas que necesitan alertas
    console.log('🔍 [CRON] Verificando facturas para alertas...');
    const { previas, compromiso, vencidas } = await alertService.verificarFacturasParaAlertas();
    
    console.log(`📧 [CRON] Facturas a procesar:
      - Alertas previas: ${previas.length}
      - Alertas de compromiso: ${compromiso.length}
      - Alertas de vencidas: ${vencidas.length}
    `);
    
    // 3. Enviar alertas
    let totalEnviadas = 0;
    
    if (previas.length > 0) {
      console.log('📤 [CRON] Enviando alertas previas...');
      const enviadas = await alertService.enviarAlertas(previas, 'previa');
      totalEnviadas += enviadas;
      console.log(`✅ [CRON] ${enviadas} alertas previas enviadas`);
    }
    
    if (compromiso.length > 0) {
      console.log('📤 [CRON] Enviando alertas de compromiso...');
      const enviadas = await alertService.enviarAlertas(compromiso, 'compromiso');
      totalEnviadas += enviadas;
      console.log(`✅ [CRON] ${enviadas} alertas de compromiso enviadas`);
    }
    
    if (vencidas.length > 0) {
      console.log('📤 [CRON] Enviando alertas de vencidas...');
      const enviadas = await alertService.enviarAlertas(vencidas, 'vencida');
      totalEnviadas += enviadas;
      console.log(`✅ [CRON] ${enviadas} alertas de vencidas enviadas`);
    }
    
    const duration = Date.now() - startTime;
    
    const result = {
      success: true,
      timestamp: new Date().toISOString(),
      duration: `${duration}ms`,
      summary: {
        facturas_actualizadas: facturasActualizadas,
        alertas_enviadas: totalEnviadas,
        desglose: {
          previas: previas.length,
          compromiso: compromiso.length,
          vencidas: vencidas.length
        }
      }
    };
    
    console.log('✅ [CRON] Proceso completado:', result);
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('❌ [CRON] Error en el proceso:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Error desconocido',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

// Endpoint POST para ejecución manual
export async function POST(request: NextRequest) {
  console.log('🔧 [CRON] Ejecución manual solicitada');
  return GET(request);
}
