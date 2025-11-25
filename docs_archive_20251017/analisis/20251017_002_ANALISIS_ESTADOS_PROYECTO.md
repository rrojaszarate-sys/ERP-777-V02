# Análisis de Estados del Proyecto MADE ERP v2.0

## Estados Encontrados en la Base de Datos

Según el archivo de migración `supabase/migrations/20250929015143_calm_plain.sql`:

### 7 Estados Principales (líneas 273-280)

| ID | Nombre | Descripción | Color | Orden | workflow_step |
|----|--------|-------------|-------|-------|---------------|
| ? | Borrador | Evento en borrador | #6B7280 | 1 | 1 |
| ? | Cotizado | Evento cotizado | #3B82F6 | 2 | 2 |
| ? | Aprobado | Evento aprobado por cliente | #10B981 | 3 | 3 |
| ? | En Proceso | Evento en ejecución | #F59E0B | 4 | 4 |
| ? | Completado | Evento completado | #059669 | 5 | 5 |
| ? | Facturado | Evento facturado | #7C3AED | 6 | 6 |
| ? | Cobrado | Evento cobrado completamente | #059669 | 7 | 7 |

### Estado Adicional (Octavo Estado)

Según la documentación (docs/ctx/INTROSPECTION_COMPLETE.md), la tabla `evt_estados` tiene **8 rows**.

El octavo estado es probablemente **Cancelado**, que agregué en la migración `20251004000001_add_cancelado_state.sql`:

| ID | Nombre | Descripción | Color | Orden | workflow_step |
|----|--------|-------------|-------|-------|---------------|
| ? | Cancelado | Evento cancelado | #EF4444 | 0 | 0 |

## Flujo de Estados Según README.md

**Línea 9 del README.md:**
> **Workflow de estados** automatizado (Cotización → Aprobado → Facturado → Pagado)

**⚠️ DISCREPANCIA DETECTADA:**
- El README menciona: **Cotización → Aprobado → Facturado → Pagado**
- Las migraciones tienen: **Borrador → Cotizado → Aprobado → En Proceso → Completado → Facturado → Cobrado**

Esto sugiere que:
- "Cotización" = "Cotizado"
- "Pagado" = "Cobrado"
- El README es una versión simplificada del flujo real

## Flujo REAL Completo

```
Borrador (1)
    ↓
Cotizado (2)
    ↓
Aprobado (3)
    ↓
En Proceso (4)
    ↓
Completado (5)
    ↓
Facturado (6)
    ↓
Cobrado (7)
```

Estado especial: **Cancelado (0)** - puede aplicarse desde cualquier estado

## Problema Identificado

### Código Actual (WorkflowStatusManager.tsx, líneas 71-76)

```typescript
const estadosPorDocumento: Record<string, string> = {
  contrato: 'Aprobado',         // Cuando se sube acuerdo/contrato
  orden_compra: 'En Proceso',   // Cuando se sube orden de compra
  cierre_evento: 'Completado'   // Cuando se sube documento de cierre
};
```

### Pregunta Crítica

**¿Cuál es el mapeo correcto de documentos a estados?**

Necesitamos confirmar con el cliente:

1. **¿Qué documento se sube para pasar a "Cotizado"?**
2. **¿Qué documento se sube para pasar a "Aprobado"?** (¿Contrato firmado?)
3. **¿Qué documento se sube para pasar a "En Proceso"?** (¿Orden de compra?)
4. **¿Qué documento se sube para pasar a "Completado"?** (¿Acta de cierre?)
5. **¿Qué documento se sube para pasar a "Facturado"?** (¿Factura PDF?)
6. **¿Qué documento se sube para pasar a "Cobrado"?** (¿Comprobante de pago?)

## Mapeo Sugerido (Basado en Lógica de Negocio)

| Documento Subido | Estado Objetivo | Orden | Razón |
|------------------|----------------|-------|-------|
| Cotización PDF | Cotizado | 2 | Propuesta enviada al cliente |
| Contrato Firmado | Aprobado | 3 | Cliente aprueba y firma |
| Orden de Compra | En Proceso | 4 | Se inicia la ejecución |
| Acta/Documento de Cierre | Completado | 5 | Evento ejecutado exitosamente |
| Factura PDF | Facturado | 6 | Se emite factura fiscal |
| Comprobante de Pago | Cobrado | 7 | Se recibe el pago completo |

## Estado Inicial por Defecto

Según la migración (línea 99):
```sql
estado_id integer REFERENCES evt_estados(id) DEFAULT 1
```

**Estado inicial = 1 (Borrador)**

Esto es correcto.

## Recomendación

**ANTES de continuar con los cambios**, necesitamos:

1. **Confirmar con el usuario el flujo exacto de su negocio**
2. **Identificar qué tipos de documentos manejan** (contrato, orden_compra, etc.)
3. **Mapear cada tipo de documento al estado correspondiente**

### Opciones:

**Opción A: Flujo Simplificado (según README)**
```
Borrador → Cotizado → Aprobado → Facturado → Cobrado
```

**Opción B: Flujo Completo (según Migraciones)**
```
Borrador → Cotizado → Aprobado → En Proceso → Completado → Facturado → Cobrado
```

### Tipos de Documentos Actuales (src/modules/eventos/components/documents/DocumentosEvento.tsx)

```typescript
// Líneas 50, 213-215
'contrato'         // 🟧 Contrato-Acuerdo
'orden_compra'     // 🟩 Orden de Compra
'cierre_evento'    // 🟥 Cierre del Evento
```

**Faltan documentos para:**
- Cotización (para pasar a "Cotizado")
- Factura (para pasar a "Facturado")
- Comprobante de Pago (para pasar a "Cobrado")

## Acción Inmediata Requerida

🚨 **DETENER** cambios en el código hasta confirmar con el usuario:

1. ¿Qué documentos deben subir?
2. ¿Cuál es el flujo de estados correcto para su negocio?
3. ¿Los 3 tipos de documentos actuales son suficientes o necesitan más?

---

**Generado:** 2025-10-04
**Estado:** Pendiente de confirmación con usuario
