# 🚀 ACCIÓN INMEDIATA - Completa la UI de OCR

## ⚠️ Estado Actual
- ✅ Todos los handlers drag & drop creados
- ✅ Estado de progreso implementado  
- ✅ Compresión y bucket guardado funcionando
- ❌ **UI todavía muestra selector antiguo y botón manual**
- ❌ **Errores de compilación por referencias a `ocrEngine` y `setOcrEngine`**

## 📝 Instrucciones Paso a Paso

### 1. Abrir el archivo
```
src/modules/eventos/components/finances/DualOCRExpenseForm.tsx
```

### 2. Buscar la línea 877
Busca exactamente este texto:
```tsx
{/* Selector de Motor OCR */}
```

### 3. Seleccionar desde línea 877 hasta línea 963
Debes seleccionar TODO desde:
- **Inicio:** `{/* Selector de Motor OCR */}`  
- **Fin:** Hasta ANTES de `{/* Resultado OCR */}`

Esto incluye:
- El selector de motores (Google/Tesseract)
- El input de archivo
- El botón "Extraer Datos Reales"

### 4. Reemplazar con el código del archivo
Abre el archivo:
```
OCR_UI_REPLACEMENT.tsx
```

Copia TODO el contenido y pégalo reemplazando la selección del paso 3.

### 5. Verifica que compile
Guarda el archivo y verifica que no haya errores de compilación.

## ✅ Resultado Esperado

Después del reemplazo:
- ✅ Área de drag & drop visible
- ✅ Sin selector de motores
- ✅ Sin botón manual "Extraer Datos"  
- ✅ Barra de progreso visible durante procesamiento
- ✅ Sin errores de `ocrEngine` o `setOcrEngine`

## 🎯 Funcionalidad Final

1. **Arrastrar archivo** → Se activa zona azul
2. **Soltar/Seleccionar** → Valida tamaño (10MB max)
3. **Procesamiento automático:**
   - "Preparando archivo..."
   - "Guardando archivo en almacenamiento..."
   - "Procesando con OCR de alta calidad..."
   - "Extrayendo información..."
   - "Completado"
4. **Guardar en bucket:** `documents/temp_ocr/` (imagen comprimida)
5. **Llenar formulario** automáticamente con datos extraídos

## 🐛 Si hay problemas

### Error: "Cannot find name 'ocrEngine'"
Significa que NO completaste el paso de reemplazar el selector. Ve al paso 2-4.

### Error: "'handleDragOver' is declared but never used"
Es normal ANTES del reemplazo. Desaparecerá al aplicar el nuevo código.

### La zona drag & drop no se ve
Verifica que hayas copiado TODO el código desde `OCR_UI_REPLACEMENT.tsx`.

---

**📌 Nota:** Los cambios en el backend (handlers, progreso, bucket, compresión) ya están completados. Solo falta actualizar la UI.
