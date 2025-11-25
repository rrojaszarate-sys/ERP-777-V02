# 🔧 INSTRUCCIONES PARA ACTUALIZAR EL SISTEMA

## ✅ CAMBIOS REALIZADOS

### 1. **VISTA DE BASE DE DATOS** - CRÍTICO ⚠️
Se creó el archivo `UPDATE_VISTA_GASTOS_POR_CATEGORIA.sql` que agrega:
- **Gastos por categoría (Pagados y Pendientes):**
  - `gastos_combustible_peaje_pagados` y `gastos_combustible_peaje_pendientes`
  - `gastos_materiales_pagados` y `gastos_materiales_pendientes`
  - `gastos_recursos_humanos_pagados` y `gastos_recursos_humanos_pendientes`
  - `gastos_solicitudes_pago_pagados` y `gastos_solicitudes_pago_pendientes`

- **Disponible por categoría:**
  - `disponible_combustible_peaje`
  - `disponible_materiales`
  - `disponible_recursos_humanos`
  - `disponible_solicitudes_pago`
  - `disponible_total`

**🚨 DEBES EJECUTAR ESTE SQL EN SUPABASE DASHBOARD ANTES DE PROBAR**

### 2. **LISTADO DE EVENTOS** (`EventosListPageNew.tsx`)

#### Columna "Ingresos":
```
INGRESOS TOTALES (en negrita)
  Cobr: $X,XXX.XX
  Pend: $X,XXX.XX
  ─────────────
  Est: $X,XXX.XX
```

#### Columna "Gastos":
```
GASTOS TOTALES (en negrita)
  Pagados: $X,XXX.XX
  Pend: $X,XXX.XX
  ─────────────
  ⛽ $X,XXX
  🛠️ $X,XXX
  👥 $X,XXX
  💳 $X,XXX
```

#### Columna "Provisiones":
```
PROVISIONES TOTALES (en negrita)
  ⛽ $X,XXX
  🛠️ $X,XXX
  👥 $X,XXX
  💳 $X,XXX
```

#### Columna "Disponible":
```
DISPONIBLE TOTAL (en negrita, verde si positivo, rojo si negativo)
  Usado: XX.X%
  ─────────────
  ⛽ $X,XXX (rojo si negativo)
  🛠️ $X,XXX (rojo si negativo)
  👥 $X,XXX (rojo si negativo)
  💳 $X,XXX (rojo si negativo)
```

### 3. **CLICK EN FILA** - CAMBIO IMPORTANTE ⚠️
- **ANTES:** Click en fila → Abría EDICIÓN
- **AHORA:** Click en fila → Abre DETALLE
- **Edición:** Se accede desde el botón "Editar" en el modal de detalle

### 4. **MODAL DE DETALLE** (`EventoDetailModal.tsx`)

#### Nueva sección: "Análisis Financiero del Evento"
Panel comparativo con 3 tarjetas:

**💰 INGRESOS:**
- Estimado (Planeado)
- Real Total
- Cobrados
- Pendientes
- % del estimado

**💳 GASTOS Y PROVISIONES:**
- Provisiones (Planeado) con desglose
- Gastos Reales
- Pagados
- Pendientes
- % usado

**📊 UTILIDAD Y DISPONIBLE:**
- Disponible (Provisión - Gastado)
- Utilidad Estimada + margen %
- Utilidad Real + margen %
- Comparativa

**📈 Resumen Comparativo:**
- Ingreso Real vs Estimado
- Gastos Real vs Provisión
- Utilidad Real vs Estimada
- Presupuesto Disponible

---

## 🚀 PASOS PARA PROBAR

### PASO 1: Ejecutar SQL (OBLIGATORIO)
1. Abrir Supabase Dashboard
2. Ir a SQL Editor
3. Abrir el archivo `UPDATE_VISTA_GASTOS_POR_CATEGORIA.sql`
4. Copiar TODO el contenido
5. Pegar en SQL Editor
6. Click en "RUN"
7. Verificar que se ejecute sin errores
8. ✅ Mensaje: "Success. No rows returned"

### PASO 2: Verificar la vista
```sql
SELECT * FROM vw_eventos_analisis_financiero LIMIT 1;
```
Debes ver las nuevas columnas:
- `gastos_combustible_peaje_pagados`
- `gastos_materiales_pagados`
- `gastos_recursos_humanos_pagados`
- `gastos_solicitudes_pago_pagados`
- `disponible_combustible_peaje`
- `disponible_materiales`
- etc.

### PASO 3: Iniciar el servidor
El servidor ya está corriendo en el terminal. Si necesitas reiniciarlo:
```bash
npm run dev
```

### PASO 4: Probar en el navegador
1. Abrir http://localhost:5173/
2. Ir al módulo de Eventos
3. Ver la lista de eventos
4. **Verificar que las columnas muestren:**
   - Ingresos con total en negrita y desglose
   - Gastos con total en negrita y desglose por categoría
   - Provisiones con total y desglose
   - Disponible con total y desglose por categoría

5. **Click en una fila del evento**
6. Debe abrir el MODAL DE DETALLE (no edición)
7. **Verificar que se muestre:**
   - Análisis Financiero completo
   - 3 tarjetas comparativas
   - Resumen comparativo

8. **En el modal de detalle, click en botón "Editar"**
9. Debe abrir el modal de EDICIÓN

---

## 🐛 SOLUCIÓN DE PROBLEMAS

### Si las columnas aparecen con valores null o undefined:
1. Verifica que hayas ejecutado el SQL
2. Verifica que la vista `vw_eventos_analisis_financiero` exista
3. Ejecuta:
   ```sql
   SELECT column_name 
   FROM information_schema.columns 
   WHERE table_name = 'vw_eventos_analisis_financiero';
   ```

### Si el modal de detalle no muestra información financiera:
1. Abre la consola del navegador (F12)
2. Busca errores
3. Verifica que `EventoDetailModal` esté cargando desde `vw_eventos_analisis_financiero`
4. Ver en Network tab si la query a Supabase está trayendo los datos

### Si las categorías de gastos aparecen en 0:
La vista busca las categorías por nombre usando ILIKE.
Verifica que existan en la tabla `categoria_gasto`:
```sql
SELECT * FROM categoria_gasto;
```
Los nombres deben contener:
- "combustible" o "peaje"
- "material"
- "recurso" o "humano" o "rh"
- "solicitud" o "pago" o "sp"

---

## 📊 ESTRUCTURA DE DATOS

### Vista `vw_eventos_analisis_financiero` - Nuevos Campos:

```typescript
interface EventoAnalisisFinanciero {
  // ... campos existentes ...
  
  // GASTOS POR CATEGORÍA - PAGADOS
  gastos_combustible_peaje_pagados: number;
  gastos_materiales_pagados: number;
  gastos_recursos_humanos_pagados: number;
  gastos_solicitudes_pago_pagados: number;
  
  // GASTOS POR CATEGORÍA - PENDIENTES
  gastos_combustible_peaje_pendientes: number;
  gastos_materiales_pendientes: number;
  gastos_recursos_humanos_pendientes: number;
  gastos_solicitudes_pago_pendientes: number;
  
  // DISPONIBLE POR CATEGORÍA
  disponible_combustible_peaje: number;
  disponible_materiales: number;
  disponible_recursos_humanos: number;
  disponible_solicitudes_pago: number;
  disponible_total: number;
}
```

---

## ✅ CHECKLIST DE VALIDACIÓN

- [ ] SQL ejecutado en Supabase sin errores
- [ ] Vista `vw_eventos_analisis_financiero` actualizada con nuevas columnas
- [ ] Servidor corriendo en http://localhost:5173/
- [ ] Lista de eventos muestra columnas con formato correcto:
  - [ ] Ingresos: Total en negrita + desglose
  - [ ] Gastos: Total en negrita + desglose por categoría
  - [ ] Provisiones: Total en negrita + desglose
  - [ ] Disponible: Total en negrita + desglose (rojo si negativo)
- [ ] Click en fila abre DETALLE (no edición)
- [ ] Modal de detalle muestra:
  - [ ] Análisis Financiero con 3 tarjetas
  - [ ] Resumen comparativo
  - [ ] Información del evento
- [ ] Botón "Editar" en detalle abre modal de edición
- [ ] Campos de ingreso estimado y provisiones con máscara de dinero

---

## 🎯 LÓGICA DEL NEGOCIO

### PLANEACIÓN (Estimado):
- **Ingreso Estimado:** Lo que ESPERO ganar
- **Provisiones:** Lo que PLANEO gastar (4 categorías)
- **Utilidad Estimada:** Ingreso - Provisiones

### EJECUCIÓN (Real):
- **Ingresos Totales:** Cobrados + Pendientes
- **Gastos Totales:** Pagados + Pendientes
- **Disponible:** Provisiones - Gastos Pagados
- **Utilidad Real:** Ingresos Cobrados - Gastos Pagados

### COMPARATIVA:
- Ingreso Real vs Estimado → ¿Gané lo que esperaba?
- Gastos Pagados vs Provisiones → ¿Gasté lo que planeé?
- Disponible → ¿Cuánto me queda del presupuesto?
- Utilidad Real vs Estimada → ¿La utilidad es mejor o peor?

---

## 📝 ARCHIVOS MODIFICADOS

1. `UPDATE_VISTA_GASTOS_POR_CATEGORIA.sql` - **NUEVO** ⚠️ EJECUTAR
2. `src/modules/eventos/EventosListPageNew.tsx` - Columnas rediseñadas
3. `src/modules/eventos/components/EventoDetailModal.tsx` - Panel financiero agregado
4. `src/modules/eventos/components/EventoModal.tsx` - Máscaras de dinero (cambio anterior)

---

🚀 **LISTO PARA PROBAR - Ejecuta el SQL primero!**
