# Guía de Uso: Sistema de Provisiones y Gestión de Gastos

**Versión**: 2.0
**Fecha**: 28 de Octubre de 2025
**Aplicable a**: ERP-777 V1 - Made ERP

---

## 📚 Índice

1. [Conceptos Básicos](#conceptos-básicos)
2. [Flujo de Trabajo](#flujo-de-trabajo)
3. [Uso del Sistema](#uso-del-sistema)
4. [Reportes y Análisis](#reportes-y-análisis)
5. [Mejores Prácticas](#mejores-prácticas)
6. [FAQ](#faq)

---

## 🎯 Conceptos Básicos

### ¿Qué son las Provisiones?

**Provisiones** son los gastos estimados o proyectados para un evento. Anteriormente se conocían como "Gastos Estimados" en el sistema.

**Definición contable**: Monto presupuestado para gastos antes de que el evento ocurra, utilizado para:
- Proyección financiera
- Control presupuestal
- Análisis de rentabilidad estimada
- Aprobación de eventos

### Estados de Gastos

El sistema distingue tres tipos de gastos:

1. **Gastos Pagados** 💰
   - Gastos que ya han sido pagados
   - Se marcan con el campo `pagado = true`
   - Se incluyen en el cálculo de utilidad real
   - Afectan el flujo de caja

2. **Gastos Pendientes** ⏳
   - Gastos autorizados pero aún no pagados
   - Se marcan con el campo `pagado = false`
   - NO se incluyen en utilidad real
   - Se muestran en reportes de pendientes de pago

3. **Gastos Totales** 📊
   - Suma de gastos pagados + pendientes
   - Representa el compromiso total del evento

---

## 🔄 Flujo de Trabajo

### Ciclo de Vida Completo de un Evento

```
1. CREACIÓN DEL EVENTO
   ↓
   [Definir Provisiones] ← Gastos estimados
   [Definir Ganancia Estimada] ← Ingresos proyectados
   ↓
   Utilidad Estimada = Ganancia - Provisiones

2. EJECUCIÓN DEL EVENTO
   ↓
   [Registrar Gastos]
   ├→ Marcar como pagado ✓
   └→ Dejar pendiente ⏳
   ↓
   [Registrar Ingresos]
   ├→ Marcar como cobrado ✓
   └→ Dejar pendiente ⏳

3. ANÁLISIS FINANCIERO
   ↓
   Comparar:
   - Provisiones vs Gastos Pagados
   - Ganancia Estimada vs Ingresos Cobrados
   ↓
   Generar Reportes de Variación
```

---

## 💻 Uso del Sistema

### 1. Crear un Evento con Provisiones

**Paso a Paso**:

1. Ir a **Módulo de Eventos** > **Crear Evento**

2. Llenar información básica:
   - Nombre del Proyecto
   - Cliente
   - Fecha del Evento
   - Tipo de Evento

3. Definir **Proyección Financiera**:
   ```
   Ganancia Estimada: $150,000.00
   Provisiones: $100,000.00
   ═══════════════════════════════════
   Utilidad Estimada: $50,000.00 (33.3%)
   ```

4. **Validación Automática**:
   - ✅ Si margen de utilidad ≥ 35%: Todo bien
   - ⚠️ Si margen de utilidad < 35%: Advertencia de margen bajo

**Ejemplo de evento rentable**:
```
Boda García
━━━━━━━━━━━━━━━━━━━━━━━━━
Ganancia Estimada: $200,000
Provisiones: $120,000
Utilidad Estimada: $80,000
Margen: 40% ✓
```

### 2. Registrar Gastos

**Opciones de Estado**:

#### Opción A: Gasto Pagado Inmediatamente
```
1. Ir a pestaña "Gastos" del evento
2. Click en "Agregar Gasto"
3. Llenar datos:
   - Concepto: "Banquete"
   - Total: $45,000
   - [x] Pagado ✓ ← Marcar checkbox
   - Fecha de Pago: 2025-10-25
4. Guardar
```
**Efecto**: Se suma a "Gastos Pagados" y afecta utilidad real.

#### Opción B: Gasto Pendiente de Pago
```
1. Ir a pestaña "Gastos" del evento
2. Click en "Agregar Gasto"
3. Llenar datos:
   - Concepto: "Decoración"
   - Total: $25,000
   - [ ] Pagado ✗ ← NO marcar
4. Guardar
```
**Efecto**: Se suma a "Gastos Pendientes", NO afecta utilidad real todavía.

### 3. Ver Comparación de Provisiones vs Gastos

**Ubicación**: Detalle del Evento > Pestaña "Análisis Financiero"

**Vista de Comparación**:
```
╔═══════════════════════════════════════════════════════╗
║           Provisiones vs Gastos Reales                ║
╠═══════════════════════════════════════════════════════╣
║ Concepto             │ Estimado   │ Real     │ Dif.   ║
╠══════════════════════╪════════════╪══════════╪════════╣
║ Provisiones          │ $100,000   │ $85,000  │-$15,000║
║ Status               │            │ 85%      │ ✓      ║
╚═══════════════════════════════════════════════════════╝
```

**Indicadores de Color**:
- 🟢 **Verde**: Gastos ≤ Provisiones (dentro del presupuesto)
- 🟡 **Amarillo**: Gastos entre 100-105% de provisiones (advertencia)
- 🔴 **Rojo**: Gastos > 105% de provisiones (excede presupuesto)

---

## 📊 Reportes y Análisis

### 1. Reporte Individual de Evento

**Vista de Análisis Financiero**:

```sql
SELECT
  clave_evento,
  nombre_proyecto,

  -- Proyección
  provisiones,

  -- Real
  gastos_pagados,
  gastos_pendientes,
  gastos_totales,

  -- Análisis
  diferencia_gastos_absoluta,
  variacion_gastos_porcentaje,
  status_presupuestal

FROM vw_eventos_analisis_financiero
WHERE id = 'ID_DEL_EVENTO';
```

**Resultado Ejemplo**:
```
Clave: BG-001-2025
Nombre: Boda García
─────────────────────────────────────
Provisiones:           $100,000.00
Gastos Pagados:        $ 85,000.00
Gastos Pendientes:     $ 12,000.00
Gastos Totales:        $ 97,000.00
─────────────────────────────────────
Diferencia:            -$15,000.00 ✓
Variación:             -15.0% ✓
Status:                dentro_presupuesto
```

### 2. Reporte de Eventos Excediendo Presupuesto

**Query SQL**:
```sql
SELECT
  clave_evento,
  nombre_proyecto,
  provisiones,
  gastos_pagados,
  diferencia_gastos_absoluta,
  variacion_gastos_porcentaje
FROM vw_eventos_analisis_financiero
WHERE status_presupuestal = 'excede_presupuesto'
ORDER BY diferencia_gastos_absoluta DESC;
```

**Uso**: Identificar eventos con sobrecostos.

### 3. Reporte de Gastos Pendientes

**Vista**: `vw_gastos_pendientes_pago`

```sql
SELECT
  clave_evento,
  nombre_proyecto,
  concepto,
  proveedor,
  total,
  dias_pendiente,
  responsable_pago_nombre
FROM vw_gastos_pendientes_pago
WHERE dias_pendiente > 7
ORDER BY dias_pendiente DESC;
```

**Uso**: Seguimiento de pagos atrasados.

### 4. Exportar a Excel

**Pasos**:
1. Ir a **Módulo de Eventos** > **Reportes**
2. Seleccionar "Análisis Financiero"
3. Aplicar filtros (opcional):
   - Rango de fechas
   - Cliente específico
   - Tipo de evento
4. Click en **"Exportar a Excel"**

**Contenido del archivo**:
- Hoja 1: Lista de eventos con análisis
- Hoja 2: Resumen ejecutivo del portfolio
- Hoja 3: Gráficas de variación

---

## 🎯 Mejores Prácticas

### 1. Definición de Provisiones

**DO ✅**:
- Definir provisiones basándose en cotizaciones reales
- Incluir un margen de contingencia (5-10%)
- Revisar provisiones antes de aprobar el evento
- Actualizar provisiones si hay cambios en el alcance

**DON'T ❌**:
- Dejar provisiones en $0
- Definir provisiones arbitrarias sin análisis
- Ignorar advertencias de margen bajo (<35%)

**Ejemplo de provisiones bien definidas**:
```
Evento: Boda Deluxe
━━━━━━━━━━━━━━━━━━━━━━━━━
Banquete (cotización):    $80,000
Decoración (cotización):  $35,000
Música (cotización):      $25,000
Fotografía (cotización):  $15,000
Subtotal:                 $155,000
Contingencia (10%):       $ 15,500
─────────────────────────────────
PROVISIONES TOTALES:      $170,500
```

### 2. Registro de Gastos

**Timing**:
- ✅ Registrar gastos cuando se comprometen (aunque no se paguen)
- ✅ Actualizar estado de pago cuando se ejecuta
- ✅ Adjuntar comprobantes en todos los gastos

**Marcar como Pagado**:
```
Criterios para marcar como PAGADO:
✓ Se transfirió el dinero
✓ Se emitió el cheque
✓ Se pagó en efectivo
✓ Hay comprobante de pago
```

**Mantener como Pendiente**:
```
Dejar como PENDIENTE cuando:
- Se cotizó pero no se autorizó
- Se autorizó pero no se pagó
- Pago programado para fecha futura
```

### 3. Análisis y Seguimiento

**Frecuencia de Revisión**:
- 📅 **Semanal**: Revisar gastos pendientes de pago
- 📅 **Quincenal**: Comparar provisiones vs gastos acumulados
- 📅 **Al cierre del evento**: Análisis final completo

**Acciones Correctivas**:

Si **Gastos Pagados > Provisiones**:
```
1. Identificar causa del sobrecosto
2. Revisar gastos no autorizados
3. Ajustar provisiones de eventos futuros
4. Comunicar a cliente si aplica
```

Si **Margen de Utilidad < 35%**:
```
1. Revisar si es posible aumentar ingresos
2. Negociar con proveedores
3. Evaluar cancelación si no es rentable
4. Documentar lecciones aprendidas
```

### 4. Control Presupuestal

**Semáforo de Estatus**:

| Status | Rango | Acción Recomendada |
|--------|-------|-------------------|
| 🟢 Verde | Gastos ≤ Provisiones | Continuar normalmente |
| 🟡 Amarillo | Gastos 100-105% | Monitorear de cerca |
| 🔴 Rojo | Gastos > 105% | Intervención inmediata |

**Flujo de Escalación**:
```
1. Amarillo: Notificar a responsable del evento
2. Rojo: Notificar a gerente + hold de nuevos gastos
3. Rojo persistente: Reunión con cliente
```

---

## 🔍 FAQ (Preguntas Frecuentes)

### P1: ¿Qué pasa con el campo "Presupuesto Estimado"?

**R**: Fue eliminado. Ahora solo usamos:
- **Provisiones** (antes "Gastos Estimados")
- **Ganancia Estimada** (ingresos proyectados)

### P2: ¿Por qué mis gastos totales no coinciden con la suma de todos los gastos?

**R**: Probablemente porque:
- `total_gastos` solo cuenta gastos con `pagado = true`
- `gastos_pendientes` cuenta gastos con `pagado = false`
- `gastos_totales` es la suma de ambos

**Verificación**:
```sql
SELECT
  id,
  total_gastos as pagados,
  gastos_pendientes as pendientes,
  gastos_totales as total,
  (total_gastos + gastos_pendientes) as verificacion
FROM vw_eventos_completos
WHERE id = 'TU_EVENTO_ID';
-- verificacion debe ser igual a total
```

### P3: ¿Cuándo debo marcar un gasto como pagado?

**R**: Marca como pagado SOLO cuando:
1. El dinero ya salió de la cuenta
2. Tienes comprobante de pago
3. El proveedor confirmó recepción

NO marques como pagado si:
- Solo se autorizó
- Está programado para pago futuro
- Aún no hay transferencia

### P4: ¿Cómo actualizo las provisiones después de crear el evento?

**R**:
```
1. Ir a detalle del evento
2. Click en "Editar Evento"
3. Actualizar campo "Provisiones"
4. Guardar cambios
```

**Nota**: El sistema recalculará automáticamente la utilidad estimada.

### P5: ¿Qué significa "Status Presupuestal: advertencia"?

**R**: Significa que tus gastos pagados están entre 100-105% de las provisiones. Estás ligeramente sobre presupuesto pero dentro del margen de tolerancia.

**Acción sugerida**: Revisar si hay gastos no autorizados y evitar nuevos gastos no esenciales.

### P6: ¿Puedo cambiar un gasto de pendiente a pagado después?

**R**: Sí, siempre:
```
1. Ir a la lista de gastos del evento
2. Click en el gasto a actualizar
3. Marcar checkbox "Pagado"
4. Ingresar fecha de pago
5. Adjuntar comprobante (opcional pero recomendado)
6. Guardar
```

El sistema actualizará automáticamente todos los totales.

### P7: ¿Cómo exporto un reporte de provisiones vs gastos?

**R**: Usa el módulo de **Reportes Financieros**:
```
Eventos > Reportes > Análisis Financiero > Exportar Excel
```

El archivo incluirá:
- Provisiones por evento
- Gastos pagados
- Gastos pendientes
- Diferencias y variaciones
- Status presupuestal

### P8: ¿Qué pasa si no defino provisiones?

**R**: El evento quedará con `provisiones = 0`, lo cual:
- ⚠️ No permitirá análisis presupuestal
- ⚠️ Mostrará `status_presupuestal = 'sin_presupuesto'`
- ⚠️ No podrás comparar estimado vs real

**Recomendación**: Siempre define provisiones, aunque sean aproximadas.

---

## 📞 Soporte

Si necesitas ayuda con el sistema de provisiones:

1. **Documentación**: Revisa esta guía y el CHANGELOG
2. **Capacitación**: Solicita sesión de entrenamiento al equipo
3. **Reporte de errores**: Contacta al equipo de desarrollo
4. **Sugerencias**: Comparte feedback para mejoras

---

## 🎓 Recursos Adicionales

- [CHANGELOG_RENOMBRADO_PROVISIONES.md](./CHANGELOG_RENOMBRADO_PROVISIONES.md) - Detalles técnicos del cambio
- [README_FINANCIAL_COMPARISON.md](./src/modules/eventos/components/events/README_FINANCIAL_COMPARISON.md) - Documentación de componentes
- [GUIA_VALIDACION.md](./GUIA_VALIDACION.md) - Procesos de validación

---

**Versión de la guía**: 2.0
**Última actualización**: 28 de Octubre de 2025
**Mantenida por**: Equipo de Desarrollo ERP-777
