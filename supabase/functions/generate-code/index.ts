import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface GenerateCodeRequest {
  requirements: any;
  activityName: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { requirements, activityName } = await req.json() as GenerateCodeRequest;

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

    // Generate config.json
    const configPrompt = `Generate a complete Salesforce Marketing Cloud Custom Activity config.json based on these requirements:

${JSON.stringify(requirements, null, 2)}

Activity Name: ${activityName}

Return ONLY valid JSON following the Marketing Cloud Custom Activity spec. Include:
- workflowApiVersion: "1.1"
- metaData with icon and category
- type: "REST" or "RestDecision" if decision split
- lang object with "en-US" translations
- arguments with execute, save, publish, validate sections
- configurationArguments for UI
- userInterfaces for modal editing
- schema for validation
- outcomes if it's a decision split

Use placeholder URLs like "{{BASE_URL}}/execute" that will be replaced during deployment.`;

    console.log("Generating config.json...");

    const configResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "You are an expert in Salesforce Marketing Cloud Custom Activity development. Generate only valid JSON without markdown formatting." },
          { role: "user", content: configPrompt }
        ],
        temperature: 0.2,
      }),
    });

    if (!configResponse.ok) {
      if (configResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw new Error("Failed to generate config");
    }

    const configData = await configResponse.json();
    let configContent = configData.choices?.[0]?.message?.content || "";
    
    // Parse config JSON
    let configJson;
    try {
      if (configContent.includes("```json")) {
        configContent = configContent.split("```json")[1].split("```")[0].trim();
      } else if (configContent.includes("```")) {
        configContent = configContent.split("```")[1].split("```")[0].trim();
      }
      configJson = JSON.parse(configContent);
    } catch {
      console.error("Failed to parse config JSON:", configContent);
      configJson = generateFallbackConfig(requirements, activityName);
    }

    // Generate Node.js server code
    const nodePrompt = `Generate complete Node.js Express server code for a Salesforce Marketing Cloud Custom Activity.

Requirements:
${JSON.stringify(requirements, null, 2)}

Generate a COMPLETE, production-ready Node.js project with these files:

1. package.json - with express, axios, body-parser, dotenv dependencies
2. server.js - main Express server with all routes
3. routes/execute.js - the main execute endpoint logic based on requirements
4. routes/save.js - save activity configuration
5. routes/publish.js - publish activity
6. routes/validate.js - validate configuration

Return a JSON object with this structure:
{
  "package.json": "... content ...",
  "server.js": "... content ...",
  "routes/execute.js": "... content ...",
  "routes/save.js": "... content ...",
  "routes/publish.js": "... content ...",
  "routes/validate.js": "... content ..."
}

Make the execute.js implement the actual business logic based on the requirements:
- External API calls if specified
- Proper error handling
- Logging
- Return appropriate outArguments

Use environment variables for sensitive data like API keys and webhooks.`;

    console.log("Generating Node.js code...");

    const nodeResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "You are an expert Node.js developer specializing in Salesforce Marketing Cloud integrations. Generate production-ready code. Return only valid JSON without markdown." },
          { role: "user", content: nodePrompt }
        ],
        temperature: 0.3,
      }),
    });

    if (!nodeResponse.ok) {
      throw new Error("Failed to generate Node.js code");
    }

    const nodeData = await nodeResponse.json();
    let nodeContent = nodeData.choices?.[0]?.message?.content || "";
    
    // Parse Node.js files JSON
    let nodejsCode;
    try {
      if (nodeContent.includes("```json")) {
        nodeContent = nodeContent.split("```json")[1].split("```")[0].trim();
      } else if (nodeContent.includes("```")) {
        nodeContent = nodeContent.split("```")[1].split("```")[0].trim();
      }
      nodejsCode = JSON.parse(nodeContent);
    } catch {
      console.error("Failed to parse Node.js code JSON:", nodeContent);
      nodejsCode = generateFallbackNodeCode(requirements, activityName);
    }

    // Generate client-side JavaScript
    const jsPrompt = `Generate the client-side JavaScript for a Salesforce Marketing Cloud Custom Activity configuration UI.

Activity Config:
${JSON.stringify(configJson, null, 2)}

Requirements:
${JSON.stringify(requirements, null, 2)}

Generate customActivity.js that:
1. Uses Postmonger for Journey Builder communication
2. Handles initialize, clickedNext, clickedBack events
3. Populates configuration UI fields based on configurationSteps
4. Saves/retrieves activity payload
5. Validates required fields

Return ONLY the JavaScript code, no markdown.`;

    const jsResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "You are an expert in Salesforce Marketing Cloud Custom Activity client-side development. Generate clean JavaScript using Postmonger. Return only code without markdown." },
          { role: "user", content: jsPrompt }
        ],
        temperature: 0.3,
      }),
    });

    let javascriptCode = "";
    if (jsResponse.ok) {
      const jsData = await jsResponse.json();
      javascriptCode = jsData.choices?.[0]?.message?.content || "";
      if (javascriptCode.includes("```javascript")) {
        javascriptCode = javascriptCode.split("```javascript")[1].split("```")[0].trim();
      } else if (javascriptCode.includes("```js")) {
        javascriptCode = javascriptCode.split("```js")[1].split("```")[0].trim();
      } else if (javascriptCode.includes("```")) {
        javascriptCode = javascriptCode.split("```")[1].split("```")[0].trim();
      }
    }

    console.log("Successfully generated all code for:", activityName);

    return new Response(
      JSON.stringify({
        configJson,
        nodejsCode,
        javascriptCode,
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

function generateFallbackConfig(requirements: any, activityName: string): any {
  const category = requirements.category || "custom";
  const isDecision = requirements.isDecisionSplit || false;
  
  return {
    workflowApiVersion: "1.1",
    metaData: {
      icon: "images/icon.png",
      category: category,
      isConfigured: true
    },
    type: isDecision ? "RestDecision" : "REST",
    lang: {
      "en-US": {
        name: activityName,
        description: requirements.activityDescription || `Custom Activity: ${activityName}`
      }
    },
    arguments: {
      execute: {
        inArguments: (requirements.inArguments || []).map((arg: any) => ({
          [arg.name]: `{{${arg.source || 'Contact.Attribute.' + arg.name}}}`
        })),
        outArguments: (requirements.outArguments || []).map((arg: any) => ({
          [arg.name]: ""
        })),
        url: "{{BASE_URL}}/execute"
      },
      save: { url: "{{BASE_URL}}/save" },
      publish: { url: "{{BASE_URL}}/publish" },
      validate: { url: "{{BASE_URL}}/validate" }
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
    ...(isDecision && requirements.outcomes ? {
      outcomes: requirements.outcomes.map((outcome: any) => ({
        key: outcome.name.toLowerCase().replace(/\s+/g, '_'),
        metaData: { label: outcome.name },
        arguments: { branchResult: outcome.name }
      }))
    } : {})
  };
}

function generateFallbackNodeCode(requirements: any, activityName: string): any {
  const safeName = activityName.toLowerCase().replace(/\s+/g, '-');
  
  return {
    "package.json": JSON.stringify({
      name: safeName,
      version: "1.0.0",
      description: requirements.activityDescription || `SFMC Custom Activity: ${activityName}`,
      main: "server.js",
      scripts: {
        start: "node server.js",
        dev: "nodemon server.js"
      },
      dependencies: {
        express: "^4.18.2",
        "body-parser": "^1.20.2",
        axios: "^1.6.0",
        dotenv: "^16.3.1",
        cors: "^2.8.5"
      }
    }, null, 2),
    
    "server.js": `require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

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
  res.json({ status: 'ok', activity: '${activityName}' });
});

app.listen(PORT, () => {
  console.log('${activityName} Custom Activity running on port', PORT);
});`,

    "routes/execute.js": generateExecuteRoute(requirements),
    "routes/save.js": `const express = require('express');
const router = express.Router();

router.post('/save', (req, res) => {
  console.log('Save called:', JSON.stringify(req.body, null, 2));
  res.status(200).json({ success: true });
});

module.exports = router;`,

    "routes/publish.js": `const express = require('express');
const router = express.Router();

router.post('/publish', (req, res) => {
  console.log('Publish called:', JSON.stringify(req.body, null, 2));
  res.status(200).json({ success: true });
});

module.exports = router;`,

    "routes/validate.js": `const express = require('express');
const router = express.Router();

router.post('/validate', (req, res) => {
  console.log('Validate called:', JSON.stringify(req.body, null, 2));
  res.status(200).json({ success: true });
});

module.exports = router;`
  };
}

function generateExecuteRoute(requirements: any): string {
  const inArgs = requirements.inArguments || [];
  const outArgs = requirements.outArguments || [];
  const apis = requirements.externalAPIs || [];
  const steps = requirements.executionSteps || [];
  
  const argExtractions = inArgs.map((arg: any) => 
    `    const ${arg.name} = args.${arg.name};`
  ).join('\n');
  
  const outArgResults = outArgs.map((arg: any) =>
    `        ${arg.name}: result.${arg.name} || ''`
  ).join(',\n');

  let apiCall = '';
  if (apis.length > 0) {
    const api = apis[0];
    if (api.authentication === 'webhook') {
      apiCall = `
    // Call webhook
    const webhookUrl = process.env.WEBHOOK_URL;
    const response = await axios.post(webhookUrl, {
      ${inArgs.map((a: any) => a.name).join(',\n      ')}
    });
    const result = response.data;`;
    } else if (api.authentication === 'api-key') {
      apiCall = `
    // Call API
    const apiUrl = process.env.API_URL || '${api.baseUrl || ''}';
    const response = await axios.post(apiUrl, {
      ${inArgs.map((a: any) => a.name).join(',\n      ')}
    }, {
      headers: { 'Authorization': \`Bearer \${process.env.API_KEY}\` }
    });
    const result = response.data;`;
    }
  }

  return `const express = require('express');
const router = express.Router();
const axios = require('axios');

router.post('/execute', async (req, res) => {
  try {
    const { inArguments, journeyId, activityId } = req.body;
    const args = inArguments[0] || {};
    
    console.log('Execute called for journey:', journeyId);
    console.log('Input arguments:', JSON.stringify(args, null, 2));

    // Extract input arguments
${argExtractions || '    // No input arguments defined'}
${apiCall || `
    // Execute business logic
    const result = { success: true };`}

    res.status(200).json({
${outArgResults || '      status: "completed"'}
    });
    
  } catch (error) {
    console.error('Execute error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;`;
}
