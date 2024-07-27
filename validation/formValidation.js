const Joi = require("joi");
const PasswordComplexity = require("joi-password-complexity");

// From validation
exports.formRegisterValidation = (data) => {
  const schema = Joi.object({
    npm_nidn: Joi.number().label("npm_nidn"),
    email: Joi.string().email().required().label("Email"),
    password: PasswordComplexity().required().label("Password"),
    password2: PasswordComplexity().required().label("Password2"),
  });
  return schema.validate(data);
};

exports.formRegisterKaryawanValidation = (data) => {
  const schema = Joi.object({
    nip: Joi.number().label("nip"),
    email: Joi.string().email().required().label("Email"),
    password: PasswordComplexity().required().label("Password"),
    password2: PasswordComplexity().required().label("Password2"),
  });
  return schema.validate(data);
};

exports.formRegisterPmmValidation = (data) => {
  const schema = Joi.object({
    npm: Joi.string().label("npm"),
    email: Joi.string().email().required().label("Email"),
    password: PasswordComplexity().required().label("Password"),
  });
  return schema.validate(data);
};

exports.formRegisterDosenExt = (data) => {
  const schema = Joi.object({
    nama_lengkap: Joi.string().label("Nama Lengkap"),
    jenkel: Joi.string().label("jenkel"),
    tanggal_lahir: Joi.string().label("tanggal_lahir"),
    tempat_lahir: Joi.string().label("tempat_lahir"),
    agama: Joi.string().label("agama"),
    no_hp: Joi.string().label("no_hp"),
    nip: Joi.string().label("nip"),
    instansi: Joi.string().label("instansi"),
    email: Joi.string().email().required().label("Email"),
    password: PasswordComplexity().required().label("Password"),
    password2: PasswordComplexity().required().label("Password2"),
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

// ChangePassword Users For Admin
exports.changePasswordUsersValidation = (data) => {
  const schema = Joi.object({
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
