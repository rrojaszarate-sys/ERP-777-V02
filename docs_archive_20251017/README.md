# 📦 Archivo de Documentación - MADE ERP 77

**Fecha de creación:** 17 de Octubre de 2025  
**Total de documentos archivados:** 195

## 📋 Descripción

Este directorio contiene todos los documentos Markdown (`.md`) del proyecto MADE ERP 77, organizados de forma estructurada en carpetas temáticas con numeración y fecha para facilitar su localización y seguimiento cronológico.

## 🗂️ Estructura de Carpetas

### 📁 **analisis/** (6 documentos)
Documentos de análisis de sistemas, campos, estados y mejoras del proyecto.

### 📁 **configuracion/** (2 documentos)
Guías de configuración de servicios externos como Google Vision y otros.

### 📁 **correcciones/** (9 documentos)
Documentos que detallan correcciones aplicadas en el sistema.

### 📁 **debug/** (5 documentos)
Documentos de debugging, diagnóstico y resolución de problemas.

### 📁 **deployment/** (4 documentos)
Guías y procedimientos de despliegue del sistema.

### 📁 **fixes/** (27 documentos)
Soluciones específicas a problemas encontrados durante el desarrollo.

### 📁 **guias/** (24 documentos)
Guías de uso, implementación e instrucciones del sistema.

### 📁 **implementacion/** (5 documentos)
Documentos sobre implementaciones completas de funcionalidades.

### 📁 **ocr/** (33 documentos)
Documentación relacionada con el sistema OCR (Reconocimiento Óptico de Caracteres).

### 📁 **otros/** (54 documentos)
Documentos diversos que no encajan en las categorías anteriores.

### 📁 **resumen/** (26 documentos)
Resúmenes ejecutivos y documentos de síntesis.

## 📝 Nomenclatura de Archivos

Todos los archivos siguen el siguiente formato:

```
YYYYMMDD_NNN_NOMBRE_ORIGINAL.md
```

Donde:
- `YYYYMMDD`: Fecha de archivo (20251017)
- `NNN`: Número secuencial de 3 dígitos (001, 002, 003...)
- `NOMBRE_ORIGINAL`: Nombre original del documento

**Ejemplo:** `20251017_001_ANALISIS_CAMPOS_SAT_OCR.md`

## 🔍 Cómo Buscar Documentos

1. **Consulta el índice:** Abre el archivo [`00_INDICE.md`](./00_INDICE.md) para ver todos los documentos listados por categoría.

2. **Busca por categoría:** Navega a la carpeta correspondiente según el tema que necesites.

3. **Busca por número:** Los números secuenciales te ayudan a ver el orden en que se archivaron los documentos.

4. **Busca por nombre:** El nombre original se mantiene para facilitar la identificación.

## 🛠️ Scripts Disponibles

En el directorio raíz del proyecto encontrarás:

### `organize_docs.sh`
Script que organizó y archivó todos los documentos. Puedes ejecutarlo nuevamente para reorganizar si agregas nuevos documentos.

```bash
./organize_docs.sh
```

### `cleanup_original_docs.sh`
Script para eliminar los archivos originales después de verificar que el archivo está completo.

⚠️ **PRECAUCIÓN:** Este script elimina archivos permanentemente. Úsalo solo después de verificar que todo está correcto.

```bash
./cleanup_original_docs.sh
```

## 📊 Estadísticas del Archivo

| Categoría        | Cantidad |
|------------------|----------|
| Análisis         | 6        |
| Configuración    | 2        |
| Correcciones     | 9        |
| Debug            | 5        |
| Deployment       | 4        |
| Fixes            | 27       |
| Guías            | 24       |
| Implementación   | 5        |
| OCR              | 33       |
| Otros            | 54       |
| Resumen          | 26       |
| **TOTAL**        | **195**  |

## 🔗 Enlaces Útiles

- [Índice Completo](./00_INDICE.md) - Lista completa de todos los documentos
- [README Principal](../README.md) - Volver al README principal del proyecto

## 📌 Notas

- Los archivos originales **NO** fueron eliminados automáticamente
- Esta es una copia de seguridad organizada de toda la documentación
- Cada documento mantiene su contenido original intacto
- La fecha de archivo está en el nombre del directorio: `docs_archive_20251017`

## 🆘 Soporte

Si necesitas restaurar algún documento o tienes problemas con el archivo, contacta al equipo de desarrollo.

---

**Última actualización:** 17 de Octubre de 2025  
**Proyecto:** MADE ERP 77  
**Versión del archivo:** 1.0
