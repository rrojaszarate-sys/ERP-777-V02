# Google Vision API - Configuración Real

## Pasos para activar Google Vision API completamente:

### 1. Crear API Key (Método más fácil)

1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. Selecciona el proyecto: `made-gastos`
3. Ve a "APIs & Services" > "Credentials"
4. Clic en "Create Credentials" > "API Key"
5. Copia la API Key generada
6. (Opcional) Restringe la API Key solo a Vision API

### 2. Agregar la API Key al proyecto

Agrega esta línea a tu `.env`:
```
VITE_GOOGLE_VISION_API_KEY="tu-api-key-aquí"
```

### 3. Activar Vision API

En Google Cloud Console:
1. Ve a "APIs & Services" > "Library"
2. Busca "Cloud Vision API"
3. Clic en "Enable"

## Implementación Alternativa (Más Fácil)

Si prefieres una solución inmediata, podemos:

1. **Usar OCR.space API** (gratis, sin configuración compleja)
2. **Usar Azure Computer Vision** (también muy bueno)
3. **Crear un proxy server simple** para Google Vision

## Para probar ahora:

El código actual intentará usar Google Vision con diferentes métodos.
Si todos fallan, usará Tesseract como fallback (que ya funciona perfectamente).

La calidad de Google Vision es superior, pero Tesseract ya está dando buenos resultados
para facturas mexicanas con el mapeo inteligente que implementamos.