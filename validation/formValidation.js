const Joi = require("joi");
const PasswordComplexity = require("joi-password-complexity");

// From validation
exports.formRegisterValidation = (data) => {
  const schema = Joi.object({
    npm_nidn: Joi.number().label("npm_nidn"),
    email: Joi.string().email().required().label("Email"),
    password: PasswordComplexity().required().label("Password"),
  });
  return schema.validate(data);
};

// reset password validation
exports.resetPasswordValidation = (data) => {
  const schema = Joi.object({
    password: PasswordComplexity().required().label("Password"),
  });

  return schema.validate(data);
};

// ChangePassword validation
exports.changePasswordValidation = (data) => {
  const schema = Joi.object({
    oldPassword: Joi.string().required().label("Old Password"),
    password: PasswordComplexity().required().label("Password"),
  });
  return schema.validate(data);
};

exports.formTesValidation = (data) => {
  console.log(data);
  const schema = Joi.object({
    nama_tes: Joi.string().required().label("Nama Tes"),
    jenis_tes: Joi.string().required().label("Jenis Tes"),
    penyelenggara: Joi.string().required().label("Penyelenggara"),
    tgl_tes: Joi.date().required().label("Tanggal Tes"),
    skor_tes: Joi.required().label("Skor Tes"),
  });
  return schema.validate(data);
};
