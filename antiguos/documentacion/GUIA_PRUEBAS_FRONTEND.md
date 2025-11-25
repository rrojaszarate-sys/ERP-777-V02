# 🧪 GUÍA DE PRUEBAS POST-CORRECCIÓN

## ✅ Estado Actual
- ✅ Script SQL ejecutado exitosamente
- ✅ Vistas recreadas: `vw_eventos_completos` y `vw_master_facturacion`
- ✅ Triggers eliminados
- ✅ Servidor de desarrollo corriendo en http://localhost:5174

---

## 📋 PRUEBAS A REALIZAR

### 1️⃣ Master de Facturación
**URL:** http://localhost:5174/eventos/facturacion

**Qué verificar:**
- [ ] La tabla carga correctamente sin errores
- [ ] Las columnas **Total**, **Gastos** y **Utilidad** muestran valores
- [ ] El **Margen %** se calcula correctamente
- [ ] Los totales coinciden con la suma de ingresos/gastos reales
- [ ] Los filtros por estado de pago funcionan
- [ ] Los filtros por fecha funcionan

**Validación manual:**
1. Selecciona un evento
2. Anota su **Total** y **Gastos**
3. Calcula manualmente: Utilidad = Total - Gastos
4. Calcula manualmente: Margen = (Utilidad / Total) × 100
5. Compara con los valores mostrados

---

### 2️⃣ Estados Contables
**URL:** http://localhost:5174/contabilidad/estados

**Qué verificar:**
- [ ] Las tarjetas de resumen muestran totales correctos
- [ ] La tabla de eventos por cuenta bancaria carga datos
- [ ] Los totales por cuenta coinciden con la suma de gastos/ingresos
- [ ] Los filtros de fecha funcionan correctamente
- [ ] La información se actualiza al cambiar filtros

**Validación:**
1. Revisa el total general de ingresos
2. Revisa el total general de gastos
3. Verifica que Utilidad = Ingresos - Gastos
4. Compara con los datos de Master de Facturación

---

### 3️⃣ Análisis Financiero
**URL:** http://localhost:5174/eventos/analisis-financiero

**Qué verificar:**
- [ ] Las gráficas cargan correctamente
- [ ] Los KPIs muestran valores consistentes
- [ ] Las gráficas de tendencias muestran datos reales
- [ ] Los márgenes de utilidad son coherentes
- [ ] Los filtros por período funcionan

**Validación:**
1. Compara los totales con Master de Facturación
2. Verifica que los porcentajes de margen coincidan
3. Revisa que los datos en gráficas sean coherentes

---

### 4️⃣ Reportes Bancarios
**URL:** http://localhost:5174/contabilidad/reportes

**Qué verificar:**
- [ ] Los filtros por cuenta bancaria funcionan
- [ ] Los filtros por fecha funcionan
- [ ] El botón de exportar a Excel funciona
- [ ] Los totales de gastos por cuenta son correctos
- [ ] La información mostrada coincide con Estados Contables

---

## 🔍 VERIFICACIONES ESPECÍFICAS

### A. Consistencia de Datos
Elige un evento específico y verifica:

```
1. En Master de Facturación:
   - Total de Ingresos: $______
   - Total de Gastos: $______
   - Utilidad: $______
   - Margen: ______%

2. En Estados Contables (buscar el mismo evento):
   - Total de Ingresos: $______
   - Total de Gastos: $______
   - Utilidad: $______

3. ✅ Los valores deben ser IDÉNTICOS
```

### B. Cálculos Matemáticos
Para cualquier evento:

```
Fórmula de Utilidad: Ingresos - Gastos = Utilidad
Fórmula de Margen: (Utilidad / Ingresos) × 100 = Margen %

Ejemplo:
- Ingresos: $10,000
- Gastos: $7,000
- Utilidad esperada: $3,000
- Margen esperado: 30%
```

### C. Valores Negativos o Cero
- [ ] Los eventos sin ingresos muestran Total = 0
- [ ] Los eventos sin gastos muestran Gastos = 0
- [ ] La utilidad puede ser negativa (pérdida) si Gastos > Ingresos
- [ ] No hay errores en consola JavaScript

---

## 🐛 PROBLEMAS COMUNES Y SOLUCIONES

### Problema: "Column does not exist"
**Solución:** El script de corrección ya fue ejecutado. Si persiste, verifica que las vistas fueron recreadas.

### Problema: Valores en 0 o NULL
**Causa probable:** No hay registros en `evt_gastos` o `evt_ingresos` para ese evento.
**Solución:** Verifica que el evento tenga gastos/ingresos registrados y con `activo = true`.

### Problema: Totales no coinciden
**Causa probable:** 
1. Registros con `activo = false` no se están contando (esto es correcto)
2. Inconsistencias en los datos originales

**Solución:** Ejecuta el script `VERIFICACION_POST_CORRECCION.sql` para identificar inconsistencias.

### Problema: Error en consola del navegador
**Solución:** 
1. Abre DevTools (F12)
2. Ve a la pestaña Console
3. Copia el error completo
4. Busca en el código del componente la función que está fallando

---

## 📊 CHECKLIST DE VALIDACIÓN COMPLETA

### Funcionalidad General
- [ ] El sistema carga sin errores 500
- [ ] No hay errores en consola del navegador
- [ ] Las vistas responden rápidamente (< 2 segundos)
- [ ] Los filtros funcionan correctamente
- [ ] La navegación entre páginas funciona

### Datos Financieros
- [ ] Los totales de ingresos son correctos
- [ ] Los totales de gastos son correctos
- [ ] Las utilidades se calculan bien (Ingresos - Gastos)
- [ ] Los márgenes se calculan bien ((Utilidad / Ingresos) × 100)
- [ ] No hay valores NaN, Infinity o undefined

### Consistencia entre Módulos
- [ ] Master de Facturación y Estados Contables muestran los mismos totales
- [ ] Análisis Financiero refleja los datos de Master de Facturación
- [ ] Reportes Bancarios coincide con Estados Contables
- [ ] Los KPIs en diferentes páginas son consistentes

### Performance
- [ ] Las vistas cargan en menos de 3 segundos
- [ ] Los filtros responden rápidamente
- [ ] No hay lag al navegar entre páginas
- [ ] Las exportaciones funcionan correctamente

---

## 📝 REPORTE DE PRUEBAS

### Fecha de Prueba: _______________
### Probado por: _______________

| Módulo | Estado | Observaciones |
|--------|--------|---------------|
| Master de Facturación | ⬜ OK / ⬜ Error | |
| Estados Contables | ⬜ OK / ⬜ Error | |
| Análisis Financiero | ⬜ OK / ⬜ Error | |
| Reportes Bancarios | ⬜ OK / ⬜ Error | |

### Problemas Encontrados:
1. 
2. 
3. 

### Validaciones Exitosas:
- [ ] Datos consistentes entre módulos
- [ ] Cálculos matemáticos correctos
- [ ] Performance aceptable
- [ ] Sin errores en consola

---

## 🎯 CRITERIOS DE ACEPTACIÓN

El sistema se considera **APROBADO** cuando:

1. ✅ Todas las páginas cargan sin errores
2. ✅ Los totales son consistentes entre todos los módulos
3. ✅ Los cálculos de Utilidad y Margen son correctos
4. ✅ Los filtros funcionan correctamente
5. ✅ No hay errores en consola del navegador
6. ✅ La performance es aceptable (< 3 segundos)

---

## 📞 SIGUIENTE PASO

Una vez completadas todas las pruebas:
- Si TODO está OK ✅ → Marcar tarea "Validación y testing integral" como COMPLETADA
- Si hay problemas ❌ → Documentar los errores y solicitar correcciones
