// =================
// === API CALLS ===
// =================

// Sends the current description and selected ext‑based semantics to the backend,
// receives labelings, and populates the labelings list in the UI
async function computeLabelingsFromAPI() {
    const semantics = document.getElementById('semantic-group-ext-select').value;
    const content = document.getElementById('desc-area').value;

    try {
        // API call
        const response = await fetch('/api/api/computeBAF', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ semantics, content })
        });

        // Manage HTTP errors
        if (!response.ok) {
            const txt = await response.text();
            alert('Backend error: ' + txt);
            return;
        }

        // Gets JSON
        const data = await response.json();
        if (!data.results || !Array.isArray(data.results)) {
            alert('Invalid backend response');
            return;
        }

        // Writes labelings-area
        const ul = document.getElementById('labelings-area');
        ul.innerHTML = '';

        data.results.forEach(row => {
            const li = document.createElement('li');
            li.textContent = row;
            li.onclick = function () { selectRow('labelings-area', this); };
            ul.appendChild(li);
        });
    } catch (err) {
        alert('Errore di rete/API: ' + err);
    }
}

// Reads labelings already computed on the client, plus user constraints,
// calls the backend filter API, and fills the filtered‑labelings list
async function filterLabelingsFromAPI() {
    const labelingsList = document.getElementById('labelings-area');
    const listItems = labelingsList.getElementsByTagName('li');

    // Formats labelings
    // Es. <li>in(a) ou(b)</li> -> ["in(a)", "ou(b)"]
    const labelings = [];
    for (let li of listItems) {
        const args = li.textContent.split(' ').map(s => s.trim()).filter(s => s !== "");
        labelings.push(args);
    }

    const constraintsText = document.getElementById('constraints-area').value;
    const constraints = constraintsText.split('\n').map(s => s.trim()).filter(s => s !== "");

    // Client-side validation
    if (labelings.length === 0) {
        alert("No labelings to filter. Please compute semantics first.");
        return;
    }
    if (constraints.length === 0) {
        alert("No constraints provided. Please enter constraints in the text area.");
        return;
    }

    try {
        // API call
        const response = await fetch('/api/api/filterLabelings', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                labelings: labelings,
                constraints: constraints
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `Server error: ${response.status}`);
        }

        const data = await response.json();
        const filteredResults = data.results; // Array of array of strings

        // Writes filtered-labelings-area
        const filteredList = document.getElementById('filtered-labelings-area');
        filteredList.innerHTML = '';

        if (filteredResults && filteredResults.length > 0) {
            filteredResults.forEach(labellingArray => {
                const li = document.createElement('li');
                li.textContent = labellingArray.join(' ');
                li.setAttribute('onclick', "selectRow('filtered-labelings-area', this)");
                filteredList.appendChild(li);
            });
        } else {
            // Optional
            // alert("No labelings satisfy the provided constraints.");
        }

    } catch (error) {
        console.error("Error filtering labelings:", error);
        alert("Error filtering labelings: " + error.message);
    }
}

// Sends the current description and selected gradual semantics (with params,
// gamma, epsilon) to the backend, receives node strengths and
// updates the strength textarea + node colors
async function computeStrengthFromAPI() {
    const content = document.getElementById('desc-area').value;
    const semantic = document.getElementById('semantic-gradual-select').value;
    const params = document.getElementById('semantic-gradual-params').value;

    const gammaVal = document.getElementById('semantic-gradual-gamma').value;
    const gamma = gammaVal ? parseFloat(gammaVal) : 0.5;

    const epsilonVal = document.getElementById('semantic-gradual-epsilon').value;
    const epsilon = epsilonVal ? parseFloat(epsilonVal) : 0.01;

    // Basic validation
    if (!content.trim()) {
        alert("Description area is empty. Please define a QBAF first.");
        return;
    }

    try {
        // API call
        const response = await fetch('/api/api/computeQBAF', {
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
            throw new Error(errorData.error || `Server error: ${response.status}`);
        }

        const data = await response.json();

        // Writes strength-area and colors nodes
        if (data.results && Array.isArray(data.results)) {
            const formattedResults = data.results.join('\n');
            document.getElementById('strength-area').value = formattedResults;
            colorNodesByStrength();
        } else {
            console.warn("Unexpected response format:", data);
            alert("Received unexpected data format from server.");
        }

    } catch (error) {
        console.error("Error computing strength:", error);
        alert("Error computing strength: " + error.message);
    }
}




// =============================
// === LABELINGS INTERACTION ===
// =============================

// Handles click on a labeling row (original or filtered)
// - Toggles selection
// - Syncs selection across the two lists
// - Applies visual highlighting to nodes in Cytoscape
function selectRow(area, el) {
    const isAlreadySelected = el.classList.contains('selected');

    // Selects all rows in this list
    document.querySelectorAll(`#${area} li`).forEach(li => li.classList.remove('selected'));

    let otherArea = (area === "labelings-area" ? "filtered-labelings-area" : "labelings-area");
    let text = el.textContent.trim();

    if (isAlreadySelected) {
        // Unselects other list
        document.querySelectorAll(`#${otherArea} li`).forEach(li => {
            if (li.textContent.trim() === text) li.classList.remove('selected');
        });

        colorNodesByLabeling();
        return;
    }

    // Selects this row
    el.classList.add('selected');

    // Selects row in other list
    let found = Array.from(document.querySelectorAll(`#${otherArea} li`)).find(li => li.textContent.trim() === text);
    if (found) {
        document.querySelectorAll(`#${otherArea} li`).forEach(li => li.classList.remove('selected'));
        found.classList.add('selected');
    } else {
        document.querySelectorAll(`#${otherArea} li`).forEach(li => li.classList.remove('selected'));
    }

    colorNodesByLabeling();
}

// Colors nodes based on IN/OUT/UNDEC
function colorNodesByLabeling() {
    const selectedLi = document.querySelector('#labelings-area li.selected');

    // Reset colors
    cy.nodes().forEach(node => {
        node.style('background-color', NODE_COLOR_DEFAULT);
        node.style('border-color', NODE_BORDER_COLOR_DEFAULT);
    });

    // No row selected
    if (!selectedLi) return;

    const line = selectedLi.textContent;

    // Gets all the in(X), ou(X), un(X)
    const matchesIn = [...line.matchAll(/in\(([^)]+)\)/g)].map(m => m[1]);
    const matchesOu = [...line.matchAll(/ou\(([^)]+)\)/g)].map(m => m[1]);
    const matchesUn = [...line.matchAll(/un\(([^)]+)\)/g)].map(m => m[1]);

    // Helper for case-insensitive ID
    function findNodeCaseInsensitive(argName) {
        return cy.getElementById(argName.toLowerCase());
    }

    // IN nodes are Green
    matchesIn.forEach(argName => {
        const node = findNodeCaseInsensitive(argName);
        if (node.length > 0) {
            node.style({
                'background-color': NODE_COLOR_IN,
                'border-color': NODE_BORDER_COLOR_IN
            });
        }
    });

    // OUT nodes are Red
    matchesOu.forEach(argName => {
        const node = findNodeCaseInsensitive(argName);
        if (node.length > 0) {
            node.style({
                'background-color': NODE_COLOR_OU,
                'border-color': NODE_BORDER_COLOR_OU
            });
        }
    });

    // UNDEC nodes are Yellow
    matchesUn.forEach(argName => {
        const node = findNodeCaseInsensitive(argName);
        if (node.length > 0) {
            node.style({
                'background-color': NODE_COLOR_UN,
                'border-color': NODE_BORDER_COLOR_UN
            });
        }
    });
}

// Colors nodes based on strength
function colorNodesByStrength() {
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
}
