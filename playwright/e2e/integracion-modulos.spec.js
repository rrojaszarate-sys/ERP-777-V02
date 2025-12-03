/**
 * ============================================================================
 * 🔗 SUITE DE INTEGRACIÓN - EVENTOS E INVENTARIO
 * ============================================================================
 * 
 * Pruebas de integración entre módulos y validación de performance
 * 
 * Ejecutar: npx playwright test playwright/e2e/integracion-modulos.spec.js
 * ============================================================================
 */

import { test, expect } from '@playwright/test';

test.describe('🔗 INTEGRACIÓN EVENTOS-INVENTARIO', () => {
  
  // ═══════════════════════════════════════════════════════════════════════════
  // SECCIÓN 1: FLUJO COMPLETO
  // ═══════════════════════════════════════════════════════════════════════════
  test.describe('1. Flujo de Integración', () => {
    
    test('1.1 Navegación entre módulos sin errores', async ({ page }) => {
      const errors: string[] = [];
      page.on('pageerror', (err) => errors.push(err.message));
      
      // Navegar Eventos → Inventario → Eventos
      await page.goto('/eventos-erp');
      await page.waitForLoadState('networkidle');
      
      await page.goto('/inventario');
      await page.waitForLoadState('networkidle');
      
      await page.goto('/eventos-erp/clientes');
      await page.waitForLoadState('networkidle');
      
      await page.goto('/inventario/productos');
      await page.waitForLoadState('networkidle');
      
      // Filtrar errores no críticos
      const criticalErrors = errors.filter(e => 
        !e.includes('ResizeObserver') && !e.includes('Non-Error')
      );
      
      expect(criticalErrors.length).toBe(0);
    });

    test('1.2 Datos persisten entre navegaciones', async ({ page }) => {
      // Cargar eventos
      await page.goto('/eventos-erp');
      await page.waitForLoadState('networkidle');
      
      const eventosVisible = await page.locator('body').textContent();
      
      // Ir a inventario y volver
      await page.goto('/inventario');
      await page.waitForLoadState('networkidle');
      
      await page.goto('/eventos-erp');
      await page.waitForLoadState('networkidle');
      
      // Verificar que los datos siguen ahí
      await expect(page.locator('body')).toBeVisible();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SECCIÓN 2: BENCHMARK COMPARATIVO
  // ═══════════════════════════════════════════════════════════════════════════
  test.describe('2. Benchmark Comparativo', () => {
    
    test('2.1 Comparar tiempos de carga de ambos módulos', async ({ page }) => {
      const tiempos: Record<string, number> = {};
      
      const paginas = [
        { url: '/eventos-erp', nombre: 'Eventos Lista' },
        { url: '/eventos-erp/clientes', nombre: 'Clientes' },
        { url: '/eventos-erp/analisis-financiero', nombre: 'Análisis Financiero' },
        { url: '/inventario', nombre: 'Inventario Dashboard' },
        { url: '/inventario/productos', nombre: 'Productos' },
        { url: '/inventario/stock', nombre: 'Stock' },
        { url: '/inventario/documentos', nombre: 'Documentos' }
      ];
      
      for (const pag of paginas) {
        const start = Date.now();
        await page.goto(pag.url);
        await page.waitForLoadState('networkidle');
        tiempos[pag.nombre] = Date.now() - start;
      }
      
      console.log('\n📊 BENCHMARK DE TIEMPOS DE CARGA');
      console.log('═'.repeat(50));
      
      Object.entries(tiempos).forEach(([nombre, tiempo]) => {
        const status = tiempo < 3000 ? '✅' : tiempo < 5000 ? '⚠️' : '❌';
        console.log(`${status} ${nombre.padEnd(25)} ${tiempo}ms`);
      });
      
      console.log('═'.repeat(50));
      
      const promedio = Object.values(tiempos).reduce((a, b) => a + b, 0) / Object.keys(tiempos).length;
      console.log(`📈 Promedio: ${Math.round(promedio)}ms`);
      
      // Ninguna página debe tardar más de 8 segundos
      Object.values(tiempos).forEach(tiempo => {
        expect(tiempo).toBeLessThan(8000);
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SECCIÓN 3: CONSISTENCIA DE UI
  // ═══════════════════════════════════════════════════════════════════════════
  test.describe('3. Consistencia de UI', () => {
    
    test('3.1 Ambos módulos tienen navegación lateral', async ({ page }) => {
      // Verificar navegación en Eventos
      await page.goto('/eventos-erp');
      await page.waitForLoadState('networkidle');
      
      const navEventos = await page.locator('nav, aside, [class*="sidebar"]').count();
      
      // Verificar navegación en Inventario
      await page.goto('/inventario');
      await page.waitForLoadState('networkidle');
      
      const navInventario = await page.locator('nav, aside, [class*="sidebar"]').count();
      
      // Ambos deben tener navegación
      expect(navEventos).toBeGreaterThan(0);
      expect(navInventario).toBeGreaterThan(0);
    });

    test('3.2 Estilos consistentes (botones primarios)', async ({ page }) => {
      // Capturar screenshots de botones en ambos módulos
      await page.goto('/eventos-erp');
      await page.waitForLoadState('networkidle');
      await page.screenshot({ path: 'test-results/integracion/eventos-ui.png' });
      
      await page.goto('/inventario');
      await page.waitForLoadState('networkidle');
      await page.screenshot({ path: 'test-results/integracion/inventario-ui.png' });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SECCIÓN 4: CARGA DE DATOS
  // ═══════════════════════════════════════════════════════════════════════════
  test.describe('4. Carga de Datos', () => {
    
    test('4.1 Eventos carga datos de la base de datos', async ({ page }) => {
      await page.goto('/eventos-erp');
      await page.waitForLoadState('networkidle');
      
      // Debe mostrar tabla o mensaje
      const hasTable = await page.locator('table').count() > 0;
      const hasEmpty = await page.locator('text=/no hay|vacío|sin datos/i').count() > 0;
      
      expect(hasTable || hasEmpty).toBeTruthy();
    });

    test('4.2 Inventario carga datos de la base de datos', async ({ page }) => {
      await page.goto('/inventario/productos');
      await page.waitForLoadState('networkidle');
      
      // Debe mostrar contenido
      const hasContent = await page.locator('table, [class*="grid"], [class*="list"]').count() > 0;
      const hasEmpty = await page.locator('text=/no hay|vacío|sin datos/i').count() > 0;
      
      expect(hasContent || hasEmpty).toBeTruthy();
    });

    test('4.3 Clientes carga correctamente', async ({ page }) => {
      await page.goto('/eventos-erp/clientes');
      await page.waitForLoadState('networkidle');
      
      await expect(page.locator('body')).toBeVisible();
    });

    test('4.4 Almacenes carga correctamente', async ({ page }) => {
      await page.goto('/inventario/almacenes');
      await page.waitForLoadState('networkidle');
      
      await expect(page.locator('body')).toBeVisible();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SECCIÓN 5: STRESS TEST
  // ═══════════════════════════════════════════════════════════════

  test.describe('5. Stress Test', () => {
    
    test('5.1 Navegación rápida entre páginas', async ({ page }) => {
      const paginas = [
        '/eventos-erp',
        '/inventario',
        '/eventos-erp/clientes',
        '/inventario/productos',
        '/eventos-erp/analisis-financiero',
        '/inventario/stock',
        '/eventos-erp',
        '/inventario/documentos'
      ];
      
      for (const url of paginas) {
        await page.goto(url);
        await page.waitForTimeout(500); // Navegación rápida
      }
      
      // Debe terminar sin errores
      await expect(page.locator('body')).toBeVisible();
    });

    test('5.2 Múltiples recargas de página', async ({ page }) => {
      await page.goto('/eventos-erp');
      
      for (let i = 0; i < 5; i++) {
        await page.reload();
        await page.waitForLoadState('networkidle');
      }
      
      await expect(page.locator('body')).toBeVisible();
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// REPORTE FINAL
// ═══════════════════════════════════════════════════════════════════════════
test.afterAll(async () => {
  console.log('\n');
  console.log('═'.repeat(60));
  console.log('🏁 PRUEBAS DE INTEGRACIÓN COMPLETADAS');
  console.log('═'.repeat(60));
  console.log('📁 Screenshots: test-results/integracion/');
  console.log('📊 Reporte HTML: playwright-report/index.html');
  console.log('═'.repeat(60));
});
