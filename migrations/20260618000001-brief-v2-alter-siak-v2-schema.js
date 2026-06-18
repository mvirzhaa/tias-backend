'use strict';

/**
 * BRIEF v2 Task 1 + Task 2 — Migrasi skema siak_v2_* ke arsitektur UUID.
 *
 * Cakupan:
 *   - ALTER siak_v2_classes  : tambah UUID cols (siakProgramStudiId/Periode/MataKuliah),
 *                              status_kelas, kapasitas, is_active; rename nama_kelas→nama;
 *                              DROP dosen_pengampu_nip; DROP semester.
 *   - ALTER siak_v2_participants : tambah siak_mahasiswa_id UUID.
 *   - CREATE siak_v2_class_lecturers (join table dosen per kelas, UUID-based).
 *   - CREATE siak_user_mappings (jembatan tias_user_id ↔ siak_user_uuid).
 *
 * LOKAL/DEV  : hard swap — kolom lama langsung dibuang.
 * PRODUKSI   : gunakan pola expand/contract sebelum menjalankan migrasi ini:
 *              1. Tambah kolom baru + isi data (sync UUID berjalan).
 *              2. Verifikasi coverage (unmatched < threshold).
 *              3. Flip authz ke UUID.
 *              4. Baru jalankan migrasi ini (drop kolom lama).
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    // ── 1. ALTER siak_v2_classes ──────────────────────────────────────────────

    await queryInterface.addColumn('siak_v2_classes', 'siakProgramStudiId', {
      type: Sequelize.UUID,
      allowNull: true,
    });
    await queryInterface.addColumn('siak_v2_classes', 'siakPeriodeAkademikId', {
      type: Sequelize.UUID,
      allowNull: true,
    });
    await queryInterface.addColumn('siak_v2_classes', 'siakMataKuliahId', {
      type: Sequelize.UUID,
      allowNull: true,
    });
    await queryInterface.addColumn('siak_v2_classes', 'status_kelas', {
      type: Sequelize.STRING(32),
      allowNull: true,
    });
    await queryInterface.addColumn('siak_v2_classes', 'kapasitas', {
      type: Sequelize.INTEGER,
      allowNull: true,
    });
    await queryInterface.addColumn('siak_v2_classes', 'is_active', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    });

    await queryInterface.renameColumn('siak_v2_classes', 'nama_kelas', 'nama');

    // Local/dev: hard drop. Prod: run this only after authz is flipped to UUID.
    await queryInterface.removeColumn('siak_v2_classes', 'dosen_pengampu_nip');
    await queryInterface.removeColumn('siak_v2_classes', 'semester');

    await queryInterface.addIndex('siak_v2_classes', ['siakProgramStudiId'], {
      name: 'idx_svc_prodi',
    });
    await queryInterface.addIndex('siak_v2_classes', ['siakPeriodeAkademikId'], {
      name: 'idx_svc_periode',
    });

    // ── 2. ALTER siak_v2_participants ─────────────────────────────────────────

    await queryInterface.addColumn('siak_v2_participants', 'siak_mahasiswa_id', {
      type: Sequelize.UUID,
      allowNull: true,
    });
    await queryInterface.addIndex('siak_v2_participants', ['siak_mahasiswa_id'], {
      name: 'idx_svp_mhs',
    });

    // ── 3. CREATE siak_v2_class_lecturers ─────────────────────────────────────

    await queryInterface.createTable('siak_v2_class_lecturers', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      kelasKuliahId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'siak_v2_classes', key: 'kelasKuliahId' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      siak_dosen_id: {
        type: Sequelize.UUID,
        allowNull: false,
      },
      nidn: {
        type: Sequelize.STRING(64),
        allowNull: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
    });

    await queryInterface.addConstraint('siak_v2_class_lecturers', {
      fields: ['kelasKuliahId', 'siak_dosen_id'],
      type: 'unique',
      name: 'uq_svcl',
    });
    await queryInterface.addIndex('siak_v2_class_lecturers', ['siak_dosen_id'], {
      name: 'idx_svcl_dosen',
    });
    await queryInterface.addIndex('siak_v2_class_lecturers', ['nidn'], {
      name: 'idx_svcl_nidn',
    });

    // ── 4. CREATE siak_user_mappings ──────────────────────────────────────────

    await queryInterface.createTable('siak_user_mappings', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      tias_user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'tb_users', key: 'user_id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      siak_user_uuid: {
        type: Sequelize.UUID,
        allowNull: false,
      },
      identifier: {
        type: Sequelize.STRING(64),
        allowNull: false,
      },
      identifier_type: {
        // 'nidn' | 'npm'
        type: Sequelize.STRING(10),
        allowNull: false,
      },
      matched_via: {
        // 'nidn' | 'npm' | 'manual'
        type: Sequelize.STRING(10),
        allowNull: false,
      },
      status: {
        // 'auto' | 'verified' | 'rejected'
        type: Sequelize.STRING(10),
        allowNull: false,
        defaultValue: 'auto',
      },
      matched_at: {
        type: Sequelize.DATE,
        allowNull: true,
        defaultValue: Sequelize.NOW,
      },
      verified_by: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'tb_users', key: 'user_id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
    });

    await queryInterface.addConstraint('siak_user_mappings', {
      fields: ['tias_user_id'],
      type: 'unique',
      name: 'uq_sum_tias_user',
    });
    await queryInterface.addConstraint('siak_user_mappings', {
      fields: ['siak_user_uuid'],
      type: 'unique',
      name: 'uq_sum_siak_user',
    });
    await queryInterface.addIndex('siak_user_mappings', ['identifier'], {
      name: 'idx_sum_identifier',
    });
    await queryInterface.addIndex('siak_user_mappings', ['status'], {
      name: 'idx_sum_status',
    });
  },

  async down(queryInterface, Sequelize) {
    // Drop tabel baru dulu (FK ke siak_v2_classes / tb_users)
    await queryInterface.dropTable('siak_user_mappings');
    await queryInterface.dropTable('siak_v2_class_lecturers');

    // Revert siak_v2_participants
    await queryInterface.removeIndex('siak_v2_participants', 'idx_svp_mhs');
    await queryInterface.removeColumn('siak_v2_participants', 'siak_mahasiswa_id');

    // Revert siak_v2_classes — urut terbalik dari up()
    await queryInterface.removeIndex('siak_v2_classes', 'idx_svc_periode');
    await queryInterface.removeIndex('siak_v2_classes', 'idx_svc_prodi');

    // Restore dropped columns sebelum rename supaya tidak ada gap
    await queryInterface.addColumn('siak_v2_classes', 'semester', {
      type: Sequelize.STRING,
      allowNull: true,
    });
    await queryInterface.addColumn('siak_v2_classes', 'dosen_pengampu_nip', {
      type: Sequelize.JSONB,
      allowNull: true,
      defaultValue: [],
    });

    await queryInterface.renameColumn('siak_v2_classes', 'nama', 'nama_kelas');

    await queryInterface.removeColumn('siak_v2_classes', 'is_active');
    await queryInterface.removeColumn('siak_v2_classes', 'kapasitas');
    await queryInterface.removeColumn('siak_v2_classes', 'status_kelas');
    await queryInterface.removeColumn('siak_v2_classes', 'siakMataKuliahId');
    await queryInterface.removeColumn('siak_v2_classes', 'siakPeriodeAkademikId');
    await queryInterface.removeColumn('siak_v2_classes', 'siakProgramStudiId');
  },
};
