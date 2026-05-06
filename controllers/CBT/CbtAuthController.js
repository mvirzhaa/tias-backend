'use strict';
const { CbtUserMapping } = require('../../models');
const { exchangeToCbtToken } = require('../../utils/cbtApiClient');

const getCbtToken = async (req, res) => {
  try {
    const tiasUser = req.user;
    if (!tiasUser) {
      return res.status(401).json({ success: false, message: 'Sesi tidak valid.' });
    }
    const userId   = tiasUser.user_id;   // primary key di TIAS
    const email    = tiasUser.email;
    // Coba semua kemungkinan nama field untuk nama lengkap
    const nama     = tiasUser.nama_lengkap || tiasUser.nama || tiasUser.name || email;
    // Coba semua kemungkinan nama field untuk NIM/NPM
    const nim      = tiasUser.npm || tiasUser.nim || null;

    let mapping = await CbtUserMapping.findOne({
      where: { tias_user_id: userId }
    });

    const now = new Date();
    const masihValid =
      mapping?.cbt_token &&
      mapping?.cbt_token_expires_at &&
      new Date(mapping.cbt_token_expires_at) > now;

    if (masihValid) {
      return res.status(200).json({
        success: true,
        data: {
          cbt_token: mapping.cbt_token,
          cbt_user_id: mapping.cbt_user_id,
        }
      });
    }

    const { cbt_token, cbt_user_id } = await exchangeToCbtToken({ email, nama, nim });

    const expiresAt = new Date(now.getTime() + 8 * 60 * 60 * 1000);

    if (mapping) {
      await mapping.update({ cbt_token, cbt_user_id, cbt_token_expires_at: expiresAt });
    } else {
      await CbtUserMapping.create({
        tias_user_id: userId,
        email,
        nim,
        cbt_user_id,
        cbt_token,
        cbt_token_expires_at: expiresAt,
      });
    }

    return res.status(200).json({
      success: true,
      data: { cbt_token, cbt_user_id }
    });

  } catch (error) {
    console.error('[CbtAuthController]', error.message);
    return res.status(500).json({
      success: false,
      message: 'Gagal mendapatkan akses CBT. ' + error.message
    });
  }
};

module.exports = { getCbtToken };