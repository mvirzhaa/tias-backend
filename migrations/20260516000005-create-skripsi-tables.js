'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const [mhs] = await queryInterface.sequelize.query(
      "SELECT user_id FROM tb_users WHERE role = 'Mahasiswa' LIMIT 1"
    );
    const dummyMhsId = mhs.length ? mhs[0].user_id : '20260515-0000-0000-0000-000000000001';

    const [dosens] = await queryInterface.sequelize.query(
      "SELECT user_id FROM tb_users WHERE role = 'Dosen' LIMIT 2"
    );
    const dummyDosenId1 = dosens.length > 0 ? dosens[0].user_id : '20260515-2222-2222-2222-222222222222';
    const dummyDosenId2 = dosens.length > 1 ? dosens[1].user_id : dummyDosenId1;

    await queryInterface.dropTable('ta_penilaian_sidang', { cascade: true }).catch(() => { });
    await queryInterface.dropTable('ta_penilaian_kolokium', { cascade: true }).catch(() => { });
    await queryInterface.dropTable('ta_pendaftaran_sidang', { cascade: true }).catch(() => { });
    await queryInterface.dropTable('ta_pendaftaran_kolokium', { cascade: true }).catch(() => { });
    await queryInterface.dropTable('ta_pengajuan_sk', { cascade: true }).catch(() => { });

    // ta_pengajuan_sk
    await queryInterface.createTable('ta_pengajuan_sk', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      mhs_id: { type: Sequelize.UUID },
      judul_skripsi: { type: Sequelize.STRING },
      lokasi_kegiatan: { type: Sequelize.STRING },
      semester: { type: Sequelize.STRING },
      sk_pembimbing_1: { type: Sequelize.UUID },
      sk_pembimbing_2: { type: Sequelize.UUID },
      sk_pembimbing_3: { type: Sequelize.UUID },
      kepala_lab: { type: Sequelize.UUID },
      status: { type: Sequelize.STRING },
      created_at: { type: Sequelize.DATE },
      updated_at: { type: Sequelize.DATE },
      deleted_at: { type: Sequelize.DATE, allowNull: true }
    });

    await queryInterface.createTable('ta_pendaftaran_kolokium', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      mhs_id: { type: Sequelize.UUID },
      pengajuan_sk_id: { type: Sequelize.INTEGER },
      status_kp: { type: Sequelize.BOOLEAN },
      status_sks_ipk: { type: Sequelize.BOOLEAN },
      jumlah_sks: { type: Sequelize.INTEGER },
      ipk: { type: Sequelize.DECIMAL(4, 2) },
      kolo_pembimbing_1: { type: Sequelize.UUID },
      kolo_pembimbing_2: { type: Sequelize.UUID },
      kolo_pembimbing_3: { type: Sequelize.UUID },
      kolo_kepala_lab: { type: Sequelize.UUID },
      judul: { type: Sequelize.STRING },
      evaluator_1: { type: Sequelize.UUID },
      evaluator_2: { type: Sequelize.UUID },
      kolo_status_pem_1: { type: Sequelize.BOOLEAN },
      kolo_status_pem_2: { type: Sequelize.BOOLEAN },
      kolo_status_pem_3: { type: Sequelize.BOOLEAN },
      created_at: { type: Sequelize.DATE },
      updated_at: { type: Sequelize.DATE }
    });

    await queryInterface.createTable('ta_pendaftaran_sidang', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      mhs_id: { type: Sequelize.UUID },
      pengajuan_sk_id: { type: Sequelize.INTEGER },
      status_kp: { type: Sequelize.BOOLEAN },
      jumlah_sks: { type: Sequelize.INTEGER },
      status_min_ipk: { type: Sequelize.BOOLEAN },
      ipk: { type: Sequelize.DECIMAL(4, 2) },
      sidang_pembimbing_1: { type: Sequelize.UUID },
      sidang_pembimbing_2: { type: Sequelize.UUID },
      sidang_pembimbing_3: { type: Sequelize.UUID },
      sidang_kepala_lab: { type: Sequelize.UUID },
      judul: { type: Sequelize.STRING },
      penguji_1: { type: Sequelize.UUID },
      penguji_2: { type: Sequelize.UUID },
      jadwal_pelaksanaan: { type: Sequelize.DATE },
      sidang_status_pem_1: { type: Sequelize.BOOLEAN },
      sidang_status_pem_2: { type: Sequelize.BOOLEAN },
      sidang_status_pem_3: { type: Sequelize.BOOLEAN },
      created_at: { type: Sequelize.DATE },
      updated_at: { type: Sequelize.DATE }
    });

    await queryInterface.createTable('ta_penilaian_kolokium', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      kolo_id: { type: Sequelize.INTEGER },
      dosen_id: { type: Sequelize.UUID }
    });

    await queryInterface.createTable('ta_penilaian_sidang', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      sidang_id: { type: Sequelize.INTEGER },
      dosen_id: { type: Sequelize.UUID }
    });

    // Seeder
    await queryInterface.bulkInsert('ta_pengajuan_sk', [
      {
        id: 1,
        mhs_id: dummyMhsId,
        judul_skripsi: 'Sistem Informasi Monitoring Akademik',
        lokasi_kegiatan: 'Kampus TIAS',
        semester: '7',
        status: 'Approved',
        sk_pembimbing_1: dummyDosenId1,
        sk_pembimbing_2: dummyDosenId2,
        created_at: new Date(),
        updated_at: new Date()
      }
    ]);

    await queryInterface.bulkInsert('ta_pendaftaran_kolokium', [
      {
        id: 1,
        mhs_id: dummyMhsId,
        pengajuan_sk_id: 1,
        status_kp: true,
        status_sks_ipk: true,
        jumlah_sks: 144,
        ipk: 3.75,
        kolo_pembimbing_1: dummyDosenId1,
        kolo_pembimbing_2: dummyDosenId2,
        judul: 'Sistem Informasi Monitoring Akademik',
        created_at: new Date(),
        updated_at: new Date()
      }
    ]);

    await queryInterface.bulkInsert('ta_pendaftaran_sidang', [
      {
        id: 1,
        mhs_id: dummyMhsId,
        pengajuan_sk_id: 1,
        status_kp: true,
        jumlah_sks: 144,
        status_min_ipk: true,
        ipk: 3.75,
        sidang_pembimbing_1: dummyDosenId1,
        sidang_pembimbing_2: dummyDosenId2,
        judul: 'Sistem Informasi Monitoring Akademik',
        created_at: new Date(),
        updated_at: new Date()
      }
    ]);

    await queryInterface.bulkInsert('ta_penilaian_kolokium', [
      { kolo_id: 1, dosen_id: dummyDosenId1 },
      { kolo_id: 1, dosen_id: dummyDosenId2 }
    ]);

    await queryInterface.bulkInsert('ta_penilaian_sidang', [
      { sidang_id: 1, dosen_id: dummyDosenId1 }
    ]);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('ta_penilaian_sidang');
    await queryInterface.dropTable('ta_penilaian_kolokium');
    await queryInterface.dropTable('ta_pendaftaran_sidang');
    await queryInterface.dropTable('ta_pendaftaran_kolokium');
    await queryInterface.dropTable('ta_pengajuan_sk');
  }
};
