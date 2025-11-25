import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
);

async function testCrearGasto() {
  console.log('\n🧪 TEST: Intentando crear un gasto manualmente...\n');
  
  // Obtener un evento
  const { data: eventos } = await supabase
    .from('evt_eventos')
    .select('id, clave_evento, nombre_proyecto')
    .limit(1);
  
  if (!eventos || eventos.length === 0) {
    console.error('❌ No hay eventos disponibles');
    return;
  }
  
  const evento = eventos[0];
  console.log(`✓ Evento seleccionado: ${evento.clave_evento} - ${evento.nombre_proyecto}`);
  
  // Intentar crear un gasto simple
  const gastoTest = {
    evento_id: evento.id,
    categoria_id: 6, // SPs
    concepto: 'Gasto de prueba manual',
    descripcion: 'Test de creación desde script',
    cantidad: 1,
    precio_unitario: 1000,
    subtotal: 1000,
    iva: 160,
    total: 1160,
    proveedor: 'Proveedor Test',
    fecha_gasto: '2025-10-30',
    forma_pago: '03',
    tipo_comprobante: 'E',
    status_aprobacion: 'aprobado',
    pagado: false,
    responsable_id: '00000000-0000-0000-0000-000000000002',
    cuenta_contable_id: 1,
    activo: true
  };
  
  console.log('\n📝 Datos del gasto a insertar:');
  console.log(JSON.stringify(gastoTest, null, 2));
  
  const { data, error } = await supabase
    .from('evt_gastos')
    .insert(gastoTest)
    .select();
  
  if (error) {
    console.error('\n❌ ERROR AL CREAR GASTO:');
    console.error('Código:', error.code);
    console.error('Mensaje:', error.message);
    console.error('Detalles:', error.details);
    console.error('Hint:', error.hint);
  } else {
    console.log('\n✅ GASTO CREADO EXITOSAMENTE:');
    console.log(data);
  }
}

testCrearGasto().catch(console.error);
