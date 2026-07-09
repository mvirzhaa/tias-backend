'use strict';

/**
 * Migration: Calculate and update gamification points, ranks, and achievements
 * for the 12 target students based on their seeded activity records.
 */

const VALID_NPMS = [
  '221106042843',
  '221106042931',
  '221106042963',
  '221106042881',
  '221106043019',
  '221106042851',
  '221106042991',
  '221106042855',
  '221106042869',
  '221106042895',
  '221106042947',
  '221106042937',
];

module.exports = {
  async up(queryInterface, Sequelize) {
    const npmListStr = VALID_NPMS.map(n => `'${n}'`).join(',');
    const mahasiswaRows = await queryInterface.sequelize.query(
      `SELECT user_id, npm FROM tb_users WHERE npm IN (${npmListStr})`,
      { type: queryInterface.sequelize.QueryTypes.SELECT }
    );

    if (mahasiswaRows.length === 0) {
      console.error('[Migration] Tidak ada mahasiswa ditemukan di tb_users!');
      return;
    }

    console.log(`[Migration] Menghitung ulang gamifikasi untuk ${mahasiswaRows.length} mahasiswa...`);

    // Ambil detail master achievements untuk penentuan status badge
    const achievements = await queryInterface.sequelize.query(
      `SELECT id, start_point FROM achievements ORDER BY start_point ASC`,
      { type: queryInterface.sequelize.QueryTypes.SELECT }
    );

    for (const mhs of mahasiswaRows) {
      const userId = mhs.user_id;

      // 1. Pendidikan points (from tb_ip_mhs)
      const ipPoints = await queryInterface.sequelize.query(
        `SELECT COALESCE(SUM(ki.point), 0) as total FROM tb_ip_mhs tim 
         JOIN kategori_ip ki ON tim.kode_ip = ki.kode 
         WHERE tim.user_id = '${userId}' AND tim.status = 1 AND tim.is_deleted = false`,
        { type: queryInterface.sequelize.QueryTypes.SELECT }
      );
      const pointPendidikan = Number(ipPoints[0]?.total || 0);

      // 2. Kompetensi points (from tb_sertifikasi and tb_tes)
      const sertifPoints = await queryInterface.sequelize.query(
        `SELECT COALESCE(SUM(ks.point), 0) as total FROM tb_sertifikasi ts 
         JOIN kategori_sertifikasi ks ON ts.kategori_id = ks.id 
         WHERE ts.user_id = '${userId}' AND ts.status = 1`,
        { type: queryInterface.sequelize.QueryTypes.SELECT }
      );
      const tesPoints = await queryInterface.sequelize.query(
        `SELECT COALESCE(SUM(ks.point), 0) as total FROM tb_tes tt 
         JOIN kategori_sertifikasi ks ON tt.kategori_id = ks.id 
         WHERE tt.user_id = '${userId}' AND tt.status = 1`,
        { type: queryInterface.sequelize.QueryTypes.SELECT }
      );
      const pointKompetensi = Number(sertifPoints[0]?.total || 0) + Number(tesPoints[0]?.total || 0);

      // 3. Pengabdian points (from tb_pengabdian and tb_pembicara)
      const pengabdianPoints = await queryInterface.sequelize.query(
        `SELECT COALESCE(SUM(kp.point), 0) as total FROM tb_pengabdian tp 
         JOIN kategori_publikasi kp ON tp.kategori_id = kp.id 
         WHERE tp.user_id = '${userId}' AND tp.status = 1`,
        { type: queryInterface.sequelize.QueryTypes.SELECT }
      );
      const pembicaraPoints = await queryInterface.sequelize.query(
        `SELECT COALESCE(SUM(kp.point), 0) as total FROM tb_pembicara tb 
         JOIN kategori_publikasi kp ON tb.kategori_id = kp.id 
         WHERE tb.user_id = '${userId}' AND tb.status = 1`,
        { type: queryInterface.sequelize.QueryTypes.SELECT }
      );
      const pointPengabdian = Number(pengabdianPoints[0]?.total || 0) + Number(pembicaraPoints[0]?.total || 0);

      // 4. Penelitian points (from tb_penelitian)
      // Catatan: tb_penelitian.kategori_id bertipe uuid sedangkan
      // kategori_publikasi.id bertipe integer, jadi join di-cast ke text agar
      // tidak error tipe (tidak ada data penelitian ter-seed -> hasil 0).
      const penelitianPoints = await queryInterface.sequelize.query(
        `SELECT COALESCE(SUM(kp.point), 0) as total FROM tb_penelitian tp 
         JOIN kategori_publikasi kp ON tp.kategori_id::text = kp.id::text 
         WHERE tp.user_id = '${userId}' AND tp.status = 1`,
        { type: queryInterface.sequelize.QueryTypes.SELECT }
      );
      const pointPenelitian = Number(penelitianPoints[0]?.total || 0);

      // 5. Penunjang points (from tb_anggota_prof and tb_penghargaan)
      const profPoints = await queryInterface.sequelize.query(
        `SELECT COALESCE(SUM(kp.point), 0) as total FROM tb_anggota_prof ta 
         JOIN kategori_profesi kp ON ta.kategori_id = kp.id 
         WHERE ta.user_id = '${userId}' AND ta.status = 1`,
        { type: queryInterface.sequelize.QueryTypes.SELECT }
      );
      const prestasiPoints = await queryInterface.sequelize.query(
        `SELECT COALESCE(SUM(kp.point), 0) as total FROM tb_penghargaan tp 
         JOIN kategori_prestasi kp ON tp.kategori_id = kp.id 
         WHERE tp.user_id = '${userId}' AND tp.status = 1`,
        { type: queryInterface.sequelize.QueryTypes.SELECT }
      );
      const pointPenunjang = Number(profPoints[0]?.total || 0) + Number(prestasiPoints[0]?.total || 0);

      // Hitung Total Point
      const totalPoint = pointPendidikan + pointKompetensi + pointPengabdian + pointPenelitian + pointPenunjang;

      // Tentukan Rank berdasarkan total point
      let rank = 'Novice';
      if (totalPoint > 7400) rank = 'Master';
      else if (totalPoint > 5300) rank = 'Expert';
      else if (totalPoint > 3800) rank = 'Proficient';
      else if (totalPoint > 2300) rank = 'Competent';

      // Update data di tb_data_pribadi
      await queryInterface.sequelize.query(
        `UPDATE tb_data_pribadi SET 
           point_pendidikan = ${pointPendidikan},
           point_kompetensi = ${pointKompetensi},
           point_pengabdian = ${pointPengabdian},
           point_penelitian = ${pointPenelitian},
           point_penunjang = ${pointPenunjang},
           total_point = ${totalPoint},
           rank = '${rank}'
         WHERE user_id = '${userId}'`
      );

      // Update pencapaian lencana/badge di user_achievements
      for (const ach of achievements) {
        const isUnlocked = totalPoint >= ach.start_point;
        await queryInterface.sequelize.query(
          `UPDATE user_achievements SET 
             status = ${isUnlocked ? 1 : 0}
           WHERE user_id = '${userId}' AND achievement_id = '${ach.id}'`
        );
      }

      console.log(`[Migration] NPM ${mhs.npm} updated: Point=${totalPoint}, Rank=${rank}`);
    }

    console.log('[Migration] ✅ Sinkronisasi poin dan rank gamifikasi mahasiswa selesai.');
  },

  async down(queryInterface) {
    // Sync ulang / recalculate tidak memerlukan rollback,
    // namun kita bisa reset poinnya ke 0 jika di-rollback
    const npmListStr = VALID_NPMS.map(n => `'${n}'`).join(',');
    const userSubquery = `(SELECT user_id FROM tb_users WHERE npm IN (${npmListStr}))`;

    await queryInterface.sequelize.query(
      `UPDATE tb_data_pribadi SET 
         point_pendidikan = 0,
         point_kompetensi = 0,
         point_pengabdian = 0,
         point_penelitian = 0,
         point_penunjang = 0,
         total_point = 0,
         rank = 'Novice'
       WHERE user_id IN ${userSubquery}`
    );

    await queryInterface.sequelize.query(
      `UPDATE user_achievements SET status = 0 WHERE user_id IN ${userSubquery}`
    );

    console.log('[Migration] Rollback gamifikasi selesai.');
  },
};
