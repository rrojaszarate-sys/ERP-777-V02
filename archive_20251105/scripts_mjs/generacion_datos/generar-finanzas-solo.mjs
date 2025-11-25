#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://gomnouwackzvthpwyric.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdvbW5vdXdhY2t6dnRocHd5cmljIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTEwMjk4MywiZXhwIjoyMDc0Njc4OTgzfQ.prdLfUMwgzMctf9xdwnNyilAIpbP1vUiGFyvIbFecLU',
  { auth: { autoRefreshToken: false, persistSession: false } }
);

console.log('\n🔧 Generando gastos e ingresos para eventos existentes...\n');

function random(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomFloat(min, max) {
  return Math.random() * (max - min) + min;
}

function randomElement(array) {
  return array[random(0, array.length - 1)];
}

async function main() {
  // Obtener eventos sin gastos ni ingresos
  const { data: eventos } = await supabase
    .from('evt_eventos')
    .select('id, nombre_proyecto, fecha_evento, presupuesto_estimado')
    .limit(100);
  
  if (!eventos?.length) {
    console.log('❌ No hay eventos en la base de datos');
    return;
  }
  
  // Obtener catálogos
  const { data: cuentas } = await supabase.from('evt_cuentas_bancarias').select('id');
  const { data: catGastos } = await supabase.from('evt_categorias_gastos').select('id, nombre');
  
  console.log(`✓ ${eventos.length} eventos encontrados`);
  console.log(`✓ ${cuentas?.length || 0} cuentas bancarias`);
  console.log(`✓ ${catGastos?.length || 0} categorías de gastos\n`);
  
  const gastos = [];
  const ingresos = [];
  
  for (const evento of eventos) {
    const margen = randomFloat(30, 45) / 100;
    const montoIngresos = evento.presupuesto_estimado || randomFloat(80000, 250000);
    const montoGastos = montoIngresos * (1 - margen);
    
    // 5 gastos por evento
    for (let i = 0; i < 5; i++) {
      const total = (montoGastos / 5) * randomFloat(0.8, 1.2);
      const cuenta = randomElement(cuentas);
      const categoria = randomElement(catGastos);
      const pagado = random(1, 100) <= 90;
      
      gastos.push({
        evento_id: evento.id,
        categoria_id: categoria.id,
        concepto: `${categoria.nombre}`,
        total: parseFloat(total.toFixed(2)),
        subtotal: parseFloat((total / 1.16).toFixed(2)),
        iva: parseFloat((total - (total / 1.16)).toFixed(2)),
        pagado,
        comprobado: pagado,
        cuenta_bancaria_id: pagado ? cuenta.id : null,
        tipo_comprobante: pagado ? 'T' : 'N',  // T=Ticket, N=Nota
        fecha_gasto: evento.fecha_evento,
        proveedor: `Proveedor ${random(1, 20)}`,
      });
    }
    
    // 3 ingresos por evento
    for (let i = 0; i < 3; i++) {
      const total = (montoIngresos / 3) * randomFloat(0.8, 1.2);
      const cuenta = randomElement(cuentas);
      const cobrado = random(1, 100) <= 85;
      
      ingresos.push({
        evento_id: evento.id,
        concepto: ['Anticipo', 'Pago Parcial', 'Liquidación'][i],
        total: parseFloat(total.toFixed(2)),
        subtotal: parseFloat((total / 1.16).toFixed(2)),
        iva: parseFloat((total - (total / 1.16)).toFixed(2)),
        cobrado,
        facturado: cobrado,
        cuenta_bancaria_id: cobrado ? cuenta.id : null,
        tipo_comprobante: cobrado ? 'I' : 'N',  // I=Ingreso, N=Nota
        fecha_ingreso: evento.fecha_evento,
      });
    }
  }
  
  console.log(`Insertando ${gastos.length} gastos...`);
  const batchSize = 100;
  
  for (let i = 0; i < gastos.length; i += batchSize) {
    const batch = gastos.slice(i, i + batchSize);
    const { error } = await supabase.from('evt_gastos').insert(batch);
    if (error) console.error('Error:', error.message);
    else process.stdout.write(`\r✓ ${Math.min(i + batchSize, gastos.length)}/${gastos.length}`);
  }
  
  console.log(`\n\nInsertando ${ingresos.length} ingresos...`);
  
  for (let i = 0; i < ingresos.length; i += batchSize) {
    const batch = ingresos.slice(i, i + batchSize);
    const { error } = await supabase.from('evt_ingresos').insert(batch);
    if (error) console.error('Error:', error.message);
    else process.stdout.write(`\r✓ ${Math.min(i + batchSize, ingresos.length)}/${ingresos.length}`);
  }
  
  console.log('\n\n✅ Completado!\n');
}

main();
