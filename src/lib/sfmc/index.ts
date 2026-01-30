/**
 * SFMC Library Index
 * Main exports for the SFMC Custom Activity generation system
 */

// Types
export * from "./types";

// Validation
export { validateGeneratedActivity, validateFieldUsage } from "./validator";

// Templates
export { 
  generateNodeTemplate, 
  generateDecisionSplitTemplate,
  generateFromTemplate,
  getTemplateOptions,
  getStackOptions,
} from "./templates";

// Prompt Builder
export { 
  buildExtractionPrompt, 
  buildCodeGenerationPrompt,
  buildValidationPrompt,
} from "./prompt-builder";
