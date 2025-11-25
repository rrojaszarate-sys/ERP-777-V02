# filepath: inicio-rapido.md
# Guía de Inicio Rápido

## Requisitos Previos

- Node.js v18+
- MySQL 8.0+
- npm v9+

## Instalación

### 1. Clonar repositorio

```bash
git clone [repository-url]
cd ERP-777-V01
```

### 2. Instalar dependencias

```bash
# Backend
npm install

# Frontend
cd frontend
npm install
cd ..
```

### 3. Configurar variables de entorno

```bash
cp .env.example .env
# Editar .env con tus credenciales
```

### 4. Crear base de datos

```bash
mysql -u root -p < database/schema.sql
```

### 5. Ejecutar migraciones

```bash
npm run migrate
```

### 6. Iniciar servicios

```bash
# Desarrollo
npm run dev

# Producción
npm run start
```

## Acceso

- **Frontend**: http://localhost:3001
- **Backend API**: http://localhost:3000/api
- **Documentación API**: http://localhost:3000/api/docs

## Credenciales por defecto

- **Usuario**: admin@empresa.com
- **Password**: admin123

⚠️ **IMPORTANTE**: Cambiar credenciales en producción

## Comandos Útiles

```bash
# Ejecutar tests
npm test

# Linter
npm run lint

# Build frontend
cd frontend && npm run build

# Ver logs
npm run logs

# Backup BD
npm run backup
```

## Solución de Problemas

### Error de conexión a BD

Verificar credenciales en `.env` y que MySQL esté corriendo:

```bash
systemctl status mysql
```

### Puerto en uso

Cambiar puerto en `.env`:

```
PORT=3001
```

### Problemas con node_modules

Limpiar y reinstalar:

```bash
rm -rf node_modules package-lock.json
npm install
```
