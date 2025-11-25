# OCR Module - Reconocimiento Óptico de Caracteres

## 📋 Descripción

Módulo de OCR (Optical Character Recognition) para procesamiento automático de documentos financieros (tickets y facturas) con extracción de datos estructurados.

## 🎯 Características

- ✅ **Procesamiento automático** de tickets y facturas
- ✅ **Detección automática** del tipo de documento
- ✅ **Extracción estructurada** de datos clave
- ✅ **Validación manual** de documentos procesados
- ✅ **Almacenamiento en Supabase** Storage
- ✅ **Dashboard de estadísticas** en tiempo real
- ✅ **Búsqueda y filtrado** de documentos
- ✅ **Simulación de procesamiento** (listo para integrar Google Vision API)

## 📁 Estructura

```
src/modules/ocr/
├── types/
│   └── OCRTypes.ts          # Definiciones de tipos TypeScript
├── services/
│   └── ocrService.ts        # Servicio principal de OCR
├── pages/
│   └── OcrTestPage.tsx      # Página de pruebas/dashboard OCR
└── README.md                # Esta documentación
```

## 🚀 Uso

### 1. Acceder a la página de pruebas

Navega a: `http://localhost:5173/ocr/test`

### 2. Procesar un documento

1. Selecciona el tipo: **Auto-detectar**, **Ticket** o **Factura**
2. Haz clic en **"Seleccionar Archivo"**
3. Elige un archivo (JPG, PNG o PDF, máximo 50MB)
4. Espera el procesamiento (2-3 segundos)
5. Verifica los datos extraídos

### 3. Validar documentos

- Haz clic en el botón **"Validar"** junto a cada documento procesado
- Los documentos validados muestran un badge verde ✓

### 4. Buscar documentos

Usa la barra de búsqueda para filtrar por:
- Nombre de archivo
- Texto extraído
- RFC
- Establecimiento
- Cualquier campo de los datos extraídos

## 📊 Datos Extraídos

### Tickets

```typescript
{
  establecimiento: string,
  direccion: string,
  fecha: string,
  hora: string,
  total: number,
  subtotal: number,
  iva: number,
  forma_pago: string,
  productos: Array<{
    nombre: string,
    cantidad: number,
    precio_unitario: number,
    precio_total: number
  }>
}
```

### Facturas (CFDI)

```typescript
{
  uuid: string,
  serie: string,
  folio: string,
  rfc_emisor: string,
  nombre_emisor: string,
  rfc_receptor: string,
  subtotal: number,
  iva: number,
  total: number,
  forma_pago: string,
  metodo_pago: string,
  fecha_emision: string,
  estado: string,
  validado_sat: boolean
}
```

## 🔧 API del Servicio

### `ocrService.processDocument()`

Procesa un documento con OCR:

```typescript
const result = await ocrService.processDocument({
  file: File,
  config: {
    tipo_documento: 'ticket' | 'factura' | 'auto',
    idioma: 'spa',
    preprocesar: true,
    extraer_texto_completo: true,
    validar_automaticamente: false
  },
  evento_id: string,
  user_id: string
});
```

### `ocrService.getDocuments()`

Obtiene lista de documentos con filtros:

```typescript
const documents = await ocrService.getDocuments({
  evento_id: 'evt-123',
  tipo_documento: 'ticket',
  estado_procesamiento: 'completed',
  validado: true,
  limit: 50,
  orderBy: 'created_at',
  order: 'desc'
});
```

### `ocrService.validateDocument()`

Valida manualmente un documento:

```typescript
await ocrService.validateDocument(
  docId,
  userId,
  'Notas de validación opcionales'
);
```

### `ocrService.deleteDocument()`

Elimina un documento:

```typescript
await ocrService.deleteDocument(docId);
```

## 🗄️ Base de Datos

### Tabla: `evt_documentos_ocr`

```sql
CREATE TABLE evt_documentos_ocr (
  id UUID PRIMARY KEY,
  evento_id TEXT,
  nombre_archivo TEXT,
  ruta_storage TEXT,
  tipo_documento TEXT,
  estado_procesamiento TEXT,
  confianza_general INTEGER,
  datos_ticket JSONB,
  datos_factura JSONB,
  texto_completo TEXT,
  validado BOOLEAN,
  validado_por TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

### Campos OCR en `evt_ingresos` y `evt_gastos`

```sql
ALTER TABLE evt_ingresos ADD COLUMN documento_ocr_id UUID;
ALTER TABLE evt_ingresos ADD COLUMN ocr_confianza INTEGER;
ALTER TABLE evt_ingresos ADD COLUMN ocr_validado BOOLEAN;

ALTER TABLE evt_gastos ADD COLUMN documento_ocr_id UUID;
ALTER TABLE evt_gastos ADD COLUMN ocr_confianza INTEGER;
ALTER TABLE evt_gastos ADD COLUMN ocr_validado BOOLEAN;
```

## 🔐 Storage (Supabase)

### Bucket: `event_docs`

Los documentos se almacenan en:
```
event_docs/
  └── {evento_id}/
      └── ocr/
          └── {timestamp}_{filename}
```

### Configuración requerida:

```sql
-- Crear bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('event_docs', 'event_docs', true);

-- Políticas de acceso
CREATE POLICY "Public read access"
ON storage.objects FOR SELECT
USING (bucket_id = 'event_docs');

CREATE POLICY "Authenticated users can upload"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'event_docs' AND auth.role() = 'authenticated');
```

## 🎨 Componentes UI Creados

### Card Components
- `Card` - Contenedor principal
- `CardHeader` - Encabezado con borde
- `CardTitle` - Título estilizado
- `CardContent` - Contenido con padding

### Alert Components
- `Alert` - Mensaje de alerta
- `AlertDescription` - Descripción del alert

### Progress Component
- `Progress` - Barra de progreso animada

### Separator Component
- `Separator` - Línea divisoria horizontal/vertical

## 🔮 Próximos Pasos

1. **Integración con Google Vision API**
   - Reemplazar simulación con llamadas reales a Google Vision
   - Configurar credenciales y API keys

2. **Conversión a Ingresos/Gastos**
   - Implementar funciones en `financesService.ts`:
     - `createIncomeFromOCR()`
     - `createExpenseFromOCR()`

3. **Integración en Formularios**
   - Agregar botón OCR en `ExpenseForm.tsx`
   - Agregar botón OCR en `IncomeForm.tsx`
   - Pre-llenar campos con datos extraídos

4. **Dashboard OCR**
   - Crear componente `OcrDashboard.tsx`
   - Mostrar métricas de procesamiento
   - Gráficos de confianza y validación

## 📝 Notas Importantes

- **Modo Simulación**: Actualmente el servicio simula el procesamiento OCR con datos de ejemplo
- **Producción**: Para usar en producción, implementar integración real con Google Vision API
- **Costos**: Google Vision API tiene costos por uso, revisar pricing antes de implementar
- **Validación SAT**: Para facturas, se puede integrar validación real con el SAT

## 🐛 Troubleshooting

### Error: "evt_documentos_ocr no existe"

Ejecuta las migraciones en Supabase:
```bash
# En Supabase SQL Editor
\i supabase/migrations/20250107_create_ocr_table.sql
\i supabase/migrations/20250107_add_ocr_fields_to_finances.sql
```

### Error: "event_docs bucket no existe"

Crea el bucket en Supabase Storage:
1. Ve a Storage → Buckets
2. Create a new bucket: `event_docs`
3. Configura como público para lectura

### Documentos no se cargan

Verifica:
1. Variables de entorno de Supabase configuradas
2. Bucket `event_docs` existe
3. RLS policies habilitadas
4. Usuario autenticado

## 📚 Referencias

- [Google Vision API Docs](https://cloud.google.com/vision/docs)
- [Supabase Storage Docs](https://supabase.com/docs/guides/storage)
- [React Dropzone](https://react-dropzone.js.org/)
- [Tesseract.js](https://tesseract.projectnaptha.com/) (alternativa open-source)
