const DB = require("../../db-evoting");
const asyncHandler = require("express-async-handler");

exports.createGroup = asyncHandler(async (req, res) => {
  const newData = req.body;

  if ((!newData.id_users, !newData.group)) {
    return res.status(400).json({
      message: "Please fill in all the required fields.",
    });
  }

  res.status(200).json({
    message: "Successfully created data",
  });
});
