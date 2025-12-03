/**
 * Script de Grabación de Video - Demostración Módulo de Eventos
 *
 * Ejecutar: node scripts/grabar-demo-eventos.mjs
 *
 * El video se guarda en: videos/demo-eventos.webm
 */

import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE_URL = 'http://localhost:5174';
const VIDEO_DIR = path.join(path.dirname(__dirname), 'videos');

// Tiempos de pausa para visualización
const PAUSE = {
  SHORT: 1000,
  MEDIUM: 2000,
  LONG: 3000,
  EXTRA: 4000
};

async function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function grabarDemo() {
  console.log('🎬 Iniciando grabación de demostración...\n');

  // Crear directorio de videos si no existe
  if (!fs.existsSync(VIDEO_DIR)) {
    fs.mkdirSync(VIDEO_DIR, { recursive: true });
  }

  // Iniciar navegador con grabación de video
  const browser = await chromium.launch({
    headless: true, // true para WSL
    slowMo: 50
  });

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    recordVideo: {
      dir: VIDEO_DIR,
      size: { width: 1920, height: 1080 }
    }
  });

  const page = await context.newPage();

  try {
    // ========================================================================
    // SECCIÓN 1: DASHBOARD
    // ========================================================================
    console.log('📊 [1/12] Grabando: Dashboard Principal...');
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
    await wait(PAUSE.LONG);

    // ========================================================================
    // SECCIÓN 2: LISTADO DE EVENTOS
    // ========================================================================
    console.log('📅 [2/12] Grabando: Listado de Eventos...');
    await page.goto(`${BASE_URL}/eventos-erp`);
    await page.waitForLoadState('networkidle');
    await wait(PAUSE.MEDIUM);

    // Buscar evento de prueba
    const searchInput = page.locator('input[placeholder*="Buscar"]').first();
    try {
      if (await searchInput.isVisible({ timeout: 3000 })) {
        await searchInput.fill('');
        await wait(PAUSE.SHORT);
        await searchInput.type('TEST01', { delay: 100 });
        await wait(PAUSE.MEDIUM);
      }
    } catch (e) {
      console.log('   (Campo de búsqueda no encontrado)');
    }

    // ========================================================================
    // SECCIÓN 3: DETALLE DE EVENTO
    // ========================================================================
    console.log('📋 [3/12] Grabando: Detalle de Evento...');
    try {
      const firstRow = page.locator('tbody tr').first();
      if (await firstRow.isVisible({ timeout: 3000 })) {
        await firstRow.click();
        await wait(PAUSE.LONG);
      }
    } catch (e) {
      console.log('   (No se encontró evento para abrir)');
    }

    // ========================================================================
    // SECCIÓN 4: TAB INGRESOS
    // ========================================================================
    console.log('💰 [4/12] Grabando: Tab Ingresos...');
    try {
      const ingresosTab = page.getByText(/ingreso/i).first();
      if (await ingresosTab.isVisible({ timeout: 2000 })) {
        await ingresosTab.click();
        await wait(PAUSE.MEDIUM);
      }
    } catch (e) {
      console.log('   (Tab Ingresos no encontrado)');
    }

    // ========================================================================
    // SECCIÓN 5: TAB GASTOS
    // ========================================================================
    console.log('💸 [5/12] Grabando: Tab Gastos...');
    try {
      const gastosTab = page.getByText(/^gasto/i).first();
      if (await gastosTab.isVisible({ timeout: 2000 })) {
        await gastosTab.click();
        await wait(PAUSE.MEDIUM);

        // Navegar por categorías
        const categorias = ['Combustible', 'Material', 'RH', 'SP'];
        for (const cat of categorias) {
          try {
            const catTab = page.getByText(new RegExp(cat, 'i')).first();
            if (await catTab.isVisible({ timeout: 1000 })) {
              await catTab.click();
              await wait(PAUSE.SHORT);
            }
          } catch (e) {}
        }

        // Volver a todos
        try {
          const todosTab = page.getByText(/todos/i).first();
          if (await todosTab.isVisible({ timeout: 1000 })) {
            await todosTab.click();
            await wait(PAUSE.SHORT);
          }
        } catch (e) {}
      }
    } catch (e) {
      console.log('   (Tab Gastos no encontrado)');
    }

    // ========================================================================
    // SECCIÓN 6: TAB PROVISIONES
    // ========================================================================
    console.log('📦 [6/12] Grabando: Tab Provisiones...');
    try {
      const provisionesTab = page.getByText(/provis/i).first();
      if (await provisionesTab.isVisible({ timeout: 2000 })) {
        await provisionesTab.click();
        await wait(PAUSE.MEDIUM);
      }
    } catch (e) {
      console.log('   (Tab Provisiones no encontrado)');
    }

    // ========================================================================
    // SECCIÓN 7: TAB WORKFLOW
    // ========================================================================
    console.log('🔄 [7/12] Grabando: Tab Workflow...');
    try {
      const workflowTab = page.getByText(/workflow/i).first();
      if (await workflowTab.isVisible({ timeout: 2000 })) {
        await workflowTab.click();
        await wait(PAUSE.MEDIUM);
      }
    } catch (e) {
      console.log('   (Tab Workflow no encontrado)');
    }

    // Cerrar modal
    await page.keyboard.press('Escape');
    await wait(PAUSE.SHORT);

    // ========================================================================
    // SECCIÓN 8: CLIENTES
    // ========================================================================
    console.log('👥 [8/12] Grabando: Módulo Clientes...');
    await page.goto(`${BASE_URL}/eventos-erp/clientes`);
    await page.waitForLoadState('networkidle');
    await wait(PAUSE.MEDIUM);

    // ========================================================================
    // SECCIÓN 9: ANÁLISIS FINANCIERO
    // ========================================================================
    console.log('📊 [9/12] Grabando: Análisis Financiero...');
    await page.goto(`${BASE_URL}/eventos-erp/analisis-financiero`);
    await page.waitForLoadState('networkidle');
    await wait(PAUSE.LONG);

    // ========================================================================
    // SECCIÓN 10: WORKFLOW VISUAL
    // ========================================================================
    console.log('📈 [10/12] Grabando: Workflow Visual...');
    await page.goto(`${BASE_URL}/eventos-erp/workflow`);
    await page.waitForLoadState('networkidle');
    await wait(PAUSE.MEDIUM);

    // ========================================================================
    // SECCIÓN 11: CATÁLOGOS
    // ========================================================================
    console.log('📚 [11/12] Grabando: Catálogos...');
    await page.goto(`${BASE_URL}/eventos-erp/catalogos`);
    await page.waitForLoadState('networkidle');
    await wait(PAUSE.MEDIUM);

    // ========================================================================
    // SECCIÓN 12: INVENTARIO
    // ========================================================================
    console.log('🏭 [12/12] Grabando: Inventario...');
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

    // Esperar a que el video se guarde
    await wait(2000);

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
      console.log(`   Tamaño: ${(fs.statSync(newPath).size / 1024 / 1024).toFixed(2)} MB`);
    } else {
      console.log('\n⚠️ No se encontró archivo de video');
    }
  }
}

// Ejecutar
grabarDemo().catch(console.error);
