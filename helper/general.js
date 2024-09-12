const excelJS = require("exceljs");

const getDataImportBk = async (url) => {
  const workbook = new excelJS.Workbook();
  const sheetName = "Sheet1";

  let data = [];

  await workbook.xlsx.readFile(url).then(() => {
    let sheet = workbook.getWorksheet(sheetName);
    sheet.eachRow((row, rowNumber) => {
      if (rowNumber > 2) {
        const angkatan = `20${row.getCell(3).value.result}`;
        data.push({
          email: row.getCell(2).value.toString(),
          angkatan: angkatan,
          npm: row.getCell(4).value.toString(),
        });
      }
    });
  });

  return data;
};

module.exports = {
  getDataImportBk,
};
