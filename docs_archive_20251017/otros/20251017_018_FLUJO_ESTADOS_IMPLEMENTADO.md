# 🎯 Flujo de Estados de Eventos - Implementación Completa

## ✅ Estados Implementados

Según el reporte técnico del sistema y la base de datos actualizada:

| Orden | Estado | Descripción | Color | workflow_step |
|-------|--------|-------------|-------|---------------|
| 1 | **Borrador** | Evento en borrador inicial | #6B7280 | 1 |
| 2 | **Acuerdo** | Acuerdo firmado con el cliente | #3B82F6 | 2 |
| 3 | **Orden de Compra** | Orden de compra generada | #10B981 | 3 |
| 4 | **En Ejecución** | Evento en ejecución | #F59E0B | 4 |
| 5 | **Finalizado** | Evento finalizado exitosamente | #059669 | 5 |
| 6 | **Facturado** | Todos los ingresos facturados | #7C3AED | 6 |
| 7 | **Pagado** | Todos los ingresos pagados | #059669 | 7 |
| 0 | **Cancelado** | Evento cancelado (estado final) | #EF4444 | 0 |

## 🔄 Flujo Visual

```
┌─────────────────────────────────────────────────────────────────┐
│                    FLUJO PRINCIPAL DEL EVENTO                    │
└─────────────────────────────────────────────────────────────────┘

  Borrador (1)
      ↓
  Acuerdo (2) ← [Documento: Contrato, Acuerdo]
      ↓
  Orden de Compra (3) ← [Documento: Orden de Compra, OC]
      ↓
  En Ejecución (4)
      ↓
  Finalizado (5) ← [Documento: Cierre, Acta de Cierre]
      ↓
  Facturado (6) ← [Validación: Todos los ingresos facturados]
      ↓
  Pagado (7) ← [Validación: Todos los ingresos pagados]


┌─────────────────────────────────────────────────────────────────┐
│              ESTADO ESPECIAL (desde cualquier estado)            │
└─────────────────────────────────────────────────────────────────┘

  Cualquier estado → Cancelado (0) [FINAL - Sin retorno]
```

## 📋 Reglas de Negocio

### 1. **Avance Secuencial**
- El flujo principal avanza secuencialmente según el `orden`.
- No se permite retroceder en el flujo principal.
- No se pueden saltar estados.

### 2. **Estado Cancelado**
- Se puede cancelar un evento desde cualquier estado.
- Un evento cancelado es un estado final y no puede ser modificado.
- La cancelación se activa mediante un botón específico y requiere un motivo.

### 3. **Avance Automático por Documento**
Cuando se sube un documento que contiene ciertas palabras clave en su nombre, el sistema intenta avanzar el estado del evento automáticamente.

| Palabras Clave en Nombre de Archivo | Estado Objetivo |
|-------------------------------------|-----------------|
| `contrato`, `acuerdo` | Acuerdo |
| `orden de compra`, `orden_compra`, `oc` | Orden de Compra |
| `cierre`, `acta de cierre` | Finalizado |

**Lógica de Avance:**
- El sistema solo avanzará el estado si el estado objetivo tiene un `orden` mayor que el estado actual.
- Si el documento no corresponde a un avance o el evento ya está en un estado más avanzado, no se realiza ningún cambio.
- La lógica está centralizada en `workflowService.ts`.

### 4. **Validaciones Especiales para Transiciones**
- **Para "Facturado"**: Se debe validar que todos los ingresos asociados al evento estén marcados como facturados.
- **Para "Pagado"**: Se debe validar que el evento ya haya pasado por el estado "Facturado".

## 🛠️ Archivos Clave Implementados

| Archivo | Rol Principal |
|---------|---------------|
| `src/modules/eventos/services/workflowService.ts` | **NUEVO/CENTRAL** - Contiene toda la lógica de negocio para el flujo de estados: `changeEventState`, `advanceStateOnDocumentUpload`, `cancelEvent`, y validaciones. |
| `src/modules/eventos/components/EventoDetailModal.tsx` | Orquesta la interacción del usuario. Llama al `workflowService` para subir documentos y cancelar eventos. |
| `src/modules/eventos/components/documents/EventDocumentUpload.tsx` | Componente de UI para la subida de archivos. Notifica al `EventoDetailModal` tras una subida exitosa. |
| `src/core/types/database.ts` | Define los tipos de TypeScript para la base de datos, crucial para la seguridad de tipos en los servicios. |
| `src/services/auditService.ts` | Registra cada cambio de estado en un log de auditoría para trazabilidad. |

## 🧪 Cómo Probar las Nuevas Funcionalidades

### Prueba 1: Avance Automático por Subida de Documento
1.  **Crear un evento nuevo.** Se encontrará en estado "Borrador".
2.  **Abrir el modal de detalles del evento** y navegar a la pestaña "Archivos".
3.  **Subir un archivo** con el nombre `contrato_firmado.pdf`.
4.  **Resultado Esperado**:
    -   Aparecerá una alerta indicando: `¡Estado actualizado! Nuevo estado: Acuerdo`.
    -   Al refrescar, el flujo de estados visual mostrará "Acuerdo" como el estado actual.
5.  **Repetir el proceso** en el estado "Acuerdo" subiendo un archivo llamado `orden_de_compra_123.pdf`. El estado debería cambiar a "Orden de Compra".

### Prueba 2: Cancelación de Evento
1.  **Abrir el modal de detalles** de cualquier evento que no esté ya cancelado.
2.  **Hacer clic en el botón rojo "Cancelar Evento"** en la esquina superior derecha.
3.  **Ingresar un motivo** en el cuadro de diálogo del navegador (ej: "Error en la planificación").
4.  **Resultado Esperado**:
    -   Aparecerá una alerta: `Evento cancelado exitosamente.`.
    -   El modal se cerrará y la lista de eventos se refrescará.
    -   Al volver a abrir el evento, su estado será "Cancelado" y el botón de cancelar ya no debería ser la acción principal.

### Prueba 3: Verificación en Auditoría
1.  Después de realizar un cambio de estado (automático o por cancelación), ir a la base de datos de Supabase.
2.  **Ejecutar la siguiente consulta**:
    ```sql
    SELECT * FROM core_audit_log 
    WHERE entity_id = '[ID_DEL_EVENTO]' AND action = 'estado_cambiado'
    ORDER BY timestamp DESC;
    ```
3.  **Resultado Esperado**: Deberías ver un registro por cada cambio de estado, con detalles en las columnas `old_value` y `new_value` que explican la transición, incluyendo el motivo de la cancelación.

---

**Última actualización**: 2025-10-04
**Versión**: 2.1
**Estado**: Implementado y documentado.
