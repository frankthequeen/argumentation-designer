// =================
// === CYTOSCAPE ===
// =================

// Core Cytoscape initialization:: creates the graph instance, base styles, default layout
function initializeCytoscape() {
    cy = cytoscape({
        container: document.getElementById('cy'),
        elements: [],
        selectionType: 'single',
        boxSelectionEnabled: false,
        activeBgColor: 'rgba(0,0,0,0)',
        activeBgOpacity: 0,
        style: [
            {
                selector: 'node',
                style: {
                    'background-color': NODE_COLOR_DEFAULT,
                    'width': 50,
                    'height': 50,
                    'border-width': 1,
                    'border-color': NODE_BORDER_COLOR_DEFAULT,
                    // Note: no built‑in Cytoscape text label is used for nodes.
                    //       Node labels are fully rendered via the HTML label plugin.
                    'color': '#fff',
                    'overlay-opacity': 0, 
                    'overlay-padding': 0
                }
            },
            {
                selector: 'core',
                style: {
                    'active-bg-opacity': 0,
                    'selection-box-opacity': 0,
                    'selection-box-border-width': 0
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
            console.warn("DEBUG Error destroying htmlLabel:", e);
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
            console.warn('DEBUG Ignored error while updating edge:', e);
        }
        cy.nodes().remove();
    }
    EDGE_ID_COUNTER = 1;
}

function checkGraphEmptyState() {
    const emptyMsg = document.getElementById('cy-empty-message');
    if (!emptyMsg) return;

    if (cy.nodes().length === 0) {
        emptyMsg.style.display = 'block';
    } else {
        emptyMsg.style.display = 'none';
    }
}



// ==============================
// === NODE CREATION WORKFLOW ===
// ==============================

// Creates a new node when clicking on the background (if not in edge mode)
function createNode(e) {
    if (edgeModeActive && e.target === cy) {
        resetEdgeMode();
    } else if (!edgeModeActive && e.target === cy) {
        // create node
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

    // Arrow
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
        // Step 1: click on source node
        edgeModeActive = true;
        edgeSourceNode = e.target;
        document.body.style.cursor = 'crosshair';
        clearPreviewCanvas();
    } else {
        // Step 2: click on target node
        edgeTargetNode = e.target;
        setupEdgeCreationCallback();
        window.openEdgeModal(null);
    }
}



// =============================
// === CONTEXT MENU HANDLERS ===
// =============================

// Hides both node and edge context menus when clicking outside
function hideAllContextMenus() {
    const nodeMenu = document.getElementById('node-context-menu');
    const edgeMenu = document.getElementById('edge-context-menu');
    const wasVisible = (nodeMenu.style.display === 'block' || edgeMenu.style.display === 'block');
    
    nodeMenu.style.display = 'none';
    edgeMenu.style.display = 'none';
    
    return wasVisible;
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

    // check node status to enable/disable menu items
    const clearItem = document.getElementById('ctx-clear-edges');
    if (node.connectedEdges().length === 0) {
        clearItem.classList.add('disabled');
    } else {
        clearItem.classList.remove('disabled');
    }

    window.nodeContextCallback = function (action) {
        if (action === 'edit') 
        {
            window.nodeEditContext = { node: node };
            window.openNodeModal(null, node);
        } 
        else if (action === 'clear-edges')
        {
            node.connectedEdges().remove();
        } 
        else if (action === 'delete') 
        {
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

    // check edge status to enable/disable menu items
    const sourceId = edge.data('source');
    const targetId = edge.data('target');
    const type = edge.data('type');
    const otherType = (type === 'attack') ? 'support' : 'attack';
    const reverseItem = document.getElementById('edge-ctx-reverse');
    const hasReverseDuplicate = cy.edges().some(other => 
        other.data('source') === targetId && 
        other.data('target') === sourceId && 
        other.data('type') === type
    );
    reverseItem.classList.toggle('disabled', hasReverseDuplicate);
    const switchItem = document.getElementById('edge-ctx-switch');
    const hasTypeDuplicate = cy.edges().some(other => 
        other.data('source') === sourceId && 
        other.data('target') === targetId && 
        other.data('type') === otherType
    );
    switchItem.classList.toggle('disabled', hasTypeDuplicate);

    window.edgeContextCallback = function (action) {
        if (action === 'edit') 
        {
            window.edgeEditContext = { edge: edge };
            window.openEdgeModal(edge);
        } 
        else if (action === 'reverse') 
        {
            edge.move({ source: edge.data('target'), target: edge.data('source') });
        }
        else if (action === 'switch') 
        {
            const currentType = edge.data('type');
            edge.data('type', currentType === 'attack' ? 'support' : 'attack');
        }
        else if (action === 'delete') 
        {
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
        const newDescr = result.join('\n');
        document.getElementById('desc-area').value = newDescr;
        lastAppliedDescription = newDescr.trim();

        // Updates the visible semantic group (AF/BAF/QBAF/WAF) based on current graph
        updateSemanticGroupView();
    } finally {
        isEditingDescription = false;
    }
}

// Draw updated Graph
function applyGraphChanges(nodeMap, attackEdges, supportEdges) {
    const newNodeIds = new Set(nodeMap.keys());
    
    // Build set of logical edge tuples from new lists
    const newEdgesTuples = new Set();
    attackEdges.forEach(ed => newEdgesTuples.add(`attack-${ed.source}-${ed.target}`));
    supportEdges.forEach(ed => newEdgesTuples.add(`support-${ed.source}-${ed.target}`));

    // Remove obsolete edges
    cy.edges().forEach(edge => {
        const type = edge.data('type');
        const source = edge.data('source').toLowerCase();
        const target = edge.data('target').toLowerCase();
        const key = `${type}-${source}-${target}`;
        
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
        const existingNode = cy.getElementById(nodeInfo.id);
        if (existingNode.length > 0) {
            existingNode.data('weight', nodeInfo.weight);
        } else {
            cy.add({
                group: 'nodes',
                data: { id: nodeInfo.id, weight: nodeInfo.weight }
            });
        }
    });

    // Add/update edges
    const upsertEdges = (list, type) => {
        list.forEach(ed => {
            const existing = cy.edges().filter(e => 
                e.data('type') === type && 
                e.data('source').toLowerCase() === ed.source && 
                e.data('target').toLowerCase() === ed.target
            );

            if (existing.length > 0) {
                existing.data('weight', ed.weight);
            } else {
                cy.add({
                    group: 'edges',
                    data: { 
                        id: generateEdgeId(), 
                        source: ed.source, 
                        target: ed.target, 
                        type: type, 
                        weight: ed.weight 
                    }
                });
            }
        });
    };

    upsertEdges(attackEdges, 'attack');
    upsertEdges(supportEdges, 'support');

    initEdgeIdCounterFromGraph();
}

// Rebuilds the graph from desc-area using APX-like syntax:
// - one line per node:   arg(node[, weight]).
// - one line per edge:   att(source,target[,weight]). or support(source,target[,weight]).
// Parses the description textarea and synchronizes the Cytoscape graph:
// - validates node and edge lines (syntax + semantic constraints)
// - collects nodes and edges into ordered lists
// - on validation errors, shows errors and aborts graph update
// - updates existing nodes/edges, removes obsolete ones, and adds new ones
// - re-runs the selected layout and updates the semantic group view
function updateGraphFromDescription() {
    const textarea = document.getElementById('desc-area');
    if (!textarea) return;

    // Clean-up of previous errors
    const currentDescription = textarea.value.trim();
    showError('desc-area-error', [], null);
    setButtonLoading('refresh-btn', true);

    setTimeout(() => {
        try {
            const rawLines = textarea.value.split('\n');
            const lines = rawLines.map(l => l.trim()).filter(Boolean);
            const nodeMap = new Map();
            const attackEdges = [];
            const supportEdges = [];
            const errors = [];

            // Parse & validate every line syntactically and semantically
            lines.forEach((line, index) => {
                const lineNo = index + 1;
                
                // NODE: arg(node[, weight]).
                let nd = line.match(/arg\(([^,)]+)(?:,\s*([^)]+))?\)\./);
                if (nd) {
                    const argName = nd[1].trim().toLowerCase();
                    const weight = nd[2] ? parseFloat(nd[2]) : null;
                    
                    const argVal = validateArgumentName(argName);
                    if (!argVal.valid) errors.push(`Line ${lineNo}: ${argVal.error}`);
                    
                    const wVal = validateWeight(weight, "node");
                    if (!wVal.valid) errors.push(`Line ${lineNo}: ${wVal.error}`);
                    
                    nodeMap.set(argName, { id: argName, weight: weight });
                    return;
                }

                // EDGE: att(source,target[,weight]).
                let mAtt = line.match(/att\(([^,]+),\s*([^,)]+)(?:,\s*([^)]+))?\)\./);
                if (mAtt) {
                    const weight =  mAtt[3] ? parseFloat(mAtt[3]) : null;
                    const wVal = validateWeight(weight, "edge");
                    if (!wVal.valid) errors.push(`Line ${lineNo}: ${wVal.error}`);
                    
                    attackEdges.push({ 
                        source: mAtt[1].trim().toLowerCase(), 
                        target: mAtt[2].trim().toLowerCase(), 
                        weight: weight,
                        line: lineNo 
                    });
                    return;
                }

                // EDGE: support(source,target[,weight]).
                let mSup = line.match(/support\(([^,]+),\s*([^,)]+)(?:,\s*([^)]+))?\)\./);
                if (mSup) {
                    const weight =  mSup[3] ? parseFloat(mSup[3]) : null;
                    const wVal = validateWeight(weight, "edge");
                    if (!wVal.valid) errors.push(`Line ${lineNo}: ${wVal.error}`);
                    
                    supportEdges.push({ 
                        source: mSup[1].trim().toLowerCase(), 
                        target: mSup[2].trim().toLowerCase(), 
                        weight: weight,
                        line: lineNo 
                    });
                    return;
                }

                errors.push(`Line ${lineNo}: syntax error in "${line}"`);
            });

            // Validate that all edge endpoints exist in node list
            const checkOrphans = (list, type) => {
                list.forEach(ed => {
                    if (!nodeMap.has(ed.source)) {
                        errors.push(`Line ${ed.line}: ${type} error - source arg "${ed.source}" is not defined`);
                    }
                    if (!nodeMap.has(ed.target)) {
                        errors.push(`Line ${ed.line}: ${type} error - target arg "${ed.target}" is not defined`);
                    }
                });
            };
            checkOrphans(attackEdges, 'att');
            checkOrphans(supportEdges, 'support');

            if (errors.length > 0) {
                // Show errors
                const finalErrorList = [ERR_DESC_GENERIC_PREFIX].concat(errors);
                showError('desc-area-error', ['desc-area'], finalErrorList);
            } else {
                if (currentDescription !== lastAppliedDescription) {
                    // The Description is changed, update the Graph
                    isEditingDescription = true;
                    resetComputedResults();
                    lastAppliedDescription = currentDescription;
                    applyGraphChanges(nodeMap, attackEdges, supportEdges);
                }

                // Draw Graph
                const selectedLayout = document.getElementById('layout-select').value || 'cose';
                cy.layout({ name: selectedLayout }).run();
                updateSemanticGroupView();
                checkGraphEmptyState();
            }

        } catch (e) {
            showError('desc-area-error', [], ERR_GENERIC + `${e.message}`);
        } finally {
            setButtonLoading('refresh-btn', false);
            isEditingDescription = false;
        }
    }, 100);
}



// ===========================
// === CYTOSCAPE LISTENERS ===
// ===========================
function registerCytoscapeEventListeners() {
    // graph changes (to keep textual description in sync)
    cy.on('add remove data move', 'node,edge', () => {
        if (!isEditingDescription) { 
            updateDescriptionFromGraph();
            checkGraphEmptyState();
        }
    });

    // resize/layout stop (to update preview canvas size)
    cy.on('resize', () => { resizePreviewCanvas(); });
    cy.on('layoutstop', () => { resizePreviewCanvas(); });

    // tap on nodes/background (node creation and edge creation workflow)
    cy.on('tap', function(e) {
        cm = hideAllContextMenus();

        if (cm === false && e.target === cy) {
            createNode(e);
        } else if (cm === false && e.target.isNode && e.target.isNode()) {
            createEdge(e);
        }
    });

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
    document.querySelectorAll('.contextMenu').forEach(menu => {
        menu.addEventListener('mouseenter', () => {
            window.hideTooltip();
        });
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

    // cursor style management
    cy.on('mouseover', 'node, edge', function() {
        if (!edgeModeActive) {
            document.getElementById('cy').style.cursor = 'pointer';
        }
    });
    cy.on('mouseout', 'node, edge', function() {
        if (!edgeModeActive) {
            document.getElementById('cy').style.cursor = 'default';
        }
    });
    cy.on('mousedown', function(e) {
        if (!edgeModeActive) {
            document.getElementById('cy').style.cursor = 'grab';
        }
    });
    cy.on('mouseup', function() {
        if (!edgeModeActive) {
            document.getElementById('cy').style.cursor = 'default';
        }
    });
    cy.on('grab drag pan', function() {
        if (!edgeModeActive) {
            hideAllContextMenus();
            document.getElementById('cy').style.cursor = 'grabbing';
        }
    });
    cy.on('free viewportready tapend', function(e) {
        if (!edgeModeActive) {
            if (e.target && e.target !== cy) {
                document.getElementById('cy').style.cursor = 'pointer';
            } else {
                document.getElementById('cy').style.cursor = 'default';
            }
        }
    });
}
