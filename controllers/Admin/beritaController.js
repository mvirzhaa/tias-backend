const asyncHandler = require("express-async-handler");
const DB = require("../../database");
const path = require("path");
const fs = require("fs-extra");
const { unixTimestamp, convertDate } = require("../../utils");

function deleteFile(location, filename) {
  const filePath = path.join(`${location}`, filename);

  try {
    fs.unlinkSync(filePath);
    console.log(`File ${filename} deleted successfully.`);
  } catch (error) {
    console.error(`Error deleting file ${filename}: ${error.message}`);
  }
}

exports.create = asyncHandler(async (req, res) => {
    const data = req.body;
    const file = req.files;

    if(Object.keys(file).length === 0){
        res.status(400);
        throw new Error("Please fil in one file.")
    }

    if(!data.title || !data.deskripsi || !data.kategori){
        fs.unlink(file.pamflet[0].path, (err) => {
            if(err){
                console.log(err)
            }
            return;
        })
        fs.unlink(file.dokumen[0].path, (err) => {
            if(err){
                console.log(err)
            }
            return;
        })
        res.status(400);
        throw new Error("Please fill in all the required fields.");
    }

    const created_at = unixTimestamp;
    const convert = convertDate(created_at);

    const saveData = await DB.query("INSERT INTO tb_berita(title, deskripsi, pamflet, dokumen, created_at, kategori) VALUES($1, $2, $3, $4, $5, $6) RETURNING *", [data.title, data.deskripsi, file.pamflet[0].filename,file.dokumen[0].filename, convert, data.kategori]);

    if(saveData.rows){
        res.status(200).json({
            message: "Successfull created data."
        })
    } else {
        res.status(400);
        throw new Error("Invalid data.");
    }

});

exports.detail = asyncHandler(async (req, res) => {
  const {id} = req.params;


  const detailQuery = {
    text: "SELECT * FROM tb_berita WHERE id = $1",
    values: [id],
  };

  const detail = await DB.query(detailQuery);

  if (!detail.rows.length) {
    res.status(404);
    throw new Error("Data not found.");
  }

  res.status(201).json({
    data: detail.rows[0],
  });
})

exports.update = asyncHandler(async (req, res) => {
  const data = req.body;
  const file = req.files;
  const idBerita = req.params.id;

  const existingData = await DB.query({
    text: 'SELECT * FROM tb_berita WHERE id = $1',
    values: [idBerita],
  });

  if (existingData.rows.length === 0) {
    res.status(404);
    throw new Error('Data not found.');
  }

  const existingPamflet = existingData.rows[0].pamflet;
  const existingDokumen = existingData.rows[0].dokumen;

  const created_at = unixTimestamp;
  const convert = convertDate(created_at);

  const updatedData = {
    title: data.title,
    deskripsi: data.deskripsi,
    pamflet: file.pamflet ? file.pamflet[0].filename : existingPamflet,
    dokumen: file.dokumen ? file.dokumen[0].filename : existingDokumen,
    updated_at: convert,
  };

  const updateFields = {};
  Object.keys(updatedData).forEach((key) => {
    if (updatedData[key] !== undefined) {
      updateFields[key] = updatedData[key];
    }
  });

  if (Object.keys(updateFields).length === 0) {
    res.status(400);
    throw new Error('No Updated Data.');
  }

  const updateQuery = {
    text: `UPDATE tb_berita SET ${Object.keys(updateFields)
      .map((key, index) => `${key} = $${index + 1}`)
      .join(', ')} WHERE id = $${Object.keys(updateFields).length + 1} RETURNING *`,
    values: [...Object.values(updateFields), idBerita],
  };

  const updateData = await DB.query(updateQuery);

  if (updateData.rows.length > 0) {
    if (file.pamflet && existingPamflet) {
      deleteFile('public/berita/pamflet', existingPamflet);
    }
    if (file.dokumen && existingDokumen) {
      deleteFile('public/berita/dokumen', existingDokumen);
    }

    res.status(200).json({
      message: 'Successfully updated.',
      data: updateData.rows[0],
    });
  } else {
    res.status(400);
    throw new Error('Invalid data.');
  }
});
  
exports.getDataTantangan = asyncHandler(async (req, res) => {
  const query = {
    text: "SELECT * FROM tb_berita WHERE kategori = $1 ORDER BY created_at DESC",
    values: ['tantangan'],
  };

  const data = await DB.query(query);

    res.status(200).json({
      message: "Successfull get data.",
      data: data.rows,
    });
 
});

exports.getActiveTantangan = asyncHandler(async (req, res) => {
  const query = {
    text: "SELECT * FROM tb_berita WHERE status = $1 AND kategori = $2 ORDER BY created_at DESC",
    values: [0, 'tantangan'],
  };

  const data = await DB.query(query);

    res.status(200).json({
      message: "Successfull get data.",
      data: data.rows.map((iterate)  => ({
        ...iterate,
        pamflet_url: `${process.env.API_URL}/berita/pamflet/${iterate.pamflet}`,
        dokumen_url: `${process.env.API_URL}/berita/dokumen/${iterate.dokumen}`
      })),
    });
 
});

exports.getDataEvent = asyncHandler(async (req, res) => {
  const query = {
    text: "SELECT * FROM tb_berita WHERE kategori = $1 ORDER BY created_at DESC",
    values: ['event'],
  };

  const data = await DB.query(query);

    res.status(200).json({
      message: "Successfull get data.",
      data: data.rows,
    });
  
});

exports.getActiveEvent = asyncHandler(async (req, res) => {
  const query = {
    text: "SELECT * FROM tb_berita WHERE status = $1 AND kategori = $2 ORDER BY created_at DESC",
    values: [0, 'event'],
  };

  const data = await DB.query(query);


    res.status(200).json({
      message: "Successfull get data.",
      data: data.rows.map((iterate)  => ({
        ...iterate,
        pamflet_url: `${process.env.API_URL}/berita/pamflet/${iterate.pamflet}`,
        dokumen_url: `${process.env.API_URL}/berita/dokumen/${iterate.dokumen}`
      })),
    });
  
});

exports.deleteBerita = asyncHandler(async (req, res) => {
  const idBerita = req.params.id;

  if (!idBerita) {
    res.status(400);
    throw new Error("Invalid ID.");
  }

  const fileQuery = {
    text: "SELECT pamflet, dokumen FROM tb_berita WHERE id = $1",
    values: [idBerita],
  };

  const fileData = await DB.query(fileQuery);

  if (fileData.rows.length === 0) {
    res.status(404);
    throw new Error("data Not Found.");
  }

  const { pamflet, dokumen } = fileData.rows[0];

  if (pamflet) {
    deleteFile('public/berita/pamflet', pamflet);
  }

  if (dokumen) {
    deleteFile('public/berita/dokumen', dokumen);
  }

  const deleteQuery = {
    text: "DELETE FROM tb_berita WHERE id = $1 RETURNING *",
    values: [idBerita],
  };

  const deletedData = await DB.query(deleteQuery);

  if (deletedData.rows.length > 0) {
    res.status(200).json({
      message: "Successfull deleted data.",
    });
  } else {
    res.status(404);
    throw new Error("Data Not Found.");
  }
});

exports.editStatus = asyncHandler(async (req, res) => {
    const {status} = req.body;
    const {id} = req.params;

    const findData = await DB.query("SELECT * FROM tb_berita WHERE id = $1", [id]);

    if (findData.rows.length) {
      const updateData = await DB.query('UPDATE tb_berita SET status = $1 WHERE id = $2 RETURNING *', [status, id]);

      if (updateData.rows.length) {
        res.status(200).json({
          message: "Successfully changed status.",
        });
      } else {
        res.status(400).json({
          message: "Invalid change status.",
        });
      }
    } else {
      res.status(404).json({
        message: "Data not found.",
      });
    }

})

