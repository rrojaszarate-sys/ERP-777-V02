# Mapa de Dependencias: División de Provisiones

Este documento mapea todas las dependencias que se verán afectadas por la división del campo `provisiones` en 4 categorías.

---

## 🗺️ Diagrama de Dependencias Completo

```
┌──────────────────────────────────────────────────────────────────────────┐
│                          BASE DE DATOS (PostgreSQL)                       │
└──────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ↓
┌──────────────────────────────────────────────────────────────────────────┐
│                      evt_eventos (Tabla Principal)                        │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  provision_combustible_peaje    NUMERIC  ← NUEVO                        │
│  provision_materiales           NUMERIC  ← NUEVO                        │
│  provision_recursos_humanos     NUMERIC  ← NUEVO                        │
│  provision_solicitudes_pago     NUMERIC  ← NUEVO                        │
│  provisiones                    NUMERIC  ← MODIFICADO (calculado)       │
│                                                                           │
└──────────────────────────────────────────────────────────────────────────┘
                    │                           │
                    ├───────────────────────────┼───────────────┐
                    ↓                           ↓               ↓
    ┌───────────────────────────┐  ┌─────────────────────┐  ┌──────────────┐
    │ TRIGGER                   │  │ ÍNDICES             │  │ COMENTARIOS  │
    ├───────────────────────────┤  ├─────────────────────┤  ├──────────────┤
    │ sync_provisiones_total    │  │ idx_provision_*     │  │ COMMENT ON   │
    │ → Sincroniza total        │  │ → 4 índices nuevos  │  │ COLUMN ...   │
    └───────────────────────────┘  └─────────────────────┘  └──────────────┘
                    │
                    ↓
┌──────────────────────────────────────────────────────────────────────────┐
│                            VISTAS SQL (Views)                             │
└──────────────────────────────────────────────────────────────────────────┘
                    │
                    ├─────────────────────────┬─────────────────────────┐
                    ↓                         ↓                         ↓
    ┌───────────────────────────┐  ┌─────────────────────┐  ┌──────────────────┐
    │ vw_eventos_analisis_      │  │ vw_eventos_         │  │ FUNCIÓN          │
    │ financiero                │  │ completos           │  │ get_evento_      │
    ├───────────────────────────┤  ├─────────────────────┤  │ financial_       │
    │ ✓ Desglose provisiones    │  │ ✓ Agrega campos     │  │ summary          │
    │ ✓ Gastos por categoría    │  │   desglosados       │  ├──────────────────┤
    │ ✓ Variación por categoría │  │ ✓ Gastos por cat.   │  │ ✓ Retorna 7      │
    │ ✓ Status por categoría    │  │                     │  │   filas (con     │
    └───────────────────────────┘  └─────────────────────┘  │   desglose)      │
                    │                         │              └──────────────────┘
                    └─────────────────────────┼───────────────────┐
                                              ↓                   ↓
┌──────────────────────────────────────────────────────────────────────────┐
│                          BACKEND (TypeScript)                             │
└──────────────────────────────────────────────────────────────────────────┘
                                              │
                                              ↓
                    ┌─────────────────────────────────────────┐
                    │        src/types/Event.ts               │
                    ├─────────────────────────────────────────┤
                    │ interface Event {                       │
                    │   provision_combustible_peaje?: number  │
                    │   provision_materiales?: number         │
                    │   provision_recursos_humanos?: number   │
                    │   provision_solicitudes_pago?: number   │
                    │   provisiones?: number                  │
                    │ }                                       │
                    │                                         │
                    │ interface ProvisionesDesglosadas {      │
                    │   combustible_peaje: number             │
                    │   materiales: number                    │
                    │   recursos_humanos: number              │
                    │   solicitudes_pago: number              │
                    │   total: number                         │
                    │ }                                       │
                    │                                         │
                    │ interface GastosPorCategoria { ... }    │
                    │ interface VariacionPorCategoria { ... } │
                    └─────────────────────────────────────────┘
                                    │
                                    ↓
        ┌───────────────────────────┴───────────────────────────┐
        ↓                                                       ↓
┌─────────────────────────────┐              ┌─────────────────────────────┐
│ HOOKS                       │              │ SERVICIOS                   │
├─────────────────────────────┤              ├─────────────────────────────┤
│ useEventFinancialAnalysis   │              │ financialExportService      │
├─────────────────────────────┤              ├─────────────────────────────┤
│ ✓ calculateEventAnalysis()  │              │ ✓ prepareDataForExport()    │
│   → Procesa desglose        │              │   → Incluye desglose        │
│   → Calcula variaciones     │              │ ✓ generateCSV()             │
│   → Determina status        │              │   → Headers nuevos          │
│                             │              │ ✓ generateExcel()           │
│ ✓ calculatePortfolio        │              │   → Columnas desglosadas    │
│   Summary()                 │              │ ✓ generateHTMLReport()      │
│   → Suma por categoría      │              │   → Tabla con desglose      │
│   → Desviación global       │              │                             │
└─────────────────────────────┘              └─────────────────────────────┘
                    │                                         │
                    └─────────────────┬───────────────────────┘
                                      ↓
┌──────────────────────────────────────────────────────────────────────────┐
│                       FRONTEND (Componentes React)                        │
└──────────────────────────────────────────────────────────────────────────┘
                                      │
        ┌─────────────────────────────┼─────────────────────────────┐
        ↓                             ↓                             ↓
┌─────────────────┐        ┌─────────────────────┐      ┌──────────────────┐
│ EventForm.tsx   │        │ EventFinancial      │      │ FinancialBalance │
│ (CRÍTICO)       │        │ Comparison.tsx      │      │ Panel.tsx        │
├─────────────────┤        │ (ALTO)              │      │ (MEDIO)          │
│ ✓ 4 inputs      │        ├─────────────────────┤      ├──────────────────┤
│   desglosados   │        │ ✓ Comparación por   │      │ ✓ Desglose       │
│ ✓ Cálculo total │        │   categoría         │      │   colapsable     │
│   en tiempo     │        │ ✓ CategoryComparison│      │                  │
│   real          │        │   Row (NUEVO)       │      │                  │
│ ✓ Validación    │        │ ✓ Status visual     │      │                  │
│   margen 35%    │        │ ✓ Porcentajes       │      │                  │
│ ✓ Guardar 4     │        │   variación         │      │                  │
│   campos        │        │                     │      │                  │
└─────────────────┘        └─────────────────────┘      └──────────────────┘
        │
        ↓
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                          │
│  ┌─────────────────────────┐  ┌────────────────────────────────────┐  │
│  │ Provisiones por         │  │ Combustible y Peajes ($)           │  │
│  │ Categoría               │  │ [__________15,000.00__________]    │  │
│  │                         │  │                                    │  │
│  │                         │  │ Materiales ($)                     │  │
│  │                         │  │ [__________30,000.00__________]    │  │
│  │                         │  │                                    │  │
│  │                         │  │ Recursos Humanos ($)               │  │
│  │                         │  │ [__________40,000.00__________]    │  │
│  │                         │  │                                    │  │
│  │                         │  │ Solicitudes de Pago ($)            │  │
│  │                         │  │ [__________15,000.00__________]    │  │
│  └─────────────────────────┘  └────────────────────────────────────┘  │
│                                                                          │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │ 💡 Total Provisiones: $100,000.00                               │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘

        ↓                             ↓                             ↓
┌─────────────────┐        ┌─────────────────────┐      ┌──────────────────┐
│ Provisiones     │        │ EventosListPage.tsx │      │                  │
│ BreakdownChart  │        │ (ALTO)              │      │                  │
│ .tsx (NUEVO)    │        ├─────────────────────┤      │                  │
├─────────────────┤        │ ✓ Columnas opcionales│     │                  │
│ ✓ Gráfica pie   │        │   (provision_*)     │      │                  │
│   con recharts  │        │ ✓ Filtros por       │      │                  │
│ ✓ 4 segmentos   │        │   categoría         │      │                  │
│ ✓ Porcentajes   │        │ ✓ Tooltip desglose  │      │                  │
│ ✓ Tabla resumen │        │ ✓ Ordenamiento      │      │                  │
└─────────────────┘        └─────────────────────┘      └──────────────────┘
```

---

## 📊 Matriz de Impacto

### Nivel de Prioridad

| Componente | Prioridad | Impacto | Complejidad | Horas |
|------------|-----------|---------|-------------|-------|
| **BASE DE DATOS** |
| evt_eventos (tabla) | 🔴 Crítica | Alto | Media | 2h |
| vw_eventos_analisis_financiero | 🔴 Crítica | Alto | Alta | 3h |
| sync_provisiones_total (trigger) | 🔴 Crítica | Alto | Media | 1h |
| vw_eventos_completos | 🟡 Media | Medio | Baja | 1h |
| get_evento_financial_summary | 🟡 Media | Medio | Media | 1h |
| **BACKEND** |
| Event.ts (tipos) | 🔴 Crítica | Alto | Baja | 1h |
| useEventFinancialAnalysis | 🔴 Crítica | Alto | Alta | 3h |
| financialExportService | 🟡 Media | Medio | Media | 2h |
| **FRONTEND** |
| EventForm.tsx | 🔴 Crítica | Alto | Media | 3h |
| EventFinancialComparison.tsx | 🟡 Alta | Alto | Alta | 3h |
| ProvisionesBreakdownChart.tsx | 🟢 Baja | Medio | Media | 2h |
| FinancialBalancePanel.tsx | 🟢 Baja | Bajo | Baja | 1h |
| EventosListPage.tsx | 🟡 Media | Medio | Media | 2h |

**Total estimado:** 25 horas

---

## 🔗 Dependencias entre Componentes

### Cadena Crítica (Ruta de Implementación)

```
1. BASE DE DATOS (evt_eventos)
   ↓ DEPENDE
2. TRIGGER (sync_provisiones_total)
   ↓ DEPENDE
3. VISTAS (vw_eventos_analisis_financiero)
   ↓ DEPENDE
4. TIPOS (Event.ts)
   ↓ DEPENDE
5. HOOKS (useEventFinancialAnalysis)
   ↓ DEPENDE
6. COMPONENTES (EventForm, EventFinancialComparison, etc.)
   ↓ DEPENDE
7. SERVICIOS (financialExportService)
```

**Nota:** No se puede avanzar al siguiente nivel sin completar el anterior.

---

## 📁 Archivos Afectados (22 archivos)

### Base de Datos (5 archivos)
```
migrations/
  └── 010_divide_provisiones_categories.sql (NUEVO)
      ├── ALTER TABLE evt_eventos (4 columnas nuevas)
      ├── CREATE TRIGGER sync_provisiones_total
      ├── CREATE OR REPLACE VIEW vw_eventos_analisis_financiero
      ├── CREATE OR REPLACE VIEW vw_eventos_completos
      ├── CREATE OR REPLACE FUNCTION get_evento_financial_summary
      ├── CREATE INDEX (4 índices nuevos)
      └── CREATE FUNCTION distribute_existing_provisiones
```

### Tipos TypeScript (1 archivo)
```
src/types/
  └── Event.ts (MODIFICAR)
      ├── interface Event (4 campos nuevos)
      ├── interface ProvisionesDesglosadas (NUEVO)
      ├── interface GastosPorCategoria (NUEVO)
      ├── interface VariacionPorCategoria (NUEVO)
      ├── interface FinancialProjection (modificar)
      ├── interface FinancialResult (modificar)
      └── interface FinancialComparison (modificar)
```

### Hooks (1 archivo)
```
src/modules/eventos/hooks/
  └── useEventFinancialAnalysis.ts (MODIFICAR)
      ├── calculateEventAnalysis() (actualizar)
      ├── calculatePortfolioSummary() (actualizar)
      └── getStatusPresupuestal() (NUEVA función helper)
```

### Servicios (1 archivo)
```
src/modules/eventos/services/
  └── financialExportService.ts (MODIFICAR)
      ├── prepareDataForExport() (agregar desglose)
      ├── generateCSV() (headers nuevos)
      ├── generateExcel() (columnas nuevas)
      └── generateHTMLReport() (tabla actualizada)
```

### Componentes React (5 archivos)
```
src/modules/eventos/components/
  ├── events/
  │   ├── EventForm.tsx (MODIFICAR - CRÍTICO)
  │   │   ├── Estado: 4 campos provision_*
  │   │   ├── Inputs: 4 campos numéricos
  │   │   ├── Cálculo: provisionesTotal
  │   │   └── Guardado: incluir 4 campos
  │   │
  │   └── EventFinancialComparison.tsx (MODIFICAR)
  │       ├── Componente CategoryComparisonRow (NUEVO)
  │       ├── Mapeo variaciones_por_categoria
  │       └── Visualización con colores por status
  │
  └── financial/
      ├── FinancialBalancePanel.tsx (MODIFICAR)
      │   └── Sección colapsable con desglose
      │
      └── ProvisionesBreakdownChart.tsx (NUEVO)
          ├── Gráfica pie con recharts
          ├── 4 segmentos (categorías)
          └── Tabla resumen
```

### Páginas (1 archivo)
```
src/modules/eventos/
  └── EventosListPage.tsx (MODIFICAR)
      ├── Configuración columnas visibles
      ├── Definición 4 columnas nuevas
      ├── Filtros por rango provisiones
      ├── Filtro por categoría específica
      └── Tooltip con desglose
```

### Documentación (3 archivos)
```
docs/
  ├── PLAN_DIVISION_PROVISIONES.md (NUEVO)
  ├── RESUMEN_EJECUTIVO_DIVISION_PROVISIONES.md (NUEVO)
  ├── MAPA_DEPENDENCIAS_PROVISIONES.md (NUEVO - este archivo)
  └── GUIA_USO_PROVISIONES.md (MODIFICAR - actualizar con desglose)
```

### Tests (5 archivos - NUEVOS)
```
src/modules/eventos/__tests__/
  ├── useEventFinancialAnalysis.test.ts
  │   ├── Test: cálculo provisiones desglosadas
  │   ├── Test: variaciones por categoría
  │   └── Test: status presupuestal por categoría
  │
  ├── EventForm.test.tsx
  │   ├── Test: renderizado 4 inputs
  │   ├── Test: cálculo total en tiempo real
  │   └── Test: guardado con 4 campos
  │
  ├── EventFinancialComparison.test.tsx
  │   ├── Test: renderizado CategoryComparisonRow
  │   └── Test: colores por status
  │
  ├── ProvisionesBreakdownChart.test.tsx
  │   ├── Test: renderizado gráfica
  │   └── Test: tabla resumen
  │
  └── financialExportService.test.ts
      ├── Test: CSV con desglose
      └── Test: Excel con columnas nuevas
```

---

## 🧪 Puntos de Integración (Testing)

### 1. Base de Datos → Backend

**Test:** Validar que el trigger sincroniza correctamente

```sql
-- Insert test
INSERT INTO evt_eventos (
  nombre_proyecto,
  provision_combustible_peaje,
  provision_materiales,
  provision_recursos_humanos,
  provision_solicitudes_pago
) VALUES (
  'Evento Test',
  10000,
  20000,
  30000,
  15000
);

-- Validar
SELECT provisiones FROM evt_eventos WHERE nombre_proyecto = 'Evento Test';
-- Resultado esperado: 75000
```

### 2. Backend (Hook) → Frontend (Componente)

**Test:** Validar que useEventFinancialAnalysis procesa correctamente

```typescript
// Test en useEventFinancialAnalysis.test.ts
test('calcula provisiones desglosadas correctamente', () => {
  const event: EventoCompleto = {
    provision_combustible_peaje: 10000,
    provision_materiales: 20000,
    provision_recursos_humanos: 30000,
    provision_solicitudes_pago: 15000,
    provisiones: 75000,
    // ...
  };

  const analysis = calculateEventAnalysis(event);

  expect(analysis.projection.provisiones_desglosadas).toEqual({
    combustible_peaje: 10000,
    materiales: 20000,
    recursos_humanos: 30000,
    solicitudes_pago: 15000,
    total: 75000,
  });
});
```

### 3. Frontend (Form) → Backend (Save)

**Test:** Validar que EventForm guarda los 4 campos

```typescript
// Test en EventForm.test.tsx
test('guarda provisiones desglosadas correctamente', async () => {
  const mockOnSave = jest.fn();

  render(<EventForm onSave={mockOnSave} />);

  // Llenar inputs
  fireEvent.change(screen.getByLabelText(/Combustible/), {
    target: { value: '10000' }
  });
  fireEvent.change(screen.getByLabelText(/Materiales/), {
    target: { value: '20000' }
  });
  // ... (llenar otros 2)

  // Submit
  fireEvent.click(screen.getByText('Guardar'));

  // Validar que onSave fue llamado con datos correctos
  await waitFor(() => {
    expect(mockOnSave).toHaveBeenCalledWith(
      expect.objectContaining({
        provision_combustible_peaje: 10000,
        provision_materiales: 20000,
        provision_recursos_humanos: 30000,
        provision_solicitudes_pago: 15000,
        provisiones: 75000,
      })
    );
  });
});
```

---

## 🔍 Queries de Validación

### 1. Validar integridad de datos post-migración

```sql
-- Todos los registros deben tener provisiones = suma de categorías
SELECT
  id,
  clave_evento,
  provisiones AS total_provisiones,
  (COALESCE(provision_combustible_peaje, 0) +
   COALESCE(provision_materiales, 0) +
   COALESCE(provision_recursos_humanos, 0) +
   COALESCE(provision_solicitudes_pago, 0)) AS suma_categorias,
  provisiones - (COALESCE(provision_combustible_peaje, 0) +
                 COALESCE(provision_materiales, 0) +
                 COALESCE(provision_recursos_humanos, 0) +
                 COALESCE(provision_solicitudes_pago, 0)) AS diferencia
FROM evt_eventos
WHERE deleted_at IS NULL
  AND ABS(provisiones - (COALESCE(provision_combustible_peaje, 0) +
                         COALESCE(provision_materiales, 0) +
                         COALESCE(provision_recursos_humanos, 0) +
                         COALESCE(provision_solicitudes_pago, 0))) > 0.01
ORDER BY diferencia DESC;

-- Resultado esperado: 0 registros (ninguna diferencia)
```

### 2. Validar distribución de provisiones existentes

```sql
-- Ver cómo se distribuyeron las provisiones
SELECT
  clave_evento,
  provisiones AS total,
  provision_combustible_peaje AS combustible,
  ROUND((provision_combustible_peaje / NULLIF(provisiones, 0)) * 100, 2) AS pct_combustible,
  provision_materiales AS materiales,
  ROUND((provision_materiales / NULLIF(provisiones, 0)) * 100, 2) AS pct_materiales,
  provision_recursos_humanos AS rh,
  ROUND((provision_recursos_humanos / NULLIF(provisiones, 0)) * 100, 2) AS pct_rh,
  provision_solicitudes_pago AS sps,
  ROUND((provision_solicitudes_pago / NULLIF(provisiones, 0)) * 100, 2) AS pct_sps
FROM evt_eventos
WHERE deleted_at IS NULL
  AND provisiones > 0
ORDER BY provisiones DESC
LIMIT 10;
```

### 3. Validar que las vistas funcionan correctamente

```sql
-- Probar vista vw_eventos_analisis_financiero
SELECT
  clave_evento,
  provision_combustible_peaje,
  gastos_combustible_pagados,
  variacion_combustible_pct,
  status_presupuestal_combustible,
  provision_materiales,
  gastos_materiales_pagados,
  variacion_materiales_pct,
  status_presupuestal_materiales
FROM vw_eventos_analisis_financiero
WHERE provisiones_total > 0
LIMIT 5;

-- Resultado esperado: Datos correctos con cálculos precisos
```

### 4. Validar performance de queries

```sql
-- Analizar performance de vista con nuevos campos
EXPLAIN ANALYZE
SELECT *
FROM vw_eventos_analisis_financiero
WHERE provisiones_total > 50000
  AND status_presupuestal_combustible = 'excede_presupuesto';

-- Resultado esperado: Execution time < 2000ms
```

---

## 📈 Métricas de Monitoreo Post-Deploy

### 1. Errores en Logs

```bash
# Monitorear errores relacionados con provisiones
tail -f /var/log/erp/application.log | grep -i "provision"

# Buscar errores de SQL
tail -f /var/log/postgres/postgresql.log | grep -i "evt_eventos"
```

### 2. Performance de Queries

```sql
-- Ver queries lentas relacionadas con provisiones
SELECT
  query,
  mean_exec_time,
  calls
FROM pg_stat_statements
WHERE query LIKE '%provision%'
  AND mean_exec_time > 1000
ORDER BY mean_exec_time DESC;
```

### 3. Adopción de Funcionalidad

```sql
-- Eventos creados con desglose de provisiones (últimos 30 días)
SELECT
  COUNT(*) AS total_eventos,
  COUNT(CASE WHEN provision_combustible_peaje > 0 THEN 1 END) AS con_combustible,
  COUNT(CASE WHEN provision_materiales > 0 THEN 1 END) AS con_materiales,
  COUNT(CASE WHEN provision_recursos_humanos > 0 THEN 1 END) AS con_rh,
  COUNT(CASE WHEN provision_solicitudes_pago > 0 THEN 1 END) AS con_sps,
  ROUND(COUNT(CASE WHEN provision_combustible_peaje > 0 THEN 1 END) * 100.0 / COUNT(*), 2) AS pct_con_desglose
FROM evt_eventos
WHERE created_at >= NOW() - INTERVAL '30 days'
  AND deleted_at IS NULL;

-- Objetivo: pct_con_desglose > 75% después de 30 días
```

---

## 🚨 Puntos Críticos de Fallo

### 1. Trigger no sincroniza correctamente

**Síntoma:**
```
provisiones ≠ suma de categorías
```

**Diagnóstico:**
```sql
SELECT * FROM evt_eventos WHERE ABS(provisiones - (
  COALESCE(provision_combustible_peaje, 0) +
  COALESCE(provision_materiales, 0) +
  COALESCE(provision_recursos_humanos, 0) +
  COALESCE(provision_solicitudes_pago, 0)
)) > 0.01;
```

**Solución:**
```sql
-- Forzar recalcular provisiones
UPDATE evt_eventos
SET provisiones = (
  COALESCE(provision_combustible_peaje, 0) +
  COALESCE(provision_materiales, 0) +
  COALESCE(provision_recursos_humanos, 0) +
  COALESCE(provision_solicitudes_pago, 0)
)
WHERE deleted_at IS NULL;
```

### 2. Vista retorna NULL en campos nuevos

**Síntoma:**
```
gastos_combustible_pagados = NULL cuando debería ser 0
```

**Diagnóstico:**
```sql
SELECT categoria_id, COUNT(*)
FROM evt_gastos
WHERE evento_id = 1936
GROUP BY categoria_id;

-- Verificar que existan categorías
SELECT * FROM evt_categorias_gastos
WHERE nombre IN ('Combustible/Peaje', 'Materiales', 'Recursos Humanos', 'Solicitudes de Pago');
```

**Solución:**
```sql
-- Crear categorías faltantes
INSERT INTO evt_categorias_gastos (nombre, descripcion, activo)
VALUES
  ('Combustible/Peaje', 'Gastos de combustible y peajes', true),
  ('Materiales', 'Materiales y suministros', true),
  ('Recursos Humanos', 'Pago de personal', true),
  ('Solicitudes de Pago', 'Pagos a proveedores', true)
ON CONFLICT (nombre) DO NOTHING;
```

### 3. Frontend no muestra campos desglosados

**Síntoma:**
```
EventForm solo muestra input de provisiones total
```

**Diagnóstico:**
```typescript
// Verificar que formData tenga los 4 campos
console.log('formData:', formData);

// Verificar que event tenga los campos de BD
console.log('event provision_combustible_peaje:', event?.provision_combustible_peaje);
```

**Solución:**
```typescript
// Asegurar que el estado se inicialice correctamente
const [formData, setFormData] = useState({
  provision_combustible_peaje: event?.provision_combustible_peaje || 0,
  provision_materiales: event?.provision_materiales || 0,
  provision_recursos_humanos: event?.provision_recursos_humanos || 0,
  provision_solicitudes_pago: event?.provision_solicitudes_pago || 0,
});
```

### 4. Exportación a Excel/CSV no incluye desglose

**Síntoma:**
```
CSV generado no tiene columnas provision_combustible, etc.
```

**Diagnóstico:**
```typescript
// Verificar que prepareDataForExport incluya los campos
const data = prepareDataForExport(eventsAnalysis, portfolioSummary);
console.log('Keys en data:', Object.keys(data.events[0]));
```

**Solución:**
```typescript
// Asegurar que el servicio incluya los campos
prepareDataForExport(eventsAnalysis, portfolioSummary) {
  return {
    events: eventsAnalysis.map(analysis => ({
      // ... campos existentes
      provision_combustible: analysis.projection.provisiones_desglosadas.combustible_peaje,
      provision_materiales: analysis.projection.provisiones_desglosadas.materiales,
      // ... etc
    }))
  };
}
```

---

## ✅ Checklist de Validación por Componente

### Base de Datos
- [ ] Tabla evt_eventos tiene 4 columnas nuevas
- [ ] Trigger sync_provisiones_total existe y está activo
- [ ] Vista vw_eventos_analisis_financiero retorna datos correctos
- [ ] Vista vw_eventos_completos tiene campos desglosados
- [ ] Función get_evento_financial_summary retorna 7 filas
- [ ] 4 índices nuevos existen y están optimizados
- [ ] Todos los eventos tienen provisiones = suma de categorías

### Backend
- [ ] Event.ts tiene interfaces nuevas sin errores de TypeScript
- [ ] useEventFinancialAnalysis compila sin errores
- [ ] calculateEventAnalysis retorna desglose correcto
- [ ] financialExportService incluye campos nuevos

### Frontend
- [ ] EventForm renderiza 4 inputs
- [ ] EventForm calcula total correctamente
- [ ] EventForm guarda 4 campos en BD
- [ ] EventFinancialComparison muestra CategoryComparisonRow
- [ ] ProvisionesBreakdownChart renderiza gráfica pie
- [ ] FinancialBalancePanel muestra desglose colapsable
- [ ] EventosListPage tiene columnas opcionales
- [ ] Filtros funcionan correctamente

### Tests
- [ ] Tests unitarios pasan (useEventFinancialAnalysis)
- [ ] Tests de integración pasan (EventForm)
- [ ] Tests de componentes pasan (EventFinancialComparison)
- [ ] Coverage > 80%

### Documentación
- [ ] PLAN_DIVISION_PROVISIONES.md creado
- [ ] RESUMEN_EJECUTIVO_DIVISION_PROVISIONES.md creado
- [ ] MAPA_DEPENDENCIAS_PROVISIONES.md creado
- [ ] GUIA_USO_PROVISIONES.md actualizado

---

**Última actualización:** 29 de Octubre de 2025
**Versión:** 1.0
**Mantenedor:** Equipo ERP-777
