import XLSX from 'xlsx';

const EXCEL_PATH = '/home/rodri/proyectos/ERP-777-V02-pc/ERP-777-V02/DOT2025-003 _ CONVENCIÓN DOTERRA 2025--analis.xlsx';

const workbook = XLSX.readFile(EXCEL_PATH);

console.log('=== PESTAÑAS DEL EXCEL ===\n');
workbook.SheetNames.forEach((name, i) => {
  const sheet = workbook.Sheets[name];
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
  const filas = data.filter(row => row.length > 0).length;
  console.log(`${i + 1}. "${name}" - ${filas} filas`);

  // Mostrar encabezados si existen
  if (data[0] && data[0].length > 0) {
    console.log('   Columnas:', data[0].slice(0, 6).join(' | '));
  }
});
