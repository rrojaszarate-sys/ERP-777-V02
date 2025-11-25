// ***********************************************************
// Comandos personalizados para todos los módulos ERP
// ***********************************************************

// ============================================================
// AUTENTICACIÓN
// ============================================================
Cypress.Commands.add('loginAsAdmin', () => {
  cy.session('admin', () => {
    cy.visit('/login');
    cy.get('input[type="email"]').type(Cypress.env('testUserEmail'));
    cy.get('input[type="password"]').type(Cypress.env('testUserPassword'));
    cy.get('button[type="submit"]').click();
    cy.url().should('not.include', '/login');
  });
});

// ============================================================
// NAVEGACIÓN
// ============================================================
Cypress.Commands.add('navigateToModule', (moduleName) => {
  const moduleRoutes = {
    'eventos': '/eventos-erp',
    'contabilidad': '/contabilidad-erp',
    'facturacion': '/facturacion-erp',
    'inventario': '/inventario-erp',
    'proveedores': '/proveedores-erp',
    'proyectos': '/proyectos-erp',
    'rrhh': '/rrhh-erp',
    'tesoreria': '/tesoreria-erp',
    'reportes': '/reportes-erp',
    'crm': '/cotizaciones-erp',
    'ia': '/ia-erp',
    'integraciones': '/integraciones-erp'
  };

  const route = moduleRoutes[moduleName.toLowerCase()];
  if (route) {
    cy.visit(route);
    cy.waitForPageLoad();
  } else {
    throw new Error(`Módulo desconocido: ${moduleName}`);
  }
});

// ============================================================
// ESPERAS Y CARGA
// ============================================================
Cypress.Commands.add('waitForPageLoad', () => {
  cy.get('body').should('be.visible');
  cy.wait(500); // Espera mínima para queries de Supabase
});

Cypress.Commands.add('waitForTableData', () => {
  cy.get('table tbody tr', { timeout: 10000 }).should('have.length.at.least', 0);
});

Cypress.Commands.add('waitForModalClose', () => {
  cy.get('[role="dialog"]', { timeout: 5000 }).should('not.exist');
});

// ============================================================
// FORMULARIOS
// ============================================================
Cypress.Commands.add('fillForm', (formData) => {
  Object.entries(formData).forEach(([fieldName, value]) => {
    cy.get(`[name="${fieldName}"], [data-testid="${fieldName}"]`)
      .clear()
      .type(value);
  });
});

Cypress.Commands.add('submitForm', () => {
  cy.get('button[type="submit"]').click();
});

Cypress.Commands.add('selectFromDropdown', (fieldName, optionText) => {
  cy.get(`[name="${fieldName}"], [data-testid="${fieldName}"]`).click();
  cy.contains(optionText).click();
});

// ============================================================
// TABLAS Y DATOS
// ============================================================
Cypress.Commands.add('getTableRowCount', () => {
  return cy.get('table tbody tr').its('length');
});

Cypress.Commands.add('clickTableAction', (rowIndex, actionName) => {
  cy.get('table tbody tr').eq(rowIndex).within(() => {
    cy.contains(actionName).click();
  });
});

Cypress.Commands.add('searchInTable', (searchTerm) => {
  cy.get('input[placeholder*="Buscar"], input[type="search"]')
    .clear()
    .type(searchTerm);
  cy.wait(500); // Espera debounce
});

// ============================================================
// MODALES
// ============================================================
Cypress.Commands.add('openModal', (buttonText) => {
  cy.contains('button', buttonText).click();
  cy.get('[role="dialog"]').should('be.visible');
});

Cypress.Commands.add('closeModal', () => {
  cy.get('[role="dialog"] button[aria-label="Close"]').click();
  cy.waitForModalClose();
});

Cypress.Commands.add('confirmModal', () => {
  cy.get('[role="dialog"]').within(() => {
    cy.contains('button', /confirmar|aceptar|guardar/i).click();
  });
});

// ============================================================
// NOTIFICACIONES
// ============================================================
Cypress.Commands.add('expectSuccessToast', (message) => {
  cy.get('.Toastify__toast--success, [class*="toast-success"]', { timeout: 5000 })
    .should('be.visible');
  if (message) {
    cy.contains(message).should('be.visible');
  }
});

Cypress.Commands.add('expectErrorToast', (message) => {
  cy.get('.Toastify__toast--error, [class*="toast-error"]', { timeout: 5000 })
    .should('be.visible');
  if (message) {
    cy.contains(message).should('be.visible');
  }
});

// ============================================================
// VALIDACIONES DE DATOS
// ============================================================
Cypress.Commands.add('validateRequiredFields', (fields) => {
  cy.submitForm();
  fields.forEach(field => {
    cy.get(`[name="${field}"]`).then($el => {
      expect($el[0].validity.valid).to.be.false;
    });
  });
});

Cypress.Commands.add('validateNumericField', (fieldName, minValue, maxValue) => {
  const testValues = [
    { value: minValue - 1, shouldFail: true },
    { value: minValue, shouldFail: false },
    { value: maxValue, shouldFail: false },
    { value: maxValue + 1, shouldFail: true }
  ];

  testValues.forEach(({ value, shouldFail }) => {
    cy.get(`[name="${fieldName}"]`).clear().type(value.toString());
    if (shouldFail) {
      cy.get(`[name="${fieldName}"]`).should('have.class', 'invalid');
    }
  });
});

// ============================================================
// REPORTES Y MÉTRICAS
// ============================================================
Cypress.Commands.add('captureDashboardMetrics', () => {
  return cy.get('[data-testid="dashboard-metrics"]').then($el => {
    return {
      html: $el.html(),
      text: $el.text()
    };
  });
});

Cypress.Commands.add('verifyChartExists', (chartId) => {
  cy.get(`[data-testid="${chartId}"], canvas, svg`).should('be.visible');
});

// ============================================================
// EXPORTACIÓN
// ============================================================
Cypress.Commands.add('exportData', (format = 'excel') => {
  cy.contains('button', /exportar/i).click();
  if (format === 'excel') {
    cy.contains('Excel').click();
  } else if (format === 'pdf') {
    cy.contains('PDF').click();
  }
});

// ============================================================
// DATOS DE PRUEBA
// ============================================================
Cypress.Commands.add('createTestData', (module, data) => {
  cy.request({
    method: 'POST',
    url: `/api/${module}`,
    body: data,
    headers: {
      'Authorization': `Bearer ${Cypress.env('apiToken')}`
    }
  });
});

Cypress.Commands.add('cleanupTestData', (module, id) => {
  cy.request({
    method: 'DELETE',
    url: `/api/${module}/${id}`,
    headers: {
      'Authorization': `Bearer ${Cypress.env('apiToken')}`
    }
  });
});
