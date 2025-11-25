# Plan de Implementación: División de Provisiones en 4 Categorías

**Fecha:** 29 de Octubre de 2025
**Branch sugerido:** `feature/division-provisiones`
**Prioridad:** Alta
**Complejidad:** Alta (15-20 horas de desarrollo)

---

## 📋 Resumen Ejecutivo

### Objetivo
Dividir el campo único `provisiones` en la tabla `evt_eventos` en 4 categorías específicas para mejorar el control, seguimiento y análisis de gastos proyectados:

1. **Combustible/Peaje** (`provision_combustible_peaje`)
2. **Materiales** (`provision_materiales`)
3. **Recursos Humanos (RH)** (`provision_recursos_humanos`)
4. **Solicitudes de Pago (SPs)** (`provision_solicitudes_pago`)

### Beneficios
- ✅ Mayor granularidad en la proyección de gastos
- ✅ Comparación detallada por categoría (estimado vs real)
- ✅ Identificación precisa de desviaciones presupuestales
- ✅ Análisis de rentabilidad por tipo de gasto
- ✅ Mejores reportes financieros para toma de decisiones

### Impacto
- **Base de datos:** 1 tabla modificada, 3 vistas actualizadas, 1 función actualizada
- **Backend:** 2 tipos TypeScript modificados
- **Frontend:** 5 componentes modificados, 1 hook actualizado, 1 servicio modificado
- **Migraciones:** 1 migración nueva con lógica de distribución

---

## 🎯 Alcance del Cambio

### 1. Cambios en Base de Datos

#### 1.1 Tabla `evt_eventos` - Nuevos Campos

```sql
-- AGREGAR 4 campos nuevos (mantener provisiones como campo calculado)
ALTER TABLE evt_eventos
ADD COLUMN provision_combustible_peaje NUMERIC DEFAULT 0,
ADD COLUMN provision_materiales NUMERIC DEFAULT 0,
ADD COLUMN provision_recursos_humanos NUMERIC DEFAULT 0,
ADD COLUMN provision_solicitudes_pago NUMERIC DEFAULT 0;

-- Campo provisiones ahora será GENERATED (computed column)
ALTER TABLE evt_eventos
DROP COLUMN provisiones;

ALTER TABLE evt_eventos
ADD COLUMN provisiones NUMERIC GENERATED ALWAYS AS (
  COALESCE(provision_combustible_peaje, 0) +
  COALESCE(provision_materiales, 0) +
  COALESCE(provision_recursos_humanos, 0) +
  COALESCE(provision_solicitudes_pago, 0)
) STORED;
```

**Ventajas:**
- ✅ Retrocompatibilidad total: `provisiones` sigue existiendo
- ✅ Se calcula automáticamente (no hay riesgo de inconsistencia)
- ✅ Los triggers y vistas existentes siguen funcionando

**Desventajas:**
- ⚠️ PostgreSQL no soporta `GENERATED` columns nativamente hasta v12+
- ⚠️ Alternativa: Usar triggers para mantener `provisiones` sincronizado

#### Alternativa con Triggers (Más Compatible)

```sql
-- Mantener provisiones como campo normal
-- Crear trigger para sincronización automática

CREATE OR REPLACE FUNCTION sync_provisiones_total()
RETURNS TRIGGER AS $$
BEGIN
  NEW.provisiones := COALESCE(NEW.provision_combustible_peaje, 0) +
                     COALESCE(NEW.provision_materiales, 0) +
                     COALESCE(NEW.provision_recursos_humanos, 0) +
                     COALESCE(NEW.provision_solicitudes_pago, 0);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_sync_provisiones
BEFORE INSERT OR UPDATE ON evt_eventos
FOR EACH ROW
EXECUTE FUNCTION sync_provisiones_total();
```

#### 1.2 Índices Nuevos

```sql
-- Índices para optimizar queries por categoría
CREATE INDEX idx_evt_eventos_provision_combustible
ON evt_eventos(provision_combustible_peaje)
WHERE deleted_at IS NULL AND provision_combustible_peaje > 0;

CREATE INDEX idx_evt_eventos_provision_materiales
ON evt_eventos(provision_materiales)
WHERE deleted_at IS NULL AND provision_materiales > 0;

CREATE INDEX idx_evt_eventos_provision_rh
ON evt_eventos(provision_recursos_humanos)
WHERE deleted_at IS NULL AND provision_recursos_humanos > 0;

CREATE INDEX idx_evt_eventos_provision_sps
ON evt_eventos(provision_solicitudes_pago)
WHERE deleted_at IS NULL AND provision_solicitudes_pago > 0;
```

#### 1.3 Comentarios de Documentación

```sql
COMMENT ON COLUMN evt_eventos.provision_combustible_peaje IS
'Provisión estimada para gastos de combustible y peajes del evento.';

COMMENT ON COLUMN evt_eventos.provision_materiales IS
'Provisión estimada para compra de materiales y suministros del evento.';

COMMENT ON COLUMN evt_eventos.provision_recursos_humanos IS
'Provisión estimada para pago de recursos humanos (staff, técnicos, etc.).';

COMMENT ON COLUMN evt_eventos.provision_solicitudes_pago IS
'Provisión estimada para solicitudes de pago (proveedores, servicios externos).';

COMMENT ON COLUMN evt_eventos.provisiones IS
'Total de provisiones (suma automática de las 4 categorías). Campo calculado.';
```

---

### 2. Actualización de Vistas SQL

#### 2.1 Vista `vw_eventos_analisis_financiero` (PRIORIDAD ALTA)

**Archivo:** Nueva migración `010_divide_provisiones_categories.sql`

**Cambios necesarios:**

```sql
CREATE OR REPLACE VIEW vw_eventos_analisis_financiero AS
SELECT
  e.id,
  e.clave_evento,
  e.nombre_proyecto,

  -- ====================================================================
  -- PROVISIONES DESGLOSADAS (NUEVO)
  -- ====================================================================
  COALESCE(e.provision_combustible_peaje, 0) AS provision_combustible_peaje,
  COALESCE(e.provision_materiales, 0) AS provision_materiales,
  COALESCE(e.provision_recursos_humanos, 0) AS provision_recursos_humanos,
  COALESCE(e.provision_solicitudes_pago, 0) AS provision_solicitudes_pago,

  -- Total de provisiones (calculado automáticamente)
  COALESCE(e.provisiones, 0) AS provisiones_total,

  -- ====================================================================
  -- GASTOS REALES POR CATEGORÍA (NUEVO)
  -- ====================================================================
  -- Combustible/Peaje
  (SELECT COALESCE(SUM(g.total), 0)
   FROM evt_gastos g
   WHERE g.evento_id = e.id
     AND g.categoria_id = (SELECT id FROM evt_categorias_gastos WHERE nombre = 'Combustible/Peaje')
     AND g.pagado = true
     AND g.deleted_at IS NULL) AS gastos_combustible_pagados,

  -- Materiales
  (SELECT COALESCE(SUM(g.total), 0)
   FROM evt_gastos g
   WHERE g.evento_id = e.id
     AND g.categoria_id = (SELECT id FROM evt_categorias_gastos WHERE nombre = 'Materiales')
     AND g.pagado = true
     AND g.deleted_at IS NULL) AS gastos_materiales_pagados,

  -- Recursos Humanos
  (SELECT COALESCE(SUM(g.total), 0)
   FROM evt_gastos g
   WHERE g.evento_id = e.id
     AND g.categoria_id = (SELECT id FROM evt_categorias_gastos WHERE nombre = 'Recursos Humanos')
     AND g.pagado = true
     AND g.deleted_at IS NULL) AS gastos_rh_pagados,

  -- Solicitudes de Pago
  (SELECT COALESCE(SUM(g.total), 0)
   FROM evt_gastos g
   WHERE g.evento_id = e.id
     AND g.categoria_id = (SELECT id FROM evt_categorias_gastos WHERE nombre = 'Solicitudes de Pago')
     AND g.pagado = true
     AND g.deleted_at IS NULL) AS gastos_sps_pagados,

  -- Total gastos pagados (sin cambios)
  (SELECT COALESCE(SUM(g.total), 0)
   FROM evt_gastos g
   WHERE g.evento_id = e.id
     AND g.pagado = true
     AND g.deleted_at IS NULL) AS gastos_pagados_total,

  -- ====================================================================
  -- ANÁLISIS DE VARIACIÓN POR CATEGORÍA (NUEVO)
  -- ====================================================================
  -- Variación Combustible/Peaje
  CASE
    WHEN e.provision_combustible_peaje > 0
    THEN (((SELECT COALESCE(SUM(g.total), 0)
            FROM evt_gastos g
            WHERE g.evento_id = e.id
              AND g.categoria_id = (SELECT id FROM evt_categorias_gastos WHERE nombre = 'Combustible/Peaje')
              AND g.pagado = true) /
          COALESCE(e.provision_combustible_peaje, 1)) - 1) * 100
    ELSE 0
  END AS variacion_combustible_pct,

  -- Variación Materiales
  CASE
    WHEN e.provision_materiales > 0
    THEN (((SELECT COALESCE(SUM(g.total), 0)
            FROM evt_gastos g
            WHERE g.evento_id = e.id
              AND g.categoria_id = (SELECT id FROM evt_categorias_gastos WHERE nombre = 'Materiales')
              AND g.pagado = true) /
          COALESCE(e.provision_materiales, 1)) - 1) * 100
    ELSE 0
  END AS variacion_materiales_pct,

  -- Variación RH
  CASE
    WHEN e.provision_recursos_humanos > 0
    THEN (((SELECT COALESCE(SUM(g.total), 0)
            FROM evt_gastos g
            WHERE g.evento_id = e.id
              AND g.categoria_id = (SELECT id FROM evt_categorias_gastos WHERE nombre = 'Recursos Humanos')
              AND g.pagado = true) /
          COALESCE(e.provision_recursos_humanos, 1)) - 1) * 100
    ELSE 0
  END AS variacion_rh_pct,

  -- Variación SPs
  CASE
    WHEN e.provision_solicitudes_pago > 0
    THEN (((SELECT COALESCE(SUM(g.total), 0)
            FROM evt_gastos g
            WHERE g.evento_id = e.id
              AND g.categoria_id = (SELECT id FROM evt_categorias_gastos WHERE nombre = 'Solicitudes de Pago')
              AND g.pagado = true) /
          COALESCE(e.provision_solicitudes_pago, 1)) - 1) * 100
    ELSE 0
  END AS variacion_sps_pct,

  -- Variación total (sin cambios)
  CASE
    WHEN e.provisiones > 0
    THEN (((SELECT COALESCE(SUM(g.total), 0)
            FROM evt_gastos g
            WHERE g.evento_id = e.id
              AND g.pagado = true) /
          COALESCE(e.provisiones, 1)) - 1) * 100
    ELSE 0
  END AS variacion_total_pct,

  -- ====================================================================
  -- STATUS PRESUPUESTAL POR CATEGORÍA (NUEVO)
  -- ====================================================================
  CASE
    WHEN e.provision_combustible_peaje = 0 THEN 'sin_presupuesto'
    WHEN gastos_combustible_pagados <= e.provision_combustible_peaje THEN 'dentro_presupuesto'
    WHEN gastos_combustible_pagados <= (e.provision_combustible_peaje * 1.05) THEN 'advertencia'
    ELSE 'excede_presupuesto'
  END AS status_presupuestal_combustible,

  CASE
    WHEN e.provision_materiales = 0 THEN 'sin_presupuesto'
    WHEN gastos_materiales_pagados <= e.provision_materiales THEN 'dentro_presupuesto'
    WHEN gastos_materiales_pagados <= (e.provision_materiales * 1.05) THEN 'advertencia'
    ELSE 'excede_presupuesto'
  END AS status_presupuestal_materiales,

  CASE
    WHEN e.provision_recursos_humanos = 0 THEN 'sin_presupuesto'
    WHEN gastos_rh_pagados <= e.provision_recursos_humanos THEN 'dentro_presupuesto'
    WHEN gastos_rh_pagados <= (e.provision_recursos_humanos * 1.05) THEN 'advertencia'
    ELSE 'excede_presupuesto'
  END AS status_presupuestal_rh,

  CASE
    WHEN e.provision_solicitudes_pago = 0 THEN 'sin_presupuesto'
    WHEN gastos_sps_pagados <= e.provision_solicitudes_pago THEN 'dentro_presupuesto'
    WHEN gastos_sps_pagados <= (e.provision_solicitudes_pago * 1.05) THEN 'advertencia'
    ELSE 'excede_presupuesto'
  END AS status_presupuestal_sps,

  -- Status presupuestal total (sin cambios)
  CASE
    WHEN e.provisiones = 0 THEN 'sin_presupuesto'
    WHEN gastos_pagados_total <= e.provisiones THEN 'dentro_presupuesto'
    WHEN gastos_pagados_total <= (e.provisiones * 1.05) THEN 'advertencia'
    ELSE 'excede_presupuesto'
  END AS status_presupuestal_total,

  -- ... (resto de campos sin cambios: ingresos, utilidad, etc.)

FROM evt_eventos e
WHERE e.deleted_at IS NULL;
```

**NOTA CRÍTICA:** Esta vista requiere que existan categorías específicas en `evt_categorias_gastos`:
- Combustible/Peaje
- Materiales
- Recursos Humanos
- Solicitudes de Pago

#### 2.2 Vista `vw_eventos_completos` (PRIORIDAD MEDIA)

```sql
CREATE OR REPLACE VIEW vw_eventos_completos AS
SELECT
  e.*,

  -- Provisiones desglosadas (NUEVO)
  e.provision_combustible_peaje,
  e.provision_materiales,
  e.provision_recursos_humanos,
  e.provision_solicitudes_pago,
  e.provisiones AS provisiones_total,

  -- Gastos por categoría (NUEVO)
  (SELECT COALESCE(SUM(g.total), 0)
   FROM evt_gastos g
   WHERE g.evento_id = e.id
     AND g.categoria_id = (SELECT id FROM evt_categorias_gastos WHERE nombre = 'Combustible/Peaje')
     AND g.deleted_at IS NULL) AS gastos_combustible_total,

  -- ... (repetir para otras categorías)

  -- Total gastos (sin cambios)
  (SELECT COALESCE(SUM(g.total), 0)
   FROM evt_gastos g
   WHERE g.evento_id = e.id
     AND g.pagado = true
     AND g.deleted_at IS NULL) AS total_gastos,

  -- ... (resto de campos)

FROM evt_eventos e
WHERE e.deleted_at IS NULL;
```

#### 2.3 Función `get_evento_financial_summary` (PRIORIDAD ALTA)

```sql
CREATE OR REPLACE FUNCTION get_evento_financial_summary(p_evento_id INTEGER)
RETURNS TABLE(
  concepto TEXT,
  categoria TEXT,
  estimado NUMERIC,
  monto_real NUMERIC,
  pendiente NUMERIC,
  diferencia NUMERIC,
  porcentaje_cumplimiento NUMERIC
) AS $$
BEGIN
  RETURN QUERY

  -- Fila 1: Ingresos (sin cambios)
  SELECT
    'Ingresos'::TEXT AS concepto,
    'Total'::TEXT AS categoria,
    -- ... (lógica existente)
  FROM evt_eventos e WHERE e.id = p_evento_id

  UNION ALL

  -- Fila 2: Gastos Totales
  SELECT
    'Gastos'::TEXT AS concepto,
    'Total'::TEXT AS categoria,
    e.provisiones AS estimado,
    -- ... (lógica existente)
  FROM evt_eventos e WHERE e.id = p_evento_id

  UNION ALL

  -- NUEVO: Fila 2.1 - Combustible/Peaje
  SELECT
    'Gastos'::TEXT AS concepto,
    'Combustible/Peaje'::TEXT AS categoria,
    e.provision_combustible_peaje AS estimado,
    (SELECT COALESCE(SUM(g.total), 0)
     FROM evt_gastos g
     WHERE g.evento_id = e.id
       AND g.categoria_id = (SELECT id FROM evt_categorias_gastos WHERE nombre = 'Combustible/Peaje')
       AND g.pagado = true) AS monto_real,
    (SELECT COALESCE(SUM(g.total), 0)
     FROM evt_gastos g
     WHERE g.evento_id = e.id
       AND g.categoria_id = (SELECT id FROM evt_categorias_gastos WHERE nombre = 'Combustible/Peaje')
       AND g.pagado = false) AS pendiente,
    -- ... (calcular diferencia y porcentaje)
  FROM evt_eventos e WHERE e.id = p_evento_id

  UNION ALL

  -- NUEVO: Fila 2.2 - Materiales
  -- ... (repetir para cada categoría)

  UNION ALL

  -- Fila 3: Utilidad (sin cambios)
  SELECT
    'Utilidad'::TEXT AS concepto,
    'Total'::TEXT AS categoria,
    -- ... (lógica existente)
  FROM evt_eventos e WHERE e.id = p_evento_id;

END;
$$ LANGUAGE plpgsql;
```

---

### 3. Cambios en TypeScript (Tipos)

#### 3.1 Archivo `src/types/Event.ts`

```typescript
// Línea 21-30: Actualizar interface Event

export interface Event {
  id: number;
  // ... (campos existentes)

  // ====================================================================
  // PROVISIONES DESGLOSADAS (NUEVO)
  // ====================================================================
  provision_combustible_peaje?: number; // Combustible y peajes
  provision_materiales?: number; // Materiales y suministros
  provision_recursos_humanos?: number; // Staff y técnicos
  provision_solicitudes_pago?: number; // Proveedores y servicios

  // Total de provisiones (calculado automáticamente en BD)
  provisiones?: number; // MANTENER para retrocompatibilidad

  // Aliases legacy (deprecados pero mantenidos por compatibilidad)
  /** @deprecated Use provision_combustible_peaje instead */
  gastos_estimados?: number; // Apunta a provisiones

  // ... (resto de campos)
}

// ====================================================================
// NUEVO: Interface para análisis por categoría
// ====================================================================
export interface ProvisionesDesglosadas {
  combustible_peaje: number;
  materiales: number;
  recursos_humanos: number;
  solicitudes_pago: number;
  total: number; // Suma de las 4 categorías
}

export interface GastosPorCategoria {
  combustible_peaje: {
    pagados: number;
    pendientes: number;
    total: number;
  };
  materiales: {
    pagados: number;
    pendientes: number;
    total: number;
  };
  recursos_humanos: {
    pagados: number;
    pendientes: number;
    total: number;
  };
  solicitudes_pago: {
    pagados: number;
    pendientes: number;
    total: number;
  };
  total: {
    pagados: number;
    pendientes: number;
    total: number;
  };
}

export interface VariacionPorCategoria {
  categoria: string;
  provision: number;
  gasto_real: number;
  diferencia: number;
  porcentaje_variacion: number;
  status: 'dentro_presupuesto' | 'advertencia' | 'excede_presupuesto' | 'sin_presupuesto';
}
```

#### 3.2 Actualizar interface `FinancialProjection`

```typescript
// Línea 110-116: Actualizar interface FinancialProjection

export interface FinancialProjection {
  ingreso_estimado: number;

  // Provisiones desglosadas (NUEVO)
  provisiones_desglosadas: ProvisionesDesglosadas;

  // Total provisiones (calculado)
  provisiones: number; // MANTENER por compatibilidad

  utilidad_estimada: number;
  margen_estimado: number;
}
```

#### 3.3 Actualizar interface `FinancialResult`

```typescript
// Línea 118-127: Actualizar interface FinancialResult

export interface FinancialResult {
  ingresos_cobrados: number;
  ingresos_pendientes: number;
  ingresos_totales: number;

  // Gastos desglosados por categoría (NUEVO)
  gastos_por_categoria: GastosPorCategoria;

  // Gastos totales (sin cambios)
  gastos_pagados: number;
  gastos_pendientes: number;
  gastos_totales: number;

  utilidad_real: number;
  margen_real: number;
}
```

#### 3.4 Actualizar interface `FinancialComparison`

```typescript
// Línea 129-146: Actualizar interface FinancialComparison

export interface FinancialComparison {
  // Ingresos (sin cambios)
  diferencia_ingresos: number;
  porcentaje_ingresos: number;

  // Gastos globales (sin cambios)
  variacion_gastos: number;
  variacion_gastos_porcentaje: number;

  // NUEVO: Variación por categoría
  variaciones_por_categoria: VariacionPorCategoria[];

  // Utilidad (sin cambios)
  diferencia_utilidad: number;
  diferencia_margen: number;

  // Status (sin cambios)
  status_ingresos: string;
  status_gastos: string;
  status_utilidad: string;
}
```

---

### 4. Cambios en Frontend (Componentes)

#### 4.1 Componente `EventForm.tsx` (PRIORIDAD CRÍTICA)

**Archivo:** `src/modules/eventos/components/events/EventForm.tsx`

**Cambios necesarios:**

```tsx
// Línea 44: Actualizar estado del formulario

const [formData, setFormData] = useState({
  ganancia_estimada: event?.ganancia_estimada || 0,

  // NUEVO: Provisiones desglosadas
  provision_combustible_peaje: event?.provision_combustible_peaje || 0,
  provision_materiales: event?.provision_materiales || 0,
  provision_recursos_humanos: event?.provision_recursos_humanos || 0,
  provision_solicitudes_pago: event?.provision_solicitudes_pago || 0,

  notas: event?.notas || '',
});

// Línea 51: Cálculo en tiempo real (actualizado)

const provisionesTotal =
  (parseFloat(formData.provision_combustible_peaje?.toString() || '0')) +
  (parseFloat(formData.provision_materiales?.toString() || '0')) +
  (parseFloat(formData.provision_recursos_humanos?.toString() || '0')) +
  (parseFloat(formData.provision_solicitudes_pago?.toString() || '0'));

const utilidadEstimada = (formData.ganancia_estimada || 0) - provisionesTotal;

const porcentajeUtilidadEstimada = formData.ganancia_estimada > 0
  ? (utilidadEstimada / formData.ganancia_estimada) * 100
  : 0;

// Línea 78-93: Actualizar guardado

onSave({
  ...formData,
  ganancia_estimada: parseFloat(formData.ganancia_estimada.toString()) || 0,

  // Provisiones desglosadas
  provision_combustible_peaje: parseFloat(formData.provision_combustible_peaje.toString()) || 0,
  provision_materiales: parseFloat(formData.provision_materiales.toString()) || 0,
  provision_recursos_humanos: parseFloat(formData.provision_recursos_humanos.toString()) || 0,
  provision_solicitudes_pago: parseFloat(formData.provision_solicitudes_pago.toString()) || 0,

  // Campos calculados
  provisiones: provisionesTotal,
  utilidad_estimada: utilidadEstimada,
  porcentaje_utilidad_estimada: porcentajeUtilidadEstimada,
});
```

**NUEVO: Sección del formulario**

```tsx
{/* PROVISIONES DESGLOSADAS */}
<div className="space-y-4">
  <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">
    Provisiones por Categoría
  </h3>

  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
    {/* Combustible/Peaje */}
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        Combustible y Peajes ($)
        <span className="text-gray-500 text-xs ml-1">
          (Gasolina, casetas, transporte)
        </span>
      </label>
      <input
        type="number"
        step="0.01"
        min="0"
        value={formData.provision_combustible_peaje || ''}
        onChange={(e) => setFormData({
          ...formData,
          provision_combustible_peaje: parseFloat(e.target.value) || 0
        })}
        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
      />
    </div>

    {/* Materiales */}
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        Materiales ($)
        <span className="text-gray-500 text-xs ml-1">
          (Suministros, compras)
        </span>
      </label>
      <input
        type="number"
        step="0.01"
        min="0"
        value={formData.provision_materiales || ''}
        onChange={(e) => setFormData({
          ...formData,
          provision_materiales: parseFloat(e.target.value) || 0
        })}
        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
      />
    </div>

    {/* Recursos Humanos */}
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        Recursos Humanos ($)
        <span className="text-gray-500 text-xs ml-1">
          (Staff, técnicos, personal)
        </span>
      </label>
      <input
        type="number"
        step="0.01"
        min="0"
        value={formData.provision_recursos_humanos || ''}
        onChange={(e) => setFormData({
          ...formData,
          provision_recursos_humanos: parseFloat(e.target.value) || 0
        })}
        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
      />
    </div>

    {/* Solicitudes de Pago */}
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        Solicitudes de Pago ($)
        <span className="text-gray-500 text-xs ml-1">
          (Proveedores, servicios externos)
        </span>
      </label>
      <input
        type="number"
        step="0.01"
        min="0"
        value={formData.provision_solicitudes_pago || ''}
        onChange={(e) => setFormData({
          ...formData,
          provision_solicitudes_pago: parseFloat(e.target.value) || 0
        })}
        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
      />
    </div>
  </div>

  {/* Total Provisiones (calculado) */}
  <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
    <div className="flex justify-between items-center">
      <span className="font-semibold text-blue-900">Total Provisiones:</span>
      <span className="text-xl font-bold text-blue-600">
        {formatCurrency(provisionesTotal)}
      </span>
    </div>
  </div>

  {/* Alerta de margen bajo */}
  {porcentajeUtilidadEstimada < 35 && (
    <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
      <p className="text-yellow-800 text-sm">
        ⚠️ <strong>Advertencia:</strong> El margen de utilidad estimado ({porcentajeUtilidadEstimada.toFixed(1)}%)
        es menor al recomendado (35%). Considera ajustar las provisiones o el ingreso estimado.
      </p>
    </div>
  )}
</div>
```

#### 4.2 Componente `EventFinancialComparison.tsx` (PRIORIDAD ALTA)

**Archivo:** `src/modules/eventos/components/events/EventFinancialComparison.tsx`

**NUEVO: Componente de comparación por categoría**

```tsx
import React from 'react';
import { Event, VariacionPorCategoria } from '../../../../types/Event';
import { formatCurrency, formatPercentage } from '../../../../utils/formatters';

interface EventFinancialComparisonProps {
  event: Event;
  analysis: EventFinancialAnalysis; // Del hook actualizado
}

export const EventFinancialComparison: React.FC<EventFinancialComparisonProps> = ({
  event,
  analysis
}) => {
  return (
    <div className="space-y-6">
      {/* Comparación Total (existente) */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Análisis Financiero Global</h3>
        {/* ... (código existente) */}
      </div>

      {/* NUEVO: Comparación por Categoría */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">
          Análisis por Categoría de Gasto
        </h3>

        <div className="space-y-4">
          {analysis.comparison.variaciones_por_categoria.map((variacion) => (
            <CategoryComparisonRow
              key={variacion.categoria}
              variacion={variacion}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

// NUEVO: Componente para fila de comparación por categoría
interface CategoryComparisonRowProps {
  variacion: VariacionPorCategoria;
}

const CategoryComparisonRow: React.FC<CategoryComparisonRowProps> = ({ variacion }) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'dentro_presupuesto':
        return 'bg-green-50 border-green-200 text-green-800';
      case 'advertencia':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      case 'excede_presupuesto':
        return 'bg-red-50 border-red-200 text-red-800';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'dentro_presupuesto':
        return '✓';
      case 'advertencia':
        return '⚠️';
      case 'excede_presupuesto':
        return '🚨';
      default:
        return '—';
    }
  };

  return (
    <div className={`border rounded-md p-4 ${getStatusColor(variacion.status)}`}>
      <div className="flex items-center justify-between mb-2">
        <h4 className="font-semibold">{variacion.categoria}</h4>
        <span className="text-2xl">{getStatusIcon(variacion.status)}</span>
      </div>

      <div className="grid grid-cols-3 gap-4 text-sm">
        <div>
          <p className="text-gray-600 mb-1">Provisión</p>
          <p className="font-semibold">{formatCurrency(variacion.provision)}</p>
        </div>

        <div>
          <p className="text-gray-600 mb-1">Gasto Real</p>
          <p className="font-semibold">{formatCurrency(variacion.gasto_real)}</p>
        </div>

        <div>
          <p className="text-gray-600 mb-1">Variación</p>
          <p className={`font-semibold ${variacion.diferencia <= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {variacion.diferencia > 0 ? '+' : ''}{formatCurrency(variacion.diferencia)}
            {' '}
            ({variacion.porcentaje_variacion > 0 ? '+' : ''}
            {formatPercentage(variacion.porcentaje_variacion)})
          </p>
        </div>
      </div>
    </div>
  );
};
```

#### 4.3 Componente `FinancialBalancePanel.tsx` (PRIORIDAD MEDIA)

**Archivo:** `src/modules/eventos/components/financial/FinancialBalancePanel.tsx`

**Cambios:**

```tsx
// Agregar sección colapsable con desglose de provisiones

{/* NUEVO: Desglose de Provisiones */}
<div className="mt-4 border-t pt-4">
  <button
    onClick={() => setShowProvisionesDesglose(!showProvisionesDesglose)}
    className="flex items-center justify-between w-full text-sm font-medium text-gray-700 hover:text-gray-900"
  >
    <span>Ver desglose de provisiones</span>
    <span>{showProvisionesDesglose ? '▼' : '▶'}</span>
  </button>

  {showProvisionesDesglose && (
    <div className="mt-3 space-y-2 text-sm">
      <div className="flex justify-between">
        <span className="text-gray-600">• Combustible/Peaje:</span>
        <span className="font-medium">
          {formatCurrency(analysis.projection.provisiones_desglosadas.combustible_peaje)}
        </span>
      </div>

      <div className="flex justify-between">
        <span className="text-gray-600">• Materiales:</span>
        <span className="font-medium">
          {formatCurrency(analysis.projection.provisiones_desglosadas.materiales)}
        </span>
      </div>

      <div className="flex justify-between">
        <span className="text-gray-600">• Recursos Humanos:</span>
        <span className="font-medium">
          {formatCurrency(analysis.projection.provisiones_desglosadas.recursos_humanos)}
        </span>
      </div>

      <div className="flex justify-between">
        <span className="text-gray-600">• Solicitudes de Pago:</span>
        <span className="font-medium">
          {formatCurrency(analysis.projection.provisiones_desglosadas.solicitudes_pago)}
        </span>
      </div>
    </div>
  )}
</div>
```

#### 4.4 NUEVO Componente: `ProvisionesBreakdownChart.tsx`

**Archivo:** `src/modules/eventos/components/financial/ProvisionesBreakdownChart.tsx`

```tsx
import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { ProvisionesDesglosadas } from '../../../../types/Event';
import { formatCurrency } from '../../../../utils/formatters';

interface ProvisionesBreakdownChartProps {
  provisiones: ProvisionesDesglosadas;
}

const COLORS = {
  combustible_peaje: '#F59E0B', // Amber
  materiales: '#3B82F6', // Blue
  recursos_humanos: '#10B981', // Green
  solicitudes_pago: '#8B5CF6', // Purple
};

export const ProvisionesBreakdownChart: React.FC<ProvisionesBreakdownChartProps> = ({
  provisiones
}) => {
  const data = [
    {
      name: 'Combustible/Peaje',
      value: provisiones.combustible_peaje,
      color: COLORS.combustible_peaje
    },
    {
      name: 'Materiales',
      value: provisiones.materiales,
      color: COLORS.materiales
    },
    {
      name: 'Recursos Humanos',
      value: provisiones.recursos_humanos,
      color: COLORS.recursos_humanos
    },
    {
      name: 'Solicitudes de Pago',
      value: provisiones.solicitudes_pago,
      color: COLORS.solicitudes_pago
    },
  ].filter(item => item.value > 0); // Solo mostrar categorías con valor

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 bg-gray-50 rounded-lg">
        <p className="text-gray-500">No hay provisiones definidas</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold mb-4">Distribución de Provisiones</h3>

      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={(entry) => `${((entry.value / provisiones.total) * 100).toFixed(1)}%`}
            outerRadius={100}
            fill="#8884d8"
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value: number) => formatCurrency(value)}
          />
          <Legend />
        </PieChart>
      </ResponsiveContainer>

      {/* Tabla resumen */}
      <div className="mt-4 border-t pt-4">
        <table className="w-full text-sm">
          <tbody>
            {data.map((item) => (
              <tr key={item.name} className="border-b last:border-b-0">
                <td className="py-2">
                  <div className="flex items-center">
                    <div
                      className="w-3 h-3 rounded-full mr-2"
                      style={{ backgroundColor: item.color }}
                    />
                    {item.name}
                  </div>
                </td>
                <td className="py-2 text-right font-medium">
                  {formatCurrency(item.value)}
                </td>
                <td className="py-2 text-right text-gray-600">
                  {((item.value / provisiones.total) * 100).toFixed(1)}%
                </td>
              </tr>
            ))}
            <tr className="font-semibold bg-gray-50">
              <td className="py-2 px-2">Total</td>
              <td className="py-2 text-right">{formatCurrency(provisiones.total)}</td>
              <td className="py-2 text-right">100%</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};
```

#### 4.5 Actualizar `EventosListPage.tsx` (PRIORIDAD ALTA)

**Archivo:** `src/modules/eventos/EventosListPage.tsx`

**Cambios necesarios:**

1. **Agregar columnas opcionales para provisiones desglosadas**

```tsx
// Configuración de columnas visibles
const [visibleColumns, setVisibleColumns] = useState({
  // ... columnas existentes

  // NUEVO: Columnas de provisiones desglosadas (ocultas por defecto)
  provision_combustible: false,
  provision_materiales: false,
  provision_rh: false,
  provision_sps: false,
  provisiones_total: true, // Mostrar total por defecto
});

// Definición de columnas
const columns = [
  // ... columnas existentes

  // NUEVO: Provisiones desglosadas
  {
    key: 'provision_combustible',
    label: 'Prov. Combustible',
    visible: visibleColumns.provision_combustible,
    render: (event: Event) => formatCurrency(event.provision_combustible_peaje || 0),
    sortable: true,
  },
  {
    key: 'provision_materiales',
    label: 'Prov. Materiales',
    visible: visibleColumns.provision_materiales,
    render: (event: Event) => formatCurrency(event.provision_materiales || 0),
    sortable: true,
  },
  {
    key: 'provision_rh',
    label: 'Prov. RH',
    visible: visibleColumns.provision_rh,
    render: (event: Event) => formatCurrency(event.provision_recursos_humanos || 0),
    sortable: true,
  },
  {
    key: 'provision_sps',
    label: 'Prov. SPs',
    visible: visibleColumns.provision_sps,
    render: (event: Event) => formatCurrency(event.provision_solicitudes_pago || 0),
    sortable: true,
  },
  {
    key: 'provisiones_total',
    label: 'Provisiones Total',
    visible: visibleColumns.provisiones_total,
    render: (event: Event) => (
      <div>
        <span className="font-semibold">{formatCurrency(event.provisiones || 0)}</span>
        {/* Tooltip con desglose */}
        <button
          onClick={() => setSelectedEvent(event)}
          className="ml-2 text-blue-500 hover:text-blue-700"
          title="Ver desglose"
        >
          ℹ️
        </button>
      </div>
    ),
    sortable: true,
  },
];
```

2. **Agregar filtros por rango de provisiones**

```tsx
// NUEVO: Filtros de provisiones
const [provisionesFilter, setProvisionesFilter] = useState({
  min: '',
  max: '',
  categoria: 'todas', // 'todas' | 'combustible' | 'materiales' | 'rh' | 'sps'
});

// Aplicar filtros
const filteredEvents = events.filter(event => {
  // ... filtros existentes

  // Filtro por rango de provisiones
  if (provisionesFilter.min && event.provisiones < parseFloat(provisionesFilter.min)) {
    return false;
  }
  if (provisionesFilter.max && event.provisiones > parseFloat(provisionesFilter.max)) {
    return false;
  }

  // Filtro por categoría específica
  if (provisionesFilter.categoria !== 'todas') {
    const categoriaValue = {
      'combustible': event.provision_combustible_peaje || 0,
      'materiales': event.provision_materiales || 0,
      'rh': event.provision_recursos_humanos || 0,
      'sps': event.provision_solicitudes_pago || 0,
    }[provisionesFilter.categoria];

    if (categoriaValue === 0) return false;
  }

  return true;
});
```

---

### 5. Cambios en Hooks y Servicios

#### 5.1 Hook `useEventFinancialAnalysis.ts` (PRIORIDAD CRÍTICA)

**Archivo:** `src/modules/eventos/hooks/useEventFinancialAnalysis.ts`

**Función `calculateEventAnalysis` - Actualizar:**

```typescript
const calculateEventAnalysis = (event: EventoCompleto): EventFinancialAnalysis => {
  // ====================================================================
  // PROYECCIÓN (NUEVO: Con desglose)
  // ====================================================================
  const ingreso_estimado = event.ganancia_estimada || 0;

  // Provisiones desglosadas
  const provisiones_desglosadas: ProvisionesDesglosadas = {
    combustible_peaje: event.provision_combustible_peaje || 0,
    materiales: event.provision_materiales || 0,
    recursos_humanos: event.provision_recursos_humanos || 0,
    solicitudes_pago: event.provision_solicitudes_pago || 0,
    total: event.provisiones || 0, // Calculado en BD
  };

  const utilidad_estimada = ingreso_estimado - provisiones_desglosadas.total;
  const margen_estimado = ingreso_estimado > 0
    ? (utilidad_estimada / ingreso_estimado) * 100
    : 0;

  const projection: FinancialProjection = {
    ingreso_estimado,
    provisiones_desglosadas, // NUEVO
    provisiones: provisiones_desglosadas.total, // MANTENER por compatibilidad
    utilidad_estimada,
    margen_estimado
  };

  // ====================================================================
  // RESULTADO REAL (NUEVO: Con desglose por categoría)
  // ====================================================================
  const gastos_por_categoria: GastosPorCategoria = {
    combustible_peaje: {
      pagados: event.gastos_combustible_pagados || 0,
      pendientes: event.gastos_combustible_pendientes || 0,
      total: (event.gastos_combustible_pagados || 0) + (event.gastos_combustible_pendientes || 0),
    },
    materiales: {
      pagados: event.gastos_materiales_pagados || 0,
      pendientes: event.gastos_materiales_pendientes || 0,
      total: (event.gastos_materiales_pagados || 0) + (event.gastos_materiales_pendientes || 0),
    },
    recursos_humanos: {
      pagados: event.gastos_rh_pagados || 0,
      pendientes: event.gastos_rh_pendientes || 0,
      total: (event.gastos_rh_pagados || 0) + (event.gastos_rh_pendientes || 0),
    },
    solicitudes_pago: {
      pagados: event.gastos_sps_pagados || 0,
      pendientes: event.gastos_sps_pendientes || 0,
      total: (event.gastos_sps_pagados || 0) + (event.gastos_sps_pendientes || 0),
    },
    total: {
      pagados: event.total_gastos || 0,
      pendientes: event.gastos_pendientes || 0,
      total: (event.total_gastos || 0) + (event.gastos_pendientes || 0),
    },
  };

  const result: FinancialResult = {
    // ... (campos existentes)
    gastos_por_categoria, // NUEVO
    gastos_pagados: gastos_por_categoria.total.pagados,
    gastos_pendientes: gastos_por_categoria.total.pendientes,
    gastos_totales: gastos_por_categoria.total.total,
    // ...
  };

  // ====================================================================
  // COMPARACIÓN (NUEVO: Variación por categoría)
  // ====================================================================
  const variaciones_por_categoria: VariacionPorCategoria[] = [
    {
      categoria: 'Combustible/Peaje',
      provision: provisiones_desglosadas.combustible_peaje,
      gasto_real: gastos_por_categoria.combustible_peaje.pagados,
      diferencia: gastos_por_categoria.combustible_peaje.pagados - provisiones_desglosadas.combustible_peaje,
      porcentaje_variacion: provisiones_desglosadas.combustible_peaje > 0
        ? ((gastos_por_categoria.combustible_peaje.pagados / provisiones_desglosadas.combustible_peaje) - 1) * 100
        : 0,
      status: getStatusPresupuestal(
        provisiones_desglosadas.combustible_peaje,
        gastos_por_categoria.combustible_peaje.pagados
      ),
    },
    {
      categoria: 'Materiales',
      provision: provisiones_desglosadas.materiales,
      gasto_real: gastos_por_categoria.materiales.pagados,
      diferencia: gastos_por_categoria.materiales.pagados - provisiones_desglosadas.materiales,
      porcentaje_variacion: provisiones_desglosadas.materiales > 0
        ? ((gastos_por_categoria.materiales.pagados / provisiones_desglosadas.materiales) - 1) * 100
        : 0,
      status: getStatusPresupuestal(
        provisiones_desglosadas.materiales,
        gastos_por_categoria.materiales.pagados
      ),
    },
    {
      categoria: 'Recursos Humanos',
      provision: provisiones_desglosadas.recursos_humanos,
      gasto_real: gastos_por_categoria.recursos_humanos.pagados,
      diferencia: gastos_por_categoria.recursos_humanos.pagados - provisiones_desglosadas.recursos_humanos,
      porcentaje_variacion: provisiones_desglosadas.recursos_humanos > 0
        ? ((gastos_por_categoria.recursos_humanos.pagados / provisiones_desglosadas.recursos_humanos) - 1) * 100
        : 0,
      status: getStatusPresupuestal(
        provisiones_desglosadas.recursos_humanos,
        gastos_por_categoria.recursos_humanos.pagados
      ),
    },
    {
      categoria: 'Solicitudes de Pago',
      provision: provisiones_desglosadas.solicitudes_pago,
      gasto_real: gastos_por_categoria.solicitudes_pago.pagados,
      diferencia: gastos_por_categoria.solicitudes_pago.pagados - provisiones_desglosadas.solicitudes_pago,
      porcentaje_variacion: provisiones_desglosadas.solicitudes_pago > 0
        ? ((gastos_por_categoria.solicitudes_pago.pagados / provisiones_desglosadas.solicitudes_pago) - 1) * 100
        : 0,
      status: getStatusPresupuestal(
        provisiones_desglosadas.solicitudes_pago,
        gastos_por_categoria.solicitudes_pago.pagados
      ),
    },
  ];

  const comparison: FinancialComparison = {
    // ... (campos existentes)
    variaciones_por_categoria, // NUEVO
    // ...
  };

  return { projection, result, comparison, status, alert_level };
};

// ====================================================================
// NUEVA: Función helper para status presupuestal
// ====================================================================
function getStatusPresupuestal(
  provision: number,
  gasto_real: number
): 'dentro_presupuesto' | 'advertencia' | 'excede_presupuesto' | 'sin_presupuesto' {
  if (provision === 0) return 'sin_presupuesto';
  if (gasto_real <= provision) return 'dentro_presupuesto';
  if (gasto_real <= provision * 1.05) return 'advertencia';
  return 'excede_presupuesto';
}
```

#### 5.2 Servicio `financialExportService.ts` (PRIORIDAD MEDIA)

**Archivo:** `src/modules/eventos/services/financialExportService.ts`

**Actualizar función `prepareDataForExport`:**

```typescript
prepareDataForExport(eventsAnalysis, portfolioSummary) {
  return {
    events: eventsAnalysis.map(analysis => ({
      // ... (campos existentes)

      // NUEVO: Provisiones desglosadas
      provision_combustible: analysis.projection.provisiones_desglosadas.combustible_peaje,
      provision_materiales: analysis.projection.provisiones_desglosadas.materiales,
      provision_rh: analysis.projection.provisiones_desglosadas.recursos_humanos,
      provision_sps: analysis.projection.provisiones_desglosadas.solicitudes_pago,
      provision_total: analysis.projection.provisiones_desglosadas.total,

      // NUEVO: Gastos por categoría
      gastos_combustible: analysis.result.gastos_por_categoria.combustible_peaje.pagados,
      gastos_materiales: analysis.result.gastos_por_categoria.materiales.pagados,
      gastos_rh: analysis.result.gastos_por_categoria.recursos_humanos.pagados,
      gastos_sps: analysis.result.gastos_por_categoria.solicitudes_pago.pagados,
      gastos_total: analysis.result.gastos_pagados,

      // NUEVO: Variaciones por categoría
      variacion_combustible: analysis.comparison.variaciones_por_categoria[0].porcentaje_variacion,
      variacion_materiales: analysis.comparison.variaciones_por_categoria[1].porcentaje_variacion,
      variacion_rh: analysis.comparison.variaciones_por_categoria[2].porcentaje_variacion,
      variacion_sps: analysis.comparison.variaciones_por_categoria[3].porcentaje_variacion,

      // ... (resto de campos)
    }))
  };
}
```

**Actualizar CSV headers:**

```typescript
const headers = [
  'Clave Evento',
  'Nombre Proyecto',

  // NUEVO: Provisiones desglosadas
  'Provisión Combustible/Peaje',
  'Provisión Materiales',
  'Provisión RH',
  'Provisión SPs',
  'Provisión Total',

  // NUEVO: Gastos por categoría
  'Gastos Combustible',
  'Gastos Materiales',
  'Gastos RH',
  'Gastos SPs',
  'Gastos Total',

  // NUEVO: Variaciones
  'Variación Combustible (%)',
  'Variación Materiales (%)',
  'Variación RH (%)',
  'Variación SPs (%)',

  // ... (resto de campos)
];
```

---

### 6. Migración de Datos Existentes

#### 6.1 Estrategia de Distribución

Para los eventos existentes que solo tienen `provisiones` (sin desglose), necesitamos distribuir el monto proporcionalmente basándonos en los gastos reales:

```sql
-- Función para distribuir provisiones existentes
CREATE OR REPLACE FUNCTION distribute_existing_provisiones()
RETURNS void AS $$
DECLARE
  v_evento RECORD;
  v_total_gastos NUMERIC;
  v_gastos_combustible NUMERIC;
  v_gastos_materiales NUMERIC;
  v_gastos_rh NUMERIC;
  v_gastos_sps NUMERIC;
  v_porcentaje_combustible NUMERIC;
  v_porcentaje_materiales NUMERIC;
  v_porcentaje_rh NUMERIC;
  v_porcentaje_sps NUMERIC;
BEGIN
  -- Iterar sobre eventos con provisiones pero sin desglose
  FOR v_evento IN
    SELECT id, provisiones
    FROM evt_eventos
    WHERE provisiones > 0
      AND (provision_combustible_peaje IS NULL OR provision_combustible_peaje = 0)
      AND (provision_materiales IS NULL OR provision_materiales = 0)
      AND (provision_recursos_humanos IS NULL OR provision_recursos_humanos = 0)
      AND (provision_solicitudes_pago IS NULL OR provision_solicitudes_pago = 0)
      AND deleted_at IS NULL
  LOOP
    -- Calcular gastos reales por categoría
    SELECT
      COALESCE(SUM(CASE WHEN c.nombre = 'Combustible/Peaje' THEN g.total ELSE 0 END), 0),
      COALESCE(SUM(CASE WHEN c.nombre = 'Materiales' THEN g.total ELSE 0 END), 0),
      COALESCE(SUM(CASE WHEN c.nombre = 'Recursos Humanos' THEN g.total ELSE 0 END), 0),
      COALESCE(SUM(CASE WHEN c.nombre = 'Solicitudes de Pago' THEN g.total ELSE 0 END), 0),
      COALESCE(SUM(g.total), 0)
    INTO
      v_gastos_combustible,
      v_gastos_materiales,
      v_gastos_rh,
      v_gastos_sps,
      v_total_gastos
    FROM evt_gastos g
    LEFT JOIN evt_categorias_gastos c ON g.categoria_id = c.id
    WHERE g.evento_id = v_evento.id
      AND g.deleted_at IS NULL;

    -- Si hay gastos, distribuir proporcionalmente
    IF v_total_gastos > 0 THEN
      v_porcentaje_combustible := v_gastos_combustible / v_total_gastos;
      v_porcentaje_materiales := v_gastos_materiales / v_total_gastos;
      v_porcentaje_rh := v_gastos_rh / v_total_gastos;
      v_porcentaje_sps := v_gastos_sps / v_total_gastos;

      UPDATE evt_eventos
      SET
        provision_combustible_peaje = ROUND(v_evento.provisiones * v_porcentaje_combustible, 2),
        provision_materiales = ROUND(v_evento.provisiones * v_porcentaje_materiales, 2),
        provision_recursos_humanos = ROUND(v_evento.provisiones * v_porcentaje_rh, 2),
        provision_solicitudes_pago = ROUND(v_evento.provisiones * v_porcentaje_sps, 2)
      WHERE id = v_evento.id;
    ELSE
      -- Si no hay gastos, distribuir equitativamente (25% cada uno)
      UPDATE evt_eventos
      SET
        provision_combustible_peaje = ROUND(v_evento.provisiones * 0.25, 2),
        provision_materiales = ROUND(v_evento.provisiones * 0.25, 2),
        provision_recursos_humanos = ROUND(v_evento.provisiones * 0.25, 2),
        provision_solicitudes_pago = ROUND(v_evento.provisiones * 0.25, 2)
      WHERE id = v_evento.id;
    END IF;

    RAISE NOTICE 'Distribuido provisiones para evento %: Total=%, Comb=%, Mat=%, RH=%, SPs=%',
      v_evento.id,
      v_evento.provisiones,
      v_gastos_combustible,
      v_gastos_materiales,
      v_gastos_rh,
      v_gastos_sps;
  END LOOP;

  RAISE NOTICE 'Distribución completada exitosamente';
END;
$$ LANGUAGE plpgsql;
```

---

### 7. Crear Categorías de Gastos

**IMPORTANTE:** Antes de ejecutar la migración, asegurarse de que existan estas categorías:

```sql
-- Insertar categorías si no existen
INSERT INTO evt_categorias_gastos (nombre, descripcion, activo, created_at, updated_at)
VALUES
  ('Combustible/Peaje', 'Gastos de combustible, gasolina, diésel y peajes de casetas', true, NOW(), NOW()),
  ('Materiales', 'Compra de materiales, suministros y equipo para eventos', true, NOW(), NOW()),
  ('Recursos Humanos', 'Pago de staff, técnicos, personal de apoyo y honorarios', true, NOW(), NOW()),
  ('Solicitudes de Pago', 'Pagos a proveedores externos, servicios contratados y SPs', true, NOW(), NOW())
ON CONFLICT (nombre) DO NOTHING;
```

---

## 🔄 Plan de Implementación (Paso a Paso)

### Fase 1: Preparación (1-2 horas)
1. ✅ Crear branch `feature/division-provisiones`
2. ✅ Crear respaldo completo de base de datos
3. ✅ Documentar plan de rollback

### Fase 2: Base de Datos (3-4 horas)
1. ✅ Crear categorías de gastos necesarias
2. ✅ Crear migración 010_divide_provisiones_categories.sql
3. ✅ Ejecutar en ambiente de desarrollo
4. ✅ Ejecutar función de distribución automática
5. ✅ Validar integridad de datos (provisiones_total = suma de categorías)

### Fase 3: Backend (2-3 horas)
1. ✅ Actualizar interfaces TypeScript (Event.ts)
2. ✅ Actualizar hook useEventFinancialAnalysis.ts
3. ✅ Actualizar financialExportService.ts
4. ✅ Validar tipos y compilación

### Fase 4: Frontend (6-8 horas)
1. ✅ Actualizar EventForm.tsx (inputs desglosados)
2. ✅ Actualizar EventFinancialComparison.tsx (comparación por categoría)
3. ✅ Actualizar FinancialBalancePanel.tsx (desglose colapsable)
4. ✅ Crear ProvisionesBreakdownChart.tsx (gráfica pie)
5. ✅ Actualizar EventosListPage.tsx (columnas opcionales)
6. ✅ Validar responsive design

### Fase 5: Testing (2-3 horas)
1. ✅ Pruebas unitarias de cálculos
2. ✅ Pruebas de integración (crear/editar evento)
3. ✅ Pruebas de reportes (exportar Excel/PDF)
4. ✅ Validar retrocompatibilidad

### Fase 6: Documentación (1-2 horas)
1. ✅ Actualizar GUIA_USO_PROVISIONES.md
2. ✅ Crear CHANGELOG_DIVISION_PROVISIONES.md
3. ✅ Actualizar README del proyecto

### Fase 7: Deploy (1 hora)
1. ✅ Merge a `main`
2. ✅ Ejecutar migración en producción
3. ✅ Monitorear logs y errores
4. ✅ Validar con usuarios

---

## 📊 Métricas de Éxito

### Indicadores Técnicos
- ✅ 100% de eventos migrados correctamente
- ✅ 0 errores de integridad de datos
- ✅ Provisiones_total = suma de 4 categorías en todos los registros
- ✅ Tiempo de carga de vistas < 2 segundos

### Indicadores de Negocio
- ✅ Usuarios pueden crear eventos con provisiones desglosadas
- ✅ Reportes muestran análisis por categoría
- ✅ Filtros funcionan correctamente
- ✅ Exportación a Excel incluye nuevos campos

---

## ⚠️ Riesgos y Mitigaciones

### Riesgo 1: Pérdida de datos durante migración
**Probabilidad:** Baja
**Impacto:** Crítico
**Mitigación:**
- Respaldo completo antes de iniciar
- Ejecutar primero en ambiente de desarrollo
- Función de rollback disponible

### Riesgo 2: Inconsistencia en totales
**Probabilidad:** Media
**Impacto:** Alto
**Mitigación:**
- Trigger automático para sincronizar provisiones_total
- Script de validación post-migración
- Constraint check en base de datos

### Riesgo 3: Rendimiento de vistas
**Probabilidad:** Media
**Impacto:** Medio
**Mitigación:**
- Índices optimizados por categoría
- Queries con COALESCE y filtering eficiente
- Monitorear EXPLAIN ANALYZE

### Riesgo 4: Compatibilidad con código legacy
**Probabilidad:** Baja
**Impacto:** Medio
**Mitigación:**
- Mantener campo `provisiones` como calculado
- Aliases de compatibilidad en interfaces
- Tests de regresión exhaustivos

---

## 🔙 Plan de Rollback

Si algo sale mal durante la implementación:

```sql
-- 1. Restaurar campos originales (solo si es necesario)
ALTER TABLE evt_eventos
DROP COLUMN provision_combustible_peaje,
DROP COLUMN provision_materiales,
DROP COLUMN provision_recursos_humanos,
DROP COLUMN provision_solicitudes_pago;

-- 2. Restaurar campo provisiones como NUMERIC normal
ALTER TABLE evt_eventos
ALTER COLUMN provisiones DROP EXPRESSION IF EXISTS;

-- 3. Restaurar vistas originales
-- (ejecutar migrations/008 y 009 nuevamente)

-- 4. Restaurar respaldo de datos
psql -U postgres -d erp_db -f backups/supabase_backup_2025-10-29_135924.sql
```

---

## 📝 Checklist de Validación Post-Implementación

### Base de Datos
- [ ] Todas las filas de `evt_eventos` tienen provisiones_total = suma de categorías
- [ ] Vista `vw_eventos_analisis_financiero` retorna datos sin errores
- [ ] Función `get_evento_financial_summary` devuelve 7 filas (1 ingreso + 5 gastos + 1 utilidad)
- [ ] Índices funcionan correctamente (EXPLAIN ANALYZE)

### Frontend
- [ ] Formulario de evento guarda correctamente las 4 provisiones
- [ ] Componente de comparación muestra análisis por categoría
- [ ] Gráfica de pie de provisiones se renderiza
- [ ] Listado de eventos muestra columnas opcionales
- [ ] Filtros por provisiones funcionan

### Reportes
- [ ] Exportación a Excel incluye nuevas columnas
- [ ] Exportación a PDF muestra desglose
- [ ] CSV generado es válido

### Retrocompatibilidad
- [ ] Eventos antiguos (migrados) muestran desglose correcto
- [ ] Campo `provisiones` sigue siendo accesible
- [ ] No hay errores en componentes existentes

---

## 📚 Documentación Adicional

### Archivos a Consultar
- [GUIA_USO_PROVISIONES.md](GUIA_USO_PROVISIONES.md) - Guía de usuario
- [RESUMEN_FINAL_PROVISIONES.md](RESUMEN_FINAL_PROVISIONES.md) - Resumen de implementación anterior
- [Event.ts](src/types/Event.ts) - Tipos TypeScript actuales

### Referencias Técnicas
- PostgreSQL Computed Columns: https://www.postgresql.org/docs/12/ddl-generated-columns.html
- React Hook Best Practices: https://react.dev/reference/react/hooks
- Supabase Views: https://supabase.com/docs/guides/database/views

---

**Estimación total:** 15-20 horas de desarrollo
**Prioridad:** Alta
**Fecha objetivo:** 5 de Noviembre de 2025
**Responsable:** Equipo de Desarrollo ERP-777

---

**Última actualización:** 29 de Octubre de 2025
**Versión del documento:** 1.0
**Estado:** En revisión
