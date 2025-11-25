# 📋 INSTRUCCIONES: CORRECCIÓN DE GASTOS E INGRESOS

## 🎯 OBJETIVO
Corregir el sistema para que **SOLO** utilice las tablas `evt_gastos` y `evt_ingresos` para todos los cálculos financieros, eliminando redundancias y asegurando integridad de datos.

---

## ⚠️ IMPORTANTE - LEER ANTES DE EJECUTAR

**ESTE PROCESO:**
- ✅ Crea backups automáticos de todas las tablas
- ✅ NO elimina datos, solo reorganiza la estructura
- ✅ Mejora la precisión de los cálculos
- ✅ Elimina redundancias y triggers problemáticos
- ⚠️ **REQUIERE** ejecutarse en Supabase Dashboard SQL Editor

---

## 📝 PASOS A SEGUIR

### PASO 1: Acceder a Supabase Dashboard
1. Ir a: https://supabase.com/dashboard
2. Seleccionar proyecto: **Made-ERP-777**
3. Click en **SQL Editor** (menú lateral izquierdo)

### PASO 2: Ejecutar Script de Corrección
1. En el SQL Editor, hacer click en **"New query"**
2. Copiar TODO el contenido del archivo `CORRECCION_GASTOS_INGRESOS.sql`
3. Pegar en el editor
4. Click en **"Run"** o presionar `Ctrl+Enter`

### PASO 3: Revisar Output
El script mostrará mensajes de progreso:
- ✅ Backups creados
- ✅ Inconsistencias detectadas
- ✅ Vistas recreadas
- ✅ Triggers eliminados
- ✅ Validación de datos

### PASO 4: Verificación en Frontend
1. Reiniciar el servidor de desarrollo (`npm run dev`)
2. Probar las siguientes páginas:
   - Master de Facturación
   - Estados Contables
   - Análisis Financiero
   - Reportes Bancarios
3. Verificar que los totales sean correctos

---

## 🔧 QUÉ HACE EL SCRIPT

### 1. Crear Backups
```sql
- evt_gastos_backup_20251027
- evt_ingresos_backup_20251027
- evt_eventos_backup_20251027
```

### 2. Detectar Inconsistencias
Compara:
- `evt_eventos.total` vs SUM(`evt_ingresos.total`)
- `evt_eventos.total_gastos` vs SUM(`evt_gastos.total`)
- `evt_eventos.utilidad` vs (ingresos - gastos)

### 3. Recrear Vistas

#### vw_eventos_completos
```sql
SELECT
  e.*,
  SUM(i.total) as total,              -- CALCULADO desde evt_ingresos
  SUM(g.total) as total_gastos,       -- CALCULADO desde evt_gastos
  (SUM(i.total) - SUM(g.total)) as utilidad,  -- CALCULADO
  ((SUM(i.total) - SUM(g.total)) / SUM(i.total)) * 100 as margen_utilidad
FROM evt_eventos e
LEFT JOIN evt_ingresos i ON e.id = i.evento_id AND i.activo = true
LEFT JOIN evt_gastos g ON e.id = g.evento_id AND g.activo = true
GROUP BY e.id
```

#### vw_master_facturacion
Similar a vw_eventos_completos pero optimizada para facturación

### 4. Eliminar Triggers Problemáticos
- `calculate_expense_totals_trigger`
- `calculate_income_totals_trigger`
- Todos los triggers que modifican evt_eventos

### 5. Validar Datos
- Muestra los primeros 5 eventos con sus totales
- Compara valores antiguos vs nuevos
- Verifica integridad de las vistas

---

## 📊 CAMPOS QUE CAMBIAN

### ❌ CAMPOS QUE YA NO SE USAN EN evt_eventos
Estos campos **permanecen** en la tabla pero **ya no se actualizan**:
- `total` → Ahora se calcula en vistas desde evt_ingresos
- `total_gastos` → Ahora se calcula en vistas desde evt_gastos
- `utilidad` → Ahora se calcula en vistas (ingresos - gastos)
- `margen_utilidad` → Ahora se calcula en vistas

### ✅ CAMPOS QUE SE MANTIENEN EN evt_eventos
Estos son para **proyecciones** (estimados), NO para valores reales:
- `ganancia_estimada` - Ingreso proyectado
- `gastos_estimados` - Gastos proyectados
- `utilidad_estimada` - Utilidad proyectada
- `margen_estimado` - Margen proyectado

### ✅ NUEVOS CÁLCULOS EN VISTAS
Las vistas ahora tienen:
- `total` / `ingreso_real` - SUM de evt_ingresos
- `total_gastos` / `gastos_reales` - SUM de evt_gastos
- `utilidad` - ingresos - gastos
- `margen_utilidad` - (utilidad / ingresos) * 100

---

## 🔍 VERIFICACIÓN POST-EJECUCIÓN

### Verificar en SQL Editor:
```sql
-- Ver eventos con totales calculados
SELECT 
  nombre_proyecto,
  total as ingresos,
  total_gastos as gastos,
  utilidad,
  margen_utilidad
FROM vw_eventos_completos
LIMIT 10;

-- Ver master de facturación
SELECT 
  evento_nombre,
  total,
  total_gastos,
  utilidad,
  status_pago
FROM vw_master_facturacion
LIMIT 10;

-- Contar registros
SELECT 
  'evt_gastos' as tabla, 
  COUNT(*) as total 
FROM evt_gastos WHERE activo = true
UNION ALL
SELECT 
  'evt_ingresos' as tabla, 
  COUNT(*) as total 
FROM evt_ingresos WHERE activo = true;
```

---

## 🚨 SOLUCIÓN DE PROBLEMAS

### Problema: "View already exists"
**Solución**: El script usa `DROP VIEW IF EXISTS`, debería funcionar. Si persiste:
```sql
DROP VIEW IF EXISTS vw_eventos_completos CASCADE;
DROP VIEW IF EXISTS vw_master_facturacion CASCADE;
```
Luego re-ejecutar el script.

### Problema: "Permission denied"
**Solución**: Asegurarse de estar conectado con las credenciales correctas en Supabase Dashboard.

### Problema: "Column does not exist"
**Solución**: Alguna columna fue renombrada o eliminada. Verificar estructura de tablas:
```sql
\d evt_gastos
\d evt_ingresos
\d evt_eventos
```

### Problema: Frontend muestra datos incorrectos
**Solución**: 
1. Limpiar caché del navegador
2. Reiniciar servidor: `npm run dev`
3. Verificar que las vistas tengan datos:
```sql
SELECT COUNT(*) FROM vw_eventos_completos;
SELECT COUNT(*) FROM vw_master_facturacion;
```

---

## 🎯 RESULTADO ESPERADO

Después de ejecutar el script:

1. ✅ **Consistencia de Datos**: Los totales en las vistas siempre coincidirán con las sumas reales de evt_gastos y evt_ingresos

2. ✅ **Sin Triggers Problemáticos**: No más conflictos por triggers que actualizan evt_eventos

3. ✅ **Rendimiento Mejorado**: Las vistas utilizan subconsultas LATERAL optimizadas

4. ✅ **Facilidad de Mantenimiento**: Solo hay que modificar evt_gastos/evt_ingresos, las vistas se actualizan automáticamente

5. ✅ **Backups de Seguridad**: Si algo sale mal, hay tablas de backup para restaurar

---

## 📞 SOPORTE

Si encuentra problemas:
1. Revisar la sección "Solución de Problemas" arriba
2. Verificar los logs del script en el SQL Editor
3. Revisar las tablas de backup creadas
4. En caso de error crítico, restaurar desde backup:
```sql
-- Restaurar datos (solo si es necesario)
TRUNCATE TABLE evt_gastos CASCADE;
INSERT INTO evt_gastos SELECT * FROM evt_gastos_backup_20251027;

TRUNCATE TABLE evt_ingresos CASCADE;
INSERT INTO evt_ingresos SELECT * FROM evt_ingresos_backup_20251027;
```

---

## ✅ CHECKLIST DE EJECUCIÓN

- [ ] Acceder a Supabase Dashboard
- [ ] Abrir SQL Editor
- [ ] Copiar script CORRECCION_GASTOS_INGRESOS.sql
- [ ] Ejecutar script completo
- [ ] Verificar que no haya errores
- [ ] Probar vistas con consultas de verificación
- [ ] Reiniciar servidor frontend
- [ ] Probar Master de Facturación
- [ ] Probar Estados Contables
- [ ] Probar Análisis Financiero
- [ ] Probar Reportes Bancarios
- [ ] Verificar que totales sean correctos
- [ ] Marcar como completado ✅

---

**ÚLTIMA ACTUALIZACIÓN**: 2025-10-27
**VERSIÓN DEL SCRIPT**: 1.0
**RESPONSABLE**: Sistema de Corrección Automática
