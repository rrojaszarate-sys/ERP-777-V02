# 📦 Archivos de Respaldo - Módulo Eventos

## 📅 Fecha de Respaldo: 2025-10-29

### 📁 Archivos Movidos a Respaldo:

1. **EventosListPage.tsx**
   - Versión antigua sin dashboard financiero completo
   - ❌ Reemplazado por: `EventosListPageNew.tsx`
   - Motivo: Consolidación de versiones

2. **pages/EventsListPage.tsx.bak**
   - Copia de seguridad de archivo duplicado
   - ❌ No se usa en App.tsx
   - Motivo: Archivo duplicado innecesario

### ✅ Archivo Activo Actual:

**📍 Archivo Principal de Lista:**
- `src/modules/eventos/EventosListPageNew.tsx` 
- ✅ Usado en `App.tsx`
- ✅ Incluye dashboard financiero completo
- ✅ Integración con vista de análisis financiero

**📍 Formulario Principal:**
- `src/modules/eventos/components/EventoModal.tsx`
- ✅ Formulario con 4 provisiones divididas:
  - provision_combustible_peaje
  - provision_materiales
  - provision_recursos_humanos
  - provision_solicitudes_pago
- ✅ Campos correctos según base de datos
- ✅ Estado calculado automáticamente (no editable)
- ✅ Clave de evento generada automáticamente

### 🔧 Correcciones Aplicadas en EventoModal:

#### ❌ Eliminados (no existen en BD):
- `presupuesto_estimado` → Ya no existe
- `estado_id` editable → Se calcula automáticamente
- `status_pago` editable → Manejado por el flujo
- `notas` → Cambió a `notas_internas`

#### ✅ Campos Correctos:
- `nombre_proyecto` (requerido)
- `tipo_evento_id`
- `cliente_id` (requerido para generar clave)
- `responsable_id` (requerido)
- `solicitante_id`
- `fecha_evento` (requerido)
- `fecha_fin` (opcional - eventos de múltiples días)
- `hora_inicio`, `hora_fin`
- `ubicacion`
- `ganancia_estimada` (ingreso esperado)
- `provision_combustible_peaje`
- `provision_materiales`
- `provision_recursos_humanos`
- `provision_solicitudes_pago`
- `descripcion`
- `notas_internas`

### 📊 Generación Automática de Clave de Evento:

**Formato:** `EVT-{SUFIJO_CLIENTE}-{AÑO}-{####}`

**Ejemplo:**
- Cliente: "ACME Corp" (sufijo: "ACM")
- Fecha: 2025-10-29
- Resultado: **EVT-ACM-2025-0001**

La clave se genera automáticamente en el backend al crear el evento.

### 🚫 Razón del Respaldo:

Múltiples archivos duplicados causaban:
- ❌ Confusión sobre cuál versión estaba activa
- ❌ Cambios aplicados en archivo incorrecto
- ❌ Caché mostrando versiones antiguas
- ❌ Tiempo perdido debuggeando versiones incorrectas

### ✅ Solución:

- ✅ Consolidación en una sola versión definitiva
- ✅ Archivos antiguos respaldados pero fuera del flujo
- ✅ Documentación clara del estado actual
- ✅ Campos alineados con esquema de base de datos

---

**🔒 IMPORTANTE:** No modificar estos archivos de respaldo. 
Si necesitas referencia de código antiguo, consúltalo aquí pero 
**NO** lo copies al código activo sin revisar primero.

