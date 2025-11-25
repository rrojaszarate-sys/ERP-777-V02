# 🧪 Pruebas del Módulo de Gestión de Eventos

**Fecha de Prueba**: 29 de Octubre de 2025  
**Servidor**: http://localhost:5174  
**Estado del Servidor**: ✅ ACTIVO (Puerto 5174)

---

## ✅ Checklist de Verificación

### 1. **Servidor de Desarrollo** ✅
- [x] Servidor iniciado exitosamente
- [x] Puerto: 5174 (5173 en uso)
- [x] Tiempo de inicio: 220 ms
- [x] Sin errores de compilación

### 2. **Navegación a Módulo de Eventos**
- [ ] Abrir navegador en http://localhost:5174
- [ ] Iniciar sesión (si es necesario)
- [ ] Navegar a: Eventos → Lista de Eventos
- [ ] Verificar que la página cargue sin errores

---

## 📋 Plan de Pruebas Detallado

### **PRUEBA 1: Carga Inicial del Módulo**

**Objetivo**: Verificar que el módulo cargue correctamente

**Pasos**:
1. Abrir http://localhost:5174
2. Navegar a "Eventos" → "Lista de Eventos"
3. Esperar a que cargue

**Resultados Esperados**:
- ✅ Página carga sin errores
- ✅ Se muestra el título "Gestión de Eventos"
- ✅ Se muestra el panel de filtros (Año, Mes, Cliente, Búsqueda)
- ✅ Se muestran 5 cards del dashboard
- ✅ Se muestra la tabla de eventos
- ✅ Botón "+ Nuevo Evento" visible (si hay permisos)

**Verificar en Consola**:
```
🔍 Cargando eventos desde vw_eventos_analisis_financiero...
✅ Eventos financieros cargados: X
📊 Calculando dashboard financiero...
✅ Dashboard calculado: { ... }
```

---

### **PRUEBA 2: Filtro por Año**

**Objetivo**: Verificar funcionamiento del filtro de año

**Pasos**:
1. En el panel de filtros, seleccionar dropdown "Año"
2. Cambiar de "2025" a "2024"
3. Observar cambios en la tabla y dashboard

**Resultados Esperados**:
- ✅ Dropdown muestra años: 2023, 2024, 2025, 2026, 2027
- ✅ Al seleccionar 2024:
  - Tabla se actualiza automáticamente
  - Solo muestra eventos del 2024
  - Dashboard recalcula sumatorias
  - Contador muestra: "Mostrando X eventos del año 2024"

**Verificar en Consola**:
```
🔍 Cargando eventos desde vw_eventos_analisis_financiero...
Filters: { año: 2024, ... }
```

---

### **PRUEBA 3: Filtro por Mes**

**Objetivo**: Verificar filtro combinado año + mes

**Pasos**:
1. Seleccionar Año: 2025
2. Seleccionar Mes: "Octubre"
3. Observar resultados

**Resultados Esperados**:
- ✅ Dropdown de mes muestra 12 meses
- ✅ Tabla muestra solo eventos de Octubre 2025
- ✅ Dashboard actualizado con datos de octubre
- ✅ Contador: "Mostrando X eventos del año 2025 - Octubre"

**SQL Esperado** (en consola de Supabase):
```sql
WHERE fecha_evento >= '2025-10-01'
  AND fecha_evento < '2025-11-01'
```

---

### **PRUEBA 4: Filtro por Cliente**

**Objetivo**: Verificar filtro de cliente

**Pasos**:
1. Abrir dropdown "Cliente"
2. Verificar que muestre lista de clientes
3. Seleccionar un cliente (ej: "Tech Corp")
4. Observar cambios

**Resultados Esperados**:
- ✅ Dropdown muestra todos los clientes activos
- ✅ Muestra nombre_comercial o razon_social
- ✅ Al seleccionar cliente:
  - Tabla filtra eventos de ese cliente
  - Dashboard muestra solo números de ese cliente
  - Contador: "... - Tech Corp" (o nombre seleccionado)

---

### **PRUEBA 5: Búsqueda General**

**Objetivo**: Verificar búsqueda en tiempo real

**Pasos**:
1. En campo de búsqueda, escribir: "Conferencia"
2. Observar filtrado en tiempo real

**Resultados Esperados**:
- ✅ Tabla filtra mientras se escribe
- ✅ Busca en: clave_evento, nombre_proyecto, cliente_nombre
- ✅ Dashboard se actualiza
- ✅ Búsqueda no distingue mayúsculas/minúsculas

**Pruebas adicionales**:
- Buscar por clave: "EVT-2024"
- Buscar por cliente: "Tech"
- Buscar por proyecto: "Workshop"

---

### **PRUEBA 6: Botón "Limpiar Filtros"**

**Objetivo**: Verificar reseteo de filtros

**Pasos**:
1. Aplicar múltiples filtros:
   - Año: 2024
   - Mes: Enero
   - Cliente: Tech Corp
   - Búsqueda: "test"
2. Click en botón "Limpiar Filtros"

**Resultados Esperados**:
- ✅ Botón solo aparece cuando hay filtros activos
- ✅ Al hacer click:
  - Año vuelve a año actual (2025)
  - Mes: "Todos los meses"
  - Cliente: "Todos los clientes"
  - Búsqueda: vacía
- ✅ Tabla muestra todos los eventos del año actual

---

### **PRUEBA 7: Dashboard de Sumatorias**

**Objetivo**: Verificar cálculos del dashboard

**Pasos**:
1. Sin filtros: observar dashboard
2. Aplicar filtro de año 2025
3. Aplicar filtro de mes Octubre
4. Verificar que números cambien

**Verificar 5 Cards**:

#### Card 1: Total Eventos
- ✅ Muestra número correcto de eventos
- ✅ Icono: Calendario (azul)
- ✅ Actualiza con filtros

#### Card 2: Ingresos Totales
- ✅ Muestra suma de ingresos_totales
- ✅ Formato: $31,310,411.50
- ✅ Línea inferior: "Est: $X" (ingreso estimado)
- ✅ Color: Verde

#### Card 3: Gastos Totales
- ✅ Muestra suma de gastos_totales
- ✅ Formato: $X,XXX.XX
- ✅ Línea inferior: "Prov: $X" (provisiones)
- ✅ Color: Rojo

#### Card 4: Utilidad Total
- ✅ Muestra: ingresos_totales - gastos_totales
- ✅ Color verde si positivo, rojo si negativo
- ✅ Línea inferior: "Est: $X" (utilidad estimada)

#### Card 5: Margen Promedio
- ✅ Muestra promedio de margen_utilidad_real
- ✅ Formato: XX.X%
- ✅ Línea inferior: "Cobro: XX%" (tasa de cobro)
- ✅ Color: Púrpura

**Validar Cálculos**:
```javascript
// Sumar manualmente primeros 3 eventos de la tabla
// Comparar con card de Ingresos Totales
```

---

### **PRUEBA 8: Tabla de Eventos**

**Objetivo**: Verificar columnas y datos mostrados

**Verificar Columnas**:

1. **Clave** ✅
   - Formato: EVT-2024-XXXX
   - Fuente monospace
   - Ancho fijo ~100px

2. **Proyecto** ✅
   - Línea 1: Nombre del proyecto
   - Línea 2: Fecha (formato: DD/MM/YYYY)

3. **Cliente** ✅
   - Muestra nombre del cliente

4. **Estado** ✅
   - Badge con color
   - Muestra estado del evento

5. **Ingresos** ✅
   - Línea 1: Ingresos reales (verde, bold)
   - Línea 2: "Est: $X" si hay ingreso_estimado
   - Color verde si real >= estimado
   - Color amarillo si real < estimado

6. **Gastos** ✅
   - Línea 1: Gastos reales (rojo, bold)
   - Línea 2: "Prov: $X" si hay provisiones
   - Color verde si real <= provisiones
   - Color rojo si real > provisiones

7. **Utilidad** ✅
   - Línea 1: Utilidad (bold)
   - Línea 2: Margen % (XX.X%)
   - Color verde si positivo
   - Color rojo si negativo

8. **Cobro** ✅
   - Badge: "Cobrado" | "Parcial" | "Pendiente" | "Sin Ingresos"
   - Línea inferior: Porcentaje de cobro
   - Colores:
     - Verde: cobrado_completo
     - Amarillo: cobrado_parcial, pendiente_cobro
     - Gris: sin_ingresos

---

### **PRUEBA 9: Acciones en Eventos**

**Objetivo**: Verificar botones de acción

**Pasos**:
1. Hacer hover sobre una fila
2. Verificar botones de acción
3. Probar cada acción

**Botones de Acción**:

#### Ver Detalle (ojo) ✅
- ✅ Siempre visible
- ✅ Click abre EventoDetailModal
- ✅ Muestra información completa del evento

#### Editar (lápiz) ✅
- ✅ Solo visible si hay permiso de edición
- ✅ Click abre EventoModal en modo edición
- ✅ Campos pre-poblados con datos del evento

#### Eliminar (basura) ✅
- ✅ Solo visible si hay permiso de eliminación
- ✅ Color rojo
- ✅ Click muestra confirmación
- ✅ Confirmación elimina el evento
- ✅ Tabla se actualiza automáticamente

---

### **PRUEBA 10: Botón "Nuevo Evento"**

**Objetivo**: Verificar creación de eventos

**Pasos**:
1. Click en botón "+ Nuevo Evento"
2. Verificar modal que se abre
3. Verificar campos disponibles

**Resultados Esperados**:
- ✅ Botón visible en esquina superior derecha
- ✅ Solo visible con permisos de creación
- ✅ Click abre EventoModal vacío
- ✅ Modal incluye campos:
  - Nombre del proyecto
  - Cliente
  - Fecha del evento
  - Responsable
  - **Provisiones** (campo numérico)
  - Otros campos estándar

---

### **PRUEBA 11: Botones de Toolbar**

**Verificar Botones Superiores**:

#### Botón "Mostrar/Ocultar Filtros" ✅
- ✅ Alterna visibilidad del panel de filtros
- ✅ Texto cambia: "Ocultar" ↔ "Mostrar"
- ✅ Panel se colapsa/expande con animación

#### Botón "Exportar" ✅
- ✅ Visible siempre
- ✅ Click muestra: "Función de exportación en desarrollo"
- ✅ (TODO: Implementar exportación real)

---

### **PRUEBA 12: Responsive Design**

**Objetivo**: Verificar adaptación a diferentes tamaños

**Pasos**:
1. Probar en pantalla completa
2. Reducir ancho de ventana
3. Probar en mobile (F12 → modo responsive)

**Resultados Esperados**:
- ✅ Dashboard: 5 cards en desktop, stack en mobile
- ✅ Filtros: grid 4 columnas → 1 columna en mobile
- ✅ Tabla: scroll horizontal si es necesario
- ✅ Botones se reorganizan en mobile

---

### **PRUEBA 13: Rendimiento**

**Objetivo**: Verificar velocidad de carga y filtrado

**Métricas a Observar**:
- ✅ Tiempo de carga inicial: < 2 segundos
- ✅ Cambio de filtro: < 500ms
- ✅ Búsqueda en tiempo real: instantánea
- ✅ No hay lag al escribir

**Verificar en Console**:
- Sin errores de JavaScript
- Sin warnings de React
- Requests a Supabase exitosos

---

### **PRUEBA 14: Manejo de Errores**

**Escenarios a Probar**:

1. **Sin conexión a Supabase**:
   - ✅ Debe mostrar mensaje de error
   - ✅ No debe romper la aplicación

2. **Vista no existe**:
   - ✅ Debe mostrar error en consola
   - ✅ Debe usar fallback si está disponible

3. **Sin datos**:
   - ✅ Tabla vacía con mensaje: "No hay eventos"
   - ✅ Dashboard muestra ceros

---

### **PRUEBA 15: Comparaciones Visual (Real vs Estimado)**

**Objetivo**: Verificar códigos de color

**Casos a Verificar**:

#### Ingresos
- ✅ Real >= Estimado → Texto estimado en VERDE
- ✅ Real < Estimado → Texto estimado en AMARILLO

#### Gastos
- ✅ Real <= Provisiones → Texto provisión en VERDE
- ✅ Real > Provisiones → Texto provisión en ROJO

#### Utilidad
- ✅ Utilidad >= 0 → Texto en VERDE
- ✅ Utilidad < 0 → Texto en ROJO

---

## 📊 Registro de Resultados

### Ejecución de Pruebas

| # | Prueba | Estado | Notas |
|---|--------|--------|-------|
| 1 | Carga Inicial | ⏳ Pendiente | |
| 2 | Filtro Año | ⏳ Pendiente | |
| 3 | Filtro Mes | ⏳ Pendiente | |
| 4 | Filtro Cliente | ⏳ Pendiente | |
| 5 | Búsqueda | ⏳ Pendiente | |
| 6 | Limpiar Filtros | ⏳ Pendiente | |
| 7 | Dashboard | ⏳ Pendiente | |
| 8 | Tabla | ⏳ Pendiente | |
| 9 | Acciones | ⏳ Pendiente | |
| 10 | Nuevo Evento | ⏳ Pendiente | |
| 11 | Toolbar | ⏳ Pendiente | |
| 12 | Responsive | ⏳ Pendiente | |
| 13 | Rendimiento | ⏳ Pendiente | |
| 14 | Errores | ⏳ Pendiente | |
| 15 | Comparaciones | ⏳ Pendiente | |

**Leyenda**:
- ✅ Pasó
- ❌ Falló
- ⚠️ Pasó con observaciones
- ⏳ Pendiente

---

## 🐛 Bugs Encontrados

### Lista de Issues

| ID | Severidad | Descripción | Estado |
|----|-----------|-------------|--------|
| - | - | - | - |

**Severidades**:
- 🔴 Crítico (bloqueante)
- 🟡 Mayor (funcionalidad afectada)
- 🟢 Menor (cosmético)

---

## 📝 Notas Adicionales

### Observaciones Generales
- 

### Mejoras Sugeridas
- 

### Próximos Pasos
1. Ejecutar todas las pruebas en orden
2. Documentar resultados
3. Reportar bugs encontrados
4. Implementar correcciones
5. Re-ejecutar pruebas fallidas

---

## ✅ Aprobación Final

- [ ] Todas las pruebas pasaron exitosamente
- [ ] No hay bugs críticos
- [ ] Rendimiento aceptable
- [ ] UX cumple con requisitos
- [ ] Documentación completa

**Aprobado por**: _______________  
**Fecha**: _______________  
**Firma**: _______________

---

**Servidor activo en**: http://localhost:5174  
**Para detener**: Ctrl+C en la terminal
