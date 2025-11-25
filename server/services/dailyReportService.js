/**
 * 📊 SERVICIO DE REPORTES DIARIOS PARA RESPONSABLES
 * 
 * Envía diariamente a cada responsable un email con:
 * - Lista de sus ingresos pendientes
 * - Categorizados por urgencia (vencidas, hoy, semana, próximas)
 * - KPIs y resumen ejecutivo
 * - Acciones recomendadas
 */

import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Cargar variables de entorno
dotenv.config({ path: join(__dirname, '..', '..', '.env') });

// Inicializar Supabase con Service Role (permisos completos)
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
);

export class DailyReportService {
  constructor() {
    // Configurar transportador de email
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD
      }
    });
  }

  /**
   * MÉTODO PRINCIPAL: Envía reportes diarios a todos los responsables
   */
  async enviarReportesDiarios() {
    console.log('');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('  📊 GENERACIÓN DE REPORTES DIARIOS');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`  🕐 Inicio: ${new Date().toLocaleString('es-MX')}`);
    console.log('═══════════════════════════════════════════════════════════');
    console.log('');
    
    const startTime = Date.now();
    let reportesEnviados = 0;
    let errores = 0;
    const erroresDetalle = [];

    try {
      // 1. Obtener responsables que tienen ingresos pendientes
      console.log('🔍 Buscando responsables con ingresos pendientes...');
      const responsables = await this.getResponsablesConIngresosPendientes();
      
      console.log(`👥 Responsables encontrados: ${responsables.length}`);
      console.log('');

      if (responsables.length === 0) {
        console.log('ℹ️  No hay responsables con ingresos pendientes.');
        console.log('   El sistema está al día. ✅');
        return {
          success: true,
          reportesEnviados: 0,
          errores: 0,
          mensaje: 'No hay ingresos pendientes'
        };
      }

      // 2. Enviar reporte a cada responsable
      for (let i = 0; i < responsables.length; i++) {
        const responsable = responsables[i];
        const numero = i + 1;
        
        console.log(`[${numero}/${responsables.length}] Procesando: ${responsable.nombre}`);
        console.log(`   Email: ${responsable.email}`);
        
        try {
          await this.enviarReporteResponsable(responsable);
          reportesEnviados++;
          console.log(`   ✅ Reporte enviado exitosamente`);
        } catch (error) {
          errores++;
          const errorMsg = error.message || 'Error desconocido';
          erroresDetalle.push({
            responsable: responsable.nombre,
            email: responsable.email,
            error: errorMsg
          });
          console.error(`   ❌ Error: ${errorMsg}`);
        }
        
        console.log('');
      }

      const duration = Date.now() - startTime;
      const duracionSegundos = (duration / 1000).toFixed(2);

      console.log('═══════════════════════════════════════════════════════════');
      console.log('  ✅ REPORTES DIARIOS COMPLETADOS');
      console.log('═══════════════════════════════════════════════════════════');
      console.log(`  📨 Enviados: ${reportesEnviados}`);
      console.log(`  ❌ Errores: ${errores}`);
      console.log(`  ⏱️  Duración: ${duracionSegundos}s`);
      console.log(`  🕐 Fin: ${new Date().toLocaleString('es-MX')}`);
      console.log('═══════════════════════════════════════════════════════════');
      console.log('');

      if (errores > 0) {
        console.log('⚠️  ERRORES DETECTADOS:');
        erroresDetalle.forEach((err, idx) => {
          console.log(`   ${idx + 1}. ${err.responsable} (${err.email}): ${err.error}`);
        });
        console.log('');
      }

      return {
        success: true,
        reportesEnviados,
        errores,
        erroresDetalle,
        duracion: `${duracionSegundos}s`,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('');
      console.error('═══════════════════════════════════════════════════════════');
      console.error('  ❌ ERROR GENERAL EN REPORTES DIARIOS');
      console.error('═══════════════════════════════════════════════════════════');
      console.error(`  Error: ${error.message}`);
      console.error('═══════════════════════════════════════════════════════════');
      console.error('');
      
      throw error;
    }
  }

  /**
   * Obtiene lista de responsables únicos que tienen ingresos pendientes
   */
  async getResponsablesConIngresosPendientes() {
    const { data, error } = await supabase
      .from('evt_ingresos')
      .select(`
        evento:evt_eventos!inner(
          usuario_responsable_id,
          responsable:usuarios!usuario_responsable_id(
            id,
            nombre,
            email
          )
        )
      `)
      .eq('status_cobro', 'pendiente')
      .not('fecha_compromiso', 'is', null);

    if (error) {
      console.error('❌ Error al obtener responsables:', error);
      throw new Error(`Error obteniendo responsables: ${error.message}`);
    }

    // Extraer responsables únicos y filtrar nulos
    const responsablesMap = new Map();
    
    data?.forEach(ingreso => {
      const responsable = ingreso.evento?.responsable;
      if (responsable && responsable.id && responsable.email && !responsablesMap.has(responsable.id)) {
        responsablesMap.set(responsable.id, {
          id: responsable.id,
          nombre: responsable.nombre || 'Sin nombre',
          email: responsable.email
        });
      }
    });

    return Array.from(responsablesMap.values());
  }

  /**
   * Envía reporte individual a un responsable específico
   */
  async enviarReporteResponsable(responsable) {
    // 1. Obtener ingresos pendientes del responsable
    const ingresos = await this.getIngresosPorResponsable(responsable.id);
    
    if (ingresos.length === 0) {
      console.log(`   ℹ️  Sin ingresos pendientes, omitiendo envío`);
      return;
    }

    console.log(`   📋 Ingresos pendientes: ${ingresos.length}`);

    // 2. Categorizar ingresos por urgencia
    const categorizado = this.categorizarIngresos(ingresos);
    
    console.log(`   🔴 Vencidas: ${categorizado.vencidas.length}`);
    console.log(`   🟠 Hoy: ${categorizado.hoy.length}`);
    console.log(`   🟡 Esta semana: ${categorizado.semana.length}`);
    console.log(`   🟢 Próximas: ${categorizado.proximas.length}`);

    // 3. Calcular KPIs
    const kpis = this.calcularKPIs(categorizado);
    
    console.log(`   💰 Monto total pendiente: ${this.formatMoney(kpis.montoTotal)}`);

    // 4. Generar contenido del email
    const { subject, html, text } = this.generarEmailReporte(
      responsable,
      categorizado,
      kpis
    );
    
    // 5. Enviar email
    console.log(`   📧 Enviando email...`);
    await this.transporter.sendMail({
      from: `"Sistema ERP - Made Group" <${process.env.GMAIL_USER}>`,
      to: responsable.email,
      subject,
      html,
      text
    });
    
    // 6. Registrar en historial
    await this.registrarEnHistorial(responsable.id, kpis, responsable.email, true);
  }

  /**
   * Obtiene todos los ingresos pendientes de un responsable
   */
  async getIngresosPorResponsable(responsableId) {
    const { data, error } = await supabase
      .from('evt_ingresos')
      .select(`
        *,
        evento:evt_eventos!inner(
          id,
          nombre,
          cliente:clientes(
            id,
            nombre,
            rfc
          )
        )
      `)
      .eq('evento.usuario_responsable_id', responsableId)
      .eq('status_cobro', 'pendiente')
      .not('fecha_compromiso', 'is', null)
      .order('fecha_compromiso', { ascending: true });

    if (error) {
      throw new Error(`Error obteniendo ingresos: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Categoriza ingresos por urgencia basándose en fecha de vencimiento
   */
  categorizarIngresos(ingresos) {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    const categorias = {
      vencidas: [],
      hoy: [],
      semana: [],
      proximas: []
    };

    ingresos.forEach(ingreso => {
      const fechaCompromiso = new Date(ingreso.fecha_compromiso);
      fechaCompromiso.setHours(0, 0, 0, 0);
      
      const diffTime = fechaCompromiso - hoy;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      const ingresoConDias = {
        ...ingreso,
        diasDiferencia: Math.abs(diffDays)
      };

      if (diffDays < 0) {
        // Vencida
        categorias.vencidas.push(ingresoConDias);
      } else if (diffDays === 0) {
        // Vence hoy
        categorias.hoy.push(ingresoConDias);
      } else if (diffDays <= 7) {
        // Vence esta semana
        categorias.semana.push(ingresoConDias);
      } else {
        // Próxima (más de 7 días)
        categorias.proximas.push(ingresoConDias);
      }
    });

    return categorias;
  }

  /**
   * Calcula KPIs del reporte
   */
  calcularKPIs(categorizado) {
    const calcularTotal = (categoria) => {
      return categoria.reduce((sum, ing) => sum + Number(ing.total || 0), 0);
    };

    return {
      totalIngresos: 
        categorizado.vencidas.length + 
        categorizado.hoy.length + 
        categorizado.semana.length + 
        categorizado.proximas.length,
      totalVencidas: categorizado.vencidas.length,
      totalHoy: categorizado.hoy.length,
      totalSemana: categorizado.semana.length,
      totalProximas: categorizado.proximas.length,
      montoTotal: 
        calcularTotal(categorizado.vencidas) +
        calcularTotal(categorizado.hoy) +
        calcularTotal(categorizado.semana) +
        calcularTotal(categorizado.proximas),
      montoVencidas: calcularTotal(categorizado.vencidas),
      montoHoy: calcularTotal(categorizado.hoy),
      montoSemana: calcularTotal(categorizado.semana),
      montoProximas: calcularTotal(categorizado.proximas)
    };
  }

  /**
   * Genera el contenido HTML y texto del email
   */
  generarEmailReporte(responsable, categorizado, kpis) {
    const fecha = new Date().toLocaleDateString('es-MX', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const subject = `📊 Reporte Diario de Cobros - ${fecha}`;

    // Generar HTML (continúa en el siguiente archivo por longitud)
    const html = this.generarHTML(responsable, categorizado, kpis, fecha);
    const text = this.generarTextoPlano(responsable, categorizado, kpis, fecha);

    return { subject, html, text };
  }

  /**
   * Genera el HTML del email con diseño profesional
   */
  generarHTML(responsable, categorizado, kpis, fecha) {
    const styles = `
      body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
      .container { max-width: 800px; margin: 0 auto; padding: 20px; }
      .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center; }
      .content { background: #f9fafb; padding: 30px; }
      .kpi-container { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin: 20px 0; }
      .kpi-card { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); text-align: center; }
      .kpi-value { font-size: 28px; font-weight: bold; margin: 10px 0; }
      .kpi-label { font-size: 14px; color: #666; }
      .section { margin: 30px 0; background: white; padding: 25px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
      .section-title { font-size: 20px; font-weight: bold; margin-bottom: 20px; padding-bottom: 10px; border-bottom: 3px solid #e5e7eb; }
      .ingreso-item { padding: 15px; margin: 10px 0; border-left: 4px solid #ccc; background: #f9fafb; border-radius: 4px; }
      .ingreso-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
      .cliente-nombre { font-size: 18px; font-weight: bold; }
      .monto { font-size: 20px; font-weight: bold; color: #1e3a8a; }
      .detalle { margin: 5px 0; font-size: 14px; }
      .label { font-weight: 600; color: #666; }
      .alerta-vencida { border-left-color: #dc2626; background: #fef2f2; }
      .alerta-hoy { border-left-color: #ea580c; background: #fff7ed; }
      .alerta-semana { border-left-color: #ca8a04; background: #fefce8; }
      .alerta-proxima { border-left-color: #16a34a; background: #f0fdf4; }
      .footer { background: #374151; color: white; padding: 20px; text-align: center; border-radius: 0 0 10px 10px; }
      .no-items { text-align: center; padding: 20px; color: #999; font-style: italic; }
    `;

    const renderIngreso = (ingreso, color) => {
      const cliente = ingreso.evento?.cliente?.nombre || 'Cliente sin nombre';
      const proyecto = ingreso.evento?.nombre || 'Proyecto sin nombre';
      const folio = ingreso.serie && ingreso.folio ? `${ingreso.serie}-${ingreso.folio}` : ingreso.uuid_cfdi?.substring(0, 8) || 'Sin folio';
      const fechaEmision = this.formatDate(ingreso.fecha_emision);
      const fechaVencimiento = this.formatDate(ingreso.fecha_compromiso);
      const monto = this.formatMoney(ingreso.total);
      const notas = ingreso.notas_cobro || '';
      
      return `
        <div class="ingreso-item alerta-${color}">
          <div class="ingreso-header">
            <span class="cliente-nombre">${cliente}</span>
            <span class="monto">${monto}</span>
          </div>
          <div class="detalle"><span class="label">Proyecto:</span> ${proyecto}</div>
          <div class="detalle"><span class="label">Factura:</span> ${folio}</div>
          <div class="detalle"><span class="label">Fecha emisión:</span> ${fechaEmision}</div>
          <div class="detalle"><span class="label">Fecha vencimiento:</span> ${fechaVencimiento}</div>
          ${ingreso.diasDiferencia ? `<div class="detalle"><span class="label">Días ${ingreso.diasDiferencia > 0 ? (color === 'vencida' ? 'vencida' : 'hasta vencimiento') : ''}:</span> ${ingreso.diasDiferencia}</div>` : ''}
          ${notas ? `<div class="detalle"><span class="label">Notas:</span> ${notas}</div>` : ''}
        </div>
      `;
    };

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>${styles}</style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📊 Reporte Diario de Cobros</h1>
            <p>${fecha}</p>
          </div>
          
          <div class="content">
            <h2>Buenos días, ${responsable.nombre}</h2>
            <p>Este es tu reporte diario de ingresos pendientes de cobro.</p>
            
            <div class="kpi-container">
              <div class="kpi-card">
                <div class="kpi-value">${kpis.totalIngresos}</div>
                <div class="kpi-label">Total Pendientes</div>
              </div>
              <div class="kpi-card">
                <div class="kpi-value">${this.formatMoney(kpis.montoTotal)}</div>
                <div class="kpi-label">Monto Total</div>
              </div>
              <div class="kpi-card" style="background: #fef2f2;">
                <div class="kpi-value" style="color: #dc2626;">${kpis.totalVencidas}</div>
                <div class="kpi-label">Vencidas</div>
              </div>
              <div class="kpi-card" style="background: #fff7ed;">
                <div class="kpi-value" style="color: #ea580c;">${kpis.totalHoy}</div>
                <div class="kpi-label">Vencen Hoy</div>
              </div>
            </div>
            
            ${kpis.totalVencidas > 0 ? `
            <div class="section">
              <div class="section-title">🔴 FACTURAS VENCIDAS (URGENTE)</div>
              ${categorizado.vencidas.map(ing => renderIngreso(ing, 'vencida')).join('')}
            </div>
            ` : ''}
            
            ${kpis.totalHoy > 0 ? `
            <div class="section">
              <div class="section-title">🟠 FACTURAS QUE VENCEN HOY</div>
              ${categorizado.hoy.map(ing => renderIngreso(ing, 'hoy')).join('')}
            </div>
            ` : ''}
            
            ${kpis.totalSemana > 0 ? `
            <div class="section">
              <div class="section-title">🟡 FACTURAS QUE VENCEN ESTA SEMANA</div>
              ${categorizado.semana.map(ing => renderIngreso(ing, 'semana')).join('')}
            </div>
            ` : ''}
            
            ${kpis.totalProximas > 0 ? `
            <div class="section">
              <div class="section-title">🟢 PRÓXIMAS FACTURAS</div>
              ${categorizado.proximas.slice(0, 5).map(ing => renderIngreso(ing, 'proxima')).join('')}
              ${kpis.totalProximas > 5 ? `<div class="no-items">... y ${kpis.totalProximas - 5} más</div>` : ''}
            </div>
            ` : ''}
            
            ${kpis.totalVencidas > 0 || kpis.totalHoy > 0 ? `
            <div class="section">
              <div class="section-title">💡 ACCIONES RECOMENDADAS</div>
              <ol style="line-height: 2;">
                ${categorizado.vencidas.slice(0, 3).map((ing, idx) => 
                  `<li><strong>Prioridad ${idx + 1}:</strong> Contactar urgentemente a ${ing.evento?.cliente?.nombre} (${ing.diasDiferencia} días vencida, ${this.formatMoney(ing.total)})</li>`
                ).join('')}
                ${categorizado.hoy.slice(0, 2).map((ing) => 
                  `<li>Llamar hoy a ${ing.evento?.cliente?.nombre} (vence hoy, ${this.formatMoney(ing.total)})</li>`
                ).join('')}
              </ol>
            </div>
            ` : ''}
          </div>
          
          <div class="footer">
            <p>Este es un reporte automático generado diariamente.</p>
            <p>Si tienes preguntas, contacta al área de facturación.</p>
            <p><strong>Sistema ERP - Made Group</strong></p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Genera versión de texto plano del email
   */
  generarTextoPlano(responsable, categorizado, kpis, fecha) {
    const renderIngresoTexto = (ingreso) => {
      const cliente = ingreso.evento?.cliente?.nombre || 'Sin cliente';
      const proyecto = ingreso.evento?.nombre || 'Sin proyecto';
      const folio = ingreso.serie && ingreso.folio ? `${ingreso.serie}-${ingreso.folio}` : 'Sin folio';
      const monto = this.formatMoney(ingreso.total);
      const fechaVencimiento = this.formatDate(ingreso.fecha_compromiso);
      
      return `
  - Cliente: ${cliente}
    Proyecto: ${proyecto}
    Factura: ${folio}
    Monto: ${monto}
    Vencimiento: ${fechaVencimiento}
    ${ingreso.diasDiferencia ? `Días: ${ingreso.diasDiferencia}` : ''}
    ${ingreso.notas_cobro ? `Notas: ${ingreso.notas_cobro}` : ''}
      `.trim();
    };

    return `
📊 REPORTE DIARIO DE COBROS
${fecha}

Buenos días, ${responsable.nombre}

Este es tu reporte diario de ingresos pendientes de cobro.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
RESUMEN EJECUTIVO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Total de ingresos pendientes: ${kpis.totalIngresos}
Monto total por cobrar: ${this.formatMoney(kpis.montoTotal)}

🔴 Vencidas: ${kpis.totalVencidas} facturas - ${this.formatMoney(kpis.montoVencidas)}
🟠 Vencen HOY: ${kpis.totalHoy} facturas - ${this.formatMoney(kpis.montoHoy)}
🟡 Esta semana: ${kpis.totalSemana} facturas - ${this.formatMoney(kpis.montoSemana)}
🟢 Próximas: ${kpis.totalProximas} facturas - ${this.formatMoney(kpis.montoProximas)}

${kpis.totalVencidas > 0 ? `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔴 FACTURAS VENCIDAS (URGENTE)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${categorizado.vencidas.map(renderIngresoTexto).join('\n\n')}
` : ''}

${kpis.totalHoy > 0 ? `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🟠 FACTURAS QUE VENCEN HOY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${categorizado.hoy.map(renderIngresoTexto).join('\n\n')}
` : ''}

${kpis.totalSemana > 0 ? `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🟡 FACTURAS QUE VENCEN ESTA SEMANA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${categorizado.semana.map(renderIngresoTexto).join('\n\n')}
` : ''}

${kpis.totalProximas > 0 ? `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🟢 PRÓXIMAS FACTURAS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${categorizado.proximas.slice(0, 5).map(renderIngresoTexto).join('\n\n')}
${kpis.totalProximas > 5 ? `\n... y ${kpis.totalProximas - 5} más` : ''}
` : ''}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Este es un reporte automático generado diariamente.
Si tienes preguntas, contacta al área de facturación.

Sistema ERP - Made Group
    `.trim();
  }

  /**
   * Registra el envío del reporte en el historial
   */
  async registrarEnHistorial(responsableId, kpis, emailDestinatario, exitoso, errorMensaje = null) {
    try {
      const { error } = await supabase
        .from('evt_historial_reportes_diarios')
        .insert([{
          usuario_responsable_id: responsableId,
          total_ingresos: kpis.totalIngresos,
          total_vencidas: kpis.totalVencidas,
          total_hoy: kpis.totalHoy,
          total_semana: kpis.totalSemana,
          total_proximas: kpis.totalProximas,
          monto_total: kpis.montoTotal,
          monto_vencidas: kpis.montoVencidas,
          monto_hoy: kpis.montoHoy,
          monto_semana: kpis.montoSemana,
          monto_proximas: kpis.montoProximas,
          email_enviado: exitoso,
          email_destinatario: emailDestinatario,
          error_mensaje: errorMensaje
        }]);

      if (error) {
        console.error('⚠️  Error registrando en historial:', error.message);
      }
    } catch (error) {
      console.error('⚠️  Error registrando en historial:', error.message);
    }
  }

  /**
   * Formatea un monto como moneda mexicana
   */
  formatMoney(amount) {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(amount || 0);
  }

  /**
   * Formatea una fecha
   */
  formatDate(dateStr) {
    if (!dateStr) return 'Sin fecha';
    
    return new Date(dateStr).toLocaleDateString('es-MX', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  }
}

export const dailyReportService = new DailyReportService();
