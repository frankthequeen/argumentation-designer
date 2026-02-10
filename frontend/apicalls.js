// =================
// === API CALLS ===
// =================

// Sends the current description and selected ext‑based semantics to the backend,
// receives labelings, and populates the labelings list in the UI
async function computeLabelingsFromAPI() {
    resetComputedResults();
    const semantics = document.getElementById('semantic-group-ext-select').value;
    const content = document.getElementById('desc-area').value;
    
    const errors = [];
    const fields = [];

    // Basic validation
    if (!content.trim()) {
        errors.push(ERR_DESC_EMPTY);
        fields.push('desc-area');
    }

    if (errors.length > 0) {
        showError('compute-semantic-group-ext-area-error', fields, errors);
        return;
    }

    try {
        setButtonLoading('compute-semantic-group-ext-btn', true);

        // API call
        const response = await fetch(API_PATH_COMPUTE_BAF, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ semantics, content })
        });

        // Manage HTTP errors
        if (!response.ok) {
            const txt = await response.text();
            showError('compute-semantic-group-ext-area-error', [], ERR_BACKEND + `${txt}`);
            return;
        }

        // Gets JSON
        const data = await response.json();
        if (!data.results || !Array.isArray(data.results)) {
            showError('compute-semantic-group-ext-area-error', [], ERR_BACKEND_RESPONSE_FORMAT);
            return;
        }

        // Writes labelings-area
        const labelingarea = document.getElementById('labelings-area');
        labelingarea.innerHTML = '';

        data.results.forEach(row => {
            const label = document.createElement('label');
            label.className = 'bookmark-item';
            label.title = row;
            label.onclick = function() { selectLabeling(this); };

            label.innerHTML = `
                <input name="labeling-checkbox" type="checkbox" class="bookmark-check">
                <span class="bookmark-text-wrapper">
                    <span class="bookmark-label">${row}</span>
                </span>
            `;
            labelingarea.appendChild(label);
        });

        document.getElementById('computed-labelings').style.display = 'block';
    } catch (err) {
        showError('compute-semantic-group-ext-area-error', [], ERR_NETWORK + `${err.message}`);
    } finally {
        setButtonLoading('compute-semantic-group-ext-btn', false);
    }
}

// Reads labelings already computed on the client, plus user constraints,
// calls the backend filter API, and fills the filtered‑labelings list
async function filterLabelingsFromAPI() {
    resetFilteredResults();
    const labelingsList = document.getElementById('labelings-area');
    const bookmarkLabels = labelingsList.querySelectorAll('.bookmark-label');
    
    const errors = [];
    const fields = [];
    
    let labelings = [];
    bookmarkLabels.forEach(span => {
        const text = span.textContent.trim();
        if (text) {
            // Formats labelings
            // e.g. <li>in(a) ou(b)</li> -> ["in(a)", "ou(b)"]
            labelings.push(text.split(' ').map(s => s.trim()).filter(s => s !== ''));
        }
    });

    // Basic validation
    if (labelings.length === 0) {
        errors.push(ERR_API_FILTER_LABELINGS_EMPTY);
    }

    const constraintsText = document.getElementById('constraints-area').value;
    const constraints = constraintsText.split('\n').map(s => s.trim()).filter(s => s !== '');

    if (constraints.length === 0) {
        errors.push(ERR_API_FILTER_CONSTRAINTS_EMPTY);
        fields.push('constraints-area');
    }

    /* TODO: to add Preferences in labelings filters -> uncomment this, then upgrade filterLabelingsFromAPI() in apicall.js
    const preferencesText = document.getElementById('preferences-area').value;
    const preferences = preferencesText.split('\n').map(s => s.trim()).filter(s => s !== '');

    if (preferences.length === 0) {
        errors.push(ERR_API_FILTER_PREFERENCES_EMPTY);
        fields.push('preferences-area');
    }
    */

    if (errors.length > 0) {
        showError('filter-area-error', fields, errors);
        return;
    }

    try {
        setButtonLoading('filter-btn', true);

        const response = await fetch(API_PATH_FILTER_LABELINGS, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ labelings: labelings, constraints: constraints })
        });

        if (!response.ok) {
            const errorData = await response.json();
            showError('filter-area-error', [], ERR_SERVER + `${errorData.error || response.statusText}`);
            return;
        }

        const data = await response.json();
        const filteredResults = data.results;

        // Writes filtered-labelings-area
        const filteredArea = document.getElementById('filtered-labelings-area');
        filteredArea.innerHTML = '';

        if (filteredResults && filteredResults.length > 0) {
            filteredResults.forEach(labellingArray => {
                const rowText = labellingArray.join(' ');
                
                const label = document.createElement('label');
                label.className = 'bookmark-item';
                label.title = rowText;
                label.onclick = function() { selectLabeling(this); };

                label.innerHTML = `
                    <input name="filtered-labeling-checkbox" type="checkbox" class="bookmark-check">
                    <span class="bookmark-text-wrapper">
                        <span class="bookmark-label">${rowText}</span>
                    </span>
                `;
                filteredArea.appendChild(label);
            });

            document.getElementById('filtered-labelings').style.display = 'flex';
        } else {
            showError('filter-area-error', ['constraints-area'], ERR_API_FILTER_LABELINGS_NO_RESULTS);
        }
    } catch (error) {
        showError('filter-labelings-area-error', [], ERR_NETWORK + `${error.message}`);
    } finally {
        setButtonLoading('filter-btn', false);
    }
}

// Sends the current description and selected gradual semantics (with params,
// gamma, epsilon) to the backend, receives node strengths and
// updates the strength textarea + node colors
async function computeStrengthFromAPI() {
    resetComputedResults();
    const content = document.getElementById('desc-area').value;
    const semantic = document.getElementById('semantic-gradual-select').value;
    const params = document.getElementById('semantic-gradual-params').value;

    const gammaVal = document.getElementById('semantic-gradual-gamma').value;
    const gamma = gammaVal ? parseFloat(gammaVal) : 0.5;

    const epsilonVal = document.getElementById('semantic-gradual-epsilon').value;
    const epsilon = epsilonVal ? parseFloat(epsilonVal) : 0.01;

    const errors = [];
    const fields = [];

    // Basic validation
    if (!content.trim()) {
        errors.push(ERR_DESC_EMPTY);
        fields.push('desc-area');
    }

    if (epsilonVal) {
        const e = parseFloat(epsilonVal);
        if (isNaN(e) || e < 0 || e > 1) {
            errors.push(ERR_API_GRADUAL_EPSILON_RANGE);
            fields.push('semantic-gradual-epsilon');
        }
    }

    if (gammaVal) {
        const g = parseFloat(gammaVal);
        if (isNaN(g) || g < 0 || g > 1) {
            errors.push(ERR_API_GRADUAL_GAMMA_RANGE);
            fields.push('semantic-gradual-gamma');
        }
    }

    if (errors.length > 0) {
        showError('compute-semantic-gradual-area-error', fields, errors);
        return;
    }

    try {
        setButtonLoading('compute-semantic-gradual-btn', true);

        // API call
        const response = await fetch(API_PATH_COMPUTE_QBAF, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                content: content,
                sem: semantic,
                params: params,
                gamma: gamma,
                epsilon: epsilon
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            showError('compute-semantic-gradual-area-error', [], ERR_SERVER + `${errorData.error || response.statusText}`);
            return;
        }

        const data = await response.json();

        // Writes strength-area and colors nodes
        if (data.results && Array.isArray(data.results)) {
            const formattedResults = data.results.join('\n');
            document.getElementById('strength-area').value = formattedResults;

            document.getElementById('computed-strength').style.display = 'flex';
            colorNodesByStrength();
        } else {
            showError('compute-semantic-gradual-area-error', [], ERR_BACKEND_RESPONSE_FORMAT);
        }

    } catch (error) {
        showError('compute-semantic-gradual-area-error', [], ERR_NETWORK + `${error.message}`);
    } finally {
        setButtonLoading('compute-semantic-gradual-btn', false);
    }
}



// =============================
// === LABELINGS INTERACTION ===
// =============================

// Handles click on a labeling row (original or filtered)
// - Toggles selection
// - Syncs selection across the two lists
// - Applies visual highlighting to nodes in Cytoscape
function selectLabeling(clickedLabel) {
    const checkbox = clickedLabel.querySelector('input[type="checkbox"]');
    const isNowChecked = checkbox.checked;
    const labelingText = clickedLabel.querySelector('.bookmark-label').textContent.trim();
    
    // Unselects all checkbox
    document.querySelectorAll('#labelings-area input, #filtered-labelings-area input')
        .forEach(cb => cb.checked = false);

    if (isNowChecked) {
        // Selects row in other list
        const allItems = document.querySelectorAll('.bookmark-item');
        allItems.forEach(item => {
            const itemText = item.querySelector('.bookmark-label').textContent.trim();
            if (itemText === labelingText) {
                item.querySelector('input').checked = true;
            }
        });
        
        // Colors nodes based to selected labelings
        colorNodesByLabeling(labelingText);
    } else {
        // Un-colors nodes
        colorNodesByLabeling(null);
    }
}

// Colors nodes based on IN/OUT/UNDEC
function colorNodesByLabeling(labelingText) {
    // Reset colors
    cy.nodes().forEach(node => {
        node.style('background-color', NODE_COLOR_DEFAULT);
        node.style('border-color', NODE_BORDER_COLOR_DEFAULT);
    });

    // Done if no labelings are selected
    if (!labelingText) return;

    // Gets all the in(X), ou(X), un(X)
    const matchesIn = [...labelingText.matchAll(/in\(([^)]+)\)/g)].map(m => m[1]);
    const matchesOu = [...labelingText.matchAll(/ou\(([^)]+)\)/g)].map(m => m[1]);
    const matchesUn = [...labelingText.matchAll(/un\(([^)]+)\)/g)].map(m => m[1]);

    const applyColor = (args, bgColor, borderColor) => {
        args.forEach(argName => {
            const node = cy.getElementById(argName.toLowerCase());
            if (node.length > 0) {
                node.style({
                    'background-color': bgColor,
                    'border-color': borderColor
                });
            }
        });
    };

    // IN nodes are Green
    applyColor(matchesIn, NODE_COLOR_IN, NODE_BORDER_COLOR_IN);
    // OUT nodes are Red
    applyColor(matchesOu, NODE_COLOR_OU, NODE_BORDER_COLOR_OU);
    // UNDEC nodes are Yellow
    applyColor(matchesUn, NODE_COLOR_UN, NODE_BORDER_COLOR_UN);
}

// Colors nodes based on strength
function colorNodesByStrength() {
    isEditingDescription = true;

    // Resets colors
    cy.nodes().forEach(node => {
        node.style('background-color', NODE_COLOR_DEFAULT);
        node.style('border-color', NODE_BORDER_COLOR_DEFAULT);
        node.data('strength', '');
    });

    const lines = document.getElementById('strength-area').value.split('\n');

    lines.forEach(line => {
        const trimmed = line.trim();
        if (!trimmed) return;

        // Match pattern id:value
        const match = trimmed.match(/^([a-zA-Z0-9]+):([0-9]*\.?[0-9]+)$/);
        if (!match) return;

        const nodeId = match[1].toLowerCase();
        const strengthVal = parseFloat(match[2]);
        if (isNaN(strengthVal) || strengthVal < 0 || strengthVal > 1) return;

        let idx = GRADUAL_STRENGTH_0TO1.length - 1;
        for (let i = 0; i < GRADUAL_STRENGTH_0TO1.length; i++) {
            if (strengthVal <= GRADUAL_STRENGTH_0TO1[i]) {
                idx = i;
                break;
            }
        }

        const node = cy.getElementById(nodeId);
        if (node.length > 0) {
            node.style('background-color', NODE_COLOR_0TO1[idx]);
            node.style('border-color', NODE_BORDER_COLOR_0TO1[idx]);

            node.data('strength', strengthVal);
        }
    });

    isEditingDescription = false;
}
