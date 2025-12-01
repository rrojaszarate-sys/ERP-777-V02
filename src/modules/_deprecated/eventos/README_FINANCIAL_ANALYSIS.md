# Sistema de Análisis Financiero de Eventos

## 📊 Resumen General

Sistema completo de análisis financiero que permite comparar proyecciones (estimados) con resultados reales de eventos, generando métricas de desempeño, alertas automáticas y reportes exportables.

---

## ✨ Características Implementadas

### 1. **Registro de Datos Financieros**

Cada evento registra:
- ✅ **Ingreso Estimado ($)** - Ganancia proyectada
- ✅ **Gastos Estimados ($)** - Costos proyectados
- ✅ **Ingreso Real ($)** - Ganancia real obtenida
- ✅ **Gastos Reales ($)** - Costos reales incurridos

### 2. **Cálculos Automáticos**

El sistema calcula automáticamente:

**Proyección (Estimado):**
- Utilidad Estimada = Ingreso Estimado - Gastos Estimados
- Margen Estimado (%) = (Utilidad Estimada / Ingreso Estimado) × 100

**Resultado (Real):**
- Utilidad Real = Ingreso Real - Gastos Reales
- Margen Real (%) = (Utilidad Real / Ingreso Real) × 100

**Comparaciones:**
- Diferencia Absoluta ($) = Utilidad Real - Utilidad Estimada
- Diferencia Porcentaje (%) = ((Utilidad Real / Utilidad Estimada) - 1) × 100
- Variación Ingresos (%) = ((Ingreso Real / Ingreso Estimado) - 1) × 100
- Variación Gastos (%) = ((Gastos Reales / Gastos Estimados) - 1) × 100
- Variación Margen = Margen Real - Margen Estimado

### 3. **Panel de Balance Financiero**

Muestra dos secciones lado a lado:
- **Proyección (Estimado)** - Datos de planificación inicial
- **Resultado (Real)** - Datos ejecutados reales
- **Comparación** - Diferencias y variaciones

### 4. **Sistema de Indicadores con Colores**

**Margen de Utilidad:**
- 🟢 Verde: Margen ≥ 35%
- 🔴 Rojo: Margen < 35%

**Variación:**
- 🟡 Amarillo: Variación > ±10%
- 🔴 Rojo: Variación > ±20%

**Estados de Evento:**
- 🟢 Excelente: Margen ≥ 50%
- 🔵 Bueno: Margen ≥ 35%
- 🟡 Alerta: Margen ≥ 20%
- 🔴 Crítico: Margen < 20%

### 5. **Sistema de Filtros Avanzado**

Filtra eventos por:
- ✅ Cliente
- ✅ Fecha (inicio/fin)
- ✅ Tipo de evento
- ✅ Responsable
- ✅ Año
- ✅ Mes
- ✅ Margen mínimo (%)
- ✅ Solo eventos completados

### 6. **Resumen Global del Portafolio**

Métricas consolidadas:

**Totales:**
- Total de Ingresos Estimados vs Reales
- Total de Gastos Estimados vs Reales
- Total de Utilidad Estimada vs Real

**Promedios:**
- Promedio de Margen Estimado
- Promedio de Margen Real

**Desviaciones:**
- % de Desviación en Ingresos
- % de Desviación en Gastos
- % de Desviación en Utilidad
- % de Desviación Global

**Métricas de Desempeño:**
- Eventos sobre estimación (mejor que lo esperado)
- Eventos bajo estimación (peor que lo esperado)
- Eventos con margen crítico (< 35%)
- Tasa de precisión de estimaciones (%)

### 7. **Exportación de Reportes**

- ✅ **PDF** - Reporte visual completo con gráficos
- ✅ **Excel/CSV** - Datos tabulados para análisis adicional

Ambos incluyen:
- Resumen del portafolio
- Análisis detallado por evento
- Comparaciones y variaciones

---

## 📂 Estructura de Archivos

### Tipos y Modelos
```
src/modules/eventos/types/Event.ts
├── EventFinancialAnalysis
├── FinancialProjection
├── FinancialResult
├── FinancialComparison
├── PortfolioFinancialSummary
└── FinancialFilters
```

### Hooks
```
src/modules/eventos/hooks/
└── useEventFinancialAnalysis.ts
    ├── calculateEventAnalysis()
    ├── calculatePortfolioSummary()
    ├── calculateMultipleEventsAnalysis()
    ├── useMarginColor()
    ├── useVariationColor()
    └── useStatusBgColor()
```

### Componentes
```
src/modules/eventos/components/financial/
├── FinancialBalancePanel.tsx           # Panel individual por evento
├── PortfolioFinancialSummary.tsx       # Resumen global
└── FinancialFilters.tsx                # Filtros de búsqueda
```

### Páginas
```
src/modules/eventos/
└── FinancialAnalysisPage.tsx           # Página principal
```

### Servicios
```
src/modules/eventos/services/
└── financialExportService.ts
    ├── exportToExcel()
    └── exportToPDF()
```

### Base de Datos
```
supabase_old/migrations/
└── 20251023_add_financial_estimates_to_events.sql
    ├── Campos de estimación
    ├── Vista vw_eventos_analisis_financiero
    └── Comentarios y documentación
```

---

## 🚀 Guía de Uso

### 1. Aplicar Migración de Base de Datos

```bash
# Desde la raíz del proyecto
npx supabase db push

# O ejecutar manualmente en Supabase Dashboard:
# Copiar y pegar el contenido de:
# supabase_old/migrations/20251023_add_financial_estimates_to_events.sql
```

### 2. Actualizar Formulario de Evento

El formulario `EventForm.tsx` ya incluye los campos:
- Ganancia Estimada ($)
- Gastos Estimados ($)
- Utilidad Estimada (calculado)
- % Utilidad Estimada (calculado)

Los datos reales se registran automáticamente desde:
- Módulo de **Ingresos** → `total`
- Módulo de **Gastos** → `total_gastos`

### 3. Acceder a la Página de Análisis Financiero

Agregar ruta en el router principal:

```tsx
// src/App.tsx o router correspondiente
import { FinancialAnalysisPage } from './modules/eventos/FinancialAnalysisPage';

// Agregar ruta
<Route path="/eventos/analisis-financiero" element={<FinancialAnalysisPage />} />
```

### 4. Agregar al Menú de Navegación

```tsx
// En el menú de navegación
<NavLink to="/eventos/analisis-financiero">
  <BarChart3 className="w-5 h-5 mr-2" />
  Análisis Financiero
</NavLink>
```

---

## 📊 Ejemplos de Uso

### Ejemplo 1: Analizar un Evento Individual

```tsx
import { useEventFinancialAnalysis } from './hooks/useEventFinancialAnalysis';
import { FinancialBalancePanel } from './components/financial/FinancialBalancePanel';

const EventDetail = ({ event }) => {
  const { calculateEventAnalysis } = useEventFinancialAnalysis();
  const analysis = calculateEventAnalysis(event);

  return <FinancialBalancePanel analysis={analysis} />;
};
```

### Ejemplo 2: Resumen de Múltiples Eventos

```tsx
import { useEventFinancialAnalysis } from './hooks/useEventFinancialAnalysis';
import { PortfolioFinancialSummaryComponent } from './components/financial/PortfolioFinancialSummary';

const Dashboard = ({ events }) => {
  const { calculatePortfolioSummary } = useEventFinancialAnalysis();
  const summary = calculatePortfolioSummary(events);

  return <PortfolioFinancialSummaryComponent summary={summary} />;
};
```

### Ejemplo 3: Exportar a Excel

```tsx
import { FinancialExportService } from './services/financialExportService';

const handleExport = async () => {
  await FinancialExportService.exportToExcel(eventsAnalysis, portfolioSummary);
};
```

---

## 🎨 Personalización

### Modificar Umbrales de Alerta

Editar en `useEventFinancialAnalysis.ts`:

```typescript
// Cambiar umbral de margen crítico (default: 35%)
if (margen_real >= 35) // Tu valor aquí

// Cambiar umbral de variación warning (default: 10%)
if (abs_variacion > 10) // Tu valor aquí

// Cambiar umbral de variación danger (default: 20%)
if (abs_variacion > 20) // Tu valor aquí
```

### Personalizar Colores

Editar clases de Tailwind en componentes:
- `FinancialBalancePanel.tsx` - Colores del panel
- `PortfolioFinancialSummary.tsx` - Colores del resumen

---

## 📈 Métricas y KPIs

### KPIs Principales

1. **Tasa de Precisión de Estimación**
   - Mide qué tan acertadas son las proyecciones
   - Fórmula: 100 - Desviación Global
   - Meta: > 80%

2. **Margen Real Promedio**
   - Rentabilidad promedio de eventos
   - Meta: ≥ 35%

3. **Desviación Global**
   - Precisión general de planificación
   - Meta: < 15%

4. **Eventos con Margen Crítico**
   - Eventos en zona de riesgo
   - Meta: 0 eventos

### Interpretación de Resultados

**Desviación Positiva en Ingresos (+%):**
- ✅ Bueno: Ventas superaron proyección
- Acción: Analizar qué funcionó bien para replicar

**Desviación Positiva en Gastos (+%):**
- ⚠️ Atención: Costos superaron presupuesto
- Acción: Revisar control de costos

**Desviación Negativa en Utilidad (-%):**
- 🚨 Crítico: Ganancia menor a lo esperado
- Acción: Revisar pricing y eficiencia operativa

---

## 🔧 Troubleshooting

### Problema: No aparecen datos en el análisis

**Soluciones:**
1. Verificar que los eventos tengan datos en `ganancia_estimada` y `gastos_estimados`
2. Confirmar que existan ingresos/gastos reales registrados
3. Revisar filtros activos

### Problema: Exportación no funciona

**Soluciones:**
1. Verificar permisos del navegador para descargas
2. Revisar consola del navegador para errores
3. Confirmar que hay datos para exportar

### Problema: Cálculos incorrectos

**Soluciones:**
1. Verificar que la migración de BD se aplicó correctamente
2. Confirmar que campos numéricos no sean null
3. Revisar vista `vw_eventos_analisis_financiero`

---

## 🔮 Mejoras Futuras Sugeridas

### Corto Plazo
- [ ] Gráficos interactivos (ChartJS, Recharts)
- [ ] Comparación histórica (tendencias)
- [ ] Notificaciones automáticas de alertas

### Mediano Plazo
- [ ] Machine Learning para predicciones
- [ ] Benchmarking por tipo de evento
- [ ] Dashboard ejecutivo en tiempo real

### Largo Plazo
- [ ] Integración con herramientas de BI
- [ ] API para consultas externas
- [ ] App móvil para consultas rápidas

---

## 📚 Referencias Técnicas

### Dependencias Utilizadas
- **React** - Framework de UI
- **TypeScript** - Tipado estático
- **Tailwind CSS** - Estilos
- **Lucide Icons** - Iconografía
- **Supabase** - Base de datos

### Librerías Opcionales para Mejorar
- `jspdf` - Mejor generación de PDFs
- `xlsx` - Exportación avanzada a Excel
- `recharts` - Gráficos interactivos
- `date-fns` - Manipulación de fechas

---

## 👥 Soporte

Para preguntas o problemas:
1. Revisar esta documentación
2. Consultar código de ejemplo en los archivos
3. Revisar logs de consola del navegador
4. Contactar al equipo de desarrollo

---

## 📝 Changelog

### Versión 1.0.0 (2025-10-23)
- ✅ Sistema completo de análisis financiero
- ✅ Cálculos automáticos de estimado vs real
- ✅ Panel de balance con comparación visual
- ✅ Resumen de portafolio con métricas
- ✅ Sistema de filtros avanzado
- ✅ Exportación a PDF y Excel
- ✅ Vista de BD optimizada
- ✅ Documentación completa

---

**Desarrollado por:** Claude AI
**Fecha:** Octubre 2025
**Versión:** 1.0.0
