import ExcelJS from 'exceljs';
import path from 'path';

async function main() {
  const EXCEL_PATH = path.join(__dirname, '../test-data/test-units-100.xlsx');

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(EXCEL_PATH);
  const worksheet = workbook.getWorksheet(1);

  console.log('--- EXCEL DUMP START ---');
  worksheet!.eachRow((row, rowNumber) => {
    if (rowNumber > 5) return;
    // Map values to string to avoid circular structure or weird objects
    const values = Array.isArray(row.values)
      ? row.values.map((v) => String(v))
      : String(row.values);
    console.log(`Row ${rowNumber}: ${JSON.stringify(values)}`);
  });
  console.log('--- EXCEL DUMP END ---');
}

main().catch(console.error);
