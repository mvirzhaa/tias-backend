// create_kompetensi (diperbanyak - 5 data per user)
'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Ambil semua user_id mahasiswa dan dosen
    const [users] = await queryInterface.sequelize.query(
      "SELECT user_id, role FROM tb_users WHERE role IN ('Mahasiswa', 'Dosen')"
    );

    const mahasiswaIds = users.filter(u => u.role === 'Mahasiswa').map(u => u.user_id);
    const dosenIds = users.filter(u => u.role === 'Dosen').map(u => u.user_id);
    const allUserIds = [...mahasiswaIds, ...dosenIds];

    await queryInterface.dropTable('tb_tes', { cascade: true }).catch(() => { });
    await queryInterface.dropTable('tb_sertifikasi', { cascade: true }).catch(() => { });

    // tb_sertifikasi
    await queryInterface.createTable('tb_sertifikasi', {
      sertifikat_id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      user_id: { type: Sequelize.UUID },
      jenis_serti: { type: Sequelize.STRING },
      kategori_id: { type: Sequelize.INTEGER },
      nama_serti: { type: Sequelize.STRING },
      bidang_studi: { type: Sequelize.STRING },
      tgl_serti: { type: Sequelize.DATE },
      penyelenggara: { type: Sequelize.STRING },
      file: { type: Sequelize.STRING },
      status: { type: Sequelize.INTEGER, defaultValue: 0 },
      is_deleted: { type: Sequelize.BOOLEAN, defaultValue: false },
      created_at: { type: Sequelize.DATE },
      updated_at: { type: Sequelize.DATE },
      deleted_at: { type: Sequelize.DATE, allowNull: true }
    });

    // Generate 5 sertifikasi per user
    const sertifikasiData = [];
    const sertifikasiTemplates = [
      { jenis_serti: 'Kompetensi', kategori_id: 1, nama_serti: 'Oracle Certified Professional', bidang_studi: 'Database', penyelenggara: 'Oracle' },
      { jenis_serti: 'Kompetensi', kategori_id: 1, nama_serti: 'AWS Certified Solutions Architect', bidang_studi: 'Cloud Computing', penyelenggara: 'Amazon Web Services' },
      { jenis_serti: 'Pelatihan', kategori_id: 3, nama_serti: 'Fullstack Web Development', bidang_studi: 'Web Development', penyelenggara: 'Dicoding' },
      { jenis_serti: 'Kompetensi', kategori_id: 2, nama_serti: 'Cisco Certified Network Associate', bidang_studi: 'Networking', penyelenggara: 'Cisco' },
      { jenis_serti: 'Pelatihan', kategori_id: 3, nama_serti: 'Data Science and Machine Learning', bidang_studi: 'Data Science', penyelenggara: 'IBM' },
      { jenis_serti: 'Kompetensi', kategori_id: 1, nama_serti: 'Microsoft Certified: Azure Administrator', bidang_studi: 'Cloud', penyelenggara: 'Microsoft' },
      { jenis_serti: 'Pelatihan', kategori_id: 3, nama_serti: 'UI/UX Design Masterclass', bidang_studi: 'Design', penyelenggara: 'Google' },
      { jenis_serti: 'Kompetensi', kategori_id: 2, nama_serti: 'Certified Ethical Hacker', bidang_studi: 'Cyber Security', penyelenggara: 'EC-Council' },
      { jenis_serti: 'Pelatihan', kategori_id: 3, nama_serti: 'Project Management Professional', bidang_studi: 'Management', penyelenggara: 'PMI' },
      { jenis_serti: 'Kompetensi', kategori_id: 1, nama_serti: 'Red Hat Certified Engineer', bidang_studi: 'Linux', penyelenggara: 'Red Hat' }
    ];

    let sertifikatId = 1;
    for (const userId of allUserIds) {
      for (let i = 0; i < 5; i++) {
        const template = sertifikasiTemplates[i % sertifikasiTemplates.length];
        const tglSerti = new Date();
        tglSerti.setFullYear(2024, i % 12, (i % 28) + 1);

        sertifikasiData.push({
          sertifikat_id: sertifikatId++,
          user_id: userId,
          jenis_serti: template.jenis_serti,
          kategori_id: template.kategori_id,
          nama_serti: `${template.nama_serti} ${i + 1}`,
          bidang_studi: template.bidang_studi,
          tgl_serti: tglSerti,
          penyelenggara: template.penyelenggara,
          status: 1,
          created_at: new Date(),
          updated_at: new Date()
        });
      }
    }
    await queryInterface.bulkInsert('tb_sertifikasi', sertifikasiData);

    // tb_tes
    await queryInterface.createTable('tb_tes', {
      tes_id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      user_id: { type: Sequelize.UUID },
      nama_tes: { type: Sequelize.STRING },
      jenis_tes: { type: Sequelize.STRING },
      penyelenggara: { type: Sequelize.STRING },
      tgl_tes: { type: Sequelize.DATE },
      kategori_id: { type: Sequelize.INTEGER },
      skor_tes: { type: Sequelize.STRING },
      file: { type: Sequelize.STRING },
      status: { type: Sequelize.INTEGER, defaultValue: 0 },
      is_deleted: { type: Sequelize.BOOLEAN, defaultValue: false },
      created_at: { type: Sequelize.DATE },
      updated_at: { type: Sequelize.DATE },
      deleted_at: { type: Sequelize.DATE, allowNull: true }
    });

    const tesTemplates = [
      { nama_tes: 'TOEFL ITP', jenis_tes: 'English Proficiency', penyelenggara: 'ETS', kategori_id: 1, skor: ['550', '600', '520', '580', '610'] },
      { nama_tes: 'IELTS Academic', jenis_tes: 'English Proficiency', penyelenggara: 'British Council', kategori_id: 2, skor: ['6.5', '7.0', '6.0', '7.5', '8.0'] },
      { nama_tes: 'JLPT', jenis_tes: 'Japanese Proficiency', penyelenggara: 'Japan Foundation', kategori_id: 2, skor: ['N4', 'N3', 'N5', 'N4', 'N3'] },
      { nama_tes: 'TOEIC', jenis_tes: 'English Proficiency', penyelenggara: 'ETS', kategori_id: 1, skor: ['800', '850', '750', '900', '820'] },
      { nama_tes: 'GRE', jenis_tes: 'Academic Aptitude', penyelenggara: 'ETS', kategori_id: 2, skor: ['310', '320', '305', '325', '315'] },
      { nama_tes: 'GMAT', jenis_tes: 'Business Aptitude', penyelenggara: 'GMAC', kategori_id: 2, skor: ['650', '700', '620', '720', '680'] },
      { nama_tes: 'HSK', jenis_tes: 'Chinese Proficiency', penyelenggara: 'Hanban', kategori_id: 2, skor: ['4', '5', '3', '5', '4'] },
      { nama_tes: 'DELF', jenis_tes: 'French Proficiency', penyelenggara: 'France Éducation International', kategori_id: 2, skor: ['B1', 'B2', 'A2', 'B2', 'C1'] }
    ];

    const tesData = [];
    let tesId = 1;
    for (const userId of allUserIds) {
      for (let i = 0; i < 5; i++) {
        const template = tesTemplates[i % tesTemplates.length];
        const tglTes = new Date();
        tglTes.setFullYear(2024, i % 12, (i % 28) + 1);
        const skor = template.skor[i % template.skor.length];

        tesData.push({
          tes_id: tesId++,
          user_id: userId,
          nama_tes: template.nama_tes,
          jenis_tes: template.jenis_tes,
          penyelenggara: template.penyelenggara,
          tgl_tes: tglTes,
          kategori_id: template.kategori_id,
          skor_tes: skor,
          status: 1,
          created_at: new Date(),
          updated_at: new Date()
        });
      }
    }
    await queryInterface.bulkInsert('tb_tes', tesData);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('tb_tes');
    await queryInterface.dropTable('tb_sertifikasi');
  }
};