# 🔒 Solución Error RLS - Supabase Storage

## 🐛 Problema Actual

```
POST https://gomnouwackzvthpwyric.supabase.co/storage/v1/object/event_docs/... 400 (Bad Request)
⚠️ No se pudo guardar en bucket: new row violates row-level security policy
```

**Causa:** El bucket `event_docs` tiene políticas de Row Level Security (RLS) que impiden que el usuario actual suba archivos a las carpetas de eventos.

## 📁 Estructura de Almacenamiento Correcta

```
event_docs/
└── {clave_evento}/               # Clave del evento (EVT-2025-001)
    └── gastos/                   # Carpeta de gastos
        └── {clave_evento}_{gastoId}_v{version}_{filename}.jpg
```

**Ejemplo:**
```
event_docs/
└── EVT-2025-001/
    └── gastos/
        ├── EVT-2025-001_GST123_v1_ticket.jpg
        ├── EVT-2025-001_GST123_v2_ticket_corregido.jpg
        └── EVT-2025-001_GST456_v1_factura.pdf
```

**Consistente con estructura de documentos de evento:**
```
event_docs/
└── EVT-2025-001/
    ├── contrato/      ← Documentos de evento existentes
    ├── acuerdo/
    ├── cierre/
    └── gastos/        ← NUEVO - Documentos de gastos
```

---

## ✅ Solución 1: Crear Políticas RLS (Recomendado)

### Paso 1: Ir a Supabase Dashboard
1. Abre: https://app.supabase.com/project/gomnouwackzvthpwyric
2. Ve a **Storage** → **Policies**
3. Selecciona el bucket `documents`

### Paso 2: Crear Política de INSERT
```sql
-- Política: Permitir subir archivos a gastos de eventos
CREATE POLICY "Permitir subir archivos de gastos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'event_docs' 
  AND (storage.foldername(name))[2] = 'gastos'
);
```

### Paso 3: Crear Política de SELECT
```sql
-- Política: Permitir leer archivos de gastos de eventos
CREATE POLICY "Permitir leer archivos de gastos"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'event_docs' 
  AND (storage.foldername(name))[2] = 'gastos'
);
```

### Paso 4: Crear Política de UPDATE (para versiones)
```sql
-- Política: Permitir actualizar archivos de gastos (nuevas versiones)
CREATE POLICY "Permitir actualizar archivos de gastos"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'event_docs' 
  AND (storage.foldername(name))[2] = 'gastos'
);
```

### Paso 5: Crear Política de DELETE (opcional)
```sql
-- Política: Permitir eliminar archivos de gastos
CREATE POLICY "Permitir eliminar archivos de gastos"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'event_docs' 
  AND (storage.foldername(name))[2] = 'gastos'
);
```

---

## ✅ Solución 2: Política con Validación de Evento

Si quieres asegurar que solo se suban archivos a eventos propios:

```sql
-- Política: Solo subir archivos a eventos donde el usuario tenga acceso
CREATE POLICY "Subir archivos a eventos propios"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'event_docs' 
  AND (storage.foldername(name))[2] = 'gastos'
  AND EXISTS (
    SELECT 1 FROM eventos e
    WHERE e.id = (storage.foldername(name))[1]::uuid
    AND (
      e.created_by = auth.uid()
      OR EXISTS (
        SELECT 1 FROM event_members em
        WHERE em.evento_id = e.id
        AND em.user_id = auth.uid()
      )
    )
  )
);
```

## ✅ Solución 3: Deshabilitar RLS Temporalmente (Solo Desarrollo)

⚠️ **NO recomendado para producción**

```sql
-- En Supabase SQL Editor
ALTER TABLE storage.objects DISABLE ROW LEVEL SECURITY;
```

Para volver a habilitar:
```sql
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
```

---

## 🔍 Verificar Políticas Actuales

```sql
-- Ver todas las políticas del bucket documents
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'objects'
AND schemaname = 'storage';
```

---

## 📝 Implementación en el Código

El código ya está implementado en `DualOCRExpenseForm.tsx`:

```typescript
// PASO 1: Obtener clave_evento
const { data: eventData } = await supabase
  .from('evt_eventos')
  .select('clave_evento')
  .eq('id', eventId)
  .single();

const claveEvento = eventData?.clave_evento || eventId;

// PASO 2: Comprimir archivo
setOcrProgress('Guardando archivo en almacenamiento...');
const { autoCompressIfNeeded } = await import('../../../../shared/utils/imageCompression');

// Comprimir solo si es imagen (PDFs sin comprimir)
const isPDF = file.type === 'application/pdf';
const processedFile = isPDF ? file : await autoCompressIfNeeded(file, {
  maxSizeKB: 2048,
  maxWidth: 2400,
  maxHeight: 2400,
  quality: 0.85
});

// PASO 3: Construir ruta según estructura
// event_docs/{clave_evento}/gastos/{clave_evento}_temp_{timestamp}_v1_{filename}
const timestamp = Date.now();
const version = 1;
const cleanFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
const fileName = `${claveEvento}_temp_${timestamp}_v${version}_${cleanFileName}`;
const filePath = `${claveEvento}/gastos/${fileName}`;

// PASO 4: Guardar en bucket event_docs
const { data: uploadData, error: uploadError } = await supabase.storage
  .from('event_docs')
  .upload(filePath, processedFile, {
    cacheControl: '3600',
    upsert: false
  });

if (uploadError) {
  console.warn('⚠️ Error al guardar:', uploadError.message);
} else {
  console.log('✅ Archivo guardado:', uploadData.path);
}
```

**Nota:** El nombre incluye `temp` porque aún no se tiene el ID del gasto. Al guardar el gasto en la base de datos, se debe:
1. Obtener el ID del gasto creado
2. Renombrar el archivo: `{clave_evento}_temp_xxx` → `{clave_evento}_{gastoId}_v1_{filename}`
3. Actualizar el campo `documento_url` en la tabla `expenses`

---

## 🎯 Decisión Recomendada

**Para desarrollo:**
- Usar Solución 1 (Crear políticas RLS específicas)
- Permite control fino de acceso
- Mantiene seguridad

**Para producción:**
- Usar Solución 1 con políticas más estrictas
- Agregar validación de tamaño
- Implementar limpieza automática de archivos temporales (cronjob)

---

## 🧹 Limpieza Automática de Archivos Temporales

Crear función para eliminar archivos con `_temp_` mayores a 24 horas:

```sql
-- Función: Limpiar archivos temporales antiguos
CREATE OR REPLACE FUNCTION cleanup_temp_expense_files()
RETURNS void AS $$
BEGIN
  DELETE FROM storage.objects
  WHERE bucket_id = 'event_docs'
  AND (storage.foldername(name))[2] = 'gastos'
  AND name LIKE '%_temp_%'
  AND created_at < NOW() - INTERVAL '24 hours';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ejecutar cada día a las 2 AM (configurar en Supabase Dashboard > Database > Cron Jobs)
-- SELECT cron.schedule('cleanup-temp-files', '0 2 * * *', 'SELECT cleanup_temp_expense_files()');
```

## 🔄 Renombrar Archivo al Guardar Gasto

Cuando se guarda el gasto y se obtiene su ID, renombrar el archivo:

```typescript
// Después de crear el gasto
const { data: newExpense } = await supabase
  .from('expenses')
  .insert({ ...expenseData })
  .select()
  .single();

if (newExpense && tempFileName) {
  // Obtener clave_evento
  const { data: eventData } = await supabase
    .from('evt_eventos')
    .select('clave_evento')
    .eq('id', eventId)
    .single();
  
  const claveEvento = eventData.clave_evento; // "EVT-2025-001"
  
  // Renombrar archivo: {clave_evento}_temp_xxx → {clave_evento}_{gastoId}_v1_{filename}
  const oldPath = `${claveEvento}/gastos/${tempFileName}`;
  const newFileName = tempFileName.replace(/_temp_\d+_/, `_${newExpense.id}_`);
  const newPath = `${claveEvento}/gastos/${newFileName}`;
  
  const { error: moveError } = await supabase.storage
    .from('event_docs')
    .move(oldPath, newPath);
  
  if (!moveError) {
    // Actualizar documento_url en expense
    await supabase
      .from('expenses')
      .update({ documento_url: newPath })
      .eq('id', newExpense.id);
  }
}
```

---

## 📊 Estado Actual del Sistema

- ✅ RFC se extrae correctamente (acepta formato `NAVB801231/69`)
- ✅ Total se valida con texto en palabras
- ✅ Campo `detalle_compra` agregado a interfaz y tipo
- ✅ Productos se extraen y formatean
- ✅ **Guardado en bucket IMPLEMENTADO** (bucket: `event_docs`)
- ✅ **Usa `clave_evento`** en lugar de ID UUID (consistente con documentos de evento)
- ⚠️ **Esperando configuración RLS** para que funcione correctamente

## 📁 Estructura Implementada

```
Bucket: event_docs
├── {clave_evento}/              # Ejemplo: EVT-2025-001
│   ├── contrato/                # Documentos de evento existentes
│   ├── acuerdo/
│   ├── cierre/
│   └── gastos/                  # ← NUEVO - Documentos de gastos
│       └── {clave_evento}_temp_{timestamp}_v1_{filename}.jpg
```

**Al guardar el gasto:**
```
Renombrar: EVT-2025-001_temp_{timestamp}_v1_{filename}.jpg
       →   EVT-2025-001_{gastoId}_v1_{filename}.jpg
```

**Próximo paso:** Aplicar políticas RLS en Supabase Dashboard (ver Paso 2-5 arriba)
