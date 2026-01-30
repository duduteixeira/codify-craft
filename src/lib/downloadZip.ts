import JSZip from "jszip";

interface ActivityData {
  name: string;
  config_json: any;
  nodejs_code: Record<string, string>;
  javascript_code?: Record<string, string>;
  extracted_requirements?: any;
}

export async function downloadActivityZip(activity: ActivityData) {
  const zip = new JSZip();
  const folderName = activity.name.toLowerCase().replace(/\s+/g, "-");

  // Add config.json
  if (activity.config_json) {
    zip.file("public/config.json", JSON.stringify(activity.config_json, null, 2));
  }

  // Add Node.js server files
  if (activity.nodejs_code) {
    Object.entries(activity.nodejs_code).forEach(([filename, content]) => {
      zip.file(`src/${filename}`, content);
    });
  }

  // Add client-side JavaScript
  if (activity.javascript_code) {
    Object.entries(activity.javascript_code).forEach(([filename, content]) => {
      zip.file(`public/${filename}`, content);
    });
  }

  // Add package.json
  const packageJson = {
    name: folderName,
    version: "1.0.0",
    description: activity.extracted_requirements?.activityDescription || "SFMC Custom Activity",
    main: "src/index.js",
    scripts: {
      start: "node src/index.js",
      dev: "nodemon src/index.js",
    },
    dependencies: {
      express: "^4.18.2",
      cors: "^2.8.5",
      "body-parser": "^1.20.2",
      dotenv: "^16.3.1",
    },
    devDependencies: {
      nodemon: "^3.0.2",
    },
  };
  zip.file("package.json", JSON.stringify(packageJson, null, 2));

  // Add .env.example
  const envExample = `# Server Configuration
PORT=3000
NODE_ENV=development

# SFMC Configuration
SFMC_CLIENT_ID=your_client_id
SFMC_CLIENT_SECRET=your_client_secret

# External API Keys (if applicable)
# API_KEY=your_api_key
`;
  zip.file(".env.example", envExample);

  // Add README.md
  const readme = `# ${activity.name}

${activity.extracted_requirements?.activityDescription || "A Salesforce Marketing Cloud Custom Activity"}

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

- \`GET /\` - Health check
- \`POST /execute\` - Execute the activity
- \`POST /save\` - Save configuration
- \`POST /publish\` - Publish activity
- \`POST /validate\` - Validate configuration

## Deployment

Deploy to your preferred hosting provider (Vercel, Render, Railway, Heroku).

### Vercel
\`\`\`bash
vercel deploy
\`\`\`

### Railway
\`\`\`bash
railway up
\`\`\`

## SFMC Configuration

1. Upload the \`public/config.json\` to your Marketing Cloud Custom Activity configuration
2. Update the \`configurationArguments\` URLs to point to your deployed server
3. Add the activity to your Journey Builder canvas

## Files

- \`src/index.js\` - Main Express server
- \`public/config.json\` - SFMC activity configuration
- \`public/customActivity.js\` - Client-side Postmonger integration
`;
  zip.file("README.md", readme);

  // Add index.html for the activity UI
  const indexHtml = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${activity.name}</title>
    <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
</head>
<body class="bg-gray-100">
    <div id="app" class="max-w-2xl mx-auto p-6">
        <h1 class="text-2xl font-bold mb-4">${activity.name}</h1>
        <p class="text-gray-600 mb-6">${activity.extracted_requirements?.activityDescription || ""}</p>
        
        <div id="config-form" class="bg-white rounded-lg shadow p-6">
            <!-- Configuration form will be populated by customActivity.js -->
            <p class="text-gray-500">Loading configuration...</p>
        </div>
    </div>
    
    <script src="https://cdn.jsdelivr.net/npm/postmonger@1.1.0/postmonger.min.js"></script>
    <script src="customActivity.js"></script>
</body>
</html>
`;
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
}
