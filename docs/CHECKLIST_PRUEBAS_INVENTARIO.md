# 📋 CHECKLIST DE PRUEBAS MANUALES - MÓDULO DE INVENTARIO

## 🎯 Objetivo
Este documento detalla las pruebas manuales que debe realizar un usuario para verificar el correcto funcionamiento del módulo de inventario ERP.

**URL de la aplicación:** http://localhost:5176/inventario

**Tiempo estimado:** 30-45 minutos

---

## ✅ PRE-REQUISITOS

- [ ] Servidor corriendo (`npm run dev`)
- [ ] Base de datos Supabase activa
- [ ] Navegador moderno (Chrome/Firefox/Edge)

---

## 1️⃣ DASHBOARD DE INVENTARIO

### Acceso: `/inventario`

| # | Prueba | Resultado Esperado | ✓/✗ |
|---|--------|-------------------|-----|
| 1.1 | Cargar dashboard | Se muestra el dashboard con estadísticas | |
| 1.2 | Ver cards de resumen | Se muestran: Almacenes, Productos, Stock, Movimientos | |
| 1.3 | Verificar navegación lateral | Menú con todos los submódulos visible | |
| 1.4 | Botón de Configuración | Icono de engranaje visible y funcional | |
| 1.5 | Botón de Alertas | Icono de campana visible | |
| 1.6 | Ayuda/Guía | Botón de ayuda abre guía de uso | |

**Observaciones:**
```
_____________________________________________________________________
```

---

## 2️⃣ ALMACENES

### Acceso: `/inventario/almacenes`

| # | Prueba | Resultado Esperado | ✓/✗ |
|---|--------|-------------------|-----|
| 2.1 | Ver lista de almacenes | Tabla con almacenes existentes | |
| 2.2 | Buscar almacén | Campo de búsqueda filtra resultados | |
| 2.3 | **CREAR** almacén | Click en "Nuevo", llenar formulario, guardar | |
| 2.4 | **EDITAR** almacén | Click en editar, modificar datos, guardar | |
| 2.5 | **ELIMINAR** almacén | Click en eliminar, confirmar, se elimina | |
| 2.6 | Validación de campos | Campos requeridos muestran error si vacíos | |

**Datos de prueba para crear:**
- Código: `ALM-TEST-001`
- Nombre: `Almacén de Prueba`
- Tipo: `General`
- Dirección: `Calle Test 123`

**Observaciones:**
```
_____________________________________________________________________
```

---

## 3️⃣ PRODUCTOS

### Acceso: `/inventario/productos`

| # | Prueba | Resultado Esperado | ✓/✗ |
|---|--------|-------------------|-----|
| 3.1 | Ver lista de productos | Tabla con productos existentes | |
| 3.2 | Buscar producto | Campo de búsqueda filtra por nombre/clave | |
| 3.3 | **CREAR** producto | Click en "Nuevo", llenar formulario, guardar | |
| 3.4 | **EDITAR** producto | Click en editar, modificar datos, guardar | |
| 3.5 | **ELIMINAR** producto | Click en eliminar, confirmar (solo sin stock) | |
| 3.6 | Ver detalle de producto | Click en producto muestra detalles | |
| 3.7 | Filtrar por categoría | Selector de categoría filtra productos | |

**Datos de prueba para crear:**
- Clave: `PROD-TEST-001`
- Nombre: `Producto de Prueba`
- Unidad: `Pieza`
- Costo: `100.00`
- Precio: `150.00`

**Observaciones:**
```
_____________________________________________________________________
```

---

## 4️⃣ DOCUMENTOS DE INVENTARIO ⭐ (FUNCIONALIDAD PRINCIPAL)

### Acceso: `/inventario/documentos`

| # | Prueba | Resultado Esperado | ✓/✗ |
|---|--------|-------------------|-----|
| 4.1 | Ver lista de documentos | Tabla con documentos existentes | |
| 4.2 | Filtrar por tipo | Dropdown filtra Entrada/Salida | |
| 4.3 | Filtrar por estado | Dropdown filtra Borrador/Confirmado/Cancelado | |
| 4.4 | Filtrar por fechas | Rango de fechas filtra resultados | |

### CREAR DOCUMENTO DE ENTRADA

| # | Prueba | Resultado Esperado | ✓/✗ |
|---|--------|-------------------|-----|
| 4.5 | Click "Nueva Entrada" | Abre formulario de entrada | |
| 4.6 | Seleccionar almacén | Dropdown con almacenes disponibles | |
| 4.7 | Seleccionar fecha | Selector de fecha funcional | |
| 4.8 | Agregar producto | Buscar y agregar producto con cantidad | |
| 4.9 | Agregar múltiples productos | Se pueden agregar varios productos | |
| 4.10 | Modificar cantidad | Editar cantidad de producto agregado | |
| 4.11 | Eliminar producto de lista | Botón X elimina producto de la lista | |
| 4.12 | **GUARDAR BORRADOR** | Guardar documento en estado borrador | |
| 4.13 | **CANCELAR MODAL** | Botón Cancelar cierra el formulario | |

### FIRMAS Y CONFIRMACIÓN

| # | Prueba | Resultado Esperado | ✓/✗ |
|---|--------|-------------------|-----|
| 4.14 | Agregar nombre quien entrega | Campo de texto funcional | |
| 4.15 | Agregar firma quien entrega | Pad de firma funcional | |
| 4.16 | Agregar nombre quien recibe | Campo de texto funcional | |
| 4.17 | Agregar firma quien recibe | Pad de firma funcional | |
| 4.18 | Limpiar firma | Botón limpiar borra firma | |
| 4.19 | **CONFIRMAR DOCUMENTO** | Con ambas firmas, botón confirmar habilita | |

### PDF FIRMADO ⭐ (NUEVA FUNCIONALIDAD)

| # | Prueba | Resultado Esperado | ✓/✗ |
|---|--------|-------------------|-----|
| 4.20 | Ver sección PDF | Sección "Documento Firmado (PDF)" visible | |
| 4.21 | Subir PDF | Click en subir, seleccionar PDF, carga correctamente | |
| 4.22 | Visualizar PDF subido | Se muestra nombre del archivo y fecha | |
| 4.23 | Descargar/Ver PDF | Link para ver/descargar PDF funciona | |
| 4.24 | Eliminar PDF | Botón eliminar quita el PDF adjunto | |
| 4.25 | Validación tipo archivo | Solo acepta archivos PDF | |
| 4.26 | Validación tamaño | Rechaza archivos mayores a 10MB | |

### CREAR DOCUMENTO DE SALIDA

| # | Prueba | Resultado Esperado | ✓/✗ |
|---|--------|-------------------|-----|
| 4.27 | Click "Nueva Salida" | Abre formulario de salida | |
| 4.28 | Proceso similar a entrada | Todos los pasos funcionan igual | |
| 4.29 | Validar stock disponible | No permite salida mayor al stock | |

### ACCIONES SOBRE DOCUMENTOS

| # | Prueba | Resultado Esperado | ✓/✗ |
|---|--------|-------------------|-----|
| 4.30 | Ver documento existente | Click en ver muestra detalles (solo lectura) | |
| 4.31 | Editar borrador | Click editar abre formulario editable | |
| 4.32 | Imprimir/PDF | Genera PDF del documento | |
| 4.33 | Cancelar documento | Confirmar, cambia estado a Cancelado | |
| 4.34 | Eliminar borrador | Solo borradores pueden eliminarse | |

**Observaciones:**
```
_____________________________________________________________________
```

---

## 5️⃣ STOCK

### Acceso: `/inventario/stock`

| # | Prueba | Resultado Esperado | ✓/✗ |
|---|--------|-------------------|-----|
| 5.1 | Ver stock por almacén | Selector de almacén cambia vista | |
| 5.2 | Ver stock consolidado | Opción "Todos los almacenes" muestra total | |
| 5.3 | Buscar producto | Filtro por nombre/clave funciona | |
| 5.4 | Ver stock bajo | Productos bajo mínimo resaltados | |
| 5.5 | Exportar stock | Botón exportar genera archivo | |

**Observaciones:**
```
_____________________________________________________________________
```

---

## 6️⃣ MOVIMIENTOS

### Acceso: `/inventario/movimientos`

| # | Prueba | Resultado Esperado | ✓/✗ |
|---|--------|-------------------|-----|
| 6.1 | Ver histórico | Lista de movimientos ordenados por fecha | |
| 6.2 | Filtrar por tipo | Entrada/Salida/Ajuste | |
| 6.3 | Filtrar por producto | Buscar movimientos de un producto | |
| 6.4 | Filtrar por fechas | Rango de fechas funciona | |
| 6.5 | Ver detalle | Click muestra documento origen | |

**Observaciones:**
```
_____________________________________________________________________
```

---

## 7️⃣ ETIQUETAS QR

### Acceso: `/inventario/etiquetas`

| # | Prueba | Resultado Esperado | ✓/✗ |
|---|--------|-------------------|-----|
| 7.1 | Ver lista de productos | Productos con checkbox para seleccionar | |
| 7.2 | Seleccionar productos | Checkboxes funcionan correctamente | |
| 7.3 | Seleccionar todos | Botón seleccionar todo funciona | |
| 7.4 | Generar etiquetas | Botón genera etiquetas QR | |
| 7.5 | Vista previa | Se muestra preview de etiquetas | |
| 7.6 | Imprimir etiquetas | Abre diálogo de impresión | |
| 7.7 | Configurar tamaño | Opciones de tamaño de etiqueta | |

**Observaciones:**
```
_____________________________________________________________________
```

---

## 8️⃣ CONFIGURACIÓN

### Acceso: `/inventario/configuracion`

| # | Prueba | Resultado Esperado | ✓/✗ |
|---|--------|-------------------|-----|
| 8.1 | Ver submódulos | Lista de todos los submódulos | |
| 8.2 | Toggle activar/desactivar | Switches funcionan | |
| 8.3 | Guardar configuración | Cambios se persisten | |
| 8.4 | Menú refleja cambios | Submódulos desactivados se ocultan | |

**Observaciones:**
```
_____________________________________________________________________
```

---

## 9️⃣ TRANSFERENCIAS

### Acceso: `/inventario/transferencias`

| # | Prueba | Resultado Esperado | ✓/✗ |
|---|--------|-------------------|-----|
| 9.1 | Ver transferencias | Lista de transferencias existentes | |
| 9.2 | Nueva transferencia | Formulario de nueva transferencia | |
| 9.3 | Seleccionar origen | Almacén de origen seleccionable | |
| 9.4 | Seleccionar destino | Almacén de destino seleccionable | |
| 9.5 | Agregar productos | Productos con cantidad a transferir | |
| 9.6 | Confirmar transferencia | Ejecuta transferencia de stock | |

**Observaciones:**
```
_____________________________________________________________________
```

---

## 🔟 KARDEX

### Acceso: `/inventario/kardex`

| # | Prueba | Resultado Esperado | ✓/✗ |
|---|--------|-------------------|-----|
| 10.1 | Seleccionar producto | Dropdown con productos | |
| 10.2 | Ver movimientos | Historial de entradas/salidas | |
| 10.3 | Ver saldo acumulado | Columna de saldo actualizado | |
| 10.4 | Filtrar por fechas | Rango de fechas funciona | |
| 10.5 | Exportar | Botón exportar genera reporte | |

**Observaciones:**
```
_____________________________________________________________________
```

---

## 📝 RESUMEN DE PRUEBAS

| Sección | Total | Pasaron | Fallaron | % |
|---------|-------|---------|----------|---|
| Dashboard | 6 | | | |
| Almacenes | 6 | | | |
| Productos | 7 | | | |
| Documentos | 34 | | | |
| Stock | 5 | | | |
| Movimientos | 5 | | | |
| Etiquetas QR | 7 | | | |
| Configuración | 4 | | | |
| Transferencias | 6 | | | |
| Kardex | 5 | | | |
| **TOTAL** | **85** | | | |

---

## 🐛 BUGS ENCONTRADOS

| # | Sección | Descripción | Severidad | Estado |
|---|---------|-------------|-----------|--------|
| 1 | | | | |
| 2 | | | | |
| 3 | | | | |

**Severidad:** Crítico / Alto / Medio / Bajo

---

## 💡 SUGERENCIAS DE MEJORA

1. 
2. 
3. 

---

## 📅 INFORMACIÓN DE LA PRUEBA

- **Fecha:** ________________
- **Probador:** ________________
- **Navegador:** ________________
- **Versión app:** ________________
- **Duración:** ________________

---

## ✅ APROBACIÓN

- [ ] **APROBADO** - Todas las funcionalidades críticas funcionan correctamente
- [ ] **APROBADO CON OBSERVACIONES** - Funciona con bugs menores
- [ ] **RECHAZADO** - Bugs críticos encontrados

**Firma del probador:** ________________

**Fecha:** ________________
