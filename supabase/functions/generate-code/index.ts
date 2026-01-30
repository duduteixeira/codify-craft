import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ============================================================================
// SFMC RULES - Injected into code generation prompt
// ============================================================================
const SFMC_CODE_RULES = `
## Code Generation Rules (MANDATORY)

1. You are MODIFYING a template, not creating from scratch
2. Keep all boilerplate code intact (server setup, middleware, etc.)
3. Only customize the parts that implement the specific business logic
4. NEVER invent new fields or arguments not in the requirements
5. Use environment variables for ALL sensitive data (API keys, webhooks)
6. Include proper error handling in all async operations
7. For decision splits, ALWAYS return { branchResult: "outcome_key" }
8. Return files as a JSON object: { "filepath": "content", ... }
`;

interface GenerateCodeRequest {
  requirements: any;
  activityName: string;
  stack?: "node" | "ssjs";
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { requirements, activityName, stack = "node" } = await req.json() as GenerateCodeRequest;

    if (!requirements) {
      return new Response(
        JSON.stringify({ error: "Requirements are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: "AI service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Generating ${requirements.isDecisionSplit ? 'Decision Split' : 'Custom Activity'} code for: ${activityName}`);

    // Generate files using templates + AI customization
    const isDecision = requirements.isDecisionSplit || false;
    
    // Step 1: Generate config.json
    const configJson = generateConfigJson(requirements, activityName, isDecision);

    // Step 2: Generate Node.js server code using templates + AI
    const nodejsCode = await generateNodeCode(requirements, activityName, LOVABLE_API_KEY);

    // Step 3: Generate client-side JavaScript using template + AI
    const javascriptCode = await generateClientCode(requirements, configJson, LOVABLE_API_KEY);

    // Step 4: Validate the generated code
    const validation = validateGeneratedCode(configJson, nodejsCode, javascriptCode, requirements);

    console.log(`Successfully generated code for: ${activityName}`);
    console.log(`Validation: ${validation.isValid ? 'PASSED' : 'WARNINGS'} - ${validation.errors.length} errors, ${validation.warnings.length} warnings`);

    return new Response(
      JSON.stringify({
        configJson,
        nodejsCode,
        javascriptCode,
        validation,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in generate-code:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// ============================================================================
// Template-Based Config.json Generation
// ============================================================================
function generateConfigJson(req: any, activityName: string, isDecision: boolean): any {
  const inArgs = req.inArguments || [];
  const outArgs = req.outArguments || [];
  const outcomes = req.outcomes || [];

  const config: Record<string, any> = {
    workflowApiVersion: "1.1",
    metaData: {
      icon: "images/icon.png",
      category: req.category || "custom",
      isConfigured: true
    },
    type: isDecision ? "RestDecision" : "REST",
    lang: {
      "en-US": {
        name: activityName,
        description: req.activityDescription || `Custom Activity: ${activityName}`
      }
    },
    arguments: {
      execute: {
        inArguments: inArgs.map((arg: any) => ({
          [arg.name]: arg.source ? `{{${arg.source}}}` : `{{Contact.Attribute.${arg.name}}}`
        })),
        outArguments: isDecision 
          ? [{ branchResult: "" }]
          : outArgs.map((arg: any) => ({ [arg.name]: "" })),
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
          inArguments: inArgs.map((arg: any) => ({
            [arg.name]: {
              dataType: arg.type === "number" ? "Number" : "Text",
              isNullable: !arg.required
            }
          })),
          outArguments: isDecision
            ? [{ branchResult: { dataType: "Text", access: "visible", direction: "out" } }]
            : outArgs.map((arg: any) => ({
                [arg.name]: { dataType: arg.type === "number" ? "Number" : "Text" }
              }))
        }
      }
    }
  };

  // Add outcomes for decision splits
  if (isDecision && outcomes.length >= 2) {
    config.outcomes = outcomes.map((outcome: any) => ({
      key: outcome.key || outcome.label?.toLowerCase().replace(/\s+/g, '_'),
      metaData: { label: outcome.label },
      arguments: { branchResult: outcome.key || outcome.label?.toLowerCase().replace(/\s+/g, '_') }
    }));
  }

  return config;
}

// ============================================================================
// Template-Based Node.js Code Generation
// ============================================================================
async function generateNodeCode(req: any, activityName: string, apiKey: string): Promise<Record<string, string>> {
  const safeName = activityName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const inArgs = req.inArguments || [];
  const outArgs = req.outArguments || [];
  const apis = req.externalAPIs || [];
  const isDecision = req.isDecisionSplit || false;
  const outcomes = req.outcomes || [];

  // Package.json - Template
  const packageJson = {
    name: safeName,
    version: "1.0.0",
    description: req.activityDescription || `SFMC Custom Activity: ${activityName}`,
    main: "server.js",
    scripts: {
      start: "node server.js",
      dev: "nodemon server.js",
      test: "echo \"No tests\" && exit 0"
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
    engines: { node: ">=18.0.0" }
  };

  // Server.js - Template
  const serverJs = `/**
 * ${activityName} - SFMC Custom Activity
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

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', activity: '${activityName}', timestamp: new Date().toISOString() });
});

// Error handling
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ success: false, error: err.message });
});

app.listen(PORT, () => {
  console.log(\`🚀 ${activityName} Custom Activity running on port \${PORT}\`);
});
`;

  // Execute route - Customized based on requirements
  const executeJs = generateExecuteRoute(req, activityName, inArgs, outArgs, apis, isDecision, outcomes);

  // Standard routes - Templates
  const saveJs = `const express = require('express');
const router = express.Router();

router.post('/save', (req, res) => {
  console.log('[SAVE] Configuration saved:', JSON.stringify(req.body, null, 2));
  res.status(200).json({ success: true });
});

module.exports = router;`;

  const publishJs = `const express = require('express');
const router = express.Router();

router.post('/publish', (req, res) => {
  console.log('[PUBLISH] Journey published:', JSON.stringify(req.body, null, 2));
  res.status(200).json({ success: true });
});

module.exports = router;`;

  const validateJs = `const express = require('express');
const router = express.Router();

router.post('/validate', (req, res) => {
  console.log('[VALIDATE] Validating:', JSON.stringify(req.body, null, 2));
  // Add validation logic here
  res.status(200).json({ success: true });
});

module.exports = router;`;

  return {
    "package.json": JSON.stringify(packageJson, null, 2),
    "server.js": serverJs,
    "routes/execute.js": executeJs,
    "routes/save.js": saveJs,
    "routes/publish.js": publishJs,
    "routes/validate.js": validateJs,
  };
}

function generateExecuteRoute(
  req: any,
  activityName: string,
  inArgs: any[],
  outArgs: any[],
  apis: any[],
  isDecision: boolean,
  outcomes: any[]
): string {
  // Generate argument extraction
  const argExtractions = inArgs
    .map(arg => `  const ${arg.name} = args.${arg.name};`)
    .join('\n');

  // Generate required argument validation
  const requiredValidation = inArgs
    .filter(a => a.required)
    .map(a => `  if (!${a.name}) {
    console.error('[EXECUTE] Missing required: ${a.name}');
    ${isDecision ? `return res.status(200).json({ branchResult: '${outcomes[0]?.key || 'default'}' });` : `return res.status(400).json({ error: '${a.name} is required' });`}
  }`)
    .join('\n');

  // Generate API call logic
  let apiLogic = '';
  if (apis.length > 0) {
    const api = apis[0];
    const envVar = api.envVarName || api.name.toUpperCase().replace(/\s+/g, '_');
    
    if (api.authentication === 'webhook') {
      apiLogic = `
    // Call webhook
    const webhookUrl = process.env.${envVar}_URL;
    if (!webhookUrl) throw new Error('Webhook URL not configured');
    
    const response = await axios.post(webhookUrl, { ${inArgs.map(a => a.name).join(', ')} });
    const apiResult = response.data;`;
    } else if (api.authentication === 'api-key' || api.authentication === 'bearer') {
      apiLogic = `
    // Call external API
    const apiUrl = process.env.${envVar}_URL || '${api.baseUrl || ''}';
    const apiKey = process.env.${envVar}_KEY;
    if (!apiUrl || !apiKey) throw new Error('API configuration missing');
    
    const response = await axios.post(apiUrl, { ${inArgs.map(a => a.name).join(', ')} }, {
      headers: { 'Authorization': \`${api.authentication === 'bearer' ? 'Bearer' : 'Api-Key'} \${apiKey}\`, 'Content-Type': 'application/json' }
    });
    const apiResult = response.data;`;
    } else {
      apiLogic = `
    // Execute business logic
    const apiResult = { success: true };`;
    }
  } else {
    apiLogic = `
    // Execute business logic
    // TODO: Implement your custom logic here
    const apiResult = { success: true };`;
  }

  // Generate return logic
  let returnLogic = '';
  if (isDecision) {
    const outcomeKeys = outcomes.map(o => `'${o.key}'`).join(', ');
    returnLogic = `
    // Decision logic - determine branch
    let branchResult = '${outcomes[0]?.key || 'default'}'; // Default outcome
    
    // TODO: Implement your decision logic
    // Example:
    // if (someCondition) branchResult = '${outcomes[1]?.key || 'alternative'}';
    
    // Validate outcome
    const validOutcomes = [${outcomeKeys}];
    if (!validOutcomes.includes(branchResult)) {
      console.warn('[EXECUTE] Invalid outcome, using default');
      branchResult = validOutcomes[0];
    }
    
    console.log('[EXECUTE] Decision:', branchResult);
    return res.status(200).json({ branchResult });`;
  } else {
    const outArgReturn = outArgs.length > 0
      ? outArgs.map(a => `${a.name}: apiResult?.${a.name} || ''`).join(',\n      ')
      : 'success: true';
    returnLogic = `
    return res.status(200).json({
      ${outArgReturn}
    });`;
  }

  return `/**
 * Execute endpoint for ${activityName}${isDecision ? ' (Decision Split)' : ''}
 */
const express = require('express');
const router = express.Router();
const axios = require('axios');

router.post('/execute', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { inArguments = [], journeyId, activityId } = req.body;
    const args = inArguments[0] || {};
    
    console.log('[EXECUTE] Journey:', journeyId, 'Activity:', activityId);
    console.log('[EXECUTE] Args:', JSON.stringify(args, null, 2));

    // Extract input arguments
${argExtractions || '    // No input arguments'}

    // Validate required arguments
${requiredValidation || '    // No required validation'}
${apiLogic}
${returnLogic}

  } catch (error) {
    console.error('[EXECUTE ERROR]', error.message);
    ${isDecision 
      ? `return res.status(200).json({ branchResult: '${outcomes[0]?.key || 'default'}' });` 
      : `return res.status(500).json({ success: false, error: error.message });`}
  }
});

module.exports = router;
`;
}

// ============================================================================
// Template-Based Client Code Generation
// ============================================================================
async function generateClientCode(req: any, configJson: any, apiKey: string): Promise<string> {
  const configSteps = req.configurationSteps || [];
  const allFields = configSteps.flatMap((s: any) => s.fields || []);
  const fieldNames = allFields.map((f: any) => f.name);
  const requiredFields = allFields.filter((f: any) => f.required).map((f: any) => f.name);

  const populateCode = fieldNames.map((name: string) => `
  if (args.${name}) {
    var el = document.getElementById('${name}');
    if (el) el.type === 'checkbox' ? el.checked = args.${name} : el.value = args.${name};
  }`).join('');

  const validateCode = requiredFields.map((name: string) => `
  var ${name}El = document.getElementById('${name}');
  if (${name}El && !${name}El.value) {
    showError('${name} is required');
    return;
  }`).join('');

  const collectCode = fieldNames.map((name: string) => `
  var ${name}Input = document.getElementById('${name}');
  if (${name}Input) configValues.${name} = ${name}Input.type === 'checkbox' ? ${name}Input.checked : ${name}Input.value;`).join('');

  return `/**
 * ${req.activityName || 'Custom Activity'} - Postmonger Client
 */
'use strict';

var connection = new Postmonger.Session();
var payload = {};

document.addEventListener('DOMContentLoaded', function() {
  connection.trigger('ready');
  connection.trigger('requestInteraction');
});

connection.on('initActivity', function(data) {
  console.log('[INIT]', data);
  if (data) payload = data;
  
  // Populate form with existing values
  var args = payload.arguments?.execute?.inArguments?.[0] || {};
  ${populateCode}
});

connection.on('requestedInteraction', function(interaction) {
  console.log('[INTERACTION]', interaction);
});

connection.on('clickedNext', function() {
  // Validate required fields
  ${validateCode}
  
  // Collect values
  var configValues = {};
  ${collectCode}
  
  // Update payload
  payload.arguments = payload.arguments || {};
  payload.arguments.execute = payload.arguments.execute || {};
  payload.arguments.execute.inArguments = [configValues];
  payload.metaData = payload.metaData || {};
  payload.metaData.isConfigured = true;
  
  console.log('[SAVE]', payload);
  connection.trigger('updateActivity', payload);
});

connection.on('clickedBack', function() {
  connection.trigger('prevStep');
});

function showError(msg) {
  var el = document.getElementById('error-message');
  if (el) { el.textContent = msg; el.style.display = 'block'; }
}
`;
}

// ============================================================================
// Validation
// ============================================================================
function validateGeneratedCode(
  configJson: any,
  nodejsCode: Record<string, string>,
  javascriptCode: string,
  requirements: any
): { isValid: boolean; errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validate config.json
  if (!configJson.workflowApiVersion) errors.push("Missing workflowApiVersion in config.json");
  if (configJson.workflowApiVersion !== "1.1") warnings.push("workflowApiVersion should be 1.1");
  if (!configJson.type) errors.push("Missing type in config.json");
  if (!configJson.arguments?.execute?.url) errors.push("Missing execute URL in config.json");

  // Validate decision split outcomes
  if (requirements.isDecisionSplit) {
    if (configJson.type !== "RestDecision") errors.push("Decision split must have type RestDecision");
    if (!configJson.outcomes || configJson.outcomes.length < 2) errors.push("Decision split requires at least 2 outcomes");
  }

  // Validate Node.js code
  if (!nodejsCode["server.js"]) errors.push("Missing server.js");
  if (!nodejsCode["routes/execute.js"]) errors.push("Missing execute route");

  const executeCode = nodejsCode["routes/execute.js"] || "";
  if (!executeCode.includes("/execute")) errors.push("Execute route missing /execute endpoint");
  if (!executeCode.includes("express")) warnings.push("Execute should use Express");

  // Validate client code
  if (!javascriptCode.includes("Postmonger")) errors.push("Client must use Postmonger");
  if (!javascriptCode.includes("updateActivity")) warnings.push("Client should call updateActivity");

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}
