# 🚀 Vercel Serverless Functions

Este proyecto utiliza Vercel Serverless Functions para el backend.

## 📂 Estructura

```
api/
├── ocr-process.js           # OCR con Google Vision
└── cron/
    └── daily-report.js      # Reportes diarios automáticos
```

## 🔌 Endpoints Disponibles

### 1. OCR Processing

**Endpoint**: `POST /api/ocr-process`

**Body**:
```json
{
  "image": "base64_encoded_image_string"
}
```

**Response**:
```json
{
  "success": true,
  "text": "Texto extraído...",
  "data": {
    "proveedor": "Nombre del proveedor",
    "rfc": "RFC123456789",
    "fecha": "17/10/2025",
    "subtotal": 1000,
    "iva": 160,
    "total": 1160
  }
}
```

### 2. Daily Report (CRON)

**Endpoint**: `GET /api/cron/daily-report`

**Headers**:
```
Authorization: Bearer YOUR_CRON_SECRET
```

**Uso desde frontend**:
```typescript
// OCR Processing
const processOCR = async (imageFile: File) => {
  const base64 = await fileToBase64(imageFile);
  
  const response = await fetch('/api/ocr-process', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image: base64 })
  });
  
  return await response.json();
};
```

## ⚙️ Configuración en Vercel

### Variables de Entorno Requeridas:

✅ Ya configuradas en el dashboard de Vercel:
- `VITE_GOOGLE_SERVICE_ACCOUNT_KEY` - Credenciales de Google Cloud
- `VITE_SUPABASE_URL` - URL de Supabase
- `VITE_SUPABASE_SERVICE_ROLE_KEY` - Service Role Key
- `GMAIL_USER` - Email para reportes
- `GMAIL_APP_PASSWORD` - App Password de Gmail
- `CRON_SECRET` - Secreto para proteger endpoints CRON

### Configurar Cron Job en Vercel:

1. Ve a tu proyecto en Vercel
2. **Settings** → **Cron Jobs**
3. Haz clic en **"Add Cron Job"**
4. Configura:
   - **Path**: `/api/cron/daily-report`
   - **Schedule**: `0 9 * * *` (Diario a las 9am)
   - **Headers**: 
     ```
     Authorization: Bearer ${CRON_SECRET}
     ```

## 🧪 Testing Local

```bash
# Instalar dependencias
npm install

# Ejecutar Vercel CLI localmente
npx vercel dev

# Probar OCR
curl -X POST http://localhost:3000/api/ocr-process \
  -H "Content-Type: application/json" \
  -d '{"image":"base64_string_here"}'

# Probar Daily Report
curl http://localhost:3000/api/cron/daily-report \
  -H "Authorization: Bearer your_cron_secret"
```

## 📊 Monitoreo

- **Logs**: Vercel Dashboard → Functions → Logs
- **Metrics**: Vercel Dashboard → Analytics
- **Errors**: Vercel Dashboard → Deployments → Function Logs

## 🔒 Seguridad

- ✅ Autenticación en endpoints CRON
- ✅ CORS configurado para el dominio de producción
- ✅ Credenciales en variables de entorno
- ✅ Rate limiting por Vercel (automático)

## 📝 Notas

- Las funciones serverless tienen un timeout máximo de 30 segundos
- La memoria asignada es de 1024 MB
- Google Vision API funciona correctamente en Vercel
- Los emails se envían mediante Gmail SMTP
