# 🧪 GUÍA DE VALIDACIÓN - Módulos Corregidos

## 🎯 Objetivo
Validar que los módulos de **Catálogos** y **Contabilidad/Finanzas** funcionen correctamente después de las correcciones implementadas.

---

## ✅ CORRECCIONES IMPLEMENTADAS

### 1. Módulo de Administración de Catálogos
- ✅ Tabla corregida: `'clientes'` → `'evt_clientes'`
- ✅ Tabla corregida: `'evt_tipos_gasto'` → `'evt_categorias_gastos'`
- ✅ Contador de uso implementado
- ✅ Validación de eliminación
- ✅ Búsqueda mejorada (RFC, email, nombre comercial)
- ✅ Integración con módulo completo de clientes

### 2. Submódulos de Contabilidad/Finanzas
- ✅ Columna corregida: `pagado` → `cobrado` (8 correcciones)
- ✅ Estados contables creados:
  - **Cerrado** (ID: 9)
  - **Pagos Pendiente** (ID: 10)
  - **Pagados** (ID: 11)
  - **Pagos Vencidos** (ID: 12)

---

## 📝 CHECKLIST DE VALIDACIÓN

### ✅ PASO 1: Validar Módulo de Catálogos

**URL**: http://localhost:5173/eventos/catalogos

#### Pestaña: Clientes

- [ ] **Carga de datos**: ¿Se muestran los clientes de la tabla `evt_clientes`?
- [ ] **Campos visibles**: ¿Se muestran Razón Social, RFC, Email, Teléfono?
- [ ] **Contador de uso**: ¿Aparece la columna "Uso" con el número de eventos?
- [ ] **Búsqueda**: 
  - [ ] Buscar por razón social
  - [ ] Buscar por RFC
  - [ ] Buscar por email
- [ ] **Botón "Gestión Completa"**: ¿Aparece el botón?
- [ ] **Navegación**: ¿El botón lleva a `/eventos/clientes`?
- [ ] **Eliminación**:
  - [ ] Si un cliente tiene eventos: ¿Muestra error y previene eliminación?
  - [ ] Si un cliente NO tiene eventos: ¿Permite eliminación?

#### Pestaña: Tipos de Evento

- [ ] **Carga de datos**: ¿Se muestran los tipos de evento?
- [ ] **Contador de uso**: ¿Muestra número de eventos por tipo?
- [ ] **Eliminación**: ¿Previene eliminar tipos con eventos asociados?

#### Pestaña: Categorías de Gastos

- [ ] **Carga de datos**: ¿Se muestran las categorías de `evt_categorias_gastos`?
- [ ] **Contador de uso**: ¿Muestra número de gastos por categoría?
- [ ] **Eliminación**: ¿Previene eliminar categorías con gastos asociados?

---

### ✅ PASO 2: Validar Dashboard de Contabilidad

**URL**: http://localhost:5173/contabilidad/estados

#### Métricas del Dashboard

- [ ] **Total Eventos**: ¿Muestra un número (no cero)?
- [ ] **Eventos Cerrados**: ¿Muestra eventos en estado "Cerrado"?
- [ ] **Pagos Pendientes**: ¿Muestra eventos en estado "Pagos Pendiente"?
- [ ] **Pagos Cobrados**: ¿Muestra eventos en estado "Pagados"?
- [ ] **Pagos Vencidos**: ¿Muestra eventos en estado "Pagos Vencidos"?

#### Gráficas y Visualizaciones

- [ ] **Gráfica de estados**: ¿Se muestra correctamente?
- [ ] **Tasa de cobranza**: ¿Se calcula basándose en `cobrado` (no `pagado`)?
- [ ] **Sin errores en consola**: Abrir DevTools (F12) → ¿Hay errores de columna `pagado`?

---

### ✅ PASO 3: Validar Cuentas Bancarias

**URL**: http://localhost:5173/contabilidad/cuentas

- [ ] **Listado de cuentas**: ¿Se muestran las 5 cuentas bancarias?
  - BBVA - Cuenta Principal
  - Santander - Operativa
  - HSBC - Nómina
  - Caja General
  - Caja Chica
- [ ] **Funcionalidad CRUD**: ¿Se pueden crear/editar/eliminar cuentas?

---

### ✅ PASO 4: Validar Reportes Bancarios

**URL**: http://localhost:5173/contabilidad/reportes

- [ ] **Carga de reportes**: ¿Se muestran movimientos bancarios?
- [ ] **Filtros**: ¿Funcionan los filtros por fecha/cuenta?
- [ ] **Generación de reportes**: ¿Se pueden generar reportes?

---

## 🐛 POSIBLES PROBLEMAS Y SOLUCIONES

### Problema 1: Dashboard muestra ceros

**Causa**: No hay eventos asignados a los nuevos estados contables.

**Solución**:
1. Ir a **Módulo de Eventos** (`/eventos`)
2. Editar algunos eventos
3. Cambiar su `estado_id` a uno de los nuevos:
   - Cerrado (ID: 9)
   - Pagos Pendiente (ID: 10)
   - Pagados (ID: 11)
   - Pagos Vencidos (ID: 12)

### Problema 2: Error "column pagado does not exist"

**Causa**: Código TypeScript aún usa `pagado` en lugar de `cobrado`.

**Verificar**:
```bash
grep -r "\.pagado" src/
grep -r "pagado:" src/
```

**Solución**: Ya se corrigieron 8 ocurrencias en `accountingStateService.ts`. Si aparecen más, notificar.

### Problema 3: Catálogos no cargan datos

**Causa**: Posible problema de permisos RLS en Supabase.

**Verificar**:
1. Abrir DevTools (F12) → Network
2. Ver respuestas de Supabase
3. Verificar si hay errores 403/401

**Solución**: Revisar políticas RLS en tabla `evt_clientes` y `evt_categorias_gastos`.

---

## 📊 MÉTRICAS DE ÉXITO

| Funcionalidad | Esperado | Validado |
|---------------|----------|----------|
| Catálogos - Clientes | Carga datos de `evt_clientes` | ⬜ |
| Catálogos - Tipos Evento | Muestra contador de uso | ⬜ |
| Catálogos - Categorías Gastos | Carga de `evt_categorias_gastos` | ⬜ |
| Validación eliminación | Previene borrar items en uso | ⬜ |
| Búsqueda clientes | RFC, email, razón social | ⬜ |
| Dashboard Estados | Muestra métricas reales | ⬜ |
| Sin errores `pagado` | Console limpia | ⬜ |
| Cuentas bancarias | 5 cuentas visibles | ⬜ |

---

## 🔍 COMANDOS ÚTILES

### Verificar estructura de tablas en Supabase:
```sql
-- Ver columnas de evt_clientes
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'evt_clientes';

-- Ver columnas de evt_ingresos (verificar 'cobrado')
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'evt_ingresos';

-- Ver columnas de evt_categorias_gastos
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'evt_categorias_gastos';
```

### Verificar estados contables creados:
```sql
SELECT id, nombre, descripcion, color, orden, workflow_step
FROM evt_estados
WHERE id IN (9, 10, 11, 12)
ORDER BY id;
```

### Asignar eventos a estados contables (prueba):
```sql
-- Asignar primeros 10 eventos a "Cerrado"
UPDATE evt_eventos 
SET estado_id = 9 
WHERE id IN (SELECT id FROM evt_eventos LIMIT 10);

-- Asignar siguientes 10 a "Pagos Pendiente"
UPDATE evt_eventos 
SET estado_id = 10 
WHERE id IN (SELECT id FROM evt_eventos OFFSET 10 LIMIT 10);
```

---

## ✅ RESULTADO FINAL ESPERADO

Al completar esta validación:

1. ✅ **Módulo de Catálogos** completamente funcional
2. ✅ **Dashboard de Contabilidad** mostrando métricas reales
3. ✅ **Validación de eliminación** funcionando
4. ✅ **Búsqueda mejorada** operativa
5. ✅ **Sin errores en consola** relacionados con `pagado`
6. ✅ **4 estados contables** creados y utilizables

---

## 📝 NOTAS ADICIONALES

### Archivos Modificados:
- `src/modules/eventos/CatalogosPage.tsx` (15 edits)
- `src/services/accountingStateService.ts` (8 edits)

### Scripts Creados:
- `FIX_ESTADOS_CONTABLES.sql` (ejecutado ✅)
- `diagnostico-contabilidad.mjs` (herramienta de diagnóstico)
- `IMPLEMENTACION_CATALOGOS_CONTABILIDAD.md` (documentación)

### Base de Datos:
- **Estados creados**: 4 nuevos estados (IDs: 9, 10, 11, 12)
- **Tablas corregidas**: Código ahora usa nombres correctos
- **Columnas corregidas**: Todas las referencias usan `cobrado`

---

**Fecha de implementación**: 27 de octubre de 2025  
**Sistema**: Made ERP 777 V1  
**Estado**: ✅ Implementación completa - En validación
