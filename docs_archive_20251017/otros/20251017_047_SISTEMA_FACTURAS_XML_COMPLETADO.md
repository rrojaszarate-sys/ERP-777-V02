# 🎉 SISTEMA DE FACTURAS XML - IMPLEMENTACIÓN COMPLETADA

## ✅ Archivos Creados

### 📁 Types (Tipos TypeScript)
- `src/modules/eventos/types/Invoice.ts` - Tipos completos para facturas, alertas y filtros

### 🛠️ Utils (Utilidades)
- `src/modules/eventos/utils/dateCalculator.ts` - Cálculo de fechas de vencimiento y estados

### 🔧 Services (Servicios)
- `src/modules/eventos/services/invoiceService.ts` - CRUD de facturas y procesamiento XML
- `src/modules/eventos/services/alertService.ts` - Sistema de alertas de cobro

### 🎨 Components (Componentes UI)
- `src/modules/eventos/components/InvoiceUploadModal.tsx` - Modal para subir XML
- `src/modules/eventos/components/InvoiceList.tsx` - Lista de facturas con filtros
- `src/modules/eventos/components/InvoiceDashboard.tsx` - Dashboard de estadísticas

### 📄 Pages (Páginas)
- `src/modules/eventos/pages/FacturasPage.tsx` - Página principal con tabs

### 🤖 API Routes (Cron Jobs)
- `src/app/api/cron/check-invoices/route.ts` - Cron job para alertas diarias

---

## 🚀 Cómo Usar el Sistema

### 1️⃣ Cargar una Factura XML

```typescript
// Desde cualquier evento:
<FacturasPage eventoId={eventoId} />

// El usuario:
1. Clic en "Cargar Factura XML"
2. Selecciona archivo .xml (CFDI)
3. Define días de crédito (ej: 30)
4. Opcionalmente agrega notas
5. Clic en "Cargar Factura"

// El sistema automáticamente:
- Parsea el XML
- Extrae UUID, RFC, montos, fechas
- Calcula fecha de vencimiento
- Guarda en evt_ingresos
- Programa alertas automáticas
```

### 2️⃣ Ver y Gestionar Facturas

```typescript
// Dashboard muestra:
- Total de facturas y montos
- Facturas cobradas/pendientes/vencidas
- Gráficas de progreso
- Alertas de atención urgente

// Listado permite:
- Filtrar por año, mes, cliente, estado
- Ver detalles de cada factura
- Descargar XML original
- Marcar como cobrada
- Cancelar facturas
```

### 3️⃣ Sistema de Alertas Automáticas

```typescript
// El cron job (9:00 AM diario):
1. Actualiza estados de facturas automáticamente
2. Detecta facturas que necesitan alertas:
   - 3 días antes del vencimiento
   - El día del vencimiento
   - Cada 7 días después del vencimiento
3. Envía emails a:
   - Cliente (email principal + email_contacto)
   - Responsable del evento
   - CCs configurados
```

---

## ⚙️ Configuración Requerida

### 1. Variables de Entorno

Agregar al archivo `.env.local`:

```bash
# Cron Job Security
CRON_SECRET=tu_secreto_aleatorio_aqui

# Email Service (Resend - Recomendado)
RESEND_API_KEY=re_xxxxxxxxxxxx

# O SendGrid (Alternativa)
SENDGRID_API_KEY=SG.xxxxxxxxxxxx
SENDGRID_FROM_EMAIL=facturas@tudominio.com
```

### 2. Configurar Cron Job en Vercel

Crear `vercel.json` en la raíz:

```json
{
  "crons": [
    {
      "path": "/api/cron/check-invoices",
      "schedule": "0 9 * * *"
    }
  ]
}
```

### 3. Instalar Dependencias de Email

```bash
# Con Resend (Recomendado - 100 emails gratis/día)
npm install resend

# O con SendGrid
npm install @sendgrid/mail
```

### 4. Integrar Servicio de Email

Editar `src/modules/eventos/services/alertService.ts`:

```typescript
// Agregar en el método enviarAlertas:
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

// Reemplazar el TODO con:
const { subject, html, text } = this.generateEmailContent(factura, tipo);

await resend.emails.send({
  from: 'Facturas <facturas@tudominio.com>',
  to: destinatarios,
  subject,
  html,
  text
});
```

---

## 🧪 Pruebas

### Prueba Manual del Sistema

```bash
# 1. Cargar una factura de prueba
- Ir a un evento
- Clic en pestaña "Facturas"
- Cargar un XML de CFDI real
- Configurar 3 días de crédito para prueba rápida

# 2. Verificar en base de datos
SELECT * FROM evt_ingresos WHERE uuid_cfdi IS NOT NULL;

# 3. Probar el cron job manualmente
curl -X POST http://localhost:3000/api/cron/check-invoices \
  -H "Authorization: Bearer tu_secreto"

# 4. Verificar alertas registradas
SELECT * FROM evt_alertas_enviadas ORDER BY fecha_envio DESC;
```

### Validar Cálculos de Fechas

```typescript
import { 
  calcularFechaCompromiso, 
  diasHastaVencimiento,
  calcularEstadoCobro 
} from '@/modules/eventos/utils/dateCalculator';

// Prueba 1: Calcular vencimiento
const emision = new Date('2024-10-01');
const compromiso = calcularFechaCompromiso(emision, 30);
console.log(compromiso); // 2024-10-31

// Prueba 2: Días restantes
const dias = diasHastaVencimiento(compromiso);
console.log(dias); // Ej: 17 (si hoy es 14-Oct)

// Prueba 3: Estado automático
const estado = calcularEstadoCobro(compromiso, 0, 1000);
console.log(estado); // 'pendiente' o 'vencido'
```

---

## 📊 Flujo de Datos

```
1. CARGA XML
   ↓
   XML File → cfdiXmlParser → CFDIData
   ↓
   invoiceService.createFromXML()
   ↓
   INSERT evt_ingresos

2. CÁLCULO AUTOMÁTICO
   ↓
   fecha_emision + dias_credito = fecha_compromiso
   ↓
   fecha_compromiso + alertas configuradas

3. CRON JOB DIARIO (9:00 AM)
   ↓
   invoiceService.actualizarEstadosAutomaticos()
   ↓
   alertService.verificarFacturasParaAlertas()
   ↓
   alertService.enviarAlertas()
   ↓
   INSERT evt_alertas_enviadas

4. EMAILS ENVIADOS
   ↓
   Resend/SendGrid → Cliente + Responsable
```

---

## 🔧 Mantenimiento

### Actualizar Configuración de Alertas

```sql
-- Ver configuración actual
SELECT * FROM evt_configuracion_alertas WHERE activo = true;

-- Cambiar días de alerta previa (ej: 5 días en lugar de 3)
UPDATE evt_configuracion_alertas 
SET dias_antes_alerta = 5 
WHERE activo = true;

-- Cambiar frecuencia de reenvío (ej: cada 3 días)
UPDATE evt_configuracion_alertas 
SET dias_despues_reenvio = 3 
WHERE activo = true;

-- Agregar emails CC globales
UPDATE evt_configuracion_alertas 
SET emails_cc = ARRAY['admin@empresa.com', 'finanzas@empresa.com']
WHERE activo = true;
```

### Consultas Útiles

```sql
-- Facturas vencidas con más de 30 días
SELECT 
  e.clave_evento,
  c.razon_social,
  i.uuid_cfdi,
  i.total,
  i.fecha_compromiso,
  CURRENT_DATE - i.fecha_compromiso as dias_vencida
FROM evt_ingresos i
JOIN evt_eventos e ON i.evento_id = e.id
LEFT JOIN evt_clientes c ON e.cliente_id = c.id
WHERE i.status_cobro = 'vencido'
  AND CURRENT_DATE - i.fecha_compromiso > 30
ORDER BY dias_vencida DESC;

-- Resumen de cobros por mes
SELECT 
  DATE_TRUNC('month', fecha_emision) as mes,
  COUNT(*) as total_facturas,
  SUM(total) as monto_total,
  SUM(CASE WHEN status_cobro = 'cobrado' THEN total ELSE 0 END) as monto_cobrado,
  SUM(CASE WHEN status_cobro = 'pendiente' THEN total ELSE 0 END) as monto_pendiente
FROM evt_ingresos
WHERE activo = true
GROUP BY DATE_TRUNC('month', fecha_emision)
ORDER BY mes DESC;

-- Historial de alertas enviadas
SELECT 
  a.tipo_alerta,
  a.fecha_envio,
  a.destinatarios,
  a.estado,
  i.uuid_cfdi,
  e.clave_evento
FROM evt_alertas_enviadas a
JOIN evt_ingresos i ON a.ingreso_id = i.id
JOIN evt_eventos e ON i.evento_id = e.id
ORDER BY a.fecha_envio DESC
LIMIT 50;
```

---

## 🐛 Troubleshooting

### Problema: El cron job no se ejecuta

```bash
# 1. Verificar que esté configurado en Vercel
vercel env ls

# 2. Probar manualmente
curl -X POST https://tu-app.vercel.app/api/cron/check-invoices \
  -H "Authorization: Bearer ${CRON_SECRET}"

# 3. Ver logs en Vercel Dashboard
# Functions → Logs → Filtrar por "/api/cron"
```

### Problema: Emails no se envían

```typescript
// 1. Verificar API key
console.log(process.env.RESEND_API_KEY?.substring(0, 10));

// 2. Verificar formato de emails
const destinatarios = this.obtenerDestinatarios(factura);
console.log('Destinatarios:', destinatarios);

// 3. Verificar límites de Resend (100/día en free tier)
// Ir a dashboard.resend.com
```

### Problema: Estados no se actualizan

```sql
-- Ejecutar manualmente la actualización
SELECT 
  id, 
  uuid_cfdi, 
  fecha_compromiso, 
  status_cobro,
  CASE 
    WHEN monto_cobrado >= total THEN 'cobrado'
    WHEN fecha_compromiso < CURRENT_DATE AND monto_cobrado = 0 THEN 'vencido'
    ELSE 'pendiente'
  END as nuevo_estado
FROM evt_ingresos
WHERE activo = true
  AND uuid_cfdi IS NOT NULL;
```

---

## 📈 Mejoras Futuras

1. **WhatsApp Integration** - Enviar alertas por WhatsApp Business API
2. **Dashboard Ejecutivo** - Gráficas avanzadas con Chart.js
3. **Pagos en Línea** - Integrar Stripe/Conekta para pagos directos
4. **IA para Predicción** - ML para predecir probabilidad de cobro
5. **Reconciliación Bancaria** - Auto-match con estados de cuenta
6. **Multi-moneda** - Soporte para USD, EUR con conversiones

---

## 📞 Soporte

Para dudas o problemas:
1. Revisar logs en consola del navegador (F12)
2. Verificar logs del cron job en Vercel
3. Consultar tablas de alertas en Supabase
4. Revisar esta documentación

---

## ✅ Checklist de Implementación

- [x] Base de datos configurada
- [x] Tipos TypeScript creados
- [x] Servicios de negocio implementados
- [x] Componentes UI listos
- [x] Página principal con tabs
- [x] Cron job programado
- [ ] Configurar servicio de email (Resend/SendGrid)
- [ ] Agregar variables de entorno
- [ ] Deploy a producción
- [ ] Probar con facturas reales
- [ ] Monitorear alertas durante 1 semana

---

## 🎯 Siguiente Paso

1. **Instalar Resend**:
   ```bash
   npm install resend
   ```

2. **Obtener API Key**:
   - Ir a https://resend.com
   - Crear cuenta (gratis)
   - Copiar API key

3. **Configurar Email**:
   - Agregar `RESEND_API_KEY` a `.env.local`
   - Actualizar `alertService.ts` con código de Resend
   - Probar envío manual

4. **Desplegar**:
   ```bash
   vercel --prod
   ```

¡Sistema listo para usar! 🚀
