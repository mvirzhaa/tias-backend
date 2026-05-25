// create_absensi (diperbanyak untuk semua mahasiswa)
'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const [mahasiswas] = await queryInterface.sequelize.query(
      "SELECT user_id, npm FROM tb_users WHERE role = 'Mahasiswa'"
    );

    await queryInterface.dropTable('absensi_mhs', { cascade: true }).catch(() => { });
    await queryInterface.dropTable('pembelajaran_dosen_ext', { cascade: true }).catch(() => { });
    await queryInterface.dropTable('m_matakuliah', { cascade: true }).catch(() => { });

    // 1. m_matakuliah (5 mata kuliah)
    await queryInterface.createTable('m_matakuliah', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      kode_matakuliah: { type: Sequelize.STRING },
      nama_matakuliah: { type: Sequelize.STRING },
      sks: { type: Sequelize.INTEGER },
      created_at: { type: Sequelize.DATE },
      updated_at: { type: Sequelize.DATE }
    });

    const matakuliahData = [
      { id: 1, kode_matakuliah: 'TIF191', nama_matakuliah: 'Kalkulus I', sks: 3, created_at: new Date(), updated_at: new Date() },
      { id: 2, kode_matakuliah: 'TIF193', nama_matakuliah: 'Teknik Digital dan Rangkaian Logika + Praktik', sks: 3, created_at: new Date(), updated_at: new Date() },
      { id: 3, kode_matakuliah: 'TIF104', nama_matakuliah: 'Aljabar Linear', sks: 3, created_at: new Date(), updated_at: new Date() },
      { id: 4, kode_matakuliah: 'TIF106', nama_matakuliah: 'Struktur Data dan Algoritma + Praktikum', sks: 3, created_at: new Date(), updated_at: new Date() },
      { id: 5, kode_matakuliah: 'TIF112', nama_matakuliah: 'Organisasi Komputer dan Sistem Operasi + Prak', sks: 2, created_at: new Date(), updated_at: new Date() }
    ];
    await queryInterface.bulkInsert('m_matakuliah', matakuliahData);

    // 2. pembelajaran_dosen_ext (5 pertemuan per mata kuliah)
    await queryInterface.createTable('pembelajaran_dosen_ext', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      id_matkul: { type: Sequelize.INTEGER },
      pertemuan: { type: Sequelize.INTEGER },
      kelas: { type: Sequelize.STRING },
      semester: { type: Sequelize.STRING },
      tahun_akademik: { type: Sequelize.STRING },
      created_at: { type: Sequelize.DATE },
      updated_at: { type: Sequelize.DATE }
    });

    const pembelajaranData = [];
    let pembelajaranId = 1;
    for (let matkul of matakuliahData) {
      for (let pertemuan = 1; pertemuan <= 14; pertemuan++) {
        pembelajaranData.push({
          id: pembelajaranId++,
          id_matkul: matkul.id,
          pertemuan: pertemuan,
          kelas: ['A', 'B', 'C', 'D', 'E'][(matkul.id - 1) % 5],
          semester: 'gasal',
          tahun_akademik: '2024/2025',
          created_at: new Date(),
          updated_at: new Date()
        });
      }
    }
    await queryInterface.bulkInsert('pembelajaran_dosen_ext', pembelajaranData);

    // 3. absensi_mhs (semua mahasiswa, 14 pertemuan per mata kuliah = 70 data per mahasiswa)
    await queryInterface.createTable('absensi_mhs', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      id_mhs: { type: Sequelize.UUID },
      npm: { type: Sequelize.STRING },
      id_pembelajaran: { type: Sequelize.INTEGER },
      status_absen: { type: Sequelize.INTEGER },
      upload_dok: { type: Sequelize.STRING },
      created_at: { type: Sequelize.DATE },
      updated_at: { type: Sequelize.DATE }
    });

    const absensiData = [];
    let absensiId = 1;
    const statusAbsenOptions = [1, 2, 3]; // 1=Hadir, 2=Izin, 3=Sakit
// ---- deterministic seed entry for testing ----
// Ensure there is at least one known attendance record for the first student (npm) and first course (kode TIF191)
if (mahasiswas.length > 0 && pembelajaranData.length > 0) {
  const firstMhs = mahasiswas[0];
  const firstPembelajaran = pembelajaranData.find(p => p.id_matkul === 1 && p.pertemuan === 1);
  if (firstPembelajaran) {
    absensiData.push({
      id: absensiId++,
      id_mhs: firstMhs.user_id,
      npm: firstMhs.npm,
      id_pembelajaran: firstPembelajaran.id,
      status_absen: 1, // Hadir
      upload_dok: null,
      created_at: new Date(),
      updated_at: new Date()
    });
  }
}


    for (let mhs of mahasiswas) {
      for (let pembelajaran of pembelajaranData) {
        let status = statusAbsenOptions[Math.floor(Math.random() * statusAbsenOptions.length)];
        let uploadDok = null;
        if (status !== 1) {
          uploadDok = `dokumen_${mhs.npm}_${pembelajaran.id}.pdf`;
        }
        absensiData.push({
          id: absensiId++,
          id_mhs: mhs.user_id,
          npm: mhs.npm,
          id_pembelajaran: pembelajaran.id,
          status_absen: status,
          upload_dok: uploadDok,
          created_at: new Date(),
          updated_at: new Date()
        });
      }
    }
    await queryInterface.bulkInsert('absensi_mhs', absensiData);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('absensi_mhs');
    await queryInterface.dropTable('pembelajaran_dosen_ext');
    await queryInterface.dropTable('m_matakuliah');
  }
};