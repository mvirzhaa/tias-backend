'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const dummyUserId = '20260515-0000-0000-0000-000000000001';

    await queryInterface.dropTable('dokumen_pengabdian', { cascade: true }).catch(() => {});
    await queryInterface.dropTable('anggota_pengabdian', { cascade: true }).catch(() => {});
    await queryInterface.dropTable('tb_pengabdian', { cascade: true }).catch(() => {});
    await queryInterface.dropTable('dokumen_pembicara', { cascade: true }).catch(() => {});
    await queryInterface.dropTable('tb_pembicara', { cascade: true }).catch(() => {});

    // tb_pembicara
    await queryInterface.createTable('tb_pembicara', {
      pembicara_id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      user_id: { type: Sequelize.UUID },
      kategori_id: { type: Sequelize.INTEGER },
      kategori_pembicara: { type: Sequelize.STRING },
      judul_makalah: { type: Sequelize.STRING },
      nama_pertemuan: { type: Sequelize.STRING },
      tingkat_pertemuan: { type: Sequelize.STRING },
      penyelenggara: { type: Sequelize.STRING },
      tgl_pelaksanaan: { type: Sequelize.DATE },
      bahasa: { type: Sequelize.STRING },
      no_sk_penugasan: { type: Sequelize.STRING },
      tgl_sk_penugasan: { type: Sequelize.DATE },
      status: { type: Sequelize.INTEGER, defaultValue: 0 },
      is_deleted: { type: Sequelize.BOOLEAN, defaultValue: false },
      created_at: { type: Sequelize.DATE },
      updated_at: { type: Sequelize.DATE },
      deleted_at: { type: Sequelize.DATE, allowNull: true }
    });

    await queryInterface.bulkInsert('tb_pembicara', [
      { user_id: dummyUserId, kategori_id: 2, kategori_pembicara: 'Pembicara Tamu', judul_makalah: 'Teknologi AI Masa Depan', nama_pertemuan: 'Seminar Nasional AI', tingkat_pertemuan: 'Nasional', penyelenggara: 'Lab Komputer', tgl_pelaksanaan: '2024-11-20', status: 1, created_at: new Date(), updated_at: new Date() },
      { user_id: dummyUserId, kategori_id: 2, kategori_pembicara: 'Keynote Speaker', judul_makalah: 'Cyber Security Awareness', nama_pertemuan: 'Webinar IT Security', tingkat_pertemuan: 'Regional', penyelenggara: 'Univ XYZ', tgl_pelaksanaan: '2025-01-15', status: 1, created_at: new Date(), updated_at: new Date() }
    ]);

    // tb_pengabdian
    await queryInterface.createTable('tb_pengabdian', {
      pengabdian_id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      user_id: { type: Sequelize.UUID },
      kategori_id: { type: Sequelize.INTEGER },
      judul_kegiatan: { type: Sequelize.STRING },
      kelompok_bidang: { type: Sequelize.STRING },
      lokasi_kegiatan: { type: Sequelize.STRING },
      lama_kegiatan: { type: Sequelize.STRING },
      no_sk_penugasan: { type: Sequelize.STRING },
      tgl_sk_penugasan: { type: Sequelize.DATE },
      status: { type: Sequelize.INTEGER, defaultValue: 0 },
      is_deleted: { type: Sequelize.BOOLEAN, defaultValue: false },
      created_at: { type: Sequelize.DATE },
      updated_at: { type: Sequelize.DATE },
      deleted_at: { type: Sequelize.DATE, allowNull: true }
    });

    await queryInterface.bulkInsert('tb_pengabdian', [
      { user_id: dummyUserId, kategori_id: 1, judul_kegiatan: 'Sosialisasi Literasi Digital', kelompok_bidang: 'IT', lokasi_kegiatan: 'Desa Binaan', lama_kegiatan: '1 Bulan', status: 1, created_at: new Date(), updated_at: new Date() },
      { user_id: dummyUserId, kategori_id: 1, judul_kegiatan: 'Pelatihan Ms Office untuk Guru', kelompok_bidang: 'IT', lokasi_kegiatan: 'SD Negeri 01', lama_kegiatan: '2 Minggu', status: 1, created_at: new Date(), updated_at: new Date() }
    ]);

    // Tambahan tabel dokumen/anggota (opsional seed data jika diperlukan)
    await queryInterface.createTable('anggota_pengabdian', { id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true }, pengabdian_id: { type: Sequelize.INTEGER }, user_id: { type: Sequelize.UUID }, peran: { type: Sequelize.STRING }, status: { type: Sequelize.STRING } });
    await queryInterface.createTable('dokumen_pengabdian', { dokumen_id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true }, pengabdian_id: { type: Sequelize.INTEGER }, nama_dok: { type: Sequelize.STRING }, keterangan: { type: Sequelize.STRING }, tautan_dok: { type: Sequelize.STRING }, file: { type: Sequelize.STRING }, created_at: { type: Sequelize.DATE }, updated_at: { type: Sequelize.DATE } });
    await queryInterface.createTable('dokumen_pembicara', { dokumen_id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true }, pembicara_id: { type: Sequelize.INTEGER }, nama_dok: { type: Sequelize.STRING }, keterangan: { type: Sequelize.STRING }, tautan_dok: { type: Sequelize.STRING }, file: { type: Sequelize.STRING }, created_at: { type: Sequelize.DATE }, updated_at: { type: Sequelize.DATE } });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('dokumen_pengabdian');
    await queryInterface.dropTable('anggota_pengabdian');
    await queryInterface.dropTable('tb_pengabdian');
    await queryInterface.dropTable('dokumen_pembicara');
    await queryInterface.dropTable('tb_pembicara');
  }
};
