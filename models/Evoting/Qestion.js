const { DataTypes, Model } = require("sequelize");
const db = require("../../config");
const Answer = require("./Answer");

class Question extends Model {}
Question.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    deskripsi: {
      type: DataTypes.TEXT,
    },
    status_pertanyaan: {
      type: DataTypes.UUID,
    },
    created_at: {
      type: DataTypes.DATE,
    },
    group: {
      type: DataTypes.BOOLEAN,
    },
  },
  {
    timestamps: false,
    tableName: "tb_voting_pertanyaan",
    modelName: "Question",
    sequelize: db,
  }
);

Question.hasMany(Answer, {
  foreignKey: "id_pertanyaan",
  sourceKey: "id",
  as: "answer",
});

module.exports = Question;
