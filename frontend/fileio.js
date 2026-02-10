// ==========================
// === FILE IMPORT/EXPORT ===
// ==========================

// Builds a Blob representing the graph in APX textual format 
// based on the current description textarea
async function generateAPXBlob() {
    const description = document.getElementById('desc-area').value;
    return new Blob([description], { type: 'text/plain' });
}

// Builds a JSON Blob with full graph metadata, nodes, edges,
// layout and description (used for round‑trip imports)
async function generateJSONBlob() {
    const projectName = document.getElementById('project-name').value || 'graph';

    const exportData = {
        metadata: {
            projectName: projectName,
            exportDate: new Date().toISOString(),
            version: "1.0",
            nodeCount: cy.nodes().length,
            edgeCount: cy.edges().length
        },
        graph: {
            nodes: [],
            edges: []
        },
        layout: document.getElementById('layout-select').value,
        description: document.getElementById('desc-area').value
    };

    // Nodes list
    cy.nodes().forEach(node => {
        exportData.graph.nodes.push({
            id: node.id(),
            weight: node.data('weight'),
            description: node.data('description'),
            position: {
                x: node.position('x'),
                y: node.position('y')
            }
        });
    });

    // Edges list
    cy.edges().forEach(edge => {
        exportData.graph.edges.push({
            id: edge.id(),
            source: edge.source().id(),
            target: edge.target().id(),
            type: edge.data('type'),
            weight: edge.data('weight')
        });
    });

    const jsonStr = JSON.stringify(exportData, null, 2);
    return new Blob([jsonStr], { type: 'application/json' });
}

// Asks Cytoscape to render the current graph as a high‑resolution PNG Blob
async function generatePNGBlob() {
    const wrapper = document.getElementById('cy-container');

    if (!wrapper) {
        console.error('DEBUG cy-container not found');
        // fallback: export only graph
        return cy.png({
            output: 'blob-promise',
            bg: '#fcfcf9',
            full: true,
            scale: 3,
            maxWidth: 4096,
            maxHeight: 4096
        });
    }

    const canvas = await html2canvas(wrapper, {
        backgroundColor: '#fcfcf9',
        scale: 2
    });

    return new Promise((resolve) => {
        canvas.toBlob((blob) => {
            resolve(blob);
        }, 'image/png');
    });
}

// Injects APX content into the description textarea, and rebuilds the graph
function importAPX(content) {
    try {
        document.getElementById('desc-area').value = content;
        updateGraphFromDescription();
    } catch (error) {
        showError('desc-area-error', [], ERR_FILE_IMPORT_APX);
    }
}

// Restores project name, description, layout, node descriptions and positions from a JSON export
function importJSON(jsonContent) {
    try {
        const data = JSON.parse(jsonContent);

        // Restores project name
        if (data.metadata && data.metadata.projectName) {
            const projectNameInput = document.getElementById('project-name');
            if (projectNameInput) {
                projectNameInput.value = data.metadata.projectName;
            }
        }

        // Restores description
        if (data.description) {
            document.getElementById('desc-area').value = data.description;
            updateGraphFromDescription();
        }

        // Restores nodes
        if (data.graph && data.graph.nodes) {
            data.graph.nodes.forEach(nodeData => {
                const node = cy.getElementById(nodeData.id);
                if (node.length > 0) {
                    if (nodeData.description) {
                        node.data('description', nodeData.description);
                    }
                    if (nodeData.position) {
                        node.position(nodeData.position);
                    }
                }
            });
        }

        // Restores layout
        if (data.layout) {
            const layoutSelect = document.getElementById('layout-select');
            if (layoutSelect) {
                layoutSelect.value = data.layout;
            }
        }
        const selectedLayout = document.getElementById('layout-select').value || 'cose';
        cy.layout({ name: selectedLayout }).run();

        initEdgeIdCounterFromGraph();
    } catch (error) {
        showError('desc-area-error', [], ERR_FILE_IMPORT_JSON);
    }
}

// Uses the File System Access API (when available) to open .apx or .json,
// auto‑sets project name from file name, then delegates to importAPX/importJSON
async function importGraph() {
    // Fallback when File System Access is unavailable
    if (!window.showOpenFilePicker) {
        document.getElementById('desc-file-input').click();
        return;
    }

    try {
        // Shows dialog window
        const [fileHandle] = await window.showOpenFilePicker({
            id: 'argDesignerGraphFiles',
            types: [
                {
                    description: 'Graph Files',
                    accept: {
                        'text/plain': ['.apx'],
                        'application/json': ['.json']
                    }
                }
            ],
            multiple: false
        });

        // Reads file
        const file = await fileHandle.getFile();
        const content = await file.text();

        // clean interface
        resetAppState();

        // Gets project-name
        const fileNameWithoutExt = file.name.substring(0, file.name.lastIndexOf('.'));
        const projectNameInput = document.getElementById('project-name');
        if (projectNameInput && fileNameWithoutExt) {
            projectNameInput.value = fileNameWithoutExt;
        }

        // Gets extension
        const extension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();

        switch (extension) {
            case '.apx':
                importAPX(content);
                break;
            case '.json':
                importJSON(content);
                break;
            default:
                showError('desc-area-error', [], ERR_FILE_IMPORT_UNSUPPORTED);
        }

    } catch (error) {
        if (error.name !== 'AbortError') {
            showError('desc-area-error', [], ERR_FILE_IMPORT);
        }
    }
}

// Fallback import using a hidden <input type=\"file\"> for browsers
// without File System Access API support
function importGraphFallback(e) {
    const file = e.target.files[0];
    if (!file) return;

    // clean interface
    resetAppState();

    // Gets project-name from filename
    const fileNameWithoutExt = file.name.substring(0, file.name.lastIndexOf('.'));
    const projectNameInput = document.getElementById('project-name');
    if (projectNameInput && fileNameWithoutExt) {
        projectNameInput.value = fileNameWithoutExt;
    }

    const reader = new FileReader();
    reader.onload = function (event) {
        const content = event.target.result;

        // Gets extension
        if (file.name.endsWith('.json')) {
            importJSON(content);
        } else if (file.name.endsWith('.apx')) {
            importAPX(content);
        } else {
            showError('desc-area-error', [], ERR_FILE_IMPORT_UNSUPPORTED);
        }
    };
    reader.readAsText(file);

    // Reset input
    e.target.value = '';
}

// Uses the File System Access API to save the current graph as:
// - APX description
// - PNG image
// - JSON full data
// depending on the chosen file extension
async function exportGraph() {
    const projectName = document.getElementById('project-name').value || 'graph';

    // Fallback when File System Access is unavailable
    if (!window.showSaveFilePicker) {
        showExportFallbackDialog();
        return;
    }

    try {
        // Shows dialog window
        const fileHandle = await window.showSaveFilePicker({
            suggestedName: projectName,
            types: [
                {
                    description: 'APX Description',
                    accept: { 'text/plain': ['.apx'] }
                },
                {
                    description: 'JSON Full Data',
                    accept: { 'application/json': ['.json'] }
                },
                {
                    description: 'PNG Image',
                    accept: { 'image/png': ['.png'] }
                }
            ]
        });

        // Gets extension
        const fileName = fileHandle.name;
        const extension = fileName.substring(fileName.lastIndexOf('.')).toLowerCase();

        let blob;

        switch (extension) {
            case '.apx':
                blob = await generateAPXBlob();
                break;
            case '.json':
                blob = await generateJSONBlob();
                break;
            case '.png':
                blob = await generatePNGBlob();
                break;
            default:
                console.error('DEBUG Unsupported file extension:', extension);
                return;
        }

        // Writes file
        const writable = await fileHandle.createWritable();
        await writable.write(blob);
        await writable.close();

    } catch (error) {
        if (error.name !== 'AbortError') {
            console.error('DEBUG Export error:', error);
        }
    }
}

// Minimal prompt‑based fallback to choose between APX/PNG/JSON formats
// on browsers without File System Access API support
async function showExportFallbackDialog() {
    const format = prompt(
        'Choose export format:\n' +
        '1 = .apx (Description)\n' +
        '2 = .json (Full Data)' +
        '3 = .png (Image)\n',
        '1'
    );

    const projectName = document.getElementById('project-name').value || 'graph';

    switch (format) {
        case '1':
            exportAPXFallback(projectName);
            break;
        case '2':
            exportJSONFallback(projectName);
            break;
        case '3':
            exportPNGFallback(projectName);
            break;
        default:
            console.log('DEBUG Export cancelled');
    }
}

// Triggers direct downloads (without file picker) for APX
async function exportAPXFallback(projectName) {
    const description = document.getElementById('desc-area').value;
    const blob = new Blob([description], { type: 'text/plain' });
    downloadBlob(blob, projectName + '.apx');
}

// Triggers direct downloads (without file picker) for PNG
async function exportPNGFallback(projectName) {
    const blob = await generatePNGBlob();

    downloadBlob(blob, projectName + '.png');
}

// Triggers direct downloads (without file picker) for JSON
async function exportJSONFallback(projectName) {
    const blob = await generateJSONBlob();
    downloadBlob(blob, projectName + '.json');
}



// ====================
// === SAVE RESULTS ===
// ====================

// Clears all computed results from the UI and graph:
// - unselects and clears labelings lists
// - clears the strength textarea
// - removes strength data from nodes
// - restores node colors to defaults
// - rebuilds HTML labels without strength values
function resetComputedResults() {
    // Clean-up of previous argumentation framework errors
    showError('desc-area-error', [], null);

    // Clear labelings lists (unfiltered & filtered)
    document.querySelectorAll('#labelings-area input, #filtered-labelings-area input').forEach(cb => cb.checked = false);

    // Clear labelings area
    document.getElementById('labelings-area').innerHTML = '';
    document.getElementById('computed-labelings').style.display = 'none';

    // Clean-up of previous labelings errors
    showError('compute-semantic-group-ext-area-error', [], null);

    // Clear filtered labelings area
    document.getElementById("constraints-area").value = "";
    /* TODO: to add Preferences in labelings filters -> uncomment this
    document.getElementById("preferences-area").value = "";
    */
    document.getElementById('filtered-labelings-area').innerHTML = '';
    document.getElementById('filtered-labelings').style.display = 'none';

    // Clean-up of previous filtered labelings errors
    showError('filter-area-error', [], null);

    // Clear strength textarea
    document.getElementById('strength-area').value = "";
    document.getElementById('computed-strength').style.display = 'none';

    // Clean-up of previous strength errors
    showError('compute-semantic-gradual-area-error', [], null);

    // Reset graph to pre-computation state
    if (cy) {
        cy.nodes().forEach(node => {
            // remove computed strength data
            node.data('strength', '');

            // restore default node colors
            node.style('background-color', NODE_COLOR_DEFAULT);
            node.style('border-color', NODE_BORDER_COLOR_DEFAULT);
        });
    }
}

// Clears all computed results from the UI and graph:
// - unselects labelings and filtered labelings lists
// - clears filtered labelings lists
// - restores node colors to defaults
function resetFilteredResults() {
    // Clear labelings lists (unfiltered & filtered)
    document.querySelectorAll('#labelings-area input, #filtered-labelings-area input').forEach(cb => cb.checked = false);

    // Clear filtered labelings area
    document.getElementById('filtered-labelings-area').innerHTML = '';
    document.getElementById('filtered-labelings').style.display = 'none';

    // Clean-up of previous filtered labelings errors
    showError('filter-area-error', [], null);

    // Reset graph to pre-computation state
    if (cy) {
        cy.nodes().forEach(node => {
            // restore default node colors
            node.style('background-color', NODE_COLOR_DEFAULT);
            node.style('border-color', NODE_BORDER_COLOR_DEFAULT);
        });
    }
}

// Serializes all labelings from the list (bookmark-group) into a multi-line string
function getLabelingsTextFromList(listId) {
    const container = document.getElementById(listId);
    if (!container) return "";

    const lines = [];
    const labelSpans = container.querySelectorAll('.bookmark-label');
    
    labelSpans.forEach(span => {
        const txt = span.textContent.trim();
        if (txt) {
            lines.push(txt);
        }
    });

    return lines.join('\n');
}

// Triggers a download of the provided text content as a UTF‑8 .txt file
function downloadTextFile(filename, text) {
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// Saves all (unfiltered) labelings from the main list to "labelings.txt"
function saveLabelings() {
    const content = getLabelingsTextFromList('labelings-area');
    if (!content) {
        showError('compute-semantic-group-ext-area-error', [], ERR_EMPTY_LABELING);
        return;
    }
    downloadTextFile('labelings.txt', content);
}

// Saves all filtered labelings to "filtered_labelings.txt"
function saveFilteredLabelings() {
    const content = getLabelingsTextFromList('filtered-labelings-area');
    if (!content) {
        showError('filter-labelings-area-error', [], ERR_EMPTY_FILTERED_LABELING);
        return;
    }
    downloadTextFile('filtered_labelings.txt', content);
}

// Saves all strength to "strength.txt"
function saveStrength() {
    const content = document.getElementById('strength-area').value;
    if (!content) {
        showError('compute-semantic-gradual-area-error', [], ERR_EMPTY_STRENGTH);
        return;
    }
    downloadTextFile('strength.txt', content);
}
