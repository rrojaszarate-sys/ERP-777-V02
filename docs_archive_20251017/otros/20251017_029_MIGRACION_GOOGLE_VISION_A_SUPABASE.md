# 🚀 MIGRACIÓN: Google Vision de Node.js a Supabase Edge Functions

## 📋 Resumen Ejecutivo

**Objetivo:** Eliminar el servidor Node.js (`server/ocr-api.js`) y migrar la funcionalidad de Google Vision OCR a Supabase Edge Functions.

**Beneficios:**
- ✅ Sin servidor Node.js separado (un proceso menos)
- ✅ Deployment automático con Supabase CLI
- ✅ Escalabilidad automática
- ✅ Menor costo (Edge Functions gratis hasta 500K invocaciones/mes)
- ✅ Mejor seguridad (credenciales en Supabase Secrets)
- ✅ Logs centralizados

---

## 📁 Archivos Creados

### 1. Edge Function - `supabase_functions/ocr-process/index.ts`
**Propósito:** Procesador OCR usando Google Vision en Deno runtime

**Características:**
- ✅ Recibe imágenes en base64
- ✅ Llama a Google Vision API
- ✅ Retorna texto extraído con confianza
- ✅ Manejo de errores robusto
- ✅ CORS habilitado

### 2. Cliente TypeScript - `src/modules/ocr/services/supabaseOCRService.ts`
**Propósito:** Cliente para consumir la Edge Function desde React

**Funciones:**
- `processFileWithOCR(file)` - Procesa archivo con OCR
- `checkOCRStatus()` - Verifica disponibilidad del servicio
- `useSupabaseOCR()` - Hook React para usar OCR

---

## 🔧 PASOS DE MIGRACIÓN

### Paso 1: Configurar Credenciales en Supabase

```bash
# Ve a Supabase Dashboard
# Settings > Edge Functions > Secrets
# Agrega el secret:
```

**Nombre:** `GOOGLE_VISION_CREDENTIALS`

**Valor:** (JSON completo de tu service account)
```json
{
  "type": "service_account",
  "project_id": "tu-proyecto-id",
  "private_key_id": "abc123...",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
  "client_email": "tu-servicio@tu-proyecto.iam.gserviceaccount.com",
  "client_id": "123456789",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/..."
}
```

### Paso 2: Deploy Edge Function

```bash
cd /home/rodrichrz/proyectos/Made-Erp-777-ok/MADE-ERP-77

# Login a Supabase (si no lo has hecho)
./supabase login

# Deploy la función
./supabase functions deploy ocr-process --project-ref TU_PROJECT_REF

# Ver logs (para debugging)
./supabase functions logs ocr-process
```

**Nota:** Obtén tu `PROJECT_REF` desde Supabase Dashboard > Settings > API > Project URL

### Paso 3: Actualizar Variables de Entorno

Verifica que tu `.env` tenga:

```bash
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu-anon-key

# Ya NO necesitas estas (se eliminan):
# VITE_GOOGLE_VISION_CREDENTIALS=...
# OCR_API_PORT=3001
# OCR_API_URL=http://localhost:3001/api/ocr/process
```

### Paso 4: Modificar Servicios Existentes

Busca todos los archivos que usen el servidor Node.js y cámbialos:

#### ANTES (Node.js):
```typescript
const response = await fetch('http://localhost:3001/api/ocr/process', {
  method: 'POST',
  body: formData
});
```

#### DESPUÉS (Supabase):
```typescript
import { processFileWithOCR } from '@/modules/ocr/services/supabaseOCRService';

const result = await processFileWithOCR(file);
```

### Paso 5: Actualizar Componentes

#### Ejemplo: ExpenseForm con OCR

**ANTES:**
```typescript
const handleOCR = async (file: File) => {
  const formData = new FormData();
  formData.append('file', file);
  
  const response = await fetch(OCR_API_URL, {
    method: 'POST',
    body: formData
  });
  
  const data = await response.json();
  // ... procesar datos
};
```

**DESPUÉS:**
```typescript
import { useSupabaseOCR } from '@/modules/ocr/services/supabaseOCRService';

const ExpenseForm = () => {
  const { processFile, isProcessing, error } = useSupabaseOCR();
  
  const handleOCR = async (file: File) => {
    const result = await processFile(file);
    if (result) {
      // ... procesar result.texto_completo, result.lineas
    }
  };
  
  return (
    <button onClick={() => handleOCR(selectedFile)} disabled={isProcessing}>
      {isProcessing ? 'Procesando OCR...' : 'Extraer con OCR'}
    </button>
  );
};
```

### Paso 6: Probar la Migración

```bash
# 1. Verificar Edge Function deployada
./supabase functions list

# 2. Test manual con curl
curl -X POST \
  'https://TU_PROJECT.supabase.co/functions/v1/ocr-process' \
  -H 'Authorization: Bearer TU_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "fileBase64": "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
    "fileName": "test.png"
  }'

# 3. Ver logs en tiempo real
./supabase functions logs ocr-process --follow
```

### Paso 7: Eliminar Servidor Node.js (OPCIONAL)

**⚠️ Solo después de confirmar que todo funciona con Supabase:**

```bash
# Eliminar archivos del servidor Node.js
rm -rf server/

# Eliminar dependencias de package.json
npm uninstall express cors multer @google-cloud/vision dotenv

# Eliminar script de package.json
# Editar package.json y remover:
# "ocr-api": "node server/ocr-api.js"
```

---

## 🔍 COMPARACIÓN

### ANTES (Node.js)

**Arquitectura:**
```
Frontend → localhost:3001 (Node.js) → Google Vision API
```

**Problemas:**
- ❌ Servidor separado que mantener
- ❌ Deploy manual y complejo
- ❌ Credenciales en .env local
- ❌ Un proceso extra corriendo
- ❌ Difícil debugging

**Costos:**
- 💰 Servidor Node.js en producción ($10-50/mes)
- 💰 Google Vision API (por uso)

### DESPUÉS (Supabase)

**Arquitectura:**
```
Frontend → Supabase Edge Function → Google Vision API
```

**Ventajas:**
- ✅ Sin servidor separado
- ✅ Deploy con un comando
- ✅ Credenciales en Supabase Secrets
- ✅ Escalado automático
- ✅ Logs centralizados en Supabase Dashboard

**Costos:**
- 💚 Edge Functions gratis hasta 500K/mes
- 💰 Google Vision API (por uso - mismo costo)

---

## 📊 VERIFICACIÓN POST-MIGRACIÓN

### Checklist de Testing

- [ ] Edge Function deployada correctamente
- [ ] Secret `GOOGLE_VISION_CREDENTIALS` configurado
- [ ] Test con `curl` devuelve resultados
- [ ] Frontend conecta con Edge Function
- [ ] OCR extrae texto correctamente
- [ ] Manejo de errores funciona
- [ ] Logs visibles en Supabase Dashboard
- [ ] Performance aceptable (< 3 segundos)

### Comandos de Verificación

```bash
# Ver funciones deployadas
./supabase functions list

# Ver logs en vivo
./supabase functions logs ocr-process --follow

# Ver configuración
./supabase status

# Ver secrets (lista nombres, no valores)
./supabase secrets list
```

### Queries de Monitoreo

```sql
-- Ver gastos procesados con OCR
SELECT 
  id,
  concepto,
  proveedor,
  total,
  ocr_confianza,
  created_at
FROM evt_gastos
WHERE ocr_confianza IS NOT NULL
ORDER BY created_at DESC
LIMIT 20;

-- Estadísticas de OCR
SELECT 
  COUNT(*) as total_gastos_ocr,
  AVG(ocr_confianza) as confianza_promedio,
  MIN(ocr_confianza) as confianza_minima,
  MAX(ocr_confianza) as confianza_maxima
FROM evt_gastos
WHERE ocr_confianza IS NOT NULL;
```

---

## 🐛 TROUBLESHOOTING

### Problema 1: "Google Vision no configurado"

**Causa:** Secret no está en Supabase

**Solución:**
```bash
# Verificar secrets
./supabase secrets list

# Si no existe, agregarlo desde Dashboard:
# Settings > Edge Functions > Secrets
# O con CLI:
./supabase secrets set GOOGLE_VISION_CREDENTIALS='{"type":"service_account",...}'
```

### Problema 2: Edge Function retorna 500

**Causa:** Error en credenciales o formato JSON inválido

**Solución:**
```bash
# Ver logs detallados
./supabase functions logs ocr-process

# Verificar formato JSON del secret
echo $GOOGLE_VISION_CREDENTIALS | jq .
```

### Problema 3: CORS Error en Frontend

**Causa:** Headers incorrectos

**Solución:**
Verificar que el request incluya:
```typescript
headers: {
  'Authorization': `Bearer ${token}`,
  'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
  'Content-Type': 'application/json'
}
```

### Problema 4: "npm:@google-cloud/vision not found"

**Causa:** Edge Function no puede resolver la dependencia

**Solución:**
Usar versión específica en import:
```typescript
import { ImageAnnotatorClient } from 'npm:@google-cloud/vision@4.3.2'
```

---

## 📈 MÉTRICAS DE ÉXITO

### Performance
- ✅ Tiempo de respuesta: **< 3 segundos** promedio
- ✅ Tasa de éxito: **> 95%**
- ✅ Confianza OCR: **> 85%** promedio

### Costo
- ✅ Costo Edge Functions: **$0** (dentro de free tier)
- ✅ Costo Google Vision: **$1.50** por 1000 requests
- ✅ Ahorro servidor Node.js: **$10-50/mes**

### Mantenibilidad
- ✅ Deploy time: **< 1 minuto**
- ✅ Debugging: **Logs centralizados**
- ✅ Escalabilidad: **Automática**

---

## 🎯 PRÓXIMOS PASOS

### Inmediatos (Hoy)
1. ✅ Crear Edge Function (`supabase_functions/ocr-process/index.ts`)
2. ✅ Crear cliente TypeScript (`supabaseOCRService.ts`)
3. ⏳ Configurar secret en Supabase Dashboard
4. ⏳ Deploy Edge Function
5. ⏳ Probar con curl

### Corto Plazo (Esta Semana)
6. ⏳ Actualizar componentes para usar Supabase OCR
7. ⏳ Testing exhaustivo con diferentes imágenes
8. ⏳ Verificar performance en producción
9. ⏳ Eliminar servidor Node.js

### Largo Plazo (Opcional)
- 📊 Agregar analytics de uso de OCR
- 🎯 Optimizar prompts de extracción
- 💾 Cachear resultados de OCR
- 🔄 Implementar retry automático
- 📧 Notificaciones de errores

---

## 📚 RECURSOS

### Documentación
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [Google Vision API](https://cloud.google.com/vision/docs)
- [Deno Deploy](https://deno.com/deploy)

### Comandos Útiles
```bash
# Supabase CLI
./supabase --help
./supabase functions --help
./supabase secrets --help

# Deploy con logs
./supabase functions deploy ocr-process --debug

# Test local
./supabase functions serve ocr-process
```

### Endpoints
```
Production: https://[project-ref].supabase.co/functions/v1/ocr-process
Local:      http://localhost:54321/functions/v1/ocr-process
```

---

## ✅ CONCLUSIÓN

Esta migración simplifica significativamente la arquitectura del sistema OCR:

**Antes:**
```
Frontend → Node.js Server → Google Vision → Response → Frontend
```

**Después:**
```
Frontend → Supabase Edge Function → Google Vision → Frontend
```

**Resultado:**
- ✅ Menos componentes
- ✅ Más simple
- ✅ Más barato
- ✅ Más escalable
- ✅ Más seguro

**Tiempo estimado de migración:** 2-4 horas
**Complejidad:** Media
**Riesgo:** Bajo (mantener Node.js como fallback inicialmente)

---

**Autor:** GitHub Copilot  
**Fecha:** 2025-01-16  
**Versión:** 1.0
