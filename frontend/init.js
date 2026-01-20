// ======================
// === INITIALIZATION ===
// ======================

document.addEventListener('DOMContentLoaded', function () {
    initializeCytoscape();
    initializeNodeHtmlLabel();

    registerCytoscapeEventListeners();
    registerInterfaceEventListeners();

    initializeInterface();
    showSemanticGroupExtBased();
});
