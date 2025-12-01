/**
 * Cargar ingresos reales del Excel al evento DOTERRA 2025
 */
import { createClient } from '@supabase/supabase-js';
import XLSX from 'xlsx';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

const EVENTO_ID = 1; // DOTERRA 2025
const COMPANY_ID = '00000000-0000-0000-0000-000000000001';
const EXCEL_PATH = '/home/rodri/proyectos/ERP-777-V02-pc/ERP-777-V02/DOT2025-003 _ CONVENCIÓN DOTERRA 2025--analis.xlsx';

async function cargarIngresos() {
  console.log('\n🚀 CARGANDO INGRESOS REALES PARA EVENTO DOTERRA 2025\n');

  try {
    const workbook = XLSX.readFile(EXCEL_PATH);
    const sheet = workbook.Sheets['RESUMEN CIERRE INTERNO'];
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

    // Buscar la sección de INGRESOS
    let headerRow = -1;
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      if (row && row[0] === 'Status' && row[1] === 'No. Factura') {
        headerRow = i;
        break;
      }
    }

    if (headerRow === -1) {
      console.log('❌ No se encontró encabezado de ingresos');
      return;
    }

    console.log('📋 Encabezado encontrado en fila:', headerRow);
    const headers = data[headerRow];
    console.log('📋 Columnas:', headers);

    let insertados = 0;
    let montoTotal = 0;

    // Procesar filas de ingresos (después del header hasta encontrar fila vacía o nueva sección)
    for (let i = headerRow + 1; i < data.length; i++) {
      const row = data[i];

      // Detener si encontramos una fila vacía o nueva sección (EGRESOS, GASTOS)
      if (!row || !row[0] || row[0] === 'EGRESOS' || row[0] === 'GASTOS' || row[0] === '' || row[0] === 'Status') {
        console.log(`📋 Fin de sección INGRESOS en fila ${i}`);
        break;
      }

      const status = row[0]; // PAGADO, PENDIENTE
      const noFactura = row[1];
      const cliente = row[2];
      const concepto = row[3];
      const subtotal = parseFloat(row[5]) || 0;
      const iva = parseFloat(row[6]) || 0;
      const total = parseFloat(row[7]) || 0;

      if (total <= 0) continue;

      const esPagado = status === 'PAGADO';

      console.log(`📄 Procesando: ${concepto?.substring(0, 50)} | $${total.toLocaleString()}`);

      const { error } = await supabase
        .from('evt_ingresos_erp')
        .insert({
          company_id: COMPANY_ID,
          evento_id: EVENTO_ID,
          concepto: concepto || 'Sin concepto',
          descripcion: `Cliente: ${cliente || 'DOTERRA'} - Factura: ${noFactura || 'N/A'}`,
          fecha_ingreso: new Date().toISOString().split('T')[0],
          subtotal: subtotal,
          iva: iva,
          total: total,
          facturado: true,
          serie: 'FAC',
          folio: String(noFactura || ''),
          status_cobro: esPagado ? 'cobrado' : 'pendiente',
          cobrado: esPagado,
          fecha_cobro: esPagado ? new Date().toISOString().split('T')[0] : null,
          fecha_creacion: new Date().toISOString()
        });

      if (error) {
        console.log(`❌ Error: ${error.message}`);
      } else {
        insertados++;
        montoTotal += total;
        console.log(`✅ Ingreso insertado: $${total.toLocaleString()}`);
      }
    }

    // Actualizar el ingreso estimado del evento
    const { error: updateError } = await supabase
      .from('evt_eventos_erp')
      .update({
        ingreso_estimado: montoTotal,
        updated_at: new Date().toISOString()
      })
      .eq('id', EVENTO_ID);

    if (updateError) {
      console.log('⚠️  Error actualizando ingreso estimado:', updateError.message);
    } else {
      console.log('✅ Ingreso estimado actualizado en evento');
    }

    console.log('\n📊 RESUMEN:');
    console.log(`   Ingresos insertados: ${insertados}`);
    console.log(`   Monto total: $${montoTotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`);

    // Verificar la vista
    const { data: eventoView } = await supabase
      .from('vw_eventos_analisis_financiero_erp')
      .select('*')
      .eq('id', EVENTO_ID)
      .single();

    if (eventoView) {
      console.log('\n📋 VERIFICACIÓN EN VISTA:');
      console.log(`   Ingresos Totales: $${(eventoView.ingresos_totales || 0).toLocaleString()}`);
      console.log(`   Ingresos Cobrados: $${(eventoView.ingresos_cobrados || 0).toLocaleString()}`);
      console.log(`   Ingresos Pendientes: $${(eventoView.ingresos_pendientes || 0).toLocaleString()}`);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

cargarIngresos();
