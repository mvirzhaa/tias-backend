const { DataTypes, Model } = require("sequelize");
const db = require("../../config");

class Answer extends Model {}
Answer.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    id_pertanyaan: {
      type: DataTypes.INTEGER,
    },
    jawaban: {
      type: DataTypes.STRING,
    },
    status_jawaban: {
      type: DataTypes.INTEGER,
    },
    image: {
      type: DataTypes.STRING,
    },
  },
  {
    timestamps: false,
    tableName: "tb_voting_jawaban",
    modelName: "Answer",
    sequelize: db,
  }
);

module.exports = Answer;
