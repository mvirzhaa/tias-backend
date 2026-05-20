'use strict';
const bcrypt = require('bcryptjs');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const dummyMhsId = '20260515-0000-0000-0000-000000000001';
    const dummyDosenId1 = '20260515-2222-2222-2222-222222222222';
    const dummyDosenId2 = '20260515-3333-3333-3333-333333333333';
    const dummyParentId = 999;
    const dummyDpIdMhs = '20260515-1111-1111-1111-111111111111';
    const dummyDpIdDos1 = '20260515-4444-4444-4444-444444444444';
    const dummyDpIdDos2 = '20260515-5555-5555-5555-555555555555';
    const dummyNpm = '20260515001';

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('password123', salt);

    // 1. Seed Mahasiswa & Dosen (tb_users)
    await queryInterface.bulkInsert('tb_users', [
      { user_id: dummyMhsId, npm: dummyNpm, email: 'mahasiswa@example.com', password: hashedPassword, role: 'Mahasiswa', isverified: true, created_at: new Date(), updated_at: new Date() },
      { user_id: dummyDosenId1, npm: 'DOSEN001', email: 'dosen1@example.com', password: hashedPassword, role: 'Dosen', isverified: true, created_at: new Date(), updated_at: new Date() },
      { user_id: dummyDosenId2, npm: 'DOSEN002', email: 'dosen2@example.com', password: hashedPassword, role: 'Dosen', isverified: true, created_at: new Date(), updated_at: new Date() }
    ], { ignoreDuplicates: true });

    // 2. Seed Data Pribadi (Mahasiswa & Dosen)
    await queryInterface.bulkInsert('tb_data_pribadi', [
      { dp_id: dummyDpIdMhs, user_id: dummyMhsId, nama_lengkap: 'Muhammad Syaifullah', nik: '123', no_hp: '081', created_at: new Date(), updated_at: new Date() },
      { dp_id: dummyDpIdDos1, user_id: dummyDosenId1, nama_lengkap: 'Fitrah Satrya F.K, M.Kom', nik: '124', no_hp: '082', created_at: new Date(), updated_at: new Date() },
      { dp_id: dummyDpIdDos2, user_id: dummyDosenId2, nama_lengkap: 'Berlina Wulandari, S.T., M.Kom', nik: '125', no_hp: '083', created_at: new Date(), updated_at: new Date() }
    ], { ignoreDuplicates: true });

    // 3. Seed Parent
    await queryInterface.bulkInsert('tb_parents', [{
      id: dummyParentId, email: 'parent@example.com', password: hashedPassword, nama_lengkap: 'Ayah Budi', npm: dummyNpm, no_hp: '089', role: 'Parent', is_verified: true, created_at: new Date(), updated_at: new Date()
    }], { ignoreDuplicates: true });

    // 4. Link Parent to Mahasiswa
    await queryInterface.bulkInsert('trx_parent_mhs', [{
      parent_id: dummyParentId, mhs_id: dummyMhsId, created_at: new Date(), updated_at: new Date()
    }], { ignoreDuplicates: true });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('trx_parent_mhs', { parent_id: 999 });
    await queryInterface.bulkDelete('tb_parents', { id: 999 });
    await queryInterface.bulkDelete('tb_data_pribadi', { dp_id: ['20260515-1111-1111-1111-111111111111', '20260515-4444-4444-4444-444444444444', '20260515-5555-5555-5555-555555555555'] });
    await queryInterface.bulkDelete('tb_users', { user_id: ['20260515-0000-0000-0000-000000000001', '20260515-2222-2222-2222-222222222222', '20260515-3333-3333-3333-333333333333'] });
  }
};
