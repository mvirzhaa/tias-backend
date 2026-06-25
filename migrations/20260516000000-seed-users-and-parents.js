// seed_users_and_parent (diperbanyak)
'use strict';
const bcrypt = require('bcryptjs');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // === DATA MAHASISWA (5 orang) ===
    const mahasiswaData = [
      { id: '20260515-0000-0000-0000-000000000001', npm: '20260515001', nama: 'Muhammad Syaifullah', nik: '1234567890123456', no_hp: '081234567890', email: 'syaifullah@example.com', dpId: '20260515-1111-1111-1111-111111111111' },
      { id: '20260515-0000-0000-0000-000000000002', npm: '20260515002', nama: 'Ahmad Fauzan', nik: '1234567890123457', no_hp: '081234567891', email: 'fauzan@example.com', dpId: '20260515-1111-1111-1111-111111111112' },
      { id: '20260515-0000-0000-0000-000000000003', npm: '20260515003', nama: 'Siti Aisyah', nik: '1234567890123458', no_hp: '081234567892', email: 'aisyah@example.com', dpId: '20260515-1111-1111-1111-111111111113' },
      { id: '20260515-0000-0000-0000-000000000004', npm: '20260515004', nama: 'Budi Santoso', nik: '1234567890123459', no_hp: '081234567893', email: 'budi@example.com', dpId: '20260515-1111-1111-1111-111111111114' },
      { id: '20260515-0000-0000-0000-000000000005', npm: '20260515005', nama: 'Dewi Lestari', nik: '1234567890123460', no_hp: '081234567894', email: 'dewi@example.com', dpId: '20260515-1111-1111-1111-111111111115' }
    ];

    // === DATA DOSEN (5 orang) ===
    const dosenData = [
      { id: '20260515-2222-2222-2222-222222222221', npm: 'DOSEN001', nama: 'Fitrah Satrya F.K, M.Kom', nik: '2234567890123456', no_hp: '082345678901', email: 'fitrah@example.com', dpId: '20260515-4444-4444-4444-444444444441' },
      { id: '20260515-2222-2222-2222-222222222222', npm: 'DOSEN002', nama: 'Berlina Wulandari, S.T., M.Kom', nik: '2234567890123457', no_hp: '082345678902', email: 'berlina@example.com', dpId: '20260515-4444-4444-4444-444444444442' },
      { id: '20260515-2222-2222-2222-222222222223', npm: 'DOSEN003', nama: 'Dr. Hendra Gunawan, M.T', nik: '2234567890123458', no_hp: '082345678903', email: 'hendra@example.com', dpId: '20260515-4444-4444-4444-444444444443' },
      { id: '20260515-2222-2222-2222-222222222224', npm: 'DOSEN004', nama: 'Rina Marlina, S.Si., M.Sc', nik: '2234567890123459', no_hp: '082345678904', email: 'rina@example.com', dpId: '20260515-4444-4444-4444-444444444444' },
      { id: '20260515-2222-2222-2222-222222222225', npm: 'DOSEN005', nama: 'Ir. Bambang Supriyadi, M.T', nik: '2234567890123460', no_hp: '082345678905', email: 'bambang@example.com', dpId: '20260515-4444-4444-4444-444444444445' }
    ];

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('password123', salt);

    // 1. Seed Users (5 Mahasiswa + 5 Dosen)
    const userRecords = [
      ...mahasiswaData.map(m => ({ user_id: m.id, npm: m.npm, email: m.email, password: hashedPassword, role: 'Mahasiswa', isverified: true, created_at: new Date(), updated_at: new Date() })),
      ...dosenData.map(d => ({ user_id: d.id, npm: d.npm, email: d.email, password: hashedPassword, role: 'Dosen', isverified: true, created_at: new Date(), updated_at: new Date() }))
    ];
    await queryInterface.bulkInsert('tb_users', userRecords, { ignoreDuplicates: true });

    // 2. Seed Data Pribadi
    const dataPribadiRecords = [
      ...mahasiswaData.map(m => ({ dp_id: m.dpId, user_id: m.id, nama_lengkap: m.nama, nik: m.nik, no_hp: m.no_hp, created_at: new Date(), updated_at: new Date() })),
      ...dosenData.map(d => ({ dp_id: d.dpId, user_id: d.id, nama_lengkap: d.nama, nik: d.nik, no_hp: d.no_hp, created_at: new Date(), updated_at: new Date() }))
    ];
    await queryInterface.bulkInsert('tb_data_pribadi', dataPribadiRecords, { ignoreDuplicates: true });

    // 3. Seed Parents (2 parent untuk 2 mahasiswa)
    const parentData = [
      { id: 1001, email: 'parent_syaifullah@example.com', nama: 'Ayah Syaifullah', npm: '20260515001', no_hp: '089123456701' },
      { id: 1002, email: 'parent_fauzan@example.com', nama: 'Ayah Fauzan', npm: '20260515002', no_hp: '089123456702' }
    ];

    for (const parent of parentData) {
      await queryInterface.bulkInsert('tb_parents', [{
        id: parent.id, email: parent.email, password: hashedPassword, nama_lengkap: parent.nama, npm: parent.npm, no_hp: parent.no_hp, role: 'Parent', is_verified: true, created_at: new Date(), updated_at: new Date()
      }], { ignoreDuplicates: true });
    }

    // 4. Link Parent to Mahasiswa
    const parentMhsLinks = parentData.map(p => ({ parent_id: p.id, mhs_id: mahasiswaData.find(m => m.npm === p.npm).id, created_at: new Date(), updated_at: new Date() }));
    await queryInterface.bulkInsert('trx_parent_mhs', parentMhsLinks, { ignoreDuplicates: true });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('trx_parent_mhs', { parent_id: [1001, 1002] });
    await queryInterface.bulkDelete('tb_parents', { id: [1001, 1002] });
    await queryInterface.bulkDelete('tb_data_pribadi', {
      dp_id: [
        '20260515-1111-1111-1111-111111111111', '20260515-1111-1111-1111-111111111112', '20260515-1111-1111-1111-111111111113',
        '20260515-1111-1111-1111-111111111114', '20260515-1111-1111-1111-111111111115',
        '20260515-4444-4444-4444-444444444441', '20260515-4444-4444-4444-444444444442', '20260515-4444-4444-4444-444444444443',
        '20260515-4444-4444-4444-444444444444', '20260515-4444-4444-4444-444444444445'
      ]
    });
    await queryInterface.bulkDelete('tb_users', {
      user_id: [
        '20260515-0000-0000-0000-000000000001', '20260515-0000-0000-0000-000000000002', '20260515-0000-0000-0000-000000000003',
        '20260515-0000-0000-0000-000000000004', '20260515-0000-0000-0000-000000000005',
        '20260515-2222-2222-2222-222222222221', '20260515-2222-2222-2222-222222222222', '20260515-2222-2222-2222-222222222223',
        '20260515-2222-2222-2222-222222222224', '20260515-2222-2222-2222-222222222225'
      ]
    });
  }
};