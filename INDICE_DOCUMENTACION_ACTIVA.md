# 📚 Índice de Documentación Activa - ERP 777

**Fecha de organización:** 5 de Noviembre de 2025
**Estado:** Documentación vigente y actualizada
**Última limpieza:** 5 de Noviembre de 2025 - 95 archivos archivados

---

## 📖 Documentación Principal (Mantener en Raíz)

### Documentación Esencial (3 archivos)
- ✅ **README.md** - Descripción general del proyecto
- ✅ **DEPLOYMENT.md** - Guía de despliegue
- ✅ **CHANGELOG.md** - Registro de cambios general del proyecto

### Documentación Técnica Activa (3 archivos)
- ✅ **DOCUMENTACION_VW_EVENTOS_ANALISIS_FINANCIERO.md** (5-Nov-2025) - **NUEVO** Documentación actualizada de la vista financiera
- ✅ **GUIA_VISUALIZACIONES_ANALISIS_FINANCIERO.md** (28-Oct-2025) - Guía de visualizaciones y dashboards
- ✅ **INDICE_DOCUMENTACION_ACTIVA.md** (Este archivo) - Índice de documentación

### Scripts SQL Activos (2 archivos)
- ✅ **ACTUALIZAR_VISTA_COMPLETA_CON_MARGENES.sql** - Vista actual en producción (con márgenes y gastos por categoría)
- ✅ **011_ACTUALIZAR_VISTAS.sql** - Script de actualización de vistas (verificar si ya se ejecutó)

### Archivos de Análisis (1 archivo)
- ✅ **ANALISIS_ARCHIVOS_RAIZ.md** (5-Nov-2025) - Análisis detallado de archivos para limpieza

---

## 🗄️ Documentación Archivada

### Archivo Reciente: `archive_20251105/` (5 de Noviembre 2025)

**Total archivado:** ~95 archivos organizados en:

#### 📁 archive_20251105/changelogs/ (4 archivos)
Changelogs específicos ya integrados en CHANGELOG.md principal:
- CHANGELOG_DIVISION_PROVISIONES.md
- CHANGELOG_EVENTOS_2025-10-31.md
- CHANGELOG_EVENTOS_TABLA_DETALLES.md
- CHANGELOG_RENOMBRADO_PROVISIONES.md

#### 📁 archive_20251105/documentacion/

##### migraciones/ (8 archivos)
Documentación de migraciones completadas:
- MIGRACION_PROVISIONES_COMPLETADA.md
- PLAN_DIVISION_PROVISIONES.md
- RESUMEN_EJECUTIVO_DIVISION_PROVISIONES.md
- RESUMEN_FINAL_PROVISIONES.md
- RESUMEN_MIGRACION_PROVISIONES.md
- VERIFICACION_PROVISIONES_DIVIDIDAS.md
- GUIA_USO_PROVISIONES.md
- MAPA_DEPENDENCIAS_PROVISIONES.md

##### correcciones/ (13 archivos)
Resúmenes de correcciones aplicadas:
- RESUMEN_ACTUALIZACION_MODULO_EVENTOS.md
- RESUMEN_ANALISIS_INGRESOS_PENDIENTES.md
- RESUMEN_CORRECCIONES_EVENTOS.md
- RESUMEN_CORRECCION_CLIENTES_Y_CONSULTAS_DB.md
- RESUMEN_CORRECCION_FINAL.md
- RESUMEN_CORRECCION_MODULO_EVENTOS.md
- RESUMEN_CORRECCION_MODULO_INGRESOS.md
- RESUMEN_CORRECCION_VALIDACIONES_INGRESOS.md
- RESUMEN_FINAL.md
- RESUMEN_IMPLEMENTACION_REGLAS_NEGOCIO.md
- RESUMEN_MEJORAS_FLUJO_DOCUMENTOS_INGRESOS.md
- CORRECCION_CUENTAS_BANCARIAS_A_CONTABLES.md
- RESOLUCION_PROBLEMA_ARCHIVOS_DUPLICADOS.md

##### pruebas/ (4 archivos)
Documentación de pruebas:
- PRUEBAS_INGRESO_ESTIMADO.md
- PRUEBAS_MODULO_EVENTOS.md
- SOLUCION_INGRESO_ESTIMADO.md
- README_POOL_PRUEBAS.md

##### guias/ (5 archivos)
Guías de implementación completadas:
- INSTRUCCIONES_ACTUALIZACION_VISTA.md
- INSTRUCCIONES_EJECUTAR_SQL.md
- GUIA_VALIDACION.md
- EJEMPLOS_CODIGO_FRONTEND.md
- GRAFICA_INDICE_COBRO.md

#### 📁 archive_20251105/scripts_sql/

##### migraciones/ (4 archivos)
- 010_EJECUTAR_EN_DASHBOARD.sql
- EJECUTAR_ESTA_MIGRACION.sql
- MIGRACION_009_FINAL.sql
- LIMPIAR_CAMPOS_OBSOLETOS_EVENTOS.sql

##### vistas/ (2 archivos)
- ACTUALIZAR_VISTA_GASTOS_CATEGORIAS.sql
- UPDATE_VISTA_GASTOS_POR_CATEGORIA.sql

##### cuentas/ (3 archivos)
- CREAR_CUENTAS_CONTABLES_MINIMAS.sql
- CREAR_CUENTA_PENDIENTE.sql
- MIGRATION_AGREGAR_RESPONSABLE_CUENTA_BANCARIA.sql

##### verificacion/ (4 archivos)
- TEST_INGRESO_ESTIMADO.sql
- VERIFICAR_CONGRUENCIA_DATOS_FINANCIEROS.sql
- VERIFICAR_INGRESOS_2024.sql
- VERIFICAR_POOL_PRUEBAS.sql

#### 📁 archive_20251105/scripts_mjs/

##### migraciones/ (9 archivos)
Scripts de ejecución de migraciones ya completadas

##### diagnostico/ (4 archivos)
Scripts de diagnóstico puntual

##### verificacion/ (19 archivos)
Scripts de verificación de estructura y datos

##### generacion_datos/ (5 archivos)
Scripts para generar datos de prueba

##### testing/ (4 archivos)
Scripts de testing de módulos

##### utilidades/ (8 archivos)
Scripts de utilidades varias

### Archivo Anterior: `docs_archive_20251028/`

Ver contenido completo en ese directorio (documentación de octubre 2025)

---

## 🔄 Estructura de Carpetas Actualizada

```
/
├── README.md                                    ✅ Principal
├── DEPLOYMENT.md                                ✅ Despliegue
├── CHANGELOG.md                                 ✅ Cambios
├── DOCUMENTACION_VW_EVENTOS_ANALISIS_FINANCIERO.md  ✅ Vista financiera
├── GUIA_VISUALIZACIONES_ANALISIS_FINANCIERO.md      ✅ Visualizaciones
├── INDICE_DOCUMENTACION_ACTIVA.md                   ✅ Este índice
├── ANALISIS_ARCHIVOS_RAIZ.md                        ✅ Análisis limpieza
├── ACTUALIZAR_VISTA_COMPLETA_CON_MARGENES.sql       ✅ Vista actual
├── 011_ACTUALIZAR_VISTAS.sql                        ✅ Script vistas
│
├── docs/                                        ✅ Documentación técnica
│   ├── MEJORES_PRACTICAS.md
│   └── ctx/                                     (Contexto DB)
│
├── archive_20251105/                            🗄️ Archivo 5-Nov-2025
│   ├── README.md                                (Índice del archivo)
│   ├── changelogs/                              (4 archivos)
│   ├── documentacion/                           (30 archivos)
│   ├── scripts_sql/                             (13 archivos)
│   └── scripts_mjs/                             (49 archivos)
│
├── docs_archive_20251028/                       🗄️ Archivo 28-Oct-2025
│   ├── documentacion_obsoleta/                  (12 archivos MD)
│   ├── scripts_sql_obsoletos/                   (13 archivos SQL)
│   └── logs_antiguos/                           (múltiples logs)
│
├── antiguos/                                    🗄️ Archivos históricos
│   ├── documentacion/
│   ├── scripts/
│   └── sql/
│
└── src/                                         ✅ Código fuente
```

---

## 📊 Resumen de Limpieza

### Antes (5-Nov-2025 - Inicio)
- Archivos en raíz: **109 archivos** (.md, .sql, .mjs)
- Configuración: 7 archivos
- Documentación: 35 archivos MD
- Scripts SQL: 14 archivos
- Scripts MJS: 53 archivos

### Después (5-Nov-2025 - Completado)
- Archivos en raíz: **10 archivos** (.md, .sql)
- Reducción: **90%**
- Archivos archivados: **~95 archivos**

### Categorización
- ✅ **Activos y necesarios**: 10 archivos
- 🗄️ **Archivados**: 95 archivos
- 📦 **Configuración** (no movidos): 4 archivos (.js)

---

## 📝 Criterios de Archivo

Un archivo se considera **obsoleto** si cumple uno o más de estos criterios:

1. ✅ **Ya fue ejecutado** (scripts SQL de migración o fix)
2. ✅ **Fue reemplazado** por una versión más nueva
3. ✅ **Describe un estado anterior** del sistema ya superado
4. ✅ **Es un changelog específico** ya integrado en CHANGELOG.md
5. ✅ **Documenta una corrección ya aplicada** y verificada
6. ✅ **Es un script de verificación/testing** de una sola vez
7. ✅ **Es documentación de procesos completados**

---

## 🚀 Mejores Prácticas para Mantener Limpia la Raíz

### Para Documentación:

1. **Antes de crear un nuevo documento MD en raíz:**
   - ✅ Verificar si ya existe uno similar
   - ✅ Considerar actualizar un documento existente
   - ✅ Si es temporal, nombrarlo con fecha: `NOMBRE_YYYYMMDD.md`
   - ✅ Evaluar si debería ir en `docs/` en lugar de raíz

2. **Documentación de procesos completados:**
   - ✅ Archivar inmediatamente después de completar
   - ✅ Mantener solo documentación activa en raíz

### Para Scripts SQL:

1. **Scripts de migración:**
   - ✅ Ejecutar y verificar
   - ✅ Mover a archivo después de confirmar éxito
   - ✅ Mantener solo scripts activos en raíz

2. **Scripts de verificación:**
   - ✅ Usar y archivar después de validar
   - ✅ No mantener en raíz

### Para Scripts MJS:

1. **Scripts de una sola ejecución:**
   - ✅ Ejecutar y archivar inmediatamente
   - ✅ No acumular en raíz

2. **Scripts de utilidades:**
   - ✅ Considerar moverlos a `scripts/` directory
   - ✅ Mantener raíz solo para scripts críticos

### Proceso de Limpieza Periódica:

**Frecuencia recomendada:** Cada 2-4 semanas

1. ✅ Listar archivos en raíz
2. ✅ Identificar obsoletos según criterios
3. ✅ Crear archivo `archive_YYYYMMDD/`
4. ✅ Mover archivos organizadamente
5. ✅ Actualizar este índice

---

## 🔍 Cómo Encontrar Archivos Archivados

### Por Fecha:
```bash
ls -la archive_*/
```

### Por Tipo:
```bash
# Documentación de migraciones
ls -la archive_*/documentacion/migraciones/

# Scripts SQL
ls -la archive_*/scripts_sql/

# Scripts de verificación
ls -la archive_*/scripts_mjs/verificacion/
```

### Buscar un archivo específico:
```bash
find archive_* -name "NOMBRE_ARCHIVO*"
```

### Restaurar un archivo:
```bash
mv archive_20251105/[carpeta]/[archivo] .
```

---

## 📌 Archivos Importantes a Recordar

### En Raíz (Siempre Activos):
1. `README.md` - Nunca archivar
2. `DEPLOYMENT.md` - Nunca archivar
3. `CHANGELOG.md` - Nunca archivar
4. `DOCUMENTACION_VW_EVENTOS_ANALISIS_FINANCIERO.md` - Documentación de vista actual

### En Archivo (Referencia):
1. `archive_*/README.md` - Índice de cada archivo
2. `archive_*/documentacion/migraciones/` - Historial de migraciones
3. `archive_*/scripts_sql/migraciones/` - Scripts ejecutados

---

**Última actualización:** 5 de Noviembre de 2025
**Mantenedor:** Sistema ERP-777
**Próxima revisión recomendada:** 3 de Diciembre de 2025
