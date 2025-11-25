#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';

// ============================================================
// CONFIGURACIÓN
// ============================================================

const supabase = createClient(
  'https://gomnouwackzvthpwyric.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdvbW5vdXdhY2t6dnRocHd5cmljIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTEwMjk4MywiZXhwIjoyMDc0Njc4OTgzfQ.prdLfUMwgzMctf9xdwnNyilAIpbP1vUiGFyvIbFecLU',
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

const CONFIG = {
  NUM_EVENTOS: 100,  // Eventos a crear
  GASTOS_POR_EVENTO: 5,
  INGRESOS_POR_EVENTO: 3,
  MARGEN_MIN: 30,
  MARGEN_MAX: 45,
  PORCENTAJE_COBRADO: 85,
  PORCENTAJE_PAGADO: 90,
};

console.log(`
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║    GENERADOR RÁPIDO DE DATOS - ERP 777                       ║
║    ${CONFIG.NUM_EVENTOS} eventos con ingresos y gastos                       ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
`);

// ============================================================
// FUNCIONES AUXILIARES
// ============================================================

function random(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomFloat(min, max) {
  return Math.random() * (max - min) + min;
}

function randomDate(year) {
  const start = new Date(year, 0, 1);
  const end = new Date(year, 11, 31);
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

function formatCurrency(amount) {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN'
  }).format(amount);
}

function randomElement(array) {
  return array[random(0, array.length - 1)];
}

// ============================================================
// PASO 1: OBTENER CATÁLOGOS
// ============================================================

async function obtenerCatalogos() {
  console.log('📚 Obteniendo catálogos...\n');
  
  const { data: clientes } = await supabase.from('evt_clientes').select('id, razon_social');
  const { data: tipos } = await supabase.from('evt_tipos_evento').select('id, nombre');
  const { data: estados } = await supabase.from('evt_estados').select('id, nombre');
  const { data: cuentas } = await supabase.from('evt_cuentas_bancarias').select('id, nombre');
  const { data: catGastos } = await supabase.from('evt_categorias_gastos').select('id, nombre');
  const { data: catIngresos } = await supabase.from('evt_categorias_ingresos').select('id, nombre');
  
  console.log(`   ✓ Clientes: ${clientes?.length || 0}`);
  console.log(`   ✓ Tipos de evento: ${tipos?.length || 0}`);
  console.log(`   ✓ Estados: ${estados?.length || 0}`);
  console.log(`   ✓ Cuentas bancarias: ${cuentas?.length || 0}`);
  console.log(`   ✓ Categorías gastos: ${catGastos?.length || 0}`);
  console.log(`   ✓ Categorías ingresos: ${catIngresos?.length || 0}\n`);
  
  if (!clientes?.length) {
    console.log('❌ No hay clientes. Creando clientes de ejemplo...\n');
    await crearClientesEjemplo();
    return obtenerCatalogos();
  }
  
  if (!cuentas?.length || !catGastos?.length || !catIngresos?.length) {
    console.log('❌ ERROR: Faltan catálogos necesarios');
    process.exit(1);
  }
  
  return { clientes, tipos, estados, cuentas, catGastos, catIngresos };
}

async function crearClientesEjemplo() {
  const clientes = [
    { razon_social: 'Grupo Empresarial ACME SA de CV', rfc: 'GEA850101XXX', email: 'contacto@acme.com' },
    { razon_social: 'Corporativo Global SA de CV', rfc: 'CGS900215YYY', email: 'info@global.com' },
    { razon_social: 'Innovatech Solutions SA de CV', rfc: 'INS950320ZZZ', email: 'ventas@innovatech.com' },
    { razon_social: 'MegaCorp Internacional SA de CV', rfc: 'MEI880410AAA', email: 'contacto@megacorp.com' },
    { razon_social: 'Prime Events & More SA de CV', rfc: 'PEM920525BBB', email: 'eventos@prime.com' },
  ];
  
  for (const cliente of clientes) {
    await supabase.from('evt_clientes').insert({
      razon_social: cliente.razon_social,
      nombre_comercial: cliente.razon_social,
      rfc: cliente.rfc,
      email: cliente.email,
      telefono: `55${random(1000, 9999)}${random(1000, 9999)}`,
      regimen_fiscal: '601',
      uso_cfdi: 'G03',
      metodo_pago: 'PPD',
      forma_pago: '03',
    });
  }
  
  console.log('✅ 5 clientes creados\n');
}

// ============================================================
// PASO 2: GENERAR EVENTOS EN LOTES
// ============================================================

async function generarEventos(catalogos) {
  console.log(`📅 Generando ${CONFIG.NUM_EVENTOS} eventos...\n`);
  
  const eventos = [];
  const year = 2024;
  
  for (let i = 0; i < CONFIG.NUM_EVENTOS; i++) {
    const fecha = randomDate(year);
    const fechaFin = new Date(fecha);
    fechaFin.setDate(fechaFin.getDate() + random(1, 3));
    
    eventos.push({
      clave_evento: `EVT-${year}-${String(i + 1).padStart(4, '0')}`,
      nombre_proyecto: `Evento ${i + 1} - ${randomElement(['Conferencia', 'Congreso', 'Exposición', 'Seminario', 'Workshop'])}`,
      descripcion: `Evento empresarial ${i + 1}`,
      cliente_id: randomElement(catalogos.clientes).id,
      tipo_evento_id: randomElement(catalogos.tipos).id,
      estado_id: randomElement(catalogos.estados).id,
      fecha_evento: fecha.toISOString().split('T')[0],
      fecha_fin: fechaFin.toISOString().split('T')[0],
      presupuesto_estimado: randomFloat(80000, 250000),
    });
  }
  
  // Insertar en lotes de 50
  const batchSize = 50;
  let eventosCreados = [];
  
  for (let i = 0; i < eventos.length; i += batchSize) {
    const batch = eventos.slice(i, i + batchSize);
    const { data, error } = await supabase
      .from('evt_eventos')
      .insert(batch)
      .select('id, nombre_proyecto, fecha_evento, presupuesto_estimado');
    
    if (error) {
      console.error('❌ Error insertando eventos:', error.message);
    } else {
      eventosCreados = eventosCreados.concat(data);
      console.log(`   ✓ Batch ${Math.floor(i / batchSize) + 1}: ${data.length} eventos`);
    }
  }
  
  console.log(`\n✅ Total: ${eventosCreados.length} eventos creados\n`);
  return eventosCreados;
}

// ============================================================
// PASO 3: GENERAR GASTOS E INGRESOS EN LOTES
// ============================================================

async function generarFinanzas(eventos, catalogos) {
  console.log('💰 Generando gastos e ingresos...\n');
  
  const gastos = [];
  const ingresos = [];
  
  let totalGastos = 0;
  let totalIngresos = 0;
  
  for (const evento of eventos) {
    // Calcular margen objetivo (30-45%)
    const margenObjetivo = randomFloat(CONFIG.MARGEN_MIN, CONFIG.MARGEN_MAX) / 100;
    
    // Monto de ingresos basado en presupuesto
    const montoIngresosTotal = evento.presupuesto_estimado || randomFloat(80000, 250000);
    
    // Calcular gastos para lograr margen: gastos = ingresos * (1 - margen)
    const montoGastosTotal = montoIngresosTotal * (1 - margenObjetivo);
    
    // --- GASTOS ---
    const numGastos = CONFIG.GASTOS_POR_EVENTO;
    const montoGastoUnitario = montoGastosTotal / numGastos;
    
    for (let i = 0; i < numGastos; i++) {
      const categoria = randomElement(catalogos.catGastos);
      const cuenta = randomElement(catalogos.cuentas);
      const esPagado = random(1, 100) <= CONFIG.PORCENTAJE_PAGADO;
      const total = montoGastoUnitario * randomFloat(0.8, 1.2);
      
      gastos.push({
        evento_id: evento.id,
        categoria_id: categoria.id,
        concepto: `${categoria.nombre} - ${evento.nombre_proyecto}`,
        total: parseFloat(total.toFixed(2)),
        subtotal: parseFloat((total / 1.16).toFixed(2)),
        iva: parseFloat((total - (total / 1.16)).toFixed(2)),
        pagado: esPagado,
        comprobado: esPagado,
        cuenta_bancaria_id: esPagado ? cuenta.id : null,
        tipo_comprobante: esPagado ? 'T' : null,
        fecha_gasto: evento.fecha_evento,
        proveedor: `Proveedor ${random(1, 20)}`,
      });
      
      totalGastos += total;
    }
    
    // --- INGRESOS ---
    const numIngresos = CONFIG.INGRESOS_POR_EVENTO;
    const montoIngresoUnitario = montoIngresosTotal / numIngresos;
    
    for (let i = 0; i < numIngresos; i++) {
      const categoria = randomElement(catalogos.catIngresos);
      const cuenta = randomElement(catalogos.cuentas);
      const esCobrado = random(1, 100) <= CONFIG.PORCENTAJE_COBRADO;
      const total = montoIngresoUnitario * randomFloat(0.8, 1.2);
      
      ingresos.push({
        evento_id: evento.id,
        concepto: `${categoria.nombre} - ${evento.nombre_proyecto}`,
        total: parseFloat(total.toFixed(2)),
        subtotal: parseFloat((total / 1.16).toFixed(2)),
        iva: parseFloat((total - (total / 1.16)).toFixed(2)),
        cobrado: esCobrado,
        facturado: esCobrado,
        cuenta_bancaria_id: esCobrado ? cuenta.id : null,
        tipo_comprobante: esCobrado ? 'I' : 'N',
        fecha_ingreso: evento.fecha_evento,
        cliente_factura: esCobrado ? 'Cliente ' + random(1, 10) : null,
      });
      
      totalIngresos += total;
    }
  }
  
  console.log(`   Preparados: ${gastos.length} gastos, ${ingresos.length} ingresos\n`);
  
  // Insertar GASTOS en lotes de 100
  console.log('   Insertando gastos...');
  const batchSize = 100;
  let gastosCreados = 0;
  
  for (let i = 0; i < gastos.length; i += batchSize) {
    const batch = gastos.slice(i, i + batchSize);
    const { data, error } = await supabase.from('evt_gastos').insert(batch);
    
    if (!error) {
      gastosCreados += batch.length;
      process.stdout.write(`\r   ✓ Gastos: ${gastosCreados}/${gastos.length}`);
    } else {
      console.error(`\n   ❌ Error: ${error.message}`);
    }
  }
  console.log('\n');
  
  // Insertar INGRESOS en lotes de 100
  console.log('   Insertando ingresos...');
  let ingresosCreados = 0;
  
  for (let i = 0; i < ingresos.length; i += batchSize) {
    const batch = ingresos.slice(i, i + batchSize);
    const { data, error } = await supabase.from('evt_ingresos').insert(batch);
    
    if (!error) {
      ingresosCreados += batch.length;
      process.stdout.write(`\r   ✓ Ingresos: ${ingresosCreados}/${ingresos.length}`);
    } else {
      console.error(`\n   ❌ Error: ${error.message}`);
    }
  }
  console.log('\n');
  
  const utilidad = totalIngresos - totalGastos;
  const margen = totalIngresos > 0 ? (utilidad / totalIngresos) * 100 : 0;
  
  console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 RESUMEN FINANCIERO:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   Gastos:    ${formatCurrency(totalGastos)}
   Ingresos:  ${formatCurrency(totalIngresos)}
   Utilidad:  ${formatCurrency(utilidad)}
   Margen:    ${margen.toFixed(2)}%
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  `);
  
  return { gastosCreados, ingresosCreados };
}

// ============================================================
// PASO 4: VALIDACIÓN FINAL
// ============================================================

async function validarDatos() {
  console.log('🔍 Validando datos generados...\n');
  
  const { data: eventos } = await supabase
    .from('evt_eventos')
    .select('id')
    .gte('created_at', new Date(Date.now() - 60000).toISOString());
  
  const { data: gastos } = await supabase
    .from('evt_gastos')
    .select('total, pagado')
    .gte('created_at', new Date(Date.now() - 60000).toISOString());
  
  const { data: ingresos } = await supabase
    .from('evt_ingresos')
    .select('total, cobrado')
    .gte('created_at', new Date(Date.now() - 60000).toISOString());
  
  const totalGastosPagados = gastos?.filter(g => g.pagado).reduce((sum, g) => sum + g.total, 0) || 0;
  const totalIngresosCobrados = ingresos?.filter(i => i.cobrado).reduce((sum, i) => sum + i.total, 0) || 0;
  const utilidad = totalIngresosCobrados - totalGastosPagados;
  const margen = totalIngresosCobrados > 0 ? (utilidad / totalIngresosCobrados) * 100 : 0;
  
  console.log(`   ✓ Eventos: ${eventos?.length || 0}`);
  console.log(`   ✓ Gastos: ${gastos?.length || 0} (${gastos?.filter(g => g.pagado).length} pagados)`);
  console.log(`   ✓ Ingresos: ${ingresos?.length || 0} (${ingresos?.filter(i => i.cobrado).length} cobrados)\n`);
  
  console.log(`   📊 Totales (solo cobrados/pagados):`);
  console.log(`      Gastos:   ${formatCurrency(totalGastosPagados)}`);
  console.log(`      Ingresos: ${formatCurrency(totalIngresosCobrados)}`);
  console.log(`      Utilidad: ${formatCurrency(utilidad)}`);
  console.log(`      Margen:   ${margen.toFixed(2)}% ${margen >= 30 && margen <= 45 ? '✅' : '⚠️'}\n`);
}

// ============================================================
// EJECUTAR
// ============================================================

async function main() {
  try {
    const catalogos = await obtenerCatalogos();
    const eventos = await generarEventos(catalogos);
    await generarFinanzas(eventos, catalogos);
    await validarDatos();
    
    console.log(`
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║          ✅ GENERACIÓN COMPLETADA CON ÉXITO                  ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝

Ahora ejecuta: node pruebas-modulos-completo.mjs
    `);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

main();
