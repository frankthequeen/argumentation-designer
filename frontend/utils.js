// =================
// === CONSTANTS ===
// =================

// Color constants for nodes and edges
const NODE_COLOR_DEFAULT = "#1976d2";
const NODE_BORDER_COLOR_DEFAULT = "#145a86";
const EDGE_ATTACK_COLOR = "#b8263c";
const EDGE_SUPPORT_COLOR = "#1976d2";
const NODE_COLOR_IN = "#30b94d";
const NODE_BORDER_COLOR_IN = "#217c35";
const NODE_COLOR_OU = "#ce2222";
const NODE_BORDER_COLOR_OU = "#971919";
const NODE_COLOR_UN = "#ffba3d";
const NODE_BORDER_COLOR_UN = "#b6862c";
const GRADUAL_STRENGTH_0TO1 = [0, 0.036, 0.071, 0.107, 0.143, 0.179, 0.214, 0.25, 0.286, 0.321, 0.357, 0.393, 0.429, 0.464, 0.5, 0.536, 0.571, 0.607, 0.643, 0.679, 0.714, 0.75, 0.786, 0.821, 0.857, 0.893, 0.929, 0.964, 1];
const NODE_COLOR_0TO1 = ['#ce2222', '#d12c23', '#d53725', '#d84227', '#dc4d29', '#df582b', '#e3632d', '#e66e2f', '#ea7831', '#ed8333', '#f18e35', '#f49937', '#f8a439', '#fbaf3b', '#ffba3d', '#f0b93e', '#e1b93f', '#d2b940', '#c3b941', '#b5b942', '#a6b943', '#97b945', '#88b946', '#79b947', '#6bb948', '#5cb949', '#4db94a', '#3eb94b', '#30b94d'];
const NODE_BORDER_COLOR_0TO1 = ['#971919', '#99201a', '#9b281b', '#9d301d', '#9f381e', '#a23f1f', '#a44721', '#a64f22', '#a85723', '#aa5f25', '#ad6626', '#af6e27', '#b17629', '#b37e2a', '#b6862c', '#ab852c', '#a0842d', '#96832d', '#8b832e', '#80822f', '#76812f', '#6b8130', '#608031', '#567f31', '#4b7e32', '#407e33', '#367d33', '#2b7c34', '#217c35'];

// Validation regex for node ids (argument names) and descriptions
const VALID_ARGUMENT_REGEX = /^[a-zA-Z0-9]+$/;
const VALID_DESCRIPTION_REGEX = /^[a-zA-Z0-9\s.,;:!?()\-_'"]+$/;

// Max/min allowed lengths and ranges for node/edge attributes
const MAX_NODE_ARGUMENT_LENGTH = 50;
const MIN_NODE_WEIGHT = 0;
const MAX_NODE_WEIGHT = 1;
const MAX_NODE_DESCRIPTION_LENGTH = 500;
const MIN_EDGE_WEIGHT = 0;
const MAX_EDGE_WEIGHT = 1;

// User-facing error messages for validation failures
const ERR_NODE_DUPLICATE = "There is already an Argument with this Name.";
const ERR_NODE_EMPTY_ARGUMENT = "Argument Name cannot be empty.";
const ERR_NODE_LONG_ARGUMENT = `Argument Name is too long (max ${MAX_NODE_ARGUMENT_LENGTH}).`;
const ERR_NODE_INVALID_ARGUMENT_CHARS = "Name can only contain letters and numbers.";
const ERR_NODE_WEIGHT_RANGE = `Weight must be a number between ${MIN_NODE_WEIGHT} and ${MAX_NODE_WEIGHT}.`;
const ERR_NODE_LONG_DESCRIPTION = `Description is too long (max ${MAX_NODE_DESCRIPTION_LENGTH}).`;
const ERR_NODE_DESCRIPTION_INVALID_CHARS = "Description contains invalid characters: only letters, numbers, spaces and common punctuation are allowed.";
const ERR_EDGE_DUPLICATE = "There is already a Relationship of this type between the two Arguments.";
const ERR_EDGE_EMPTY_TYPE = "Relationship type must be selected.";
const ERR_EDGE_WEIGHT_RANGE = `Weight must be a number between ${MIN_EDGE_WEIGHT} and ${MAX_EDGE_WEIGHT}.`;
// Description / graph parsing error messages
const ERR_DESC_GENERIC_PREFIX = '⚠ Argumentation errors found:';
const ERR_DESC_UNKNOWN_SYNTAX = 'Unrecognized syntax';
const ERR_DESC_MISSING_SOURCE = 'Undefined source node';
const ERR_DESC_MISSING_TARGET = 'Undefined target node';



// ====================
// === GLOBAL UTILS ===
// ====================

// Global Cytoscape instance and HTML label plugin handle
let cy = null;
let htmlLabel = null;

// State flags used while interactively creating edges from the canvas
let edgeModeActive = false;
let edgeSourceNode = null;
let edgeTargetNode = null;

// Tracks whether the description textarea is being edited (to avoid auto-sync)
let isEditingDescription = false;

// Monotonic counter used to generate unique edge ids (rel_1, rel_2, ...)
let EDGE_ID_COUNTER = 1;

// Utility to generate a new edge id (e.g., "rel_12") based on EDGE_ID_COUNTER
function generateEdgeId() {
    return "rel_" + EDGE_ID_COUNTER++;
}

// Scans existing edges to initialize EDGE_ID_COUNTER from the current graph
function initEdgeIdCounterFromGraph() {
    let max = 0;
    cy.edges().forEach(edge => {
        const id = edge.id(); // es. "rel_12"
        const m = id.match(/^rel_(\d+)$/);
        if (m) {
            const n = parseInt(m[1], 10);
            if (!isNaN(n) && n > max) max = n;
        }
    });
    EDGE_ID_COUNTER = max + 1;
}

// Generic helper to trigger a download for a given Blob and file name
function downloadBlob(blob, fileName) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    console.log('✅ File downloaded:', fileName);
}



// ==================
// === VALIDATION ===
// ==================

// Validation helper to check node id (argument name) constraints
function validateArgumentName(argument) {
    if (!argument || argument.trim() === '') {
        return { valid: false, error: 'Argument name cannot be empty' };
    }

    if (argument.length > MAX_NODE_ARGUMENT_LENGTH) {
        return { valid: false, error: `Argument name too long (max ${MAX_NODE_ARGUMENT_LENGTH} characters)` };
    }

    if (!VALID_ARGUMENT_REGEX.test(argument)) {
        return { valid: false, error: `Invalid argument name "${argument}": only letters and numbers allowed` };
    }

    return { valid: true };
}

// Validation helper to check numeric range for node/edge weights
function validateWeight(weight) {
    if (weight === null || weight === undefined) {
        return { valid: true };
    }

    if (isNaN(weight)) {
        return { valid: false, error: `Invalid weight "${weight}": must be a number` };
    }

    if (weight < MIN_NODE_WEIGHT || weight > MAX_NODE_WEIGHT) {
        return { valid: false, error: `Weight ${weight} out of range (must be between ${MIN_NODE_WEIGHT} and ${MAX_NODE_WEIGHT})` };
    }

    return { valid: true };
}
