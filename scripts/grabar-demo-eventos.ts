/**
 * Script de Grabación de Video - Demostración Módulo de Eventos
 *
 * Ejecutar: npx ts-node scripts/grabar-demo-eventos.ts
 * O: npx playwright test scripts/grabar-demo-eventos.ts
 *
 * El video se guarda en: videos/demo-eventos.webm
 */

import { chromium, Browser, Page } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';

const BASE_URL = 'http://localhost:5174';
const VIDEO_DIR = path.join(process.cwd(), 'videos');

// Tiempos de pausa para visualización
const PAUSE = {
  SHORT: 1000,
  MEDIUM: 2000,
  LONG: 3000,
  EXTRA: 4000
};

async function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function grabarDemo(): Promise<void> {
  console.log('🎬 Iniciando grabación de demostración...\n');

  // Crear directorio de videos si no existe
  if (!fs.existsSync(VIDEO_DIR)) {
    fs.mkdirSync(VIDEO_DIR, { recursive: true });
  }

  // Iniciar navegador con grabación de video
  const browser: Browser = await chromium.launch({
    headless: false, // Para ver la grabación en tiempo real
    slowMo: 50 // Hace las acciones más visibles
  });

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    recordVideo: {
      dir: VIDEO_DIR,
      size: { width: 1920, height: 1080 }
    }
  });

  const page: Page = await context.newPage();

  try {
    // ========================================================================
    // SECCIÓN 1: DASHBOARD
    // ========================================================================
    console.log('📊 Grabando: Dashboard Principal...');
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
    await wait(PAUSE.LONG);

    // ========================================================================
    // SECCIÓN 2: LISTADO DE EVENTOS
    // ========================================================================
    console.log('📅 Grabando: Listado de Eventos...');
    await page.goto(`${BASE_URL}/eventos-erp`);
    await page.waitForLoadState('networkidle');
    await wait(PAUSE.MEDIUM);

    // Buscar evento de prueba
    const searchInput = page.locator('input[placeholder*="Buscar"]').first();
    if (await searchInput.isVisible()) {
      await searchInput.fill('');
      await wait(PAUSE.SHORT);
      await searchInput.type('TEST01', { delay: 100 });
      await wait(PAUSE.MEDIUM);
    }

    // ========================================================================
    // SECCIÓN 3: DETALLE DE EVENTO
    // ========================================================================
    console.log('📋 Grabando: Detalle de Evento...');

    // Click en primer evento
    const firstRow = page.locator('tbody tr, [class*="row"]').first();
    if (await firstRow.isVisible()) {
      await firstRow.click();
      await wait(PAUSE.LONG);
    }

    // ========================================================================
    // SECCIÓN 4: TAB INGRESOS
    // ========================================================================
    console.log('💰 Grabando: Tab Ingresos...');
    const ingresosTab = page.locator('text=/ingreso/i').first();
    if (await ingresosTab.isVisible()) {
      await ingresosTab.click();
      await wait(PAUSE.MEDIUM);
    }

    // ========================================================================
    // SECCIÓN 5: TAB GASTOS
    // ========================================================================
    console.log('💸 Grabando: Tab Gastos...');
    const gastosTab = page.locator('text=/gasto/i').first();
    if (await gastosTab.isVisible()) {
      await gastosTab.click();
      await wait(PAUSE.MEDIUM);

      // Navegar por categorías
      const categorias = ['combustible', 'material', 'rh', 'sp'];
      for (const cat of categorias) {
        const catTab = page.locator(`text=/${cat}/i`).first();
        if (await catTab.isVisible()) {
          await catTab.click();
          await wait(PAUSE.SHORT);
        }
      }

      // Volver a todos
      const todosTab = page.locator('text=/todos/i').first();
      if (await todosTab.isVisible()) {
        await todosTab.click();
        await wait(PAUSE.SHORT);
      }
    }

    // ========================================================================
    // SECCIÓN 6: TAB PROVISIONES
    // ========================================================================
    console.log('📦 Grabando: Tab Provisiones...');
    const provisionesTab = page.locator('text=/provis/i').first();
    if (await provisionesTab.isVisible()) {
      await provisionesTab.click();
      await wait(PAUSE.MEDIUM);
    }

    // ========================================================================
    // SECCIÓN 7: TAB WORKFLOW
    // ========================================================================
    console.log('🔄 Grabando: Tab Workflow...');
    const workflowTab = page.locator('text=/workflow|estado|flujo/i').first();
    if (await workflowTab.isVisible()) {
      await workflowTab.click();
      await wait(PAUSE.MEDIUM);
    }

    // Cerrar modal
    await page.keyboard.press('Escape');
    await wait(PAUSE.SHORT);

    // ========================================================================
    // SECCIÓN 8: CLIENTES
    // ========================================================================
    console.log('👥 Grabando: Módulo Clientes...');
    await page.goto(`${BASE_URL}/eventos-erp/clientes`);
    await page.waitForLoadState('networkidle');
    await wait(PAUSE.MEDIUM);

    // ========================================================================
    // SECCIÓN 9: ANÁLISIS FINANCIERO
    // ========================================================================
    console.log('📊 Grabando: Análisis Financiero...');
    await page.goto(`${BASE_URL}/eventos-erp/analisis-financiero`);
    await page.waitForLoadState('networkidle');
    await wait(PAUSE.LONG);

    // ========================================================================
    // SECCIÓN 10: WORKFLOW VISUAL
    // ========================================================================
    console.log('📈 Grabando: Workflow Visual...');
    await page.goto(`${BASE_URL}/eventos-erp/workflow`);
    await page.waitForLoadState('networkidle');
    await wait(PAUSE.MEDIUM);

    // ========================================================================
    // SECCIÓN 11: CATÁLOGOS
    // ========================================================================
    console.log('📚 Grabando: Catálogos...');
    await page.goto(`${BASE_URL}/eventos-erp/catalogos`);
    await page.waitForLoadState('networkidle');
    await wait(PAUSE.MEDIUM);

    // ========================================================================
    // SECCIÓN 12: INVENTARIO
    // ========================================================================
    console.log('🏭 Grabando: Inventario...');
    await page.goto(`${BASE_URL}/inventario`);
    await page.waitForLoadState('networkidle');
    await wait(PAUSE.MEDIUM);

    await page.goto(`${BASE_URL}/inventario/productos`);
    await page.waitForLoadState('networkidle');
    await wait(PAUSE.MEDIUM);

    // ========================================================================
    // CIERRE
    // ========================================================================
    console.log('🎬 Grabando: Cierre...');
    await page.goto(`${BASE_URL}/eventos-erp`);
    await page.waitForLoadState('networkidle');
    await wait(PAUSE.LONG);

    console.log('\n✅ Grabación completada!');

  } catch (error) {
    console.error('❌ Error durante la grabación:', error);
  } finally {
    // Cerrar contexto (esto guarda el video)
    await context.close();
    await browser.close();

    // Obtener el archivo de video generado
    const files = fs.readdirSync(VIDEO_DIR);
    const videoFile = files.find(f => f.endsWith('.webm'));

    if (videoFile) {
      const oldPath = path.join(VIDEO_DIR, videoFile);
      const newPath = path.join(VIDEO_DIR, 'demo-eventos.webm');

      // Renombrar el video
      if (fs.existsSync(newPath)) {
        fs.unlinkSync(newPath);
      }
      fs.renameSync(oldPath, newPath);

      console.log(`\n📹 Video guardado en: ${newPath}`);
    }
  }
}

// Ejecutar
grabarDemo().catch(console.error);
