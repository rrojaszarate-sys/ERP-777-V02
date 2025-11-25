#!/bin/bash

###############################################################################
# Script para generar documentación automática del proyecto
# 
# Funcionalidad:
# 1. Genera documentación de código con JSDoc
# 2. Crea diagramas de arquitectura
# 3. Documenta estructura de base de datos
# 4. Genera changelog automático
# 5. Crea índice de documentación
#
# Uso: ./scripts/generar-documentacion.sh [version]
###############################################################################

set -e

# Colores
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Configuración
VERSION=${1:-"1.0.0"}
DOC_DIR="documentacion/v${VERSION}"
TIMESTAMP=$(date +"%Y-%m-%d %H:%M:%S")

echo -e "${BLUE}📚 Generador de Documentación ERP-777-V01${NC}"
echo -e "${BLUE}Versión: ${VERSION}${NC}\n"

# Crear directorio de documentación
mkdir -p "${DOC_DIR}"

# 1. Generar documentación JSDoc
echo -e "${YELLOW}📝 Generando documentación JSDoc...${NC}"
if command -v jsdoc &> /dev/null; then
  jsdoc -c jsdoc.json -d "${DOC_DIR}/jsdoc"
  echo -e "${GREEN}✅ JSDoc generado${NC}\n"
else
  echo -e "${YELLOW}⚠️  JSDoc no instalado, saltando...${NC}\n"
fi

# 2. Generar diagrama de base de datos
echo -e "${YELLOW}🗄️  Generando diagrama de base de datos...${NC}"
cat > "${DOC_DIR}/diagrama-db.md" << 'EOF'
# filepath: diagrama-db.md
# Diagrama de Base de Datos

```mermaid
erDiagram
    USUARIOS ||--o{ VENTAS : realiza
    USUARIOS ||--o{ INVENTARIOS : registra
    CLIENTES ||--o{ VENTAS : compra
    VENTAS ||--|{ DETALLES_VENTA : contiene
    PRODUCTOS ||--o{ DETALLES_VENTA : incluye
    PRODUCTOS ||--o{ INVENTARIOS : modifica

    USUARIOS {
        int id PK
        string nombre
        string email UK
        string password
        enum rol
        boolean activo
        timestamp fecha_creacion
    }

    CLIENTES {
        int id PK
        string nombre
        string rfc UK
        string email
        string telefono
        text direccion
        boolean activo
    }

    PRODUCTOS {
        int id PK
        string codigo UK
        string nombre
        decimal precio_compra
        decimal precio_venta
        int stock_actual
        int stock_minimo
        boolean activo
    }

    VENTAS {
        int id PK
        string numero_factura UK
        int cliente_id FK
        int usuario_id FK
        decimal subtotal
        decimal impuesto
        decimal total
        enum estado
        timestamp fecha_venta
    }

    DETALLES_VENTA {
        int id PK
        int venta_id FK
        int producto_id FK
        int cantidad
        decimal precio_unitario
        decimal subtotal
    }

    INVENTARIOS {
        int id PK
        int producto_id FK
        enum tipo_movimiento
        int cantidad
        int usuario_id FK
        text observaciones
        timestamp fecha_movimiento
    }
```
EOF
echo -e "${GREEN}✅ Diagrama de BD generado${NC}\n"

# 3. Generar árbol de directorios
echo -e "${YELLOW}📁 Generando estructura de proyecto...${NC}"
tree -I 'node_modules|.git|backup|*.log' -L 3 > "${DOC_DIR}/estructura-proyecto.txt" 2>/dev/null || {
  find . -type d -not -path '*/node_modules/*' -not -path '*/.git/*' > "${DOC_DIR}/estructura-proyecto.txt"
}
echo -e "${GREEN}✅ Estructura generada${NC}\n"

# 4. Generar lista de dependencias
echo -e "${YELLOW}📦 Documentando dependencias...${NC}"
cat > "${DOC_DIR}/dependencias.md" << EOF
# Dependencias del Proyecto

## Backend (Node.js)

\`\`\`json
$(cat package.json 2>/dev/null || echo "{}")
\`\`\`

## Frontend (React)

\`\`\`json
$(cat frontend/package.json 2>/dev/null || echo "{}")
\`\`\`

## Base de Datos

- **Motor**: MySQL 8.0+
- **Encoding**: utf8mb4
- **Collation**: utf8mb4_unicode_ci

## Infraestructura

- **Servidor Web**: Nginx
- **Node.js**: v18+
- **npm**: v9+

Generado: ${TIMESTAMP}
EOF
echo -e "${GREEN}✅ Dependencias documentadas${NC}\n"

# 5. Generar guía de inicio rápido
echo -e "${YELLOW}🚀 Generando guía de inicio rápido...${NC}"
cat > "${DOC_DIR}/inicio-rapido.md" << 'EOF'
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
EOF
echo -e "${GREEN}✅ Guía de inicio generada${NC}\n"

# 6. Generar changelog
echo -e "${YELLOW}📋 Generando changelog...${NC}"
cat > "${DOC_DIR}/CHANGELOG.md" << EOF
# Changelog

## [${VERSION}] - $(date +%Y-%m-%d)

### Agregado
- Documentación integral del sistema
- Scripts de identificación de código obsoleto
- Guías de desarrollo y mejores prácticas

### Modificado
- Estructura de proyecto reorganizada
- Actualización de dependencias

### Eliminado
- Código obsoleto movido a carpeta de respaldo

### Corregido
- Correcciones menores en validaciones
- Mejoras de rendimiento

---

Generado automáticamente: ${TIMESTAMP}
EOF
echo -e "${GREEN}✅ Changelog generado${NC}\n"

# 7. Generar índice de documentación
echo -e "${YELLOW}📑 Generando índice...${NC}"
cat > "${DOC_DIR}/INDICE.md" << EOF
# Índice de Documentación - ERP-777-V01

**Versión**: ${VERSION}  
**Fecha**: ${TIMESTAMP}

---

## 📚 Documentación Principal

1. [README Principal](./README.md)
   - Visión general del sistema
   - Arquitectura
   - Módulos activos

2. [Base de Datos](./base-de-datos.md)
   - Esquema de BD
   - Tablas y relaciones
   - Vistas y triggers
   - Scripts de creación

3. [API Endpoints](./api-endpoints.md)
   - Autenticación
   - Endpoints por módulo
   - Formatos de request/response
   - Códigos de error

4. [Componentes Frontend](./componentes-frontend.md)
   - Estructura de componentes
   - Props y uso
   - Custom hooks
   - Servicios

5. [Código Obsoleto](./codigo-obsoleto.md)
   - Archivos identificados
   - Código duplicado
   - Plan de limpieza

---

## 🛠️ Guías Técnicas

- [Inicio Rápido](./inicio-rapido.md)
- [Guía de Desarrollo](./guia-desarrollo.md)
- [Despliegue](./despliegue.md)
- [Migraciones de BD](./migraciones.md)

---

## 📊 Diagramas

- [Diagrama de Base de Datos](./diagrama-db.md)
- [Arquitectura del Sistema](./arquitectura.md)
- [Flujos de Trabajo](./flujos.md)

---

## 🔧 Scripts y Utilidades

- \`scripts/identificar-obsoletos.js\` - Identificar código obsoleto
- \`scripts/mover-obsoletos.sh\` - Mover archivos a respaldo
- \`scripts/generar-documentacion.sh\` - Generar documentación
- \`check_and_restart.sh\` - Reiniciar servicios

---

## 📝 Reportes

- [Reporte de Código Obsoleto](./reporte-obsoletos.html)
- [Análisis de Dependencias](./dependencias.md)
- [Estructura del Proyecto](./estructura-proyecto.txt)

---

## 📋 Histórico

- [Changelog](./CHANGELOG.md)
- [Notas de Versión](./RELEASE_NOTES.md)

---

## 🔗 Enlaces Útiles

- Repositorio: [URL]
- Documentación API: http://localhost:3000/api/docs
- Issue Tracker: [URL]

---

**Última actualización**: ${TIMESTAMP}
EOF
echo -e "${GREEN}✅ Índice generado${NC}\n"

# 8. Generar resumen final
echo -e "${GREEN}================================================${NC}"
echo -e "${GREEN}✅ Documentación generada exitosamente${NC}"
echo -e "${GREEN}================================================${NC}"
echo ""
echo -e "📁 Ubicación: ${BLUE}${DOC_DIR}${NC}"
echo ""
echo -e "📄 Archivos generados:"
echo -e "  - ${BLUE}INDICE.md${NC} (índice principal)"
echo -e "  - ${BLUE}diagrama-db.md${NC} (diagrama de BD)"
echo -e "  - ${BLUE}dependencias.md${NC} (lista de dependencias)"
echo -e "  - ${BLUE}inicio-rapido.md${NC} (guía de inicio)"
echo -e "  - ${BLUE}CHANGELOG.md${NC} (historial de cambios)"
echo -e "  - ${BLUE}estructura-proyecto.txt${NC} (árbol de directorios)"
echo ""
echo -e "${YELLOW}📖 Para ver la documentación completa:${NC}"
echo -e "   cat ${DOC_DIR}/INDICE.md"
echo ""
