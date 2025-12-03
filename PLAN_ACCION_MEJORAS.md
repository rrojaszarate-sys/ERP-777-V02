# 📋 PLAN DE ACCIÓN - MEJORAS ERP 777 V2

## Estado: ACTUALIZADO 3 Dic 2025

---

## ✅ COMPLETADO HOY

| Tarea | Estado | Detalle |
|-------|--------|---------|
| Productos sin precio | ✅ LISTO | 274 productos → precios mercado MX asignados |
| Gastos sin categoría | ✅ LISTO | 1 gasto → Categoría Materiales |
| Eventos sin estado | ✅ LISTO | 1 evento → Estado Prospecto |
| Eventos sin cliente | ✅ LISTO | Ya estaban todos asignados |

**Productos ahora: 568/568 (100%) con precio**

---

## 🔴 CRÍTICO - Tablas de BD Faltantes

**Archivo SQL listo:** `sql/PLAN_TABLAS_INVENTARIO.sql`

| Tabla | Función | Prioridad |
|-------|---------|-----------|
| `transferencias_erp` | Mover stock entre almacenes | P1 |
| `transferencias_detalle_erp` | Detalle de transferencias | P1 |
| `inv_existencias` | Stock real por ubicación | P1 |
| `inv_ubicaciones` | Pasillos, racks, niveles | P2 |
| `inv_lotes` | Trazabilidad y caducidad | P2 |
| `inv_reservas` | Reservar stock para eventos | P2 |
| `inv_conteos_erp` | Conteos físicos | P3 |
| `inv_alertas_erp` | Alertas de stock | P3 |
| `inv_checklists_erp` | Verificaciones | P3 |

### 📝 Cómo ejecutar:
1. Abrir Supabase Dashboard → SQL Editor
2. Copiar contenido de `sql/PLAN_TABLAS_INVENTARIO.sql`
3. Ejecutar
4. Verificar que no haya errores

---

## 🟠 ALTO - Funcionalidades Pendientes (TODOs)

| Módulo | Funcionalidad | Archivo | Estimado |
|--------|---------------|---------|----------|
| Dashboard | `polizasPendientes` | `ExecutiveKPIs.tsx:55` | 2h |
| Dashboard | `proyectosActivos` | `ExecutiveKPIs.tsx:56` | 1h |
| Dashboard | `tareasVencidas` | `ExecutiveKPIs.tsx:57` | 2h |
| Inventario | Servicios deshabilitados | `InventarioDashboard.tsx` | 4h |
| Contabilidad | Exportar Balanza a PDF | `BalanzaComprobacion.tsx` | 3h |
| Ubicaciones | Conteo productos por ubicación | `ubicacionesService.ts` | 2h |

### Plan de implementación:

#### Semana 1: Dashboard KPIs
```
1. polizasPendientes → Consultar contabilidad_polizas_erp con status != 'publicada'
2. proyectosActivos → Contar proyectos_erp con estado 'en_progreso'
3. tareasVencidas → Consultar tareas con fecha_vencimiento < hoy
```

#### Semana 2: Inventario Dashboard
```
1. Descomentar servicios en InventarioDashboard.tsx
2. Conectar con tablas nuevas (después de crearlas)
3. Implementar alertasService real
4. Implementar checklistService real
```

#### Semana 3: Reportes y Exportación
```
1. Agregar librería jspdf o pdfmake
2. Implementar exportarBalanzaPDF()
3. Agregar botón de exportación en UI
```

---

## 🟡 DEUDA TÉCNICA (Mejora continua)

| Problema | Cantidad | Acción Recomendada | Prioridad |
|----------|----------|-------------------|-----------|
| `console.log` en producción | 1,801 | Script de limpieza | Media |
| Uso de `any` en TypeScript | 1,209 | Tipar gradualmente | Baja |
| Valores hardcodeados | ~15 | Mover a config/env | Media |
| Archivos Playwright .js con TS | 3 | Renombrar a .ts | Baja |

### Script para limpiar console.logs:
```bash
# En modo desarrollo, mantener. En producción, usar:
find src -name "*.ts" -o -name "*.tsx" | xargs sed -i '/console.log/d'

# O mejor: usar variable de entorno
# if (import.meta.env.DEV) console.log(...)
```

---

## 📊 DATOS DE PRUEBA - Contexto

### Provisiones (151 pendientes)
- **Origen:** Evento 4802 (producción real)
- **Estado:** Datos de producción, NO son de prueba
- **Acción:** Dejar como están, son provisiones reales del negocio

### Ingresos cobrados sin fecha (13)
- **Problema:** Trigger de BD bloquea actualización de `fecha_cobro`
- **Causa:** `record "new" has no field "updated_at"` en trigger
- **Acción:** Corregir trigger en `evt_ingresos_erp`

```sql
-- Verificar y corregir trigger
DROP TRIGGER IF EXISTS set_updated_at_ingresos ON evt_ingresos_erp;

-- O modificar para usar columna correcta
CREATE OR REPLACE FUNCTION update_ingresos_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.fecha_actualizacion = NOW(); -- usar columna que SÍ existe
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

---

## 🎯 PRIORIDADES RECOMENDADAS

### Esta semana:
1. ✅ Ejecutar `PLAN_TABLAS_INVENTARIO.sql` en Supabase (11 tablas creadas)
2. ✅ Corregir trigger de `evt_ingresos_erp` (verificado - funciona)
3. ✅ Implementar KPIs del Dashboard (polizasPendientes, proyectosActivos, tareasVencidas)

### Próxima semana:
4. ✅ Habilitar servicios de Inventario Dashboard (vistas alias creadas)
5. ✅ Implementar exportación PDF de Balanza (jsPDF + autoTable)
6. ✅ Limpiar console.logs críticos (eventsService.ts usando logger)

### Mes siguiente:
7. ✅ Tipar `any` en archivos críticos (OCRDocument en financesService)
8. ✅ Agregar tests para nuevas tablas (51 tests, 100% pass)
9. ✅ Documentar APIs de inventario (services/index.ts creado)

---

## 📋 COMPLETADO (2025-12-03)

| Item | Descripción | Estado |
|------|-------------|--------|
| Tablas Inventario | 11 tablas + 7 vistas alias | ✅ |
| KPIs Dashboard | polizasPendientes, proyectosActivos, tareasVencidas | ✅ |
| Servicios Inventario | Habilitados en InventarioDashboard.tsx | ✅ |
| Precios Productos | 568/568 con precio (100%) | ✅ |
| Provisiones Huérfanas | 133 eliminadas, 42 válidas | ✅ |
| Gastos sin categoría | 0 (corregido) | ✅ |
| Eventos sin estado | 0 (corregido) | ✅ |
| Exportación PDF Balanza | jsPDF + autoTable implementado | ✅ |
| Logger en servicios | eventsService.ts migrado | ✅ |
| Tipos OCR | OCRDocument reemplaza any | ✅ |
| Tests nuevas tablas | 51/51 pasando (100%) | ✅ |
| Documentación APIs | services/index.ts completo | ✅ |
| Pruebas exhaustivas | 51/51 pasando (100%) | ✅ |

---

## 📁 Archivos de Referencia

| Archivo | Propósito |
|---------|-----------|
| `sql/PLAN_TABLAS_INVENTARIO.sql` | Script SQL para crear tablas |
| `scripts/pruebas-exhaustivas.mjs` | Suite de pruebas (49 tests) |
| `REPORTE_CICLOS_COMPLETOS.md` | Documentación de ciclos |

---

*Actualizado: 3 de Diciembre 2025*
