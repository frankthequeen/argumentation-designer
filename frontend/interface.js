// =================
// === INTERFACE ===
// =================

// Resets UI fields, Semantic controls, and local state to default values
// Does NOT touch the underlying Cytoscape graph
function initializeInterface() {
    window.nodeCreationContext = null;
    window.nodeEditContext = null;
    window.edgeCreationContext = null;
    window.edgeEditContext = null;
    window.nodeToEdit = null;
    window.edgeToEdit = null;

    document.getElementById("project-name").value = "";
    document.getElementById("desc-area").value = "";
    document.getElementById("layout-select").value = "cose";
    document.getElementById("labelings-area").innerHTML = "";
    document.getElementById('computed-labelings').style.display = 'none';
    document.getElementById("constraints-area").value = "";
    /* TODO: to add Preferences in labelings filters -> uncomment this, then upgrade filterLabelingsFromAPI() in apicall.js
    document.getElementById("preferences-area").value = "";
    */
    document.getElementById("filtered-labelings-area").innerHTML = "";
    document.getElementById('filtered-labelings').style.display = 'none';
    document.getElementById("strength-area").value = "";
    document.getElementById('computed-strength').style.display = 'none';

    const semanticExtSelect = document.getElementById("semantic-group-ext-select");
    if (semanticExtSelect) semanticExtSelect.value = "grounded";
    const semanticGradualSelect = document.getElementById("semantic-gradual-select");
    if (semanticGradualSelect) semanticGradualSelect.value = "drl";
    const semanticGradualEpsilon = document.getElementById("semantic-gradual-epsilon");
    if (semanticGradualEpsilon) semanticGradualEpsilon.value = "0.01";
    const semanticGradualParams = document.getElementById("semantic-gradual-params");
    if (semanticGradualParams) semanticGradualParams.value = "sum";
    const semanticGradualGamma = document.getElementById("semantic-gradual-gamma");
    if (semanticGradualGamma) semanticGradualGamma.value = "0.5";

    updateSemanticGradualControls();
    checkGraphEmptyState();
    //    initEdgeIdCounterFromGraph();
}

// Clears the Cytoscape graph and then reinitializes all UI state
function resetAppState() {
    // Used after import or for full application reset
    clearCytoscapeGraph();
    initializeInterface();
}

/**
 * Show/hide spinner into primary buttons
 */
function setButtonLoading(btnId, isLoading) {
    const btn = document.getElementById(btnId);
    const spinner = document.getElementById(btnId + '-spinner');
    if (!btn || !spinner) return;

    if (isLoading) {
        btn.disabled = true;
        spinner.style.display = 'inline-block';
    } else {
        btn.disabled = false;
        spinner.style.display = 'none';
    }
}



// ======================================
// === SEMANTIC GROUPS (UI SWITCHER)  ===
// ======================================

// Shows the extension‑based (AF/BAF) controls and hides the gradual ones
function showSemanticGroupExtBased(label = "AF") {
    document.getElementById("semantic-group-ext-based").style.display = "";
    document.getElementById("semantic-group-gradual").style.display = "none";
    document.getElementById("semantic-title-ext-based").textContent = label;
}

// Shows the gradual semantics (QBAF/WAF) controls and hides the ext‑based ones
function showSemanticGroupGradual(label = "QBAF") {
    // Unselects rows in labelings-area and filtered-labelings-area
    document.querySelectorAll('#labelings-area input, #filtered-labelings-area input')
        .forEach(cb => cb.checked = false);

    document.getElementById("semantic-group-ext-based").style.display = "none";
    document.getElementById("semantic-group-gradual").style.display = "";
    document.getElementById("semantic-title-gradual").textContent = label;
}

// Chooses which semantic group (ext‑based vs gradual) to display based on:
// - presence of support edges
// - presence of node weights
// - presence of edge weights
// and updates the section title accordingly (AF, BAF, QBAF, WAF)
function updateSemanticGroupView() {
    const hasSupportEdges = cy.edges().some(edge => edge.data('type') === 'support');
    const hasNodeWeights = cy.nodes().some(node => {
        const w = node.data('weight');
        return w !== null && w !== undefined && w !== "" && !isNaN(w);
    });
    const hasEdgeWeights = cy.edges().some(edge => {
        const w = edge.data('weight');
        return w !== null && w !== undefined && w !== "" && !isNaN(w);
    });

    let semanticToShow = "";
    let labelToShow = "";

    if (!hasSupportEdges && !hasNodeWeights && !hasEdgeWeights) {
        semanticToShow = "ext-based";
        labelToShow = "AF";
    } else if (hasSupportEdges && !hasNodeWeights && !hasEdgeWeights) {
        semanticToShow = "ext-based";
        labelToShow = "BAF";
    } else if (!hasSupportEdges && !hasNodeWeights && hasEdgeWeights) {
        semanticToShow = "ext-based";
        labelToShow = "WAF";
    } else if (hasSupportEdges && !hasNodeWeights && hasEdgeWeights) {
        semanticToShow = "ext-based";
        labelToShow = "WBAF";
    } else if (hasNodeWeights && !hasEdgeWeights) {
        semanticToShow = "gradual";
        labelToShow = "QBAF";
    } else if (hasEdgeWeights && hasEdgeWeights) {
        semanticToShow = "gradual";
        labelToShow = "WQBAF";
    }

    // Checks the currently visible Semantic
    const extBasedVisible = document.getElementById("semantic-group-ext-based").style.display !== "none";
    const gradualVisible = document.getElementById("semantic-group-gradual").style.display !== "none";

    let currentSemantic = "";
    if (extBasedVisible) currentSemantic = "ext-based";
    if (gradualVisible) currentSemantic = "gradual";

    if (currentSemantic !== semanticToShow) {
        // Shows other Semantic if is'n visible yet
        if (semanticToShow === "ext-based") showSemanticGroupExtBased(labelToShow);
        else if (semanticToShow === "gradual") showSemanticGroupGradual(labelToShow);
    } else {
        // If the Semantic is already visible, just updates labels
        if (semanticToShow === "ext-based") document.getElementById("semantic-title-ext-based").textContent = labelToShow;
        else if (semanticToShow === "gradual") document.getElementById("semantic-title-gradual").textContent = labelToShow;
    }
}

// Enables/disables the Params and Gamma controls depending on the selected
// gradual semantics (e.g. some semantics do not use gamma or params)
function updateSemanticGradualControls() {
    const semanticSelect = document.getElementById('semantic-gradual-select');
    const paramsSelect = document.getElementById('semantic-gradual-params');
    const gammaInput = document.getElementById('semantic-gradual-gamma');

    if (!semanticSelect || !paramsSelect || !gammaInput) return;

    const selectedSemantic = semanticSelect.value;

    const gammaDisabled = ['eul', 'dfq', 'qen', 'mlp'].includes(selectedSemantic);
    gammaInput.disabled = gammaDisabled;
    gammaInput.classList.toggle('disabled-control', gammaDisabled);

    const paramsDisabled = ['eul', 'dfq', 'mlp'].includes(selectedSemantic);
    paramsSelect.disabled = paramsDisabled;
    paramsSelect.classList.toggle('disabled-control', paramsDisabled);
}



// ====================
// === KEYBOARD I/O ===
// ====================

// Global keyboard shortcuts
function manageKeydown(e) {
    // ESC: closes any open node/edge modal
    if (e.key === 'Escape') {
        window.closeNodeModal();
        window.closeEdgeModal();
    }
    // ENTER: confirms node modal if it is currently visible
    if (e.key === 'Enter' && document.getElementById('node-modal-bg').style.display === 'flex') {
        document.getElementById('node-modal-confirm').click();
    }
    // ENTER: confirms edge modal if it is currently visible
    if (e.key === 'Enter' && document.getElementById('edge-modal-bg').style.display === 'flex') {
        document.getElementById('edge-modal-confirm').click();
    }
}



// ==================
// === NODE MODAL ===
// ==================

// Opens the node modal either in "create" mode (using click position)
// or "edit" mode (using existing node data)
window.openNodeModal = function (pos, node) {
    document.getElementById('node-modal-bg').style.display = 'flex';
    document.getElementById('node-error').innerText = "";
    document.getElementById('node-error').style.display = 'none';
    document.getElementById('node-argument').classList.remove('error-state');

    if (node) {
        document.getElementById('node-argument').value = node.id() || "";
        document.getElementById('node-weight').value = node.data('weight') != null ? node.data('weight') : "";
        document.getElementById('node-description').value = node.data('description') || "";
        window.nodeToEdit = node;
    } else {
        document.getElementById('node-argument').value = "";
        document.getElementById('node-weight').value = "";
        document.getElementById('node-description').value = "";
        window.newNodePosition = pos;
        window.nodeToEdit = null;
    }

    // Focus on Argument field
    document.getElementById('node-argument').focus();
};

// Hides the node modal and clears modal-specific state.
window.closeNodeModal = function () {
    document.getElementById('node-modal-bg').style.display = 'none';
    window.newNodePosition = null;
    window.nodeToEdit = null;
};

// Performs all client-side checks before creating/updating a node:
// - argument name presence, length, allowed chars
// - weight numeric range (if provided)
// - description length and allowed chars
function validateNodeModal(argument, weight, description) {
    document.getElementById('node-error').innerText = "";
    document.getElementById('node-error').style.display = 'none';
    document.getElementById('node-argument').classList.remove('error-state');
    document.getElementById('node-weight').classList.remove('error-state');
    document.getElementById('node-description').classList.remove('error-state');

    if (!argument || argument.trim() === "") {
        return {
            valid: false,
            error: ERR_NODE_EMPTY_ARGUMENT,
            field: 'node-argument'
        };
    }

    if (argument.length > MAX_NODE_ARGUMENT_LENGTH) {
        return {
            valid: false,
            error: ERR_NODE_LONG_ARGUMENT,
            field: 'node-argument'
        };
    }

    if (!VALID_ARGUMENT_REGEX.test(argument)) {
        return {
            valid: false,
            error: ERR_NODE_INVALID_ARGUMENT_CHARS,
            field: 'node-argument'
        };
    }

    if (weight !== null && weight !== undefined && weight !== "") {
        const w = parseFloat(weight);
        if (isNaN(w) || w < MIN_NODE_WEIGHT || w > MAX_NODE_WEIGHT) {
            return {
                valid: false,
                error: ERR_NODE_WEIGHT_RANGE,
                field: 'node-weight'
            };
        }
    }

    if (description && description.trim() !== "") {
        if (description.length > MAX_NODE_DESCRIPTION_LENGTH) {
            return {
                valid: false,
                error: ERR_NODE_LONG_DESCRIPTION,
                field: 'node-description'
            };
        }

        if (!VALID_DESCRIPTION_REGEX.test(description)) {
            return {
                valid: false,
                error: ERR_NODE_DESCRIPTION_INVALID_CHARS,
                field: 'node-description'
            };
        }
    }

    return { valid: true, error: "" };
}

// Displays an error message in the node modal and optionally highlights the invalid field
function showNodeModalError(errorMessage, fieldId = null) {
    document.getElementById('node-error').innerText = errorMessage;
    document.getElementById('node-error').style.display = '';

    // Highlight field
    if (fieldId) {
        document.getElementById(fieldId).classList.add('error-state');
    }
}

window.nodeModalCallback = function (argument, weight, description) {
    // Parse weight
    const weightValue = weight && weight !== "" ? parseFloat(weight) : null;

    // Basic validation
    const validation = validateNodeModal(argument, weight, description);
    if (!validation.valid) {
        showNodeModalError(validation.error, validation.field);
        return;
    }

    // Canonical ID: lowercase for case-insensitive comparison
    const newId = argument.toLowerCase();

    // Node creation
    if (window.nodeCreationContext) {
        // Check duplicates with canonical ID
        if (cy.getElementById(newId).length > 0) {
            showNodeModalError(ERR_NODE_DUPLICATE, "node-argument");
            return;
        }

        cy.add({
            group: "nodes",
            data: {
                id: newId,
                weight: weightValue,
                description: description
            },
            position: window.nodeCreationContext.position
        });

        window.nodeCreationContext = null;
        window.closeNodeModal();
        return;
    }

    // Node editing
    if (window.nodeEditContext) {
        const oldNode = window.nodeEditContext.node;
        const oldId = oldNode.id();

        // ID duplicate
        const existingNode = cy.getElementById(newId);
        if (existingNode.length > 0 && existingNode.id() !== oldId) {
            showNodeModalError(ERR_NODE_DUPLICATE, "node-argument");
            return;
        }

        // ID unchanged
        if (oldId === newId) {
            oldNode.data("weight", weightValue);
            oldNode.data("description", description);
            window.nodeEditContext = null;
            window.closeNodeModal();
            return;
        }

        // ID changed
        const position = oldNode.position();

        const newNode = cy.add({
            group: "nodes",
            data: {
                ...oldNode.data(),
                id: newId,
                weight: weightValue,
                description: description
            },
            position: { x: position.x, y: position.y }
        });

        oldNode.connectedEdges().forEach(edge => {
            const oldSource = edge.data("source");
            const oldTarget = edge.data("target");

            if (oldSource === oldId) {
                edge.data("source", newId);
                edge.move({ source: newId });
            }
            if (oldTarget === oldId) {
                edge.data("target", newId);
                edge.move({ target: newId });
            }
        });

        oldNode.remove();
        newNode.select();

        window.nodeEditContext = null;
        window.closeNodeModal();
    }
};

// Collects values from the node modal and delegates to nodeModalCallback
function confirmNodeModal() {
    const argument = document.getElementById('node-argument').value.trim();
    const weight = document.getElementById('node-weight').value.trim();
    const description = document.getElementById('node-description').value.trim();
    window.nodeModalCallback(argument, weight, description);
}

// Aborts creation/edit of a node and closes the modal
function cancelNodeModal() {
    window.nodeEditContext = null;
    window.nodeCreationContext = null;
    window.closeNodeModal();
}


// ==================
// === EDGE MODAL ===
// ==================

// Opens the edge modal either for a new edge (default type = attack)
// or for editing an existing edge (pre-fills type and weight)
window.openEdgeModal = function (edge) {
    document.getElementById('edge-modal-bg').style.display = 'flex';
    document.getElementById('edge-error').innerText = "";
    document.getElementById('edge-error').style.display = 'none';
    /* TODO: to add weight to Edges -> uncomment this
    document.getElementById('edge-weight').classList.remove('error-state');
    */

    if (edge) {
        const type = edge.data('type') || "support";
        document.getElementById('edge-type-attack').checked = (type === "attack");
        document.getElementById('edge-type-support').checked = (type === "support");
        /* TODO: to add weight to Edges -> uncomment this
        document.getElementById('edge-weight').value = edge.data('weight') != null ? edge.data('weight') : "";
        */
        window.edgeToEdit = edge;
    } else {
        document.getElementById('edge-type-attack').checked = true;
        document.getElementById('edge-type-support').checked = false;
        /* TODO: to add weight to Edges -> uncomment this
        document.getElementById('edge-weight').value = "";
        */
        window.edgeToEdit = null;
    }

    // Focus on Type field
    document.getElementById('edge-type-attack').focus();
};

// Hides the edge modal and clears modal-specific state
window.closeEdgeModal = function () {
    document.getElementById('edge-modal-bg').style.display = 'none';
    window.edgeToEdit = null;
};

// Validates edge type (attack/support must be selected) and weight range
function validateEdgeModal(type, weight) {
    document.getElementById('edge-error').innerText = "";
    document.getElementById('edge-error').style.display = 'none';
    /* TODO: to add weight to Edges -> uncomment this
    document.getElementById('edge-weight').classList.remove('error-state');
    */

    if (!type || (type !== 'attack' && type !== 'support')) {
        return {
            valid: false,
            error: ERR_EDGE_EMPTY_TYPE,
            field: null
        };
    }

    if (weight !== null && weight !== undefined && weight !== "") {
        const w = parseFloat(weight);
        if (isNaN(w) || w < MIN_EDGE_WEIGHT || w > MAX_EDGE_WEIGHT) {
            return {
                valid: false,
                error: ERR_EDGE_WEIGHT_RANGE,
                field: 'edge-weight'
            };
        }
    }

    return { valid: true, error: "" };
}

// Displays an error message in the edge modal and optionally highlights the invalid field
function showEdgeModalError(errorMessage, fieldId = null) {
    document.getElementById('edge-error').innerText = errorMessage;
    document.getElementById('edge-error').style.display = '';

    // Highlight field
    if (fieldId) {
        document.getElementById(fieldId).classList.add('error-state');
    }
}

window.edgeModalCallback = function (type, weight) {
    // Parsing weight
    const weightValue = weight && weight !== "" ? parseFloat(weight) : null;

    // Basic validation
    const validation = validateEdgeModal(type, weight);
    if (!validation.valid) {
        showEdgeModalError(validation.error, validation.field);
        return;
    }

    // Edge creation
    if (window.edgeCreationContext) {
        const sourceNode = window.edgeCreationContext.sourceNode;
        const targetNode = window.edgeCreationContext.targetNode;

        // Check duplicate
        const duplicate = cy.edges().some(edge => {
            return (
                edge.data("source") === sourceNode.id() &&
                edge.data("target") === targetNode.id() &&
                edge.data("type") === type
            );
        });
        if (duplicate) {
            showEdgeModalError(ERR_EDGE_DUPLICATE);
            return;
        }

        const edgeId = generateEdgeId();

        cy.add({
            group: "edges",
            data: {
                id: edgeId,
                source: sourceNode.id(),
                target: targetNode.id(),
                type: type,
                weight: weightValue
            }
        });

        window.edgeCreationContext = null;
        resetEdgeMode();
        window.closeEdgeModal();
        return;
    }

    // Edge editing
    if (window.edgeEditContext) {
        const edge = window.edgeEditContext.edge;
        const sourceId = edge.data("source");
        const targetId = edge.data("target");

        // Edge duplicate
        const duplicate = cy
            .edges()
            .some(other => {
                return (
                    other.id() !== edge.id() &&
                    other.data("source") === sourceId &&
                    other.data("target") === targetId &&
                    other.data("type") === type
                );
            });

        if (duplicate) {
            showEdgeModalError(ERR_EDGE_DUPLICATE);
            return;
        }

        edge.data("type", type);
        edge.data("weight", weightValue);

        window.edgeEditContext = null;
        window.closeEdgeModal();
    }
};

// Collects values from the edge modal and delegates to edgeModalCallback
function confirmEdgeModal() {
    const type = document.querySelector('input[name="edge-type"]:checked').value;
    /* TODO: to add weight to Edges -> uncomment this and remove duplicate edgeModalCallback below
    const weight = document.getElementById('edge-weight').value.trim();
    window.edgeModalCallback(type, weight);
    */
    window.edgeModalCallback(type, null);
}

// Aborts creation/edit of an edge and closes the modal
function cancelEdgeModal() {
    window.edgeEditContext = null;
    window.edgeCreationContext = null;
    window.closeEdgeModal();
}



// ===========================================
// === INTERFACE EVENT BINDING (LISTENERS) ===
// ===========================================
function registerInterfaceEventListeners() {
    // window resize (preview canvas resize)
    window.addEventListener('resize', () => { resizePreviewCanvas(); });

    // global click (closing context menus)
    document.addEventListener('click', () => { hideAllContextMenus(); });

    // description textarea focus/blur (isEditingDescription flag)
    document.getElementById('desc-area').addEventListener('focus', () => { isEditingDescription = true; });
    document.getElementById('desc-area').addEventListener('blur', () => { isEditingDescription = false; });

    // node/edge modal buttons (confirm/cancel)
    document.getElementById('node-modal-confirm').addEventListener('click', () => { confirmNodeModal(); });
    document.getElementById('node-modal-cancel').addEventListener('click', () => { cancelNodeModal(); });
    document.getElementById('node-modal-cancel-x').addEventListener('click', () => { cancelNodeModal(); });
    document.getElementById('edge-modal-confirm').addEventListener('click', () => { confirmEdgeModal(); });
    document.getElementById('edge-modal-cancel').addEventListener('click', () => { cancelEdgeModal(); });
    document.getElementById('edge-modal-cancel-x').addEventListener('click', () => { cancelEdgeModal(); });
    document.addEventListener('keydown', (e) => { manageKeydown(e); });
    document.getElementById('node-modal-bg').addEventListener('click', (e) => {
        if (e.target === this) { window.closeNodeModal(); }
    });
    document.getElementById('edge-modal-bg').addEventListener('click', (e) => {
        if (e.target === this) { window.closeEdgeModal(); }
    });

    // context menu actions (edit/delete for node/edge)
    document.getElementById('ctx-edit').addEventListener('click', () => {
        if (window.nodeContextCallback) { window.nodeContextCallback('edit'); }
        document.getElementById('node-context-menu').style.display = 'none';
    });
    document.getElementById('ctx-delete').addEventListener('click', () => {
        if (window.nodeContextCallback) { window.nodeContextCallback('delete'); }
        document.getElementById('node-context-menu').style.display = 'none';
    });
    document.getElementById('node-context-menu').addEventListener('contextmenu', (e) => { e.preventDefault(); });
    document.getElementById('edge-ctx-edit').addEventListener('click', () => {
        if (window.edgeContextCallback) { window.edgeContextCallback('edit'); }
        document.getElementById('edge-context-menu').style.display = 'none';
    });
    document.getElementById('edge-ctx-delete').addEventListener('click', () => {
        if (window.edgeContextCallback) { window.edgeContextCallback('delete'); }
        document.getElementById('edge-context-menu').style.display = 'none';
    });
    document.getElementById('edge-context-menu').addEventListener('contextmenu', (e) => { e.preventDefault(); });

    // project name input (auto-fill description if empty)
    document.getElementById('project-name').addEventListener('input', function () {
        if (document.getElementById('desc-area').value.trim() === "") {
            document.getElementById('desc-area').value = document.getElementById('project-name').value;
        }
    });

    // toolbar buttons: refresh/import/export/save/filter/compute semantics
    document.getElementById('clean-btn').addEventListener('click', () => { resetAppState(); });
    document.getElementById('import-btn').addEventListener('click', () => { importGraph(); });
    document.getElementById('export-btn').addEventListener('click', () => { exportGraph(); });
    document.getElementById('refresh-btn').addEventListener('click', () => { updateGraphFromDescription(); });
    document.getElementById('save-labelings-btn').addEventListener('click', () => { saveLabelings(); });
    document.getElementById('save-filtered-labelings-btn').addEventListener('click', () => { saveFilteredLabelings(); });
    document.getElementById('save-strength-btn').addEventListener('click', () => { saveStrength(); });

    // file input change (fallback import)
    document.getElementById('desc-file-input').addEventListener('change', (e) => { importGraphFallback(e); });

    // semantic-select changes (gradual controls enable/disable)
    document.getElementById('semantic-gradual-select').addEventListener('change', () => { updateSemanticGradualControls(); });

    // semantic-select changes (gradual controls enable/disable)
    document.querySelectorAll('.bookmark-check').forEach(checkbox => {
		checkbox.addEventListener('click', function() {
			if (this.checked) {
				document.querySelectorAll(`input[name="${this.name}"]`).forEach(cb => {
					if (cb !== this) cb.checked = false;
				});
			}
		});
	});

    // API calls
    document.getElementById('compute-semantic-group-ext-btn').addEventListener('click', () => { computeLabelingsFromAPI(); });
    document.getElementById('filter-btn').addEventListener('click', () => { filterLabelingsFromAPI(); });
    document.getElementById('compute-semantic-gradual-btn').addEventListener('click', () => { computeStrengthFromAPI(); });
}
