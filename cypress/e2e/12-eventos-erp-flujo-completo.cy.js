/**
 * ============================================================================
 * PRUEBAS AUTOMATIZADAS: EVENTOS-ERP - FLUJO COMPLETO
 * ============================================================================
 *
 * Este archivo contiene pruebas E2E para todo el flujo de un evento:
 * 1. Crear cliente
 * 2. Crear evento
 * 3. Agregar ingresos
 * 4. Agregar gastos (con carga de PDF)
 * 5. Cambiar estados del workflow
 * 6. Verificar análisis financiero
 * 7. Crear proyecto vinculado
 *
 * Ejecutar: npx cypress run --spec "cypress/e2e/12-eventos-erp-flujo-completo.cy.js"
 */

describe('Eventos ERP - Flujo Completo', () => {
  // Datos de prueba que se compartirán entre tests
  let testData = {
    cliente: null,
    evento: null,
    ingresos: [],
    gastos: []
  };

  // Datos para crear
  const datosCliente = {
    razon_social: `Cliente Prueba Cypress ${Date.now()}`,
    nombre_comercial: 'Cliente Test',
    rfc: 'TEST' + Math.random().toString(36).substring(2, 12).toUpperCase(),
    email: `test${Date.now()}@prueba.com`,
    telefono: '5512345678',
    sufijo: 'TST'
  };

  const datosEvento = {
    nombre: `Evento de Prueba ${new Date().toISOString().split('T')[0]}`,
    descripcion: 'Evento generado por pruebas automatizadas de Cypress',
    tipo_evento_id: null, // Se llenará dinámicamente
    fecha_evento: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 días adelante
    lugar: 'Centro de Convenciones Test',
    presupuesto_estimado: 150000
  };

  const datosIngreso = {
    concepto: 'Anticipo de evento - 50%',
    monto: 75000,
    fecha_pago: new Date().toISOString().split('T')[0],
    metodo_pago: 'transferencia',
    referencia: `REF-${Date.now()}`
  };

  const datosGasto = {
    concepto: 'Renta de equipo de audio',
    monto: 15000,
    fecha: new Date().toISOString().split('T')[0],
    proveedor: 'Audio Pro Test',
    categoria: 'Equipo'
  };

  // ============================================================================
  // SETUP & TEARDOWN
  // ============================================================================

  before(() => {
    // Limpiar cookies y localStorage
    cy.clearCookies();
    cy.clearLocalStorage();

    // Login (si es necesario)
    // cy.loginAsAdmin();
  });

  beforeEach(() => {
    // Mantener sesión entre tests
    Cypress.Cookies.preserveOnce('session', 'auth');
  });

  after(() => {
    // Guardar resultados de prueba
    cy.writeFile('cypress/results/eventos-erp-test-data.json', testData);
  });

  // ============================================================================
  // SUITE 1: CLIENTES ERP
  // ============================================================================

  describe('1. Gestión de Clientes', () => {

    it('1.1 Debe navegar a la lista de clientes ERP', () => {
      cy.visit('/eventos-erp');
      cy.waitForPageLoad();

      // Buscar enlace a clientes en el menú lateral o navegación
      cy.get('nav, aside, [data-testid="sidebar"]').within(() => {
        cy.contains(/clientes/i).click();
      });

      // Verificar que estamos en la página de clientes
      cy.url().should('include', 'cliente');
      cy.contains(/clientes/i).should('be.visible');
    });

    it('1.2 Debe abrir el modal de nuevo cliente', () => {
      cy.visit('/eventos-erp/clientes');
      cy.waitForPageLoad();

      // Buscar botón de nuevo cliente
      cy.contains('button', /nuevo|crear|agregar/i).click();

      // Verificar que el modal está abierto
      cy.get('[role="dialog"], .modal, [class*="modal"]').should('be.visible');
    });

    it('1.3 Debe crear un cliente nuevo', () => {
      cy.visit('/eventos-erp/clientes');
      cy.waitForPageLoad();

      // Abrir modal
      cy.contains('button', /nuevo|crear|agregar/i).click();
      cy.get('[role="dialog"], .modal').should('be.visible');

      // Llenar formulario
      cy.get('input[name="razon_social"], input[placeholder*="razón"], input[placeholder*="Razón"]')
        .clear()
        .type(datosCliente.razon_social);

      cy.get('input[name="nombre_comercial"], input[placeholder*="comercial"]')
        .clear()
        .type(datosCliente.nombre_comercial);

      cy.get('input[name="rfc"], input[placeholder*="RFC"]')
        .clear()
        .type(datosCliente.rfc);

      cy.get('input[name="email"], input[type="email"]')
        .clear()
        .type(datosCliente.email);

      cy.get('input[name="telefono"], input[placeholder*="teléfono"], input[placeholder*="telefono"]')
        .clear()
        .type(datosCliente.telefono);

      // Sufijo para clave de evento
      cy.get('input[name="sufijo"], input[placeholder*="sufijo"]')
        .clear()
        .type(datosCliente.sufijo);

      // Guardar
      cy.contains('button', /guardar|crear|aceptar/i).click();

      // Verificar mensaje de éxito
      cy.get('.Toastify__toast--success, [class*="toast"]', { timeout: 10000 })
        .should('be.visible');

      // Verificar que el cliente aparece en la lista
      cy.contains(datosCliente.razon_social).should('be.visible');

      // Guardar ID del cliente para pruebas posteriores
      cy.contains(datosCliente.razon_social)
        .parents('tr, [class*="card"], [class*="row"]')
        .invoke('attr', 'data-id')
        .then((id) => {
          testData.cliente = { ...datosCliente, id };
        });
    });

    it('1.4 Debe buscar el cliente creado', () => {
      cy.visit('/eventos-erp/clientes');
      cy.waitForPageLoad();

      // Buscar
      cy.get('input[placeholder*="Buscar"], input[type="search"]')
        .clear()
        .type(datosCliente.razon_social.substring(0, 20));

      cy.wait(500); // Debounce

      // Verificar resultado
      cy.contains(datosCliente.razon_social).should('be.visible');
    });
  });

  // ============================================================================
  // SUITE 2: EVENTOS ERP
  // ============================================================================

  describe('2. Gestión de Eventos', () => {

    it('2.1 Debe navegar al panel de eventos', () => {
      cy.visit('/eventos-erp');
      cy.waitForPageLoad();

      // Verificar elementos del dashboard
      cy.get('[class*="dashboard"], [class*="panel"], main').should('be.visible');
    });

    it('2.2 Debe mostrar la lista de eventos', () => {
      cy.visit('/eventos-erp/eventos');
      cy.waitForPageLoad();

      // Verificar que hay una tabla o lista de eventos
      cy.get('table, [class*="list"], [class*="grid"]').should('be.visible');
    });

    it('2.3 Debe crear un nuevo evento', () => {
      cy.visit('/eventos-erp/eventos');
      cy.waitForPageLoad();

      // Abrir formulario de nuevo evento
      cy.contains('button', /nuevo|crear|agregar/i).click();

      // Verificar que estamos en el formulario
      cy.get('form, [class*="form"]').should('be.visible');

      // Llenar nombre
      cy.get('input[name="nombre"], input[placeholder*="nombre"]')
        .clear()
        .type(datosEvento.nombre);

      // Descripción
      cy.get('textarea[name="descripcion"], textarea[placeholder*="descripción"]')
        .clear()
        .type(datosEvento.descripcion);

      // Seleccionar cliente
      cy.get('[name="cliente_id"], [data-testid="cliente-select"]').click();
      cy.contains(datosCliente.razon_social).click();

      // Fecha del evento
      cy.get('input[name="fecha_evento"], input[type="date"]')
        .clear()
        .type(datosEvento.fecha_evento);

      // Lugar
      cy.get('input[name="lugar"], input[placeholder*="lugar"]')
        .clear()
        .type(datosEvento.lugar);

      // Tipo de evento (si hay selector)
      cy.get('body').then($body => {
        if ($body.find('[name="tipo_evento_id"]').length > 0) {
          cy.get('[name="tipo_evento_id"]').click();
          cy.get('[role="option"], [class*="option"]').first().click();
        }
      });

      // Guardar
      cy.contains('button', /guardar|crear/i).click();

      // Verificar éxito
      cy.get('.Toastify__toast--success', { timeout: 10000 }).should('be.visible');

      // Guardar datos del evento
      cy.url().then((url) => {
        const match = url.match(/eventos\/([^/]+)/);
        if (match) {
          testData.evento = { ...datosEvento, id: match[1] };
        }
      });
    });

    it('2.4 Debe verificar la clave generada del evento', () => {
      cy.visit('/eventos-erp/eventos');
      cy.waitForPageLoad();

      // Buscar el evento creado
      cy.get('input[placeholder*="Buscar"]')
        .clear()
        .type(datosEvento.nombre.substring(0, 15));

      cy.wait(500);

      // Verificar que tiene clave con el sufijo del cliente
      cy.contains(datosEvento.nombre)
        .parents('tr, [class*="row"]')
        .within(() => {
          cy.contains(new RegExp(`${datosCliente.sufijo}\\d{4}-\\d{3}`, 'i'))
            .should('be.visible');
        });
    });
  });

  // ============================================================================
  // SUITE 3: INGRESOS
  // ============================================================================

  describe('3. Gestión de Ingresos', () => {

    it('3.1 Debe navegar al detalle del evento', () => {
      cy.visit('/eventos-erp/eventos');
      cy.waitForPageLoad();

      // Buscar y abrir el evento
      cy.get('input[placeholder*="Buscar"]')
        .clear()
        .type(datosEvento.nombre.substring(0, 15));

      cy.wait(500);

      cy.contains(datosEvento.nombre).click();

      // Verificar que estamos en el detalle
      cy.url().should('include', 'eventos');
      cy.contains(datosEvento.nombre).should('be.visible');
    });

    it('3.2 Debe abrir la pestaña de ingresos', () => {
      // Navegar al evento
      cy.visit('/eventos-erp/eventos');
      cy.contains(datosEvento.nombre).click();

      // Buscar pestaña de ingresos
      cy.contains(/ingresos|cobros|pagos/i).click();

      // Verificar que se muestra la sección de ingresos
      cy.get('[class*="ingreso"], [data-testid="ingresos-tab"]').should('be.visible');
    });

    it('3.3 Debe agregar un ingreso al evento', () => {
      cy.visit('/eventos-erp/eventos');
      cy.contains(datosEvento.nombre).click();
      cy.contains(/ingresos/i).click();

      // Abrir modal de nuevo ingreso
      cy.contains('button', /nuevo|agregar|registrar/i).click();

      // Llenar formulario
      cy.get('input[name="concepto"], input[placeholder*="concepto"]')
        .clear()
        .type(datosIngreso.concepto);

      cy.get('input[name="monto"], input[placeholder*="monto"], input[type="number"]')
        .first()
        .clear()
        .type(datosIngreso.monto.toString());

      cy.get('input[name="fecha_pago"], input[type="date"]')
        .first()
        .clear()
        .type(datosIngreso.fecha_pago);

      // Guardar
      cy.contains('button', /guardar|crear|agregar/i).click();

      // Verificar éxito
      cy.get('.Toastify__toast--success', { timeout: 10000 }).should('be.visible');

      // Verificar que aparece en la lista
      cy.contains(datosIngreso.concepto).should('be.visible');

      testData.ingresos.push(datosIngreso);
    });

    it('3.4 Debe mostrar el total de ingresos actualizado', () => {
      cy.visit('/eventos-erp/eventos');
      cy.contains(datosEvento.nombre).click();

      // Verificar que el total de ingresos muestra el monto
      cy.contains(/total.*ingreso|ingreso.*total/i)
        .parent()
        .contains(/75.*000|75,000|\$75/i)
        .should('be.visible');
    });
  });

  // ============================================================================
  // SUITE 4: GASTOS (CON CARGA DE ARCHIVO)
  // ============================================================================

  describe('4. Gestión de Gastos con Archivos', () => {

    it('4.1 Debe abrir la pestaña de gastos', () => {
      cy.visit('/eventos-erp/eventos');
      cy.contains(datosEvento.nombre).click();

      cy.contains(/gastos|egresos/i).click();

      cy.get('[class*="gasto"], [data-testid="gastos-tab"]').should('be.visible');
    });

    it('4.2 Debe agregar un gasto manual', () => {
      cy.visit('/eventos-erp/eventos');
      cy.contains(datosEvento.nombre).click();
      cy.contains(/gastos/i).click();

      // Abrir modal
      cy.contains('button', /nuevo|agregar|registrar/i).click();

      // Llenar formulario
      cy.get('input[name="concepto"], input[placeholder*="concepto"]')
        .clear()
        .type(datosGasto.concepto);

      cy.get('input[name="total"], input[name="monto"], input[placeholder*="total"], input[placeholder*="monto"]')
        .first()
        .clear()
        .type(datosGasto.monto.toString());

      cy.get('input[name="fecha"], input[type="date"]')
        .first()
        .clear()
        .type(datosGasto.fecha);

      // Proveedor (si hay campo)
      cy.get('body').then($body => {
        if ($body.find('input[name="proveedor"]').length > 0) {
          cy.get('input[name="proveedor"]')
            .clear()
            .type(datosGasto.proveedor);
        }
      });

      // Guardar
      cy.contains('button', /guardar|crear|agregar/i).click();

      // Verificar éxito
      cy.get('.Toastify__toast--success', { timeout: 10000 }).should('be.visible');

      testData.gastos.push(datosGasto);
    });

    it('4.3 Debe cargar un archivo PDF como comprobante', () => {
      cy.visit('/eventos-erp/eventos');
      cy.contains(datosEvento.nombre).click();
      cy.contains(/gastos/i).click();

      // Abrir modal de nuevo gasto
      cy.contains('button', /nuevo|agregar/i).click();

      // Llenar datos básicos
      cy.get('input[name="concepto"], input[placeholder*="concepto"]')
        .clear()
        .type('Factura con comprobante PDF');

      cy.get('input[name="total"], input[name="monto"]')
        .first()
        .clear()
        .type('5000');

      // Cargar archivo PDF
      cy.get('input[type="file"]').selectFile('cypress/fixtures/factura-prueba.pdf', { force: true });

      // Esperar a que se procese
      cy.wait(2000);

      // Verificar que el archivo se cargó
      cy.contains(/factura.*pdf|archivo.*cargado|comprobante/i).should('be.visible');

      // Guardar
      cy.contains('button', /guardar|crear/i).click();

      cy.get('.Toastify__toast--success', { timeout: 10000 }).should('be.visible');
    });

    it('4.4 Debe mostrar el total de gastos actualizado', () => {
      cy.visit('/eventos-erp/eventos');
      cy.contains(datosEvento.nombre).click();

      // El total de gastos debe ser 15000 + 5000 = 20000
      cy.contains(/total.*gasto|gasto.*total/i)
        .parent()
        .contains(/20.*000|20,000|\$20/i)
        .should('be.visible');
    });
  });

  // ============================================================================
  // SUITE 5: WORKFLOW / ESTADOS
  // ============================================================================

  describe('5. Flujo de Estados (Workflow)', () => {

    it('5.1 Debe mostrar el estado actual del evento', () => {
      cy.visit('/eventos-erp/eventos');
      cy.contains(datosEvento.nombre).click();

      // Verificar badge de estado
      cy.get('[class*="badge"], [class*="status"], [class*="estado"]')
        .should('be.visible');
    });

    it('5.2 Debe mostrar opciones de cambio de estado', () => {
      cy.visit('/eventos-erp/eventos');
      cy.contains(datosEvento.nombre).click();

      // Buscar selector o botones de estado
      cy.get('[data-testid="workflow"], [class*="workflow"], [class*="estado"]')
        .within(() => {
          cy.get('button, select, [role="button"]').should('exist');
        });
    });

    it('5.3 Debe cambiar el estado del evento', () => {
      cy.visit('/eventos-erp/eventos');
      cy.contains(datosEvento.nombre).click();

      // Buscar y hacer clic en el siguiente estado disponible
      cy.get('[data-testid="workflow"], [class*="workflow"]').within(() => {
        cy.get('button').not('.disabled').first().click();
      });

      // Confirmar cambio si hay modal
      cy.get('body').then($body => {
        if ($body.find('[role="dialog"]').length > 0) {
          cy.contains('button', /confirmar|aceptar|cambiar/i).click();
        }
      });

      // Verificar mensaje de éxito
      cy.get('.Toastify__toast--success', { timeout: 10000 }).should('be.visible');
    });

    it('5.4 Debe registrar el cambio en el historial', () => {
      cy.visit('/eventos-erp/eventos');
      cy.contains(datosEvento.nombre).click();

      // Buscar historial de estados
      cy.contains(/historial|cambios|log/i).click();

      // Verificar que hay al menos un registro
      cy.get('[class*="historial"], [class*="timeline"], [class*="log"]')
        .find('[class*="item"], li, tr')
        .should('have.length.at.least', 1);
    });
  });

  // ============================================================================
  // SUITE 6: ANÁLISIS FINANCIERO
  // ============================================================================

  describe('6. Análisis Financiero', () => {

    it('6.1 Debe navegar al análisis financiero', () => {
      cy.visit('/eventos-erp');

      // Buscar enlace de análisis financiero
      cy.get('nav, aside').within(() => {
        cy.contains(/análisis|financiero|finanzas/i).click();
      });

      cy.url().should('include', 'financ');
    });

    it('6.2 Debe mostrar métricas del evento', () => {
      cy.visit('/eventos-erp/eventos');
      cy.contains(datosEvento.nombre).click();

      // Verificar métricas
      cy.contains(/ingresos/i).should('be.visible');
      cy.contains(/gastos/i).should('be.visible');
      cy.contains(/utilidad|ganancia|margen/i).should('be.visible');
    });

    it('6.3 Debe calcular correctamente la utilidad', () => {
      cy.visit('/eventos-erp/eventos');
      cy.contains(datosEvento.nombre).click();

      // Utilidad = Ingresos (75000) - Gastos (20000) = 55000
      cy.contains(/utilidad|ganancia/i)
        .parent()
        .contains(/55.*000|55,000|\$55/i)
        .should('be.visible');
    });

    it('6.4 Debe mostrar gráficos financieros', () => {
      cy.visit('/eventos-erp/eventos');
      cy.contains(datosEvento.nombre).click();

      // Verificar que hay gráficos
      cy.get('canvas, svg, [class*="chart"]').should('have.length.at.least', 1);
    });
  });

  // ============================================================================
  // SUITE 7: PROYECTOS
  // ============================================================================

  describe('7. Proyectos vinculados', () => {

    it('7.1 Debe navegar a proyectos', () => {
      cy.visit('/eventos-erp');

      cy.get('nav, aside').within(() => {
        cy.contains(/proyecto/i).click();
      });

      cy.url().should('include', 'proyecto');
    });

    it('7.2 Debe crear un proyecto vinculado al evento', () => {
      cy.visit('/eventos-erp/proyectos');
      cy.waitForPageLoad();

      // Abrir formulario
      cy.contains('button', /nuevo|crear/i).click();

      // Nombre del proyecto
      cy.get('input[name="nombre"], input[placeholder*="nombre"]')
        .clear()
        .type(`Proyecto para ${datosEvento.nombre.substring(0, 20)}`);

      // Vincular al evento
      cy.get('[name="evento_id"], [data-testid="evento-select"]').click();
      cy.contains(datosEvento.nombre.substring(0, 20)).click();

      // Guardar
      cy.contains('button', /guardar|crear/i).click();

      cy.get('.Toastify__toast--success', { timeout: 10000 }).should('be.visible');
    });

    it('7.3 Debe mostrar el proyecto en la lista', () => {
      cy.visit('/eventos-erp/proyectos');
      cy.waitForPageLoad();

      cy.contains(`Proyecto para ${datosEvento.nombre.substring(0, 20)}`).should('be.visible');
    });
  });

  // ============================================================================
  // SUITE 8: VALIDACIONES Y ERRORES
  // ============================================================================

  describe('8. Validaciones', () => {

    it('8.1 Debe mostrar error al crear evento sin cliente', () => {
      cy.visit('/eventos-erp/eventos');
      cy.contains('button', /nuevo|crear/i).click();

      // Llenar solo nombre
      cy.get('input[name="nombre"]')
        .clear()
        .type('Evento sin cliente');

      // Intentar guardar sin cliente
      cy.contains('button', /guardar|crear/i).click();

      // Debe mostrar error o validación
      cy.get('.Toastify__toast--error, [class*="error"], [class*="invalid"]')
        .should('be.visible');
    });

    it('8.2 Debe validar montos negativos en ingresos', () => {
      cy.visit('/eventos-erp/eventos');
      cy.contains(datosEvento.nombre).click();
      cy.contains(/ingresos/i).click();

      cy.contains('button', /nuevo|agregar/i).click();

      cy.get('input[name="monto"], input[type="number"]')
        .first()
        .clear()
        .type('-1000');

      cy.contains('button', /guardar/i).click();

      // Debe mostrar error
      cy.get('.Toastify__toast--error, [class*="error"]').should('be.visible');
    });

    it('8.3 Debe validar campos requeridos en gastos', () => {
      cy.visit('/eventos-erp/eventos');
      cy.contains(datosEvento.nombre).click();
      cy.contains(/gastos/i).click();

      cy.contains('button', /nuevo|agregar/i).click();

      // Intentar guardar sin datos
      cy.contains('button', /guardar/i).click();

      // Debe mostrar validación
      cy.get('[class*="invalid"], [class*="error"], :invalid').should('exist');
    });
  });

  // ============================================================================
  // SUITE 9: LIMPIEZA (OPCIONAL)
  // ============================================================================

  describe('9. Limpieza de datos de prueba', () => {

    it('9.1 Debe poder eliminar el evento de prueba', () => {
      cy.visit('/eventos-erp/eventos');

      cy.get('input[placeholder*="Buscar"]')
        .clear()
        .type(datosEvento.nombre.substring(0, 15));

      cy.wait(500);

      // Encontrar y eliminar
      cy.contains(datosEvento.nombre)
        .parents('tr, [class*="row"]')
        .within(() => {
          cy.get('button[title*="eliminar"], button[aria-label*="eliminar"], [class*="delete"]')
            .click();
        });

      // Confirmar eliminación
      cy.get('[role="dialog"]').within(() => {
        cy.contains('button', /confirmar|eliminar|sí/i).click();
      });

      cy.get('.Toastify__toast--success', { timeout: 10000 }).should('be.visible');
    });
  });
});
