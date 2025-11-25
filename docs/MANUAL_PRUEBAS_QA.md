# Manual de Pruebas QA - ERP 777

**Versión:** 1.0.0
**Fecha:** 24 de Noviembre de 2025
**Ambiente:** Desarrollo (localhost:5173)
**Base de Datos:** PostgreSQL 17.6 (Supabase)

---

## Tabla de Contenidos

1. [Introducción](#1-introducción)
2. [Prerrequisitos](#2-prerrequisitos)
3. [Pruebas de Escritorio (Smoke Test)](#3-pruebas-de-escritorio-smoke-test)
4. [Pruebas Funcionales por Módulo](#4-pruebas-funcionales-por-módulo)
5. [Pruebas de Integración](#5-pruebas-de-integración)
6. [Pruebas de Datos](#6-pruebas-de-datos)
7. [Checklist de Pruebas](#7-checklist-de-pruebas)
8. [Reporte de Defectos](#8-reporte-de-defectos)

---

## 1. Introducción

Este documento describe las pruebas manuales que el equipo de QA debe realizar para validar el correcto funcionamiento del sistema ERP 777.

### Datos de la Base de Datos Actual

| Concepto | Cantidad |
|----------|----------|
| Eventos | 144 |
| Gastos | 1,152 |
| Ingresos | 1,152 |
| Clientes | 6 |
| Usuarios | 3 |
| Estados de Evento | 12 |
| Tipos de Evento | 5 |

### Credenciales de Prueba

| Usuario | Email | Rol |
|---------|-------|-----|
| Admin | desarrollo@test.com | Super Admin |
| Ejecutivo | ejecutivo@madeevents.mx | Ejecutivo de Eventos |
| Viewer | viewer@madeevents.mx | Solo Lectura |

---

## 2. Prerrequisitos

### 2.1 Ambiente

- [ ] Servidor de desarrollo corriendo (`npm run dev`)
- [ ] Acceso a http://localhost:5173
- [ ] Conexión a base de datos Supabase activa
- [ ] Navegador Chrome/Firefox actualizado

### 2.2 Datos de Prueba Verificados

Ejecutar antes de las pruebas:

```bash
node scripts/generar_reporte_validacion.mjs
```

---

## 3. Pruebas de Escritorio (Smoke Test)

### ST-01: Carga de la Aplicación

| ID | Paso | Resultado Esperado | Pasa |
|----|------|-------------------|------|
| ST-01.1 | Navegar a http://localhost:5173 | La página carga sin errores | [ ] |
| ST-01.2 | Verificar consola del navegador (F12) | No hay errores JavaScript críticos | [ ] |
| ST-01.3 | Verificar que hay navegación visible | Menú/sidebar presente | [ ] |

### ST-02: Navegación Básica

| ID | Paso | Resultado Esperado | Pasa |
|----|------|-------------------|------|
| ST-02.1 | Ir a /eventos | La lista de eventos carga | [ ] |
| ST-02.2 | Verificar tabla de eventos | Hay filas con datos | [ ] |
| ST-02.3 | Hacer clic en un evento | Se abre detalle o modal | [ ] |

### ST-03: Conexión a Base de Datos

| ID | Paso | Resultado Esperado | Pasa |
|----|------|-------------------|------|
| ST-03.1 | En /eventos esperar 5 segundos | Los eventos cargan | [ ] |
| ST-03.2 | Verificar que hay más de 100 eventos | Hay datos de BD | [ ] |
| ST-03.3 | Buscar "EVT" en el buscador | Resultados filtrados aparecen | [ ] |

---

## 4. Pruebas Funcionales por Módulo

### 4.1 Módulo de Eventos

#### EVT-01: Lista de Eventos

| ID | Caso de Prueba | Pasos | Resultado Esperado | Pasa |
|----|---------------|-------|-------------------|------|
| EVT-01.1 | Ver lista completa | 1. Ir a /eventos | Tabla con eventos visible | [ ] |
| EVT-01.2 | Paginación | 1. Navegar entre páginas | Diferentes eventos se muestran | [ ] |
| EVT-01.3 | Buscar evento | 1. Escribir "EVT-2024" en buscador | Solo eventos 2024 aparecen | [ ] |
| EVT-01.4 | Filtrar por estado | 1. Seleccionar filtro de estado | Eventos filtrados correctamente | [ ] |
| EVT-01.5 | Filtrar por tipo | 1. Seleccionar filtro de tipo | Solo eventos del tipo aparecen | [ ] |

#### EVT-02: Detalle de Evento

| ID | Caso de Prueba | Pasos | Resultado Esperado | Pasa |
|----|---------------|-------|-------------------|------|
| EVT-02.1 | Abrir detalle | 1. Clic en un evento de la lista | Modal/página de detalle abre | [ ] |
| EVT-02.2 | Ver información general | 1. Verificar datos del encabezado | Clave, nombre, cliente visibles | [ ] |
| EVT-02.3 | Ver provisiones | 1. Ir a pestaña Provisiones | 4 categorías de provisión | [ ] |
| EVT-02.4 | Ver gastos | 1. Ir a pestaña Gastos | Lista de gastos del evento | [ ] |
| EVT-02.5 | Ver ingresos | 1. Ir a pestaña Ingresos | Lista de ingresos del evento | [ ] |

#### EVT-03: Crear Evento

| ID | Caso de Prueba | Pasos | Resultado Esperado | Pasa |
|----|---------------|-------|-------------------|------|
| EVT-03.1 | Abrir formulario | 1. Clic en "Nuevo Evento" | Formulario se abre | [ ] |
| EVT-03.2 | Validación campos requeridos | 1. Intentar guardar vacío | Mensajes de error aparecen | [ ] |
| EVT-03.3 | Crear evento válido | 1. Llenar todos los campos<br>2. Guardar | Evento creado exitosamente | [ ] |
| EVT-03.4 | Verificar evento creado | 1. Buscar evento recién creado | Aparece en la lista | [ ] |

#### EVT-04: Editar Evento

| ID | Caso de Prueba | Pasos | Resultado Esperado | Pasa |
|----|---------------|-------|-------------------|------|
| EVT-04.1 | Abrir edición | 1. Abrir evento<br>2. Clic en Editar | Formulario de edición | [ ] |
| EVT-04.2 | Modificar datos | 1. Cambiar nombre del proyecto | Campo se actualiza | [ ] |
| EVT-04.3 | Guardar cambios | 1. Guardar | Cambios guardados | [ ] |
| EVT-04.4 | Verificar cambios | 1. Cerrar y reabrir | Cambios persisten | [ ] |

### 4.2 Módulo de Gastos

#### GAS-01: Lista de Gastos

| ID | Caso de Prueba | Pasos | Resultado Esperado | Pasa |
|----|---------------|-------|-------------------|------|
| GAS-01.1 | Ver gastos de evento | 1. Abrir evento<br>2. Ir a Gastos | Lista de gastos visible | [ ] |
| GAS-01.2 | Ver total de gastos | 1. Verificar total | Suma correcta | [ ] |
| GAS-01.3 | Filtrar por categoría | 1. Filtrar por "RH" | Solo gastos RH | [ ] |

#### GAS-02: Crear Gasto

| ID | Caso de Prueba | Pasos | Resultado Esperado | Pasa |
|----|---------------|-------|-------------------|------|
| GAS-02.1 | Abrir formulario | 1. Clic en "Agregar Gasto" | Formulario se abre | [ ] |
| GAS-02.2 | Validación | 1. Intentar guardar vacío | Errores de validación | [ ] |
| GAS-02.3 | Crear gasto válido | 1. Llenar formulario<br>2. Guardar | Gasto creado | [ ] |
| GAS-02.4 | Verificar total actualizado | 1. Ver total de gastos | Total aumentó | [ ] |

### 4.3 Módulo de Ingresos

#### ING-01: Lista de Ingresos

| ID | Caso de Prueba | Pasos | Resultado Esperado | Pasa |
|----|---------------|-------|-------------------|------|
| ING-01.1 | Ver ingresos de evento | 1. Abrir evento<br>2. Ir a Ingresos | Lista de ingresos visible | [ ] |
| ING-01.2 | Ver total de ingresos | 1. Verificar total | Suma correcta | [ ] |
| ING-01.3 | Ver estado de facturación | 1. Verificar columna "Facturado" | Estados visibles | [ ] |

#### ING-02: Crear Ingreso

| ID | Caso de Prueba | Pasos | Resultado Esperado | Pasa |
|----|---------------|-------|-------------------|------|
| ING-02.1 | Abrir formulario | 1. Clic en "Agregar Ingreso" | Formulario se abre | [ ] |
| ING-02.2 | Crear ingreso | 1. Llenar formulario<br>2. Guardar | Ingreso creado | [ ] |
| ING-02.3 | Marcar como facturado | 1. Editar ingreso<br>2. Marcar facturado | Estado cambia | [ ] |
| ING-02.4 | Marcar como cobrado | 1. Editar ingreso<br>2. Marcar cobrado | Estado cambia | [ ] |

### 4.4 Módulo de Provisiones

#### PROV-01: Ver Provisiones

| ID | Caso de Prueba | Pasos | Resultado Esperado | Pasa |
|----|---------------|-------|-------------------|------|
| PROV-01.1 | Ver 4 categorías | 1. Abrir evento<br>2. Ir a Provisiones | RH, Materiales, Combustible, SPs | [ ] |
| PROV-01.2 | Ver montos | 1. Verificar montos por categoría | Montos visibles | [ ] |
| PROV-01.3 | Ver total | 1. Verificar suma total | Total = suma de categorías | [ ] |
| PROV-01.4 | Ver porcentaje ejecutado | 1. Verificar barra de progreso | Porcentaje correcto | [ ] |

#### PROV-02: Editar Provisiones

| ID | Caso de Prueba | Pasos | Resultado Esperado | Pasa |
|----|---------------|-------|-------------------|------|
| PROV-02.1 | Modificar provisión | 1. Editar monto de una categoría | Monto cambia | [ ] |
| PROV-02.2 | Guardar cambios | 1. Guardar | Cambios guardados | [ ] |
| PROV-02.3 | Verificar recálculo | 1. Verificar total | Total actualizado | [ ] |

---

## 5. Pruebas de Integración

### INT-01: Flujo Completo de Evento

| Paso | Acción | Verificación | Pasa |
|------|--------|--------------|------|
| 1 | Crear nuevo evento con provisiones | Evento creado | [ ] |
| 2 | Agregar 3 gastos al evento | Gastos visibles, total correcto | [ ] |
| 3 | Agregar 2 ingresos al evento | Ingresos visibles, total correcto | [ ] |
| 4 | Verificar utilidad calculada | Utilidad = Ingresos - Gastos | [ ] |
| 5 | Verificar margen | Margen = Utilidad / Ingresos * 100 | [ ] |
| 6 | Cambiar estado a "Facturado" | Estado cambia | [ ] |
| 7 | Cambiar estado a "Pagado" | Estado cambia | [ ] |

### INT-02: Validación de Presupuesto

| Paso | Acción | Verificación | Pasa |
|------|--------|--------------|------|
| 1 | Crear evento con provisión de $10,000 | Evento creado | [ ] |
| 2 | Agregar gasto de $5,000 | Gasto agregado, dentro de límite | [ ] |
| 3 | Agregar gasto de $7,000 | Alerta de presupuesto excedido | [ ] |

---

## 6. Pruebas de Datos

### DAT-01: Validación de Datos Existentes

| ID | Verificación | Criterio | Pasa |
|----|-------------|----------|------|
| DAT-01.1 | Total eventos | = 144 | [ ] |
| DAT-01.2 | Total gastos | = 1,152 | [ ] |
| DAT-01.3 | Total ingresos | = 1,152 | [ ] |
| DAT-01.4 | Clientes activos | = 6 | [ ] |
| DAT-01.5 | Estados de evento | = 12 | [ ] |
| DAT-01.6 | Tipos de evento | = 5 | [ ] |

### DAT-02: Integridad Referencial

| ID | Verificación | Criterio | Pasa |
|----|-------------|----------|------|
| DAT-02.1 | Gastos con evento válido | Todos los gastos tienen evento_id válido | [ ] |
| DAT-02.2 | Ingresos con evento válido | Todos los ingresos tienen evento_id válido | [ ] |
| DAT-02.3 | Eventos con cliente válido | Todos los eventos tienen cliente_id válido | [ ] |
| DAT-02.4 | Eventos con estado válido | Todos los eventos tienen estado_id válido | [ ] |

### DAT-03: Cálculos Financieros

| ID | Verificación | Criterio | Pasa |
|----|-------------|----------|------|
| DAT-03.1 | Total ingresos BD | ~$19,746,981.80 | [ ] |
| DAT-03.2 | Total gastos BD | ~$12,463,193.51 | [ ] |
| DAT-03.3 | Utilidad bruta | ~$7,283,788.29 | [ ] |
| DAT-03.4 | Margen promedio | ~36.89% | [ ] |

---

## 7. Checklist de Pruebas

### Pre-Pruebas

- [ ] Ambiente de desarrollo disponible
- [ ] Base de datos con datos de prueba
- [ ] Credenciales de acceso confirmadas
- [ ] Navegador limpio (sin caché)

### Durante Pruebas

- [ ] Capturar screenshots de errores
- [ ] Documentar pasos para reproducir defectos
- [ ] Anotar tiempos de respuesta anormales
- [ ] Verificar mensajes de error claros

### Post-Pruebas

- [ ] Completar reporte de defectos
- [ ] Clasificar severidad de defectos
- [ ] Verificar que datos de prueba no afecten producción
- [ ] Documentar hallazgos

---

## 8. Reporte de Defectos

### Formato de Reporte

```
ID: DEF-YYYY-MM-DD-###
Severidad: [Crítico|Alto|Medio|Bajo]
Módulo: [Eventos|Gastos|Ingresos|Provisiones|General]
Caso de Prueba: [ID del caso]

Descripción:
[Descripción clara del defecto]

Pasos para Reproducir:
1. [Paso 1]
2. [Paso 2]
3. [...]

Resultado Esperado:
[Lo que debería pasar]

Resultado Actual:
[Lo que pasó]

Evidencia:
[Screenshot o video]

Ambiente:
- Navegador: [Chrome/Firefox version]
- Fecha: [fecha]
- Usuario: [usuario de prueba]
```

### Clasificación de Severidad

| Severidad | Descripción |
|-----------|-------------|
| Crítico | Sistema no funciona, pérdida de datos |
| Alto | Funcionalidad principal no funciona |
| Medio | Funcionalidad secundaria afectada |
| Bajo | Problema cosmético o menor |

---

## Anexo A: Comandos Útiles

```bash
# Iniciar servidor de desarrollo
npm run dev

# Ejecutar pruebas Cypress (consola)
npm run cypress:run

# Ejecutar pruebas Cypress (interfaz)
npm run cypress:open

# Generar reporte de validación de datos
node scripts/generar_reporte_validacion.mjs

# Analizar base de datos
node scripts/analizar-db.mjs

# Hacer respaldo de BD
node scripts/backup-completo.mjs
```

---

**Documento preparado para el equipo de QA**
**ERP 777 - Sistema de Gestión de Eventos**
