# 🚀 DEPLOYMENT OCR SUPABASE - PASO A PASO

## ✅ PASO 1: Verificar Archivos (COMPLETADO)

```bash
✅ Node.js v20.19.5 instalado
✅ npm 10.8.2 instalado
✅ Supabase CLI 2.48.3 instalado
✅ Edge Function creada: supabase/functions/ocr-process/index.ts
✅ Migración creada: supabase/migrations/20251011_ocr_documents_versioning.sql
✅ Proyecto vinculado: gomnouwackzvthpwyric
```

---

## 📝 PASO 2: Aplicar Migración en Supabase Dashboard

### Opción A: Desde Dashboard (Recomendado)

1. **Abre Supabase Dashboard**
   ```
   https://supabase.com/dashboard/project/gomnouwackzvthpwyric/editor
   ```

2. **Ve a SQL Editor**
   - Menú lateral → **SQL Editor**
   - Clic en **"New Query"**

3. **Copia y Pega el SQL**
   ```bash
   # En tu terminal, copia el contenido:
   cat supabase/migrations/20251011_ocr_documents_versioning.sql
   ```

4. **Ejecuta la Query**
   - Pega el SQL en el editor
   - Clic en **"Run"** o presiona `Ctrl+Enter`

5. **Verificar Resultado**
   Deberías ver:
   ```
   ✅ Success. No rows returned
   ```

### Opción B: Verificar si ya existe

Ejecuta esto en SQL Editor:
```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name = 'evt_documentos_ocr';
```

Si retorna una fila, **la tabla ya existe** ✅

---

## 🔐 PASO 3: Configurar Google Vision Credentials

### En Supabase Dashboard:

1. **Ve a Settings**
   ```
   https://supabase.com/dashboard/project/gomnouwackzvthpwyric/settings/vault
   ```

2. **Ve a "Secrets" (Variables de Entorno)**
   - Menú lateral → **Settings**
   - Tab **"Vault"** o **"Secrets"**

3. **Crear Nuevo Secret**
   - Clic en **"New Secret"**
   - Name: `GOOGLE_VISION_CREDENTIALS`
   - Value: `{"type":"service_account","project_id":"tu-proyecto",...}` (JSON completo)
   - Clic **"Create"**

### ⚠️ Si no tienes las credenciales:

1. Ve a [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Selecciona o crea un proyecto
3. Habilita "Cloud Vision API"
4. Crea "Service Account"
5. Descarga el archivo JSON
6. Copia TODO el contenido del JSON

---

## 🚀 PASO 4: Deploy Edge Function

### Desde tu terminal:

```bash
cd /home/rodrichrz/proyectos/V20---\ recuperacion/project2

# Deploy la función
npx supabase functions deploy ocr-process
```

### Esperar mensaje:
```
Deploying Function (version xxxxxxxx)...
Function URL: https://gomnouwackzvthpwyric.supabase.co/functions/v1/ocr-process
✅ Deployed!
```

---

## ✅ PASO 5: Verificar Deployment

### 5.1 Verificar Edge Function

```bash
# Listar funciones deployadas
npx supabase functions list
```

Deberías ver:
```
┌──────────────┬─────────┬───────────────────────────────────────────┐
│ NAME         │ VERSION │ URL                                       │
├──────────────┼─────────┼───────────────────────────────────────────┤
│ ocr-process  │ v1      │ https://gomnouwackzvthpwyric.supabase.co/ │
│              │         │ functions/v1/ocr-process                  │
└──────────────┴─────────┴───────────────────────────────────────────┘
```

### 5.2 Verificar Tabla en Base de Datos

En SQL Editor, ejecuta:
```sql
SELECT
  table_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_name = 'evt_documentos_ocr'
ORDER BY ordinal_position
LIMIT 10;
```

Deberías ver columnas como:
- id (uuid)
- evento_id (uuid)
- nombre_archivo (text)
- archivo_path (text)
- version (integer)
- etc.

### 5.3 Verificar Bucket

1. Ve a Storage en Dashboard:
   ```
   https://supabase.com/dashboard/project/gomnouwackzvthpwyric/storage/buckets
   ```

2. Verifica que existe el bucket **"event-docs"**

3. Si NO existe, créalo:
   - Clic **"New Bucket"**
   - Name: `event-docs`
   - Public: **NO** (privado)
   - Clic **"Create"**

---

## 🧪 PASO 6: Probar el Sistema

### Prueba Manual desde Frontend

1. **Inicia el frontend**
   ```bash
   npm run dev
   ```

2. **Ve a la aplicación**
   ```
   http://localhost:5173
   ```

3. **Prueba OCR**
   - Ve a un evento
   - Finanzas → Nuevo Gasto
   - Haz clic en **"Extraer datos automáticamente (OCR)"**
   - Sube tu imagen `ocr.jpg`

4. **Verificar en Console del navegador (F12)**
   Deberías ver:
   ```
   🚀 [OCR Supabase] Procesando documento: ocr.jpg
   📁 Evento: {evento-id}
   📡 Llamando a Edge Function: https://...
   ✅ [OCR Supabase] Procesamiento exitoso
   📊 Confianza: XX%
   💾 Archivo guardado: {evento-id}/gastos/...
   🔢 Versión: 1
   ```

### Verificar en Supabase

1. **Ver archivo en Storage**
   ```
   Storage → event-docs → {evento-id} → gastos
   ```
   Deberías ver: `1234567890-v1-ocr.jpg`

2. **Ver registro en Base de Datos**
   SQL Editor:
   ```sql
   SELECT
     nombre_archivo,
     version,
     confianza_general,
     datos_extraidos->>'total' as total,
     estado_procesamiento,
     created_at
   FROM evt_documentos_ocr
   ORDER BY created_at DESC
   LIMIT 5;
   ```

---

## 🔄 PASO 7: Probar Versionado

### Sube el mismo archivo 2 veces

1. Sube `ocr.jpg` por primera vez → **v1**
2. Sube `ocr.jpg` por segunda vez → **v2**

### Verificar Versiones

En SQL Editor:
```sql
SELECT
  nombre_archivo,
  version,
  archivo_path,
  confianza_general,
  created_at
FROM evt_documentos_ocr
WHERE nombre_archivo LIKE '%ocr%'
ORDER BY version DESC;
```

Deberías ver:
```
nombre_archivo | version | archivo_path                          | confianza_general
---------------|---------|---------------------------------------|------------------
ocr.jpg        | 2       | evento-x/gastos/1234-v2-ocr.jpg      | 85
ocr.jpg        | 1       | evento-x/gastos/1233-v1-ocr.jpg      | 80
```

---

## 📊 PASO 8: Ver Estadísticas

### Consulta Estadísticas

```sql
SELECT
  COUNT(*) as total_documentos,
  AVG(confianza_general)::int as confianza_promedio,
  COUNT(CASE WHEN confianza_general >= 85 THEN 1 END) as excelentes,
  COUNT(CASE WHEN confianza_general >= 70 AND confianza_general < 85 THEN 1 END) as buenos,
  COUNT(CASE WHEN confianza_general < 70 THEN 1 END) as regulares,
  SUM((datos_extraidos->>'total')::numeric) as total_gastos_detectados
FROM evt_documentos_ocr
WHERE deleted_at IS NULL
  AND estado_procesamiento = 'completed';
```

---

## 🐛 TROUBLESHOOTING

### Error: "Backend no disponible"
```bash
# Ver logs de la Edge Function
npx supabase functions logs ocr-process
```

### Error: "Google Vision not configured"
- Verifica que el secret `GOOGLE_VISION_CREDENTIALS` exista
- Ve a Settings → Vault → Secrets

### Error: "Table doesn't exist"
- Vuelve al Paso 2 y aplica la migración

### Edge Function no responde
```bash
# Verificar deployment
npx supabase functions list

# Si no aparece, re-deploy
npx supabase functions deploy ocr-process
```

---

## ✅ CHECKLIST FINAL

- [ ] Tabla `evt_documentos_ocr` existe en base de datos
- [ ] Bucket `event-docs` existe y está privado
- [ ] Secret `GOOGLE_VISION_CREDENTIALS` configurado
- [ ] Edge Function `ocr-process` deployada
- [ ] Edge Function aparece en `npx supabase functions list`
- [ ] Frontend puede llamar a Edge Function
- [ ] OCR procesa y extrae datos
- [ ] Archivo se guarda en bucket
- [ ] Registro se crea en base de datos
- [ ] Versionado funciona (v1, v2, v3...)

---

## 🎉 ¡TODO LISTO!

Una vez que todos los items del checklist estén ✅, tu sistema OCR está completamente funcional.

### Próximos pasos:

1. Probar con diferentes tipos de tickets
2. Verificar que el versionado funcione
3. Ver estadísticas de precisión
4. Ajustar categorías según necesites

---

## 📚 Documentación

- **Guía Completa**: [OCR_SUPABASE_GUIA_COMPLETA.md](./OCR_SUPABASE_GUIA_COMPLETA.md)
- **Resumen**: [OCR_SUPABASE_RESUMEN_EJECUTIVO.md](./OCR_SUPABASE_RESUMEN_EJECUTIVO.md)

---

**Versión**: 1.0
**Fecha**: Octubre 2025
**Estado**: Lista para deployment
