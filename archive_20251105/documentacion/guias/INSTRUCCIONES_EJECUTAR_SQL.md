# 📋 INSTRUCCIONES PARA EJECUTAR SQL EN SUPABASE

## ✅ Correcciones Realizadas en el Frontend

### 1. **Columna Duplicada Eliminada**
- ❌ **ANTES**: Existían DOS columnas "Utilidad Real" 
  - Una CON porcentaje (línea 438)
  - Una SIN porcentaje (línea 464) ← **ELIMINADA**
- ✅ **AHORA**: Solo existe UNA columna "Utilidad Real" con porcentaje

### 2. **Iconos Corregidos**
- ❌ **ANTES**: En la columna "Disponible" mostraba:
  - `�` para Recursos Humanos
  - `�` para Solicitudes de Pago
- ✅ **AHORA**: Muestra correctamente:
  - `👥` para Recursos Humanos
  - `💳` para Solicitudes de Pago

---

## 🗄️ SCRIPTS SQL PENDIENTES DE EJECUTAR

### Script 1: VERIFICAR_INGRESOS_2024.sql
**Propósito**: Verificar que existen datos en las tablas

**Cómo ejecutar**:
1. Abre Supabase Dashboard: https://gomnouwackzvthpwyric.supabase.co
2. Ve a **SQL Editor** en el menú lateral
3. Copia y pega el contenido de `VERIFICAR_INGRESOS_2024.sql`
4. Haz clic en **Run**
5. Revisa los resultados de cada query

**Queries que ejecutará**:
- ✅ Contar eventos del 2024
- ✅ Verificar ingresos con sus totales
- ✅ Verificar datos en la vista `vw_eventos_analisis_financiero`
- ✅ Verificar categorías de gastos
- ✅ Listar todas las categorías disponibles

---

### Script 2: ACTUALIZAR_VISTA_GASTOS_CATEGORIAS.sql ⚠️ **CRÍTICO**
**Propósito**: Agregar columnas de categorías a la vista `vw_eventos_analisis_financiero`

**IMPORTANTE**: Sin ejecutar este script, las columnas de gastos mostrarán **$0.00** porque la vista actual NO tiene estas columnas:
- `gastos_combustible_pagados`
- `gastos_combustible_pendientes`
- `gastos_materiales_pagados`
- `gastos_materiales_pendientes`
- `gastos_rh_pagados`
- `gastos_rh_pendientes`
- `gastos_sps_pagados`
- `gastos_sps_pendientes`

**Cómo ejecutar**:
1. Abre Supabase Dashboard: https://gomnouwackzvthpwyric.supabase.co
2. Ve a **SQL Editor**
3. Copia TODO el contenido de `ACTUALIZAR_VISTA_GASTOS_CATEGORIAS.sql` (270 líneas)
4. Pega en el editor
5. Haz clic en **Run**
6. Espera confirmación: "Success. No rows returned"

**Lo que hace**:
- `DROP VIEW IF EXISTS vw_eventos_analisis_financiero CASCADE;`
- Crea la vista nuevamente con TODAS las columnas necesarias:
  - 8 columnas de gastos por categoría (pagados + pendientes)
  - 4 columnas de disponible por categoría
  - Ingresos (totales, cobrados, pendientes, estimado)
  - Provisiones por categoría
  - Utilidades (estimada y real)

---

## 🔄 DESPUÉS DE EJECUTAR LOS SCRIPTS

### 1. **Hard Refresh del Navegador**
Presiona:
- **Windows/Linux**: `Ctrl + Shift + R`
- **Mac**: `Cmd + Shift + R`

### 2. **Verificar en el Listado de Eventos**
Deberías ver:
- ✅ **Columna "Ingresos"**: 4 líneas (Total, Cobrados, Pendientes, Estimado)
- ✅ **Columna "Gastos Totales"**: Desglose con 4 iconos (⛽🛠️👥💳)
- ✅ **Columna "Gastos Pagados"**: Desglose con 4 iconos
- ✅ **Columna "Gastos Pendientes"**: Desglose con 4 iconos
- ✅ **Columna "Provisiones"**: Desglose con 4 iconos
- ✅ **Columna "Disponible"**: Desglose con 4 iconos (👥💳 correctos)
- ✅ **Columna "Utilidad Planeada"**: Monto + porcentaje
- ✅ **Columna "Utilidad Real"**: Monto + porcentaje (sin duplicado)
- ✅ **Columna "Cobro"**: Badge de estado

### 3. **Verificar Dashboard**
Los 8 cards del dashboard deben mostrar:
1. Total Ingresos
2. Gastos Totales (con desglose ⛽🛠️👥💳)
3. Gastos Pagados (con desglose)
4. Gastos Pendientes (con desglose)
5. Provisiones (con desglose)
6. Disponible (con desglose)
7. Utilidad Planeada (monto + %)
8. Utilidad Real (monto + %)

### 4. **Verificar Modal de Detalle**
Al hacer clic en un evento:
- **Tab Resumen**: Gráficas con colores sobrios (gris/teal/rose) ✅
- **Tab Ingresos**: 4 cards de resumen arriba ✅
- **Tab Gastos**: 5 cards de resumen + 5 subtabs ✅
- **Tab Workflow**: Flujo de estados ✅

---

## 🚨 PROBLEMAS COMUNES

### ❌ "Los gastos muestran $0.00"
**Solución**: Ejecuta `ACTUALIZAR_VISTA_GASTOS_CATEGORIAS.sql`

### ❌ "Sigo viendo iconos raros (�)"
**Solución**: 
1. Hard refresh: `Ctrl + Shift + R`
2. Si persiste, cierra y abre el navegador

### ❌ "La columna Utilidad Real está duplicada"
**Solución**: Ya fue corregido en el código. Hard refresh del navegador.

### ❌ "Error al ejecutar SQL: relation vw_eventos_analisis_financiero does not exist"
**Solución**: La vista no existe. Ejecuta el script sin la línea `DROP VIEW` primero.

---

## 📝 ORDEN RECOMENDADO DE EJECUCIÓN

1. ✅ Ejecutar `VERIFICAR_INGRESOS_2024.sql` (diagnóstico)
2. ⚠️ Ejecutar `ACTUALIZAR_VISTA_GASTOS_CATEGORIAS.sql` (CRÍTICO)
3. 🔄 Hard refresh del navegador
4. ✅ Verificar listado de eventos
5. ✅ Verificar dashboard
6. ✅ Verificar modal de detalle

---

## 🎯 RESULTADO ESPERADO

Después de ejecutar todo:
- ✅ 8 columnas financieras en el listado
- ✅ Todos los iconos visibles (⛽🛠️👥💳)
- ✅ Sin columnas duplicadas
- ✅ Montos reales (no $0.00)
- ✅ Porcentajes de utilidad
- ✅ Dashboard con 8 cards
- ✅ Modal con 4 tabs completos
- ✅ Colores sobrios en gráficas
