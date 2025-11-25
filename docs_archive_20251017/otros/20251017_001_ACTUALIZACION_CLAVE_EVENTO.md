# ✅ Actualización Completada - Uso de clave_evento

## 🎯 Cambio Realizado

Se actualizó el sistema para usar **`clave_evento`** (formato `EVT-2025-001`) en lugar del ID UUID del evento, siguiendo la misma convención que los documentos de evento (contrato, acuerdo, cierre).

---

## 📁 Estructura Final

### Antes (Incorrecto)
```
event_docs/
└── abc123-def456-ghi789/         ← ID UUID
    └── gastos/
        └── abc123_temp_xxx_v1_ticket.jpg
```

### Después (Correcto)
```
event_docs/
└── EVT-2025-001/                 ← clave_evento
    ├── contrato/                 ← Documentos de evento existentes
    ├── acuerdo/
    ├── cierre/
    └── gastos/                   ← NUEVO - Documentos de gastos
        ├── EVT-2025-001_temp_1697xxx_v1_ticket.jpg      (temporal)
        └── EVT-2025-001_GST001_v1_ticket.jpg            (final)
```

---

## 🔧 Cambios en el Código

### DualOCRExpenseForm.tsx

**Agregado:**
```typescript
// Obtener clave_evento del evento
const { data: eventData, error: eventError } = await supabase
  .from('evt_eventos')
  .select('clave_evento')
  .eq('id', eventId)
  .single();

let claveEvento = eventId;

if (eventError || !eventData) {
  console.warn('⚠️ No se pudo obtener clave_evento:', eventError?.message);
} else {
  claveEvento = (eventData as any).clave_evento || eventId;
}

// Usar claveEvento en la ruta
const fileName = `${claveEvento}_temp_${timestamp}_v${version}_${cleanFileName}`;
const filePath = `${claveEvento}/gastos/${fileName}`;

await supabase.storage
  .from('event_docs')
  .upload(filePath, processedFile);
```

**Resultado:**
- ✅ Query a `evt_eventos` para obtener `clave_evento`
- ✅ Fallback a `eventId` si falla la consulta
- ✅ Usa `clave_evento` en nombre de archivo y ruta
- ✅ Consistente con `fileUploadService.ts` (documentos de evento)

---

## 📋 Archivos Actualizados

1. **DualOCRExpenseForm.tsx**
   - Query para obtener `clave_evento`
   - Uso de `clave_evento` en rutas y nombres

2. **IMPLEMENTACION_BUCKET_EVENT_DOCS.md**
   - Ejemplos actualizados con `EVT-2025-001`
   - Comparación con estructura de documentos de evento

3. **SOLUCION_ERROR_RLS_STORAGE.md**
   - Rutas actualizadas con `clave_evento`
   - Ejemplos de renombrado corregidos

4. **Este documento**
   - Resumen de cambios

---

## 🔄 Flujo Completo Actualizado

### 1. Usuario Sube Ticket
```typescript
// OCR procesa el archivo
// Sistema consulta: evt_eventos.clave_evento
// Resultado: "EVT-2025-001"
```

### 2. Guardado Temporal
```
Ruta: event_docs/EVT-2025-001/gastos/
Nombre: EVT-2025-001_temp_1697123456_v1_ticket.jpg
```

### 3. OCR Extrae Datos
- RFC: NAVB801231/69 ✅
- Total: 895 (corregido de 1895) ✅
- Productos: Lista con precios ✅
- Detalle: Campo `detalle_compra` ✅

### 4. Usuario Guarda Gasto
```sql
INSERT INTO expenses (evento_id, total, proveedor, ...)
RETURNING id; -- "GST001"
```

### 5. Renombrado Final (Pendiente)
```
Antes: EVT-2025-001_temp_1697123456_v1_ticket.jpg
Después: EVT-2025-001_GST001_v1_ticket.jpg
```

---

## ✅ Consistencia con Sistema Existente

### Documentos de Evento (fileUploadService.ts)
```typescript
// Ya usa clave_evento
const { data: eventData } = await supabase
  .from('evt_eventos')
  .select('clave_evento')
  .eq('id', eventId)
  .single();

const fileName = `${eventData.clave_evento}_${tipoDocumento}_V${version}_${cleanName}`;
// Resultado: EVT-2025-001_contrato_V1_contrato.pdf
```

### Documentos de Gastos (NUEVO)
```typescript
// Ahora también usa clave_evento
const { data: eventData } = await supabase
  .from('evt_eventos')
  .select('clave_evento')
  .eq('id', eventId)
  .single();

const fileName = `${claveEvento}_temp_${timestamp}_v${version}_${cleanFileName}`;
// Resultado: EVT-2025-001_temp_1697xxx_v1_ticket.jpg
```

**✅ Ambos usan la misma lógica y estructura**

---

## 🎯 Próximos Pasos

### Inmediato
1. ⏳ **Ejecutar políticas RLS** (`CREAR_POLITICAS_RLS_EVENT_DOCS.sql`)
2. ⏳ **Probar subida de ticket** con OCR

### Futuro
3. 🔄 Implementar renombrado al guardar gasto
4. 🗂️ Versionado de archivos (v1, v2, v3)
5. 🧹 Limpieza automática de temporales

---

## 📊 Estado Final

| Componente | Estado | Detalles |
|------------|--------|----------|
| clave_evento | ✅ Implementado | Query a evt_eventos |
| Estructura | ✅ Consistente | Igual que documentos de evento |
| Ruta bucket | ✅ Correcto | `{clave_evento}/gastos/` |
| Nombre archivo | ✅ Correcto | `{clave_evento}_temp_xxx_v1` |
| Fallback | ✅ Implementado | Usa eventId si falla |
| Políticas RLS | ⏳ Pendiente | Ejecutar SQL |

---

## 🔍 Verificación

### Logs Esperados
```
📁 Guardando en bucket event_docs: EVT-2025-001/gastos/EVT-2025-001_temp_1697123456_v1_ticket.jpg
✅ Archivo guardado en bucket: EVT-2025-001/gastos/EVT-2025-001_temp_1697123456_v1_ticket.jpg
```

### En Supabase Storage
```
Bucket: event_docs
└── EVT-2025-001/
    ├── contrato/
    │   └── EVT-2025-001_contrato_V1_contrato.pdf
    └── gastos/
        └── EVT-2025-001_temp_1697123456_v1_ticket.jpg
```

---

**🎉 IMPLEMENTACIÓN COMPLETA**

El sistema ahora usa `clave_evento` de forma consistente en todos los documentos del evento.
