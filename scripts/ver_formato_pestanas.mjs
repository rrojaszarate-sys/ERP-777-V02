import XLSX from 'xlsx';

const EXCEL_PATH = '/home/rodri/proyectos/ERP-777-V02-pc/ERP-777-V02/DOT2025-003 _ CONVENCIÓN DOTERRA 2025--analis.xlsx';

const workbook = XLSX.readFile(EXCEL_PATH);

const pestanas = ["SP´S", "COMBUSTIBLE  PEAJE", "RH", "MATERIALES", "PROVISIONES", "RESUMEN CIERRE INTERNO"];

pestanas.forEach(nombre => {
  const sheet = workbook.Sheets[nombre];
  if (!sheet) {
    console.log(`\n❌ Pestaña "${nombre}" no encontrada`);
    return;
  }

  const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

  console.log(`\n═══ ${nombre} ═══`);
  console.log('Encabezados (fila 1):', data[0]);

  // Mostrar primeras 3 filas de datos
  console.log('\nPrimeras filas:');
  for (let i = 1; i <= Math.min(3, data.length - 1); i++) {
    console.log(`  Fila ${i}:`, data[i]?.slice(0, 8));
  }
});
