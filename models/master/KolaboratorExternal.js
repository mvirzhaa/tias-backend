const { DataTypes, Model } = require("sequelize");
const db = require("../../config");

class KolaboratorExternal extends Model {}
KolaboratorExternal.init(
  {
    ext_id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    nama: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    negara: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    jenkel: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    no_hp: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    created_at: {
      type: DataTypes.DATE,
    },
    updated_at: {
      type: DataTypes.DATE,
    },
  },
  {
    timestamps: false,
    tableName: "kolab_external",
    modelName: "KolaboratorExternal",
    sequelize: db,
  }
);

module.exports = KolaboratorExternal;