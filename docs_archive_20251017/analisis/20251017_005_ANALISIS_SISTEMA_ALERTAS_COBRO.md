# 📧 Sistema de Alertas de Cobro - Análisis Completo

**Fecha:** 16 de Octubre 2025  
**Status:** ⚠️ IMPLEMENTACIÓN PARCIAL - Requiere Completar

---

## 🔍 Estado Actual

### ✅ Lo que SÍ está implementado

**1. Servicio de Alertas (Frontend)**
- **Archivo:** `src/modules/eventos/services/alertService.ts`
- **Funcionalidad:**
  - ✅ Verifica facturas que necesitan alertas
  - ✅ Envía emails con Nodemailer + Gmail
  - ✅ Registra historial de alertas enviadas
  - ✅ Soporte para 3 tipos de alertas:
    - **Previas:** X días antes del vencimiento
    - **Compromiso:** El día del vencimiento
    - **Vencidas:** Cada X días después del vencimiento

**2. Endpoint Cron (Node.js Server)**
- **Archivo:** `server/ocr-api.js` (líneas 293-357)
- **Endpoint:** `POST http://localhost:3001/api/cron/check-invoices`
- **Status:** ⚠️ STUB (solo retorna mensaje informativo)
- **Código:**
  ```javascript
  app.post('/api/cron/check-invoices', async (req, res) => {
    // Verificar autorización con CRON_SECRET
    // ...
    
    // ⚠️ PROBLEMA: Solo retorna mensaje, NO ejecuta lógica
    res.json({
      success: true,
      message: 'Para ejecutar este cron job, usa Supabase Edge Functions o configura pg_cron',
      instructions: {
        supabase_cron: 'Ver GUIA_FINAL_OCR_SAT.md',
        manual_execution: 'Ejecuta alertService.verificarYEnviarAlertas() desde el cliente'
      }
    });
  });
  ```

**3. Configuración de Email**
- **Variables de entorno (.env):**
  ```bash
  GMAIL_USER=madegroup.ti@gmail.com
  GMAIL_APP_PASSWORD=yjxr qvwa luze hhwi
  CRON_SECRET=034253759579e20423b06c5bbca48fef64f4e3078f7c4080123bd49b1e10eadb
  ```
- **Status:** ✅ Configuradas correctamente

**4. Servidor Node.js**
- **Puerto:** 3001
- **Status:** ✅ Corriendo
- **Confirmación:**
  ```
  Gmail SMTP: ✅ CONFIGURADO
  Endpoint Cron: http://localhost:3001/api/cron/check-invoices
  ```

---

## ❌ Lo que NO está implementado

### 1. Lógica Completa del Cron Job

**Problema:**
- El endpoint `/api/cron/check-invoices` NO ejecuta la verificación de alertas
- Solo retorna un mensaje indicando cómo configurarlo
- La lógica está en `alertService.ts` pero en el **frontend** (no puede ejecutarse desde el backend)

**Por qué:**
- `alertService.ts` usa `import { supabase }` que está configurado para el cliente
- Nodemailer está importado en el frontend (debería estar en el backend)
- No hay puente entre el servidor Node.js y el servicio de alertas

### 2. Automatización del Cron

**Problema:**
- No hay un cron job real que ejecute las verificaciones diariamente
- Actualmente se debe ejecutar manualmente

**Opciones de implementación:**
1. **Node.js con node-cron**
2. **Supabase pg_cron**
3. **Supabase Edge Functions**
4. **Servicio externo (cron-job.org, EasyCron, etc.)**

---

## 🎯 Arquitectura Actual vs Necesaria

### Arquitectura Actual (Incompleta)

```
┌─────────────────────────────────────────┐
│  Frontend (React + TypeScript)         │
│                                         │
│  alertService.ts                        │
│  ├─ verificarFacturasParaAlertas()     │
│  ├─ enviarAlertas()                    │
│  └─ enviarEmailGmail() ← Nodemailer    │
│                                         │
└─────────────────────────────────────────┘
           ↓ (NO HAY CONEXIÓN)
┌─────────────────────────────────────────┐
│  Backend Node.js (Puerto 3001)         │
│                                         │
│  server/ocr-api.js                      │
│  └─ POST /api/cron/check-invoices       │
│     └─ ⚠️ Solo retorna mensaje          │
│                                         │
└─────────────────────────────────────────┘
           ↓ (NO SE EJECUTA)
┌─────────────────────────────────────────┐
│  Cron Job Automático                    │
│  └─ ❌ NO EXISTE                        │
└─────────────────────────────────────────┘
```

### Arquitectura Necesaria (Completa)

```
┌─────────────────────────────────────────┐
│  Cron Job (Diario a las 9:00 AM)       │
│  ├─ node-cron                           │
│  ├─ pg_cron (Supabase)                  │
│  └─ cron-job.org                        │
└─────────────────┬───────────────────────┘
                  ↓ Ejecuta cada día
┌─────────────────────────────────────────┐
│  Backend Node.js (Puerto 3001)         │
│                                         │
│  server/alertCron.js (NUEVO)            │
│  ├─ Conectar a Supabase                │
│  ├─ Verificar facturas pendientes      │
│  ├─ Calcular días hasta vencimiento    │
│  ├─ Determinar qué alertas enviar      │
│  └─ Enviar emails con Nodemailer       │
│                                         │
└─────────────────┬───────────────────────┘
                  ↓ Consulta
┌─────────────────────────────────────────┐
│  Supabase PostgreSQL                    │
│  ├─ evt_ingresos (facturas)            │
│  ├─ evt_configuracion_alertas          │
│  └─ evt_historial_alertas              │
└─────────────────────────────────────────┘
                  ↓ Envía
┌─────────────────────────────────────────┐
│  Gmail SMTP                             │
│  └─ madegroup.ti@gmail.com             │
└─────────────────────────────────────────┘
```

---

## 🚀 Plan de Implementación

### Opción 1: Mover Lógica al Backend Node.js (RECOMENDADO ✅)

**Ventajas:**
- Todo en un solo lugar (Node.js ya está corriendo)
- Control total sobre el proceso
- Fácil debugging
- Sin dependencias de Supabase Edge Functions

**Pasos:**

#### 1. Crear servicio de alertas en el backend

**Archivo nuevo:** `server/services/alertService.js`

```javascript
import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY // ← Importante: Service Role Key
);

export class AlertService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD
      }
    });
  }

  async verificarYEnviarAlertas() {
    // 1. Obtener configuración
    const config = await this.getAlertConfig();
    
    // 2. Buscar facturas pendientes
    const facturas = await this.getFacturasPendientes();
    
    // 3. Determinar cuáles necesitan alertas
    const alertas = this.determinarAlertas(facturas, config);
    
    // 4. Enviar emails
    for (const alerta of alertas) {
      await this.enviarEmail(alerta);
      await this.registrarAlerta(alerta);
    }
    
    return alertas.length;
  }

  async getFacturasPendientes() {
    const { data, error } = await supabase
      .from('evt_ingresos')
      .select(`
        *,
        evento:evt_eventos(
          nombre,
          cliente:clientes(nombre, email, email_contacto),
          responsable:usuario_responsable_id(email)
        )
      `)
      .eq('status_cobro', 'pendiente')
      .not('fecha_compromiso', 'is', null)
      .order('fecha_compromiso', { ascending: true });

    return data || [];
  }

  // ... resto de métodos
}
```

#### 2. Actualizar endpoint del cron

**Archivo:** `server/ocr-api.js`

```javascript
import { AlertService } from './services/alertService.js';
const alertService = new AlertService();

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
    
    // ✅ EJECUTAR VERIFICACIÓN Y ENVÍO DE ALERTAS
    const alertasEnviadas = await alertService.verificarYEnviarAlertas();
    
    const result = {
      success: true,
      alertasEnviadas,
      timestamp: new Date().toISOString(),
      duration: `${Date.now() - startTime}ms`
    };
    
    console.log('✅ [CRON] Alertas enviadas:', alertasEnviadas);
    
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
```

#### 3. Configurar cron automático con node-cron

**Archivo:** `server/ocr-api.js`

```javascript
import cron from 'node-cron';

// Ejecutar todos los días a las 9:00 AM
cron.schedule('0 9 * * *', async () => {
  console.log('⏰ [CRON] Ejecutando verificación diaria de facturas...');
  
  try {
    const alertasEnviadas = await alertService.verificarYEnviarAlertas();
    console.log(`✅ [CRON] Completado: ${alertasEnviadas} alertas enviadas`);
  } catch (error) {
    console.error('❌ [CRON] Error:', error);
  }
});

console.log('⏰ Cron job configurado: Verificación diaria a las 9:00 AM');
```

#### 4. Instalar dependencia

```bash
npm install node-cron
npm install @supabase/supabase-js
```

---

### Opción 2: Supabase Edge Function

**Ventajas:**
- Serverless (no necesitas mantener Node.js corriendo)
- Integrado con Supabase
- Escalable

**Desventajas:**
- ⚠️ Timeout en tier gratuito (ya experimentado)
- Más complejo de debuggear
- Necesitas configurar pg_cron en Supabase

**Pasos:**

```bash
# 1. Crear Edge Function
npx supabase functions new alert-invoices

# 2. Implementar lógica en supabase/functions/alert-invoices/index.ts
# (Similar a alertService.ts pero adaptado a Deno)

# 3. Deploy
npx supabase functions deploy alert-invoices

# 4. Configurar pg_cron en Supabase Dashboard
# SQL Editor → Run:
SELECT cron.schedule(
  'daily-invoice-alerts',
  '0 9 * * *',
  $$
  SELECT net.http_post(
    url := 'https://gomnouwackzvthpwyric.supabase.co/functions/v1/alert-invoices',
    headers := '{"Authorization": "Bearer YOUR_ANON_KEY"}'::jsonb
  ) AS request_id;
  $$
);
```

---

### Opción 3: Servicio Externo de Cron

**Ventajas:**
- No necesitas código adicional
- Configuración visual simple
- Monitoreo incluido

**Servicios recomendados:**
- **cron-job.org** (gratis, confiable)
- **EasyCron** (gratis hasta 10 jobs)
- **Cronitor** (monitoring incluido)

**Configuración:**

1. Registrarte en cron-job.org
2. Crear nuevo cron job:
   - URL: `http://tu-servidor.com:3001/api/cron/check-invoices`
   - Método: `POST`
   - Headers: `Authorization: Bearer 034253759579e20423b06c5bbca48fef64f4e3078f7c4080123bd49b1e10eadb`
   - Schedule: Diario a las 9:00 AM
3. ✅ El servicio externo llamará tu endpoint automáticamente

**Nota:** Necesitas exponer tu servidor Node.js a internet (con ngrok en desarrollo o un VPS en producción)

---

## 📋 Checklist de Implementación

### Para Desarrollo (Opción 1 - Node.js)

- [ ] Crear `server/services/alertService.js`
- [ ] Mover lógica de `src/modules/eventos/services/alertService.ts` al backend
- [ ] Actualizar endpoint `/api/cron/check-invoices`
- [ ] Instalar `node-cron` y `@supabase/supabase-js`
- [ ] Configurar cron en `server/ocr-api.js`
- [ ] Probar manualmente: `curl -X POST http://localhost:3001/api/cron/check-invoices -H "Authorization: Bearer CRON_SECRET"`
- [ ] Verificar que emails se envían correctamente
- [ ] Verificar que alertas se registran en `evt_historial_alertas`
- [ ] Dejar corriendo con `pm2` o `screen`

### Para Producción

- [ ] Decidir entre Opción 1, 2 o 3
- [ ] Si Node.js: Desplegar en VPS y configurar PM2
- [ ] Si Supabase: Deploy Edge Function y configurar pg_cron
- [ ] Si Externo: Configurar cron-job.org
- [ ] Monitorear logs por 1 semana
- [ ] Confirmar que clientes reciben emails
- [ ] Configurar alertas si el cron falla

---

## 🧪 Testing

### Prueba Manual del Endpoint

```bash
# 1. Verificar que el servidor esté corriendo
curl http://localhost:3001/api/cron/check-invoices

# 2. Ejecutar cron (con autorización)
curl -X POST http://localhost:3001/api/cron/check-invoices \
  -H "Authorization: Bearer 034253759579e20423b06c5bbca48fef64f4e3078f7c4080123bd49b1e10eadb"

# Respuesta esperada (actual):
{
  "success": true,
  "message": "Para ejecutar este cron job, usa Supabase Edge Functions...",
  "instructions": {...}
}

# Respuesta esperada (después de implementar):
{
  "success": true,
  "alertasEnviadas": 3,
  "timestamp": "2025-10-16T14:30:00.000Z",
  "duration": "2345ms"
}
```

### Prueba de Email

```javascript
// En server/services/alertService.js (después de implementar)
async testEmail() {
  await this.transporter.sendMail({
    from: `"Sistema de Facturas" <${process.env.GMAIL_USER}>`,
    to: 'tu-email@example.com',
    subject: 'Test de Alertas de Cobro',
    text: 'Si recibes este email, el sistema está configurado correctamente.'
  });
}
```

---

## 💡 Recomendación

**Para tu caso específico:**

✅ **Opción 1 (Node.js + node-cron)** es la mejor porque:

1. Ya tienes el servidor Node.js corriendo en puerto 3001
2. Gmail SMTP ya está configurado
3. No tienes problemas de timeout (a diferencia de Supabase)
4. Control total y fácil debugging
5. Puedes tenerlo corriendo en producción con PM2

**Tiempo estimado de implementación:**
- Crear `alertService.js` backend: **2-3 horas**
- Configurar node-cron: **30 minutos**
- Testing: **1 hora**
- **Total: ~4 horas**

---

## 🎯 Resumen

| Componente | Status | Ubicación |
|------------|--------|-----------|
| Servicio de alertas | ⚠️ Frontend | `src/modules/eventos/services/alertService.ts` |
| Endpoint cron | ⚠️ Stub | `server/ocr-api.js:301` |
| Gmail SMTP | ✅ Configurado | `.env` |
| Cron automático | ❌ No existe | - |
| **FUNCIONANDO** | ❌ NO | **Necesita implementación completa** |

---

## 📞 Próximos Pasos

1. **Decidir:** ¿Qué opción prefieres? (Recomiendo Opción 1)
2. **Implementar:** Crear el servicio en el backend
3. **Probar:** Ejecutar manualmente y verificar emails
4. **Automatizar:** Configurar node-cron
5. **Monitorear:** Verificar que funciona diariamente

¿Quieres que implemente la Opción 1 (Node.js + node-cron) ahora? 🚀
