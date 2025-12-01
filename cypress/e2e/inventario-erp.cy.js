/**
 * PRUEBAS E2E CYPRESS - SISTEMA DE INVENTARIO ERP
 * ================================================
 * 
 * Flujos probados:
 * 1. Alta de productos con código QR/Barras
 * 2. Entrada múltiple de productos
 * 3. Salida múltiple de productos
 * 4. Verificación de stock
 */

describe('Sistema de Inventario ERP - Flujo Completo', () => {
  const TEST_PREFIX = 'CYPRESS_';
  
  beforeEach(() => {
    // Interceptar llamadas a la API
    cy.intercept('GET', '**/rest/v1/productos_erp*').as('getProductos');
    cy.intercept('GET', '**/rest/v1/almacenes_erp*').as('getAlmacenes');
    cy.intercept('GET', '**/rest/v1/movimientos_inventario_erp*').as('getMovimientos');
    cy.intercept('POST', '**/rest/v1/productos_erp*').as('crearProducto');
    cy.intercept('POST', '**/rest/v1/movimientos_inventario_erp*').as('crearMovimiento');
  });

  describe('1. Gestión de Productos', () => {
    beforeEach(() => {
      cy.visit('/inventario-erp/productos');
      cy.wait('@getProductos');
    });

    it('Debería cargar la página de productos', () => {
      cy.contains('Productos').should('be.visible');
      cy.get('[data-testid="productos-table"]').should('exist');
    });

    it('Debería abrir el modal para crear nuevo producto', () => {
      cy.contains('Nuevo Producto').click();
      cy.get('[data-testid="producto-form"]').should('be.visible');
    });

    it('Debería crear un nuevo producto con datos completos', () => {
      cy.contains('Nuevo Producto').click();
      
      // Llenar formulario
      cy.get('input[name="clave"]').type(`${TEST_PREFIX}PROD_001`);
      cy.get('input[name="nombre"]').type('Producto de Prueba Cypress');
      cy.get('textarea[name="descripcion"]').type('Descripción del producto de prueba');
      cy.get('input[name="unidad"]').type('PZA');
      cy.get('input[name="precio_base"]').clear().type('100.00');
      cy.get('input[name="precio_venta"]').clear().type('150.00');
      cy.get('input[name="costo"]').clear().type('75.00');
      
      // Guardar
      cy.contains('Guardar').click();
      cy.wait('@crearProducto');
      
      // Verificar que se creó
      cy.contains('Producto creado exitosamente').should('be.visible');
    });

    it('Debería buscar productos por nombre o código', () => {
      cy.get('input[placeholder*="Buscar"]').type('Prueba');
      cy.wait(500);
      cy.get('[data-testid="productos-table"]').should('contain', 'Prueba');
    });

    it('Debería generar etiquetas QR para productos seleccionados', () => {
      // Seleccionar productos
      cy.get('[data-testid="producto-checkbox"]').first().check();
      
      // Abrir generador de etiquetas
      cy.contains('Etiquetas').click();
      
      // Verificar que abre el modal
      cy.get('[data-testid="label-generator"]').should('be.visible');
      
      // Verificar opciones de código
      cy.contains('QR + Código de Barras').should('be.visible');
      cy.contains('Solo QR').should('be.visible');
      cy.contains('Solo Código de Barras').should('be.visible');
    });
  });

  describe('2. Movimientos de Inventario', () => {
    beforeEach(() => {
      cy.visit('/inventario-erp/movimientos');
      cy.wait('@getMovimientos');
      cy.wait('@getAlmacenes');
    });

    it('Debería cargar la página de movimientos', () => {
      cy.contains('Movimientos').should('be.visible');
    });

    it('Debería registrar una entrada de inventario', () => {
      cy.contains('Nueva Entrada').click();
      
      // Seleccionar almacén
      cy.get('[data-testid="almacen-select"]').click();
      cy.get('[data-testid="almacen-option"]').first().click();
      
      // Agregar producto
      cy.get('[data-testid="agregar-producto"]').click();
      cy.get('[data-testid="producto-select"]').first().click();
      cy.get('[data-testid="producto-option"]').first().click();
      cy.get('input[name="cantidad"]').type('50');
      cy.get('input[name="costo_unitario"]').type('10.00');
      
      // Agregar referencia
      cy.get('input[name="referencia"]').type('ENT-CYP-001');
      
      // Guardar
      cy.contains('Registrar Entrada').click();
      cy.wait('@crearMovimiento');
      
      cy.contains('Entrada registrada exitosamente').should('be.visible');
    });

    it('Debería registrar entrada múltiple de productos', () => {
      cy.contains('Nueva Entrada').click();
      
      // Seleccionar almacén
      cy.get('[data-testid="almacen-select"]').click();
      cy.get('[data-testid="almacen-option"]').first().click();
      
      // Agregar primer producto
      cy.get('[data-testid="agregar-producto"]').click();
      cy.get('[data-testid="producto-select"]').eq(0).click();
      cy.get('[data-testid="producto-option"]').first().click();
      cy.get('input[name="cantidad"]').eq(0).type('100');
      cy.get('input[name="costo_unitario"]').eq(0).type('5.00');
      
      // Agregar segundo producto
      cy.get('[data-testid="agregar-producto"]').click();
      cy.get('[data-testid="producto-select"]').eq(1).click();
      cy.get('[data-testid="producto-option"]').eq(1).click();
      cy.get('input[name="cantidad"]').eq(1).type('200');
      cy.get('input[name="costo_unitario"]').eq(1).type('15.00');
      
      // Agregar tercer producto
      cy.get('[data-testid="agregar-producto"]').click();
      cy.get('[data-testid="producto-select"]').eq(2).click();
      cy.get('[data-testid="producto-option"]').eq(2).click();
      cy.get('input[name="cantidad"]').eq(2).type('50');
      cy.get('input[name="costo_unitario"]').eq(2).type('25.00');
      
      // Verificar que hay 3 productos
      cy.get('[data-testid="producto-row"]').should('have.length', 3);
      
      // Guardar entrada múltiple
      cy.get('input[name="referencia"]').type('ENT-MULTIPLE-001');
      cy.contains('Registrar Entrada').click();
      
      // Debe crear 3 movimientos
      cy.wait('@crearMovimiento').its('request.body').should('have.length', 3);
      
      cy.contains('Entrada registrada exitosamente').should('be.visible');
    });

    it('Debería registrar salida múltiple de productos', () => {
      cy.contains('Nueva Salida').click();
      
      // Seleccionar almacén
      cy.get('[data-testid="almacen-select"]').click();
      cy.get('[data-testid="almacen-option"]').first().click();
      
      // Agregar productos usando escáner o búsqueda
      cy.get('[data-testid="buscar-producto"]').type('Producto');
      cy.get('[data-testid="producto-resultado"]').first().click();
      cy.get('input[name="cantidad"]').eq(0).type('10');
      
      cy.get('[data-testid="buscar-producto"]').clear().type('Cable');
      cy.get('[data-testid="producto-resultado"]').first().click();
      cy.get('input[name="cantidad"]').eq(1).type('25');
      
      // Verificar productos agregados
      cy.get('[data-testid="producto-row"]').should('have.length', 2);
      
      // Registrar salida
      cy.get('input[name="referencia"]').type('SAL-MULTIPLE-001');
      cy.get('textarea[name="concepto"]').type('Salida por venta');
      cy.contains('Registrar Salida').click();
      
      cy.contains('Salida registrada exitosamente').should('be.visible');
    });

    it('Debería filtrar movimientos por tipo', () => {
      cy.get('[data-testid="filtro-tipo"]').click();
      cy.contains('Entradas').click();
      cy.wait('@getMovimientos');
      
      cy.get('[data-testid="movimiento-row"]').each(($row) => {
        cy.wrap($row).should('contain', 'entrada');
      });
    });

    it('Debería filtrar movimientos por fecha', () => {
      const hoy = new Date().toISOString().split('T')[0];
      
      cy.get('input[name="fecha_inicio"]').type(hoy);
      cy.get('input[name="fecha_fin"]').type(hoy);
      cy.contains('Aplicar Filtros').click();
      
      cy.wait('@getMovimientos');
    });
  });

  describe('3. Escáner QR/Código de Barras', () => {
    beforeEach(() => {
      cy.visit('/inventario-erp/movimientos');
    });

    it('Debería abrir el escáner de códigos', () => {
      cy.contains('Nueva Entrada').click();
      cy.get('[data-testid="btn-escanear"]').click();
      
      // Verificar que abre el modal del escáner
      cy.get('[data-testid="qr-scanner"]').should('be.visible');
      
      // Verificar opciones de modo
      cy.contains('Todos').should('be.visible');
      cy.contains('QR').should('be.visible');
      cy.contains('Barras').should('be.visible');
    });

    it('Debería permitir entrada manual de código', () => {
      cy.contains('Nueva Entrada').click();
      cy.get('[data-testid="btn-escanear"]').click();
      
      // Ingresar código manualmente
      cy.get('input[placeholder*="Código del producto"]').type('PROD_0001');
      cy.contains('Agregar').click();
      
      // Verificar que agrega el producto
      cy.get('[data-testid="producto-row"]').should('exist');
    });

    it('Debería cambiar entre modos de escaneo', () => {
      cy.contains('Nueva Entrada').click();
      cy.get('[data-testid="btn-escanear"]').click();
      
      // Cambiar a modo solo código de barras
      cy.contains('Barras').click();
      cy.get('[data-testid="scanner-title"]').should('contain', 'Código de Barras');
      
      // Cambiar a modo solo QR
      cy.contains('QR').click();
      cy.get('[data-testid="scanner-title"]').should('contain', 'QR');
      
      // Cambiar a modo todos
      cy.contains('Todos').click();
    });
  });

  describe('4. Kardex y Reportes', () => {
    beforeEach(() => {
      cy.visit('/inventario-erp/kardex');
    });

    it('Debería mostrar el kardex de un producto', () => {
      // Seleccionar producto
      cy.get('[data-testid="producto-select"]').click();
      cy.get('[data-testid="producto-option"]').first().click();
      
      cy.wait('@getMovimientos');
      
      // Verificar que muestra movimientos
      cy.get('[data-testid="kardex-table"]').should('be.visible');
      cy.get('[data-testid="kardex-row"]').should('have.length.greaterThan', 0);
    });

    it('Debería calcular correctamente el stock en kardex', () => {
      cy.get('[data-testid="producto-select"]').click();
      cy.get('[data-testid="producto-option"]').first().click();
      
      cy.wait('@getMovimientos');
      
      // Verificar columna de saldo
      cy.get('[data-testid="kardex-saldo"]').last().then(($saldo) => {
        const saldo = parseInt($saldo.text());
        expect(saldo).to.be.gte(0);
      });
    });

    it('Debería exportar kardex a PDF', () => {
      cy.get('[data-testid="producto-select"]').click();
      cy.get('[data-testid="producto-option"]').first().click();
      
      cy.wait('@getMovimientos');
      
      cy.contains('Exportar PDF').click();
      
      // Verificar descarga
      cy.readFile('cypress/downloads/kardex_*.pdf').should('exist');
    });
  });

  describe('5. Stock y Alertas', () => {
    beforeEach(() => {
      cy.visit('/inventario-erp/stock');
    });

    it('Debería mostrar el stock actual por almacén', () => {
      cy.wait('@getAlmacenes');
      
      // Seleccionar almacén
      cy.get('[data-testid="almacen-select"]').click();
      cy.get('[data-testid="almacen-option"]').first().click();
      
      // Verificar tabla de stock
      cy.get('[data-testid="stock-table"]').should('be.visible');
    });

    it('Debería mostrar productos con stock bajo', () => {
      cy.get('[data-testid="filtro-stock-bajo"]').click();
      
      // Verificar que filtra productos con stock bajo
      cy.get('[data-testid="stock-row"]').each(($row) => {
        cy.wrap($row).find('[data-testid="stock-cantidad"]').invoke('text').then((text) => {
          const stock = parseInt(text);
          expect(stock).to.be.lte(10); // Asumiendo que stock bajo es <= 10
        });
      });
    });

    it('Debería mostrar productos sin stock', () => {
      cy.get('[data-testid="filtro-sin-stock"]').click();
      
      cy.get('[data-testid="stock-row"]').each(($row) => {
        cy.wrap($row).find('[data-testid="stock-cantidad"]').should('contain', '0');
      });
    });
  });

  describe('6. Generador de Etiquetas', () => {
    beforeEach(() => {
      cy.visit('/inventario-erp/productos');
      cy.wait('@getProductos');
    });

    it('Debería generar etiquetas con QR', () => {
      // Seleccionar productos
      cy.get('[data-testid="producto-checkbox"]').first().check();
      cy.get('[data-testid="producto-checkbox"]').eq(1).check();
      
      // Abrir generador
      cy.contains('Etiquetas').click();
      
      // Seleccionar solo QR
      cy.contains('Solo QR').click();
      
      // Configurar copias
      cy.get('input[name="copias"]').clear().type('2');
      
      // Generar PDF
      cy.contains('Generar PDF').click();
      
      // Verificar que se genera
      cy.contains('Generando...').should('not.exist');
    });

    it('Debería generar etiquetas con código de barras', () => {
      cy.get('[data-testid="producto-checkbox"]').first().check();
      
      cy.contains('Etiquetas').click();
      
      // Seleccionar solo código de barras
      cy.contains('Solo Código de Barras').click();
      
      // Seleccionar formato CODE128
      cy.get('select[name="barcode-format"]').select('CODE128');
      
      cy.contains('Generar PDF').click();
    });

    it('Debería generar etiquetas con QR + Código de barras', () => {
      cy.get('[data-testid="producto-checkbox"]').first().check();
      cy.get('[data-testid="producto-checkbox"]').eq(1).check();
      cy.get('[data-testid="producto-checkbox"]').eq(2).check();
      
      cy.contains('Etiquetas').click();
      
      // Seleccionar ambos
      cy.contains('QR + Código de Barras').click();
      
      // Mostrar precio
      cy.get('input[name="mostrar-precio"]').check();
      
      // Formato térmico
      cy.contains('Térmico').click();
      
      cy.contains('Generar PDF').click();
    });
  });
});

// Comandos personalizados para inventario
Cypress.Commands.add('loginInventario', () => {
  cy.visit('/login');
  cy.get('input[name="email"]').type(Cypress.env('TEST_EMAIL'));
  cy.get('input[name="password"]').type(Cypress.env('TEST_PASSWORD'));
  cy.contains('Iniciar Sesión').click();
  cy.url().should('not.include', '/login');
});

Cypress.Commands.add('agregarProductoAlMovimiento', (codigo, cantidad, costoUnitario = null) => {
  cy.get('[data-testid="buscar-producto"]').type(codigo);
  cy.get('[data-testid="producto-resultado"]').first().click();
  cy.get('input[name="cantidad"]').last().clear().type(String(cantidad));
  if (costoUnitario) {
    cy.get('input[name="costo_unitario"]').last().clear().type(String(costoUnitario));
  }
});

Cypress.Commands.add('verificarStock', (productoClave, stockEsperado) => {
  cy.visit('/inventario-erp/stock');
  cy.get('[data-testid="buscar-producto"]').type(productoClave);
  cy.get('[data-testid="stock-cantidad"]').should('contain', String(stockEsperado));
});
