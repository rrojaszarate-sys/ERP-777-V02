# ⚡ INSTRUCCIONES INMEDIATAS - Soporte de PDFs

## 🎯 Lo que se hizo

Se cambió el enfoque para procesar PDFs:
- ✅ Los PDFs se guardan en Supabase Storage (bucket `event_docs`)
- ✅ Los PDFs se convierten a imágenes PNG de alta calidad
- ✅ Las imágenes se procesan con Google Vision OCR
- ✅ Se extraen todos los datos automáticamente

## 📦 Instalar AHORA

**Paso 1**: Abrir una nueva terminal (detén el servidor si está corriendo)

**Paso 2**: Ejecutar:
```bash
npm install pdfjs-dist
```

**Paso 3**: Reiniciar el servidor:
```bash
npm run dev
```

## 🧪 Probar INMEDIATAMENTE

1. **Abrir la aplicación** en el navegador
2. **Ir a Gastos** del evento
3. **Arrastrar el PDF** `FACTURA_HP-_HUGO_DE_LA_CUADRA.PDF`
4. **Observar la consola** del navegador (F12):

**Deberías ver**:
```
📄 Archivo seleccionado: FACTURA_HP-_HUGO_DE_LA_CUADRA.PDF (PDF)
📄 Detectado PDF - guardando archivo original en bucket
✅ PDF original guardado en bucket: EVT-2025-XXX/gastos/...
   Tamaño: XXX KB
🔄 Convirtiendo PDF a imagen para OCR...
   Opciones: escala=2.0x, página=1, calidad=0.95
   ✅ PDF cargado: 1 página(s)
   📐 Dimensiones: XXXXxXXXXpx
   🎨 Página renderizada en canvas
   ✅ Imagen generada: XXX.XKB
🚀 Iniciando Google Vision con Service Account...
✅ Texto extraído: XXXX caracteres
```

5. **Verificar que los campos se autocompletaron**:
   - Proveedor
   - RFC
   - Total
   - Productos (formato línea por línea)
   - Etc.

## 📂 Archivos Creados

1. **`src/shared/utils/pdfToImage.ts`** - Utilidad de conversión
2. **`GUIA_PDF_OCR.md`** - Guía completa (léela después)
3. **`RESUMEN_IMPLEMENTACION_PDF.md`** - Resumen técnico
4. **`scripts/install-pdf-support.sh`** - Script de instalación
5. **`INSTRUCCIONES_INMEDIATAS_PDF.md`** - Este archivo

## 📝 Archivos Modificados

1. **`realGoogleVision.ts`** - Detecta y convierte PDFs
2. **`DualOCRExpenseForm.tsx`** - Guarda PDFs en bucket

## ⚠️ Si hay errores

### Error: "pdfjs-dist not found"
```bash
npm install pdfjs-dist
```

### Error: "Worker failed to load"
- Verifica tu conexión a internet (usa CDN)
- O edita `pdfToImage.ts` y cambia la ruta del worker

### Error: "No se pudo guardar en bucket"
- Verifica que el bucket `event_docs` existe en Supabase
- Verifica que tienes permisos de escritura

### El PDF no se procesa
- Abre la consola del navegador (F12)
- Copia todos los logs y compártelos

## 📚 Documentación Completa

Lee `GUIA_PDF_OCR.md` para:
- Configuración detallada
- Flujo completo
- Casos de uso
- Métricas de rendimiento
- Troubleshooting

## ✅ Checklist

- [ ] Ejecutar `npm install pdfjs-dist`
- [ ] Reiniciar servidor (`npm run dev`)
- [ ] Probar subir PDF
- [ ] Verificar logs en consola
- [ ] Verificar datos extraídos
- [ ] Verificar PDF en Supabase Storage
- [ ] Leer `GUIA_PDF_OCR.md`

---

🎉 **¡Ya está todo listo! Solo falta instalar la dependencia y probar.**
