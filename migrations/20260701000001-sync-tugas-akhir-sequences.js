'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Sinkronisasi sequence auto-increment primary key dengan ID tertinggi saat ini
    // untuk mencegah error duplicate key value violates unique constraint
    await queryInterface.sequelize.query(`
      SELECT setval('ta_pengajuan_sk_id_seq', COALESCE((SELECT MAX(id) FROM ta_pengajuan_sk), 0) + 1, false);
      SELECT setval('ta_pendaftaran_kolokium_id_seq', COALESCE((SELECT MAX(id) FROM ta_pendaftaran_kolokium), 0) + 1, false);
      SELECT setval('ta_pendaftaran_sidang_id_seq', COALESCE((SELECT MAX(id) FROM ta_pendaftaran_sidang), 0) + 1, false);
      SELECT setval('ta_penilaian_kolokium_id_seq', COALESCE((SELECT MAX(id) FROM ta_penilaian_kolokium), 0) + 1, false);
      SELECT setval('ta_penilaian_sidang_id_seq', COALESCE((SELECT MAX(id) FROM ta_penilaian_sidang), 0) + 1, false);
    `);
  },

  async down(queryInterface, Sequelize) {
    // Sequence sync tidak membutuhkan aksi rollback khusus
  }
};
