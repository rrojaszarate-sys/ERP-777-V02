/**
 * 📚 Ejemplos Prácticos de Uso del Sistema de Facturas
 */

import { 
  invoiceService, 
  alertService,
  calcularFechaCompromiso,
  diasHastaVencimiento,
  calcularEstadoCobro,
  type Invoice,
  type InvoiceFilters 
} from '@/modules/eventos';

// ========================================
// EJEMPLO 1: Cargar una factura XML
// ========================================
export async function ejemploCargarFactura() {
  // Supongamos que tienes un input file:
  const xmlFile = document.getElementById('xml-input').files[0];
  const eventoId = 'uuid-del-evento';
  
  try {
    const factura = await invoiceService.createFromXML(
      xmlFile,
      eventoId,
      30, // 30 días de crédito
      'Pago contra entrega de proyecto' // Notas opcionales
    );
    
    console.log('✅ Factura creada:');
    console.log('UUID:', factura.uuid_cfdi);
    console.log('Total:', factura.total);
    console.log('Vence el:', factura.fecha_compromiso);
    
    return factura;
  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  }
}

// ========================================
// EJEMPLO 2: Obtener facturas con filtros
// ========================================
export async function ejemploObtenerFacturas() {
  // Caso 1: Todas las facturas del año actual
  const facturasAnio = await invoiceService.getInvoices({
    year: new Date().getFullYear()
  });
  console.log(`📊 ${facturasAnio.length} facturas este año`);
  
  // Caso 2: Facturas pendientes de octubre 2024
  const facturasPendientes = await invoiceService.getInvoices({
    year: 2024,
    month: 10,
    status_cobro: ['pendiente']
  });
  console.log(`⏳ ${facturasPendientes.length} facturas pendientes en octubre`);
  
  // Caso 3: Facturas próximas a vencer (7 días)
  const proximasVencer = await invoiceService.getInvoices({
    proximas_vencer: true
  });
  console.log(`⚠️ ${proximasVencer.length} facturas próximas a vencer`);
  
  // Caso 4: Facturas vencidas
  const vencidas = await invoiceService.getInvoices({
    vencidas: true
  });
  console.log(`🔴 ${vencidas.length} facturas vencidas`);
  
  // Caso 5: Facturas de un cliente específico
  const facturasCliente = await invoiceService.getInvoices({
    cliente: 'Empresa ABC'
  });
  console.log(`👤 ${facturasCliente.length} facturas de Empresa ABC`);
  
  return { facturasAnio, facturasPendientes, proximasVencer, vencidas };
}

// ========================================
// EJEMPLO 3: Obtener estadísticas
// ========================================
export async function ejemploEstadisticas() {
  // Estadísticas del año actual
  const stats = await invoiceService.getStats({
    year: new Date().getFullYear()
  });
  
  console.log('📊 ESTADÍSTICAS DEL AÑO:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`Total facturas: ${stats.total_facturas}`);
  console.log(`Monto total: $${stats.total_monto.toLocaleString()}`);
  console.log('');
  console.log(`✅ Cobradas: ${stats.cobradas} ($${stats.monto_cobrado.toLocaleString()})`);
  console.log(`⏳ Pendientes: ${stats.pendientes} ($${stats.monto_pendiente.toLocaleString()})`);
  console.log(`🔴 Vencidas: ${stats.vencidas} ($${stats.monto_vencido.toLocaleString()})`);
  console.log(`⚠️ Próximas a vencer: ${stats.proximas_vencer}`);
  
  // Calcular eficiencia
  const eficiencia = (stats.cobradas / stats.total_facturas * 100).toFixed(1);
  console.log('');
  console.log(`📈 Eficiencia de cobro: ${eficiencia}%`);
  
  return stats;
}

// ========================================
// EJEMPLO 4: Marcar facturas como cobradas
// ========================================
export async function ejemploMarcarCobrada() {
  const facturaId = 'uuid-de-la-factura';
  
  // Opción 1: Marcar como totalmente cobrada
  const facturaCobrada = await invoiceService.marcarComoCobrado(
    facturaId,
    'Pago recibido por transferencia el 15/10/2024'
  );
  console.log('✅ Factura marcada como cobrada');
  console.log('Estado:', facturaCobrada.status_cobro); // 'cobrado'
  
  // Opción 2: Registrar cobro parcial
  const facturaParcial = await invoiceService.updateCobroStatus(
    facturaId,
    5000, // Monto cobrado (de $10,000 total)
    'Anticipo del 50%'
  );
  console.log('💰 Cobro parcial registrado');
  console.log('Estado:', facturaParcial.status_cobro); // 'parcial'
  console.log('Cobrado:', facturaParcial.monto_cobrado); // 5000
  console.log('Pendiente:', facturaParcial.total - facturaParcial.monto_cobrado); // 5000
  
  return { facturaCobrada, facturaParcial };
}

// ========================================
// EJEMPLO 5: Cancelar una factura
// ========================================
export async function ejemploCancelarFactura() {
  const facturaId = 'uuid-de-la-factura';
  
  const facturaCancelada = await invoiceService.cancelarFactura(
    facturaId,
    'Cliente canceló el proyecto'
  );
  
  console.log('⚫ Factura cancelada');
  console.log('Estado cobro:', facturaCancelada.status_cobro); // 'cancelado'
  console.log('Estado facturación:', facturaCancelada.status_facturacion); // 'cancelado'
  console.log('Notas:', facturaCancelada.notas_cobro);
  
  return facturaCancelada;
}

// ========================================
// EJEMPLO 6: Calcular fechas manualmente
// ========================================
export function ejemploCalculoFechas() {
  // Fecha de emisión de la factura
  const fechaEmision = new Date('2024-10-01');
  
  // Cliente tiene 30 días de crédito
  const diasCredito = 30;
  
  // Calcular fecha de compromiso
  const fechaCompromiso = calcularFechaCompromiso(fechaEmision, diasCredito);
  console.log('📅 Fecha de compromiso:', fechaCompromiso.toLocaleDateString());
  // Output: 31/10/2024
  
  // Calcular días restantes
  const diasRestantes = diasHastaVencimiento(fechaCompromiso);
  console.log('⏱️ Días hasta vencimiento:', diasRestantes);
  // Output: 17 (si hoy es 14/10/2024)
  
  // Calcular estado automático
  const estado = calcularEstadoCobro(fechaCompromiso, 0, 10000);
  console.log('📊 Estado calculado:', estado);
  // Output: 'pendiente' (si no está vencida) o 'vencido' (si ya pasó la fecha)
  
  return { fechaCompromiso, diasRestantes, estado };
}

// ========================================
// EJEMPLO 7: Verificar alertas manualmente
// ========================================
export async function ejemploVerificarAlertas() {
  console.log('🔍 Verificando facturas que necesitan alertas...');
  
  const { previas, compromiso, vencidas } = 
    await alertService.verificarFacturasParaAlertas();
  
  console.log('');
  console.log('📧 ALERTAS A ENVIAR:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`⏰ Alertas previas (3 días antes): ${previas.length}`);
  console.log(`📅 Alertas de compromiso (hoy vence): ${compromiso.length}`);
  console.log(`🔴 Alertas de vencidas: ${vencidas.length}`);
  
  // Ver detalles de las alertas previas
  if (previas.length > 0) {
    console.log('');
    console.log('📋 DETALLE ALERTAS PREVIAS:');
    previas.forEach((factura, index) => {
      console.log(`${index + 1}. ${factura.evento?.clave_evento}`);
      console.log(`   Cliente: ${factura.evento?.cliente?.razon_social}`);
      console.log(`   UUID: ${factura.uuid_cfdi}`);
      console.log(`   Total: $${factura.total.toLocaleString()}`);
      console.log(`   Vence: ${factura.fecha_compromiso}`);
      console.log('');
    });
  }
  
  return { previas, compromiso, vencidas };
}

// ========================================
// EJEMPLO 8: Enviar alertas manualmente
// ========================================
export async function ejemploEnviarAlertas() {
  // 1. Verificar qué facturas necesitan alertas
  const { previas, compromiso, vencidas } = 
    await alertService.verificarFacturasParaAlertas();
  
  // 2. Enviar alertas previas
  if (previas.length > 0) {
    console.log(`📤 Enviando ${previas.length} alertas previas...`);
    const enviadas = await alertService.enviarAlertas(previas, 'previa');
    console.log(`✅ ${enviadas} alertas previas enviadas`);
  }
  
  // 3. Enviar alertas de compromiso
  if (compromiso.length > 0) {
    console.log(`📤 Enviando ${compromiso.length} alertas de compromiso...`);
    const enviadas = await alertService.enviarAlertas(compromiso, 'compromiso');
    console.log(`✅ ${enviadas} alertas de compromiso enviadas`);
  }
  
  // 4. Enviar alertas de vencidas
  if (vencidas.length > 0) {
    console.log(`📤 Enviando ${vencidas.length} alertas de vencidas...`);
    const enviadas = await alertService.enviarAlertas(vencidas, 'vencida');
    console.log(`✅ ${enviadas} alertas de vencidas enviadas`);
  }
  
  console.log('');
  console.log('✅ Proceso de alertas completado');
}

// ========================================
// EJEMPLO 9: Generar contenido de email
// ========================================
export function ejemploGenerarEmail() {
  // Supongamos que tenemos una factura
  const factura: Invoice = {
    id: 'uuid-factura',
    uuid_cfdi: 'ABC123-DEF456-GHI789',
    total: 12500.00,
    fecha_emision: '2024-10-01',
    fecha_compromiso: '2024-10-31',
    serie: 'A',
    folio: '12345',
    notas_cobro: 'Transferencia a cuenta 1234',
    evento: {
      id: 'uuid-evento',
      clave_evento: 'EVT-2024-001',
      nombre_proyecto: 'Desarrollo Web ABC',
      cliente: {
        id: 'uuid-cliente',
        razon_social: 'Empresa XYZ S.A. de C.V.',
        rfc: 'EXY123456ABC',
        email: 'facturacion@empresa.com'
      }
    },
    // ... otros campos
  } as Invoice;
  
  // Generar contenido para alerta previa
  const { subject, html, text } = 
    alertService.generateEmailContent(factura, 'previa');
  
  console.log('📧 CONTENIDO DEL EMAIL:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Asunto:', subject);
  console.log('');
  console.log('Texto plano:');
  console.log(text);
  console.log('');
  console.log('HTML generado (primeros 500 caracteres):');
  console.log(html.substring(0, 500) + '...');
  
  return { subject, html, text };
}

// ========================================
// EJEMPLO 10: Actualizar estados automáticamente
// ========================================
export async function ejemploActualizarEstados() {
  console.log('🔄 Actualizando estados de todas las facturas...');
  
  const facturasActualizadas = 
    await invoiceService.actualizarEstadosAutomaticos();
  
  console.log(`✅ ${facturasActualizadas} facturas actualizadas`);
  console.log('');
  console.log('Estados actualizados:');
  console.log('- Facturas que ahora están vencidas');
  console.log('- Facturas parcialmente cobradas');
  console.log('- Facturas completamente cobradas');
  
  return facturasActualizadas;
}

// ========================================
// EJEMPLO 11: Componente React completo
// ========================================
export function EjemploComponenteReact() {
  const [facturas, setFacturas] = React.useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [filters, setFilters] = React.useState<InvoiceFilters>({
    year: new Date().getFullYear()
  });
  
  React.useEffect(() => {
    loadFacturas();
  }, [filters]);
  
  async function loadFacturas() {
    setIsLoading(true);
    try {
      const data = await invoiceService.getInvoices(filters);
      setFacturas(data);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setIsLoading(false);
    }
  }
  
  async function handleMarcarCobrada(facturaId: string) {
    try {
      await invoiceService.marcarComoCobrado(facturaId);
      loadFacturas(); // Recargar lista
      alert('✅ Factura marcada como cobrada');
    } catch (error) {
      console.error('Error:', error);
      alert('❌ Error al marcar como cobrada');
    }
  }
  
  return (
    <div>
      <h1>Mis Facturas ({facturas.length})</h1>
      
      {/* Filtros */}
      <div>
        <select 
          value={filters.year || ''} 
          onChange={(e) => setFilters({ ...filters, year: parseInt(e.target.value) })}
        >
          <option value="2024">2024</option>
          <option value="2023">2023</option>
        </select>
      </div>
      
      {/* Lista */}
      {isLoading ? (
        <p>Cargando...</p>
      ) : (
        <ul>
          {facturas.map((factura) => (
            <li key={factura.id}>
              <strong>{factura.evento?.clave_evento}</strong>
              <br />
              UUID: {factura.uuid_cfdi}
              <br />
              Total: ${factura.total.toLocaleString()}
              <br />
              Estado: {factura.status_cobro}
              <br />
              <button onClick={() => handleMarcarCobrada(factura.id)}>
                Marcar como cobrada
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ========================================
// EJEMPLO 12: Hook personalizado
// ========================================
export function useInvoices(eventoId?: string) {
  const [facturas, setFacturas] = React.useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<Error | null>(null);
  
  const loadFacturas = React.useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await invoiceService.getInvoices(
        eventoId ? { evento: eventoId } : undefined
      );
      setFacturas(data);
    } catch (err) {
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, [eventoId]);
  
  React.useEffect(() => {
    loadFacturas();
  }, [loadFacturas]);
  
  return {
    facturas,
    isLoading,
    error,
    refetch: loadFacturas
  };
}

// Uso del hook:
// const { facturas, isLoading, refetch } = useInvoices(eventoId);
