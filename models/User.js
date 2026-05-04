const { DataTypes, Model, Sequelize } = require("sequelize");
const db = require("../config");
const DataPribadi = require("./DataPribadi");

class User extends Model {}
User.init(
  {
    user_id: {
      type: DataTypes.UUID,
      defaultValue: Sequelize.UUIDV4,
      primaryKey: true,
    },
    role: {
      type: DataTypes.STRING,
    },
    email: {
      type: DataTypes.STRING,
    },
    nidn: {
      type: DataTypes.STRING,
    },
    npm: {
      type: DataTypes.STRING,
    },
    isverified: {
      type: DataTypes.BOOLEAN,
    },
    password: {
      type: DataTypes.STRING,
    },
    // user_agent: {
    //   type: DataTypes.ARRAY,
    // },
    curr_code: {
      type: DataTypes.STRING,
    },
    department_code: {
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

    tableName: "tb_users",
    modelName: "User",
    sequelize: db,
  }
);

User.hasOne(DataPribadi, {
  foreignKey: "user_id",
  sourceKey: "user_id",
  as: "personal_data",
});

module.exports = User;
