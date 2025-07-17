// Variables globales para manejar múltiples visores
let viewerInstances = {};
let isInitialized = false;

// Función para obtener el token de acceso
async function getAccessToken() {
    try {
        const response = await fetch('/api/auth/token');
        if (!response.ok) {
            throw new Error('Error obteniendo token');
        }
        const data = await response.json();
        return data.access_token;
    } catch (error) {
        console.error('Error obteniendo token:', error);
        throw error;
    }
}

// Función para inicializar el SDK de Autodesk (solo una vez)
async function initializeAutodeskSDK() {
    if (isInitialized) {
        return Promise.resolve();
    }

    return new Promise(async (resolve, reject) => {
        try {
            const token = await getAccessToken();
            
            const options = {
                env: 'AutodeskProduction',
                api: 'derivativeV2',
                getAccessToken: function(onTokenReady) {
                    onTokenReady(token, 3600);
                }
            };

            Autodesk.Viewing.Initializer(options, function() {
                console.log('Autodesk SDK inicializado correctamente');
                isInitialized = true;
                resolve();
            });
        } catch (error) {
            console.error('Error inicializando SDK:', error);
            reject(error);
        }
    });
}

// Función para crear un nuevo viewer
async function createViewer(container, viewerId) {
    await initializeAutodeskSDK();
    
    return new Promise((resolve, reject) => {
        try {
            const config = {
                 extensions: ['Autodesk.DocumentBrowser'],
                useADP: false,
                env: 'AutodeskProduction',
                api: 'derivativeV2',
                // Mejoras de calidad
                disabledExtensions: {
                    bimwalk: true,
                    hypermodeling: true
                }
            };
            
            const viewer = new Autodesk.Viewing.GuiViewer3D(container, config);
            const startedCode = viewer.start();
            initializeViewerResize();
            
            if (startedCode > 0) {
                console.error('Error iniciando viewer:', startedCode);
                reject(new Error('Error iniciando viewer'));
                return;
            }

            // Guardar la instancia del viewer
            viewerInstances[viewerId] = {
                viewer: viewer,
                currentModel: null
            };

            console.log('Viewer creado correctamente:', viewerId);
            resolve(viewer);
        } catch (error) {
            console.error('Error creando viewer:', error);
            reject(error);
        }
    });
}

// Función para inicializar un viewer
async function initViewer(container) {
    const viewerId = container.id || 'default';
    return await createViewer(container, viewerId);
}

// Función para cargar un modelo específico
async function loadModel(urn, viewerId = 'default') {
    const viewerInstance = viewerInstances[viewerId];
    
    if (!viewerInstance || !viewerInstance.viewer) {
        console.error('Viewer no encontrado:', viewerId);
        return;
    }

    const viewer = viewerInstance.viewer;

    try {
        console.log('Cargando modelo con URN:', urn, 'en viewer:', viewerId);
        
        // Descargar el modelo actual si existe
        if (viewerInstance.currentModel) {
            viewer.unloadModel(viewerInstance.currentModel);
            viewerInstance.currentModel = null;
        }

        const documentId = `urn:${urn}`;
        
        Autodesk.Viewing.Document.load(documentId, function(doc) {
            const viewables = doc.getRoot().getDefaultGeometry();
            if (viewables) {
                viewer.loadDocumentNode(doc, viewables).then(function(model) {
                    viewerInstance.currentModel = model;
                    console.log('Modelo cargado exitosamente en viewer:', viewerId);
                    
                    // Centrar el modelo en la vista
                    viewer.fitToView();
                }).catch(function(error) {
                    console.error('Error cargando modelo en viewer:', viewerId, error);
                });
            } else {
                console.error('No se encontraron geometrías en el documento');
            }
        }, function(error) {
            console.error('Error cargando documento:', error);
        });
        
    } catch (error) {
        console.error('Error en loadModel:', error);
    }
}

// Función para cargar modelo predeterminado
async function loadDefaultModel(viewerId = 'default') {
    try {
        const response = await fetch('/api/models/default');
        if (!response.ok) {
            throw new Error('No se pudo obtener el modelo predeterminado');
        }
        const model = await response.json();
        await loadModel(model.urn, viewerId);
    } catch (error) {
        console.error('Error cargando modelo predeterminado:', error);
    }
}

// Función para cargar modelo 2D predeterminado
async function loadDefault2DModel(viewerId = 'default') {
    try {
        const response = await fetch('/api/models/default2d');
        if (!response.ok) {
            throw new Error('No se pudo obtener el modelo 2D predeterminado');
        }
        const model = await response.json();
        await loadModel(model.urn, viewerId);
    } catch (error) {
        console.error('Error cargando modelo 2D predeterminado:', error);
    }
}

// Función para inicializar el visor 3D individual
async function initializeViewer() {
    const previewContainer = document.getElementById('preview');
    if (!previewContainer) {
        console.error('Contenedor de preview no encontrado');
        return;
    }

    try {
        console.log('Inicializando visor 3D...');
        const viewer = await initViewer(previewContainer);
        const urn = window.location.hash?.substring(1);
        
        if (!urn) {
            console.log('No hay URN en la URL, cargando modelo predeterminado...');
            await loadDefaultModel('preview');
        } else {
            console.log('URN encontrada en URL:', urn);
            await loadModel(urn, 'preview');
        }
        
    } catch (error) {
        console.error('Error inicializando visor 3D:', error);
    }
}

// Función para inicializar el visor P&ID individual
async function initializePIDViewer() {
    const previewContainer = document.getElementById('preview2D');
    if (!previewContainer) {
        console.error('Contenedor de preview2D no encontrado');
        return;
    }

    try {
        console.log('Inicializando visor P&ID...');
        const viewer = await initViewer(previewContainer);
        const urn = window.location.hash?.substring(1);
        
        if (!urn) {
            console.log('No hay URN en la URL, cargando modelo 2D predeterminado...');
            await loadDefault2DModel('preview2D');
        } else {
            console.log('URN encontrada en URL:', urn);
            await loadModel(urn, 'preview2D');
        }
        
    } catch (error) {
        console.error('Error inicializando visor P&ID:', error);
        if (typeof showMessage === 'function') {
            showMessage('Error al inicializar el visor P&ID: ' + error.message, 'error');
        }
    }
}

// Función para inicializar el visor dual
async function initializeDualViewer() {
    const preview3D = document.getElementById('preview');
    const preview2D = document.getElementById('preview2D');
    
    if (!preview3D || !preview2D) {
        console.error('Contenedores de preview no encontrados para visor dual');
        return;
    }

    try {
        console.log('Inicializando visor dual...');
        
        // Crear ambos visores
        const viewer3D = await createViewer(preview3D, 'preview');
        const viewer2D = await createViewer(preview2D, 'preview2D');
        
        // Obtener URNs de la URL
        const urlParams = new URLSearchParams(window.location.search);
        const urn3D = urlParams.get('urn3d') || window.location.hash?.substring(1);
        const urn2D = urlParams.get('urn2d');
        
        // Cargar modelos
        if (urn3D) {
            console.log('Cargando modelo 3D:', urn3D);
            await loadModel(urn3D, 'preview');
        } else {
            console.log('Cargando modelo 3D predeterminado...');
            await loadDefaultModel('preview');
        }
        
        if (urn2D) {
            console.log('Cargando modelo 2D:', urn2D);
            await loadModel(urn2D, 'preview2D');
        } else {
            console.log('Cargando modelo 2D predeterminado...');
            await loadDefault2DModel('preview2D');
        }
        
        // Guardar referencias globales
        window.viewer3D = viewer3D;
        window.viewer2D = viewer2D;

         if (window.setViewerReferences) {
            window.setViewerReferences(viewer3D, viewer2D);
        }
        
        // Mejorar la calidad de ambos viewers
        if (window.improveViewerQuality) {
            window.improveViewerQuality(viewer3D);
            window.improveViewerQuality(viewer2D);
        }

        // Listener para cuando los viewers estén completamente cargados
        viewer3D.addEventListener(Autodesk.Viewing.GEOMETRY_LOADED_EVENT, function() {
            if (window.improveViewerQuality) {
                window.improveViewerQuality(viewer3D);
            }
        });

        viewer2D.addEventListener(Autodesk.Viewing.GEOMETRY_LOADED_EVENT, function() {
            if (window.improveViewerQuality) {
                window.improveViewerQuality(viewer2D);
            }
        });
        
    } catch (error) {
        console.error('Error inicializando visor dual:', error);
        if (typeof showMessage === 'function') {
            showMessage('Error al inicializar el visor dual: ' + error.message, 'error');
        }
    }
}

// Función para obtener una instancia de viewer específica
function getViewerInstance(viewerId) {
    return viewerInstances[viewerId];
}

// Función para limpiar todos los visores
function cleanupViewers() {
    Object.keys(viewerInstances).forEach(viewerId => {
        const instance = viewerInstances[viewerId];
        if (instance && instance.viewer) {
            instance.viewer.finish();
        }
    });
    viewerInstances = {};
}

// Exponer funciones globalmente
window.initViewer = initViewer;
window.createViewer = createViewer;
window.loadModel = loadModel;
window.loadDefaultModel = loadDefaultModel;
window.loadDefault2DModel = loadDefault2DModel;
window.initializeViewer = initializeViewer;
window.initializePIDViewer = initializePIDViewer;
window.initializeDualViewer = initializeDualViewer;
window.getViewerInstance = getViewerInstance;
window.cleanupViewers = cleanupViewers;