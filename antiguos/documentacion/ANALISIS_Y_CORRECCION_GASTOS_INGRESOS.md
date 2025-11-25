# ANÁLISIS Y CORRECCIÓN DE GASTOS E INGRESOS

## FECHA: 2025-10-27

## 1. SITUACIÓN ACTUAL

### Tablas Principales Identificadas:
- ✅ **evt_gastos** - Tabla de gastos por evento
- ✅ **evt_ingresos** - Tabla de ingresos por evento
- ✅ **evt_eventos** - Tabla maestra de eventos

### Vistas Actuales:
- **vw_eventos_completos** - Vista consolidada de eventos con joins
- **vw_master_facturacion** - Vista para master de facturación
- **vw_eventos_analisis_financiero** - Vista para análisis financiero

### Problema Identificado:
Las vistas actuales **NO** utilizan las tablas `evt_gastos` y `evt_ingresos` para calcular totales.
En su lugar, dependen de campos calculados en la tabla `evt_eventos`:
- `e.total` - Debería ser SUM de evt_ingresos
- `e.utilidad` - Debería ser (ingresos - gastos)
- `e.total_gastos` - Debería ser SUM de evt_gastos

## 2. CAMPOS EN evt_eventos QUE DEBEN ELIMINARSE

Los siguientes campos en `evt_eventos` son redundantes y causan inconsistencias:
- ❌ `total` - Calculado de evt_ingresos
- ❌ `utilidad` - Calculado de (ingresos - gastos)
- ❌ `total_gastos` - Calculado de evt_gastos
- ❌ `margen_utilidad` - Calculado de (utilidad / total) * 100
- ❌ Cualquier otro campo calculado que duplique información

## 3. CAMPOS QUE DEBEN MANTENERSE EN evt_eventos

Campos de proyección/estimación (para comparar contra real):
- ✅ `ganancia_estimada` - Ingreso proyectado
- ✅ `gastos_estimados` - Gastos proyectados
- ✅ `utilidad_estimada` - Utilidad proyectada
- ✅ `margen_estimado` - Margen proyectado

## 4. TRIGGERS ACTUALES QUE DEBEN MODIFICARSE

### Triggers en evt_gastos:
```sql
-- Debe actualizar totales en evt_eventos basándose en SUM de evt_gastos
CREATE OR REPLACE FUNCTION calculate_expense_totals()
```

### Triggers en evt_ingresos:
```sql
-- Debe actualizar totales en evt_eventos basándose en SUM de evt_ingresos
CREATE OR REPLACE FUNCTION calculate_income_totals()
```

## 5. PLAN DE CORRECCIÓN

### Paso 1: Backup de datos actuales
- Exportar evt_gastos
- Exportar evt_ingresos
- Exportar evt_eventos

### Paso 2: Eliminar campos redundantes de evt_eventos
```sql
ALTER TABLE evt_eventos 
  DROP COLUMN IF EXISTS total,
  DROP COLUMN IF EXISTS utilidad,
  DROP COLUMN IF EXISTS total_gastos,
  DROP COLUMN IF EXISTS margen_utilidad;
```

### Paso 3: Recrear vistas con cálculos desde evt_gastos/evt_ingresos
```sql
CREATE OR REPLACE VIEW vw_eventos_completos AS
SELECT
  e.*,
  -- Cálculo de totales desde evt_ingresos
  COALESCE(SUM(i.total), 0) as total_ingresos,
  -- Cálculo de totales desde evt_gastos  
  COALESCE(SUM(g.total), 0) as total_gastos,
  -- Cálculo de utilidad
  COALESCE(SUM(i.total), 0) - COALESCE(SUM(g.total), 0) as utilidad,
  -- Cálculo de margen
  CASE 
    WHEN SUM(i.total) > 0 
    THEN ((SUM(i.total) - SUM(g.total)) / SUM(i.total)) * 100
    ELSE 0
  END as margen_utilidad
FROM evt_eventos e
LEFT JOIN evt_ingresos i ON e.id = i.evento_id AND i.activo = true
LEFT JOIN evt_gastos g ON e.id = g.evento_id AND g.activo = true
GROUP BY e.id;
```

### Paso 4: Actualizar triggers
- Eliminar triggers que calculan en evt_eventos
- Crear triggers que solo validen integridad

### Paso 5: Validar integridad
- Comparar totales antes/después
- Verificar que master facturación funcione
- Verificar que análisis financiero funcione

## 6. TABLAS A ELIMINAR (SI EXISTEN)

Buscar y eliminar cualquier tabla redundante que duplique funcionalidad:
- `evt_facturas` (si existe y duplica evt_ingresos)
- `evt_pagos` (si existe y duplica evt_ingresos)
- Cualquier tabla temporal o de backup no utilizada

## 7. COMPONENTES FRONTEND A ACTUALIZAR

### Archivos que deben modificarse:
1. `MasterFacturacionPage.tsx` - Usar vw_master_facturacion actualizada
2. `AccountingStateDashboard.tsx` - Usar evt_gastos/evt_ingresos directamente
3. `FinancialAnalysisPage.tsx` - Usar vw_eventos_completos actualizada
4. `BankAccountReportsPage.tsx` - Ya usa evt_gastos directamente ✅

## 8. TESTING REQUERIDO

### Casos de prueba:
1. ✅ Crear evento nuevo
2. ✅ Agregar gasto y verificar total_gastos
3. ✅ Agregar ingreso y verificar total_ingresos
4. ✅ Verificar cálculo de utilidad
5. ✅ Verificar cálculo de margen
6. ✅ Exportar reportes y validar cifras
7. ✅ Verificar master de facturación
8. ✅ Verificar estados contables

## PRÓXIMOS PASOS:
1. Ejecutar script de análisis de BD
2. Crear backup completo
3. Ejecutar script de corrección
4. Validar cambios
5. Actualizar frontend si es necesario
