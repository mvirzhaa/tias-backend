"use strict";

const db = require("../index");

const Surat = require("./Surat");
const RiwayatSurat = require("./RiwayatSurat");
const DokumenLampiran = require("./DokumenLampiran");

if (db.User) {
  db.User.hasMany(Surat, { foreignKey: "user_id", sourceKey: "user_id", as: "SuratKeluar" });
  Surat.belongsTo(db.User, { foreignKey: "user_id", targetKey: "user_id", as: "Pengirim" });

  db.User.hasMany(Surat, { foreignKey: "penerima_id", sourceKey: "user_id", as: "SuratMasuk" });
  Surat.belongsTo(db.User, { foreignKey: "penerima_id", targetKey: "user_id", as: "Penerima" });
}

Surat.hasMany(RiwayatSurat, { foreignKey: "surat_id" });
RiwayatSurat.belongsTo(Surat, { foreignKey: "surat_id" });

Surat.hasMany(DokumenLampiran, { foreignKey: "surat_id" });
DokumenLampiran.belongsTo(Surat, { foreignKey: "surat_id" });

Surat.belongsTo(Surat, { foreignKey: "parent_id", as: "SuratAsal" });
Surat.hasMany(Surat, { foreignKey: "parent_id", as: "DaftarBalasan" });

module.exports = {
  ...db,
  Surat,
  RiwayatSurat,
  DokumenLampiran,
};
