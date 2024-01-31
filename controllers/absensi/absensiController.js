const asyncHandler = require("express-async-handler");
const {getMatkul} = require('../../utils/matkul');
const  axios  = require("axios");

exports.getMatkulHelp = asyncHandler(async (req, res) => {
  try {
    const {year, semester, nip} =req.body;

    const result = await getMatkul(year, semester, nip);

    res.status(201).json({
      data: result
    })
  } catch (error) {
    console.log(error)
  }
})

exports.getDataPembelejaran = asyncHandler(async (req, res) => {
  const API_URL = `http://103.158.196.71/fts-absen/public/api/pembelajaran`
  try {
    const response = await axios.get(API_URL, {
      params: {
        dataTable: true,
        orderField: "id",
        orderValue: "desc",
        filter: ["nik_dosen"],
        filterValue: ["410100382"]
      },
    });

    const data = response.data
    res.status(201).json({
      message: "Success",
      data
    })
  } catch (error) {
    console.log(error)
  }
})