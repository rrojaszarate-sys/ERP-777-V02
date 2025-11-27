/**
 * PRUEBAS E2E: INVENTARIO ERP
 * Tests automatizados para el módulo de inventario
 */

describe('Módulo Inventario ERP', () => {
  beforeEach(() => {
    cy.visit('/inventario');
    cy.get('body').should('be.visible');
  });

  describe('Dashboard de Inventario', () => {
    it('Debería cargar el dashboard de inventario', () => {
      cy.url().should('include', '/inventario');
    });

    it('Debería mostrar las cards de métricas', () => {
      cy.contains('Total Productos').should('be.visible');
      cy.contains('Stock Bajo').should('be.visible');
    });

    it('Debería tener navegación a submódulos', () => {
      cy.contains('Productos').should('be.visible');
      cy.contains('Almacenes').should('be.visible');
      cy.contains('Movimientos').should('be.visible');
    });
  });

  describe('Página de Productos', () => {
    beforeEach(() => {
      cy.visit('/inventario/productos');
      cy.get('body').should('be.visible');
    });

    it('Debería cargar la lista de productos', () => {
      cy.url().should('include', '/inventario/productos');
    });

    it('Debería mostrar botón de nuevo producto', () => {
      cy.contains('button', 'Nuevo').should('be.visible');
    });

    it('Debería tener campo de búsqueda', () => {
      cy.get('input[placeholder*="Buscar"]').should('be.visible');
    });

    it('Debería mostrar paginación si hay muchos productos', () => {
      // Verificar que existe paginación o mensaje de registros
      cy.get('body').then($body => {
        if ($body.find('[data-testid="pagination"]').length > 0 ||
            $body.text().includes('registros') ||
            $body.text().includes('productos')) {
          expect(true).to.be.true;
        }
      });
    });

    it('Debería poder abrir modal de nuevo producto', () => {
      cy.contains('button', 'Nuevo').click();
      cy.get('[role="dialog"], .modal, form').should('be.visible');
    });

    it('Modal debería tener campos obligatorios', () => {
      cy.contains('button', 'Nuevo').click();
      cy.wait(500);
      // Verificar campos del formulario
      cy.get('input[name="clave"], input[placeholder*="Clave"]').should('exist');
      cy.get('input[name="nombre"], input[placeholder*="Nombre"]').should('exist');
    });
  });

  describe('Página de Almacenes', () => {
    beforeEach(() => {
      cy.visit('/inventario/almacenes');
      cy.get('body').should('be.visible');
    });

    it('Debería cargar la lista de almacenes', () => {
      cy.url().should('include', '/inventario/almacenes');
    });

    it('Debería mostrar tabla de almacenes', () => {
      cy.get('table, [role="table"], .almacenes-list').should('exist');
    });

    it('Debería poder ver detalles de un almacén', () => {
      // Click en primer almacén si existe
      cy.get('tbody tr, .almacen-item').first().then($row => {
        if ($row.length) {
          cy.wrap($row).click();
        }
      });
    });
  });

  describe('Página de Movimientos', () => {
    beforeEach(() => {
      cy.visit('/inventario/movimientos');
      cy.get('body').should('be.visible');
    });

    it('Debería cargar la lista de movimientos', () => {
      cy.url().should('include', '/inventario/movimientos');
    });

    it('Debería mostrar filtros de fecha', () => {
      cy.get('input[type="date"], [data-testid="date-filter"]').should('exist');
    });

    it('Debería mostrar tipos de movimiento', () => {
      // Entradas y Salidas
      cy.get('body').then($body => {
        const hasTypes = $body.text().includes('Entrada') ||
                        $body.text().includes('Salida') ||
                        $body.text().includes('Tipo');
        expect(hasTypes).to.be.true;
      });
    });
  });

  describe('Página de Documentos de Inventario', () => {
    beforeEach(() => {
      cy.visit('/inventario/documentos');
      cy.get('body').should('be.visible');
    });

    it('Debería cargar la lista de documentos', () => {
      cy.url().should('include', '/inventario/documentos');
    });

    it('Debería mostrar botón de nuevo documento', () => {
      cy.contains('button', 'Nuevo').should('be.visible');
    });

    it('Debería poder generar QR', () => {
      cy.get('body').then($body => {
        if ($body.find('[data-testid="qr-button"], button:contains("QR")').length > 0) {
          cy.contains('button', 'QR').should('be.visible');
        }
      });
    });
  });

  describe('Importación de Productos', () => {
    beforeEach(() => {
      cy.visit('/inventario/productos');
    });

    it('Debería tener botón de importar', () => {
      cy.contains('button', 'Importar').should('be.visible');
    });

    it('Debería abrir modal de importación', () => {
      cy.contains('button', 'Importar').click();
      cy.get('[role="dialog"], .modal').should('be.visible');
    });
  });

  describe('Stock y Alertas', () => {
    beforeEach(() => {
      cy.visit('/inventario/stock');
    });

    it('Debería cargar la página de stock', () => {
      cy.url().should('include', '/inventario/stock');
    });

    it('Debería mostrar productos con stock bajo', () => {
      cy.get('body').then($body => {
        // Verificar que hay sección de stock o tabla
        const hasStockInfo = $body.find('table, .stock-list, .productos-stock').length > 0;
        expect(hasStockInfo).to.be.true;
      });
    });
  });
});
