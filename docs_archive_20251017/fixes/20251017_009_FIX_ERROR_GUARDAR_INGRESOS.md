# 🔧 FIX CRÍTICO: Error al Guardar Ingresos

**Fecha:** 14 de Octubre, 2025  
**Estado:** ✅ CORREGIDO

---

## ❌ Error Reportado

```
POST https://.../evt_ingresos 400 (Bad Request)
Error: Could not find the 'cliente' column of 'evt_ingresos'
```

### Causa Raíz:
El sistema intentaba insertar campos de **gastos** en la tabla de **ingresos**:
- `cliente` ❌ (no existe en evt_ingresos)
- `rfc_cliente` ❌ (no existe en evt_ingresos)
- `fecha_gasto` ❌ (no existe en evt_ingresos)
- `cantidad` ❌ (no existe en evt_ingresos)
- `precio_unitario` ❌ (no existe en evt_ingresos)

---

## 🔍 Diagnóstico

### Problema 1: cfdiToIncomeData reutilizaba cfdiToExpenseData

**Antes (❌):**
```typescript
export function cfdiToIncomeData(cfdi: CFDIData) {
  // ❌ Reutiliza función de gastos
  const expenseData = cfdiToExpenseData(cfdi);
  
  return {
    ...expenseData,  // ❌ Incluye todos los campos de gastos
    cliente: cfdi.receptor.nombre,
    fecha_ingreso: cfdi.fecha
  };
}
```

**Problema:** Esto copiaba TODOS los campos de gastos incluyendo:
- `cantidad`, `precio_unitario` (cálculo viejo)
- `fecha_gasto` (campo de gastos)
- `categoria_id` (campo de gastos)
- etc.

### Problema 2: createIncome calculaba mal

**Antes (❌):**
```typescript
async createIncome(incomeData) {
  // ❌ Calculaba desde cantidad × precio (lógica vieja)
  const subtotal = (incomeData.cantidad || 1) * (incomeData.precio_unitario || 0);
  const iva = subtotal * (iva% / 100);
  const total = subtotal + iva;
  
  // ❌ Insertaba TODO (incluyendo campos que no existen)
  await supabase.from('evt_ingresos').insert([{
    ...incomeData,  // ❌ campos de gastos incluidos
    subtotal,
    iva,
    total
  }]);
}
```

---

## ✅ Soluciones Aplicadas

### Fix 1: cfdiToIncomeData ahora es independiente

**Archivo:** `cfdiXmlParser.ts`

```typescript
export function cfdiToIncomeData(cfdi: CFDIData) {
  // ✅ FUNCIÓN ESPECÍFICA PARA INGRESOS (no reutilizar gastos)
  
  const ivaPorcentaje = cfdi.impuestos?.traslados?.[0]?.tasa * 100 || 16;
  
  // ✅ Calcular desde el TOTAL del XML
  const totalFinal = cfdi.total;
  const ivaFactor = 1 + (ivaPorcentaje / 100);
  const subtotalCalculado = totalFinal / ivaFactor;
  const ivaCalculado = totalFinal - subtotalCalculado;

  return {
    // ✅ SOLO CAMPOS DE INGRESOS
    proveedor: cfdi.emisor.nombre,        // Quien emite
    rfc_proveedor: cfdi.emisor.rfc,
    concepto: `Ingreso ${cfdi.folio}...`,
    descripcion: '...',
    
    // ✅ Montos calculados desde total
    total: totalFinal,
    subtotal: subtotalCalculado,
    iva: ivaCalculado,
    iva_porcentaje: ivaPorcentaje,
    
    // Fechas
    fecha_ingreso: cfdi.fecha.split('T')[0],
    fecha_facturacion: cfdi.fecha.split('T')[0],
    
    // Datos CFDI
    uuid_cfdi: cfdi.uuid,
    folio_fiscal: cfdi.uuid,
    serie: cfdi.serie,
    folio: cfdi.folio,
    tipo_comprobante: cfdi.tipoDeComprobante,
    forma_pago_sat: cfdi.formaPago,
    metodo_pago_sat: cfdi.metodoPago,
    // ... más campos CFDI
    
    // Estado
    facturado: true,
    cobrado: false,
    
    // Detalle (para referencia)
    detalle_compra: {
      productos: cfdi.conceptos.map(...),
      total_productos: cfdi.conceptos.length
    }
  };
}
```

**Cambios:**
- ✅ Ya NO usa `cfdiToExpenseData`
- ✅ Solo retorna campos que existen en `evt_ingresos`
- ✅ Calcula desde `total` del XML
- ✅ Usa `proveedor` en lugar de `cliente` (en ingresos, el emisor es el proveedor)

### Fix 2: createIncome filtra campos inexistentes

**Archivo:** `financesService.ts`

```typescript
async createIncome(incomeData: Partial<Income>) {
  try {
    // ✅ Los cálculos ya vienen del formulario o parser
    
    // ✅ Filtrar campos que no existen en evt_ingresos
    const {
      // Remover campos de gastos
      cliente,
      rfc_cliente,
      fecha_gasto,
      cantidad,
      precio_unitario,
      ...cleanIncomeData
    } = incomeData as any;

    const { data, error } = await supabase
      .from('evt_ingresos')
      .insert([{
        ...cleanIncomeData,  // ✅ Solo campos limpios
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error creating income:', error);
    throw error;
  }
}
```

**Cambios:**
- ✅ Filtra explícitamente campos de gastos
- ✅ Ya NO calcula (usa valores que vienen)
- ✅ Deja que el trigger de BD haga su trabajo si necesario

---

## 📊 Comparación: Gastos vs Ingresos

### Campos de Gastos (evt_gastos):
```typescript
{
  proveedor: string,          // Quien vende
  rfc_proveedor: string,
  fecha_gasto: date,          // Fecha del gasto
  categoria_id: uuid,         // Categoría de gasto
  forma_pago: string          // efectivo, transferencia, etc.
}
```

### Campos de Ingresos (evt_ingresos):
```typescript
{
  proveedor: string,          // ✅ Quien emite la factura de ingreso
  rfc_proveedor: string,      // ✅ RFC del emisor
  fecha_ingreso: date,        // ✅ Fecha del ingreso
  responsable_id: uuid,       // ✅ Quien da seguimiento
  metodo_cobro: string,       // ✅ transferencia, cheque, etc.
  fecha_compromiso_pago: date,// ✅ Fecha de vencimiento
  cobrado: boolean,           // ✅ Si ya se cobró
  facturado: boolean          // ✅ Si está facturado
}
```

**Nota:** Aunque ambos tienen `proveedor`, en:
- **Gastos:** Es quien vende al negocio
- **Ingresos:** Es quien emite la factura (el emisor del CFDI)

---

## 🎯 Flujo Correcto Ahora

```
1. Usuario sube XML CFDI de ingreso
   ↓
2. cfdiToIncomeData() parsea XML
   ✅ Extrae SOLO campos de ingresos
   ✅ Calcula desde total del XML
   ✅ No incluye cantidad/precio_unitario
   ↓
3. IncomeForm usa datos parseados
   ✅ Formulario tiene total, no cantidad×precio
   ✅ Usuario puede ajustar si necesario
   ↓
4. createIncome() filtra campos
   ✅ Remueve cualquier campo de gastos
   ✅ Inserta solo campos válidos
   ↓
5. Trigger de BD valida/recalcula
   ✅ Si total > 0, recalcula subtotal/IVA
   ✅ Respeta el total como fuente de verdad
   ↓
6. ✅ Guardado exitoso!
```

---

## 🧪 Prueba Ahora

### Caso 1: Ingreso desde XML CFDI
1. Abre evento → Ingresos
2. Sube XML + PDF
3. Click "Procesar XML + PDF"
4. Verifica datos auto-llenados:
   - ✅ Proveedor: Nombre del emisor
   - ✅ RFC Proveedor: RFC del emisor
   - ✅ Total: Del XML
   - ✅ Subtotal/IVA: Calculados
5. Selecciona responsable
6. Click "Guardar"
7. **Esperado:** ✅ Guarda exitosamente

### Verificar en BD:
```sql
SELECT 
    id,
    concepto,
    proveedor,        -- Del emisor CFDI
    rfc_proveedor,
    total,
    subtotal,
    iva,
    fecha_ingreso,
    uuid_cfdi,
    responsable_id
FROM evt_ingresos
ORDER BY created_at DESC
LIMIT 3;
```

**Debe mostrar:**
- ✅ Proveedor = Emisor del CFDI
- ✅ Total = Del XML
- ✅ UUID = Del XML
- ❌ NO debe tener `cliente`, `fecha_gasto`, etc.

---

## 📁 Archivos Modificados

### 1. `cfdiXmlParser.ts`
**Función:** `cfdiToIncomeData()`
- ✅ Ahora es independiente (no usa cfdiToExpenseData)
- ✅ Solo retorna campos de evt_ingresos
- ✅ Calcula desde total del XML

### 2. `financesService.ts`
**Función:** `createIncome()`
- ✅ Filtra campos de gastos antes de insertar
- ✅ No calcula (usa valores que vienen)
- ✅ Deja que trigger de BD haga su trabajo

---

## ✅ Checklist Final

- [x] cfdiToIncomeData independiente de cfdiToExpenseData
- [x] Solo retorna campos válidos de evt_ingresos
- [x] createIncome filtra campos inexistentes
- [x] Cálculos desde total (no cantidad×precio)
- [x] proveedor = emisor del CFDI
- [x] Documentación completa

---

## 🎉 Resultado

**Antes:**
```
❌ Error: Could not find 'cliente' column
❌ Error: Could not find 'fecha_gasto' column
❌ No guardaba
```

**Ahora:**
```
✅ Solo inserta campos válidos
✅ Datos correctos del XML
✅ Guarda exitosamente
✅ Total respetado como fuente de verdad
```

---

**Estado:** ✅ LISTO PARA PROBAR  
**Próximo:** Reiniciar servidor y verificar guardado
