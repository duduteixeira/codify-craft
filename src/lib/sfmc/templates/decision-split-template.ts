/**
 * Golden Template: Decision Split Custom Activity
 * For activities with multiple outcomes (RestDecision type)
 */

import type { ExtractedRequirements } from "../types";
import { generateNodeTemplate } from "./node-template";

export function generateDecisionSplitTemplate(requirements: ExtractedRequirements): Record<string, string> {
  // Ensure decision split is enabled and has outcomes
  const enhancedRequirements: ExtractedRequirements = {
    ...requirements,
    isDecisionSplit: true,
    outcomes: requirements.outcomes || [
      { key: "outcome_a", label: "Outcome A", condition: "Default outcome" },
      { key: "outcome_b", label: "Outcome B", condition: "Alternative outcome" },
    ],
  };

  // Start with the base Node template
  const baseFiles = generateNodeTemplate(enhancedRequirements);

  // Override execute.js with decision-specific logic
  const executeJs = generateDecisionExecuteRoute(enhancedRequirements);

  // Override config.json to include outcomes
  const configJson = generateDecisionConfigJson(enhancedRequirements);

  return {
    ...baseFiles,
    "routes/execute.js": executeJs,
    "public/config.json": JSON.stringify(configJson, null, 2),
  };
}

function generateDecisionConfigJson(req: ExtractedRequirements): Record<string, unknown> {
  const inArgs = req.inArguments || [];
  const outcomes = req.outcomes || [];

  return {
    workflowApiVersion: "1.1",
    metaData: {
      icon: "images/icon.png",
      category: req.category || "flow",
      isConfigured: true
    },
    type: "RestDecision",
    lang: {
      "en-US": {
        name: req.activityName,
        description: req.activityDescription || `Decision Split: ${req.activityName}`
      }
    },
    arguments: {
      execute: {
        inArguments: inArgs.map(arg => ({
          [arg.name]: arg.source ? `{{${arg.source}}}` : `{{Contact.Attribute.${arg.name}}}`
        })),
        outArguments: [{ branchResult: "" }],
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
    outcomes: outcomes.map(outcome => ({
      key: outcome.key,
      metaData: { 
        label: outcome.label 
      },
      arguments: { 
        branchResult: outcome.key 
      }
    })),
    schema: {
      arguments: {
        execute: {
          inArguments: inArgs.map(arg => ({
            [arg.name]: {
              dataType: arg.type === "number" ? "Number" : "Text",
              isNullable: !arg.required
            }
          })),
          outArguments: [{
            branchResult: {
              dataType: "Text",
              access: "visible",
              direction: "out"
            }
          }]
        }
      }
    }
  };
}

function generateDecisionExecuteRoute(req: ExtractedRequirements): string {
  const inArgs = req.inArguments || [];
  const outcomes = req.outcomes || [];
  const apis = req.externalAPIs || [];

  // Generate argument extraction
  const argExtractions = inArgs
    .map(arg => `  const ${arg.name} = args.${arg.name};`)
    .join('\n');

  // Generate API call if configured
  let apiLogic = '';
  if (apis.length > 0) {
    const api = apis[0];
    apiLogic = `
    // Call external API for decision data
    const apiUrl = process.env.${api.envVarName || 'API_URL'} || '${api.baseUrl || ''}';
    ${api.authentication !== 'none' ? `const apiKey = process.env.${api.envVarName || 'API'}_KEY;` : ''}
    
    let apiResult = {};
    try {
      const response = await axios.post(apiUrl, {
        ${inArgs.map(a => a.name).join(',\n        ')}
      }${api.authentication !== 'none' ? `, {
        headers: { 
          'Authorization': \`Bearer \${apiKey}\`,
          'Content-Type': 'application/json'
        }
      }` : ''});
      apiResult = response.data;
    } catch (apiError) {
      console.error('[EXECUTE] API call failed:', apiError.message);
      // Use default outcome on API failure
    }`;
  }

  // Generate decision logic based on outcomes
  const outcomeConditions = outcomes.map((outcome, index) => {
    if (index === 0) {
      return `// Default outcome: ${outcome.label}
    branchResult = '${outcome.key}';`;
    }
    return `
    // ${outcome.condition || `Check for ${outcome.label}`}
    // TODO: Replace with your actual condition
    // if (someCondition) {
    //   branchResult = '${outcome.key}';
    // }`;
  }).join('\n    ');

  return `/**
 * Execute endpoint for ${req.activityName} (Decision Split)
 * Returns branchResult to determine which path the contact takes
 */

const express = require('express');
const router = express.Router();
const axios = require('axios');

// Valid outcomes for this decision split
const VALID_OUTCOMES = [${outcomes.map(o => `'${o.key}'`).join(', ')}];

router.post('/execute', async (req, res) => {
  const startTime = Date.now();
  
  try {
    // Extract Journey Builder context
    const { inArguments = [], journeyId, activityId, activityInstanceId } = req.body;
    const args = inArguments[0] || {};
    
    console.log(\`[EXECUTE] Decision Split - Journey: \${journeyId}\`);
    console.log('[EXECUTE] Input arguments:', JSON.stringify(args, null, 2));

    // Extract input arguments
${argExtractions || '    // No input arguments defined'}

    // Validate required arguments
${inArgs.filter(a => a.required).map(a => 
`    if (!${a.name}) {
      console.error('[EXECUTE] Missing required argument: ${a.name}');
      // Use first outcome as fallback
      return res.status(200).json({ branchResult: VALID_OUTCOMES[0] });
    }`
).join('\n') || '    // No required arguments'}
${apiLogic}

    // Decision logic - determine which branch the contact should take
    let branchResult;
    
    ${outcomeConditions}

    // Validate the outcome
    if (!VALID_OUTCOMES.includes(branchResult)) {
      console.warn(\`[EXECUTE] Invalid outcome "\${branchResult}", using default\`);
      branchResult = VALID_OUTCOMES[0];
    }

    console.log(\`[EXECUTE] Decision result: \${branchResult}\`);
    console.log(\`[EXECUTE] Execution time: \${Date.now() - startTime}ms\`);

    return res.status(200).json({
      branchResult
    });

  } catch (error) {
    console.error('[EXECUTE ERROR]', error.message);
    console.error('[EXECUTE ERROR] Stack:', error.stack);
    
    // On error, use the first outcome as fallback
    // This ensures the contact continues through the journey
    return res.status(200).json({
      branchResult: VALID_OUTCOMES[0]
    });
  }
});

module.exports = router;
`;
}
