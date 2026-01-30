/**
 * SFMC Custom Activity Validator
 * Validates generated activities before allowing download
 */

import type { ValidationResult, GeneratedActivity, FileEntry } from "./types";

// Required files for each stack
const REQUIRED_FILES: Record<string, string[]> = {
  node: [
    "package.json",
    "server.js",
    "public/config.json",
    "public/index.html",
    "public/customActivity.js",
  ],
  ssjs: [
    "config.json",
    "index.html",
    "customActivity.js",
    "execute.ssjs",
  ],
};

// Required config.json structure
interface ConfigJsonValidation {
  workflowApiVersion?: string;
  metaData?: {
    icon?: string;
    category?: string;
  };
  type?: string;
  lang?: Record<string, { name?: string; description?: string }>;
  arguments?: {
    execute?: { url?: string; inArguments?: unknown[]; outArguments?: unknown[] };
  };
  configurationArguments?: {
    save?: { url?: string };
    publish?: { url?: string };
    validate?: { url?: string };
  };
  userInterfaces?: {
    configModal?: { url?: string; height?: number; width?: number };
  };
  outcomes?: Array<{
    key?: string;
    metaData?: { label?: string };
    arguments?: { branchResult?: string };
  }>;
}

export function validateGeneratedActivity(
  activity: GeneratedActivity,
  isDecisionSplit: boolean = false,
  expectedOutcomes?: string[]
): ValidationResult {
  const errors: ValidationResult["errors"] = [];
  const warnings: ValidationResult["warnings"] = [];

  // 1. Check required files exist
  const filePaths = activity.fileTree.map(f => f.path);
  const requiredFiles = REQUIRED_FILES[activity.stack] || REQUIRED_FILES.node;

  for (const required of requiredFiles) {
    if (!filePaths.some(p => p === required || p.endsWith(required))) {
      errors.push({
        code: "MISSING_FILE",
        message: `Required file missing: ${required}`,
        path: required,
      });
    }
  }

  // 2. Validate config.json structure
  const configFile = activity.fileTree.find(f => 
    f.path === "config.json" || 
    f.path === "public/config.json" ||
    f.path.endsWith("/config.json")
  );

  if (configFile) {
    const configErrors = validateConfigJson(
      activity.configJson,
      isDecisionSplit,
      expectedOutcomes
    );
    errors.push(...configErrors.errors);
    warnings.push(...configErrors.warnings);
  } else {
    errors.push({
      code: "NO_CONFIG_JSON",
      message: "config.json not found in file tree",
    });
  }

  // 3. Validate server file (for Node.js)
  if (activity.stack === "node") {
    const serverFile = activity.fileTree.find(f => 
      f.path === "server.js" || 
      f.path === "src/server.js" ||
      f.path === "index.js"
    );

    if (serverFile) {
      const serverErrors = validateServerFile(serverFile.content);
      errors.push(...serverErrors.errors);
      warnings.push(...serverErrors.warnings);
    }
  }

  // 4. Validate customActivity.js
  const clientFile = activity.fileTree.find(f => 
    f.path.includes("customActivity.js")
  );

  if (clientFile) {
    const clientErrors = validateClientFile(clientFile.content);
    errors.push(...clientErrors.errors);
    warnings.push(...clientErrors.warnings);
  }

  // 5. Validate package.json (Node.js)
  if (activity.stack === "node") {
    const packageFile = activity.fileTree.find(f => f.path === "package.json");
    if (packageFile) {
      const packageErrors = validatePackageJson(packageFile.content);
      errors.push(...packageErrors.errors);
      warnings.push(...packageErrors.warnings);
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

function validateConfigJson(
  config: unknown,
  isDecisionSplit: boolean,
  expectedOutcomes?: string[]
): Pick<ValidationResult, "errors" | "warnings"> {
  const errors: ValidationResult["errors"] = [];
  const warnings: ValidationResult["warnings"] = [];

  if (!config || typeof config !== "object") {
    errors.push({
      code: "INVALID_CONFIG",
      message: "config.json is not a valid object",
    });
    return { errors, warnings };
  }

  const cfg = config as ConfigJsonValidation;

  // Required fields
  if (!cfg.workflowApiVersion) {
    errors.push({
      code: "MISSING_WORKFLOW_VERSION",
      message: "config.json must have workflowApiVersion",
      path: "workflowApiVersion",
    });
  } else if (cfg.workflowApiVersion !== "1.1") {
    warnings.push({
      code: "OLD_WORKFLOW_VERSION",
      message: `workflowApiVersion should be "1.1", got "${cfg.workflowApiVersion}"`,
      path: "workflowApiVersion",
    });
  }

  if (!cfg.metaData) {
    errors.push({
      code: "MISSING_METADATA",
      message: "config.json must have metaData section",
      path: "metaData",
    });
  }

  // Type validation
  if (isDecisionSplit) {
    if (cfg.type !== "RestDecision") {
      errors.push({
        code: "INVALID_TYPE_FOR_DECISION",
        message: `Decision split must have type "RestDecision", got "${cfg.type}"`,
        path: "type",
      });
    }

    // Validate outcomes
    if (!cfg.outcomes || !Array.isArray(cfg.outcomes) || cfg.outcomes.length < 2) {
      errors.push({
        code: "MISSING_OUTCOMES",
        message: "Decision split must have at least 2 outcomes",
        path: "outcomes",
      });
    } else if (expectedOutcomes && expectedOutcomes.length > 0) {
      const configuredOutcomes = cfg.outcomes.map(o => o.metaData?.label || o.key);
      for (const expected of expectedOutcomes) {
        if (!configuredOutcomes.some(o => 
          o?.toLowerCase() === expected.toLowerCase()
        )) {
          warnings.push({
            code: "MISSING_EXPECTED_OUTCOME",
            message: `Expected outcome "${expected}" not found in config`,
            path: "outcomes",
          });
        }
      }
    }
  } else {
    if (cfg.type !== "REST") {
      warnings.push({
        code: "UNEXPECTED_TYPE",
        message: `Standard activity should have type "REST", got "${cfg.type}"`,
        path: "type",
      });
    }
  }

  // Arguments validation
  if (!cfg.arguments?.execute?.url) {
    errors.push({
      code: "MISSING_EXECUTE_URL",
      message: "config.json must have arguments.execute.url",
      path: "arguments.execute.url",
    });
  }

  if (!cfg.configurationArguments?.save?.url) {
    warnings.push({
      code: "MISSING_SAVE_URL",
      message: "config.json should have configurationArguments.save.url",
      path: "configurationArguments.save.url",
    });
  }

  // User interfaces validation
  if (!cfg.userInterfaces?.configModal?.url) {
    errors.push({
      code: "MISSING_CONFIG_MODAL",
      message: "config.json must have userInterfaces.configModal.url",
      path: "userInterfaces.configModal.url",
    });
  }

  // Lang validation
  if (!cfg.lang?.["en-US"]?.name) {
    warnings.push({
      code: "MISSING_LANG_NAME",
      message: "config.json should have lang.en-US.name",
      path: "lang.en-US.name",
    });
  }

  return { errors, warnings };
}

function validateServerFile(content: string): Pick<ValidationResult, "errors" | "warnings"> {
  const errors: ValidationResult["errors"] = [];
  const warnings: ValidationResult["warnings"] = [];

  // Check for required endpoints
  const requiredEndpoints = ["/execute", "/save", "/publish", "/validate"];
  
  for (const endpoint of requiredEndpoints) {
    // Check for both app.post and router.post patterns
    const hasEndpoint = 
      content.includes(`post('${endpoint}'`) ||
      content.includes(`post("${endpoint}"`) ||
      content.includes(`'${endpoint}'`) ||
      content.includes(`"${endpoint}"`);
    
    if (!hasEndpoint) {
      errors.push({
        code: "MISSING_ENDPOINT",
        message: `Server must implement ${endpoint} endpoint`,
        path: "server.js",
      });
    }
  }

  // Check for Express
  if (!content.includes("express")) {
    errors.push({
      code: "NO_EXPRESS",
      message: "Server must use Express framework",
      path: "server.js",
    });
  }

  // Check for body-parser or express.json
  if (!content.includes("body-parser") && !content.includes("express.json")) {
    warnings.push({
      code: "NO_BODY_PARSER",
      message: "Server should use body-parser or express.json for POST body parsing",
      path: "server.js",
    });
  }

  // Check for CORS
  if (!content.includes("cors")) {
    warnings.push({
      code: "NO_CORS",
      message: "Server should handle CORS for cross-origin requests",
      path: "server.js",
    });
  }

  return { errors, warnings };
}

function validateClientFile(content: string): Pick<ValidationResult, "errors" | "warnings"> {
  const errors: ValidationResult["errors"] = [];
  const warnings: ValidationResult["warnings"] = [];

  // Check for Postmonger
  if (!content.includes("Postmonger") && !content.includes("postmonger")) {
    errors.push({
      code: "NO_POSTMONGER",
      message: "Client must use Postmonger for Journey Builder communication",
      path: "customActivity.js",
    });
  }

  // Check for required event handlers
  const requiredEvents = ["initActivity", "ready", "requestedInteraction"];
  
  for (const event of requiredEvents) {
    if (!content.includes(event)) {
      warnings.push({
        code: "MISSING_EVENT_HANDLER",
        message: `Client should handle "${event}" event`,
        path: "customActivity.js",
      });
    }
  }

  // Check for updateActivity
  if (!content.includes("updateActivity")) {
    warnings.push({
      code: "NO_UPDATE_ACTIVITY",
      message: "Client should call updateActivity to save configuration",
      path: "customActivity.js",
    });
  }

  return { errors, warnings };
}

function validatePackageJson(content: string): Pick<ValidationResult, "errors" | "warnings"> {
  const errors: ValidationResult["errors"] = [];
  const warnings: ValidationResult["warnings"] = [];

  try {
    const pkg = JSON.parse(content);

    // Check for required dependencies
    const requiredDeps = ["express"];
    const deps = { ...pkg.dependencies, ...pkg.devDependencies };

    for (const dep of requiredDeps) {
      if (!deps[dep]) {
        errors.push({
          code: "MISSING_DEPENDENCY",
          message: `package.json must include ${dep} dependency`,
          path: "package.json",
        });
      }
    }

    // Check for start script
    if (!pkg.scripts?.start) {
      errors.push({
        code: "NO_START_SCRIPT",
        message: "package.json must have a start script",
        path: "package.json",
      });
    }

    // Check for main entry point
    if (!pkg.main) {
      warnings.push({
        code: "NO_MAIN_ENTRY",
        message: "package.json should specify main entry point",
        path: "package.json",
      });
    }
  } catch {
    errors.push({
      code: "INVALID_PACKAGE_JSON",
      message: "package.json is not valid JSON",
      path: "package.json",
    });
  }

  return { errors, warnings };
}

/**
 * Validate that UI configuration fields are used in execution logic
 */
export function validateFieldUsage(
  configFields: string[],
  serverCode: string,
  clientCode: string
): Pick<ValidationResult, "errors" | "warnings"> {
  const warnings: ValidationResult["warnings"] = [];

  for (const field of configFields) {
    const isUsedInServer = serverCode.includes(field);
    const isUsedInClient = clientCode.includes(field);

    if (!isUsedInServer && !isUsedInClient) {
      warnings.push({
        code: "UNUSED_CONFIG_FIELD",
        message: `Configuration field "${field}" is not used in any code`,
        path: field,
      });
    }

    if (!isUsedInServer) {
      warnings.push({
        code: "FIELD_NOT_IN_SERVER",
        message: `Configuration field "${field}" is not used in server execution logic`,
        path: field,
      });
    }
  }

  return { errors: [], warnings };
}
