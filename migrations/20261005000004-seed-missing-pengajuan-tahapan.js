'use strict';

// Aturan sistem: tiap tahapan substantif (bukan "Pengumpulan Revisi", bukan
// sudah berupa "Pengajuan ...") WAJIB punya pasangan "Pengajuan {nama}" TEPAT
// SEBELUMNYA - menyamai pola sistem lama (mis. "Pengajuan Kolokium" sebelum
// "Pelaksanaan Kolokium"). Sebelumnya ini tergantung admin ingat menambahkan
// sendiri, jadi skema yang sudah dibuat sebelum aturan ini ada (mis. "Karya
// Ilmiah") belum punya. Migrasi ini SEKALI jalan melengkapi yang kurang;
// ke depannya controllers/master-ta/tahapanController.js#create menjaga
// invarian ini otomatis setiap kali admin menambah tahapan baru.
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const { QueryTypes } = Sequelize;

    const rows = await queryInterface.sequelize.query(
      `SELECT id, prodi_id, skema_id, nama_tahapan, urutan
       FROM ta_tahapan
       WHERE deleted_at IS NULL
       ORDER BY prodi_id, skema_id, urutan ASC`,
      { type: QueryTypes.SELECT }
    );

    const groups = new Map();
    for (const row of rows) {
      const key = `${row.prodi_id}|${row.skema_id}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(row);
    }

    const now = new Date();

    for (const group of groups.values()) {
      const existingNames = new Set(group.map((r) => r.nama_tahapan.trim().toLowerCase()));
      let urutanOffset = 0;

      for (const row of group) {
        const nama = row.nama_tahapan.trim();
        const lower = nama.toLowerCase();
        if (lower === 'pengumpulan revisi' || lower.startsWith('pengajuan ')) continue;

        const pengajuanName = `Pengajuan ${nama}`;
        if (existingNames.has(pengajuanName.toLowerCase())) continue;

        const insertUrutan = row.urutan + urutanOffset;

        await queryInterface.sequelize.query(
          `UPDATE ta_tahapan SET urutan = urutan + 1, updated_at = :now
           WHERE prodi_id = :prodiId AND skema_id = :skemaId
             AND urutan >= :urutan AND deleted_at IS NULL`,
          {
            replacements: {
              prodiId: row.prodi_id,
              skemaId: row.skema_id,
              urutan: insertUrutan,
              now,
            },
            type: QueryTypes.UPDATE,
          }
        );

        await queryInterface.sequelize.query(
          `INSERT INTO ta_tahapan (prodi_id, skema_id, nama_tahapan, is_active, urutan, created_at)
           VALUES (:prodiId, :skemaId, :nama, true, :urutan, :now)`,
          {
            replacements: {
              prodiId: row.prodi_id,
              skemaId: row.skema_id,
              nama: pengajuanName,
              urutan: insertUrutan,
              now,
            },
            type: QueryTypes.INSERT,
          }
        );

        existingNames.add(pengajuanName.toLowerCase());
        urutanOffset += 1;
      }
    }
  },

  async down() {
    // Sengaja tidak dibalik - tidak ada cara aman membedakan baris yang
    // dibuat migrasi ini dari yang ditambahkan admin setelahnya (sama
    // seperti migrasi seed Pengumpulan Revisi sebelumnya).
  },
};
