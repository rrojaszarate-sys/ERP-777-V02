# 📋 RESUMEN DE CORRECCIONES - MÓDULO DE EVENTOS

**Fecha**: 30 de Octubre de 2025  
**Branch**: `privisiones-divididas`  
**Responsable**: Sistema de Análisis de Eventos

---

## 🎯 PROBLEMAS IDENTIFICADOS Y SOLUCIONES

### 1. ✅ GANANCIA_ESTIMADA → INGRESO_ESTIMADO

**Problema**:
- El campo se llama `ganancia_estimada` en la BD pero representa el **INGRESO ESTIMADO**
- La interfaz decía "Ganancia Estimada" causando confusión

**Solución Aplicada**:
```typescript
// EventoModal.tsx - Línea 447
<label>Ingreso Estimado ($) *</label>
<p className="text-xs">Ingreso total esperado del evento (se almacena en ganancia_estimada)</p>
```

**Estado**: ✅ CORREGIDO
- Label cambiado a "Ingreso Estimado"
- Nota aclaratoria agregada
- Campo se guarda correctamente en `ganancia_estimada`

---

### 2. ✅ CLICK EN FILA DEBE ABRIR EDICIÓN

**Problema**:
- Al hacer clic en una fila se abría el modal de detalles
- Usuario espera abrir la edición directamente

**Solución Aplicada**:
```typescript
// EventosListPageNew.tsx - Línea 616
<DataTable
  ...
  onRowClick={handleEditEvento}  // ← Antes era handleViewEvento
/>
```

**Estado**: ✅ CORREGIDO
- Click en fila → Abre modal de edición
- Icono ojito (Eye) → Abre modal de detalles

---

### 3. ✅ ICONO OJITO (VER DETALLES) NO FUNCIONABA

**Problema**:
- El EventoDetailModal recibía props incorrectas
- Se pasaba `evento` completo pero esperaba `eventoId`

**Solución Aplicada**:
```typescript
// EventosListPageNew.tsx - Línea 636
<EventoDetailModal
  eventoId={viewingEvento.id}  // ← Antes era evento={viewingEvento}
  onClose={...}
  onEdit={...}
  onRefresh={refetch}
/>
```

**Estado**: ✅ CORREGIDO
- Prop corregida de `evento` a `eventoId`
- Modal de detalles ahora funciona correctamente

---

### 4. ✅ DOCUMENTACIÓN DE CAMPOS OBSOLETOS

**Campos en Tabla `evt_eventos`**:

#### ✅ CAMPOS ACTIVOS (se guardan):
- `ganancia_estimada` - INGRESO ESTIMADO del evento
- `provision_combustible_peaje` - Provisión para combustible/peajes
- `provision_materiales` - Provisión para materiales
- `provision_recursos_humanos` - Provisión para RRHH  
- `provision_solicitudes_pago` - Provisión para SPs

#### ❌ CAMPOS OBSOLETOS (calculados en vista):
- `provisiones` → Se calcula como suma de 4 provisiones
- `utilidad_estimada` → ganancia_estimada - provisiones_total
- `porcentaje_utilidad_estimada` → (utilidad_estimada / ganancia_estimada) * 100
- `total_gastos` → Suma de evt_gastos pagados
- `utilidad` → ingresos_cobrados - gastos_pagados
- `margen_utilidad` → (utilidad / ingresos_cobrados) * 100

**Solución Aplicada**:
```typescript
// EventoModal.tsx - Líneas 7-38
/**
 * CAMPOS DE LA TABLA evt_eventos - REFERENCIA
 * 
 * ✅ CAMPOS ACTIVOS (se guardan en tabla):
 * ...
 * 
 * ❌ CAMPOS OBSOLETOS (calculados en vista):
 * ...
 */
```

**Estado**: ✅ DOCUMENTADO
- Comentario extenso agregado en EventoModal.tsx
- Lista completa de campos activos vs obsoletos
- Explicación de cómo se calculan en la vista

---

### 5. ⚠️ SCRIPT SQL PARA LIMPIAR CAMPOS OBSOLETOS

**Archivo Creado**: `LIMPIAR_CAMPOS_OBSOLETOS_EVENTOS.sql`

**Contenido**:
```sql
UPDATE evt_eventos
SET
  provisiones = 0,
  utilidad_estimada = 0,
  porcentaje_utilidad_estimada = 0,
  total_gastos = 0,
  utilidad = 0,
  margen_utilidad = 0,
  updated_at = NOW()
WHERE deleted_at IS NULL;
```

**Instrucciones de Ejecución**:
1. Abrir Supabase Dashboard
2. Ir a SQL Editor
3. Copiar y pegar el contenido de `LIMPIAR_CAMPOS_OBSOLETOS_EVENTOS.sql`
4. Ejecutar el script
5. Verificar que todos los campos obsoletos estén en 0

**Estado**: ⚠️ PENDIENTE DE EJECUCIÓN
- Script creado y listo
- Debe ejecutarse en Supabase manualmente

---

## 📊 VISTA vw_eventos_analisis_financiero

**Campos que Expone la Vista**:

### Identificación:
- `id`, `clave_evento`, `nombre_proyecto`
- `cliente_id`, `cliente_nombre`, `cliente_comercial`
- `fecha_evento`, `estado_nombre`, `tipo_evento_nombre`

### Provisiones Desglosadas:
- `provision_combustible_peaje`
- `provision_materiales`
- `provision_recursos_humanos`
- `provision_solicitudes_pago`
- `provisiones_total` (CALCULADO: suma de las 4)

### Ingresos:
- `ingreso_estimado` (alias de `ganancia_estimada`)
- `ingresos_cobrados` (desde evt_ingresos WHERE cobrado = true)
- `ingresos_pendientes` (desde evt_ingresos WHERE cobrado = false)

### Gastos por Categoría:
- `gastos_combustible_pagados`, `gastos_combustible_pendientes`
- `gastos_materiales_pagados`, `gastos_materiales_pendientes`
- `gastos_rh_pagados`, `gastos_rh_pendientes`
- `gastos_sps_pagados`, `gastos_sps_pendientes`

### Utilidades Calculadas:
- `utilidad_estimada` (ingreso_estimado - provisiones_total)
- `margen_estimado_pct` ((utilidad_estimada / ingreso_estimado) * 100)
- `utilidad_real` (ingresos_cobrados - gastos_pagados)
- `margen_real_pct` ((utilidad_real / ingresos_cobrados) * 100)

### Status Presupuestal:
- `status_presupuestal_combustible`
- `status_presupuestal_materiales`
- `status_presupuestal_rh`
- `status_presupuestal_sps`
- `status_presupuestal_total`

### Variaciones:
- `variacion_combustible_pct`
- `variacion_materiales_pct`
- `variacion_rh_pct`
- `variacion_sps_pct`
- `variacion_total_pct`

---

## 🔧 CAMBIOS REALIZADOS EN CÓDIGO

### Archivos Modificados:

1. **src/modules/eventos/components/EventoModal.tsx**
   - ✅ Línea 7-38: Documentación completa de campos
   - ✅ Línea 447: Label "Ingreso Estimado" (antes "Ganancia Estimada")
   - ✅ Línea 453: Nota aclaratoria agregada
   - ✅ Línea 459: Badge "[CALCULADO]" en Utilidad Estimada

2. **src/modules/eventos/EventosListPageNew.tsx**
   - ✅ Línea 616: `onRowClick={handleEditEvento}` (antes handleViewEvento)
   - ✅ Línea 636: `eventoId={viewingEvento.id}` (antes evento={viewingEvento})

### Archivos Creados:

1. **LIMPIAR_CAMPOS_OBSOLETOS_EVENTOS.sql**
   - Script para poner en cero todos los campos obsoletos
   - Incluye verificación y queries de validación

2. **RESUMEN_CORRECCION_MODULO_EVENTOS.md** (este archivo)
   - Documentación completa de todos los cambios

---

## ✅ CHECKLIST DE VERIFICACIÓN

### Usuario debe verificar:

- [ ] **Guardar evento nuevo**
  - Llenar "Ingreso Estimado" con un valor (ej: 50000)
  - Llenar las 4 provisiones
  - Hacer clic en "Guardar"
  - Verificar que el evento se guardó correctamente

- [ ] **Editar evento desde listado**
  - Hacer clic en cualquier fila del listado
  - Verificar que se abre el modal de edición
  - Verificar que todos los campos están llenos

- [ ] **Ver detalles con icono ojito**
  - En las acciones de una fila, hacer clic en el icono del ojito (Eye)
  - Verificar que se abre el modal de detalles
  - Verificar que muestra ingresos y gastos

- [ ] **Ejecutar script SQL**
  - Abrir Supabase Dashboard
  - Ejecutar `LIMPIAR_CAMPOS_OBSOLETOS_EVENTOS.sql`
  - Verificar mensaje de éxito

- [ ] **Verificar cálculos en vista**
  - Abrir Supabase Dashboard → SQL Editor
  - Ejecutar: `SELECT * FROM vw_eventos_analisis_financiero LIMIT 5;`
  - Verificar que `ingreso_estimado` tiene valores correctos
  - Verificar que `provisiones_total` es suma de las 4 provisiones
  - Verificar que `utilidad_estimada` = ingreso_estimado - provisiones_total

---

## 🚀 PRÓXIMOS PASOS

1. ✅ **Hard Refresh del Navegador**
   - Presionar `Ctrl+Shift+R` (Windows/Linux)
   - Presionar `Cmd+Shift+R` (Mac)

2. ⚠️ **Ejecutar Script SQL**
   - Ir a Supabase Dashboard
   - SQL Editor
   - Ejecutar `LIMPIAR_CAMPOS_OBSOLETOS_EVENTOS.sql`

3. ✅ **Probar Funcionalidad**
   - Crear evento nuevo
   - Editar evento existente
   - Ver detalles de evento
   - Verificar cálculos

4. ✅ **Commit y Push**
   ```bash
   git add .
   git commit -m "fix: Corregir módulo eventos - ingreso estimado, edición, detalles y documentación"
   git push origin privisiones-divididas
   ```

---

## 📝 NOTAS IMPORTANTES

### Sobre ganancia_estimada:
- **NO cambiar el nombre del campo en la BD** - Muchas vistas y funciones lo usan
- **SÍ cambiar labels en UI** - Para que los usuarios entiendan que es "Ingreso Estimado"
- La vista expone el alias `ingreso_estimado` que apunta a `ganancia_estimada`

### Sobre campos obsoletos:
- **NO eliminarlos de la tabla todavía** - Podrían usarse en código viejo
- **SÍ ponerlos en cero** - Para identificar que están obsoletos
- **SÍ documentarlos** - Para que futuros desarrolladores lo sepan

### Sobre la vista vw_eventos_analisis_financiero:
- Es la **fuente de verdad** para todos los cálculos financieros
- **NO modificar** los campos calculados en la tabla
- **SÍ usar** la vista para consultas y reportes

---

## 🐛 PROBLEMAS CONOCIDOS PENDIENTES

Ninguno identificado hasta el momento.

---

## 📞 SOPORTE

Si encuentras algún problema:
1. Verificar que el servidor está corriendo (`npm run dev`)
2. Hacer hard refresh del navegador
3. Verificar consola del navegador para errores
4. Verificar que el script SQL se ejecutó correctamente

---

**Fin del Resumen** 🎉
