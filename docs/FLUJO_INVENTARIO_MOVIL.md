# Flujo de Inventario con Escaneo Móvil

## Resumen del Sistema

Este documento describe el flujo completo de inventario con soporte para escaneo desde dispositivos móviles y continuación en computadora de escritorio.

## Arquitectura del Flujo

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────────┐
│   TELÉFONO      │────▶│    SUPABASE      │────▶│   COMPUTADORA       │
│                 │     │    (Realtime)    │     │                     │
│ MobileScanner   │     │ sesiones_movil_  │     │ SesionesMovilPage   │
│                 │     │ inventario       │     │                     │
└─────────────────┘     └──────────────────┘     └─────────────────────┘
```

## Componentes Creados

### 1. MobileScanner (`/src/modules/inventario-erp/pages/MobileScanner.tsx`)

Página optimizada para móvil que permite:
- Seleccionar almacén y tipo de movimiento (entrada/salida)
- Escanear códigos QR y de barras (EAN-13, UPC, Code-128)
- Buscar productos automáticamente por código escaneado
- Ingresar cantidades por producto
- Guardar sesión en localStorage para persistencia
- Enviar sesión a Supabase para procesamiento en desktop

**Ruta:** `/inventario/scanner/:tipo/:sessionId?`

### 2. SesionesMovilPage (`/src/modules/inventario-erp/pages/SesionesMovilPage.tsx`)

Página de escritorio para gestionar sesiones móviles:
- Ver sesiones pendientes en tiempo real
- Procesar sesiones convirtiéndolas en movimientos
- Generar códigos QR para iniciar nuevas sesiones
- Cancelar o eliminar sesiones
- Ver detalles de productos escaneados

**Ruta:** `/inventario/sesiones`

### 3. SesionReceiver (`/src/modules/inventario-erp/components/SesionReceiver.tsx`)

Componente reutilizable para recibir sesiones:
- Suscripción en tiempo real a cambios
- Notificaciones de nuevas sesiones
- Procesamiento de movimientos masivos

### 4. Tabla de Base de Datos (`sesiones_movil_inventario`)

```sql
CREATE TABLE sesiones_movil_inventario (
    id VARCHAR(100) PRIMARY KEY,
    tipo VARCHAR(20) NOT NULL,           -- 'entrada' | 'salida'
    almacen_id INTEGER NOT NULL,
    productos JSONB NOT NULL DEFAULT '[]',
    estado VARCHAR(20) NOT NULL DEFAULT 'activa',
    creado_por VARCHAR(255),
    notas TEXT,
    fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    fecha_actualizacion TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    fecha_completado TIMESTAMP WITH TIME ZONE,
    movimientos_ids INTEGER[]
);
```

## Flujo de Uso

### Desde el Teléfono:

1. **Acceder al Scanner**
   - Abrir URL: `https://tu-app.com/inventario/scanner/entrada` o `/salida`
   - O escanear QR generado desde el escritorio

2. **Configurar Sesión**
   - Seleccionar almacén destino
   - Elegir tipo de movimiento (entrada/salida)
   - Presionar "Iniciar Sesión"

3. **Escanear Productos**
   - Apuntar la cámara al código de barras/QR
   - El producto se busca automáticamente
   - Ingresar cantidad
   - Repetir para cada producto

4. **Finalizar**
   - Presionar "Enviar a PC"
   - La sesión queda como "pendiente"
   - Se puede compartir link para continuar en desktop

### Desde la Computadora:

1. **Acceder a Sesiones**
   - Navegar a: `/inventario/sesiones`

2. **Ver Sesiones Pendientes**
   - Las sesiones aparecen en tiempo real
   - Ver detalles de productos escaneados

3. **Procesar Sesión**
   - Click en "Procesar"
   - Los movimientos se crean automáticamente
   - El stock se actualiza

4. **Generar Nueva Sesión**
   - Click en "Nueva Sesión"
   - Seleccionar tipo y almacén
   - Escanear QR con el teléfono

## Componentes de Escaneo

### QRScanner (`/src/modules/inventario-erp/components/QRScanner.tsx`)

Soporta múltiples formatos:
- QR_CODE
- EAN_13
- EAN_8  
- UPC_A
- UPC_E
- CODE_128
- CODE_39

Modos de escaneo:
- `qr`: Solo códigos QR
- `barcode`: Solo códigos de barras
- `all`: Todos los formatos

### BarcodeGenerator (`/src/modules/inventario-erp/components/BarcodeGenerator.tsx`)

Genera códigos de barras usando jsbarcode:
- EAN13
- CODE128
- CODE39
- UPC

### LabelGenerator (`/src/modules/inventario-erp/components/LabelGenerator.tsx`)

Genera etiquetas PDF con:
- Códigos QR
- Códigos de barras
- Formatos: A4 (15 etiquetas) o Térmico (rollo 58mm)

## Pruebas Automatizadas

### Script de Pruebas (`/scripts/test_inventario_completo.mjs`)

Ejecuta pruebas completas del flujo:

```bash
node scripts/test_inventario_completo.mjs
```

**Pruebas incluidas:**
1. Alta de productos
2. Entrada múltiple de productos
3. Salida múltiple de productos
4. Segunda entrada (acumulación)
5. Consulta de movimientos
6. Resumen de inventario

### Pruebas E2E (`/cypress/e2e/inventario-erp.cy.js`)

Pruebas de interfaz con Cypress:

```bash
npm run cypress:open
```

## Dependencias Instaladas

```json
{
  "jsbarcode": "^3.11.6",
  "qrcode": "^1.5.4",
  "qrcode.react": "^4.2.0",
  "@types/qrcode": "^1.5.5"
}
```

## Configuración Necesaria

### 1. Ejecutar Migración SQL

```bash
# Ejecutar en Supabase SQL Editor
cat database/migrations/012_sesiones_movil_inventario.sql
```

### 2. Habilitar Realtime en Supabase

En el dashboard de Supabase:
1. Database → Replication
2. Habilitar para `sesiones_movil_inventario`

### 3. Configurar CORS (si es necesario)

En `supabase/config.toml`:
```toml
[api]
cors_allowed_origins = ["*"]
```

## Rutas Disponibles

| Ruta | Componente | Descripción |
|------|------------|-------------|
| `/inventario/scanner/entrada` | MobileScanner | Escaneo para entradas |
| `/inventario/scanner/salida` | MobileScanner | Escaneo para salidas |
| `/inventario/sesiones` | SesionesMovilPage | Gestión de sesiones |

## Estados de Sesión

| Estado | Descripción |
|--------|-------------|
| `activa` | Escaneo en progreso en el móvil |
| `pendiente` | Lista para procesar en desktop |
| `completada` | Movimientos creados exitosamente |
| `cancelada` | Descartada manualmente |

## Notas Técnicas

- Las sesiones se almacenan también en localStorage para persistencia
- La sincronización es en tiempo real usando Supabase Channels
- Los movimientos se crean en batch para mejor rendimiento
- Se valida stock disponible antes de salidas
