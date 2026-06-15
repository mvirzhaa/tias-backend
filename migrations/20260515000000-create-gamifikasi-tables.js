'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // 1. kategori_ip
    await queryInterface.createTable('kategori_ip', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      kode: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true
      },
      kategori: {
        type: Sequelize.STRING,
        allowNull: true
      },
      point: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // 2. point_rekomendasi
    await queryInterface.createTable('point_rekomendasi', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      kode: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true
      },
      point: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      status: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // 3. achievements
    await queryInterface.createTable('achievements', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      name: {
        type: Sequelize.STRING,
        allowNull: true
      },
      gamify: {
        type: Sequelize.STRING,
        allowNull: true
      },
      start_point: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      points: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      image: {
        type: Sequelize.STRING,
        allowNull: true
      },
      lencana: {
        type: Sequelize.STRING,
        allowNull: true
      },
      kode: {
        type: Sequelize.STRING,
        allowNull: true
      },
      sub_judul: {
        type: Sequelize.STRING,
        allowNull: true
      },
      deskripsi: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // 4. user_achievements
    await queryInterface.createTable('user_achievements', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'tb_users',
          key: 'user_id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      achievement_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'achievements',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      status: {
        type: Sequelize.INTEGER,
        allowNull: true,
        defaultValue: 0
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // 5. tb_ip_mhs
    await queryInterface.createTable('tb_ip_mhs', {
      ip_id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'tb_users',
          key: 'user_id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      semester: {
        type: Sequelize.STRING,
        allowNull: true
      },
      tahun: {
        type: Sequelize.STRING,
        allowNull: true
      },
      ip: {
        type: Sequelize.DOUBLE,
        allowNull: true
      },
      kode_ip: {
        type: Sequelize.STRING,
        allowNull: true
      },
      status: {
        type: Sequelize.INTEGER,
        allowNull: true,
        defaultValue: 0
      },
      is_deleted: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      point: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      deleted_at: {
        type: Sequelize.DATE,
        allowNull: true
      }
    });

    // 6. m_matakuliah
    await queryInterface.createTable('m_matakuliah', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      kode_matakuliah: {
        type: Sequelize.STRING,
        allowNull: true
      },
      nama_matakuliah: {
        type: Sequelize.STRING,
        allowNull: true
      },
      kurikulum: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      sks: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      materi: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      deleted_at: {
        type: Sequelize.DATE,
        allowNull: true
      }
    });

    // 7. absensi_mhs
    await queryInterface.createTable('absensi_mhs', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      id_pembelajaran: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      id_mhs: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'tb_users',
          key: 'user_id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      npm: {
        type: Sequelize.STRING,
        allowNull: true
      },
      upload_dok: {
        type: Sequelize.STRING,
        allowNull: true
      },
      nilai: {
        type: Sequelize.STRING,
        allowNull: true
      },
      status_absen: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      coordinate_absen: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      deleted_at: {
        type: Sequelize.DATE,
        allowNull: true
      }
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('absensi_mhs');
    await queryInterface.dropTable('m_matakuliah');
    await queryInterface.dropTable('tb_ip_mhs');
    await queryInterface.dropTable('user_achievements');
    await queryInterface.dropTable('achievements');
    await queryInterface.dropTable('point_rekomendasi');
    await queryInterface.dropTable('kategori_ip');
  }
};
