const { DataTypes, Model, Sequelize } = require("sequelize");
const db = require("../config");

class Parents extends Model { }
Parents.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    role: {
      type: DataTypes.STRING,
    },
    email: {
      type: DataTypes.STRING,
    },
    nama_lengkap: {
      type: DataTypes.STRING,
    },
    npm: {
      type: DataTypes.STRING,
    },
    no_hp: {
      type: DataTypes.STRING,
    },
    password: {
      type: DataTypes.STRING,
    },
    is_verified: {
      type: DataTypes.BOOLEAN,
    },
    login_token: {
      type: DataTypes.STRING,
    },
    verif_token: {
      type: DataTypes.STRING,
    },
    reset_token: {
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

    tableName: "tb_parents",
    modelName: "Parents",
    sequelize: db,
  }
);

module.exports = Parents;
