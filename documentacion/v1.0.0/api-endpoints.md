# Documentación de API - Endpoints

## Versión: 1.0.0

---

## Autenticación

Todos los endpoints (excepto `/auth/login`) requieren un token JWT en el header:
```
Authorization: Bearer {token}
```

---

## Módulo de Autenticación

### POST /api/auth/login
Autenticar usuario y obtener token JWT

**Request Body**:
```json
{
  "email": "usuario@empresa.com",
  "password": "password123"
}
```

**Response Success (200)**:
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "usuario": {
    "id": 1,
    "nombre": "Juan Pérez",
    "email": "usuario@empresa.com",
    "rol": "admin"
  }
}
```

**Response Error (401)**:
```json
{
  "success": false,
  "message": "Credenciales inválidas"
}
```

---

### POST /api/auth/logout
Cerrar sesión del usuario

**Request Headers**:
```
Authorization: Bearer {token}
```

**Response (200)**:
```json
{
  "success": true,
  "message": "Sesión cerrada correctamente"
}
```

---

### GET /api/auth/verify
Verificar validez del token

**Response (200)**:
```json
{
  "success": true,
  "usuario": {
    "id": 1,
    "nombre": "Juan Pérez",
    "rol": "admin"
  }
}
```

---

## Módulo de Usuarios

### GET /api/usuarios
Listar todos los usuarios

**Query Parameters**:
- `page` (opcional): Número de página (default: 1)
- `limit` (opcional): Registros por página (default: 10)
- `activo` (opcional): Filtrar por estado (true/false)
- `rol` (opcional): Filtrar por rol

**Response (200)**:
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "nombre": "Juan Pérez",
      "email": "juan@empresa.com",
      "rol": "admin",
      "activo": true,
      "fecha_creacion": "2024-01-01T00:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 50,
    "pages": 5
  }
}
```

---

### GET /api/usuarios/:id
Obtener detalles de un usuario

**Response (200)**:
```json
{
  "success": true,
  "data": {
    "id": 1,
    "nombre": "Juan Pérez",
    "email": "juan@empresa.com",
    "rol": "admin",
    "activo": true,
    "fecha_creacion": "2024-01-01T00:00:00.000Z"
  }
}
```

---

### POST /api/usuarios
Crear nuevo usuario

**Request Body**:
```json
{
  "nombre": "María García",
  "email": "maria@empresa.com",
  "password": "password123",
  "rol": "usuario"
}
```

**Response (201)**:
```json
{
  "success": true,
  "message": "Usuario creado correctamente",
  "data": {
    "id": 2,
    "nombre": "María García",
    "email": "maria@empresa.com",
    "rol": "usuario"
  }
}
```

---

### PUT /api/usuarios/:id
Actualizar usuario existente

**Request Body**:
```json
{
  "nombre": "María García López",
  "rol": "admin"
}
```

**Response (200)**:
```json
{
  "success": true,
  "message": "Usuario actualizado correctamente"
}
```

---

### DELETE /api/usuarios/:id
Eliminar usuario (soft delete)

**Response (200)**:
```json
{
  "success": true,
  "message": "Usuario eliminado correctamente"
}
```

---

## Módulo de Productos

### GET /api/productos
Listar productos

**Query Parameters**:
- `page`, `limit`: Paginación
- `search`: Búsqueda por nombre o código
- `activo`: Filtrar por estado
- `stock_bajo`: true para productos con stock bajo

**Response (200)**:
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "codigo": "PROD001",
      "nombre": "Producto A",
      "precio_venta": 100.00,
      "stock_actual": 50,
      "stock_minimo": 10,
      "estado_stock": "NORMAL"
    }
  ]
}
```

---

### POST /api/productos
Crear nuevo producto

**Request Body**:
```json
{
  "codigo": "PROD002",
  "nombre": "Producto B",
  "descripcion": "Descripción del producto",
  "precio_compra": 50.00,
  "precio_venta": 100.00,
  "stock_minimo": 10
}
```

---

## Módulo de Inventarios

### GET /api/inventarios
Listar movimientos de inventario

**Query Parameters**:
- `fecha_inicio`: Fecha inicio (YYYY-MM-DD)
- `fecha_fin`: Fecha fin (YYYY-MM-DD)
- `producto_id`: Filtrar por producto
- `tipo_movimiento`: 'entrada' o 'salida'

**Response (200)**:
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "producto": "Producto A",
      "tipo_movimiento": "entrada",
      "cantidad": 100,
      "usuario": "Juan Pérez",
      "fecha_movimiento": "2024-01-01T10:00:00.000Z"
    }
  ]
}
```

---

### POST /api/inventarios/entrada
Registrar entrada de inventario

**Request Body**:
```json
{
  "producto_id": 1,
  "cantidad": 100,
  "observaciones": "Compra a proveedor X"
}
```

**Response (201)**:
```json
{
  "success": true,
  "message": "Entrada registrada correctamente",
  "data": {
    "movimiento_id": 1,
    "stock_nuevo": 150
  }
}
```

---

### POST /api/inventarios/salida
Registrar salida de inventario

**Request Body**:
```json
{
  "producto_id": 1,
  "cantidad": 10,
  "observaciones": "Ajuste por merma"
}
```

---

## Módulo de Ventas

### GET /api/ventas
Listar ventas

**Query Parameters**:
- `fecha_inicio`, `fecha_fin`: Rango de fechas
- `cliente_id`: Filtrar por cliente
- `estado`: 'pendiente', 'completada', 'cancelada'

**Response (200)**:
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "numero_factura": "FAC-001",
      "cliente": "Cliente A",
      "total": 1000.00,
      "estado": "completada",
      "fecha_venta": "2024-01-01T12:00:00.000Z"
    }
  ]
}
```

---

### GET /api/ventas/:id
Detalle de venta

**Response (200)**:
```json
{
  "success": true,
  "data": {
    "id": 1,
    "numero_factura": "FAC-001",
    "cliente": {
      "id": 1,
      "nombre": "Cliente A",
      "rfc": "ABC123456XXX"
    },
    "items": [
      {
        "producto": "Producto A",
        "cantidad": 5,
        "precio_unitario": 100.00,
        "subtotal": 500.00
      }
    ],
    "subtotal": 500.00,
    "impuesto": 80.00,
    "total": 580.00,
    "estado": "completada"
  }
}
```

---

### POST /api/ventas
Registrar nueva venta

**Request Body**:
```json
{
  "cliente_id": 1,
  "items": [
    {
      "producto_id": 1,
      "cantidad": 5,
      "precio_unitario": 100.00
    }
  ],
  "observaciones": "Venta de contado"
}
```

**Response (201)**:
```json
{
  "success": true,
  "message": "Venta registrada correctamente",
  "data": {
    "venta_id": 1,
    "numero_factura": "FAC-001",
    "total": 580.00
  }
}
```

---

### PUT /api/ventas/:id/cancelar
Cancelar venta

**Response (200)**:
```json
{
  "success": true,
  "message": "Venta cancelada. Stock restaurado."
}
```

---

## Módulo de Clientes

### GET /api/clientes
Listar clientes

**Response (200)**:
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "nombre": "Cliente A",
      "rfc": "ABC123456XXX",
      "email": "cliente@email.com",
      "telefono": "1234567890"
    }
  ]
}
```

---

### POST /api/clientes
Crear nuevo cliente

**Request Body**:
```json
{
  "nombre": "Cliente B",
  "rfc": "DEF789012XXX",
  "email": "clienteb@email.com",
  "telefono": "0987654321",
  "direccion": "Calle 123"
}
```

---

## Módulo de Reportes

### GET /api/reportes/ventas-periodo
Reporte de ventas por período

**Query Parameters**:
- `fecha_inicio`: Fecha inicio (YYYY-MM-DD)
- `fecha_fin`: Fecha fin (YYYY-MM-DD)
- `formato`: 'json' o 'pdf'

**Response (200)**:
```json
{
  "success": true,
  "data": {
    "total_ventas": 50000.00,
    "numero_ventas": 100,
    "ticket_promedio": 500.00,
    "ventas_por_dia": [
      {
        "fecha": "2024-01-01",
        "total": 5000.00,
        "cantidad": 10
      }
    ]
  }
}
```

---

### GET /api/reportes/productos-mas-vendidos
Top productos más vendidos

**Query Parameters**:
- `limite`: Número de productos (default: 10)
- `fecha_inicio`, `fecha_fin`: Rango de fechas

**Response (200)**:
```json
{
  "success": true,
  "data": [
    {
      "producto": "Producto A",
      "cantidad_vendida": 500,
      "total_vendido": 50000.00
    }
  ]
}
```

---

## Códigos de Estado HTTP

| Código | Significado |
|--------|-------------|
| 200 | OK - Solicitud exitosa |
| 201 | Created - Recurso creado |
| 400 | Bad Request - Error en parámetros |
| 401 | Unauthorized - No autenticado |
| 403 | Forbidden - Sin permisos |
| 404 | Not Found - Recurso no encontrado |
| 500 | Internal Server Error - Error del servidor |

---

## Manejo de Errores

Todas las respuestas de error siguen este formato:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Descripción del error",
    "details": {}
  }
}
```

### Códigos de Error Comunes

- `AUTH_INVALID_CREDENTIALS`: Credenciales inválidas
- `AUTH_TOKEN_EXPIRED`: Token expirado
- `VALIDATION_ERROR`: Error de validación
- `RESOURCE_NOT_FOUND`: Recurso no encontrado
- `INSUFFICIENT_STOCK`: Stock insuficiente
- `DUPLICATE_ENTRY`: Entrada duplicada
