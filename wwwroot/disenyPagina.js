
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
