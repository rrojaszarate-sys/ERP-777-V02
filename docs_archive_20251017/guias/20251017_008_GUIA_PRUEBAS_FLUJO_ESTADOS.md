# Guía de Pruebas - Flujo de Estados de Eventos v2.1

Esta guía describe cómo probar las funcionalidades de avance automático de estado y cancelación de eventos.

## Funcionalidades a Probar

1.  **Avance Automático de Estado por Subida de Documento**: Al subir un archivo con un nombre específico, el estado del evento debe avanzar automáticamente si la transición es válida.
2.  **Cancelación de Evento**: Un evento puede ser cancelado desde cualquier estado, moviéndolo a un estado final "Cancelado".

## Requisitos Previos

-   Asegúrate de que tu base de datos `evt_estados` contiene los estados correctos, incluyendo "Cancelado" con `orden = 0`.
-   Inicia la aplicación en modo de desarrollo (`npm run dev`).

## Cómo Probar el Sistema

### Prueba 1: Avance Automático

#### Escenario A: Subir un Contrato
1.  **Crea un nuevo evento.** Por defecto, estará en estado **"Borrador"**.
2.  Abre el modal de detalles del evento y navega a la pestaña **"Archivos"**.
3.  Sube un archivo con un nombre que contenga la palabra `contrato` (ej: `contrato_firmado_cliente.pdf`).
4.  **Resultado Esperado**:
    -   Debe aparecer una alerta del navegador: `¡Estado actualizado! Nuevo estado: Acuerdo`.
    -   El modal se refrescará y el visualizador de flujo de trabajo mostrará **"Acuerdo"** como el estado actual.

#### Escenario B: Subir una Orden de Compra
1.  Usando el mismo evento (que ahora está en estado "Acuerdo"), sube otro archivo.
2.  El nombre del archivo debe contener `orden de compra` o `oc` (ej: `OC-12345.pdf`).
3.  **Resultado Esperado**:
    -   Aparecerá la alerta: `¡Estado actualizado! Nuevo estado: Orden de Compra`.
    -   El flujo de trabajo se actualizará para mostrar **"Orden de Compra"** como el estado actual.

#### Escenario C: Intento de Retroceso
1.  Con el evento en estado "Orden de Compra", intenta subir nuevamente un archivo llamado `contrato_nuevo.pdf`.
2.  **Resultado Esperado**:
    -   **No debe ocurrir ningún cambio de estado.**
    -   Revisa la consola del navegador. Deberías ver un mensaje similar a: `El evento ya está en un estado igual o más avanzado. No se cambió el estado.`.

### Prueba 2: Cancelación de Evento

1.  Abre el modal de detalles de cualquier evento que no esté cancelado.
2.  Localiza y haz clic en el botón rojo **"Cancelar Evento"** en la esquina superior derecha del modal.
3.  Aparecerá un cuadro de diálogo del navegador pidiendo un motivo. Escribe algo como `Cancelado por solicitud del cliente`.
4.  **Resultado Esperado**:
    -   Aparecerá una alerta: `Evento cancelado exitosamente.`.
    -   El modal se cerrará.
    -   Al volver a abrir los detalles del evento, su estado será **"Cancelado"**. El botón de cancelar ya no debería ser la acción principal.

### Prueba 3: Verificación en la Base de Datos (Auditoría)

Cada cambio de estado queda registrado. Para verificarlo:

1.  Obtén el ID del evento que has estado probando.
2.  Ve al editor de SQL de Supabase y ejecuta la siguiente consulta, reemplazando `[ID_DEL_EVENTO]` por el ID real:

    ```sql
    SELECT 
      action,
      old_value,
      new_value,
      timestamp
    FROM core_audit_log
    WHERE entity_id = '[ID_DEL_EVENTO]' AND action = 'estado_cambiado'
    ORDER BY timestamp DESC;
    ```

3.  **Resultados Esperados**:
    -   Deberías ver una fila por cada cambio de estado que realizaste.
    -   Para el avance automático, `new_value` contendrá notas como `"Estado avanzado automáticamente por subida de documento: ..."`.
    -   Para la cancelación, `new_value` contendrá el motivo que ingresaste, ej: `"Evento cancelado. Motivo: Cancelado por solicitud del cliente"`.

## Debugging y Puntos Clave

-   **Toda la lógica de negocio está en `src/modules/eventos/services/workflowService.ts`**. Si algo falla, este es el primer lugar para buscar.
-   **La conexión UI-servicio está en `src/modules/eventos/components/EventoDetailModal.tsx`**. Revisa las funciones `handleDocumentUploadSuccess` y `handleCancelEvent`.
-   **Los errores se registran en la consola del navegador.** Búscalos si una acción no produce el resultado esperado.

---
**Fecha de Actualización:** 2025-10-04
