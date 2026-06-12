const express = require('express');
const router = express.Router();
const axios = require('axios');
const http = require('http');
const https = require('https');
const jwt = require('jsonwebtoken');
const DB = require('../../database');
const { generateToken } = require('../../utils');

const EPORTAL_API = process.env.EPORTAL_URL || 'http://localhost:8000';

// Axios instance dengan keep-alive
const axiosInstance = axios.create({
    httpAgent: new http.Agent({ keepAlive: true }),
    httpsAgent: new https.Agent({ keepAlive: true }),
    timeout: 10000,
});

router.get('/callback', async (req, res) => {
    const { token, role_id, appModule_id } = req.query;

    if (!token || !role_id || !appModule_id) {
        return res.status(400).json({ status: 400, message: 'Parameter tidak lengkap.' });
    }

    try {
        const t1 = Date.now();

        // 1. Verifikasi token ke E-Portal (Introspect)
        const { data: eportalRes } = await axiosInstance.post(
            `${EPORTAL_API}/api/sso/introspect`,
            {},
            {
                headers: {
                    'X-SSO-Client-ID': String(process.env.SSO_CLIENT_ID).trim(),
                    'X-SSO-Client-Secret': String(process.env.SSO_CLIENT_SECRET).trim(),
                    'Authorization': `Bearer ${token}`
                }
            }
        );

        const t2 = Date.now();
        console.log(`[TIMING] introspect: ${t2 - t1}ms`);

        // 2. Parse response
        let parsedRes = eportalRes;
        if (typeof eportalRes === 'string') {
            const jsonMatch = eportalRes.match(/\{.*\}/s);
            if (jsonMatch) parsedRes = JSON.parse(jsonMatch[0]);
        }

        // 3. Validasi status dari E-Portal
        if (parsedRes.status !== 200 && !parsedRes.valid) {
            return res.status(401).json({
                status: 401,
                message: 'Token E-Portal tidak valid.',
                debug: parsedRes.message,
            });
        }

        const eportalUser = parsedRes.user;

        const t3 = Date.now();

        // 4. Cari user di database TIAS
        let userResult;

        if (eportalUser.nip) {
            userResult = await DB.query(
                `SELECT u.*, dp.nama_lengkap, dp.nip, dp.image, dp.total_point, dp.kode_mhs, dp.nip as dp_nip
                 FROM tb_users u
                 JOIN tb_data_pribadi dp ON dp.user_id = u.user_id
                 WHERE dp.nip = $1 AND u.deleted_at IS NULL`,
                [eportalUser.nip]
            );
        }

        if (!userResult || !userResult.rows.length) {
            userResult = await DB.query(
                `SELECT u.*, dp.nama_lengkap, dp.nip, dp.image, dp.total_point, dp.kode_mhs
                 FROM tb_users u
                 JOIN tb_data_pribadi dp ON dp.user_id = u.user_id
                 WHERE u.email = $1 AND u.deleted_at IS NULL`,
                [eportalUser.email]
            );
        }

        const t4 = Date.now();
        console.log(`[TIMING] DB query: ${t4 - t3}ms`);

        if (!userResult || !userResult.rows.length) {
            return res.status(404).json({
                status: 404,
                message: `User dengan email ${eportalUser.email} tidak ditemukan di TIAS.`,
            });
        }

        const user = userResult.rows[0];
        const tiasToken = generateToken(user.user_id);

        const t5 = Date.now();
        console.log(`[TIMING] total: ${t5 - t1}ms`);

        const userData = {
            user_id:      user.user_id,
            email:        user.email,
            role:         user.role,
            npm:          user.npm,
            nidn:         user.nidn,
            username:     user.username,
            nip:          user.nip,
            nama_lengkap: user.nama_lengkap,
            image:        user.image,
            total_point:  user.total_point,
            kode_mhs:     user.kode_mhs,
            isverified:   user.isverified,
            imageUrl:     `${process.env.API_URL}/foto-profile/${user.image}`,
            token:        tiasToken,
        };

        return res.json({
            status: 200,
            message: 'SSO TIAS berhasil.',
            data: userData,
        });

    } catch (error) {
        console.error('[TIAS SSO Error]', error.message);
        if (error.response) {
            console.error('[DEBUG DETAIL] Data:', error.response.data);
        }

        return res.status(500).json({
            status: 500,
            message: 'SSO gagal.',
            debug: error.message,
        });
    }
});

module.exports = router;