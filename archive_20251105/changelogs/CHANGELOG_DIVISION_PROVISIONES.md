# Changelog: División de Provisiones en 4 Categorías

**Fecha:** 29 de Octubre de 2025
**Migración:** 010_divide_provisiones_categories.sql
**Tipo de cambio:** Breaking Change (requiere actualización de código)

---

## 📋 Resumen Ejecutivo

Se ha dividido el campo único `provisiones` en **4 categorías específicas** para mejorar el control y análisis de gastos proyectados. Los campos calculados obsoletos se han puesto en **ceros** para identificarlos antes de su eliminación futura.

### Cambios Principales

1. ✅ **4 nuevos campos** de provisiones desglosadas
2. ✅ **6 campos obsoletos** marcados en ceros
3. ✅ **Distribución equitativa** de provisiones existentes (25% cada uno)
4. ✅ **Vistas actualizadas** con cálculos dinámicos
5. ✅ **Categorías de gastos** creadas automáticamente

---

## 🆕 Campos Nuevos en `evt_eventos`

### Provisiones Desglosadas

| Campo | Tipo | Default | Descripción |
|-------|------|---------|-------------|
| `provision_combustible_peaje` | NUMERIC | 0 | Combustible, gasolina, diésel y peajes |
| `provision_materiales` | NUMERIC | 0 | Materiales, suministros y equipo |
| `provision_recursos_humanos` | NUMERIC | 0 | Staff, técnicos, personal y honorarios |
| `provision_solicitudes_pago` | NUMERIC | 0 | Proveedores externos, servicios y SPs |

**Uso:**
```typescript
// NUEVO: Usar campos desglosados
const evento = {
  provision_combustible_peaje: 15000,
  provision_materiales: 30000,
  provision_recursos_humanos: 40000,
  provision_solicitudes_pago: 15000
};

// El total se calcula automáticamente en la vista
// provisiones_total = 100,000
```

---

## ⚠️ Campos Obsoletos (Mantener en 0)

Estos campos **YA NO SE USAN** en `evt_eventos`. Se mantienen en **0** para identificarlos como obsoletos hasta su eliminación futura.

| Campo | Estado | Motivo | Dónde se calcula ahora |
|-------|--------|--------|------------------------|
| `provisiones` | 🔴 OBSOLETO | Se calcula dinámicamente | `vw_eventos_analisis_financiero.provisiones_total` |
| `utilidad_estimada` | 🔴 OBSOLETO | Se calcula dinámicamente | `vw_eventos_analisis_financiero.utilidad_estimada` |
| `porcentaje_utilidad_estimada` | 🔴 OBSOLETO | Se calcula dinámicamente | `vw_eventos_analisis_financiero.margen_estimado_pct` |
| `total_gastos` | 🔴 OBSOLETO | Se calcula dinámicamente | `vw_eventos_completos.total_gastos` |
| `utilidad` | 🔴 OBSOLETO | Se calcula dinámicamente | `vw_eventos_completos.utilidad_real` |
| `margen_utilidad` | 🔴 OBSOLETO | Se calcula dinámicamente | `vw_eventos_completos.margen_real_pct` |

**⚠️ IMPORTANTE:**
```typescript
// ❌ NO USAR MÁS
const provisiones = evento.provisiones; // Siempre será 0

// ✅ USAR EN SU LUGAR
const { data } = await supabase
  .from('vw_eventos_analisis_financiero')
  .select('provisiones_total')
  .eq('id', eventoId)
  .single();

const provisiones = data.provisiones_total; // Calculado dinámicamente
```

---

## 📊 Distribución de Provisiones Existentes

Todos los eventos con provisiones se distribuyeron **equitativamente** (25% cada categoría):

```
Provisiones originales: $100,000

Después de migración:
  ├─ provision_combustible_peaje:   $25,000 (25%)
  ├─ provision_materiales:           $25,000 (25%)
  ├─ provision_recursos_humanos:     $25,000 (25%)
  └─ provision_solicitudes_pago:     $25,000 (25%)

Campo provisiones:                    $0 (OBSOLETO)
```

**Nota:** Esta distribución es temporal. Los usuarios deben ajustar los montos según las necesidades reales de cada evento.

---

## 🗃️ Categorías de Gastos Creadas

Se crearon automáticamente 4 categorías en `evt_categorias_gastos`:

| Nombre | Descripción |
|--------|-------------|
| **Combustible/Peaje** | Gastos de combustible, gasolina, diésel y peajes de casetas para transporte |
| **Materiales** | Compra de materiales, suministros, equipo y herramientas necesarios |
| **Recursos Humanos** | Pago de staff, técnicos, personal de apoyo, honorarios y nómina |
| **Solicitudes de Pago** | Pagos a proveedores externos, servicios contratados y SPs a terceros |

**Uso al crear gastos:**
```typescript
// Al crear un gasto, asignar la categoría correcta
const gasto = {
  evento_id: eventoId,
  categoria_id: categoriaId, // ID de "Combustible/Peaje", "Materiales", etc.
  concepto: "Gasolina para transporte de equipo",
  total: 5000,
  pagado: false
};
```

---

## 🔄 Vistas Actualizadas

### Vista: `vw_eventos_analisis_financiero`

**Campos nuevos agregados:**

```sql
-- Provisiones desglosadas
provision_combustible_peaje       NUMERIC
provision_materiales              NUMERIC
provision_recursos_humanos        NUMERIC
provision_solicitudes_pago        NUMERIC
provisiones_total                 NUMERIC (calculado)

-- Gastos reales por categoría
gastos_combustible_pagados        NUMERIC
gastos_combustible_pendientes     NUMERIC
gastos_materiales_pagados         NUMERIC
gastos_materiales_pendientes      NUMERIC
gastos_rh_pagados                 NUMERIC
gastos_rh_pendientes              NUMERIC
gastos_sps_pagados                NUMERIC
gastos_sps_pendientes             NUMERIC

-- Variación por categoría (%)
variacion_combustible_pct         NUMERIC
variacion_materiales_pct          NUMERIC
variacion_rh_pct                  NUMERIC
variacion_sps_pct                 NUMERIC

-- Status presupuestal por categoría
status_presupuestal_combustible   TEXT
status_presupuestal_materiales    TEXT
status_presupuestal_rh            TEXT
status_presupuestal_sps           TEXT
```

**Ejemplo de uso:**
```typescript
const { data } = await supabase
  .from('vw_eventos_analisis_financiero')
  .select(`
    clave_evento,
    provision_combustible_peaje,
    gastos_combustible_pagados,
    variacion_combustible_pct,
    status_presupuestal_combustible
  `)
  .eq('id', eventoId)
  .single();

console.log(`Combustible: Provisión $${data.provision_combustible_peaje}`);
console.log(`Gasto real: $${data.gastos_combustible_pagados}`);
console.log(`Variación: ${data.variacion_combustible_pct}%`);
console.log(`Status: ${data.status_presupuestal_combustible}`);
```

### Vista: `vw_eventos_completos`

**Campos actualizados:**

```sql
-- Provisiones (ahora calculado)
provisiones_total                 NUMERIC (calculado)

-- Gastos (ahora calculado)
total_gastos                      NUMERIC (calculado, no de evt_eventos)
gastos_pendientes                 NUMERIC (calculado)

-- Utilidad (ahora calculada)
utilidad_real                     NUMERIC (calculado, no de evt_eventos)
margen_real_pct                   NUMERIC (calculado)
```

---

## 🔧 Índices Creados

Para optimizar las consultas se crearon 5 índices nuevos:

```sql
idx_evt_eventos_provision_combustible    -- Para filtrar por combustible
idx_evt_eventos_provision_materiales     -- Para filtrar por materiales
idx_evt_eventos_provision_rh             -- Para filtrar por RH
idx_evt_eventos_provision_sps            -- Para filtrar por SPs
idx_evt_eventos_analisis_provisiones     -- Índice compuesto para análisis
```

---

## 💻 Cambios Requeridos en el Código

### 1. Tipos TypeScript (Event.ts)

**ANTES:**
```typescript
export interface Event {
  provisiones?: number; // Campo único
  utilidad_estimada?: number; // Calculado en tabla
  total_gastos: number; // Calculado en tabla
}
```

**DESPUÉS:**
```typescript
export interface Event {
  // Provisiones desglosadas
  provision_combustible_peaje?: number;
  provision_materiales?: number;
  provision_recursos_humanos?: number;
  provision_solicitudes_pago?: number;

  // OBSOLETOS (siempre 0, no usar)
  provisiones?: number; // ⚠️ Usar provisiones_total de vista
  utilidad_estimada?: number; // ⚠️ Usar vista
  total_gastos: number; // ⚠️ Usar vista
}

export interface EventoCompleto extends Event {
  // De vw_eventos_completos
  provisiones_total?: number; // ✅ Usar este
  total_gastos?: number; // ✅ Usar este (calculado)
  utilidad_real?: number; // ✅ Usar este
}
```

### 2. EventForm.tsx (Formulario)

**ANTES:**
```tsx
const [formData, setFormData] = useState({
  provisiones: event?.provisiones || 0
});
```

**DESPUÉS:**
```tsx
const [formData, setFormData] = useState({
  provision_combustible_peaje: event?.provision_combustible_peaje || 0,
  provision_materiales: event?.provision_materiales || 0,
  provision_recursos_humanos: event?.provision_recursos_humanos || 0,
  provision_solicitudes_pago: event?.provision_solicitudes_pago || 0
});

// Calcular total en tiempo real
const provisionesTotal =
  (formData.provision_combustible_peaje || 0) +
  (formData.provision_materiales || 0) +
  (formData.provision_recursos_humanos || 0) +
  (formData.provision_solicitudes_pago || 0);
```

**UI Nueva:**
```tsx
<div className="grid grid-cols-2 gap-4">
  <InputField
    label="Combustible/Peaje ($)"
    value={formData.provision_combustible_peaje}
    onChange={(val) => setFormData({...formData, provision_combustible_peaje: val})}
  />
  <InputField
    label="Materiales ($)"
    value={formData.provision_materiales}
    onChange={(val) => setFormData({...formData, provision_materiales: val})}
  />
  <InputField
    label="Recursos Humanos ($)"
    value={formData.provision_recursos_humanos}
    onChange={(val) => setFormData({...formData, provision_recursos_humanos: val})}
  />
  <InputField
    label="Solicitudes de Pago ($)"
    value={formData.provision_solicitudes_pago}
    onChange={(val) => setFormData({...formData, provision_solicitudes_pago: val})}
  />
</div>

<div className="bg-blue-50 p-3 rounded">
  <strong>Total Provisiones:</strong> ${provisionesTotal.toFixed(2)}
</div>
```

### 3. Guardar Evento

**ANTES:**
```typescript
await supabase
  .from('evt_eventos')
  .insert({
    provisiones: 100000,
    utilidad_estimada: 50000 // ❌ Se calculaba en tabla
  });
```

**DESPUÉS:**
```typescript
await supabase
  .from('evt_eventos')
  .insert({
    provision_combustible_peaje: 25000,
    provision_materiales: 25000,
    provision_recursos_humanos: 25000,
    provision_solicitudes_pago: 25000,
    // ⚠️ NO enviar provisiones, utilidad_estimada, etc. (se calculan en vista)
  });
```

### 4. Leer Datos Financieros

**ANTES:**
```typescript
// ❌ Leer de evt_eventos directamente
const { data: evento } = await supabase
  .from('evt_eventos')
  .select('provisiones, total_gastos, utilidad')
  .eq('id', eventoId)
  .single();

console.log(evento.provisiones); // Siempre 0 ahora
```

**DESPUÉS:**
```typescript
// ✅ Leer de vista con cálculos dinámicos
const { data: evento } = await supabase
  .from('vw_eventos_completos')
  .select(`
    provision_combustible_peaje,
    provision_materiales,
    provision_recursos_humanos,
    provision_solicitudes_pago,
    provisiones_total,
    total_gastos,
    utilidad_real
  `)
  .eq('id', eventoId)
  .single();

console.log(evento.provisiones_total); // ✅ Calculado correctamente
```

---

## ✅ Checklist de Migración

### Base de Datos
- [x] Migración 010 ejecutada
- [x] 4 columnas nuevas creadas
- [x] 6 campos obsoletos en ceros
- [x] Provisiones distribuidas equitativamente
- [x] Categorías de gastos creadas
- [x] Índices creados
- [x] Vistas actualizadas

### Backend (Pendiente)
- [ ] Actualizar `Event.ts` con nuevos campos
- [ ] Marcar campos obsoletos como deprecated
- [ ] Actualizar hooks que lean provisiones
- [ ] Actualizar servicios de exportación

### Frontend (Pendiente)
- [ ] Actualizar `EventForm.tsx` con 4 inputs
- [ ] Actualizar `EventFinancialComparison.tsx`
- [ ] Crear `ProvisionesBreakdownChart.tsx` (opcional)
- [ ] Actualizar `EventosListPage.tsx` con columnas opcionales
- [ ] Actualizar todos los componentes que lean `evento.provisiones`

### Testing (Pendiente)
- [ ] Crear evento nuevo con provisiones desglosadas
- [ ] Editar evento existente
- [ ] Verificar cálculos en vistas
- [ ] Probar reportes financieros
- [ ] Verificar exportación Excel/PDF

---

## 🚀 Instrucciones de Ejecución

### 1. Ejecutar Migración SQL

**Opción A: Dashboard de Supabase (Recomendado)**
```
1. Ve a https://supabase.com/dashboard/project/gomnouwackzvthpwyric/editor
2. Abre el SQL Editor
3. Copia y pega el contenido de migrations/010_divide_provisiones_categories.sql
4. Ejecuta
```

**Opción B: psql**
```bash
psql "postgresql://postgres:[PASSWORD]@db.gomnouwackzvthpwyric.supabase.co:5432/postgres" \
  -f migrations/010_divide_provisiones_categories.sql
```

### 2. Validar Migración

```bash
node ejecutar-migracion-010.mjs --validate
```

### 3. Actualizar Código

Sigue los cambios indicados en la sección "Cambios Requeridos en el Código" arriba.

---

## 🔙 Rollback (Si es necesario)

Si algo sale mal, puedes revertir los cambios:

```sql
BEGIN;

-- Restaurar provisiones desde el respaldo
UPDATE evt_eventos e
SET provisiones = (
  COALESCE(e.provision_combustible_peaje, 0) +
  COALESCE(e.provision_materiales, 0) +
  COALESCE(e.provision_recursos_humanos, 0) +
  COALESCE(e.provision_solicitudes_pago, 0)
)
WHERE deleted_at IS NULL;

-- Eliminar columnas nuevas
ALTER TABLE evt_eventos
DROP COLUMN IF EXISTS provision_combustible_peaje,
DROP COLUMN IF EXISTS provision_materiales,
DROP COLUMN IF EXISTS provision_recursos_humanos,
DROP COLUMN IF EXISTS provision_solicitudes_pago;

-- Restaurar vistas originales
-- (ejecutar migrations/008 y 009 nuevamente)

COMMIT;
```

---

## 📚 Referencias

- [PLAN_DIVISION_PROVISIONES.md](PLAN_DIVISION_PROVISIONES.md) - Plan técnico completo
- [RESUMEN_EJECUTIVO_DIVISION_PROVISIONES.md](RESUMEN_EJECUTIVO_DIVISION_PROVISIONES.md) - Resumen ejecutivo
- [MAPA_DEPENDENCIAS_PROVISIONES.md](MAPA_DEPENDENCIAS_PROVISIONES.md) - Mapa de dependencias
- [migrations/010_divide_provisiones_categories.sql](migrations/010_divide_provisiones_categories.sql) - Script SQL

---

## 🐛 Problemas Conocidos

### 1. Campos obsoletos siguen apareciendo en el código

**Síntoma:** El código TypeScript sigue permitiendo acceso a `evento.provisiones`

**Solución:** Actualizar tipos y marcar como `@deprecated`:
```typescript
/** @deprecated Use provision_* fields and read provisiones_total from views */
provisiones?: number;
```

### 2. Vistas retornan NULL en campos nuevos

**Síntoma:** `gastos_combustible_pagados` es NULL

**Causa:** No existen gastos con esa categoría asignada

**Solución:** Asignar categorías correctas al crear gastos

---

## 📞 Soporte

Si encuentras problemas:
1. Revisa este changelog
2. Consulta el [PLAN_DIVISION_PROVISIONES.md](PLAN_DIVISION_PROVISIONES.md)
3. Valida la migración con `node ejecutar-migracion-010.mjs --validate`

---

**Fecha de changelog:** 29 de Octubre de 2025
**Versión:** 1.0
**Estado:** ✅ Migración SQL completada, Frontend pendiente
