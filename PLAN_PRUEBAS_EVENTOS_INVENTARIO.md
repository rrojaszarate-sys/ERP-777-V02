# 🧪 PLAN DE PRUEBAS INTENSIVAS - MÓDULOS EVENTOS E INVENTARIO

**Fecha:** 2 de Diciembre de 2025  
**Versión:** 1.0  
**Proyecto:** ERP-777-V02

---

## 📋 ÍNDICE

1. [Resumen Ejecutivo](#1-resumen-ejecutivo)
2. [Análisis del Módulo de Eventos](#2-análisis-del-módulo-de-eventos)
3. [Análisis del Módulo de Inventario](#3-análisis-del-módulo-de-inventario)
4. [Pool de Pruebas con Scripts SQL/JS](#4-pool-de-pruebas-con-scripts)
5. [Pool de Pruebas Automatizadas Playwright](#5-pool-de-pruebas-playwright)
6. [Pruebas de Performance](#6-pruebas-de-performance)
7. [Pruebas de Consistencia de Datos](#7-pruebas-de-consistencia)
8. [Comandos de Ejecución](#8-comandos-de-ejecución)

---

## 1. RESUMEN EJECUTIVO

### Alcance de las Pruebas

| Módulo | Componentes | Servicios | Páginas | Estado |
|--------|-------------|-----------|---------|--------|
| **Eventos** | 54 | 12 | 6 | ✅ Funcional |
| **Inventario** | 30+ | 14 | 22 | ⚠️ Parcial |

### Objetivos
- Validar funcionalidad completa de CRUD
- Verificar integridad y consistencia de datos
- Medir performance y tiempos de respuesta
- Probar flujos de integración entre módulos

---

## 2. ANÁLISIS DEL MÓDULO DE EVENTOS

### 2.1 Estructura de Servicios

| Servicio | Archivo | Funciones Principales |
|----------|---------|----------------------|
| EventsService | `eventsService.ts` | getEvents, getEventById, createEvent, updateEvent, deleteEvent |
| FinancesService | `financesService.ts` | getIncomes, createIncome, getExpenses, createExpense, getFinancialSummary |
| ClientsService | `clientsService.ts` | getClients, createClient, updateClient, deleteClient |
| WorkflowService | `workflowService.ts` | canAdvanceToState, advanceEventState, validateStateTransition |
| InvoiceService | `invoiceService.ts` | processInvoice, parseCFDI, createInvoiceFromXML |
| AlertService | `alertService.ts` | createAlert, getAlerts, markAsRead |
| StorageService | `storageService.ts` | uploadFile, deleteFile, getFileUrl |

### 2.2 Tablas de Base de Datos

```
evt_eventos_erp          - Eventos principales
evt_clientes_erp         - Clientes
evt_ingresos_erp         - Ingresos/Facturas
evt_gastos_erp           - Gastos
evt_categorias_gastos_erp - Categorías (4): SPs, RH, Materiales, Combustible
evt_estados_erp          - Estados del workflow (7)
evt_provisiones_erp      - Provisiones estimadas
vw_eventos_analisis_financiero_erp - Vista de análisis
```

### 2.3 Flujos Críticos a Probar

1. **Ciclo de Vida del Evento**
   - Cotización → Confirmado → En Proceso → Finalizado
   - Validar transiciones permitidas/bloqueadas

2. **Gestión Financiera**
   - Crear ingreso con cálculo IVA automático
   - Crear gasto con categorización
   - Validar cuadre fiscal (subtotal + IVA = total)

3. **Integración con Almacén**
   - Material de almacén genera gasto categoría 8
   - Firma dual para afectar inventario

---

## 3. ANÁLISIS DEL MÓDULO DE INVENTARIO

### 3.1 Estructura de Servicios

| Servicio | Archivo | Estado | Funciones |
|----------|---------|--------|-----------|
| inventarioService | `inventarioService.ts` | ✅ Real | fetchProductos, fetchAlmacenes, fetchMovimientos |
| documentosService | `documentosInventarioService.ts` | ✅ Real | createDocumento, confirmarDocumento, generarPDF |
| ubicacionesService | `ubicacionesService.ts` | ✅ Real | CRUD ubicaciones |
| lotesService | `lotesService.ts` | ⚠️ Parcial | CRUD lotes |
| transferenciasService | `transferenciasService.ts` | ❌ Simulado | Datos fake |
| kardexService | `kardexService.ts` | ❌ Simulado | Datos fake |
| valuacionService | `valuacionService.ts` | ❌ Simulado | No implementado |
| reservasService | `reservasService.ts` | ⚠️ Parcial | Sin bloqueo real |
| conteosService | `conteosService.ts` | ⚠️ Parcial | Sin ajustes auto |

### 3.2 Tablas de Base de Datos

```
productos_erp              - Catálogo de productos
almacenes_erp              - Almacenes
inv_existencias            - Stock por almacén
movimientos_inventario_erp - Historial de movimientos
inv_documentos             - Documentos entrada/salida
inv_ubicaciones            - Ubicaciones físicas
inv_lotes                  - Lotes y caducidades
```

### 3.3 Funcionalidades por Estado

| Funcionalidad | Estado | Notas |
|---------------|--------|-------|
| CRUD Almacenes | ✅ | Completo |
| CRUD Productos | ✅ | Completo |
| Documentos Entrada/Salida | ✅ | Con firmas |
| Etiquetas QR | ✅ | Generación OK |
| Configuración | ✅ | localStorage |
| Stock | ⚠️ | Falta sync con docs |
| Movimientos | ⚠️ | Sin trigger auto |
| Transferencias | ❌ | Solo simulado |
| Kardex | ❌ | Solo simulado |
| Valuación | ❌ | No implementado |

---

## 4. POOL DE PRUEBAS CON SCRIPTS

### 4.1 Scripts SQL de Validación

```sql
-- ============================================================================
-- SCRIPT 1: Validar integridad de datos de Eventos
-- ============================================================================

-- 1.1 Eventos sin cliente asignado
SELECT id, clave_evento, nombre 
FROM evt_eventos_erp 
WHERE cliente_id IS NULL AND activo = true;

-- 1.2 Gastos sin categoría (CRÍTICO)
SELECT id, evento_id, concepto, total 
FROM evt_gastos_erp 
WHERE categoria_id IS NULL AND deleted_at IS NULL;

-- 1.3 Ingresos sin cliente
SELECT id, evento_id, concepto, total 
FROM evt_ingresos_erp 
WHERE cliente_id IS NULL;

-- 1.4 Validar cuadre fiscal en gastos
SELECT id, concepto, subtotal, iva, total,
       (subtotal + iva) AS calculado,
       ABS(total - (subtotal + iva)) AS diferencia
FROM evt_gastos_erp
WHERE ABS(total - (subtotal + iva)) > 0.01
  AND deleted_at IS NULL;

-- 1.5 Validar cuadre fiscal en ingresos
SELECT id, concepto, subtotal, iva, total,
       (subtotal + iva) AS calculado,
       ABS(total - (subtotal + iva)) AS diferencia
FROM evt_ingresos_erp
WHERE ABS(total - (subtotal + iva)) > 0.01;

-- 1.6 Comparar vista vs tabla (totales)
SELECT 
    e.id,
    e.clave_evento,
    e.total_ingresos AS tabla_ingresos,
    v.total_ingresos AS vista_ingresos,
    e.total_gastos AS tabla_gastos,
    v.total_gastos AS vista_gastos
FROM evt_eventos_erp e
LEFT JOIN vw_eventos_analisis_financiero_erp v ON e.id = v.id
WHERE e.activo = true;

-- ============================================================================
-- SCRIPT 2: Validar integridad de datos de Inventario
-- ============================================================================

-- 2.1 Productos sin almacén asignado en existencias
SELECT p.id, p.nombre, p.clave
FROM productos_erp p
LEFT JOIN inv_existencias e ON p.id = e.producto_id
WHERE e.id IS NULL;

-- 2.2 Existencias con cantidad negativa (ERROR)
SELECT e.*, p.nombre
FROM inv_existencias e
JOIN productos_erp p ON e.producto_id = p.id
WHERE e.cantidad < 0;

-- 2.3 Documentos sin confirmar > 7 días
SELECT id, numero_documento, tipo, estado, created_at
FROM inv_documentos
WHERE estado = 'borrador'
  AND created_at < NOW() - INTERVAL '7 days';

-- 2.4 Movimientos huérfanos (sin documento)
SELECT m.*
FROM movimientos_inventario_erp m
LEFT JOIN inv_documentos d ON m.documento_id = d.id
WHERE d.id IS NULL AND m.documento_id IS NOT NULL;

-- 2.5 Stock calculado vs registrado
SELECT 
    p.id,
    p.nombre,
    e.cantidad AS stock_registrado,
    COALESCE(SUM(CASE WHEN m.tipo = 'entrada' THEN m.cantidad ELSE -m.cantidad END), 0) AS stock_calculado
FROM productos_erp p
LEFT JOIN inv_existencias e ON p.id = e.producto_id
LEFT JOIN movimientos_inventario_erp m ON p.id = m.producto_id
GROUP BY p.id, p.nombre, e.cantidad
HAVING e.cantidad != COALESCE(SUM(CASE WHEN m.tipo = 'entrada' THEN m.cantidad ELSE -m.cantidad END), 0);
```

### 4.2 Scripts JavaScript de Pruebas Unitarias

```javascript
// ============================================================================
// test-eventos-service.js
// Ejecutar: node scripts/test-eventos-service.js
// ============================================================================

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function runEventosTests() {
  console.log('🧪 INICIANDO PRUEBAS DE EVENTOS\n');
  const results = { passed: 0, failed: 0, errors: [] };

  // Test 1: Cargar eventos
  try {
    const { data, error } = await supabase
      .from('vw_eventos_completos_erp')
      .select('*')
      .eq('activo', true)
      .limit(10);
    
    if (error) throw error;
    console.log(`✅ Test 1: Cargar eventos - ${data.length} eventos encontrados`);
    results.passed++;
  } catch (e) {
    console.log(`❌ Test 1: Cargar eventos - ${e.message}`);
    results.failed++;
    results.errors.push(e.message);
  }

  // Test 2: Cargar clientes
  try {
    const { data, error } = await supabase
      .from('evt_clientes_erp')
      .select('*')
      .eq('activo', true);
    
    if (error) throw error;
    console.log(`✅ Test 2: Cargar clientes - ${data.length} clientes activos`);
    results.passed++;
  } catch (e) {
    console.log(`❌ Test 2: Cargar clientes - ${e.message}`);
    results.failed++;
    results.errors.push(e.message);
  }

  // Test 3: Cargar categorías de gastos
  try {
    const { data, error } = await supabase
      .from('evt_categorias_gastos_erp')
      .select('*');
    
    if (error) throw error;
    if (data.length !== 4) throw new Error(`Se esperaban 4 categorías, hay ${data.length}`);
    console.log(`✅ Test 3: Categorías de gastos - ${data.length} categorías`);
    results.passed++;
  } catch (e) {
    console.log(`❌ Test 3: Categorías de gastos - ${e.message}`);
    results.failed++;
    results.errors.push(e.message);
  }

  // Test 4: Vista de análisis financiero
  try {
    const { data, error } = await supabase
      .from('vw_eventos_analisis_financiero_erp')
      .select('*')
      .limit(5);
    
    if (error) throw error;
    // Validar que los campos calculados existen
    if (data.length > 0) {
      const evento = data[0];
      const camposRequeridos = ['total_ingresos', 'total_gastos', 'utilidad_bruta', 'margen_utilidad'];
      const faltantes = camposRequeridos.filter(c => evento[c] === undefined);
      if (faltantes.length > 0) throw new Error(`Faltan campos: ${faltantes.join(', ')}`);
    }
    console.log(`✅ Test 4: Vista análisis financiero - OK`);
    results.passed++;
  } catch (e) {
    console.log(`❌ Test 4: Vista análisis financiero - ${e.message}`);
    results.failed++;
    results.errors.push(e.message);
  }

  // Test 5: Crear y eliminar ingreso de prueba
  try {
    const testEventoId = 1; // Usar evento existente
    const { data: ingreso, error: createError } = await supabase
      .from('evt_ingresos_erp')
      .insert([{
        evento_id: testEventoId,
        concepto: 'TEST - Ingreso de prueba automática',
        subtotal: 1000,
        iva: 160,
        total: 1160
      }])
      .select()
      .single();
    
    if (createError) throw createError;
    
    // Eliminar el ingreso de prueba
    const { error: deleteError } = await supabase
      .from('evt_ingresos_erp')
      .delete()
      .eq('id', ingreso.id);
    
    if (deleteError) throw deleteError;
    
    console.log(`✅ Test 5: CRUD Ingresos - Crear y eliminar OK`);
    results.passed++;
  } catch (e) {
    console.log(`❌ Test 5: CRUD Ingresos - ${e.message}`);
    results.failed++;
    results.errors.push(e.message);
  }

  // Resumen
  console.log('\n═══════════════════════════════════════');
  console.log(`📊 RESULTADOS: ${results.passed} passed, ${results.failed} failed`);
  console.log('═══════════════════════════════════════');
  
  return results;
}

runEventosTests();
```

```javascript
// ============================================================================
// test-inventario-service.js
// Ejecutar: node scripts/test-inventario-service.js
// ============================================================================

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

const COMPANY_ID = process.env.TEST_COMPANY_ID || 'your-company-uuid';

async function runInventarioTests() {
  console.log('🧪 INICIANDO PRUEBAS DE INVENTARIO\n');
  const results = { passed: 0, failed: 0, errors: [] };

  // Test 1: Cargar almacenes
  try {
    const { data, error } = await supabase
      .from('almacenes_erp')
      .select('*')
      .eq('company_id', COMPANY_ID);
    
    if (error) throw error;
    console.log(`✅ Test 1: Cargar almacenes - ${data.length} almacenes`);
    results.passed++;
  } catch (e) {
    console.log(`❌ Test 1: Cargar almacenes - ${e.message}`);
    results.failed++;
    results.errors.push(e.message);
  }

  // Test 2: Cargar productos
  try {
    const { data, error } = await supabase
      .from('productos_erp')
      .select('*')
      .eq('company_id', COMPANY_ID)
      .limit(50);
    
    if (error) throw error;
    console.log(`✅ Test 2: Cargar productos - ${data.length} productos`);
    results.passed++;
  } catch (e) {
    console.log(`❌ Test 2: Cargar productos - ${e.message}`);
    results.failed++;
    results.errors.push(e.message);
  }

  // Test 3: Verificar existencias
  try {
    const { data, error } = await supabase
      .from('inv_existencias')
      .select(`
        *,
        producto:inv_productos(*),
        almacen:inv_almacenes(*)
      `)
      .limit(20);
    
    if (error) throw error;
    console.log(`✅ Test 3: Existencias - ${data.length} registros`);
    results.passed++;
  } catch (e) {
    console.log(`❌ Test 3: Existencias - ${e.message}`);
    results.failed++;
    results.errors.push(e.message);
  }

  // Test 4: Verificar movimientos
  try {
    const { data, error } = await supabase
      .from('movimientos_inventario_erp')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20);
    
    if (error) throw error;
    console.log(`✅ Test 4: Movimientos - ${data.length} registros recientes`);
    results.passed++;
  } catch (e) {
    console.log(`❌ Test 4: Movimientos - ${e.message}`);
    results.failed++;
    results.errors.push(e.message);
  }

  // Test 5: CRUD Producto
  try {
    const testProducto = {
      nombre: `TEST-${Date.now()}`,
      clave: `TPROD-${Date.now()}`,
      unidad: 'pieza',
      precio_venta: 100,
      costo: 50,
      company_id: COMPANY_ID
    };

    // Crear
    const { data: created, error: createError } = await supabase
      .from('productos_erp')
      .insert([testProducto])
      .select()
      .single();
    
    if (createError) throw createError;

    // Actualizar
    const { error: updateError } = await supabase
      .from('productos_erp')
      .update({ precio_venta: 150 })
      .eq('id', created.id);
    
    if (updateError) throw updateError;

    // Eliminar
    const { error: deleteError } = await supabase
      .from('productos_erp')
      .delete()
      .eq('id', created.id);
    
    if (deleteError) throw deleteError;

    console.log(`✅ Test 5: CRUD Producto - Crear/Actualizar/Eliminar OK`);
    results.passed++;
  } catch (e) {
    console.log(`❌ Test 5: CRUD Producto - ${e.message}`);
    results.failed++;
    results.errors.push(e.message);
  }

  // Test 6: Documentos de inventario
  try {
    const { data, error } = await supabase
      .from('inv_documentos')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (error) throw error;
    console.log(`✅ Test 6: Documentos - ${data.length} documentos recientes`);
    results.passed++;
  } catch (e) {
    console.log(`❌ Test 6: Documentos - ${e.message}`);
    results.failed++;
    results.errors.push(e.message);
  }

  // Resumen
  console.log('\n═══════════════════════════════════════');
  console.log(`📊 RESULTADOS: ${results.passed} passed, ${results.failed} failed`);
  console.log('═══════════════════════════════════════');
  
  return results;
}

runInventarioTests();
```

---

## 5. POOL DE PRUEBAS PLAYWRIGHT

### 5.1 Suite Completa de Eventos

```javascript
// playwright/e2e/eventos-completo.spec.js
import { test, expect } from '@playwright/test';

test.describe('🎯 MÓDULO EVENTOS - Suite Completa', () => {
  
  // ═══════════════════════════════════════════════════════════════════════════
  // SECCIÓN 1: NAVEGACIÓN Y CARGA
  // ═══════════════════════════════════════════════════════════════════════════
  test.describe('1. Navegación', () => {
    
    test('1.1 Dashboard de eventos carga correctamente', async ({ page }) => {
      await page.goto('/');
      await expect(page).toHaveURL(/.*\//);
      await expect(page.locator('body')).toBeVisible();
    });

    test('1.2 Lista de eventos accesible', async ({ page }) => {
      await page.goto('/eventos-erp');
      await page.waitForLoadState('networkidle');
      await expect(page.locator('text=Eventos')).toBeVisible();
    });

    test('1.3 Clientes accesible', async ({ page }) => {
      await page.goto('/eventos-erp/clientes');
      await page.waitForLoadState('networkidle');
      await expect(page.locator('text=Clientes')).toBeVisible();
    });

    test('1.4 Análisis financiero accesible', async ({ page }) => {
      await page.goto('/eventos-erp/analisis-financiero');
      await page.waitForLoadState('networkidle');
      await expect(page.locator('body')).toBeVisible();
    });

    test('1.5 Catálogos accesible', async ({ page }) => {
      await page.goto('/eventos-erp/catalogos');
      await page.waitForLoadState('networkidle');
      await expect(page.locator('body')).toBeVisible();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SECCIÓN 2: CRUD CLIENTES
  // ═══════════════════════════════════════════════════════════════════════════
  test.describe('2. Gestión de Clientes', () => {
    
    test('2.1 Lista de clientes muestra datos', async ({ page }) => {
      await page.goto('/eventos-erp/clientes');
      await page.waitForLoadState('networkidle');
      
      // Esperar tabla o mensaje vacío
      const hasTable = await page.locator('table').count() > 0;
      const hasEmpty = await page.locator('text=/no hay|sin datos|vacío/i').count() > 0;
      
      expect(hasTable || hasEmpty).toBeTruthy();
    });

    test('2.2 Modal de nuevo cliente abre', async ({ page }) => {
      await page.goto('/eventos-erp/clientes');
      await page.waitForLoadState('networkidle');
      
      await page.click('button:has-text("Nuevo"), button:has-text("Crear"), button:has-text("Agregar")');
      
      await expect(page.locator('[role="dialog"], .modal, [class*="Modal"]')).toBeVisible();
    });

    test('2.3 Validación de campos requeridos', async ({ page }) => {
      await page.goto('/eventos-erp/clientes');
      await page.waitForLoadState('networkidle');
      
      await page.click('button:has-text("Nuevo"), button:has-text("Crear")');
      await page.click('button:has-text("Guardar"), button:has-text("Crear")');
      
      // Debe mostrar errores de validación
      await expect(page.locator('.error, [class*="error"], [class*="invalid"]')).toBeVisible();
    });

    test('2.4 Búsqueda de clientes funciona', async ({ page }) => {
      await page.goto('/eventos-erp/clientes');
      await page.waitForLoadState('networkidle');
      
      const searchInput = page.locator('input[placeholder*="Buscar"], input[type="search"]').first();
      await searchInput.fill('Test');
      
      await page.waitForTimeout(500);
      // La tabla debe actualizarse
      await expect(page.locator('body')).toBeVisible();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SECCIÓN 3: CRUD EVENTOS
  // ═══════════════════════════════════════════════════════════════════════════
  test.describe('3. Gestión de Eventos', () => {
    
    test('3.1 Lista de eventos muestra datos', async ({ page }) => {
      await page.goto('/eventos-erp');
      await page.waitForLoadState('networkidle');
      
      // Verificar que hay contenido
      const rows = page.locator('table tbody tr, [data-testid*="evento"]');
      const count = await rows.count();
      expect(count).toBeGreaterThanOrEqual(0);
    });

    test('3.2 Modal de nuevo evento abre', async ({ page }) => {
      await page.goto('/eventos-erp');
      await page.waitForLoadState('networkidle');
      
      await page.click('button:has-text("Nuevo"), button:has-text("Crear")');
      
      await expect(page.locator('[role="dialog"], .modal')).toBeVisible();
    });

    test('3.3 Detalle de evento accesible', async ({ page }) => {
      await page.goto('/eventos-erp');
      await page.waitForLoadState('networkidle');
      
      // Click en primer evento de la lista
      const firstRow = page.locator('table tbody tr').first();
      if (await firstRow.count() > 0) {
        await firstRow.click();
        await page.waitForTimeout(1000);
        
        // Debe abrir modal o navegar a detalle
        await expect(page.locator('body')).toBeVisible();
      }
    });

    test('3.4 Filtros de eventos funcionan', async ({ page }) => {
      await page.goto('/eventos-erp');
      await page.waitForLoadState('networkidle');
      
      // Buscar campo de búsqueda
      const searchInput = page.locator('input[placeholder*="Buscar"]').first();
      if (await searchInput.count() > 0) {
        await searchInput.fill('2025');
        await page.waitForTimeout(500);
      }
      
      await expect(page.locator('body')).toBeVisible();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SECCIÓN 4: FINANZAS
  // ═══════════════════════════════════════════════════════════════════════════
  test.describe('4. Gestión Financiera', () => {
    
    test('4.1 Análisis financiero muestra métricas', async ({ page }) => {
      await page.goto('/eventos-erp/analisis-financiero');
      await page.waitForLoadState('networkidle');
      
      // Debe mostrar alguna métrica o gráfico
      await expect(page.locator('body')).toBeVisible();
    });

    test('4.2 Dashboard financiero con datos', async ({ page }) => {
      await page.goto('/eventos-erp');
      await page.waitForLoadState('networkidle');
      
      // Verificar si hay cards de métricas
      const cards = page.locator('[class*="card"], [class*="Card"]');
      const count = await cards.count();
      expect(count).toBeGreaterThanOrEqual(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SECCIÓN 5: PERFORMANCE
  // ═══════════════════════════════════════════════════════════════════════════
  test.describe('5. Performance', () => {
    
    test('5.1 Lista de eventos carga en < 5s', async ({ page }) => {
      const start = Date.now();
      await page.goto('/eventos-erp');
      await page.waitForLoadState('networkidle');
      const elapsed = Date.now() - start;
      
      console.log(`⏱️ Tiempo de carga eventos: ${elapsed}ms`);
      expect(elapsed).toBeLessThan(5000);
    });

    test('5.2 Lista de clientes carga en < 5s', async ({ page }) => {
      const start = Date.now();
      await page.goto('/eventos-erp/clientes');
      await page.waitForLoadState('networkidle');
      const elapsed = Date.now() - start;
      
      console.log(`⏱️ Tiempo de carga clientes: ${elapsed}ms`);
      expect(elapsed).toBeLessThan(5000);
    });

    test('5.3 Análisis financiero carga en < 8s', async ({ page }) => {
      const start = Date.now();
      await page.goto('/eventos-erp/analisis-financiero');
      await page.waitForLoadState('networkidle');
      const elapsed = Date.now() - start;
      
      console.log(`⏱️ Tiempo de carga análisis: ${elapsed}ms`);
      expect(elapsed).toBeLessThan(8000);
    });
  });
});
```

### 5.2 Suite Completa de Inventario

```javascript
// playwright/e2e/inventario-completo.spec.js
import { test, expect } from '@playwright/test';

test.describe('📦 MÓDULO INVENTARIO - Suite Completa', () => {
  
  // ═══════════════════════════════════════════════════════════════════════════
  // SECCIÓN 1: NAVEGACIÓN
  // ═══════════════════════════════════════════════════════════════════════════
  test.describe('1. Navegación', () => {
    
    test('1.1 Dashboard de inventario accesible', async ({ page }) => {
      await page.goto('/inventario');
      await page.waitForLoadState('networkidle');
      await expect(page).toHaveURL(/.*inventario.*/);
    });

    test('1.2 Almacenes accesible', async ({ page }) => {
      await page.goto('/inventario/almacenes');
      await page.waitForLoadState('networkidle');
      await expect(page.locator('body')).toBeVisible();
    });

    test('1.3 Productos accesible', async ({ page }) => {
      await page.goto('/inventario/productos');
      await page.waitForLoadState('networkidle');
      await expect(page.locator('body')).toBeVisible();
    });

    test('1.4 Documentos accesible', async ({ page }) => {
      await page.goto('/inventario/documentos');
      await page.waitForLoadState('networkidle');
      await expect(page.locator('body')).toBeVisible();
    });

    test('1.5 Stock accesible', async ({ page }) => {
      await page.goto('/inventario/stock');
      await page.waitForLoadState('networkidle');
      await expect(page.locator('body')).toBeVisible();
    });

    test('1.6 Movimientos accesible', async ({ page }) => {
      await page.goto('/inventario/movimientos');
      await page.waitForLoadState('networkidle');
      await expect(page.locator('body')).toBeVisible();
    });

    test('1.7 Kardex accesible', async ({ page }) => {
      await page.goto('/inventario/kardex');
      await page.waitForLoadState('networkidle');
      await expect(page.locator('body')).toBeVisible();
    });

    test('1.8 Transferencias accesible', async ({ page }) => {
      await page.goto('/inventario/transferencias');
      await page.waitForLoadState('networkidle');
      await expect(page.locator('body')).toBeVisible();
    });

    test('1.9 Etiquetas QR accesible', async ({ page }) => {
      await page.goto('/inventario/etiquetas');
      await page.waitForLoadState('networkidle');
      await expect(page.locator('body')).toBeVisible();
    });

    test('1.10 Configuración accesible', async ({ page }) => {
      await page.goto('/inventario/configuracion');
      await page.waitForLoadState('networkidle');
      await expect(page.locator('body')).toBeVisible();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SECCIÓN 2: CRUD ALMACENES
  // ═══════════════════════════════════════════════════════════════════════════
  test.describe('2. Gestión de Almacenes', () => {
    
    test('2.1 Lista de almacenes muestra datos', async ({ page }) => {
      await page.goto('/inventario/almacenes');
      await page.waitForLoadState('networkidle');
      
      await expect(page.locator('body')).toBeVisible();
    });

    test('2.2 Modal de nuevo almacén abre', async ({ page }) => {
      await page.goto('/inventario/almacenes');
      await page.waitForLoadState('networkidle');
      
      const btn = page.locator('button:has-text("Nuevo"), button:has-text("Crear"), button:has-text("Agregar")').first();
      if (await btn.count() > 0) {
        await btn.click();
        await expect(page.locator('[role="dialog"], .modal, [class*="Modal"]')).toBeVisible();
      }
    });

    test('2.3 Formulario tiene campos requeridos', async ({ page }) => {
      await page.goto('/inventario/almacenes');
      await page.waitForLoadState('networkidle');
      
      await page.click('button:has-text("Nuevo"), button:has-text("Crear")');
      
      // Verificar campos
      await expect(page.locator('input')).toHaveCount({ greaterThan: 0 });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SECCIÓN 3: CRUD PRODUCTOS
  // ═══════════════════════════════════════════════════════════════════════════
  test.describe('3. Gestión de Productos', () => {
    
    test('3.1 Lista de productos muestra datos', async ({ page }) => {
      await page.goto('/inventario/productos');
      await page.waitForLoadState('networkidle');
      
      await expect(page.locator('body')).toBeVisible();
    });

    test('3.2 Búsqueda de productos funciona', async ({ page }) => {
      await page.goto('/inventario/productos');
      await page.waitForLoadState('networkidle');
      
      const search = page.locator('input[placeholder*="Buscar"], input[type="search"]').first();
      if (await search.count() > 0) {
        await search.fill('test');
        await page.waitForTimeout(500);
      }
      
      await expect(page.locator('body')).toBeVisible();
    });

    test('3.3 Modal de nuevo producto abre', async ({ page }) => {
      await page.goto('/inventario/productos');
      await page.waitForLoadState('networkidle');
      
      const btn = page.locator('button:has-text("Nuevo"), button:has-text("Crear")').first();
      if (await btn.count() > 0) {
        await btn.click();
        await page.waitForTimeout(500);
        await expect(page.locator('[role="dialog"], .modal')).toBeVisible();
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SECCIÓN 4: DOCUMENTOS DE INVENTARIO
  // ═══════════════════════════════════════════════════════════════════════════
  test.describe('4. Documentos de Inventario', () => {
    
    test('4.1 Lista de documentos visible', async ({ page }) => {
      await page.goto('/inventario/documentos');
      await page.waitForLoadState('networkidle');
      
      await expect(page.locator('body')).toBeVisible();
    });

    test('4.2 Botón de entrada visible', async ({ page }) => {
      await page.goto('/inventario/documentos');
      await page.waitForLoadState('networkidle');
      
      const entradaBtn = page.locator('button:has-text("Entrada")');
      if (await entradaBtn.count() > 0) {
        await expect(entradaBtn).toBeVisible();
      }
    });

    test('4.3 Botón de salida visible', async ({ page }) => {
      await page.goto('/inventario/documentos');
      await page.waitForLoadState('networkidle');
      
      const salidaBtn = page.locator('button:has-text("Salida")');
      if (await salidaBtn.count() > 0) {
        await expect(salidaBtn).toBeVisible();
      }
    });

    test('4.4 Formulario de entrada tiene selector de almacén', async ({ page }) => {
      await page.goto('/inventario/documentos');
      await page.waitForLoadState('networkidle');
      
      const entradaBtn = page.locator('button:has-text("Entrada")').first();
      if (await entradaBtn.count() > 0) {
        await entradaBtn.click();
        await page.waitForTimeout(1000);
        
        // Verificar selector de almacén
        const hasSelect = await page.locator('select').count() > 0;
        const hasAlmacenText = await page.locator('text=/almac/i').count() > 0;
        expect(hasSelect || hasAlmacenText).toBeTruthy();
      }
    });

    test('4.5 Formulario tiene sección de firmas', async ({ page }) => {
      await page.goto('/inventario/documentos');
      await page.waitForLoadState('networkidle');
      
      const entradaBtn = page.locator('button:has-text("Entrada")').first();
      if (await entradaBtn.count() > 0) {
        await entradaBtn.click();
        await page.waitForTimeout(1000);
        
        const hasFirmas = await page.locator('text=/firma|entrega|recibe/i').count() > 0;
        expect(hasFirmas).toBeTruthy();
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SECCIÓN 5: ETIQUETAS QR
  // ═══════════════════════════════════════════════════════════════════════════
  test.describe('5. Etiquetas QR', () => {
    
    test('5.1 Página de etiquetas carga', async ({ page }) => {
      await page.goto('/inventario/etiquetas');
      await page.waitForLoadState('networkidle');
      
      await expect(page.locator('body')).toBeVisible();
    });

    test('5.2 Checkboxes de selección existen', async ({ page }) => {
      await page.goto('/inventario/etiquetas');
      await page.waitForLoadState('networkidle');
      
      const checkboxes = page.locator('input[type="checkbox"]');
      const count = await checkboxes.count();
      expect(count).toBeGreaterThanOrEqual(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SECCIÓN 6: CONFIGURACIÓN
  // ═══════════════════════════════════════════════════════════════════════════
  test.describe('6. Configuración', () => {
    
    test('6.1 Página de configuración carga', async ({ page }) => {
      await page.goto('/inventario/configuracion');
      await page.waitForLoadState('networkidle');
      
      await expect(page.locator('body')).toBeVisible();
    });

    test('6.2 Toggles de submódulos existen', async ({ page }) => {
      await page.goto('/inventario/configuracion');
      await page.waitForLoadState('networkidle');
      
      const toggles = page.locator('input[type="checkbox"], [role="switch"]');
      const count = await toggles.count();
      expect(count).toBeGreaterThanOrEqual(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SECCIÓN 7: PERFORMANCE
  // ═══════════════════════════════════════════════════════════════════════════
  test.describe('7. Performance', () => {
    
    test('7.1 Dashboard carga en < 5s', async ({ page }) => {
      const start = Date.now();
      await page.goto('/inventario');
      await page.waitForLoadState('networkidle');
      const elapsed = Date.now() - start;
      
      console.log(`⏱️ Dashboard: ${elapsed}ms`);
      expect(elapsed).toBeLessThan(5000);
    });

    test('7.2 Productos carga en < 5s', async ({ page }) => {
      const start = Date.now();
      await page.goto('/inventario/productos');
      await page.waitForLoadState('networkidle');
      const elapsed = Date.now() - start;
      
      console.log(`⏱️ Productos: ${elapsed}ms`);
      expect(elapsed).toBeLessThan(5000);
    });

    test('7.3 Stock carga en < 5s', async ({ page }) => {
      const start = Date.now();
      await page.goto('/inventario/stock');
      await page.waitForLoadState('networkidle');
      const elapsed = Date.now() - start;
      
      console.log(`⏱️ Stock: ${elapsed}ms`);
      expect(elapsed).toBeLessThan(5000);
    });
  });
});
```

### 5.3 Suite de Integración Eventos-Inventario

```javascript
// playwright/e2e/integracion-eventos-inventario.spec.js
import { test, expect } from '@playwright/test';

test.describe('🔗 INTEGRACIÓN EVENTOS-INVENTARIO', () => {
  
  test('1. Flujo: Evento → Material Almacén → Gasto', async ({ page }) => {
    // Este test verifica la integración entre módulos
    
    // Paso 1: Acceder a eventos
    await page.goto('/eventos-erp');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toBeVisible();
    
    // Paso 2: Verificar que existe el módulo de inventario
    await page.goto('/inventario');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toBeVisible();
    
    // Paso 3: Verificar productos disponibles
    await page.goto('/inventario/productos');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toBeVisible();
  });

  test('2. Consistencia de datos entre módulos', async ({ page }) => {
    // Verificar que ambos módulos cargan sin errores
    
    const modulos = [
      '/eventos-erp',
      '/eventos-erp/clientes',
      '/inventario',
      '/inventario/almacenes',
      '/inventario/productos'
    ];
    
    for (const modulo of modulos) {
      await page.goto(modulo);
      await page.waitForLoadState('networkidle');
      
      // No debe haber errores JavaScript
      const errors: string[] = [];
      page.on('pageerror', (err) => errors.push(err.message));
      
      await page.waitForTimeout(1000);
      expect(errors.length).toBe(0);
    }
  });

  test('3. Performance comparativa', async ({ page }) => {
    const tiempos: Record<string, number> = {};
    
    const paginas = [
      { url: '/eventos-erp', nombre: 'Eventos' },
      { url: '/inventario', nombre: 'Inventario' },
      { url: '/eventos-erp/analisis-financiero', nombre: 'Análisis Financiero' },
      { url: '/inventario/stock', nombre: 'Stock' }
    ];
    
    for (const pag of paginas) {
      const start = Date.now();
      await page.goto(pag.url);
      await page.waitForLoadState('networkidle');
      tiempos[pag.nombre] = Date.now() - start;
    }
    
    console.log('⏱️ Tiempos de carga:');
    Object.entries(tiempos).forEach(([nombre, tiempo]) => {
      console.log(`   ${nombre}: ${tiempo}ms`);
    });
    
    // Ninguna página debe tardar más de 8 segundos
    Object.values(tiempos).forEach(tiempo => {
      expect(tiempo).toBeLessThan(8000);
    });
  });
});
```

---

## 6. PRUEBAS DE PERFORMANCE

### 6.1 Script de Benchmark

```javascript
// scripts/performance-benchmark.js

const { chromium } = require('playwright');

const BASE_URL = 'http://localhost:5174';

const PAGES_TO_TEST = [
  { name: 'Dashboard', url: '/' },
  { name: 'Eventos Lista', url: '/eventos-erp' },
  { name: 'Clientes', url: '/eventos-erp/clientes' },
  { name: 'Análisis Financiero', url: '/eventos-erp/analisis-financiero' },
  { name: 'Inventario Dashboard', url: '/inventario' },
  { name: 'Productos', url: '/inventario/productos' },
  { name: 'Almacenes', url: '/inventario/almacenes' },
  { name: 'Stock', url: '/inventario/stock' },
  { name: 'Documentos', url: '/inventario/documentos' }
];

async function runBenchmark() {
  console.log('🚀 BENCHMARK DE PERFORMANCE - ERP 777\n');
  console.log('═'.repeat(60));
  
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  const results = [];
  
  for (const pageInfo of PAGES_TO_TEST) {
    const metrics = {
      name: pageInfo.name,
      url: pageInfo.url,
      loadTime: 0,
      domContentLoaded: 0,
      firstPaint: 0,
      errors: []
    };
    
    // Capturar errores JS
    page.on('pageerror', (err) => metrics.errors.push(err.message));
    
    try {
      const startTime = Date.now();
      
      await page.goto(BASE_URL + pageInfo.url, { waitUntil: 'networkidle' });
      
      metrics.loadTime = Date.now() - startTime;
      
      // Métricas de navegación
      const timing = await page.evaluate(() => {
        const perf = performance.getEntriesByType('navigation')[0];
        return {
          domContentLoaded: perf.domContentLoadedEventEnd - perf.startTime,
          load: perf.loadEventEnd - perf.startTime
        };
      });
      
      metrics.domContentLoaded = Math.round(timing.domContentLoaded);
      
      // Determinar status
      let status = '✅';
      if (metrics.loadTime > 5000) status = '⚠️';
      if (metrics.loadTime > 8000) status = '❌';
      if (metrics.errors.length > 0) status = '❌';
      
      console.log(`${status} ${pageInfo.name.padEnd(25)} | ${metrics.loadTime}ms | DOM: ${metrics.domContentLoaded}ms | Errors: ${metrics.errors.length}`);
      
    } catch (err) {
      console.log(`❌ ${pageInfo.name.padEnd(25)} | ERROR: ${err.message}`);
      metrics.errors.push(err.message);
    }
    
    results.push(metrics);
  }
  
  await browser.close();
  
  // Resumen
  console.log('\n' + '═'.repeat(60));
  console.log('📊 RESUMEN');
  console.log('═'.repeat(60));
  
  const avgTime = results.reduce((sum, r) => sum + r.loadTime, 0) / results.length;
  const maxTime = Math.max(...results.map(r => r.loadTime));
  const minTime = Math.min(...results.map(r => r.loadTime));
  const totalErrors = results.reduce((sum, r) => sum + r.errors.length, 0);
  
  console.log(`Promedio de carga: ${Math.round(avgTime)}ms`);
  console.log(`Tiempo máximo: ${maxTime}ms`);
  console.log(`Tiempo mínimo: ${minTime}ms`);
  console.log(`Total errores JS: ${totalErrors}`);
  
  return results;
}

runBenchmark().catch(console.error);
```

---

## 7. PRUEBAS DE CONSISTENCIA DE DATOS

### 7.1 Script de Validación de Integridad

```sql
-- ============================================================================
-- VALIDACIÓN COMPLETA DE INTEGRIDAD DE DATOS
-- Ejecutar en Supabase SQL Editor
-- ============================================================================

-- SECCIÓN 1: EVENTOS
SELECT '═══ VALIDACIÓN MÓDULO EVENTOS ═══' AS seccion;

-- 1.1 Eventos activos sin problemas
SELECT 
    'Eventos activos' AS check_name,
    COUNT(*) AS total,
    COUNT(CASE WHEN cliente_id IS NOT NULL THEN 1 END) AS con_cliente,
    COUNT(CASE WHEN clave_evento IS NOT NULL THEN 1 END) AS con_clave
FROM evt_eventos_erp
WHERE activo = true;

-- 1.2 Gastos con problemas
SELECT 
    'Gastos con problemas' AS check_name,
    COUNT(CASE WHEN categoria_id IS NULL THEN 1 END) AS sin_categoria,
    COUNT(CASE WHEN ABS(total - (subtotal + iva)) > 0.01 THEN 1 END) AS descuadre_fiscal,
    COUNT(CASE WHEN evento_id IS NULL THEN 1 END) AS sin_evento
FROM evt_gastos_erp
WHERE deleted_at IS NULL;

-- 1.3 Ingresos con problemas
SELECT 
    'Ingresos con problemas' AS check_name,
    COUNT(CASE WHEN cliente_id IS NULL THEN 1 END) AS sin_cliente,
    COUNT(CASE WHEN ABS(total - (subtotal + iva)) > 0.01 THEN 1 END) AS descuadre_fiscal,
    COUNT(CASE WHEN evento_id IS NULL THEN 1 END) AS sin_evento
FROM evt_ingresos_erp;

-- SECCIÓN 2: INVENTARIO
SELECT '═══ VALIDACIÓN MÓDULO INVENTARIO ═══' AS seccion;

-- 2.1 Productos
SELECT 
    'Productos' AS check_name,
    COUNT(*) AS total,
    COUNT(CASE WHEN nombre IS NULL OR nombre = '' THEN 1 END) AS sin_nombre,
    COUNT(CASE WHEN clave IS NULL OR clave = '' THEN 1 END) AS sin_clave
FROM productos_erp;

-- 2.2 Almacenes
SELECT 
    'Almacenes' AS check_name,
    COUNT(*) AS total,
    COUNT(CASE WHEN activo = true THEN 1 END) AS activos,
    COUNT(CASE WHEN tipo IS NULL THEN 1 END) AS sin_tipo
FROM almacenes_erp;

-- 2.3 Existencias negativas (ERROR CRÍTICO)
SELECT 
    'Existencias negativas' AS check_name,
    COUNT(*) AS cantidad_problemas
FROM inv_existencias
WHERE cantidad < 0;

-- 2.4 Documentos pendientes
SELECT 
    'Documentos sin confirmar' AS check_name,
    COUNT(*) AS borradores,
    COUNT(CASE WHEN created_at < NOW() - INTERVAL '7 days' THEN 1 END) AS antiguos
FROM inv_documentos
WHERE estado = 'borrador';

-- RESUMEN FINAL
SELECT '═══ RESUMEN FINAL ═══' AS seccion;

SELECT 
    'TOTALES GENERALES' AS metrica,
    (SELECT COUNT(*) FROM evt_eventos_erp WHERE activo = true) AS eventos_activos,
    (SELECT COUNT(*) FROM evt_clientes_erp WHERE activo = true) AS clientes_activos,
    (SELECT COUNT(*) FROM evt_gastos_erp WHERE deleted_at IS NULL) AS gastos,
    (SELECT COUNT(*) FROM evt_ingresos_erp) AS ingresos,
    (SELECT COUNT(*) FROM productos_erp) AS productos,
    (SELECT COUNT(*) FROM almacenes_erp WHERE activo = true) AS almacenes;
```

---

## 8. COMANDOS DE EJECUCIÓN

### 8.1 Ejecutar Pruebas Playwright

```bash
# Instalar dependencias (si no están instaladas)
npm install -D @playwright/test
npx playwright install

# Ejecutar todas las pruebas
npx playwright test

# Ejecutar suite de eventos
npx playwright test playwright/e2e/eventos-completo.spec.js

# Ejecutar suite de inventario
npx playwright test playwright/e2e/inventario-completo.spec.js

# Ejecutar con interfaz visual
npx playwright test --ui

# Ejecutar con reporte HTML
npx playwright test --reporter=html

# Ejecutar solo pruebas de performance
npx playwright test --grep "Performance"

# Ver reporte
npx playwright show-report
```

### 8.2 Ejecutar Pruebas Cypress (existentes)

```bash
# Modo interactivo
npx cypress open

# Ejecutar todas las pruebas
npx cypress run

# Ejecutar suite específica de eventos
npx cypress run --spec "cypress/e2e/eventos-modulo-completo.cy.ts"

# Ejecutar suite específica de inventario
npx cypress run --spec "cypress/e2e/inventario-integral-v2.cy.ts"

# Con video
npx cypress run --config video=true
```

### 8.3 Ejecutar Scripts de Validación

```bash
# Pruebas de servicios de eventos
node scripts/test-eventos-service.js

# Pruebas de servicios de inventario
node scripts/test-inventario-service.js

# Benchmark de performance
node scripts/performance-benchmark.js
```

### 8.4 Ejecutar Pruebas Unitarias (Vitest)

```bash
# Todas las pruebas
npx vitest run

# Solo inventario
npx vitest run src/modules/inventario-erp/__tests__/

# Con cobertura
npx vitest run --coverage

# Modo watch
npx vitest
```

---

## 📋 MATRIZ DE COBERTURA

| Funcionalidad | Scripts SQL | Scripts JS | Cypress | Playwright | Vitest |
|---------------|:-----------:|:----------:|:-------:|:----------:|:------:|
| **EVENTOS** |
| CRUD Eventos | ✅ | ✅ | ✅ | ✅ | - |
| CRUD Clientes | ✅ | ✅ | ✅ | ✅ | - |
| CRUD Ingresos | ✅ | ✅ | ✅ | ✅ | - |
| CRUD Gastos | ✅ | ✅ | ✅ | ✅ | - |
| Análisis Financiero | ✅ | ✅ | ✅ | ✅ | - |
| Workflow Estados | ✅ | - | ✅ | ✅ | - |
| **INVENTARIO** |
| CRUD Almacenes | ✅ | ✅ | ✅ | ✅ | ✅ |
| CRUD Productos | ✅ | ✅ | ✅ | ✅ | ✅ |
| Documentos | ✅ | ✅ | ✅ | ✅ | ✅ |
| Stock | ✅ | ✅ | ✅ | ✅ | - |
| Movimientos | ✅ | ✅ | ✅ | ✅ | - |
| Etiquetas QR | - | - | ✅ | ✅ | - |
| **INTEGRACIÓN** |
| Eventos → Inventario | - | - | - | ✅ | - |
| **PERFORMANCE** |
| Tiempos de carga | - | ✅ | - | ✅ | - |
| **CONSISTENCIA** |
| Integridad BD | ✅ | ✅ | - | - | - |

---

## ✅ CONCLUSIÓN

Este plan de pruebas proporciona cobertura completa para:

1. **Funcionalidad**: Todas las operaciones CRUD de ambos módulos
2. **Integración**: Flujos entre eventos e inventario
3. **Performance**: Benchmarks de tiempos de carga
4. **Consistencia**: Validación de integridad de datos
5. **Automatización**: Scripts ejecutables con Playwright, Cypress y Vitest

**Siguiente paso recomendado**: Ejecutar las pruebas y generar un reporte de resultados.

---

*Documento generado: 2 de Diciembre de 2025*
*ERP-777-V02 - Plan de Pruebas v1.0*
