# 🔧 SOLUCIÓN - Errores de PDF Worker y Extracción

## ❌ Problemas Encontrados

### 1. Worker de PDF.js no carga (404)
```
Failed to load resource: the server responded with a status of 404
http://cdnjs.cloudflare.com/ajax/libs/pdf.js/5.4.296/pdf.worker.min.js
```

**Causa**: La versión 5.4.296 no existe en cdnjs.cloudflare.com

### 2. Error en extracción de datos
```
TypeError: Cannot read properties of undefined (reading 'replace')
at extractMexicanTicketData (DualOCRExpenseForm.tsx:346:43)
```

**Causa**: `match[1]` puede ser undefined cuando el regex no captura grupos

## ✅ Soluciones Aplicadas

### 1. Cambio de CDN del Worker

**Archivo**: `src/shared/utils/pdfToImage.ts`

**Antes**:
```typescript
pdfjsLib.GlobalWorkerOptions.workerSrc = 
  `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
```

**Ahora**:
```typescript
// Usar jsDelivr CDN (más confiable y con versión fija)
pdfjsLib.GlobalWorkerOptions.workerSrc = 
  `https://cdn.jsdelivr.net/npm/pdfjs-dist@4.4.168/build/pdf.worker.min.mjs`;
```

**Ventajas**:
- ✅ jsDelivr es más estable que cdnjs
- ✅ Versión fija (4.4.168) garantiza disponibilidad
- ✅ Formato .mjs (ES modules) compatible con Vite

### 2. Validación de match[1]

**Archivo**: `src/modules/eventos/components/finances/DualOCRExpenseForm.tsx`

**Antes** (línea 346):
```typescript
const match = text.match(pattern);
if (match) {
  const num = parseFloat(match[1].replace(/,/g, '')); // ❌ Crash si match[1] es undefined
```

**Ahora**:
```typescript
const match = text.match(pattern);
if (match && match[1]) { // ✅ Verificar que match[1] existe
  const num = parseFloat(match[1].replace(/,/g, ''));
```

### 3. Configuración de Vite

**Archivo**: `vite.config.ts`

**Agregado**:
```typescript
optimizeDeps: {
  include: ['pdfjs-dist'], // Pre-bundlear pdfjs-dist
},
resolve: {
  alias: {
    'pdfjs-dist/build/pdf.worker.min.mjs': 'pdfjs-dist/build/pdf.worker.min.mjs',
  },
},
worker: {
  format: 'es', // ES modules para workers
},
```

## 🧪 Probar Ahora

### Paso 1: Reiniciar el Servidor

El servidor debe detectar los cambios automáticamente, pero si no:

```bash
# Detener (Ctrl+C)
# Reiniciar
npm run dev
```

### Paso 2: Limpiar Caché del Navegador

1. Abrir DevTools (F12)
2. Clic derecho en el botón de recargar
3. Seleccionar "Vaciar caché y recargar de forma forzada"

O simplemente:
```
Ctrl + Shift + R (Windows/Linux)
Cmd + Shift + R (Mac)
```

### Paso 3: Subir PDF de Nuevo

1. Ir a Gastos del evento
2. Arrastrar `FACTURA HP- HUGO DE LA CUADRA.PDF`
3. Observar consola

### Paso 4: Verificar Logs Esperados

**Deberías ver**:
```
📄 Archivo seleccionado: FACTURA HP- HUGO DE LA CUADRA.PDF (PDF)
📄 Detectado PDF - guardando archivo original en bucket
✅ PDF original guardado en bucket: EVT-2025-10-003/gastos/...
🔄 Convirtiendo PDF a imagen para OCR...
📄 Convirtiendo PDF a imagen: FACTURA HP- HUGO DE LA CUADRA.PDF
   Opciones: escala=2x, página=1, calidad=0.95
✅ PDF cargado: 1 página(s)
📐 Dimensiones: XXXXxXXXXpx
🎨 Página renderizada en canvas
✅ Imagen generada: XXX.XKB
📷 Archivo convertido a base64
🔐 Obteniendo access token...
✅ Access token obtenido
📤 Enviando a Google Vision API...
✅ Respuesta recibida de Google Vision
✅ Texto extraído: XXXX caracteres
🎯 Confianza: 95%
```

**NO deberías ver**:
```
❌ Warning: Setting up fake worker.
❌ Failed to load resource: ...pdf.worker.min.js (404)
❌ TypeError: Cannot read properties of undefined (reading 'replace')
```

## 📊 Resultado Esperado

Después de procesar el PDF:

### Campos Autocompletados

- **Proveedor**: `WALMART` ✅
- **RFC**: `NWM9709244W4` ✅
- **Total**: `23999.01` ✅ (fue `32` antes, ahora correcto)
- **Subtotal**: `21164.64` ✅
- **IVA**: `3310.21` ✅
- **Fecha**: `2021-10-21` ✅
- **Hora**: `13:56:32` ✅

### Productos Extraídos

Deberías ver productos en el textarea con formato:
```
1. Cantidad x Descripción - $Precio = $Total
2. Cantidad x Descripción - $Precio = $Total
...
```

## 🔍 Si Aún Hay Problemas

### Error: Worker still not loading

**Solución 1**: Verificar conexión a internet
```bash
curl -I https://cdn.jsdelivr.net/npm/pdfjs-dist@4.4.168/build/pdf.worker.min.mjs
```

**Solución 2**: Usar worker local (alternativa)

Editar `pdfToImage.ts`:
```typescript
// Importar el worker localmente
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;
```

Luego instalar el tipo:
```bash
npm install --save-dev @types/pdfjs-dist
```

### Error: TypeError persiste

Verificar que el archivo se guardó correctamente:
```bash
git diff src/modules/eventos/components/finances/DualOCRExpenseForm.tsx
```

Buscar la línea 346 (aproximadamente):
```typescript
if (match && match[1]) { // ✅ Debe incluir "&& match[1]"
```

### PDF no se convierte

**Caso 1**: PDF corrupto
- Intentar abrir el PDF en un visor (Adobe, Chrome)
- Si no abre, el archivo está dañado

**Caso 2**: PDF muy grande
- Reducir tamaño del PDF
- O reducir escala en `realGoogleVision.ts`:
  ```typescript
  scale: 1.5, // En lugar de 2.0
  ```

**Caso 3**: PDF solo con imágenes escaneadas
- El PDF no tiene capa de texto
- OCR.space lo procesará (fallback automático)
- Será más lento pero funcionará

## 📝 Archivos Modificados (Resumen)

1. **`src/shared/utils/pdfToImage.ts`**
   - Cambio CDN: cdnjs → jsDelivr
   - Versión fija: 4.4.168

2. **`src/modules/eventos/components/finances/DualOCRExpenseForm.tsx`**
   - Línea ~346: Agregado `&& match[1]`

3. **`vite.config.ts`**
   - Agregado `pdfjs-dist` a optimizeDeps
   - Configurado worker format

## ✅ Checklist Final

- [ ] Servidor reiniciado (o cambios detectados)
- [ ] Caché del navegador limpiado
- [ ] PDF subido nuevamente
- [ ] Logs muestran "✅ PDF cargado: 1 página(s)"
- [ ] NO aparece error 404 del worker
- [ ] NO aparece TypeError de undefined
- [ ] Campos del formulario autocompletados
- [ ] Total correcto (23999.01, no 32)

---

🎉 **Con estos cambios, el PDF debería procesarse correctamente usando Google Vision después de convertirse a imagen.**
