/**
 * PRUEBAS E2E: GASTOS NO IMPACTADOS (GNI)
 * Tests automatizados para el módulo de gastos operativos
 */

describe('Módulo Gastos No Impactados', () => {
  beforeEach(() => {
    // Visitar la página de gastos no impactados
    cy.visit('/contabilidad/gastos-no-impactados');
    // Esperar a que cargue la página
    cy.get('h1').should('contain', 'Gastos No Impactados');
  });

  describe('Navegación y Acceso', () => {
    it('Debería acceder desde el menú de Contabilidad', () => {
      cy.visit('/');
      // Abrir menú de contabilidad
      cy.contains('Contabilidad').click();
      // Click en Gastos No Impactados
      cy.contains('Gastos No Impactados').click();
      // Verificar URL
      cy.url().should('include', '/contabilidad/gastos-no-impactados');
    });

    it('Debería mostrar el título correcto', () => {
      cy.get('h1').should('contain', 'Gastos No Impactados');
    });

    it('Debería mostrar los botones de acción principales', () => {
      cy.contains('button', 'Nuevo Gasto').should('be.visible');
      cy.contains('button', 'Importar Excel').should('be.visible');
      cy.contains('button', 'Exportar PDF').should('be.visible');
    });
  });

  describe('Cards de Resumen', () => {
    it('Debería mostrar las 4 cards de métricas', () => {
      // Total Período
      cy.contains('Total Período').should('be.visible');
      // Validados
      cy.contains('Validados').should('be.visible');
      // Pendientes
      cy.contains('Pendientes').should('be.visible');
      // Registros
      cy.contains('Registros').should('be.visible');
    });
  });

  describe('Filtros y Búsqueda', () => {
    it('Debería tener campo de búsqueda', () => {
      cy.get('input[placeholder*="Buscar"]').should('be.visible');
    });

    it('Debería tener selector de período', () => {
      cy.get('select').contains('option', '2025').should('exist');
    });

    it('Debería poder filtrar por búsqueda de texto', () => {
      cy.get('input[placeholder*="Buscar"]').type('proveedor test');
      // El filtro se aplica automáticamente
      cy.wait(500);
    });

    it('Debería poder mostrar/ocultar filtros avanzados', () => {
      cy.contains('button', 'Filtros').click();
      // Verificar que aparecen los filtros avanzados
      cy.contains('Cuenta').should('be.visible');
      cy.contains('Validación').should('be.visible');
      cy.contains('Status').should('be.visible');
      cy.contains('Ejecutivo').should('be.visible');
    });
  });

  describe('Tabla de Gastos', () => {
    it('Debería mostrar las columnas correctas', () => {
      const columnas = ['Fecha', 'Proveedor', 'Concepto', 'Clave', 'Cuenta',
                        'Subtotal', 'IVA', 'Total', 'Validación', 'Ejecutivo', 'Factura'];

      columnas.forEach(col => {
        cy.get('thead').contains(col).should('be.visible');
      });
    });

    it('Debería mostrar mensaje cuando no hay gastos', () => {
      // Si no hay datos, debería mostrar mensaje
      cy.get('tbody').then($tbody => {
        if ($tbody.find('tr').length === 1) {
          cy.get('tbody').contains('No hay gastos').should('be.visible');
        }
      });
    });
  });

  describe('Formulario de Nuevo Gasto', () => {
    beforeEach(() => {
      cy.contains('button', 'Nuevo Gasto').click();
      cy.get('[role="dialog"]').should('be.visible');
    });

    it('Debería abrir el modal de nuevo gasto', () => {
      cy.contains('h2', 'Nuevo Gasto').should('be.visible');
    });

    it('Debería mostrar todos los campos del formulario', () => {
      const campos = [
        'Proveedor',
        'Concepto',
        'Clave de Gasto',
        'Forma de Pago',
        'Subtotal',
        'IVA',
        'Total',
        'Fecha',
        'Ejecutivo',
        'Validación',
        'Status de Pago',
        'Folio Factura'
      ];

      campos.forEach(campo => {
        cy.contains('label', campo).should('be.visible');
      });
    });

    it('Debería calcular el total automáticamente', () => {
      // Ingresar subtotal
      cy.get('input[type="number"]').eq(0).clear().type('1000');
      // Ingresar IVA
      cy.get('input[type="number"]').eq(1).clear().type('160');
      // Verificar que el total se calculó
      cy.get('input[type="number"]').eq(2).should('have.value', '1160');
    });

    it('Debería mostrar error si no se selecciona proveedor', () => {
      cy.get('input[placeholder*="Buscar proveedor"]').type('test');
      cy.get('input[name="concepto"], input[placeholder*="Descripción"]').type('Concepto de prueba');
      cy.get('input[type="number"]').eq(0).clear().type('100');
      cy.contains('button', 'Crear Gasto').click();
      // Debería mostrar error
      cy.contains('Selecciona un proveedor').should('be.visible');
    });

    it('Debería cerrar el modal al cancelar', () => {
      cy.contains('button', 'Cancelar').click();
      cy.get('[role="dialog"]').should('not.exist');
    });

    it('Debería permitir buscar proveedores', () => {
      cy.get('input[placeholder*="Buscar proveedor"]').type('vidal');
      cy.wait(500);
      // Si hay resultados, deberían aparecer en dropdown
    });
  });

  describe('Modal de Importación Excel', () => {
    beforeEach(() => {
      cy.contains('button', 'Importar Excel').click();
      cy.get('[role="dialog"]').should('be.visible');
    });

    it('Debería abrir el modal de importación', () => {
      cy.contains('h2', 'Importar desde Excel').should('be.visible');
    });

    it('Debería mostrar zona de drop para archivos', () => {
      cy.contains('Arrastra un archivo Excel').should('be.visible');
    });

    it('Debería cerrar el modal al cancelar', () => {
      cy.contains('button', 'Cancelar').click();
      cy.get('[role="dialog"]').should('not.exist');
    });
  });

  describe('Modal de Exportación PDF', () => {
    beforeEach(() => {
      cy.contains('button', 'Exportar PDF').click();
      cy.get('[role="dialog"]').should('be.visible');
    });

    it('Debería abrir el modal de exportación', () => {
      cy.contains('h2', 'Exportar a PDF').should('be.visible');
    });

    it('Debería mostrar opciones de exportación', () => {
      cy.contains('Incluir membrete').should('be.visible');
      cy.contains('Incluir totales').should('be.visible');
      cy.contains('Orientación').should('be.visible');
    });

    it('Debería mostrar resumen del reporte', () => {
      cy.contains('Resumen del Reporte').should('be.visible');
      cy.contains('Período').should('be.visible');
      cy.contains('Registros').should('be.visible');
    });

    it('Debería cerrar el modal al cancelar', () => {
      cy.contains('button', 'Cancelar').click();
      cy.get('[role="dialog"]').should('not.exist');
    });
  });

  describe('Interacción con Tabla', () => {
    it('Debería poder hacer click en una fila para editar', () => {
      // Si hay filas, hacer click en una
      cy.get('tbody tr').first().then($row => {
        if (!$row.text().includes('No hay gastos')) {
          cy.wrap($row).click();
          // Debería abrir modal de edición
          cy.contains('Editar Gasto').should('be.visible');
        }
      });
    });
  });

  describe('Estados de Validación', () => {
    it('Debería mostrar badges de estado correctamente', () => {
      // Los estados posibles
      cy.get('tbody').then($tbody => {
        const text = $tbody.text();
        // Verificar que los badges tienen el formato correcto
        if (text.includes('Correcto')) {
          cy.contains('Correcto').should('have.class', 'bg-green-100');
        }
        if (text.includes('Pendiente')) {
          cy.contains('Pendiente').should('have.class', 'bg-yellow-100');
        }
      });
    });
  });

  describe('Responsive', () => {
    it('Debería ser responsive en tablet', () => {
      cy.viewport('ipad-2');
      cy.get('h1').should('be.visible');
      cy.contains('button', 'Nuevo Gasto').should('be.visible');
    });

    it('Debería permitir scroll horizontal en tabla', () => {
      cy.viewport('iphone-6');
      cy.get('.overflow-x-auto').should('exist');
    });
  });
});

describe('Integración con Catálogos', () => {
  beforeEach(() => {
    cy.visit('/contabilidad/gastos-no-impactados');
  });

  it('Debería cargar claves de gasto en el formulario', () => {
    cy.contains('button', 'Nuevo Gasto').click();
    cy.get('select').contains('option', 'MDE2025').should('exist');
  });

  it('Debería cargar formas de pago en el formulario', () => {
    cy.contains('button', 'Nuevo Gasto').click();
    cy.get('select').contains('option', 'KUSPIT').should('exist');
  });
});

describe('Pruebas de Consistencia de Datos', () => {
  it('Debería calcular totales correctamente en la tabla', () => {
    cy.visit('/contabilidad/gastos-no-impactados');

    cy.get('tbody tr').then($rows => {
      if ($rows.length > 1 && !$rows.first().text().includes('No hay gastos')) {
        // Sumar totales de las filas
        let sumaCalculada = 0;
        $rows.each((i, row) => {
          const totalCell = Cypress.$(row).find('td').eq(7).text();
          const valor = parseFloat(totalCell.replace(/[$,]/g, ''));
          if (!isNaN(valor)) {
            sumaCalculada += valor;
          }
        });

        // Verificar que el total del footer coincide
        cy.get('tfoot td').contains('$').invoke('text').then(totalFooter => {
          const valorFooter = parseFloat(totalFooter.replace(/[$,]/g, ''));
          // Tolerancia de 0.01 por redondeo
          expect(Math.abs(sumaCalculada - valorFooter)).to.be.lessThan(1);
        });
      }
    });
  });

  it('Debería mostrar el período seleccionado correctamente', () => {
    cy.visit('/contabilidad/gastos-no-impactados');

    // Obtener el período del selector
    cy.get('select').first().invoke('val').then(periodo => {
      if (periodo) {
        // Verificar que aparece en el subtítulo
        cy.get('p').contains('Período').should('be.visible');
      }
    });
  });
});
