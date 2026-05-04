const asyncHandler = require("express-async-handler");
const DB = require("../../database");
const path = require("path");
const fs = require("fs-extra");
const { unixTimestamp, convertDate } = require("../../utils");

// =====================KOLABORATOR EXTERNAL====================
exports.addKolaborator = asyncHandler(async (req, res) => {
  const data = req.body;

  if (!data.nama || !data.negara || !data.jenkel) {
    res.status(400);
    throw new Error("Pleas fill in all the required fields.");
  }

  const keys = [...Object.keys(data)];
  const values = [...Object.values(data)];
  const placeholders = keys.map((key, index) => `$${index + 1}`);

  // save data
  const saveData = await DB.query(
    `INSERT INTO kolab_external(${keys.join(", ")}) VALUES (${placeholders.join(
      ", "
    )}) returning *`,
    values
  );

  if (saveData.rows) {
    res.status(200).json({
      message: "Successfull created data.",
      data: saveData.rows[0],
    });
  } else {
    res.status(400);
    throw new Error("Invalid data.");
  }
});

exports.getKolaborator = asyncHandler(async (req, res) => {
  const data = await DB.query("SELECT * FROM kolab_external");

  if (!data.rows.length) {
    res.status(404);
    throw new Error("Data not found.");
  }

  res.status(201).json({
    data: data.rows,
  });
});

exports.detailKolaborator = asyncHandler(async (req, res) => {
  const { extId } = req.params;

  const findData = await DB.query(
    "SELECT * FROM kolab_external WHERE ext_id = $1",
    [extId]
  );

  if (!findData.rows.length) {
    res.status(404);
    throw new Error("Data not found.");
  }

  res.status(201).json({
    data: findData.rows[0],
  });
});

exports.editKolaborator = asyncHandler(async (req, res) => {
  const { extId } = req.params;

  const findData = await DB.query(
    "SELECT * FROM kolab_external WHERE ext_id = $1",
    [extId]
  );

  if (findData.rows.length) {
    const data = req.body;

    const entries = Object.entries({ ...data });
    const setQuery = entries
      .map(([key, _], index) => `${key} = $${index + 1}`)
      .join(", ");

    const saveData = await DB.query(
      `UPDATE kolab_external SET ${setQuery} WHERE ext_id = '${findData.rows[0].ext_id}' `,
      entries.map(([_, value]) => value)
    );

    res.status(201).json({
      message: "Successfully update data.",
      data: saveData.rows[0],
    });
  } else {
    res.status(404);
    throw new Error("Data not found.");
  }
});

exports.deleteKolaborator = asyncHandler(async (req, res) => {
  const { extId } = req.params;

  const findData = await DB.query(
    "SELECT * FROM kolab_external WHERE ext_id = $1",
    [extId]
  );

  if (!findData.rows.length) {
    res.status(400);
    throw new Error("Data not found.");
  }

  await DB.query("DELETE FROM kolab_external WHERE ext_id = $1", [
    findData.rows[0].ext_id,
  ]);

  res.status(200).json({ message: "Data deleted successfully." });
});
// =====================END KOLABORATOR EXTERNAL================
