# DOCUMENTO DE PRUEBAS MANUALES QA - ERP 777 V02

## Sistema de Gestion de Eventos y Modulos ERP

**Fecha de generacion:** 2025-11-25
**Version del sistema:** ERP-777-V02
**Autor:** Claude Code

---

## INDICE

1. [Informacion General](#informacion-general)
2. [Preparacion del Ambiente](#preparacion-del-ambiente)
3. [Modulo Eventos](#modulo-eventos)
4. [Modulo Contabilidad](#modulo-contabilidad)
5. [Modulo Facturacion](#modulo-facturacion)
6. [Modulo Inventario](#modulo-inventario)
7. [Modulo Proveedores](#modulo-proveedores)
8. [Modulo Proyectos](#modulo-proyectos)
9. [Modulo RRHH](#modulo-rrhh)
10. [Modulo Tesoreria](#modulo-tesoreria)
11. [Modulo CRM](#modulo-crm)
12. [Pruebas de Integracion](#pruebas-de-integracion)
13. [Checklist Final](#checklist-final)

---

## INFORMACION GENERAL

### Objetivo
Este documento proporciona una guia completa para realizar pruebas manuales de calidad (QA) del sistema ERP-777-V02. Las pruebas deben verificar la funcionalidad, usabilidad e integridad de datos de todos los modulos.

### Requisitos Previos
- Navegador Chrome o Firefox actualizado
- Acceso a la URL del sistema: `http://localhost:5174`
- Credenciales de prueba (si aplica)
- Este documento impreso o en pantalla secundaria

### Criterios de Aceptacion
- [ ] Todas las pantallas cargan sin errores
- [ ] Los formularios validan datos correctamente
- [ ] Los datos se guardan y recuperan correctamente
- [ ] La navegacion es intuitiva
- [ ] Los mensajes de error son claros

---

## PREPARACION DEL AMBIENTE

### Datos de Prueba
Ejecutar antes de las pruebas:
```bash
npm run limpiar:eventos
```

Esto creara 3 eventos de prueba:
1. **Evento Completado y Pagado** - Todos los ingresos y gastos pagados
2. **Evento con Ingresos Pendientes** - Gastos pagados, ingresos por cobrar
3. **Evento con Todo Pendiente** - Ingresos y gastos por procesar

---

## MODULO EVENTOS

### E-001: Dashboard de Eventos
**Ruta:** `/` (pagina principal)

| Paso | Accion | Resultado Esperado | OK? |
|------|--------|-------------------|-----|
| 1 | Abrir la aplicacion | Dashboard carga en menos de 3 segundos | [ ] |
| 2 | Verificar tarjetas de metricas | Se muestran: Total eventos, Ingresos, Gastos, Utilidad | [ ] |
| 3 | Verificar grafico de eventos | Se muestra grafico con datos del mes | [ ] |
| 4 | Verificar lista de proximos eventos | Se muestra tabla o lista de eventos | [ ] |

### E-002: Lista de Eventos
**Ruta:** `/eventos`

| Paso | Accion | Resultado Esperado | OK? |
|------|--------|-------------------|-----|
| 1 | Navegar a Eventos | Se muestra lista de eventos | [ ] |
| 2 | Buscar evento por nombre | El filtro funciona correctamente | [ ] |
| 3 | Filtrar por estado | Solo se muestran eventos del estado seleccionado | [ ] |
| 4 | Ordenar por fecha | Los eventos se ordenan correctamente | [ ] |
| 5 | Click en evento | Se abre detalle del evento | [ ] |

### E-003: Crear Nuevo Evento
**Ruta:** `/eventos` > Boton "Nuevo Evento"

| Paso | Accion | Resultado Esperado | OK? |
|------|--------|-------------------|-----|
| 1 | Click en "Nuevo Evento" | Se abre modal/formulario | [ ] |
| 2 | Dejar campos vacios y guardar | Se muestran errores de validacion | [ ] |
| 3 | Llenar nombre del proyecto | Campo acepta texto | [ ] |
| 4 | Seleccionar cliente | Dropdown muestra clientes disponibles | [ ] |
| 5 | Seleccionar tipo de evento | Dropdown muestra tipos disponibles | [ ] |
| 6 | Seleccionar fecha | Calendario funciona correctamente | [ ] |
| 7 | Ingresar presupuesto | Solo acepta numeros | [ ] |
| 8 | Guardar evento | Mensaje de exito, evento aparece en lista | [ ] |

### E-004: Gestion de Ingresos
**Ruta:** Detalle de evento > Tab Ingresos

| Paso | Accion | Resultado Esperado | OK? |
|------|--------|-------------------|-----|
| 1 | Abrir evento de prueba | Se muestra detalle con tabs | [ ] |
| 2 | Ir a tab "Ingresos" | Se muestra lista de ingresos | [ ] |
| 3 | Click "Agregar Ingreso" | Se abre formulario | [ ] |
| 4 | Llenar datos del ingreso | Campos funcionan correctamente | [ ] |
| 5 | Guardar ingreso | Ingreso aparece en lista | [ ] |
| 6 | Marcar como pagado | Estado cambia a "Pagado" | [ ] |
| 7 | Eliminar ingreso | Confirmacion y eliminacion exitosa | [ ] |

### E-005: Gestion de Gastos
**Ruta:** Detalle de evento > Tab Gastos

| Paso | Accion | Resultado Esperado | OK? |
|------|--------|-------------------|-----|
| 1 | Ir a tab "Gastos" | Se muestra lista de gastos | [ ] |
| 2 | Click "Agregar Gasto" | Se abre formulario | [ ] |
| 3 | Llenar datos del gasto | Campos funcionan correctamente | [ ] |
| 4 | Guardar gasto | Gasto aparece en lista | [ ] |
| 5 | Marcar como pagado | Estado cambia a "Pagado" | [ ] |
| 6 | Eliminar gasto | Confirmacion y eliminacion exitosa | [ ] |

### E-006: Resumen Financiero
**Ruta:** Detalle de evento > Tab Resumen

| Paso | Accion | Resultado Esperado | OK? |
|------|--------|-------------------|-----|
| 1 | Ir a tab "Resumen" | Se muestra resumen financiero | [ ] |
| 2 | Verificar totales de ingresos | Suma correcta de ingresos | [ ] |
| 3 | Verificar totales de gastos | Suma correcta de gastos | [ ] |
| 4 | Verificar utilidad | Calculo correcto (Ingresos - Gastos) | [ ] |
| 5 | Verificar porcentajes pagado/pendiente | Calculos correctos | [ ] |

---

## MODULO CONTABILIDAD

### C-001: Dashboard Contabilidad
**Ruta:** `/contabilidad`

| Paso | Accion | Resultado Esperado | OK? |
|------|--------|-------------------|-----|
| 1 | Navegar a Contabilidad | Dashboard carga correctamente | [ ] |
| 2 | Verificar metricas | Se muestran indicadores financieros | [ ] |
| 3 | Verificar graficos | Se muestran graficos de balance | [ ] |

### C-002: Plan de Cuentas
**Ruta:** `/contabilidad/plan-cuentas`

| Paso | Accion | Resultado Esperado | OK? |
|------|--------|-------------------|-----|
| 1 | Ver plan de cuentas | Se muestra arbol de cuentas | [ ] |
| 2 | Buscar cuenta | Filtro funciona correctamente | [ ] |
| 3 | Ver detalle de cuenta | Se muestra informacion completa | [ ] |

### C-003: Polizas Contables
**Ruta:** `/contabilidad/polizas`

| Paso | Accion | Resultado Esperado | OK? |
|------|--------|-------------------|-----|
| 1 | Ver lista de polizas | Se muestra lista ordenada | [ ] |
| 2 | Crear nueva poliza | Formulario funciona | [ ] |
| 3 | Agregar movimientos | Cargos y abonos funcionan | [ ] |
| 4 | Verificar cuadre | Debe cuadrar para guardar | [ ] |
| 5 | Guardar poliza | Mensaje de exito | [ ] |

---

## MODULO FACTURACION

### F-001: Dashboard Facturacion
**Ruta:** `/facturacion`

| Paso | Accion | Resultado Esperado | OK? |
|------|--------|-------------------|-----|
| 1 | Navegar a Facturacion | Dashboard carga correctamente | [ ] |
| 2 | Ver estadisticas | Se muestran totales facturados | [ ] |

### F-002: Lista de Facturas
**Ruta:** `/facturacion/facturas`

| Paso | Accion | Resultado Esperado | OK? |
|------|--------|-------------------|-----|
| 1 | Ver lista de facturas | Se muestra lista ordenada | [ ] |
| 2 | Filtrar por estado | Filtro funciona | [ ] |
| 3 | Buscar por RFC | Busqueda funciona | [ ] |

### F-003: Crear Factura
**Ruta:** `/facturacion/facturas` > Nueva

| Paso | Accion | Resultado Esperado | OK? |
|------|--------|-------------------|-----|
| 1 | Click en "Nueva Factura" | Formulario se abre | [ ] |
| 2 | Seleccionar cliente | RFC se autocompleta | [ ] |
| 3 | Agregar conceptos | Lineas se agregan correctamente | [ ] |
| 4 | Verificar calculos | Subtotal, IVA, Total correctos | [ ] |
| 5 | Guardar factura | Factura guardada exitosamente | [ ] |

---

## MODULO INVENTARIO

### I-001: Dashboard Inventario
**Ruta:** `/inventario`

| Paso | Accion | Resultado Esperado | OK? |
|------|--------|-------------------|-----|
| 1 | Navegar a Inventario | Dashboard carga correctamente | [ ] |
| 2 | Ver alertas de stock bajo | Se muestran productos con stock minimo | [ ] |
| 3 | Ver resumen de almacenes | Se muestran totales por almacen | [ ] |

### I-002: Gestion de Productos
**Ruta:** `/inventario/productos`

| Paso | Accion | Resultado Esperado | OK? |
|------|--------|-------------------|-----|
| 1 | Ver lista de productos | Lista carga correctamente | [ ] |
| 2 | Crear nuevo producto | Formulario funciona | [ ] |
| 3 | Buscar producto | Busqueda funciona | [ ] |
| 4 | Editar producto | Cambios se guardan | [ ] |
| 5 | Ver stock por almacen | Se muestra desglose | [ ] |

### I-003: Almacenes
**Ruta:** `/inventario/almacenes`

| Paso | Accion | Resultado Esperado | OK? |
|------|--------|-------------------|-----|
| 1 | Ver lista de almacenes | Lista carga correctamente | [ ] |
| 2 | Crear almacen | Formulario funciona | [ ] |
| 3 | Ver productos en almacen | Lista de stock se muestra | [ ] |

### I-004: Movimientos
**Ruta:** `/inventario/movimientos`

| Paso | Accion | Resultado Esperado | OK? |
|------|--------|-------------------|-----|
| 1 | Ver historial de movimientos | Lista ordenada por fecha | [ ] |
| 2 | Crear entrada de mercancia | Stock aumenta | [ ] |
| 3 | Crear salida de mercancia | Stock disminuye | [ ] |
| 4 | Crear transferencia | Stock se mueve entre almacenes | [ ] |

---

## MODULO PROVEEDORES

### P-001: Dashboard Proveedores
**Ruta:** `/proveedores`

| Paso | Accion | Resultado Esperado | OK? |
|------|--------|-------------------|-----|
| 1 | Navegar a Proveedores | Dashboard carga correctamente | [ ] |
| 2 | Ver metricas | Total proveedores, ordenes pendientes | [ ] |

### P-002: Catalogo de Proveedores
**Ruta:** `/proveedores/catalogo`

| Paso | Accion | Resultado Esperado | OK? |
|------|--------|-------------------|-----|
| 1 | Ver lista de proveedores | Lista carga correctamente | [ ] |
| 2 | Crear proveedor | Formulario funciona | [ ] |
| 3 | Validar RFC | Solo acepta formato valido | [ ] |
| 4 | Editar proveedor | Cambios se guardan | [ ] |
| 5 | Desactivar proveedor | Estado cambia a inactivo | [ ] |

### P-003: Ordenes de Compra
**Ruta:** `/proveedores/ordenes`

| Paso | Accion | Resultado Esperado | OK? |
|------|--------|-------------------|-----|
| 1 | Ver ordenes de compra | Lista ordenada por fecha | [ ] |
| 2 | Crear nueva orden | Formulario funciona | [ ] |
| 3 | Seleccionar proveedor | Dropdown funciona | [ ] |
| 4 | Agregar productos | Lineas se agregan | [ ] |
| 5 | Guardar orden | Orden guardada exitosamente | [ ] |

---

## MODULO PROYECTOS

### PJ-001: Dashboard Proyectos
**Ruta:** `/proyectos`

| Paso | Accion | Resultado Esperado | OK? |
|------|--------|-------------------|-----|
| 1 | Navegar a Proyectos | Dashboard carga correctamente | [ ] |
| 2 | Ver proyectos activos | Lista de proyectos en curso | [ ] |
| 3 | Ver calendario/timeline | Visualizacion correcta | [ ] |

### PJ-002: Gestion de Proyectos
**Ruta:** `/proyectos/lista`

| Paso | Accion | Resultado Esperado | OK? |
|------|--------|-------------------|-----|
| 1 | Ver lista de proyectos | Lista carga correctamente | [ ] |
| 2 | Crear proyecto | Formulario funciona | [ ] |
| 3 | Asignar fechas | Calendario funciona | [ ] |
| 4 | Editar proyecto | Cambios se guardan | [ ] |

### PJ-003: Tareas
**Ruta:** `/proyectos/tareas`

| Paso | Accion | Resultado Esperado | OK? |
|------|--------|-------------------|-----|
| 1 | Ver tablero Kanban | Columnas se muestran | [ ] |
| 2 | Crear tarea | Tarea se crea | [ ] |
| 3 | Mover tarea (drag & drop) | Tarea cambia de columna | [ ] |
| 4 | Asignar responsable | Asignacion funciona | [ ] |

---

## MODULO RRHH

### RH-001: Dashboard RRHH
**Ruta:** `/rrhh`

| Paso | Accion | Resultado Esperado | OK? |
|------|--------|-------------------|-----|
| 1 | Navegar a RRHH | Dashboard carga correctamente | [ ] |
| 2 | Ver total empleados | Metrica correcta | [ ] |

### RH-002: Empleados
**Ruta:** `/rrhh/empleados`

| Paso | Accion | Resultado Esperado | OK? |
|------|--------|-------------------|-----|
| 1 | Ver lista de empleados | Lista carga correctamente | [ ] |
| 2 | Crear empleado | Formulario funciona | [ ] |
| 3 | Validar campos requeridos | Validaciones funcionan | [ ] |
| 4 | Asignar departamento | Dropdown funciona | [ ] |
| 5 | Editar empleado | Cambios se guardan | [ ] |

### RH-003: Nomina
**Ruta:** `/rrhh/nomina`

| Paso | Accion | Resultado Esperado | OK? |
|------|--------|-------------------|-----|
| 1 | Ver nominas | Lista de periodos | [ ] |
| 2 | Crear periodo de nomina | Formulario funciona | [ ] |
| 3 | Ver detalle de nomina | Desglose por empleado | [ ] |
| 4 | Calcular nomina | Calculos correctos | [ ] |

---

## MODULO TESORERIA

### T-001: Dashboard Tesoreria
**Ruta:** `/tesoreria`

| Paso | Accion | Resultado Esperado | OK? |
|------|--------|-------------------|-----|
| 1 | Navegar a Tesoreria | Dashboard carga correctamente | [ ] |
| 2 | Ver saldo total | Suma de cuentas | [ ] |
| 3 | Ver flujo de caja | Grafico de movimientos | [ ] |

### T-002: Cuentas Bancarias
**Ruta:** `/tesoreria/cuentas`

| Paso | Accion | Resultado Esperado | OK? |
|------|--------|-------------------|-----|
| 1 | Ver cuentas bancarias | Lista carga correctamente | [ ] |
| 2 | Crear cuenta | Formulario funciona | [ ] |
| 3 | Validar CLABE (18 digitos) | Validacion funciona | [ ] |
| 4 | Ver saldo de cuenta | Saldo calculado correctamente | [ ] |

### T-003: Movimientos Bancarios
**Ruta:** `/tesoreria/movimientos`

| Paso | Accion | Resultado Esperado | OK? |
|------|--------|-------------------|-----|
| 1 | Ver movimientos | Lista ordenada por fecha | [ ] |
| 2 | Registrar ingreso | Saldo aumenta | [ ] |
| 3 | Registrar egreso | Saldo disminuye | [ ] |
| 4 | Transferir entre cuentas | Movimiento correcto | [ ] |

---

## MODULO CRM

### CRM-001: Dashboard CRM
**Ruta:** `/crm`

| Paso | Accion | Resultado Esperado | OK? |
|------|--------|-------------------|-----|
| 1 | Navegar a CRM | Dashboard carga correctamente | [ ] |
| 2 | Ver oportunidades activas | Metricas correctas | [ ] |

### CRM-002: Clientes
**Ruta:** `/crm/clientes`

| Paso | Accion | Resultado Esperado | OK? |
|------|--------|-------------------|-----|
| 1 | Ver lista de clientes | Lista carga correctamente | [ ] |
| 2 | Crear cliente | Formulario funciona | [ ] |
| 3 | Validar RFC | Formato correcto | [ ] |
| 4 | Buscar cliente | Busqueda funciona | [ ] |

### CRM-003: Pipeline
**Ruta:** `/crm/pipeline`

| Paso | Accion | Resultado Esperado | OK? |
|------|--------|-------------------|-----|
| 1 | Ver pipeline | Etapas se muestran | [ ] |
| 2 | Crear oportunidad | Formulario funciona | [ ] |
| 3 | Mover oportunidad | Cambio de etapa funciona | [ ] |

### CRM-004: Cotizaciones
**Ruta:** `/crm/cotizaciones`

| Paso | Accion | Resultado Esperado | OK? |
|------|--------|-------------------|-----|
| 1 | Ver cotizaciones | Lista carga correctamente | [ ] |
| 2 | Crear cotizacion | Formulario funciona | [ ] |
| 3 | Agregar lineas | Productos se agregan | [ ] |
| 4 | Calcular totales | Calculos correctos | [ ] |
| 5 | Exportar PDF | PDF se genera | [ ] |

---

## PRUEBAS DE INTEGRACION

### INT-001: Evento a Factura
| Paso | Accion | Resultado Esperado | OK? |
|------|--------|-------------------|-----|
| 1 | Crear evento con ingresos | Evento creado | [ ] |
| 2 | Generar factura desde ingreso | Factura se genera | [ ] |
| 3 | Verificar datos en factura | Datos correctos | [ ] |

### INT-002: Proveedor a Inventario
| Paso | Accion | Resultado Esperado | OK? |
|------|--------|-------------------|-----|
| 1 | Crear orden de compra | Orden creada | [ ] |
| 2 | Recibir mercancia | Stock aumenta | [ ] |
| 3 | Verificar movimiento | Historial correcto | [ ] |

### INT-003: CRM a Evento
| Paso | Accion | Resultado Esperado | OK? |
|------|--------|-------------------|-----|
| 1 | Crear cotizacion | Cotizacion creada | [ ] |
| 2 | Convertir a evento | Evento se genera | [ ] |
| 3 | Verificar datos | Datos correctos | [ ] |

---

## CHECKLIST FINAL

### Navegacion General
- [ ] Todas las rutas funcionan (sin errores 404)
- [ ] Menu lateral funciona correctamente
- [ ] Breadcrumbs muestran ubicacion correcta
- [ ] Boton "Atras" funciona

### Usabilidad
- [ ] Formularios tienen validaciones claras
- [ ] Mensajes de exito se muestran correctamente
- [ ] Mensajes de error son comprensibles
- [ ] Tiempos de carga aceptables (< 3 segundos)

### Datos
- [ ] Los datos se guardan correctamente
- [ ] Los datos se recuperan correctamente
- [ ] Los filtros funcionan
- [ ] La busqueda funciona
- [ ] Las eliminaciones piden confirmacion

### Responsividad
- [ ] Funciona en pantalla 1920x1080
- [ ] Funciona en pantalla 1366x768
- [ ] Menu se colapsa correctamente

---

## NOTAS Y OBSERVACIONES

### Bugs Encontrados
| ID | Modulo | Descripcion | Severidad | Estado |
|----|--------|-------------|-----------|--------|
| | | | | |
| | | | | |
| | | | | |

### Mejoras Sugeridas
| ID | Modulo | Descripcion | Prioridad |
|----|--------|-------------|-----------|
| | | | |
| | | | |
| | | | |

---

## FIRMA DE APROBACION

**Tester:** _______________________

**Fecha:** _______________________

**Resultado General:** [ ] APROBADO  [ ] RECHAZADO

**Observaciones:**
_______________________________________________________________
_______________________________________________________________
_______________________________________________________________
