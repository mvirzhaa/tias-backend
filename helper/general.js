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

const getDataImportUsersAgain = async (url) => {
  const workbook = new excelJS.Workbook();
  const sheetName = "Sheet1";

  let data = [];
  const salt = await bcrypt.genSalt(10); // Generate salt untuk hashing

  await workbook.xlsx.readFile(url).then(() => {
    let sheet = workbook.getWorksheet(sheetName);
    sheet.eachRow((row, rowNumber) => {
      const gelarDepan = row.getCell(12).value ? row.getCell(12).value : "";
      const gelarBelakang = row.getCell(13).value ? row.getCell(13).value : "";
      const name = row.getCell(2).value.toString();
      const nama_lengkap = `${gelarDepan} ${name} ${gelarBelakang}`;
      console.log("oke");
      if (rowNumber > 1) {
        data.push({
          nip: row.getCell(1).value.toString().replace(/['"`]/g, "").trim(),
          nama_lengkap: nama_lengkap,
          jenis_kelamin: row.getCell(4).value,
          tempat_lahir: row.getCell(5).value,
          tanggal_lahir: row.getCell(6).value,
          password: row.getCell(7).value.toString(),
          agama: row.getCell(8).value,
          nidn: row.getCell(9).value
            ? row.getCell(9).value.toString().replace(/['"`]/g, "").trim()
            : "",
          email: row.getCell(10).value,
          alamat: row.getCell(17).value,
          no_hp: row.getCell(18).value
            ? row.getCell(18).value.toString().replace(/['"`]/g, "").trim()
            : "",
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
  getDataImportUsersAgain,
};
