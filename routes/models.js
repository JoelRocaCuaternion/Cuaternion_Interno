const express = require('express');
const formidable = require('express-formidable');
const { listObjects, uploadObject, translateObject, getManifest, urnify } = require('../services/aps.js');

let router = express.Router();

router.get('/api/models', async function (req, res, next) {
    try {
        const objects = await listObjects();
        res.json(objects.map(o => ({
            name: o.objectKey,
            urn: urnify(o.objectId),
            fileName: o.objectKey,
            size: o.size || 0,
            incidents: 0,
            budget: 0,
            nextAction: 'Revisar'
        })));
    } catch (err) {
        next(err);
    }
});

router.get('/api/models/:urn/status', async function (req, res, next) {
    try {
        const manifest = await getManifest(req.params.urn);
        if (manifest) {
            let messages = [];
            if (manifest.derivatives) {
                for (const derivative of manifest.derivatives) {
                    messages = messages.concat(derivative.messages || []);
                    if (derivative.children) {
                        for (const child of derivative.children) {
                            messages = messages.concat(child.messages || []);
                        }
                    }
                }
            }
            res.json({ status: manifest.status, progress: manifest.progress, messages });
        } else {
            res.json({ status: 'not_found' });
        }
    } catch (err) {
        console.error('Error en /api/models/:urn/status:', err);
        res.status(500).json({ error: 'Error verificando estado del modelo' });
    }
});

// Nueva ruta para traducir modelo
router.post('/api/models/:urn/translate', async function (req, res, next) {
    try {
        const result = await translateObject(req.params.urn);
        res.json({ result: 'success', urn: req.params.urn });
    } catch (err) {
        console.error('Error en /api/models/:urn/translate:', err);
        res.status(500).json({ error: 'Error traduciendo modelo' });
    }
});

// Ruta para obtener modelo predeterminado
router.get('/api/models/default', async function (req, res, next) {
    try {
        const objects = await listObjects();
        
        // Buscar el modelo predeterminado
        const defaultModel = objects.find(o => 
            o.objectKey.includes('CLO_COORD (10).nwd') || 
            o.objectKey.includes('CLO_COORD')
        );
        
        if (defaultModel) {
            res.json({
                name: defaultModel.objectKey,
                urn: urnify(defaultModel.objectId),
                fileName: defaultModel.objectKey,
                size: defaultModel.size || 0
            });
        } else {
            // Si no se encuentra el modelo específico, usar el primero disponible
            if (objects.length > 0) {
                const firstModel = objects[0];
                res.json({
                    name: firstModel.objectKey,
                    urn: urnify(firstModel.objectId),
                    fileName: firstModel.objectKey,
                    size: firstModel.size || 0
                });
            } else {
                res.status(404).json({ error: 'No hay modelos disponibles' });
            }
        }
    } catch (err) {
        console.error('Error obteniendo modelo predeterminado:', err);
        res.status(500).json({ error: 'Error obteniendo modelo predeterminado' });
    }
});

router.post('/api/models', formidable({ maxFileSize: Infinity }), async function (req, res, next) {
    const file = req.files['model-file'];
    if (!file) {
        res.status(400).send('The required field ("model-file") is missing.');
        return;
    }
    try {
        const obj = await uploadObject(file.name, file.path);
        await translateObject(urnify(obj.objectId), req.fields['model-zip-entrypoint']);
        res.json({
            name: obj.objectKey,
            urn: urnify(obj.objectId)
        });
    } catch (err) {
        next(err);
    }
});

module.exports = router;