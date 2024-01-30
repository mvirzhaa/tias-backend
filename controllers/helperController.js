const asyncHandler = require("express-async-handler");
const { getInformaticsStudent, getDosen } = require("../helper/informatics");
const { getIp, deleteIp, queryIpByNpm } = require("../helper/ipk");
const { getKategoriIp } = require("../helper/kategori_ip");
const {getMatkul} = require('../utils/matkul');

exports.getInformaticsStudent = asyncHandler(async (req, res) => {
  try {
    const departmentCode = "FT_TI";
    const results = await getInformaticsStudent(departmentCode);

    const npm = "201106040468";

    const studentWithNpm = results.find((student) => student.code === npm);

    res.status(201).json({
      data: results,
    });
  } catch (error) {
    console.error("Error retrieving students by department:", error);
    res.status(500).send("Internal Server Error");
  }
});

exports.getDosenInfromatics = asyncHandler(async (req, res) => {
  try {
    const departmentCode = "FT_TI";
    const results = await getDosen(departmentCode);

    res.status(201).json({
      data: results,
    });
  } catch (error) {
    console.error("Error retrieving students by department:", error);
    res.status(500).send("Internal Server Error");
  }
});

exports.getIpMhs = asyncHandler(async (req, res) => {
  try {
    const npm = "201106040468";
    const userId = 'd486f7e1-9988-4804-a288-65e89bf868f9'
    const results = await getIp(userId, npm);


    res.status(201).json({
      data: results,
    });
  } catch (error) {
    console.error("Error retrieving students by department:", error);
    res.status(500).send("Internal Server Error");
  }
});

exports.getKategoriIp = asyncHandler(async (req, res) => {
  try {
    const results = await getKategoriIp();


    res.status(201).json({
      data: results,
    });
  } catch (error) {
    console.error("Error retrieving students by department:", error);
    res.status(500).send("Internal Server Error");
  }
});

exports.getMatkulHelp = asyncHandler(async (req, res) => {
  try {

    const year = '2023/2024';
    const semester = 'GASAL';
    const nip = '410100405';

    const result = await getMatkul(year, semester, nip);

    res.status(201).json({
      data: result
    })
  } catch (error) {
    
  }
})

exports.queryIp = asyncHandler(async (req, res) => {
  try {

    const result = await queryIpByNpm();

    res.status(201).json({
      data: result
    })
  } catch (error) {
    
  }
})