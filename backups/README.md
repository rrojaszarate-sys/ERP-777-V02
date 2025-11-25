# Respaldo Completo - Base de Datos ERP 777

## Información del Respaldo

**Fecha:** 18/11/2025, 7:07:27 p.m.
**Duración:** 56.54 segundos
**Base de datos:** postgres

## Archivos Generados

### 1. Estructura de la Base de Datos
- **Archivo:** `estructura_erp_2025-11-19T01-06-31.sql`
- **Tamaño:** 0.04 MB
- **Contenido:** Definiciones DDL (CREATE TABLE, índices, constraints, etc.)
- **Uso:** Restaurar la estructura de las tablas

### 2. Datos Completos
- **Archivo:** `datos_completos_2025-11-19T01-06-38.sql`
- **Tamaño:** 1.97 MB
- **Contenido:** INSERT statements con todos los datos actuales
- **Uso:** Restaurar los datos (requiere que la estructura ya exista)

## Cómo Restaurar el Respaldo

### Restauración Completa (Estructura + Datos)

```bash
# 1. Primero restaurar la estructura
psql "postgresql://[usuario]:[contraseña]@[host]:[puerto]/[database]" -f backups/estructura_erp_2025-11-19T01-06-31.sql

# 2. Luego restaurar los datos
psql "postgresql://[usuario]:[contraseña]@[host]:[puerto]/[database]" -f backups/datos_completos_2025-11-19T01-06-38.sql
```

### Restauración Solo de Datos (si la estructura ya existe)

```bash
psql "postgresql://[usuario]:[contraseña]@[host]:[puerto]/[database]" -f backups/datos_completos_2025-11-19T01-06-38.sql
```

## Notas Importantes

1. **Orden de restauración:** Siempre restaurar primero la ESTRUCTURA y luego los DATOS
2. **Triggers:** Los triggers se desactivan temporalmente durante la inserción de datos
3. **Secuencias:** Las secuencias se actualizan automáticamente después de insertar datos
4. **Formato:** Archivos SQL planos compatibles con PostgreSQL
5. **Base de datos vacía:** Es recomendable restaurar sobre una base de datos vacía

## Scripts de Respaldo

Los scripts utilizados para generar este respaldo están en:
- `scripts/backup-estructura-simple.mjs` - Respaldo de estructura DDL (tablas ERP)
- `scripts/backup-datos.mjs` - Respaldo de datos (INSERT statements)
- `scripts/backup-completo.mjs` - Script maestro (ejecuta ambos)

## Ejecución de Respaldos

### Respaldo completo (recomendado)
```bash
node scripts/backup-completo.mjs
```

### Respaldo solo de estructura
```bash
node scripts/backup-estructura-simple.mjs
```

### Respaldo solo de datos
```bash
node scripts/backup-datos.mjs
```

---

*Generado automáticamente por backup-completo.mjs*
