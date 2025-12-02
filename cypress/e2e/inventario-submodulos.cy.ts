/**
 * Pruebas automatizadas para los submódulos de inventario
 * Verifica que cada página cargue correctamente
 */

describe('Submódulos de Inventario', () => {
  beforeEach(() => {
    // Visitar la página principal y autenticarse si es necesario
    cy.visit('/');
    // Esperar a que cargue el dashboard principal
    cy.get('body').should('be.visible');
  });

  describe('Módulos Básicos', () => {
    it('Productos - Carga correctamente', () => {
      cy.visit('/inventario/productos');
      cy.contains('Productos').should('be.visible');
      // Verificar que la tabla o lista se renderice
      cy.get('[class*="table"], [class*="grid"]').should('exist');
    });

    it('Almacenes - Carga correctamente', () => {
      cy.visit('/inventario/almacenes');
      cy.contains('Almacen').should('be.visible');
    });

    it('Stock - Carga correctamente', () => {
      cy.visit('/inventario/stock');
      cy.contains('Stock').should('be.visible');
    });

    it('Movimientos - Carga correctamente', () => {
      cy.visit('/inventario/movimientos');
      cy.contains('Movimiento').should('be.visible');
    });

    it('Documentos - Carga correctamente', () => {
      cy.visit('/inventario/documentos');
      cy.contains('Documento').should('be.visible');
    });

    it('Etiquetas - Carga correctamente', () => {
      cy.visit('/inventario/etiquetas');
      cy.contains('Etiqueta').should('be.visible');
    });
  });

  describe('Módulos Avanzados', () => {
    it('Transferencias - Carga correctamente', () => {
      cy.visit('/inventario/transferencias');
      cy.contains('Transferencia').should('be.visible');
      // Verificar botón de nueva transferencia
      cy.contains(/Nueva|Crear/).should('be.visible');
    });

    it('Kardex - Carga correctamente', () => {
      cy.visit('/inventario/kardex');
      cy.contains('Kardex').should('be.visible');
      // Verificar filtros
      cy.get('select, input[type="text"]').should('exist');
    });

    it('Valuación - Carga correctamente', () => {
      cy.visit('/inventario/valuacion');
      cy.contains('Valuación').should('be.visible');
      // Verificar KPIs
      cy.get('[class*="card"], [class*="kpi"]').should('exist');
    });

    it('Punto de Reorden - Carga correctamente', () => {
      cy.visit('/inventario/reorden');
      cy.contains(/Reorden|Stock Bajo/).should('be.visible');
    });

    it('Ubicaciones - Carga correctamente', () => {
      cy.visit('/inventario/ubicaciones');
      cy.contains('Ubicaci').should('be.visible');
    });

    it('Lotes - Carga correctamente', () => {
      cy.visit('/inventario/lotes');
      cy.contains('Lote').should('be.visible');
    });

    it('Conteos - Carga correctamente', () => {
      cy.visit('/inventario/conteos');
      cy.contains('Conteo').should('be.visible');
    });
  });

  describe('Módulos Especializados', () => {
    it('Reservas - Carga correctamente', () => {
      cy.visit('/inventario/reservas');
      cy.contains('Reserva').should('be.visible');
    });

    it('Kits de Evento - Carga correctamente', () => {
      cy.visit('/inventario/kits');
      cy.contains('Kit').should('be.visible');
    });

    it('Checklists - Carga correctamente', () => {
      cy.visit('/inventario/checklists');
      cy.contains('Checklist').should('be.visible');
    });

    it('Alertas - Carga correctamente', () => {
      cy.visit('/inventario/alertas');
      cy.contains('Alerta').should('be.visible');
    });
  });

  describe('Configuración', () => {
    it('Configuración de Inventario - Carga correctamente', () => {
      cy.visit('/inventario/configuracion');
      cy.contains('Configuración').should('be.visible');
      // Verificar que muestra los submódulos
      cy.contains('Productos').should('exist');
      cy.contains('Transferencias').should('exist');
    });

    it('Permite habilitar/deshabilitar módulos', () => {
      cy.visit('/inventario/configuracion');
      // Buscar botón de toggle
      cy.get('button').contains(/eye/i).first().should('be.visible');
    });

    it('Filtra por tipo de almacén', () => {
      cy.visit('/inventario/configuracion');
      cy.contains('Todos').click();
      // Verificar que cambia la visualización
      cy.contains('general').should('exist');
    });
  });
});

describe('Funcionalidad de Transferencias', () => {
  beforeEach(() => {
    cy.visit('/inventario/transferencias');
  });

  it('Muestra lista de transferencias', () => {
    cy.get('table, [class*="list"]').should('exist');
  });

  it('Puede abrir modal de nueva transferencia', () => {
    cy.contains(/Nueva|Crear/).click();
    cy.get('[class*="modal"]').should('be.visible');
  });

  it('Muestra estados de transferencia correctos', () => {
    cy.contains(/Borrador|En Tránsito|Recibida/).should('exist');
  });
});

describe('Funcionalidad de Kardex', () => {
  beforeEach(() => {
    cy.visit('/inventario/kardex');
  });

  it('Permite seleccionar producto', () => {
    cy.get('select').first().should('be.visible');
  });

  it('Muestra tabla de movimientos', () => {
    cy.get('table').should('exist');
  });

  it('Permite filtrar por fecha', () => {
    cy.get('input[type="date"]').should('exist');
  });
});

describe('Funcionalidad de Valuación', () => {
  beforeEach(() => {
    cy.visit('/inventario/valuacion');
  });

  it('Muestra total de inventario', () => {
    cy.contains(/Valor Total|\$/).should('exist');
  });

  it('Permite cambiar método de valuación', () => {
    cy.contains(/Promedio|PEPS|UEPS/).should('exist');
  });

  it('Muestra análisis ABC', () => {
    cy.contains(/ABC|Clasificación/).should('exist');
  });
});

describe('Funcionalidad de Punto de Reorden', () => {
  beforeEach(() => {
    cy.visit('/inventario/reorden');
  });

  it('Muestra productos bajo mínimo', () => {
    cy.get('table, [class*="card"]').should('exist');
  });

  it('Muestra indicadores de urgencia', () => {
    cy.contains(/Crítico|Urgente|días/).should('exist');
  });

  it('Permite generar requisición', () => {
    cy.contains(/Requisición|Generar/).should('exist');
  });
});
