/**
 * VERCEL SERVERLESS FUNCTION: Daily Reports
 * 
 * Endpoint: /api/cron/daily-report
 * Método: GET
 * Headers: { "Authorization": "Bearer CRON_SECRET" }
 * 
 * Configurar en Vercel:
 * Settings → Cron Jobs → Add Cron Job
 * Schedule: 0 9 * * * (Diario a las 9am)
 */

import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';

export default async function handler(req, res) {
  // Verificar autenticación
  const authHeader = req.headers.authorization;
  const cronSecret = process.env.CRON_SECRET;

  if (!authHeader || authHeader !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // Inicializar Supabase
    const supabase = createClient(
      process.env.VITE_SUPABASE_URL,
      process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
    );

    // Obtener eventos pendientes
    const { data: eventos, error: eventosError } = await supabase
      .from('evt_eventos')
      .select('*, evt_clientes(*)')
      .or('estado.eq.Cotización,estado.eq.Contratado,estado.eq.Producción')
      .order('fecha_evento', { ascending: true });

    if (eventosError) throw eventosError;

    // Obtener facturas pendientes de cobro
    const { data: facturas, error: facturasError } = await supabase
      .from('evt_ingresos')
      .select('*, evt_eventos(*)')
      .eq('estatus_cobro', 'pendiente')
      .order('fecha_vencimiento', { ascending: true });

    if (facturasError) throw facturasError;

    // Generar reporte HTML
    const htmlReport = generateHTMLReport(eventos, facturas);

    // Enviar email
    const emailSent = await sendEmail(htmlReport);

    // Guardar en historial
    await supabase
      .from('historial_reportes_diarios')
      .insert({
        fecha_generacion: new Date().toISOString(),
        tipo_reporte: 'diario',
        eventos_pendientes: eventos?.length || 0,
        facturas_pendientes: facturas?.length || 0,
        enviado_por_email: emailSent,
        contenido: htmlReport
      });

    return res.status(200).json({
      success: true,
      message: 'Daily report generated and sent',
      stats: {
        eventos: eventos?.length || 0,
        facturas: facturas?.length || 0,
        emailSent
      }
    });

  } catch (error) {
    console.error('Error generating daily report:', error);
    return res.status(500).json({
      error: 'Failed to generate report',
      message: error.message
    });
  }
}

function generateHTMLReport(eventos, facturas) {
  const today = new Date().toLocaleDateString('es-MX', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .header { background: #4F46E5; color: white; padding: 20px; text-align: center; }
        .section { margin: 20px; padding: 20px; background: #f9f9f9; border-radius: 8px; }
        .event { background: white; padding: 15px; margin: 10px 0; border-left: 4px solid #4F46E5; }
        .urgent { border-left-color: #EF4444; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>📊 Reporte Diario - MADE ERP</h1>
        <p>${today}</p>
      </div>

      <div class="section">
        <h2>🎯 Eventos Activos (${eventos?.length || 0})</h2>
        ${eventos?.map(e => `
          <div class="event">
            <strong>${e.nombre_evento}</strong><br>
            Cliente: ${e.evt_clientes?.nombre_comercial || 'N/A'}<br>
            Fecha: ${new Date(e.fecha_evento).toLocaleDateString('es-MX')}<br>
            Estado: ${e.estado}
          </div>
        `).join('') || '<p>No hay eventos activos</p>'}
      </div>

      <div class="section">
        <h2>💰 Facturas Pendientes (${facturas?.length || 0})</h2>
        ${facturas?.map(f => {
          const vencida = new Date(f.fecha_vencimiento) < new Date();
          return `
            <div class="event ${vencida ? 'urgent' : ''}">
              <strong>${f.evt_eventos?.nombre_evento || 'Sin evento'}</strong><br>
              Monto: $${f.monto_total?.toLocaleString('es-MX')}<br>
              Vencimiento: ${new Date(f.fecha_vencimiento).toLocaleDateString('es-MX')}
              ${vencida ? ' <strong style="color: #EF4444;">⚠️ VENCIDA</strong>' : ''}
            </div>
          `;
        }).join('') || '<p>No hay facturas pendientes</p>'}
      </div>

      <div class="footer">
        <p>Este es un reporte automático generado por MADE ERP</p>
      </div>
    </body>
    </html>
  `;
}

async function sendEmail(htmlContent) {
  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD
      }
    });

    await transporter.sendMail({
      from: process.env.GMAIL_USER,
      to: process.env.GMAIL_USER, // Enviar a ti mismo
      subject: `📊 Reporte Diario MADE ERP - ${new Date().toLocaleDateString('es-MX')}`,
      html: htmlContent
    });

    return true;
  } catch (error) {
    console.error('Error sending email:', error);
    return false;
  }
}
