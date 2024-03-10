const excel = require("exceljs");
const axios = require("axios");
const asyncHandler = require("express-async-handler");

exports.exportListPertemuan = asyncHandler(async (req, res) => {
  const nip = req.query.nip;
  const semester = req.query.semester;

  const GASAL_URL = `${process.env.API_LOCAL_ABSEN}/pembelajaran/list-pertemuan`;


  try {
    const response = await axios.get(GASAL_URL, {
      params: {
        dataTable: true,
        filter: ["semester", "curr_code"],
        filterValue: [semester, "TIF2021"],
        code: nip,
      },
    });

    // Check if 'data' property exists in the response
    if (!response.data || !response.data.data) {
      throw new Error("No data found in the response");
    }

    const workbook = new excel.Workbook();
    const worksheet = workbook.addWorksheet("Absensi");

    worksheet.properties.defaultRowHeight = 15;

    worksheet.addRow(["Laporan Absensi"]).font = { bold: true, size: 16 };
    worksheet.addRow([]);

    // Headers
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
    worksheet.addRow(headers).font = { bold: true };

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
          const columnIndex = colNumber - 5; // Adjust column index to match pertemuan_statusKelas
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

    // Set column widths
    worksheet.columns.forEach((column) => {
      column.width = 15;
    });

    // Set content type and disposition for the response
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader("Content-Disposition", "attachment; filename=absensi.xlsx");

    // Write workbook to response
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error("Error retrieving Absensi:", error);
    res.status(500).send("Internal Server Error");
  }
});
