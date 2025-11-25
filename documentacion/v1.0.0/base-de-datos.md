# Documentación de Base de Datos

## Versión: 1.0.0

---

## Índice

1. [Diagrama Entidad-Relación](#diagrama-entidad-relación)
2. [Catálogo de Tablas](#catálogo-de-tablas)
3. [Scripts de Creación](#scripts-de-creación)
4. [Índices y Optimizaciones](#índices-y-optimizaciones)
5. [Procedimientos Almacenados](#procedimientos-almacenados)
6. [Vistas](#vistas)
7. [Triggers](#triggers)
8. [Políticas de Respaldo](#políticas-de-respaldo)

---

## Diagrama Entidad-Relación

```
┌──────────────┐         ┌──────────────┐         ┌──────────────┐
│   usuarios   │         │   clientes   │         │  productos   │
│──────────────│         │──────────────│         │──────────────│
│ id (PK)      │         │ id (PK)      │         │ id (PK)      │
│ nombre       │         │ nombre       │         │ codigo       │
│ email        │         │ email        │         │ nombre       │
│ password     │         │ telefono     │         │ descripcion  │
│ rol          │         │ direccion    │         │ precio_compra│
│ activo       │         │ activo       │         │ precio_venta │
└──────┬───────┘         └──────┬───────┘         │ stock_actual │
       │                        │                 │ stock_minimo │
       │                        │                 └──────┬───────┘
       │                        │                        │
       │                        │                        │
       ▼                        ▼                        ▼
┌──────────────────────────────────────────────────────────┐
│                        ventas                            │
│──────────────────────────────────────────────────────────│
│ id (PK)                                                  │
│ numero_factura                                           │
│ cliente_id (FK)                                          │
│ usuario_id (FK)                                          │
│ subtotal, impuesto, total                                │
│ estado                                                   │
│ fecha_venta                                              │
└──────────────────────────┬───────────────────────────────┘
                           │
                           ▼
                 ┌──────────────────┐
                 │ detalles_venta   │
                 │──────────────────│
                 │ id (PK)          │
                 │ venta_id (FK)    │
                 │ producto_id (FK) │
                 │ cantidad         │
                 │ precio_unitario  │
                 │ subtotal         │
                 └──────────────────┘
```

---

## Catálogo de Tablas

### 1. usuarios
**Propósito**: Almacenar información de usuarios del sistema

| Campo | Tipo | Descripción | Constraints |
|-------|------|-------------|-------------|
| id | INT | Identificador único | PK, AUTO_INCREMENT |
| nombre | VARCHAR(100) | Nombre completo | NOT NULL |
| email | VARCHAR(100) | Correo electrónico | UNIQUE, NOT NULL |
| password | VARCHAR(255) | Contraseña hasheada | NOT NULL |
| rol | ENUM | Rol del usuario | 'admin', 'usuario', 'invitado' |
| activo | BOOLEAN | Estado del usuario | DEFAULT TRUE |
| fecha_creacion | TIMESTAMP | Fecha de registro | DEFAULT CURRENT_TIMESTAMP |
| fecha_actualizacion | TIMESTAMP | Última actualización | ON UPDATE CURRENT_TIMESTAMP |

**Índices**:
- PRIMARY KEY (id)
- UNIQUE INDEX idx_email (email)
- INDEX idx_activo (activo)

---

### 2. clientes
**Propósito**: Información de clientes de la empresa

| Campo | Tipo | Descripción | Constraints |
|-------|------|-------------|-------------|
| id | INT | Identificador único | PK, AUTO_INCREMENT |
| nombre | VARCHAR(200) | Nombre o razón social | NOT NULL |
| rfc | VARCHAR(20) | RFC | UNIQUE |
| email | VARCHAR(100) | Correo electrónico | |
| telefono | VARCHAR(20) | Teléfono | |
| direccion | TEXT | Dirección completa | |
| activo | BOOLEAN | Estado del cliente | DEFAULT TRUE |
| fecha_registro | TIMESTAMP | Fecha de registro | DEFAULT CURRENT_TIMESTAMP |

**Índices**:
- PRIMARY KEY (id)
- UNIQUE INDEX idx_rfc (rfc)
- INDEX idx_nombre (nombre)

---

### 3. productos
**Propósito**: Catálogo de productos

| Campo | Tipo | Descripción | Constraints |
|-------|------|-------------|-------------|
| id | INT | Identificador único | PK, AUTO_INCREMENT |
| codigo | VARCHAR(50) | Código de producto | UNIQUE, NOT NULL |
| nombre | VARCHAR(200) | Nombre del producto | NOT NULL |
| descripcion | TEXT | Descripción detallada | |
| precio_compra | DECIMAL(10,2) | Precio de compra | |
| precio_venta | DECIMAL(10,2) | Precio de venta | NOT NULL |
| stock_actual | INT | Stock disponible | DEFAULT 0 |
| stock_minimo | INT | Stock mínimo | DEFAULT 0 |
| activo | BOOLEAN | Producto activo | DEFAULT TRUE |
| fecha_creacion | TIMESTAMP | Fecha de creación | DEFAULT CURRENT_TIMESTAMP |

**Índices**:
- PRIMARY KEY (id)
- UNIQUE INDEX idx_codigo (codigo)
- INDEX idx_nombre (nombre)
- INDEX idx_stock (stock_actual)

---

### 4. ventas
**Propósito**: Registro de ventas realizadas

| Campo | Tipo | Descripción | Constraints |
|-------|------|-------------|-------------|
| id | INT | Identificador único | PK, AUTO_INCREMENT |
| numero_factura | VARCHAR(50) | Número de factura | UNIQUE, NOT NULL |
| cliente_id | INT | Cliente | FK clientes(id) |
| usuario_id | INT | Usuario que registra | FK usuarios(id) |
| subtotal | DECIMAL(10,2) | Subtotal | NOT NULL |
| impuesto | DECIMAL(10,2) | Impuestos | DEFAULT 0 |
| total | DECIMAL(10,2) | Total | NOT NULL |
| estado | ENUM | Estado de venta | 'pendiente', 'completada', 'cancelada' |
| fecha_venta | TIMESTAMP | Fecha de venta | DEFAULT CURRENT_TIMESTAMP |

**Índices**:
- PRIMARY KEY (id)
- UNIQUE INDEX idx_factura (numero_factura)
- INDEX idx_cliente (cliente_id)
- INDEX idx_fecha (fecha_venta)

---

## Scripts de Creación

### Script completo de creación de base de datos

```sql
-- Crear base de datos
CREATE DATABASE IF NOT EXISTS erp_database
CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;

USE erp_database;

-- Tabla usuarios
CREATE TABLE usuarios (
  id INT PRIMARY KEY AUTO_INCREMENT,
  nombre VARCHAR(100) NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  rol ENUM('admin', 'usuario', 'invitado') DEFAULT 'usuario',
  activo BOOLEAN DEFAULT TRUE,
  fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_email (email),
  INDEX idx_activo (activo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla clientes
CREATE TABLE clientes (
  id INT PRIMARY KEY AUTO_INCREMENT,
  nombre VARCHAR(200) NOT NULL,
  rfc VARCHAR(20) UNIQUE,
  email VARCHAR(100),
  telefono VARCHAR(20),
  direccion TEXT,
  activo BOOLEAN DEFAULT TRUE,
  fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_rfc (rfc),
  INDEX idx_nombre (nombre)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla productos
CREATE TABLE productos (
  id INT PRIMARY KEY AUTO_INCREMENT,
  codigo VARCHAR(50) UNIQUE NOT NULL,
  nombre VARCHAR(200) NOT NULL,
  descripcion TEXT,
  precio_compra DECIMAL(10,2),
  precio_venta DECIMAL(10,2) NOT NULL,
  stock_actual INT DEFAULT 0,
  stock_minimo INT DEFAULT 0,
  activo BOOLEAN DEFAULT TRUE,
  fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_codigo (codigo),
  INDEX idx_nombre (nombre),
  INDEX idx_stock (stock_actual)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla ventas
CREATE TABLE ventas (
  id INT PRIMARY KEY AUTO_INCREMENT,
  numero_factura VARCHAR(50) UNIQUE NOT NULL,
  cliente_id INT,
  usuario_id INT,
  subtotal DECIMAL(10,2) NOT NULL,
  impuesto DECIMAL(10,2) DEFAULT 0,
  total DECIMAL(10,2) NOT NULL,
  estado ENUM('pendiente', 'completada', 'cancelada') DEFAULT 'pendiente',
  fecha_venta TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE SET NULL,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL,
  INDEX idx_factura (numero_factura),
  INDEX idx_cliente (cliente_id),
  INDEX idx_fecha (fecha_venta)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla detalles_venta
CREATE TABLE detalles_venta (
  id INT PRIMARY KEY AUTO_INCREMENT,
  venta_id INT NOT NULL,
  producto_id INT NOT NULL,
  cantidad INT NOT NULL,
  precio_unitario DECIMAL(10,2) NOT NULL,
  subtotal DECIMAL(10,2) NOT NULL,
  FOREIGN KEY (venta_id) REFERENCES ventas(id) ON DELETE CASCADE,
  FOREIGN KEY (producto_id) REFERENCES productos(id),
  INDEX idx_venta (venta_id),
  INDEX idx_producto (producto_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla inventarios
CREATE TABLE inventarios (
  id INT PRIMARY KEY AUTO_INCREMENT,
  producto_id INT NOT NULL,
  tipo_movimiento ENUM('entrada', 'salida') NOT NULL,
  cantidad INT NOT NULL,
  usuario_id INT,
  observaciones TEXT,
  fecha_movimiento TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (producto_id) REFERENCES productos(id),
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL,
  INDEX idx_producto (producto_id),
  INDEX idx_fecha (fecha_movimiento)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

## Vistas

### vista_inventario_actual
**Propósito**: Mostrar el estado actual del inventario con información detallada

```sql
CREATE OR REPLACE VIEW vista_inventario_actual AS
SELECT 
  p.id,
  p.codigo,
  p.nombre,
  p.stock_actual,
  p.stock_minimo,
  CASE 
    WHEN p.stock_actual <= p.stock_minimo THEN 'CRÍTICO'
    WHEN p.stock_actual <= (p.stock_minimo * 1.5) THEN 'BAJO'
    ELSE 'NORMAL'
  END AS estado_stock,
  p.precio_venta,
  (p.stock_actual * p.precio_venta) AS valor_inventario
FROM productos p
WHERE p.activo = TRUE
ORDER BY p.nombre;
```

### vista_ventas_resumen
**Propósito**: Resumen de ventas con totales y detalles

```sql
CREATE OR REPLACE VIEW vista_ventas_resumen AS
SELECT 
  v.id,
  v.numero_factura,
  c.nombre AS cliente,
  u.nombre AS vendedor,
  v.total,
  v.estado,
  v.fecha_venta,
  COUNT(dv.id) AS items_vendidos
FROM ventas v
LEFT JOIN clientes c ON v.cliente_id = c.id
LEFT JOIN usuarios u ON v.usuario_id = u.id
LEFT JOIN detalles_venta dv ON v.id = dv.venta_id
GROUP BY v.id;
```

---

## Triggers

### trg_actualizar_stock_venta
**Propósito**: Actualizar automáticamente el stock al registrar una venta

```sql
DELIMITER $$

CREATE TRIGGER trg_actualizar_stock_venta
AFTER INSERT ON detalles_venta
FOR EACH ROW
BEGIN
  UPDATE productos 
  SET stock_actual = stock_actual - NEW.cantidad
  WHERE id = NEW.producto_id;
  
  INSERT INTO inventarios (producto_id, tipo_movimiento, cantidad, observaciones)
  VALUES (NEW.producto_id, 'salida', NEW.cantidad, CONCAT('Venta #', NEW.venta_id));
END$$

DELIMITER ;
```

---

## Políticas de Respaldo

### Frecuencia
- **Respaldo completo**: Diario a las 02:00 AM
- **Respaldo incremental**: Cada 6 horas
- **Retención**: 30 días

### Script de respaldo

```bash
#!/bin/bash
mysqldump -u usuario -p erp_database > backup_$(date +%Y%m%d_%H%M%S).sql
```
