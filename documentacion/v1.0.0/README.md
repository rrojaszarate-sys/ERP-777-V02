# Documentación Integral ERP-777-V01
## Versión: 1.0.0
## Fecha: 2024

---

## Índice

1. [Introducción](#introducción)
2. [Arquitectura del Sistema](#arquitectura-del-sistema)
3. [Módulos Activos](#módulos-activos)
4. [Base de Datos](#base-de-datos)
5. [API y Endpoints](#api-y-endpoints)
6. [Flujos de Trabajo](#flujos-de-trabajo)
7. [Vistas y Frontend](#vistas-y-frontend)
8. [Configuración y Despliegue](#configuración-y-despliegue)
9. [Código Obsoleto](#código-obsoleto)
10. [Mejores Prácticas](#mejores-prácticas)

---

## Introducción

### Propósito del Sistema
El sistema ERP-777-V01 es una solución empresarial integral diseñada para gestionar los recursos y procesos de la organización de manera eficiente y escalable.

### Alcance
Este documento detalla todos los componentes activos del sistema, su arquitectura, flujos de trabajo, y proporciona una guía completa para el desarrollo futuro.

### Versiones
- **Versión actual**: 1.0.0
- **Última actualización**: [FECHA]
- **Responsable**: Equipo de Desarrollo

---

## Arquitectura del Sistema

### Diagrama de Arquitectura

```
┌─────────────────┐
│   Frontend      │
│   (React)       │
└────────┬────────┘
         │
         │ HTTP/REST
         │
┌────────▼────────┐
│   Backend       │
│   (Node.js)     │
└────────┬────────┘
         │
         │ SQL
         │
┌────────▼────────┐
│   Base de Datos │
│   (MySQL)       │
└─────────────────┘
```

### Capas del Sistema

#### 1. Capa de Presentación
- **Tecnología**: React.js
- **Responsabilidad**: Interfaz de usuario y experiencia del usuario
- **Ubicación**: `/frontend`

#### 2. Capa de Lógica de Negocio
- **Tecnología**: Node.js + Express.js
- **Responsabilidad**: Procesamiento de reglas de negocio
- **Ubicación**: `/backend`

#### 3. Capa de Datos
- **Tecnología**: MySQL
- **Responsabilidad**: Almacenamiento persistente
- **Ubicación**: Servidor de base de datos

---

## Módulos Activos

### Módulo de Inventarios
**Ubicación**: `/backend/modules/inventarios`

**Funcionalidades**:
- Control de stock
- Entradas y salidas de productos
- Alertas de stock mínimo
- Reportes de inventario

**Endpoints**:
- `GET /api/inventarios` - Listar inventarios
- `POST /api/inventarios` - Crear entrada
- `PUT /api/inventarios/:id` - Actualizar
- `DELETE /api/inventarios/:id` - Eliminar

### Módulo de Ventas
**Ubicación**: `/backend/modules/ventas`

**Funcionalidades**:
- Registro de ventas
- Generación de facturas
- Control de clientes
- Reportes de ventas

**Endpoints**:
- `GET /api/ventas` - Listar ventas
- `POST /api/ventas` - Registrar venta
- `GET /api/ventas/:id` - Detalle de venta
- `PUT /api/ventas/:id` - Actualizar venta

### Módulo Financiero
**Ubicación**: `/backend/modules/finanzas`

**Funcionalidades**:
- Control de ingresos
- Control de egresos
- Reportes financieros
- Balance general

**Endpoints**:
- `GET /api/finanzas/ingresos` - Listar ingresos
- `GET /api/finanzas/egresos` - Listar egresos
- `GET /api/finanzas/balance` - Balance general
- `POST /api/finanzas/movimiento` - Registrar movimiento

---

## Base de Datos

### Esquema de Base de Datos

#### Tablas Principales

##### 1. usuarios
```sql
CREATE TABLE usuarios (
  id INT PRIMARY KEY AUTO_INCREMENT,
  nombre VARCHAR(100) NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  rol ENUM('admin', 'usuario', 'invitado') DEFAULT 'usuario',
  activo BOOLEAN DEFAULT TRUE,
  fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

##### 2. productos
```sql
CREATE TABLE productos (
  id INT PRIMARY KEY AUTO_INCREMENT,
  codigo VARCHAR(50) UNIQUE NOT NULL,
  nombre VARCHAR(200) NOT NULL,
  descripcion TEXT,
  precio_compra DECIMAL(10,2),
  precio_venta DECIMAL(10,2),
  stock_actual INT DEFAULT 0,
  stock_minimo INT DEFAULT 0,
  activo BOOLEAN DEFAULT TRUE,
  fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

##### 3. ventas
```sql
CREATE TABLE ventas (
  id INT PRIMARY KEY AUTO_INCREMENT,
  numero_factura VARCHAR(50) UNIQUE NOT NULL,
  cliente_id INT,
  usuario_id INT,
  subtotal DECIMAL(10,2),
  impuesto DECIMAL(10,2),
  total DECIMAL(10,2),
  estado ENUM('pendiente', 'completada', 'cancelada'),
  fecha_venta TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (cliente_id) REFERENCES clientes(id),
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
);
```

##### 4. inventarios
```sql
CREATE TABLE inventarios (
  id INT PRIMARY KEY AUTO_INCREMENT,
  producto_id INT NOT NULL,
  tipo_movimiento ENUM('entrada', 'salida'),
  cantidad INT NOT NULL,
  usuario_id INT,
  observaciones TEXT,
  fecha_movimiento TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (producto_id) REFERENCES productos(id),
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
);
```

### Relaciones entre Tablas

```
usuarios (1) ──────── (N) ventas
usuarios (1) ──────── (N) inventarios
productos (1) ──────── (N) inventarios
clientes (1) ──────── (N) ventas
ventas (1) ──────── (N) detalles_venta
productos (1) ──────── (N) detalles_venta
```

---

## API y Endpoints

### Autenticación

#### POST /api/auth/login
**Descripción**: Autenticar usuario y obtener token JWT

**Request**:
```json
{
  "email": "usuario@empresa.com",
  "password": "password123"
}
```

**Response**:
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "usuario": {
    "id": 1,
    "nombre": "Usuario",
    "email": "usuario@empresa.com",
    "rol": "admin"
  }
}
```

### Inventarios

#### GET /api/inventarios
**Descripción**: Obtener lista de movimientos de inventario

**Parámetros**:
- `fecha_inicio` (opcional): Fecha de inicio
- `fecha_fin` (opcional): Fecha de fin
- `producto_id` (opcional): Filtrar por producto

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "producto": "Producto A",
      "tipo_movimiento": "entrada",
      "cantidad": 100,
      "fecha": "2024-01-01"
    }
  ]
}
```

---

## Flujos de Trabajo

### Flujo de Venta

```
1. Usuario inicia sesión
   ↓
2. Selecciona productos
   ↓
3. Agrega al carrito
   ↓
4. Verifica disponibilidad en inventario
   ↓
5. Genera factura
   ↓
6. Procesa pago
   ↓
7. Actualiza inventario
   ↓
8. Registra venta en base de datos
   ↓
9. Genera comprobante
```

### Flujo de Inventario

```
1. Usuario registra entrada/salida
   ↓
2. Sistema valida datos
   ↓
3. Actualiza stock del producto
   ↓
4. Registra movimiento en histórico
   ↓
5. Verifica stock mínimo
   ↓
6. Genera alerta si es necesario
```

---

## Vistas y Frontend

### Estructura de Componentes

```
src/
├── components/
│   ├── common/
│   │   ├── Header.jsx
│   │   ├── Sidebar.jsx
│   │   ├── Footer.jsx
│   │   └── Button.jsx
│   ├── inventarios/
│   │   ├── ListaInventarios.jsx
│   │   ├── FormularioInventario.jsx
│   │   └── DetalleInventario.jsx
│   ├── ventas/
│   │   ├── ListaVentas.jsx
│   │   ├── FormularioVenta.jsx
│   │   └── DetalleVenta.jsx
│   └── finanzas/
│       ├── Dashboard.jsx
│       ├── Ingresos.jsx
│       └── Egresos.jsx
├── pages/
│   ├── Login.jsx
│   ├── Dashboard.jsx
│   ├── Inventarios.jsx
│   ├── Ventas.jsx
│   └── Finanzas.jsx
├── services/
│   ├── api.js
│   ├── auth.js
│   └── inventarios.js
└── utils/
    ├── formatters.js
    └── validators.js
```

---

## Configuración y Despliegue

### Variables de Entorno (.env)

```env
# Base de datos
DB_HOST=localhost
DB_PORT=3306
DB_USER=erp_user
DB_PASSWORD=secure_password
DB_NAME=erp_database

# Servidor
PORT=3000
NODE_ENV=production

# JWT
JWT_SECRET=your_secret_key_here
JWT_EXPIRES_IN=24h

# Otros
API_URL=http://localhost:3000/api
FRONTEND_URL=http://localhost:3001
```

### Pasos de Despliegue

1. **Clonar repositorio**
```bash
git clone [repository_url]
cd ERP-777-V01
```

2. **Instalar dependencias**
```bash
npm install
cd frontend && npm install
```

3. **Configurar variables de entorno**
```bash
cp .env.example .env
# Editar .env con valores correctos
```

4. **Ejecutar migraciones de base de datos**
```bash
npm run migrate
```

5. **Iniciar servicios**
```bash
npm run start
```

---

## Código Obsoleto

Revisar archivo: `/documentacion/v1.0.0/codigo-obsoleto.md`

---

## Mejores Prácticas

### Código
- Usar ESLint para mantener consistencia
- Comentarios en español
- Nombres descriptivos de variables y funciones
- Seguir principios SOLID

### Base de Datos
- Usar transacciones para operaciones críticas
- Índices en columnas de búsqueda frecuente
- Normalización de datos

### Seguridad
- Validar todas las entradas
- Sanitizar datos antes de insertar en BD
- Usar prepared statements
- Implementar rate limiting

### Documentación
- Mantener documentación actualizada
- Versionar cambios importantes
- Documentar decisiones arquitectónicas
