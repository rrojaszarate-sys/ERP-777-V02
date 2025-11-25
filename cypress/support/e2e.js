// ***********************************************************
// This support file is processed and loaded automatically before test files.
//
// You can read more here:
// https://on.cypress.io/configuration
// ***********************************************************

import 'cypress-mochawesome-reporter/register';
import './commands-erp';

// Custom commands for ERP Eventos
Cypress.Commands.add('login', (email = Cypress.env('testUserEmail'), password = Cypress.env('testUserPassword')) => {
  cy.visit('/login');
  cy.get('input[type="email"]').type(email);
  cy.get('input[type="password"]').type(password);
  cy.get('button[type="submit"]').click();
  cy.url().should('not.include', '/login');
});

Cypress.Commands.add('navigateToEventos', () => {
  cy.visit('/');
  cy.contains('Eventos').click();
  cy.url().should('include', '/eventos');
});

Cypress.Commands.add('openEventoDetail', (claveEvento) => {
  cy.contains(claveEvento).click();
  cy.get('[data-testid="evento-detail-modal"]').should('be.visible');
});

Cypress.Commands.add('waitForSupabase', () => {
  cy.wait(1000); // Wait for Supabase queries to complete
});

// Global error handling
Cypress.on('uncaught:exception', (err, runnable) => {
  // Ignore specific errors that don't affect tests
  if (err.message.includes('ResizeObserver')) {
    return false;
  }
  return true;
});

// Add screenshot on test failure
afterEach(function() {
  if (this.currentTest.state === 'failed') {
    const testName = this.currentTest.title.replace(/\s+/g, '_');
    cy.screenshot(`FAIL_${testName}`, { capture: 'fullPage' });
  }
});
