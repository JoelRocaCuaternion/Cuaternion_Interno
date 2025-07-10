let viewer;
let viewerOptions = {
    env: 'AutodeskProduction',
    api: 'derivativeV2',
    getAccessToken: getAccessToken
};

// Función para obtener el token de acceso
async function getAccessToken(onSuccess) {
    try {
        const response = await fetch('/api/auth/token');
        if (!response.ok) {
            throw new Error(`Error HTTP: ${response.status} - ${response.statusText}`);
        }
        const data = await response.json();
        
        if (!data.access_token) {
            throw new Error('Token de acceso no recibido');
        }
        
        onSuccess(data.access_token, data.expires_in);
    } catch (error) {
        console.error('Error obteniendo token:', error);
        if (window.showMessage) {
            window.showMessage('Error obteniendo token de acceso: ' + error.message, 'error');
        }
    }
}

// Función para inicializar el visor
function initViewer(container) {
    return new Promise((resolve, reject) => {
        const viewerContainer = container || document.getElementById('viewerContainer');
        if (!viewerContainer) {
            console.error('Contenedor del visor no encontrado');
            reject(new Error('Contenedor del visor no encontrado'));
            return;
        }
        
        // Limpiar contenedor
        viewerContainer.innerHTML = '<div id="viewerContainer" style="width: 100%; height: 100%;"></div>';
        
        // Verificar si Autodesk Viewing está disponible
        if (typeof Autodesk === 'undefined' || !Autodesk.Viewing) {
            console.error('Autodesk Viewing library no está cargada');
            reject(new Error('Biblioteca de Autodesk Viewing no disponible'));
            return;
        }
        
        // Inicializar Autodesk Forge Viewer
        Autodesk.Viewing.Initializer(viewerOptions, function onInitialized() {
            console.log('Autodesk Viewer inicializado correctamente');
            
            const viewerDiv = document.getElementById('viewerContainer');
            if (!viewerDiv) {
                console.error('Elemento viewerContainer no encontrado');
                reject(new Error('Elemento viewerContainer no encontrado'));
                return;
            }
            
            viewer = new Autodesk.Viewing.GuiViewer3D(viewerDiv);
            
            const startedCode = viewer.start();
            if (startedCode > 0) {
                console.error('Error iniciando el visor, código:', startedCode);
                reject(new Error('Error iniciando el visor'));
                return;
            }
            
            console.log('Visor iniciado correctamente');
            
            // Configurar herramientas
            setupViewerTools();
            
            resolve(viewer);
            
        }, function onError(error) {
            console.error('Error inicializando Autodesk Viewer:', error);
            reject(new Error('Error inicializando el visor: ' + error));
        });
    });
}

// Función para cargar modelo predeterminado
async function loadDefaultModel() {
    try {
        if (window.showMessage) {
            window.showMessage('Cargando modelo predeterminado...', 'info');
        }
        
        const response = await fetch('/api/models/default');
        if (!response.ok) {
            throw new Error(`Error obteniendo modelo predeterminado: ${response.status}`);
        }
        
        const defaultModel = await response.json();
        console.log('Modelo predeterminado encontrado:', defaultModel);
        
        // Cargar el modelo predeterminado
        await loadModel(defaultModel.urn);
        
    } catch (error) {
        console.error('Error cargando modelo predeterminado:', error);
        if (window.showMessage) {
            window.showMessage('Error cargando modelo predeterminado: ' + error.message, 'error');
        }
    }
}

// Función para cargar modelo
async function loadModel(urn) {
    if (!viewer) {
        console.error('Visor no inicializado');
        if (window.showMessage) {
            window.showMessage('Error: Visor no inicializado', 'error');
        }
        return;
    }
    
    try {
        console.log('Cargando modelo con URN:', urn);
        
        if (window.showMessage) {
            window.showMessage('Verificando estado del modelo...', 'info');
        }
        
        // Verificar si el modelo necesita traducción
        const statusResponse = await fetch(`/api/models/${urn}/status`);
        if (!statusResponse.ok) {
            throw new Error(`Error verificando estado: ${statusResponse.status}`);
        }
        
        const statusData = await statusResponse.json();
        console.log('Estado del modelo:', statusData);
        
        if (statusData.status === 'not_found') {
            // Iniciar traducción
            if (window.showMessage) {
                window.showMessage('Preparando modelo para visualización...', 'info');
            }
            
            const translateResponse = await fetch(`/api/models/${urn}/translate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            if (!translateResponse.ok) {
                throw new Error(`Error iniciando traducción: ${translateResponse.status}`);
            }
            
            // Esperar a que termine la traducción
            await waitForTranslation(urn);
        } else if (statusData.status === 'inprogress') {
            if (window.showMessage) {
                window.showMessage('El modelo se está procesando, por favor espere...', 'info');
            }
            await waitForTranslation(urn);
        } else if (statusData.status === 'failed') {
            throw new Error('La traducción del modelo falló');
        }
        
        // Cargar modelo en el visor
        const documentId = 'urn:' + urn;
        console.log('Cargando documento:', documentId);
        
        if (window.showMessage) {
            window.showMessage('Cargando modelo en el visor...', 'info');
        }
        
        Autodesk.Viewing.Document.load(documentId, function onDocumentLoadSuccess(doc) {
            console.log('Documento cargado correctamente');
            
            const viewables = doc.getRoot().getDefaultGeometry();
            if (viewables) {
                viewer.loadDocumentNode(doc, viewables).then(function(result) {
                    console.log('Modelo cargado correctamente en el visor');
                    
                    if (window.showMessage) {
                        window.showMessage('Modelo cargado correctamente', 'success', 3000);
                    }
                    
                    // Ajustar vista
                    viewer.fitToView();
                    
                }).catch(function(error) {
                    console.error('Error cargando geometría:', error);
                    if (window.showMessage) {
                        window.showMessage('Error cargando la geometría del modelo', 'error');
                    }
                });
            } else {
                console.error('No se encontraron geometrías visibles');
                if (window.showMessage) {
                    window.showMessage('No se encontraron geometrías visibles en el modelo', 'error');
                }
            }
        }, function onDocumentLoadFailure(error) {
            console.error('Error cargando documento:', error);
            if (window.showMessage) {
                window.showMessage('Error cargando el documento del modelo: ' + error, 'error');
            }
        });
        
    } catch (error) {
        console.error('Error cargando modelo:', error);
        if (window.showMessage) {
            window.showMessage('Error cargando modelo: ' + error.message, 'error');
        }
    }
}

// Función para esperar a que termine la traducción
async function waitForTranslation(urn, maxAttempts = 30) {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        try {
            const response = await fetch(`/api/models/${urn}/status`);
            if (!response.ok) {
                throw new Error(`Error verificando estado: ${response.status}`);
            }
            
            const data = await response.json();
            console.log(`Intento ${attempt + 1}: Estado de traducción:`, data.status);
            
            if (data.status === 'success') {
                console.log('Traducción completada exitosamente');
                return true;
            } else if (data.status === 'failed') {
                throw new Error('La traducción del modelo falló');
            }
            
            // Mostrar progreso si está disponible
            if (data.progress && window.showMessage) {
                window.showMessage(`Procesando modelo... ${data.progress}%`, 'info');
            }
            
            // Esperar 5 segundos antes del siguiente intento
            await new Promise(resolve => setTimeout(resolve, 5000));
            
        } catch (error) {
            console.error('Error verificando estado de traducción:', error);
            throw error;
        }
    }
    
    throw new Error('Tiempo de espera agotado para la traducción del modelo');
}

// Función para configurar herramientas del visor
function setupViewerTools() {
    if (!viewer) return;
    
    try {
        // Habilitar herramientas básicas
        viewer.setDefaultNavigationTool('orbit');
        
        // Configurar toolbar
        const toolbar = viewer.getToolbar(true);
        
        // Agregar botón para volver a modelos
        const backButton = new Autodesk.Viewing.UI.Button('backToModels');
        backButton.setToolTip('Volver a Modelos');
        backButton.setIcon('adsk-icon-home');
        backButton.onClick = function() {
            window.location.href = 'models.html';
        };
        
        // Crear grupo personalizado
        const customGroup = new Autodesk.Viewing.UI.ControlGroup('customControls');
        customGroup.addControl(backButton);
        toolbar.addControl(customGroup);
        
        console.log('Herramientas del visor configuradas');
        
    } catch (error) {
        console.error('Error configurando herramientas del visor:', error);
    }
}

// Función para redimensionar el visor
function resizeViewer() {
    if (viewer) {
        try {
            viewer.resize();
        } catch (error) {
            console.error('Error redimensionando visor:', error);
        }
    }
}

// Event listeners
window.addEventListener('resize', resizeViewer);

// Exponer funciones globalmente
window.initViewer = initViewer;
window.loadModel = loadModel;
window.loadDefaultModel = loadDefaultModel;
window.resizeViewer = resizeViewer;
window.viewer = viewer;