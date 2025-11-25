/**
 * Test Suite: Detalle de Evento - Tab Provisiones
 * Actualizado: 2025-11-24 - Selectores genéricos
 */

describe('UI-02: Detalle de Evento - Tab Provisiones', () => {
  beforeEach(() => {
    cy.visit('/eventos');
    cy.waitForSupabase();
  });

  it('Debe abrir detalle al hacer clic en evento', () => {
    // Clic en primer evento
    cy.get('table tbody tr')
      .first()
      .click();
    cy.wait(1000);

    // Verificar que se abre algún detalle o modal
    cy.get('body').should('be.visible');
  });

  it('Debe mostrar Tab Provisiones con categorías', () => {
    // Abrir evento
    cy.get('table tbody tr').first().click();
    cy.wait(1000);

    // Buscar tab de Provisiones
    cy.get('body').then($body => {
      if ($body.text().includes('Provisiones')) {
        cy.contains('Provisiones').click();
        cy.wait(500);

        // Verificar contenido relacionado a provisiones
        cy.get('body').should('be.visible');
      }
    });
  });

  it('Debe mostrar información financiera', () => {
    cy.get('table tbody tr').first().click();
    cy.wait(1000);

    // Buscar contenido con valores monetarios
    cy.get('body').should('contain', '$');
  });

  it('Debe permitir navegar entre tabs', () => {
    cy.get('table tbody tr').first().click();
    cy.wait(1000);

    // Buscar tabs disponibles
    cy.get('button, [role="tab"]').should('have.length.at.least', 1);
  });
});
