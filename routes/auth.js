const express = require('express');
const { getViewerToken } = require('../services/aps.js'); 

let router = express.Router();

router.get('/api/auth/token', async function (req, res, next) {
    try {
        const token = await getViewerToken();
        res.json({
            access_token: token.access_token,
            expires_in: token.expires_in
        });
    } catch (error) {
        console.error('Error obteniendo token para visor:', error);
        res.status(500).json({ error: 'No se pudo obtener el token' });
    }
});

module.exports = router;
