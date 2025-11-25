# Carpeta de Archivos Históricos (Antiguos)

## ⚠️ Aviso Importante

Esta carpeta contiene **archivos históricos y obsoletos** que fueron utilizados durante el desarrollo del proyecto pero que **ya no son necesarios para el funcionamiento actual** del sistema.

## 📅 Fecha de Archivo

**Archivado el**: 27 de Octubre de 2025

## 📁 Contenido

### `documentacion/`
Documentación obsoleta o desactualizada que fue reemplazada por la documentación oficial en la carpeta `docs/`.

**Total**: ~20 archivos Markdown

**Incluye**:
- Análisis antiguos del sistema
- Instrucciones de migración aplicadas
- Resúmenes de trabajos completados
- Guías de correcciones ya implementadas
- Planes de implementación ejecutados

### `scripts/`
Scripts de utilidad que fueron utilizados para poblar datos de prueba, migraciones, o correcciones puntuales, pero que ya no son necesarios.

**Total**: ~30 archivos JavaScript (.mjs)

**Incluye**:
- Scripts de población de datos
- Scripts de verificación ejecutados
- Scripts de corrección aplicados
- Generadores de datos de prueba antiguos
- Utilidades de migración completadas

### `sql/`
Scripts SQL que fueron ejecutados para correcciones, migraciones o poblaciones de datos, pero que ya fueron aplicados y no deben ejecutarse nuevamente.

**Total**: ~15 archivos SQL

**Incluye**:
- Scripts de corrección aplicados
- Planes de producción ejecutados
- Verificaciones completadas
- Migraciones aplicadas manualmente

## ⚠️ NO EJECUTAR

**IMPORTANTE**: Los scripts y archivos SQL en esta carpeta **NO deben ser ejecutados** nuevamente. Ya fueron aplicados en su momento y ejecutarlos podría causar inconsistencias en la base de datos.

## 🔍 ¿Por Qué Mantener Esta Carpeta?

1. **Historial**: Mantener registro de cómo se llegó al estado actual
2. **Referencia**: En caso de necesitar revisar decisiones pasadas
3. **Auditoría**: Trazabilidad de cambios importantes
4. **Aprendizaje**: Entender la evolución del proyecto

## ✅ Documentación Actual

Para la documentación oficial y actualizada del proyecto, consultar:

### Documentación en Raíz
- `README.md` - Documentación principal
- `CHANGELOG.md` - Historial de versiones
- `DEPLOYMENT.md` - Guía de deployment
- `DOCUMENTACION_COMPLETA.md` - Resumen de toda la documentación

### Documentación Técnica (`docs/`)
- `ARCHITECTURE.md` - Arquitectura del sistema
- `DATABASE.md` - Esquema de base de datos
- `BEST_PRACTICES.md` - Mejores prácticas
- `RESUMEN_DOCUMENTACION.md` - Índice maestro

## 🗑️ ¿Se Puede Eliminar?

**NO recomendado eliminar**, pero si necesitas liberar espacio:

1. Verificar que toda la información importante esté capturada en la documentación oficial
2. Crear un backup antes de eliminar
3. Considerar comprimir en un archivo .zip para almacenamiento

## 📦 Alternativa: Comprimir

Si deseas reducir espacio:

```bash
# Desde la raíz del proyecto
cd antiguos
tar -czf antiguos-backup-2025-10-27.tar.gz documentacion/ scripts/ sql/
# Esto creará un archivo comprimido que puedes guardar
```

## 🔐 Acceso

Esta carpeta es de **solo lectura** para referencia histórica. No se debe modificar ni agregar contenido nuevo aquí.

## 📞 Preguntas

Si tienes dudas sobre algún archivo en esta carpeta:
1. Revisar el nombre del archivo (usualmente es descriptivo)
2. Buscar en la documentación oficial si hay referencia
3. Consultar el CHANGELOG.md para contexto histórico
4. Preguntar al equipo de desarrollo

---

**Mantenido por**: Equipo de Desarrollo ERP-777
**Última actualización**: 2025-10-27
