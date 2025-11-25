# Manual de Pruebas de Calidad - Sistema ERP

**Versión:** 1.0
**Fecha:** 2025-11-23
**Preparado por:** Equipo de Desarrollo

---

## Tabla de Contenidos

1. [Información General](#información-general)
2. [Prerrequisitos](#prerrequisitos)
3. [Módulos a Probar](#módulos-a-probar)
4. [Casos de Prueba por Módulo](#casos-de-prueba-por-módulo)
5. [Pruebas de Integración](#pruebas-de-integración)
6. [Pruebas de Rendimiento](#pruebas-de-rendimiento)
7. [Checklist de Regresión](#checklist-de-regresión)
8. [Reporte de Defectos](#reporte-de-defectos)

---

## Información General

### Objetivo
Verificar la funcionalidad, usabilidad y estabilidad de todos los módulos del Sistema ERP antes de su liberación a producción.

### Alcance
- 12 módulos ERP
- Pruebas funcionales
- Pruebas de integración
- Pruebas de UI/UX
- Pruebas de rendimiento básicas

### Ambiente de Pruebas
- **URL:** http://localhost:5173 (desarrollo) / URL de staging
- **Navegadores:** Chrome (v120+), Firefox (v120+), Edge (v120+)
- **Resoluciones:** 1920x1080, 1366x768, 768x1024 (tablet)

---

## Prerrequisitos

### Credenciales de Prueba
```
Usuario Admin: admin@test.com
Contraseña: [Solicitar al equipo]

Usuario Operador: operador@test.com
Contraseña: [Solicitar al equipo]
```

### Datos de Prueba Necesarios
- [ ] Al menos 1 cliente creado
- [ ] Al menos 1 evento activo
- [ ] Al menos 1 producto en inventario
- [ ] Al menos 1 proveedor registrado
- [ ] Al menos 1 empleado en RRHH
- [ ] Al menos 1 cuenta bancaria en Tesorería

---

## Módulos a Probar

| # | Módulo | Ruta | Prioridad |
|---|--------|------|-----------|
| 1 | Eventos ERP | /eventos-erp | Alta |
| 2 | Contabilidad ERP | /contabilidad-erp | Alta |
| 3 | Facturación ERP | /facturacion-erp | Alta |
| 4 | Inventario ERP | /inventario-erp | Alta |
| 5 | Proveedores ERP | /proveedores-erp | Media |
| 6 | Proyectos ERP | /proyectos-erp | Media |
| 7 | RRHH ERP | /rrhh-erp | Media |
| 8 | Tesorería ERP | /tesoreria-erp | Alta |
| 9 | Reportes ERP | /reportes-erp | Media |
| 10 | CRM/Cotizaciones | /cotizaciones-erp | Media |
| 11 | IA ERP | /ia-erp | Baja |
| 12 | Integraciones | /integraciones-erp | Baja |

---

## Casos de Prueba por Módulo

### 1. MÓDULO EVENTOS ERP

#### CP-EVT-001: Visualizar Dashboard de Eventos
| Campo | Valor |
|-------|-------|
| **Objetivo** | Verificar que el dashboard carga correctamente |
| **Precondiciones** | Usuario autenticado |
| **Pasos** | 1. Navegar a /eventos-erp<br>2. Esperar carga de página<br>3. Verificar métricas visibles |
| **Resultado Esperado** | Dashboard muestra métricas: total eventos, por cobrar, utilidad |
| **Estado** | [ ] Pasó [ ] Falló [ ] Bloqueado |
| **Observaciones** | |

#### CP-EVT-002: Crear Nuevo Evento
| Campo | Valor |
|-------|-------|
| **Objetivo** | Verificar creación de evento |
| **Precondiciones** | Al menos 1 cliente existe |
| **Pasos** | 1. Click en "Nuevo Evento"<br>2. Seleccionar cliente<br>3. Completar nombre del proyecto<br>4. Seleccionar fecha<br>5. Guardar |
| **Resultado Esperado** | Evento creado con clave automática, aparece en lista |
| **Estado** | [ ] Pasó [ ] Falló [ ] Bloqueado |
| **Observaciones** | |

#### CP-EVT-003: Registrar Ingreso en Evento
| Campo | Valor |
|-------|-------|
| **Objetivo** | Verificar registro de ingresos |
| **Precondiciones** | Evento existente |
| **Pasos** | 1. Abrir detalle de evento<br>2. Ir a pestaña Ingresos<br>3. Click "Agregar Ingreso"<br>4. Completar concepto y monto<br>5. Guardar |
| **Resultado Esperado** | Ingreso registrado, totales actualizados |
| **Estado** | [ ] Pasó [ ] Falló [ ] Bloqueado |
| **Observaciones** | |

#### CP-EVT-004: Registrar Gasto en Evento
| Campo | Valor |
|-------|-------|
| **Objetivo** | Verificar registro de gastos |
| **Precondiciones** | Evento existente |
| **Pasos** | 1. Abrir detalle de evento<br>2. Ir a pestaña Gastos<br>3. Click "Agregar Gasto"<br>4. Seleccionar categoría<br>5. Completar monto y proveedor<br>6. Guardar |
| **Resultado Esperado** | Gasto registrado, utilidad recalculada |
| **Estado** | [ ] Pasó [ ] Falló [ ] Bloqueado |
| **Observaciones** | |

#### CP-EVT-005: Cambiar Estado de Evento
| Campo | Valor |
|-------|-------|
| **Objetivo** | Verificar transiciones de estado |
| **Precondiciones** | Evento en estado "Cotización" |
| **Pasos** | 1. Abrir evento<br>2. Cambiar estado a "En Proceso"<br>3. Confirmar cambio |
| **Resultado Esperado** | Estado actualizado, historial registrado |
| **Estado** | [ ] Pasó [ ] Falló [ ] Bloqueado |
| **Observaciones** | |

---

### 2. MÓDULO CONTABILIDAD ERP

#### CP-CON-001: Visualizar Plan de Cuentas
| Campo | Valor |
|-------|-------|
| **Objetivo** | Verificar carga del catálogo de cuentas |
| **Precondiciones** | Usuario autenticado |
| **Pasos** | 1. Navegar a /contabilidad-erp<br>2. Click en "Plan de Cuentas"<br>3. Verificar árbol de cuentas |
| **Resultado Esperado** | Cuentas organizadas por tipo (Activo, Pasivo, Capital, etc.) |
| **Estado** | [ ] Pasó [ ] Falló [ ] Bloqueado |
| **Observaciones** | |

#### CP-CON-002: Crear Póliza Contable
| Campo | Valor |
|-------|-------|
| **Objetivo** | Verificar creación de póliza balanceada |
| **Precondiciones** | Plan de cuentas configurado |
| **Pasos** | 1. Click "Nueva Póliza"<br>2. Seleccionar tipo (Ingreso/Egreso/Diario)<br>3. Agregar movimientos debe/haber<br>4. Verificar balance<br>5. Guardar |
| **Resultado Esperado** | Póliza guardada solo si Debe = Haber |
| **Estado** | [ ] Pasó [ ] Falló [ ] Bloqueado |
| **Observaciones** | |

#### CP-CON-003: Generar Libro Diario
| Campo | Valor |
|-------|-------|
| **Objetivo** | Verificar reporte de libro diario |
| **Precondiciones** | Pólizas existentes en el período |
| **Pasos** | 1. Ir a Reportes<br>2. Seleccionar "Libro Diario"<br>3. Definir período<br>4. Generar |
| **Resultado Esperado** | Reporte muestra todas las pólizas del período ordenadas por fecha |
| **Estado** | [ ] Pasó [ ] Falló [ ] Bloqueado |
| **Observaciones** | |

#### CP-CON-004: Generar Balance de Comprobación
| Campo | Valor |
|-------|-------|
| **Objetivo** | Verificar balance de comprobación |
| **Precondiciones** | Pólizas existentes |
| **Pasos** | 1. Ir a Reportes<br>2. Seleccionar "Balance de Comprobación"<br>3. Generar |
| **Resultado Esperado** | Suma de Debe = Suma de Haber |
| **Estado** | [ ] Pasó [ ] Falló [ ] Bloqueado |
| **Observaciones** | |

---

### 3. MÓDULO FACTURACIÓN ERP

#### CP-FAC-001: Configurar Datos Fiscales
| Campo | Valor |
|-------|-------|
| **Objetivo** | Verificar configuración CFDI |
| **Precondiciones** | Usuario admin |
| **Pasos** | 1. Ir a Configuración<br>2. Completar RFC, razón social<br>3. Cargar certificado .cer<br>4. Cargar archivo .key<br>5. Guardar |
| **Resultado Esperado** | Configuración guardada, archivos almacenados |
| **Estado** | [ ] Pasó [ ] Falló [ ] Bloqueado |
| **Observaciones** | |

#### CP-FAC-002: Crear Nueva Factura
| Campo | Valor |
|-------|-------|
| **Objetivo** | Verificar creación de factura |
| **Precondiciones** | Configuración fiscal completa |
| **Pasos** | 1. Click "Nueva Factura"<br>2. Seleccionar cliente<br>3. Agregar conceptos<br>4. Verificar cálculo de IVA<br>5. Guardar |
| **Resultado Esperado** | Factura creada con folio secuencial |
| **Estado** | [ ] Pasó [ ] Falló [ ] Bloqueado |
| **Observaciones** | |

#### CP-FAC-003: Filtrar Facturas por Estado
| Campo | Valor |
|-------|-------|
| **Objetivo** | Verificar filtros de facturas |
| **Precondiciones** | Facturas en diferentes estados |
| **Pasos** | 1. Ir a lista de facturas<br>2. Filtrar por "Timbradas"<br>3. Filtrar por "Canceladas"<br>4. Limpiar filtros |
| **Resultado Esperado** | Lista muestra solo facturas del estado seleccionado |
| **Estado** | [ ] Pasó [ ] Falló [ ] Bloqueado |
| **Observaciones** | |

---

### 4. MÓDULO INVENTARIO ERP

#### CP-INV-001: Crear Producto
| Campo | Valor |
|-------|-------|
| **Objetivo** | Verificar alta de producto |
| **Precondiciones** | Usuario autenticado |
| **Pasos** | 1. Ir a Productos<br>2. Click "Nuevo Producto"<br>3. Completar código, nombre, precios<br>4. Definir stock inicial<br>5. Guardar |
| **Resultado Esperado** | Producto creado, código único |
| **Estado** | [ ] Pasó [ ] Falló [ ] Bloqueado |
| **Observaciones** | |

#### CP-INV-002: Registrar Movimiento de Entrada
| Campo | Valor |
|-------|-------|
| **Objetivo** | Verificar entrada de inventario |
| **Precondiciones** | Producto existente |
| **Pasos** | 1. Ir a Movimientos<br>2. Click "Nuevo Movimiento"<br>3. Tipo: Entrada<br>4. Seleccionar producto<br>5. Cantidad: 50<br>6. Guardar |
| **Resultado Esperado** | Stock incrementado en 50 unidades |
| **Estado** | [ ] Pasó [ ] Falló [ ] Bloqueado |
| **Observaciones** | |

#### CP-INV-003: Registrar Movimiento de Salida
| Campo | Valor |
|-------|-------|
| **Objetivo** | Verificar salida de inventario |
| **Precondiciones** | Producto con stock > 0 |
| **Pasos** | 1. Ir a Movimientos<br>2. Tipo: Salida<br>3. Seleccionar producto<br>4. Cantidad: 10<br>5. Guardar |
| **Resultado Esperado** | Stock decrementado, no permite negativos |
| **Estado** | [ ] Pasó [ ] Falló [ ] Bloqueado |
| **Observaciones** | |

#### CP-INV-004: Importar Productos desde Excel
| Campo | Valor |
|-------|-------|
| **Objetivo** | Verificar importación masiva |
| **Precondiciones** | Archivo Excel con formato válido |
| **Pasos** | 1. Click "Importar"<br>2. Seleccionar archivo<br>3. Mapear columnas<br>4. Ejecutar importación |
| **Resultado Esperado** | Productos creados, errores reportados |
| **Estado** | [ ] Pasó [ ] Falló [ ] Bloqueado |
| **Observaciones** | |

---

### 5. MÓDULO PROVEEDORES ERP

#### CP-PRV-001: Crear Proveedor
| Campo | Valor |
|-------|-------|
| **Objetivo** | Verificar alta de proveedor |
| **Pasos** | 1. Click "Nuevo Proveedor"<br>2. Completar RFC, razón social<br>3. Datos de contacto<br>4. Días de crédito<br>5. Guardar |
| **Resultado Esperado** | Proveedor creado correctamente |
| **Estado** | [ ] Pasó [ ] Falló [ ] Bloqueado |

#### CP-PRV-002: Crear Orden de Compra
| Campo | Valor |
|-------|-------|
| **Objetivo** | Verificar creación de OC |
| **Pasos** | 1. Ir a Órdenes de Compra<br>2. Nueva orden<br>3. Seleccionar proveedor<br>4. Agregar productos<br>5. Guardar |
| **Resultado Esperado** | OC creada con folio automático |
| **Estado** | [ ] Pasó [ ] Falló [ ] Bloqueado |

#### CP-PRV-003: Asociar Productos a Proveedor
| Campo | Valor |
|-------|-------|
| **Objetivo** | Verificar catálogo proveedor-producto |
| **Pasos** | 1. Ir a Catálogo<br>2. Seleccionar proveedor<br>3. Agregar productos con precios<br>4. Guardar |
| **Resultado Esperado** | Productos asociados con precios del proveedor |
| **Estado** | [ ] Pasó [ ] Falló [ ] Bloqueado |

---

### 6. MÓDULO PROYECTOS ERP

#### CP-PRY-001: Crear Proyecto
| Campo | Valor |
|-------|-------|
| **Objetivo** | Verificar creación de proyecto |
| **Pasos** | 1. Click "Nuevo Proyecto"<br>2. Nombre y descripción<br>3. Fechas inicio/fin<br>4. Presupuesto<br>5. Guardar |
| **Resultado Esperado** | Proyecto creado, visible en lista |
| **Estado** | [ ] Pasó [ ] Falló [ ] Bloqueado |

#### CP-PRY-002: Crear Tareas
| Campo | Valor |
|-------|-------|
| **Objetivo** | Verificar gestión de tareas |
| **Pasos** | 1. Abrir proyecto<br>2. Agregar tarea<br>3. Asignar responsable<br>4. Definir fechas<br>5. Guardar |
| **Resultado Esperado** | Tarea creada, aparece en Kanban |
| **Estado** | [ ] Pasó [ ] Falló [ ] Bloqueado |

#### CP-PRY-003: Registrar Horas (Timesheet)
| Campo | Valor |
|-------|-------|
| **Objetivo** | Verificar registro de horas |
| **Pasos** | 1. Ir a Timesheet<br>2. Seleccionar proyecto/tarea<br>3. Registrar horas trabajadas<br>4. Guardar |
| **Resultado Esperado** | Horas registradas, resumen actualizado |
| **Estado** | [ ] Pasó [ ] Falló [ ] Bloqueado |

---

### 7. MÓDULO RRHH ERP

#### CP-RH-001: Crear Empleado
| Campo | Valor |
|-------|-------|
| **Objetivo** | Verificar alta de empleado |
| **Pasos** | 1. Click "Nuevo Empleado"<br>2. Datos personales<br>3. Departamento y puesto<br>4. Salario<br>5. Guardar |
| **Resultado Esperado** | Empleado creado con número automático |
| **Estado** | [ ] Pasó [ ] Falló [ ] Bloqueado |

#### CP-RH-002: Generar Nómina
| Campo | Valor |
|-------|-------|
| **Objetivo** | Verificar cálculo de nómina |
| **Pasos** | 1. Ir a Nómina<br>2. Crear período<br>3. Calcular nómina<br>4. Revisar recibos |
| **Resultado Esperado** | Recibos generados con percepciones y deducciones |
| **Estado** | [ ] Pasó [ ] Falló [ ] Bloqueado |

---

### 8. MÓDULO TESORERÍA ERP

#### CP-TES-001: Crear Cuenta Bancaria
| Campo | Valor |
|-------|-------|
| **Objetivo** | Verificar alta de cuenta |
| **Pasos** | 1. Click "Nueva Cuenta"<br>2. Banco, número de cuenta<br>3. CLABE<br>4. Saldo inicial<br>5. Guardar |
| **Resultado Esperado** | Cuenta creada correctamente |
| **Estado** | [ ] Pasó [ ] Falló [ ] Bloqueado |

#### CP-TES-002: Registrar Movimiento Bancario
| Campo | Valor |
|-------|-------|
| **Objetivo** | Verificar movimientos |
| **Pasos** | 1. Seleccionar cuenta<br>2. Nuevo movimiento<br>3. Tipo: Depósito<br>4. Monto<br>5. Guardar |
| **Resultado Esperado** | Saldo actualizado automáticamente |
| **Estado** | [ ] Pasó [ ] Falló [ ] Bloqueado |

#### CP-TES-003: Visualizar Flujo de Caja
| Campo | Valor |
|-------|-------|
| **Objetivo** | Verificar reporte de flujo |
| **Pasos** | 1. Ir al Dashboard<br>2. Verificar gráfica de flujo<br>3. Revisar proyección 12 meses |
| **Resultado Esperado** | Gráfica muestra ingresos vs egresos |
| **Estado** | [ ] Pasó [ ] Falló [ ] Bloqueado |

---

### 9. MÓDULO REPORTES ERP

#### CP-REP-001: Visualizar Métricas BI
| Campo | Valor |
|-------|-------|
| **Objetivo** | Verificar métricas consolidadas |
| **Pasos** | 1. Ir a /reportes-erp<br>2. Verificar tarjetas de métricas |
| **Resultado Esperado** | Métricas muestran datos reales (ventas, CxC, CxP, etc.) |
| **Estado** | [ ] Pasó [ ] Falló [ ] Bloqueado |

---

## Pruebas de Integración

### INT-001: Proveedores - Inventario
| Campo | Valor |
|-------|-------|
| **Objetivo** | Verificar que productos de inventario aparecen en catálogo de proveedores |
| **Pasos** | 1. Crear producto en Inventario<br>2. Ir a Proveedores > Catálogo<br>3. Verificar producto disponible |
| **Resultado Esperado** | Producto visible para asociar a proveedor |
| **Estado** | [ ] Pasó [ ] Falló [ ] Bloqueado |

### INT-002: Eventos - Contabilidad
| Campo | Valor |
|-------|-------|
| **Objetivo** | Verificar generación de póliza desde evento |
| **Pasos** | 1. Crear evento con ingresos<br>2. Generar póliza desde evento<br>3. Verificar en Contabilidad |
| **Resultado Esperado** | Póliza creada con movimientos correctos |
| **Estado** | [ ] Pasó [ ] Falló [ ] Bloqueado |

### INT-003: Facturación - Tesorería
| Campo | Valor |
|-------|-------|
| **Objetivo** | Verificar que pagos de facturas se reflejan en tesorería |
| **Pasos** | 1. Registrar pago de factura<br>2. Verificar movimiento en cuenta bancaria |
| **Resultado Esperado** | Movimiento registrado automáticamente |
| **Estado** | [ ] Pasó [ ] Falló [ ] Bloqueado |

---

## Pruebas de Rendimiento

| Métrica | Valor Esperado | Valor Obtenido | Estado |
|---------|----------------|----------------|--------|
| Carga de dashboard | < 3 segundos | | [ ] OK [ ] Falla |
| Carga de lista (100 registros) | < 2 segundos | | [ ] OK [ ] Falla |
| Guardado de formulario | < 1 segundo | | [ ] OK [ ] Falla |
| Cambio entre módulos | < 1 segundo | | [ ] OK [ ] Falla |

---

## Checklist de Regresión

### Navegación
- [ ] Sidebar muestra todos los módulos
- [ ] Links de navegación funcionan
- [ ] Breadcrumbs correctos
- [ ] Botón "Atrás" funciona

### UI/UX
- [ ] Tema claro funciona
- [ ] Tema oscuro funciona
- [ ] Cambio de paleta de colores
- [ ] Responsive en tablet
- [ ] Tooltips visibles
- [ ] Mensajes de error claros
- [ ] Mensajes de éxito (toast)

### Seguridad
- [ ] Redirección a login si no autenticado
- [ ] Permisos por rol funcionan
- [ ] Datos filtrados por empresa (multi-tenant)
- [ ] No expone información sensible en consola

### Datos
- [ ] Paginación funciona
- [ ] Filtros funcionan
- [ ] Búsqueda funciona
- [ ] Ordenamiento funciona
- [ ] Exportación a Excel
- [ ] Exportación a PDF

---

## Reporte de Defectos

### Plantilla de Reporte

```
ID: BUG-XXX
Módulo: [Nombre del módulo]
Severidad: [Crítica / Alta / Media / Baja]
Prioridad: [Alta / Media / Baja]

Descripción:
[Descripción clara del problema]

Pasos para reproducir:
1.
2.
3.

Resultado actual:
[Qué sucede actualmente]

Resultado esperado:
[Qué debería suceder]

Evidencia:
[Capturas de pantalla, logs, etc.]

Ambiente:
- Navegador:
- Resolución:
- Usuario de prueba:

Notas adicionales:
[Cualquier información relevante]
```

---

## Aprobación de Pruebas

| Rol | Nombre | Firma | Fecha |
|-----|--------|-------|-------|
| QA Lead | | | |
| Dev Lead | | | |
| Product Owner | | | |

---

## Historial de Versiones

| Versión | Fecha | Autor | Cambios |
|---------|-------|-------|---------|
| 1.0 | 2025-11-23 | Equipo Dev | Documento inicial |

---

**Nota:** Este documento debe ser actualizado conforme se agreguen nuevas funcionalidades al sistema.
