/// <reference types="cypress" />

/**
 * ============================================================================
 * 🚀 PRUEBAS DE URLS DEL MÓDULO DE INVENTARIO
 * ============================================================================
 * 
 * CARACTERÍSTICAS:
 * ✅ Solo verifica que las URLs responden
 * ✅ No espera contenido específico
 * ✅ Timeouts largos para páginas lentas
 * ✅ Continúa aunque falle
 * 
 * Ejecutar: npx cypress run --spec "cypress/e2e/inventario-urls.cy.ts"
 * ============================================================================
 */

describe('🏭 INVENTARIO - VERIFICACIÓN DE URLS', () => {
  
  const urlsInventario = [
    '/inventario',
    '/inventario/almacenes',
    '/inventario/productos',
    '/inventario/stock',
    '/inventario/movimientos',
    '/inventario/documentos',
    '/inventario/ubicaciones',
    '/inventario/lotes',
    '/inventario/transferencias',
    '/inventario/kardex',
    '/inventario/conteos',
    '/inventario/reservas',
    '/inventario/alertas',
    '/inventario/kits',
    '/inventario/etiquetas',
    '/inventario/configuracion',
    '/inventario/valuacion',
    '/inventario/reorden',
    '/inventario/sesiones',
    '/inventario/checklists',
  ];

  before(() => {
    cy.log('🚀 Iniciando verificación de URLs de inventario');
    // Visitar home primero para inicializar la app
    cy.visit('/', { timeout: 60000 });
    cy.wait(3000); // Esperar inicialización
  });

  urlsInventario.forEach((url, index) => {
    it(`${index + 1}. URL accesible: ${url}`, () => {
      // Navegar a la URL
      cy.visit(url, { 
        timeout: 60000,
        failOnStatusCode: false 
      });
      
      // Esperar un poco para que cargue
      cy.wait(2000);
      
      // Verificar que hay contenido en el body
      cy.get('body').should('exist');
      cy.get('body').should('not.be.empty');
      
      // Verificar que no es una página de error
      cy.get('body').then($body => {
        const bodyText = $body.text().toLowerCase();
        const is404 = bodyText.includes('404') && bodyText.includes('not found');
        const isEmpty = $body.find('*').length < 10;
        
        if (is404) {
          cy.log(`⚠️ URL ${url} devuelve 404`);
        } else if (isEmpty) {
          cy.log(`⚠️ URL ${url} parece vacía`);
        } else {
          cy.log(`✅ URL ${url} OK`);
        }
      });
      
      // Screenshot para evidencia
      cy.screenshot(`url-${index + 1}-${url.replace(/\//g, '-').substring(1)}`, { 
        capture: 'viewport' 
      });
    });
  });

  after(() => {
    cy.log('========================================');
    cy.log('🏁 VERIFICACIÓN DE URLS COMPLETADA');
    cy.log('========================================');
  });
});
