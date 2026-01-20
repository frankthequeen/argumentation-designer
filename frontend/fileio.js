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
        console.error('cy-container not found');
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
        //initEdgeIdCounterFromGraph();
        console.log('✅ APX file imported successfully');
    } catch (error) {
        console.error('❌ Error importing APX:', error);
        alert('Error importing APX file. Please check the file format.');
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

        console.log('✅ JSON file imported successfully');
    } catch (error) {
        console.error('❌ Error importing JSON:', error);
        alert('Error importing JSON file. Please check the file format.');
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
        initializeInterface();

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
                console.error('❌ Unsupported file format:', extension);
                alert('Unsupported file format. Please select .apx or .json file.');
        }

    } catch (error) {
        if (error.name !== 'AbortError') {
            console.error('❌ Import error:', error);
        }
    }
}

// Fallback import using a hidden <input type=\"file\"> for browsers
// without File System Access API support
function importGraphFallback(e) {
    const file = e.target.files[0];
    if (!file) return;

    // clean interface
    initializeInterface();

    // Gets project-name dal filename
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
            alert('Unsupported file format. Please select .apx or .json file.');
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
                console.error('❌ Unsupported file extension:', extension);
                return;
        }

        // Writes file
        const writable = await fileHandle.createWritable();
        await writable.write(blob);
        await writable.close();

        console.log('✅ File exported:', fileName);

    } catch (error) {
        if (error.name !== 'AbortError') {
            console.error('❌ Export error:', error);
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
            console.log('Export cancelled');
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
    // Clear labelings lists (unfiltered & filtered)
    const selectedLi = document.querySelector('#labelings-area li.selected');
    if (selectedLi) {
        selectRow('labelings-area', selectedLi);
    }

    document.querySelectorAll('#labelings-area li.selected').forEach(li => {
        li.classList.remove('selected');
    });
    document.getElementById('labelings-area').innerHTML = '';

    document.getElementById("constraints-area").value = "";
    /* uncomment this when add Preferences
    document.getElementById("preferences-area").value = "";
    */

    document.querySelectorAll('#filtered-labelings-area li.selected').forEach(li => {
        li.classList.remove('selected');
    });
    document.getElementById('filtered-labelings-area').innerHTML = '';

    // Clear strength textarea
    const strengthArea = document.getElementById('strength-area');
    if (strengthArea) {
        strengthArea.value = '';
    }

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

// Serializes all <li> entries from the given <ol> (by id) into a multi-line string
function getLabelingsTextFromList(listId) {
    const ul = document.getElementById(listId);
    if (!ul) return '';
    const lines = [];
    ul.querySelectorAll('li').forEach(li => {
        const txt = li.textContent || '';
        const trimmed = txt.trim();
        if (trimmed) lines.push(trimmed);
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
        alert('No labelings to save.');
        return;
    }
    downloadTextFile('labelings.txt', content);
}

// Saves all filtered labelings to "filtered_labelings.txt"
function saveFilteredLabelings() {
    const content = getLabelingsTextFromList('filtered-labelings-area');
    if (!content) {
        alert('No filtered labelings to save.');
        return;
    }
    downloadTextFile('filtered_labelings.txt', content);
}

// Saves all strength to "strength.txt"
function saveStrength() {
    const content = document.getElementById('strength-area').value;
    if (!content) {
        alert('No strength to save.');
        return;
    }
    downloadTextFile('strength.txt', content);
}
