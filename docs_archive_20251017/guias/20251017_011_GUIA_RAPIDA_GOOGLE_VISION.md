# 🚀 Guía Rápida: Configurar Google Vision en 5 Minutos

## Paso 1: Obtener API Key (2 minutos)

1. **Ve a Google Cloud Console:**
   https://console.cloud.google.com/

2. **Crear proyecto (si no tienes):**
   - Clic en el selector de proyectos (arriba)
   - Clic en "Nuevo Proyecto"
   - Nombre: `mi-ocr-project`
   - Clic en "Crear"

3. **Habilitar Cloud Vision API:**
   - En el menú ☰ → "APIs y servicios" → "Biblioteca"
   - Busca: `Cloud Vision API`
   - Clic en "Habilitar"
   - Espera 30 segundos

4. **Crear API Key:**
   - En el menú ☰ → "APIs y servicios" → "Credenciales"
   - Clic en "+ CREAR CREDENCIALES"
   - Selecciona "Clave de API"
   - **Copia la API Key** (ejemplo: `AIzaSyB1a2c3D4E5F6g7H8i9J0k1L2m3N4o5P6Q`)

---

## Paso 2: Configurar en el Proyecto (1 minuto)

### Crear archivo `.env`

En la **raíz del proyecto**, crea un archivo llamado `.env`:

```bash
# En la terminal:
cd "/home/rodrichrz/proyectos/V20--- recuperacion/project2"
touch .env
```

### Agregar API Key

Abre el archivo `.env` y agrega:

```env
# Google Vision API Key
VITE_GOOGLE_VISION_API_KEY="AIzaSyB1a2c3D4E5F6g7H8i9J0k1L2m3N4o5P6Q"
```

**⚠️ IMPORTANTE:** Reemplaza con tu API Key real que copiaste.

---

## Paso 3: Reiniciar Servidor (30 segundos)

```bash
# Detener el servidor actual (Ctrl+C)
# Iniciar de nuevo:
npm run dev
```

---

## Paso 4: Probar (1 minuto)

1. **Abre la aplicación** (localhost:5173)
2. **Ve a Gastos** de un evento
3. **Arrastra un ticket** al área de OCR
4. **Verifica en la consola del navegador** (F12):

### Resultado Esperado ✅

```
🎯 Iniciando procesamiento OCR de máxima calidad...
🔄 Procesando con Google Vision API...
🚀 Iniciando Google Vision API DIRECTA...
🔑 API Key encontrada, procesando imagen...
📷 Imagen convertida a base64
📤 Enviando a Google Vision API...
✅ Respuesta recibida de Google Vision
📋 Parseando respuesta de Google Vision
✅ Texto extraído: 1456 caracteres
🎯 Confianza: 95%
```

### Si NO está configurado ⚠️

```
🎯 Iniciando procesamiento OCR de máxima calidad...
🔄 Procesando con Google Vision API...
❌ Error en Google Vision: API Key de Google Vision no configurada
⚠️ Método 1 falló
🔄 Fallback a Tesseract optimizado...
✅ Método 2 exitoso!
```

(Esto es normal si aún no configuras la API Key - usa Tesseract)

---

## ✅ Verificar que Funciona

Después de configurar, los campos deben auto-llenarse con **alta precisión**:

| Campo | Debe Aparecer |
|-------|---------------|
| Total | ✅ 895 (corregido) |
| RFC | ✅ NAVB801231/69 |
| Proveedor | ✅ TORTAS GIGANTES SUR 12 |
| Concepto | ✅ Alimentos y Bebidas |
| Detalle de Compra | ✅ Lista completa de productos |

---

## 🔒 Seguridad

### ⚠️ NUNCA hagas esto:

```javascript
// ❌ MAL - API Key en el código
const apiKey = "AIzaSyB1a2c3...";
```

### ✅ SIEMPRE haz esto:

```env
# ✅ BIEN - API Key en archivo .env
VITE_GOOGLE_VISION_API_KEY="AIzaSyB1a2c3..."
```

El archivo `.env` está en `.gitignore` y **no se sube a GitHub**.

---

## 💰 Costos

- **Primeros 1,000 tickets/mes:** GRATIS
- **Después:** $1.50 USD por cada 1,000 tickets

**Ejemplo:**
- 100 tickets/día × 30 días = 3,000/mes = **$3 USD/mes**

---

## 🆘 Problemas Comunes

### "API Key no configurada"

**Causa:** No existe archivo `.env` o falta la variable

**Solución:**
```bash
# Verificar que existe
ls -la .env

# Si no existe, crearlo
echo 'VITE_GOOGLE_VISION_API_KEY="TU-API-KEY"' > .env

# Reiniciar servidor
npm run dev
```

### "403 Forbidden"

**Causa:** API Key inválida o sin permisos

**Solución:**
1. Ve a Google Cloud Console
2. Verifica que Cloud Vision API esté habilitada
3. Regenera la API Key
4. Actualiza `.env`

### "429 Too Many Requests"

**Causa:** Excediste los 1,000 requests gratuitos

**Solución:**
- Espera al siguiente mes
- O agrega método de pago en Google Cloud

### "CORS Error"

**Causa:** Restrictions en la API Key

**Solución:**
1. Ve a Google Cloud Console → Credenciales
2. Edita tu API Key
3. En "Restricciones de aplicación" → "Ninguna"
4. Guarda

---

## 📊 Comparación

| Con Google Vision | Sin Google Vision (Tesseract) |
|-------------------|-------------------------------|
| ⭐⭐⭐⭐⭐ Precisión 95-98% | ⭐⭐⭐ Precisión 75-85% |
| ⚡ Rápido (2-3 seg) | ⚡ Medio (5-8 seg) |
| 💰 1,000 gratis/mes | 💰 Gratis siempre |
| ✅ Extrae productos completos | ⚠️ Puede fallar productos |

---

## ✅ Resumen de 30 Segundos

```bash
# 1. Obtener API Key de Google Cloud Console
# 2. Crear .env:
echo 'VITE_GOOGLE_VISION_API_KEY="AIzaSy..."' > .env

# 3. Reiniciar servidor:
npm run dev

# 4. Probar subiendo un ticket
```

**¡Listo! Ahora tienes OCR de máxima calidad** 🎉
