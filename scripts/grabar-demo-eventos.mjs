/**
 * Script de Grabación MEJORADO - Demo ERP Completo
 *
 * PAUSAS LARGAS para visualización clara
 * Selectores robustos para tabs del modal
 *
 * Ejecutar: node scripts/grabar-demo-eventos.mjs
 */

import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE_URL = 'http://localhost:5173';
const VIDEO_DIR = path.join(path.dirname(__dirname), 'videos');

// PAUSAS MÁS LARGAS para que se vea todo claramente
const PAUSE = {
  QUICK: 500,
  SHORT: 1500,
  MEDIUM: 2500,
  LONG: 4000,
  EXTRA: 5000,
  SCENE: 6000,
  FORM: 800
};

async function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function scrollPage(page, amount = 300) {
  await page.evaluate((y) => window.scrollBy(0, y), amount);
  await wait(PAUSE.SHORT);
}

async function scrollModal(page, amount = 250) {
  // Buscar el contenedor scrolleable del modal
  const scrollable = page.locator('[class*="overflow-y-auto"], [class*="overflow-auto"], .modal-body').first();
  if (await scrollable.isVisible({ timeout: 1000 }).catch(() => false)) {
    await scrollable.evaluate((el, y) => el.scrollTop += y, amount);
    await wait(PAUSE.SHORT);
    return true;
  }
  return false;
}

function logSection(num, title) {
  console.log('');
  console.log('═'.repeat(60));
  console.log(`🎬 ESCENA ${num}: ${title}`);
  console.log('═'.repeat(60));
}

function logStep(msg) {
  console.log(`   ✓ ${msg}`);
}

async function clickTab(page, tabName) {
  // Buscar tabs por texto exacto - usar getByRole o getByText
  try {
    // Método 1: Buscar botón con texto exacto usando getByRole
    const tabButton = page.getByRole('button', { name: tabName, exact: false });
    if (await tabButton.first().isVisible({ timeout: 1500 })) {
      await tabButton.first().click();
      logStep(`Tab "${tabName}" seleccionado`);
      await wait(PAUSE.LONG);
      return true;
    }
  } catch (e) {}

  try {
    // Método 2: Buscar por texto que contenga el nombre del tab
    const byText = page.locator(`button:has-text("${tabName}")`);
    const count = await byText.count();
    // Si hay múltiples, tomar el que esté dentro de una nav (modal)
    for (let i = 0; i < count; i++) {
      const btn = byText.nth(i);
      if (await btn.isVisible({ timeout: 500 })) {
        await btn.click();
        logStep(`Tab "${tabName}" seleccionado`);
        await wait(PAUSE.LONG);
        return true;
      }
    }
  } catch (e) {}

  console.log(`   ⚠ Tab "${tabName}" no encontrado`);
  return false;
}

async function grabarDemoMejorado() {
  console.log('');
  console.log('╔════════════════════════════════════════════════════════════════════╗');
  console.log('║  🎬 DEMO ERP MEJORADO - PAUSAS LARGAS PARA VISUALIZACIÓN          ║');
  console.log('╚════════════════════════════════════════════════════════════════════╝');
  console.log('');

  if (!fs.existsSync(VIDEO_DIR)) {
    fs.mkdirSync(VIDEO_DIR, { recursive: true });
  }

  const browser = await chromium.launch({
    headless: true,
    slowMo: 80  // Más lento
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
    // ══════════════════════════════════════════════════════════════════════════
    // PARTE 1: INICIO Y NAVEGACIÓN GENERAL
    // ══════════════════════════════════════════════════════════════════════════

    logSection('1', 'Dashboard Principal');
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
    logStep('Cargando sistema ERP...');
    await wait(PAUSE.SCENE);

    // ══════════════════════════════════════════════════════════════════════════
    logSection('2', 'Módulo de Eventos - Dashboard');
    await page.goto(`${BASE_URL}/eventos-erp`);
    await page.waitForLoadState('networkidle');
    logStep('Dashboard de eventos');
    await wait(PAUSE.EXTRA);

    await scrollPage(page, 300);
    logStep('Métricas y estadísticas');
    await wait(PAUSE.LONG);
    await scrollPage(page, -300);
    await wait(PAUSE.SHORT);

    // ══════════════════════════════════════════════════════════════════════════
    logSection('3', 'Gestión de Clientes');
    await page.goto(`${BASE_URL}/eventos-erp/clientes`);
    await page.waitForLoadState('networkidle');
    logStep('Catálogo de clientes');
    await wait(PAUSE.EXTRA);

    // Scroll para ver todos los clientes
    await scrollPage(page, 200);
    await wait(PAUSE.LONG);

    // ══════════════════════════════════════════════════════════════════════════
    logSection('4', 'Listado de Eventos');
    await page.goto(`${BASE_URL}/eventos-erp`);
    await page.waitForLoadState('networkidle');
    await wait(PAUSE.LONG);

    // Buscar evento
    const searchInput = page.locator('input[type="text"]').first();
    if (await searchInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await searchInput.click();
      await wait(PAUSE.SHORT);
      await searchInput.pressSequentially('TEST', { delay: 150 });
      logStep('Buscando evento de prueba...');
      await wait(PAUSE.LONG);
    }

    // ══════════════════════════════════════════════════════════════════════════
    logSection('5', 'DETALLE DE EVENTO - Vista Completa');

    // Abrir evento haciendo click en el botón de ver (icono ojo) en ACCIONES
    // Los iconos están en la última columna (ACCIONES) - buscar el icono de ojo
    // El primer botón en td:last-child debería ser el de ver (👁)

    let modalOpened = false;

    // Buscar fila del evento TEST01 y su botón de acciones
    const testRow = page.locator('tbody tr:has-text("TEST01")');
    if (await testRow.isVisible({ timeout: 2000 }).catch(() => false)) {
      // El icono de ojo es el primer botón en la celda de acciones
      const viewBtn = testRow.locator('td:last-child button').first();
      if (await viewBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
        await viewBtn.click();
        logStep('Click en botón de acciones...');
        await wait(PAUSE.SCENE);
        modalOpened = true;
      }
    }

    // Si no funcionó, intentar con la primera fila visible
    if (!modalOpened) {
      const firstRowView = page.locator('tbody tr').first().locator('td:last-child button').first();
      if (await firstRowView.isVisible({ timeout: 2000 }).catch(() => false)) {
        await firstRowView.click();
        logStep('Abriendo detalle del evento...');
        await wait(PAUSE.SCENE);
        modalOpened = true;
      }
    }

    if (modalOpened) {
      await wait(PAUSE.SCENE);

      // ════════════════════════════════════════════════════════════════════════
      logSection('5.1', 'Tab OVERVIEW - Resumen del Evento');
      logStep('Vista general con métricas gauge');
      await wait(PAUSE.EXTRA);

      // Scroll en modal para ver más
      await scrollModal(page, 300);
      logStep('Información financiera completa');
      await wait(PAUSE.LONG);
      await scrollModal(page, -300);
      await wait(PAUSE.SHORT);

      // Esperar a que el modal cargue completamente
      await wait(PAUSE.SHORT);

      // ════════════════════════════════════════════════════════════════════════
      logSection('5.2', 'Tab INGRESOS');
      if (await clickTab(page, 'Ingresos')) {
        logStep('Listado de ingresos del evento');
        await wait(PAUSE.EXTRA);
        await scrollModal(page, 150);
        await wait(PAUSE.LONG);
      }

      // ════════════════════════════════════════════════════════════════════════
      logSection('5.3', 'Tab GASTOS');
      if (await clickTab(page, 'Gastos')) {
        logStep('Vista de gastos por categoría');
        await wait(PAUSE.EXTRA);
        await scrollModal(page, 150);
        await wait(PAUSE.LONG);
      }

      // ════════════════════════════════════════════════════════════════════════
      logSection('5.4', 'Tab PROVISIONES');
      if (await clickTab(page, 'Provisiones')) {
        logStep('Provisiones del evento');
        await wait(PAUSE.EXTRA);
        await scrollModal(page, 150);
        await wait(PAUSE.LONG);
      }

      // ════════════════════════════════════════════════════════════════════════
      logSection('5.5', 'Tab WORKFLOW');
      if (await clickTab(page, 'Workflow')) {
        logStep('Control de estados del evento');
        await wait(PAUSE.EXTRA);
      }

      // Cerrar modal
      logStep('Cerrando detalle...');
      await page.keyboard.press('Escape');
      await wait(PAUSE.MEDIUM);
    }

    // ══════════════════════════════════════════════════════════════════════════
    logSection('6', 'Workflow Visual');
    await page.goto(`${BASE_URL}/eventos-erp/workflow`);
    await page.waitForLoadState('networkidle');
    logStep('Diagrama de estados');
    await wait(PAUSE.SCENE);
    await scrollPage(page, 200);
    await wait(PAUSE.LONG);

    // ══════════════════════════════════════════════════════════════════════════
    logSection('7', 'Análisis Financiero');
    await page.goto(`${BASE_URL}/eventos-erp/analisis-financiero`);
    await page.waitForLoadState('networkidle');
    logStep('Dashboard financiero');
    await wait(PAUSE.EXTRA);

    await scrollPage(page, 300);
    logStep('Gráficos de rentabilidad');
    await wait(PAUSE.LONG);

    await scrollPage(page, 300);
    logStep('Tabla comparativa');
    await wait(PAUSE.LONG);

    // ══════════════════════════════════════════════════════════════════════════
    logSection('8', 'Catálogos');
    await page.goto(`${BASE_URL}/eventos-erp/catalogos`);
    await page.waitForLoadState('networkidle');
    logStep('Configuración y catálogos');
    await wait(PAUSE.EXTRA);

    // ══════════════════════════════════════════════════════════════════════════
    // PARTE 2: ALMACÉN / INVENTARIO
    // ══════════════════════════════════════════════════════════════════════════

    logSection('9', 'ALMACÉN - Dashboard');
    await page.goto(`${BASE_URL}/inventario`);
    await page.waitForLoadState('networkidle');
    logStep('Dashboard de inventario');
    await wait(PAUSE.SCENE);

    await scrollPage(page, 250);
    logStep('Métricas y alertas de stock');
    await wait(PAUSE.LONG);

    // ══════════════════════════════════════════════════════════════════════════
    logSection('10', 'ALMACÉN - Productos');
    await page.goto(`${BASE_URL}/inventario/productos`);
    await page.waitForLoadState('networkidle');
    logStep('Catálogo de productos');
    await wait(PAUSE.EXTRA);

    // Buscar producto
    const searchProd = page.locator('input[type="text"]').first();
    if (await searchProd.isVisible({ timeout: 2000 }).catch(() => false)) {
      await searchProd.click();
      await searchProd.pressSequentially('Cable', { delay: 120 });
      logStep('Búsqueda de productos');
      await wait(PAUSE.LONG);
      await searchProd.fill('');
    }

    // Crear producto
    const newProdBtn = page.locator('button:has-text("Nuevo"), button:has-text("Crear")').first();
    if (await newProdBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
      await newProdBtn.click();
      logStep('Formulario de nuevo producto');
      await wait(PAUSE.EXTRA);
      await page.keyboard.press('Escape');
      await wait(PAUSE.SHORT);
    }

    // ══════════════════════════════════════════════════════════════════════════
    logSection('11', 'ALMACÉN - Movimientos');
    await page.goto(`${BASE_URL}/inventario/movimientos`);
    await page.waitForLoadState('networkidle');
    logStep('Historial de movimientos');
    await wait(PAUSE.EXTRA);

    await scrollPage(page, 200);
    logStep('Entradas y salidas');
    await wait(PAUSE.LONG);

    // ══════════════════════════════════════════════════════════════════════════
    logSection('12', 'ALMACÉN - Categorías');
    await page.goto(`${BASE_URL}/inventario/categorias`);
    await page.waitForLoadState('networkidle');
    logStep('Categorías de productos');
    await wait(PAUSE.EXTRA);

    // ══════════════════════════════════════════════════════════════════════════
    logSection('13', 'ALMACÉN - Ubicaciones');
    await page.goto(`${BASE_URL}/inventario/almacenes`);
    await page.waitForLoadState('networkidle');
    logStep('Configuración de almacenes');
    await wait(PAUSE.EXTRA);

    // ══════════════════════════════════════════════════════════════════════════
    // PARTE 3: CONTABILIDAD
    // ══════════════════════════════════════════════════════════════════════════

    logSection('14', 'CONTABILIDAD - Gastos Externos');
    await page.goto(`${BASE_URL}/contabilidad/gastos-externos`);
    await page.waitForLoadState('networkidle');
    logStep('Módulo de gastos externos');
    await wait(PAUSE.EXTRA);

    await scrollPage(page, 250);
    logStep('Listado de gastos');
    await wait(PAUSE.LONG);

    // ══════════════════════════════════════════════════════════════════════════
    logSection('15', 'CONTABILIDAD - Gastos No Impactados');
    await page.goto(`${BASE_URL}/contabilidad/gastos-no-impactados`);
    await page.waitForLoadState('networkidle');
    logStep('Gastos pendientes de impactar');
    await wait(PAUSE.EXTRA);

    await scrollPage(page, 200);
    logStep('Selección para asignar a evento');
    await wait(PAUSE.LONG);

    // ══════════════════════════════════════════════════════════════════════════
    logSection('16', 'CONTABILIDAD - Carga XML');
    await page.goto(`${BASE_URL}/contabilidad/cargar-xml`);
    await page.waitForLoadState('networkidle');
    logStep('Carga de facturas CFDI');
    await wait(PAUSE.EXTRA);

    // ══════════════════════════════════════════════════════════════════════════
    // CIERRE
    // ══════════════════════════════════════════════════════════════════════════

    logSection('17', 'CIERRE - Dashboard Final');
    await page.goto(`${BASE_URL}/eventos-erp`);
    await page.waitForLoadState('networkidle');
    logStep('Regreso al módulo de eventos');
    await wait(PAUSE.SCENE);

    console.log('');
    console.log('╔════════════════════════════════════════════════════════════════════╗');
    console.log('║  ✅ GRABACIÓN COMPLETADA EXITOSAMENTE                             ║');
    console.log('╠════════════════════════════════════════════════════════════════════╣');
    console.log('║  📅 Eventos: Dashboard, Clientes, Detalle completo                ║');
    console.log('║     - Tabs: Overview, Ingresos, Gastos, Provisiones, Workflow     ║');
    console.log('║     - Workflow Visual, Análisis Financiero, Catálogos             ║');
    console.log('║  📦 Almacén: Dashboard, Productos, Movimientos, Categorías        ║');
    console.log('║  💰 Contabilidad: Gastos Externos, No Impactados, XML             ║');
    console.log('╚════════════════════════════════════════════════════════════════════╝');

  } catch (error) {
    console.error('');
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await context.close();
    await browser.close();

    await wait(3000);

    // Renombrar video
    const files = fs.readdirSync(VIDEO_DIR);
    const videoFile = files.find(f => f.endsWith('.webm') && !f.startsWith('demo-'));

    if (videoFile) {
      const oldPath = path.join(VIDEO_DIR, videoFile);
      const newPath = path.join(VIDEO_DIR, 'demo-erp-completo.webm');

      if (fs.existsSync(newPath)) {
        fs.unlinkSync(newPath);
      }
      fs.renameSync(oldPath, newPath);

      const stats = fs.statSync(newPath);
      const sizeMB = (stats.size / 1024 / 1024).toFixed(2);

      console.log('');
      console.log('╔════════════════════════════════════════════════════════════════════╗');
      console.log('║  📹 VIDEO GUARDADO                                                 ║');
      console.log('╠════════════════════════════════════════════════════════════════════╣');
      console.log(`║  📁 Archivo: videos/demo-erp-completo.webm                         ║`);
      console.log(`║  📊 Tamaño: ${sizeMB.padEnd(6)} MB                                          ║`);
      console.log('║                                                                    ║');
      console.log('║  Para reproducir desde WSL:                                        ║');
      console.log('║  $ explorer.exe videos/demo-erp-completo.webm                      ║');
      console.log('╚════════════════════════════════════════════════════════════════════╝');
    }
  }
}

grabarDemoMejorado().catch(console.error);
