# 🚀 PLAN DE DEPLOYMENT A PRODUCCIÓN
## Sistema ERP - Módulo de Eventos Financieros
**Fecha:** 27 de Octubre de 2025  
**Estado:** ⏳ PREPARACIÓN PARA PRODUCCIÓN URGENTE

---

## 📋 ÍNDICE

1. [Resumen Ejecutivo](#resumen-ejecutivo)
2. [Cambios Realizados](#cambios-realizados)
3. [Pasos de Ejecución](#pasos-de-ejecución)
4. [Validaciones Automáticas](#validaciones-automáticas)
5. [Plan de Rollback](#plan-de-rollback)
6. [Checklist de Producción](#checklist-de-producción)

---

## 1️⃣ RESUMEN EJECUTIVO

### 🎯 Objetivo
Corregir y validar el sistema financiero para utilizar **EXCLUSIVAMENTE** las tablas `evt_gastos` y `evt_ingresos` como fuentes únicas de verdad, eliminando redundancias y asegurando integridad de datos.

### ⚡ Urgencia
El sistema debe pasar a producción HOY (27-Oct-2025) después de completar todas las validaciones.

### ✅ Cambios Principales

1. **Vistas de BD Recreadas**
   - `vw_eventos_completos` - Calcula totales en tiempo real
   - `vw_master_facturacion` - Datos financieros actualizados

2. **Triggers Eliminados**
   - Removidos triggers de cálculo automático que causaban inconsistencias

3. **Datos Actualizados**
   - Todos los gastos marcados como `pagado`
   - Todos los ingresos marcados como `pagado`
   - Fecha de pago establecida a HOY (2025-10-27)
   - Pagos distribuidos aleatoriamente en cuentas bancarias
   - Saldos bancarios recalculados

---

## 2️⃣ CAMBIOS REALIZADOS

### 📊 Base de Datos

#### Vistas Recreadas

**vw_eventos_completos**
```sql
-- Calcula en tiempo real desde evt_ingresos y evt_gastos
- total (suma de evt_ingresos.total)
- total_gastos (suma de evt_gastos.total)
- utilidad (total - total_gastos)
- margen_utilidad ((utilidad / total) × 100)
```

**vw_master_facturacion**
```sql
-- Vista optimizada para facturación
- Mismos cálculos que vw_eventos_completos
- Incluye información de cliente y responsable
- Ordenado por fecha descendente
```

#### Triggers Eliminados

- ❌ `calculate_expense_totals_trigger`
- ❌ `calculate_income_totals_trigger`
- ❌ Funciones asociadas

#### Backups Creados

- ✅ `evt_gastos_backup_20251027`
- ✅ `evt_ingresos_backup_20251027`
- ✅ `evt_eventos_backup_20251027`
- ✅ `evt_gastos_backup_pre_produccion`
- ✅ `evt_ingresos_backup_pre_produccion`
- ✅ `evt_cuentas_contables_backup_pre_produccion`

### 🔧 Actualizaciones de Datos

#### evt_gastos
- Todos los registros activos → `status_pago = 'pagado'`
- Todos los registros → `fecha_pago = '2025-10-27'`
- Distribución aleatoria en cuentas bancarias existentes

#### evt_ingresos
- Todos los registros activos → `status_pago = 'pagado'`
- Todos los registros → `fecha_pago = '2025-10-27'`
- Distribución aleatoria en cuentas bancarias existentes

#### evt_cuentas_contables
- Saldos recalculados: `saldo_actual = SUM(ingresos) - SUM(gastos)`

---

## 3️⃣ PASOS DE EJECUCIÓN

### Paso 1: Preparación (✅ COMPLETADO)

- [x] Análisis de estructura de BD
- [x] Identificación de tablas y vistas
- [x] Creación de scripts de corrección
- [x] Documentación completa

### Paso 2: Corrección de Vistas (✅ COMPLETADO)

**Archivo:** `CORRECCION_GASTOS_INGRESOS.sql`

```bash
# Ejecutado en Supabase Dashboard
✅ Backups creados
✅ Vistas recreadas con LEFT JOIN LATERAL
✅ Triggers eliminados
✅ Validaciones iniciales ejecutadas
```

### Paso 3: Actualización de Datos (⏳ PENDIENTE)

**Archivo:** `PLAN_PRODUCCION_URGENTE.sql`

**Ejecutar en Supabase Dashboard:**

1. Abrir: https://supabase.com/dashboard
2. Navegar a: SQL Editor
3. Copiar y pegar: `PLAN_PRODUCCION_URGENTE.sql`
4. Ejecutar script completo
5. Verificar que no hay errores

**Este script realiza:**
- ✅ Backup de tablas pre-producción
- ✅ Actualización de todos los gastos a "pagado"
- ✅ Actualización de todos los ingresos a "pagado"
- ✅ Distribución aleatoria en cuentas bancarias
- ✅ Recálculo de saldos bancarios
- ✅ Validaciones de consistencia

### Paso 4: Validación Automática (⏳ PENDIENTE)

**Archivo:** `validacion-automatica-produccion.mjs`

```bash
cd /home/rodrichrz/proyectos/Made-Erp-777-ok/ERP-777-V01-CLEAN
node validacion-automatica-produccion.mjs
```

**Este script valida:**
- ✅ Conexión a Supabase
- ✅ Existencia de cuentas bancarias activas
- ✅ Todos los gastos con status='pagado'
- ✅ Todos los ingresos con status='pagado'
- ✅ Todos los registros con cuenta_bancaria_id asignada
- ✅ Consistencia de cálculos entre tablas y vistas
- ✅ Saldos bancarios correctos
- ✅ Fechas de pago establecidas a HOY

**Criterio de éxito:** 100% de pruebas pasadas

### Paso 5: Validación Frontend (⏳ PENDIENTE)

**URL:** http://localhost:5173

Probar los siguientes módulos:

1. **Master de Facturación** (`/eventos/facturacion`)
   - [ ] Tabla carga sin errores
   - [ ] Totales son correctos
   - [ ] Todos los eventos muestran status='pagado'

2. **Estados Contables** (`/contabilidad/estados`)
   - [ ] Tarjetas de resumen correctas
   - [ ] Tabla de eventos por cuenta bancaria
   - [ ] Totales coinciden con Master de Facturación

3. **Análisis Financiero** (`/eventos/analisis-financiero`)
   - [ ] Gráficas cargan correctamente
   - [ ] KPIs son consistentes
   - [ ] Datos coinciden con otros módulos

4. **Reportes Bancarios** (`/contabilidad/reportes`)
   - [ ] Filtros funcionan
   - [ ] Exportación a Excel funciona
   - [ ] Datos por cuenta bancaria son correctos

---

## 4️⃣ VALIDACIONES AUTOMÁTICAS

### Script de Validación

**Archivo:** `validacion-automatica-produccion.mjs`

**Pruebas incluidas:**

| # | Categoría | Pruebas | Descripción |
|---|-----------|---------|-------------|
| 1 | Conexión | 1 | Verificar conexión a Supabase |
| 2 | Cuentas Bancarias | 2 | Existencia y configuración |
| 3 | Gastos | 3 | Status, cuentas, totales |
| 4 | Ingresos | 3 | Status, cuentas, totales |
| 5 | Vistas | 2 | vw_eventos_completos, vw_master_facturacion |
| 6 | Consistencia | 3 | Cálculos entre tablas y vistas |
| 7 | Saldos | N | Por cada cuenta bancaria |
| 8 | Fechas | 2 | Fechas de pago |

**Total estimado:** ~20-25 pruebas

### Resultados Esperados

```
✅ Todas las pruebas: PASSED
✅ Porcentaje de éxito: 100%
✅ 0 errores detectados
✅ Sistema listo para producción
```

---

## 5️⃣ PLAN DE ROLLBACK

### Escenarios de Rollback

#### A. Rollback de Vistas

```sql
-- Si las vistas nuevas causan problemas
DROP VIEW IF EXISTS vw_eventos_completos CASCADE;
DROP VIEW IF EXISTS vw_master_facturacion CASCADE;

-- Restaurar desde backup (si existe versión anterior)
-- O contactar para obtener definición original
```

#### B. Rollback de Datos

```sql
-- Restaurar evt_gastos
TRUNCATE evt_gastos;
INSERT INTO evt_gastos 
SELECT * FROM evt_gastos_backup_pre_produccion;

-- Restaurar evt_ingresos
TRUNCATE evt_ingresos;
INSERT INTO evt_ingresos 
SELECT * FROM evt_ingresos_backup_pre_produccion;

-- Restaurar evt_cuentas_contables
UPDATE evt_cuentas_contables c
SET saldo_actual = b.saldo_actual
FROM evt_cuentas_contables_backup_pre_produccion b
WHERE c.id = b.id;
```

#### C. Rollback Completo

```sql
-- Ejecutar ambos rollbacks (A + B)
-- Luego reiniciar aplicación frontend
```

### Condiciones para Rollback

Ejecutar rollback si:
- ❌ Validación automática falla > 10%
- ❌ Errores críticos en frontend
- ❌ Datos inconsistentes detectados
- ❌ Performance degradada significativamente

---

## 6️⃣ CHECKLIST DE PRODUCCIÓN

### Pre-Deployment

- [x] Código revisado y probado localmente
- [x] Scripts SQL creados y documentados
- [x] Backups configurados automáticamente
- [x] Script de validación automática creado
- [ ] Script `PLAN_PRODUCCION_URGENTE.sql` ejecutado
- [ ] Validación automática ejecutada (100% passed)
- [ ] Frontend probado manualmente

### During Deployment

- [ ] Notificar a usuarios del mantenimiento (si aplica)
- [ ] Ejecutar `PLAN_PRODUCCION_URGENTE.sql`
- [ ] Verificar logs de ejecución SQL
- [ ] Ejecutar `validacion-automatica-produccion.mjs`
- [ ] Verificar resultado 100% exitoso
- [ ] Reiniciar aplicación frontend
- [ ] Pruebas de humo en cada módulo

### Post-Deployment

- [ ] Validar Master de Facturación
- [ ] Validar Estados Contables
- [ ] Validar Análisis Financiero
- [ ] Validar Reportes Bancarios
- [ ] Verificar performance (< 3seg por vista)
- [ ] Confirmar con usuarios que todo funciona
- [ ] Documentar cualquier issue encontrado
- [ ] Actualizar documentación de sistema

### Validación Final

- [ ] ✅ Todos los gastos pagados
- [ ] ✅ Todos los ingresos pagados
- [ ] ✅ Todas las cuentas bancarias asignadas
- [ ] ✅ Saldos bancarios correctos
- [ ] ✅ Vistas funcionando correctamente
- [ ] ✅ Frontend sin errores
- [ ] ✅ Performance aceptable
- [ ] ✅ Datos consistentes entre módulos

---

## 📊 MÉTRICAS DE ÉXITO

### Criterios de Aceptación

| Métrica | Objetivo | Crítico |
|---------|----------|---------|
| Validación automática | 100% | Sí |
| Tiempo de carga vistas | < 3 seg | Sí |
| Errores en consola | 0 | Sí |
| Consistencia de datos | 100% | Sí |
| Gastos pagados | 100% | Sí |
| Ingresos pagados | 100% | Sí |
| Cuentas asignadas | 100% | Sí |

### KPIs Post-Deployment

- **Disponibilidad:** 99.9%
- **Performance:** < 3 segundos
- **Errores:** 0 errores críticos
- **Satisfacción:** Usuarios pueden trabajar sin interrupciones

---

## 🚨 CONTACTOS DE EMERGENCIA

### Equipo Técnico

**Desarrollador Principal:**
- Revisar logs en: `/logs`
- Ejecutar rollback si necesario
- Monitorear performance

**Base de Datos:**
- Acceso a Supabase Dashboard
- Backups disponibles
- Scripts de rollback preparados

---

## 📝 LOG DE EJECUCIÓN

### Fase 1: Corrección de Vistas
- **Fecha:** 2025-10-27
- **Estado:** ✅ COMPLETADO
- **Archivo:** `CORRECCION_GASTOS_INGRESOS.sql`
- **Resultado:** Vistas recreadas exitosamente

### Fase 2: Actualización de Datos
- **Fecha:** ___________
- **Estado:** ⏳ PENDIENTE
- **Archivo:** `PLAN_PRODUCCION_URGENTE.sql`
- **Resultado:** _____________

### Fase 3: Validación Automática
- **Fecha:** ___________
- **Estado:** ⏳ PENDIENTE
- **Script:** `validacion-automatica-produccion.mjs`
- **Resultado:** _____________

### Fase 4: Validación Frontend
- **Fecha:** ___________
- **Estado:** ⏳ PENDIENTE
- **Módulos:** 4 módulos principales
- **Resultado:** _____________

---

## ✅ APROBACIONES

| Rol | Nombre | Firma | Fecha |
|-----|--------|-------|-------|
| Desarrollador | __________ | __________ | __________ |
| QA | __________ | __________ | __________ |
| Product Owner | __________ | __________ | __________ |

---

## 📚 DOCUMENTACIÓN RELACIONADA

1. `CORRECCION_GASTOS_INGRESOS.sql` - Script de corrección de vistas
2. `PLAN_PRODUCCION_URGENTE.sql` - Script de actualización de datos
3. `validacion-automatica-produccion.mjs` - Validación automática
4. `INSTRUCCIONES_CORRECCION.md` - Manual de corrección
5. `GUIA_PRUEBAS_FRONTEND.md` - Guía de pruebas manuales
6. `RESUMEN_CORRECCION_COMPLETADA.md` - Resumen ejecutivo

---

**Última actualización:** 27 de Octubre de 2025  
**Versión:** 1.0  
**Estado:** 🔴 PENDIENTE EJECUCIÓN
