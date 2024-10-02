const { DataTypes, Model } = require("sequelize");
const db = require("../../config");

class Kurikulum extends Model {}
Kurikulum.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    kurikulum: {
      type: DataTypes.STRING,
    },
    created_at: {
      type: DataTypes.DATE,
    },
    updated_at: {
      type: DataTypes.DATE,
    },
    deleted_at: {
      type: DataTypes.DATE,
    },
  },
  {
    defaultScope: {
      where: {
        deleted_at: null,
      },
    },
    scopes: {
      deleted: {
        where: {
          deleted_at: null,
        },
      },
    },
    timestamps: false,
    tableName: "m_kurikulum",
    modelName: "Kurikulum",
    sequelize: db,
  }
);

module.exports = Kurikulum;
