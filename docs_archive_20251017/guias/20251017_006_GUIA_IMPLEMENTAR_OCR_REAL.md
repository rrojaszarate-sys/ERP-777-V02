# 🔧 GUÍA COMPLETA: Implementar OCR Real con Google Vision

## ✅ LO QUE YA ESTÁ LISTO

Tu proyecto tiene **TODO** configurado para funcionar con Google Vision API:

- ✅ Base de datos OCR creada
- ✅ Servicios OCR implementados  
- ✅ UI completa en `/ocr/test`
- ✅ Configuración de Google Cloud preparada
- ✅ Tipos TypeScript completos
- ✅ Manejo de errores implementado

## 🚀 PASOS PARA ACTIVAR OCR REAL

### **PASO 1: Instalar Dependencia Google Vision (2 minutos)**

```bash
cd /home/rodrichrz/proyectos/V20---\ recuperacion/project2
npm install @google-cloud/vision
```

### **PASO 2: Configurar Variables de Entorno (5 minutos)**

Tienes el JSON de Google Cloud, ahora configuralo:

#### **Opción A: JSON Completo (RECOMENDADO)**
1. Copia tu archivo JSON completo
2. Crea archivo `.env` en la raíz del proyecto:

```env
# Supabase (ya configurado)
VITE_SUPABASE_URL="https://gomnouwackzvthpwyric.supabase.co"
VITE_SUPABASE_ANON_KEY="tu-anon-key-aqui"

# Google Vision - JSON COMPLETO
VITE_GOOGLE_SERVICE_ACCOUNT_KEY='{"type":"service_account","project_id":"tu-project-id","private_key_id":"...","private_key":"-----BEGIN PRIVATE KEY-----\\n...\\n-----END PRIVATE KEY-----\\n","client_email":"...","client_id":"...","auth_uri":"https://accounts.google.com/o/oauth2/auth","token_uri":"https://oauth2.googleapis.com/token","auth_provider_x509_cert_url":"https://www.googleapis.com/oauth2/v1/certs","client_x509_cert_url":"..."}'

# OCR Configuración
VITE_OCR_ENABLED="true"
VITE_SECURITY_MODE="development"
VITE_ENABLE_CONSOLE_LOGS="true"
```

#### **Opción B: Variables Individuales**
```env
# Extrae estos valores de tu JSON:
VITE_GOOGLE_CLOUD_PROJECT_ID="tu-project-id"
VITE_GOOGLE_CLIENT_EMAIL="tu-service-account@tu-project.iam.gserviceaccount.com"
VITE_GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\\nTU_PRIVATE_KEY\\n-----END PRIVATE KEY-----\\n"
VITE_GOOGLE_CLIENT_ID="tu-client-id"

VITE_OCR_ENABLED="true"
```

### **PASO 3: Reiniciar el Servidor (1 minuto)**

```bash
# Detener el servidor actual (Ctrl+C si está corriendo)
# Luego ejecutar:
npm run dev
```

### **PASO 4: Probar OCR Real (2 minutos)**

1. Ve a: `http://localhost:5173/ocr/test`
2. Sube un documento (ticket o factura)
3. ¡El OCR real debería funcionar!

## 📋 EJEMPLO DE TU ARCHIVO .env FINAL

```env
# Supabase
VITE_SUPABASE_URL="https://gomnouwackzvthpwyric.supabase.co"
VITE_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Google Cloud - PEGA TU JSON AQUÍ
VITE_GOOGLE_SERVICE_ACCOUNT_KEY='{
  "type": "service_account",
  "project_id": "mi-proyecto-ocr",
  "private_key_id": "abc123...",
  "private_key": "-----BEGIN PRIVATE KEY-----\\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...\\n-----END PRIVATE KEY-----\\n",
  "client_email": "ocr-service@mi-proyecto-ocr.iam.gserviceaccount.com",
  "client_id": "123456789...",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/ocr-service%40mi-proyecto-ocr.iam.gserviceaccount.com"
}'

# OCR Settings
VITE_OCR_ENABLED="true"
VITE_SECURITY_MODE="development"
VITE_ENABLE_CONSOLE_LOGS="true"
```

## 🔍 VERIFICACIÓN DE FUNCIONAMIENTO

Cuando funcione correctamente, verás estos logs en consola:

```
✅ Google Vision API cliente inicializado correctamente
🤖 Google Vision API Configuration:
- Configured: ✅
- Project ID: mi-proyecto...
- Max File Size: 10.0MB
- Supported Formats: pdf, jpg, jpeg, png
- Language Hints: es, en
```

## ⚠️ IMPORTANTE: SEGURIDAD

- **NUNCA** commitear el archivo `.env` al repositorio
- Agregar `.env` al `.gitignore`
- En producción, usar variables de entorno del servidor

## 🚨 SI HAY PROBLEMAS

### Error: "Google Vision no configurado"
- Verifica que las variables estén en `.env`
- Reinicia el servidor después de cambiar `.env`

### Error: "Invalid credentials"
- Verifica que el JSON esté completo y correcto
- Asegúrate de que las comillas estén escapadas (`\\"`)

### Error: "Project not found"
- Verifica que el `project_id` sea correcto
- Asegúrate de que Google Vision API esté habilitada

---

## 💡 ¿LISTO PARA IMPLEMENTAR?

**Solo necesitas:**
1. Tu JSON de Google Cloud
2. 10 minutos
3. Seguir estos pasos

**¡Comparte tu JSON y te ayudo a configurarlo perfectamente!**