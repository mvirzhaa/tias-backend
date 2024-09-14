const excelJS = require("exceljs");

const getDataImportBk = async (url) => {
  const workbook = new excelJS.Workbook();
  const sheetName = "Sheet1";

  let data = [];

  await workbook.xlsx.readFile(url).then(() => {
    let sheet = workbook.getWorksheet(sheetName);
    sheet.eachRow((row, rowNumber) => {
      if (rowNumber > 2) {
        const angkatan = `20${row.getCell(2).value.result}`;
        data.push({
          nidn: row.getCell(1).value.toString().replace(/['"]/g, "").trim(),
          angkatan: angkatan,
          npm: row.getCell(3).value.toString(),
          kelas: row.getCell(4).value.toString(),
          semester: row.getCell(5).value.toString(),
        });
      }
    });
  });

  return data;
};

module.exports = {
  getDataImportBk,
};
