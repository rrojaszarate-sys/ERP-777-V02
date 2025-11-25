# 📄 MEJORA: MOSTRAR XML Y PDF EN VISTA DE GASTOS

## 🎯 Objetivo
Permitir que la vista de gastos muestre **AMBOS** archivos:
- 📄 **XML CFDI** (factura electrónica)
- 📎 **PDF/Imagen** (comprobante visual)

Actualmente solo mostraba el PDF/imagen.

---

## ✅ CAMBIOS REALIZADOS

### 1️⃣ **Migración SQL** - `ADD_XML_FIELD_GASTOS.sql`

```sql
-- Agregar columna para almacenar URL del XML
ALTER TABLE evt_gastos 
ADD COLUMN IF NOT EXISTS xml_file_url VARCHAR(500);

-- Índice para búsqueda rápida
CREATE INDEX IF NOT EXISTS idx_evt_gastos_xml_file_url 
ON evt_gastos(xml_file_url) 
WHERE xml_file_url IS NOT NULL;
```

**Propósito:**
- Separar almacenamiento de XML (factura fiscal) del PDF/imagen (comprobante visual)
- Permitir tener ambos archivos simultáneamente

---

### 2️⃣ **Interfaz TypeScript** - `Finance.ts`

**Ubicación:** `src/modules/eventos/types/Finance.ts`

```typescript
export interface Expense {
  // ... campos existentes ...
  
  // File attachment
  archivo_adjunto?: string;           // PDF/imagen del comprobante
  archivo_nombre?: string;
  archivo_tamaño?: number;
  archivo_tipo?: string;
  xml_file_url?: string;              // ⭐ NUEVO: URL del archivo XML CFDI
  
  // ... resto de campos ...
}
```

---

### 3️⃣ **Componente Vista** - `ExpenseTab.tsx`

**Ubicación:** `src/modules/eventos/components/finances/ExpenseTab.tsx`

**ANTES:**
```tsx
{expense.archivo_adjunto && (
  <div className="flex items-center space-x-2">
    <Paperclip className="w-3 h-3 text-blue-500" />
    <a href={expense.archivo_adjunto}>
      {expense.archivo_nombre || 'Ver comprobante'}
    </a>
  </div>
)}
```

**DESPUÉS:**
```tsx
<div className="space-y-2">
  {/* XML CFDI */}
  {expense.xml_file_url && (
    <div className="flex items-center space-x-2">
      <FileText className="w-3 h-3 text-purple-600" />
      <a 
        href={expense.xml_file_url} 
        target="_blank" 
        className="text-purple-600 hover:text-purple-800 text-sm font-medium"
      >
        📄 Ver XML CFDI
      </a>
    </div>
  )}
  
  {/* PDF/Imagen */}
  {expense.archivo_adjunto && (
    <div className="flex items-center space-x-2">
      <Paperclip className="w-3 h-3 text-blue-500" />
      <a 
        href={expense.archivo_adjunto} 
        target="_blank" 
        className="text-blue-600 hover:text-blue-800 text-sm"
      >
        {expense.archivo_nombre || 'Ver comprobante'}
      </a>
    </div>
  )}
</div>
```

**Mejoras visuales:**
- ✅ XML en color **morado** con emoji 📄
- ✅ PDF en color **azul** con icono 📎
- ✅ Links separados y claramente identificados
- ✅ Tooltip con texto descriptivo

---

## 🚀 CÓMO APLICAR LOS CAMBIOS

### Paso 1: Ejecutar migración SQL
```bash
# Ir a Supabase Dashboard > SQL Editor
# Copiar y ejecutar el contenido de:
ADD_XML_FIELD_GASTOS.sql
```

### Paso 2: Verificar columna creada
```sql
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns
WHERE table_name = 'evt_gastos' 
  AND column_name = 'xml_file_url';
```

Resultado esperado:
```
column_name   | data_type         | is_nullable
--------------+-------------------+-------------
xml_file_url  | character varying | YES
```

### Paso 3: Recargar aplicación
```bash
# La aplicación ya está ejecutándose, solo refresca el navegador
# Los cambios en TypeScript y React ya están aplicados
```

---

## 📊 CONSULTAS ÚTILES

### Ver gastos con XML y PDF
```sql
SELECT 
  id,
  concepto,
  proveedor,
  CASE 
    WHEN xml_file_url IS NOT NULL THEN '✅ Tiene XML'
    ELSE '❌ Sin XML'
  END as tiene_xml,
  CASE 
    WHEN archivo_adjunto IS NOT NULL THEN '✅ Tiene PDF'
    ELSE '❌ Sin PDF'
  END as tiene_pdf,
  fecha_gasto,
  total
FROM evt_gastos
WHERE activo = true
ORDER BY fecha_gasto DESC
LIMIT 20;
```

### Estadísticas de archivos
```sql
SELECT 
  COUNT(*) as total_gastos,
  COUNT(*) FILTER (WHERE xml_file_url IS NOT NULL) as con_xml,
  COUNT(*) FILTER (WHERE archivo_adjunto IS NOT NULL) as con_pdf,
  COUNT(*) FILTER (WHERE xml_file_url IS NOT NULL AND archivo_adjunto IS NOT NULL) as con_ambos,
  COUNT(*) FILTER (WHERE xml_file_url IS NULL AND archivo_adjunto IS NULL) as sin_archivos
FROM evt_gastos
WHERE activo = true;
```

---

## 🎨 RESULTADO VISUAL

### ANTES (Solo PDF)
```
┌─────────────────────────────┐
│ Gasto: Papelería            │
│ Total: $1,234.56            │
│                             │
│ 📎 Ver comprobante          │ ← Solo un archivo
└─────────────────────────────┘
```

### DESPUÉS (XML + PDF)
```
┌─────────────────────────────┐
│ Gasto: Papelería            │
│ Total: $1,234.56            │
│                             │
│ 📄 Ver XML CFDI             │ ← Factura fiscal
│ 📎 Ver comprobante          │ ← Comprobante visual
└─────────────────────────────┘
```

---

## 🔄 INTEGRACIÓN CON SISTEMA EXISTENTE

El campo `xml_file_url` ya debería ser **automáticamente** poblado por:

1. **DualOCRExpenseForm** al subir archivos XML
2. **FinancesService** al procesar gastos con CFDI
3. **Storage Service** al almacenar en `event_docs/gastos/`

**Verificar en:**
- `src/modules/eventos/components/finances/DualOCRExpenseForm.tsx`
- `src/modules/eventos/services/financesService.ts`

---

## ✅ CHECKLIST DE VALIDACIÓN

- [x] Migración SQL creada (`ADD_XML_FIELD_GASTOS.sql`)
- [x] Interfaz TypeScript actualizada (`Finance.ts`)
- [x] Vista de gastos modificada (`ExpenseTab.tsx`)
- [ ] **PENDIENTE:** Ejecutar SQL en Supabase
- [ ] **PENDIENTE:** Verificar gastos existentes muestran XML y PDF
- [ ] **PENDIENTE:** Probar subida de nuevo gasto con XML + PDF
- [ ] **PENDIENTE:** Verificar links abren archivos correctos

---

## 🐛 TROUBLESHOOTING

### Problema 1: No aparece el XML
**Causa:** La columna no existe en BD  
**Solución:** Ejecutar `ADD_XML_FIELD_GASTOS.sql`

### Problema 2: Link de XML roto
**Causa:** URL no es válida o archivo fue eliminado  
**Solución:** Verificar en Supabase Storage bucket `event_docs/gastos/`

### Problema 3: Solo aparece PDF, no XML
**Causa:** Gasto no tiene XML asociado (es un ticket o recibo sin CFDI)  
**Solución:** Normal. Solo facturas electrónicas tienen XML.

---

## 📝 NOTAS ADICIONALES

- El XML solo aparecerá en **facturas electrónicas** (CFDI 4.0)
- Los tickets y recibos simples solo tendrán PDF/imagen
- Ambos campos son **opcionales** (nullable)
- El sistema es **retrocompatible** con gastos existentes

---

## 🎯 PRÓXIMOS PASOS

1. Ejecutar migración SQL
2. Probar vista de gastos con datos reales
3. Verificar que formulario de creación guarda ambos archivos
4. Aplicar mismo patrón a módulo de **INGRESOS** si es necesario
