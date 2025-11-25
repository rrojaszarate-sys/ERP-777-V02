# 🧪 PRUEBAS DE INSERCIÓN Y ACTUALIZACIÓN - INGRESO ESTIMADO

## ✅ CORRECCIONES REALIZADAS

### 1. **Campo de Ingreso Estimado con Máscara de Dinero**
- ✅ Reemplazado `input type="number"` por `NumericFormat` de `react-number-format`
- ✅ Separador de miles: `,` (coma)
- ✅ Prefijo: `$ `
- ✅ Decimales fijos: 2
- ✅ Sin flechitas de aumentar/disminuir
- ✅ Fuente más grande y en negrita para mejor visibilidad

### 2. **Provisiones con Máscara de Dinero**
- ✅ Los 4 campos de provisiones ahora usan `NumericFormat`
- ✅ Mismo formato: `$ 1,234.56`
- ✅ Fuente en negrita
- ✅ Sin flechitas

### 3. **Utilidad Estimada Mejorada**
- ✅ Ahora muestra el **MONTO** en grande
- ✅ Muestra el **PORCENTAJE** de margen estimado
- ✅ Fondo color ámbar para destacar
- ✅ Borde más visible
- ✅ Cálculo en tiempo real

### 4. **FIX CRÍTICO: Carga de Evento para Editar**
**PROBLEMA ANTERIOR:**
- Se usaba la VISTA `vw_eventos_analisis_financiero` que retorna `ingreso_estimado` (alias)
- Al editar, se mapeaba `ingreso_estimado` → `ganancia_estimada`
- Esto causaba que el campo NO se cargara correctamente

**SOLUCIÓN:**
- `handleEditEvento` ahora hace una consulta DIRECTA a la tabla `evt_eventos`
- Obtiene el valor REAL de `ganancia_estimada` de la tabla
- Se carga correctamente en el formulario

### 5. **Guardado Correcto**
- ✅ `handleSubmit` envía `ganancia_estimada` correctamente
- ✅ `handleSaveEvento` guarda en la tabla `evt_eventos`
- ✅ El campo se llama `ganancia_estimada` en BD (aunque en UI dice "Ingreso Estimado")

---

## 🧪 PASOS PARA PROBAR

### PRUEBA 1: Crear Nuevo Evento
1. Abre http://localhost:5173/
2. Ve al módulo de Eventos
3. Click en "Nuevo Evento"
4. Llena los campos obligatorios:
   - Nombre del Proyecto
   - Fecha del Evento
   - Cliente
   - Tipo de Evento
   - Responsable
   - **Ingreso Estimado: prueba con $ 50,000.00**
   - **Provisiones:**
     - Combustible: $ 5,000.00
     - Materiales: $ 10,000.00
     - RH: $ 15,000.00
     - SPs: $ 8,000.00
5. Verifica que **Utilidad Estimada** muestre:
   - Monto: $ 12,000.00
   - Porcentaje: 24.0% de margen estimado
6. Click en "Guardar"
7. Verifica en consola que se muestre: `✅ Evento creado correctamente`
8. Verifica que el evento aparezca en la lista

### PRUEBA 2: Editar Evento Existente
1. En la lista de eventos, click en UNA FILA (no en el ojo)
2. Debe abrirse el modal de EDICIÓN
3. **VERIFICAR QUE EL CAMPO "Ingreso Estimado" MUESTRE EL VALOR**
4. Verifica en la consola del navegador:
   ```
   ✏️ Cargando evento para editar desde TABLA evt_eventos, ID: [id]
   📋 Evento cargado desde tabla: {...}
   💰 ganancia_estimada desde tabla: 50000
   ```
5. Cambia el valor del Ingreso Estimado a $ 60,000.00
6. Cambia una provisión (ej: Materiales a $ 12,000.00)
7. Verifica que la Utilidad Estimada se actualice automáticamente
8. Click en "Guardar"
9. Verifica en consola: `✅ Evento actualizado correctamente`
10. Cierra el modal
11. Vuelve a abrir el evento editado
12. **VERIFICAR QUE EL NUEVO VALOR SE MUESTRE: $ 60,000.00**

### PRUEBA 3: Verificar Cálculos en Tiempo Real
1. Abre un evento para editar o crea uno nuevo
2. Escribe en Ingreso Estimado: $ 100,000.00
3. Escribe en las 4 provisiones:
   - Combustible: $ 10,000.00
   - Materiales: $ 20,000.00
   - RH: $ 30,000.00
   - SPs: $ 15,000.00
4. **Verificar que Utilidad Estimada muestre:**
   - Monto: $ 25,000.00
   - Porcentaje: 25.0% de margen estimado
5. Cambia el Ingreso Estimado a $ 150,000.00
6. **Verificar que Utilidad Estimada se actualice automáticamente:**
   - Monto: $ 75,000.00
   - Porcentaje: 50.0% de margen estimado

### PRUEBA 4: Verificar en Base de Datos
1. Abre Supabase Dashboard
2. Ve a Table Editor → evt_eventos
3. Busca el evento que creaste/editaste
4. **VERIFICAR QUE LA COLUMNA `ganancia_estimada` TENGA EL VALOR CORRECTO**
5. Verificar que las 4 provisiones también estén guardadas

---

## 🐛 QUÉ REVISAR SI ALGO FALLA

### Si "Ingreso Estimado" aparece vacío al editar:
1. Abre la consola del navegador (F12)
2. Busca los logs:
   - `✏️ Cargando evento para editar desde TABLA evt_eventos`
   - `💰 ganancia_estimada desde tabla`
3. Si `ganancia_estimada` es `null` o `0`, el problema está en la BD
4. Si `ganancia_estimada` tiene valor pero no se muestra, el problema está en el formulario

### Si no se guarda el valor:
1. Abre consola del navegador
2. Busca el log: `📤 Guardando evento:`
3. Verifica que el objeto tenga `ganancia_estimada` con el valor correcto
4. Busca errores de Supabase (código 400, 500, etc.)

### Si la Utilidad Estimada no se calcula bien:
1. Verifica que todas las provisiones tengan valores numéricos
2. Verifica la consola por errores de cálculo
3. La fórmula es: `Ingreso Estimado - (suma de 4 provisiones)`

---

## 📊 COMPORTAMIENTO ESPERADO

### Formulario de Evento:
- **Ingreso Estimado:** Campo principal, se guarda en `ganancia_estimada`
- **Utilidad Estimada:** Campo calculado, NO se guarda en tabla (se calcula en vista)
- **Provisiones:** 4 campos que se guardan individualmente
- **Total Provisiones:** Se muestra en el formulario, se calcula en la vista

### Base de Datos:
```sql
-- Campos que SE GUARDAN en evt_eventos:
ganancia_estimada           -- El "Ingreso Estimado"
provision_combustible_peaje
provision_materiales
provision_recursos_humanos
provision_solicitudes_pago

-- Campos OBSOLETOS (no usar, están en 0):
provisiones                 -- Ya no se usa
utilidad_estimada          -- Ya no se usa
porcentaje_utilidad_estimada -- Ya no se usa
total_gastos               -- Ya no se usa
utilidad                   -- Ya no se usa
margen_utilidad            -- Ya no se usa
```

### Vista vw_eventos_analisis_financiero:
```sql
-- Retorna campos CALCULADOS:
ingreso_estimado           -- ALIAS de ganancia_estimada
provisiones_total          -- SUMA de las 4 provisiones
utilidad_estimada          -- ingreso_estimado - provisiones_total
margen_estimado_pct        -- (utilidad_estimada / ingreso_estimado) * 100
utilidad_real              -- ingresos_cobrados - gastos_pagados
margen_real_pct            -- (utilidad_real / ingresos_cobrados) * 100
```

---

## ✅ CHECKLIST DE VALIDACIÓN

- [ ] Los campos monetarios muestran formato `$ 1,234.56`
- [ ] No hay flechitas de aumentar/disminuir en los campos
- [ ] Al crear un evento, se guarda correctamente
- [ ] Al editar un evento, el campo "Ingreso Estimado" muestra el valor guardado
- [ ] Al modificar y guardar, el nuevo valor se persiste en BD
- [ ] La Utilidad Estimada se calcula correctamente en tiempo real
- [ ] El porcentaje de margen se muestra correctamente
- [ ] El total de provisiones se calcula correctamente
- [ ] Los logs en consola muestran los valores correctos
- [ ] En Supabase, la columna `ganancia_estimada` tiene los valores correctos

---

## 🎨 MEJORAS ESTÉTICAS APLICADAS

1. **Ingreso Estimado:**
   - Texto más grande (text-lg)
   - Fuente en negrita (font-semibold)
   - Borde destacado
   - Placeholder claro: `$ 0.00`

2. **Utilidad Estimada:**
   - Fondo ámbar claro (bg-amber-50)
   - Borde ámbar grueso (border-2 border-amber-300)
   - Monto en texto grande y negrita (text-lg font-bold)
   - Porcentaje en texto pequeño debajo
   - Se actualiza en tiempo real

3. **Provisiones:**
   - Todas con formato de dinero uniforme
   - Fuente en negrita
   - Iconos distintivos (⛽, 🛠️, 👥, 💳)
   - Total destacado en caja amarilla

4. **Consistencia:**
   - Todos los campos monetarios usan el mismo componente `NumericFormat`
   - Mismo formato en toda la aplicación
   - Separador de miles consistente
