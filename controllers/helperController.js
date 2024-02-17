const asyncHandler = require("express-async-handler");
const { getInformaticsStudent, getDosen } = require("../helper/informatics");
const { getIp, deleteIp, queryIpByNpm } = require("../helper/ipk");
const { getKategoriIp } = require("../helper/kategori_ip");
const {getMatkul, getClass} = require('../utils/matkul');
const { gamifyAchievements } = require("../helper/gamifyAchievements");
const { getPrestasi, getOrganisasi, getSertifikasi } = require("../utils/skpi");
const { default: axios } = require("axios");

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

    const {year, semester, nip} =req.body;

    const result = await getMatkul(year, semester, nip);

    res.status(201).json({
      data: result
    })
  } catch (error) {
    console.log(error);
  }
})

exports.getClassControler = asyncHandler(async (req, res) => {
  try {

    const result = await getClass();

    res.status(201).json({
      data: result
    })
  } catch (error) {
    console.log(error);
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

exports.achievementsKategori = asyncHandler(async (req, res) => {
  try {
    const results = await gamifyAchievements();


    res.status(201).json({
      data: results,
    });
  } catch (error) {
    console.error("Error retrieving students by department:", error);
    res.status(500).send("Internal Server Error");
  }
});

// SKPI
exports.getPrestasi = asyncHandler(async (req, res) => {
  try {
    const results = await getPrestasi();


    res.status(201).json({
      data: results,
    });
  } catch (error) {
    console.error("Error retrieving skpi prestasi:", error);
    res.status(500).send("Internal Server Error");
  }
});

exports.getOrganisasi = asyncHandler(async (req, res) => {
  try {
    const results = await getOrganisasi();


    res.status(201).json({
      data: results,
    });
  } catch (error) {
    console.error("Error retrieving skpi organisasi:", error);
    res.status(500).send("Internal Server Error");
  }
});

exports.getSertifikasi = asyncHandler(async (req, res) => {
  try {
    const results = await getSertifikasi();


    res.status(201).json({
      data: results,
    });
  } catch (error) {
    console.error("Error retrieving skpi sertfikasi:", error);
    res.status(500).send("Internal Server Error");
  }
});

exports.getSkpiPerkuliahan = asyncHandler(async (req, res) => {
  const npm = req.user.npm;
  const dataQuery = req.query;

  const tahun = dataQuery.tahun || '2023/2024';
  const semester = dataQuery.semester || 'GENAP';

  const API_URL = `${process.env.API_URL_SKPI}/index.php?menu=jadwal-kuliah&academic_year=${tahun}&semester=${semester}&code=${npm}`
  try {

    const response = await axios.get(API_URL);

    res.status(201).json({
      data: response.data.Data,
      totalData: response.data.Total,
      sks: response.data.SKS
    })
  } catch (error) {
    console.error("Error retrieving Perkuliahan:", error);
    res.status(500).send("Internal Server Error");
  }
})

