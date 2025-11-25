# Resumen de Cambios - Flujo de Estados de Eventos v2.1

## Problema Original y Solución

**Problema:** La subida de documentos no provocaba un cambio de estado automático en el evento. La lógica estaba ausente o era incorrecta.

**Solución Implementada:**
1.  **Centralización de la Lógica:** Se creó un nuevo servicio, `workflowService.ts`, para manejar todas las operaciones relacionadas con el flujo de estados.
2.  **Avance Automático:** Se implementó la función `advanceStateOnDocumentUpload` que, basándose en palabras clave en el nombre del archivo, identifica un estado objetivo y avanza el evento si la transición es válida (es decir, si es un avance en el flujo).
3.  **Conexión con la UI:** El componente `EventoDetailModal.tsx` ahora utiliza este servicio. Tras una subida de archivo exitosa desde `EventDocumentUpload.tsx`, se invoca la lógica de avance automático.

## Nueva Funcionalidad: Cancelación de Eventos

**Requisito:** Permitir la cancelación de un evento desde cualquier punto del flujo de trabajo.

**Implementación:**
1.  **Lógica en el Servicio:** Se añadió la función `cancelEvent` en `workflowService.ts`. Esta función:
    -   Busca el estado "Cancelado" en la base de datos.
    -   Utiliza el método `changeEventState` para mover el evento a este estado final.
    -   Registra el motivo de la cancelación en el log de auditoría.
2.  **Interfaz de Usuario:**
    -   Se agregó un botón "Cancelar Evento" en el `EventoDetailModal.tsx`.
    -   Este botón solo es visible para usuarios con los permisos adecuados (`canDelete`).
    -   Al hacer clic, solicita al usuario un motivo para la cancelación y luego invoca al servicio.

## Cambios Clave en el Código

### 1. `src/modules/eventos/services/workflowService.ts` (Nuevo y Central)
-   **`advanceStateOnDocumentUpload`**: Contiene el mapeo de palabras clave de documentos a estados (`contrato` -> `Acuerdo`, `oc` -> `Orden de Compra`, etc.) y la lógica para validar y ejecutar el avance.
-   **`cancelEvent`**: Orquesta el proceso de cancelación, buscando el estado "Cancelado" y aplicando el cambio.
-   **`changeEventState`**: Método base que realiza la actualización en la base de datos y, crucialmente, registra la acción en `core_audit_log` a través del `auditService`.

### 2. `src/modules/eventos/components/EventoDetailModal.tsx`
-   Se añadió la función `handleDocumentUploadSuccess`, que se dispara cuando un documento se sube correctamente. Esta función es el "pegamento" que conecta la UI con el `workflowService`.
-   Se implementó `handleCancelEvent` para gestionar la interacción del usuario con el botón de cancelación.
-   Se utiliza el hook `useAuth` para obtener el `userId` necesario para los registros de auditoría.

### 3. `src/modules/eventos/components/documents/EventDocumentUpload.tsx`
-   Se modificó para aceptar una `prop` de callback, `onUploadSuccess`.
-   Cuando un archivo se sube y se registra en la base de datos, este callback se invoca, notificando al componente padre (`EventoDetailModal`) para que pueda iniciar el proceso de avance de estado.

## Flujo de Estados Actualizado

El flujo sigue siendo secuencial, pero ahora con puntos de entrada automáticos y una salida universal.

```
Borrador (1)
    ↓
Acuerdo (2)       ← Disparado por subida de archivo con "contrato" o "acuerdo"
    ↓
Orden de Compra (3) ← Disparado por subida de archivo con "orden de compra" u "oc"
    ↓
En Ejecución (4)
    ↓
Finalizado (5)      ← Disparado por subida de archivo con "cierre"
    ↓
Facturado (6)
    ↓
Pagado (7)

Cualquier Estado → Cancelado (0)  ← Disparado por el botón "Cancelar Evento"
```

## Pasos para Probar

1.  **Probar Avance Automático:**
    -   En un evento en estado "Borrador", sube un archivo llamado `contrato_cliente.pdf`.
    -   **Verificar:** El estado debe cambiar a "Acuerdo" y debe aparecer una alerta.
2.  **Probar Cancelación:**
    -   Abre cualquier evento.
    -   Haz clic en "Cancelar Evento", introduce un motivo.
    -   **Verificar:** El evento debe pasar al estado "Cancelado".
3.  **Verificar Auditoría:**
    -   En Supabase, consulta la tabla `core_audit_log` para el evento modificado.
    -   **Verificar:** Deben existir registros para cada cambio de estado, con el `action` igual a `estado_cambiado`. El campo `new_value` debe contener el motivo de la cancelación si aplica.

---
**Fecha de Actualización:** 2025-10-04
