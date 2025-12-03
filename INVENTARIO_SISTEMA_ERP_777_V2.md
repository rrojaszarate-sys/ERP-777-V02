# 📊 INVENTARIO EXHAUSTIVO - SISTEMA ERP 777 V2

**Fecha de generación:** 2 de diciembre de 2025  
**Versión:** V02  
**Base de datos:** Supabase (PostgreSQL)

---

## 📌 RESUMEN EJECUTIVO

### Módulos Principales
| Módulo | Estado | Tablas | Servicios |
|--------|--------|--------|-----------|
| **Inventario** | ✅ Operativo (básico) | productos_erp, almacenes_erp, movimientos_inventario_erp | inventarioService.ts + 13 servicios más |
| **Eventos** | ✅ Operativo completo | evt_eventos_erp, evt_clientes_erp, evt_ingresos_erp, evt_gastos_erp | eventsService.ts + 11 servicios más |
| **Inventario Avanzado** | ❌ Pendiente | inv_existencias, inv_lotes, inv_ubicaciones... | Tipos definidos, tablas no creadas |

---

## 🏭 1. MÓDULO DE INVENTARIO

### 1.1 Tabla: `productos_erp`

**Campos disponibles:**
```
id, company_id, clave, nombre, descripcion, categoria, unidad, precio_base, 
precio_venta, costo, margen, iva, clave_sat, clave_unidad_sat, tipo, activo, 
fecha_creacion, fecha_actualizacion, codigo_qr
```

**Campo `categoria` - Valores encontrados:**
| Categoría | Descripción |
|-----------|-------------|
| Iluminación | Lámparas, focos LED, etc. |
| Ferretería | Productos de ferretería general |
| Electricidad | Material eléctrico |
| Pinturas | Pinturas y recubrimientos |
| Plomería | Materiales de plomería |
| Construcción | Materiales de construcción |
| Material Eléctrico | Cables, conectores, etc. |
| Tuberías y Accesorios | Tubos, conexiones |
| Cerrajería y Seguridad | Cerraduras, candados |
| Herramientas | Herramientas manuales y eléctricas |
| Abrasivos y Corte | Discos, lijas |
| Adhesivos y Selladores | Pegamentos, selladores |
| Acabados y Decoración | Acabados finales |
| Tornillería y fijaciones | Tornillos, clavos |
| Pintura y Recubrimientos | Similar a pinturas |
| Productos de Limpieza | Artículos de limpieza |
| Materiales de Construcción | Similar a construcción |
| Químicos y Disolventes | Químicos, solventes |
| Seguridad Industrial | EPP, señalización |
| Suministros de Impresión | Papelería, tóner |
| Ruedas y Bases | Rodajas, bases |
| Otros | Categoría general |

**Campo `unidad` - Valores encontrados:**
| Código | Descripción |
|--------|-------------|
| PZA | Pieza |
| MTO / MTS / M | Metro |
| CUBO | Cubeta |
| SACO | Saco |
| CAJAS / CAJA | Caja |
| JUEGO | Juego |
| ROLLO | Rollo |
| PAQUETE | Paquete |
| LTS | Litro |
| BOTES | Bote |
| K | Kilogramo |

**Campo `tipo` - Valores posibles:**
```typescript
tipo: 'producto' | 'servicio' | 'kit'
```

---

### 1.2 Tabla: `almacenes_erp`

**Campos disponibles:**
```
id, company_id, nombre, descripcion, ubicacion, responsable_id, activo, fecha_creacion
```

**Nota:** El campo `tipo` existe en el código TypeScript pero no está poblado en la BD.

**Tipos definidos en código:**
```typescript
tipo: 'principal' | 'sucursal' | 'consignacion' | 'transito'
```

---

### 1.3 Tabla: `movimientos_inventario_erp`

**Campos disponibles:**
```
id, almacen_id, producto_id, tipo, cantidad, referencia, concepto, costo_unitario, 
user_id, fecha_creacion
```

**Campo `tipo` - Valores posibles:**
```typescript
tipo: 'entrada' | 'salida' | 'ajuste' | 'transferencia'
```

---

### 1.4 Servicios de Inventario (`src/modules/inventario-erp/services/`)

| Servicio | Funcionalidad |
|----------|---------------|
| `inventarioService.ts` | CRUD de productos, almacenes, movimientos |
| `alertasService.ts` | Alertas de stock bajo, vencimientos |
| `checklistService.ts` | Checklist de inventario para eventos |
| `conteosService.ts` | Inventarios físicos, conteos cíclicos |
| `documentosInventarioService.ts` | Documentos de entrada/salida con firma |
| `importService.ts` | Importación masiva de productos |
| `kardexService.ts` | Historial de movimientos por producto |
| `kitsService.ts` | Kits de materiales para eventos |
| `lotesService.ts` | Gestión de lotes y caducidades |
| `reordenService.ts` | Puntos de reorden automático |
| `reservasService.ts` | Reservas de stock para eventos |
| `transferenciasService.ts` | Transferencias entre almacenes |
| `ubicacionesService.ts` | Ubicaciones dentro de almacenes |
| `valuacionService.ts` | Valuación de inventario (PEPS, UEPS, etc.) |

---

### 1.5 Páginas de Inventario (`src/modules/inventario-erp/pages/`)

| Página | Funcionalidad |
|--------|---------------|
| `ProductosPage.tsx` | CRUD de productos |
| `AlmacenesPage.tsx` | Gestión de almacenes |
| `MovimientosPage.tsx` | Registro de movimientos |
| `StockPage.tsx` | Consulta de existencias |
| `KardexPage.tsx` | Historial de movimientos |
| `DocumentosInventarioPage.tsx` | Documentos con firma digital |
| `TransferenciasPage.tsx` | Transferencias entre almacenes |
| `LotesPage.tsx` | Gestión de lotes |
| `UbicacionesPage.tsx` | Ubicaciones en almacén |
| `ReservasPage.tsx` | Reservas para eventos |
| `ConteosPage.tsx` | Inventarios físicos |
| `AlertasInventarioPage.tsx` | Alertas del inventario |
| `PuntoReordenPage.tsx` | Configuración de reorden |
| `ValuacionInventarioPage.tsx` | Valuación del inventario |
| `KitsEventoPage.tsx` | Kits para eventos |
| `ChecklistEventoPage.tsx` | Checklist pre/post evento |
| `EtiquetasPage.tsx` | Generación de etiquetas QR |
| `MobileScannerPage.tsx` | Escáner móvil |
| `SesionesMovilPage.tsx` | Sesiones de escaneo |
| `ConfiguracionInventarioPage.tsx` | Configuración general |
| `InventarioDashboard.tsx` | Dashboard principal |

---

### 1.6 Tablas de Inventario Avanzado (PENDIENTES)

Las siguientes tablas tienen migraciones y tipos definidos pero **NO EXISTEN** en la BD:

| Tabla | Propósito | Migración |
|-------|-----------|-----------|
| `inv_existencias` | Stock por producto/almacén | sql/CREAR_TABLAS_INVENTARIO_FALTANTES.sql |
| `inv_documentos` | Documentos de movimiento | sql/CREAR_TABLAS_INVENTARIO_FALTANTES.sql |
| `inv_documentos_detalle` | Detalle de documentos | sql/CREAR_TABLAS_INVENTARIO_FALTANTES.sql |
| `inv_ubicaciones` | Ubicaciones físicas | sql/CREAR_TABLAS_INVENTARIO_FALTANTES.sql |
| `inv_lotes` | Control de lotes | sql/CREAR_TABLAS_INVENTARIO_FALTANTES.sql |
| `inv_reservas` | Reservas de inventario | sql/CREAR_TABLAS_INVENTARIO_FALTANTES.sql |
| `ubicaciones_almacen_erp` | Ubicaciones (alternativa) | migrations/022_inventario_avanzado.sql |
| `lotes_inventario_erp` | Lotes (alternativa) | migrations/022_inventario_avanzado.sql |
| `numeros_serie_erp` | Números de serie | migrations/022_inventario_avanzado.sql |
| `conteos_inventario_erp` | Conteos físicos | migrations/022_inventario_avanzado.sql |
| `reservas_stock_erp` | Reservas para eventos | migrations/022_inventario_avanzado.sql |
| `kits_evento_erp` | Kits de materiales | migrations/022_inventario_avanzado.sql |

---

## 📅 2. MÓDULO DE EVENTOS

### 2.1 Tabla: `evt_eventos_erp`

**Campos disponibles (60+ campos):**
```
id, company_id, clave_evento, nombre_proyecto, descripcion, tipo_evento_id, 
estado_id, cliente_id, fecha_evento, hora_inicio, hora_fin, lugar_evento, 
direccion_evento, numero_invitados, presupuesto_estimado, presupuesto_aprobado, 
presupuesto_final, cotizacion_numero, cotizacion_fecha, cotizacion_subtotal, 
cotizacion_iva, cotizacion_total, cotizacion_descuento, cotizacion_anticipo, 
cotizacion_saldo, cotizacion_status, cotizacion_validez_dias, cotizacion_notas, 
cotizacion_terminos, presupuesto_servicios, presupuesto_productos, contacto_nombre, 
contacto_telefono, contacto_email, responsable_id, solicitante_id, equipo_asignado, 
notas_internas, notas_cliente, archivos_adjuntos, checklist, tareas, recordatorios, 
subtotal, iva, total, total_ingresos, total_gastos, utilidad, margen_utilidad, 
status_facturacion, facturado, cobrado, factura_id, fecha_facturacion, activo, 
creado_por, actualizado_por, fecha_creacion, fecha_actualizacion, fecha_fin, lugar, 
prioridad, fase_proyecto, provision_combustible_peaje, provision_materiales, 
provision_recursos_humanos, provision_solicitudes_pago, ingreso_estimado, 
ganancia_estimada, created_at, updated_at
```

**Campo `prioridad` - Valores posibles:**
```typescript
prioridad: 'baja' | 'media' | 'alta' | 'urgente'
```

**Campo `fase_proyecto` - Valores posibles:**
```typescript
fase_proyecto: 'cotizacion' | 'aprobado' | 'en_proceso' | 'completado'
```

**Campo `status_facturacion` - Valores posibles:**
```typescript
status_facturacion: 'pendiente_facturar' | 'facturado' | 'cancelado'
```

**Campo `status_pago` - Valores posibles:**
```typescript
status_pago: 'pendiente' | 'pago_pendiente' | 'pagado' | 'vencido'
```

---

### 2.2 Tabla: `evt_estados_erp` (Estados del Workflow)

**Estados disponibles:**

| ID | Nombre | Orden | workflow_step | Color |
|----|--------|-------|---------------|-------|
| 1, 10 | Prospecto | 1 | prospecto | #9CA3AF |
| 2, 11 | Cotización Enviada | 2 | cotizacion | #3B82F6 |
| 3, 12 | Negociación | 3 | negociacion | #F59E0B |
| 4, 13 | Confirmado | 4 | confirmado | #10B981 |
| 5, 14 | En Preparación | 5 | preparacion | #8B5CF6 |
| 6, 15 | En Curso | 6 | ejecucion | #06B6D4 |
| 7, 16 | Finalizado | 7 | finalizado | #059669 |
| 8, 17 | Cancelado | 8 | cancelado | #EF4444 |
| 9, 18 | Rechazado | 9 | rechazado | #DC2626 |

**Nota:** Hay duplicados en la tabla (IDs 1-9 y 10-18 con los mismos datos).

**Constantes en código:**
```typescript
export const EVENT_STATES = {
  BORRADOR: 1,
  COTIZADO: 2,
  APROBADO: 3,
  EN_PROCESO: 4,
  COMPLETADO: 5,
  FACTURADO: 6,
  COBRADO: 7
} as const;
```

---

### 2.3 Tabla: `evt_clientes_erp`

**Campos disponibles:**
```
id, company_id, razon_social, nombre_comercial, rfc, sufijo, email, telefono, 
telefono_secundario, direccion_fiscal, calle, numero_exterior, numero_interior, 
colonia, codigo_postal, ciudad, estado, pais, contacto_principal, telefono_contacto, 
email_contacto, regimen_fiscal, uso_cfdi, metodo_pago, forma_pago, dias_credito, 
limite_credito, activo, notas, fecha_creacion, fecha_actualizacion
```

---

### 2.4 Tabla: `evt_ingresos_erp`

**Campos disponibles:**
```
id, company_id, evento_id, cliente_id, concepto, descripcion, fecha_ingreso, 
fecha_vencimiento, subtotal, iva, total, facturado, uuid_cfdi, serie, folio, 
xml_url, pdf_url, status_cobro, cobrado, fecha_cobro, metodo_pago, forma_pago, 
referencia, cuenta_id, poliza_id, notas, creado_por, actualizado_por, 
fecha_creacion, fecha_actualizacion, deleted_at, retencion_iva, retencion_isr
```

---

### 2.5 Tabla: `evt_gastos_erp`

**Campos disponibles:**
```
id, company_id, evento_id, proveedor_id, concepto, descripcion, fecha_gasto, 
categoria_id, subtotal, iva, total, factura_numero, uuid_factura, fecha_factura, 
tipo_comprobante, comprobante_url, comprobante_nombre, xml_url, xml_data, 
documento_ocr_id, ocr_procesado, ocr_extraido, ocr_validado, status, pagado, 
fecha_pago, metodo_pago, referencia, cuenta_id, poliza_id, deducible, 
porcentaje_deducible, requiere_aprobacion, aprobado, aprobado_por, fecha_aprobacion, 
tags, notas, creado_por, actualizado_por, fecha_creacion, fecha_actualizacion, 
deleted_at, retencion_iva, retencion_isr, tipo_movimiento, detalle_retorno
```

**Campo `status` (aprobación) - Valores posibles:**
```typescript
status_aprobacion: 'pendiente' | 'aprobado' | 'rechazado'
```

---

### 2.6 Tabla: `cat_categorias_gasto` (Categorías de Gasto)

**SOLO 4 CATEGORÍAS (diseño intencional):**

| Clave | Nombre | Color | Descripción |
|-------|--------|-------|-------------|
| SP | Solicitudes de Pago | #8B5CF6 | Servicios profesionales y pagos a terceros |
| COMB | Combustible/Peaje | #F59E0B | Gasolina, casetas y viáticos de transporte |
| RH | Recursos Humanos | #10B981 | Nómina, honorarios y pagos a personal |
| MAT | Materiales | #3B82F6 | Insumos, materiales y consumibles |

---

### 2.7 Tabla: `cat_formas_pago`

**Formas de pago con códigos SAT:**

| código_sat | Nombre | Tipo |
|------------|--------|------|
| 01 | Efectivo | efectivo |
| 02 | Cheque nominativo | cheque |
| 03 | Transferencia electrónica | transferencia |
| 04 | Tarjeta de crédito | tarjeta |
| 05 | Monedero electrónico | monedero |
| 28 | Tarjeta de débito | tarjeta |
| 99 | Por definir | otro |

---

### 2.8 Tabla: `cat_proveedores`

**Campos disponibles:**
```
id, rfc, razon_social, nombre_comercial, direccion, telefono, email, 
contacto_nombre, banco, cuenta_bancaria, clabe, datos_fiscales_completos, 
fecha_actualizacion_fiscal, requiere_actualizacion, modulo_origen, activo, 
company_id, created_at, updated_at
```

---

### 2.9 Servicios de Eventos (`src/modules/eventos-erp/services/`)

| Servicio | Funcionalidad |
|----------|---------------|
| `eventsService.ts` | CRUD de eventos, clientes, dashboard |
| `accountsService.ts` | Cuentas contables |
| `alertService.ts` | Alertas de eventos |
| `clientsService.ts` | Gestión de clientes |
| `eventStateValidationService.ts` | Validación de estados |
| `exportService.ts` | Exportación de datos |
| `financesService.ts` | Finanzas de eventos |
| `financialExportService.ts` | Exportación financiera |
| `invoiceService.ts` | Facturación |
| `proyectosEventosService.ts` | Proyectos vinculados |
| `storageService.ts` | Almacenamiento de archivos |
| `workflowService.ts` | Flujo de trabajo |

---

### 2.10 Páginas de Eventos (`src/modules/eventos-erp/pages/`)

| Página | Funcionalidad |
|--------|---------------|
| `EventsDashboard.tsx` | Dashboard principal |
| `EventsListPage.tsx` | Lista de eventos |
| `EventFormPage.tsx` | Formulario de evento |
| `CalendarioPage.tsx` | Vista de calendario |
| `FacturasPage.tsx` | Gestión de facturas |
| `ProyectosEventosPage.tsx` | Proyectos vinculados |

**Páginas adicionales en raíz:**
- `EventosListPageNew.tsx` - Lista de eventos nueva
- `FinancialAnalysisPage.tsx` - Análisis financiero
- `ClientesListPage.tsx` - Lista de clientes
- `CatalogosPage.tsx` - Catálogos del sistema
- `GastoModal.tsx` - Modal de gastos

---

## 📈 3. VISTAS DISPONIBLES

### 3.1 Vista: `vw_eventos_analisis_financiero_erp`

**Campos disponibles (50+ campos):**
```
id, company_id, clave_evento, nombre_proyecto, descripcion, fecha_evento, fecha_fin, 
lugar, numero_invitados, prioridad, fase_proyecto, created_at, updated_at, 
cliente_id, cliente_nombre, cliente_comercial, cliente_rfc, estado_id, estado_nombre, 
estado_color, tipo_evento_id, tipo_evento_nombre, tipo_evento_color, ingreso_estimado, 
ingresos_totales, ingresos_subtotal, ingresos_iva, ingresos_retencion_iva, 
ingresos_retencion_isr, ingresos_cobrados, ingresos_pendientes, gastos_totales, 
gastos_subtotal, gastos_iva, gastos_retencion_iva, gastos_retencion_isr, 
gastos_pagados_total, gastos_pendientes_total, gastos_combustible_pagados, 
gastos_combustible_pendientes, gastos_materiales_pagados, gastos_materiales_pendientes, 
gastos_rh_pagados, gastos_rh_pendientes, gastos_sps_pagados, gastos_sps_pendientes, 
provisiones_total, provisiones_subtotal, provisiones_iva, provisiones_retencion_iva, 
provisiones_retencion_isr, provisiones_count, provision_combustible, 
provision_materiales, provision_rh, provision_sps, total_egresos, 
total_egresos_subtotal, total_retenciones_egresos, utilidad_real, utilidad_bruta, 
margen_real_pct, margen_bruto_pct
```

### 3.2 Vista: `vw_eventos_completos_erp`
- Datos completos de eventos con joins a clientes, estados, tipos

### 3.3 Vista: `vw_dashboard_metricas_erp`
- Métricas agregadas para el dashboard

---

## 🔐 4. TABLAS CORE

| Tabla | Propósito | Estado |
|-------|-----------|--------|
| `core_companies` | Empresas del sistema | ✅ Disponible |
| `core_users` | Usuarios del sistema | ✅ Disponible |
| `companies_erp` | Empresas (alias) | ✅ Disponible |
| `users_erp` | Usuarios (alias) | ✅ Disponible |

---

## 🏗️ 5. RELACIONES ENTRE TABLAS

```
core_companies
    │
    ├── evt_eventos_erp (company_id)
    │       ├── evt_ingresos_erp (evento_id)
    │       ├── evt_gastos_erp (evento_id)
    │       ├── evt_estados_erp (estado_id)
    │       └── evt_clientes_erp (cliente_id)
    │
    ├── productos_erp (company_id)
    │       └── movimientos_inventario_erp (producto_id)
    │
    └── almacenes_erp (company_id)
            └── movimientos_inventario_erp (almacen_id)
```

---

## ⚠️ 6. FUNCIONALIDADES PENDIENTES

### 6.1 Inventario Avanzado
- [ ] Ejecutar migración `sql/CREAR_TABLAS_INVENTARIO_FALTANTES.sql`
- [ ] Ejecutar migración `migrations/022_inventario_avanzado.sql`
- [ ] Crear vistas: `vw_movimientos_inventario_erp`, `vw_stock_por_almacen_erp`

### 6.2 Tablas de Gastos No Impactados
- [ ] Verificar vista `vw_gastos_no_impactados_erp`

### 6.3 Provisiones
- [ ] Verificar/crear tabla `evt_provisiones`

### 6.4 Tipos de Evento
- [ ] Verificar/poblar tabla `tipos_evento_erp`

---

## 📝 7. TIPOS TYPESCRIPT DEFINIDOS

### 7.1 Tipos de Inventario (`src/modules/inventario-erp/types/index.ts`)
- `Almacen`
- `MovimientoInventario`
- `DocumentoInventario`
- `DetalleDocumentoInventario`
- `Producto`
- `UbicacionAlmacen`
- `LoteInventario`
- `NumeroSerie`
- `ConteoInventario`
- `ReservaStock`
- `KitEvento`
- `ChecklistEventoInventario`
- `AlertaInventario`

### 7.2 Tipos de Eventos (`src/modules/eventos-erp/types/`)
- `Event`
- `EventoCompleto`
- `Cliente`
- `TipoEvento`
- `Estado`
- `Income`
- `Expense`
- `ExpenseCategory`
- `FinancialProjection`
- `FinancialResult`
- `PortfolioFinancialSummary`

---

## 🔧 8. NOTAS IMPORTANTES

### 8.1 Nombres de Columnas Críticos
- **evt_eventos_erp**: Usar `nombre_proyecto` (NO `nombre`)
- **movimientos_inventario_erp**: Usar `fecha_creacion` (NO `created_at`)

### 8.2 Duplicados en Catálogos
- `evt_estados_erp` tiene duplicados (IDs 1-9 y 10-18)
- `cat_categorias_gasto` tiene duplicados por company_id
- `cat_formas_pago` tiene duplicados por company_id

### 8.3 Tablas Deprecadas
Algunas tablas antiguas se movieron al schema `deprecated`:
- `deprecated.evt_tipos_evento` → usar `tipos_evento_erp`

---

*Documento generado automáticamente por análisis de código y base de datos.*
