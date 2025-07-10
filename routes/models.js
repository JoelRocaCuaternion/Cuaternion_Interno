const express = require('express');
const formidable = require('express-formidable');
const { listObjects, uploadObject, translateObject, getManifest, urnify } = require('../services/aps.js');

let router = express.Router();

// Función para detectar el tipo de modelo basado en la extensión del archivo
function detectModelType(fileName) {
    const lowerFileName = fileName.toLowerCase();
    
    // Detectar modelos P&ID (2D)
    if (lowerFileName.includes('pid') || 
        lowerFileName.includes('p&id') || 
        lowerFileName.endsWith('.dwg') || 
        lowerFileName.endsWith('.dwf') ||
        lowerFileName.endsWith('.dxf') || 
        lowerFileName.includes('2d') ||
        lowerFileName.includes('plano') ||
        lowerFileName.includes('esquema')) {
        return '2d';
    }
    
    // Detectar modelos 3D
    if (lowerFileName.endsWith('.nwd') || 
        lowerFileName.endsWith('.nwc') || 
        lowerFileName.endsWith('.rvt') || 
        lowerFileName.endsWith('.ifc') || 
        lowerFileName.endsWith('.3dm') ||
        lowerFileName.endsWith('.step') ||
        lowerFileName.endsWith('.stp') ||
        lowerFileName.includes('3d')) {
        return '3d';
    }
    
    // Por defecto, asumir 3D
    return '3d';
}

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
            nextAction: 'Revisar',
            type: detectModelType(o.objectKey) // Añadir tipo de modelo
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

// Ruta para obtener modelo 3D predeterminado
router.get('/api/models/default', async function (req, res, next) {
    try {
        const objects = await listObjects();
        
        // Buscar modelos 3D
        const models3D = objects.filter(o => detectModelType(o.objectKey) === '3d');
        
        // Buscar el modelo predeterminado específico
        const defaultModel = models3D.find(o => 
            o.objectKey.includes('CLO_COORD (10).nwd') || 
            o.objectKey.includes('CLO_COORD')
        );
        
        if (defaultModel) {
            res.json({
                name: defaultModel.objectKey,
                urn: urnify(defaultModel.objectId),
                fileName: defaultModel.objectKey,
                size: defaultModel.size || 0,
                type: '3d'
            });
        } else {
            // Si no se encuentra el modelo específico, usar el primer modelo 3D disponible
            if (models3D.length > 0) {
                const firstModel = models3D[0];
                res.json({
                    name: firstModel.objectKey,
                    urn: urnify(firstModel.objectId),
                    fileName: firstModel.objectKey,
                    size: firstModel.size || 0,
                    type: '3d'
                });
            } else {
                res.status(404).json({ error: 'No hay modelos 3D disponibles' });
            }
        }
    } catch (err) {
        console.error('Error obteniendo modelo 3D predeterminado:', err);
        res.status(500).json({ error: 'Error obteniendo modelo 3D predeterminado' });
    }
});

// Nueva ruta para obtener modelo 2D predeterminado
router.get('/api/models/default2d', async function (req, res, next) {
    try {
        const objects = await listObjects();
        
        // Buscar modelos 2D/P&ID
        const models2D = objects.filter(o => detectModelType(o.objectKey) === '2d');
        
        // Buscar el modelo P&ID predeterminado
        const defaultModel = models2D.find(o => 
            o.objectKey.includes('N1_Glicol SM-2 -2,5ºC - 01.dwf') || 
            o.objectKey.includes('N1_Glicol')
        );
        
        if (defaultModel) {
            res.json({
                name: defaultModel.objectKey,
                urn: urnify(defaultModel.objectId),
                fileName: defaultModel.objectKey,
                size: defaultModel.size || 0,
                type: '2d'
            });
        } else {
            // Si no se encuentra el modelo específico, usar el primer modelo 2D disponible
            if (models2D.length > 0) {
                const firstModel = models2D[0];
                res.json({
                    name: firstModel.objectKey,
                    urn: urnify(firstModel.objectId),
                    fileName: firstModel.objectKey,
                    size: firstModel.size || 0,
                    type: '2d'
                });
            } else {
                res.status(404).json({ error: 'No hay modelos 2D disponibles' });
            }
        }
    } catch (err) {
        console.error('Error obteniendo modelo 2D predeterminado:', err);
        res.status(500).json({ error: 'Error obteniendo modelo 2D predeterminado' });
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
            urn: urnify(obj.objectId),
            type: detectModelType(obj.objectKey)
        });
    } catch (err) {
        next(err);
    }
});

module.exports = router;