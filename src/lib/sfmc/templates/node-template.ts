/**
 * Golden Template: Node.js Custom Activity
 * This template provides a complete, validated structure that the AI modifies
 */

import type { ExtractedRequirements } from "../types";

export function generateNodeTemplate(requirements: ExtractedRequirements): Record<string, string> {
  const safeName = (requirements.activityName || "custom-activity")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  const inArgs = requirements.inArguments || [];
  const outArgs = requirements.outArguments || [];
  const apis = requirements.externalAPIs || [];
  const configSteps = requirements.configurationSteps || [];

  // Generate package.json
  const packageJson = {
    name: safeName,
    version: "1.0.0",
    description: requirements.activityDescription || `SFMC Custom Activity: ${requirements.activityName}`,
    main: "server.js",
    scripts: {
      start: "node server.js",
      dev: "nodemon server.js",
      test: "echo \"No tests configured\" && exit 0"
    },
    dependencies: {
      express: "^4.18.2",
      "body-parser": "^1.20.2",
      cors: "^2.8.5",
      dotenv: "^16.3.1",
      axios: "^1.6.0"
    },
    devDependencies: {
      nodemon: "^3.0.2"
    },
    engines: {
      node: ">=18.0.0"
    }
  };

  // Generate config.json
  const configJson = generateConfigJson(requirements);

  // Generate server.js
  const serverJs = generateServerJs(requirements);

  // Generate execute route
  const executeJs = generateExecuteRoute(requirements);

  // Generate index.html
  const indexHtml = generateIndexHtml(requirements);

  // Generate customActivity.js
  const customActivityJs = generateCustomActivityJs(requirements);

  // Generate .env.example
  const envExample = generateEnvExample(apis);

  // Generate README.md
  const readme = generateReadme(requirements);

  return {
    "package.json": JSON.stringify(packageJson, null, 2),
    "server.js": serverJs,
    "routes/execute.js": executeJs,
    "routes/save.js": generateSaveRoute(),
    "routes/publish.js": generatePublishRoute(),
    "routes/validate.js": generateValidateRoute(),
    "public/config.json": JSON.stringify(configJson, null, 2),
    "public/index.html": indexHtml,
    "public/customActivity.js": customActivityJs,
    ".env.example": envExample,
    "README.md": readme,
    ".gitignore": "node_modules/\n.env\n.DS_Store\n*.log\n"
  };
}

function generateConfigJson(req: ExtractedRequirements): Record<string, unknown> {
  const isDecision = req.isDecisionSplit || false;
  const inArgs = req.inArguments || [];
  const outArgs = req.outArguments || [];

  const config: Record<string, unknown> = {
    workflowApiVersion: "1.1",
    metaData: {
      icon: "images/icon.png",
      category: req.category || "custom",
      isConfigured: true
    },
    type: isDecision ? "RestDecision" : "REST",
    lang: {
      "en-US": {
        name: req.activityName,
        description: req.activityDescription || `Custom Activity: ${req.activityName}`
      }
    },
    arguments: {
      execute: {
        inArguments: inArgs.map(arg => ({
          [arg.name]: arg.source ? `{{${arg.source}}}` : `{{Contact.Attribute.${arg.name}}}`
        })),
        outArguments: outArgs.map(arg => ({
          [arg.name]: ""
        })),
        timeout: 90000,
        retryCount: 1,
        retryDelay: 1000,
        url: "{{BASE_URL}}/execute"
      }
    },
    configurationArguments: {
      save: { url: "{{BASE_URL}}/save" },
      publish: { url: "{{BASE_URL}}/publish" },
      validate: { url: "{{BASE_URL}}/validate" }
    },
    userInterfaces: {
      configModal: {
        height: 600,
        width: 800,
        url: "{{BASE_URL}}/index.html"
      }
    },
    schema: {
      arguments: {
        execute: {
          inArguments: inArgs.map(arg => ({
            [arg.name]: {
              dataType: arg.type === "number" ? "Number" : "Text",
              isNullable: !arg.required
            }
          })),
          outArguments: outArgs.map(arg => ({
            [arg.name]: {
              dataType: arg.type === "number" ? "Number" : "Text"
            }
          }))
        }
      }
    }
  };

  // Add outcomes for decision splits
  if (isDecision && req.outcomes && req.outcomes.length >= 2) {
    config.outcomes = req.outcomes.map((outcome) => ({
      key: outcome.key,
      metaData: { label: outcome.label },
      arguments: { branchResult: outcome.key }
    }));
  }

  return config;
}

function generateServerJs(req: ExtractedRequirements): string {
  return `/**
 * ${req.activityName} - SFMC Custom Activity
 * ${req.activityDescription || ''}
 */

require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Routes
app.use('/', require('./routes/execute'));
app.use('/', require('./routes/save'));
app.use('/', require('./routes/publish'));
app.use('/', require('./routes/validate'));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    activity: '${req.activityName}',
    timestamp: new Date().toISOString()
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ 
    success: false, 
    error: err.message || 'Internal server error' 
  });
});

app.listen(PORT, () => {
  console.log(\`🚀 ${req.activityName} Custom Activity running on port \${PORT}\`);
});

module.exports = app;
`;
}

function generateExecuteRoute(req: ExtractedRequirements): string {
  const inArgs = req.inArguments || [];
  const outArgs = req.outArguments || [];
  const apis = req.externalAPIs || [];
  const isDecision = req.isDecisionSplit || false;

  // Generate argument extraction
  const argExtractions = inArgs
    .map(arg => `  const ${arg.name} = args.${arg.name};`)
    .join('\n');

  // Generate API call based on external APIs
  let apiLogic = '';
  if (apis.length > 0) {
    const api = apis[0];
    if (api.authentication === 'webhook') {
      apiLogic = `
    // Call webhook
    const webhookUrl = process.env.${api.envVarName || 'WEBHOOK_URL'};
    if (!webhookUrl) {
      throw new Error('Webhook URL not configured');
    }
    
    const webhookPayload = {
      ${inArgs.map(a => `${a.name}`).join(',\n      ')}
    };
    
    const response = await axios.post(webhookUrl, webhookPayload);
    const apiResult = response.data;`;
    } else if (api.authentication === 'api-key' || api.authentication === 'bearer') {
      apiLogic = `
    // Call external API
    const apiUrl = process.env.${api.envVarName || 'API_URL'} || '${api.baseUrl || ''}';
    const apiKey = process.env.${api.envVarName || 'API'}_KEY;
    
    if (!apiUrl || !apiKey) {
      throw new Error('API configuration missing');
    }
    
    const response = await axios.post(apiUrl, {
      ${inArgs.map(a => `${a.name}`).join(',\n      ')}
    }, {
      headers: { 
        'Authorization': \`${api.authentication === 'bearer' ? 'Bearer' : 'Api-Key'} \${apiKey}\`,
        'Content-Type': 'application/json'
      }
    });
    const apiResult = response.data;`;
    } else {
      apiLogic = `
    // Execute business logic
    // TODO: Implement your custom logic here
    const apiResult = { success: true };`;
    }
  } else {
    apiLogic = `
    // Execute business logic
    // TODO: Implement your custom logic here
    const result = { success: true };`;
  }

  // Generate decision split logic if needed
  let decisionLogic = '';
  if (isDecision && req.outcomes && req.outcomes.length >= 2) {
    decisionLogic = `
    // Decision split logic
    let branchResult = '${req.outcomes[0].key}'; // Default outcome
    
    // TODO: Implement your decision logic here
    // Example:
    // if (someCondition) {
    //   branchResult = '${req.outcomes[1].key}';
    // }
    
    return res.status(200).json({
      branchResult,
      ${outArgs.map(a => `${a.name}: apiResult?.${a.name} || ''`).join(',\n      ')}
    });`;
  } else {
    decisionLogic = `
    // Return out arguments
    return res.status(200).json({
      ${outArgs.length > 0 
        ? outArgs.map(a => `${a.name}: apiResult?.${a.name} || ''`).join(',\n      ')
        : 'success: true'}
    });`;
  }

  return `/**
 * Execute endpoint for ${req.activityName}
 * Called by Journey Builder for each contact
 */

const express = require('express');
const router = express.Router();
const axios = require('axios');

router.post('/execute', async (req, res) => {
  const startTime = Date.now();
  
  try {
    // Extract Journey Builder context
    const { inArguments = [], journeyId, activityId, activityInstanceId } = req.body;
    const args = inArguments[0] || {};
    
    console.log(\`[EXECUTE] Journey: \${journeyId}, Activity: \${activityId}\`);
    console.log('[EXECUTE] Input arguments:', JSON.stringify(args, null, 2));

    // Extract input arguments
${argExtractions || '    // No input arguments defined'}

    // Validate required arguments
${inArgs.filter(a => a.required).map(a => 
`    if (!${a.name}) {
      return res.status(400).json({ error: '${a.name} is required' });
    }`
).join('\n') || '    // No required arguments'}
${apiLogic}
${decisionLogic}

  } catch (error) {
    console.error('[EXECUTE ERROR]', error.message);
    console.error('[EXECUTE ERROR] Stack:', error.stack);
    
    // Return error with proper format
    return res.status(500).json({
      success: false,
      error: error.message,
      executionTime: Date.now() - startTime
    });
  }
});

module.exports = router;
`;
}

function generateSaveRoute(): string {
  return `/**
 * Save endpoint - called when activity configuration is saved
 */

const express = require('express');
const router = express.Router();

router.post('/save', (req, res) => {
  console.log('[SAVE] Configuration saved');
  console.log('[SAVE] Payload:', JSON.stringify(req.body, null, 2));
  
  // Validate configuration if needed
  // const { payload } = req.body;
  
  return res.status(200).json({ success: true });
});

module.exports = router;
`;
}

function generatePublishRoute(): string {
  return `/**
 * Publish endpoint - called when journey is published
 */

const express = require('express');
const router = express.Router();

router.post('/publish', (req, res) => {
  console.log('[PUBLISH] Journey published');
  console.log('[PUBLISH] Payload:', JSON.stringify(req.body, null, 2));
  
  // Perform any setup needed when journey goes live
  
  return res.status(200).json({ success: true });
});

module.exports = router;
`;
}

function generateValidateRoute(): string {
  return `/**
 * Validate endpoint - called to validate activity configuration
 */

const express = require('express');
const router = express.Router();

router.post('/validate', (req, res) => {
  console.log('[VALIDATE] Validating configuration');
  console.log('[VALIDATE] Payload:', JSON.stringify(req.body, null, 2));
  
  // TODO: Add validation logic
  // const { payload } = req.body;
  // if (!payload.someRequiredField) {
  //   return res.status(400).json({ 
  //     success: false, 
  //     error: 'someRequiredField is required' 
  //   });
  // }
  
  return res.status(200).json({ success: true });
});

module.exports = router;
`;
}

function generateIndexHtml(req: ExtractedRequirements): string {
  const configSteps = req.configurationSteps || [];
  
  // Generate form fields from configuration steps
  let formFields = '';
  if (configSteps.length > 0) {
    formFields = configSteps.flatMap(step => 
      step.fields.map(field => {
        switch (field.type) {
          case 'textarea':
            return `
          <div class="form-group">
            <label for="${field.name}">${field.label}${field.required ? ' *' : ''}</label>
            <textarea 
              id="${field.name}" 
              name="${field.name}" 
              placeholder="${field.placeholder || ''}"
              ${field.required ? 'required' : ''}
            ></textarea>
          </div>`;
          case 'select':
            return `
          <div class="form-group">
            <label for="${field.name}">${field.label}${field.required ? ' *' : ''}</label>
            <select id="${field.name}" name="${field.name}" ${field.required ? 'required' : ''}>
              <option value="">Select...</option>
              ${(field.options || []).map(opt => 
                `<option value="${opt.value}">${opt.label}</option>`
              ).join('\n              ')}
            </select>
          </div>`;
          case 'checkbox':
            return `
          <div class="form-group checkbox">
            <label>
              <input type="checkbox" id="${field.name}" name="${field.name}" />
              ${field.label}
            </label>
          </div>`;
          default:
            return `
          <div class="form-group">
            <label for="${field.name}">${field.label}${field.required ? ' *' : ''}</label>
            <input 
              type="${field.type === 'number' ? 'number' : field.type === 'url' ? 'url' : 'text'}"
              id="${field.name}" 
              name="${field.name}" 
              placeholder="${field.placeholder || ''}"
              ${field.required ? 'required' : ''}
            />
          </div>`;
        }
      })
    ).join('\n');
  } else {
    formFields = `
          <div class="form-group">
            <label for="message">Message</label>
            <textarea id="message" name="message" placeholder="Enter your message..."></textarea>
          </div>`;
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${req.activityName}</title>
  <style>
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
      background: #f5f7fa;
      color: #333;
      line-height: 1.6;
    }
    
    .container {
      max-width: 600px;
      margin: 0 auto;
      padding: 24px;
    }
    
    .header {
      margin-bottom: 24px;
    }
    
    .header h1 {
      font-size: 24px;
      font-weight: 600;
      color: #1a1a1a;
      margin-bottom: 8px;
    }
    
    .header p {
      color: #666;
      font-size: 14px;
    }
    
    .form-group {
      margin-bottom: 20px;
    }
    
    .form-group label {
      display: block;
      font-size: 14px;
      font-weight: 500;
      color: #374151;
      margin-bottom: 6px;
    }
    
    .form-group input,
    .form-group textarea,
    .form-group select {
      width: 100%;
      padding: 10px 12px;
      border: 1px solid #d1d5db;
      border-radius: 6px;
      font-size: 14px;
      transition: border-color 0.2s, box-shadow 0.2s;
    }
    
    .form-group input:focus,
    .form-group textarea:focus,
    .form-group select:focus {
      outline: none;
      border-color: #3b82f6;
      box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
    }
    
    .form-group textarea {
      min-height: 100px;
      resize: vertical;
    }
    
    .form-group.checkbox label {
      display: flex;
      align-items: center;
      gap: 8px;
      cursor: pointer;
    }
    
    .form-group.checkbox input {
      width: auto;
    }
    
    .error-message {
      background: #fef2f2;
      border: 1px solid #fecaca;
      color: #dc2626;
      padding: 12px;
      border-radius: 6px;
      margin-bottom: 20px;
      font-size: 14px;
      display: none;
    }
    
    .success-message {
      background: #f0fdf4;
      border: 1px solid #bbf7d0;
      color: #16a34a;
      padding: 12px;
      border-radius: 6px;
      margin-bottom: 20px;
      font-size: 14px;
      display: none;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${req.activityName}</h1>
      <p>${req.activityDescription || 'Configure your custom activity settings below.'}</p>
    </div>
    
    <div id="error-message" class="error-message"></div>
    <div id="success-message" class="success-message"></div>
    
    <form id="config-form">
${formFields}
    </form>
  </div>
  
  <script src="https://cdn.jsdelivr.net/npm/postmonger@1.1.0/postmonger.min.js"></script>
  <script src="customActivity.js"></script>
</body>
</html>
`;
}

function generateCustomActivityJs(req: ExtractedRequirements): string {
  const configSteps = req.configurationSteps || [];
  const allFields = configSteps.flatMap(s => s.fields);
  
  const fieldNames = allFields.map(f => f.name);
  const requiredFields = allFields.filter(f => f.required).map(f => f.name);

  return `/**
 * ${req.activityName} - Custom Activity Client
 * Handles communication with Journey Builder via Postmonger
 */

'use strict';

var connection = new Postmonger.Session();
var payload = {};
var hasValidated = false;

// Initialize when document is ready
document.addEventListener('DOMContentLoaded', function() {
  connection.trigger('ready');
  connection.trigger('requestInteraction');
});

// Event handlers
connection.on('initActivity', function(data) {
  console.log('[INIT] Activity initialized:', data);
  
  if (data) {
    payload = data;
  }
  
  // Populate form with existing values
  var args = payload.arguments?.execute?.inArguments?.[0] || {};
  ${fieldNames.map(name => `
  if (args.${name}) {
    var el = document.getElementById('${name}');
    if (el) {
      if (el.type === 'checkbox') {
        el.checked = args.${name};
      } else {
        el.value = args.${name};
      }
    }
  }`).join('')}
  
  hasValidated = false;
});

connection.on('requestedInteraction', function(interaction) {
  console.log('[INTERACTION] Requested:', interaction);
});

connection.on('clickedNext', function() {
  console.log('[NEXT] Clicked');
  
  // Validate required fields
  var isValid = true;
  var errorMessage = '';
  ${requiredFields.map(name => `
  var ${name}El = document.getElementById('${name}');
  if (${name}El && !${name}El.value) {
    isValid = false;
    errorMessage = '${name} is required';
  }`).join('')}
  
  if (!isValid) {
    showError(errorMessage);
    return;
  }
  
  // Collect form values
  var configValues = {};
  ${fieldNames.map(name => `
  var ${name}Input = document.getElementById('${name}');
  if (${name}Input) {
    configValues.${name} = ${name}Input.type === 'checkbox' ? ${name}Input.checked : ${name}Input.value;
  }`).join('')}
  
  // Update payload
  payload.arguments = payload.arguments || {};
  payload.arguments.execute = payload.arguments.execute || {};
  payload.arguments.execute.inArguments = [configValues];
  
  payload.metaData = payload.metaData || {};
  payload.metaData.isConfigured = true;
  
  console.log('[NEXT] Saving payload:', payload);
  
  connection.trigger('updateActivity', payload);
});

connection.on('clickedBack', function() {
  console.log('[BACK] Clicked');
  connection.trigger('prevStep');
});

connection.on('gotoStep', function(step) {
  console.log('[GOTO] Step:', step);
});

// Helper functions
function showError(message) {
  var errorEl = document.getElementById('error-message');
  if (errorEl) {
    errorEl.textContent = message;
    errorEl.style.display = 'block';
  }
  
  var successEl = document.getElementById('success-message');
  if (successEl) {
    successEl.style.display = 'none';
  }
}

function showSuccess(message) {
  var successEl = document.getElementById('success-message');
  if (successEl) {
    successEl.textContent = message;
    successEl.style.display = 'block';
  }
  
  var errorEl = document.getElementById('error-message');
  if (errorEl) {
    errorEl.style.display = 'none';
  }
}
`;
}

function generateEnvExample(apis: ExtractedRequirements["externalAPIs"]): string {
  let envContent = `# Server Configuration
PORT=3000
NODE_ENV=development

# SFMC Configuration (optional)
SFMC_CLIENT_ID=your_client_id
SFMC_CLIENT_SECRET=your_client_secret
`;

  if (apis && apis.length > 0) {
    envContent += `\n# External API Configuration\n`;
    for (const api of apis) {
      const varName = api.envVarName || api.name.toUpperCase().replace(/\s+/g, '_');
      if (api.authentication === 'webhook') {
        envContent += `${varName}_URL=https://your-webhook-url.com/hook\n`;
      } else if (api.authentication === 'api-key' || api.authentication === 'bearer') {
        envContent += `${varName}_URL=${api.baseUrl || 'https://api.example.com'}\n`;
        envContent += `${varName}_KEY=your_api_key_here\n`;
      }
    }
  }

  return envContent;
}

function generateReadme(req: ExtractedRequirements): string {
  return `# ${req.activityName}

${req.activityDescription || 'A Salesforce Marketing Cloud Custom Activity'}

## Quick Start

1. Install dependencies:
   \`\`\`bash
   npm install
   \`\`\`

2. Copy \`.env.example\` to \`.env\` and configure your environment variables:
   \`\`\`bash
   cp .env.example .env
   \`\`\`

3. Start the server:
   \`\`\`bash
   npm start
   \`\`\`

4. The server will run on \`http://localhost:3000\`

## Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| \`/execute\` | POST | Main execution endpoint called for each contact |
| \`/save\` | POST | Called when activity configuration is saved |
| \`/publish\` | POST | Called when the journey is published |
| \`/validate\` | POST | Validates the activity configuration |
| \`/health\` | GET | Health check endpoint |

## Configuration

### Input Arguments
${(req.inArguments || []).map(a => `- \`${a.name}\` (${a.type})${a.required ? ' - Required' : ''}`).join('\n') || 'None configured'}

### Output Arguments
${(req.outArguments || []).map(a => `- \`${a.name}\` (${a.type})`).join('\n') || 'None configured'}

## Deployment

This activity can be deployed to any hosting provider that supports Node.js:

### Vercel
\`\`\`bash
vercel deploy
\`\`\`

### Railway
\`\`\`bash
railway up
\`\`\`

### Render
Connect your GitHub repository to Render and it will auto-deploy.

## SFMC Configuration

1. Upload the \`public/config.json\` to your Marketing Cloud Custom Activity
2. Replace \`{{BASE_URL}}\` with your deployed server URL
3. Add the activity to your Journey Builder canvas

## Files Structure

\`\`\`
├── package.json
├── server.js              # Main Express server
├── routes/
│   ├── execute.js         # Execute endpoint logic
│   ├── save.js            # Save configuration
│   ├── publish.js         # Publish handler
│   └── validate.js        # Validation endpoint
├── public/
│   ├── config.json        # SFMC activity configuration
│   ├── index.html         # Configuration UI
│   └── customActivity.js  # Postmonger client
└── .env.example           # Environment variables template
\`\`\`

## License

MIT
`;
}
