const ExcelJS = require('exceljs');
const path = require('path');

async function checkFormulas() {
  const filePath = path.join(__dirname, 'server/src/domains/infra/report/report_week.xlsx');
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);
  const sheet = workbook.worksheets[0];

  console.log(`Checking formulas in ${sheet.name}...`);

  [5, 6].forEach((rowNum) => {
    const row = sheet.getRow(rowNum);
    console.log(`\nRow ${rowNum}:`);
    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      if (cell.formula) {
        console.log(
          `  Col ${colNumber} (${cell.address}): Formula = ${cell.formula}, Type = ${cell.type}, FormulaType = ${cell.formulaType || 'single'}`,
        );
        if (cell.si !== undefined) {
          console.log(`    Shared Formula ID: ${cell.si}, Range: ${cell.ref}`);
        }
      }
    });
  });
}

checkFormulas().catch(console.error);
