const { DataTypes, Model, Sequelize } = require("sequelize");
const db = require("../config");

class Token extends Model {}
Token.init(
  {
    token_id: {
      type: DataTypes.UUID,
      defaultValue: Sequelize.UUIDV4,
      primaryKey: true,
    },
    user_id: {
      type: DataTypes.TEXT,
    },
    verif_token: {
      type: DataTypes.TEXT,
    },
    reset_token: {
      type: DataTypes.TEXT,
    },
    login_token: {
      type: DataTypes.TEXT,
    },
    created_at: {
      type: DataTypes.DATE,
    },
    expires_at: {
      type: DataTypes.DATE,
    },
  },
  {
    timestamps: false,
    tableName: "token",
    modelName: "Token",
    sequelize: db,
  }
);
module.exports = Token;
