/**
 * API BACKEND PARA GOOGLE VISION OCR Y REPORTES DIARIOS
 *
 * Google Vision API requiere Node.js backend porque:
 * 1. No funciona en navegadores por seguridad
 * 2. Necesita credenciales privadas
 * 3. Requiere módulos Node.js nativos
 *
 * INICIO: node server/ocr-api.js
 * Puerto: 3001
 */

import express from 'express';
import cors from 'cors';
import multer from 'multer';
import vision from '@google-cloud/vision';
import dotenv from 'dotenv';
import cron from 'node-cron';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { dailyReportService } from './services/dailyReportService.js';


const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Cargar variables de entorno
dotenv.config({ path: join(__dirname, '..', '.env') });

const app = express();
const PORT = process.env.OCR_API_PORT || 3001;

// Configurar CORS
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:5174', 'http://127.0.0.1:5173', 'http://127.0.0.1:5174'],
  credentials: true
}));

app.use(express.json());

// Configurar multer para recibir archivos
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB max
});

// Inicializar Google Vision Client
let visionClient = null;

try {
  // Usar credenciales desde VITE_GOOGLE_SERVICE_ACCOUNT_KEY
  if (process.env.VITE_GOOGLE_SERVICE_ACCOUNT_KEY) {
    const credentials = JSON.parse(process.env.VITE_GOOGLE_SERVICE_ACCOUNT_KEY);
    visionClient = new vision.ImageAnnotatorClient({
      credentials,
      projectId: credentials.project_id
    });
    console.log('✅ Google Vision inicializado con VITE_GOOGLE_SERVICE_ACCOUNT_KEY');
    console.log('   Project:', credentials.project_id);
  }
  // Fallback: Usar VITE_GOOGLE_VISION_CREDENTIALS (legacy)
  else if (process.env.VITE_GOOGLE_VISION_CREDENTIALS) {
    const credentials = JSON.parse(process.env.VITE_GOOGLE_VISION_CREDENTIALS);
    visionClient = new vision.ImageAnnotatorClient({
      credentials,
      projectId: credentials.project_id
    });
    console.log('✅ Google Vision inicializado con VITE_GOOGLE_VISION_CREDENTIALS');
  }
  // Fallback: Usar archivo de credenciales
  else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    visionClient = new vision.ImageAnnotatorClient();
    console.log('✅ Google Vision inicializado con archivo de credenciales');
  }
  else {
    console.warn('⚠️ Google Vision no configurado');
    console.warn('   Configure VITE_GOOGLE_SERVICE_ACCOUNT_KEY en .env');
  }
} catch (error) {
  console.error('❌ Error inicializando Google Vision:', error.message);
}

/**
 * ENDPOINT PRINCIPAL: Procesar imagen con OCR
 */
app.post('/api/ocr/process', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No se recibió archivo' });
    }

    console.log('📄 Procesando archivo:', req.file.originalname, `(${(req.file.size / 1024).toFixed(1)} KB)`);

    if (!visionClient) {
      return res.status(503).json({
        error: 'Google Vision no está configurado',
        fallback: 'use_tesseract'
      });
    }

    // Procesar con Google Vision
    const [result] = await visionClient.textDetection({
      image: { content: req.file.buffer }
    });

    const detections = result.textAnnotations;

    if (!detections || detections.length === 0) {
      return res.status(400).json({
        error: 'No se detectó texto en la imagen',
        texto_completo: '',
        confianza_general: 0
      });
    }

    // El primer elemento contiene TODO el texto
    const fullText = detections[0].description || '';

    // Calcular confianza promedio
    let totalConfidence = 0;
    let count = 0;

    detections.slice(1).forEach(detection => {
      if (detection.confidence !== undefined) {
        totalConfidence += detection.confidence;
        count++;
      }
    });

    const avgConfidence = count > 0 ? Math.round((totalConfidence / count) * 100) : 85;

    console.log('✅ Texto extraído:', fullText.length, 'caracteres');
    console.log('📊 Confianza:', avgConfidence + '%');

    // Extraer datos estructurados
    const extractedData = extractMexicanTicketData(fullText);

    res.json({
      success: true,
      texto_completo: fullText,
      confianza_general: avgConfidence,
      datos_extraidos: extractedData,
      raw_detections: detections.length,
      procesador: 'google_vision'
    });

  } catch (error) {
    console.error('❌ Error procesando OCR:', error);
    res.status(500).json({
      error: error.message,
      fallback: 'use_tesseract'
    });
  }
});

/**
 * EXTRACTOR DE DATOS PARA TICKETS MEXICANOS
 * Optimizado para formato mexicano con moneda y estructura local
 */
function extractMexicanTicketData(text) {
  const data = {
    establecimiento: null,
    direccion: null,
    telefono: null,
    rfc: null,
    fecha: null,
    hora: null,
    total: null,
    subtotal: null,
    iva: null,
    forma_pago: null,
    productos: []
  };

  // PATRONES OPTIMIZADOS PARA ESPAÑOL MEXICANO
  const patterns = {
    // RFC mexicano: 12-13 caracteres alfanuméricos
    rfc: /RFC[\s:]*([A-ZÑ&]{3,4}[0-9]{6}[A-Z0-9]{3})/i,

    // Teléfonos mexicanos: (xxx) xxx-xxxx o xxx-xxx-xxxx
    telefono: /(?:TEL|TELÉFONO|TELEFONO|TEL\.|T\.)[\s:]*(\(?[0-9]{2,3}\)?[\s\-]?[0-9]{3,4}[\s\-]?[0-9]{4})/i,

    // Fechas formato mexicano: DD/MM/YYYY, DD-MM-YYYY
    fecha: /(?:FECHA|FCHA|F\.)[\s:]*([0-9]{1,2}[\/\-][0-9]{1,2}[\/\-][0-9]{2,4})/i,

    // Hora: HH:MM o HH:MM:SS
    hora: /(?:HORA|HR|H\.)[\s:]*([0-9]{1,2}:[0-9]{2}(?::[0-9]{2})?(?:\s*[AP]M)?)/i,

    // TOTAL - Prioridad alta, buscar primero
    total: /(?:TOTAL|T\s*O\s*T\s*A\s*L|IMPORTE\s*TOTAL)[\s:$]*([0-9]{1,3}(?:,?[0-9]{3})*\.?[0-9]{0,2})/i,

    // SUBTOTAL
    subtotal: /(?:SUBTOTAL|SUB-TOTAL|SUB\s*TOTAL)[\s:$]*([0-9]{1,3}(?:,?[0-9]{3})*\.?[0-9]{0,2})/i,

    // IVA (16% en México)
    iva: /(?:IVA|I\.V\.A\.|IMPUESTO)[\s:$]*([0-9]{1,3}(?:,?[0-9]{3})*\.?[0-9]{0,2})/i,

    // Dirección (buscar línea con calle, número, colonia)
    direccion: /(?:DIRECCIÓN|DIRECCION|DOMICILIO|DIR\.|SUCURSAL)[\s:]*([^\n]{20,100})/i,
  };

  // Extraer con patrones
  Object.keys(patterns).forEach(key => {
    const match = text.match(patterns[key]);
    if (match) {
      data[key] = match[1].trim();
    }
  });

  // Convertir montos a números
  ['total', 'subtotal', 'iva'].forEach(key => {
    if (data[key]) {
      data[key] = parseFloat(data[key].replace(/,/g, ''));
    }
  });

  // Si no se encontró total, buscar el monto más grande
  if (!data.total || data.total === 0) {
    const amounts = text.match(/\$?\s*([0-9]{1,3}(?:,?[0-9]{3})*\.[0-9]{2})/g);
    if (amounts && amounts.length > 0) {
      const parsed = amounts.map(a => parseFloat(a.replace(/[$,]/g, ''))).filter(n => n > 0);
      if (parsed.length > 0) {
        data.total = Math.max(...parsed);
        console.log('💰 Total detectado como monto máximo:', data.total);
      }
    }
  }

  // Detectar establecimiento (primera línea con texto significativo)
  const lines = text.split('\n').filter(l => l.trim().length > 3);
  if (lines.length > 0) {
    // Buscar establecimientos conocidos
    const conocidos = ['OXXO', 'WALMART', 'SORIANA', 'CHEDRAUI', 'COSTCO', 'SAMS', '7-ELEVEN',
                       'HOME DEPOT', 'LIVERPOOL', 'PALACIO', 'SUBURBIA', 'COPPEL', 'ELEKTRA'];

    for (const line of lines.slice(0, 5)) {
      const lineUpper = line.toUpperCase();
      if (conocidos.some(e => lineUpper.includes(e))) {
        data.establecimiento = line.trim();
        break;
      }
    }

    // Si no se encontró conocido, usar primera línea significativa
    if (!data.establecimiento && lines[0].length > 5) {
      data.establecimiento = lines[0].trim();
    }
  }

  // Detectar forma de pago
  const textLower = text.toLowerCase();
  if (textLower.includes('efectivo') || textLower.includes('cash')) {
    data.forma_pago = 'efectivo';
  } else if (textLower.includes('tarjeta') || textLower.includes('card') || textLower.includes('visa') || textLower.includes('mastercard')) {
    data.forma_pago = 'tarjeta';
  } else if (textLower.includes('transferencia') || textLower.includes('transfer')) {
    data.forma_pago = 'transferencia';
  }

  // Extraer productos (líneas con formato: PRODUCTO $MONTO)
  const productLines = text.split('\n');
  productLines.forEach(line => {
    // Buscar patrón: texto seguido de monto
    const match = line.match(/^([A-ZÁÉÍÓÚÑ][A-Za-z0-9áéíóúñ\s]{2,40})\s+\$?\s*([0-9]{1,3}(?:,?[0-9]{3})*\.[0-9]{2})/);
    if (match) {
      const producto = match[1].trim();
      const precio = parseFloat(match[2].replace(/,/g, ''));

      // Filtrar líneas que son totales o subtotales
      if (!producto.match(/TOTAL|SUBTOTAL|IVA|CAMBIO|PAGO/i) && precio > 0 && precio < 10000) {
        data.productos.push({
          nombre: producto,
          precio_unitario: precio,
          cantidad: 1
        });
      }
    }
  });

  return data;
}

/**
 * Health check
 */
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    google_vision: visionClient ? 'configured' : 'not_configured',
    timestamp: new Date().toISOString()
  });
});

/**
 * ENDPOINT CRON: Verificación de Alertas de Facturas
 * 
 * Ejecuta verificación diaria de facturas y envía alertas por email
 * 
 * Uso:
 * curl -X POST http://localhost:3001/api/cron/check-invoices \
 *   -H "Authorization: Bearer YOUR_SECRET"
 */
app.post('/api/cron/check-invoices', async (req, res) => {
  try {
    console.log('🤖 [CRON] Iniciando verificación de facturas...');
    
    // Verificar autorización
    const authHeader = req.headers.authorization;
    const cronSecret = process.env.CRON_SECRET;
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      console.warn('⚠️ [CRON] Intento de acceso no autorizado');
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const startTime = Date.now();
    
    // Nota: Los servicios invoiceService y alertService están en el frontend
    // Para una implementación completa, deberías:
    // 1. Mover la lógica de alertas al backend
    // 2. O usar Supabase Edge Functions
    // 3. O usar un cron job directo en Supabase
    
    // Por ahora, retornamos un mensaje indicando que se debe usar Supabase Edge Functions
    const result = {
      success: true,
      message: 'Para ejecutar este cron job, usa Supabase Edge Functions o configura pg_cron',
      timestamp: new Date().toISOString(),
      duration: `${Date.now() - startTime}ms`,
      instructions: {
        supabase_cron: 'Ver GUIA_FINAL_OCR_SAT.md para instrucciones de configuración',
        manual_execution: 'Ejecuta alertService.verificarYEnviarAlertas() desde el cliente'
      }
    };
    
    console.log('✅ [CRON] Respuesta preparada:', result);
    
    res.json(result);
  } catch (error) {
    console.error('❌ [CRON] Error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// También soportar GET para pruebas
app.get('/api/cron/check-invoices', (req, res) => {
  res.json({
    info: 'Este endpoint debe ser llamado con POST',
    method: 'POST',
    endpoint: '/api/cron/check-invoices',
    headers: {
      'Authorization': 'Bearer YOUR_CRON_SECRET'
    }
  });
});

/**
 * ENDPOINT CRON: Reportes Diarios a Responsables
 * 
 * Envía diariamente a cada responsable un email con sus ingresos pendientes
 * 
 * Uso:
 * curl -X POST http://localhost:3001/api/cron/daily-reports \
 *   -H "Authorization: Bearer YOUR_SECRET"
 */
app.post('/api/cron/daily-reports', async (req, res) => {
  try {
    console.log('🤖 [CRON] Iniciando envío de reportes diarios...');
    
    // Verificar autorización
    const authHeader = req.headers.authorization;
    const cronSecret = process.env.CRON_SECRET;
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      console.warn('⚠️ [CRON] Intento de acceso no autorizado');
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const startTime = Date.now();
    
    // Ejecutar servicio de reportes diarios
    const result = await dailyReportService.enviarReportesDiarios();
    
    const duration = Date.now() - startTime;
    
    res.json({
      ...result,
      duration: `${(duration / 1000).toFixed(2)}s`,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ [CRON] Error en reportes diarios:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// También soportar GET para información
app.get('/api/cron/daily-reports', (req, res) => {
  res.json({
    info: 'Este endpoint debe ser llamado con POST',
    method: 'POST',
    endpoint: '/api/cron/daily-reports',
    headers: {
      'Authorization': 'Bearer YOUR_CRON_SECRET'
    },
    descripcion: 'Envía reportes diarios a todos los responsables con sus ingresos pendientes'
  });
});

/**
 * Iniciar servidor
 */
app.listen(PORT, () => {
  console.log('');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  🚀 API OCR y Reportes Diarios - ACTIVA');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  Puerto:', PORT);
  console.log('  Endpoint OCR:', `http://localhost:${PORT}/api/ocr/process`);
  console.log('  Endpoint Reportes:', `http://localhost:${PORT}/api/cron/daily-reports`);
  console.log('  Endpoint Cron (legacy):', `http://localhost:${PORT}/api/cron/check-invoices`);
  console.log('  Google Vision:', visionClient ? '✅ CONFIGURADO' : '⚠️ NO CONFIGURADO');
  console.log('  Gmail SMTP:', process.env.GMAIL_USER ? '✅ CONFIGURADO' : '⚠️ NO CONFIGURADO');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('');
});

/**
 * CRON JOB: Reportes Diarios Automáticos
 * 
 * Ejecuta envío de reportes todos los días a las 9:00 AM (horario del servidor)
 * 
 * Formato cron: '0 9 * * *'
 * - 0: Minuto 0
 * - 9: Hora 9 (9:00 AM)
 * - *: Todos los días del mes
 * - *: Todos los meses
 * - *: Todos los días de la semana
 * 
 * Para deshabilitar: Comentar este bloque o establecer DISABLE_CRON=true en .env
 */
if (process.env.DISABLE_CRON !== 'true') {
  // Ejecutar todos los días a las 9:00 AM
  cron.schedule('0 9 * * *', async () => {
    console.log('');
    console.log('⏰ [CRON AUTO] Ejecutando envío de reportes diarios...');
    
    try {
      const result = await dailyReportService.enviarReportesDiarios();
      console.log(`✅ [CRON AUTO] Completado: ${result.reportesEnviados} reportes enviados`);
      
      if (result.errores > 0) {
        console.warn(`⚠️ [CRON AUTO] ${result.errores} errores encontrados`);
      }
    } catch (error) {
      console.error('❌ [CRON AUTO] Error en envío automático:', error.message);
    }
  }, {
    timezone: "America/Mexico_City" // Zona horaria de México
  });

  console.log('');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  ⏰ CRON JOB CONFIGURADO');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  Programado: Diario a las 9:00 AM (Hora de México)');
  console.log('  Zona horaria: America/Mexico_City');
  console.log('  Estado: ✅ ACTIVO');
  console.log('  Para desactivar: Establecer DISABLE_CRON=true en .env');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('');
} else {
  console.log('');
  console.log('⚠️ CRON JOB DESACTIVADO (DISABLE_CRON=true)');
  console.log('   Para activar, remover o establecer DISABLE_CRON=false');
  console.log('');
}
