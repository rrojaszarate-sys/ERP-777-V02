# 🚀 INSTRUCCIONES PARA APLICAR LA MIGRACIÓN

## Opción 1: Usando Supabase Dashboard (RECOMENDADO)

### Paso 1: Acceder al SQL Editor
1. Ve a tu proyecto en [Supabase Dashboard](https://app.supabase.com)
2. En el menú lateral, haz clic en **"SQL Editor"**
3. Haz clic en **"New Query"**

### Paso 2: Copiar y Pegar el SQL
1. Abre el archivo: `supabase_old/migrations/20251023_add_financial_estimates_to_events.sql`
2. Copia TODO el contenido del archivo
3. Pégalo en el editor SQL de Supabase

### Paso 3: Ejecutar la Migración
1. Haz clic en el botón **"Run"** (o presiona Cmd/Ctrl + Enter)
2. Espera a que se complete la ejecución
3. Verifica que aparezca el mensaje de éxito

### Paso 4: Verificar los Cambios
Ejecuta esta consulta para verificar que todo se aplicó correctamente:

```sql
-- Verificar nuevas columnas
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'evt_eventos'
  AND column_name IN (
    'ganancia_estimada',
    'ingreso_estimado',
    'gastos_estimados',
    'utilidad_estimada',
    'porcentaje_utilidad_estimada',
    'ingreso_real'
  );

-- Verificar vista
SELECT *
FROM vw_eventos_analisis_financiero
LIMIT 5;
```

---

## Opción 2: Usando psql (Línea de Comandos)

### Prerrequisitos
Necesitas las credenciales de conexión de tu base de datos Supabase:
- Host
- Puerto
- Base de datos
- Usuario
- Contraseña

### Comando
```bash
# Obtén la cadena de conexión desde Supabase Dashboard > Project Settings > Database
# Formato: postgresql://[user]:[password]@[host]:[port]/[database]

# Ejecutar migración
psql "postgresql://[TU_CADENA_DE_CONEXION]" -f supabase_old/migrations/20251023_add_financial_estimates_to_events.sql
```

---

## Opción 3: Reparar Historial de Migraciones (Si usas Supabase CLI)

Si quieres usar `supabase db push`, primero necesitas reparar el historial:

```bash
# Paso 1: Reparar migraciones antiguas
npx supabase migration repair --status reverted 20250107 20250929012201 20250929015118 20250929015143 20250929015224 20250929015238

# Paso 2: Sincronizar con la base remota
npx supabase db pull

# Paso 3: Aplicar nueva migración
npx supabase db push
```

---

## ✅ Verificación Post-Migración

Después de aplicar la migración, verifica que todo funcione:

### 1. Verificar Columnas Nuevas
```sql
SELECT
  ganancia_estimada,
  gastos_estimados,
  utilidad_estimada,
  porcentaje_utilidad_estimada,
  ingreso_real
FROM evt_eventos
LIMIT 1;
```

### 2. Verificar Vista
```sql
SELECT
  nombre_proyecto,
  ingreso_estimado,
  ingreso_real,
  gastos_estimados,
  gastos_reales,
  utilidad_estimada,
  utilidad_real,
  margen_estimado,
  margen_real,
  status_financiero
FROM vw_eventos_analisis_financiero
LIMIT 5;
```

### 3. Probar Cálculos
```sql
-- Insertar evento de prueba
INSERT INTO evt_eventos (
  clave_evento,
  nombre_proyecto,
  cliente_id,
  tipo_evento_id,
  estado_id,
  fecha_evento,
  ganancia_estimada,
  gastos_estimados,
  utilidad_estimada,
  porcentaje_utilidad_estimada,
  total,
  total_gastos,
  utilidad,
  margen_utilidad
) VALUES (
  'TEST-2025-001',
  'Evento de Prueba Financiero',
  (SELECT id FROM evt_clientes LIMIT 1),
  (SELECT id FROM evt_tipos_evento LIMIT 1),
  1,
  CURRENT_DATE,
  100000.00, -- Ganancia estimada
  60000.00,  -- Gastos estimados
  40000.00,  -- Utilidad estimada (40%)
  40.00,     -- Margen estimado
  110000.00, -- Total real (ingreso real)
  65000.00,  -- Gastos reales
  45000.00,  -- Utilidad real
  40.91      -- Margen real
);

-- Verificar en la vista
SELECT * FROM vw_eventos_analisis_financiero
WHERE clave_evento = 'TEST-2025-001';

-- Limpiar evento de prueba
DELETE FROM evt_eventos WHERE clave_evento = 'TEST-2025-001';
```

---

## 🔍 Troubleshooting

### Error: "column already exists"
**Causa:** La columna ya fue creada en una ejecución anterior.
**Solución:** El script usa `ADD COLUMN IF NOT EXISTS`, así que esto es normal. Continúa con el siguiente paso.

### Error: "relation evt_tipos_evento does not exist"
**Causa:** El nombre de la tabla de tipos de evento es diferente.
**Solución:** Actualiza el JOIN en la vista con el nombre correcto de tu tabla.

### Error: "permission denied"
**Causa:** El usuario no tiene permisos para crear columnas/vistas.
**Solución:** Ejecuta como usuario con rol de superadmin o propietario de la base de datos.

### La vista no muestra datos
**Causa:** Puede que no haya eventos con `activo = true`.
**Solución:** Verifica con `SELECT COUNT(*) FROM evt_eventos WHERE activo = true;`

---

## 📝 Notas Importantes

1. **Backup:** Antes de aplicar, considera hacer un backup de la base de datos.
2. **Entorno:** Aplica primero en desarrollo/staging antes de producción.
3. **Rollback:** Si algo sale mal, puedes revertir eliminando las columnas:
   ```sql
   ALTER TABLE evt_eventos
   DROP COLUMN IF EXISTS ganancia_estimada,
   DROP COLUMN IF EXISTS ingreso_estimado,
   DROP COLUMN IF EXISTS gastos_estimados,
   DROP COLUMN IF EXISTS utilidad_estimada,
   DROP COLUMN IF EXISTS porcentaje_utilidad_estimada,
   DROP COLUMN IF EXISTS ingreso_real;

   DROP VIEW IF EXISTS vw_eventos_analisis_financiero;
   ```

---

## ✨ Siguiente Paso

Una vez aplicada la migración exitosamente, continúa con:
1. Agregar la ruta en el router (ver README_FINANCIAL_ANALYSIS.md)
2. Agregar enlace en el menú de navegación
3. Probar el formulario de eventos con los nuevos campos
4. Acceder a `/eventos/analisis-financiero` para ver el análisis completo

---

**Última Actualización:** 2025-10-23
**Archivo SQL:** `supabase_old/migrations/20251023_add_financial_estimates_to_events.sql`
