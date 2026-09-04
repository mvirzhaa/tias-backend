'use strict';

module.exports = (sequelize, DataTypes) => {
  const CbtUserMapping = sequelize.define(
    'CbtUserMapping',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      tias_user_id: {
        type: DataTypes.UUID,
        allowNull: false,
        unique: true,
      },
      email: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      nim: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      cbt_user_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      cbt_token: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      cbt_token_expires_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      tableName: 'cbt_user_mappings',
      underscored: true,
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    }
  );

  CbtUserMapping.associate = (models) => {
    // Sesuaikan 'User' dengan nama model user TIAS yang sudah ada
    CbtUserMapping.belongsTo(models.User, {
      foreignKey: 'tias_user_id',
      as: 'user',
    });
  };

  return CbtUserMapping;
};
