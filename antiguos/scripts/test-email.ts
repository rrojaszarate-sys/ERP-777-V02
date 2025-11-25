/**
 * 🧪 Script de Prueba - Envío de Email con Gmail
 */

import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

// Cargar variables de entorno
dotenv.config({ path: '.env' });

async function testEmail() {
  console.log('📧 Probando envío de email con Gmail...\n');
  
  // Verificar variables de entorno
  console.log('🔑 Variables de entorno:');
  console.log(`   GMAIL_USER: ${process.env.GMAIL_USER || '❌ NO CONFIGURADO'}`);
  console.log(`   GMAIL_APP_PASSWORD: ${process.env.GMAIL_APP_PASSWORD ? '✅ Configurado' : '❌ NO CONFIGURADO'}`);
  console.log('');
  
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    console.error('❌ Error: Variables de entorno no configuradas correctamente');
    console.log('\nAsegúrate de que .env tenga:');
    console.log('GMAIL_USER=madegroup.ti@gmail.com');
    console.log('GMAIL_APP_PASSWORD=yjxr qvwa luze hhwi');
    process.exit(1);
  }
  
  try {
    // Configurar transporter
    console.log('⚙️  Configurando transporter de Gmail...');
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD
      }
    });
    
    // Verificar conexión
    console.log('🔌 Verificando conexión con Gmail...');
    await transporter.verify();
    console.log('✅ Conexión exitosa con Gmail!\n');
    
    // Enviar email de prueba
    console.log('📤 Enviando email de prueba...');
    const info = await transporter.sendMail({
      from: `"Sistema de Facturas XML" <${process.env.GMAIL_USER}>`,
      to: process.env.GMAIL_USER, // Enviar a ti mismo
      subject: '🧪 Prueba - Sistema de Facturas XML',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #1e3a8a; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
            .success { background: #dcfce7; border-left: 4px solid #22c55e; padding: 15px; margin: 20px 0; }
            .info { background: #dbeafe; border-left: 4px solid #3b82f6; padding: 15px; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎉 ¡Sistema de Facturas XML Configurado!</h1>
            </div>
            
            <div class="content">
              <div class="success">
                <strong>✅ Prueba Exitosa</strong>
                <p>Si estás leyendo este email, significa que el sistema está correctamente configurado y puede enviar emails.</p>
              </div>
              
              <div class="info">
                <strong>📋 Información de la Prueba:</strong>
                <ul>
                  <li><strong>Fecha:</strong> ${new Date().toLocaleString('es-MX')}</li>
                  <li><strong>Remitente:</strong> ${process.env.GMAIL_USER}</li>
                  <li><strong>Sistema:</strong> Nodemailer + Gmail</li>
                </ul>
              </div>
              
              <h3>🚀 Próximos Pasos:</h3>
              <ol>
                <li>El sistema ya puede enviar alertas de cobro automáticas</li>
                <li>Carga una factura XML en el sistema</li>
                <li>Configura los días de crédito</li>
                <li>El cron job enviará alertas automáticamente a las 9:00 AM</li>
              </ol>
              
              <p>Para más información, revisa la documentación:</p>
              <ul>
                <li>SISTEMA_FACTURAS_XML_COMPLETADO.md</li>
                <li>PASOS_PARA_TI.md</li>
                <li>INTEGRACION_FACTURAS_RAPIDA.md</li>
              </ul>
              
              <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
              
              <p style="text-align: center; color: #6b7280; font-size: 12px;">
                Este es un email de prueba del Sistema de Gestión de Facturas XML
              </p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
🎉 ¡Sistema de Facturas XML Configurado!

✅ Prueba Exitosa
Si estás leyendo este email, significa que el sistema está correctamente configurado y puede enviar emails.

📋 Información de la Prueba:
- Fecha: ${new Date().toLocaleString('es-MX')}
- Remitente: ${process.env.GMAIL_USER}
- Sistema: Nodemailer + Gmail

🚀 Próximos Pasos:
1. El sistema ya puede enviar alertas de cobro automáticas
2. Carga una factura XML en el sistema
3. Configura los días de crédito
4. El cron job enviará alertas automáticamente a las 9:00 AM

Para más información, revisa la documentación:
- SISTEMA_FACTURAS_XML_COMPLETADO.md
- PASOS_PARA_TI.md
- INTEGRACION_FACTURAS_RAPIDA.md

---
Este es un email de prueba del Sistema de Gestión de Facturas XML
      `.trim()
    });
    
    console.log('✅ Email enviado exitosamente!');
    console.log(`   Message ID: ${info.messageId}`);
    console.log(`   Destinatario: ${process.env.GMAIL_USER}`);
    console.log('');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🎉 ¡CONFIGURACIÓN EXITOSA!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');
    console.log('✅ El sistema está listo para enviar emails automáticos');
    console.log('📧 Revisa tu bandeja de entrada en:', process.env.GMAIL_USER);
    console.log('   (Si no lo ves, revisa la carpeta de SPAM)');
    console.log('');
    console.log('🚀 Próximos pasos:');
    console.log('   1. Integra FacturasPage en tu app');
    console.log('   2. Carga una factura XML de prueba');
    console.log('   3. El sistema enviará alertas automáticamente');
    console.log('');
    
  } catch (error) {
    console.error('❌ Error al enviar email:');
    console.error('');
    
    if (error instanceof Error) {
      console.error(`   Mensaje: ${error.message}`);
      
      if (error.message.includes('Invalid login')) {
        console.error('');
        console.error('🔧 Solución:');
        console.error('   1. La contraseña de aplicación es incorrecta');
        console.error('   2. Ve a: https://myaccount.google.com/apppasswords');
        console.error('   3. Genera una nueva contraseña de aplicación');
        console.error('   4. Actualiza GMAIL_APP_PASSWORD en .env');
      } else if (error.message.includes('EAUTH')) {
        console.error('');
        console.error('🔧 Solución:');
        console.error('   1. Verifica que la verificación en 2 pasos esté activa');
        console.error('   2. Usa una contraseña de aplicación (no tu contraseña normal)');
      }
    } else {
      console.error(`   ${error}`);
    }
    
    console.error('');
    process.exit(1);
  }
}

// Ejecutar prueba
testEmail().catch(console.error);
