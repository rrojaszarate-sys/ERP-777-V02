# Documentación de Componentes Frontend

## Versión: 1.0.0

---

## Estructura de Carpetas

```
frontend/src/
├── components/          # Componentes reutilizables
│   ├── common/         # Componentes comunes
│   ├── forms/          # Formularios
│   ├── tables/         # Tablas de datos
│   └── modals/         # Ventanas modales
├── pages/              # Páginas principales
├── services/           # Servicios de API
├── hooks/              # Custom Hooks
├── utils/              # Utilidades
├── context/            # Context API
├── assets/             # Recursos estáticos
└── styles/             # Estilos globales
```

---

## Componentes Comunes

### Header.jsx
**Ubicación**: `/components/common/Header.jsx`

**Propósito**: Barra superior de navegación con menú de usuario

**Props**:
```javascript
{
  usuario: {
    nombre: string,
    rol: string
  },
  onLogout: function
}
```

**Uso**:
```jsx
<Header 
  usuario={usuarioActual} 
  onLogout={handleLogout} 
/>
```

---

### Sidebar.jsx
**Ubicación**: `/components/common/Sidebar.jsx`

**Propósito**: Menú lateral de navegación

**Props**:
```javascript
{
  menuItems: Array<{
    label: string,
    icon: string,
    path: string,
    roles: Array<string>
  }>,
  activeRoute: string
}
```

**Ejemplo**:
```jsx
const menuItems = [
  { label: 'Dashboard', icon: 'dashboard', path: '/', roles: ['admin', 'usuario'] },
  { label: 'Ventas', icon: 'shopping_cart', path: '/ventas', roles: ['admin', 'usuario'] },
  { label: 'Inventarios', icon: 'inventory', path: '/inventarios', roles: ['admin'] }
];

<Sidebar menuItems={menuItems} activeRoute={currentPath} />
```

---

### Button.jsx
**Ubicación**: `/components/common/Button.jsx`

**Propósito**: Botón reutilizable con variantes

**Props**:
```javascript
{
  children: ReactNode,
  variant: 'primary' | 'secondary' | 'danger' | 'success',
  size: 'small' | 'medium' | 'large',
  onClick: function,
  disabled: boolean,
  loading: boolean,
  icon: string
}
```

**Uso**:
```jsx
<Button 
  variant="primary" 
  onClick={handleSubmit}
  loading={isSubmitting}
  icon="save"
>
  Guardar
</Button>
```

---

### DataTable.jsx
**Ubicación**: `/components/tables/DataTable.jsx`

**Propósito**: Tabla de datos con paginación, búsqueda y ordenamiento

**Props**:
```javascript
{
  columns: Array<{
    key: string,
    label: string,
    sortable: boolean,
    render: function
  }>,
  data: Array<Object>,
  onSort: function,
  onPageChange: function,
  pagination: {
    page: number,
    limit: number,
    total: number
  },
  loading: boolean,
  actions: Array<{
    label: string,
    icon: string,
    onClick: function,
    condition: function
  }>
}
```

**Ejemplo**:
```jsx
const columns = [
  { key: 'codigo', label: 'Código', sortable: true },
  { key: 'nombre', label: 'Nombre', sortable: true },
  { 
    key: 'precio', 
    label: 'Precio', 
    sortable: true,
    render: (value) => `$${value.toFixed(2)}`
  }
];

const actions = [
  {
    label: 'Editar',
    icon: 'edit',
    onClick: (row) => handleEdit(row.id)
  },
  {
    label: 'Eliminar',
    icon: 'delete',
    onClick: (row) => handleDelete(row.id),
    condition: (row) => row.activo
  }
];

<DataTable
  columns={columns}
  data={productos}
  actions={actions}
  pagination={paginationInfo}
  onPageChange={handlePageChange}
  loading={isLoading}
/>
```

---

### Modal.jsx
**Ubicación**: `/components/modals/Modal.jsx`

**Propósito**: Ventana modal reutilizable

**Props**:
```javascript
{
  isOpen: boolean,
  onClose: function,
  title: string,
  children: ReactNode,
  size: 'small' | 'medium' | 'large' | 'full',
  footer: ReactNode
}
```

**Uso**:
```jsx
<Modal
  isOpen={showModal}
  onClose={() => setShowModal(false)}
  title="Nuevo Producto"
  size="medium"
  footer={
    <>
      <Button variant="secondary" onClick={() => setShowModal(false)}>
        Cancelar
      </Button>
      <Button variant="primary" onClick={handleSave}>
        Guardar
      </Button>
    </>
  }
>
  <FormularioProducto />
</Modal>
```

---

## Formularios

### FormField.jsx
**Ubicación**: `/components/forms/FormField.jsx`

**Propósito**: Campo de formulario con validación

**Props**:
```javascript
{
  label: string,
  name: string,
  type: 'text' | 'number' | 'email' | 'password' | 'select' | 'textarea',
  value: any,
  onChange: function,
  error: string,
  required: boolean,
  placeholder: string,
  options: Array<{value: any, label: string}>, // Para select
  disabled: boolean
}
```

**Ejemplo**:
```jsx
<FormField
  label="Nombre del Producto"
  name="nombre"
  type="text"
  value={formData.nombre}
  onChange={handleChange}
  error={errors.nombre}
  required
  placeholder="Ingrese el nombre"
/>
```

---

### SearchInput.jsx
**Ubicación**: `/components/forms/SearchInput.jsx`

**Propósito**: Campo de búsqueda con debounce

**Props**:
```javascript
{
  placeholder: string,
  onSearch: function,
  delay: number, // milisegundos de debounce
  value: string
}
```

---

## Páginas Principales

### Dashboard.jsx
**Ubicación**: `/pages/Dashboard.jsx`

**Descripción**: Página principal con métricas y resúmenes

**Componentes utilizados**:
- `StatCard`: Tarjetas de estadísticas
- `ChartWidget`: Gráficos de datos
- `RecentActivity`: Actividad reciente

**State**:
```javascript
{
  metricas: {
    ventasHoy: number,
    ventasMes: number,
    productosStockBajo: number,
    clientesActivos: number
  },
  loading: boolean,
  error: string
}
```

---

### Ventas.jsx
**Ubicación**: `/pages/Ventas.jsx`

**Descripción**: Gestión de ventas

**Funcionalidades**:
- Listar ventas
- Crear nueva venta
- Ver detalle de venta
- Cancelar venta
- Generar PDF de factura

**Componentes utilizados**:
- `DataTable`
- `Modal`
- `FormularioVenta`
- `DetalleVenta`

---

### Inventarios.jsx
**Ubicación**: `/pages/Inventarios.jsx`

**Descripción**: Control de inventario

**Funcionalidades**:
- Listar productos
- Registrar entradas/salidas
- Ver historial de movimientos
- Alertas de stock bajo

---

## Custom Hooks

### useAuth.js
**Ubicación**: `/hooks/useAuth.js`

**Propósito**: Manejo de autenticación

```javascript
const useAuth = () => {
  const { usuario, setUsuario } = useContext(AuthContext);
  
  const login = async (email, password) => {
    // Lógica de login
  };
  
  const logout = () => {
    // Lógica de logout
  };
  
  const verificarToken = async () => {
    // Verificar validez del token
  };
  
  return { usuario, login, logout, verificarToken };
};
```

**Uso**:
```jsx
const { usuario, login, logout } = useAuth();

const handleLogin = async () => {
  try {
    await login(email, password);
    navigate('/dashboard');
  } catch (error) {
    setError(error.message);
  }
};
```

---

### useFetch.js
**Ubicación**: `/hooks/useFetch.js`

**Propósito**: Llamadas a API con estado de carga y error

```javascript
const useFetch = (url, options = {}) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const fetchData = async () => {
    // Lógica de fetch
  };
  
  const refetch = () => {
    fetchData();
  };
  
  return { data, loading, error, refetch };
};
```

**Uso**:
```jsx
const { data: productos, loading, error, refetch } = useFetch('/api/productos');

if (loading) return <Spinner />;
if (error) return <ErrorMessage message={error} />;

return <DataTable data={productos} />;
```

---

### useForm.js
**Ubicación**: `/hooks/useForm.js`

**Propósito**: Manejo de formularios con validación

```javascript
const useForm = (initialValues, validationRules) => {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});
  
  const handleChange = (name, value) => {
    setValues(prev => ({ ...prev, [name]: value }));
    // Validar campo
  };
  
  const validate = () => {
    // Validar todos los campos
  };
  
  const reset = () => {
    setValues(initialValues);
    setErrors({});
  };
  
  return { values, errors, handleChange, validate, reset };
};
```

**Uso**:
```jsx
const validationRules = {
  nombre: { required: true, minLength: 3 },
  email: { required: true, email: true },
  precio: { required: true, min: 0 }
};

const { values, errors, handleChange, validate } = useForm(
  { nombre: '', email: '', precio: 0 },
  validationRules
);

const handleSubmit = async (e) => {
  e.preventDefault();
  if (validate()) {
    await submitData(values);
  }
};
```

---

## Servicios

### api.js
**Ubicación**: `/services/api.js`

**Propósito**: Cliente HTTP con interceptores

```javascript
import axios from 'axios';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Interceptor para agregar token
api.interceptors.request.use(
  config => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  error => Promise.reject(error)
);

// Interceptor para manejar errores
api.interceptors.response.use(
  response => response.data,
  error => {
    if (error.response?.status === 401) {
      // Redirigir a login
      window.location.href = '/login';
    }
    return Promise.reject(error.response?.data || error);
  }
);

export default api;
```

---

### productosService.js
**Ubicación**: `/services/productosService.js`

```javascript
import api from './api';

export const productosService = {
  getAll: (params) => api.get('/productos', { params }),
  
  getById: (id) => api.get(`/productos/${id}`),
  
  create: (data) => api.post('/productos', data),
  
  update: (id, data) => api.put(`/productos/${id}`, data),
  
  delete: (id) => api.delete(`/productos/${id}`)
};
```

---

## Utilidades

### formatters.js
**Ubicación**: `/utils/formatters.js`

```javascript
/**
 * Formatea número como moneda
 */
export const formatCurrency = (amount) => {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN'
  }).format(amount);
};

/**
 * Formatea fecha
 */
export const formatDate = (date, format = 'short') => {
  const options = format === 'short' 
    ? { year: 'numeric', month: '2-digit', day: '2-digit' }
    : { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' };
  
  return new Intl.DateTimeFormat('es-MX', options).format(new Date(date));
};

/**
 * Formatea número con separadores de miles
 */
export const formatNumber = (num) => {
  return new Intl.NumberFormat('es-MX').format(num);
};
```

---

### validators.js
**Ubicación**: `/utils/validators.js`

```javascript
/**
 * Validadores de campos
 */
export const validators = {
  required: (value) => {
    return value !== null && value !== undefined && value !== '';
  },
  
  email: (value) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(value);
  },
  
  minLength: (value, length) => {
    return value.length >= length;
  },
  
  maxLength: (value, length) => {
    return value.length <= length;
  },
  
  min: (value, min) => {
    return Number(value) >= min;
  },
  
  max: (value, max) => {
    return Number(value) <= max;
  },
  
  rfc: (value) => {
    const regex = /^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$/;
    return regex.test(value);
  }
};
```

---

## Context API

### AuthContext.js
**Ubicación**: `/context/AuthContext.js`

```javascript
import React, { createContext, useState, useEffect } from 'react';
import { authService } from '../services/authService';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [usuario, setUsuario] = useState(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    verificarSesion();
  }, []);
  
  const verificarSesion = async () => {
    try {
      const data = await authService.verify();
      setUsuario(data.usuario);
    } catch (error) {
      localStorage.removeItem('token');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <AuthContext.Provider value={{ usuario, setUsuario, loading }}>
      {children}
    </AuthContext.Provider>
  );
};
```

---

## Mejores Prácticas

### 1. Nomenclatura
- Componentes: PascalCase (ej: `ProductoCard.jsx`)
- Funciones: camelCase (ej: `handleSubmit`)
- Constantes: UPPER_SNAKE_CASE (ej: `API_URL`)
- Archivos de servicios: camelCase (ej: `productosService.js`)

### 2. Estructura de Componentes
```jsx
// Imports
import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';

// Componente
const MiComponente = ({ prop1, prop2 }) => {
  // State
  const [state, setState] = useState();
  
  // Effects
  useEffect(() => {
    // ...
  }, []);
  
  // Handlers
  const handleClick = () => {
    // ...
  };
  
  // Render
  return (
    <div>
      {/* JSX */}
    </div>
  );
};

// PropTypes
MiComponente.propTypes = {
  prop1: PropTypes.string.isRequired,
  prop2: PropTypes.number
};

// Default props
MiComponente.defaultProps = {
  prop2: 0
};

export default MiComponente;
```

### 3. Manejo de Errores
```jsx
try {
  const result = await someAsyncOperation();
  // Success handling
} catch (error) {
  console.error('Error:', error);
  setError(error.message || 'Ocurrió un error');
  // Optional: mostrar toast/notificación
}
```

### 4. Optimización
- Usar `React.memo` para componentes que no cambian frecuentemente
- Implementar lazy loading para rutas
- Usar `useMemo` y `useCallback` cuando sea apropiado
- Evitar renders innecesarios

### 5. Accesibilidad
- Usar labels en formularios
- Agregar atributos ARIA cuando sea necesario
- Asegurar navegación por teclado
- Mantener contraste adecuado de colores
