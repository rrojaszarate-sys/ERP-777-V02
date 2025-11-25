# 🎲 GENERADOR DE POOL DE PRUEBAS - ERP 777

## 📋 Especificaciones del Pool

El script genera automáticamente un conjunto completo de datos de prueba con las siguientes características:

### ✨ Características Generales

- **📊 120 eventos** distribuidos en los últimos 3 años (2022-2025)
- **💸 20 gastos por evento** (2,400 gastos totales)
  - 5 gastos de Combustible/Peaje
  - 5 gastos de Materiales
  - 5 gastos de Recursos Humanos
  - 5 gastos de Solicitudes de Pago
- **💰 7 ingresos por evento** (840 ingresos totales)
  - Anticipo: 30%
  - Pagos intermedios 2-6: 10% cada uno
  - Liquidación final: 20%
- **👥 6 clientes** con distribución equitativa de eventos

### 🎯 Reglas de Negocio Implementadas

1. **Integridad Referencial**
   - Todos los gastos están asociados a eventos válidos
   - Todos los ingresos están asociados a eventos válidos
   - Todos los eventos tienen cliente asignado

2. **Coherencia Financiera**
   - Subtotal + IVA (16%) = Total
   - Provisiones entre 20-35% del ingreso estimado
   - Gastos distribuidos coherentemente según provisiones
   - 70% de gastos pagados, 30% pendientes
   - 50-60% de ingresos cobrados, resto pendientes

3. **Distribución Temporal**
   - Eventos distribuidos uniformemente en 3 años
   - 2-3 eventos por mes
   - Fechas de gastos e ingresos entre creación y fecha del evento
   - No se crean eventos en el futuro

4. **Datos Realistas**
   - Presupuestos entre $80,000 y $300,000
   - Nombres de proyectos variados
   - Proveedores distintos
   - Referencias únicas para cada ingreso
   - Estados de evento coherentes con fechas

---

## 🚀 Instalación y Configuración

### 1. Instalar Dependencias

```bash
npm install @supabase/supabase-js dotenv
```

### 2. Verificar Variables de Entorno

Asegúrate de que tu archivo `.env` contiene:

```env
VITE_SUPABASE_URL=https://gomnouwackzvthpwyric.supabase.co
VITE_SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key_aqui
```

⚠️ **IMPORTANTE**: El script usa `SERVICE_ROLE_KEY` para tener permisos completos de escritura.

---

## 📦 Ejecución del Script

### Opción 1: Ejecución Directa

```bash
node populate-test-pool-3-years.mjs
```

### Opción 2: Usando npm (si está configurado en package.json)

```bash
npm run populate:test
```

### ⏱️ Tiempo de Ejecución Estimado

- **Limpieza de datos**: 5-10 segundos
- **Creación de clientes**: 2 segundos
- **Creación de eventos**: 20-30 segundos (en lotes de 20)
- **Creación de gastos**: 60-90 segundos (en lotes de 100)
- **Creación de ingresos**: 30-45 segundos (en lotes de 100)

**⏱️ TOTAL: 2-3 minutos aproximadamente**

---

## 📊 Salida del Script

El script genera un reporte detallado en consola:

```
═══════════════════════════════════════════════════════════════════════════
                    📊 REPORTE FINAL DEL POOL DE PRUEBAS
═══════════════════════════════════════════════════════════════════════════

📋 TOTALES GENERALES:
─────────────────────────────────────────────────────────────────────────

   👥 Clientes:        6
   📅 Eventos:         120 (20.0 por cliente)
   💸 Gastos:          2400 (20 por evento)
   💰 Ingresos:        840 (7 por evento)

📅 DISTRIBUCIÓN TEMPORAL:
─────────────────────────────────────────────────────────────────────────

   2022: 30 eventos
   2023: 30 eventos
   2024: 30 eventos
   2025: 30 eventos

💵 TOTALES FINANCIEROS:
─────────────────────────────────────────────────────────────────────────

   💸 Gastos Totales:          $XX,XXX,XXX.XX
      ✓ Pagados:               $XX,XXX,XXX.XX (70.0%)
      ⏳ Pendientes:            $XX,XXX,XXX.XX (30.0%)

   💰 Ingresos Totales:        $XX,XXX,XXX.XX
      ✓ Cobrados:              $XX,XXX,XXX.XX (55.0%)
      ⏳ Pendientes:            $XX,XXX,XXX.XX (45.0%)

   📊 Balance (Cobrado-Pagado): $XX,XXX,XXX.XX ✅
   📈 Margen Real:              XX.X%

📊 GASTOS POR CATEGORÍA:
─────────────────────────────────────────────────────────────────────────

   ⛽ Combustible/Peaje: $XXX,XXX.XX (XX.X%)
   🛠️  Materiales: $XXX,XXX.XX (XX.X%)
   👥 Recursos Humanos: $XXX,XXX.XX (XX.X%)
   💳 Solicitudes de Pago: $XXX,XXX.XX (XX.X%)

👥 DETALLE POR CLIENTE:
─────────────────────────────────────────────────────────────────────────

   Phoenix Corp
      📅 Eventos:   20
      💸 Gastos:    400 ($XX,XXX,XXX.XX)
      💰 Ingresos:  140 ($XX,XXX,XXX.XX)

   [... más clientes ...]

═══════════════════════════════════════════════════════════════════════════
                    ✨ POOL DE PRUEBAS GENERADO EXITOSAMENTE
═══════════════════════════════════════════════════════════════════════════
```

---

## 🔍 Verificación de Datos

### Opción 1: Usando el Script SQL

Ejecuta el archivo `VERIFICAR_POOL_PRUEBAS.sql` en Supabase SQL Editor para obtener:

1. ✅ Totales generales
2. 📅 Distribución por año y mes
3. 💸 Gastos por categoría
4. 💰 Balance de ingresos cobrados vs pendientes
5. 📊 Balance financiero general
6. 👥 Detalle por cliente
7. 🏆 Top 10 eventos con mejor margen
8. ⚠️ Top 10 eventos con peor margen
9. 🔍 Verificación de integridad (huérfanos, sin datos, etc.)
10. 📈 Comparación provisiones vs gastos reales

### Opción 2: Verificación Manual en Supabase

```sql
-- Total de registros
SELECT 
    (SELECT COUNT(*) FROM evt_clientes) as clientes,
    (SELECT COUNT(*) FROM evt_eventos) as eventos,
    (SELECT COUNT(*) FROM evt_gastos) as gastos,
    (SELECT COUNT(*) FROM evt_ingresos) as ingresos;

-- Verificar distribución por año
SELECT 
    EXTRACT(YEAR FROM fecha_evento) as año,
    COUNT(*) as total_eventos
FROM evt_eventos
GROUP BY EXTRACT(YEAR FROM fecha_evento)
ORDER BY año;
```

---

## ⚠️ ADVERTENCIAS IMPORTANTES

### 🚨 EL SCRIPT ELIMINA TODOS LOS DATOS EXISTENTES

El script ejecuta las siguientes operaciones de limpieza:

```javascript
await supabase.from('evt_ingresos').delete().neq('id', 0);
await supabase.from('evt_gastos').delete().neq('id', 0);
await supabase.from('evt_eventos').delete().neq('id', 0);
await supabase.from('evt_clientes').delete().neq('id', 0);
```

### ✋ ANTES DE EJECUTAR:

1. ✅ **Verifica que estás en el entorno correcto** (desarrollo, no producción)
2. ✅ **Haz backup de tus datos** si tienes información importante
3. ✅ **Confirma que quieres eliminar todos los datos existentes**

### 🔒 Permisos Requeridos

El script requiere `SERVICE_ROLE_KEY` porque:
- Elimina datos masivamente
- Inserta múltiples registros en lote
- Puede necesitar bypasear políticas RLS

---

## 🐛 Solución de Problemas

### Error: "Invalid API key"

**Problema**: La SERVICE_ROLE_KEY no es válida

**Solución**:
1. Verifica que `.env` tiene la key correcta
2. Recarga las variables: `node -r dotenv/config populate-test-pool-3-years.mjs`

### Error: "Row level security policy violation"

**Problema**: RLS está bloqueando las operaciones

**Solución**:
- Usa `SERVICE_ROLE_KEY` en lugar de `ANON_KEY`
- Verifica que las políticas RLS permiten operaciones masivas

### Error: "Timeout" o "Request timeout"

**Problema**: Demasiados registros en un lote

**Solución**:
- Los lotes ya están optimizados (20 eventos, 100 gastos/ingresos)
- Si persiste, reduce `BATCH_SIZE` en el script

### Los datos no aparecen en el frontend

**Problema**: Caché o vista desactualizada

**Solución**:
1. Hard refresh: `Ctrl + Shift + R`
2. Ejecuta `ACTUALIZAR_VISTA_GASTOS_CATEGORIAS.sql`
3. Reinicia el servidor de desarrollo

---

## 📈 Uso con el Sistema

### Después de generar los datos:

1. **Ejecuta la actualización de vista**:
   ```sql
   -- Copia y ejecuta ACTUALIZAR_VISTA_GASTOS_CATEGORIAS.sql
   ```

2. **Hard refresh del navegador**:
   - Windows/Linux: `Ctrl + Shift + R`
   - Mac: `Cmd + Shift + R`

3. **Verifica en el listado de eventos**:
   - Deberías ver 120 eventos
   - Todas las columnas con datos reales (no $0.00)
   - Dashboard con totales correctos

4. **Prueba funcionalidades**:
   - Filtros por año (2022, 2023, 2024, 2025)
   - Filtros por mes
   - Filtros por cliente (6 clientes)
   - Modal de detalle con todos los tabs
   - Gráficos con datos reales

---

## 📝 Estructura de Datos Generada

### Clientes (6)
```javascript
{
  razon_social: 'Corporativo Empresarial Phoenix SA de CV',
  nombre_comercial: 'Phoenix Corp',
  rfc: 'CEP920315AB7',
  email: 'contacto@phoenixcorp.mx',
  // ... más campos
}
```

### Eventos (120)
```javascript
{
  clave_evento: 'EVT-2025-0001',
  nombre_proyecto: 'Convención Anual 2025',
  cliente_id: 1,
  fecha_evento: '2025-03-15',
  ingreso_estimado: 175000.00,
  provision_combustible_peaje: 8750.00,
  provision_materiales: 31500.00,
  provision_recursos_humanos: 26250.00,
  provision_solicitudes_pago: 17500.00,
  // ... más campos
}
```

### Gastos (2,400)
```javascript
{
  evento_id: 1,
  categoria_id: 6, // Combustible
  concepto: 'Gasolina unidades transporte',
  total: 1743.50,
  pagado: true,
  // ... más campos
}
```

### Ingresos (840)
```javascript
{
  evento_id: 1,
  concepto: 'Anticipo inicial del evento',
  total: 52500.00, // 30% del ingreso total
  cobrado: true,
  facturado: true,
  // ... más campos
}
```

---

## 🎯 Casos de Uso

### 1. Testing de Performance
- Probar con 120 eventos reales
- Verificar velocidad de carga del listado
- Testear filtros con datos reales

### 2. Demostración de Funcionalidades
- Mostrar gráficos con datos coherentes
- Demostrar cálculos de márgenes
- Presentar dashboard con métricas reales

### 3. Desarrollo y Debugging
- Probar nuevas features con datos abundantes
- Verificar cálculos con casos variados
- Testear edge cases (márgenes altos/bajos)

### 4. Capacitación de Usuarios
- Entrenar con datos realistas
- Practicar flujos completos
- Familiarizarse con la interfaz

---

## 📞 Soporte

Si encuentras problemas:

1. Revisa los logs de consola del script
2. Ejecuta `VERIFICAR_POOL_PRUEBAS.sql` para diagnóstico
3. Verifica integridad referencial
4. Confirma que la vista está actualizada

---

## 🔄 Regeneración de Datos

Para regenerar el pool de pruebas:

```bash
# Elimina y regenera todo
node populate-test-pool-3-years.mjs
```

⚠️ **ADVERTENCIA**: Esto eliminará TODOS los datos existentes.

---

## ✅ Checklist de Verificación

Después de ejecutar el script, verifica:

- [ ] 6 clientes creados
- [ ] 120 eventos creados (30 por año)
- [ ] 2,400 gastos creados (20 por evento)
- [ ] 840 ingresos creados (7 por evento)
- [ ] Gastos distribuidos en 4 categorías equitativamente
- [ ] ~70% de gastos marcados como pagados
- [ ] ~50-60% de ingresos marcados como cobrados
- [ ] Balance financiero positivo
- [ ] No hay eventos sin gastos
- [ ] No hay eventos sin ingresos
- [ ] Fechas coherentes (gastos/ingresos entre creación y fecha evento)
- [ ] Totales cuadran: subtotal + IVA = total
- [ ] Provisiones entre 20-35% del ingreso estimado

---

## 📄 Licencia

Este script es parte del ERP 777 y está sujeto a la misma licencia del proyecto principal.
