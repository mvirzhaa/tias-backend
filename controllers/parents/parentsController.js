const { Op } = require("sequelize");
const _ = require("lodash");
const { getPagination } = require("../../lib/pagination-parser");
const { response } = require("../../lib/response");
const { CastObject } = require("../../lib/general");
const User = require("../../models/User");
const DataPribadi = require("../../models/DataPribadi");
const ExcelJS = require("exceljs");
const { getDataImportMhs, getRandomSixDigit } = require("../../helper/general");
const Parents = require("../../models/Parents");
const TrxParentMhs = require("../../models/TrxParentMhs");
const db = require("../../config");
const bcrypt = require("bcryptjs");
const { sendVerificationToken } = require("../../utils/whatsapp");
const { generateToken, hashToken, unixTimestamp, convertDate, expires_at } = require("../../utils");
const crypto = require("crypto");
const DB = require("../../database");
const sendMail = require("../../utils/sendMail");
const { formRegisterParentValidation } = require("../../validation/formValidation");

class ParentsController {
  // =====================================================================
  // REGISTER
  // =====================================================================
  static register = async (req, res) => {
    const transaction = await db.transaction();

    try {
      const {
        nama_lengkap,
        email,
        npm,
        no_hp,
        nik,
        password,
        password2,
      } = req.body;

      // Validasi form
      const { error } = formRegisterParentValidation(req.body);

      if (error) {
        await transaction.rollback();
        return response(
          res,
          false,
          error.details[0].message,
          null,
          400
        );
      }

      // Cek mahasiswa berdasarkan NPM
      const findMhs = await User.findOne({
        where: {
          npm,
          role: "Mahasiswa",
        },
        transaction,
      });

      if (!findMhs) {
        await transaction.rollback();
        return response(
          res,
          false,
          "NPM mahasiswa tidak ditemukan.",
          null,
          404
        );
      }

      // Cek apakah email sudah digunakan
      const existingParentEmail = await Parents.findOne({
        where: { email },
        transaction,
      });

      if (existingParentEmail) {
        await transaction.rollback();
        return response(
          res,
          false,
          "Email sudah terdaftar.",
          null,
          400
        );
      }

      // Cek apakah NPM sudah pernah digunakan parent lain
      const existingParentNpm = await Parents.findOne({
        where: { npm },
        transaction,
      });

      if (existingParentNpm) {
        await transaction.rollback();
        return response(
          res,
          false,
          "NPM tersebut sudah terhubung dengan akun orang tua mahasiswa lain.",
          null,
          400
        );
      }

      // Hash password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      // Buat akun parent
      const newParent = await Parents.create(
        {
          role: "Parent",
          nik,
          email,
          nama_lengkap,
          npm,
          no_hp,
          password: hashedPassword,
          is_verified: false,
          created_at: new Date(),
          updated_at: new Date(),
        },
        { transaction }
      );

      // Relasi parent dan mahasiswa
      await TrxParentMhs.create(
        {
          parent_id: newParent.id,
          mhs_id: findMhs.user_id,
          created_at: new Date(),
          updated_at: new Date(),
        },
        { transaction }
      );

      // Generate token verifikasi
      const verificationToken =
        crypto.randomBytes(32).toString("hex") + newParent.id;

      const hashedTkn = hashToken(verificationToken);

      const unix = unixTimestamp;
      const createdAt = await convertDate(unix);

      const unixExpires = expires_at;
      const expiresAt = await convertDate(unixExpires);

      await DB.query(
        "INSERT INTO token(user_id, verif_token, created_at, expires_at) VALUES ($1, $2, $3, $4)",
        [newParent.id.toString(), hashedTkn, createdAt, expiresAt]
      );

      // Kirim email verifikasi
      const verificationUrl = `${process.env.API_URL}/auth/verifyUser/${verificationToken}`;

      await sendMail(
        "Verify Your Account",
        email,
        process.env.EMAIL_USER,
        "verifyEmail",
        verificationUrl
      );

      await transaction.commit();

      return response(
        res,
        true,
        `Email verifikasi berhasil dikirim ke ${email}.`,
        newParent,
        201
      );
    } catch (error) {
      await transaction.rollback();

      return response(
        res,
        false,
        error.message,
        null,
        500
      );
    }
  };

  static exportExcelMhs = async (req, res) => {
    try {
      const users = await User.findAll({
        where: { role: "Mahasiswa" },
        include: {
          model: DataPribadi,
          as: "personal_data",
          attributes: ["nama_lengkap", "nik", "ibu_kandung", "tanggal_lahir", "no_hp"],
        },
      });
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Users Data");
      worksheet.columns = [
        { header: "NIK", key: "nik", width: 20 },
        { header: "Password Orang Tua", key: "password_parent", width: 15 },
        { header: "NPM", key: "npm", width: 30 },
        { header: "Email", key: "email", width: 30 },
        { header: "Nama Lengkap", key: "nama_lengkap", width: 30 },
        { header: "Ibu Kandung", key: "ibu_kandung", width: 30 },
        { header: "Tanggal Lahir", key: "tanggal_lahir", width: 20 },
        { header: "No HP", key: "no_hp", width: 15 },
        { header: "Mhs ID", key: "mhs_id", width: 20 },
      ];
      users.forEach((user) => {
        let passwordParent = null;
        if (user.personal_data && user.personal_data.tanggal_lahir) {
          passwordParent = new Date(user.personal_data.tanggal_lahir).toISOString().split("T")[0].split("-").reverse().join("");
        }
        worksheet.addRow({
          nik: user.personal_data ? user.personal_data.nik : "-",
          password_parent: passwordParent,
          npm: user.npm,
          email: user.email,
          nama_lengkap: user.personal_data ? user.personal_data.nama_lengkap : "-",
          ibu_kandung: user.personal_data ? user.personal_data.ibu_kandung : "-",
          tanggal_lahir: user.personal_data ? user.personal_data.tanggal_lahir : "-",
          no_hp: user.personal_data ? user.personal_data.no_hp : "-",
          mhs_id: user.user_id,
        });
      });
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader("Content-Disposition", "attachment; filename=users-data.xlsx");
      await workbook.xlsx.write(res);
      res.end();
    } catch (error) {
      return response(res, false, error.message, error);
    }
  };

  static importParent = async (req, res) => {
    const transaction = await db.transaction();
    try {
      let { file } = req.body;
      const dataMhs = await getDataImportMhs(file[0].filepath);
      let dataParents = dataMhs.map(iterator => ({
        role: "Parent",
        nik: iterator.nik || null,
        email: iterator.email,
        nama_lengkap: iterator.nama_ibu,
        npm: iterator.npm,
        no_hp: iterator.phone || null,
        password: iterator.password, // sudah di-hash oleh getDataImportMhs
        is_verified: true,           // import oleh admin → langsung terverifikasi
        created_at: new Date(),
        updated_at: new Date(),
      }));
      const insertedParents = await Parents.bulkCreate(dataParents, { returning: true, transaction });
      let dataTrx = dataMhs.map((mhs, i) => ({ parent_id: insertedParents[i].id, mhs_id: mhs.mhs_id }));
      await TrxParentMhs.bulkCreate(dataTrx, { transaction });
      await transaction.commit();
      response(res, true, "success", dataMhs);
    } catch (error) {
      await transaction.rollback();
      response(res, false, "error", error.message);
    }
  };

  static login = async (req, res) => {
    try {
      const { email, password } = req.body;

      // Validasi input
      if (!email || !password) {
        return response(
          res,
          false,
          "Email dan password wajib diisi.",
          null,
          400
        );
      }

      // Cek akun parent berdasarkan email
      const findParent = await Parents.findOne({
        where: { email },
      });

      if (!findParent) {
        return response(
          res,
          false,
          "Email atau password salah.",
          null,
          400
        );
      }

      // Cek password
      const isMatch = await bcrypt.compare(
        password,
        findParent.password
      );

      if (!isMatch) {
        return response(
          res,
          false,
          "Email atau password salah.",
          null,
          400
        );
      }

      // Cek verifikasi akun
      if (!findParent.is_verified) {
        // Hapus token lama jika ada
        await DB.query("DELETE FROM token WHERE user_id = $1", [
          findParent.id.toString(),
        ]);

        // Buat token verifikasi baru
        const verificationToken =
          crypto.randomBytes(32).toString("hex") + findParent.id;
        const hashedTkn = hashToken(verificationToken);

        const unix = unixTimestamp;
        const createdAt = await convertDate(unix);
        const unixExpires = expires_at;
        const expiresAt = await convertDate(unixExpires);

        await DB.query(
          "INSERT INTO token(user_id, verif_token, created_at, expires_at) VALUES ($1, $2, $3, $4)",
          [findParent.id.toString(), hashedTkn, createdAt, expiresAt]
        );

        // Kirim email verifikasi baru
        const verificationUrl = `${process.env.API_URL}/auth/verifyUser/${verificationToken}`;
        await sendMail(
          "Verify Your Account",
          email,
          process.env.EMAIL_USER,
          "verifyEmail",
          verificationUrl
        );

        return response(
          res,
          false,
          "Akun belum diverifikasi. Email verifikasi baru telah dikirim ke email Anda.",
          null,
          403
        );
      }

      // Generate token
      const token = generateToken(findParent.id);

      // Simpan token ke cookie
      res.cookie("token", token, {
        path: "/",
        httpOnly: true,
        expires: new Date(
          Date.now() + 30 * 24 * 60 * 60 * 1000
        ),
        sameSite: "none",
        secure: true,
      });

      // Response sukses — password hash tidak dikembalikan ke client
      const { password: _pw, ...parentSafe } = findParent.dataValues;
      return response(
        res,
        true,
        "Login berhasil.",
        { ...parentSafe, token },
        200
      );
    } catch (error) {
      return response(
        res,
        false,
        error.message || "Terjadi kesalahan pada server.",
        null,
        500
      );
    }
  };

  static getUserLogin = async (req, res) => {
    try {
      const data = await Parents.findOne({ where: { id: req.user.id } });
      if (!data) return response(res, false, "user tidak ditemukan", null);
      response(res, true, "success", data);
    } catch (error) {
      response(res, false, "error", error.message);
    }
  };

  static editProfile = async (req, res) => {
    try {
      const findParent = await Parents.findOne({ where: { id: req.user.id } });
      if (!findParent) return response(res, false, "User tidak ditemukan", null, 404);
      findParent.nama_lengkap = req.body.nama_lengkap || findParent.nama_lengkap;
      findParent.no_hp = req.body.no_hp || findParent.no_hp;
      await findParent.save();
      response(res, true, "Profil berhasil diperbarui", findParent);
    } catch (error) {
      response(res, false, "Terjadi kesalahan", error.message, 500);
    }
  };

  static sendLoginCode = async (req, res) => {
    try {
      const { phone, id } = req.body;
      const code = getRandomSixDigit().toString();
      await Parents.update({ verif_token: code, no_hp: phone }, { where: { id } });
      await sendVerificationToken(phone, `Kode Verifikasi: ${code}`);
      response(res, true, "success", code);
    } catch (error) {
      response(res, false, "error", error.message);
    }
  };

  static loginWithCode = async (req, res) => {
    try {
      const { code, id } = req.body;
      const findParent = await Parents.findOne({ where: { verif_token: code, id } });
      if (!findParent) return response(res, false, "Invalid code", null);
      const token = generateToken(findParent.id);
      response(res, true, "success", { ...findParent.dataValues, token });
    } catch (error) {
      response(res, false, "error", error.message);
    }
  };

  // =====================================================================
  // GET KOMPETENSI (SERTIFIKASI & TES)
  // =====================================================================
  static getKompetensiMhs = async (req, res) => {
    try {
      const { npm } = req.params;
      const findMhs = await User.findOne({ where: { npm, role: "Mahasiswa" } });
      if (!findMhs) return response(res, false, "Mahasiswa tidak ditemukan", null, 404);
      const mhsId = findMhs.user_id;

      const querySerti = `SELECT s.*, k.nama_kategori, k.point FROM tb_sertifikasi s JOIN kategori_sertifikasi k ON s.kategori_id = k.id WHERE s.user_id = $1 AND s.is_deleted = false AND s.status = 1`;
      const dataSertifikasi = await DB.query(querySerti, [mhsId]);

      const queryTes = `SELECT t.*, k.nama_kategori, k.point FROM tb_tes t JOIN kategori_sertifikasi k ON t.kategori_id = k.id WHERE t.user_id = $1 AND t.is_deleted = false AND t.status = 1`;
      const dataTes = await DB.query(queryTes, [mhsId]);

      return response(res, true, "Success", { sertifikasi: dataSertifikasi.rows, tes: dataTes.rows });
    } catch (error) {
      return response(res, false, "Error", error.message, 500);
    }
  };

  // =====================================================================
  // GET PENUNJANG (PENGHARGAAN & ORGANISASI)
  // =====================================================================
  static getPenunjangMhs = async (req, res) => {
    try {
      const { npm } = req.params;
      const findMhs = await User.findOne({ where: { npm, role: "Mahasiswa" } });
      if (!findMhs) return response(res, false, "Mahasiswa tidak ditemukan", null, 404);
      const mhsId = findMhs.user_id;

      const queryPeng = `SELECT p.*, k.nama_kategori, k.juara, k.point FROM tb_penghargaan p JOIN kategori_prestasi k ON p.kategori_id = k.id WHERE p.user_id = $1 AND p.is_deleted = false AND p.status = 1`;
      const dataPenghargaan = await DB.query(queryPeng, [mhsId]);

      const queryProf = `SELECT ap.*, k.nama_kategori, k.point FROM tb_anggota_prof ap JOIN kategori_profesi k ON ap.kategori_id = k.id WHERE ap.user_id = $1 AND ap.is_deleted = false AND ap.status = 1`;
      const dataProfesi = await DB.query(queryProf, [mhsId]);

      return response(res, true, "Success", { penghargaan: dataPenghargaan.rows, organisasi: dataProfesi.rows });
    } catch (error) {
      return response(res, false, "Error", error.message, 500);
    }
  };

  // =====================================================================
  // GET PENGABDIAN (PENGABDIAN & PEMBICARA)
  // =====================================================================
  static getPengabdianMhs = async (req, res) => {
    try {
      const { npm } = req.params;
      const findMhs = await User.findOne({ where: { npm, role: "Mahasiswa" } });
      if (!findMhs) return response(res, false, "Mahasiswa tidak ditemukan", null, 404);
      const mhsId = findMhs.user_id;

      const queryPeng = `SELECT p.*, k.nama_kategori, k.point FROM tb_pengabdian p JOIN kategori_publikasi k ON p.kategori_id = k.id WHERE p.user_id = $1 AND p.is_deleted = false AND p.status = 1`;
      const dataPengabdian = await DB.query(queryPeng, [mhsId]);

      const queryPemb = `SELECT pb.*, k.nama_kategori, k.point FROM tb_pembicara pb JOIN kategori_publikasi k ON pb.kategori_id = k.id WHERE pb.user_id = $1 AND pb.is_deleted = false AND pb.status = 1`;
      const dataPembicara = await DB.query(queryPemb, [mhsId]);

      return response(res, true, "Success", { pengabdian: dataPengabdian.rows, pembicara: dataPembicara.rows });
    } catch (error) {
      return response(res, false, "Error", error.message, 500);
    }
  };

  // =====================================================================
  // GET KKN KHUSUS (Mengambil data Mata Kuliah KKN dari SIAK)
  // =====================================================================
  static getKknMhs = async (req, res) => {
    try {
      const { npm } = req.params;
      const findMhs = await User.findOne({ where: { npm, role: "Mahasiswa" } });
      if (!findMhs) return response(res, false, "Mahasiswa tidak ditemukan", null, 404);

      // Import fungsi helper untuk mengambil KKN dari database Siak
      const { getMatkulKknByNpm } = require("../../helper/informatics");

      const dataKkn = await getMatkulKknByNpm(npm);

      // Kita mapping response agar sesuai format yang diinginkan frontend (tb_pengabdian)
      const formattedData = dataKkn.map((item, index) => ({
        id: `kkn-${index}`,
        nama_kategori: "Kuliah Kerja Nyata",
        judul_kegiatan: item.name,
        lama_kegiatan: `${item.credit} SKS`,
        lokasi_kegiatan: `Semester ${item.semester}`,
        point: item.credit, // atau bisa dikosongkan
      }));

      return response(res, true, "Success", { pengabdian: formattedData, pembicara: [] });
    } catch (error) {
      return response(res, false, "Error", error.message, 500);
    }
  };

  // =====================================================================
  // GET SKRIPSI / PENELITIAN
  // =====================================================================
  static getSkripsiMhs = async (req, res) => {
    try {
      const { npm } = req.params;
      const findMhs = await User.findOne({ where: { npm, role: "Mahasiswa" } });
      if (!findMhs) return response(res, false, "Mahasiswa tidak ditemukan", null, 404);
      const mhsId = findMhs.user_id;

      const query = `
        SELECT 
          sk.id AS sk_id, 
          kolo.id AS kolo_id,
          sidang.id AS sidang_id,
          sk.*, 
          kolo.*,
          sidang.*
        FROM ta_pengajuan_sk AS sk
        LEFT JOIN ta_pendaftaran_kolokium AS kolo ON sk.id = kolo.pengajuan_sk_id
        LEFT JOIN ta_pendaftaran_sidang AS sidang ON sk.id = sidang.pengajuan_sk_id
        WHERE sk.mhs_id = $1 AND sk.deleted_at IS NULL
      `;
      const result = await DB.query(query, [mhsId]);

      if (result.rows.length) {
        const koloIds = result.rows.map((row) => row.kolo_id).filter(Boolean);
        const sidangIds = result.rows.map((row) => row.sidang_id).filter(Boolean);

        const penilaianMapKolokium = {};
        if (koloIds.length > 0) {
          const countQueryKolokium = `
            SELECT kolo_id, COUNT(*) AS count
            FROM ta_penilaian_kolokium
            WHERE kolo_id IN (${koloIds.join(",")})
            GROUP BY kolo_id
          `;
          const countResultKolokium = await DB.query(countQueryKolokium);
          countResultKolokium.rows.forEach((row) => {
            penilaianMapKolokium[row.kolo_id] = row.count;
          });
        }

        const penilaianMapSidang = {};
        if (sidangIds.length > 0) {
          const countQuerySidang = `
            SELECT sidang_id, COUNT(*) AS count
            FROM ta_penilaian_sidang
            WHERE sidang_id IN (${sidangIds.join(",")})
            GROUP BY sidang_id
          `;
          const countResultSidang = await DB.query(countQuerySidang);
          countResultSidang.rows.forEach((row) => {
            penilaianMapSidang[row.sidang_id] = row.count;
          });
        }

        const dataWithStatusPenilaian = result.rows.map((row) => {
          const koloId = row.kolo_id;
          const sidangId = row.sidang_id;

          const jumlahPenilaianKolokium = penilaianMapKolokium[koloId] || 0;
          const statusPenilaianKolokium =
            jumlahPenilaianKolokium >= 1 && jumlahPenilaianKolokium <= 5;

          const jumlahPenilaianSidang = penilaianMapSidang[sidangId] || 0;
          const statusPenilaianSidang =
            jumlahPenilaianSidang >= 1 && jumlahPenilaianSidang <= 5;

          return {
            ...row,
            status_penilaian: statusPenilaianKolokium,
            status_penilaian_sidang: statusPenilaianSidang,
          };
        });

        return response(res, true, "Success", dataWithStatusPenilaian);
      } else {
        return response(res, true, "Success", []);
      }
    } catch (error) {
      return response(res, false, "Error", error.message, 500);
    }
  };

  // =====================================================================
  // GET ABSENSI PER MATA KULIAH
  // =====================================================================
  static getAbsensiMatkul = async (req, res) => {
    try {
      const { npm, kode } = req.params;
      const findMhs = await User.findOne({ where: { npm, role: "Mahasiswa" } });
      if (!findMhs) return response(res, false, "Mahasiswa tidak ditemukan", null, 404);
      const mhsId = findMhs.user_id;

      const query = `SELECT am.status_absen, am.created_at, p.pertemuan, mk.nama_matakuliah, am.upload_dok FROM absensi_mhs am JOIN pembelajaran_dosen_ext p ON am.id_pembelajaran = p.id JOIN m_matakuliah mk ON p.id_matkul = mk.id WHERE am.id_mhs = $1 AND mk.kode_matakuliah = $2 ORDER BY p.pertemuan ASC`;
      const dataAbsensi = await DB.query(query, [mhsId, kode]);

      if (dataAbsensi.rows.length === 0) return response(res, true, "No data", { npm, kode, total_pertemuan: 0, rincian_absensi: [] });

      let hadir = 0;
      const rincian = dataAbsensi.rows.map((abs) => {
        let statusStr = "Alpa";
        if (parseInt(abs.status_absen) === 1) { hadir++; statusStr = "Hadir"; }
        else if (parseInt(abs.status_absen) === 2) statusStr = "Izin";
        else if (parseInt(abs.status_absen) === 3) statusStr = "Sakit";
        return { pertemuan: abs.pertemuan, tanggal: abs.created_at, status: statusStr };
      });

      return response(res, true, "Success", { npm, kode, nama_matkul: dataAbsensi.rows[0].nama_matakuliah, total_pertemuan: dataAbsensi.rows.length, hadir, persentase: ((hadir / dataAbsensi.rows.length) * 100).toFixed(2) + "%", rincian_absensi: rincian });
    } catch (error) {
      return response(res, false, "Error", error.message, 500);
    }
  };

  // =====================================================================
  // ADMIN MANAGEMENT FEATURES
  // =====================================================================

  // 1. Edit Parent Data (Admin Only)
  static updateParentByAdmin = async (req, res) => {
    const { id } = req.params;
    const { nama_lengkap, email, npm, no_hp, is_verified, password } = req.body;

    try {
      const parent = await Parents.findByPk(id);
      if (!parent) return response(res, false, "Parent not found", null, 404);

      const updateData = {
        nama_lengkap: nama_lengkap || parent.nama_lengkap,
        email: email || parent.email,
        npm: npm || parent.npm,
        no_hp: no_hp || parent.no_hp,
        is_verified: is_verified !== undefined ? is_verified : parent.is_verified,
        updated_at: new Date()
      };

      // Jika password diisi, lakukan hashing
      if (password) {
        const salt = await bcrypt.genSalt(10);
        updateData.password = await bcrypt.hash(password, salt);
      }

      // Jika NPM berubah, kita harus update juga di tabel relasi (trx_parent_mhs)
      if (npm && npm !== parent.npm) {
        const findMhs = await User.findOne({ where: { npm, role: "Mahasiswa" } });
        if (findMhs) {
          await TrxParentMhs.update(
            { mhs_id: findMhs.user_id },
            { where: { parent_id: id } }
          );
        }
      }

      await parent.update(updateData);
      return response(res, true, "Parent data updated successfully", parent);
    } catch (error) {
      return response(res, false, error.message, null, 500);
    }
  };

  // 2. Delete Parent Account (Admin Only)
  static deleteParentByAdmin = async (req, res) => {
    const { id } = req.params;
    const transaction = await db.transaction();

    try {
      const parent = await Parents.findByPk(id);
      if (!parent) {
        await transaction.rollback();
        return response(res, false, "Parent not found", null, 404);
      }

      // Hapus relasi dulu
      await TrxParentMhs.destroy({ where: { parent_id: id }, transaction });

      // Hapus akun parent
      await parent.destroy({ transaction });

      await transaction.commit();
      return response(res, true, "Parent account deleted successfully");
    } catch (error) {
      await transaction.rollback();
      return response(res, false, error.message, null, 500);
    }
  };

  // 3. Get All Parents (Admin Only - Optional for Table)
  static getAllParents = async (req, res) => {
    try {
      const parents = await Parents.findAll({
        order: [['created_at', 'DESC']]
      });
      return response(res, true, "Success fetch all parents", parents);
    } catch (error) {
      return response(res, false, error.message, null, 500);
    }
  };

  // 4. Get Detail Parent (Admin Only)
  static getDetailParentByAdmin = async (req, res) => {
    const { id } = req.params;
    try {
      const parent = await Parents.findByPk(id);
      if (!parent) return response(res, false, "Parent not found", null, 404);
      return response(res, true, "Success fetch detail parent", parent);
    } catch (error) {
      return response(res, false, error.message, null, 500);
    }
  };

  // =====================================================================
  // GET ALL DOSEN
  // =====================================================================
  static getAllDosen = async (req, res) => {
    try {
      const findDosen = await DB.query(
        "SELECT tb_users.user_id, tb_users.nidn, tb_data_pribadi.nama_lengkap, tb_data_pribadi.nip, tb_data_pribadi.image, tb_data_pribadi.ttd FROM tb_users JOIN tb_data_pribadi ON tb_users.user_id = tb_data_pribadi.user_id WHERE (tb_users.role = 'Dosen' OR tb_users.role = 'Dosen_Ext' OR tb_users.role = 'Pegawai') AND tb_users.isverified = true"
      );

      return response(res, true, "Success get data.", findDosen.rows);
    } catch (error) {
      return response(res, false, "Error", error.message, 500);
    }
  };
}

module.exports = ParentsController;
