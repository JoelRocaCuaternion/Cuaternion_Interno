
//Select2
$(document).ready(function() {
    // Inicializar Select2
    $('#palabras-select').select2({
        placeholder: "Buscar palabra...",
        allowClear: true,
        language: {
            noResults: function() {
                return "No se encontraron resultados";
            },
            searching: function() {
                return "Buscando...";
            }
        }
    });
    
    // Manejar cambios
    $('#palabras-select').on('change', function() {
        var valorSeleccionado = $(this).val();
        console.log('Seleccionado:', valorSeleccionado);
    });
});

// Desplegables
let sidebarVisible = true;
let panelPVisible = false;
let panelAVisible = false;

function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const sidebarToggle = document.getElementById('sidebarToggle');
    const sidebarToggleIcon = document.getElementById('sidebarToggleIcon');
    const panelP = document.getElementById('collapsiblePanelP');
    const panelA = document.getElementById('collapsiblePanelA');
    const floatingTabs = document.getElementById('floatingTabs');
    
    sidebarVisible = !sidebarVisible;
    
    if (sidebarVisible) {
        sidebar.classList.remove('collapsed');
        sidebarToggle.classList.add('sidebar-visible');
        sidebarToggleIcon.className = 'bx bx-chevron-left';
        panelP.classList.remove('sidebar-hidden');
        panelA.classList.remove('sidebar-hidden');
        floatingTabs.classList.remove('sidebar-hidden');
    } else {
        sidebar.classList.add('collapsed');
        sidebarToggle.classList.remove('sidebar-visible');
        sidebarToggleIcon.className = 'bx bx-chevron-right';
        panelP.classList.add('sidebar-hidden');
        panelA.classList.add('sidebar-hidden');
        floatingTabs.classList.add('sidebar-hidden');
    }
}

function togglePanelP() {
    const panelP = document.getElementById('collapsiblePanelP');
    const iconP = document.getElementById('toggleIconP');
    const floatingTabs = document.getElementById('floatingTabs');
    
    panelPVisible = !panelPVisible;
    
    if (panelPVisible) {
        panelP.classList.add('show');
        iconP.className = 'bx bx-chevron-up';
        floatingTabs.classList.add('hidden');
    } else {
        panelP.classList.remove('show');
        iconP.className = 'bx bx-chevron-down';
        if (!panelAVisible) {
            floatingTabs.classList.remove('hidden');
        }
    }
}

function togglePanelA() {
    const panelA = document.getElementById('collapsiblePanelA');
    const iconA = document.getElementById('toggleIconA');
    const floatingTabs = document.getElementById('floatingTabs');
    
    panelAVisible = !panelAVisible;
    
    if (panelAVisible) {
        panelA.classList.add('show');
        iconA.className = 'bx bx-chevron-up';
        floatingTabs.classList.add('hidden');
    } else {
        panelA.classList.remove('show');
        iconA.className = 'bx bx-chevron-down';
        if (!panelPVisible) {
            floatingTabs.classList.remove('hidden');
        }
    }
}

function showPanelP() {
    // Cerrar panel A si está abierto
    if (panelAVisible) {
        togglePanelA();
    }
    // Abrir panel P
    if (!panelPVisible) {
        togglePanelP();
    }
}

function showPanelA() {
    // Cerrar panel P si está abierto
    if (panelPVisible) {
        togglePanelP();
    }
    // Abrir panel A
    if (!panelAVisible) {
        togglePanelA();
    }
}

// Funcionalidad del menú lateral
document.querySelectorAll('.sidebar-item').forEach(item => {
    item.addEventListener('click', function(e) {
        const href = this.getAttribute('href');
        if (href === '#') {
            e.preventDefault();
        }

        document.querySelectorAll('.sidebar-item').forEach(i => i.classList.remove('active'));
        this.classList.add('active');
    });
});

// Cerrar overlay
document.getElementById('closeOverlay').addEventListener('click', function() {
    document.getElementById('overlay').style.display = 'none';
});


// SubMenú DUAL - Código corregido

// Esperar a que el DOM esté completamente cargado
document.addEventListener('DOMContentLoaded', function() {
    let isFullscreen3D = false;
    let isDualMenuOpen = false;
    let viewer3D = null; // Referencia al viewer 3D
    let viewer2D = null; // Referencia al viewer 2D

    // Elementos del DOM
    const dualMenuItem = document.getElementById('dualMenuItem');
    const dualSubmenu = document.getElementById('dualSubmenu');
    const toggleFullscreen3D = document.getElementById('toggleFullscreen3D');
    const toggleDualView = document.getElementById('toggleDualView');
    const viewerContainer = document.getElementById('viewerContainer');

    // Verificar que los elementos existen
    if (!dualMenuItem || !dualSubmenu || !toggleFullscreen3D || !toggleDualView) {
        console.error('Algunos elementos del DOM no se encontraron');
        return;
    }

    // Toggle submenu
    dualMenuItem.addEventListener('click', function(e) {
        e.preventDefault();
        isDualMenuOpen = !isDualMenuOpen;
        
        if (isDualMenuOpen) {
            dualMenuItem.classList.add('open');
            dualSubmenu.classList.add('open');
        } else {
            dualMenuItem.classList.remove('open');
            dualSubmenu.classList.remove('open');
        }
    });

    // Función para redimensionar correctamente los viewers
    function resizeViewers() {
        // Esperar a que las transiciones CSS terminen
        setTimeout(() => {
            if (viewer3D && viewer3D.resize) {
                viewer3D.resize();
                // Forzar un refresh de la calidad
                if (viewer3D.impl) {
                    viewer3D.impl.invalidate(true, true, true);
                }
            }
            if (viewer2D && viewer2D.resize) {
                viewer2D.resize();
                if (viewer2D.impl) {
                    viewer2D.impl.invalidate(true, true, true);
                }
            }
        }, 350); // Coincidir con la duración de la transición CSS
    }

    // Toggle fullscreen 3D mejorado
    toggleFullscreen3D.addEventListener('click', function(e) {
        e.preventDefault();
        isFullscreen3D = true;
        if (viewerContainer) {
            viewerContainer.classList.add('fullscreen-3d');
        }
        
        // Redimensionar después de la transición
        resizeViewers();
        
        // Update submenu text
        toggleFullscreen3D.style.display = 'none';
        toggleDualView.style.display = 'flex';
        
        // Update active states
        toggleFullscreen3D.classList.remove('active');
        toggleDualView.classList.add('active');
    });

    // Toggle dual view mejorado
    toggleDualView.addEventListener('click', function(e) {
        e.preventDefault();
        isFullscreen3D = false;
        if (viewerContainer) {
            viewerContainer.classList.remove('fullscreen-3d');
        }
        
        // Redimensionar después de la transición
        resizeViewers();
        
        // Update submenu text
        toggleDualView.style.display = 'none';
        toggleFullscreen3D.style.display = 'flex';
        
        // Update active states
        toggleDualView.classList.remove('active');
        toggleFullscreen3D.classList.add('active');
    });

    // Initialize - show only the first option
    toggleDualView.style.display = 'none';

    // Close submenu when clicking outside
    document.addEventListener('click', function(e) {
        if (!dualMenuItem.contains(e.target) && !dualSubmenu.contains(e.target)) {
            isDualMenuOpen = false;
            dualMenuItem.classList.remove('open');
            dualSubmenu.classList.remove('open');
        }
    });

    // Prevent submenu from closing when clicking inside
    dualSubmenu.addEventListener('click', function(e) {
        e.stopPropagation();
    });

    // Función para establecer las referencias de los viewers
    // Llama esta función después de inicializar tus viewers
    function setViewerReferences(viewer3DRef, viewer2DRef) {
        viewer3D = viewer3DRef;
        viewer2D = viewer2DRef;
        
        // Mejorar la calidad de ambos viewers si existen
        if (viewer3D) {
            improveViewerQuality(viewer3D);
        }
        if (viewer2D) {
            improveViewerQuality(viewer2D);
        }
    }

    // Listener para redimensionar cuando cambie el tamaño de ventana
    window.addEventListener('resize', function() {
        resizeViewers();
    });

    // Función adicional para mejorar la calidad del renderizado
    function improveViewerQuality(viewer) {
        if (viewer && viewer.impl) {
            try {
                // Configurar mejor calidad de renderizado
                viewer.impl.setQualityLevel(true, true); // Activar antialiasing
                viewer.impl.setGhosting(false); // Desactivar ghosting
                viewer.impl.setOptimizeNavigation(false); // Desactivar optimización de navegación
                
                // Configurar mejor resolución
                const canvas = viewer.impl.canvas;
                if (canvas) {
                    const rect = canvas.getBoundingClientRect();
                    const dpr = window.devicePixelRatio || 1;
                    
                    canvas.width = rect.width * dpr;
                    canvas.height = rect.height * dpr;
                    
                    const ctx = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
                    if (ctx) {
                        ctx.viewport(0, 0, canvas.width, canvas.height);
                    }
                }
            } catch (error) {
                console.error('Error mejorando calidad del viewer:', error);
            }
        }
    }

    // Exponer funciones globalmente
    window.setViewerReferences = setViewerReferences;
    window.improveViewerQuality = improveViewerQuality;
});