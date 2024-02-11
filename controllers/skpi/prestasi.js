const asyncHandler = require("express-async-handler");
const { getMatkul } = require('../../utils/matkul');
const axios = require("axios");

exports.getDataPrestasi = asyncHandler(async (req, res) => {
  const API_URL = `https://skpi.uika-bogor.ac.id/restApi/index.php?menu=prestasi`
  try {
    const response = await axios.get(API_URL);
    const data = response.data.Hasil;

    res.status(200).json(data); // Mengirimkan data sebagai respons JSON ke klien dengan status HTTP 200
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Internal server error" });
  }
});

