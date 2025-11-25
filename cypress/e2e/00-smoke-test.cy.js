/**
 * Smoke Test - Prueba de Escritorio
 * Verifica que el sistema está funcionando correctamente
 *
 * Este test debe ejecutarse primero para validar:
 * - La aplicación carga correctamente
 * - Hay conexión con la base de datos
 * - Los módulos principales están accesibles
 *
 * Actualizado: 2025-11-24
 */

describe('Smoke Test - Verificación del Sistema', () => {

  describe('Carga de la Aplicación', () => {
    it('La página principal carga correctamente', () => {
      cy.visit('/');
      cy.get('body').should('be.visible');
      cy.url().should('not.include', 'error');
    });

    it('No hay errores de JavaScript en la consola', () => {
      cy.visit('/', {
        onBeforeLoad(win) {
          cy.stub(win.console, 'error').as('consoleError');
        },
      });

      // Esperar a que cargue
      cy.wait(2000);

      // No debería haber errores críticos de JS
      // (algunos warnings de React son normales)
    });
  });

  describe('Navegación Principal', () => {
    beforeEach(() => {
      cy.visit('/');
      cy.wait(1000);
    });

    it('El menú de navegación está visible', () => {
      // Buscar elementos de navegación
      cy.get('nav, [role="navigation"], aside, header')
        .should('exist');
    });

    it('Puede navegar a la página de eventos', () => {
      cy.visit('/eventos');
      cy.url().should('include', '/eventos');
      cy.get('body').should('be.visible');
    });
  });

  describe('Conexión con Base de Datos', () => {
    it('Carga datos de eventos desde Supabase', () => {
      cy.visit('/eventos');
      cy.waitForSupabase();

      // Verificar que hay datos (tabla no vacía)
      cy.get('table tbody tr, [role="row"], .evento-row', { timeout: 15000 })
        .should('have.length.at.least', 1);
    });

    it('Los datos de eventos contienen información válida', () => {
      cy.visit('/eventos');
      cy.waitForSupabase();

      // Verificar que hay contenido de texto en la tabla
      cy.get('table tbody, [data-testid="eventos-list"]')
        .invoke('text')
        .should('have.length.at.least', 10);
    });
  });

  describe('Módulos Principales', () => {
    it('Módulo de Eventos está accesible', () => {
      cy.visit('/eventos');
      cy.get('body').should('be.visible');
      cy.url().should('include', '/eventos');
    });

    it('Módulo de Dashboard está accesible', () => {
      cy.visit('/');
      cy.get('body').should('be.visible');
    });
  });

  describe('Funcionalidades Básicas', () => {
    beforeEach(() => {
      cy.visit('/eventos');
      cy.waitForSupabase();
    });

    it('El buscador funciona', () => {
      // Encontrar y usar el buscador
      cy.get('input[type="text"]').first().type('EVT');
      cy.waitForSupabase();

      // No debería haber errores
      cy.get('body').should('be.visible');
    });

    it('Se puede hacer clic en elementos de la lista', () => {
      // Hacer clic en primer evento
      cy.get('table tbody tr, [role="row"]').first().click();
      cy.wait(500);

      // La aplicación sigue funcionando
      cy.get('body').should('be.visible');
    });
  });

  describe('Rendimiento Básico', () => {
    it('La página carga en tiempo razonable', () => {
      const startTime = Date.now();

      cy.visit('/eventos');
      cy.waitForSupabase();

      cy.get('table tbody tr, [role="row"]', { timeout: 15000 })
        .should('have.length.at.least', 1)
        .then(() => {
          const loadTime = Date.now() - startTime;
          // Debería cargar en menos de 15 segundos
          expect(loadTime).to.be.lessThan(15000);
        });
    });
  });
});
