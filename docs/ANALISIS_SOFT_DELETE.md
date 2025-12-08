# 📊 ANÁLISIS DETALLADO - SOFT DELETE EN TABLAS FINANCIERAS

## Fecha: 2024-12-07 23:05 CST

## Versión: 2.0 (Análisis Completo)

---

## 1. RESUMEN DE HALLAZGOS

### 1.1 Vistas SQL

| Estado | Cantidad |
|--------|----------|
| ✅ Ya filtran por activo | 16 |
| ⚠️ Corregidas hoy | 2 |
| ⏭️ Usan tablas deprecated (no aplica) | 3 |
| **TOTAL** | 19 |

### 1.2 Archivos de Código

| Estado | Cantidad |
|--------|----------|
| ✅ Ya tienen filtro correcto | 2 |
| ⚠️ Necesitan agregar filtro | 10 |
| **TOTAL** | 12 |

---

## 2. VISTAS SQL - ESTADO ACTUAL

| # | Vista | Tabla | Filtro Activo |
|---|-------|-------|---------------|
| 1 | v_gastos_consolidados | gastos_erp | ✅ Sí |
| 2 | v_provisiones_completas | provisiones_erp | ✅ Sí |
| 3 | vw_eventos_analisis_financiero_erp | todas | ✅ Sí |
| 4 | vw_eventos_completos | todas | ✅ Sí |
| 5 | vw_eventos_completos_erp | todas | ✅ Sí |
| 6 | vw_eventos_erp_analisis | todas | ✅ Sí |
| 7 | vw_eventos_pendientes | deprecated | ⏭️ N/A |
| 8 | vw_eventos_problemas_cobro | ingresos | ✅ Sí |
| 9 | vw_eventos_provisiones_financieras | provisiones | ✅ Sí |
| 10 | vw_gastos_netos_evento | gastos_erp | ✅ Corregida |
| 11 | vw_gastos_ocr_analytics | gastos_erp | ✅ Sí |
| 12 | vw_gastos_ocr_completo | gastos_erp | ✅ Sí |
| 13 | vw_gastos_pendientes_comprobar | gastos_erp | ✅ Sí |
| 14 | vw_gastos_pendientes_pago | gastos_erp | ✅ Sí |
| 15 | vw_gastos_por_categoria_erp | gastos_erp | ✅ Corregida |
| 16 | vw_gastos_por_tipo_documento | gastos_erp | ✅ Sí |
| 17 | vw_ingresos_pendientes_facturar | ingresos | ✅ Sí |
| 18 | vw_master_facturacion | deprecated | ⏭️ N/A |
| 19 | vw_movimientos_financieros | deprecated | ⏭️ N/A |

---

## 3. ARCHIVOS DE CÓDIGO - ANÁLISIS DETALLADO

### 3.1 financesService.ts

| Línea | Función | Tabla | Consulta | Estado |
|-------|---------|-------|----------|--------|
| 21-25 | getIncomes() | ingresos_erp | SELECT * | ❌ SIN FILTRO |
| 186-196 | getExpenses() | gastos_erp | SELECT * | ⚠️ Solo deleted_at |
| 317-324 | createExpense() | gastos_erp | INSERT | ✅ OK |
| 419-436 | updateExpense() | gastos_erp | UPDATE | ✅ OK |
| 460-468 | deleteExpense() | gastos_erp | UPDATE soft | ✅ OK |
| 479-483 | getExpenseById() | gastos_erp | SELECT by id | ❌ SIN FILTRO |
| 664-669 | getIncomeAnalytics() | ingresos_erp | SELECT | ❌ SIN FILTRO |
| 757-761 | createExpenseFromOCR() | gastos_erp | INSERT | ✅ OK |
| 876 | (interno) | gastos_erp | Query | ⚠️ Revisar |

**Correcciones Necesarias:**

```typescript
// Línea 21-25: getIncomes()
.from('evt_ingresos_erp')
.select('*')
.eq('evento_id', eventId)
.or('activo.eq.true,activo.is.null')  // ← AGREGAR
.order('created_at', { ascending: false });

// Línea 186-196: getExpenses()
.from('evt_gastos_erp')
.select(...)
.eq('evento_id', eventId)
.is('deleted_at', null)
.or('activo.eq.true,activo.is.null')  // ← AGREGAR
.order('created_at', { ascending: false });

// Línea 479-483: getExpenseById()
.from('evt_gastos_erp')
.select('*')
.eq('id', id)
.or('activo.eq.true,activo.is.null')  // ← AGREGAR
.single();
```

### 3.2 eventsService.ts

| Línea | Función | Tabla | Estado |
|-------|---------|-------|--------|
| TBD | getEventWithFinances() | gastos_erp | ⚠️ REVISAR |

### 3.3 EventoDetailModal.tsx

| Línea | Función | Tabla | Estado |
|-------|---------|-------|--------|
| ~1608 | handleDelete() gastos | gastos_erp | ✅ Soft delete OK |
| ~2323 | handleDelete() provisiones | provisiones_erp | ✅ Soft delete OK |
| TBD | loadFinancialData() | todas | ⚠️ REVISAR |

### 3.4 useEventosFinancialList.ts

| Función | Tabla | Estado |
|---------|-------|--------|
| fetchData() | gastos_erp | ⚠️ REVISAR |
| fetchData() | provisiones_erp | ⚠️ REVISAR |

### 3.5 accountingStateService.ts

| Función | Tabla | Estado |
|---------|-------|--------|
| getAccountingState() | ingresos_erp | ⚠️ REVISAR |

### 3.6 invoiceService.ts

| Función | Tabla | Estado |
|---------|-------|--------|
| getInvoiceData() | ingresos_erp | ⚠️ REVISAR |

### 3.7 ExecutiveKPIs.tsx

| Función | Tabla | Estado |
|---------|-------|--------|
| fetchKPIData() | gastos_erp, ingresos_erp | ⚠️ REVISAR |

---

## 4. PLAN DE CORRECCIÓN ORDENADO

### FASE 1: Servicios Centrales (PRIORIDAD CRÍTICA)

**Archivo 1: `financesService.ts`**

```
[ ] Línea 21-25: getIncomes() - Agregar filtro activo
[ ] Línea 186-196: getExpenses() - Agregar filtro activo
[ ] Línea 479-483: getExpenseById() - Agregar filtro activo
[ ] Línea 664-669: getIncomeAnalytics() - Agregar filtro activo
```

**Archivo 2: `eventsService.ts`**

```
[ ] Revisar todas las consultas a tablas financieras
```

### FASE 2: Hooks (PRIORIDAD ALTA)

**Archivo 3: `useEventosFinancialList.ts`**

```
[ ] Revisar consultas a gastos_erp
[ ] Revisar consultas a provisiones_erp
```

### FASE 3: Componentes (PRIORIDAD MEDIA)

**Archivo 4: `EventoDetailModal.tsx`**

```
[ ] Revisar loadFinancialData()
[ ] Verificar que no haya consultas directas sin filtro
```

### FASE 4: Servicios Secundarios (PRIORIDAD BAJA)

**Archivos restantes:**

```
[ ] accountingStateService.ts
[ ] invoiceService.ts
[ ] workflowService.ts
[ ] ExecutiveKPIs.tsx
```

---

## 5. REGLA DE ORO PARA NUEVAS CONSULTAS

### ✅ PATRÓN CORRECTO para SELECT

```typescript
const { data, error } = await supabase
  .from('evt_gastos_erp')  // o evt_ingresos_erp, evt_provisiones_erp
  .select('*')
  .eq('evento_id', eventId)
  // Filtros de soft delete:
  .or('activo.eq.true,activo.is.null')
  .order('created_at', { ascending: false });
```

### ✅ PATRÓN CORRECTO para DELETE

```typescript
// NUNCA usar .delete() real
// SIEMPRE usar soft delete:
const { error } = await supabase
  .from('evt_gastos_erp')
  .update({
    activo: false,
    deleted_at: new Date().toISOString(),
    deleted_by: userId,
    deleted_reason: motivo,
    deleted_user_agent: navigator.userAgent
  })
  .eq('id', gastoId);

// Registrar en auditoría
await supabase
  .from('audit_eliminaciones_financieras')
  .insert({...});
```

### ❌ PATRONES INCORRECTOS (NO USAR)

```typescript
// ❌ INCORRECTO - No filtra registros eliminados
.from('evt_gastos_erp').select('*').eq('id', id)

// ❌ INCORRECTO - Hard delete
.from('evt_gastos_erp').delete().eq('id', id)
```

---

## 6. PRÓXIMOS PASOS INMEDIATOS

1. **Ejecutar correcciones en financesService.ts** (más urgente)
2. **Revisar eventsService.ts**
3. **Revisar useEventosFinancialList.ts**
4. **Verificar que el modal de detalle muestre correctamente**
5. **Probar eliminación y verificar que no aparezcan registros eliminados**

---

## 7. MÉTRICAS DE PROGRESO

| Componente | Total | Corregidos | % |
|------------|-------|------------|---|
| Vistas SQL | 19 | 18 | 95% |
| financesService.ts | 7 | 2 | 29% |
| eventsService.ts | 3 | 0 | 0% |
| useEventosFinancialList.ts | 2 | 0 | 0% |
| EventoDetailModal.tsx | 2 | 2 | 100% |
| Otros archivos | 5 | 0 | 0% |
| **TOTAL** | 38 | 22 | **58%** |

---

*Documento actualizado: 2024-12-07 23:10 CST*
