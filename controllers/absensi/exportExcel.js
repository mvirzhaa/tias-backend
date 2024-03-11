const excel = require("exceljs");
const axios = require("axios");
const asyncHandler = require("express-async-handler");
const DB = require("../../database/index");

exports.exportListPertemuan = asyncHandler(async (req, res) => {
  const nip = req.query.nip;
  const semester = req.query.semester;

  const API_URL = `${process.env.API_LOCAL_ABSEN}/pembelajaran/list-pertemuan`;

  try {
    const response = await axios.get(API_URL, {
      params: {
        dataTable: true,
        filter: ["semester", "curr_code"],
        filterValue: [semester, "TIF2021"],
        code: nip,
      },
    });

    const nameDosen = await DB.query(
      "SELECT nama_lengkap FROM tb_data_pribadi WHERE nip = $1",
      [nip]
    );

    if (!response.data || !response.data.data) {
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

  const API_URL = `${process.env.API_LOCAL_ABSEN}/pembelajaran/list-absen`;

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
