const excelJS = require("exceljs");
const bcrypt = require("bcryptjs");

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

const getDataImportUsers = async (url) => {
  const workbook = new excelJS.Workbook();
  const sheetName = "Sheet1";

  let data = [];
  const salt = await bcrypt.genSalt(10); // Generate salt untuk hashing

  await workbook.xlsx.readFile(url).then(() => {
    let sheet = workbook.getWorksheet(sheetName);
    sheet.eachRow((row, rowNumber) => {
      if (rowNumber > 1) {
        data.push({
          nip: row.getCell(1).value.toString().replace(/['"`]/g, "").trim(),
          password: row.getCell(3).value.toString(), // Password plain text
          nidn: row.getCell(4).value
            ? row.getCell(4).value.toString().replace(/['"`]/g, "").trim()
            : "",
          email: row.getCell(5).value.toString(),
        });
      }
    });
  });

  // Hash password secara asinkron setelah data diambil
  for (const item of data) {
    if (item.password) {
      item.hashedPassword = await bcrypt.hash(item.password, salt); // Hash password
      delete item.password; // Hapus password plain text setelah hashing
    }
  }

  return data;
};

module.exports = {
  getDataImportBk,
  getDataImportUsers,
};
