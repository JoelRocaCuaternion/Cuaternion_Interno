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
        showMessage('Cargando modelos desde Autodesk Forge...', 'info');
        
        const response = await fetch('/api/models');
        
        if (!response.ok) {
            throw new Error(`Error HTTP: ${response.status} - ${response.statusText}`);
        }
        
        const models = await response.json();
        
        clearNotification();
        
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
            const size = model.size || 0;
            const incidents = model.incidents || 0;
            const budget = model.budget || 0;
            const nextAction = model.nextAction || '';
            
            row.innerHTML = `
                <td>${modelName}</td>
                <td>${fileName}</td>
                <td>${formatFileSize(size)}</td>
                <td>${incidents}</td>
                <td>${budget.toFixed(2)} €</td>
                <td>${nextAction}</td>
                <td>
                    <button class="action-btn" onclick="openModel('${model.urn}', '${model.name || fileName}')">
                        Abrir
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        });
        
        showMessage(`${models.length} modelos cargados correctamente desde Autodesk Forge`, 'success', 3000);
        
    } catch (error) {
        console.error('Error cargando modelos:', error);
        showMessage('Error al cargar los modelos desde Autodesk Forge: ' + error.message, 'error');
        
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
        showMessage('URN del modelo no válido', 'error');
        return;
    }
    
    console.log('Abriendo modelo:', { urn, fileName });
    
    // Usar el hash de la URL para pasar el URN
    window.location.href = `index.html#${urn}`;
}

// Función para inicializar el visor
async function initializeViewer() {
    // Verificar si estamos en la página del visor
    if (!window.location.pathname.includes('index.html') && window.location.pathname !== '/') {
        return;
    }

    const previewContainer = document.getElementById('preview') || document.getElementById('viewerContainer');
    if (!previewContainer) {
        console.error('Contenedor de preview no encontrado');
        return;
    }

    try {
        console.log('Inicializando visor...');
        const viewer = await initViewer(previewContainer);
        const urn = window.location.hash?.substring(1);
        
        if (!urn) {
            console.log('No hay URN en la URL, cargando modelo predeterminado...');
            // Cargar modelo predeterminado
            await loadDefaultModel();
        } else {
            console.log('URN encontrada en URL:', urn);
            // Cargar modelo específico
            await loadModel(urn);
        }
        
    } catch (error) {
        console.error('Error inicializando visor:', error);
        showMessage('Error al inicializar el visor: ' + error.message, 'error');
    }
}

// Función de inicialización cuando se carga la página
function initializePage() {
    const currentPath = window.location.pathname;
    
    console.log('Inicializando página:', currentPath);
    
    if (currentPath.includes('models.html')) {
        console.log('Inicializando página de modelos...');
        loadModels();
    } else if (currentPath.includes('index.html') || currentPath === '/') {
        console.log('Inicializando página del visor...');
        initializeViewer();
    }
}

// Event listeners
document.addEventListener('DOMContentLoaded', initializePage);

// Exponer funciones globalmente para uso en HTML
window.loadModels = loadModels;
window.openModel = openModel;
window.showMessage = showMessage;
window.showConfirmDialog = showConfirmDialog;
window.clearNotification = clearNotification;
window.formatFileSize = formatFileSize;