const axios = require("axios");
const DB = require("../database");
const { unixTimestamp, convertDate } = require("../utils");
const { getKategoriIp } = require("./kategori_ip");
const { executeQuery } = require("./informatics");

async function queryIpByNpm(code) {
  // const code = '201106040468';
  const query = `
    SELECT academic_year, semester, student_code
    FROM siak_frs
    WHERE 1 ${code ? `AND student_code='${code}'` : ""}
    GROUP BY academic_year, semester;
  `;

  try {
    const result = await executeQuery(query);
    const response = { student_code: code, Total: result.length, Data: [] };

    if (result.length > 0) {
      for (const row of result) {
        let totalsks = 0;
        let totalnilaiakhir = 0;
        let angka = 0;
        let totalips = 0;
        let totalipk = 0;

        const sql1 = `
          SELECT f.*, c.name AS course_name, c.credit
          FROM siak_frs f
          INNER JOIN siak_course c ON c.code=f.course_code AND f.curr_code=c.curr_code
          WHERE  f.academic_year='${row.academic_year}'
            AND f.semester='${row.semester}' AND f.student_code='${row.student_code}';
        `;

        const result1 = await executeQuery(sql1);
        for (const rows of result1) {
          switch (rows.grade) {
            case "A":
              angka = 4;
              break;
            case "AB":
              angka = 3.5;
              break;
            case "B":
              angka = 3;
              break;
            case "BC":
              angka = 2.5;
              break;
            case "C":
              angka = 2;
              break;
            case "CD":
              angka = 1.5;
              break;
            case "D":
              angka = 1;
              break;
            case "DE":
              angka = 0.5;
              break;
            case "E":
              angka = 0;
              break;
          }

          totalsks += rows.credit;
          const akhir = angka * rows.credit;
          totalnilaiakhir += akhir;
          const ips = totalnilaiakhir / totalsks;
          totalips = parseFloat(ips.toFixed(2));
        }

        const sql2 = `
          SELECT f.*, c.name AS course_name, c.credit
          FROM siak_frs f
          INNER JOIN siak_course c ON c.code=f.course_code AND f.curr_code=c.curr_code
          WHERE f.student_code='${row.student_code}' AND f.grade IS NOT NULL;
        `;

        const result2 = await executeQuery(sql2);
        let totalsksipk = 0;
        let totalnilaiakhiripk = 0;
        let angkaipk = 0;

        for (const rows2 of result2) {
          switch (rows2.grade) {
            case "A":
              angkaipk = 4;
              break;
            case "AB":
              angkaipk = 3.5;
              break;
            case "B":
              angkaipk = 3;
              break;
            case "BC":
              angkaipk = 2.5;
              break;
            case "C":
              angkaipk = 2;
              break;
            case "CD":
              angkaipk = 1.5;
              break;
            case "D":
              angkaipk = 1;
              break;
            case "DE":
              angkaipk = 0.5;
              break;
            case "E":
              angkaipk = 0;
              break;
          }

          totalsksipk += rows2.credit;
          const akhiripk = angkaipk * rows2.credit;
          totalnilaiakhiripk += akhiripk;
          const ipk = totalnilaiakhiripk / totalsksipk;
          totalipk = parseFloat(ipk.toFixed(2));
        }

        response.Data.push({
          academic_year: row.academic_year,
          semester: row.semester,
          ips: totalips,
          sks: totalsks,
        });

        let predikat = "";
        if (totalipk >= 3.5) {
          predikat = "Dengan Pujian";
        } else if (totalipk >= 3.0) {
          predikat = "Sangat Memuaskan";
        } else if (totalipk >= 2.75) {
          predikat = "Memuaskan";
        } else {
          predikat = "Cukup Memuaskan";
        }

        response.ipk = totalipk;
        response.predikat = predikat;
      }

      return response;
    } else {
      return response;
    }
  } catch (error) {
    console.error(error);
    return { error: "An error occurred" };
  }
}

async function getIp(user_id, npm) {
  try {
    const response = await queryIpByNpm(npm);

    const data = {
      npm: response.student_code,
      ipk: response.ipk,
      total: response.Total,
      data_ips: response.Data,
    };

    const ipCode = await getKategoriIp();

    for (let i = 0; i < data.total; i++) {
      const ip = data.data_ips[i].ips;

      let kodeIp;

      if (ip === 0 || ip < 1.0) {
        kodeIp = ipCode.p1.kode;
      } else if (ip >= 1.0 && ip <= 1.49) {
        kodeIp = ipCode.p2.kode;
      } else if (ip >= 1.5 && ip <= 1.99) {
        kodeIp = ipCode.p3.kode;
      } else if (ip >= 2.0 && ip <= 2.49) {
        kodeIp = ipCode.p4.kode;
      } else if (ip >= 2.5 && ip <= 2.99) {
        kodeIp = ipCode.p5.kode;
      } else if (ip >= 3.0 && ip <= 3.49) {
        kodeIp = ipCode.p6.kode;
      } else if (ip >= 3.5 && ip <= 3.6) {
        kodeIp = ipCode.p7.kode;
      } else if (ip > 3.6 && ip <= 3.7) {
        kodeIp = ipCode.p8.kode;
      } else if (ip > 3.7 && ip <= 3.8) {
        kodeIp = ipCode.p9.kode;
      } else if (ip > 3.8 && ip <= 3.9) {
        kodeIp = ipCode.p10.kode;
      } else if (ip > 3.9 && ip <= 4.0) {
        kodeIp = ipCode.p11.kode;
      }

      const updated_at = unixTimestamp;
      const convert = convertDate(updated_at);

      const dataInsert = {
        user_id: user_id,
        semester: data.data_ips[i].semester,
        academic_year: data.data_ips[i].academic_year,
        ips: ip,
        kode: kodeIp,
        created_at: convert,
      };

      await DB.query(
        "INSERT INTO tb_ip_mhs(user_id, semester, tahun, ip, kode_ip, created_at, status) VALUES ($1, $2, $3, $4, $5, $6, $7)",
        [
          dataInsert.user_id,
          dataInsert.semester,
          dataInsert.academic_year,
          dataInsert.ips,
          dataInsert.kode,
          dataInsert.created_at,
          1,
        ]
      );
    }

    const getIp = await DB.query(
      `SELECT COUNT(*) FROM tb_ip_mhs JOIN kategori_ip ON tb_ip_mhs.kode_ip = kategori_ip.kode WHERE user_id = $1 AND status = $2 AND is_deleted = $3`,
      [user_id, 1, false]
    );
    const totalIpMhs = getIp.rows[0].count;

    if (totalIpMhs > 0) {
      const sumPoint = await DB.query(
        "SELECT SUM(point) AS total_points FROM kategori_ip JOIN tb_ip_mhs ON tb_ip_mhs.kode_ip = kategori_ip.kode WHERE user_id = $1 and status = $2 and is_deleted = $3",
        [user_id, 1, false]
      );

      let totalPoints;

      if (totalIpMhs > 8) {
        const calculate = (totalIpMhs - 8) * 400;
        totalPoints = sumPoint.rows[0].total_points - calculate;
      } else {
        totalPoints = sumPoint.rows[0].total_points;
      }

      await DB.query(
        "UPDATE tb_data_pribadi SET point_pendidikan = $1, ipk = $2 WHERE user_id = $3",
        [totalPoints, data.ipk, user_id]
      );
    }

    const status = 200;

    return status;
  } catch (error) {
    console.error("Error fetching or inserting data IPS:", error.message);
    throw new Error("Failed to retrieve or insert data IPS.");
  }
}

async function deleteIp(user_id) {
  try {
    await DB.query("DELETE FROM tb_ip_mhs WHERE user_id = $1", [user_id]);

    const status = 200;
    return status;
  } catch (error) {
    console.error("Error fetching or delete data:", error.message);
    throw new Error("Failed to retrieve or delete data.");
  }
}

module.exports = {
  queryIpByNpm,
  getIp,
  deleteIp,
};
