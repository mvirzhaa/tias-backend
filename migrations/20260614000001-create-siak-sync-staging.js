'use strict';

const timestamps = (Sequelize) => ({
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

const syncAuditColumns = (Sequelize) => ({
  is_active: {
    type: Sequelize.BOOLEAN,
    allowNull: false,
    defaultValue: true,
  },
  siak_updated_at: {
    type: Sequelize.DATE,
    allowNull: true,
  },
  raw_payload: {
    type: Sequelize.JSONB,
    allowNull: true,
  },
  last_sync_run_id: {
    type: Sequelize.UUID,
    allowNull: true,
  },
});

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('siak_sync_runs', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      resource: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      mode: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      status: {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: 'running',
      },
      semester: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      started_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
      finished_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      page_count: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      total_rows: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      error_message: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      meta: {
        type: Sequelize.JSONB,
        allowNull: true,
      },
      ...timestamps(Sequelize),
    });

    await queryInterface.createTable('siak_sync_faculties', {
      fakultas_id: {
        type: Sequelize.STRING,
        primaryKey: true,
      },
      kode_fakultas: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      nama_fakultas: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      ...syncAuditColumns(Sequelize),
      ...timestamps(Sequelize),
    });

    await queryInterface.createTable('siak_sync_study_programs', {
      prodi_id: {
        type: Sequelize.STRING,
        primaryKey: true,
      },
      fakultas_id: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      kode_prodi: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      nama_prodi: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      jenjang: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      ...syncAuditColumns(Sequelize),
      ...timestamps(Sequelize),
    });

    await queryInterface.createTable('siak_sync_curriculums', {
      kurikulum_id: {
        type: Sequelize.STRING,
        primaryKey: true,
      },
      prodi_id: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      nama_kurikulum: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      tahun: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      ...syncAuditColumns(Sequelize),
      ...timestamps(Sequelize),
    });

    await queryInterface.createTable('siak_sync_courses', {
      mata_kuliah_id: {
        type: Sequelize.STRING,
        primaryKey: true,
      },
      kurikulum_id: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      prodi_id: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      kode_matakuliah: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      nama_matakuliah: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      sks: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      semester_kurikulum: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      jenis: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      ...syncAuditColumns(Sequelize),
      ...timestamps(Sequelize),
    });

    await queryInterface.createTable('siak_sync_classes', {
      kelas_kuliah_id: {
        type: Sequelize.UUID,
        primaryKey: true,
      },
      mata_kuliah_id: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      prodi_id: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      semester: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      nama_kelas: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      kapasitas: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      metode: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      ...syncAuditColumns(Sequelize),
      ...timestamps(Sequelize),
    });

    await queryInterface.createTable('siak_sync_class_lecturers', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      kelas_kuliah_id: {
        type: Sequelize.UUID,
        allowNull: false,
      },
      nip: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      nama_dosen: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      email: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      is_koordinator: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      ...syncAuditColumns(Sequelize),
      ...timestamps(Sequelize),
    });

    await queryInterface.createTable('siak_sync_class_schedules', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      kelas_kuliah_id: {
        type: Sequelize.UUID,
        allowNull: false,
      },
      hari: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      jam_mulai: {
        type: Sequelize.TIME,
        allowNull: false,
      },
      jam_selesai: {
        type: Sequelize.TIME,
        allowNull: false,
      },
      ruang_id: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      nama_ruang: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      metode: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      ...syncAuditColumns(Sequelize),
      ...timestamps(Sequelize),
    });

    await queryInterface.createTable('siak_sync_class_participants', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      kelas_kuliah_id: {
        type: Sequelize.UUID,
        allowNull: false,
      },
      npm: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      nama_mahasiswa: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      email: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      status: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      ...syncAuditColumns(Sequelize),
      ...timestamps(Sequelize),
    });

    await queryInterface.createTable('matakuliah_siak_mapping', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      matakuliah_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      kode_matakuliah_lokal: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      mata_kuliah_id: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      kode_matakuliah_siak: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      status: {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: 'pending',
      },
      mapping_method: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      verified_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      verified_by: {
        type: Sequelize.UUID,
        allowNull: true,
      },
      ...timestamps(Sequelize),
    });

    await queryInterface.addIndex('siak_sync_runs', ['resource', 'status'], {
      name: 'idx_siak_sync_runs_resource_status',
    });
    await queryInterface.addIndex('siak_sync_study_programs', ['fakultas_id'], {
      name: 'idx_siak_sync_study_programs_fakultas',
    });
    await queryInterface.addIndex('siak_sync_curriculums', ['prodi_id'], {
      name: 'idx_siak_sync_curriculums_prodi',
    });
    await queryInterface.addIndex('siak_sync_courses', ['prodi_id'], {
      name: 'idx_siak_sync_courses_prodi',
    });
    await queryInterface.addIndex('siak_sync_courses', ['kode_matakuliah'], {
      name: 'idx_siak_sync_courses_kode',
    });
    await queryInterface.addIndex('siak_sync_classes', ['semester', 'prodi_id'], {
      name: 'idx_siak_sync_classes_semester_prodi',
    });
    await queryInterface.addIndex('siak_sync_classes', ['mata_kuliah_id'], {
      name: 'idx_siak_sync_classes_mata_kuliah',
    });
    await queryInterface.addIndex('siak_sync_class_lecturers', ['kelas_kuliah_id', 'nip'], {
      name: 'uq_siak_sync_class_lecturers_kelas_nip',
      unique: true,
    });
    await queryInterface.addIndex('siak_sync_class_schedules', ['kelas_kuliah_id', 'hari', 'jam_mulai', 'jam_selesai'], {
      name: 'uq_siak_sync_class_schedules_slot',
      unique: true,
    });
    await queryInterface.addIndex('siak_sync_class_participants', ['kelas_kuliah_id', 'npm'], {
      name: 'uq_siak_sync_class_participants_kelas_npm',
      unique: true,
    });
    await queryInterface.addIndex('siak_sync_class_participants', ['npm'], {
      name: 'idx_siak_sync_class_participants_npm',
    });
    await queryInterface.addIndex('matakuliah_siak_mapping', ['matakuliah_id'], {
      name: 'uq_matakuliah_siak_mapping_matakuliah',
      unique: true,
    });
    await queryInterface.addIndex('matakuliah_siak_mapping', ['mata_kuliah_id'], {
      name: 'uq_matakuliah_siak_mapping_siak_course',
      unique: true,
    });
    await queryInterface.addIndex('matakuliah_siak_mapping', ['status'], {
      name: 'idx_matakuliah_siak_mapping_status',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('matakuliah_siak_mapping');
    await queryInterface.dropTable('siak_sync_class_participants');
    await queryInterface.dropTable('siak_sync_class_schedules');
    await queryInterface.dropTable('siak_sync_class_lecturers');
    await queryInterface.dropTable('siak_sync_classes');
    await queryInterface.dropTable('siak_sync_courses');
    await queryInterface.dropTable('siak_sync_curriculums');
    await queryInterface.dropTable('siak_sync_study_programs');
    await queryInterface.dropTable('siak_sync_faculties');
    await queryInterface.dropTable('siak_sync_runs');
  },
};
