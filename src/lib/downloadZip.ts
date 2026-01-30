/**
 * Updated downloadZip with validation before download
 */
import JSZip from "jszip";
import { validateGeneratedActivity, type FileEntry, type ValidationResult } from "./sfmc";

interface ActivityData {
  name: string;
  config_json: any;
  nodejs_code: Record<string, string>;
  javascript_code?: Record<string, string>;
  extracted_requirements?: any;
}

export interface DownloadResult {
  success: boolean;
  validation: ValidationResult;
  fileName?: string;
}

export async function downloadActivityZip(activity: ActivityData): Promise<DownloadResult> {
  const zip = new JSZip();
  const folderName = activity.name.toLowerCase().replace(/\s+/g, "-");

  // Build file tree for validation
  const fileTree: FileEntry[] = [];

  // Add config.json
  if (activity.config_json) {
    const configContent = JSON.stringify(activity.config_json, null, 2);
    zip.file("public/config.json", configContent);
    fileTree.push({ path: "public/config.json", content: configContent });
  }

  // Add Node.js server files
  if (activity.nodejs_code) {
    Object.entries(activity.nodejs_code).forEach(([filename, content]) => {
      // Handle routes subfolder
      const filePath = filename.startsWith("routes/") ? filename : `src/${filename}`;
      zip.file(filePath, content);
      fileTree.push({ path: filePath, content });
    });
  }

  // Add client-side JavaScript
  if (activity.javascript_code) {
    Object.entries(activity.javascript_code).forEach(([filename, content]) => {
      zip.file(`public/${filename}`, content);
      fileTree.push({ path: `public/${filename}`, content });
    });
  }

  // Validate before download
  const isDecisionSplit = activity.extracted_requirements?.isDecisionSplit || false;
  const expectedOutcomes = activity.extracted_requirements?.outcomes?.map((o: any) => o.label) || [];
  
  const validation = validateGeneratedActivity(
    {
      projectType: isDecisionSplit ? "decision-split" : "custom-activity",
      stack: "node",
      fileTree,
      configJson: activity.config_json || {},
      validation: { isValid: true, errors: [], warnings: [] },
    },
    isDecisionSplit,
    expectedOutcomes
  );

  // Block download if there are critical errors
  if (!validation.isValid) {
    console.error("Validation failed:", validation.errors);
    return {
      success: false,
      validation,
    };
  }

  // Add package.json
  const packageJson = {
    name: folderName,
    version: "1.0.0",
    description: activity.extracted_requirements?.activityDescription || "SFMC Custom Activity",
    main: "src/server.js",
    scripts: {
      start: "node src/server.js",
      dev: "nodemon src/server.js",
    },
    dependencies: {
      express: "^4.18.2",
      cors: "^2.8.5",
      "body-parser": "^1.20.2",
      dotenv: "^16.3.1",
      axios: "^1.6.0",
    },
    devDependencies: {
      nodemon: "^3.0.2",
    },
  };
  zip.file("package.json", JSON.stringify(packageJson, null, 2));

  // Add .env.example
  const apis = activity.extracted_requirements?.externalAPIs || [];
  let envExample = `# Server Configuration
PORT=3000
NODE_ENV=development

# SFMC Configuration
SFMC_CLIENT_ID=your_client_id
SFMC_CLIENT_SECRET=your_client_secret
`;

  if (apis.length > 0) {
    envExample += `\n# External API Configuration\n`;
    for (const api of apis) {
      const varName = api.envVarName || api.name.toUpperCase().replace(/\s+/g, '_');
      if (api.authentication === 'webhook') {
        envExample += `${varName}_URL=https://your-webhook-url.com/hook\n`;
      } else {
        envExample += `${varName}_URL=${api.baseUrl || 'https://api.example.com'}\n`;
        envExample += `${varName}_KEY=your_api_key_here\n`;
      }
    }
  }
  zip.file(".env.example", envExample);

  // Add README.md
  const readme = generateReadme(activity);
  zip.file("README.md", readme);

  // Add index.html for the activity UI
  const indexHtml = generateIndexHtml(activity);
  zip.file("public/index.html", indexHtml);

  // Add .gitignore
  const gitignore = `node_modules/
.env
.DS_Store
*.log
`;
  zip.file(".gitignore", gitignore);

  // Generate and download
  const blob = await zip.generateAsync({ type: "blob" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${folderName}.zip`;
  a.click();
  URL.revokeObjectURL(url);

  return {
    success: true,
    validation,
    fileName: `${folderName}.zip`,
  };
}

function generateReadme(activity: ActivityData): string {
  const req = activity.extracted_requirements || {};
  const inArgs = req.inArguments || [];
  const outArgs = req.outArguments || [];

  return `# ${activity.name}

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
| \`/execute\` | POST | Main execution - called for each contact |
| \`/save\` | POST | Saves activity configuration |
| \`/publish\` | POST | Called when journey is published |
| \`/validate\` | POST | Validates configuration |
| \`/health\` | GET | Health check |

## Configuration

### Input Arguments
${inArgs.map((a: any) => `- \`${a.name}\` (${a.type})${a.required ? ' - Required' : ''}`).join('\n') || 'None configured'}

### Output Arguments
${outArgs.map((a: any) => `- \`${a.name}\` (${a.type})`).join('\n') || 'None configured'}

${req.isDecisionSplit ? `### Decision Outcomes
${(req.outcomes || []).map((o: any) => `- **${o.label}** (\`${o.key}\`): ${o.condition || 'No condition specified'}`).join('\n')}
` : ''}

## Deployment

Deploy to any Node.js hosting provider:

### Vercel
\`\`\`bash
vercel deploy
\`\`\`

### Railway
\`\`\`bash
railway up
\`\`\`

## SFMC Configuration

1. Replace \`{{BASE_URL}}\` in \`public/config.json\` with your deployed URL
2. Upload to SFMC as a Custom Activity
3. Add to Journey Builder canvas

## Files

\`\`\`
├── package.json
├── src/
│   ├── server.js           # Main Express server
│   └── routes/
│       ├── execute.js      # Execute endpoint
│       ├── save.js         # Save configuration
│       ├── publish.js      # Publish handler
│       └── validate.js     # Validation
├── public/
│   ├── config.json         # SFMC configuration
│   ├── index.html          # Configuration UI
│   └── customActivity.js   # Postmonger client
└── .env.example
\`\`\`
`;
}

function generateIndexHtml(activity: ActivityData): string {
  const req = activity.extracted_requirements || {};
  const configSteps = req.configurationSteps || [];
  
  let formFields = '';
  if (configSteps.length > 0) {
    formFields = configSteps.flatMap((step: any) => 
      (step.fields || []).map((field: any) => {
        switch (field.type) {
          case 'textarea':
            return `
        <div class="form-group">
          <label for="${field.name}">${field.label}${field.required ? ' *' : ''}</label>
          <textarea id="${field.name}" name="${field.name}" placeholder="${field.placeholder || ''}"${field.required ? ' required' : ''}></textarea>
        </div>`;
          case 'select':
            return `
        <div class="form-group">
          <label for="${field.name}">${field.label}${field.required ? ' *' : ''}</label>
          <select id="${field.name}" name="${field.name}"${field.required ? ' required' : ''}>
            <option value="">Select...</option>
            ${(field.options || []).map((opt: any) => `<option value="${opt.value}">${opt.label}</option>`).join('\n            ')}
          </select>
        </div>`;
          case 'checkbox':
            return `
        <div class="form-group checkbox">
          <label><input type="checkbox" id="${field.name}" name="${field.name}" /> ${field.label}</label>
        </div>`;
          default:
            return `
        <div class="form-group">
          <label for="${field.name}">${field.label}${field.required ? ' *' : ''}</label>
          <input type="${field.type === 'number' ? 'number' : field.type === 'url' ? 'url' : 'text'}" id="${field.name}" name="${field.name}" placeholder="${field.placeholder || ''}"${field.required ? ' required' : ''} />
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
  <title>${activity.name}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f7fa; color: #333; line-height: 1.6; }
    .container { max-width: 600px; margin: 0 auto; padding: 24px; }
    .header { margin-bottom: 24px; }
    .header h1 { font-size: 24px; font-weight: 600; color: #1a1a1a; margin-bottom: 8px; }
    .header p { color: #666; font-size: 14px; }
    .form-group { margin-bottom: 20px; }
    .form-group label { display: block; font-size: 14px; font-weight: 500; color: #374151; margin-bottom: 6px; }
    .form-group input, .form-group textarea, .form-group select { width: 100%; padding: 10px 12px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 14px; transition: border-color 0.2s, box-shadow 0.2s; }
    .form-group input:focus, .form-group textarea:focus, .form-group select:focus { outline: none; border-color: #3b82f6; box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1); }
    .form-group textarea { min-height: 100px; resize: vertical; }
    .form-group.checkbox label { display: flex; align-items: center; gap: 8px; cursor: pointer; }
    .form-group.checkbox input { width: auto; }
    .error-message { background: #fef2f2; border: 1px solid #fecaca; color: #dc2626; padding: 12px; border-radius: 6px; margin-bottom: 20px; font-size: 14px; display: none; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${activity.name}</h1>
      <p>${req.activityDescription || 'Configure your custom activity settings below.'}</p>
    </div>
    <div id="error-message" class="error-message"></div>
    <form id="config-form">
${formFields}
    </form>
  </div>
  <script src="https://cdn.jsdelivr.net/npm/postmonger@1.1.0/postmonger.min.js"></script>
  <script src="customActivity.js"></script>
</body>
</html>`;
}
