const { DataTypes, Model, Sequelize } = require("sequelize");
const db = require("../../config");
const User = require("../User");

class LmsRoleScope extends Model {}

LmsRoleScope.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: Sequelize.UUIDV4,
      primaryKey: true,
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    role_key: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    scope_type: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    fakultas_id: {
      type: DataTypes.STRING,
    },
    prodi_id: {
      type: DataTypes.STRING,
    },
    permissions: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {},
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    created_by: {
      type: DataTypes.UUID,
    },
    updated_by: {
      type: DataTypes.UUID,
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
    tableName: "lms_role_scopes",
    modelName: "LmsRoleScope",
    sequelize: db,
  }
);

LmsRoleScope.belongsTo(User, {
  foreignKey: "user_id",
  targetKey: "user_id",
  as: "user",
});

module.exports = LmsRoleScope;
