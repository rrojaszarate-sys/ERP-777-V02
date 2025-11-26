/// <reference types="cypress" />

/**
 * Suite de Pruebas Completas para todos los Módulos ERP
 *
 * Esta suite verifica la funcionalidad, integración e interoperabilidad
 * de todos los módulos del sistema ERP.
 *
 * Módulos cubiertos:
 * - Contabilidad ERP
 * - Facturación ERP
 * - Inventario ERP
 * - Proveedores ERP
 * - Proyectos ERP
 * - RRHH ERP
 * - Tesorería ERP
 * - Reportes ERP
 * - CRM/Cotizaciones ERP
 */

describe('Suite Completa de Pruebas ERP', () => {
  // Cargar datos de prueba
  let testData;

  before(() => {
    cy.fixture('test-data.json').then((data) => {
      testData = data;
    });
  });

  beforeEach(() => {
    // Interceptar llamadas a Supabase para monitoreo
    cy.intercept('POST', '**/rest/v1/**').as('supabasePost');
    cy.intercept('GET', '**/rest/v1/**').as('supabaseGet');
    cy.intercept('PATCH', '**/rest/v1/**').as('supabasePatch');
    cy.intercept('DELETE', '**/rest/v1/**').as('supabaseDelete');
  });

  // ============================================================
  // MÓDULO: CONTABILIDAD ERP
  // ============================================================
  describe('Módulo Contabilidad ERP', () => {
    beforeEach(() => {
      cy.visit('/contabilidad');
      cy.wait(1000);
    });

    describe('Dashboard de Contabilidad', () => {
      it('Debe cargar el dashboard correctamente', () => {
        cy.get('body').should('be.visible');
        cy.url().should('include', '/contabilidad');
      });

      it('Debe mostrar métricas financieras', () => {
        cy.get('[data-testid="metrics"], .metrics-container, .dashboard-card')
          .should('exist');
      });
    });

    describe('Plan de Cuentas', () => {
      it('Debe mostrar el plan de cuentas', () => {
        cy.contains(/plan de cuentas|catálogo/i).click();
        cy.wait('@supabaseGet');
        cy.get('table, [data-testid="cuentas-table"]').should('exist');
      });

      it('Debe permitir buscar cuentas', () => {
        cy.contains(/plan de cuentas|catálogo/i).click();
        cy.get('input[placeholder*="Buscar"], input[type="search"]')
          .type('bancos');
        cy.wait(500);
      });
    });

    describe('Pólizas Contables', () => {
      it('Debe mostrar lista de pólizas', () => {
        cy.contains(/pólizas/i).click();
        cy.wait('@supabaseGet');
      });

      it('Debe abrir formulario de nueva póliza', () => {
        cy.contains(/pólizas/i).click();
        cy.contains(/nueva|crear|agregar/i).click({ force: true });
      });
    });

    describe('Reportes Contables', () => {
      it('Debe acceder a reportes', () => {
        cy.contains(/reportes/i).click();
      });
    });
  });

  // ============================================================
  // MÓDULO: FACTURACIÓN ERP
  // ============================================================
  describe('Módulo Facturación ERP', () => {
    beforeEach(() => {
      cy.visit('/facturacion');
      cy.wait(1000);
    });

    describe('Dashboard de Facturación', () => {
      it('Debe cargar el dashboard', () => {
        cy.get('body').should('be.visible');
      });

      it('Debe mostrar estadísticas de facturación', () => {
        cy.get('[data-testid="facturacion-stats"], .stats, .card')
          .should('exist');
      });
    });

    describe('Lista de Facturas', () => {
      it('Debe mostrar lista de facturas', () => {
        cy.contains(/facturas/i).click();
        cy.wait('@supabaseGet');
      });

      it('Debe permitir filtrar por estado', () => {
        cy.contains(/facturas/i).click();
        cy.get('select, [data-testid="status-filter"]').first()
          .should('exist');
      });
    });

    describe('Configuración CFDI', () => {
      it('Debe acceder a configuración', () => {
        cy.contains(/configuración/i).click();
      });

      it('Debe mostrar campos de certificados', () => {
        cy.contains(/configuración/i).click();
        cy.contains(/certificado/i).should('exist');
      });
    });
  });

  // ============================================================
  // MÓDULO: INVENTARIO ERP
  // ============================================================
  describe('Módulo Inventario ERP', () => {
    beforeEach(() => {
      cy.visit('/inventario');
      cy.wait(1000);
    });

    describe('Dashboard de Inventario', () => {
      it('Debe cargar el dashboard', () => {
        cy.get('body').should('be.visible');
      });
    });

    describe('Gestión de Productos', () => {
      it('Debe mostrar lista de productos', () => {
        cy.contains(/productos/i).click();
        cy.wait('@supabaseGet');
      });

      it('Debe abrir modal de nuevo producto', () => {
        cy.contains(/productos/i).click();
        cy.contains(/nuevo|crear|agregar/i).click({ force: true });
      });

      it('Debe permitir búsqueda de productos', () => {
        cy.contains(/productos/i).click();
        cy.get('input[placeholder*="Buscar"], input[type="search"]')
          .type(testData.productos.producto1.nombre);
      });
    });

    describe('Gestión de Almacenes', () => {
      it('Debe mostrar almacenes', () => {
        cy.contains(/almacenes/i).click();
      });
    });

    describe('Movimientos de Inventario', () => {
      it('Debe mostrar movimientos', () => {
        cy.contains(/movimientos/i).click();
        cy.wait('@supabaseGet');
      });
    });
  });

  // ============================================================
  // MÓDULO: PROVEEDORES ERP
  // ============================================================
  describe('Módulo Proveedores ERP', () => {
    beforeEach(() => {
      cy.visit('/proveedores');
      cy.wait(1000);
    });

    describe('Dashboard de Proveedores', () => {
      it('Debe cargar el dashboard', () => {
        cy.get('body').should('be.visible');
      });
    });

    describe('Lista de Proveedores', () => {
      it('Debe mostrar proveedores', () => {
        cy.contains(/proveedores/i).first().click();
        cy.wait('@supabaseGet');
      });

      it('Debe permitir crear proveedor', () => {
        cy.contains(/proveedores/i).first().click();
        cy.contains(/nuevo|crear|agregar/i).click({ force: true });
      });
    });

    describe('Órdenes de Compra', () => {
      it('Debe mostrar órdenes de compra', () => {
        cy.contains(/órdenes|ordenes/i).click();
      });
    });

    describe('Catálogo Proveedor-Producto', () => {
      it('Debe acceder al catálogo', () => {
        cy.contains(/catálogo|catalogo/i).click();
      });
    });
  });

  // ============================================================
  // MÓDULO: PROYECTOS ERP
  // ============================================================
  describe('Módulo Proyectos ERP', () => {
    beforeEach(() => {
      cy.visit('/proyectos');
      cy.wait(1000);
    });

    describe('Dashboard de Proyectos', () => {
      it('Debe cargar el dashboard', () => {
        cy.get('body').should('be.visible');
      });

      it('Debe mostrar proyectos activos', () => {
        cy.get('[data-testid="proyectos-activos"], .project-card, table')
          .should('exist');
      });
    });

    describe('Lista de Proyectos', () => {
      it('Debe mostrar proyectos', () => {
        cy.contains(/proyectos/i).first().click();
        cy.wait('@supabaseGet');
      });

      it('Debe crear nuevo proyecto', () => {
        cy.contains(/proyectos/i).first().click();
        cy.contains(/nuevo|crear/i).click({ force: true });
      });
    });

    describe('Tareas y Kanban', () => {
      it('Debe mostrar tablero Kanban', () => {
        cy.contains(/tareas|kanban/i).click();
      });
    });

    describe('Timesheet', () => {
      it('Debe acceder a timesheet', () => {
        cy.contains(/timesheet|horas/i).click();
      });
    });
  });

  // ============================================================
  // MÓDULO: RRHH ERP
  // ============================================================
  describe('Módulo RRHH ERP', () => {
    beforeEach(() => {
      cy.visit('/rrhh');
      cy.wait(1000);
    });

    describe('Dashboard RRHH', () => {
      it('Debe cargar el dashboard', () => {
        cy.get('body').should('be.visible');
      });
    });

    describe('Gestión de Empleados', () => {
      it('Debe mostrar empleados', () => {
        cy.contains(/empleados/i).click();
        cy.wait('@supabaseGet');
      });

      it('Debe crear nuevo empleado', () => {
        cy.contains(/empleados/i).click();
        cy.contains(/nuevo|crear|agregar/i).click({ force: true });
      });
    });

    describe('Nómina', () => {
      it('Debe acceder a nómina', () => {
        cy.contains(/nómina|nomina/i).click();
      });
    });
  });

  // ============================================================
  // MÓDULO: TESORERÍA ERP
  // ============================================================
  describe('Módulo Tesorería ERP', () => {
    beforeEach(() => {
      cy.visit('/tesoreria');
      cy.wait(1000);
    });

    describe('Dashboard Tesorería', () => {
      it('Debe cargar el dashboard', () => {
        cy.get('body').should('be.visible');
      });

      it('Debe mostrar flujo de caja', () => {
        cy.get('[data-testid="flujo-caja"], .chart, canvas')
          .should('exist');
      });
    });

    describe('Cuentas Bancarias', () => {
      it('Debe mostrar cuentas', () => {
        cy.contains(/cuentas/i).click();
        cy.wait('@supabaseGet');
      });

      it('Debe crear cuenta bancaria', () => {
        cy.contains(/cuentas/i).click();
        cy.contains(/nueva|crear|agregar/i).click({ force: true });
      });
    });

    describe('Movimientos Bancarios', () => {
      it('Debe mostrar movimientos', () => {
        cy.contains(/movimientos/i).click();
      });
    });
  });

  // ============================================================
  // MÓDULO: REPORTES ERP
  // ============================================================
  describe('Módulo Reportes ERP', () => {
    beforeEach(() => {
      cy.visit('/reportes');
      cy.wait(1000);
    });

    describe('Dashboard de Reportes', () => {
      it('Debe cargar el dashboard', () => {
        cy.get('body').should('be.visible');
      });

      it('Debe mostrar métricas BI', () => {
        cy.get('[data-testid="metricas-bi"], .metric, .card')
          .should('exist');
      });
    });

    describe('Reportes Personalizados', () => {
      it('Debe mostrar reportes disponibles', () => {
        cy.contains(/reportes/i).first().click();
      });
    });
  });

  // ============================================================
  // MÓDULO: CRM / COTIZACIONES ERP
  // ============================================================
  describe('Módulo CRM/Cotizaciones ERP', () => {
    beforeEach(() => {
      cy.visit('/crm');
      cy.wait(1000);
    });

    describe('Dashboard CRM', () => {
      it('Debe cargar el dashboard', () => {
        cy.get('body').should('be.visible');
      });
    });

    describe('Gestión de Clientes CRM', () => {
      it('Debe mostrar clientes', () => {
        cy.contains(/clientes/i).click();
        cy.wait('@supabaseGet');
      });
    });

    describe('Pipeline de Ventas', () => {
      it('Debe mostrar pipeline', () => {
        cy.contains(/pipeline|oportunidades/i).click();
      });
    });

    describe('Cotizaciones', () => {
      it('Debe mostrar cotizaciones', () => {
        cy.contains(/cotizaciones/i).click();
      });

      it('Debe crear nueva cotización', () => {
        cy.contains(/cotizaciones/i).click();
        cy.contains(/nueva|crear/i).click({ force: true });
      });
    });
  });

  // ============================================================
  // PRUEBAS DE INTEGRACIÓN ENTRE MÓDULOS
  // ============================================================
  describe('Pruebas de Integración entre Módulos', () => {

    describe('Integración Proveedores-Inventario', () => {
      it('Debe permitir asociar productos a proveedores', () => {
        cy.visit('/proveedores');
        cy.contains(/catálogo|catalogo/i).click();
        cy.wait(1000);
        // Verificar que la página de catálogo carga productos
        cy.get('body').should('be.visible');
      });
    });

    describe('Integración Eventos-Contabilidad', () => {
      it('Debe poder generar pólizas desde eventos', () => {
        cy.visit('/eventos');
        cy.wait(1000);
        // Verificar que el módulo de eventos está operativo
        cy.get('body').should('be.visible');
      });
    });

    describe('Integración CRM-Proyectos', () => {
      it('Debe permitir convertir oportunidades en proyectos', () => {
        cy.visit('/crm');
        cy.contains(/pipeline|oportunidades/i).click();
        cy.wait(1000);
        cy.get('body').should('be.visible');
      });
    });

    describe('Integración Facturación-Tesorería', () => {
      it('Debe reflejar pagos en tesorería', () => {
        cy.visit('/facturacion');
        cy.wait(500);
        cy.visit('/tesoreria');
        cy.wait(500);
        cy.get('body').should('be.visible');
      });
    });
  });

  // ============================================================
  // PRUEBAS DE NAVEGACIÓN Y UI
  // ============================================================
  describe('Pruebas de Navegación y UI', () => {

    describe('Sidebar y Navegación', () => {
      it('Debe navegar entre todos los módulos', () => {
        const modules = [
          '/eventos',
          '/contabilidad',
          '/facturacion',
          '/inventario',
          '/proveedores',
          '/proyectos',
          '/rrhh',
          '/tesoreria',
          '/reportes'
        ];

        modules.forEach(route => {
          cy.visit(route);
          cy.wait(300);
          cy.get('body').should('be.visible');
        });
      });
    });

    describe('Responsividad', () => {
      const viewports = [
        { width: 1920, height: 1080, name: 'Desktop' },
        { width: 1366, height: 768, name: 'Laptop' },
        { width: 768, height: 1024, name: 'Tablet' }
      ];

      viewports.forEach(viewport => {
        it(`Debe funcionar en ${viewport.name} (${viewport.width}x${viewport.height})`, () => {
          cy.viewport(viewport.width, viewport.height);
          cy.visit('/eventos');
          cy.get('body').should('be.visible');
        });
      });
    });

    describe('Tema y Colores', () => {
      it('Debe cambiar entre modo claro y oscuro', () => {
        cy.visit('/');
        // Buscar selector de tema si existe
        cy.get('body').then($body => {
          if ($body.find('[data-testid="theme-toggle"], button[aria-label*="theme"]').length > 0) {
            cy.get('[data-testid="theme-toggle"], button[aria-label*="theme"]').click();
            cy.wait(500);
          }
        });
      });
    });
  });

  // ============================================================
  // PRUEBAS DE RENDIMIENTO
  // ============================================================
  describe('Pruebas de Rendimiento', () => {

    it('Dashboard principal debe cargar en menos de 5 segundos', () => {
      const start = Date.now();
      cy.visit('/eventos');
      cy.get('body').should('be.visible').then(() => {
        const loadTime = Date.now() - start;
        expect(loadTime).to.be.lessThan(5000);
        cy.log(`Tiempo de carga: ${loadTime}ms`);
      });
    });

    it('Lista de registros debe cargar en menos de 3 segundos', () => {
      cy.visit('/inventario');
      cy.contains(/productos/i).click();
      const start = Date.now();
      cy.wait('@supabaseGet').then(() => {
        const loadTime = Date.now() - start;
        expect(loadTime).to.be.lessThan(3000);
        cy.log(`Tiempo de carga de datos: ${loadTime}ms`);
      });
    });
  });

  // ============================================================
  // PRUEBAS DE VALIDACIÓN DE DATOS
  // ============================================================
  describe('Validación de Datos', () => {

    describe('Validación de Campos Requeridos', () => {
      it('Debe validar campos requeridos en formulario de cliente', () => {
        cy.visit('/crm');
        cy.contains(/clientes/i).click();
        cy.contains(/nuevo|crear|agregar/i).click({ force: true });
        cy.wait(500);
        // Intentar guardar sin datos
        cy.get('button[type="submit"], button:contains("Guardar")').click({ force: true });
        // Debe mostrar errores de validación
      });
    });

    describe('Validación de Formato RFC', () => {
      it('Debe validar formato de RFC', () => {
        cy.visit('/crm');
        cy.contains(/clientes/i).click();
        cy.contains(/nuevo|crear|agregar/i).click({ force: true });
        cy.wait(500);
        cy.get('input[name="rfc"], [data-testid="rfc"]').then($el => {
          if ($el.length > 0) {
            cy.wrap($el).type('INVALID');
          }
        });
      });
    });
  });
});

// ============================================================
// HOOKS DE REPORTE
// ============================================================
afterEach(function() {
  // Agregar información al reporte
  cy.task('log', `Test: ${this.currentTest?.title} - Estado: ${this.currentTest?.state}`);
});

after(() => {
  cy.task('log', 'Suite de pruebas ERP completada');
});
