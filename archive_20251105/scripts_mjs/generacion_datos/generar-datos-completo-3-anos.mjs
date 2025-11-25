import { createClient } from '@supabase/supabase-js';

// Usar service role key para operaciones masivas de escritura
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

// ============================================================
// CONFIGURACIÓN
// ============================================================

const CONFIG = {
  AÑOS: [2023, 2024, 2025],
  EVENTOS_POR_MES_MIN: 10,
  EVENTOS_POR_MES_MAX: 20,
  MARGEN_UTILIDAD_MIN: 30,
  MARGEN_UTILIDAD_MAX: 50,
  GASTOS_POR_EVENTO_MIN: 3,
  GASTOS_POR_EVENTO_MAX: 8,
  INGRESOS_POR_EVENTO_MIN: 2,
  INGRESOS_POR_EVENTO_MAX: 5,
  PORCENTAJE_COBRADO: 85,  // 85% cobrado, 15% pendiente
  PORCENTAJE_PAGADO: 90,   // 90% pagado, 10% pendiente
};

// ============================================================
// DATOS MAESTROS
// ============================================================

const CLIENTES = [
  { nombre: 'Grupo Empresarial ACME', rfc: 'GEA850101XXX', tipo: 'Moral' },
  { nombre: 'Corporativo Global SA', rfc: 'CGS900215YYY', tipo: 'Moral' },
  { nombre: 'Innovatech Solutions', rfc: 'INS950320ZZZ', tipo: 'Moral' },
  { nombre: 'MegaCorp Internacional', rfc: 'MEI880410AAA', tipo: 'Moral' },
  { nombre: 'Prime Events & More', rfc: 'PEM920525BBB', tipo: 'Moral' },
  { nombre: 'Tech Ventures Group', rfc: 'TVG910630CCC', tipo: 'Moral' },
  { nombre: 'Marketing Solutions Pro', rfc: 'MSP930715DDD', tipo: 'Moral' },
  { nombre: 'Digital Agency Elite', rfc: 'DAE940820EEE', tipo: 'Moral' },
  { nombre: 'Business Partners Inc', rfc: 'BPI960925FFF', tipo: 'Moral' },
  { nombre: 'Enterprise Systems Ltd', rfc: 'ESL971030GGG', tipo: 'Moral' },
];

const TIPOS_EVENTO = [
  'Conferencia',
  'Congreso',
  'Exposición',
  'Seminario',
  'Workshop',
  'Convención',
  'Feria',
  'Lanzamiento',
];

const CATEGORIAS_GASTO = [
  'Renta de Espacio',
  'Catering y Alimentos',
  'Audio y Video',
  'Decoración',
  'Personal de Apoyo',
  'Marketing y Publicidad',
  'Transporte',
  'Hospedaje',
  'Material Impreso',
  'Tecnología',
  'Seguridad',
  'Limpieza',
];

const CATEGORIAS_INGRESO = [
  'Pago por Servicio Completo',
  'Anticipo de Proyecto',
  'Pago Final',
  'Servicios Adicionales',
  'Patrocinios',
];

// ============================================================
// FUNCIONES AUXILIARES
// ============================================================

function random(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomFloat(min, max) {
  return Math.random() * (max - min) + min;
}

function randomDate(start, end) {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

function randomElement(array) {
  return array[random(0, array.length - 1)];
}

function formatCurrency(num) {
  return new Intl.NumberFormat('es-MX', { 
    style: 'currency', 
    currency: 'MXN' 
  }).format(num);
}

// ============================================================
// PASO 1: LIMPIAR DATOS EXISTENTES
// ============================================================

async function limpiarDatos() {
  console.log('\n🧹 LIMPIANDO DATOS EXISTENTES...\n');
  console.log('ℹ️  Los clientes NO se borrarán (son fijos)\n');
  
  // Eliminar en orden (respetando foreign keys)
  const { error: e1 } = await supabase.from('evt_gastos').delete().neq('id', 0);
  if (e1) console.log('⚠️  Error limpiando gastos:', e1.message);
  else console.log('✅ Gastos eliminados');
  
  const { error: e2 } = await supabase.from('evt_ingresos').delete().neq('id', 0);
  if (e2) console.log('⚠️  Error limpiando ingresos:', e2.message);
  else console.log('✅ Ingresos eliminados');
  
  const { error: e3 } = await supabase.from('evt_eventos').delete().neq('id', 0);
  if (e3) console.log('⚠️  Error limpiando eventos:', e3.message);
  else console.log('✅ Eventos eliminados');
  
  // NO eliminar clientes - son datos maestros
  console.log('ℹ️  Clientes conservados (datos maestros)');
  
  console.log('\n✅ Limpieza completada\n');
}

// ============================================================
// PASO 2: OBTENER CATÁLOGOS
// ============================================================

async function obtenerCatalogos() {
  console.log('📚 Obteniendo catálogos...\n');
  
  const { data: cuentas } = await supabase.from('evt_cuentas_bancarias').select('id, nombre');
  const { data: tipos } = await supabase.from('evt_tipos_evento').select('id, nombre');
  const { data: estados } = await supabase.from('evt_estados').select('id, nombre');
  
  console.log(`   Cuentas bancarias: ${cuentas?.length || 0}`);
  console.log(`   Tipos de evento: ${tipos?.length || 0}`);
  console.log(`   Estados: ${estados?.length || 0}\n`);
  
  return { cuentas, tipos, estados };
}

// ============================================================
// PASO 3: OBTENER CLIENTES EXISTENTES
// ============================================================

async function obtenerClientes() {
  console.log('👥 OBTENIENDO CLIENTES EXISTENTES...\n');
  
  const { data: clientes, error } = await supabase
    .from('evt_clientes')
    .select('*')
    .order('nombre_comercial');
  
  if (error) {
    console.log('❌ Error obteniendo clientes:', error.message);
    return [];
  }
  
  if (!clientes || clientes.length === 0) {
    console.log('⚠️  No hay clientes en la base de datos');
    console.log('ℹ️  Creando clientes predeterminados...\n');
    return await crearClientes();
  }
  
  console.log(`✅ ${clientes.length} clientes encontrados:\n`);
  clientes.forEach(c => console.log(`   • ${c.nombre_comercial}`));
  console.log('');
  
  return clientes;
}

// ============================================================
// FUNCIÓN AUXILIAR: CREAR CLIENTES (solo si no existen)
// ============================================================

async function crearClientes() {
  console.log('👥 CREANDO CLIENTES PREDETERMINADOS...\n');
  
  const clientesCreados = [];
  
  for (const cliente of CLIENTES) {
    const { data, error } = await supabase
      .from('evt_clientes')
      .insert({
        nombre_comercial: cliente.nombre,
        razon_social: cliente.nombre,
        rfc: cliente.rfc,
        // tipo_persona no existe en el esquema actual
        email: `contacto@${cliente.nombre.toLowerCase().replace(/\s+/g, '')}.com`,
        telefono: `55${random(1000, 9999)}${random(1000, 9999)}`,
        regimen_fiscal: '601', // General de Ley Personas Morales
        uso_cfdi: 'G03', // Gastos en general
        metodo_pago: 'PPD', // Pago en parcialidades o diferido
        forma_pago: '03', // Transferencia electrónica
      })
      .select()
      .single();
    
    if (error) {
      console.log(`❌ Error creando ${cliente.nombre}:`, error.message);
    } else {
      clientesCreados.push(data);
      console.log(`✅ ${cliente.nombre}`);
    }
  }
  
  console.log(`\n✅ ${clientesCreados.length} clientes creados\n`);
  return clientesCreados;
}

// ============================================================
// PASO 4: GENERAR EVENTOS POR AÑO/MES
// ============================================================

async function generarEventos(clientes, tipos, estados) {
  console.log('📅 GENERANDO EVENTOS (3 AÑOS)...\n');
  
  const eventosCreados = [];
  let totalEventos = 0;
  
  for (const año of CONFIG.AÑOS) {
    console.log(`\n📆 AÑO ${año}`);
    console.log('━'.repeat(60));
    
    for (let mes = 1; mes <= 12; mes++) {
      // Número aleatorio de eventos por mes
      const numEventos = random(CONFIG.EVENTOS_POR_MES_MIN, CONFIG.EVENTOS_POR_MES_MAX);
      
      const inicioMes = new Date(año, mes - 1, 1);
      const finMes = new Date(año, mes, 0);
      
      let eventosMes = 0;
      
      for (let i = 0; i < numEventos; i++) {
        const cliente = randomElement(clientes);
        const tipo = randomElement(tipos);
        const estado = randomElement(estados);
        
        const fechaEvento = randomDate(inicioMes, finMes);
        const fechaFin = new Date(fechaEvento);
        fechaFin.setDate(fechaFin.getDate() + random(1, 3));
        
        const claveEvento = `EVT-${año}-${String(mes).padStart(2, '0')}-${String(totalEventos + 1).padStart(4, '0')}`;
        
        const { data, error } = await supabase
          .from('evt_eventos')
          .insert({
            clave_evento: claveEvento,
            nombre_proyecto: `${tipo.nombre} ${cliente.nombre_comercial.split(' ')[0]} ${mes}/${año}`,
            descripcion: `Evento corporativo organizado para ${cliente.nombre_comercial}`,
            cliente_id: cliente.id,
            tipo_evento_id: tipo.id,
            estado_id: estado.id,
            fecha_evento: fechaEvento.toISOString(),
            fecha_fin: fechaFin.toISOString(),
            presupuesto_estimado: randomFloat(50000, 500000),
            status_facturacion: random(1, 10) > 2 ? 'facturado' : 'pendiente',
          })
          .select()
          .single();
        
        if (!error) {
          eventosCreados.push(data);
          eventosMes++;
          totalEventos++;
        }
      }
      
      const mesNombre = new Intl.DateTimeFormat('es-MX', { month: 'long' }).format(inicioMes);
      console.log(`   ${mesNombre}: ${eventosMes} eventos`);
    }
  }
  
  console.log('\n' + '━'.repeat(60));
  console.log(`✅ Total: ${totalEventos} eventos creados\n`);
  return eventosCreados;
}

// ============================================================
// PASO 5: GENERAR GASTOS E INGRESOS
// ============================================================

async function generarFinanzas(eventos, cuentas) {
  console.log('💰 GENERANDO GASTOS E INGRESOS...\n');
  
  let totalGastos = 0;
  let totalIngresos = 0;
  let gastosCreados = 0;
  let ingresosCreados = 0;
  let gastosPagados = 0;
  let ingresosCobrados = 0;
  
  for (const evento of eventos) {
    // Calcular margen de utilidad objetivo (30-50%)
    const margenObjetivo = randomFloat(CONFIG.MARGEN_UTILIDAD_MIN, CONFIG.MARGEN_UTILIDAD_MAX) / 100;
    
    // Generar monto base de ingresos
    const montoIngresos = randomFloat(50000, 300000);
    
    // Calcular gastos para lograr el margen objetivo
    // utilidad = ingresos - gastos
    // margen = utilidad / ingresos
    // margen = (ingresos - gastos) / ingresos
    // gastos = ingresos * (1 - margen)
    const montoGastos = montoIngresos * (1 - margenObjetivo);
    
    // --- GASTOS ---
    const numGastos = random(CONFIG.GASTOS_POR_EVENTO_MIN, CONFIG.GASTOS_POR_EVENTO_MAX);
    const montoGasto = montoGastos / numGastos;
    
    for (let i = 0; i < numGastos; i++) {
      const cuenta = randomElement(cuentas);
      const categoria = randomElement(CATEGORIAS_GASTO);
      const esPagado = random(1, 100) <= CONFIG.PORCENTAJE_PAGADO;
      const total = montoGasto * randomFloat(0.8, 1.2); // Variación ±20%
      
      const { error } = await supabase.from('evt_gastos').insert({
        evento_id: evento.id,
        concepto: categoria,
        total: total,
        pagado: esPagado,
        comprobado: esPagado,
        cuenta_bancaria_id: cuenta.id,
        tipo_comprobante: 'T', // Ticket
        fecha: evento.fecha_evento,
      });
      
      if (!error) {
        gastosCreados++;
        totalGastos += total;
        if (esPagado) gastosPagados++;
      }
    }
    
    // --- INGRESOS ---
    const numIngresos = random(CONFIG.INGRESOS_POR_EVENTO_MIN, CONFIG.INGRESOS_POR_EVENTO_MAX);
    const montoIngreso = montoIngresos / numIngresos;
    
    for (let i = 0; i < numIngresos; i++) {
      const cuenta = randomElement(cuentas);
      const categoria = randomElement(CATEGORIAS_INGRESO);
      const esCobrado = random(1, 100) <= CONFIG.PORCENTAJE_COBRADO;
      const total = montoIngreso * randomFloat(0.8, 1.2); // Variación ±20%
      
      const { error } = await supabase.from('evt_ingresos').insert({
        evento_id: evento.id,
        concepto: categoria,
        total: total,
        cobrado: esCobrado,
        facturado: esCobrado,
        cuenta_bancaria_id: cuenta.id,
        tipo_comprobante: esCobrado ? 'I' : 'N',
        fecha: evento.fecha_evento,
      });
      
      if (!error) {
        ingresosCreados++;
        totalIngresos += total;
        if (esCobrado) ingresosCobrados++;
      }
    }
  }
  
  console.log('📊 RESUMEN FINANCIERO:');
  console.log('━'.repeat(60));
  console.log(`   Gastos creados:  ${gastosCreados} (${gastosPagados} pagados)`);
  console.log(`   Ingresos creados: ${ingresosCreados} (${ingresosCobrados} cobrados)`);
  console.log(`   Total gastos:  ${formatCurrency(totalGastos)}`);
  console.log(`   Total ingresos: ${formatCurrency(totalIngresos)}`);
  console.log(`   Utilidad:      ${formatCurrency(totalIngresos - totalGastos)}`);
  console.log(`   Margen:        ${((totalIngresos - totalGastos) / totalIngresos * 100).toFixed(2)}%`);
  console.log('━'.repeat(60) + '\n');
}

// ============================================================
// PASO 6: VALIDAR VISTAS Y REPORTES
// ============================================================

async function validarVistas() {
  console.log('🔍 VALIDANDO VISTAS Y REPORTES...\n');
  
  // 1. Totales reales
  const { data: ingresosCobrados } = await supabase
    .from('evt_ingresos')
    .select('total')
    .eq('cobrado', true);
  
  const { data: gastosPagados } = await supabase
    .from('evt_gastos')
    .select('total')
    .eq('pagado', true);
  
  const totalIngresosReal = ingresosCobrados?.reduce((sum, i) => sum + i.total, 0) || 0;
  const totalGastosReal = gastosPagados?.reduce((sum, g) => sum + g.total, 0) || 0;
  
  console.log('📊 TOTALES REALES (solo cobrados/pagados):');
  console.log(`   Ingresos: ${formatCurrency(totalIngresosReal)}`);
  console.log(`   Gastos:   ${formatCurrency(totalGastosReal)}`);
  console.log(`   Utilidad: ${formatCurrency(totalIngresosReal - totalGastosReal)}`);
  console.log(`   Margen:   ${((totalIngresosReal - totalGastosReal) / totalIngresosReal * 100).toFixed(2)}%\n`);
  
  // 2. vw_eventos_completos
  const { data: vistaCompletos } = await supabase
    .from('vw_eventos_completos')
    .select('total, total_gastos');
  
  const totalIngresosVista = vistaCompletos?.reduce((sum, e) => sum + parseFloat(e.total || 0), 0) || 0;
  const totalGastosVista = vistaCompletos?.reduce((sum, e) => sum + parseFloat(e.total_gastos || 0), 0) || 0;
  
  console.log('📊 vw_eventos_completos:');
  console.log(`   Ingresos: ${formatCurrency(totalIngresosVista)}`);
  console.log(`   Gastos:   ${formatCurrency(totalGastosVista)}`);
  
  const difIngresos = Math.abs(totalIngresosReal - totalIngresosVista);
  const difGastos = Math.abs(totalGastosReal - totalGastosVista);
  
  console.log(`   Diferencia ingresos: ${formatCurrency(difIngresos)} ${difIngresos < 1 ? '✅' : '❌'}`);
  console.log(`   Diferencia gastos:   ${formatCurrency(difGastos)} ${difGastos < 1 ? '✅' : '❌'}\n`);
  
  // 3. vw_master_facturacion
  const { data: vistaMaster } = await supabase
    .from('vw_master_facturacion')
    .select('total, total_gastos');
  
  const totalIngresosMaster = vistaMaster?.reduce((sum, e) => sum + parseFloat(e.total || 0), 0) || 0;
  const totalGastosMaster = vistaMaster?.reduce((sum, e) => sum + parseFloat(e.total_gastos || 0), 0) || 0;
  
  console.log('📊 vw_master_facturacion:');
  console.log(`   Ingresos: ${formatCurrency(totalIngresosMaster)}`);
  console.log(`   Gastos:   ${formatCurrency(totalGastosMaster)}`);
  console.log(`   Coincide con real: ${difIngresos < 1 && difGastos < 1 ? '✅' : '❌'}\n`);
  
  // 4. vw_eventos_pendientes
  const { data: vistaPendientes } = await supabase
    .from('vw_eventos_pendientes')
    .select('ingresos_por_cobrar, gastos_por_pagar');
  
  const totalIngresosPendientes = vistaPendientes?.reduce((sum, e) => sum + parseFloat(e.ingresos_por_cobrar || 0), 0) || 0;
  const totalGastosPendientes = vistaPendientes?.reduce((sum, e) => sum + parseFloat(e.gastos_por_pagar || 0), 0) || 0;
  
  console.log('📊 vw_eventos_pendientes:');
  console.log(`   Ingresos pendientes: ${formatCurrency(totalIngresosPendientes)}`);
  console.log(`   Gastos pendientes:   ${formatCurrency(totalGastosPendientes)}\n`);
  
  // 5. Arqueo por cuenta bancaria
  console.log('🏦 ARQUEO POR CUENTA BANCARIA:\n');
  
  const { data: cuentas } = await supabase.from('evt_cuentas_bancarias').select('id, nombre');
  
  for (const cuenta of cuentas || []) {
    const { data: ingresos } = await supabase
      .from('evt_ingresos')
      .select('total')
      .eq('cuenta_bancaria_id', cuenta.id)
      .eq('cobrado', true);
    
    const { data: gastos } = await supabase
      .from('evt_gastos')
      .select('total')
      .eq('cuenta_bancaria_id', cuenta.id)
      .eq('pagado', true);
    
    const totalIngresos = ingresos?.reduce((sum, i) => sum + i.total, 0) || 0;
    const totalGastos = gastos?.reduce((sum, g) => sum + g.total, 0) || 0;
    const saldo = totalIngresos - totalGastos;
    
    console.log(`   ${cuenta.nombre}:`);
    console.log(`      Ingresos: ${formatCurrency(totalIngresos)}`);
    console.log(`      Gastos:   ${formatCurrency(totalGastos)}`);
    console.log(`      Saldo:    ${formatCurrency(saldo)} ${saldo >= 0 ? '✅' : '⚠️'}\n`);
  }
  
  return difIngresos < 1 && difGastos < 1;
}

// ============================================================
// FUNCIÓN PRINCIPAL
// ============================================================

async function main() {
  console.log('\n');
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║                                                              ║');
  console.log('║    GENERADOR DE DATOS COMPLETO - 3 AÑOS                      ║');
  console.log('║    ERP-777 V1 - Prueba Integral                              ║');
  console.log('║                                                              ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log('\n');
  
  try {
    // Paso 1: Limpiar
    await limpiarDatos();
    
    // Paso 2: Obtener catálogos
    const { cuentas, tipos, estados } = await obtenerCatalogos();
    
    if (!cuentas?.length || !tipos?.length || !estados?.length) {
      throw new Error('Faltan catálogos necesarios en la base de datos');
    }
    
    // Paso 3: Obtener clientes (o crearlos si no existen)
    const clientes = await obtenerClientes();
    
    if (!clientes || clientes.length === 0) {
      throw new Error('No hay clientes disponibles');
    }
    
    // Paso 4: Generar eventos
    const eventos = await generarEventos(clientes, tipos, estados);
    
    // Paso 5: Generar finanzas
    await generarFinanzas(eventos, cuentas);
    
    // Paso 6: Validar
    const validacionExitosa = await validarVistas();
    
    console.log('\n');
    console.log('═'.repeat(64));
    if (validacionExitosa) {
      console.log('✅ GENERACIÓN COMPLETADA CON ÉXITO');
      console.log('✅ Todas las vistas validadas correctamente');
    } else {
      console.log('⚠️  GENERACIÓN COMPLETADA CON ADVERTENCIAS');
      console.log('⚠️  Revisar diferencias en vistas');
    }
    console.log('═'.repeat(64));
    console.log('\n');
    
    process.exit(validacionExitosa ? 0 : 1);
    
  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    process.exit(1);
  }
}

main();
