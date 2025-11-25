# 🎯 GUÍA RÁPIDA DE INTEGRACIÓN

## Para integrar el sistema de facturas en un evento existente:

### 1. Importar en tu página de evento

```typescript
import { FacturasPage } from '@/modules/eventos';

// Dentro de tu componente EventoDetailPage:
<Tabs>
  <Tab key="general" title="General">
    {/* ... contenido existente ... */}
  </Tab>
  
  <Tab key="facturas" title="📋 Facturas">
    <FacturasPage eventoId={eventoId} />
  </Tab>
</Tabs>
```

### 2. O usar componentes individuales

```typescript
import { 
  InvoiceUploadModal,
  InvoiceList,
  InvoiceDashboard,
  invoiceService 
} from '@/modules/eventos';

// Modal de carga
<InvoiceUploadModal
  isOpen={isOpen}
  onClose={onClose}
  eventoId={eventoId}
  onSuccess={(invoice) => {
    console.log('Factura cargada:', invoice);
    // Refrescar lista...
  }}
/>

// Lista de facturas
<InvoiceList 
  eventoId={eventoId}
  refreshTrigger={refreshKey}
/>

// Dashboard de estadísticas
<InvoiceDashboard 
  filters={{ year: 2024, month: 10 }}
/>
```

### 3. Usar servicios directamente

```typescript
import { invoiceService, alertService } from '@/modules/eventos';

// Cargar factura desde XML
const factura = await invoiceService.createFromXML(
  xmlFile,
  eventoId,
  30, // días de crédito
  'Notas adicionales'
);

// Obtener facturas con filtros
const facturas = await invoiceService.getInvoices({
  year: 2024,
  status_cobro: ['pendiente', 'vencido'],
  proximas_vencer: true
});

// Marcar como cobrada
await invoiceService.marcarComoCobrado(facturaId, 'Pago recibido');

// Ver estadísticas
const stats = await invoiceService.getStats({ year: 2024 });

// Verificar alertas (manualmente)
const { previas, compromiso, vencidas } = 
  await alertService.verificarFacturasParaAlertas();
```

### 4. Ejemplo de integración completa

```typescript
// EventoDetailPage.tsx
import React, { useState } from 'react';
import { Tabs, Tab } from '@nextui-org/react';
import { FacturasPage } from '@/modules/eventos';

export default function EventoDetailPage({ params }) {
  const eventoId = params.id;
  
  return (
    <div className="container mx-auto p-6">
      <Tabs>
        <Tab key="general" title="General">
          {/* Info del evento */}
        </Tab>
        
        <Tab key="gastos" title="Gastos">
          {/* Gestión de gastos */}
        </Tab>
        
        <Tab key="facturas" title="Facturas XML">
          <FacturasPage eventoId={eventoId} />
        </Tab>
      </Tabs>
    </div>
  );
}
```

## ✅ Checklist de Integración

- [ ] Importar componentes necesarios
- [ ] Agregar tab o sección de facturas
- [ ] Probar carga de XML
- [ ] Verificar que los datos se guardan correctamente
- [ ] Configurar cron job (ver SISTEMA_FACTURAS_XML_COMPLETADO.md)
- [ ] Configurar servicio de email
- [ ] Probar flujo completo con factura real

## 🔥 Características Listas para Usar

✅ Carga y parseo automático de XML CFDI
✅ Extracción de todos los campos SAT
✅ Cálculo automático de fecha de vencimiento
✅ Dashboard con estadísticas en tiempo real
✅ Lista con filtros avanzados
✅ Seguimiento de estado de cobro
✅ Sistema de alertas automáticas
✅ Generación de emails HTML
✅ Cron job para verificación diaria
✅ Totalmente tipado con TypeScript
✅ Responsive y tema oscuro

## 🚀 ¡Listo para Producción!

Solo falta configurar el servicio de email (Resend) y desplegar.
