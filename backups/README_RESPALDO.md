# Respaldo de Base de Datos Supabase - ERP 777

## Información del Respaldo

**Fecha de generación:** $(date '+%Y-%m-%d %H:%M:%S')

**Base de datos:** gomnouwackzvthpwyric.supabase.co

## Archivos Generados

### 1. Respaldo SQL
- **Archivo:** `supabase_backup_2025-10-29_135924.sql`
- **Tamaño:** 2.4 MB
- **Formato:** SQL plano (compatible con PostgreSQL)
- **Contenido:** INSERT statements para todas las tablas

### 2. Respaldo JSON
- **Archivo:** `supabase_backup_2025-10-29_135924.json`
- **Tamaño:** 3.6 MB
- **Formato:** JSON estructurado
- **Contenido:** Datos completos en formato JSON con metadata

## Estadísticas del Respaldo

**Total de tablas exportadas:** 21 tablas
**Total de registros:** 1,440 registros

### Detalle por Tabla:

| Tabla | Registros |
|-------|-----------|
| evt_clientes | 10 |
| evt_eventos | 274 |
| evt_gastos | 500 |
| evt_ingresos | 597 |
| evt_cuentas_bancarias | 5 |
| evt_movimientos_bancarios | 0 |
| evt_cuentas_contables | 10 |
| evt_estados | 12 |
| evt_tipos_evento | 5 |
| evt_categorias_gastos | 5 |
| evt_categorias_ingresos | 6 |
| evt_documentos_ocr | 0 |
| evt_perfiles | 0 |
| evt_roles | 4 |
| evt_audit_log | 0 |
| evt_configuracion_alertas | 0 |
| evt_alertas_enviadas | 0 |
| evt_historial_reportes_diarios | 0 |
| core_users | 3 |
| core_companies | 1 |
| core_audit_log | 8 |

## Cómo Restaurar el Respaldo

### Opción 1: Usando el archivo SQL

\`\`\`bash
# Conectarse a la base de datos y ejecutar el SQL
psql "postgresql://[usuario]:[contraseña]@db.gomnouwackzvthpwyric.supabase.co:5432/postgres" -f supabase_backup_2025-10-29_135924.sql
\`\`\`

### Opción 2: Usando el archivo JSON

El archivo JSON puede ser utilizado para importar datos usando scripts personalizados con la API de Supabase.

## Notas Importantes

1. **Estructura de Base de Datos**: Este respaldo contiene SOLO los datos (INSERT statements). No incluye la definición de estructura (CREATE TABLE, etc.)

2. **Cascadas**: Los TRUNCATE incluyen CASCADE, lo que significa que eliminarán datos relacionados en tablas dependientes.

3. **Tablas Vacías**: Algunas tablas no tienen datos actualmente (evt_movimientos_bancarios, evt_documentos_ocr, etc.)

4. **Tabla _migrations**: No se pudo exportar ya que no está en el schema cache de PostgREST.

## Script de Respaldo

El script utilizado para generar este respaldo está disponible en:
- `backup-supabase.mjs` - Script principal de respaldo
- `backup-database.sh` - Script alternativo usando pg_dump (requiere password de BD)

## Ejecución del Respaldo

Para generar un nuevo respaldo:

\`\`\`bash
node backup-supabase.mjs
\`\`\`

El script utiliza las credenciales del archivo `.env` (VITE_SUPABASE_URL y VITE_SUPABASE_SERVICE_ROLE_KEY).

---

**Generado automáticamente por:** backup-supabase.mjs
