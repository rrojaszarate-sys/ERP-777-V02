/**
 * ============================================================================
 * DEMO EN VIDEO - Módulo de Eventos ERP
 * ============================================================================
 *
 * Suite de pruebas diseñada para generar un video de demostración
 * que muestre todas las funcionalidades del módulo de eventos.
 *
 * Para ejecutar y generar video:
 * npx cypress run --spec "cypress/e2e/demo-eventos-video.cy.ts"
 *
 * El video se guardará en: cypress/videos/
 */

describe('🎬 DEMO: Módulo de Eventos ERP - Funcionalidades Completas', () => {

  // Tiempo de pausa para visualización en video
  const PAUSE_SHORT = 800;
  const PAUSE_MEDIUM = 1500;
  const PAUSE_LONG = 2500;

  before(() => {
    cy.log('🎥 Iniciando grabación de demostración...');
  });

  // ============================================================================
  // INTRODUCCIÓN
  // ============================================================================
  it('📋 INTRO: Dashboard Principal del Sistema', () => {
    cy.visit('/');
    cy.wait(PAUSE_MEDIUM);

    // Esperar carga del dashboard
    cy.contains('Dashboard', { timeout: 15000 }).should('be.visible');
    cy.wait(PAUSE_LONG);

    // Mostrar métricas del dashboard
    cy.get('[class*="card"], [class*="stat"]').should('exist');
    cy.wait(PAUSE_MEDIUM);

    cy.log('✅ Dashboard cargado correctamente');
  });

  // ============================================================================
  // MÓDULO DE CLIENTES
  // ============================================================================
  it('👥 CLIENTES: Gestión de Catálogo de Clientes', () => {
    cy.visit('/eventos-erp/clientes');
    cy.wait(PAUSE_MEDIUM);

    // Esperar carga de clientes
    cy.contains('Cliente', { timeout: 15000 }).should('be.visible');
    cy.wait(PAUSE_SHORT);

    // Mostrar listado
    cy.get('table, [class*="table"]').should('exist');
    cy.wait(PAUSE_MEDIUM);

    // Buscar cliente
    cy.get('input[placeholder*="Buscar"]').first()
      .clear()
      .type('Phoenix', { delay: 100 });
    cy.wait(PAUSE_MEDIUM);

    // Limpiar búsqueda
    cy.get('input[placeholder*="Buscar"]').first().clear();
    cy.wait(PAUSE_SHORT);

    // Abrir modal de nuevo cliente
    cy.contains('button', /nuevo|crear|agregar/i).click();
    cy.wait(PAUSE_MEDIUM);

    // Mostrar formulario
    cy.get('[role="dialog"], [class*="modal"]').should('be.visible');
    cy.wait(PAUSE_LONG);

    // Cerrar modal
    cy.get('body').type('{esc}');
    cy.wait(PAUSE_SHORT);

    cy.log('✅ Módulo de Clientes demostrado');
  });

  // ============================================================================
  // LISTADO DE EVENTOS
  // ============================================================================
  it('📅 EVENTOS: Listado y Filtros de Eventos', () => {
    cy.visit('/eventos-erp');
    cy.wait(PAUSE_MEDIUM);

    // Esperar carga
    cy.contains('Evento', { timeout: 15000 }).should('be.visible');
    cy.wait(PAUSE_SHORT);

    // Mostrar tabla de eventos
    cy.get('table, [class*="table"], [class*="grid"]').should('exist');
    cy.wait(PAUSE_MEDIUM);

    // Buscar evento de prueba
    cy.get('input[placeholder*="Buscar"]').first()
      .clear()
      .type('TEST', { delay: 100 });
    cy.wait(PAUSE_MEDIUM);

    // Limpiar y mostrar todos
    cy.get('input[placeholder*="Buscar"]').first().clear();
    cy.wait(PAUSE_SHORT);

    cy.log('✅ Listado de Eventos demostrado');
  });

  // ============================================================================
  // DETALLE DE EVENTO - OVERVIEW
  // ============================================================================
  it('📊 EVENTO DETALLE: Vista General y Métricas', () => {
    cy.visit('/eventos-erp');
    cy.wait(PAUSE_SHORT);

    // Buscar evento de prueba
    cy.get('input[placeholder*="Buscar"]').first()
      .clear()
      .type('TEST01', { delay: 100 });
    cy.wait(PAUSE_MEDIUM);

    // Abrir primer evento
    cy.get('tbody tr, [class*="row"]').first().click();
    cy.wait(PAUSE_MEDIUM);

    // Verificar modal abierto
    cy.get('[role="dialog"], [class*="modal"]', { timeout: 10000 }).should('be.visible');
    cy.wait(PAUSE_LONG);

    // Mostrar métricas y gráficos
    cy.get('[class*="gauge"], [class*="chart"], svg').should('exist');
    cy.wait(PAUSE_LONG);

    cy.log('✅ Overview del Evento demostrado');
  });

  // ============================================================================
  // DETALLE DE EVENTO - TAB INGRESOS
  // ============================================================================
  it('💰 INGRESOS: Gestión de Ingresos del Evento', () => {
    cy.visit('/eventos-erp');
    cy.wait(PAUSE_SHORT);

    cy.get('input[placeholder*="Buscar"]').first().type('TEST01');
    cy.wait(PAUSE_SHORT);
    cy.get('tbody tr, [class*="row"]').first().click();
    cy.get('[role="dialog"]', { timeout: 10000 }).should('be.visible');
    cy.wait(PAUSE_SHORT);

    // Navegar a tab de Ingresos
    cy.contains(/ingreso/i).click();
    cy.wait(PAUSE_MEDIUM);

    // Mostrar listado de ingresos
    cy.wait(PAUSE_LONG);

    // Mostrar totales
    cy.get('[class*="total"], [class*="sum"]').should('exist');
    cy.wait(PAUSE_MEDIUM);

    // Intentar abrir modal de nuevo ingreso
    cy.get('body').then($body => {
      if ($body.find('button:contains("Agregar"), button:contains("+")').length > 0) {
        cy.contains('button', /agregar|\+/i).first().click();
        cy.wait(PAUSE_MEDIUM);
        cy.get('body').type('{esc}');
      }
    });
    cy.wait(PAUSE_SHORT);

    cy.log('✅ Tab de Ingresos demostrado');
  });

  // ============================================================================
  // DETALLE DE EVENTO - TAB GASTOS
  // ============================================================================
  it('💸 GASTOS: Gestión de Gastos por Categoría', () => {
    cy.visit('/eventos-erp');
    cy.wait(PAUSE_SHORT);

    cy.get('input[placeholder*="Buscar"]').first().type('TEST01');
    cy.wait(PAUSE_SHORT);
    cy.get('tbody tr, [class*="row"]').first().click();
    cy.get('[role="dialog"]', { timeout: 10000 }).should('be.visible');
    cy.wait(PAUSE_SHORT);

    // Navegar a tab de Gastos
    cy.contains(/gasto/i).click();
    cy.wait(PAUSE_MEDIUM);

    // Mostrar Tab "Todos"
    cy.contains(/todos/i).should('be.visible');
    cy.wait(PAUSE_MEDIUM);

    // Navegar por categorías
    // Combustible
    cy.contains(/combustible/i).click();
    cy.wait(PAUSE_MEDIUM);

    // Materiales
    cy.contains(/material/i).click();
    cy.wait(PAUSE_MEDIUM);

    // RH
    cy.contains(/rh|recursos/i).click();
    cy.wait(PAUSE_MEDIUM);

    // SPs
    cy.contains(/sp|solicitud/i).click();
    cy.wait(PAUSE_MEDIUM);

    // Volver a todos
    cy.contains(/todos/i).click();
    cy.wait(PAUSE_LONG);

    cy.log('✅ Tab de Gastos por Categoría demostrado');
  });

  // ============================================================================
  // DETALLE DE EVENTO - TAB PROVISIONES
  // ============================================================================
  it('📦 PROVISIONES: Gestión de Provisiones', () => {
    cy.visit('/eventos-erp');
    cy.wait(PAUSE_SHORT);

    cy.get('input[placeholder*="Buscar"]').first().type('TEST01');
    cy.wait(PAUSE_SHORT);
    cy.get('tbody tr, [class*="row"]').first().click();
    cy.get('[role="dialog"]', { timeout: 10000 }).should('be.visible');
    cy.wait(PAUSE_SHORT);

    // Navegar a tab de Provisiones
    cy.contains(/provis/i).click();
    cy.wait(PAUSE_MEDIUM);

    // Mostrar provisiones
    cy.wait(PAUSE_LONG);

    // Mostrar categorías si existen
    cy.get('body').then($body => {
      if ($body.find('button:contains("Combustible")').length > 0) {
        cy.contains(/combustible/i).click();
        cy.wait(PAUSE_SHORT);
        cy.contains(/material/i).click();
        cy.wait(PAUSE_SHORT);
        cy.contains(/todos/i).click();
      }
    });
    cy.wait(PAUSE_MEDIUM);

    cy.log('✅ Tab de Provisiones demostrado');
  });

  // ============================================================================
  // DETALLE DE EVENTO - TAB WORKFLOW
  // ============================================================================
  it('🔄 WORKFLOW: Flujo de Estados del Evento', () => {
    cy.visit('/eventos-erp');
    cy.wait(PAUSE_SHORT);

    cy.get('input[placeholder*="Buscar"]').first().type('TEST01');
    cy.wait(PAUSE_SHORT);
    cy.get('tbody tr, [class*="row"]').first().click();
    cy.get('[role="dialog"]', { timeout: 10000 }).should('be.visible');
    cy.wait(PAUSE_SHORT);

    // Navegar a tab de Workflow
    cy.contains(/workflow|estado|flujo/i).click();
    cy.wait(PAUSE_MEDIUM);

    // Mostrar estado actual
    cy.get('[class*="status"], [class*="badge"], [class*="state"]').should('exist');
    cy.wait(PAUSE_LONG);

    // Mostrar opciones de avance
    cy.get('button').should('have.length.at.least', 1);
    cy.wait(PAUSE_MEDIUM);

    cy.log('✅ Tab de Workflow demostrado');
  });

  // ============================================================================
  // PÁGINA DE WORKFLOW VISUAL
  // ============================================================================
  it('📈 WORKFLOW VISUAL: Diagrama de Estados', () => {
    cy.visit('/eventos-erp/workflow');
    cy.wait(PAUSE_MEDIUM);

    cy.contains(/workflow|flujo|estado/i, { timeout: 15000 }).should('be.visible');
    cy.wait(PAUSE_LONG);

    // Mostrar diagrama si existe
    cy.get('svg, [class*="diagram"], [class*="flow"]').should('exist');
    cy.wait(PAUSE_LONG);

    cy.log('✅ Workflow Visual demostrado');
  });

  // ============================================================================
  // ANÁLISIS FINANCIERO
  // ============================================================================
  it('📊 ANÁLISIS: Dashboard Financiero', () => {
    cy.visit('/eventos-erp/analisis-financiero');
    cy.wait(PAUSE_MEDIUM);

    cy.contains(/análisis|financiero/i, { timeout: 15000 }).should('be.visible');
    cy.wait(PAUSE_MEDIUM);

    // Mostrar gráficos
    cy.get('canvas, svg, [class*="chart"]').should('exist');
    cy.wait(PAUSE_LONG);

    // Mostrar métricas
    cy.get('[class*="card"], [class*="metric"]').should('exist');
    cy.wait(PAUSE_LONG);

    cy.log('✅ Análisis Financiero demostrado');
  });

  // ============================================================================
  // CATÁLOGOS
  // ============================================================================
  it('📚 CATÁLOGOS: Configuración del Módulo', () => {
    cy.visit('/eventos-erp/catalogos');
    cy.wait(PAUSE_MEDIUM);

    cy.contains(/catálogo|configuración/i, { timeout: 15000 }).should('be.visible');
    cy.wait(PAUSE_LONG);

    // Mostrar tabs de catálogos si existen
    cy.get('[class*="tab"], button').should('have.length.at.least', 1);
    cy.wait(PAUSE_MEDIUM);

    cy.log('✅ Catálogos demostrados');
  });

  // ============================================================================
  // INTEGRACIÓN CON INVENTARIO
  // ============================================================================
  it('🏭 INVENTARIO: Integración con Almacén', () => {
    cy.visit('/inventario');
    cy.wait(PAUSE_MEDIUM);

    cy.contains(/inventario|almacén|stock/i, { timeout: 15000 }).should('be.visible');
    cy.wait(PAUSE_MEDIUM);

    // Dashboard de inventario
    cy.get('[class*="card"], [class*="stat"]').should('exist');
    cy.wait(PAUSE_LONG);

    // Navegar a productos
    cy.visit('/inventario/productos');
    cy.wait(PAUSE_MEDIUM);

    cy.get('table, [class*="table"]').should('exist');
    cy.wait(PAUSE_LONG);

    cy.log('✅ Integración con Inventario demostrada');
  });

  // ============================================================================
  // MATERIAL DESDE EVENTO
  // ============================================================================
  it('📦 MATERIALES: Integración Evento-Almacén', () => {
    cy.visit('/eventos-erp');
    cy.wait(PAUSE_SHORT);

    cy.get('input[placeholder*="Buscar"]').first().type('TEST01');
    cy.wait(PAUSE_SHORT);
    cy.get('tbody tr, [class*="row"]').first().click();
    cy.get('[role="dialog"]', { timeout: 10000 }).should('be.visible');
    cy.wait(PAUSE_SHORT);

    // Ir a gastos > materiales
    cy.contains(/gasto/i).click();
    cy.wait(PAUSE_SHORT);
    cy.contains(/material/i).click();
    cy.wait(PAUSE_MEDIUM);

    // Buscar opciones de almacén
    cy.get('body').then($body => {
      if ($body.find('button:contains("Almacén"), button:contains("Ingreso Material")').length > 0) {
        cy.contains('button', /almacén|ingreso material/i).first().click();
        cy.wait(PAUSE_MEDIUM);
        cy.get('body').type('{esc}');
      }
    });
    cy.wait(PAUSE_SHORT);

    cy.log('✅ Integración Material-Almacén demostrada');
  });

  // ============================================================================
  // CIERRE / RESUMEN
  // ============================================================================
  it('🎬 FIN: Resumen del Módulo de Eventos', () => {
    cy.visit('/eventos-erp');
    cy.wait(PAUSE_MEDIUM);

    // Mostrar listado final
    cy.contains('Evento', { timeout: 15000 }).should('be.visible');
    cy.wait(PAUSE_LONG);

    // Buscar evento de prueba como cierre
    cy.get('input[placeholder*="Buscar"]').first()
      .clear()
      .type('Convención', { delay: 100 });
    cy.wait(PAUSE_LONG);

    cy.log('🎬 ¡Demostración completada exitosamente!');
    cy.log('📹 Video guardado en cypress/videos/');
  });
});
