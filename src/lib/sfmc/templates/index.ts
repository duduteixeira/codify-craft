/**
 * SFMC Templates Index
 * Exports all available templates
 */

export { generateNodeTemplate } from "./node-template";
export { generateDecisionSplitTemplate } from "./decision-split-template";

import type { ExtractedRequirements, Stack, FileEntry, ValidationResult } from "../types";
import { generateNodeTemplate } from "./node-template";
import { generateDecisionSplitTemplate } from "./decision-split-template";
import { validateGeneratedActivity } from "../validator";

export interface GeneratedFiles {
  files: Record<string, string>;
  fileTree: FileEntry[];
  validation: ValidationResult;
}

/**
 * Generate files based on requirements and selected stack
 */
export function generateFromTemplate(
  requirements: ExtractedRequirements,
  stack: Stack = "node"
): GeneratedFiles {
  let files: Record<string, string>;

  // Select template based on type and stack
  if (requirements.isDecisionSplit) {
    files = generateDecisionSplitTemplate(requirements);
  } else if (stack === "node") {
    files = generateNodeTemplate(requirements);
  } else {
    // SSJS template (to be implemented)
    // For now, fall back to Node template
    files = generateNodeTemplate(requirements);
  }

  // Convert to fileTree format
  const fileTree: FileEntry[] = Object.entries(files).map(([path, content]) => ({
    path,
    content,
  }));

  // Parse config.json from generated files
  const configJsonFile = files["public/config.json"] || files["config.json"];
  let configJson: Record<string, unknown> = {};
  try {
    configJson = JSON.parse(configJsonFile);
  } catch {
    console.error("Failed to parse generated config.json");
  }

  // Validate the generated activity
  const validation = validateGeneratedActivity(
    {
      projectType: requirements.isDecisionSplit ? "decision-split" : "custom-activity",
      stack,
      fileTree,
      configJson,
      validation: { isValid: true, errors: [], warnings: [] },
    },
    requirements.isDecisionSplit,
    requirements.outcomes?.map(o => o.label)
  );

  return {
    files,
    fileTree,
    validation,
  };
}

/**
 * Get template metadata for display in UI
 */
export function getTemplateOptions() {
  return [
    {
      id: "custom-activity",
      name: "Custom Activity",
      description: "Standard REST custom activity for executing actions on contacts",
      icon: "zap",
      stacks: ["node", "ssjs"] as Stack[],
    },
    {
      id: "decision-split",
      name: "Decision Split",
      description: "Route contacts to different paths based on conditions",
      icon: "git-branch",
      stacks: ["node"] as Stack[],
      requiresOutcomes: true,
    },
  ];
}

/**
 * Get stack options for display in UI
 */
export function getStackOptions() {
  return [
    {
      id: "node" as Stack,
      name: "Node.js",
      description: "Express server for self-hosted deployments",
      recommended: true,
    },
    {
      id: "ssjs" as Stack,
      name: "SSJS",
      description: "Server-Side JavaScript for CloudPages (coming soon)",
      disabled: true,
    },
  ];
}
