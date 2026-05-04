const { formidable } = require("formidable");
const _ = require("lodash");
const response = require("../../helper/response-parser");
const imageExt = ["xls", "xlsx"]; // Extensi file yang diizinkan

module.exports = (req, res, next) => {
  try {
    const form = formidable(); // Menggunakan IncomingForm()

    form.parse(req, (err, fields, files) => {
      try {
        let validateFile = [];

        // Cek apakah ada files yang diunggah
        if (files && files.file) {
          files.file.forEach((file) => {
            let dataAsset = file.originalFilename?.split(".");
            let fileExtension = dataAsset[dataAsset.length - 1].toLowerCase();

            if (!imageExt.includes(fileExtension)) {
              validateFile.push(fileExtension);
            }
          });
        }

        // Jika ada file dengan extensi yang tidak valid
        if (validateFile.length > 0) {
          return response.error(res, {
            status: 500,
            success: false,
            message: "File forbidden upload",
            err,
          });
        } else {
          req.body = { ...fields, ...files };

          if (!err) {
            next();
          } else {
            return response.error(res, {
              status: 500,
              success: false,
              message: "Input not valid",
              err,
            });
          }
        }
      } catch (err) {
        return response.error(res, {
          status: 500,
          success: false,
          message: "Input not valid",
          err,
        });
      }
    });
  } catch (err) {
    console.log({ err });
    return response.error(res, {
      status: 500,
      success: false,
      message: "Input not valid",
      err,
    });
  }
};
