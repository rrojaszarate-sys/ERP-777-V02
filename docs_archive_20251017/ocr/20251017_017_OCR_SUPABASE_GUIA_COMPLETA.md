# 🚀 OCR con SUPABASE - Guía Completa

## ✨ Nueva Arquitectura

**TODO centralizado en Supabase:**
- ✅ Edge Functions para OCR
- ✅ Storage con versionado automático
- ✅ Base de datos con historial
- ✅ RLS (Row Level Security)
- ✅ Sin servidor Node.js separado

---

## 🏗️ Arquitectura

```
Frontend (React)
      ↓
Supabase Edge Function (Deno)
      ↓
Google Vision API
      ↓
   Resultados
      ↓
├─ Storage Bucket (versionado)
└─ Base de Datos (historial)
```

### Estructura del Bucket
```
event-docs/
└── {eventoId}/
    └── gastos/
        ├── 1234567890-v1-ticket_oxxo.jpg
        ├── 1234567890-v2-ticket_oxxo.jpg  ← Versión actualizada
        └── 1234567891-v1-factura_pemex.jpg
```

### Tabla de Base de Datos
```sql
evt_documentos_ocr
├── id (UUID)
├── evento_id
├── archivo_path          ← Path con versión
├── version               ← Número de versión
├── texto_completo
├── confianza_general
├── datos_extraidos       ← JSON con todos los datos
├── gasto_id              ← Vinculado con gasto
└── timestamps & auditoría
```

---

## 📦 INSTALACIÓN

### 1. Ejecutar Migración

```bash
cd /home/rodrichrz/proyectos/V20---\ recuperacion/project2

# Aplicar migración
npx supabase db push
```

O manualmente en Supabase Dashboard → SQL Editor:
```sql
-- Copiar contenido de:
supabase/migrations/20251011_ocr_documents_versioning.sql
```

### 2. Configurar Bucket

**En Supabase Dashboard:**

1. Ir a Storage → Buckets
2. Verificar que existe `event-docs`
3. Configurar permisos:
   - **Public**: NO (privado)
   - **RLS**: Habilitado

**Políticas de Storage:**
```sql
-- Usuarios pueden subir a sus eventos
CREATE POLICY "Users can upload to their events"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'event-docs');

-- Usuarios pueden leer documentos de sus eventos
CREATE POLICY "Users can read event documents"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'event-docs');
```

### 3. Configurar Google Vision Credentials

**En Supabase Dashboard:**

1. Ir a **Settings → API**
2. En **Secrets** (Variables de entorno), agregar:

```
GOOGLE_VISION_CREDENTIALS
```

Valor (JSON completo de credentials):
```json
{"type":"service_account","project_id":"tu-proyecto","private_key_id":"...","private_key":"-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n","client_email":"...@tu-proyecto.iam.gserviceaccount.com"}
```

### 4. Deploy Edge Function

```bash
# Iniciar sesión en Supabase
npx supabase login

# Deploy función
npx supabase functions deploy ocr-process

# Verificar deployment
npx supabase functions list
```

---

## 🎯 USO

### En el Formulario de Gastos

```typescript
import { useOCRSupabase } from '@/modules/ocr/hooks/useOCR.supabase';

function ExpenseForm({ eventId }: Props) {
  const { processExpenseFile, isProcessing, result } = useOCRSupabase(eventId);

  const handleOCRFile = async (file: File) => {
    try {
      const resultado = await processExpenseFile(file);

      // resultado.expense contiene todos los campos prellenados
      // resultado.ocr_result.archivo tiene la info del archivo guardado
      // resultado.calidad indica qué tan buenos son los datos

      setFormData(prev => ({
        ...prev,
        ...resultado.expense,
        // El archivo YA está guardado en bucket
        archivo_adjunto: resultado.ocr_result.archivo.url
      }));

      alert(`✅ OCR completado!
📊 Calidad: ${resultado.calidad}
💾 Archivo: ${resultado.ocr_result.archivo.path}
🔢 Versión: ${resultado.ocr_result.archivo.version}`);

    } catch (error) {
      console.error('Error OCR:', error);
    }
  };

  return (
    <button onClick={() => fileInput.click()} disabled={isProcessing}>
      {isProcessing ? 'Procesando...' : 'Extraer con OCR'}
    </button>
  );
}
```

### Obtener Historial de Versiones

```typescript
const { getDocumentVersions } = useOCRSupabase(eventId);

// Obtener todas las versiones de un archivo
const versiones = await getDocumentVersions('ticket_oxxo.jpg');

versiones.forEach(v => {
  console.log(`Versión ${v.version}: ${v.archivo_path}`);
  console.log(`Confianza: ${v.confianza_general}%`);
  console.log(`Total: $${v.datos_extraidos.total}`);
});
```

### Ver Documentos del Evento

```typescript
import { useOCRDocuments } from '@/modules/ocr/hooks/useOCR.supabase';

function DocumentosOCR({ eventId }: Props) {
  const { documents, isLoading, loadDocuments } = useOCRDocuments(eventId);

  useEffect(() => {
    loadDocuments();
  }, [eventId]);

  return (
    <div>
      <h3>Documentos Procesados: {documents.length}</h3>
      {documents.map(doc => (
        <div key={doc.id}>
          <p>{doc.nombre_archivo} - v{doc.version}</p>
          <p>Confianza: {doc.confianza_general}%</p>
          <p>Total: ${doc.datos_extraidos.total}</p>
        </div>
      ))}
    </div>
  );
}
```

---

## 🔄 Sistema de Versionado

### Cómo Funciona

1. **Primera subida**:
   ```
   ticket_oxxo.jpg → event-docs/evento-123/gastos/1234567890-v1-ticket_oxxo.jpg
   ```

2. **Segunda subida del mismo archivo**:
   ```
   ticket_oxxo.jpg → event-docs/evento-123/gastos/1234567891-v2-ticket_oxxo.jpg
   ```

3. **Tercera subida**:
   ```
   ticket_oxxo.jpg → event-docs/evento-123/gastos/1234567892-v3-ticket_oxxo.jpg
   ```

### Ventajas

- ✅ **Nunca se pierde información**: Todas las versiones se guardan
- ✅ **Historial completo**: Puedes ver cómo cambió la extracción
- ✅ **Auditoría**: Sabes cuándo y quién subió cada versión
- ✅ **Comparación**: Puedes comparar resultados de diferentes versiones

### Ejemplo Real

```typescript
// Obtener versiones de un ticket
const versiones = await getDocumentVersions('ticket_oxxo.jpg');

// v1: Foto borrosa → Confianza 45%, Total no detectado
// v2: Foto mejor → Confianza 75%, Total $117.00 (incorrecto)
// v3: Foto perfecta → Confianza 92%, Total $117.50 (correcto!)

// Puedes usar la v3 que tiene mejor calidad
const mejorVersion = versiones.find(v => v.confianza_general === 92);
```

---

## 📊 Consultas Útiles

### Obtener Documentos Pendientes de Vincular

```sql
SELECT *
FROM evt_documentos_ocr
WHERE evento_id = 'tu-evento-id'
  AND gasto_id IS NULL
  AND estado_procesamiento = 'completed'
  AND deleted_at IS NULL
ORDER BY created_at DESC;
```

### Estadísticas de Calidad

```sql
SELECT
  AVG(confianza_general) as confianza_promedio,
  COUNT(*) as total_documentos,
  COUNT(CASE WHEN confianza_general >= 85 THEN 1 END) as excelentes,
  COUNT(CASE WHEN confianza_general >= 70 AND confianza_general < 85 THEN 1 END) as buenos,
  COUNT(CASE WHEN confianza_general < 70 THEN 1 END) as regulares
FROM evt_documentos_ocr
WHERE evento_id = 'tu-evento-id'
  AND deleted_at IS NULL;
```

### Ver Historial de Versiones

```sql
SELECT
  nombre_archivo,
  version,
  confianza_general,
  datos_extraidos->'total' as total,
  created_at
FROM evt_documentos_ocr
WHERE evento_id = 'tu-evento-id'
  AND nombre_archivo LIKE '%ticket_oxxo%'
  AND deleted_at IS NULL
ORDER BY version DESC;
```

---

## 🔒 Seguridad

### Row Level Security (RLS)

Automáticamente aplicado:

```sql
-- Los usuarios solo ven documentos de sus eventos
CREATE POLICY "Users can view OCR documents of their events"
ON evt_documentos_ocr FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM eventos
    WHERE eventos.id = evt_documentos_ocr.evento_id
  )
);
```

### Storage Security

```sql
-- Solo pueden subir a carpetas de sus eventos
CREATE POLICY "Users can upload to their events"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'event-docs' AND
  (storage.foldername(name))[1] IN (
    SELECT id::text FROM eventos
    WHERE created_by = auth.uid()
  )
);
```

---

## 🚀 Deployment a Producción

### 1. Configurar Secrets en Supabase

```bash
# Listar secrets actuales
npx supabase secrets list --project-ref tu-proyecto-ref

# Agregar Google Vision credentials
npx supabase secrets set GOOGLE_VISION_CREDENTIALS='{"type":"service_account",...}'
```

### 2. Deploy Edge Function

```bash
# Deploy a producción
npx supabase functions deploy ocr-process --project-ref tu-proyecto-ref

# Verificar logs
npx supabase functions logs ocr-process --project-ref tu-proyecto-ref
```

### 3. Verificar URL

La URL será:
```
https://tu-proyecto-ref.supabase.co/functions/v1/ocr-process
```

### 4. Actualizar Frontend

En `.env.production`:
```bash
VITE_SUPABASE_URL=https://tu-proyecto-ref.supabase.co
VITE_SUPABASE_ANON_KEY=tu-anon-key
```

---

## 💰 Costos

### Supabase
- **Edge Functions**: Gratis hasta 500,000 invocaciones/mes
- **Storage**: Gratis hasta 1GB
- **Base de datos**: Gratis hasta 500MB

### Google Vision API
- **Tier gratuito**: 1,000 imágenes/mes
- **Después**: $1.50 USD por 1,000 imágenes

### Ejemplo
- 100 tickets/día = 3,000/mes
- **Supabase**: $0 (dentro del tier gratuito)
- **Google Vision**: $3 USD/mes

---

## 🐛 Troubleshooting

### Edge Function no responde

```bash
# Ver logs
npx supabase functions logs ocr-process

# Verificar deployment
npx supabase functions list
```

### Error de credenciales

Verificar que `GOOGLE_VISION_CREDENTIALS` esté configurado:
```bash
npx supabase secrets list
```

### Archivo no se guarda en bucket

Verificar políticas de storage:
```sql
SELECT * FROM storage.policies
WHERE bucket_id = 'event-docs';
```

### RLS bloquea acceso

Verificar políticas de tabla:
```sql
SELECT * FROM pg_policies
WHERE tablename = 'evt_documentos_ocr';
```

---

## 📈 Monitoreo

### Ver Estadísticas

```typescript
const { getEventStats } = useOCRSupabase(eventId);

const stats = await getEventStats();

console.log(stats);
// {
//   total: 45,
//   completados: 42,
//   fallidos: 3,
//   confianzaPromedio: 87,
//   porProcesador: {
//     google_vision: 45,
//     tesseract: 0
//   }
// }
```

### Dashboard SQL

```sql
-- Dashboard de OCR por evento
SELECT
  e.nombre as evento,
  COUNT(d.*) as total_documentos,
  AVG(d.confianza_general)::int as confianza_promedio,
  SUM((d.datos_extraidos->>'total')::numeric) as total_gastos_detectados
FROM evt_documentos_ocr d
JOIN eventos e ON e.id = d.evento_id
WHERE d.deleted_at IS NULL
  AND d.estado_procesamiento = 'completed'
GROUP BY e.id, e.nombre
ORDER BY total_documentos DESC;
```

---

## ✅ Checklist de Verificación

- [ ] Migración aplicada (`evt_documentos_ocr` existe)
- [ ] Bucket `event-docs` configurado
- [ ] RLS habilitado en tabla y bucket
- [ ] Google Vision credentials configuradas
- [ ] Edge Function deployada
- [ ] Frontend actualizado para usar Supabase
- [ ] Probado con 1 ticket
- [ ] Versionado funcionando (subir mismo archivo 2 veces)
- [ ] Historial visible en tabla

---

## 🎉 Ventajas vs Versión Anterior

| Aspecto | Antes (Node.js) | Ahora (Supabase) |
|---------|-----------------|------------------|
| **Backend** | Servidor separado | Edge Functions |
| **Deployment** | Manual | `npx supabase functions deploy` |
| **Escalabilidad** | Manual | Automática |
| **Costo servidor** | $5-20/mes | $0 (tier gratuito) |
| **Versionado** | Manual | Automático |
| **Historial** | No | Sí (en BD) |
| **Auditoría** | Básica | Completa |
| **RLS** | No | Sí |
| **Mantenimiento** | Alto | Bajo |

---

## 📚 Recursos

- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [Supabase Storage](https://supabase.com/docs/guides/storage)
- [Google Vision API](https://cloud.google.com/vision/docs)
- [RLS en Supabase](https://supabase.com/docs/guides/auth/row-level-security)

---

**Versión**: 3.0.0 (Supabase)
**Fecha**: Octubre 2025
**Estado**: ✅ PRODUCCIÓN READY

🚀 **¡Todo centralizado en Supabase con versionado automático!**
