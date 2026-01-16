# <img src="frontend/unical-argumentation-designer.png" alt="Argumentation Designer">

# Argumentation Designer

## Table of Contents

1. [Project Overview and Architecture](#1-project-overview-and-architecture)
2. [Project Structure, Requirements and Setup](#2-project-structure-requirements-and-setup)
3. [Deployment](#3-deployment)
4. [Frontend Components](#4-frontend-components)
5. [Backend API](#5-backend-api)
6. [Data Formats](#6-data-formats)
7. [Graph Rendering and Styling](#7-graph-rendering-and-styling)
8. [Extending the Tool](#8-extending-the-tool)
9. [Implementing Predisposed Features](#9-implementing-predisposed-features)
10. [Testing and Debugging](#10-testing-and-debugging)
11. [License and Credits](#11-license-and-credits)

# 1. Project Overview and Architecture

## Description and Goals

The **Argumentation Designer** is a web-based tool for building, visualizing, and analyzing abstract and quantitative argumentation frameworks. It provides an interactive graph editor that allows users to model arguments and relationships (attacks and supports) visually, and to compute both extension-based semantics (following Dung's approach) and gradual semantics for quantitative frameworks.

The main goals of the project are:
- Provide an accessible, no-installation tool for researchers, educators, and students working with formal argumentation
- Support multiple argumentation framework types (AF, BAF, WAF, QBAF, WBAF, WQBAF)
- Combine visual graph editing with textual APX-like descriptions
- Integrate with backend reasoning services for semantic computation
- Enable import/export of frameworks in standard formats

## Technologies

### Frontend
- **HTML5/CSS3/JavaScript**: Core web technologies, no build process required
- **Cytoscape.js**: Graph visualization and manipulation library
- **cytoscape-html-label**: Plugin for rendering HTML labels inside nodes
- **html2canvas**: Fallback library for PNG export when native methods are unavailable

### Backend
- **Python 3.x**: Backend programming language
- **Flask**: Lightweight web framework for REST API endpoints
- **Gunicorn**: WSGI HTTP server for production deployment (4 workers)
- **Clingo**: Answer Set Programming solver for computing extension-based semantics
- **NumPy**: Numerical library for gradual semantics computation

### Infrastructure
- **Apache 2.4**: Web server and reverse proxy
- **systemd**: Service manager for Gunicorn process
- **CORS**: Cross-Origin Resource Sharing configuration for API access

## System Architecture

The Argumentation Designer follows a **client-server architecture** with clear separation between the presentation layer (frontend) and the reasoning layer (backend).

```
┌─────────────────────────────────────────┐
│          Web Browser (Client)           │
│  ┌───────────────────────────────────┐  │
│  │   HTML/CSS Interface              │  │
│  │   - Graph workspace (Cytoscape)   │  │
│  │   - Sidebar controls              │  │
│  │   - Modal dialogs                 │  │
│  └───────────────────────────────────┘  │
│  ┌───────────────────────────────────┐  │
│  │   JavaScript Application          │  │
│  │   - Event handlers                │  │
│  │   - Graph synchronization         │  │
│  │   - Import/Export logic           │  │
│  │   - API client                    │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
                    │
                    │ HTTP/HTTPS (JSON)
                    ▼
┌─────────────────────────────────────────┐
│       Apache Web Server (Proxy)         │
│  - Serves static files (/var/www/html)  │
│  - Proxies /api/* to Flask backend      │
└─────────────────────────────────────────┘
                    │
                    │ http://127.0.0.1:5000
                    ▼
┌─────────────────────────────────────────┐
│    Gunicorn WSGI Server (4 workers)     │
│  ┌───────────────────────────────────┐  │
│  │   Flask Application (solveBAF.py) │  │
│  │   - Extension-based semantics     │  │
│  │   - Gradual semantics             │  │
│  │   - Constraint filtering          │  │
│  └───────────────────────────────────┘  │
│  ┌───────────────────────────────────┐  │
│  │   Reasoning Engines               │  │
│  │   - Clingo (extension semantics)  │  │
│  │   - NumPy (gradual semantics)     │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

### Frontend Components

The frontend is organized around the following main components:

- **Graph workspace**: Central canvas powered by Cytoscape.js where nodes (arguments) and edges (attacks/supports) are rendered and manipulated
- **Sidebar**: Right panel containing project management controls, textual description area, layout selector, and semantic computation panels
- **Modal dialogs**: Pop-up windows for editing individual arguments (name, weight, description) and relationships (type, weight)
- **Context menus**: Right-click menus on nodes and edges for quick access to Edit and Delete operations
- **Import/Export handlers**: File I/O logic for APX, JSON, and PNG formats

### Backend Services

The backend exposes RESTful endpoints that accept JSON-encoded argumentation frameworks and return computed results:

- **Extension-based semantics service**: Receives an AF/BAF description and a semantic type (grounded, complete, preferred, stable), invokes Clingo with appropriate ASP rules, and returns all labelings
- **Gradual semantics service**: Receives a QBAF description, semantic algorithm choice (DReLU, DDReLU, Euler, DFQuAD, MLP-based, Quadratic Energy), and parameters (epsilon, aggregation function, gamma), computes the final strength values iteratively, and returns the strength of each argument
- **Constraint filtering service**: Takes a set of labelings and user-defined logical constraints (supporting AND, OR, NOT operators), filters the labelings accordingly, and returns the subset that satisfies all constraints

The backend uses Clingo for ASP-based computation of extension semantics and custom Python algorithms for gradual semantics computation.

### Communication Flow

1. **User creates/edits graph** → Frontend updates Cytoscape instance and regenerates APX-like textual description
2. **User requests semantic computation** → Frontend packages current framework as JSON and sends HTTP POST to backend endpoint
3. **Apache receives request** → Proxies to Gunicorn on localhost:5000
4. **Flask processes request** → Invokes Clingo or Python computation module, runs reasoning algorithm
5. **Backend returns results** → Sends JSON response with labelings or strengths through Apache
6. **Frontend displays results** → Parses response, updates result list, applies color coding to graph nodes

All communication uses JSON over HTTP(S), making the system modular and allowing the frontend and backend to evolve independently. The Apache reverse proxy configuration ensures that static files and API requests are handled appropriately, while Gunicorn manages multiple worker processes for concurrent request handling.

The Argumentation Designer follows a **client-server architecture** with clear separation between the presentation layer (frontend) and the reasoning layer (backend).

# 2. Project Structure, Requirements and Setup

## Repository Structure

The project is organized into two main directories: frontend static files and backend Flask application.

```
argumentation-designer/
argumentation-designer/
├── frontend/                    # Static HTML/CSS/JS files
│   ├── index.html              # Main application page
│   ├── people.html             # Team members page
│   ├── publications.html       # Publications page
│   ├── fairstyle.css           # Application styles
│   ├── init.js                 # Application initialization entry point
│   ├── utils.js                # Validation, constants, helpers
│   ├── graph.js                # Cytoscape core, graph operations
│   ├── interface.js            # UI controls, modals, event handlers
│   ├── fileio.js               # Import/export logic
│   ├── apicalls.js             # Backend API communication
│   ├── unical-argumentation-designer.png  # Logo Argumentation Designer
│   ├── unical-logo-white.png   # Logo Università della Calabria
│   └── people/                 # Team member photos
│       └── *.jpg / *.png       # Individual photos
│
├── backend/                     # Flask backend application
│   ├── solveBAF.py             # Main Flask app with all endpoints
│   ├── sem/                    # ASP semantic definition files
│   │   ├── grounded.dl         # Grounded semantics rules
│   │   ├── complete.dl         # Complete semantics rules
│   │   ├── preferred.dl        # Preferred semantics rules
│   │   └── stable.dl           # Stable semantics rules
│   ├── apx_temp/               # Temporary directory for APX files
│   ├── requirements.txt        # Python dependencies
│   └── venv/                   # Python virtual environment (created during setup)
│
├── deployment/                  # Production deployment configuration
│   ├── fair.conf               # Apache virtual host configuration
│   └── gunicorn.service        # systemd service unit for Gunicorn
│
└── README.md                    # Technical documentation
```

## Frontend Dependencies

The frontend requires no build process or local installation. All dependencies are loaded via CDN:

- **Cytoscape.js** (3.x): Graph visualization library
- **cytoscape-html-label**: Plugin for HTML labels inside nodes
- **html2canvas**: Library for canvas-based screenshot export

These libraries are referenced directly in `index.html` via `<script>` tags pointing to CDN URLs.

**Browser Compatibility:**
- Chrome 90+ (recommended)
- Firefox 88+
- Edge 90+
- Safari 14+

Modern browsers with ES6 support and Canvas API are required.

## Backend Dependencies

The backend is a Python Flask application with the following dependencies:

```
Flask>=2.0.0
clingo>=5.5.0
numpy>=1.21.0
gunicorn>=20.1.0
```

Create a `requirements.txt` file with the above content for easy installation.

**System Requirements:**
- Python 3.8 or higher
- Clingo ASP solver (usually installed via pip or system package manager)
- Linux/Unix environment (tested on Ubuntu 20.04+)

## Installation Steps

### 1. Clone the Repository
```
git clone https://github.com/your-org/argumentation-designer.git
cd argumentation-designer
```

### 2. Frontend Setup
Copy the frontend files to your web server document root:
```
sudo cp -r frontend/* /var/www/html/
```


No further configuration is needed for the frontend.

### 3. Backend Setup

Navigate to the backend directory and create a Python virtual environment:
```
cd backend
python3 -m venv venv
source venv/bin/activate
```

Install Python dependencies:
```
pip install -r requirements.txt
```

Create the temporary directory for APX files:
```
mkdir -p apx_temp
```


Ensure the semantic definition files are present in the `sem/` directory. These files contain the ASP rules for each semantic type (grounded, complete, preferred, stable).

### 4. Configuration

The Flask application uses the following default paths (defined in `solveBAF.py`):

- **UPLOAD_FOLDER**: `/var/www/compute/apx_temp` (temporary APX files)
- **Semantics directory**: `./sem/` (relative to backend directory)

If deploying to a different location, update these paths in `solveBAF.py`:

```python
UPLOAD_FOLDER = '/var/www/compute/apx_temp'  # Update if needed
```

### 5. Running the Development Server
For local development and testing, run Flask directly:

```bash
python solveBAF.py
```

The application will start on http://0.0.0.0:5000.

Note: This is suitable only for development. For production, use Gunicorn (see Deployment section).

### 6. Testing the Setup
Test the backend API with curl:
```bash
curl -X POST http://localhost:5000/api/computeBAF \
  -H "Content-Type: application/json" \
  -d '{"content": "arg(a). arg(b). att(a,b).", "semantics": "grounded"}'
```

Expected response:
```json
{
  "results": ["in(a), ou(b)"]
}
```

Open the frontend in your browser (e.g., http://localhost/ if served by Apache) and verify that you can create nodes, edges, and compute semantics.

**Environment Variables**

Currently the application does not use environment variables for configuration. All paths and settings are defined directly in solveBAF.py. For production deployments, consider externalizing configuration using environment variables or a config file.

**File Permissions**

Ensure the web server user (typically www-data on Ubuntu/Debian) has write permissions to the temporary directory:

```bash
sudo chown -R www-data:www-data /var/www/compute/apx_temp
sudo chmod 755 /var/www/compute/apx_temp
```

## Common Setup Issues

### Clingo Installation

If `pip install clingo` fails, try installing via system package manager:

```bash
# Ubuntu/Debian
sudo apt-get install gringo

# Or download from potassco.org
```

### CORS Issues

If the frontend cannot connect to the backend API, ensure CORS is properly configured. The Flask application should include CORS headers. You can add Flask-CORS:

```bash
pip install flask-cors
```

Then in `solveBAF.py`:

```python
from flask_cors import CORS
app = Flask(__name__)
CORS(app)
```

Alternatively, ensure Apache proxy configuration includes proper CORS headers in `fair.conf`.

### Port Already in Use

If port 5000 is already occupied, either:
- Stop the conflicting service
- Change the port in `solveBAF.py`: `app.run(host='0.0.0.0', port=5001)`
- Update the Apache proxy configuration accordingly

### NumPy Compilation Errors

On some systems, NumPy may require compilation tools:

```bash
sudo apt-get install python3-dev build-essential
pip install numpy
```

### ASP Semantic Files Missing

If computation fails with "File semantica [...] non trovato", ensure all `.dl` files are present in the `sem/` directory:

```bash
ls backend/sem/
# Should show: grounded.dl complete.dl preferred.dl stable.dl
```

These files must be created manually or copied from the repository semantic rules.

## Browser Compatibility and Server Requirements

### Client Requirements

The frontend application requires a modern web browser with the following features:

**Supported Browsers:**
- Google Chrome 90+ (recommended for best performance)
- Mozilla Firefox 88+
- Microsoft Edge 90+
- Safari 14+
- Opera 76+

**Required Browser Features:**
- JavaScript ES6+ support
- HTML5 Canvas API
- Fetch API for HTTP requests
- Local Storage API (for project state)
- File API (for import/export operations)

**Recommended Screen Resolution:**
- Minimum: 1280x720
- Recommended: 1920x1080 or higher

### Server Requirements

**For Backend Deployment:**
- Linux distribution (Ubuntu 20.04+ or Debian 10+ recommended)
- Python 3.8 or higher
- 2 GB RAM minimum (4 GB recommended for larger frameworks)
- 1 GB free disk space
- Network access for API communication

**Web Server:**
- Apache 2.4+ with mod_proxy enabled
- Alternative: Nginx 1.18+ with proxy configuration

**WSGI Server:**
- Gunicorn 20.1+ (configured with 4 workers by default)
- Alternative: uWSGI

**External Dependencies:**
- Clingo 5.5+ (Answer Set Programming solver)
- NumPy 1.21+ (numerical computation library)

### Network Requirements

- Open port 80 (HTTP) or 443 (HTTPS) for frontend access
- Internal port 5000 for Gunicorn (not exposed externally)
- Outbound HTTPS access for CDN resources (Cytoscape.js, html2canvas)

### Performance Considerations

- For graphs with 50+ nodes, allow 2-5 seconds for semantic computation
- For graphs with 100+ nodes, computation time may increase significantly
- Gunicorn worker count can be adjusted based on expected concurrent users
- Consider increasing worker count for high-traffic deployments

# 3. Deployment

## Production Setup with Gunicorn and systemd

For production environments, the Flask application should run as a systemd service using Gunicorn as the WSGI server.

### Create systemd Service Unit

Create the file `/etc/systemd/system/gunicorn.service`:

```ini
[Unit]
Description=Gunicorn instance to serve Flask app
After=network.target

[Service]
User=www-data
Group=www-data
WorkingDirectory=/var/www/compute
ExecStart=/var/www/compute/venv/bin/gunicorn --workers 4 --bind 127.0.0.1:5000 solveBAF:app

[Install]
WantedBy=multi-user.target
```

**Configuration Notes:**
- `--workers 4`: Number of worker processes (adjust based on CPU cores and load)
- `--bind 127.0.0.1:5000`: Internal binding, not exposed externally
- `solveBAF:app`: Module name and Flask app instance

### Enable and Start the Service

```bash
sudo systemctl daemon-reload
sudo systemctl enable gunicorn.service
sudo systemctl start gunicorn.service
sudo systemctl status gunicorn.service
```

### Service Management Commands

```bash
# Restart after code changes
sudo systemctl restart gunicorn.service

# Stop the service
sudo systemctl stop gunicorn.service

# View logs
sudo journalctl -u gunicorn.service -f
```

## Apache Configuration

Apache acts as a reverse proxy, serving static frontend files and forwarding API requests to Gunicorn.

### Enable Required Modules

```bash
sudo a2enmod proxy
sudo a2enmod proxy_http
sudo a2enmod headers
```

### Virtual Host Configuration

Create or edit `/etc/apache2/sites-available/fair.conf`:

```apache
<VirtualHost *:80>
    ServerName argumentation.dimes.unical.it
    
    # Serve static frontend files
    DocumentRoot /var/www/html
    
    <Directory /var/www/html>
        Options Indexes FollowSymLinks
        AllowOverride None
        Require all granted
    </Directory>
    
    # Reverse proxy for API requests
    ProxyPreserveHost On
    ProxyPass /api http://127.0.0.1:5000/api nocanon
    ProxyPassReverse /api http://127.0.0.1:5000/api
    ProxyPassReverseCookieDomain 127.0.0.1 argumentation.dimes.unical.it
    
    # Protect backend directory from direct access
    <Directory /var/www/compute>
        Require all denied
    </Directory>
    
    ErrorLog ${APACHE_LOG_DIR}/error.log
    CustomLog ${APACHE_LOG_DIR}/access.log combined
</VirtualHost>
```

### Enable Site and Restart Apache

```bash
sudo a2ensite fair.conf
sudo systemctl restart apache2
```

## HTTPS/SSL Configuration (Optional but Recommended)

For production deployments, enable HTTPS using Let's Encrypt:

```bash
sudo apt-get install certbot python3-certbot-apache
sudo certbot --apache -d argumentation.dimes.unical.it
```

Certbot will automatically:
- Obtain SSL certificate
- Configure Apache for HTTPS
- Set up automatic renewal

After SSL setup, edit the VirtualHost to redirect HTTP to HTTPS:

```apache
<VirtualHost *:80>
    ServerName argumentation.dimes.unical.it
    Redirect permanent / https://argumentation.dimes.unical.it/
</VirtualHost>
```

## CORS and Security Considerations

### CORS Headers

If the frontend and backend are on different domains, add CORS headers in Apache configuration:

```apache
<Location /api>
    Header set Access-Control-Allow-Origin "https://yourdomain.com"
    Header set Access-Control-Allow-Methods "POST, GET, OPTIONS"
    Header set Access-Control-Allow-Headers "Content-Type"
</Location>
```

Alternatively, use Flask-CORS in `solveBAF.py` (see section 2).

### Security Best Practices

**File Permissions:**
```bash
# Ensure backend code is not writable by web server
sudo chown -R root:www-data /var/www/compute
sudo chmod -R 755 /var/www/compute

# Only temp directory should be writable
sudo chown -R www-data:www-data /var/www/compute/apx_temp
sudo chmod 755 /var/www/compute/apx_temp
```

**Firewall Configuration:**
```bash
# Allow only HTTP/HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

**Rate Limiting:**
Consider implementing rate limiting for API endpoints to prevent abuse. This can be done with Apache modules:

```bash
sudo a2enmod ratelimit
```

Or use Flask extensions like Flask-Limiter.

**Input Validation:**
The backend already validates APX syntax and argument names. Ensure these checks remain in place and monitor logs for suspicious patterns.

## Monitoring and Logging

### Application Logs

```bash
# View Gunicorn service logs
sudo journalctl -u gunicorn.service -n 100

# View Apache access logs
sudo tail -f /var/log/apache2/access.log

# View Apache error logs
sudo tail -f /var/log/apache2/error.log
```

### Health Check Endpoint

The backend includes a test endpoint for health checks:

```bash
curl http://localhost:5000/testcheck
# Expected response: "OK FROM THIS FILE"
```

You can configure monitoring tools (Nagios, Prometheus, etc.) to periodically check this endpoint.

## Backup and Maintenance

### Backup Strategy

Critical files to backup regularly:
- `/var/www/compute/solveBAF.py` - Backend application code
- `/var/www/compute/sem/*.dl` - ASP semantic definition files
- `/var/www/html/*` - Frontend static files
- `/etc/apache2/sites-available/fair.conf` - Apache configuration
- `/etc/systemd/system/gunicorn.service` - Systemd service configuration

### Update Procedure

When deploying code updates:

```bash
# 1. Pull latest changes
cd /var/www/compute
git pull origin main

# 2. Update Python dependencies if needed
source venv/bin/activate
pip install -r requirements.txt

# 3. Restart Gunicorn
sudo systemctl restart gunicorn.service

# 4. Update frontend if needed
cd /var/www/html
git pull origin main

# 5. Clear Apache cache if necessary
sudo systemctl reload apache2
```

### Log Rotation

Ensure log rotation is configured to prevent disk space issues:

```bash
# Apache logs are usually rotated automatically
# Check /etc/logrotate.d/apache2

# For application-specific logs, create /etc/logrotate.d/argumentation
```

# 4. Frontend Components

## Overview

The frontend is a single-page application built with vanilla JavaScript, HTML5, and CSS3. It uses Cytoscape.js for graph visualization and manipulation, with no build process or bundler required. All JavaScript modules are loaded directly as scripts in `index.html`.

## File Structure

```
frontend/
├── index.html              # Main HTML page
├── fairstyle.css           # Application styles
├── init.js                 # Application initialization entry point
├── graph.js                # Cytoscape core, graph operations
├── interface.js            # UI controls, modals, event handlers
├── fileio.js               # Import/export logic
├── apicalls.js             # Backend API communication
└── utils.js                # Validation, constants, helpers
```

## Module Responsibilities

### `init.js`

Application entry point executed on page load. Orchestrates the initialization sequence:

- Calls `initializeCytoscape()` to create the graph instance
- Calls `initializeNodeHtmlLabel()` to setup HTML labels plugin
- Calls `registerCytoscapeEventListeners()` to wire graph events
- Calls `registerInterfaceEventListeners()` to wire UI button events
- Calls `resizePreviewCanvas()` to initialize the preview overlay
- Calls `initializeInterface()` to reset UI state

### `utils.js`

Contains shared constants, validation functions, and helper utilities:

**Constants:**
- `NODECOLORDEFAULT`, `NODEBORDERCOLORDEFAULT`: Default node colors
- `EDGEATTACKCOLOR`, `EDGESUPPORTCOLOR`: Edge colors by type
- `MAXNODEARGUMENTLENGTH`, `MAXNODEDESCRIPTIONLENGTH`: Input length limits
- `VALIDARGUMENTREGEX`, `VALIDDESCRIPTIONREGEX`: Input validation patterns
- `MINNODEWEIGHT`, `MAXNODEWEIGHT`, `MINEDGEWEIGHT`, `MAXEDGEWEIGHT`: Weight ranges
- Error message constants (`ERRNODEEMPTYARGUMENT`, `ERREDGEDUPLICAT`, etc.)

**Functions:**
- `validateArgumentName(name)`: Checks argument name syntax and length
- `validateWeight(weight)`: Validates numeric weight range
- `validateDescription(description)`: Checks description length and allowed chars
- `generateEdgeId()`: Returns unique edge IDs (`e1`, `e2`, ...)
- `initEdgeIdCounterFromGraph()`: Syncs edge ID counter with existing graph
- `selectRow(areaId, li)`: Handles single-selection in labeling lists
- `downloadBlob(blob, filename)`: Triggers browser download for Blob objects

### `graph.js`

Core Cytoscape initialization, graph operations, and synchronization with textual description.

#### Cytoscape Initialization

```javascript
function initializeCytoscape()
```

Creates the Cytoscape instance with:
- Container: `#cy` div
- Base node style: 50x50px circles, blue background, 2px border
- Edge styles:
  - `type: 'attack'`: solid red line with triangle arrow
  - `type: 'support'`: dotted blue line with triangle-tee arrow
- Edge labels: display weight if present, positioned on edge with auto-rotation
- Default layout: CoSE (force-directed)

#### HTML Labels Plugin

```javascript
function initializeNodeHtmlLabel()
```

Configures `cytoscape-node-html-label` to render structured labels inside nodes:
- **Strength**: small floating value above the node (when computed)
- **Name**: centered, bold, 14px
- **Weight**: below name, small, 8px

Labels are fully HTML-based (`<div class="node-label-wrapper">`) and styled via CSS.

#### Graph-Text Synchronization

**From Graph to Text:**
```javascript
function updateDescriptionFromGraph()
```

Iterates over `cy.nodes()` and `cy.edges()` to generate APX-like syntax:
- Nodes: `arg(name, weight).` or `arg(name).`
- Edges: `att(source, target, weight).` or `support(source, target, weight).`

Automatically called on `add`, `remove`, or `data` events if not editing the description textarea.

**From Text to Graph:**
```javascript
function updateGraphFromDescription()
```

Parses `#desc-area` textarea line by line using regex:
- `arg(...)` → creates or updates nodes
- `att(...)` → creates or updates attack edges
- `support(...)` → creates or updates support edges

Validates:
- Syntax correctness
- Argument name constraints
- Weight ranges
- Edge endpoints existence

On errors, displays inline error messages with line numbers.

On success:
- Removes obsolete nodes/edges
- Adds/updates nodes and edges
- Re-applies selected layout
- Updates semantic group view (AF/BAF/QBAF)

#### Node and Edge Creation Workflow

**Node Creation:**
1. User clicks on canvas background
2. `createNode(e)` checks if not in edge mode
3. Stores click position in `window.nodeCreationContext`
4. Opens node modal
5. On confirm, creates node at stored position

**Edge Creation (two-step):**
1. User clicks on source node → enters edge mode
2. `createEdge(e)` sets `edgeModeActive = true`, stores source node
3. Canvas cursor changes to crosshair, preview arrow follows mouse
4. User clicks on target node
5. Opens edge modal with source/target context
6. On confirm, creates edge and exits edge mode

**Preview Canvas:**
A transparent overlay canvas (`#cy-preview-canvas`) renders the live arrow during edge creation using `drawPreviewLine()`.

#### Context Menus

Right-click on nodes or edges opens custom context menus with Edit/Delete actions:
- `openNodeMenu(e)` → shows `#node-context-menu`
- `openEdgeMenu(e)` → shows `#edge-context-menu`

Menu actions stored in `window.nodeContextCallback` and `window.edgeContextCallback`.

#### Event Listeners

```javascript
function registerCytoscapeEventListeners()
```

Registers all Cytoscape event handlers:
- `tap` on nodes → edge creation (if in edge mode) or selection
- `tap` on background → node creation
- `cxttap` (right-click) → context menus
- `add`, `remove`, `data` → update description textarea
- `mouseover`, `mouseout` on nodes → show/hide tooltip with description
- `mousemove` → reposition tooltip and preview arrow
- `resize`, `layoutstop` → resize preview canvas

### `interface.js`

Manages all UI controls, modal dialogs, and user interactions outside the graph canvas.

#### Interface Initialization

```javascript
function initializeInterface()
```

Resets all UI fields to defaults:
- Clears project name, description, labelings, constraints
- Resets semantic selectors to default values (grounded, drl, epsilon=0.01, etc.)
- Clears computed results (labelings, strengths)
- Does NOT touch the Cytoscape graph

```javascript
function resetAppState()
```

Full application reset:
- Calls `clearCytoscapeGraph()` to remove all nodes/edges
- Calls `initializeInterface()` to reset UI

Used by "New project" button and after imports.

#### Semantic Group Switcher

```javascript
function updateSemanticGroupView()
```

Determines which semantic panel to show based on graph features:

| Graph Features | Semantic Type | Label |
|---|---|---|
| No supports, no weights | Extension-based | AF |
| Has supports, no weights | Extension-based | BAF |
| No supports, has edge weights | Extension-based | WAF |
| Has supports, has edge weights | Extension-based | WBAF |
| Has node weights, no edge weights | Gradual | QBAF |
| Has node weights, has edge weights | Gradual | WQBAF |

Shows/hides `#semantic-group-ext-based` or `#semantic-group-gradual` accordingly.

#### Node Modal

**Opening:**
```javascript
window.openNodeModal(pos, node)
```

- `pos`: click position for new nodes
- `node`: existing node for editing

**Fields:**
- `#node-argument`: argument name (required, max 50 chars, alphanumeric + underscore)
- `#node-weight`: optional weight
- `#node-description`: optional description (max 500 chars)

**Validation:**
```javascript
function validateNodeModal(argument, weight, description)
```

Returns `{valid: boolean, error: string, field: string}`.

**Callback:**
```javascript
window.nodeModalCallback(argument, weight, description)
```

Handles both creation and editing:
- **Creation mode** (`window.nodeCreationContext`): adds new node at stored position
- **Edit mode** (`window.nodeEditContext`): updates existing node, handles ID changes by recreating node and moving edges

Duplicate ID check uses case-insensitive comparison.

**Keyboard:**
- ESC closes modal
- ENTER confirms

#### Edge Modal

**Opening:**
```javascript
window.openEdgeModal(edge)
```

- `edge`: existing edge for editing, or `null` for creation

**Fields:**
- Radio buttons: Attack or Support (required)
- `#edge-weight`: optional weight  (currently commented out in UI)

**Validation:**
```javascript
function validateEdgeModal(type, weight)
```

Checks type is selected and weight is in range.

**Callback:**
```javascript
window.edgeModalCallback(type, weight)
```

Handles both creation and editing:
- **Creation mode** (`window.edgeCreationContext`): creates edge between stored source/target
- **Edit mode** (`window.edgeEditContext`): updates edge type and weight

Duplicate edge check: same source, target, and type.

#### Event Binding

```javascript
function registerInterfaceEventListeners()
```

Wires all UI button clicks and form events:
- Toolbar: New project, Import, Export
- Semantic computation: Compute Labelings, Compute Strength, Apply Constraints
- Save results: Save Labelings, Save Filtered Labelings
- Layout selector: applies layout on change
- Gradual semantic selector: enables/disables Params and Gamma based on algorithm
- Modal buttons: Confirm, Cancel
- Context menu actions: Edit, Delete
- Keyboard: ESC, ENTER

### `fileio.js`

Handles all import/export operations for APX, JSON, and PNG formats.

#### Export Functions

**APX Export:**
```javascript
async function generateAPXBlob()
```
Returns a Blob containing the current `#desc-area` content as plain text.

**JSON Export:**
```javascript
async function generateJSONBlob()
```
Returns a Blob with full project metadata:
```json
{
  "metadata": {
    "projectName": "...",
    "exportDate": "...",
    "version": "1.0",
    "nodeCount": 5,
    "edgeCount": 3
  },
  "graph": {
    "nodes": [
      {"id": "a", "weight": 0.5, "description": "...", "position": {"x": 100, "y": 200}}
    ],
    "edges": [
      {"id": "e1", "source": "a", "target": "b", "type": "attack", "weight": null}
    ]
  },
  "layout": "cose",
  "description": "arg(a, 0.5). ..."
}
```

**PNG Export:**
```javascript
async function generatePNGBlob()
```
Uses Cytoscape's built-in PNG export (`cy.png()`) with fallback to `html2canvas` if the first method fails. Exports at 3x scale, max 4096x4096px, with light background.

#### Import Functions

**APX Import:**
```javascript
function importAPX(content)
```
Writes content to `#desc-area` and calls `updateGraphFromDescription()`.

**JSON Import:**
```javascript
function importJSON(jsonContent)
```
Parses JSON and restores:
- Project name
- Description textarea
- Graph nodes (with positions and descriptions)
- Graph edges
- Layout selection

#### File System Access API

**Import:**
```javascript
async function importGraph()
```
Uses `window.showOpenFilePicker()` to open system file picker, accepts `.apx` and `.json`, auto-fills project name from filename.

Fallback for older browsers: hidden `<input type="file">` with change event.

**Export:**
```javascript
async function exportGraph()
```
Uses `window.showSaveFilePicker()` to open save dialog with three file type options:
- APX Description (`.apx`)
- JSON Full Data (`.json`)
- PNG Image (`.png`)

Fallback for older browsers: `showExportFallbackDialog()` with prompt-based format selection and direct downloads.

#### Saving Computed Results

**Labelings:**
```javascript
function saveLabelings()
```
Extracts text from `#labelings-area` list items and downloads as `labelings.txt`.

**Filtered Labelings:**
```javascript
function saveFilteredLabelings()
```
Extracts text from `#filtered-labelings-area` and downloads as `filtered_labelings.txt`.

**Final Strength:**
Handled by "Save Final Strength" button, reads `#strength-area` textarea and downloads as

#### Reset Computed Results

```javascript
function resetComputedResults()
```

Clears all computed results from the UI:
- Unselects and clears both labelings lists (`#labelings-area`, `#filtered-labelings-area`)
- Clears constraints and strength textareas
- Removes `strength` data from all nodes
- Restores default node colors (blue)
- Rebuilds HTML labels without strength values

Called automatically before importing files or when creating a new project.

### `apicalls.js`

Handles all communication with the Flask backend API.

#### Extension-Based Semantics

```javascript
async function computeLabelingsFromAPI()
```

**Flow:**
1. Reads current description from `#desc-area`
2. Reads selected semantic from `#semantic-group-ext-select` (grounded/complete/preferred/stable)
3. Sends POST request to `/api/computeBAF`:
   ```json
   {
     "content": "arg(a). arg(b). att(a,b).",
     "semantics": "grounded"
   }
   ```
4. Parses response: `{"results": ["in(a), ou(b)", ...]}`
5. Populates `#labelings-area` with clickable list items
6. On list item click, calls `applyLabelingToGraph(labeling)` to color nodes

**Node Coloring Logic:**
```javascript
function applyLabelingToGraph(labeling)
```

Parses labeling string (e.g., `"in(a), ou(b), un(c)"`) and applies colors:
- `in(X)`: green background (`#4caf50`), solid green border
- `ou(X)`: red background (`#f44336`)
- `un(X)`: yellow background (`#ffeb3b`)
- Unlabeled: default blue

#### Constraint Filtering

```javascript
async function filterLabelingsFromAPI()
```

**Flow:**
1. Collects all labelings from `#labelings-area` as array of arrays
2. Reads constraints from `#constraints-area` (one per line)
3. Sends POST request to `/api/filterLabelings`:
   ```json
   {
     "labelings": [["in(a)", "ou(b)"], ["in(b)", "ou(a)"]],
     "constraints": ["in(a)", "!ou(a)"]
   }
   ```
4. Parses response: `{"results": [["in(a)", "ou(b)"]]}`
5. Populates `#filtered-labelings-area` with filtered results

**Constraint Syntax:**
- `in(a)`: argument a must be IN
- `ou(b)`: argument b must be OUT
- `!in(a)`: argument a must NOT be IN
- `in(a), in(b)`: logical AND (both must be true)
- `in(a); ou(b)`: logical OR (at least one must be true)

#### Gradual Semantics

```javascript
async function computeStrengthFromAPI()
```

**Flow:**
1. Reads current description from `#desc-area`
2. Collects parameters:
   - `sem`: selected algorithm (`#semantic-gradual-select`) → drl/ddr/eul/dfq/mlp/qen
   - `epsilon`: convergence threshold (`#semantic-gradual-epsilon`)
   - `params`: aggregation function (`#semantic-gradual-params`) → sum/max/deltasum/deltamax
   - `gamma`: sensitivity parameter (`#semantic-gradual-gamma`)
3. Sends POST request to `/api/computeQBAF`:
   ```json
   {
     "content": "arg(a,0.5). arg(b,0.8). att(a,b).",
     "sem": "drl",
     "params": "deltasum",
     "gamma": 0.5,
     "epsilon": 0.01
   }
   ```
4. Parses response: `{"results": {"a": "0.623", "b": "0.745"}}`
5. Writes results to `#strength-area` as text
6. Calls `applyStrengthToGraph(results)` to update node colors and labels

**Node Coloring by Strength:**
```javascript
function applyStrengthToGraph(strengthMap)
```

Applies gradient coloring based on strength value:
- 0.0 - 0.2: dark red
- 0.2 - 0.4: light red
- 0.4 - 0.6: yellow
- 0.6 - 0.8: light green
- 0.8 - 1.0: dark green

Updates each node:
- `node.data('strength', value)` → stores strength
- `node.style('background-color', color)` → applies color
- Triggers HTML label rebuild to display strength above node name

#### Error Handling

All API calls include try-catch blocks:
- Network errors: displays alert with generic error message
- Server errors (4xx/5xx): displays alert with backend error message
- Parsing errors: logs to console and displays alert

## Graph Rendering and Styling

### Cytoscape Stylesheet

Defined in `graph.js` during `initializeCytoscape()`:

**Nodes:**
- Default: 50x50px circle, blue (`#2196F3`), 2px dark blue border
- No built-in text labels (all labels via HTML plugin)

**Edges:**
- Attack: solid red line, triangle arrow, 3px width
- Support: dotted blue line, triangle-tee arrow, 3px width
- Edge labels: display weight if present, white background with padding

### HTML Labels

Rendered by `cytoscape-node-html-label` plugin, styled via CSS in `fairstyle.css`:

```css
.node-html-label {
  position: absolute;
  pointer-events: none;
  z-index: 10;
}

.node-label-strength {
  font-size: 8px;
  margin-bottom: -11px;
  transform: translateY(-18px);
  background-color: #ffffffcc;
  padding: 0 2px;
  border-radius: 3px;
}

.node-label-name {
  font-size: 14px;
  font-weight: 500;
  line-height: 1.1;
}

.node-label-weight {
  font-size: 8px;
  margin-top: 2px;
}
```

### Layout Algorithms

Available layouts in `#layout-select`:

- **Smart mode (CoSE)**: Force-directed layout optimized for readability
- **Circle**: Nodes arranged in a circle
- **Concentric**: Nodes in concentric rings by connectivity
- **Grid**: Regular grid arrangement
- **Breadthfirst**: Hierarchical layered layout
- **Random**: Random positioning

Layout is applied by:
```javascript
cy.layout({ name: selectedLayout }).run();
```

Layout choice is stored in JSON exports and restored on import.

# 5. Backend API

## Overview

The backend is a Flask application (`solveBAF.py`) that exposes three REST API endpoints for computing argumentation semantics. It uses Clingo for extension-based semantics and custom Python algorithms for gradual semantics. All endpoints accept and return JSON.

Base URL: `http://your-server/api/`

## Endpoint Reference

### POST `/api/computeBAF`

Computes extension-based semantics (grounded, complete, preferred, stable) for Abstract Argumentation Frameworks and Bipolar Argumentation Frameworks.

**Request Body:**
```json
{
  "content": "arg(a). arg(b). att(a,b). support(b,a).",
  "semantics": "grounded"
}
```

**Parameters:**
- `content` (string, required): APX-like description of the framework
  - Node syntax: `arg(name).` or `arg(name, weight).`
  - Edge syntax: `att(source, target).` or `support(source, target).`
  - Edge weights are accepted but not currently used in computation
- `semantics` (string, required): One of `grounded`, `complete`, `preferred`, `stable`

**Response (200 OK):**
```json
{
  "results": [
    "in(a), ou(b)",
    "in(b), ou(a)"
  ]
}
```

Each string in `results` represents one labeling, with comma-separated argument states.

**Error Response (400 Bad Request):**
```json
{
  "error": "Parametri 'content' e 'semantics' richiesti"
}
```

**Error Response (500 Internal Server Error):**
```json
{
  "error": "Error message from Clingo or file operations"
}
```

**Implementation Details:**

1. Creates a temporary `.apx` file in `UPLOAD_FOLDER` (`/var/www/compute/apx_temp`)
2. Writes the `content` to the temporary file
3. Calls `concatena_file()` to merge:
   - Graph content (arguments and relationships)
   - ASP rules for BAF reachability and extended attacks
   - Semantic-specific rules from `sem/{semantics}.dl`
   - Output statements (`#show in/1`, `#show out/1`, `#show un/1`)
4. Invokes Clingo via Python bindings (`clingo.Control()`)
5. Parses all answer sets and returns them as strings
6. Cleans up temporary files

**Semantic Files Required:**
- `sem/grounded.dl`: ASP rules for grounded semantics
- `sem/complete.dl`: ASP rules for complete semantics
- `sem/preferred.dl`: ASP rules for preferred semantics
- `sem/stable.dl`: ASP rules for stable semantics

### POST `/api/filterLabelings`

Filters a set of labelings based on user-defined logical constraints.

**Request Body:**
```json
{
  "labelings": [
    ["in(a)", "ou(b)", "un(c)"],
    ["in(b)", "ou(a)", "un(c)"],
    ["un(a)", "un(b)", "in(c)"]
  ],
  "constraints": [
    "in(a)",
    "!ou(a)"
  ]
}
```

**Parameters:**
- `labelings` (array of arrays, required): Each inner array is a labeling represented as list of strings
- `constraints` (array of strings, required): Logical formulas in propositional logic

**Constraint Syntax:**
- Atomic propositions: `in(a)`, `ou(b)`, `un(c)`
- Negation: `!in(a)` (NOT operator)
- Conjunction: `in(a), in(b)` (AND operator, comma-separated)
- Disjunction: `in(a); ou(b)` (OR operator, semicolon-separated)
- Parentheses: `(in(a), ou(b)); in(c)` for grouping

**Response (200 OK):**
```json
{
  "results": [
    ["in(a)", "ou(b)", "un(c)"]
  ]
}
```

Returns only labelings that satisfy ALL constraints.

**Error Response (400 Bad Request):**
```json
{
  "error": "Parametri 'labelings' e 'constraints' richiesti"
}
```

**Error Response (500 Internal Server Error):**
```json
{
  "error": "Constraint parsing error or evaluation error"
}
```

**Implementation Details:**

1. Parses each constraint string into an Abstract Syntax Tree (AST) using recursive descent parser
2. AST nodes: `AtomicProposition`, `NotOperator`, `AndOperator`, `OrOperator`
3. For each labeling, converts it to a set and evaluates all constraint AST nodes
4. Returns only labelings where all constraints evaluate to `True`

**Operator Precedence:**
1. Parentheses (highest)
2. NOT `!`
3. AND `,`
4. OR `;` (lowest)

### POST `/api/computeQBAF`

Computes gradual semantics for Quantitative Bipolar Argumentation Frameworks using iterative algorithms.

**Request Body:**
```json
{
  "content": "arg(a,0.5). arg(b,0.8). arg(c,0.3). att(a,b). support(c,b).",
  "sem": "drl",
  "params": "deltasum",
  "gamma": 0.5,
  "epsilon": 0.01,
  "verbose": false
}
```

**Parameters:**
- `content` (string, required): APX-like description with node weights
  - Node syntax: `arg(name, weight).` where weight ∈[0,1]
  - Edge syntax: `att(source, target).` or `support(source, target).`
- `sem` (string, required): Semantic algorithm, one of:
  - `drl`: DReLU (Differentiable ReLU)
  - `ddr`: DDReLU (Double Differentiable ReLU)
  - `eul`: Euler-based
  - `dfq`: DFQuAD
  - `mlp`: MLP-based (sigmoid activation)
  - `qen`: Quadratic Energy
- `params` (string, optional): Aggregation function for attacks and supports
  - `sum`: simple summation
  - `max`: maximum value
  - `deltasum`: delta-based sum
  - `deltamax`: delta-based max
  - Ignored by `eul`, `dfq`, `mlp` semantics
- `gamma` (float, optional, default: 0.5): Sensitivity parameter ∈[0,1]
  - Used by `drl` and `ddr` semantics
  - Ignored by `eul`, `dfq`, `qen`, `mlp`
- `epsilon` (float, optional, default: 0.01): Convergence threshold
  - Iteration stops when |strength[t] - strength[t-1]| < epsilon for all arguments
- `verbose` (boolean, optional, default: false): If true, prints iteration details to console

**Response (200 OK):**
```json
{
  "results": {
    "a": "0.623",
    "b": "0.745",
    "c": "0.412"
  }
}
```

Returns final strength values for each argument, formatted with 3 decimal places.

**Error Response (400 Bad Request):**
```json
{
  "error": "Parametri 'content' e 'sem' richiesti"
}
```

**Error Response (500 Internal Server Error):**
```json
{
  "error": "Parsing error or computation error"
}
```

**Implementation Details:**

1. Parses `content` using `parse_qbaf_from_string()`:
   - Extracts initial scores (node weights)
   - Builds attacker and supporter dictionaries
2. Initializes strength values with initial scores
3. Iterates until convergence (epsilon threshold) or max iterations:
   - For each argument, computes aggregated attack and support influence
   - Applies semantic-specific update function
4. Returns final strength values

**Semantic Algorithms:**

- **DReLU (`drl`)**: Differentiable ReLU with gamma weighting
  - Formula: `max(-1, min(1, (2*tau - 1 + delta) * gamma + (1-gamma)))/2`

- **DDReLU (`ddr`)**: Double Differentiable ReLU using exponential smoothing
  - Formula: Uses log-sum-exp for smooth approximation

- **Euler (`eul`)**: Euler-based update
  - Formula: `1 - (1 - tau)² + (1 + tau) * e^alpha`

- **DFQuAD (`dfq`)**: Delta-based quadratic
  - Formula: `tau + tau * min(0, alpha) + (1-tau) * max(0, alpha)`

- **MLP (`mlp`)**: Sigmoid activation
  - Formula: `1 / (1 + e^(-alpha))`

- **Quadratic Energy (`qen`)**: Energy-based aggregation
  - Formula: `E * (1 - E) * tau` where `E = agg² / (1 + agg²)`

**Aggregation Functions:**

- `alpha_plus` (support): aggregates support influences
- `alpha_minus` (attack): aggregates attack influences
- `aggregation` = `alpha_plus - alpha_minus` (adjusted by aggregation mode)

Modes:
- `product`: uses `1 - score` products
- `sum`: simple summation
- `deltamax`: normalized by max(alpha_plus, alpha_minus)
- `deltasum`: normalized by alpha_plus + alpha_minus

## Error Handling and Status Codes

### Status Codes

- **200 OK**: Request successful, results returned
- **400 Bad Request**: Missing or invalid parameters
- **404 Not Found**: Semantic definition file not found (extension-based only)
- **500 Internal Server Error**: Clingo error, parsing error, or Python exception

### Common Errors

**Extension-Based Semantics:**
- Missing semantic file: `"File semantica 'sem/grounded.dl' non trovato"`
- Invalid APX syntax: Clingo parsing errors
- File system errors: Permission denied on temp directory

**Constraint Filtering:**
- Invalid constraint syntax: `"Constraint non valido o formato non gestito: [formula]"`
- Malformed labeling arrays: Type errors

**Gradual Semantics:**
- Invalid node weight: Out of range[0,1]
- Missing argument in edges: References undefined argument
- Invalid semantic name: Unsupported `sem` value
- Convergence timeout: Exceeds maximum iterations (implementation-dependent)

### Logging

The Flask application uses `print()` statements with `flush=True` for immediate console output. Key log messages:

- `"computeBAF CALLED"`: Extension-based computation started
- `"filterLabelings API CALLED"`: Constraint filtering started
- `"Total number of iterations: N"`: Gradual semantic convergence info (if verbose=true)

Logs can be viewed via:
```bash
sudo journalctl -u gunicorn.service -f
```

## Health Check Endpoint

### GET `/testcheck`

Simple health check endpoint for monitoring.

**Response (200 OK):**
```
OK FROM THIS FILE
```

No authentication required. Can be used by monitoring tools to verify the backend is responding.

# 6. Data Formats

## APX Format Specification

The APX (Abstract Argumentation Problems eXchange) format is a text-based representation for argumentation frameworks. The tool uses an extended APX-like syntax that supports both classical AF and extensions (BAF, WAF, QBAF).

### Syntax Rules

**Arguments:**
```
arg(name).
arg(name, weight).
```

- `name`: Alphanumeric identifier (lowercase recommended for consistency)
  - Allowed characters: `a-z`, `A-Z`, `0-9`, `_`
  - Maximum length: 50 characters
  - Case-insensitive internally (converted to lowercase)
- `weight`: Optional float value in range[0,1]
  - Used for QBAF frameworks
  - Represents initial base score of the argument

**Attack Relationships:**
```
att(source, target).
att(source, target, weight).
```

- `source`: Name of attacking argument
- `target`: Name of attacked argument
- `weight`: Optional float value in range[0,1]
  - Currently accepted but not used in computation
  - Reserved for future WAF/WBAF support

**Support Relationships:**
```
support(source, target).
support(source, target, weight).
```

- `source`: Name of supporting argument
- `target`: Name of supported argument
- `weight`: Optional float value in range[0,1]
  - Currently accepted but not used in computation
  - Reserved for future WBAF support

### Example APX File

```
arg(a).
arg(b, 0.7).
arg(c, 0.5).
att(a, b).
att(b, c).
support(c, a).
```

This represents a QBAF with three arguments where:
- Argument `a` has no explicit weight (defaults to unweighted)
- Argument `b` has initial weight 0.7
- Argument `c` has initial weight 0.5
- `a` attacks `b`
- `b` attacks `c`
- `c` supports `a`

### Validation Rules

- Each statement must end with a period `.`
- Arguments must be declared before being used in relationships
- Duplicate argument declarations are not allowed (case-insensitive)
- Empty lines and whitespace are ignored
- Comments are not supported

### Framework Type Detection

The tool automatically detects the framework type based on content:

| Framework Type | Detection Criteria |
|---|---|
| AF (Abstract Argumentation) | Only attacks, no supports, no weights |
| BAF (Bipolar) | Has both attacks and supports, no weights |
| WAF (Weighted) | Only attacks, has edge weights, no node weights |
| WBAF (Weighted Bipolar) | Has both attacks and supports, has edge weights |
| QBAF (Quantitative Bipolar) | Has node weights, may have supports |
| WQBAF (Weighted Quantitative) | Has node weights and edge weights |

## JSON Project Format

The JSON export format preserves complete project state including graph layout, node positions, descriptions, and all metadata.

### Structure

```json
{
  "metadata": {
    "projectName": "string",
    "exportDate": "ISO8601 timestamp",
    "version": "1.0",
    "nodeCount": integer,
    "edgeCount": integer
  },
  "graph": {
    "nodes": [
      {
        "id": "string",
        "weight": float or null,
        "description": "string or empty",
        "position": {
          "x": float,
          "y": float
        }
      }
    ],
    "edges": [
      {
        "id": "string",
        "source": "string",
        "target": "string",
        "type": "attack" | "support",
        "weight": float or null
      }
    ]
  },
  "layout": "string",
  "description": "string"
}
```

### Field Descriptions

**Metadata Section:**
- `projectName`: User-defined project name (from `#project-name` input)
- `exportDate`: Timestamp of export in ISO 8601 format
- `version`: Format version (currently "1.0")
- `nodeCount`: Total number of arguments in the graph
- `edgeCount`: Total number of relationships in the graph

**Graph.Nodes:**
- `id`: Unique argument identifier (lowercase, alphanumeric + underscore)
- `weight`: Argument weight  or `null` if not set[0,1]
- `description`: Optional textual description (max 500 chars)
  - **Note:** Descriptions are NOT exported to APX format
  - Only preserved in JSON exports
- `position`: Absolute x, y coordinates in the canvas
  - Preserves node layout when reimporting

**Graph.Edges:**
- `id`: Unique edge identifier (e.g., "e1", "e2", ...)
- `source`: ID of source argument
- `target`: ID of target argument
- `type`: Either `"attack"` or `"support"`
- `weight`: Edge weight  or `null` if not set[0,1]

**Top-Level Fields:**
- `layout`: Selected layout algorithm name
  - Values: `"cose"`, `"circle"`, `"concentric"`, `"grid"`, `"breadthfirst"`, `"random"`
  - Restored when importing the project
- `description`: Full APX-like textual description
  - Content of `#desc-area` textarea at export time

### Example JSON Export

```json
{
  "metadata": {
    "projectName": "Example BAF",
    "exportDate": "2026-01-16T12:00:00.000Z",
    "version": "1.0",
    "nodeCount": 3,
    "edgeCount": 3
  },
  "graph": {
    "nodes": [
      {
        "id": "a",
        "weight": null,
        "description": "First argument",
        "position": {"x": 150, "y": 200}
      },
      {
        "id": "b",
        "weight": 0.7,
        "description": "",
        "position": {"x": 300, "y": 200}
      },
      {
        "id": "c",
        "weight": 0.5,
        "description": "Third argument with weight",
        "position": {"x": 225, "y": 350}
      }
    ],
    "edges": [
      {
        "id": "e1",
        "source": "a",
        "target": "b",
        "type": "attack",
        "weight": null
      },
      {
        "id": "e2",
        "source": "b",
        "target": "c",
        "type": "attack",
        "weight": null
      },
      {
        "id": "e3",
        "source": "c",
        "target": "a",
        "type": "support",
        "weight": null
      }
    ]
  },
  "layout": "cose",
  "description": "arg(a). arg(b, 0.7). arg(c, 0.5). att(a, b). att(b, c). support(c, a)."
}
```

### Import Behavior

When importing a JSON file:
1. Project name is restored from `metadata.projectName`
2. Description textarea is populated from `description` field
3. Graph is cleared and rebuilt from `graph.nodes` and `graph.edges`
4. Node positions are restored from `position` data
5. Node descriptions are restored (invisible in graph, shown in tooltips)
6. Layout selector is set to `layout` value
7. The selected layout is applied to the graph

## Labeling Response Format

Extension-based semantic computation returns labelings as arrays of strings.

### Response Structure

```json
{
  "results": [
    "in(arg1), ou(arg2), un(arg3)",
    "in(arg2), ou(arg1), un(arg3)"
  ]
}
```

### Labeling String Format

Each labeling is a comma-separated list of argument states:
- `in(X)`: Argument X is IN (accepted)
- `ou(X)`: Argument X is OUT (rejected)
- `un(X)`: Argument X is UNDECIDED

**Example:**
```
"in(a), in(c), ou(b), un(d)"
```

Represents a labeling where:
- Arguments `a` and `c` are accepted
- Argument `b` is rejected
- Argument `d` is undecided

### Frontend Parsing

The frontend parses each labeling string to extract argument states:

1. Splits by comma and whitespace
2. Extracts state and argument name using regex
3. Stores as clickable list items in `#labelings-area`
4. On click, applies color coding to graph:
   - `in(X)`: green background, green border
   - `ou(X)`: red background
   - `un(X)`: yellow background
   - Unlabeled: default blue

### Filtered Labelings

The constraint filtering endpoint returns the same format:

```json
{
  "results": [
    "in(a), ou(b), un(c)"
  ]
}
```

Results are displayed in `#filtered-labelings-area` with the same parsing and coloring logic.

## Gradual Strength Response Format

Gradual semantic computation returns a mapping of argument names to numerical strength values.

### Response Structure

```json
{
  "results": {
    "arg1": "0.623",
    "arg2": "0.745",
    "arg3": "0.412"
  }
}
```

### Field Specifications

- Keys: Argument names (lowercase identifiers)
- Values: Strength values as strings formatted with 3 decimal places
  - Range: [0.000, 1.000]
  - Represents final computed strength after convergence

### Example Response

```json
{
  "results": {
    "a": "0.500",
    "b": "0.673",
    "c": "0.289"
  }
}
```

Interpretation:
- Argument `a` has strength 0.5 (neutral)
- Argument `b` has strength 0.673 (relatively strong)
- Argument `c` has strength 0.289 (relatively weak)

### Frontend Rendering

The frontend processes strength results:

1. Writes results to `#strength-area` textarea as formatted text:
   ```
   a: 0.500
   b: 0.673
   c: 0.289
   ```

2. Applies gradient coloring to graph nodes based on strength:
   - [0.0 - 0.2]: Dark red (#d32f2f)
   - [0.2 - 0.4]: Light red (#e57373)
   - [0.4 - 0.6]: Yellow (#ffeb3b)
   - [0.6 - 0.8]: Light green (#81c784)
   - [0.8 - 1.0]: Dark green (#4caf50)

3. Updates HTML labels to display strength above node name:
   ```html
   <div class="node-label-strength">0.673</div>
   <div class="node-label-name">b</div>
   ```

4. Stores strength in node data: `node.data('strength', 0.673)`

### Convergence Information

If `verbose: true` is passed in the request, the backend prints iteration details to console logs but does NOT include them in the JSON response. The response format remains the same regardless of verbose setting.

# 7. Graph Rendering and Styling

## Cytoscape Stylesheet Rules

The graph visual appearance is controlled by a Cytoscape stylesheet defined in `graph.js` during initialization. The stylesheet uses CSS-like syntax and is applied programmatically.

### Node Styles

**Default Node Appearance:**
```javascript
{
  selector: 'node',
  style: {
    'background-color': NODECOLORDEFAULT,     // #2196F3 (blue)
    'width': 50,
    'height': 50,
    'border-width': 2,
    'border-color': NODEBORDERCOLORDEFAULT,   // #1976D2 (dark blue)
    'color': '#fff'
  }
}
```

- Nodes are circular by default (no shape specified = circle)
- Fixed size: 50x50 pixels
- Blue background with darker blue border
- White text color (not used since labels are HTML-based)

**No Built-in Labels:**
The stylesheet does NOT define a `label` property for nodes. All node labels are rendered via the `cytoscape-node-html-label` plugin, which overlays HTML content on top of the graph.

### Edge Styles

**Attack Edges:**
```javascript
{
  selector: 'edge[type="attack"]',
  style: {
    'line-color': EDGEATTACKCOLOR,           // #b71918 (red)
    'target-arrow-color': EDGEATTACKCOLOR,
    'target-arrow-shape': 'triangle',
    'width': 3,
    'line-style': 'solid',
    'curve-style': 'bezier'
  }
}
```

- Solid red lines
- Triangular arrowhead pointing to target
- 3px line width
- Bezier curves for smooth routing

**Support Edges:**
```javascript
{
  selector: 'edge[type="support"]',
  style: {
    'line-color': EDGESUPPORTCOLOR,          // #1976D2 (blue)
    'target-arrow-color': EDGESUPPORTCOLOR,
    'target-arrow-shape': 'triangle-tee',
    'width': 3,
    'line-style': 'dotted',
    'curve-style': 'bezier'
  }
}
```

- Dotted blue lines (distinguishes from attacks)
- Triangle-tee arrowhead (⊥ shape)
- Same width as attacks
- Bezier curves

**Edge Labels (Weight Display):**
```javascript
{
  selector: 'edge',
  style: {
    'label': function(ele) {
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
```

- Edge weight displayed on the edge if present
- White rounded background for readability
- Auto-rotates with edge angle
- Only shows if weight is defined

### Dynamic Style Updates

Node colors are updated dynamically via JavaScript when:
- A labeling is selected (extension-based semantics)
- Strength values are computed (gradual semantics)

These updates use `node.style()` method to override default colors.

## Node Coloring Logic

### Extension-Based Semantics (Labelings)

When a user clicks on a labeling in `#labelings-area` or `#filtered-labelings-area`, the `applyLabelingToGraph(labeling)` function is called.

**Parsing Logic:**
1. Splits labeling string by commas: `"in(a), ou(b), un(c)"` → `["in(a)", "ou(b)", "un(c)"]`
2. For each token, extracts state and argument using regex: `/^(in|ou|un)\(([^)]+)\)$/`
3. Builds a map: `{state: 'in', args: ['a']}, {state: 'ou', args: ['b']}, ...`

**Color Application:**
```javascript
function applyLabelingToGraph(labeling) {
  // Reset all nodes to default
  cy.nodes().forEach(node => {
    node.style('background-color', NODECOLORDEFAULT);
    node.style('border-color', NODEBORDERCOLORDEFAULT);
  });
  
  // Parse and apply labeling colors
  // in(X) → green
  inArgs.forEach(arg => {
    const node = cy.getElementById(arg);
    if (node.length > 0) {
      node.style('background-color', '#4caf50');  // Green
      node.style('border-color', '#2e7d32');      // Dark green
    }
  });
  
  // ou(X) → red
  outArgs.forEach(arg => {
    const node = cy.getElementById(arg);
    if (node.length > 0) {
      node.style('background-color', '#f44336');  // Red
      node.style('border-color', '#971919');      // Dark red
    }
  });
  
  // un(X) → yellow
  undecArgs.forEach(arg => {
    const node = cy.getElementById(arg);
    if (node.length > 0) {
      node.style('background-color', '#ffeb3b');  // Yellow
      node.style('border-color', '#b6862c');      // Dark yellow
    }
  });
}
```

**Color Scheme:**
- `in(X)`: Green (#4caf50) background, dark green (#2e7d32) border
- `ou(X)`: Red (#f44336) background, dark red (#971919) border
- `un(X)`: Yellow (#ffeb3b) background, dark yellow (#b6862c) border
- Unlabeled: Default blue (#2196F3) background, dark blue (#1976D2) border

### Gradual Semantics (Strength Values)

When strength values are computed, the `applyStrengthToGraph(strengthMap)` function applies a gradient color scheme.

**Gradient Color Scale:**
```javascript
function getStrengthColor(strength) {
  if (strength >= 0.0 && strength < 0.2) {
    return '#d32f2f';  // Dark red (very weak)
  } else if (strength >= 0.2 && strength < 0.4) {
    return '#e57373';  // Light red (weak)
  } else if (strength >= 0.4 && strength < 0.6) {
    return '#ffeb3b';  // Yellow (neutral)
  } else if (strength >= 0.6 && strength < 0.8) {
    return '#81c784';  // Light green (strong)
  } else if (strength >= 0.8 && strength <= 1.0) {
    return '#4caf50';  // Dark green (very strong)
  }
  return NODECOLORDEFAULT;  // Fallback to blue
}
```

**Application Logic:**
```javascript
function applyStrengthToGraph(strengthMap) {
  cy.nodes().forEach(node => {
    const argId = node.id();
    const strength = strengthMap[argId];
    
    if (strength !== undefined) {
      // Store strength in node data
      node.data('strength', strength);
      
      // Apply color
      const color = getStrengthColor(parseFloat(strength));
      node.style('background-color', color);
      
      // Trigger HTML label update
      if (window.htmlLabel) {
        window.htmlLabel.updateNodeLabel(node);
      }
    }
  });
}
```

Strength values are also stored in `node.data('strength')` so they can be displayed in HTML labels.

## Layout Algorithms

The tool provides six layout algorithms accessible via the `#layout-select` dropdown.

### Smart Mode (CoSE)

**Algorithm:** Compound Spring Embedder (force-directed)

**Use Case:**
- Default layout
- General-purpose, works well for most graphs
- Automatically minimizes edge crossings and node overlaps

**Configuration:**
```javascript
cy.layout({
  name: 'cose',
  animate: true,
  animationDuration: 500
}).run();
```

**When to Use:**
- Medium-sized graphs (5-50 nodes)
- When you want automatic optimal positioning
- When graph structure is not hierarchical

### Circle Layout

**Algorithm:** Positions nodes in a circle

**Use Case:**
- Emphasizes graph symmetry
- Good for small graphs with clear cycle structures
- Useful for pedagogical examples

**When to Use:**
- Small graphs (< 10 nodes)
- When all nodes have similar importance
- When demonstrating cycles or symmetrical attacks

### Concentric Layout

**Algorithm:** Nodes arranged in concentric rings based on connectivity

**Use Case:**
- Highlights central vs. peripheral arguments
- Nodes with more connections placed in inner rings

**When to Use:**
- Graphs with clear centrality structure
- When you want to emphasize hub arguments
- Bipolar frameworks with central mediators

### Grid Layout

**Algorithm:** Regular grid arrangement

**Use Case:**
- Uniform spacing
- Easy to count nodes
- Clean, organized appearance

**When to Use:**
- Presentation or export to images
- When structure is less important than clarity
- Large graphs where you need predictable spacing

### Breadthfirst Layout

**Algorithm:** Hierarchical layered layout

**Use Case:**
- Tree-like or hierarchical argumentation
- Shows levels of derivation

**When to Use:**
- Acyclic graphs
- Frameworks with clear attack chains
- When demonstrating grounded semantics step-by-step

### Random Layout

**Algorithm:** Uniformly random positioning

**Use Case:**
- Starting point for manual arrangement
- Breaking out of local minima in force-directed layouts

**When to Use:**
- When other layouts fail
- As a reset before applying another layout
- For testing purposes

### Layout Application

Layouts are applied by:
1. User selects layout from dropdown
2. `#layout-select` change event fires
3. JavaScript reads selected value
4. Calls `cy.layout({ name: selectedLayout }).run()`
5. Cytoscape animates nodes to new positions

**Layout Persistence:**
- Selected layout is stored in JSON exports (`"layout": "cose"`)
- When importing JSON, layout is restored and re-applied
- Node positions from JSON override layout algorithm

## HTML Labels Configuration

Node labels are rendered as HTML overlays using the `cytoscape-node-html-label` plugin.

### Plugin Initialization

```javascript
function initializeNodeHtmlLabel() {
  if (htmlLabel && typeof htmlLabel.destroy === 'function') {
    try {
      htmlLabel.destroy();
    } catch (e) {
      console.warn('Error destroying htmlLabel', e);
    }
  }
  
  htmlLabel = cy.nodeHtmlLabel([
    {
      query: 'node',
      halign: 'center',
      valign: 'center',
      halignBox: 'center',
      valignBox: 'center',
      cssClass: 'node-html-label',
      tpl: function(data) {
        const name = data.id;
        const strength = (data.strength !== null && data.strength !== '') ? data.strength : '';
        const weight = (data.weight !== null && data.weight !== '') ? data.weight : '';
        
        return `<div class="node-label-wrapper">
          ${strength !== '' ? `<div class="node-label-strength">${strength}</div>` : ''}
          <div class="node-label-name">${name}</div>
          ${weight !== '' ? `<div class="node-label-weight">${weight}</div>` : ''}
        </div>`;
      }
    }
  ]);
}
```

### Label Structure

Each node label consists of three optional parts rendered as HTML:

```html
<div class="node-label-wrapper">
  <div class="node-label-strength">0.673</div>   <!-- Optional: only if strength computed -->
  <div class="node-label-name">b</div>           <!-- Always present: argument name -->
  <div class="node-label-weight">0.5</div>       <!-- Optional: only if weight defined -->
</div>
```

### CSS Styling (from `fairstyle.css`)

**Wrapper:**
```css
.node-html-label {
  position: absolute;
  transform: translate(-50%, -50%);  /* Center on node */
  pointer-events: none;
  z-index: 10;
}

.node-label-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  color: var(--bg-white);  /* White text */
  pointer-events: none;
}
```

**Strength (floating above):**
```css
.node-label-strength {
  font-size: 8px;
  font-weight: 400;
  margin-bottom: -11px;
  transform: translateY(-18px);       /* Lift above node */
  color: var(--text-dark);            /* Dark text */
  background-color: #ffffffcc;        /* Semi-transparent white bg */
  padding: 0 2px;
  border-radius: 3px;
}
```

**Name (centered):**
```css
.node-label-name {
  font-size: 14px;
  font-weight: 500;
  line-height: 1.1;
}
```

**Weight (below name):**
```css
.node-label-weight {
  font-size: 8px;
  font-weight: 400;
  margin-top: 2px;
}
```

### Label Updates

Labels are automatically updated when:
- Node data changes (`data.strength`, `data.weight`)
- `initializeNodeHtmlLabel()` is called
- Graph is redrawn after description update

The plugin re-evaluates the `tpl` function for each node and renders fresh

# 8. Extending the Tool

## Adding New Semantics

The tool can be extended to support additional argumentation semantics by adding both frontend controls and backend computation logic.

### Adding Extension-Based Semantics

Extension-based semantics (like grounded, complete, preferred, stable) require both ASP rules and frontend integration.

**Backend Steps:**

1. **Create ASP Rule File:**
   Create a new `.dl` file in `backend/sem/` directory:
   ```bash
   cd backend/sem
   nano newsemantic.dl
   ```

2. **Define ASP Rules:**
   Write the Answer Set Programming rules for your semantic. Follow the pattern from existing files:
   ```
   % Example: Semi-stable semantics
   in(X) :- argu(X), not out(X).
   out(X) :- argu(X), atta(Y,X), in(Y).
   
   % Add semantic-specific constraints
   :- argu(X), not in(X), not out(X), not cycle(X).
   ```

3. **Test ASP Rules:**
   Test your rules with Clingo directly:
   ```bash
   clingo test_graph.apx newsemantic.dl
   ```

**Frontend Steps:**

1. **Add Option to Selector:**
   Edit `index.html` and add a new option to `#semantic-group-ext-select`:
   ```html
   <select id="semantic-group-ext-select">
     <option value="grounded">Grounded</option>
     <option value="complete">Complete</option>
     <option value="preferred">Preferred</option>
     <option value="stable">Stable</option>
     <option value="newsemantic">New Semantic</option>
   </select>
   ```

2. **No JavaScript Changes Required:**
   The `computeLabelingsFromAPI()` function in `apicalls.js` automatically reads the selected value and sends it to the backend. No code changes needed.

3. **Test Integration:**
   - Select the new semantic from dropdown
   - Click "Compute Labelings"
   - Verify results appear in labelings area

### Adding Gradual Semantics

Gradual semantics require implementing iterative update functions in the Python backend.

**Backend Steps:**

1. **Implement Update Function:**
   Edit `solveBAF.py` and add a new function following the pattern:
   ```python
   def new_semantic(a, t, attackers, supporters, score, params=None, gamma=None):
       """
       Computes strength update for argument a at iteration t.
       
       Args:
           a: argument name
           t: current iteration
           attackers: dict mapping args to lists of attackers
           supporters: dict mapping args to lists of supporters
           score: dict mapping args to lists of strength values per iteration
           params: aggregation mode (sum/max/deltasum/deltamax)
           gamma: sensitivity parameter
       
       Returns:
           float: updated strength value in [0, 1]
       """
       tau_a = score[a]  # Initial base score
       
       # Compute aggregated influence
       alpha = aggregation(a, t, attackers, supporters, score, params)
       
       # Apply your semantic-specific formula
       result = tau_a + 0.5 * alpha  # Example formula
       
       # Ensure result is in [0, 1]
       return max(0, min(1, result))
   ```

2. **Register Semantic:**
   The function name becomes the semantic identifier. Users will call it with `"sem": "new_semantic"`.

3. **Update Documentation:**
   Add description of the new semantic in comments:
   ```python
   # new_semantic: Custom semantic description
   # - Uses simple linear combination
   # - Ignores gamma parameter
   # - Requires params for aggregation
   ```

**Frontend Steps:**

1. **Add Option to Selector:**
   Edit `index.html` and add option to `#semantic-gradual-select`:
   ```html
   <select id="semantic-gradual-select">
     <option value="drl">DReLU</option>
     <option value="ddr">DDReLU</option>
     <option value="eul">Euler</option>
     <option value="dfq">DFQuAD</option>
     <option value="mlp">MLP-based</option>
     <option value="qen">Quadratic Energy</option>
     <option value="new_semantic">New Semantic</option>
   </select>
   ```

2. **Update Control Logic (if needed):**
   If your semantic doesn't use certain parameters, update `updateSemanticGradualControls()` in `interface.js`:
   ```javascript
   function updateSemanticGradualControls() {
     const semanticSelect = document.getElementById('semantic-gradual-select');
     const paramsSelect = document.getElementById('semantic-gradual-params');
     const gammaInput = document.getElementById('semantic-gradual-gamma');
     
     if (!semanticSelect || !paramsSelect || !gammaInput) return;
     
     const selectedSemantic = semanticSelect.value;
     
     // Disable gamma for specific semantics
     const gammaDisabled = ['eul', 'dfq', 'qen', 'mlp', 'new_semantic'].includes(selectedSemantic);
     gammaInput.disabled = gammaDisabled;
     gammaInput.classList.toggle('disabled-control', gammaDisabled);
     
     // Disable params for specific semantics
     const paramsDisabled = ['eul', 'dfq', 'mlp'].includes(selectedSemantic);
     paramsSelect.disabled = paramsDisabled;
     paramsSelect.classList.toggle('disabled-control', paramsDisabled);
   }
   ```

3. **Test Integration:**
   - Create QBAF graph with node weights
   - Select new semantic
   - Set parameters (epsilon, params, gamma)
   - Click "Compute Strength"
   - Verify strength values appear and colors are applied

## Adding New Layouts

Cytoscape.js supports many built-in layouts. Adding a new one only requires frontend changes.

**Steps:**

1. **Check Cytoscape Documentation:**
   Visit https://js.cytoscape.org/#layouts to see available layouts and their options.

2. **Add Option to Selector:**
   Edit `index.html` and add to `#layout-select`:
   ```html
   <select id="layout-select">
     <option value="cose">Smart mode</option>
     <option value="circle">Circle</option>
     <option value="concentric">Concentric</option>
     <option value="grid">Grid</option>
     <option value="breadthfirst">Breadthfirst</option>
     <option value="random">Random</option>
     <option value="dagre">Dagre (Hierarchical)</option>
   </select>
   ```

3. **Install Additional Layout (if external):**
   Some layouts require additional plugins. For example, Dagre:
   ```html
   <script src="https://unpkg.com/dagre@0.8.5/dist/dagre.min.js"></script>
   <script src="https://unpkg.com/cytoscape-dagre@2.5.0/cytoscape-dagre.js"></script>
   ```

4. **Register Extension (if needed):**
   Add to `init.js`:
   ```javascript
   cytoscape.use(cytoscapeDagre);
   ```

5. **Custom Layout Options:**
   If the layout needs specific configuration, update the layout application code in `interface.js`:
   ```javascript
   document.getElementById('layout-select').addEventListener('change', function() {
     const selectedLayout = this.value;
     let layoutOptions = { name: selectedLayout };
     
     // Custom options per layout
     if (selectedLayout === 'dagre') {
       layoutOptions.rankDir = 'TB';  // Top to bottom
       layoutOptions.nodeSep = 50;
       layoutOptions.rankSep = 100;
     }
     
     cy.layout(layoutOptions).run();
   });
   ```

6. **Test:**
   - Create a graph
   - Select new layout
   - Verify nodes are positioned correctly
   - Test with different graph sizes and structures

## Customizing the UI

The user interface can be customized by modifying HTML structure and CSS styles.

### Changing Colors and Fonts

**Global Color Scheme:**
Edit `fairstyle.css` root variables:
```css
:root {
  --primary: #b71918;       /* Main red color */
  --secondary: #9d9d9d;     /* Gray */
  --text-dark: #111;        /* Text color */
  --bg-light: #f3f3f3;      /* Light background */
  --bg-white: #fff;         /* White background */
  --footer-dark: #9d9d9d;   /* Footer color */
}
```

Change these values to customize the entire application theme.

**Node Colors:**
Edit constants in `utils.js`:
```javascript
const NODECOLORDEFAULT = '#2196F3';         // Default blue
const NODEBORDERCOLORDEFAULT = '#1976D2';   // Border blue
const EDGEATTACKCOLOR = '#b71918';          // Attack red
const EDGESUPPORTCOLOR = '#1976D2';         // Support blue
```

**Fonts:**
Edit `fairstyle.css` body rule:
```css
body {
  font-family: 'Segoe UI', Arial, sans-serif;  /* Change font stack */
  font-size: 16px;  /* Base font size */
}
```

### Adding New UI Controls

**Example: Add a "Clear Results" button**

1. **Add HTML Element:**
   Edit `index.html` in the semantic section:
   ```html
   <div class="buttons-line">
     <button id="compute-semantic-group-ext-btn" class="button-compute">Compute Labelings</button>
     <button id="clear-results-btn" class="btn-secondary">Clear Results</button>
   </div>
   ```

2. **Add Event Handler:**
   Edit `interface.js` in `registerInterfaceEventListeners()`:
   ```javascript
   document.getElementById('clear-results-btn').addEventListener('click', function() {
     resetComputedResults();
     alert('Results cleared');
   });
   ```

3. **Style Button (if needed):**
   Buttons automatically inherit styles from `.btn-secondary` class. Custom styling:
   ```css
   #clear-results-btn {
     background: #ff9800;
     color: white;
   }
   ```

### Customizing Graph Workspace

**Change Canvas Size:**
Edit `fairstyle.css`:
```css
.workarea {
  flex: 1 1 0;  /* Takes remaining space */
  background: var(--bg-white);
  padding: 22px;
  min-width: 600px;  /* Adjust minimum width */
}

#cy-container {
  width: 100%;
  height: 100%;
  min-height: 400px;  /* Adjust minimum height */
}
```

**Add Background Grid:**
Edit Cytoscape initialization in `graph.js`:
```javascript
cy = cytoscape({
  container: document.getElementById('cy'),
  style: [
    {
      selector: 'core',
      style: {
        'active-bg-color': '#e0e0e0',
        'active-bg-opacity': 0.3
      }
    },
    // ... rest of styles
  ]
});

// Add grid background via CSS
document.getElementById('cy').style.backgroundImage = 
  'linear-gradient(#ddd 1px, transparent 1px), linear-gradient(90deg, #ddd 1px, transparent 1px)';
document.getElementById('cy').style.backgroundSize = '20px 20px';
```

### Customizing Sidebar Width

Edit `fairstyle.css`:
```css
.sidebar {
  width: 450px;          /* Increase width */
  min-width: 350px;      /* Adjust minimum */
  /* ... */
}
```

# 9. Implementing Predisposed Features

The application includes two partially implemented features that can be completed with minimal effort. Both features have frontend UI elements that are currently commented out and require backend extensions to become fully functional.

### Extending Filtering: Constraints + Preferences

**Current State:**

The filtering system currently supports only hard constraints. The UI contains a commented-out textarea for preferences, and the button label references both constraints and preferences, but only constraints are processed.

**Conceptual Workflow:**

The completed feature should work as follows:
1. User computes extension-based labelings (grounded, complete, preferred, stable)
2. User enters hard constraints in the "Constraints" textarea (e.g., `in(a)`, `!ou(b)`)
3. User enters soft preferences in the "Preferences" textarea (e.g., `in(c) > ou(d)`)
4. User clicks "Apply Constraints + Preferences"
5. Backend filters out labelings that violate any constraint (hard requirement)
6. Backend ranks remaining labelings by how many preferences they satisfy
7. Frontend displays filtered and ranked labelings in order of preference satisfaction

**Implementation Requirements:**

**Frontend Changes:**
- Locate and uncomment the preferences textarea in `index.html`
- Verify to ise the button label correctly mentioning both constraints and preferences
- Modify the API call function in `apicalls.js` to collect preferences from the textarea
- Include preferences array in the JSON request body sent to the backend
- Update the interface initialization function to reset the preferences textarea

**Backend Changes:**
- Extend the `/api/filterLabelings` endpoint to accept an optional `preferences` parameter
- Keep the existing constraint filtering logic (this is the hard filter)
- Add a ranking function that scores each filtered labeling by counting how many preferences it satisfies
- Use the same AST parsing logic already implemented for constraints
- Sort labelings by preference score in descending order
- Return the sorted list to the frontend

**Semantic Difference:**
- **Constraints**: Boolean conditions that must be satisfied (a labeling either passes or fails)
- **Preferences**: Soft criteria used for ranking (labelings satisfy 0, 1, 2, ... preferences)
- All returned labelings satisfy all constraints
- Labelings are ordered by preference satisfaction (most preferred first)

**Testing Strategy:**
- Create a graph with multiple labelings (e.g., complete semantics often yields several solutions)
- Add a constraint that eliminates some labelings
- Add preferences that differentiate between remaining labelings
- Verify that only constraint-satisfying labelings appear
- Verify that labelings are ordered by preference count

### Activating Weighted Graphs (WAF, WBAF, WQBAF)

**Current State:**

Edge weights are partially implemented: the UI can store and display edge weights, the textual description format supports them, and the framework type detection recognizes weighted frameworks. However, edge weights are not used in any semantic computation, and the edge weight input field is commented out in the relationship modal.

**Conceptual Workflow:**

Once completed, the feature should work as follows:

**For Extension-Based Semantics (WAF, WBAF):**
1. User creates arguments and relationships
2. User assigns weights to attack/support edges (values in [0,1])
3. User selects an extension-based semantic
4. Backend aggregates multiple attacks using their weights (e.g., weighted sum or product)
5. An argument is successfully attacked if the aggregated attack strength exceeds a threshold
6. Labelings are computed using weighted attack logic
7. Frontend displays labelings as usual

**For Gradual Semantics (WQBAF):**
1. User creates arguments with base weights
2. User creates weighted attack and support relationships
3. User selects a gradual semantic
4. Backend iteratively updates strength values, multiplying influences by edge weights
5. Final strength values reflect both node weights and edge weights
6. Frontend displays and colors nodes by strength

**Implementation Requirements:**

**Frontend Changes:**
- Uncomment the edge weight input field in the edge modal in `index.html`
- Uncomment the weight initialization and handling logic in `interface.js`
- Verify that edge weights are correctly passed to the edge creation callback
- Ensure edge weights are included in the textual description and preserved during graph-to-text synchronization
- No changes needed for display (edge weights already shown as edge labels if present)

**Backend Changes for Extension-Based (WAF/WBAF):**
- Modify the graph concatenation function to extract edge weights from the APX description
- Transform weighted attacks into ASP facts (e.g., `att_weight(a, b, 0.7)`)
- Add ASP rules to aggregate weighted attacks (sum, max, or product of incoming attack weights)
- Modify the semantic definition files to use aggregated attack strength instead of binary attack relations
- Define a threshold or continuous acceptance function based on aggregated strength
- Ensure the existing Clingo integration works with the extended ASP rules

**Backend Changes for Gradual (WQBAF):**
- Extend the QBAF parsing function to extract edge weights into a separate data structure
- Pass the edge weights dictionary to the aggregation functions (alpha_plus, alpha_minus)
- Modify aggregation functions to multiply each supporter/attacker's strength by the corresponding edge weight
- Ensure all six gradual semantics correctly incorporate edge weights in their formulas
- Update the aggregation modes (sum, max, deltasum, deltamax, product) to handle weighted contributions
- Test convergence behavior with various edge weight configurations

**Format Considerations:**

The APX-like format already supports edge weights: `att(a, b, 0.7).` and `support(a, b, 0.5).` No format changes are needed. JSON exports already include edge weights in the `weight` field of edge objects.

**Semantic Interpretation:**

Edge weights can be interpreted in several ways:
- **Attack weight**: How strong the attack is (0 = no effect, 1 = full strength attack)
- **Support weight**: How strong the support is (similar scale)
- **Confidence**: How certain we are about the relationship
- **Relevance**: How relevant this relationship is in the current context

The implementation should be flexible enough to support different interpretations, primarily controlled by the aggregation function choice.

**Testing Strategy:**

**For WAF/WBAF:**
- Create a simple graph: `a` attacks `b` with weight 0.3, `c` attacks `b` with weight 0.8
- Verify that `b` is defeated only if the aggregated attack (0.3 + 0.8 = 1.1 or max(0.3, 0.8) = 0.8) exceeds threshold
- Compare results with different aggregation functions
- Test with various weight distributions to ensure correctness

**For WQBAF:**
- Create arguments with base weights
- Add weighted attacks and supports
- Compute strength with different semantics (drl, eul, etc.)
- Verify that edge weights properly scale the influence of attackers/supporters
- Change edge weights and verify that final strengths change proportionally
- Test convergence speed with different epsilon values

**Documentation Updates:**

Once these features are implemented, update:
- Section 4 (Frontend Components) to document the uncommented UI fields
- Section 5 (Backend API) to document the extended parameters and aggregation logic
- Section 6 (Data Formats) to clarify that edge weights are now fully supported
- User manual to explain how to use weighted frameworks and preferences

# 10. Testing and Debugging

## Browser Console Usage

The browser developer console is the primary debugging tool for the frontend application.

**Opening the Console:**
- Chrome/Edge: F12 or Ctrl+Shift+J (Windows/Linux), Cmd+Option+J (Mac)
- Firefox: F12 or Ctrl+Shift+K (Windows/Linux), Cmd+Option+K (Mac)
- Safari: Cmd+Option+C (Mac, requires enabling Developer menu first)

**Key Console Features:**
- **Console tab**: View logged messages, errors, and warnings
- **Network tab**: Monitor API requests and responses (check `/api/computeBAF`, `/api/computeQBAF`, `/api/filterLabelings`)
- **Sources/Debugger tab**: Set breakpoints in JavaScript files
- **Elements/Inspector tab**: Inspect HTML structure and CSS styles

**Common Console Messages:**
- `"APX file imported successfully"`: Successful import
- `"Validation errors: ..."`: Description parsing failed
- `"computeBAF CALLED"`: Backend received extension-based request
- `"Error importing JSON"`: JSON format issue
- Cytoscape warnings about edge operations (known library bug, can be ignored)

**Debugging Workflow:**
1. Reproduce the issue
2. Open console and check for error messages
3. Use Network tab to verify API requests/responses
4. Set breakpoints in relevant JavaScript files
5. Inspect variables and call stack
6. Test fixes and verify in console

## Common Errors and Solutions

### Frontend Errors

**"Argument name is required"**
- Cause: Empty argument name in node modal
- Solution: Enter a valid alphanumeric name

**"Argument name already exists"**
- Cause: Duplicate node ID (case-insensitive)
- Solution: Choose a different name

**"Line X: UNKNOWN SYNTAX"**
- Cause: Invalid APX syntax in description textarea
- Solution: Check syntax (missing period, invalid characters, typos in `arg`, `att`, `support`)

**"Line X: Source/Target argument not declared"**
- Cause: Edge references non-existent node
- Solution: Declare all arguments before using them in relationships

**"No labelings to filter"**
- Cause: Trying to filter before computing labelings
- Solution: Click "Compute Labelings" first

**Modal won't close**
- Cause: JavaScript error or event listener issue
- Solution: Press ESC key or refresh page

### Backend Errors

**"File semantica 'sem/X.dl' non trovato"**
- Cause: Missing semantic definition file
- Solution: Ensure all `.dl` files exist in `backend/sem/` directory

**"Parametri 'content' e 'semantics' richiesti"**
- Cause: Malformed API request
- Solution: Check frontend API call includes all required parameters

**"Constraint non valido"**
- Cause: Invalid constraint syntax
- Solution: Use correct syntax (`in(a)`, `ou(b)`, `un(c)`, `!`, `,`, `;`)

**Clingo parsing errors**
- Cause: Invalid APX content sent to backend
- Solution: Validate description syntax on frontend before sending

**CORS errors**
- Cause: Frontend and backend on different domains without CORS headers
- Solution: Configure Apache proxy correctly or add Flask-CORS

**Connection refused**
- Cause: Gunicorn service not running
- Solution: `sudo systemctl start gunicorn.service`

### Network Issues

**API request timeout**
- Cause: Large graph or slow computation
- Solution: Increase timeout, optimize graph size, check backend logs

**502 Bad Gateway**
- Cause: Gunicorn crashed or Apache can't reach backend
- Solution: Check Gunicorn logs, restart service

## Code Style Guidelines

**JavaScript:**
- Use camelCase for variables and functions
- Use descriptive names (`updateGraphFromDescription` not `update`)
- Add comments for complex logic
- Keep functions focused and modular
- Use `const` for constants, `let` for variables
- Avoid global variables (use `window.` prefix if necessary)

**Python:**
- Follow PEP 8 style guide
- Use snake_case for functions and variables
- Add docstrings for functions
- Handle exceptions explicitly
- Use meaningful variable names

**HTML/CSS:**
- Use semantic HTML elements
- Keep CSS classes descriptive (`node-label-strength` not `nls`)
- Use CSS variables for colors (defined in `:root`)
- Keep inline styles minimal

## Testing Checklist

### Basic Functionality
- [ ] Create, edit, delete nodes via click and modal
- [ ] Create, edit, delete edges via two-click workflow
- [ ] Update description textarea after graph changes
- [ ] Rebuild graph from description textarea
- [ ] Apply different layouts (Smart mode, Circle, Grid, etc.)
- [ ] Context menus work on right-click

### Import/Export
- [ ] Export APX file and verify content
- [ ] Export JSON file and verify structure
- [ ] Export PNG image and verify quality
- [ ] Import APX file and verify graph recreation
- [ ] Import JSON file and verify layout/descriptions preserved
- [ ] Project name auto-fills from filename

### Extension-Based Semantics
- [ ] Compute labelings for AF (grounded, complete, preferred, stable)
- [ ] Compute labelings for BAF with supports
- [ ] Click on labeling to color graph
- [ ] Save labelings to file
- [ ] Apply constraints and filter labelings
- [ ] Save filtered labelings to file

### Gradual Semantics
- [ ] Create QBAF with node weights
- [ ] Compute strength for all semantics (drl, ddr, eul, dfq, mlp, qen)
- [ ] Verify strength values in range[0,1]
- [ ] Verify gradient coloring applied
- [ ] Verify strength displayed above node name
- [ ] Save strength results to file
- [ ] Parameters (epsilon, params, gamma) enable/disable correctly

### Framework Type Detection
- [ ] AF detected (no supports, no weights)
- [ ] BAF detected (with supports, no weights)
- [ ] QBAF detected (with node weights)
- [ ] Semantic panels switch automatically

### Error Handling
- [ ] Empty argument name shows error
- [ ] Duplicate argument name shows error
- [ ] Invalid weight range shows error
- [ ] Invalid description syntax shows line-specific errors
- [ ] Network errors show user-friendly alert
- [ ] Backend errors displayed in alert

### Edge Cases
- [ ] Graph with single node works
- [ ] Graph with 50+ nodes renders and computes
- [ ] Self-loops handled correctly
- [ ] Multiple edges between same nodes prevented
- [ ] Empty project name allowed
- [ ] Empty description allowed
- [ ] Special characters in descriptions work
- [ ] Very long argument names rejected

### Browser Compatibility
- [ ] Chrome 90+ (primary target)
- [ ] Firefox 88+
- [ ] Edge 90+
- [ ] Safari 14+
- [ ] File System Access API or fallback works

### Performance
- [ ] Graph with 100+ nodes remains responsive
- [ ] Layout computation completes in reasonable time
- [ ] API calls respond within 5 seconds for small graphs
- [ ] PNG export produces high-quality image
- [ ] No memory leaks after repeated operations

### Regression Testing

After any code change, verify:
- Core workflows still function (create graph, compute semantics, export)
- No new console errors appear
- Existing features not broken
- Performance not degraded

# 11. License and Credits

## License

The Argumentation Designer is licensed under the **MIT License**.

The MIT License is a permissive free software license that allows:
- Commercial and private use
- Modification and distribution
- Sublicensing

The only requirement is that the license and copyright notice must be included in all copies or substantial portions of the software.

## FAIR Project Acknowledgment

This tool is developed within the **FAIR (Future Artificial Intelligence Research) project**, specifically under **SPOKE 9**, which focuses on argumentation and reasoning systems.

**Project Details:**
- Project Code: PE00000013
- CUP: H23C22000860006
- Program: Piano Nazionale di Ripresa e Resilienza (PNRR)
- Mission: Missione 4 - Istruzione e Ricerca
- Component: Componente 2 - Dalla ricerca all'impresa
- Investment: Investimento 1.3 - Partenariati estesi
- Funding: European Union - NextGenerationEU

**Institution:**
Università della Calabria - DIMES (Dipartimento di Ingegneria Informatica, Modellistica, Elettronica e Sistemistica)

The footer of the application displays this acknowledgment in compliance with funding requirements.

## Third-Party Libraries Credits

The Argumentation Designer relies on several open-source libraries and frameworks:

**Frontend Libraries:**
- **Cytoscape.js** (v3.33.1) - MIT License
  - Graph theory library for visualization and analysis
  - https://js.cytoscape.org/

- **cytoscape-node-html-label** (v1.2.2) - MIT License
  - Plugin for rendering HTML labels inside nodes
  - https://github.com/kaluginserg/cytoscape-node-html-label

- **html2canvas** - MIT License
  - JavaScript HTML renderer for PNG export fallback
  - https://html2canvas.hertzen.com/

**Backend Libraries:**
- **Flask** (v2.0+) - BSD-3-Clause License
  - Lightweight Python web framework
  - https://flask.palletsprojects.com/

- **Clingo** (v5.5+) - MIT License
  - Answer Set Programming solver for extension-based semantics
  - https://potassco.org/clingo/

- **NumPy** (v1.21+) - BSD License
  - Numerical computing library for gradual semantics
  - https://numpy.org/

- **Gunicorn** (v20.1+) - MIT License
  - Python WSGI HTTP server for production deployment
  - https://gunicorn.org/

**Infrastructure:**
- **Apache HTTP Server** - Apache License 2.0
  - Web server and reverse proxy
  - https://httpd.apache.org/

All third-party libraries are used in accordance with their respective licenses. Users of the Argumentation Designer should comply with these licenses when redistributing or modifying the software.

## Contributors

For a complete list of contributors and the research team behind this project, visit the "People" page at:
https://argumentation.dimes.unical.it/people.html

## Publications

For scientific publications related to this tool and the underlying argumentation framework research, visit:
https://argumentation.dimes.unical.it/publications.html

## Citing This Tool

If you use the Argumentation Designer in your research, please cite the FAIR project and reference the tool's website.
