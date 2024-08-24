const { response } = require("../../lib/response");
const connectToDatabase = require("../../fts-absensi");
const asyncHandler = require("express-async-handler");

exports.listMeet = asyncHandler(async (req, res) => {
  try {
    const connection = await connectToDatabase();
    
    const query = (sql) => {
      return new Promise((resolve, reject) => {
        connection.query(sql, (error, results) => {
          if (error) return reject(error);
          resolve(results);
        });
      });
    };

    const findData = await query("SELECT * FROM meeting");

    if (findData.length === 0) {
      res.status(404).json({ message: "Data not found." });
      return;
    }

    res.status(200).json(findData);

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});
