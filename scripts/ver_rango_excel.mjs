import XLSX from 'xlsx';

const EXCEL_PATH = '/home/rodri/proyectos/ERP-777-V02-pc/ERP-777-V02/DOT2025-003 _ CONVENCIÓN DOTERRA 2025--analis.xlsx';

const workbook = XLSX.readFile(EXCEL_PATH);

workbook.SheetNames.forEach(nombre => {
  const sheet = workbook.Sheets[nombre];
  const range = sheet['!ref'];
  console.log(`\n${nombre}:`);
  console.log('  Rango:', range);

  // Ver algunas celdas específicas
  const cells = Object.keys(sheet).filter(k => !k.startsWith('!'));
  console.log('  Celdas con datos:', cells.length);

  // Mostrar primeras celdas con datos
  const muestra = cells.slice(0, 15).map(c => `${c}=${JSON.stringify(sheet[c].v)}`);
  console.log('  Muestra:', muestra.join(', '));
});
