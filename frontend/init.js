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
    /*
        const btnSaveLabelings = document.getElementById('save-labelings-btn');
        if (btnSaveLabelings) {
            btnSaveLabelings.addEventListener('click', saveLabelings);
        }
    
        const btnSaveFiltered = document.getElementById('save-filtered-labelings-btn');
        if (btnSaveFiltered) {
            btnSaveFiltered.addEventListener('click', saveFilteredLabelings);
        }
    */
});
