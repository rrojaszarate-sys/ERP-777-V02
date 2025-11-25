# 📊 Guía de Visualizaciones: Análisis Financiero de Eventos

**Fecha**: 28 de Octubre 2025
**Versión**: 1.0
**Para**: Desarrolladores Frontend y Diseñadores de Dashboards

---

## 🎯 Objetivo

Esta guía proporciona recomendaciones detalladas para visualizar los datos de análisis financiero de eventos, incluyendo el análisis de ingresos sin cobrar, gastos vs provisiones, y status financiero integral.

---

## 📋 Índice

1. [Datos Disponibles](#datos-disponibles)
2. [Dashboard Principal: Resumen Ejecutivo](#dashboard-principal-resumen-ejecutivo)
3. [Panel de Cuentas por Cobrar](#panel-de-cuentas-por-cobrar)
4. [Panel de Control Presupuestal](#panel-de-control-presupuestal)
5. [Vista Detallada por Evento](#vista-detallada-por-evento)
6. [Alertas y Notificaciones](#alertas-y-notificaciones)
7. [Reportes y Exportaciones](#reportes-y-exportaciones)
8. [Códigos de Color Recomendados](#codigos-de-color-recomendados)

---

## 📊 Datos Disponibles

### Vista Principal: `vw_eventos_analisis_financiero`

#### Identificación
- `id`, `clave_evento`, `nombre_proyecto`
- `cliente_id`, `cliente_nombre`
- `fecha_evento`, `estado_id`, `estado_nombre`

#### Proyección (Estimado)
- `ingreso_estimado` - Ingresos proyectados
- `provisiones` - Gastos estimados (antes gastos_estimados)
- `utilidad_estimada` - Utilidad proyectada
- `porcentaje_utilidad_estimada` - % de utilidad estimada

#### Ingresos (Real)
- `ingresos_cobrados` - Ya en caja/banco 💰
- `ingresos_pendientes` - Por cobrar ⏳
- `ingresos_totales` - Suma de ambos
- `diferencia_ingresos_absoluta` - Cobrados - Estimado
- `variacion_ingresos_porcentaje` - % de variación
- `porcentaje_cobro` - % cobrado del total registrado
- `status_cobro` - Estado: sin_ingresos | cobrado_completo | cobro_bueno | cobro_parcial | cobro_critico

#### Gastos (Real)
- `gastos_pagados` - Ya pagados 💸
- `gastos_pendientes` - Por pagar ⏳
- `gastos_totales` - Suma de ambos
- `diferencia_gastos_absoluta` - Pagados - Provisiones
- `variacion_gastos_porcentaje` - % de variación
- `status_presupuestal` - Estado: sin_presupuesto | dentro_presupuesto | advertencia | excede_presupuesto

#### Utilidad
- `utilidad_real` - Cobrados - Pagados
- `utilidad_proyectada` - Totales - Totales
- `margen_utilidad_real` - % de margen
- `diferencia_utilidad_absoluta` - Real - Estimada

#### Status Integral
- `status_financiero_integral` - saludable | atencion | critico
- `dias_desde_evento` - Días transcurridos (para alertas de cobro)

### Vista Secundaria: `vw_eventos_problemas_cobro`

Filtrada solo a eventos con ingresos pendientes:
- `categoria_urgencia` - reciente | urgente | muy_urgente | critico
- `facturas_pendientes` - Cantidad de facturas sin cobrar

---

## 📊 Dashboard Principal: Resumen Ejecutivo

### Layout Recomendado

```
┌─────────────────────────────────────────────────────────────┐
│                    RESUMEN FINANCIERO                       │
│                                                             │
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐  │
│  │   Eventos     │  │   Ingresos    │  │    Gastos     │  │
│  │   Activos     │  │   Cobrados    │  │   Pagados     │  │
│  │     274       │  │  $65.1M       │  │   $48.2M      │  │
│  └───────────────┘  └───────────────┘  └───────────────┘  │
│                                                             │
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐  │
│  │   Ingresos    │  │  Utilidad     │  │    Margen     │  │
│  │  Pendientes   │  │    Real       │  │   Utilidad    │  │
│  │   $8.4M       │  │   $16.9M      │  │    25.9%      │  │
│  └───────────────┘  └───────────────┘  └───────────────┘  │
└─────────────────────────────────────────────────────────────┘

┌──────────────────────────┐ ┌────────────────────────────────┐
│  STATUS FINANCIERO       │ │   TENDENCIA COBRO MENSUAL      │
│                          │ │                                │
│  🟢 Saludable    156     │ │   ▁▃▄▆█ Graph de barras       │
│  🟡 Atención      89     │ │   mostrando ingresos           │
│  🔴 Crítico       29     │ │   cobrados por mes             │
└──────────────────────────┘ └────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│         EVENTOS CON MAYOR MONTO PENDIENTE DE COBRO          │
│                                                             │
│  Evento        Cliente           Pendiente    Días  Status │
│  ───────────────────────────────────────────────────────── │
│  EVT-2025-045  Empresa ABC      $450,000     87   🔴 Crítico│
│  EVT-2025-032  Empresa XYZ      $320,000     62   🟠 Urgente│
│  ...                                                        │
└─────────────────────────────────────────────────────────────┘
```

### Componentes Clave

#### 1. KPI Cards (Métricas Principales)

**Query SQL:**
```sql
SELECT
  COUNT(*) AS total_eventos,
  SUM(ingresos_cobrados) AS total_cobrado,
  SUM(ingresos_pendientes) AS total_pendiente,
  SUM(gastos_pagados) AS total_pagado,
  SUM(utilidad_real) AS utilidad_total,
  AVG(margen_utilidad_real) AS margen_promedio
FROM vw_eventos_analisis_financiero;
```

**Diseño React:**
```tsx
<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
  <KPICard
    title="Ingresos Cobrados"
    value={formatCurrency(totalCobrado)}
    icon={<CashIcon />}
    color="green"
  />
  <KPICard
    title="Ingresos Pendientes"
    value={formatCurrency(totalPendiente)}
    icon={<ClockIcon />}
    color="orange"
    trend={{ value: pendientesPorcentaje, direction: 'down' }}
  />
  <KPICard
    title="Utilidad Real"
    value={formatCurrency(utilidadTotal)}
    subtitle={`Margen: ${margenPromedio.toFixed(1)}%`}
    icon={<TrendingUpIcon />}
    color="blue"
  />
</div>
```

#### 2. Gráfico de Status Financiero (Donut Chart)

**Query SQL:**
```sql
SELECT
  status_financiero_integral,
  COUNT(*) AS cantidad,
  SUM(ingresos_pendientes) AS total_pendiente
FROM vw_eventos_analisis_financiero
GROUP BY status_financiero_integral;
```

**Recomendación:**
- Usar gráfico de dona (donut chart)
- 🟢 Verde para "saludable"
- 🟡 Amarillo para "atencion"
- 🔴 Rojo para "critico"
- Mostrar cantidad de eventos en cada categoría
- Al hacer clic, filtrar tabla inferior

#### 3. Gráfico de Tendencia de Cobro

**Query SQL:**
```sql
SELECT
  DATE_TRUNC('month', fecha_evento) AS mes,
  SUM(ingresos_cobrados) AS cobrado,
  SUM(ingresos_pendientes) AS pendiente,
  SUM(ingresos_totales) AS total
FROM vw_eventos_analisis_financiero
WHERE fecha_evento >= NOW() - INTERVAL '12 months'
GROUP BY mes
ORDER BY mes;
```

**Recomendación:**
- Gráfico de barras apiladas (stacked bar chart)
- Barra verde: ingresos cobrados
- Barra naranja: ingresos pendientes
- Línea: total de ingresos
- Eje X: meses
- Eje Y: montos en miles

---

## 💰 Panel de Cuentas por Cobrar

### Layout Recomendado

```
┌─────────────────────────────────────────────────────────────┐
│              SEGUIMIENTO DE CUENTAS POR COBRAR              │
└─────────────────────────────────────────────────────────────┘

┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────┐
│  Recientes   │ │   Urgentes   │ │Muy Urgentes │ │ Críticos │
│  (≤30 días)  │ │ (31-60 días) │ │(61-90 días) │ │(>90 días)│
│              │ │              │ │             │ │          │
│  🟢 45       │ │  🟡 23       │ │  🟠 12      │ │  🔴 8    │
│  $1.2M       │ │  $890K       │ │  $1.5M      │ │  $2.8M   │
└──────────────┘ └──────────────┘ └──────────────┘ └──────────┘

┌─────────────────────────────────────────────────────────────┐
│                    TABLA DE EVENTOS                         │
│  Filtros: [Cliente ▼] [Urgencia ▼] [Monto Min-Max]        │
│  Búsqueda: [_____________________]                          │
│                                                             │
│  Urgencia  Evento     Cliente      Pendiente  %Cobrado Días│
│  ──────────────────────────────────────────────────────────│
│  🔴        EVT-045    ABC Corp     $450K      35%      87  │
│  🔴        EVT-078    XYZ Ltd      $380K      42%      94  │
│  🟠        EVT-032    DEF Inc      $320K      68%      71  │
│  🟡        EVT-091    GHI SA       $180K      75%      45  │
│  🟢        EVT-102    JKL Corp     $95K       85%      22  │
│                                                             │
│  [Acciones: Enviar Recordatorio | Generar Reporte]         │
└─────────────────────────────────────────────────────────────┘
```

### Componentes Clave

#### 1. Cards de Categoría de Urgencia

**Query SQL:**
```sql
SELECT
  categoria_urgencia,
  COUNT(*) AS eventos,
  SUM(ingresos_pendientes) AS monto_total,
  AVG(porcentaje_cobrado) AS promedio_cobrado
FROM vw_eventos_problemas_cobro
GROUP BY categoria_urgencia
ORDER BY
  CASE categoria_urgencia
    WHEN 'critico' THEN 1
    WHEN 'muy_urgente' THEN 2
    WHEN 'urgente' THEN 3
    WHEN 'reciente' THEN 4
  END;
```

**Diseño React:**
```tsx
<div className="grid grid-cols-4 gap-4">
  {urgencyCategories.map(cat => (
    <UrgencyCard
      key={cat.categoria}
      icon={getUrgencyIcon(cat.categoria)}
      color={getUrgencyColor(cat.categoria)}
      title={cat.categoria}
      eventCount={cat.eventos}
      amount={formatCurrency(cat.monto_total)}
      avgCollected={cat.promedio_cobrado}
      onClick={() => filterByUrgency(cat.categoria)}
    />
  ))}
</div>
```

#### 2. Tabla Interactiva de Eventos

**Features:**
- Filtros por cliente, urgencia, rango de monto
- Búsqueda por clave de evento o nombre
- Ordenamiento por columna (pendiente, días, % cobrado)
- Paginación
- Acciones: Ver detalle, Enviar recordatorio, Generar factura

**Código de color de urgencia:**
```tsx
const getUrgencyConfig = (categoria: string) => {
  const configs = {
    'critico': { icon: '🔴', color: 'red', bgColor: 'bg-red-50', textColor: 'text-red-700' },
    'muy_urgente': { icon: '🟠', color: 'orange', bgColor: 'bg-orange-50', textColor: 'text-orange-700' },
    'urgente': { icon: '🟡', color: 'yellow', bgColor: 'bg-yellow-50', textColor: 'text-yellow-700' },
    'reciente': { icon: '🟢', color: 'green', bgColor: 'bg-green-50', textColor: 'text-green-700' }
  };
  return configs[categoria] || configs.reciente;
};
```

#### 3. Gráfico de Evolución de Cobro por Cliente

**Query SQL:**
```sql
SELECT
  c.razon_social AS cliente,
  COUNT(e.id) AS eventos_totales,
  SUM(e.ingresos_pendientes) AS total_pendiente,
  AVG(e.porcentaje_cobro) AS promedio_cobro
FROM vw_eventos_analisis_financiero e
JOIN evt_clientes c ON e.cliente_id = c.id
WHERE e.ingresos_pendientes > 0
GROUP BY c.id, c.razon_social
ORDER BY total_pendiente DESC
LIMIT 10;
```

**Recomendación:**
- Gráfico horizontal de barras
- Mostrar top 10 clientes con mayor monto pendiente
- Color de barra según promedio de cobro:
  - Verde: > 80%
  - Amarillo: 50-80%
  - Rojo: < 50%

---

## 💸 Panel de Control Presupuestal

### Layout Recomendado

```
┌─────────────────────────────────────────────────────────────┐
│            CONTROL DE GASTOS VS PROVISIONES                 │
└─────────────────────────────────────────────────────────────┘

┌──────────────────┐ ┌──────────────────┐ ┌─────────────────┐
│  Dentro          │ │  Advertencia     │ │  Excede         │
│  Presupuesto     │ │  (100-105%)      │ │  Presupuesto    │
│                  │ │                  │ │                 │
│  🟢 198 (72%)    │ │  🟡 45 (16%)     │ │  🔴 31 (12%)    │
│  Ahorro: $2.3M   │ │  Exceso: $450K   │ │  Exceso: $3.1M  │
└──────────────────┘ └──────────────────┘ └─────────────────┘

┌─────────────────────────────────────────────────────────────┐
│           GASTOS PAGADOS VS PROVISIONES POR MES             │
│                                                             │
│  █████████████  Graph de barras comparativas               │
│  Barra azul: Provisiones (estimado)                        │
│  Barra verde/roja: Gastos pagados (real)                   │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│              EVENTOS CON MAYOR EXCESO                       │
│  Evento      Provisiones   Pagado    Exceso    Variación   │
│  ──────────────────────────────────────────────────────────│
│  EVT-045     $120,000    $145,000   +$25,000    +20.8%    │
│  EVT-078     $95,000     $112,000   +$17,000    +17.9%    │
└─────────────────────────────────────────────────────────────┘
```

### Componentes Clave

#### 1. Cards de Status Presupuestal

**Query SQL:**
```sql
SELECT
  status_presupuestal,
  COUNT(*) AS cantidad,
  SUM(CASE WHEN diferencia_gastos_absoluta < 0
      THEN ABS(diferencia_gastos_absoluta) ELSE 0 END) AS ahorro_total,
  SUM(CASE WHEN diferencia_gastos_absoluta > 0
      THEN diferencia_gastos_absoluta ELSE 0 END) AS exceso_total
FROM vw_eventos_analisis_financiero
WHERE status_presupuestal != 'sin_presupuesto'
GROUP BY status_presupuestal;
```

#### 2. Gráfico Comparativo de Provisiones vs Gastos

**Tipo:** Gráfico de barras agrupadas por mes

**Query SQL:**
```sql
SELECT
  DATE_TRUNC('month', fecha_evento) AS mes,
  SUM(provisiones) AS total_provisiones,
  SUM(gastos_pagados) AS total_pagado,
  SUM(gastos_pendientes) AS total_pendiente
FROM vw_eventos_analisis_financiero
WHERE fecha_evento >= NOW() - INTERVAL '12 months'
GROUP BY mes
ORDER BY mes;
```

**Recomendación:**
- Barras azules: provisiones
- Barras verdes (si dentro): gastos pagados
- Barras rojas (si excede): gastos pagados
- Barras grises: gastos pendientes

---

## 🔍 Vista Detallada por Evento

### Layout Recomendado

```
┌─────────────────────────────────────────────────────────────┐
│  Evento: EVT-2025-045 - Congreso Internacional 2025        │
│  Cliente: ABC Corporation                                   │
│  Fecha: 15 de Agosto 2025                                  │
│  Status: 🟡 Requiere Atención                              │
└─────────────────────────────────────────────────────────────┘

┌───────────────────────┐ ┌───────────────────────────────────┐
│   RESUMEN FINANCIERO  │ │      COMPARACIÓN VISUAL           │
│                       │ │                                   │
│  Estimado  Monto Real │ │   Ingresos:  ████████░░  85%     │
│  ──────────────────   │ │   Gastos:    ███████████ 112%    │
│  Ingresos             │ │   Utilidad:  ████░░░░░░  42%     │
│  $200,000  $170,000   │ │                                   │
│                       │ │   🟢 Dentro  🟡 Cerca  🔴 Excede │
│  Gastos               │ │                                   │
│  $120,000  $134,000   │ └───────────────────────────────────┘
│                       │
│  Utilidad             │ ┌───────────────────────────────────┐
│  $80,000   $36,000    │ │    DESGLOSE DE INGRESOS           │
│                       │ │                                   │
│  Margen: 45% → 21%    │ │  Cobrados:      $170,000  (85%)  │
│                       │ │  Pendientes:     $30,000  (15%)  │
└───────────────────────┘ │  Total Registrado: $200,000      │
                          └───────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│              TABLA DETALLADA: INGRESOS                      │
│  Concepto         Monto     Cobrado   Fecha Cobro   Status │
│  ──────────────────────────────────────────────────────────│
│  Anticipo 50%    $100,000     ✅      15/Jun/2025   Cobrado│
│  Pago Final 35%   $70,000     ✅      20/Ago/2025   Cobrado│
│  Extra Servicios  $30,000     ⏳      -            Pendiente│
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│              TABLA DETALLADA: GASTOS                        │
│  Concepto         Presup.    Pagado   Diferencia    Status │
│  ──────────────────────────────────────────────────────────│
│  Venue           $50,000    $52,000   +$2,000 🔴  Excede   │
│  Catering        $40,000    $42,000   +$2,000 🟡  Advertenc│
│  A/V             $30,000    $28,000   -$2,000 🟢  Dentro   │
│  Personal        $12,000    $12,000    $0    🟢  Exacto    │
└─────────────────────────────────────────────────────────────┘
```

### Query SQL para Vista Detallada

```sql
-- Resumen del evento
SELECT * FROM get_evento_financial_summary(evento_id);

-- Desglose de ingresos
SELECT
  i.concepto,
  i.total,
  i.cobrado,
  i.fecha_cobro,
  CASE WHEN i.cobrado THEN 'Cobrado' ELSE 'Pendiente' END AS status
FROM evt_ingresos i
WHERE i.evento_id = evento_id
  AND i.deleted_at IS NULL
ORDER BY i.cobrado DESC, i.created_at;

-- Desglose de gastos vs provisiones
SELECT
  g.concepto,
  g.presupuesto,
  g.total AS pagado,
  g.total - g.presupuesto AS diferencia,
  CASE
    WHEN g.total <= g.presupuesto THEN 'Dentro'
    WHEN g.total <= g.presupuesto * 1.05 THEN 'Advertencia'
    ELSE 'Excede'
  END AS status
FROM evt_gastos g
WHERE g.evento_id = evento_id
  AND g.pagado = true
  AND g.deleted_at IS NULL
ORDER BY ABS(g.total - g.presupuesto) DESC;
```

---

## 🔔 Alertas y Notificaciones

### Configuración de Alertas

#### 1. Alertas de Cobro Crítico

**Trigger:**
```sql
SELECT
  id,
  clave_evento,
  cliente_nombre,
  ingresos_pendientes,
  dias_desde_evento
FROM vw_eventos_problemas_cobro
WHERE categoria_urgencia IN ('muy_urgente', 'critico')
  AND ingresos_pendientes > 50000;
```

**Acción:**
- Notificación push al gerente financiero
- Email al responsable del evento
- Badge rojo en el dashboard

#### 2. Alertas de Exceso Presupuestal

**Trigger:**
```sql
SELECT
  id,
  clave_evento,
  provisiones,
  gastos_pagados,
  diferencia_gastos_absoluta,
  variacion_gastos_porcentaje
FROM vw_eventos_analisis_financiero
WHERE status_presupuestal = 'excede_presupuesto'
  AND ABS(diferencia_gastos_absoluta) > 10000;
```

**Acción:**
- Notificación a gerente de operaciones
- Requiere justificación del exceso

#### 3. Alertas de Utilidad Baja

**Trigger:**
```sql
SELECT
  id,
  clave_evento,
  utilidad_estimada,
  utilidad_real,
  margen_utilidad_real
FROM vw_eventos_analisis_financiero
WHERE margen_utilidad_real < 10
  AND utilidad_estimada > 0;
```

**Acción:**
- Revisión de rentabilidad
- Análisis de causas

### Panel de Notificaciones

```tsx
<NotificationPanel>
  <NotificationItem
    type="critical"
    icon={<AlertIcon />}
    title="8 eventos con cobro crítico"
    description="Más de 90 días desde el evento"
    amount="$2.8M pendiente"
    action="Ver Eventos"
    onClick={() => navigate('/cobro-critico')}
  />
  <NotificationItem
    type="warning"
    icon={<WarningIcon />}
    title="12 eventos exceden presupuesto"
    description="Exceso total de $850K"
    action="Revisar"
  />
</NotificationPanel>
```

---

## 📄 Reportes y Exportaciones

### 1. Reporte de Cuentas por Cobrar

**Formato:** PDF / Excel

**Contenido:**
- Resumen ejecutivo
- Lista de eventos con cobro pendiente
- Agrupado por cliente
- Categorizado por urgencia
- Total pendiente de cobro
- Recomendaciones de acción

**Query SQL:**
```sql
SELECT
  e.clave_evento,
  e.nombre_proyecto,
  c.razon_social AS cliente,
  e.fecha_evento,
  e.ingresos_totales,
  e.ingresos_cobrados,
  e.ingresos_pendientes,
  e.porcentaje_cobrado,
  e.dias_desde_evento,
  e.categoria_urgencia,
  e.facturas_pendientes
FROM vw_eventos_problemas_cobro e
ORDER BY e.ingresos_pendientes DESC;
```

### 2. Reporte de Control Presupuestal

**Contenido:**
- Eventos dentro/fuera de presupuesto
- Análisis de variaciones
- Top eventos con mayor exceso
- Análisis de categorías de gasto

**Query SQL:**
```sql
SELECT
  e.clave_evento,
  e.nombre_proyecto,
  e.provisiones,
  e.gastos_pagados,
  e.gastos_pendientes,
  e.diferencia_gastos_absoluta,
  e.variacion_gastos_porcentaje,
  e.status_presupuestal
FROM vw_eventos_analisis_financiero e
WHERE e.provisiones > 0
ORDER BY ABS(e.diferencia_gastos_absoluta) DESC;
```

### 3. Reporte de Rentabilidad

**Contenido:**
- Análisis de utilidad real vs estimada
- Márgenes de utilidad
- Eventos más/menos rentables
- Tendencias por tipo de evento

---

## 🎨 Códigos de Color Recomendados

### Status de Cobro

| Status | Color | Hex | Uso |
|--------|-------|-----|-----|
| `sin_ingresos` | Gris | `#9CA3AF` | Sin ingresos registrados |
| `cobrado_completo` | Verde | `#10B981` | 100% cobrado |
| `cobro_bueno` | Verde claro | `#34D399` | ≥80% cobrado |
| `cobro_parcial` | Amarillo | `#FBBF24` | 50-80% cobrado |
| `cobro_critico` | Rojo | `#EF4444` | <50% cobrado |

### Status Presupuestal

| Status | Color | Hex | Uso |
|--------|-------|-----|-----|
| `sin_presupuesto` | Gris | `#9CA3AF` | Sin provisiones |
| `dentro_presupuesto` | Verde | `#10B981` | ≤100% del presupuesto |
| `advertencia` | Amarillo | `#FBBF24` | 100-105% del presupuesto |
| `excede_presupuesto` | Rojo | `#EF4444` | >105% del presupuesto |

### Status Financiero Integral

| Status | Color | Hex | Icono |
|--------|-------|-----|-------|
| `saludable` | Verde | `#10B981` | 🟢 |
| `atencion` | Amarillo | `#FBBF24` | 🟡 |
| `critico` | Rojo | `#EF4444` | 🔴 |

### Categorías de Urgencia

| Categoría | Color | Hex | Icono | Días |
|-----------|-------|-----|-------|------|
| `reciente` | Verde | `#10B981` | 🟢 | 0-30 |
| `urgente` | Amarillo | `#FBBF24` | 🟡 | 31-60 |
| `muy_urgente` | Naranja | `#F97316` | 🟠 | 61-90 |
| `critico` | Rojo | `#EF4444` | 🔴 | >90 |

---

## 💡 Mejores Prácticas

### 1. Performance

- Usar índices creados en la migración
- Cachear datos de dashboard (refresh cada 5 min)
- Paginar tablas grandes (25-50 registros por página)
- Lazy loading para gráficos pesados

### 2. UX/UI

- Mostrar loading skeletons durante carga
- Usar tooltips para explicar métricas
- Permitir export de datos visibles
- Responsive design para móviles
- Acciones rápidas en hover (ver detalle, enviar email)

### 3. Accesibilidad

- No depender solo del color (usar iconos también)
- Alto contraste para texto sobre fondos de color
- Labels descriptivos para lectores de pantalla
- Navegación por teclado

### 4. Actualizaciones en Tiempo Real

```tsx
// Polling cada 5 minutos
useEffect(() => {
  const interval = setInterval(() => {
    refetchDashboardData();
  }, 5 * 60 * 1000);

  return () => clearInterval(interval);
}, []);
```

---

## 🚀 Implementación Sugerida

### Fase 1: Dashboard Básico (Semana 1)
- KPI cards principales
- Tabla de eventos con problemas de cobro
- Status financiero integral

### Fase 2: Visualizaciones (Semana 2)
- Gráficos de tendencias
- Gráficos de distribución
- Panel de control presupuestal

### Fase 3: Alertas (Semana 3)
- Sistema de notificaciones
- Emails automáticos
- Configuración de umbrales

### Fase 4: Reportes (Semana 4)
- Generación de PDFs
- Exports a Excel
- Dashboards personalizados

---

## 📚 Referencias

- Vista principal: `vw_eventos_analisis_financiero`
- Vista de problemas: `vw_eventos_problemas_cobro`
- Función helper: `get_evento_financial_summary(evento_id)`
- Migración: [migrations/009_enhance_financial_view_with_income_analysis.sql](migrations/009_enhance_financial_view_with_income_analysis.sql)

---

**Última actualización**: 28 de Octubre 2025
**Estado**: 📘 Guía Completa para Implementación
