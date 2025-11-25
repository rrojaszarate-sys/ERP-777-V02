# Documentación: Vista `vw_eventos_analisis_financiero`

**Fecha**: 5 de Noviembre 2025
**Versión**: 2.0 - Versión Simplificada
**Estado**: Documentación Actualizada con Estructura Real de la Vista

---

## Índice

1. [Descripción General](#descripción-general)
2. [Propósito de la Vista](#propósito-de-la-vista)
3. [Campos de la Vista](#campos-de-la-vista)
4. [Ejemplos de Uso](#ejemplos-de-uso)
5. [Notas Importantes](#notas-importantes)

---

## Descripción General

La vista `vw_eventos_analisis_financiero` es una vista materializada que consolida toda la información financiera de los eventos, incluyendo provisiones desglosadas, gastos por categoría, ingresos y cálculos de utilidad y márgenes.

Esta es una vista **SIMPLIFICADA** diseñada para facilitar el análisis financiero enfocándose en los campos esenciales.

---

## Propósito de la Vista

La vista tiene como objetivo:

- Proporcionar un análisis financiero completo de cada evento
- Desglosar provisiones y gastos en 4 categorías principales
- Calcular automáticamente utilidades y márgenes (estimados y reales)
- Mostrar disponibles por categoría de provisión
- Facilitar reportes financieros y análisis de rentabilidad

---

## Campos de la Vista

### 1. Identificación del Evento

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | UUID | ID único del evento |
| `company_id` | UUID | ID de la compañía |
| `clave_evento` | TEXT | Clave única del evento (ej: EVT-2025-001) |
| `nombre_proyecto` | TEXT | Nombre del proyecto/evento |
| `descripcion` | TEXT | Descripción del evento |
| `cliente_id` | UUID | ID del cliente |
| `tipo_evento_id` | UUID | ID del tipo de evento |
| `estado_id` | UUID | ID del estado del evento |
| `fecha_evento` | DATE | Fecha programada del evento |
| `fecha_fin` | DATE | Fecha de fin del evento |
| `lugar` | TEXT | Ubicación del evento |
| `numero_invitados` | INTEGER | Número de invitados |
| `prioridad` | TEXT | Prioridad del evento |
| `fase_proyecto` | TEXT | Fase actual del proyecto |

### 2. Información del Cliente

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `cliente_nombre` | TEXT | Razón social del cliente |
| `cliente_comercial` | TEXT | Nombre comercial del cliente |
| `cliente_rfc` | TEXT | RFC del cliente |

### 3. Estado del Evento

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `estado_nombre` | TEXT | Nombre del estado (Prospecto, Cotización, Confirmado, etc.) |
| `estado_color` | TEXT | Color hexadecimal del estado para UI |

### 4. Tipo de Evento

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `tipo_evento_nombre` | TEXT | Nombre del tipo de evento (Congreso, Boda, Corporativo, etc.) |
| `tipo_evento_color` | TEXT | Color hexadecimal del tipo para UI |

### 5. Provisiones Desglosadas

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `provision_combustible_peaje` | NUMERIC | Provisión para combustible y peajes |
| `provision_materiales` | NUMERIC | Provisión para materiales |
| `provision_recursos_humanos` | NUMERIC | Provisión para recursos humanos |
| `provision_solicitudes_pago` | NUMERIC | Provisión para solicitudes de pago |
| `provisiones_total` | NUMERIC | **CALCULADO**: Suma de las 4 provisiones |

**Fórmula `provisiones_total`:**
```sql
provision_combustible_peaje + provision_materiales +
provision_recursos_humanos + provision_solicitudes_pago
```

### 6. Ingresos

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `ingreso_estimado` | NUMERIC | Ingreso estimado/proyectado del evento |
| `ingresos_cobrados` | NUMERIC | **CALCULADO**: Suma de ingresos ya cobrados (cobrado=true) |
| `ingresos_pendientes` | NUMERIC | **CALCULADO**: Suma de ingresos pendientes de cobro (cobrado=false) |
| `ingresos_totales` | NUMERIC | **CALCULADO**: Total de ingresos registrados (cobrados + pendientes) |

**Fuente de datos:** Tabla `evt_ingresos` (excluye registros con `deleted_at IS NOT NULL`)

### 7. Gastos por Categoría - Combustible y Peajes (Categoría ID: 9)

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `gastos_combustible_pagados` | NUMERIC | **CALCULADO**: Gastos de combustible ya pagados |
| `gastos_combustible_pendientes` | NUMERIC | **CALCULADO**: Gastos de combustible pendientes de pago |

### 8. Gastos por Categoría - Materiales (Categoría ID: 8)

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `gastos_materiales_pagados` | NUMERIC | **CALCULADO**: Gastos de materiales ya pagados |
| `gastos_materiales_pendientes` | NUMERIC | **CALCULADO**: Gastos de materiales pendientes de pago |

### 9. Gastos por Categoría - Recursos Humanos (Categoría ID: 7)

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `gastos_rh_pagados` | NUMERIC | **CALCULADO**: Gastos de RH ya pagados |
| `gastos_rh_pendientes` | NUMERIC | **CALCULADO**: Gastos de RH pendientes de pago |

### 10. Gastos por Categoría - Solicitudes de Pago (Categoría ID: 6)

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `gastos_sps_pagados` | NUMERIC | **CALCULADO**: Gastos de SPs ya pagados |
| `gastos_sps_pendientes` | NUMERIC | **CALCULADO**: Gastos de SPs pendientes de pago |

### 11. Gastos Totales

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `gastos_pagados_total` | NUMERIC | **CALCULADO**: Total de gastos pagados (todas las categorías) |
| `gastos_pendientes_total` | NUMERIC | **CALCULADO**: Total de gastos pendientes (todas las categorías) |
| `gastos_totales` | NUMERIC | **CALCULADO**: Total de gastos (pagados + pendientes) |

**Fuente de datos:** Tabla `evt_gastos` (excluye registros con `deleted_at IS NOT NULL`)

### 12. Disponibles por Categoría

Estos campos muestran cuánto dinero queda disponible en cada categoría de provisión después de restar los gastos pagados.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `disponible_combustible` | NUMERIC | **CALCULADO**: `provision_combustible_peaje - gastos_combustible_pagados` |
| `disponible_materiales` | NUMERIC | **CALCULADO**: `provision_materiales - gastos_materiales_pagados` |
| `disponible_rh` | NUMERIC | **CALCULADO**: `provision_recursos_humanos - gastos_rh_pagados` |
| `disponible_sps` | NUMERIC | **CALCULADO**: `provision_solicitudes_pago - gastos_sps_pagados` |
| `disponible_total` | NUMERIC | **CALCULADO**: `provisiones_total - gastos_pagados_total` |

**Interpretación:**
- **Positivo**: Aún hay presupuesto disponible en esa categoría
- **Negativo**: Se ha excedido el presupuesto en esa categoría
- **Cero**: Se ha usado exactamente el presupuesto asignado

### 13. Provisiones Comprometidas y Disponibles

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `provisiones_comprometidas` | NUMERIC | **CALCULADO**: Gastos pendientes de pago (ya ejercidos pero no pagados) |
| `provisiones_disponibles` | NUMERIC | **CALCULADO**: `provisiones_total - gastos_totales` |

**Fórmulas:**
```sql
provisiones_comprometidas = gastos_pendientes_total
provisiones_disponibles = provisiones_total - gastos_totales
```

**Diferencia:**
- `disponible_total`: Considera solo gastos **pagados**
- `provisiones_disponibles`: Considera gastos **pagados + pendientes**

### 14. Utilidad Estimada

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `utilidad_estimada` | NUMERIC | **CALCULADO**: `ingreso_estimado - provisiones_total` |
| `margen_estimado_pct` | NUMERIC | **CALCULADO**: `(utilidad_estimada / ingreso_estimado) * 100` |

**Fórmula:**
```sql
utilidad_estimada = ingreso_estimado - provisiones_total
margen_estimado_pct = (utilidad_estimada / ingreso_estimado) * 100
```

**Nota:** Este es el cálculo de utilidad **proyectada** basada en las provisiones iniciales.

### 15. Utilidad Real

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `utilidad_real` | NUMERIC | **CALCULADO**: `ingresos_cobrados - gastos_pagados_total` |
| `utilidad_cobrada` | NUMERIC | **CALCULADO**: Mismo que `utilidad_real` (alias más claro) |
| `margen_real_pct` | NUMERIC | **CALCULADO**: `(utilidad_real / ingresos_cobrados) * 100` |

**Fórmulas:**
```sql
utilidad_real = ingresos_cobrados - gastos_pagados_total
utilidad_cobrada = utilidad_real
margen_real_pct = (utilidad_real / ingresos_cobrados) * 100
```

**Nota:** Este es el cálculo de utilidad **real** basada en dinero efectivamente cobrado y pagado.

### 16. Metadata

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `created_at` | TIMESTAMP | Fecha de creación del evento |
| `updated_at` | TIMESTAMP | Fecha de última actualización |

---

## Ejemplos de Uso

### Ejemplo 1: Obtener eventos con disponible positivo en todas las categorías

```sql
SELECT
  clave_evento,
  nombre_proyecto,
  disponible_combustible,
  disponible_materiales,
  disponible_rh,
  disponible_sps,
  disponible_total
FROM vw_eventos_analisis_financiero
WHERE disponible_combustible > 0
  AND disponible_materiales > 0
  AND disponible_rh > 0
  AND disponible_sps > 0
ORDER BY disponible_total DESC;
```

### Ejemplo 2: Eventos que exceden presupuesto en alguna categoría

```sql
SELECT
  clave_evento,
  cliente_nombre,
  CASE
    WHEN disponible_combustible < 0 THEN 'Combustible excedido'
    WHEN disponible_materiales < 0 THEN 'Materiales excedido'
    WHEN disponible_rh < 0 THEN 'RH excedido'
    WHEN disponible_sps < 0 THEN 'SPs excedido'
  END AS categoria_excedida,
  disponible_total
FROM vw_eventos_analisis_financiero
WHERE disponible_combustible < 0
   OR disponible_materiales < 0
   OR disponible_rh < 0
   OR disponible_sps < 0
ORDER BY disponible_total ASC;
```

### Ejemplo 3: Análisis de rentabilidad (margen estimado vs margen real)

```sql
SELECT
  clave_evento,
  cliente_nombre,
  ingreso_estimado,
  provisiones_total,
  utilidad_estimada,
  margen_estimado_pct,
  ingresos_cobrados,
  gastos_pagados_total,
  utilidad_real,
  margen_real_pct,
  (margen_real_pct - margen_estimado_pct) AS variacion_margen
FROM vw_eventos_analisis_financiero
WHERE ingresos_cobrados > 0
ORDER BY variacion_margen DESC;
```

### Ejemplo 4: Eventos con ingresos pendientes de cobro

```sql
SELECT
  clave_evento,
  cliente_nombre,
  fecha_evento,
  ingresos_totales,
  ingresos_cobrados,
  ingresos_pendientes,
  ROUND((ingresos_cobrados / NULLIF(ingresos_totales, 0)) * 100, 2) AS porcentaje_cobrado
FROM vw_eventos_analisis_financiero
WHERE ingresos_pendientes > 0
ORDER BY ingresos_pendientes DESC;
```

### Ejemplo 5: Resumen de gastos por categoría

```sql
SELECT
  clave_evento,
  -- Combustible
  provision_combustible_peaje,
  gastos_combustible_pagados,
  gastos_combustible_pendientes,
  disponible_combustible,
  -- Materiales
  provision_materiales,
  gastos_materiales_pagados,
  gastos_materiales_pendientes,
  disponible_materiales,
  -- Recursos Humanos
  provision_recursos_humanos,
  gastos_rh_pagados,
  gastos_rh_pendientes,
  disponible_rh,
  -- Solicitudes de Pago
  provision_solicitudes_pago,
  gastos_sps_pagados,
  gastos_sps_pendientes,
  disponible_sps
FROM vw_eventos_analisis_financiero
WHERE id = 'xxx-xxx-xxx'; -- Reemplazar con ID del evento
```

### Ejemplo 6: Dashboard - Totales generales

```sql
SELECT
  COUNT(*) AS total_eventos,
  SUM(provisiones_total) AS total_provisiones,
  SUM(gastos_pagados_total) AS total_gastos_pagados,
  SUM(gastos_pendientes_total) AS total_gastos_pendientes,
  SUM(disponible_total) AS total_disponible,
  SUM(ingresos_cobrados) AS total_ingresos_cobrados,
  SUM(ingresos_pendientes) AS total_ingresos_pendientes,
  SUM(utilidad_real) AS total_utilidad_real,
  ROUND(AVG(margen_real_pct), 2) AS margen_promedio
FROM vw_eventos_analisis_financiero;
```

### Ejemplo 7: Eventos con mejor y peor margen real

```sql
-- Mejores márgenes
SELECT
  clave_evento,
  cliente_nombre,
  margen_real_pct,
  utilidad_real,
  ingresos_cobrados
FROM vw_eventos_analisis_financiero
WHERE ingresos_cobrados > 0
ORDER BY margen_real_pct DESC
LIMIT 10;

-- Peores márgenes
SELECT
  clave_evento,
  cliente_nombre,
  margen_real_pct,
  utilidad_real,
  ingresos_cobrados
FROM vw_eventos_analisis_financiero
WHERE ingresos_cobrados > 0
ORDER BY margen_real_pct ASC
LIMIT 10;
```

---

## Notas Importantes

### Campos Calculados

Todos los campos marcados como **CALCULADO** se generan automáticamente por la vista. No pueden ser modificados directamente.

### Soft Deletes

La vista excluye todos los registros con `deleted_at IS NOT NULL` tanto de la tabla `evt_ingresos` como de `evt_gastos`.

### Categorías de Gastos

Los IDs de categorías están hardcodeados en la vista:
- **6**: Solicitudes de Pago
- **7**: Recursos Humanos
- **8**: Materiales
- **9**: Combustible y Peajes

Si estos IDs cambian en la base de datos, la vista debe actualizarse.

### Disponible vs Provisiones Disponibles

- **`disponible_total`**: `provisiones_total - gastos_pagados_total`
  (Solo resta gastos **pagados**)

- **`provisiones_disponibles`**: `provisiones_total - gastos_totales`
  (Resta gastos **pagados + pendientes**)

Usa `disponible_total` para ver cuánto efectivo queda disponible.
Usa `provisiones_disponibles` para ver cuánto presupuesto real queda (considerando compromisos).

### Utilidad Estimada vs Utilidad Real

- **`utilidad_estimada`**: Basada en `ingreso_estimado` y `provisiones_total` (proyección)
- **`utilidad_real`**: Basada en `ingresos_cobrados` y `gastos_pagados_total` (realidad)

La diferencia entre ambas indica qué tan bien se ejecutó el evento vs la proyección inicial.

### Márgenes en Porcentaje

Los márgenes se calculan con 2 decimales de precisión usando `ROUND()`.

Si el denominador es 0, el margen retorna 0 para evitar errores de división por cero.

---

## Versión Anterior

La documentación anterior incluía campos adicionales como:
- `status_cobro`
- `status_presupuestal`
- `status_financiero_integral`
- `dias_desde_evento`
- `variacion_ingresos_porcentaje`
- `variacion_gastos_porcentaje`

Estos campos han sido **removidos** de la versión simplificada de la vista para reducir complejidad.

Si necesitas estos cálculos, puedes hacerlos en la capa de aplicación usando los campos base disponibles.

---

**Última actualización**: 5 de Noviembre 2025
**Archivo SQL de referencia**: `ACTUALIZAR_VISTA_COMPLETA_CON_MARGENES.sql`
**Total de campos**: 62 campos
