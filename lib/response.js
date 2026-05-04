const response = (
  res,
  isSuccess = true,
  responseMessage = "Success",
  data = null,
  statusCode = 200
) => {
  return res
    .status(isSuccess ? statusCode : statusCode == 200 ? 400 : statusCode)
    .json({
      isSuccess,
      statusCode: isSuccess ? statusCode : statusCode == 200 ? 400 : statusCode,
      responseMessage,
      data,
    });
};

module.exports = { response };
