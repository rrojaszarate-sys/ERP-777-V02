# 📦 DOCUMENTACIÓN EJECUTIVA
# MÓDULO DE ALMACÉN Y COMPRAS
## ERP-777 Sistema Integral de Gestión Empresarial

---

**Versión:** 1.1  
**Fecha:** Diciembre 2025  
**Clasificación:** Documento Ejecutivo para Aprobación  
**Última Actualización:** Diciembre 2025 - Nuevas funcionalidades

---

## 📌 RESUMEN EJECUTIVO

### ¿Qué es el Módulo de Almacén y Compras?

El **Módulo de Almacén y Compras** es un sistema integral que gestiona el ciclo completo de adquisiciones y control de inventario: desde la solicitud de materiales hasta la recepción en almacén, proporcionando trazabilidad total, control de costos y optimización de stock.

### Propuesta de Valor

| Beneficio | Descripción |
|-----------|-------------|
| 📊 **Control de Stock en Tiempo Real** | Visibilidad del inventario disponible, reservado y en tránsito |
| 💰 **Optimización de Compras** | Mejor precio por proveedor, historial de cotizaciones |
| 🔄 **Trazabilidad Completa** | Seguimiento desde requisición hasta consumo |
| 📱 **Operación Móvil** | Escaneo QR/código de barras desde dispositivos móviles |
| 🎯 **Integración con Eventos** | Reservas, salidas y devoluciones vinculadas a eventos |
| 🔀 **Transferencias entre Almacenes** | Movimiento controlado entre ubicaciones (v1.1) |
| 📖 **Kardex Digital** | Historial completo de movimientos por producto (v1.1) |
| 💵 **Valoración de Inventario** | Reportes con análisis ABC/Pareto (v1.1) |
| 🔔 **Reorden Automático** | Generación de requisiciones cuando baja el stock (v1.1) |

### Métricas Clave que Gestiona

- **Rotación de Inventario** = Costo de ventas / Inventario promedio
- **Días de Inventario** = (Inventario × 365) / Costo de ventas
- **Fill Rate** = Pedidos completos / Pedidos totales × 100%
- **Lead Time** = Días desde orden de compra hasta recepción
- **Análisis ABC** = Clasificación Pareto de productos por valor (v1.1)

---

## 🔄 FLUJOS DE TRABAJO PRINCIPALES

### Flujo 1: Ciclo de Compras

```
┌─────────────┐   ┌─────────────┐   ┌─────────────┐   ┌─────────────┐   ┌─────────────┐
│ REQUISICIÓN │ → │  APROBACIÓN │ → │   ORDEN     │ → │  RECEPCIÓN  │ → │  ENTRADA    │
│   INTERNA   │   │   NIVELES   │   │   COMPRA    │   │  ALMACÉN    │   │ INVENTARIO  │
└─────────────┘   └─────────────┘   └─────────────┘   └─────────────┘   └─────────────┘
     ↑                  ↓                 ↓                 ↓                 ↓
  Usuario          Gerente/Dir       Proveedor          Almacén          Sistema
  solicita         autoriza          confirma           verifica        actualiza
```

### Estados del Ciclo de Compras

| Estado | Descripción | Responsable |
|--------|-------------|-------------|
| **BORRADOR** | Requisición creada, en captura | Solicitante |
| **PENDIENTE** | Enviada para aprobación | Solicitante |
| **APROBADA** | Autorizada por nivel correspondiente | Autorizador |
| **EN PROCESO** | Orden de compra generada | Compras |
| **ENVIADA** | OC enviada al proveedor | Compras |
| **PARCIAL** | Recepción parcial | Almacén |
| **COMPLETA** | Todo recibido | Almacén |
| **CANCELADA** | Orden cancelada | Compras/Gerencia |

---

### Flujo 2: Inventario para Eventos

```
┌─────────────┐   ┌─────────────┐   ┌─────────────┐   ┌─────────────┐   ┌─────────────┐
│   RESERVA   │ → │  CHECKLIST  │ → │   SALIDA    │ → │  CHECKLIST  │ → │ DEVOLUCIÓN  │
│   STOCK     │   │ PRE-EVENTO  │   │  MATERIAL   │   │ POST-EVENTO │   │  MATERIAL   │
└─────────────┘   └─────────────┘   └─────────────┘   └─────────────┘   └─────────────┘
     ↑                  ↓                 ↓                 ↓                 ↓
  Planificador      Almacenista       Almacenista       Operador         Almacenista
  reserva stock     verifica carga    genera doc.      verifica daños   registra retorno
```

### Flujo 3: Documentos de Inventario

```
┌──────────────────────────────────────────────────────────────────┐
│                    DOCUMENTO DE INVENTARIO                       │
├──────────────────────────────────────────────────────────────────┤
│  TIPO: ENTRADA / SALIDA                                          │
│  ────────────────────────────────────────────────────────────    │
│  Almacén: [Almacén Principal]     Evento: [Boda García - 15/12]  │
│  Fecha: 01/12/2025                 Estado: BORRADOR               │
│  ────────────────────────────────────────────────────────────    │
│  PRODUCTOS:                                                       │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │ Código  │ Producto          │ Cantidad │ Costo U. │ Total│    │
│  ├─────────┼───────────────────┼──────────┼──────────┼──────┤    │
│  │ MES-001 │ Mesa redonda 1.8m │    10    │  $150    │$1,500│    │
│  │ SIL-002 │ Silla Tiffany oro │    80    │   $45    │$3,600│    │
│  │ MAN-003 │ Mantel blanco     │    10    │   $80    │  $800│    │
│  └──────────────────────────────────────────────────────────┘    │
│                                           TOTAL: $5,900          │
│  ────────────────────────────────────────────────────────────    │
│  FIRMAS:                                                          │
│  ┌─────────────────┐    ┌─────────────────┐                      │
│  │     ENTREGA     │    │     RECIBE      │                      │
│  │  [  Firma   ]   │    │  [  Firma   ]   │                      │
│  │  Juan Pérez     │    │  María López    │                      │
│  └─────────────────┘    └─────────────────┘                      │
└──────────────────────────────────────────────────────────────────┘
```

---

## 📊 ESTRUCTURA DEL MÓDULO

### Submódulo: INVENTARIO

| Página | Función Principal |
|--------|-------------------|
| **Dashboard** | KPIs: productos activos, alertas de stock, movimientos del mes |
| **Productos** | Catálogo maestro con códigos, precios, fotos, QR |
| **Almacenes** | Configuración de almacenes (principal, sucursales, tránsito) |
| **Stock** | Vista consolidada de existencias por almacén |
| **Movimientos** | Historial de entradas, salidas, ajustes, transferencias |
| **Documentos** | Documentos de entrada/salida con firmas digitales |
| **Transferencias** | **NUEVO v1.1** - Movimiento de stock entre almacenes |
| **Kardex** | **NUEVO v1.1** - Vista de movimientos por producto con saldo corrido |
| **Valuación** | **NUEVO v1.1** - Reporte de valor del inventario con análisis ABC |
| **Punto Reorden** | **NUEVO v1.1** - Alertas y requisiciones automáticas |
| **Ubicaciones** | Configuración física (pasillo-rack-nivel) |
| **Lotes** | Control de lotes con fechas de caducidad |
| **Conteos** | Inventarios físicos programados |
| **Reservas** | Stock reservado para eventos futuros |
| **Kits** | Kits predefinidos por tipo de evento |
| **Checklists** | Verificación pre/post evento |
| **Alertas** | Sistema de alertas (stock bajo, lotes por vencer) |
| **Etiquetas** | Generación de códigos QR/barras |
| **Scanner Móvil** | Interface para dispositivos móviles |

### Submódulo: COMPRAS

| Página | Función Principal |
|--------|-------------------|
| **Dashboard** | KPIs: OC activas, montos, proveedores |
| **Requisiciones** | Solicitudes internas de material |
| **Órdenes de Compra** | Gestión completa del ciclo de compra |
| **Recepciones** | Registro de mercancía recibida |
| **Tipos de Almacén** | Configuración de clasificaciones |

### Submódulo: PROVEEDORES

| Página | Función Principal |
|--------|-------------------|
| **Dashboard** | Vista general de proveedores y compras |
| **Proveedores** | Catálogo maestro con datos fiscales y bancarios |
| **Catálogo** | Productos por proveedor con precios |
| **Órdenes** | Historial de órdenes por proveedor |

---

## 💰 CONTROL DE COSTOS

### Métodos de Costeo Soportados

| Método | Descripción | Uso Recomendado |
|--------|-------------|-----------------|
| **Costo Promedio** | Promedio ponderado de entradas | Productos de consumo regular |
| **PEPS (FIFO)** | Primera entrada, primera salida | Productos perecederos |
| **Costo Estándar** | Costo predefinido fijo | Productos de manufactura |

### Estructura de Costos

```
┌─────────────────────────────────────────────────────────────────┐
│                    COSTO DE PRODUCTO                             │
├─────────────────────────────────────────────────────────────────┤
│  Costo de Adquisición (Último)           $100.00                │
│  Costo Promedio Ponderado                 $98.50                │
│  ────────────────────────────────────────────────               │
│  Stock Disponible:        50 unidades                           │
│  Stock Reservado:         10 unidades                           │
│  Stock en Tránsito:        5 unidades                           │
│  ────────────────────────────────────────────────               │
│  VALOR DEL INVENTARIO (Promedio):        $4,925.00              │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔗 INTEGRACIÓN CON EVENTOS (NUEVO)

### Flujo de Materiales para Eventos

```
┌────────────────────────────────────────────────────────────────────────┐
│                INTEGRACIÓN ALMACÉN ↔ EVENTOS                           │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│    EVENTO: "Boda García - 15/Dic/2025"                                │
│    ─────────────────────────────────────                              │
│                                                                        │
│    1. SALIDA DE MATERIAL (Doc: SAL-2025-0045)                         │
│    ┌──────────────────────────────────────────────────────────┐       │
│    │ 10 Mesas redondas 1.8m    × $150 c/u  =   $1,500         │       │
│    │ 80 Sillas Tiffany oro     × $45 c/u   =   $3,600         │       │
│    │ 10 Manteles blancos       × $80 c/u   =     $800         │       │
│    │                                                           │       │
│    │ ☑ Generar gasto automático al evento                     │       │
│    └──────────────────────────────────────────────────────────┘       │
│                           ↓                                            │
│    GASTO GENERADO EN EVENTO                                           │
│    ┌──────────────────────────────────────────────────────────┐       │
│    │ Categoría: Materiales de Almacén                         │       │
│    │ Monto: $5,900.00                                         │       │
│    │ Estado: Aprobado                                         │       │
│    └──────────────────────────────────────────────────────────┘       │
│                           ↓                                            │
│    2. DEVOLUCIÓN DE MATERIAL (Doc: ENT-2025-0028)                     │
│    ┌──────────────────────────────────────────────────────────┐       │
│    │ 10 Mesas redondas 1.8m    × $150 c/u  =   $1,500         │       │
│    │ 78 Sillas Tiffany oro     × $45 c/u   =   $3,510         │ ←2 daño│
│    │ 9 Manteles blancos        × $80 c/u   =     $720         │ ←1 daño│
│    └──────────────────────────────────────────────────────────┘       │
│                           ↓                                            │
│    AJUSTE AL GASTO                                                    │
│    ┌──────────────────────────────────────────────────────────┐       │
│    │ Gasto Original:  $5,900.00                               │       │
│    │ Devolución:     -$5,730.00                               │       │
│    │ COSTO NETO:        $170.00  (material dañado/consumido)  │       │
│    └──────────────────────────────────────────────────────────┘       │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘
```

### Beneficios de la Integración

| Beneficio | Descripción |
|-----------|-------------|
| **Costo Real por Evento** | El gasto de materiales se carga automáticamente |
| **Control de Devoluciones** | Ajuste automático al devolver material |
| **Mermas Identificadas** | Diferencia entre salida y devolución = consumo real |
| **Trazabilidad** | Qué material se usó en qué evento |
| **Reportes Consolidados** | Consumo de materiales por evento, por período |

---

## 📋 TIPOS DE MOVIMIENTOS

| Tipo | Código | Efecto en Stock | Descripción |
|------|--------|-----------------|-------------|
| **Entrada** | ENT | ➕ Aumenta | Compra, devolución, ajuste positivo |
| **Salida** | SAL | ➖ Disminuye | Venta, evento, ajuste negativo |
| **Ajuste** | AJU | ➕/➖ | Corrección por inventario físico |
| **Transferencia** | TRF | ↔ Mueve | Entre almacenes |
| **Reserva** | RES | 🔒 Compromete | Para evento futuro |

---

## 📊 DASHBOARD Y KPIs

### Panel Principal de Inventario

```
┌─────────────────────────────────────────────────────────────────────┐
│  DASHBOARD DE INVENTARIO                                            │
├───────────────┬───────────────┬───────────────┬───────────────────┤
│ PRODUCTOS     │ ALMACENES     │ MOVIMIENTOS   │ ALERTAS           │
│ ACTIVOS       │ OPERATIVOS    │ DEL MES       │ PENDIENTES        │
│    1,245      │      3        │     847       │      12           │
├───────────────┼───────────────┼───────────────┼───────────────────┤
│               │               │ +325 Entradas │ 8 Stock bajo      │
│               │               │ -522 Salidas  │ 4 Lotes por vencer│
└───────────────┴───────────────┴───────────────┴───────────────────┘
```

### Panel Principal de Compras

```
┌─────────────────────────────────────────────────────────────────────┐
│  DASHBOARD DE COMPRAS                                               │
├───────────────┬───────────────┬───────────────┬───────────────────┤
│ ÓRDENES       │ MONTO         │ PROVEEDORES   │ PENDIENTES        │
│ ACTIVAS       │ COMPROMETIDO  │ ACTIVOS       │ RECEPCIÓN         │
│     18        │  $285,000     │     45        │      7            │
├───────────────┼───────────────┼───────────────┼───────────────────┤
│ 5 Por aprobar │ ▲ 12%        │ 3 Nuevos      │ 2 Atrasadas       │
│ 8 En proceso  │ vs mes ant.  │ este mes      │ > 5 días          │
└───────────────┴───────────────┴───────────────┴───────────────────┘
```

### Indicadores Clave (KPIs)

| KPI | Fórmula | Meta | Frecuencia |
|-----|---------|------|------------|
| **Rotación de Inventario** | Costo ventas / Inventario prom. | ≥ 6x/año | Mensual |
| **Días de Inventario** | Inventario × 365 / Costo | ≤ 60 días | Mensual |
| **Fill Rate** | Pedidos completos / Totales | ≥ 95% | Semanal |
| **Lead Time Promedio** | Días OC a recepción | ≤ 7 días | Mensual |
| **Exactitud de Inventario** | Conteo físico / Teórico | ≥ 98% | Trimestral |
| **Valor de Inventario** | Σ (Stock × Costo) | Según budget | Mensual |

---

## 🔧 FUNCIONALIDADES PRINCIPALES

### Inventario

- ✅ Catálogo de productos con múltiples atributos
- ✅ Multi-almacén con transferencias
- ✅ Ubicaciones físicas (pasillo-rack-nivel)
- ✅ Control de lotes con caducidad
- ✅ Números de serie para activos
- ✅ Documentos con firmas digitales
- ✅ Generación de códigos QR
- ✅ Scanner móvil para operaciones
- ✅ Inventarios físicos programados
- ✅ Sistema de alertas automáticas
- ✅ Reservas para eventos
- ✅ Kits de materiales predefinidos
- ✅ Checklists pre/post evento

### Compras

- ✅ Requisiciones internas de material
- ✅ Flujo de aprobación multinivel
- ✅ Órdenes de compra con autorización
- ✅ Recepciones parciales/completas
- ✅ Historial de precios por proveedor
- ✅ Conversión requisición a OC
- ✅ Duplicación de órdenes
- ✅ Estados configurables

### Proveedores

- ✅ Catálogo con datos fiscales
- ✅ Información bancaria para pagos
- ✅ Catálogo de productos por proveedor
- ✅ Comparativa de precios
- ✅ Calificación de proveedores (calidad/servicio)
- ✅ Historial de compras

---

## 👥 ROLES Y PERMISOS

| Rol | Productos | Stock | Requisición | OC | Recepción | Ajustes |
|-----|-----------|-------|-------------|-----|-----------|---------|
| **Almacenista** | Ver | Ver/Mover | Crear | Ver | ✅ | Proponer |
| **Comprador** | Ver | Ver | Aprobar | ✅ | Ver | ❌ |
| **Jefe Almacén** | Editar | ✅ | Aprobar | Ver | ✅ | ✅ |
| **Gerente Compras** | Editar | ✅ | Aprobar | ✅ | ✅ | ✅ |
| **Administrador** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

---

## 🔗 INTEGRACIONES

### Con Otros Módulos del ERP

| Módulo | Tipo de Integración |
|--------|---------------------|
| **Eventos** | Salidas/devoluciones, gastos automáticos, reservas |
| **Contabilidad** | Pólizas de compra, ajustes de inventario |
| **Facturación** | Facturas de proveedor (XML CFDI) |
| **Proyectos** | Materiales por proyecto |
| **Portal Solicitudes** | Solicitudes de compra de ejecutivos |

### Flujo de Datos entre Módulos

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   PORTAL     │ →   │   COMPRAS    │ →   │  INVENTARIO  │
│ SOLICITUDES  │     │   (OC)       │     │  (Entrada)   │
└──────────────┘     └──────────────┘     └──────────────┘
                                                 ↓
                     ┌──────────────┐     ┌──────────────┐
                     │   EVENTOS    │ ←   │   SALIDA     │
                     │   (Gasto)    │     │  MATERIAL    │
                     └──────────────┘     └──────────────┘
```

---

## 📈 BENEFICIOS CUANTIFICABLES

### Ahorro de Tiempo

| Proceso | Antes (Manual) | Después (Sistema) | Ahorro |
|---------|----------------|-------------------|--------|
| Búsqueda de producto | 5 min | 10 seg | 97% |
| Generación de OC | 30 min | 5 min | 83% |
| Recepción de mercancía | 20 min | 5 min | 75% |
| Inventario físico | 3 días | 4 horas | 94% |
| Reporte de stock | 2 horas | Inmediato | 100% |

### Reducción de Errores y Costos

| Tipo | Reducción Esperada |
|------|-------------------|
| Faltantes por mal control | 80% |
| Compras duplicadas | 95% |
| Mermas no identificadas | 70% |
| Desviación de inventario | 90% |
| Sobre-stock | 60% |

### ROI Estimado

```
┌─────────────────────────────────────────────────────────────────┐
│  RETORNO DE INVERSIÓN ESTIMADO                                  │
├─────────────────────────────────────────────────────────────────┤
│  Valor de inventario actual:              $2,000,000            │
│  ────────────────────────────────────────────────               │
│  Reducción de mermas (5% → 1%):              $80,000/año       │
│  Reducción de sobre-stock (15%):             $45,000/año       │
│  Ahorro tiempo operativo:                    $36,000/año       │
│  ────────────────────────────────────────────────               │
│  BENEFICIO ANUAL ESTIMADO:                  $161,000/año       │
│  Tiempo de recuperación:                     6-8 meses         │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📋 REQUERIMIENTOS TÉCNICOS

### Infraestructura

| Componente | Especificación |
|------------|----------------|
| **Navegador** | Chrome, Firefox, Safari, Edge (últimas versiones) |
| **Conexión** | Internet (mínimo 5 Mbps, 10 Mbps recomendado) |
| **Dispositivos Móviles** | Android 10+ / iOS 14+ para scanner |
| **Impresora Etiquetas** | Compatible con ZPL (Zebra, Brother, etc.) |
| **Lector de Códigos** | Compatible HID o cámara de dispositivo |

### Seguridad

- ✅ Autenticación segura (OAuth 2.0)
- ✅ Control de acceso por rol y almacén
- ✅ Cifrado de datos
- ✅ Respaldos automáticos
- ✅ Auditoría de movimientos
- ✅ Firmas digitales en documentos

---

## 🚀 PLAN DE IMPLEMENTACIÓN

### Fase 1: Configuración Base (Semana 1-2)
- [ ] Configurar almacenes y ubicaciones
- [ ] Cargar catálogo de productos
- [ ] Configurar proveedores principales
- [ ] Definir usuarios y permisos

### Fase 2: Carga Inicial (Semana 3)
- [ ] Inventario físico inicial
- [ ] Carga de existencias al sistema
- [ ] Validación de costos
- [ ] Generación de etiquetas QR

### Fase 3: Capacitación (Semana 4)
- [ ] Capacitación almacenistas
- [ ] Capacitación compradores
- [ ] Capacitación supervisores
- [ ] Simulacros de operación

### Fase 4: Piloto (Semana 5-6)
- [ ] Operación paralela (sistema nuevo + anterior)
- [ ] Ajustes y correcciones
- [ ] Validación de reportes

### Fase 5: Producción (Semana 7+)
- [ ] Migración completa
- [ ] Desactivar sistemas anteriores
- [ ] Monitoreo continuo
- [ ] Soporte en sitio primera semana

---

## ✅ CHECKLIST DE APROBACIÓN

Para aprobar la implementación del módulo, se requiere:

- [ ] **Dirección General** - Aprobación estratégica
- [ ] **Dirección de Operaciones** - Validación de flujos
- [ ] **Dirección de Compras** - Validación de procesos de adquisición
- [ ] **Almacén** - Validación de operativa diaria
- [ ] **TI** - Infraestructura y conectividad
- [ ] **Finanzas** - Modelo de costeo y valuación
- [ ] **Legal** - Cumplimiento normativo

---

## 📞 CONTACTO Y SOPORTE

| Tipo | Contacto |
|------|----------|
| **Soporte Técnico** | soporte@erp777.com |
| **Capacitación** | capacitacion@erp777.com |
| **Documentación** | docs.erp777.com |

---

**Documento preparado para presentación ejecutiva**  
*ERP-777 - Sistema Integral de Gestión Empresarial*
