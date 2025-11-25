# Resumen Ejecutivo: División de Provisiones en 4 Categorías

## 📌 Visión General

Actualmente, el campo `provisiones` en `evt_eventos` almacena un único monto total de gastos estimados. Este cambio lo dividirá en **4 categorías específicas** para mejorar el control y análisis financiero:

```
ANTES:
┌─────────────────────┐
│ provisiones         │
│ $100,000           │
└─────────────────────┘

DESPUÉS:
┌────────────────────────────────────────────────┐
│ provision_combustible_peaje    │ $15,000      │
│ provision_materiales           │ $30,000      │
│ provision_recursos_humanos     │ $40,000      │
│ provision_solicitudes_pago     │ $15,000      │
├────────────────────────────────────────────────┤
│ provisiones (calculado)        │ $100,000     │
└────────────────────────────────────────────────┘
```

---

## 🎯 Objetivos del Cambio

### Problemas Actuales
- ❌ Imposible saber cuánto se estimó por tipo de gasto
- ❌ Difícil identificar dónde se desvía el presupuesto
- ❌ Reportes financieros muy generales
- ❌ No hay visibilidad de distribución de costos

### Solución Propuesta
- ✅ Desglose detallado de provisiones por categoría
- ✅ Comparación precisa: estimado vs real por tipo
- ✅ Identificación rápida de desviaciones
- ✅ Mejor toma de decisiones con datos granulares

---

## 📊 Impacto en el Sistema

### Base de Datos
| Componente | Acción | Complejidad |
|------------|--------|-------------|
| Tabla `evt_eventos` | Agregar 4 columnas nuevas | 🟡 Media |
| Vista `vw_eventos_analisis_financiero` | Actualizar con desglose | 🔴 Alta |
| Vista `vw_eventos_completos` | Agregar campos | 🟢 Baja |
| Función `get_evento_financial_summary` | Actualizar retorno | 🟡 Media |
| Migración de datos | Distribuir provisiones existentes | 🟡 Media |

**Total de archivos DB afectados:** 5

### Frontend
| Componente | Acción | Complejidad |
|------------|--------|-------------|
| `Event.ts` (tipos) | Agregar interfaces nuevas | 🟢 Baja |
| `EventForm.tsx` | 4 inputs nuevos | 🟡 Media |
| `EventFinancialComparison.tsx` | Comparación por categoría | 🔴 Alta |
| `FinancialBalancePanel.tsx` | Desglose colapsable | 🟢 Baja |
| `ProvisionesBreakdownChart.tsx` | Crear gráfica pie (NUEVO) | 🟡 Media |
| `EventosListPage.tsx` | Columnas opcionales | 🟡 Media |
| `useEventFinancialAnalysis.ts` | Lógica de análisis | 🔴 Alta |
| `financialExportService.ts` | Exportar desglose | 🟡 Media |

**Total de archivos frontend afectados:** 8

---

## 🗂️ Categorías de Provisiones

### 1. Combustible/Peaje
**Campo:** `provision_combustible_peaje`
**Incluye:**
- Gasolina
- Diésel
- Peajes de casetas
- Transporte de equipo

**Ejemplo:** $15,000

---

### 2. Materiales
**Campo:** `provision_materiales`
**Incluye:**
- Suministros
- Materiales de construcción
- Compras de equipo
- Herramientas

**Ejemplo:** $30,000

---

### 3. Recursos Humanos
**Campo:** `provision_recursos_humanos`
**Incluye:**
- Pago de staff
- Técnicos
- Personal de apoyo
- Honorarios

**Ejemplo:** $40,000

---

### 4. Solicitudes de Pago
**Campo:** `provision_solicitudes_pago`
**Incluye:**
- Proveedores externos
- Servicios contratados
- Pagos a terceros
- SPs (Solicitudes de Pago)

**Ejemplo:** $15,000

---

## 📐 Arquitectura de la Solución

### Flujo de Datos

```
┌─────────────────────────────────────────────────────────┐
│                   EVENTO (evt_eventos)                   │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  provision_combustible_peaje    = $15,000               │
│  provision_materiales           = $30,000               │
│  provision_recursos_humanos     = $40,000               │
│  provision_solicitudes_pago     = $15,000               │
│                                           ↓              │
│  provisiones (calculado)        = $100,000 ←─ TRIGGER   │
│                                                          │
└─────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────┐
│          GASTOS REALES (evt_gastos)                      │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Categoría: Combustible/Peaje  → $12,000 (pagado)       │
│  Categoría: Materiales         → $35,000 (pagado)       │
│  Categoría: Recursos Humanos   → $38,000 (pagado)       │
│  Categoría: SPs                → $16,000 (pagado)       │
│                                                          │
│  TOTAL GASTOS PAGADOS          = $101,000               │
│                                                          │
└─────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────┐
│      VISTA: vw_eventos_analisis_financiero               │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ANÁLISIS POR CATEGORÍA:                                │
│                                                          │
│  Combustible:                                           │
│    Provisión: $15,000                                   │
│    Real:      $12,000                                   │
│    Variación: -20% ✓ (ahorro)                          │
│    Status:    dentro_presupuesto                        │
│                                                          │
│  Materiales:                                            │
│    Provisión: $30,000                                   │
│    Real:      $35,000                                   │
│    Variación: +16.7% ⚠️ (sobrecosto)                   │
│    Status:    excede_presupuesto                        │
│                                                          │
│  RH:                                                    │
│    Provisión: $40,000                                   │
│    Real:      $38,000                                   │
│    Variación: -5% ✓                                     │
│    Status:    dentro_presupuesto                        │
│                                                          │
│  SPs:                                                   │
│    Provisión: $15,000                                   │
│    Real:      $16,000                                   │
│    Variación: +6.7% ⚠️                                  │
│    Status:    advertencia (< 105%)                      │
│                                                          │
└─────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────┐
│              FRONTEND (Componentes React)                │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  • EventForm: Inputs desglosados                        │
│  • EventFinancialComparison: Comparación por categoría  │
│  • ProvisionesBreakdownChart: Gráfica pie              │
│  • EventosListPage: Columnas filtros                    │
│  • FinancialBalancePanel: Desglose colapsable          │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

---

## 🔄 Estrategia de Migración de Datos

### Eventos Existentes (con provisiones sin desglose)

**Opción 1: Distribución Proporcional (Recomendada)**

Si el evento ya tiene gastos reales, distribuir proporcionalmente:

```sql
Ejemplo:
  Provisiones totales: $100,000

  Gastos reales:
    Combustible: $10,000 (10%)
    Materiales:  $40,000 (40%)
    RH:          $30,000 (30%)
    SPs:         $20,000 (20%)

  Provisiones calculadas:
    provision_combustible_peaje    = $100,000 × 10% = $10,000
    provision_materiales           = $100,000 × 40% = $40,000
    provision_recursos_humanos     = $100,000 × 30% = $30,000
    provision_solicitudes_pago     = $100,000 × 20% = $20,000
```

**Opción 2: Distribución Equitativa**

Si el evento no tiene gastos todavía, distribuir 25% a cada categoría:

```sql
provision_combustible_peaje    = $100,000 × 0.25 = $25,000
provision_materiales           = $100,000 × 0.25 = $25,000
provision_recursos_humanos     = $100,000 × 0.25 = $25,000
provision_solicitudes_pago     = $100,000 × 0.25 = $25,000
```

**Nota:** La función `distribute_existing_provisiones()` se encarga automáticamente de esto.

---

## 🎨 Mockup del Frontend

### Formulario de Evento (EventForm.tsx)

```
┌─────────────────────────────────────────────────────────────┐
│                 Provisiones por Categoría                    │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────────────────┐  ┌─────────────────────────┐  │
│  │ Combustible y Peajes ($)│  │ Materiales ($)          │  │
│  │ (Gasolina, casetas)     │  │ (Suministros, compras)  │  │
│  │ ┌─────────────────────┐ │  │ ┌─────────────────────┐ │  │
│  │ │     15,000.00       │ │  │ │     30,000.00       │ │  │
│  │ └─────────────────────┘ │  │ └─────────────────────┘ │  │
│  └─────────────────────────┘  └─────────────────────────┘  │
│                                                              │
│  ┌─────────────────────────┐  ┌─────────────────────────┐  │
│  │ Recursos Humanos ($)    │  │ Solicitudes de Pago ($) │  │
│  │ (Staff, técnicos)       │  │ (Proveedores, servicios)│  │
│  │ ┌─────────────────────┐ │  │ ┌─────────────────────┐ │  │
│  │ │     40,000.00       │ │  │ │     15,000.00       │ │  │
│  │ └─────────────────────┘ │  │ └─────────────────────┘ │  │
│  └─────────────────────────┘  └─────────────────────────┘  │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ 💡 Total Provisiones: $100,000.00                      │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  ⚠️ Advertencia: El margen de utilidad estimado (32%) es   │
│     menor al recomendado (35%). Considera ajustar.          │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Análisis Financiero (EventFinancialComparison.tsx)

```
┌─────────────────────────────────────────────────────────────┐
│              Análisis por Categoría de Gasto                 │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌────────────────────────────────────────────────┐ ✓       │
│  │ Combustible/Peaje                              │         │
│  ├────────────────────────────────────────────────┤         │
│  │ Provisión: $15,000 | Real: $12,000            │         │
│  │ Variación: -$3,000 (-20%) ✓ Ahorro            │         │
│  └────────────────────────────────────────────────┘         │
│                                                              │
│  ┌────────────────────────────────────────────────┐ 🚨      │
│  │ Materiales                                     │         │
│  ├────────────────────────────────────────────────┤         │
│  │ Provisión: $30,000 | Real: $35,000            │         │
│  │ Variación: +$5,000 (+16.7%) 🚨 Excede         │         │
│  └────────────────────────────────────────────────┘         │
│                                                              │
│  ┌────────────────────────────────────────────────┐ ✓       │
│  │ Recursos Humanos                               │         │
│  ├────────────────────────────────────────────────┤         │
│  │ Provisión: $40,000 | Real: $38,000            │         │
│  │ Variación: -$2,000 (-5%) ✓ Dentro             │         │
│  └────────────────────────────────────────────────┘         │
│                                                              │
│  ┌────────────────────────────────────────────────┐ ⚠️      │
│  │ Solicitudes de Pago                            │         │
│  ├────────────────────────────────────────────────┤         │
│  │ Provisión: $15,000 | Real: $16,000            │         │
│  │ Variación: +$1,000 (+6.7%) ⚠️ Advertencia     │         │
│  └────────────────────────────────────────────────┘         │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Gráfica de Distribución (ProvisionesBreakdownChart.tsx)

```
┌─────────────────────────────────────────────────────────────┐
│            Distribución de Provisiones (Pie Chart)           │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│                      🥧 Gráfica Pie                         │
│                                                              │
│                  ┌─────────────────┐                        │
│                  │                 │                        │
│              ┌───┤   40% RH       │───┐                    │
│              │   │                 │   │                    │
│          15% │   └─────────────────┘   │ 30%               │
│        Comb. │                         │ Mat.              │
│              │                         │                    │
│              └─────────────────────────┘                    │
│                       15% SPs                               │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ 🟠 Combustible/Peaje  $15,000   15%                    │ │
│  │ 🔵 Materiales         $30,000   30%                    │ │
│  │ 🟢 Recursos Humanos   $40,000   40%                    │ │
│  │ 🟣 Solicitudes Pago   $15,000   15%                    │ │
│  ├────────────────────────────────────────────────────────┤ │
│  │ Total                $100,000  100%                    │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## ⏱️ Cronograma de Implementación

### Semana 1 (4-8 Nov)
**Día 1-2:** Base de Datos
- [x] Crear migración 010
- [x] Ejecutar en desarrollo
- [x] Distribuir datos existentes
- [x] Validar integridad

**Día 3:** Backend
- [x] Actualizar tipos TypeScript
- [x] Actualizar hook useEventFinancialAnalysis
- [x] Actualizar financialExportService

### Semana 2 (11-15 Nov)
**Día 4-5:** Frontend Core
- [x] Actualizar EventForm
- [x] Actualizar EventFinancialComparison
- [x] Crear ProvisionesBreakdownChart

**Día 6:** Frontend Secundario
- [x] Actualizar FinancialBalancePanel
- [x] Actualizar EventosListPage

**Día 7:** Testing y Documentación
- [x] Tests unitarios
- [x] Tests integración
- [x] Actualizar docs

### Semana 3 (18-22 Nov)
**Día 8:** Deploy
- [x] Merge a main
- [x] Ejecutar en producción
- [x] Monitoreo

---

## 💰 Costo Estimado

| Fase | Horas | Tasa/Hora | Subtotal |
|------|-------|-----------|----------|
| Análisis y diseño | 3h | $50 | $150 |
| Base de datos | 4h | $60 | $240 |
| Backend | 3h | $60 | $180 |
| Frontend | 8h | $50 | $400 |
| Testing | 3h | $40 | $120 |
| Documentación | 2h | $30 | $60 |
| Deploy | 1h | $60 | $60 |
| **TOTAL** | **24h** | — | **$1,210** |

---

## ✅ Beneficios Esperados

### Operacionales
- ⏱️ **Reducción de tiempo** en análisis financiero (30% más rápido)
- 📊 **Mejor toma de decisiones** con datos granulares
- 🎯 **Identificación inmediata** de desviaciones por categoría

### Financieros
- 💰 **Control de costos** más preciso
- 📈 **Optimización de presupuestos** basada en datos históricos
- 🔍 **Detección temprana** de sobrecostos

### Estratégicos
- 📋 **Reportes ejecutivos** más detallados
- 🔄 **Mejora continua** del proceso de cotización
- 🏆 **Ventaja competitiva** con análisis avanzado

---

## 🚦 Indicadores de Éxito (KPIs)

### Técnicos
| KPI | Meta | Medición |
|-----|------|----------|
| Integridad de datos | 100% | Provisiones_total = suma categorías |
| Performance de vistas | < 2s | EXPLAIN ANALYZE |
| Cobertura de tests | > 80% | Jest coverage report |
| Errores en producción | 0 | Monitoring logs |

### Negocio
| KPI | Meta | Medición |
|-----|------|----------|
| Adopción de usuarios | > 90% | Google Analytics |
| Eventos con desglose | > 75% | Query en 30 días |
| Tiempo de análisis | -30% | Encuesta usuarios |
| Satisfacción | > 4.5/5 | NPS |

---

## 📞 Contactos

**Desarrollador Principal:** [Tu nombre]
**Email:** [Tu email]
**Slack:** #erp-desarrollo

**Product Owner:** [Nombre]
**Email:** [Email]

**QA Lead:** [Nombre]
**Email:** [Email]

---

## 📚 Referencias

- [PLAN_DIVISION_PROVISIONES.md](PLAN_DIVISION_PROVISIONES.md) - Plan técnico completo
- [GUIA_USO_PROVISIONES.md](GUIA_USO_PROVISIONES.md) - Guía de usuario
- [Event.ts](src/types/Event.ts) - Tipos TypeScript

---

**Estado:** ✅ Aprobado para implementación
**Fecha de aprobación:** 29 de Octubre de 2025
**Próxima revisión:** 15 de Noviembre de 2025
