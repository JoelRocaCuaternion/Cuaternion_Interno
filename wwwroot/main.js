// Funciones de notificación
function showMessage(message, type = 'info', duration = 5000) {
    const overlay = document.getElementById('overlay');
    if (!overlay) {
        console.error('Overlay element not found');
        return;
    }
    
    const typeClass = {
        'success': 'alert-success',
        'error': 'alert-danger',
        'warning': 'alert-warning',
        'info': 'alert-info'
    }[type] || 'alert-info';
    
    overlay.innerHTML = `
        <div class="notification">
            <div class="alert ${typeClass}" role="alert">
                <button id="closeOverlay" type="button" class="btn-close" aria-label="Cerrar" 
                        style="position: absolute; top: 10px; right: 15px; border: none; background: none; font-size: 1.5em; cursor: pointer;">×</button>
                <div id="notificationContent" style="padding-right: 30px;">${message}</div>
            </div>
        </div>
    `;
    overlay.style.display = 'flex';
    
    document.getElementById('closeOverlay').addEventListener('click', clearNotification);
    
    // Auto-cerrar después del tiempo especificado (excepto para errores)
    if (duration > 0 && type !== 'error') {
        setTimeout(clearNotification, duration);
    }
}

function showConfirmDialog(title, message) {
    return new Promise((resolve) => {
        const overlay = document.getElementById('overlay');
        if (!overlay) {
            console.error('Overlay element not found');
            resolve(false);
            return;
        }
        
        overlay.innerHTML = `
            <div class="notification">
                <div class="alert alert-warning" role="dialog" style="min-width: 400px;">
                    <h5 style="margin-bottom: 15px;">${title}</h5>
                    <p style="margin-bottom: 20px;">${message}</p>
                    <div class="d-flex gap-2 justify-content-end">
                        <button id="cancelBtn" type="button" class="btn btn-secondary">Cancelar</button>
                        <button id="confirmBtn" type="button" class="btn btn-danger">Eliminar</button>
                    </div>
                </div>
            </div>
        `;
        overlay.style.display = 'flex';
        
        document.getElementById('cancelBtn').addEventListener('click', () => {
            clearNotification();
            resolve(false);
        });
        
        document.getElementById('confirmBtn').addEventListener('click', () => {
            clearNotification();
            resolve(true);
        });
    });
}

function clearNotification() {
    const overlay = document.getElementById('overlay');
    if (overlay) {
        overlay.style.display = 'none';
    }
}

// Función para formatear tamaño de archivo
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}


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

// Función para cargar modelos desde la API
async function loadModels() {
    if (!window.location.pathname.includes('models.html')) {
        return;
    }
    
    const tbody = document.querySelector('.models-table tbody');
    
    if (!tbody) {
        console.error('Tabla de modelos no encontrada');
        return;
    }
    
    try {
        if (typeof showMessage === 'function') {
            showMessage('Cargando modelos desde Autodesk Forge...', 'info');
        }
        
        const response = await fetch('/api/models');
        
        if (!response.ok) {
            throw new Error(`Error HTTP: ${response.status} - ${response.statusText}`);
        }
        
        const models = await response.json();
        
        if (typeof clearNotification === 'function') {
            clearNotification();
        }
        
        // Limpiar tabla
        tbody.innerHTML = '';
        
        if (models.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 20px;">No se encontraron modelos en Autodesk Forge</td></tr>';
            return;
        }
        
        // Llenar tabla con modelos
        models.forEach(model => {
            const row = document.createElement('tr');
            const modelName = model.name || '';
            const fileName = model.fileName || 'Sin nombre';
            const modelType = model.type || detectModelType(fileName);
            
            row.innerHTML = `
                <td>${modelName}</td>
                <td>${fileName}</td>
                <td>
                    <span class="model-type-badge ${modelType === '2d' ? 'type-2d' : 'type-3d'}">
                        ${modelType === '2d' ? 'P&ID' : '3D'}
                    </span>
                </td>
                <td>
                    <button class="action-btn" onclick="openModel('${model.urn}', '${fileName}')">
                        Abrir
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        });
        
        if (typeof showMessage === 'function') {
            showMessage(`${models.length} modelos cargados correctamente desde Autodesk Forge`, 'success', 3000);
        }
        
    } catch (error) {
        console.error('Error cargando modelos:', error);
        if (typeof showMessage === 'function') {
            showMessage('Error al cargar los modelos desde Autodesk Forge: ' + error.message, 'error');
        }
        
        // Mostrar mensaje de ayuda para debugging
        const tbody = document.querySelector('.models-table tbody');
        if (tbody) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" style="text-align: center; padding: 20px; color: #dc3545;">
                        <strong>Error de conexión con Autodesk Forge</strong><br>
                        Verifica que tu APS_CLIENT_ID y APS_CLIENT_SECRET estén configurados correctamente.<br>
                        Error: ${error.message}
                    </td>
                </tr>
            `;
        }
    }
}

// Función para abrir modelo en el visor
function openModel(urn, fileName) {
    if (!urn) {
        if (typeof showMessage === 'function') {
            showMessage('URN del modelo no válido', 'error');
        }
        return;
    }
    
    console.log('Abriendo modelo:', { urn, fileName });
    
    // Detectar el tipo de modelo basado en el nombre del archivo
    const modelType = detectModelType(fileName);
    
    // Redirigir según el tipo de modelo
    if (modelType === '2d') {
        console.log('Modelo 2D detectado, redirigiendo a pid.html');
        window.location.href = `pid.html#${urn}`;
    } else {
        console.log('Modelo 3D detectado, redirigiendo a index.html');
        window.location.href = `index.html#${urn}`;
    }
}

// Función para abrir modelos en el visor dual
function openDualModel(urn3D, urn2D) {
    const params = new URLSearchParams();
    if (urn3D) params.set('urn3d', urn3D);
    if (urn2D) params.set('urn2d', urn2D);
    
    window.location.href = `dual.html?${params.toString()}`;
}

// Función de inicialización cuando se carga la página
function initializePage() {
    const currentPath = window.location.pathname;
    
    console.log('Inicializando página:', currentPath);
    
    // Limpiar viewers anteriores si existen
    if (typeof cleanupViewers === 'function') {
        cleanupViewers();
    }
    
    if (currentPath.includes('models.html')) {
        console.log('Inicializando página de modelos...');
        loadModels();
    } else if (currentPath.includes('dual.html')) {
        console.log('Inicializando página del visor dual...');
        document.body.classList.add('dual-viewer');
        // Esperar un poco para asegurar que el DOM esté listo
        setTimeout(() => {
            if (typeof initializeDualViewer === 'function') {
                initializeDualViewer();
            }
        }, 100);
    } else if (currentPath.includes('index.html') || currentPath === '/') {
        console.log('Inicializando página del visor 3D...');
        document.body.classList.add('single-viewer');
        // Esperar un poco para asegurar que el DOM esté listo
        setTimeout(() => {
            if (typeof initializeViewer === 'function') {
                initializeViewer();
            }
        }, 100);
    } else if (currentPath.includes('pid.html')) {
        console.log('Inicializando página del visor P&ID...');
        document.body.classList.add('single-viewer');
        // Esperar un poco para asegurar que el DOM esté listo
        setTimeout(() => {
            if (typeof initializePIDViewer === 'function') {
                initializePIDViewer();
            }
        }, 100);
    }
}

// Event listeners
document.addEventListener('DOMContentLoaded', initializePage);

// Limpiar viewers al salir de la página
window.addEventListener('beforeunload', function() {
    if (typeof cleanupViewers === 'function') {
        cleanupViewers();
    }
});

// Exponer funciones globalmente para uso en HTML
window.loadModels = loadModels;
window.openModel = openModel;
window.openDualModel = openDualModel;
window.detectModelType = detectModelType;
window.initializePage = initializePage;
// Event listeners
document.addEventListener('DOMContentLoaded', initializePage);

// Exponer funciones globalmente para uso en HTML
window.loadModels = loadModels;
window.openModel = openModel;
window.detectModelType = detectModelType;
window.showMessage = showMessage;
window.showConfirmDialog = showConfirmDialog;
window.clearNotification = clearNotification;
window.formatFileSize = formatFileSize;