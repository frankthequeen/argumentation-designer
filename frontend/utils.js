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

// Default values
const DEFAULT_LAYOUT = "cose";
const DEFAULT_SEMANTIC_EXT = "grounded";
const DEFAULT_SEMANTIC_GRADUAL = "drl";
const DEFAULT_VALUE_EPSILON = "0.01";
const DEFAULT_GRADUAL_PARAMS = "sum";
const DEFAULT_VALUE_GAMMA = "1";

// API paths and params
const API_PATH_COMPUTE_BAF = '/api/api/computeBAF';
const API_PATH_FILTER_LABELINGS = '/api/api/filterLabelings';
const API_PATH_COMPUTE_QBAF = '/api/api/computeQBAF';
const MIN_EPSILON = 0;
const MAX_EPSILON = 1;
const MIN_GAMMA = 0;
const MAX_GAMMA = 1;

// File IO errors
const ERR_FILE_IMPORT = "• An error occurred during file import.";
const ERR_FILE_IMPORT_APX = "• Error importing APX file. Please check the file format.";
const ERR_FILE_IMPORT_JSON = "• Error importing JSON file. Please check the file format.";
const ERR_FILE_IMPORT_UNSUPPORTED = "• Unsupported file format. Please select .apx or .json.";
const ERR_EMPTY_LABELING = "• No labelings to save.";
const ERR_EMPTY_FILTERED_LABELING = "• No filtered labelings to save.";
const ERR_EMPTY_STRENGTH = "• No strength values to save.";

// Description / graph parsing error messages
const ERR_GENERIC = '• An unexpected error occurred: ';
const ERR_DESC_EMPTY = "• Argumentation framework is empty. Please define a BAF/QBAF first.";
const ERR_DESC_GENERIC_PREFIX = '• Argumentation framework errors found:';
const SUBERR_NODE_EMPTY_ARGUMENT = "Argument Name cannot be empty.";
const SUBERR_NODE_LONG_ARGUMENT = `Argument Name is too long (max ${MAX_NODE_ARGUMENT_LENGTH} characters).`;
const SUBERR_NODE_INVALID_ARGUMENT_CHARS = "Argument Name can only contain letters and numbers.";
const SUBERR_WEIGHT_CHARS = "Weight must be a number";
const SUBERR_NODE_WEIGHT_RANGE = `Weight must be a number between ${MIN_NODE_WEIGHT} and ${MAX_NODE_WEIGHT}.`;
const SUBERR_EDGE_WEIGHT_RANGE = `Weight must be a number between ${MIN_EDGE_WEIGHT} and ${MAX_EDGE_WEIGHT}.`;

// User-facing error messages for validation failures
const ERR_NODE_DUPLICATE = "• There is already an Argument with this Name.";
const ERR_NODE_EMPTY_ARGUMENT = "• " + SUBERR_NODE_EMPTY_ARGUMENT;
const ERR_NODE_LONG_ARGUMENT = "• " + SUBERR_NODE_LONG_ARGUMENT;
const ERR_NODE_INVALID_ARGUMENT_CHARS = "• " + SUBERR_NODE_INVALID_ARGUMENT_CHARS;
const ERR_NODE_WEIGHT_RANGE = "• " + SUBERR_NODE_WEIGHT_RANGE;
const ERR_NODE_LONG_DESCRIPTION = `• Description is too long (max ${MAX_NODE_DESCRIPTION_LENGTH}).`;
const ERR_NODE_DESCRIPTION_INVALID_CHARS = "• Description contains invalid characters: only letters, numbers, spaces and common punctuation are allowed.";
const ERR_EDGE_DUPLICATE = "• There is already a Relationship of this type between the two Arguments.";
const ERR_EDGE_EMPTY_TYPE = "• Relationship type must be selected.";
const ERR_EDGE_WEIGHT_RANGE = "• " + SUBERR_EDGE_WEIGHT_RANGE;

// API calls errors
const ERR_SERVER = '• Server error: ';
const ERR_NETWORK = '• Network error: ';
const ERR_BACKEND = '• Backend error: ';
const ERR_BACKEND_RESPONSE_FORMAT = "• Received unexpected data format from server.";
const ERR_API_FILTER_LABELINGS_EMPTY = "• No labelings to filter. Please compute semantics first.";
const ERR_API_FILTER_CONSTRAINTS_EMPTY = "• Please enter at least one constraint (e.g., in(a)).";
const ERR_API_FILTER_PREFERENCES_EMPTY = "• Please enter at least one preference (e.g., in(a) > in(b)).";
const ERR_API_FILTER_LABELINGS_NO_RESULTS = "• No labelings satisfy the provided constraints.";
const ERR_API_GRADUAL_EPSILON_RANGE = `• Epsilon must be a number between ${MIN_EPSILON} and ${MAX_EPSILON}.`;
const ERR_API_GRADUAL_GAMMA_RANGE = `• Gamma must be a number between ${MIN_GAMMA} and ${MAX_GAMMA}.`;



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

// Tracks the last graph description that was successfully synchronized with the UI
let lastAppliedDescription = ""; 

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
        const id = edge.id(); // e.g. "rel_12"
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
}



// ==================
// === VALIDATION ===
// ==================

// Validation helper to check node id (argument name) constraints
function validateArgumentName(argument) {
    if (!argument || argument.trim() === '') {
        return { valid: false, error: SUBERR_NODE_EMPTY_ARGUMENT };
    }

    if (argument.length > MAX_NODE_ARGUMENT_LENGTH) {
        return { valid: false, error: SUBERR_NODE_LONG_ARGUMENT };
    }

    if (!VALID_ARGUMENT_REGEX.test(argument)) {
        return { valid: false, error: SUBERR_NODE_INVALID_ARGUMENT_CHARS };
    }

    return { valid: true };
}

// Validation helper to check numeric range for node/edge weights
function validateWeight(weight, nodeOrEdge) {
    if (weight === null || weight === undefined) {
        return { valid: true };
    }

    if (isNaN(weight)) {
        return { valid: false, error: SUBERR_WEIGHT_CHARS };
    }

    if (nodeOrEdge === "node" && (weight < MIN_NODE_WEIGHT || weight > MAX_NODE_WEIGHT)) {
        return { valid: false, error: SUBERR_NODE_WEIGHT_RANGE };
    }

    if (nodeOrEdge === "edge" && (weight < MIN_EDGE_WEIGHT || weight > MAX_EDGE_WEIGHT)) {
        return { valid: false, error: SUBERR_EDGE_WEIGHT_RANGE };
    }

    return { valid: true };
}
