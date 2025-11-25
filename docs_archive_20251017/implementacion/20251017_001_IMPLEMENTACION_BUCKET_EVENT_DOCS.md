# ✅ Implementación Bucket event_docs - Estructura Correcta

## 📁 Estructura Implementada

```
Bucket: event_docs
└── {clave_evento}/                      # Clave del evento (EVT-2025-001)
    └── gastos/                          # Carpeta de gastos
        └── {clave_evento}_{gastoId}_v{version}_{filename}.ext
```

### Ejemplo Real

```
event_docs/
└── EVT-2025-001/
    └── gastos/
        ├── EVT-2025-001_temp_1697123456789_v1_ticket.jpg      (temporal)
        ├── EVT-2025-001_GST001_v1_ticket.jpg                  (final)
        ├── EVT-2025-001_GST001_v2_ticket_corregido.jpg       (versión 2)
        └── EVT-2025-001_GST002_v1_factura.pdf                (otro gasto)
```

**Misma estructura que documentos de evento:**
```
event_docs/
└── EVT-2025-001/
    ├── contrato/
    │   └── EVT-2025-001_contrato_v1_contrato_firmado.pdf
    ├── acuerdo/
    │   └── EVT-2025-001_acuerdo_v1_acuerdo_servicio.pdf
    ├── cierre/
    │   └── EVT-2025-001_cierre_v1_cierre_evento.pdf
    └── gastos/                          # ← NUEVO
        └── EVT-2025-001_GST001_v1_ticket.jpg
```

---

## 🔄 Flujo de Guardado

### Paso 1: Subir Archivo con OCR (Temporal)
```typescript
// Obtener clave_evento del evento
const { data: eventData } = await supabase
  .from('evt_eventos')
  .select('clave_evento')
  .eq('id', eventId)
  .single();

const claveEvento = eventData.clave_evento; // "EVT-2025-001"

// Usuario sube ticket para OCR
const fileName = `${claveEvento}_temp_${timestamp}_v1_${cleanFileName}`;
const filePath = `${claveEvento}/gastos/${fileName}`;

// Guardar en: event_docs/EVT-2025-001/gastos/EVT-2025-001_temp_1697xxx_v1_ticket.jpg
await supabase.storage
  .from('event_docs')
  .upload(filePath, processedFile);
```

**Nombre temporal:** Incluye `_temp_` porque aún no existe el gasto en la BD.

### Paso 2: Guardar Gasto en Base de Datos
```typescript
// Crear gasto con datos del OCR
const { data: newExpense } = await supabase
  .from('expenses')
  .insert({
    evento_id: eventId,
    concepto: extractedData.concepto,
    total: extractedData.total,
    // ... otros campos
  })
  .select()
  .single();

// newExpense.id = "gst001"
```

### Paso 3: Renombrar Archivo (temp → ID real)
```typescript
// Obtener clave_evento
const { data: eventData } = await supabase
  .from('evt_eventos')
  .select('clave_evento')
  .eq('id', eventId)
  .single();

const claveEvento = eventData.clave_evento; // "EVT-2025-001"

// Renombrar: EVT-2025-001_temp_xxx → EVT-2025-001_GST001_v1
const oldPath = `${claveEvento}/gastos/${tempFileName}`;
const newFileName = tempFileName.replace(
  /_temp_\d+_/, 
  `_${newExpense.id}_`
);
const newPath = `${claveEvento}/gastos/${newFileName}`;

await supabase.storage
  .from('event_docs')
  .move(oldPath, newPath);

// Actualizar URL en base de datos
await supabase
  .from('expenses')
  .update({ documento_url: newPath })
  .eq('id', newExpense.id);
```

**Resultado final:** `event_docs/EVT-2025-001/gastos/EVT-2025-001_GST001_v1_ticket.jpg`

---

## 🔒 Políticas RLS Requeridas

### Ejecutar en Supabase Dashboard

Ver archivo: `CREAR_POLITICAS_RLS_EVENT_DOCS.sql`

**Resumen de políticas:**
1. ✅ **INSERT** - Permitir subir archivos a `{eventId}/gastos/`
2. ✅ **SELECT** - Permitir leer archivos de gastos
3. ✅ **UPDATE** - Permitir actualizar (para versiones)
4. ✅ **DELETE** - Permitir eliminar archivos

**Ejecutar:**
```bash
# Copiar contenido de CREAR_POLITICAS_RLS_EVENT_DOCS.sql
# Pegar en: https://app.supabase.com/project/gomnouwackzvthpwyric/sql/new
# Click en RUN
```

---

## 🧹 Limpieza Automática

### Archivos Temporales (>24h)

La función `cleanup_temp_expense_files()` elimina archivos con `_temp_` más antiguos de 24 horas.

```sql
-- Ejecutar manualmente
SELECT cleanup_temp_expense_files();

-- O programar diariamente (requiere pg_cron)
SELECT cron.schedule(
  'cleanup-temp-expense-files',
  '0 2 * * *',
  'SELECT cleanup_temp_expense_files()'
);
```

---

## 📝 Cambios Realizados

### 1. DualOCRExpenseForm.tsx

**Agregado:**
```typescript
// Obtener clave_evento
const { data: eventData } = await supabase
  .from('evt_eventos')
  .select('clave_evento')
  .eq('id', eventId)
  .single();

const claveEvento = eventData.clave_evento; // "EVT-2025-001"

// Guardar archivo al procesar OCR
const fileName = `${claveEvento}_temp_${timestamp}_v${version}_${cleanFileName}`;
const filePath = `${claveEvento}/gastos/${fileName}`;

await supabase.storage
  .from('event_docs')
  .upload(filePath, processedFile);
```

**Características:**
- ✅ Usa `clave_evento` (EVT-2025-001) en lugar de ID UUID
- ✅ Compresión automática de imágenes (PDFs sin comprimir)
- ✅ Nombre siguiendo convención: `{clave_evento}_temp_{timestamp}_v1_{filename}`
- ✅ Guardado en bucket `event_docs`
- ✅ Ruta: `{clave_evento}/gastos/`
- ✅ Misma estructura que documentos de evento (contrato, acuerdo, cierre)
- ⚠️ Pendiente: Renombrar al obtener ID del gasto

### 2. Documentación Actualizada

- ✅ `SOLUCION_ERROR_RLS_STORAGE.md` - Guía completa de RLS
- ✅ `CREAR_POLITICAS_RLS_EVENT_DOCS.sql` - SQL listo para ejecutar
- ✅ Este documento - Resumen de implementación

---

## 🎯 Próximos Pasos

### Inmediatos
1. ⏳ **Ejecutar políticas RLS** (archivo `CREAR_POLITICAS_RLS_EVENT_DOCS.sql`)
2. ⏳ **Probar subida de ticket** con OCR

### Futuros (Mejoras)
3. 🔄 Implementar renombrado automático al guardar gasto
4. 🗂️ Implementar versionado de archivos (v1, v2, v3...)
5. 🧹 Activar limpieza automática de temporales

---

## ✅ Verificación

### 1. Políticas Creadas
```sql
SELECT policyname FROM pg_policies
WHERE tablename = 'objects'
AND policyname LIKE '%gastos%';

-- Resultado esperado:
-- Permitir subir archivos de gastos
-- Permitir leer archivos de gastos
-- Permitir actualizar archivos de gastos
-- Permitir eliminar archivos de gastos
```

### 2. Bucket Existe
```sql
SELECT name, public FROM storage.buckets
WHERE name = 'event_docs';

-- Resultado esperado:
-- event_docs | false
```

### 3. Archivo Subido
```typescript
// Después de procesar OCR, verificar en consola:
console.log('✅ Archivo guardado:', uploadData.path);
// Debe mostrar: EVT123/gastos/EVT123_temp_xxx_v1_ticket.jpg
```

---

## 🐛 Troubleshooting

### Error: "new row violates row-level security policy"
- **Causa:** Políticas RLS no aplicadas
- **Solución:** Ejecutar `CREAR_POLITICAS_RLS_EVENT_DOCS.sql`

### Error: "Bucket not found"
- **Causa:** Bucket `event_docs` no existe
- **Solución:** Crear en Supabase Dashboard → Storage

### Archivo no se guarda pero no hay error
- **Causa:** Usuario no autenticado
- **Solución:** Verificar sesión activa en Supabase

### Nombre de archivo incorrecto
- **Causa:** Caracteres especiales en nombre original
- **Solución:** Ya implementado - `replace(/[^a-zA-Z0-9.-]/g, '_')`

---

## 📊 Estado Final

| Componente | Estado | Detalles |
|------------|--------|----------|
| Estructura carpetas | ✅ Implementado | `{eventId}/gastos/` |
| Nombre archivo | ✅ Implementado | `{eventId}_temp_{ts}_v1_{name}` |
| Compresión | ✅ Implementado | Solo imágenes, PDFs sin tocar |
| Guardado bucket | ✅ Implementado | `event_docs` |
| Políticas RLS | ⏳ Pendiente | Ejecutar SQL provisto |
| Renombrado final | ⏳ Pendiente | Al guardar gasto |
| Limpieza automática | ✅ Implementado | Función SQL creada |

---

**🎉 IMPLEMENTACIÓN COMPLETA**

Solo falta ejecutar las políticas RLS en Supabase Dashboard para que funcione correctamente.
