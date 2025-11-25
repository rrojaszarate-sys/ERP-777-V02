# Documentación de Base de Datos - ERP 777

**Versión:** 1.0.0
**Fecha:** 24 de Noviembre de 2025
**Base de Datos:** PostgreSQL 17.6 (Supabase)
**Proyecto:** gomnouwackzvthpwyric

---

## Tabla de Contenidos

1. [Resumen Ejecutivo](#1-resumen-ejecutivo)
2. [Arquitectura de la Base de Datos](#2-arquitectura-de-la-base-de-datos)
3. [Módulos del Sistema](#3-módulos-del-sistema)
4. [Diagrama de Relaciones](#4-diagrama-de-relaciones)
5. [Diccionario de Datos](#5-diccionario-de-datos)
6. [Catálogos del Sistema](#6-catálogos-del-sistema)
7. [Estadísticas de Datos](#7-estadísticas-de-datos)

---

## 1. Resumen Ejecutivo

### Información General

| Concepto | Valor |
|----------|-------|
| **Empresa** | MADE Events SA de CV |
| **RFC** | MEV123456ABC |
| **Total de Tablas** | 46 tablas principales |
| **Total de Registros** | ~2,589 registros |

### KPIs Financieros

| Métrica | Valor |
|---------|-------|
| **Total de Eventos** | 144 |
| **Ingresos Totales** | $19,746,981.80 MXN |
| **Gastos Totales** | $12,463,193.51 MXN |
| **Utilidad Bruta** | $7,283,788.29 MXN |
| **Margen de Utilidad** | 36.89% |

---

## 2. Arquitectura de la Base de Datos

### Schemas Utilizados

```
├── public (101 tablas)     - Tablas principales del ERP
├── auth (19 tablas)        - Autenticación Supabase
├── storage (9 tablas)      - Almacenamiento de archivos
├── realtime (3 tablas)     - Funcionalidad en tiempo real
└── vault (1 tabla)         - Secretos y configuración
```

### Convenciones de Nomenclatura

| Prefijo | Módulo | Descripción |
|---------|--------|-------------|
| `evt_` | Eventos | Gestión de eventos, gastos, ingresos |
| `core_` | Core | Usuarios, roles, empresas, auditoría |
| `nom_` | Nómina | Empleados, nóminas, conceptos |
| `prj_` | Proyectos | Gestión de proyectos |
| `con_` | Contabilidad | Cuentas, pólizas, movimientos |
| `alm_` | Almacén | Inventario, productos, movimientos |

---

## 3. Módulos del Sistema

### 3.1 Módulo de Eventos (16 tablas - 2,507 registros)

El módulo principal del ERP, gestiona todo el ciclo de vida de los eventos.

| Tabla | Registros | Descripción |
|-------|-----------|-------------|
| `evt_eventos` | 144 | Eventos/proyectos principales |
| `evt_gastos` | 1,152 | Gastos asociados a eventos |
| `evt_ingresos` | 1,152 | Ingresos por evento |
| `evt_clientes` | 6 | Clientes de la empresa |
| `evt_estados` | 12 | Catálogo de estados de evento |
| `evt_estados_ingreso` | 4 | Estados de flujo de ingresos |
| `evt_tipos_evento` | 5 | Tipos de evento (Boda, XV, etc.) |
| `evt_categorias_gastos` | 4 | Categorías de gastos |
| `evt_categorias_ingresos` | 6 | Categorías de ingresos |
| `evt_cuentas_bancarias` | 5 | Cuentas bancarias |
| `evt_cuentas_contables` | 13 | Plan de cuentas contables |
| `evt_roles` | 4 | Roles de usuario |
| `evt_documentos` | 0 | Documentos adjuntos |
| `evt_alertas_enviadas` | 0 | Historial de alertas |
| `evt_configuracion_alertas` | 0 | Configuración de alertas |
| `evt_movimientos_bancarios` | 0 | Movimientos bancarios |

### 3.2 Módulo Core (7 tablas - 27 registros)

Gestión de usuarios, roles y configuración del sistema.

| Tabla | Registros | Descripción |
|-------|-----------|-------------|
| `core_users` | 3 | Usuarios del sistema |
| `core_roles` | 3 | Roles disponibles |
| `core_companies` | 1 | Empresas/tenants |
| `core_audit_log` | 10 | Log de auditoría |
| `core_user_roles` | 3 | Asignación de roles a usuarios |
| `core_system_config` | 5 | Configuración del sistema |
| `core_security_config` | 2 | Configuración de seguridad |

### 3.3 Módulo de Nómina (6 tablas - 12 registros)

Gestión de empleados y nóminas.

| Tabla | Registros | Descripción |
|-------|-----------|-------------|
| `nom_empleados` | 1 | Empleados |
| `nom_nominas` | 1 | Nóminas generadas |
| `nom_conceptos` | 9 | Conceptos de nómina |
| `nom_periodos` | 1 | Períodos de pago |
| `nom_departamentos` | 0 | Departamentos |
| `nom_puestos` | 0 | Puestos de trabajo |

### 3.4 Módulo de Proyectos (7 tablas - 20 registros)

Gestión de proyectos (catálogos configurados).

| Tabla | Registros | Descripción |
|-------|-----------|-------------|
| `prj_proyectos` | 0 | Proyectos |
| `prj_fases` | 0 | Fases de proyecto |
| `prj_hitos` | 0 | Hitos/milestones |
| `prj_tipos_proyecto` | 6 | Tipos de proyecto |
| `prj_estados_proyecto` | 6 | Estados de proyecto |
| `prj_prioridades` | 4 | Niveles de prioridad |
| `prj_roles` | 4 | Roles en proyectos |

### 3.5 Módulo de Contabilidad (4 tablas - 3 registros)

Plan contable y pólizas.

| Tabla | Registros | Descripción |
|-------|-----------|-------------|
| `con_cuentas` | 1 | Cuentas contables |
| `con_polizas` | 1 | Pólizas contables |
| `con_movimientos` | 1 | Movimientos contables |
| `con_balanza` | 0 | Balanza de comprobación |

### 3.6 Módulo de Almacén (6 tablas - 20 registros)

Inventario y control de almacén.

| Tabla | Registros | Descripción |
|-------|-----------|-------------|
| `alm_almacenes` | 1 | Almacenes |
| `alm_productos` | 1 | Productos |
| `alm_categorias` | 1 | Categorías de productos |
| `alm_movimientos` | 0 | Movimientos de inventario |
| `alm_tipos_movimiento` | 9 | Tipos de movimiento |
| `alm_unidades_medida` | 8 | Unidades de medida |

---

## 4. Diagrama de Relaciones

### 4.1 Relaciones del Módulo de Eventos

```
                          ┌─────────────────────┐
                          │   evt_clientes      │
                          │   (6 registros)     │
                          └─────────┬───────────┘
                                    │
                                    │ cliente_id
                                    ▼
┌─────────────────┐        ┌─────────────────────┐        ┌─────────────────┐
│ evt_tipos_evento│◄───────│    evt_eventos      │───────►│  evt_estados    │
│   (5 tipos)     │tipo_id │   (144 registros)   │estado  │  (12 estados)   │
└─────────────────┘        └─────────┬───────────┘        └─────────────────┘
                                     │
                    ┌────────────────┼────────────────┐
                    │                │                │
                    ▼                ▼                ▼
          ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────────┐
          │   evt_gastos    │ │  evt_ingresos   │ │  evt_documentos     │
          │ (1,152 registros)│ │(1,152 registros)│ │   (0 registros)     │
          └────────┬────────┘ └────────┬────────┘ └─────────────────────┘
                   │                   │
                   ▼                   ▼
          ┌─────────────────┐ ┌─────────────────────┐
          │evt_categorias_  │ │evt_estados_ingreso  │
          │    gastos       │ │    (4 estados)      │
          │   (4 tipos)     │ └─────────────────────┘
          └─────────────────┘
```

### 4.2 Relaciones Financieras

```
┌─────────────────────────────────────────────────────────────────────┐
│                        FLUJO FINANCIERO                            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  evt_eventos ─────┬──────► evt_gastos ───────► evt_cuentas_bancarias│
│                   │                                                 │
│                   └──────► evt_ingresos ─────► evt_cuentas_contables│
│                                                                     │
│  Provisiones:                                                       │
│  ├── provision_combustible_peaje                                    │
│  ├── provision_materiales                                           │
│  ├── provision_recursos_humanos                                     │
│  └── provision_solicitudes_pago                                     │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 4.3 Relaciones del Módulo Core

```
┌─────────────────┐        ┌─────────────────┐        ┌─────────────────┐
│ core_companies  │◄───────│   core_users    │───────►│   core_roles    │
│   (1 empresa)   │company │  (3 usuarios)   │        │   (3 roles)     │
└─────────────────┘        └────────┬────────┘        └─────────────────┘
                                    │
                                    ▼
                           ┌─────────────────┐
                           │ core_user_roles │
                           │  (3 registros)  │
                           └────────┬────────┘
                                    │
                                    ▼
                           ┌─────────────────┐
                           │ core_audit_log  │
                           │  (10 registros) │
                           └─────────────────┘
```

---

## 5. Diccionario de Datos

### 5.1 Tabla: evt_eventos (48 columnas)

La tabla principal del sistema que almacena todos los eventos.

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | integer | ID único del evento |
| `company_id` | uuid | FK a core_companies |
| `clave_evento` | varchar | Código único del evento |
| `nombre_proyecto` | varchar | Nombre descriptivo |
| `descripcion` | text | Descripción detallada |
| `cliente_id` | integer | FK a evt_clientes |
| `tipo_evento_id` | integer | FK a evt_tipos_evento |
| `estado_id` | integer | FK a evt_estados |
| `responsable_id` | uuid | FK a core_users |
| `fecha_evento` | date | Fecha del evento |
| `fecha_fin` | date | Fecha de finalización |
| `hora_inicio` | time | Hora de inicio |
| `hora_fin` | time | Hora de fin |
| `lugar` | varchar | Ubicación del evento |
| `numero_invitados` | integer | Cantidad de invitados |
| `subtotal` | numeric | Subtotal antes de IVA |
| `iva_porcentaje` | numeric | Porcentaje de IVA (16%) |
| `iva` | numeric | Monto del IVA |
| `total` | numeric | Total del evento |
| `total_gastos` | numeric | Suma de gastos |
| `utilidad` | numeric | Utilidad calculada |
| `margen_utilidad` | numeric | Porcentaje de margen |
| `status_facturacion` | varchar | Estado de facturación |
| `status_pago` | varchar | Estado de pago |
| `provision_combustible_peaje` | numeric | Provisión para combustible |
| `provision_materiales` | numeric | Provisión para materiales |
| `provision_recursos_humanos` | numeric | Provisión para RH |
| `provision_solicitudes_pago` | numeric | Provisión para SPs |
| `created_at` | timestamptz | Fecha de creación |
| `updated_at` | timestamptz | Última actualización |

### 5.2 Tabla: evt_gastos (86 columnas)

Almacena todos los gastos asociados a eventos.

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | integer | ID único |
| `evento_id` | integer | FK a evt_eventos |
| `categoria_id` | integer | FK a evt_categorias_gastos |
| `concepto` | varchar | Descripción del gasto |
| `cantidad` | numeric | Cantidad |
| `precio_unitario` | numeric | Precio por unidad |
| `subtotal` | numeric | Subtotal |
| `iva_porcentaje` | numeric | % de IVA |
| `iva` | numeric | Monto de IVA |
| `total` | numeric | Total del gasto |
| `proveedor` | varchar | Nombre del proveedor |
| `rfc_proveedor` | varchar | RFC del proveedor |
| `fecha_gasto` | date | Fecha del gasto |
| `forma_pago` | varchar | Forma de pago |
| `pagado` | boolean | ¿Está pagado? |
| `comprobado` | boolean | ¿Tiene comprobante? |
| `cuenta_bancaria_id` | integer | FK a evt_cuentas_bancarias |
| `cuenta_contable_id` | integer | FK a evt_cuentas_contables |
| `responsable_id` | uuid | FK a core_users |

### 5.3 Tabla: evt_ingresos (87 columnas)

Almacena todos los ingresos por evento.

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | integer | ID único |
| `evento_id` | integer | FK a evt_eventos |
| `concepto` | varchar | Descripción del ingreso |
| `cantidad` | numeric | Cantidad |
| `precio_unitario` | numeric | Precio por unidad |
| `subtotal` | numeric | Subtotal |
| `iva_porcentaje` | numeric | % de IVA |
| `iva` | numeric | Monto de IVA |
| `total` | numeric | Total del ingreso |
| `fecha_ingreso` | date | Fecha del ingreso |
| `facturado` | boolean | ¿Está facturado? |
| `cobrado` | boolean | ¿Está cobrado? |
| `estado_id` | integer | FK a evt_estados_ingreso |
| `cliente_id` | integer | FK a evt_clientes |
| `cuenta_bancaria_id` | integer | FK a evt_cuentas_bancarias |
| `cuenta_contable_id` | integer | FK a evt_cuentas_contables |

### 5.4 Tabla: evt_clientes (23 columnas)

Catálogo de clientes de la empresa.

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | integer | ID único |
| `company_id` | uuid | FK a core_companies |
| `razon_social` | varchar | Razón social |
| `nombre_comercial` | varchar | Nombre comercial |
| `rfc` | varchar | RFC del cliente |
| `email` | varchar | Email de contacto |
| `telefono` | varchar | Teléfono |
| `direccion_fiscal` | text | Dirección fiscal |
| `contacto_principal` | varchar | Nombre del contacto |
| `regimen_fiscal` | varchar | Régimen fiscal SAT |
| `uso_cfdi` | varchar | Uso CFDI para facturas |
| `metodo_pago` | varchar | Método de pago preferido |
| `forma_pago` | varchar | Forma de pago preferida |
| `dias_credito` | integer | Días de crédito |
| `limite_credito` | numeric | Límite de crédito |
| `activo` | boolean | ¿Cliente activo? |

---

## 6. Catálogos del Sistema

### 6.1 Estados de Evento (`evt_estados`)

| ID | Nombre | Color | Descripción |
|----|--------|-------|-------------|
| 1 | Borrador | #6B7280 | Evento en creación |
| 2 | Acuerdo | #3B82F6 | Acuerdo con cliente |
| 3 | Orden de Compra | #10B981 | OC recibida |
| 4 | En Ejecución | #F59E0B | Evento activo |
| 5 | Finalizado | #059669 | Evento terminado |
| 6 | Facturado | #7C3AED | Factura emitida |
| 7 | Pagado | #059669 | Pago recibido |
| 8 | Cancelado | #f90000 | Evento cancelado |
| 9 | Cerrado | #6B7280 | Evento cerrado |
| 10 | Pagos Pendiente | #F59E0B | Esperando pagos |
| 11 | Pagados | #10B981 | Todos los pagos hechos |
| 12 | Pagos Vencidos | #EF4444 | Pagos atrasados |

### 6.2 Estados de Ingreso (`evt_estados_ingreso`)

| ID | Nombre | Descripción | Orden |
|----|--------|-------------|-------|
| 1 | PLANEADO | Ingreso planeado/proyectado | 1 |
| 2 | ORDEN_COMPRA | Orden de compra recibida | 2 |
| 3 | FACTURADO | Factura emitida al cliente | 3 |
| 4 | PAGADO | Pago recibido y comprobado | 4 |

### 6.3 Tipos de Evento (`evt_tipos_evento`)

| ID | Nombre |
|----|--------|
| 21 | Boda |
| 22 | XV Años |
| 23 | Corporativo |
| 24 | Social |
| 25 | Graduación |

### 6.4 Categorías de Gastos (`evt_categorias_gastos`)

| ID | Nombre | Descripción |
|----|--------|-------------|
| 6 | SPs | Solicitudes de Pago |
| 7 | RH | Recursos Humanos |
| 8 | Materiales | Materiales y suministros |
| 9 | Combustible/Peaje | Gastos de transporte |

### 6.5 Categorías de Ingresos (`evt_categorias_ingresos`)

| ID | Nombre |
|----|--------|
| 1 | Servicios de Evento |
| 2 | Paquetes |
| 3 | Extras |
| 4 | Anticipos |
| 5 | Liquidación |
| 6 | Otros Ingresos |

### 6.6 Roles del Sistema (`evt_roles`)

| ID | Nombre | Permisos |
|----|--------|----------|
| 1 | admin | Acceso total |
| 2 | contador | Finanzas, reportes |
| 3 | operador | Gastos, eventos, ingresos |
| 4 | viewer | Solo lectura |

---

## 7. Estadísticas de Datos

### 7.1 Distribución de Eventos por Estado

| Estado | Cantidad | Porcentaje |
|--------|----------|------------|
| Pagado | 120 | 83.3% |
| Acuerdo | 6 | 4.2% |
| En Ejecución | 6 | 4.2% |
| Finalizado | 6 | 4.2% |
| Facturado | 6 | 4.2% |

### 7.2 Distribución de Eventos por Tipo

| Tipo | Cantidad | Porcentaje |
|------|----------|------------|
| Corporativo | 31 | 21.5% |
| Social | 29 | 20.1% |
| XV Años | 29 | 20.1% |
| Boda | 28 | 19.4% |
| Graduación | 27 | 18.8% |

### 7.3 Distribución de Gastos por Categoría

| Categoría | Cantidad | Monto | Porcentaje |
|-----------|----------|-------|------------|
| RH | 250 | $5,041,533.65 | 40.5% |
| Materiales | 250 | $3,752,346.49 | 30.1% |
| SPs | 248 | $1,976,505.67 | 15.9% |
| Combustible/Peaje | 252 | $1,692,807.70 | 13.6% |

### 7.4 Estado de Pagos y Facturación

| Métrica | Valor |
|---------|-------|
| Gastos pagados | 860 (86%) |
| Gastos comprobados | 860 (86%) |
| Ingresos facturados | 722 (72.2%) |
| Ingresos cobrados | 722 (72.2%) |

### 7.5 Clientes Registrados

| Cliente | RFC | Email |
|---------|-----|-------|
| Corporativo Empresarial Phoenix SA de CV | CEP920315AB7 | contacto@phoenixcorp.mx |
| Constructora del Valle México SA de CV | CDV850622CD9 | info@cdvmx.com |
| Eventos Premier de México SA de CV | EPM910408EF2 | contacto@eventospremier.mx |
| Corporativo Horizonte Internacional SA de CV | CHI880915GH4 | info@horizonteintl.mx |
| Desarrollos Inmobiliarios Luna SA de CV | DIL900725IJ6 | contacto@dilmx.com |
| Grupo Industrial Vanguardia SA de CV | GIV870530KL8 | info@vanguardiagroup.mx |

### 7.6 Cuentas Bancarias Configuradas

| Cuenta | Banco | Número | Tipo |
|--------|-------|--------|------|
| Banco BBVA - Cuenta Principal | BBVA | 0123456789 | Banco |
| Banco Santander - Operativa | Santander | 9876543210 | Banco |
| Banco HSBC - Nómina | HSBC | 1122334455 | Banco |
| Caja General | N/A | - | Caja |
| Caja Chica | N/A | - | Caja |

---

## Anexos

### A. Scripts de Respaldo

```bash
# Respaldo completo (estructura + datos)
node scripts/backup-completo.mjs

# Solo estructura
node scripts/backup-estructura-simple.mjs

# Solo datos
node scripts/backup-datos.mjs
```

### B. Scripts de Análisis

```bash
# Análisis completo de la BD
node scripts/analizar-db.mjs

# Consulta de datos ERP
node scripts/consultar-datos-supabase.mjs

# Listar todas las tablas
node scripts/listar-todas-tablas.mjs
```

### C. Conexión a la Base de Datos

```javascript
// Configuración de conexión
const config = {
  host: 'aws-1-ca-central-1.pooler.supabase.com',
  port: 6543,  // Transaction mode
  database: 'postgres',
  user: 'postgres.gomnouwackzvthpwyric',
  ssl: { rejectUnauthorized: false }
};
```

---

**Documento generado automáticamente el 24 de Noviembre de 2025**
**ERP 777 - Sistema de Gestión de Eventos**
