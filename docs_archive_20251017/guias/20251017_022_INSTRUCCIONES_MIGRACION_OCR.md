# 🚀 INSTRUCCIONES: Ejecutar Migración OCR en Supabase

## ✅ PROBLEMA RESUELTO
Ya hemos arreglado el archivo de migración eliminando las referencias a tablas que no existen (`eventos`, `evt_gastos`, `auth.users` como foreign keys).

## 📋 PASOS PARA EJECUTAR LA MIGRACIÓN

### 1. Acceder al Dashboard de Supabase
```
🔗 URL: https://gomnouwackzvthpwyric.supabase.co
```
- Ve a tu proyecto en Supabase
- Entra en la sección **"SQL Editor"** (en el menú izquierdo)

### 2. Ejecutar la Migración
- Abre el archivo: `EJECUTAR_EN_SUPABASE_DASHBOARD.sql`
- Copia TODO el contenido del archivo
- Pégalo en el SQL Editor de Supabase
- Haz click en **"Run"** (botón verde)

### 3. Verificar que Funcionó
Al final del SQL verás una consulta de verificación que mostrará:
```
✅ MIGRACIÓN COMPLETADA EXITOSAMENTE
Tabla evt_documentos_ocr creada con todos sus índices, triggers y políticas RLS
```

Si ves este mensaje, ¡la migración fue exitosa!

## 🔍 QUÉ SE CREÓ

### Tabla Principal: `evt_documentos_ocr`
- **id**: Identificador único UUID
- **evento_id**: Referencia al evento (sin foreign key por ahora)
- **nombre_archivo**: Nombre original del archivo
- **archivo_path**: Ruta en el bucket de Supabase
- **estado_procesamiento**: pending, processing, completed, failed
- **texto_completo**: Resultado del OCR
- **datos_extraidos**: JSON con datos estructurados
- **establecimiento, total, fecha_documento**: Campos rápidos para búsquedas
- **Sistema de versionado**: Versiones automáticas por archivo
- **Auditoría completa**: created_by, updated_at, soft delete

### Índices Creados
- **evento_id**: Para búsquedas por evento
- **estado_procesamiento**: Para filtrar por estado
- **fecha_documento**: Para búsquedas por fecha
- **establecimiento**: Para búsquedas por lugar
- **datos_extraidos**: Índice GIN para búsquedas en JSON

### Funciones y Triggers
- **update_evt_documentos_ocr_updated_at()**: Actualiza automáticamente `updated_at`
- **get_next_ocr_document_version()**: Obtiene próximo número de versión

### Seguridad (RLS)
- Políticas para ver, insertar, actualizar y eliminar documentos
- Solo usuarios autenticados pueden acceder
- Los usuarios solo pueden modificar sus propios documentos

## 🎯 PRÓXIMOS PASOS

### 1. Verificar en la App
Después de ejecutar la migración, tu aplicación debería poder:
- Crear registros en `evt_documentos_ocr`
- Procesar documentos con OCR
- Versionar automáticamente archivos duplicados
- Guardar resultados estructurados

### 2. Agregar Foreign Keys (Opcional)
Una vez que tengas las tablas `eventos` y `evt_gastos` creadas, puedes agregar las foreign keys:
```sql
-- Ejecutar SOLO cuando existan las tablas referenciadas
ALTER TABLE evt_documentos_ocr 
ADD CONSTRAINT fk_evt_documentos_ocr_evento 
FOREIGN KEY (evento_id) REFERENCES eventos(id);

ALTER TABLE evt_documentos_ocr 
ADD CONSTRAINT fk_evt_documentos_ocr_gasto 
FOREIGN KEY (gasto_id) REFERENCES evt_gastos(id);
```

## 🚨 SI TIENES PROBLEMAS

### Error: "relation already exists"
Si ya existe la tabla, primero elimínala:
```sql
DROP TABLE IF EXISTS evt_documentos_ocr CASCADE;
```

### Error: "permission denied"
Asegúrate de estar usando una clave con permisos de administrador en Supabase.

### Error: "syntax error"
Asegúrate de copiar TODO el archivo completo, incluyendo todos los comentarios y líneas.

## 📞 SIGUIENTE: PRESENTAR PROPUESTA

Una vez que la migración esté funcionando, podemos proceder a:
1. **Presentar la propuesta** a tu amigo usando `PROPUESTA_FINAL_AMIGO.md`
2. **Negociar el precio** basado en los $55,000 MXN recomendados
3. **Planificar la entrega** del proyecto

¡Avísame cuando hayas ejecutado la migración y esté funcionando! 🎉