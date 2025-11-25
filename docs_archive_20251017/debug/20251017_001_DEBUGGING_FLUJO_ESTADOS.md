# 🐛 Guía de Debugging - Flujo de Estados

## ✅ Cambios Aplicados

Se agregaron logs detallados y invalidación de queries para que el cambio de estado se refleje inmediatamente.

### 🔍 Cómo Verificar que Funciona

#### 1. **Abrir la Consola del Navegador**
- Presiona `F12` o `Ctrl+Shift+I` (Windows/Linux)
- Presiona `Cmd+Option+I` (Mac)
- Ve a la pestaña **"Console"**

#### 2. **Crear o Abrir un Evento**
1. Ir a la sección de Eventos
2. Crear un nuevo evento o abrir uno existente
3. El evento debe estar en estado **"Borrador"** inicialmente

#### 3. **Subir un Contrato**
1. En la sección de "Documentos vinculados"
2. Click en el botón de subir archivo para **"Contrato-Acuerdo"**
3. Seleccionar un archivo PDF
4. Subir el archivo

#### 4. **Verificar Logs en Consola**

Debes ver esta secuencia de mensajes:

```
[AUTOAVANCE] contrato [Function]
[AUTOAVANCE] Documento "contrato" subido. Avanzando de "Borrador" → "Acuerdo"
[ESTADO ACTUALIZADO] Evento "Nombre del Evento" → Acuerdo
[RECARGA] Recargando página para reflejar cambios...
```

#### 5. **Verificar Cambios en la UI**

**ANTES de la recarga (0.8 segundos):**
- ✅ Toast verde: "✅ Documento cargado y evento avanzado al paso correspondiente."
- ✅ Toast verde: "✅ Estado actualizado a: Acuerdo"

**DESPUÉS de la recarga:**
- ✅ Tab "Estados" debe mostrar el estado actual como **"Acuerdo"**
- ✅ Tab "Resumen" debe mostrar el estado como **"Acuerdo"**
- ✅ Badge de estado debe tener el color correspondiente (#3B82F6 - Azul)

## 🧪 Casos de Prueba

### Test 1: Borrador → Acuerdo
```
Estado inicial: Borrador
Acción: Subir Contrato
Resultado esperado: Estado = Acuerdo
Logs esperados:
  - [AUTOAVANCE] Documento "contrato" subido...
  - [ESTADO ACTUALIZADO] ... → Acuerdo
```

### Test 2: Acuerdo → Orden de Compra
```
Estado inicial: Acuerdo
Acción: Subir Orden de Compra
Resultado esperado: Estado = Orden de Compra
Logs esperados:
  - [AUTOAVANCE] Documento "orden_compra" subido...
  - [ESTADO ACTUALIZADO] ... → Orden de Compra
```

### Test 3: En Ejecución → Finalizado
```
Estado inicial: En Ejecución (avanzar manualmente)
Acción: Subir Cierre de Evento
Resultado esperado: Estado = Finalizado
Logs esperados:
  - [AUTOAVANCE] Documento "cierre_evento" subido...
  - [ESTADO ACTUALIZADO] ... → Finalizado
```

### Test 4: No Retroceso
```
Estado inicial: Orden de Compra
Acción: Subir Contrato (nuevamente)
Resultado esperado: NO cambia de estado
Logs esperados:
  - [AUTOAVANCE] Estado actual "Orden de Compra" ya está después de "Acuerdo"...
```

## ❌ Problemas Comunes

### Problema 1: No se ve ningún log
**Causa**: La función `onAutoAdvance` no está siendo pasada correctamente

**Verificar**:
```javascript
// Buscar en consola del navegador:
[AUTOAVANCE] contrato [Function]
```

Si NO ves este log, significa que `DocumentosEvento` NO está recibiendo la prop `onAutoAdvance`.

**Solución**: Verificar que `WorkflowStatusManager` esté pasando la prop:
```typescript
<DocumentosEvento
  eventoId={evento.id}
  estadoActual={evento.estado_id}
  onAutoAdvance={handleAutoAdvance}  // <-- Debe estar presente
/>
```

### Problema 2: El log aparece pero el estado no cambia
**Causa**: Error al buscar el estado en la base de datos

**Verificar en consola**:
```
Error obteniendo estado objetivo "Acuerdo": ...
```

**Solución**:
1. Verificar que la migración SQL se ejecutó correctamente
2. Ejecutar en Supabase SQL Editor:
```sql
SELECT nombre FROM evt_estados WHERE nombre = 'Acuerdo';
```

### Problema 3: Estado cambia pero no se refleja en UI
**Causa**: Las queries no se están invalidando

**Verificar**:
- El estado SI cambia en la base de datos
- Pero la UI muestra el estado antiguo

**Solución**: Esperar 0.8 segundos, la página debería recargar automáticamente.

### Problema 4: La página no recarga
**Causa**: JavaScript bloqueado o error en el código

**Verificar en consola**:
```
[RECARGA] Recargando página para reflejar cambios...
```

Si NO ves este log, hay un error anterior que está bloqueando la ejecución.

**Solución**:
1. Revisar errores en consola (texto en rojo)
2. Recargar manualmente la página con `F5`

## 🔍 Queries SQL de Verificación

### Ver estado actual de un evento
```sql
SELECT
  e.id,
  e.nombre_proyecto,
  e.estado_id,
  es.nombre as estado_nombre,
  es.orden
FROM evt_eventos e
JOIN evt_estados es ON e.estado_id = es.id
WHERE e.id = TU_EVENTO_ID;
```

### Ver documentos subidos
```sql
SELECT
  d.id,
  d.nombre,
  d.path,
  d.created_at,
  e.nombre_proyecto,
  es.nombre as estado_actual
FROM evt_documentos d
JOIN evt_eventos e ON d.evento_id = e.id
JOIN evt_estados es ON e.estado_id = es.id
WHERE d.evento_id = TU_EVENTO_ID
ORDER BY d.created_at DESC;
```

### Ver todos los estados disponibles
```sql
SELECT * FROM evt_estados ORDER BY orden;
```

## 📊 Timeline Esperado

```
T+0.0s  Usuario sube documento
T+0.1s  [AUTOAVANCE] Documento "contrato" subido...
T+0.2s  Base de datos actualizada (estado_id cambia)
T+0.3s  [ESTADO ACTUALIZADO] ... → Acuerdo
T+0.4s  Queries invalidadas
T+0.5s  Toast: "Estado actualizado a: Acuerdo"
T+0.8s  [RECARGA] Recargando página...
T+1.0s  Página recargada, UI muestra nuevo estado
```

## ✅ Checklist de Verificación

Antes de reportar un problema, verifica:

- [ ] La migración SQL fue ejecutada (`EJECUTAR_MIGRACIONES.sql`)
- [ ] Los estados tienen los nombres correctos en la BD
- [ ] La consola del navegador está abierta
- [ ] No hay errores en rojo en la consola
- [ ] El archivo es un PDF válido
- [ ] El evento NO está en estado "Cancelado"
- [ ] El navegador permite JavaScript y recargas

## 🚀 Si Todo Funciona Correctamente

Deberías ver:

1. ✅ **Logs claros en consola** mostrando cada paso
2. ✅ **Toasts verdes** confirmando el cambio
3. ✅ **Recarga automática** en menos de 1 segundo
4. ✅ **Estado actualizado** en tab "Estados" y "Resumen"
5. ✅ **Badge de color** correcto según el nuevo estado
6. ✅ **Visualización del workflow** actualizada

## 📝 Reportar Problemas

Si algo no funciona, copia estos datos:

```
1. Navegador y versión: [ej. Chrome 120]
2. Estado inicial del evento: [ej. Borrador]
3. Tipo de documento subido: [ej. Contrato]
4. Logs completos de consola: [copiar todo el texto]
5. Errores en rojo: [copiar el stack trace completo]
6. Capturas de pantalla: [adjuntar si es posible]
```

---

**Última actualización**: 2025-10-04
**Versión de debugging**: 1.0
