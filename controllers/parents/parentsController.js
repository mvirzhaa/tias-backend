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
const { generateToken } = require("../../utils");

class ParentsController {
  static exportExcelMhs = async (req, res) => {
    try {
      const users = await User.findAll({
        where: {
          role: "Mahasiswa",
        },
        include: {
          model: DataPribadi,
          as: "personal_data",
          attributes: [
            "nama_lengkap",
            "nik",
            "ibu_kandung",
            "tanggal_lahir",
            "no_hp",
          ],
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
        if (user.personal_data.tanggal_lahir) {
          const formattedDate = new Date(user.personal_data.tanggal_lahir);
          passwordParent = formattedDate
            .toISOString()
            .split("T")[0]
            .split("-")
            .reverse()
            .join("");
        }

        worksheet.addRow({
          nik: user.personal_data.nik,
          password_parent: passwordParent,
          npm: user.npm,
          email: user.email,
          nama_lengkap: user.personal_data.nama_lengkap,
          ibu_kandung: user.personal_data.ibu_kandung,
          tanggal_lahir: user.personal_data.tanggal_lahir,
          no_hp: user.personal_data.no_hp,
          mhs_id: user.user_id,
        });
      });

      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
      res.setHeader(
        "Content-Disposition",
        `attachment; filename=users-data.xlsx`
      );

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

      let dataParents = [];
      for (const iterator of dataMhs) {
        if (iterator != "" && iterator != null) {
          dataParents.push({
            role: "Parent",
            nik: iterator.nik,
            nama_lengkap: iterator.nama_ibu,
            no_hp: null,
            password: iterator.password,
            is_verified: false,
          });
        }
      }

      // return res.json({
      //   dataParents,
      // });

      const insertedParents = await Parents.bulkCreate(dataParents, {
        returning: true,
        transaction,
      });

      let dataTrxParentMhs = [];
      for (let i = 0; i < dataMhs.length; i++) {
        const mhs = dataMhs[i];
        const parent = insertedParents[i];
        dataTrxParentMhs.push({
          parent_id: parent.id,
          mhs_id: mhs.mhs_id,
        });
      }

      await TrxParentMhs.bulkCreate(dataTrxParentMhs, { transaction });

      await transaction.commit();

      response(res, true, "success", dataMhs);
    } catch (error) {
      await transaction.rollback();
      console.log(error);
      response(res, false, "error", error.message);
    }
  };

  static login = async (req, res) => {
    try {
      const { nik, password } = req.body;

      if (!nik || !password) {
        res.status(400);
        throw new Error("Please add nik and password.");
      }

      const findParent = await Parents.findOne({
        where: {
          nik,
        },
        attributes: [
          "id",
          "nik",
          "role",
          "nama_lengkap",
          "no_hp",
          "is_verified",
          "password",
        ],
      });

      if (!findParent) {
        res.status(404);
        throw new Error("Invalid Nik Or Password.");
      }

      const passwordIsCorrect = await bcrypt.compare(
        password,
        findParent.password
      );

      if (!passwordIsCorrect) {
        res.status(404);
        throw new Error("Invalid Nik Or Password.");
      }

      if (!findParent.is_verified) {
        return response(res, false, "account not verified", findParent);
      }

      const token = generateToken(findParent.id);

      const oneMonth = 30 * 24 * 60 * 60 * 1000;
      res.cookie("token", token, {
        path: "/",
        httpOnly: true,
        expires: new Date(Date.now() + oneMonth),
        sameSite: "none",
        secure: true,
      });

      response(res, true, "success", {
        ...findParent.dataValues,
        token,
      });
    } catch (error) {
      response(res, false, "error", error.message);
    }
  };

  static getUserLogin = async (req, res) => {
    try {
      const id = req.user.id;

      const data = await Parents.findOne({
        where: {
          id,
        },
      });

      if (!data) {
        return response(res, false, "user tidak ditemukan", null);
      }

      response(res, true, "success", data);
    } catch (error) {
      response(res, false, "error", error.message);
    }
  };

  static sendLoginCode = async (req, res) => {
    try {
      const { phone, id } = req.body;

      if (!phone || !id) {
        return response(res, false, "invalid input!", null);
      }

      const findParent = await Parents.findOne({
        where: {
          id,
        },
      });

      if (!findParent) {
        return response(res, false, "Account Not Found!", null);
      }

      const code = getRandomSixDigit().toString();

      await Parents.update(
        {
          verif_token: code,
          no_hp: phone,
        },
        {
          where: {
            id: findParent.id,
          },
        }
      );

      const message = `🔐 Kode Verifikasi Anda: ${code}\n\nSilakan masukkan kode di aplikasi untuk melanjutkan proses verifikasi. Jika Anda tidak meminta kode ini, abaikan pesan ini. Terima kasih!`;
      await sendVerificationToken(phone, message);

      response(res, true, "success", code);
    } catch (error) {
      response(res, false, "error", error.message);
    }
  };

  static loginWithCode = async (req, res) => {
    try {
      const { code, id } = req.body;

      const findParent = await Parents.findOne({
        where: {
          verif_token: code,
          id: id,
        },
      });

      if (!findParent) {
        return response(
          res,
          false,
          "Invalid verification code or token expired",
          null
        );
      }

      const token = generateToken(findParent.id);

      const oneMonth = 30 * 24 * 60 * 60 * 1000;
      res.cookie("token", token, {
        path: "/",
        httpOnly: true,
        expires: new Date(Date.now() + oneMonth),
        sameSite: "none",
        secure: true,
      });

      response(res, true, "success", {
        ...findParent.dataValues,
        token,
      });
    } catch (error) {
      response(res, false, "error", error.message);
    }
  };
}

module.exports = ParentsController;
