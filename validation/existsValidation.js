const DB = require("../database");
const fs = require("fs-extra");

const existsAsalPend = async (data, file) => {
  const exists = await DB.query(
    "SELECT * FROM tb_pend_formal WHERE asal = $1",
    [data]
  );

  if (exists.rows.length) {
    fs.unlink(file.file_pend[0].path, (err) => {
      if (err) {
        console.log(err);
      }
      return;
    });

    return Error("ALREADY eXISY");
  }
};

module.exports = { existsAsalPend };
