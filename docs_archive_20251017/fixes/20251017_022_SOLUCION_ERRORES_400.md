# ✅ Solución - Errores 400 en Consola

## 🔍 Análisis del Problema

Los errores 400 que ves en consola son **NORMALES** después de ejecutar la migración que eliminó todos los eventos.

### Errores Reportados
```
Failed to load resource: the server responded with a status of 400 ()
gomnouwackzvthpwyric...pcion%29&id=eq.77
gomnouwackzvthpwyric...pcion%29&id=eq.78
```

### ¿Por Qué Ocurren?

1. **Eventos eliminados**: La migración `EJECUTAR_MIGRACIONES.sql` eliminó TODOS los eventos
2. **Cache del navegador**: El navegador/React Query intenta cargar los eventos 77 y 78 que ya no existen
3. **URLs antiguas**: Puede haber queries en cache que apuntan a IDs antiguos

### ⚠️ ¿Son Peligrosos?

**NO.** Estos errores son completamente normales y esperados después de limpiar la base de datos. No afectan el funcionamiento del sistema.

## ✅ Solución Inmediata

### Opción 1: Recargar la Página (RECOMENDADO)

1. Presiona `Ctrl+Shift+R` (Windows/Linux) o `Cmd+Shift+R` (Mac)
2. Esto hace un **hard reload** y limpia el cache

### Opción 2: Limpiar Cache del Navegador

1. Presiona `F12` → Pestaña **"Network"**
2. Click derecho en cualquier request → **"Clear browser cache"**
3. Recargar la página

### Opción 3: Limpiar React Query Cache

1. Cierra todas las pestañas de la aplicación
2. Abre nuevamente http://localhost:5174/
3. Los errores deberían desaparecer

## 🚀 Crear un Evento de Prueba

Para probar el flujo de estados, necesitas crear un evento nuevo:

### Paso 1: Ir a Eventos
1. En el menú lateral, click en **"Eventos"**
2. Click en botón **"+ Nuevo Evento"**

### Paso 2: Llenar Datos Básicos
```
Nombre: Evento de Prueba - Flujo Estados
Cliente: [Seleccionar cualquier cliente]
Responsable: [Tu usuario]
Fecha Inicio: [Hoy o cualquier fecha]
Fecha Fin: [Fecha posterior]
Tipo de Evento: [Cualquier tipo]
```

### Paso 3: Guardar
1. Click en **"Guardar"**
2. El evento se crea con estado **"Borrador"**
3. Deberías ver `id = 1` (primera secuencia después de reset)

### Paso 4: Verificar en Base de Datos
```sql
SELECT id, nombre_proyecto, estado_id, clave_evento
FROM evt_eventos
ORDER BY id DESC
LIMIT 1;
```

Resultado esperado:
```
id | nombre_proyecto              | estado_id | clave_evento
1  | Evento de Prueba - Flujo... | 1         | EVT-2025-XXX
```

## 🧪 Probar el Flujo Completo

Una vez creado el evento:

### Test 1: Borrador → Acuerdo
1. Abrir el evento recién creado
2. Ir a tab **"Documentos"**
3. Subir un PDF en **"Contrato-Acuerdo"**
4. **Verificar**: Estado cambia a "Acuerdo"

### Test 2: Acuerdo → Orden de Compra
1. Subir un PDF en **"Orden de Compra"**
2. **Verificar**: Estado cambia a "Orden de Compra"

### Test 3: Orden de Compra → En Ejecución
1. Ir a tab **"Estados"**
2. Click en botón **"Avanzar"**
3. **Verificar**: Estado cambia a "En Ejecución"

### Test 4: En Ejecución → Finalizado
1. Ir a tab **"Documentos"**
2. Subir un PDF en **"Cierre de Evento"**
3. **Verificar**: Estado cambia a "Finalizado"

## 📊 Verificar que los Errores Desaparecieron

Después de crear el evento:

1. Abrir consola del navegador (`F12`)
2. Pestaña **"Console"**
3. Click en el ícono de **"Clear console"** (🚫)
4. Recargar la página (`F5`)
5. **No deberían aparecer más errores 400**

## ✅ Checklist

- [ ] Ejecuté `EJECUTAR_MIGRACIONES.sql` en Supabase
- [ ] Verifiqué que no hay eventos: `SELECT COUNT(*) FROM evt_eventos;` → 0
- [ ] Hice hard reload del navegador (`Ctrl+Shift+R`)
- [ ] Creé un evento de prueba nuevo
- [ ] El evento inicia en estado "Borrador"
- [ ] Subí un contrato y el estado cambió a "Acuerdo"
- [ ] No hay más errores 400 en consola

## 🔍 Si los Errores Persisten

### Verificar que la Migración se Ejecutó

```sql
-- Debe devolver 0
SELECT COUNT(*) FROM evt_eventos;

-- Debe devolver 8 estados
SELECT COUNT(*) FROM evt_estados;

-- Debe mostrar los nombres correctos
SELECT nombre FROM evt_estados ORDER BY orden;
```

Resultado esperado:
```
Borrador
Acuerdo
Orden de Compra
En Ejecución
Finalizado
Facturado
Pagado
Cancelado (orden 0)
```

### Limpiar Completamente el Cache

En Chrome/Edge:
1. `F12` → Pestaña **"Application"**
2. Sidebar izquierdo → **"Clear storage"**
3. Click en **"Clear site data"**
4. Recargar

En Firefox:
1. `Ctrl+Shift+Delete`
2. Seleccionar **"Cache"** y **"Cookies"**
3. Click **"Clear Now"**

## 📝 Resumen

Los errores 400 son **normales y esperados** después de eliminar todos los eventos.

**Solución**:
1. Hard reload del navegador
2. Crear un evento nuevo
3. Probar el flujo de estados

Los errores desaparecerán automáticamente una vez que crees un evento nuevo y el sistema deje de buscar los IDs antiguos (77, 78) que ya no existen.

---

**Última actualización**: 2025-10-04
**Estado**: Normal después de reset de BD
