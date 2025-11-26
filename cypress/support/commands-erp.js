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
    'eventos': '/eventos',
    'contabilidad': '/contabilidad',
    'facturacion': '/facturacion',
    'inventario': '/inventario',
    'proveedores': '/proveedores',
    'proyectos': '/proyectos',
    'rrhh': '/rrhh',
    'tesoreria': '/tesoreria',
    'reportes': '/reportes',
    'crm': '/crm',
    'ia': '/ia',
    'integraciones': '/integraciones'
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

// ============================================================
// EVENTOS-ERP ESPECÍFICOS
// ============================================================

Cypress.Commands.add('navigateToEventosERP', (submodule = '') => {
  const routes = {
    '': '/eventos-erp',
    'panel': '/eventos-erp',
    'eventos': '/eventos-erp/eventos',
    'clientes': '/eventos-erp/clientes',
    'proyectos': '/eventos-erp/proyectos',
    'analisis': '/eventos-erp/analisis-financiero',
    'workflow': '/eventos-erp/workflow',
    'catalogos': '/eventos-erp/catalogos'
  };

  const route = routes[submodule.toLowerCase()] || `/eventos-erp/${submodule}`;
  cy.visit(route);
  cy.waitForPageLoad();
});

Cypress.Commands.add('createClienteERP', (clienteData) => {
  cy.navigateToEventosERP('clientes');
  cy.contains('button', /nuevo|crear|agregar/i).click();
  cy.get('[role="dialog"], .modal').should('be.visible');

  // Llenar formulario
  if (clienteData.razon_social) {
    cy.get('input[name="razon_social"], input[placeholder*="razón"]')
      .clear()
      .type(clienteData.razon_social);
  }
  if (clienteData.rfc) {
    cy.get('input[name="rfc"]').clear().type(clienteData.rfc);
  }
  if (clienteData.email) {
    cy.get('input[name="email"], input[type="email"]').clear().type(clienteData.email);
  }
  if (clienteData.sufijo) {
    cy.get('input[name="sufijo"]').clear().type(clienteData.sufijo);
  }

  cy.contains('button', /guardar|crear/i).click();
  cy.get('.Toastify__toast--success', { timeout: 10000 }).should('be.visible');
});

Cypress.Commands.add('createEventoERP', (eventoData) => {
  cy.navigateToEventosERP('eventos');
  cy.contains('button', /nuevo|crear/i).click();

  cy.get('input[name="nombre"]').clear().type(eventoData.nombre);

  if (eventoData.descripcion) {
    cy.get('textarea[name="descripcion"]').clear().type(eventoData.descripcion);
  }
  if (eventoData.cliente) {
    cy.get('[name="cliente_id"]').click();
    cy.contains(eventoData.cliente).click();
  }
  if (eventoData.fecha_evento) {
    cy.get('input[name="fecha_evento"]').clear().type(eventoData.fecha_evento);
  }

  cy.contains('button', /guardar|crear/i).click();
  cy.get('.Toastify__toast--success', { timeout: 10000 }).should('be.visible');
});

Cypress.Commands.add('addIngresoERP', (eventoNombre, ingresoData) => {
  cy.navigateToEventosERP('eventos');
  cy.contains(eventoNombre).click();
  cy.contains(/ingresos/i).click();
  cy.contains('button', /nuevo|agregar/i).click();

  cy.get('input[name="concepto"]').clear().type(ingresoData.concepto);
  cy.get('input[name="monto"], input[type="number"]').first().clear().type(ingresoData.monto.toString());

  if (ingresoData.fecha) {
    cy.get('input[name="fecha_pago"], input[type="date"]').first().clear().type(ingresoData.fecha);
  }

  cy.contains('button', /guardar|crear/i).click();
  cy.get('.Toastify__toast--success', { timeout: 10000 }).should('be.visible');
});

Cypress.Commands.add('addGastoERP', (eventoNombre, gastoData, archivoPath = null) => {
  cy.navigateToEventosERP('eventos');
  cy.contains(eventoNombre).click();
  cy.contains(/gastos/i).click();
  cy.contains('button', /nuevo|agregar/i).click();

  cy.get('input[name="concepto"]').clear().type(gastoData.concepto);
  cy.get('input[name="total"], input[name="monto"]').first().clear().type(gastoData.monto.toString());

  if (gastoData.fecha) {
    cy.get('input[name="fecha"], input[type="date"]').first().clear().type(gastoData.fecha);
  }

  // Cargar archivo si se proporciona
  if (archivoPath) {
    cy.get('input[type="file"]').selectFile(archivoPath, { force: true });
    cy.wait(2000);
  }

  cy.contains('button', /guardar|crear/i).click();
  cy.get('.Toastify__toast--success', { timeout: 10000 }).should('be.visible');
});

Cypress.Commands.add('changeEventoStateERP', (eventoNombre, nuevoEstado = null) => {
  cy.navigateToEventosERP('eventos');
  cy.contains(eventoNombre).click();

  // Si se especifica estado, buscarlo, sino usar el siguiente disponible
  if (nuevoEstado) {
    cy.contains('button', nuevoEstado).click();
  } else {
    cy.get('[data-testid="workflow"], [class*="workflow"]')
      .find('button')
      .not('.disabled')
      .first()
      .click();
  }

  // Confirmar si hay modal
  cy.get('body').then($body => {
    if ($body.find('[role="dialog"]').length > 0) {
      cy.contains('button', /confirmar|aceptar/i).click();
    }
  });

  cy.get('.Toastify__toast--success', { timeout: 10000 }).should('be.visible');
});

Cypress.Commands.add('verifyEventoFinancials', (eventoNombre, expected) => {
  cy.navigateToEventosERP('eventos');
  cy.contains(eventoNombre).click();

  if (expected.ingresos !== undefined) {
    cy.contains(/ingresos/i)
      .parent()
      .contains(new RegExp(expected.ingresos.toLocaleString(), 'i'))
      .should('be.visible');
  }

  if (expected.gastos !== undefined) {
    cy.contains(/gastos/i)
      .parent()
      .contains(new RegExp(expected.gastos.toLocaleString(), 'i'))
      .should('be.visible');
  }

  if (expected.utilidad !== undefined) {
    cy.contains(/utilidad|ganancia/i)
      .parent()
      .contains(new RegExp(expected.utilidad.toLocaleString(), 'i'))
      .should('be.visible');
  }
});

// ============================================================
// ARCHIVOS Y UPLOADS
// ============================================================

Cypress.Commands.add('uploadFile', (selector, filePath, mimeType = 'application/pdf') => {
  cy.get(selector).selectFile(filePath, { force: true });
  cy.wait(1000); // Esperar procesamiento
});

Cypress.Commands.add('verifyFileUploaded', (fileName) => {
  cy.contains(fileName).should('be.visible');
});

// ============================================================
// UTILIDADES DE PRUEBA
// ============================================================

Cypress.Commands.add('generateTestData', () => {
  const timestamp = Date.now();
  return cy.wrap({
    cliente: {
      razon_social: `Cliente Test ${timestamp}`,
      rfc: 'TEST' + Math.random().toString(36).substring(2, 12).toUpperCase(),
      email: `test${timestamp}@prueba.com`,
      sufijo: 'TST'
    },
    evento: {
      nombre: `Evento Test ${new Date().toISOString().split('T')[0]}`,
      fecha_evento: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    },
    ingreso: {
      concepto: `Ingreso Test ${timestamp}`,
      monto: Math.floor(Math.random() * 100000) + 10000,
      fecha: new Date().toISOString().split('T')[0]
    },
    gasto: {
      concepto: `Gasto Test ${timestamp}`,
      monto: Math.floor(Math.random() * 50000) + 5000,
      fecha: new Date().toISOString().split('T')[0]
    }
  });
});
