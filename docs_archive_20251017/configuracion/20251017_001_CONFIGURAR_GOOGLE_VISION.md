# 🔧 Configuración de Google Vision API para OCR

## 🎯 Objetivo

Configurar Google Vision API para obtener la **máxima calidad** en extracción de texto de tickets y documentos.

---

## 📋 Requisitos Previos

1. ✅ Cuenta de Google Cloud Platform
2. ✅ Proyecto en Google Cloud Console
3. ✅ Tarjeta de crédito (Google ofrece $300 USD de crédito gratuito)

---

## 🚀 Pasos de Configuración

### 1. Crear Proyecto en Google Cloud

1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. Crea un nuevo proyecto o selecciona uno existente
3. Anota el **Project ID** (ejemplo: `mi-proyecto-ocr-123`)

### 2. Habilitar Cloud Vision API

1. En el menú lateral, ve a **APIs & Services** → **Library**
2. Busca "Cloud Vision API"
3. Clic en **Enable** (Habilitar)
4. Espera 1-2 minutos para que se active

### 3. Crear API Key

**Opción A: API Key Simple (Recomendado para desarrollo)**

1. Ve a **APIs & Services** → **Credentials**
2. Clic en **+ CREATE CREDENTIALS** → **API Key**
3. Copia la API Key generada
4. (Opcional) Clic en **Edit API Key** para:
   - Restringir a Cloud Vision API
   - Restringir por dirección IP
   - Establecer cuota de uso

**Opción B: Service Account (Producción)**

1. Ve a **APIs & Services** → **Credentials**
2. Clic en **+ CREATE CREDENTIALS** → **Service Account**
3. Completa el formulario:
   - Nombre: `ocr-service-account`
   - Role: `Cloud Vision API User`
4. Clic en **Create and Continue**
5. Descarga el archivo JSON de credenciales

### 4. Configurar en tu Proyecto

**Si usas API Key:**

1. Crea archivo `.env` en la raíz del proyecto:
   ```bash
   cp .env.example .env
   ```

2. Edita `.env` y agrega:
   ```bash
   VITE_GOOGLE_VISION_API_KEY="AIzaSy..."  # Tu API Key aquí
   ```

**Si usas Service Account:**

1. Edita `.env` y agrega todo el JSON:
   ```bash
   VITE_GOOGLE_SERVICE_ACCOUNT_KEY='{"type":"service_account","project_id":"...",...}'
   ```

### 5. Reiniciar Servidor de Desarrollo

```bash
# Detener el servidor (Ctrl+C)
# Iniciar de nuevo
npm run dev
```

---

## ✅ Verificar Configuración

### 1. Revisar Consola del Navegador

Al subir un ticket, deberías ver:

```
🎯 Iniciando procesamiento OCR de máxima calidad...
🔄 Procesando con Google Vision API...
🚀 Iniciando Google Vision REAL...
📷 Imagen convertida: data:image/jpeg;base64,/9j...
🔑 Credenciales cargadas para proyecto: mi-proyecto-ocr-123
✅ Google Vision exitoso!
📊 Confianza: 98%
```

### 2. Si No Está Configurado

Verás en la consola:

```
🎯 Iniciando procesamiento OCR de máxima calidad...
🔄 Procesando con Google Vision API...
❌ Error en Google Vision Real: Credenciales de Google Vision no encontradas
⚠️ Método 1 falló
🔄 Fallback a Tesseract optimizado...
✅ Método 2 exitoso!
```

**Esto es normal** - el sistema usará Tesseract automáticamente.

---

## 💰 Costos

### Cuota Gratuita
- **1,000 unidades/mes** gratis
- Cada imagen = 1 unidad
- **Suficiente para desarrollo y proyectos pequeños**

### Después de la Cuota Gratuita
- **$1.50 USD por 1,000 imágenes** (0-5M unidades/mes)
- **$0.60 USD por 1,000 imágenes** (5M+ unidades/mes)

**Ejemplo:**
- 100 tickets/día = 3,000/mes = **$3 USD/mes**
- 500 tickets/día = 15,000/mes = **$21 USD/mes**

### Comparación de Calidad

| Motor OCR | Precisión | Velocidad | Costo | Productos Extraídos |
|-----------|-----------|-----------|-------|---------------------|
| **Google Vision** | 95-98% | ⚡⚡⚡ Rápido | $1.50/1k | ✅ Excelente |
| **Tesseract.js** | 75-85% | ⚡⚡ Medio | Gratis | ⚠️ Regular |
| **OCR.space** | 85-90% | ⚡⚡ Medio | Límites | ⚠️ Bueno |

---

## 🔒 Seguridad

### ⚠️ NUNCA subas al repositorio:
- ❌ `.env` (está en `.gitignore`)
- ❌ Archivos JSON de service account
- ❌ API Keys en el código

### ✅ Prácticas Recomendadas:
1. Usa variables de entorno (`.env`)
2. Restringe API Keys por:
   - IP del servidor
   - Dominio de producción
   - API específica (Cloud Vision)
3. Establece cuotas de uso
4. Monitorea uso en Cloud Console

---

## 🧪 Probar Sin Google Vision

Si prefieres usar **Tesseract.js gratis**, simplemente:

1. **NO configures** la API Key en `.env`
2. El sistema usará Tesseract automáticamente
3. Funciona offline, sin costos

**Ventajas de Tesseract:**
- ✅ Gratis
- ✅ Sin límites
- ✅ Funciona offline
- ✅ Privado (procesamiento local)

**Desventajas:**
- ⚠️ Menor precisión (75-85%)
- ⚠️ Más lento
- ⚠️ Puede fallar en tickets complejos

---

## 🐛 Solución de Problemas

### Error: "403 Forbidden"
**Causa:** API Key no válida o expirada
**Solución:** Regenerar API Key en Google Cloud Console

### Error: "429 Too Many Requests"
**Causa:** Excediste la cuota
**Solución:** 
1. Esperar al siguiente mes
2. O actualizar cuota en Cloud Console

### Error: "Credenciales no encontradas"
**Causa:** `.env` no está configurado
**Solución:** 
1. Crear archivo `.env`
2. Agregar `VITE_GOOGLE_VISION_API_KEY`
3. Reiniciar servidor

### Texto Extraído Es Incorrecto
**Posibles causas:**
1. Imagen borrosa o de baja calidad
2. Ticket con mucha información
3. Iluminación mala

**Soluciones:**
1. Subir imagen de mejor calidad
2. Usar compresión menor (configurar en `imageCompression.ts`)
3. Probar con Google Vision (mayor precisión)

---

## 📚 Referencias

- [Google Vision API Docs](https://cloud.google.com/vision/docs)
- [Pricing Calculator](https://cloud.google.com/vision/pricing)
- [API Key Best Practices](https://cloud.google.com/docs/authentication/api-keys)

---

## ✅ Estado Actual del Sistema

| Configuración | Estado | Acción Requerida |
|---------------|--------|------------------|
| Google Vision API | ⏳ Pendiente | Configurar API Key en `.env` |
| Tesseract.js | ✅ Activo | Funcionando como fallback |
| OCR.space | ⚠️ Limitado | Última opción (puede fallar) |

---

**🎯 RECOMENDACIÓN:**

Para **máxima calidad**, configura Google Vision. Para desarrollo sin costos, usa Tesseract (ya funciona automáticamente).
