<![CDATA[<!-- 
================================================================================
DOCUMENTO LISTO PARA PDF - SIN EMOJIS
================================================================================
PROMPT PARA CLAUDE.AI:

"Convierte este documento a Word profesional corporativo:
- Portada: 'Módulo de Almacén y Compras', 'Documentación Ejecutiva v1.0'
- Títulos azul corporativo (#1e3a5f), cuerpo Calibri 11pt
- Tablas con encabezado azul y filas alternadas
- Diagramas ASCII convertirlos a diagramas de flujo profesionales
- Incluir iconos minimalistas para cada sección"

================================================================================
-->

---

<div align="center">

# MÓDULO DE ALMACÉN Y COMPRAS

## Documentación Ejecutiva

### Sistema ERP v1.0.0

---

| | |
|:--|:--|
| **Versión** | 1.0 |
| **Fecha** | Diciembre 2025 |
| **Clasificación** | Documento Ejecutivo para Aprobación |
| **Confidencialidad** | Interno |

</div>

---

## Tabla de Contenidos

1. [Resumen Ejecutivo](#1-resumen-ejecutivo)
2. [Flujos de Trabajo](#2-flujos-de-trabajo)
3. [Estructura del Módulo](#3-estructura-del-módulo)
4. [Control de Costos](#4-control-de-costos)
5. [Integración con Eventos](#5-integración-con-eventos)
6. [Dashboard y KPIs](#6-dashboard-y-kpis)
7. [Funcionalidades Principales](#7-funcionalidades-principales)
8. [Roles y Permisos](#8-roles-y-permisos)
9. [Beneficios Cuantificables](#9-beneficios-cuantificables)
10. [Plan de Implementación](#10-plan-de-implementación)

---

## 1. Resumen Ejecutivo

### 1.1 Descripción del Módulo

El **Módulo de Almacén y Compras** es un sistema integral que gestiona el ciclo completo de adquisiciones y control de inventario: desde la solicitud de materiales hasta la recepción en almacén, proporcionando trazabilidad total, control de costos y optimización de stock.

### 1.2 Propuesta de Valor

| Beneficio | Descripción |
|-----------|-------------|
| **Control de Stock en Tiempo Real** | Visibilidad del inventario disponible, reservado y en tránsito |
| **Optimización de Compras** | Mejor precio por proveedor, historial de cotizaciones |
| **Trazabilidad Completa** | Seguimiento desde requisición hasta consumo |
| **Operación Móvil** | Escaneo QR/código de barras desde dispositivos móviles |
| **Integración con Eventos** | Reservas, salidas y devoluciones vinculadas a eventos |

### 1.3 Métricas Clave

| Métrica | Fórmula |
|---------|---------|
| Rotación de Inventario | Costo de ventas / Inventario promedio |
| Días de Inventario | (Inventario x 365) / Costo de ventas |
| Fill Rate | Pedidos completos / Pedidos totales x 100% |
| Lead Time | Días desde orden de compra hasta recepción |

---

## 2. Flujos de Trabajo

### 2.1 Ciclo de Compras

| Paso | Etapa | Responsable | Acción |
|:----:|-------|-------------|--------|
| 1 | Requisición Interna | Usuario | Solicita material |
| 2 | Aprobación por Niveles | Gerente/Director | Autoriza |
| 3 | Orden de Compra | Compras | Genera OC |
| 4 | Recepción | Almacén | Verifica entrega |
| 5 | Entrada a Inventario | Sistema | Actualiza stock |

### 2.2 Estados del Ciclo de Compras

| Estado | Descripción | Responsable |
|--------|-------------|-------------|
| BORRADOR | Requisición creada, en captura | Solicitante |
| PENDIENTE | Enviada para aprobación | Solicitante |
| APROBADA | Autorizada por nivel correspondiente | Autorizador |
| EN PROCESO | Orden de compra generada | Compras |
| ENVIADA | OC enviada al proveedor | Compras |
| PARCIAL | Recepción parcial | Almacén |
| COMPLETA | Todo recibido | Almacén |
| CANCELADA | Orden cancelada | Compras/Gerencia |

### 2.3 Inventario para Eventos

| Paso | Etapa | Responsable | Acción |
|:----:|-------|-------------|--------|
| 1 | Reserva de Stock | Planificador | Reserva para evento |
| 2 | Checklist Pre-Evento | Almacenista | Verifica carga |
| 3 | Salida de Material | Almacenista | Genera documento |
| 4 | Checklist Post-Evento | Operador | Verifica daños |
| 5 | Devolución de Material | Almacenista | Registra retorno |

---

## 3. Estructura del Módulo

### 3.1 Submódulo: INVENTARIO

| Página | Función Principal |
|--------|-------------------|
| Dashboard | KPIs: productos activos, alertas de stock, movimientos del mes |
| Productos | Catálogo maestro con códigos, precios, fotos, QR |
| Almacenes | Configuración de almacenes (principal, sucursales, tránsito) |
| Stock | Vista consolidada de existencias por almacén |
| Movimientos | Historial de entradas, salidas, ajustes, transferencias |
| Documentos | Documentos de entrada/salida con firmas digitales |
| Ubicaciones | Configuración física (pasillo-rack-nivel) |
| Lotes | Control de lotes con fechas de caducidad |
| Conteos | Inventarios físicos programados |
| Reservas | Stock reservado para eventos futuros |
| Kits | Kits predefinidos por tipo de evento |
| Checklists | Verificación pre/post evento |
| Alertas | Sistema de alertas (stock bajo, lotes por vencer) |
| Etiquetas | Generación de códigos QR/barras |
| Scanner Móvil | Interface para dispositivos móviles |

### 3.2 Submódulo: COMPRAS

| Página | Función Principal |
|--------|-------------------|
| Dashboard | KPIs: OC activas, montos, proveedores |
| Requisiciones | Solicitudes internas de material |
| Órdenes de Compra | Gestión completa del ciclo de compra |
| Recepciones | Registro de mercancía recibida |
| Tipos de Almacén | Configuración de clasificaciones |

### 3.3 Submódulo: PROVEEDORES

| Página | Función Principal |
|--------|-------------------|
| Dashboard | Vista general de proveedores y compras |
| Proveedores | Catálogo maestro con datos fiscales y bancarios |
| Catálogo | Productos por proveedor con precios |
| Órdenes | Historial de órdenes por proveedor |

---

## 4. Control de Costos

### 4.1 Métodos de Costeo Soportados

| Método | Descripción | Uso Recomendado |
|--------|-------------|-----------------|
| Costo Promedio | Promedio ponderado de entradas | Productos de consumo regular |
| PEPS (FIFO) | Primera entrada, primera salida | Productos perecederos |
| Costo Estándar | Costo predefinido fijo | Productos de manufactura |

### 4.2 Estructura de Costos por Producto

| Concepto | Ejemplo |
|----------|---------|
| Costo de Adquisición (Último) | $100.00 |
| Costo Promedio Ponderado | $98.50 |
| Stock Disponible | 50 unidades |
| Stock Reservado | 10 unidades |
| Stock en Tránsito | 5 unidades |
| **Valor del Inventario** | **$4,925.00** |

---

## 5. Integración con Eventos

### 5.1 Flujo de Materiales para Eventos

**Paso 1: Salida de Material**

| Producto | Cantidad | Costo Unitario | Total |
|----------|:--------:|:--------------:|------:|
| Mesa redonda 1.8m | 10 | $150 | $1,500 |
| Silla Tiffany oro | 80 | $45 | $3,600 |
| Mantel blanco | 10 | $80 | $800 |
| **TOTAL SALIDA** | | | **$5,900** |

*Se genera automáticamente un gasto en el evento.*

**Paso 2: Devolución de Material**

| Producto | Salida | Devolución | Diferencia |
|----------|:------:|:----------:|:----------:|
| Mesa redonda 1.8m | 10 | 10 | 0 |
| Silla Tiffany oro | 80 | 78 | 2 (daño) |
| Mantel blanco | 10 | 9 | 1 (daño) |

**Paso 3: Ajuste al Gasto**

| Concepto | Monto |
|----------|------:|
| Gasto Original | $5,900.00 |
| Devolución | -$5,730.00 |
| **Costo Neto (consumido/dañado)** | **$170.00** |

### 5.2 Beneficios de la Integración

| Beneficio | Descripción |
|-----------|-------------|
| **Costo Real por Evento** | El gasto de materiales se carga automáticamente |
| **Control de Devoluciones** | Ajuste automático al devolver material |
| **Mermas Identificadas** | Diferencia entre salida y devolución = consumo real |
| **Trazabilidad** | Qué material se usó en qué evento |
| **Reportes Consolidados** | Consumo de materiales por evento, por período |

---

## 6. Dashboard y KPIs

### 6.1 Panel de Inventario

| Indicador | Valor Ejemplo | Detalle |
|-----------|:-------------:|---------|
| Productos Activos | 1,245 | Total en catálogo |
| Almacenes Operativos | 3 | Principal + 2 sucursales |
| Movimientos del Mes | 847 | +325 entradas, -522 salidas |
| Alertas Pendientes | 12 | 8 stock bajo, 4 lotes por vencer |

### 6.2 Panel de Compras

| Indicador | Valor Ejemplo | Detalle |
|-----------|:-------------:|---------|
| Órdenes Activas | 18 | 5 por aprobar, 8 en proceso |
| Monto Comprometido | $285,000 | +12% vs mes anterior |
| Proveedores Activos | 45 | 3 nuevos este mes |
| Pendientes Recepción | 7 | 2 atrasadas > 5 días |

### 6.3 KPIs de Control

| KPI | Fórmula | Meta | Frecuencia |
|-----|---------|:----:|------------|
| Rotación de Inventario | Costo ventas / Inv. prom. | ≥ 6x/año | Mensual |
| Días de Inventario | Inventario x 365 / Costo | ≤ 60 días | Mensual |
| Fill Rate | Pedidos completos / Totales | ≥ 95% | Semanal |
| Lead Time Promedio | Días OC a recepción | ≤ 7 días | Mensual |
| Exactitud de Inventario | Conteo físico / Teórico | ≥ 98% | Trimestral |

---

## 7. Funcionalidades Principales

### 7.1 Inventario

**Gestión de Productos:**
- Catálogo de productos con múltiples atributos
- Soporte para código de barras UPC/EAN
- Generación de códigos QR
- Fotos y documentos adjuntos

**Control de Stock:**
- Multi-almacén con transferencias
- Ubicaciones físicas (pasillo-rack-nivel)
- Control de lotes con caducidad
- Números de serie para activos
- Reservas para eventos

**Operaciones:**
- Documentos con firmas digitales
- Scanner móvil para operaciones
- Inventarios físicos programados
- Sistema de alertas automáticas
- Kits de materiales predefinidos

**Import/Export:**
- Importación masiva desde CSV
- Exportación de productos a CSV
- Incluye código de barras en ambos

### 7.2 Compras

- Requisiciones internas de material
- Flujo de aprobación multinivel
- Órdenes de compra con autorización
- Recepciones parciales/completas
- Historial de precios por proveedor
- Conversión requisición a OC

### 7.3 Proveedores

- Catálogo con datos fiscales
- Información bancaria para pagos
- Catálogo de productos por proveedor
- Comparativa de precios
- Calificación de proveedores

---

## 8. Roles y Permisos

### 8.1 Matriz de Permisos

| Rol | Productos | Stock | Requisición | OC | Recepción | Ajustes |
|-----|:---------:|:-----:|:-----------:|:--:|:---------:|:-------:|
| Almacenista | Ver | Ver/Mover | Crear | Ver | Si | Proponer |
| Comprador | Ver | Ver | Aprobar | Si | Ver | No |
| Jefe Almacén | Editar | Todo | Aprobar | Ver | Si | Si |
| Gerente Compras | Editar | Todo | Aprobar | Si | Si | Si |
| Administrador | Todo | Todo | Todo | Todo | Todo | Todo |

---

## 9. Beneficios Cuantificables

### 9.1 Ahorro de Tiempo

| Proceso | Antes (Manual) | Después (Sistema) | Ahorro |
|---------|:--------------:|:-----------------:|:------:|
| Localizar producto | 10 min | 30 seg (QR) | 95% |
| Generar documento | 15 min | 2 min | 87% |
| Inventario físico | 8 horas | 2 horas | 75% |
| Reporte de stock | 1 hora | Inmediato | 100% |

### 9.2 Reducción de Errores

| Tipo de Error | Reducción Esperada |
|---------------|:------------------:|
| Conteo de stock | 90% |
| Captura de productos | 95% |
| Documentos incompletos | 100% |
| Productos extraviados | 85% |

### 9.3 Mejora en Control

| Área | Mejora |
|------|--------|
| Exactitud de inventario | De 85% a 98% |
| Tiempo de localización | -95% |
| Stock agotado | -70% |
| Mermas no identificadas | -80% |

---

## 10. Plan de Implementación

### Fase 1: Configuración (Semana 1-2)

| Actividad | Responsable |
|-----------|-------------|
| Configurar catálogo de productos | TI + Almacén |
| Configurar almacenes y ubicaciones | TI + Almacén |
| Migrar inventario inicial | TI |
| Configurar usuarios y permisos | TI / RRHH |

### Fase 2: Capacitación (Semana 3)

| Actividad | Audiencia |
|-----------|-----------|
| Operación básica | Almacenistas |
| Requisiciones y compras | Compradores |
| Reportes y análisis | Gerentes |

### Fase 3: Piloto (Semana 4-5)

| Actividad | Meta |
|-----------|------|
| Operar un almacén en paralelo | Validar flujos |
| Inventario físico de prueba | Comparar exactitud |
| Ciclo de compra completo | 5 órdenes de prueba |

### Fase 4: Producción (Semana 6+)

| Actividad | Resultado |
|-----------|-----------|
| Migración completa | Todos los almacenes |
| Generación de etiquetas QR | 100% productos |
| Capacitación de refuerzo | Según necesidad |

---

## Aprobaciones Requeridas

| Área | Responsable | Firma | Fecha |
|------|-------------|:-----:|:-----:|
| Dirección de Operaciones | | | |
| Gerencia de Almacén | | | |
| Gerencia de Compras | | | |
| Tecnología (TI) | | | |
| Finanzas | | | |

---

<div align="center">

**— Fin del Documento —**

---

*Módulo de Almacén y Compras - Documentación Ejecutiva v1.0*  
*Sistema ERP - Diciembre 2025*

**CONFIDENCIAL - USO INTERNO**

</div>
]]>