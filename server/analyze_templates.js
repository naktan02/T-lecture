const ExcelJS = require('exceljs');
const fs = require('fs');
const path = require('path');

async function analyze() {
  const files = ['../report_month.xlsx', '../report_week.xlsx'];
  const results = {};

  for (const file of files) {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(file);

    results[file] = workbook.worksheets.map((sheet) => {
      const rows = [];
      for (let i = 1; i <= Math.min(sheet.rowCount, 40); i++) {
        const row = sheet.getRow(i);
        const cells = [];
        for (let j = 1; j <= Math.max(sheet.actualColumnCount, 20); j++) {
          const cell = row.getCell(j);
          let val = cell.value;
          if (val && typeof val === 'object') {
            if (val.richText) val = val.richText.map((rt) => rt.text).join('');
            else if (val.formula) val = { formula: val.formula, result: val.result };
            else if (val.result !== undefined) val = val.result;
          }
          cells.push(val);
        }
        rows.push(cells);
      }
      return {
        name: sheet.name,
        rowCount: sheet.rowCount,
        colCount: sheet.actualColumnCount,
        rows,
      };
    });
  }

  fs.writeFileSync('analysis_results.json', JSON.stringify(results, null, 2));
}

analyze().catch((err) => {
  fs.writeFileSync('analysis_error.txt', err.stack);
  process.exit(1);
});
