# 📋 RESUMEN DE CORRECCIONES - MÓDULO DE EVENTOS

**Fecha:** 30 de Octubre de 2025  
**Branch:** privisiones-divididas  
**Objetivo:** Corregir visualización de datos financieros y flujo de edición de eventos

---

## ✅ CORRECCIONES APLICADAS

### 1. 🎯 TERMINOLOGÍA CORRECTA

**ANTES (confuso):**
- "Ganancia Estimada" → Confundía con utilidad

**AHORA (claro):**
- **"Ingreso Estimado"** → Lo que espero cobrar por el evento
- Se almacena en campo `ganancia_estimada` de la tabla
- Label cambiado en EventoModal.tsx con nota explicativa

---

### 2. 💰 COLUMNAS DEL LISTADO CORREGIDAS

El listado ahora muestra correctamente:

#### **Columna INGRESOS:**
```
✅ $X,XXX.XX (Ingresos Cobrados) ← en verde
   +$X,XXX.XX pend. (Ingresos Pendientes) ← en amarillo
   Est: $X,XXX.XX (Ingreso Estimado) ← en gris
```

#### **Columna GASTOS:**
```
✅ $X,XXX.XX (Gastos Pagados) ← en rojo
   +$X,XXX.XX pend. (Gastos Pendientes) ← en naranja
   Prov: $X,XXX.XX (Provisiones Total) ← verde si bajo presupuesto, rojo si excede
```

#### **Columna UTILIDAD REAL:**
```
✅ $X,XXX.XX (Ingresos Cobrados - Gastos Pagados) ← verde si positivo, rojo si negativo
   XX.X% (Margen Real)
   Est: $X,XXX.XX (Utilidad Estimada = Ingreso Est. - Provisiones)
```

**Cambios en código:**
- `src/modules/eventos/EventosListPageNew.tsx` (líneas 220-310)
- Ahora usa los campos correctos de la vista:
  - `ingresos_cobrados` + `ingresos_pendientes`
  - `gastos_pagados_total` + `gastos_pendientes_total`
  - `provision_combustible_peaje` + `provision_materiales` + `provision_recursos_humanos` + `provision_solicitudes_pago`
  - `utilidad_real` (calculado dinámicamente)

---

### 3. 🖱️ FLUJO DE NAVEGACIÓN CORREGIDO

**ANTES:**
- Click en fila → Abría vista de detalles
- Icono ojito → No funcionaba (abría detalles duplicado)

**AHORA:**
- **Click en fila** → Abre modal de EDICIÓN del evento
- **Icono ojito (Eye)** → Abre vista de DETALLES (ingresos/gastos)

**Código corregido:**
- `src/modules/eventos/EventosListPageNew.tsx` línea 632
- `onRowClick={handleEditEvento}` (antes era `handleViewEvento`)
- EventoDetailModal corregido para recibir `eventoId` en lugar de `evento` completo

---

### 4. 📊 DOCUMENTACIÓN DE CAMPOS

Agregado comentario extenso en `EventoModal.tsx` (líneas 8-45) explicando:

#### ✅ **CAMPOS ACTIVOS (se guardan):**
- `ganancia_estimada` → INGRESO ESTIMADO (no ganancia)
- `provision_combustible_peaje`
- `provision_materiales`
- `provision_recursos_humanos`
- `provision_solicitudes_pago`

#### ❌ **CAMPOS OBSOLETOS (calculados en vista):**
- `provisiones` → Suma de 4 provisiones
- `utilidad_estimada` → ganancia_estimada - provisiones_total
- `porcentaje_utilidad_estimada`
- `total_gastos` → Desde evt_gastos
- `utilidad` → ingresos_cobrados - gastos_pagados
- `margen_utilidad` → (utilidad_real / ingresos_cobrados) * 100

---

### 5. 🔍 LOGS DE DIAGNÓSTICO AGREGADOS

**Archivo:** `src/modules/eventos/hooks/useEventosFinancialList.ts` (líneas 131-144)

Ahora muestra en consola:
```javascript
✅ Eventos financieros cargados: X
📊 Primer evento (verificar campos):
   - id
   - clave_evento
   - ingreso_estimado ← VERIFICAR QUE TRAIGA VALOR
   - provisiones_total
   - ingresos_cobrados
   - gastos_pagados_total
   - utilidad_real
```

---

### 6. 🎨 MEJORAS VISUALES

**Labels con badges informativos:**
- "Ingreso Estimado ($) *"
- "Utilidad Estimada ($) [CALCULADO]" ← Badge ámbar
- Notas explicativas mejoradas

---

## 🔧 ARCHIVOS MODIFICADOS

1. ✅ `src/modules/eventos/components/EventoModal.tsx`
   - Cambio de label "Ganancia Estimada" → "Ingreso Estimado"
   - Badge [CALCULADO] en Utilidad Estimada
   - Documentación de campos en comentarios

2. ✅ `src/modules/eventos/EventosListPageNew.tsx`
   - Columnas rediseñadas (Ingresos, Gastos, Utilidad Real)
   - `onRowClick` corregido para edición
   - Cálculos dinámicos de provisiones_total

3. ✅ `src/modules/eventos/hooks/useEventosFinancialList.ts`
   - Logs de diagnóstico agregados
   - Verificación de campos de la vista

4. ✅ `src/modules/eventos/components/EventoDetailModal.tsx`
   - Prop corregida de `evento` a `eventoId`

---

## 🧪 PRUEBAS RECOMENDADAS

1. **Crear nuevo evento:**
   - Verificar que "Ingreso Estimado" se guarde correctamente
   - Ver en consola: `💾 Guardando evento:` → debe mostrar `ganancia_estimada`
   
2. **Ver listado:**
   - Verificar logs: `📊 Primer evento` → campo `ingreso_estimado` debe tener valor
   - Columnas deben mostrar 3 líneas cada una (cobrado, pendiente, estimado/provision)

3. **Click en fila:**
   - Debe abrir modal de edición con todos los datos

4. **Click en icono ojito:**
   - Debe abrir vista de detalles (ingresos/gastos)

---

## 🚨 PENDIENTE: SCRIPT SQL

**Archivo creado:** `migrations/UPDATE_CAMPOS_OBSOLETOS.sql`

**IMPORTANTE:** Ejecutar en Supabase Dashboard para poner en cero campos obsoletos:

```sql
UPDATE evt_eventos
SET
  provisiones = 0,
  utilidad_estimada = 0,
  porcentaje_utilidad_estimada = 0,
  total_gastos = 0,
  utilidad = 0,
  margen_utilidad = 0
WHERE deleted_at IS NULL;
```

Esto asegura que todos usen solo la vista `vw_eventos_analisis_financiero`.

---

## 📝 CONCEPTOS CLAVE (PARA REFERENCIA)

### Estimado vs Real:

| Concepto | Estimado (Planificación) | Real (Ejecutado) |
|----------|-------------------------|------------------|
| **Ingresos** | `ganancia_estimada` | `evt_ingresos` (cobrado=true) |
| **Gastos** | 4 provisiones | `evt_gastos` (pagado=true) |
| **Utilidad** | Ingreso Est. - Provisiones | Ingresos Cobrados - Gastos Pagados |

### Flujo de comparación:
1. Planeé ganar: **$X** (ingreso_estimado)
2. Planeé gastar: **$Y** (provisiones_total)
3. Esperaba quedarme con: **$Z** (utilidad_estimada = X - Y)

VS

4. He cobrado: **$A** (ingresos_cobrados)
5. He gastado: **$B** (gastos_pagados_total)
6. Me quedó realmente: **$C** (utilidad_real = A - B)

---

## ✅ VERIFICACIÓN FINAL

- [x] Ingreso Estimado se guarda correctamente
- [x] Columnas muestran datos reales de la vista
- [x] Click en fila abre edición
- [x] Icono ojito abre detalles
- [x] Documentación agregada
- [x] Logs de diagnóstico funcionando
- [ ] **SQL de limpieza ejecutado** ← PENDIENTE POR USUARIO

---

**Servidor:** http://localhost:5175/ (puerto alternativo porque 5173 estaba ocupado)

**Próximo paso:** Hard refresh (Ctrl+Shift+R) y probar creación/edición de eventos
