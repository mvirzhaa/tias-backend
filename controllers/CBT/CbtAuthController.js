'use strict';

const { CbtUserMapping } = require('../../models');
const { exchangeToCbtToken } = require('../../utils/cbtApiClient');

/**
 * POST /api/cbt/auth
 * SSO: tukar sesi TIAS dengan CBT Token.
 * req.user tersedia karena sudah melewati authMiddleware TIAS (protected).
 */
const getCbtToken = async (req, res) => {
  try {
    const tiasUser = req.user;

    if (!tiasUser) {
      return res.status(401).json({
        success: false,
        message: 'Sesi tidak valid. Silakan login ulang.'
      });
    }

    // Cek apakah CBT Token masih tersimpan & belum expired
    let mapping = await CbtUserMapping.findOne({
      where: { tias_user_id: tiasUser.user_id }
    });

    const now = new Date();
    const tokenMasihValid =
      mapping &&
      mapping.cbt_token &&
      mapping.cbt_token_expires_at &&
      new Date(mapping.cbt_token_expires_at) > now;

    if (tokenMasihValid) {
      // Kembalikan token yang tersimpan tanpa SSO ulang ke CBT API
      return res.status(200).json({
        success: true,
        data: {
          cbt_token: mapping.cbt_token,
          cbt_user_id: mapping.cbt_user_id,
        }
      });
    }

    // Token tidak ada atau expired → SSO ke CBT API
    const { cbt_token, cbt_user_id } = await exchangeToCbtToken({
      email: tiasUser.email,
      nama: tiasUser.nama_lengkap || tiasUser.email,
      nim: tiasUser.npm || null,
    });

    // Expired 8 jam dari sekarang (sinkron dengan expiry CBT Token)
    const expiresAt = new Date(now.getTime() + 8 * 60 * 60 * 1000);

    if (mapping) {
      await mapping.update({ cbt_token, cbt_user_id, cbt_token_expires_at: expiresAt });
    } else {
      await CbtUserMapping.create({
        tias_user_id: tiasUser.user_id,
        email: tiasUser.email,
        nim: tiasUser.npm || null,
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
    console.error('[CbtAuthController.getCbtToken]', error.message);
    return res.status(500).json({
      success: false,
      message: 'Gagal mendapatkan akses CBT. Coba lagi.'
    });
  }
};

module.exports = { getCbtToken };
