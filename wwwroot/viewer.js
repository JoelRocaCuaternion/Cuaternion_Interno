let viewer;
let currentModel = null;

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

// Función para inicializar el viewer
async function initViewer(container) {
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
                const config = {
                    extensions: ['Autodesk.DocumentBrowser']
                };
                
                viewer = new Autodesk.Viewing.GuiViewer3D(container, config);
                const startedCode = viewer.start();
                
                if (startedCode > 0) {
                    console.error('Error iniciando viewer');
                    reject(new Error('Error iniciando viewer'));
                    return;
                }

                console.log('Viewer inicializado correctamente');
                resolve(viewer);
            });
        } catch (error) {
            console.error('Error inicializando viewer:', error);
            reject(error);
        }
    });
}

// Función para cargar un modelo específico
async function loadModel(urn) {
    if (!viewer) {
        console.error('Viewer no inicializado');
        return;
    }

    try {
        console.log('Cargando modelo con URN:', urn);
        
        // Descargar el modelo actual si existe
        if (currentModel) {
            viewer.unloadModel(currentModel);
            currentModel = null;
        }

        const documentId = `urn:${urn}`;
        
        Autodesk.Viewing.Document.load(documentId, function(doc) {
            const viewables = doc.getRoot().getDefaultGeometry();
            if (viewables) {
                viewer.loadDocumentNode(doc, viewables).then(function(model) {
                    currentModel = model;
                    console.log('Modelo cargado exitosamente');
                    
                    // Centrar el modelo en la vista
                    viewer.fitToView();
                }).catch(function(error) {
                    console.error('Error cargando modelo:', error);
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
async function loadDefaultModel() {
    try {
        const response = await fetch('/api/models/default');
        if (!response.ok) {
            throw new Error('No se pudo obtener el modelo predeterminado');
        }
        const model = await response.json();
        await loadModel(model.urn);
    } catch (error) {
        console.error('Error cargando modelo predeterminado:', error);
    }
}

// Función para inicializar el visor
async function initializeViewer() {
    const previewContainer = document.getElementById('preview');
    if (!previewContainer) {
        console.error('Contenedor de preview no encontrado');
        return;
    }

    try {
        console.log('Inicializando visor...');
        viewer = await initViewer(previewContainer);
        const urn = window.location.hash?.substring(1);
        
        if (!urn) {
            console.log('No hay URN en la URL, cargando modelo predeterminado...');
            await loadDefaultModel();
        } else {
            console.log('URN encontrada en URL:', urn);
            await loadModel(urn);
        }
        
    } catch (error) {
        console.error('Error inicializando visor:', error);
    }
}

// Inicializar cuando se carga la página
document.addEventListener('DOMContentLoaded', initializeViewer);


// Función para inicializar el visor P&ID
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
            // Cargar modelo 2D predeterminado
            await loadDefault2DModel();
        } else {
            console.log('URN encontrada en URL:', urn);
            // Cargar modelo específico
            await loadModel(urn);
        }
        
    } catch (error) {
        console.error('Error inicializando visor P&ID:', error);
        showMessage('Error al inicializar el visor P&ID: ' + error.message, 'error');
    }
}

// Función para cargar modelo 2D predeterminado
async function loadDefault2DModel() {
    try {
        const response = await fetch('/api/models/default2d');
        if (!response.ok) {
            throw new Error('No se pudo obtener el modelo 2D predeterminado');
        }
        const model = await response.json();
        await loadModel(model.urn);
    } catch (error) {
        console.error('Error cargando modelo 2D predeterminado:', error);
    }
}

// Inicializar cuando se carga la página
document.addEventListener('DOMContentLoaded', initializePIDViewer);

// Exponer funciones globalmente
window.initViewer = initViewer;
window.loadModel = loadModel;
window.loadDefaultModel = loadDefaultModel;