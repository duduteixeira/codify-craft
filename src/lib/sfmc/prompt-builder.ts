/**
 * SFMC Prompt Builder
 * Creates structured prompts with schema, templates, and rules
 */

import type { ExtractedRequirements, Stack } from "./types";

const SFMC_RULES = `
## SFMC Custom Activity Rules (MANDATORY)

You MUST follow these rules exactly. Violation will cause the activity to fail.

### config.json Rules
1. workflowApiVersion MUST be "1.1"
2. type MUST be "REST" for standard activities or "RestDecision" for decision splits
3. All URLs must use {{BASE_URL}} placeholder
4. arguments.execute.inArguments must use Journey Builder syntax: {{Contact.Attribute.FieldName}} or {{Event.EventName.FieldName}}
5. outcomes are REQUIRED for RestDecision type and MUST have at least 2 outcomes
6. Each outcome MUST have: key (lowercase_snake_case), metaData.label, and arguments.branchResult

### Server Rules (Node.js)
1. Express server MUST implement these POST endpoints: /execute, /save, /publish, /validate
2. /execute MUST return valid JSON with outArguments or branchResult
3. For RestDecision, /execute MUST return { branchResult: "outcome_key" }
4. NEVER hardcode API keys - use environment variables
5. Include proper error handling and logging

### Client Rules (customActivity.js)
1. MUST use Postmonger for Journey Builder communication
2. MUST handle: initActivity, clickedNext, clickedBack events
3. MUST call connection.trigger('updateActivity', payload) to save
4. MUST set metaData.isConfigured = true when configuration is complete

### DO NOT
- Do not invent field names not specified in requirements
- Do not use deprecated API versions
- Do not hardcode any credentials or API keys
- Do not return HTTP errors from /execute (return success with error info instead)
- Do not guess about SFMC data binding syntax - use the exact format provided
`;

const EXTRACTION_SCHEMA = `
## Required Output Schema

Return a JSON object with this EXACT structure:

{
  "activityName": "string (max 50 chars)",
  "activityDescription": "string (max 200 chars)",
  "category": "message" | "customer" | "flow" | "custom",
  "inArguments": [
    {
      "name": "string (valid JS identifier)",
      "type": "string" | "number" | "boolean",
      "source": "Contact.Attribute.FieldName or Event.EventName.FieldName",
      "required": true | false,
      "description": "string"
    }
  ],
  "outArguments": [
    {
      "name": "string (valid JS identifier)",
      "type": "string" | "number" | "boolean",
      "description": "string"
    }
  ],
  "externalAPIs": [
    {
      "name": "string",
      "baseUrl": "string (optional)",
      "authentication": "none" | "api-key" | "oauth" | "webhook" | "bearer",
      "envVarName": "string (UPPERCASE_WITH_UNDERSCORES)"
    }
  ],
  "configurationSteps": [
    {
      "label": "string",
      "description": "string (optional)",
      "fields": [
        {
          "name": "string (valid JS identifier)",
          "type": "text" | "textarea" | "select" | "checkbox" | "number" | "url",
          "label": "string",
          "placeholder": "string (optional)",
          "required": true | false,
          "options": [{"value": "string", "label": "string"}] (for select only)
        }
      ]
    }
  ],
  "isDecisionSplit": true | false,
  "outcomes": [ // REQUIRED if isDecisionSplit is true
    {
      "key": "lowercase_snake_case",
      "label": "Human Readable Label",
      "condition": "Description of when this outcome triggers"
    }
  ],
  "executionSteps": [
    {
      "order": 1,
      "action": "string",
      "details": "string"
    }
  ]
}
`;

export function buildExtractionPrompt(userPrompt: string, activityName?: string): { system: string; user: string } {
  const system = `You are an expert Salesforce Marketing Cloud Custom Activity architect.
Your task is to analyze a user's natural language description and extract precise, structured requirements.

${SFMC_RULES}

${EXTRACTION_SCHEMA}

## Critical Instructions
- Return ONLY valid JSON, no markdown, no explanations
- Use exact field names and types as specified in the schema
- For inArguments source, use proper SFMC data binding syntax
- If the user mentions a decision or split, set isDecisionSplit to true and define outcomes
- Every configuration field used in the UI must also appear in inArguments or be saved to the payload
- Generate realistic, production-ready configurations`;

  const user = `User Description: ${userPrompt}
${activityName ? `Suggested Activity Name: ${activityName}` : ''}

Analyze this request and return the structured requirements JSON.`;

  return { system, user };
}

export function buildCodeGenerationPrompt(
  requirements: ExtractedRequirements,
  stack: Stack,
  template: string
): { system: string; user: string } {
  const system = `You are an expert SFMC Custom Activity developer.
You will modify the provided template based on the requirements. Do NOT invent from scratch.

${SFMC_RULES}

## Task
1. Use the provided template as the base
2. Modify ONLY the parts that need customization based on requirements
3. Keep all boilerplate and structure intact
4. Return the modified files as a JSON object with paths as keys

## Return Format
Return a JSON object where:
- Keys are file paths (e.g., "routes/execute.js")
- Values are the complete file contents as strings

Example:
{
  "routes/execute.js": "const express = require('express');...",
  "public/config.json": "{...}"
}

Do NOT include markdown formatting. Return ONLY the JSON object.`;

  const user = `Requirements:
${JSON.stringify(requirements, null, 2)}

Stack: ${stack}

Base Template Files:
${template}

Modify the template to implement these requirements. Return the complete files as JSON.`;

  return { system, user };
}

export function buildValidationPrompt(files: Record<string, string>, requirements: ExtractedRequirements): string {
  return `Validate this SFMC Custom Activity against the requirements.

Requirements:
${JSON.stringify(requirements, null, 2)}

Generated Files:
${JSON.stringify(files, null, 2)}

Check for:
1. All required endpoints implemented
2. All inArguments used in execute logic
3. All configuration fields present in UI
4. Config.json structure is valid
5. Outcomes match for decision splits

Return JSON:
{
  "isValid": true|false,
  "errors": ["error messages"],
  "warnings": ["warning messages"]
}`;
}
