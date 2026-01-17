// =================
// === CYTOSCAPE ===
// =================

// Core Cytoscape initialization:: creates the graph instance, base styles, default layout
function initializeCytoscape() {
    cy = cytoscape({
        container: document.getElementById('cy'),
        elements: [],
        style: [
            {
                selector: 'node',
                style: {
                    'background-color': NODE_COLOR_DEFAULT,
                    'width': 50,
                    'height': 50,
                    'border-width': 2,
                    'border-color': NODE_BORDER_COLOR_DEFAULT,
                    // Note: no built‑in Cytoscape text label is used for nodes.
                    //       Node labels are fully rendered via the HTML label plugin.
                    'color': '#fff'
                }
            },
            {
                selector: 'edge[type="attack"]',
                style: {
                    'line-color': EDGE_ATTACK_COLOR,
                    'target-arrow-color': EDGE_ATTACK_COLOR,
                    'target-arrow-shape': 'triangle',
                    'width': 3,
                    'line-style': 'solid',
                    'curve-style': 'bezier'
                }
            },
            {
                selector: 'edge[type="support"]',
                style: {
                    'line-color': EDGE_SUPPORT_COLOR,
                    'target-arrow-color': EDGE_SUPPORT_COLOR,
                    'target-arrow-shape': 'triangle-tee',
                    'width': 3,
                    'line-style': 'dotted',
                    'curve-style': 'bezier'
                }
            },
            {
                selector: 'edge',
                style: {
                    'label': function (ele) {
                        const weight = ele.data('weight');
                        return (weight !== null && weight !== undefined) ? weight : '';
                    },
                    'font-size': 10,
                    'font-weight': 400,
                    'color': '#333',
                    'text-background-color': '#fff',
                    'text-background-padding': 3,
                    'text-background-shape': 'roundrectangle',
                    'text-background-opacity': 0.8,
                    'text-margin-x': -3,
                    'text-margin-y': -3,
                    'edge-text-rotation': 'autorotate'
                }
            }
        ],
        layout: { name: 'cose' }
    });
}

// Cytoscape node HTML labels initialization: overlays HTML labels for node name/strength/weight
function initializeNodeHtmlLabel() {
    if (htmlLabel && typeof htmlLabel.destroy === "function") {
        try {
            htmlLabel.destroy();
        } catch (e) {
            console.warn("Error destroying htmlLabel:", e);
        }
    }

    // Sets up HTML-based labels for nodes:
    // - strength as a small floating value above the node
    // - name centered inside the node
    // - weight displayed below the name inside the node
    htmlLabel = cy.nodeHtmlLabel([
        {
            query: 'node',
            halign: 'center',
            valign: 'center',
            halignBox: 'center',
            valignBox: 'center',
            cssClass: 'node-html-label',
            tpl: function (data) {
                const name = data.id || '';
                const strength = (data.strength != null && data.strength !== '') ? data.strength : '';
                const weight = (data.weight != null && data.weight !== '') ? data.weight : '';

                return `<div class="node-label-wrapper">${strength !== '' ? `<div class="node-label-strength">${strength}</div>` : ''}<div class="node-label-name">${name}</div>${weight !== '' ? `<div class="node-label-weight">${weight}</div>` : ''}</div>`;
            }
        }
    ]);
}



// =====================
// === GRAPH HELPERS ===
// =====================
function clearCytoscapeGraph() {
    // Removes all nodes and edges, preserving current layout, zoom and styles.
    if (cy) {
        try {
            cy.edges().remove();
        } catch (e) {
            // due to a cytoscape-node-html-label library bug
            console.warn('Ignored error while updating edge:', e);
        }
        cy.nodes().remove();
    }
    EDGE_ID_COUNTER = 1;
}



// ==============================
// === NODE CREATION WORKFLOW ===
// ==============================

// Creates a new node when clicking on the background (if not in edge mode)
function createNode(e) {
    if (edgeModeActive && e.target === cy) {
        resetEdgeMode();
    } else if (!edgeModeActive && e.target === cy) {
        // Crea nuovo nodo
        window.nodeCreationContext = { position: e.position };
        window.openNodeModal(e.position, null);
    }
}



// ======================
// === PREVIEW CANVAS ===
// ======================
const previewCanvas = document.getElementById('cy-preview-canvas');

// Keeps the overlay canvas in sync with the Cytoscape container size
function resizePreviewCanvas() {
    var cyContainer = document.getElementById('cy-container');
    var previewCanvas = document.getElementById('cy-preview-canvas');
    if (!cyContainer || !previewCanvas) return;
    previewCanvas.width = cyContainer.offsetWidth;
    previewCanvas.height = cyContainer.offsetHeight;
}

// Renders and clears the temporary arrow used during edge creation
function drawPreviewLine(x0, y0, x1, y1) {
    const ctx = previewCanvas.getContext('2d');
    ctx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
    ctx.save();
    ctx.strokeStyle = '#ffb400';
    ctx.lineWidth = 4;
    ctx.setLineDash([6, 5]);
    ctx.globalAlpha = 0.7;
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.stroke();

    // Freccia
    const arrowLength = 16, arrowAngle = Math.PI / 7;
    const dx = x1 - x0, dy = y1 - y0, angle = Math.atan2(dy, dx);
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(
        x1 - arrowLength * Math.cos(angle - arrowAngle),
        y1 - arrowLength * Math.sin(angle - arrowAngle)
    );
    ctx.lineTo(
        x1 - arrowLength * Math.cos(angle + arrowAngle),
        y1 - arrowLength * Math.sin(angle + arrowAngle)
    );
    ctx.lineTo(x1, y1);
    ctx.closePath();
    ctx.fillStyle = '#ffb400';
    ctx.globalAlpha = 0.8;
    ctx.fill();
    ctx.restore();
}

function clearPreviewCanvas() {
    previewCanvas.getContext('2d').clearRect(0, 0, previewCanvas.width, previewCanvas.height);
}



// ==============================
// === EDGE CREATION WORKFLOW ===
// ==============================

// Stores callbacks used by the UI to finalize edge creation in the edge modal
function setupEdgeCreationCallback() {
    window.edgeCreationContext = {
        sourceNode: edgeSourceNode,
        targetNode: edgeTargetNode
    };
}

// Exits edge creation mode and clears visual preview state
function resetEdgeMode() {
    edgeModeActive = false;
    edgeSourceNode = null;
    edgeTargetNode = null;
    clearPreviewCanvas();
    document.body.style.cursor = '';
}

// Implements two-step edge creation by clicking on source and then target node.
function createEdge(e) {
    if (!edgeModeActive) {
        // Step 1: click su nodo sorgente
        edgeModeActive = true;
        edgeSourceNode = e.target;
        document.body.style.cursor = 'crosshair';
        clearPreviewCanvas();
    } else {
        // Step 2: click su nodo destinazione
        edgeTargetNode = e.target;
        // Configura callback per creazione arco (viene gestita in ui.js)
        setupEdgeCreationCallback();
        window.openEdgeModal(null);
    }
}



// =============================
// === CONTEXT MENU HANDLERS ===
// =============================

// Hides both node and edge context menus when clicking outside
function hideAllContextMenus() {
    document.getElementById('node-context-menu').style.display = 'none';
    document.getElementById('edge-context-menu').style.display = 'none';
}

// Opens the custom context menu at cursor position and wires edit/delete actions
function openNodeMenu(e) {
    e.preventDefault();
    hideAllContextMenus();
    const node = e.target;
    const menu = document.getElementById('node-context-menu');
    menu.style.left = e.originalEvent.pageX + 'px';
    menu.style.top = e.originalEvent.pageY + 'px';
    menu.style.display = 'block';
    menu._node = node;

    window.nodeContextCallback = function (action) {
        if (action === 'edit') {
            window.nodeEditContext = { node: node };
            window.openNodeModal(null, node);
        } else if (action === 'delete') {
            node.remove();
        }
    };
}

// Opens the custom context menu at cursor position and wires edit/delete actions
function openEdgeMenu(e) {
    e.preventDefault();
    hideAllContextMenus();
    const edge = e.target;
    const menu = document.getElementById('edge-context-menu');
    menu.style.left = e.originalEvent.pageX + 'px';
    menu.style.top = e.originalEvent.pageY + 'px';
    menu.style.display = 'block';
    menu._edge = edge;

    window.edgeContextCallback = function (action) {
        if (action === 'edit') {
            window.edgeEditContext = { edge: edge };
            window.openEdgeModal(edge);
        } else if (action === 'delete') {
            edge.remove();
        }
    };
}



// ======================
// === GLOBAL TOOLTIP ===
// ======================

// Lightweight custom tooltip for node descriptions, positioned near the cursor
window.showTooltip = function (text, pageX, pageY) {
    let tooltipDiv = window.tooltipDiv;
    if (!tooltipDiv) {
        tooltipDiv = document.createElement('div');
        tooltipDiv.className = 'cy-tooltip';
        document.body.appendChild(tooltipDiv);
        window.tooltipDiv = tooltipDiv;
    }
    tooltipDiv.textContent = text;
    tooltipDiv.style.display = 'block';
    tooltipDiv.style.left = (pageX + 12) + 'px';
    tooltipDiv.style.top = (pageY + 12) + 'px';
};
window.hideTooltip = function () {
    if (window.tooltipDiv)
        window.tooltipDiv.style.display = 'none';
};



// ================================
// === MANAGE GRAPH DESCRIPTION ===
// ================================

// Rebuilds the textual description (APX-like syntax) from the current graph:
// - one line per node:   arg(node[, weight]).
// - one line per edge:   att(source,target[,weight]). or support(source,target[,weight]).
function updateDescriptionFromGraph() {
    isEditingDescription = true;
    try {
        resetComputedResults();

        let result = [];
        cy.nodes().forEach(function (node) {
            let arg = node.id() || "";
            let weight = node.data('weight');
            if (weight !== null && weight !== undefined) {
                result.push("arg(" + arg + "," + weight + ").");
            } else {
                result.push("arg(" + arg + ").");
            }
        });
        cy.edges().forEach(function (edge) {
            let sourceArg = edge.source().id() || "";
            let targetArg = edge.target().id() || "";
            let key = (edge.data('type') === "support") ? "support" : "att";
            let weight = edge.data('weight');
            if (weight !== null && weight !== undefined) {
                result.push(key + "(" + sourceArg + "," + targetArg + "," + weight + ").");
            } else {
                result.push(key + "(" + sourceArg + "," + targetArg + ").");
            }
        });
        document.getElementById('desc-area').value = result.join('\n');

        // Updates the visible semantic group (AF/BAF/QBAF/WAF) based on current graph
        updateSemanticGroupView();
    } finally {
        isEditingDescription = false;
    }
}

// Rebuilds the graph from desc-area using APX-like syntax:
// - one line per node:   arg(node[, weight]).
// - one line per edge:   att(source,target[,weight]). or support(source,target[,weight]).
// Parses the description textarea and synchronizes the Cytoscape graph:
// - validates node and edge lines (syntax + semantic constraints)
// - collects nodes and edges into ordered lists
// - on validation errors, shows an alert and aborts graph update
// - updates existing nodes/edges, removes obsolete ones, and adds new ones
// - re-runs the selected layout and updates the semantic group view
function updateGraphFromDescription() {
    const textarea = document.getElementById('desc-area');
    const errorDiv = document.getElementById('desc-area-error');

    if (!textarea) return;

    // reset error area
    if (errorDiv) {
        errorDiv.textContent = '';
        errorDiv.style.display = 'none';
    }

    const rawLines = textarea.value.split('\n');
    const lines = rawLines.map(l => l.trim()).filter(Boolean);

    const nodeMap = new Map();      // id (canonical) -> { id, weight }
    const attackEdges = [];         // { source, target, weight }
    const supportEdges = [];        // { source, target, weight }
    const errors = [];

    // --- 1) Parse & validate every line syntactically and semantically ---
    lines.forEach((line, index) => {
        const lineNo = index + 1;

        // NODE: arg(node[, weight]).
        let nd = line.match(/^arg\(([^,)]+)(?:,([^)]+))?\)\.$/);
        if (nd) {
            const argNameRaw = nd[1].trim();
            const argName = argNameRaw.toLowerCase();
            const weight = nd[2] != null ? parseFloat(nd[2]) : null;

            const argValidation = validateArgumentName(argName);
            if (!argValidation.valid) {
                errors.push(`Line ${lineNo}: ${argValidation.error}`);
                return;
            }

            const weightValidation = validateWeight(weight);
            if (!weightValidation.valid) {
                errors.push(`Line ${lineNo}: ${weightValidation.error}`);
                return;
            }

            nodeMap.set(argName, { id: argName, weight: weight });
            return;
        }

        // EDGE: att(source,target[,weight]).
        let mAtt = line.match(/^att\(([^,]+),([^,)]+)(?:,([^)]+))?\)\.$/);
        if (mAtt) {
            const sourceCanonical = mAtt[1].trim().toLowerCase();
            const targetCanonical = mAtt[2].trim().toLowerCase();
            const weight = mAtt[3] != null ? parseFloat(mAtt[3]) : null;

            const srcVal = validateArgumentName(sourceCanonical);
            if (!srcVal.valid) {
                errors.push(`Line ${lineNo}: Source ${srcVal.error}`);
                return;
            }
            const tgtVal = validateArgumentName(targetCanonical);
            if (!tgtVal.valid) {
                errors.push(`Line ${lineNo}: Target ${tgtVal.error}`);
                return;
            }

            const wVal = validateWeight(weight);
            if (!wVal.valid) {
                errors.push(`Line ${lineNo}: ${wVal.error}`);
                return;
            }

            attackEdges.push({
                source: sourceCanonical,
                target: targetCanonical,
                weight: weight
            });
            return;
        }

        // EDGE: support(source,target[,weight]).
        let mSup = line.match(/^support\(([^,]+),([^,)]+)(?:,([^)]+))?\)\.$/);
        if (mSup) {
            const sourceCanonical = mSup[1].trim().toLowerCase();
            const targetCanonical = mSup[2].trim().toLowerCase();
            const weight = mSup[3] != null ? parseFloat(mSup[3]) : null;

            const srcVal = validateArgumentName(sourceCanonical);
            if (!srcVal.valid) {
                errors.push(`Line ${lineNo}: Source ${srcVal.error}`);
                return;
            }
            const tgtVal = validateArgumentName(targetCanonical);
            if (!tgtVal.valid) {
                errors.push(`Line ${lineNo}: Target ${tgtVal.error}`);
                return;
            }

            const wVal = validateWeight(weight);
            if (!wVal.valid) {
                errors.push(`Line ${lineNo}: ${wVal.error}`);
                return;
            }

            supportEdges.push({
                source: sourceCanonical,
                target: targetCanonical,
                weight: weight
            });
            return;
        }

        if (line !== '') {
            errors.push(`Line ${lineNo}: ${ERR_DESC_UNKNOWN_SYNTAX} "${line}"`);
        }
    });

    if (errors.length > 0) {
        if (errorDiv) {
            errorDiv.textContent = ERR_DESC_GENERIC_PREFIX + '\n' + errors.join('\n');
            errorDiv.style.display = 'block';
        }
        console.error('❌ Validation errors:', errors);
        return;
    }

    // --- 2) Validate that all edge endpoints exist in node list ---
    const hasNode = (id) => nodeMap.has(id);
    const orphanErrors = [];

    function checkEdgesNodeExistence(list, kind) {
        list.forEach(ed => {
            if (!hasNode(ed.source)) {
                orphanErrors.push(
                    `${kind}(${ed.source},${ed.target}): ${ERR_DESC_MISSING_SOURCE} "${ed.source}"`
                );
            }
            if (!hasNode(ed.target)) {
                orphanErrors.push(
                    `${kind}(${ed.source},${ed.target}): ${ERR_DESC_MISSING_TARGET} "${ed.target}"`
                );
            }
        });
    }

    checkEdgesNodeExistence(attackEdges, 'att');
    checkEdgesNodeExistence(supportEdges, 'support');

    if (orphanErrors.length > 0) {
        if (errorDiv) {
            errorDiv.textContent = ERR_DESC_GENERIC_PREFIX + '\n' + orphanErrors.join('\n');
            errorDiv.style.display = 'block';
        }
        console.error('❌ Validation errors (missing nodes for edges):', orphanErrors);
        return;
    }

    // --- 3) Apply changes to Cytoscape graph (using data.source/data.target) ---
    isEditingDescription = true;

    try {
        const newNodeIds = new Set(nodeMap.keys());

        // Build set of logical edge tuples from new lists
        const newEdgesTuples = new Set();
        attackEdges.forEach(ed => {
            newEdgesTuples.add(`attack|${ed.source}|${ed.target}`);
        });
        supportEdges.forEach(ed => {
            newEdgesTuples.add(`support|${ed.source}|${ed.target}`);
        });

        // Remove obsolete edges (match on data.source/data.target/data.type)
        cy.edges().forEach(edge => {
            const type = edge.data('type');
            const sourceId = (edge.data('source') || '').toLowerCase();
            const targetId = (edge.data('target') || '').toLowerCase();
            const key = `${type}|${sourceId}|${targetId}`;
            if (!newEdgesTuples.has(key)) {
                edge.remove();
            }
        });

        // Remove obsolete nodes (incident edges removed automatically)
        cy.nodes().forEach(node => {
            if (!newNodeIds.has(node.id())) {
                node.remove();
            }
        });

        // Add/update nodes
        nodeMap.forEach(nodeInfo => {
            let node = cy.getElementById(nodeInfo.id);
            if (node.length > 0) {
                if (nodeInfo.weight != null)
                    node.data('weight', nodeInfo.weight);
            } else {
                cy.add({
                    group: 'nodes',
                    data: {
                        id: nodeInfo.id,
                        weight: nodeInfo.weight,
                        description: ''
                    }
                });
            }
        });

        // Align edge id counter with current graph
        initEdgeIdCounterFromGraph();

        // Uses old pattern: endpoints stored in data.source/data.target
        function upsertEdgeList(list, type) {
            list.forEach(ed => {
                const srcId = ed.source;
                const tgtId = ed.target;

                const existing = cy.edges().filter(edge =>
                    edge.data('type') === type &&
                    (edge.data('source') || '').toLowerCase() === srcId &&
                    (edge.data('target') || '').toLowerCase() === tgtId
                );

                if (existing.length > 0) {
                    if (ed.weight != null)
                        existing.data('weight', ed.weight);
                } else {
                    const edgeId = generateEdgeId();
                    cy.add({
                        group: 'edges',
                        data: {
                            id: edgeId,
                            source: srcId,
                            target: tgtId,
                            type: type,
                            weight: ed.weight
                        }
                    });
                }
            });
        }

        // Add/update edges
        upsertEdgeList(attackEdges, 'attack');
        upsertEdgeList(supportEdges, 'support');

        const selectedLayout = document.getElementById('layout-select').value || 'cose';
        cy.layout({ name: selectedLayout }).run();
        updateSemanticGroupView();
    } finally {
        isEditingDescription = false;
    }
}



// ===========================
// === CYTOSCAPE LISTENERS ===
// ===========================
function registerCytoscapeEventListeners() {
    // graph changes (to keep textual description in sync)
    cy.on('add remove data', 'node,edge', () => {
        if (!isEditingDescription) { updateDescriptionFromGraph(); }
    });

    // resize/layout stop (to update preview canvas size)
    cy.on('resize', () => { resizePreviewCanvas(); });
    cy.on('layoutstop', () => { resizePreviewCanvas(); });

    // tap on nodes/background (node creation and edge creation workflow)
    cy.on('tap', 'node', (e) => { createEdge(e); });
    cy.on('tap', (e) => { createNode(e); });

    // context menus for nodes and edges (edit/delete actions)
    cy.on('cxttap', 'node', (e) => { openNodeMenu(e); });
    cy.on('cxttap', 'edge', (e) => { openEdgeMenu(e); });

    // node hover (description tooltip)
    cy.on('mouseover', 'node', (e) => {
        var desc = e.target.data('description') || "";
        if (desc) window.showTooltip(desc, e.originalEvent.pageX, e.originalEvent.pageY);
    });
    cy.on('mouseout', 'node', () => {
        window.hideTooltip();
    });

    // mousemove (tooltip reposition + live edge preview during edge creation)
    cy.on('mousemove', (e) => {
        if (window.tooltipDiv && window.tooltipDiv.style.display === 'block') {
            window.tooltipDiv.style.left = (e.originalEvent.pageX + 12) + 'px';
            window.tooltipDiv.style.top = (e.originalEvent.pageY + 12) + 'px';
        }
        if (edgeModeActive && edgeSourceNode) {
            const nodePos = edgeSourceNode.renderedPosition();
            const sourceX = nodePos.x;
            const sourceY = nodePos.y;
            const mouseX = e.renderedPosition.x;
            const mouseY = e.renderedPosition.y;
            drawPreviewLine(sourceX, sourceY, mouseX, mouseY);
        }
    });

}
