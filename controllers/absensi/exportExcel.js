const excel = require("exceljs");
const axios = require("axios");
const asyncHandler = require("express-async-handler");
const DB = require("../../database/index");
const {
  formatDateToIndonesian,
  isoToDateId,
} = require("../../helper/dateTimeToId");

const fs = require("fs-extra");

exports.exportsRekapPertemuan = asyncHandler(async (req, res) => {
  const id_matkul = req.query.id_matkul;
  const kelas = req.query.kelas;

  const API_URL = `${process.env.API_LOCAL_ABSEN_AGAIN}/pembelajaran`;

  const response = await axios.get(API_URL, {
    params: {
      orderField: "id",
      orderValue: "asc",
    },
  });

  let data = response.data.data;

  data = data.filter(
    (item) => item.id_matkul === id_matkul && item.kelas === kelas
  );

  if (data.length === 0) {
    res.status(404);
    throw new Error("Data not found");
  }

  const workbook = new excel.Workbook();
  const worksheet = workbook.addWorksheet("Absensi");

  worksheet.properties.defaultRowHeight = 15;
  worksheet.mergeCells("A1", "B1");
  worksheet.getCell("A1").value = "Nama Dosen/Tenaga Pengajar:";
  worksheet.getCell(
    "C1"
  ).value = `${data[0].dosen.nama}${data[0].dosen.gelar_belakang}`;

  worksheet.mergeCells("D1", "E1");
  worksheet.getCell("D1").value = "Jumlah SKS:";
  worksheet.getCell("F1").value = `${data[0].matkul.credit}`;

  worksheet.mergeCells("A2", "B2");
  worksheet.getCell("A2").value = "Nama Matakuliah:";
  worksheet.getCell("C2").value = `${data[0].matkul.name}`;

  worksheet.mergeCells("D2", "E2");
  worksheet.getCell("D2").value = "Program Studi:";
  worksheet.getCell("F2").value = `${data[0].matkul.department_code}`;

  worksheet.mergeCells("A3", "B3");
  worksheet.getCell("A3").value = "Kode Matakuliah:";
  worksheet.getCell("C3").value = `${data[0].id_matkul}`;

  worksheet.mergeCells("D3", "E3");
  worksheet.getCell("D3").value = "Semester/Kelas:";
  worksheet.getCell("F3").value = `${data[0].kelas}`;

  for (let i = 1; i <= 3; i++) {
    for (let j = 1; j <= 6; j++) {
      const cell = worksheet.getCell(`${String.fromCharCode(65 + j)}${i}`);
      cell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      };
    }
  }
  worksheet.addRow([]);

  const tableHeader = [
    "kuliah ke-",
    "Hari",
    "Tanggal",
    "Waktu Mulai",
    "Waktu Selesai",
    "RPS",
    "Realisasi RPS",
    "Paraf Dosen / TP",
    "Wakil Mahasiswa",
    "Paraf",
    "Jumlah Mahasiswa",
    "Paraf Prodi",
    "Dosen Pengganti/Tamu",
  ];

  const headerRow = worksheet.addRow(tableHeader);
  headerRow.eachCell((cell) => {
    cell.border = {
      top: { style: "thin" },
      left: { style: "thin" },
      bottom: { style: "thin" },
      right: { style: "thin" },
    };
    cell.font = { bold: true };
  });

  const getTtdProdi = await DB.query(
    "SELECT * FROM tb_data_pribadi WHERE nip = $1",
    ["410100569"]
  );
  const ttdProdi = `public/ttd/${getTtdProdi.rows[0].ttd}`;

  const queries = [];
  for (const row of data) {
    let learningDone;
    learningDone = row.learning_done
      ? formatDateToIndonesian(row.learning_done)
      : "";

    const createdAt = isoToDateId(row.created_at);
    const hari = createdAt.dayOfWeek;
    const tgl = `${createdAt.day} ${createdAt.month} ${createdAt.year}`;
    const learningStart = `${createdAt.hours}:${createdAt.minutes}`;
    const dosenPenganti = row.dosen_pengganti ? row.dosen_pengganti.nama : "";
    const dosenTamu = row.dosen_tamu ? row.dosen_tamu : "";

    const getDosen = await DB.query(
      "SELECT * FROM tb_data_pribadi WHERE nip = ANY($1)",
      [[row.nik_dosen]]
    );
    const getKomti = await DB.query(
      "SELECT tb_users.*, tb_data_pribadi.* FROM tb_users JOIN tb_data_pribadi ON tb_users.user_id = tb_data_pribadi.user_id WHERE tb_users.npm = ANY($1)",
      [[row.npm_komti]]
    );

    const ttdDosen = `public/ttd/${getDosen.rows[0].ttd}`;
    const ttdKomti =
      getKomti.rows.length && getKomti.rows[0].ttd
        ? `public/ttd/${getKomti.rows[0].ttd}`
        : "";

    const rowData = [
      row.pertemuan,
      hari,
      tgl,
      learningStart,
      learningDone,
      row.rps_dasar || "",
      row.rps_pelaksanaan || "",
      "",
      getKomti.rows.length ? getKomti.rows[0].nama_lengkap : "",
      "",
      "",
      "",
      `${dosenPenganti}${dosenTamu}`,
    ];
    const dataRow = worksheet.addRow(rowData);

    dataRow.eachCell((cell) => {
      cell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      };
    });

    if (ttdDosen) {
      const imageIdDosen = workbook.addImage({
        filename: ttdDosen,
        extension: "png",
      });

      worksheet.addImage(imageIdDosen, {
        tl: { col: 7, row: dataRow.number },
        br: { col: 8, row: dataRow.number - 1 },
        editAs: "oneCell",
      });
    }

    if (ttdKomti) {
      const imageIdKomti = workbook.addImage({
        filename: ttdKomti,
        extension: "png",
      });

      worksheet.addImage(imageIdKomti, {
        tl: { col: 9, row: dataRow.number },
        br: { col: 10, row: dataRow.number - 1 },
        editAs: "oneCell",
      });
    }

    const imageIdProdi = workbook.addImage({
      filename: ttdProdi,
      extension: "png",
    });

    worksheet.addImage(imageIdProdi, {
      tl: { col: 11, row: dataRow.number },
      br: { col: 12, row: dataRow.number - 1 },
      editAs: "oneCell",
    });
  }

  await Promise.all(queries);

  res.setHeader(
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  );

  res.set("Access-Control-Expose-Headers", "Content-Disposition");

  res.set(
    "Content-Disposition",
    "attachment; filename=" +
      `${data[0].dosen.nama}-${data[0].matkul.name}-${data[0].kelas}.xlsx`
  );

  await workbook.xlsx.write(res);
  res.end();
});

// exports.exportsRekapPertemuan = asyncHandler(async (req, res) => {
//   const id_matkul = req.query.id_matkul;
//   const kelas = req.query.kelas;

//   const API_URL = `${process.env.API_LOCAL_ABSEN_AGAIN}/pembelajaran`;

//   const response = await axios.get(API_URL, {
//     params: {
//       orderField: "id",
//       orderValue: "asc",
//     },
//   });

//   let data = response.data.data;

//   data = data.filter(
//     (item) => item.id_matkul === id_matkul && item.kelas === kelas
//   );

//   if (data.length === 0) {
//     res.status(404);
//     throw new Error("Data not found");
//   }

//   const workbook = new excel.Workbook();
//   const worksheet = workbook.addWorksheet("Absensi");

//   worksheet.properties.defaultRowHeight = 15;
//   worksheet.mergeCells("A1", "B1");
//   worksheet.getCell("A1").value = "Nama Dosen/Tenaga Pengajar:";
//   worksheet.getCell(
//     "C1"
//   ).value = `${data[0].dosen.nama}${data[0].dosen.gelar_belakang}`;

//   worksheet.mergeCells("D1", "E1");
//   worksheet.getCell("D1").value = "Jumlah SKS:";
//   worksheet.getCell("F1").value = `${data[0].matkul.credit}`;

//   worksheet.mergeCells("A2", "B2");
//   worksheet.getCell("A2").value = "Nama Matakuliah:";
//   worksheet.getCell("C2").value = `${data[0].matkul.name}`;

//   worksheet.mergeCells("D2", "E2");
//   worksheet.getCell("D2").value = "Program Studi:";
//   worksheet.getCell("F2").value = `${data[0].matkul.department_code}`;

//   worksheet.mergeCells("A3", "B3");
//   worksheet.getCell("A3").value = "Kode Matakuliah:";
//   worksheet.getCell("C3").value = `${data[0].id_matkul}`;

//   worksheet.mergeCells("D3", "E3");
//   worksheet.getCell("D3").value = "Semester/Kelas:";
//   worksheet.getCell("F3").value = `${data[0].kelas}`;

//   for (let i = 1; i <= 3; i++) {
//     for (let j = 1; j <= 6; j++) {
//       const cell = worksheet.getCell(`${String.fromCharCode(65 + j)}${i}`);
//       cell.border = {
//         top: { style: "thin" },
//         left: { style: "thin" },
//         bottom: { style: "thin" },
//         right: { style: "thin" },
//       };
//     }
//   }
//   worksheet.addRow([]);

//   const tableHeader = [
//     "kuliah ke-",
//     "Hari",
//     "Tanggal",
//     "Waktu Mulai",
//     "Waktu Selesai",
//     "RPS",
//     "Realisasi RPS",
//     "Paraf Dosen / TP",
//     "Wakil Mahasiswa",
//     "Paraf",
//     "Jumlah Mahasiswa",
//     "Paraf Prodi",
//     "Dosen Pengganti/Tamu",
//   ];

//   const headerRow = worksheet.addRow(tableHeader);
//   headerRow.eachCell((cell) => {
//     cell.border = {
//       top: { style: "thin" },
//       left: { style: "thin" },
//       bottom: { style: "thin" },
//       right: { style: "thin" },
//     };
//     cell.font = { bold: true };
//   });

//   const queries = [];
//   for (const row of data) {
//     let learningDone;
//     learningDone = row.learning_done
//       ? formatDateToIndonesian(row.learning_done)
//       : "";

//     const createdAt = isoToDateId(row.created_at);
//     const hari = createdAt.dayOfWeek;
//     const tgl = `${createdAt.day} ${createdAt.month} ${createdAt.year}`;
//     const learningStart = `${createdAt.hours}:${createdAt.minutes}`;
//     const dosenPenganti = row.dosen_pengganti ? row.dosen_pengganti.nama : "";
//     const dosenTamu = row.dosen_tamu ? row.dosen_tamu : "";

//     const getDosen = await DB.query(
//       "SELECT * FROM tb_data_pribadi WHERE nip = ANY($1)",
//       [[row.nik_dosen]]
//     );
//     const getKomti = await DB.query(
//       "SELECT tb_users.*, tb_data_pribadi.* FROM tb_users JOIN tb_data_pribadi ON tb_users.user_id = tb_data_pribadi.user_id WHERE tb_users.npm = ANY($1)",
//       [[row.npm_komti]]
//     );

//     const ttdDosen = `public/ttd/${getDosen.rows[0].ttd}`;
//     const ttdKomti =
//       getKomti.rows.length && getKomti.rows[0].ttd
//         ? `public/ttd/${getKomti.rows[0].ttd}`
//         : "";

//     const rowData = [
//       row.pertemuan,
//       hari,
//       tgl,
//       learningStart,
//       learningDone,
//       row.rps_dasar || "",
//       row.rps_pelaksanaan || "",
//       "",
//       getKomti.rows.length ? getKomti.rows[0].nama_lengkap : "",
//       "",
//       "",
//       "",
//       `${dosenPenganti}${dosenTamu}`,
//     ];

//     const dataRow = worksheet.addRow(rowData);

//     dataRow.eachCell((cell) => {
//       cell.border = {
//         top: { style: "thin" },
//         left: { style: "thin" },
//         bottom: { style: "thin" },
//         right: { style: "thin" },
//       };
//     });

//     if (ttdDosen) {
//       const imageIdDosen = workbook.addImage({
//         filename: ttdDosen,
//         extension: "png",
//       });

//       worksheet.addImage(imageIdDosen, {
//         tl: { col: 7, row: dataRow.number },
//         br: { col: 8, row: dataRow.number - 1 },
//         editAs: "oneCell",
//       });
//     }

//     if (ttdKomti) {
//       const imageIdKomti = workbook.addImage({
//         filename: ttdKomti,
//         extension: "png",
//       });

//       worksheet.addImage(imageIdKomti, {
//         tl: { col: 9, row: dataRow.number },
//         br: { col: 10, row: dataRow.number - 1 },
//         editAs: "oneCell",
//       });
//     }
//   }

//   await Promise.all(queries);

//   res.setHeader(
//     "Content-Type",
//     "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
//   );

//   res.set("Access-Control-Expose-Headers", "Content-Disposition");

//   res.set(
//     "Content-Disposition",
//     "attachment; filename=" +
//       `${data[0].dosen.nama}-${data[0].matkul.name}-${data[0].kelas}.xlsx`
//   );

//   await workbook.xlsx.write(res);
//   res.end();
// });

exports.exportsPersentaseDosen = asyncHandler(async (req, res) => {
  const API_URL = `${process.env.API_LOCAL_ABSEN_AGAIN}/pembelajaran/list-dosen-pertemuan`;

  const response = await axios.get(API_URL, {
    params: {
      ...req.query,
    },
  });

  const data = response.data.data;

  if (data.length === 0) {
    res.status(404);
    throw new Error("Data not found");
  }

  const workbook = new excel.Workbook();
  const worksheet = workbook.addWorksheet("Absensi");

  worksheet.addRow([`Laporan persentase Absensi Dosen`]).font = {
    bold: true,
    size: 16,
  };

  worksheet.addRow([]);

  const tableHeader = [
    "nik",
    "nidn",
    "Nama",
    "Total Matakuliah GASAL",
    "Total Matakuliah Genap",
    "Pesentase GASAL",
    "Persentase GENAP",
  ];

  const headerRow = worksheet.addRow(tableHeader);
  headerRow.eachCell((cell) => {
    cell.border = {
      top: { style: "thin" },
      left: { style: "thin" },
      bottom: { style: "thin" },
      right: { style: "thin" },
    };
    cell.font = { bold: true };
  });

  data.forEach((row, index) => {
    const rowData = [
      row.code_lecturer,
      row.nik,
      row.name,
      row.ttl_matkulGasal,
      row.ttl_matkulGenap,
      row.persentase_gasal,
      row.persentase_genap,
    ];
    const dataRow = worksheet.addRow(rowData);

    dataRow.eachCell((cell) => {
      cell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      };
    });
  });

  res.setHeader(
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  );

  res.set("Access-Control-Expose-Headers", "Content-Disposition");

  res.set(
    "Content-Disposition",
    "attachment; filename=" + `persentase-absensi-dosen.xlsx`
  );

  await workbook.xlsx.write(res);
  res.end();
});

exports.exportListPertemuan = asyncHandler(async (req, res) => {
  const nip = req.query.nip;
  const semester = req.query.semester;

  const API_URL = `${process.env.API_LOCAL_ABSEN_AGAIN}/pembelajaran/list-pertemuan`;

  try {
    const response = await axios.get(API_URL, {
      params: {
        dataTable: true,
        filter: ["semester"],
        filterValue: [semester],
        code: nip,
      },
    });

    const nameDosen = await DB.query(
      "SELECT nama_lengkap FROM tb_data_pribadi WHERE nip = $1",
      [nip]
    );

    if (!response.data || !response.data.data) {
      res.status(404);
      throw new Error("No data found in the response");
    }

    const workbook = new excel.Workbook();
    const worksheet = workbook.addWorksheet("Absensi");

    worksheet.properties.defaultRowHeight = 15;

    worksheet.addRow([
      `Laporan Absensi ${nameDosen.rows[0].nama_lengkap}`,
    ]).font = { bold: true, size: 16 };
    worksheet.addRow([`Semester: ${semester}`]).font = {
      bold: true,
      size: 16,
    };
    worksheet.addRow([]);

    const headers = [
      "No",
      "Kurikulum",
      "Matakuliah",
      "Kelas",
      ...[...Array(7)].map((_, index) => index + 1),
      "UTS",
      ...[...Array(7)].map((_, index) => index + 8),
      "UAS",
      "%",
    ];
    const headerRow = worksheet.addRow(headers);
    headerRow.font = { bold: true };

    headerRow.eachCell((cell) => {
      cell.border = {
        top: { style: "thin", color: { argb: "000000" } },
        left: { style: "thin", color: { argb: "000000" } },
        bottom: { style: "thin", color: { argb: "000000" } },
        right: { style: "thin", color: { argb: "000000" } },
      };
    });

    const data = response.data.data;

    data.forEach((row, index) => {
      const rowData = [
        index + 1,
        row.curr_code || "",
        row.name_matkul || "",
        row.class || "",
        ...(row.pertemuan_statusKelas || []).slice(0, 7),
        "",
        ...(row.pertemuan_statusKelas || []).slice(7, 14),
        "",
        row.persentase || "",
      ];

      if (rowData.some((value) => value === undefined)) {
        console.log("Skipping row due to missing data:", rowData);
        return;
      }

      const rowExcel = worksheet.addRow(rowData);

      rowExcel.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        if (colNumber >= 5 && colNumber <= 11) {
          const columnIndex = colNumber - 5;
          const statusKelas = row.pertemuan_statusKelas[columnIndex];
          let color;
          switch (statusKelas) {
            case "Offline":
              color = "00FF00"; // Green
              break;
            case "Online":
              color = "0000FF"; // Blue
              break;
            case "Hybrid":
              color = "800080"; // Purple
              break;
            default:
              color = "FFFFFF"; // white
              break;
          }
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: color },
          };
        } else if (colNumber >= 13 && colNumber <= 19) {
          const columnIndex = colNumber - 8;
          const statusKelas = row.pertemuan_statusKelas[columnIndex];
          let color;
          if (statusKelas !== null) {
            switch (statusKelas) {
              case "Offline":
                color = "00FF00"; // Green
                break;
              case "Online":
                color = "0000FF"; // Blue
                break;
              case "Hybrid":
                color = "800080"; // Purple
                break;
              default:
                color = "FFFFFF"; // white
                break;
            }
          } else {
            color = "FFFFFF";
          }
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: color },
          };
        } else if (colNumber === 12 || colNumber === 20) {
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "808080" }, // Gray
          };
        }
        cell.border = {
          top: { style: "thin", color: { argb: "000000" } },
          left: { style: "thin", color: { argb: "000000" } },
          bottom: { style: "thin", color: { argb: "000000" } },
          right: { style: "thin", color: { argb: "000000" } },
        };
      });
    });

    worksheet.columns.forEach((column) => {
      column.width = 15;
    });

    res.header(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.set("Access-Control-Expose-Headers", "Content-Disposition");

    res.set(
      "Content-Disposition",
      `attachment; filename="${nameDosen.rows[0].nama_lengkap}-${semester}.xlsx"`
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error("Error retrieving Absensi:", error);
    res.status(500).send("Internal Server Error");
  }
});

exports.exportListAbsensi = asyncHandler(async (req, res) => {
  const { idMatkul, kelas } = req.query;

  const API_URL = `${process.env.API_LOCAL_ABSEN_AGAIN}/pembelajaran/list-absen`;

  try {
    const response = await axios.get(API_URL, {
      params: {
        dataTable: true,
        id_matkul: idMatkul,
        kelas: kelas,
      },
    });

    const data = response.data.data;
    const nameMatkul = response.data.matkul.name;
    const kelasMatkul = response.data.matkul.class;
    const tahun = response.data.matkul.academic_year;

    const workbook = new excel.Workbook();
    const worksheet = workbook.addWorksheet("Absensi");

    worksheet.properties.defaultRowHeight = 15;

    worksheet.addRow([nameMatkul]).font = { bold: true, size: 16 };
    worksheet.addRow([`${kelasMatkul} | ${tahun}`]).font = {
      bold: true,
      size: 16,
    };
    worksheet.addRow([]);

    const tableHeader = [
      "No",
      "Nama",
      "NPM",
      ...Array.from({ length: 7 }, (_, i) => i + 1),
      "UTS",
      ...Array.from({ length: 7 }, (_, i) => i + 8),
      "UAS",
      "%",
    ];

    const headerRow = worksheet.addRow(tableHeader);
    headerRow.eachCell((cell) => {
      cell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      };
    });

    data.forEach((row, index) => {
      const rowData = [
        index + 1,
        row.name_mhs,
        row.npm,
        ...row.status_absen.slice(0, 7).map((status) => {
          if (status === 1) return "Y";
          if (status === 0) return "A";
          if (status === 2) return "S/I";
          return "-";
        }),
        "",
        ...row.status_absen.slice(7, 14).map((status) => {
          if (status === 1) return "Y";
          if (status === 0) return "A";
          if (status === 2) return "S/I";
          return "-";
        }),
        "",
        row.persentase || "",
      ];
      const dataRow = worksheet.addRow(rowData);

      dataRow.getCell(11).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF0000FF" },
      };

      dataRow.getCell(19).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF0000FF" },
      };

      dataRow.eachCell((cell) => {
        cell.border = {
          top: { style: "thin" },
          left: { style: "thin" },
          bottom: { style: "thin" },
          right: { style: "thin" },
        };
      });
    });

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );

    res.set("Access-Control-Expose-Headers", "Content-Disposition");

    res.set(
      "Content-Disposition",
      "attachment; filename=" + `${nameMatkul}-${kelasMatkul}.xlsx`
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error("Error retrieving Absensi:", error);
    res.status(500).send("Internal Server Error");
  }
});
