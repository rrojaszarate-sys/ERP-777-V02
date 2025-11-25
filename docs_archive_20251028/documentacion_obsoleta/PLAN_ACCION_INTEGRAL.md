# 📋 ANÁLISIS INTEGRAL Y PLAN DE ACCIÓN CORRECTIVA
**Fecha**: 27 de Octubre 2025  
**Sistema**: ERP-777 V1 - Made ERP  
**Módulo**: Eventos y Finanzas

---

## 🔴 DIAGNÓSTICO CRÍTICO

### PROBLEMA PRINCIPAL DETECTADO

Las vistas `vw_eventos_completos` y `vw_master_facturacion` están **INCLUYENDO** registros NO pagados/cobrados en sus cálculos financieros, causando:

- ❌ **Inflación de ingresos**: Vista muestra $3.6M cuando solo $2.8M están cobrados (+29% error)
- ❌ **Inflación de gastos**: Vista muestra $1.5M cuando solo $420K están pagados (+255% error)
- ❌ **Métricas incorrectas**: KPIs, dashboards y reportes muestran datos falsos
- ❌ **Decisiones erróneas**: Gerencia toma decisiones con información incorrecta

### ESTADO ACTUAL DE LA BASE DE DATOS

```
📊 Registros en BD:
├── Gastos: 145 total
│   ├── ✅ Pagados: 43 ($420,483.21)
│   └── ⏳ Pendientes: 102 ($1,071,558.07)
│
└── Ingresos: 127 total
    ├── ✅ Cobrados: 90 ($2,806,771.04)
    └── ⏳ Pendientes: 37 ($823,627.14)

🔥 ERROR EN VISTAS:
├── vw_eventos_completos
│   ├── Muestra ingresos: $3,630,398.18 (incluye pendientes)
│   └── Muestra gastos: $1,492,041.28 (incluye pendientes)
│
└── vw_master_facturacion
    ├── Muestra ingresos: $3,630,398.18 (incluye pendientes)
    └── Muestra gastos: $1,492,041.28 (incluye pendientes)
```

---

## 🎯 CAUSA RAÍZ

### Análisis de Arquitectura

Según la documentación del README:

```
CAPA DE DATOS
│  (Supabase Client, PostgreSQL, Storage, Auth)
│
├── Triggers
│   ├── calculate_expense_totals_trigger
│   ├── calculate_income_totals_trigger
│   ├── update_event_financials_on_expense ⚠️ SOSPECHOSO
│   └── update_event_financials_on_income ⚠️ SOSPECHOSO
│
└── Vistas
    ├── vw_eventos_completos ❌ NO FILTRA pagado/cobrado
    └── vw_master_facturacion ❌ NO FILTRA pagado/cobrado
```

**HIPÓTESIS**:
1. **Triggers problemáticos**: Los triggers `update_event_financials_on_*` están sumando TODOS los registros sin filtrar por `pagado = true` o `cobrado = true`
2. **Vistas sin filtros**: Las vistas usan LEFT JOIN sin cláusula WHERE para filtrar status
3. **Falta sincronización**: Script SQL no se aplicó o Supabase no refrescó el cache de vistas

---

## 📐 ARQUITECTURA CORRECTA VS ACTUAL

### ❌ Arquitectura ACTUAL (Incorrecta)

```sql
-- Vista actual (PROBLEMA)
CREATE VIEW vw_eventos_completos AS
SELECT 
    e.*,
    (SELECT SUM(i.total) FROM evt_ingresos i 
     WHERE i.evento_id = e.id) as total,  -- ❌ SIN FILTRO
    (SELECT SUM(g.total) FROM evt_gastos g 
     WHERE g.evento_id = e.id) as total_gastos  -- ❌ SIN FILTRO
FROM evt_eventos e;
```

### ✅ Arquitectura CORRECTA (Solución)

```sql
-- Vista corregida
CREATE VIEW vw_eventos_completos AS
SELECT 
    e.*,
    (SELECT COALESCE(SUM(i.total), 0) FROM evt_ingresos i 
     WHERE i.evento_id = e.id 
       AND i.cobrado = true) as total,  -- ✅ SOLO COBRADOS
    (SELECT COALESCE(SUM(g.total), 0) FROM evt_gastos g 
     WHERE g.evento_id = e.id 
       AND g.pagado = true) as total_gastos  -- ✅ SOLO PAGADOS
FROM evt_eventos e;
```

---

## 🔧 PLAN DE ACCIÓN CORRECTIVA

### FASE 1: CORRECCIÓN INMEDIATA DE VISTAS ⚡ (URGENTE)

#### Paso 1.1: Verificar Definición Actual de Vistas

```bash
# Conectar a Supabase Dashboard SQL Editor
# Ejecutar:
```

```sql
-- Ver definición actual de vw_eventos_completos
SELECT pg_get_viewdef('vw_eventos_completos', true);

-- Ver definición actual de vw_master_facturacion
SELECT pg_get_viewdef('vw_master_facturacion', true);
```

**Acción**: Documentar output completo para análisis

#### Paso 1.2: Aplicar Corrección de Vistas

```sql
-- =====================================================
-- SCRIPT DE CORRECCIÓN URGENTE
-- Archivo: FIX_VISTAS_PAGADO_COBRADO.sql
-- =====================================================

-- Eliminar vistas existentes
DROP VIEW IF EXISTS vw_eventos_completos CASCADE;
DROP VIEW IF EXISTS vw_master_facturacion CASCADE;

-- Recrear vw_eventos_completos CON FILTROS
CREATE VIEW vw_eventos_completos AS
SELECT 
    e.id,
    e.clave_evento,
    e.nombre_proyecto,
    e.descripcion,
    e.cliente_id,
    c.nombre_comercial as cliente_nombre,
    c.razon_social as cliente_razon_social,
    e.tipo_evento_id,
    te.nombre as tipo_evento_nombre,
    e.estado_id,
    es.nombre as estado_nombre,
    e.responsable_id,
    e.fecha_evento,
    e.fecha_fin,
    e.presupuesto_estimado,
    e.status_facturacion,
    e.created_at,
    e.updated_at,
    -- SOLO INGRESOS COBRADOS ✅
    COALESCE(ing.total_ingresos, 0) as total,
    -- SOLO GASTOS PAGADOS ✅
    COALESCE(gst.total_gastos, 0) as total_gastos,
    -- UTILIDAD
    COALESCE(ing.total_ingresos, 0) - COALESCE(gst.total_gastos, 0) as utilidad,
    -- MARGEN
    CASE 
        WHEN COALESCE(ing.total_ingresos, 0) > 0 
        THEN ((COALESCE(ing.total_ingresos, 0) - COALESCE(gst.total_gastos, 0)) 
              / COALESCE(ing.total_ingresos, 0)) * 100
        ELSE 0 
    END as margen_utilidad
FROM evt_eventos e
LEFT JOIN evt_clientes c ON e.cliente_id = c.id
LEFT JOIN evt_tipos_evento te ON e.tipo_evento_id = te.id
LEFT JOIN evt_estados es ON e.estado_id = es.id
LEFT JOIN LATERAL (
    SELECT SUM(i.total) as total_ingresos
    FROM evt_ingresos i
    WHERE i.evento_id = e.id
      AND i.cobrado = true  -- ✅ FILTRO CRÍTICO
) ing ON true
LEFT JOIN LATERAL (
    SELECT SUM(g.total) as total_gastos
    FROM evt_gastos g
    WHERE g.evento_id = e.id
      AND g.pagado = true  -- ✅ FILTRO CRÍTICO
) gst ON true;

-- Recrear vw_master_facturacion CON FILTROS
CREATE VIEW vw_master_facturacion AS
SELECT 
    e.id as evento_id,
    e.clave_evento,
    e.nombre_proyecto as evento_nombre,
    c.id as cliente_id,
    c.nombre_comercial as cliente_nombre,
    c.rfc as cliente_rfc,
    te.nombre as tipo_evento,
    es.nombre as estado,
    e.fecha_evento,
    -- SOLO COBRADOS ✅
    (SELECT COALESCE(SUM(i.total), 0) 
     FROM evt_ingresos i 
     WHERE i.evento_id = e.id 
       AND i.cobrado = true) as total,
    -- SOLO PAGADOS ✅
    (SELECT COALESCE(SUM(g.total), 0) 
     FROM evt_gastos g 
     WHERE g.evento_id = e.id 
       AND g.pagado = true) as total_gastos,
    -- UTILIDAD
    (SELECT COALESCE(SUM(i.total), 0) 
     FROM evt_ingresos i 
     WHERE i.evento_id = e.id AND i.cobrado = true) -
    (SELECT COALESCE(SUM(g.total), 0) 
     FROM evt_gastos g 
     WHERE g.evento_id = e.id AND g.pagado = true) as utilidad,
    -- MARGEN
    CASE 
        WHEN (SELECT COALESCE(SUM(i.total), 0) 
              FROM evt_ingresos i 
              WHERE i.evento_id = e.id AND i.cobrado = true) > 0
        THEN (((SELECT COALESCE(SUM(i.total), 0) 
                FROM evt_ingresos i 
                WHERE i.evento_id = e.id AND i.cobrado = true) -
               (SELECT COALESCE(SUM(g.total), 0) 
                FROM evt_gastos g 
                WHERE g.evento_id = e.id AND g.pagado = true)) / 
              (SELECT COALESCE(SUM(i.total), 0) 
               FROM evt_ingresos i 
               WHERE i.evento_id = e.id AND i.cobrado = true)) * 100
        ELSE 0 
    END as margen_utilidad,
    e.status_facturacion
FROM evt_eventos e
LEFT JOIN evt_clientes c ON e.cliente_id = c.id
LEFT JOIN evt_tipos_evento te ON e.tipo_evento_id = te.id
LEFT JOIN evt_estados es ON e.estado_id = es.id;

-- VERIFICAR CORRECCIÓN
SELECT 
    'vw_eventos_completos' as vista,
    SUM(total) as suma_ingresos,
    SUM(total_gastos) as suma_gastos,
    SUM(utilidad) as utilidad_total
FROM vw_eventos_completos
UNION ALL
SELECT 
    'vw_master_facturacion' as vista,
    SUM(total) as suma_ingresos,
    SUM(total_gastos) as suma_gastos,
    SUM(utilidad) as utilidad_total
FROM vw_master_facturacion;

-- Debe mostrar SOLO los totales de pagados/cobrados
```

**Tiempo estimado**: 5 minutos  
**Riesgo**: BAJO (solo afecta vistas, no datos)

#### Paso 1.3: Refrescar Cache de Supabase

```sql
-- Forzar refresh de schemas
NOTIFY pgrst, 'reload schema';
```

Alternativamente, en Supabase Dashboard:
- Settings → Database → Restart Database (solo si es necesario)

---

### FASE 2: CORRECCIÓN DE TRIGGERS 🔧

#### Paso 2.1: Auditar Triggers Existentes

```sql
-- Listar todos los triggers en tablas evt_*
SELECT 
    trigger_name,
    event_object_table,
    action_statement
FROM information_schema.triggers
WHERE event_object_table IN ('evt_gastos', 'evt_ingresos', 'evt_eventos')
ORDER BY event_object_table, trigger_name;
```

#### Paso 2.2: Corregir Trigger de Gastos (si existe)

```sql
-- Verificar función actual
SELECT pg_get_functiondef(oid) 
FROM pg_proc 
WHERE proname = 'update_event_financials_on_expense';

-- Si la función NO filtra por pagado = true, reemplazarla:

CREATE OR REPLACE FUNCTION update_event_financials_on_expense()
RETURNS TRIGGER AS $$
BEGIN
    -- Actualizar totales del evento SOLO con gastos PAGADOS
    UPDATE evt_eventos
    SET 
        total_gastos = (
            SELECT COALESCE(SUM(total), 0)
            FROM evt_gastos
            WHERE evento_id = COALESCE(NEW.evento_id, OLD.evento_id)
              AND pagado = true  -- ✅ FILTRO CRÍTICO
        ),
        updated_at = NOW()
    WHERE id = COALESCE(NEW.evento_id, OLD.evento_id);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

#### Paso 2.3: Corregir Trigger de Ingresos (si existe)

```sql
CREATE OR REPLACE FUNCTION update_event_financials_on_income()
RETURNS TRIGGER AS $$
BEGIN
    -- Actualizar totales del evento SOLO con ingresos COBRADOS
    UPDATE evt_eventos
    SET 
        total_ingresos = (
            SELECT COALESCE(SUM(total), 0)
            FROM evt_ingresos
            WHERE evento_id = COALESCE(NEW.evento_id, OLD.evento_id)
              AND cobrado = true  -- ✅ FILTRO CRÍTICO
        ),
        updated_at = NOW()
    WHERE id = COALESCE(NEW.evento_id, OLD.evento_id);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

**Tiempo estimado**: 10 minutos  
**Riesgo**: MEDIO (afecta lógica de negocio)

---

### FASE 3: VALIDACIÓN INTEGRAL 🧪

#### Paso 3.1: Ejecutar Pruebas Automatizadas

```bash
# Ejecutar script de pruebas integrales
node pruebas-integrales.mjs
```

**Resultado esperado**: ✅ 4/4 pruebas pasando (0% fallos)

#### Paso 3.2: Pruebas Manuales de Módulos

##### 3.2.1 Dashboard Principal
- [ ] Verificar KPIs muestran SOLO datos pagados/cobrados
- [ ] Gráficas de tendencias correctas
- [ ] Margen de utilidad entre 30-40%

##### 3.2.2 Master de Facturación
```typescript
// Archivo: src/modules/eventos/MasterFacturacionPage.tsx
// Línea 74: Usa vw_master_facturacion
```
- [ ] Tabla muestra totales correctos
- [ ] Filtros funcionan correctamente
- [ ] Exportación a Excel/PDF correcta

##### 3.2.3 Detalle de Evento
```typescript
// Archivo: src/modules/eventos/components/events/EventDetail.tsx
// Línea 48: Usa vw_eventos_completos
```
- [ ] Tab "Finanzas" muestra datos correctos
- [ ] Utilidad calculada correctamente
- [ ] Histórico de transacciones correcto

##### 3.2.4 Reportes Bancarios
- [ ] Saldos de cuentas bancarias correctos
- [ ] Movimientos solo de transacciones pagadas/cobradas

**Tiempo estimado**: 30 minutos  
**Responsable**: QA + Desarrollador

---

### FASE 4: OPTIMIZACIÓN Y MEJORAS 🚀

#### Paso 4.1: Crear Índices para Performance

```sql
-- Índices para mejorar performance de consultas con filtros
CREATE INDEX IF NOT EXISTS idx_evt_gastos_pagado_evento 
ON evt_gastos(evento_id, pagado) WHERE pagado = true;

CREATE INDEX IF NOT EXISTS idx_evt_ingresos_cobrado_evento 
ON evt_ingresos(evento_id, cobrado) WHERE cobrado = true;

-- Índices para queries de reportes
CREATE INDEX IF NOT EXISTS idx_evt_gastos_pagado_cuenta 
ON evt_gastos(cuenta_id, pagado, fecha_pago) WHERE pagado = true;

CREATE INDEX IF NOT EXISTS idx_evt_ingresos_cobrado_fecha 
ON evt_ingresos(cobrado, fecha_cobro) WHERE cobrado = true;
```

#### Paso 4.2: Crear Vista Adicional para Pendientes

```sql
-- Vista para gestión de pendientes (opcional)
CREATE VIEW vw_eventos_pendientes AS
SELECT 
    e.id,
    e.nombre_proyecto,
    -- Gastos pendientes
    (SELECT COALESCE(SUM(total), 0) 
     FROM evt_gastos g 
     WHERE g.evento_id = e.id AND g.pagado = false) as gastos_pendientes,
    -- Ingresos pendientes
    (SELECT COALESCE(SUM(total), 0) 
     FROM evt_ingresos i 
     WHERE i.evento_id = e.id AND i.cobrado = false) as ingresos_pendientes
FROM evt_eventos e;
```

#### Paso 4.3: Documentar Cambios

Crear archivo: `docs/CHANGELOG_VISTAS_FINANCIERAS.md`

```markdown
# Changelog - Corrección de Vistas Financieras

## 2025-10-27 - Corrección Crítica

### Problema
Las vistas `vw_eventos_completos` y `vw_master_facturacion` incluían 
registros NO pagados/cobrados en cálculos financieros.

### Solución
- Agregado filtro `WHERE pagado = true` en agregaciones de gastos
- Agregado filtro `WHERE cobrado = true` en agregaciones de ingresos
- Corregidos triggers para actualizar solo con transacciones confirmadas

### Impacto
- Métricas financieras ahora reflejan dinero real
- KPIs corregidos
- Dashboards muestran información precisa
```

**Tiempo estimado**: 20 minutos

---

## 📊 PLAN DE PRUEBAS INTEGRAL COMPLETO

### Suite de Pruebas Automatizadas

#### Test 1: Integridad de Datos
```javascript
// Archivo: pruebas-integridad-datos.mjs
describe('Integridad de Datos Financieros', () => {
  test('Gastos pagados suman correctamente', async () => {
    const { data: gastos } = await supabase
      .from('evt_gastos')
      .select('total')
      .eq('pagado', true);
    
    const totalReal = gastos.reduce((sum, g) => sum + g.total, 0);
    
    const { data: vista } = await supabase
      .from('vw_eventos_completos')
      .select('total_gastos');
    
    const totalVista = vista.reduce((sum, v) => sum + v.total_gastos, 0);
    
    expect(Math.abs(totalVista - totalReal)).toBeLessThan(0.01);
  });
});
```

#### Test 2: Vistas Consistentes
```javascript
test('vw_eventos_completos y vw_master_facturacion coinciden', async () => {
  const { data: eventos } = await supabase
    .from('vw_eventos_completos')
    .select('id, total, total_gastos');
  
  const { data: master } = await supabase
    .from('vw_master_facturacion')
    .select('evento_id, total, total_gastos');
  
  eventos.forEach(evento => {
    const masterEvento = master.find(m => m.evento_id === evento.id);
    expect(evento.total).toBe(masterEvento.total);
    expect(evento.total_gastos).toBe(masterEvento.total_gastos);
  });
});
```

#### Test 3: Triggers Funcionan Correctamente
```javascript
test('Trigger actualiza totales al cambiar status_pago', async () => {
  // Crear gasto pendiente
  const { data: gasto } = await supabase
    .from('evt_gastos')
    .insert({
      evento_id: testEventId,
      total: 1000,
      pagado: false
    })
    .select()
    .single();
  
  // Verificar que NO se sumó
  let { data: evento } = await supabase
    .from('evt_eventos')
    .select('total_gastos')
    .eq('id', testEventId)
    .single();
  
  const totalAntes = evento.total_gastos;
  
  // Marcar como pagado
  await supabase
    .from('evt_gastos')
    .update({ pagado: true })
    .eq('id', gasto.id);
  
  // Verificar que SÍ se sumó
  ({ data: evento } = await supabase
    .from('evt_eventos')
    .select('total_gastos')
    .eq('id', testEventId)
    .single());
  
  expect(evento.total_gastos).toBe(totalAntes + 1000);
});
```

### Pruebas Manuales de UI

#### Checklist Dashboard
- [ ] Card "Ingresos Totales" muestra monto correcto
- [ ] Card "Gastos Totales" muestra monto correcto
- [ ] Card "Utilidad" = Ingresos - Gastos
- [ ] Card "Margen" entre 30-40%
- [ ] Gráfica de tendencias coherente
- [ ] Eventos más rentables correctos

#### Checklist Master Facturación
- [ ] Tabla carga sin errores
- [ ] Columna "Total" correcta por evento
- [ ] Columna "Gastos" correcta por evento
- [ ] Columna "Utilidad" = Total - Gastos
- [ ] Columna "Margen %" correcto
- [ ] Filtros funcionan
- [ ] Búsqueda funciona
- [ ] Exportar a Excel funciona

#### Checklist Detalle Evento
- [ ] Tab "Datos Generales" muestra info correcta
- [ ] Tab "Finanzas" muestra:
  - [ ] Lista de ingresos
  - [ ] Lista de gastos
  - [ ] Totales correctos
  - [ ] Indicadores de pagado/pendiente
- [ ] Tab "Documentos" carga archivos
- [ ] Todas las acciones CRUD funcionan

---

## 🎯 CRITERIOS DE ACEPTACIÓN

### Criterio 1: Precisión Financiera
✅ **APROBADO si**:
- Diferencia entre vista y cálculo directo < $0.01
- Todos los módulos muestran mismos totales
- Pendientes NO se suman a pagados/cobrados

### Criterio 2: Performance
✅ **APROBADO si**:
- Carga de vw_eventos_completos < 500ms (100 eventos)
- Carga de vw_master_facturacion < 500ms
- Dashboard carga en < 2 segundos

### Criterio 3: Consistencia
✅ **APROBADO si**:
- 100% de pruebas automatizadas pasan
- 100% de checklist manual completado
- 0 discrepancias entre módulos

---

## 📝 REPORTE FINAL ESPERADO

### Antes de Corrección
```
❌ Pruebas: 0/4 pasadas (0% éxito)
❌ Diferencia ingresos: +$823,627 (29% inflado)
❌ Diferencia gastos: +$1,071,558 (255% inflado)
❌ Métricas incorrectas en Dashboard
❌ Reportes no confiables
```

### Después de Corrección
```
✅ Pruebas: 4/4 pasadas (100% éxito)
✅ Diferencia ingresos: $0.00 (exacto)
✅ Diferencia gastos: $0.00 (exacto)
✅ Dashboard muestra datos reales
✅ Reportes confiables para toma de decisiones
```

---

## ⚡ RESUMEN EJECUTIVO

**ACCIÓN INMEDIATA REQUERIDA**:
1. ✅ Ejecutar `FIX_VISTAS_PAGADO_COBRADO.sql` en Supabase Dashboard (5 min)
2. ✅ Ejecutar `node pruebas-integrales.mjs` para validar (1 min)
3. ✅ Si fallan pruebas, revisar triggers (10 min)
4. ✅ Validación manual de módulos principales (30 min)

**TIEMPO TOTAL ESTIMADO**: 45 minutos - 1 hora  
**RIESGO**: BAJO (cambios solo en capa de visualización)  
**IMPACTO**: ALTO (corrige métricas críticas de negocio)  

**PRIORIDAD**: 🔴 CRÍTICA - Ejecutar HOY

---

**Preparado por**: AI Assistant  
**Revisado por**: [Pendiente]  
**Aprobado por**: [Pendiente]  
**Fecha**: 2025-10-27
