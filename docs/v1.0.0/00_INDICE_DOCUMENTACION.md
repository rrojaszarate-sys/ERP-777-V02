<![CDATA[<!-- 
================================================================================
PROMPT PARA CONVERTIR A PDF PROFESIONAL
================================================================================

Usa este prompt en CLAUDE.AI o CHATGPT para convertir a formato Word/PDF:

"Convierte este documento Markdown a formato Word profesional corporativo:

1. PORTADA: Logo placeholder centrado, título "Sistema ERP v1.0.0", subtítulo 
   "Documentación Oficial", datos: Empresa, Fecha Dic 2025, Confidencial

2. DISEÑO: 
   - Títulos en azul corporativo (#1e3a5f)
   - Subtítulos en gris (#4b5563)  
   - Tablas con encabezado azul y filas alternadas grises
   - Tipografía Calibri 11pt cuerpo, 14pt títulos
   - Márgenes 2.5cm, interlineado 1.15

3. ELEMENTOS:
   - Tabla de contenidos con hipervínculos
   - Encabezado: 'Sistema ERP v1.0.0 | Documentación Oficial'
   - Pie de página: 'CONFIDENCIAL | Página X de Y'
   - Saltos de página entre secciones principales

4. Genera instrucciones para exportar a PDF desde Word/Google Docs"

================================================================================
HERRAMIENTAS RECOMENDADAS PARA CONVERSIÓN
================================================================================

PDF PROFESIONAL:
1. Claude.ai - Mejor para estructurar y dar formato detallado
2. ChatGPT - Bueno para generar HTML que se puede convertir a PDF
3. Notion - Importar Markdown y exportar a PDF con buen formato
4. Pandoc + LaTeX - Para PDFs de alta calidad (técnico)

PRESENTACIONES (desde los Guiones GAMMA):
1. Gamma.app - IA especializada en presentaciones (RECOMENDADA)
   Prompt: "Crea presentación ejecutiva de 10 slides sobre [módulo] para 
   directivos. Estilo corporativo, minimalista, con gráficos"

2. Canva AI - Diseños visuales atractivos
3. Beautiful.ai - Presentaciones automáticas profesionales
4. Tome.app - Narrativas visuales con IA

================================================================================
-->

---

<div align="center">

# SISTEMA ERP

## Documentación Oficial

### Versión 1.0.0

---

**DOCUMENTO CONFIDENCIAL**

---

| | |
|:--|:--|
| **Empresa** | [Nombre de la Empresa] |
| **Proyecto** | Sistema ERP Integral |
| **Versión** | 1.0.0 |
| **Fecha** | Diciembre 2025 |
| **Clasificación** | Interno - Confidencial |

---

*Preparado por: Equipo de Desarrollo ERP*

</div>

---

<div style="page-break-after: always;"></div>

## Tabla de Contenidos

| Sección | Título | Página |
|:-------:|--------|:------:|
| 1 | Introducción | 3 |
| 2 | Módulo de Eventos | 4 |
| 3 | Módulo de Almacén y Compras | 5 |
| 4 | Portal de Solicitudes | 6 |
| 5 | Guiones de Presentación | 7 |
| 6 | Documentos de Aprobación | 8 |
| 7 | Documentación Técnica | 9 |
| 8 | Anexos | 10 |

---

<div style="page-break-after: always;"></div>

## 1. Introducción

### 1.1 Propósito del Documento

Este documento constituye el **índice maestro** de la documentación del Sistema ERP v1.0.0. Proporciona una guía estructurada para acceder a toda la documentación técnica, funcional y de presentación del sistema.

### 1.2 Audiencia Objetivo

| Rol | Documentos Recomendados | Prioridad |
|-----|------------------------|:---------:|
| Dirección General | Secciones 5 y 6 | Alta |
| Jefes de Área | Secciones 2, 3, 4 según área | Alta |
| Usuarios Finales | Documentación del módulo correspondiente | Media |
| Equipo Técnico | Sección 7 | Alta |

### 1.3 Estructura de la Documentación

```
docs/v1.0.0/
├── 00_INDICE_DOCUMENTACION.md          ← Este documento
├── 01_Modulo_Eventos/
├── 02_Modulo_Almacen_Compras/
├── 03_Portal_Solicitudes/
├── 04_Guiones_Presentacion/
├── 05_Aprobaciones/
└── 06_Tecnica/
```

---

<div style="page-break-after: always;"></div>

## 2. Módulo de Eventos

### 2.1 Descripción General

Sistema integral para la **gestión del ciclo de vida completo de eventos**, desde la cotización inicial hasta la facturación y cobro final.

### 2.2 Documentación Disponible

| Documento | Archivo |
|-----------|---------|
| Documentación Ejecutiva Completa | `01_Modulo_Eventos/DOCUMENTACION_EJECUTIVA_MODULO_EVENTOS.md` |

### 2.3 Funcionalidades Principales

| Funcionalidad | Descripción |
|---------------|-------------|
| **Workflow de Estados** | 7 estados: Borrador → Cotizado → Confirmado → En Proceso → Completado → Facturado → Cobrado |
| **Modelo Financiero Dual** | Control de Presupuesto Estimado vs Costos Reales |
| **Gestión de Proveedores** | Asignación y seguimiento de proveedores por evento |
| **Análisis Financiero** | Vista consolidada de márgenes y rentabilidad |
| **Integración** | Conexión con módulos de Compras e Inventario |

### 2.4 Beneficios Clave

- Control total del ciclo de vida del evento
- Visibilidad de costos en tiempo real
- Trazabilidad completa de operaciones
- Reportes de rentabilidad por evento

---

<div style="page-break-after: always;"></div>

## 3. Módulo de Almacén y Compras

### 3.1 Descripción General

Sistema integrado para la **gestión de inventarios**, control de almacenes, requisiciones y órdenes de compra.

### 3.2 Documentación Disponible

| Documento | Archivo |
|-----------|---------|
| Documentación Ejecutiva Completa | `02_Modulo_Almacen_Compras/DOCUMENTACION_EJECUTIVA_MODULO_ALMACEN_COMPRAS.md` |

### 3.3 Funcionalidades Principales

| Funcionalidad | Descripción |
|---------------|-------------|
| **Catálogo de Productos** | Gestión completa con soporte para códigos de barras UPC/EAN |
| **Import/Export CSV** | Carga y descarga masiva de productos |
| **Multi-Almacén** | Gestión de múltiples ubicaciones de almacenamiento |
| **Documentos de Movimiento** | Entradas, salidas y transferencias con trazabilidad |
| **Requisiciones** | Sistema de solicitudes y aprobaciones |
| **Órdenes de Compra** | Gestión completa del proceso de compras |

### 3.4 Beneficios Clave

- Control de inventario en tiempo real
- Reducción de errores con código de barras
- Automatización del proceso de compras
- Integración con eventos para salida de materiales

---

<div style="page-break-after: always;"></div>

## 4. Portal de Solicitudes

### 4.1 Descripción General

**Portal web externo** que permite a proveedores y clientes interactuar con el sistema ERP de forma segura y autónoma.

### 4.2 Documentación Disponible

| Documento | Archivo |
|-----------|---------|
| Documentación del Portal | `03_Portal_Solicitudes/DOCUMENTACION_PORTAL_SOLICITUDES.md` |

### 4.3 Funcionalidades Principales

| Funcionalidad | Descripción |
|---------------|-------------|
| **Autenticación Segura** | Login con Google OAuth |
| **Dashboard Personalizado** | Vista de eventos y métricas del proveedor |
| **Centro de Mensajes** | Comunicación bidireccional empresa-proveedor |
| **Reportes de Gastos** | Carga de comprobantes con procesamiento OCR |
| **Interfaz Responsive** | Adaptada a móviles, tablets y desktop |

### 4.4 Beneficios Clave

- Autoservicio para proveedores
- Reducción de carga administrativa
- Comunicación centralizada
- Procesamiento automático de comprobantes

---

<div style="page-break-after: always;"></div>

## 5. Guiones de Presentación

### 5.1 Descripción General

Material preparado para **presentaciones ejecutivas** a stakeholders, desarrollado bajo la metodología GAMMA.

### 5.2 Documentación Disponible

| Documento | Archivo |
|-----------|---------|
| Guión - Módulo Eventos | `04_Guiones_Presentacion/GUION_GAMMA_MODULO_EVENTOS.md` |
| Guión - Almacén y Compras | `04_Guiones_Presentacion/GUION_GAMMA_MODULO_ALMACEN_COMPRAS.md` |

### 5.3 Metodología GAMMA

| Componente | Significado | Aplicación |
|:----------:|-------------|------------|
| **G** | Goal | Objetivo claro de la presentación |
| **A** | Audience | Audiencia definida y sus necesidades |
| **M** | Message | Mensaje principal a comunicar |
| **M** | Materials | Materiales de soporte requeridos |
| **A** | Action | Llamado a la acción esperado |

### 5.4 Uso de los Guiones

> **Para generar presentaciones en GAMMA.APP:**
> 
> Copiar el contenido del guión y usar el prompt:
> *"Crea una presentación ejecutiva de 10 slides basada en este guión. 
> Estilo corporativo minimalista, colores azul y gris, incluye gráficos 
> y visualizaciones de datos donde sea apropiado."*

---

<div style="page-break-after: always;"></div>

## 6. Documentos de Aprobación

### 6.1 Descripción General

Resúmenes ejecutivos diseñados para facilitar la **aprobación del sistema** por las diferentes áreas de la organización.

### 6.2 Documentación Disponible

| Documento | Archivo |
|-----------|---------|
| Resumen Ejecutivo para Aprobación | `05_Aprobaciones/RESUMEN_EJECUTIVO_APROBACION_AREAS.md` |

### 6.3 Estado de Aprobaciones por Área

| Área | Responsable | Estado | Fecha |
|------|-------------|:------:|-------|
| Dirección General | | ⬜ Pendiente | |
| Operaciones / Eventos | | ⬜ Pendiente | |
| Almacén e Inventarios | | ⬜ Pendiente | |
| Compras y Proveedores | | ⬜ Pendiente | |
| Finanzas / Contabilidad | | ⬜ Pendiente | |
| Tecnología (IT) | | ⬜ Pendiente | |

### 6.4 Proceso de Aprobación

1. Revisión de documentación ejecutiva del módulo
2. Presentación con guión GAMMA
3. Sesión de preguntas y respuestas
4. Firma de documento de aprobación

---

<div style="page-break-after: always;"></div>

## 7. Documentación Técnica

### 7.1 Descripción General

Documentación destinada al **equipo de desarrollo** y soporte técnico del sistema.

### 7.2 Documentación Disponible

| Documento | Descripción | Archivo |
|-----------|-------------|---------|
| README Técnico | Guía rápida de arquitectura | `06_Tecnica/README_TECNICO.md` |
| Arquitectura | Estructura del proyecto | `../ARCHITECTURE.md` |
| Base de Datos | Esquema y modelo de datos | `../DATABASE.md` |
| API Reference | Endpoints disponibles | `../api-endpoints.md` |

### 7.3 Stack Tecnológico

| Capa | Tecnología |
|------|------------|
| Frontend | React 18 + TypeScript |
| Estilos | Tailwind CSS + shadcn/ui |
| Backend | Supabase (PostgreSQL) |
| Autenticación | Supabase Auth + Google OAuth |
| Hosting | Vercel |

---

<div style="page-break-after: always;"></div>

## 8. Anexos

### 8.1 Control de Versiones del Documento

| Versión | Fecha | Autor | Descripción del Cambio |
|:-------:|-------|-------|------------------------|
| 1.0.0 | Dic 2025 | Equipo de Desarrollo | Versión inicial |

### 8.2 Glosario de Términos

| Término | Definición |
|---------|------------|
| **ERP** | Enterprise Resource Planning - Sistema de planificación de recursos |
| **RLS** | Row Level Security - Seguridad a nivel de fila |
| **OCR** | Optical Character Recognition - Reconocimiento óptico de caracteres |
| **OAuth** | Protocolo estándar de autorización |
| **CSV** | Comma Separated Values - Formato de archivo de datos |

### 8.3 Referencias

- Documentación de Supabase: https://supabase.com/docs
- Documentación de React: https://react.dev
- Guía de Tailwind CSS: https://tailwindcss.com/docs

### 8.4 Contacto

| Tipo | Contacto |
|------|----------|
| Soporte Técnico | soporte@empresa.com |
| Documentación | docs@empresa.com |

---

<div align="center">

**— Fin del Documento —**

---

*Sistema ERP v1.0.0 | Documentación Oficial*  
*Generado: Diciembre 2025*  
*Próxima Revisión: Marzo 2026*

---

**CONFIDENCIAL - USO INTERNO**

</div>
]]>