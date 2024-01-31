const asyncHandler = require("express-async-handler");
const {getMatkul} = require('../utils/matkul');

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