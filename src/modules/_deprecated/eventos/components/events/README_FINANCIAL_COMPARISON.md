# Gestión Financiera de Eventos - Documentación

## Resumen de Cambios Implementados

Se han implementado mejoras en el módulo de "Gestión del Proyecto" para el formulario "Nuevo Evento" que permiten un mejor seguimiento financiero de los eventos.

---

## 1. Nuevos Campos en el Formulario

### Campo Renombrado:
- **Antes:** "Presupuesto Estimado ($)"
- **Ahora:** "Ganancia Estimada ($)"
  - Campo numérico para ingresar manualmente la ganancia esperada del evento

### Nuevo Campo:
- **"Gastos Estimados ($) (Provisiones)"**
  - Campo numérico para ingresar manualmente los gastos proyectados

### Campos Calculados Automáticamente:
1. **Utilidad Estimada ($)**
   - Fórmula: `Ganancia Estimada - Gastos Estimados`
   - Campo de solo lectura
   - Color: Verde si % ≥ 35%, Rojo si % < 35%

2. **% Utilidad Estimada**
   - Fórmula: `(Utilidad Estimada / Ganancia Estimada) × 100`
   - Campo de solo lectura
   - Color: Verde si ≥ 35%, Rojo si < 35%

### Alertas:
- Si el **% Utilidad Estimada < 35%**, se muestra una advertencia visual en color rojo.

---

## 2. Estructura de Datos

### Nuevos campos en la tabla `evt_eventos`:

```sql
ganancia_estimada          DECIMAL(15,2)  -- Ganancia/ingresos estimados
gastos_estimados           DECIMAL(15,2)  -- Gastos estimados (provisiones)
utilidad_estimada          DECIMAL(15,2)  -- Calculado: ganancia - gastos
porcentaje_utilidad_estimada DECIMAL(5,2) -- Calculado: (utilidad / ganancia) * 100
```

### Campos existentes para valores reales:
```sql
total                      DECIMAL(15,2)  -- Ingresos reales
total_gastos               DECIMAL(15,2)  -- Gastos reales
utilidad                   DECIMAL(15,2)  -- Utilidad real
margen_utilidad            DECIMAL(5,2)   -- % Utilidad real
```

---

## 3. Migración de Base de Datos

Se creó la migración: `supabase_old/migrations/20251023_add_financial_estimates_to_events.sql`

**Para aplicar la migración:**

```bash
# Si estás usando Supabase CLI
npx supabase db push

# O ejecutar el SQL directamente en Supabase Dashboard
```

---

## 4. Componente de Comparación Financiera

### Ubicación:
`src/modules/eventos/components/events/EventFinancialComparison.tsx`

### Uso:
```tsx
import { EventFinancialComparison } from './events/EventFinancialComparison';

// En tu componente de dashboard o detalle de evento:
<EventFinancialComparison event={eventoCompleto} />
```

### Qué muestra:
- **Ganancia Estimada vs Ingresos Reales**
- **Gastos Estimados vs Gastos Reales**
- **Utilidad Estimada vs Utilidad Real**
- **% Utilidad Estimada vs % Utilidad Real**

### Características:
- Comparación lado a lado
- Diferencias en valor absoluto
- Diferencias en porcentaje
- Colores indicativos:
  - 🟢 Verde = Mejor de lo esperado
  - 🔴 Rojo = Por debajo de lo esperado
  - Para gastos, menor es mejor (invertido)
- Alertas si utilidad real < 35%

---

## 5. Dónde Integrar el Componente

### Opción A: En el Dashboard Principal
Archivo: `src/modules/eventos/components/dashboard/Dashboard.tsx`

```tsx
import { EventFinancialComparison } from '../events/EventFinancialComparison';

// Dentro del render, agregar una sección para eventos destacados:
{selectedEvents.map(event => (
  <EventFinancialComparison key={event.id} event={event} />
))}
```

### Opción B: En la Vista de Detalle de Evento
Archivo: `src/modules/eventos/components/events/EventDetails.tsx` (o similar)

```tsx
import { EventFinancialComparison } from './EventFinancialComparison';

// Dentro del render del detalle:
<div className="space-y-6">
  <EventInfo event={event} />
  <EventFinancialComparison event={event} />
  <EventDocuments event={event} />
</div>
```

### Opción C: En un Reporte Financiero
Crear un nuevo componente de reporte que muestre múltiples eventos:

```tsx
// src/modules/eventos/components/reports/FinancialReport.tsx
import { EventFinancialComparison } from '../events/EventFinancialComparison';

export const FinancialReport = ({ events }) => {
  return (
    <div className="space-y-8">
      <h1>Reporte Financiero de Eventos</h1>
      {events.map(event => (
        <div key={event.id}>
          <h2>{event.nombre_proyecto}</h2>
          <EventFinancialComparison event={event} />
        </div>
      ))}
    </div>
  );
};
```

---

## 6. Flujo de Trabajo Recomendado

1. **Al crear un nuevo evento:**
   - Ingresar "Ganancia Estimada" (lo que se espera cobrar)
   - Ingresar "Gastos Estimados" (provisiones/presupuesto de gastos)
   - El sistema calculará automáticamente la utilidad y el porcentaje

2. **Durante el evento:**
   - Registrar gastos reales en el módulo de finanzas
   - Registrar ingresos reales cuando se facturen/cobren

3. **Al finalizar el evento:**
   - Revisar el componente `EventFinancialComparison`
   - Analizar las diferencias entre estimado y real
   - Usar esta información para mejorar estimaciones futuras

---

## 7. Validaciones y Reglas de Negocio

- ✅ Si **% Utilidad Estimada < 35%**: Advertencia visual en formulario
- ✅ Si **% Utilidad Real < 35%**: Alerta en componente de comparación
- ✅ Campos calculados son de solo lectura
- ✅ Los cálculos se actualizan en tiempo real al modificar valores

---

## 8. Próximos Pasos (Opcional)

### Mejoras sugeridas:
1. **Alertas automáticas:**
   - Notificar cuando la utilidad real baje del 35%
   - Enviar reportes mensuales de variaciones

2. **Dashboard analítico:**
   - Gráficos de tendencias (estimado vs real)
   - Análisis histórico de precisión en estimaciones
   - KPIs de variación por tipo de evento o cliente

3. **Exportación:**
   - Exportar comparaciones a Excel/PDF
   - Generar reportes automáticos para gerencia

4. **Inteligencia:**
   - Sugerencias de gastos basadas en eventos similares
   - Machine Learning para mejorar estimaciones

---

## 9. Soporte y Mantenimiento

### Archivos Modificados:
- `src/modules/eventos/types/Event.ts` - Tipos TypeScript
- `src/modules/eventos/components/events/EventForm.tsx` - Formulario de evento
- `src/modules/eventos/services/eventsService.ts` - (No requiere cambios, ya soporta campos dinámicos)
- `supabase_old/migrations/20251023_add_financial_estimates_to_events.sql` - Migración DB

### Archivos Nuevos:
- `src/modules/eventos/components/events/EventFinancialComparison.tsx` - Componente de comparación
- `src/modules/eventos/components/events/README_FINANCIAL_COMPARISON.md` - Esta documentación

---

## 10. Troubleshooting

### Problema: Los campos calculados no se actualizan
**Solución:** Verificar que `ganancia_estimada` y `gastos_estimados` estén en el estado del formulario.

### Problema: Los datos no se guardan en la base de datos
**Solución:**
1. Verificar que la migración se haya ejecutado
2. Confirmar que los campos existen en la tabla `evt_eventos`
3. Revisar logs del servidor para errores de SQL

### Problema: El componente de comparación no muestra datos
**Solución:**
1. Verificar que el evento tenga los campos poblados
2. Revisar que se esté pasando un objeto `EventoCompleto` completo

---

**Autor:** Claude AI
**Fecha:** 2025-10-23
**Versión:** 1.0
