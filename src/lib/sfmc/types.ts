/**
 * SFMC Custom Activity Type Definitions
 * Strict contract for AI generation and validation
 */

import { z } from "zod";

// Project type enum
export const ProjectTypeSchema = z.enum(["custom-activity", "decision-split"]);
export type ProjectType = z.infer<typeof ProjectTypeSchema>;

// Stack enum
export const StackSchema = z.enum(["node", "ssjs"]);
export type Stack = z.infer<typeof StackSchema>;

// Activity category enum
export const CategorySchema = z.enum(["message", "customer", "flow", "custom"]);
export type Category = z.infer<typeof CategorySchema>;

// Authentication method enum
export const AuthMethodSchema = z.enum(["none", "api-key", "oauth", "webhook", "bearer"]);
export type AuthMethod = z.infer<typeof AuthMethodSchema>;

// Input argument schema
export const InArgumentSchema = z.object({
  name: z.string().min(1).regex(/^[a-zA-Z][a-zA-Z0-9_]*$/, "Must be a valid identifier"),
  type: z.enum(["string", "number", "boolean", "object", "array"]),
  source: z.string().optional(), // e.g., "Contact.Attribute.EmailAddress"
  required: z.boolean().default(true),
  description: z.string().optional(),
});
export type InArgument = z.infer<typeof InArgumentSchema>;

// Output argument schema
export const OutArgumentSchema = z.object({
  name: z.string().min(1).regex(/^[a-zA-Z][a-zA-Z0-9_]*$/, "Must be a valid identifier"),
  type: z.enum(["string", "number", "boolean", "object"]),
  description: z.string().optional(),
});
export type OutArgument = z.infer<typeof OutArgumentSchema>;

// External API schema
export const ExternalAPISchema = z.object({
  name: z.string().min(1),
  baseUrl: z.string().url().optional(),
  authentication: AuthMethodSchema,
  envVarName: z.string().optional(), // e.g., "SLACK_WEBHOOK_URL"
});
export type ExternalAPI = z.infer<typeof ExternalAPISchema>;

// Outcome schema for decision splits
export const OutcomeSchema = z.object({
  key: z.string().min(1).regex(/^[a-z][a-z0-9_]*$/, "Must be lowercase identifier"),
  label: z.string().min(1),
  condition: z.string().optional(), // Description of when this outcome is triggered
});
export type Outcome = z.infer<typeof OutcomeSchema>;

// Configuration field schema
export const ConfigFieldSchema = z.object({
  name: z.string().min(1).regex(/^[a-zA-Z][a-zA-Z0-9_]*$/, "Must be a valid identifier"),
  type: z.enum(["text", "textarea", "select", "checkbox", "number", "url"]),
  label: z.string().min(1),
  placeholder: z.string().optional(),
  required: z.boolean().default(false),
  options: z.array(z.object({
    value: z.string(),
    label: z.string(),
  })).optional(), // For select fields
  defaultValue: z.union([z.string(), z.number(), z.boolean()]).optional(),
});
export type ConfigField = z.infer<typeof ConfigFieldSchema>;

// Configuration step schema
export const ConfigStepSchema = z.object({
  label: z.string().min(1),
  description: z.string().optional(),
  fields: z.array(ConfigFieldSchema).min(1),
});
export type ConfigStep = z.infer<typeof ConfigStepSchema>;

// File entry schema
export const FileEntrySchema = z.object({
  path: z.string().min(1),
  content: z.string(),
});
export type FileEntry = z.infer<typeof FileEntrySchema>;

// Main generation request schema
export const GenerationRequestSchema = z.object({
  projectType: ProjectTypeSchema,
  stack: StackSchema,
  activityName: z.string().min(1).max(100),
  description: z.string().min(10).max(1000),
  category: CategorySchema,
  inArguments: z.array(InArgumentSchema).max(20),
  outArguments: z.array(OutArgumentSchema).max(10),
  externalAPIs: z.array(ExternalAPISchema).max(5),
  configSteps: z.array(ConfigStepSchema).max(5),
  outcomes: z.array(OutcomeSchema).min(2).max(10).optional(), // Required for decision splits
});
export type GenerationRequest = z.infer<typeof GenerationRequestSchema>;

// AI generation response schema (strict contract)
export const GeneratedActivitySchema = z.object({
  projectType: ProjectTypeSchema,
  stack: StackSchema,
  fileTree: z.array(FileEntrySchema).min(3), // At minimum: config.json, server file, client file
  configJson: z.record(z.unknown()), // The parsed config.json
  validation: z.object({
    isValid: z.boolean(),
    errors: z.array(z.string()),
    warnings: z.array(z.string()),
  }),
});
export type GeneratedActivity = z.infer<typeof GeneratedActivitySchema>;

// Validation result schema
export const ValidationResultSchema = z.object({
  isValid: z.boolean(),
  errors: z.array(z.object({
    code: z.string(),
    message: z.string(),
    path: z.string().optional(),
  })),
  warnings: z.array(z.object({
    code: z.string(),
    message: z.string(),
    path: z.string().optional(),
  })),
});
export type ValidationResult = z.infer<typeof ValidationResultSchema>;

// Requirements extracted from user prompt (looser schema for AI extraction)
export const ExtractedRequirementsSchema = z.object({
  activityName: z.string(),
  activityDescription: z.string(),
  category: CategorySchema.optional().default("custom"),
  inArguments: z.array(InArgumentSchema).optional().default([]),
  outArguments: z.array(OutArgumentSchema).optional().default([]),
  externalAPIs: z.array(ExternalAPISchema).optional().default([]),
  configurationSteps: z.array(ConfigStepSchema).optional().default([]),
  isDecisionSplit: z.boolean().optional().default(false),
  outcomes: z.array(OutcomeSchema).optional(),
  executionSteps: z.array(z.object({
    order: z.number(),
    action: z.string(),
    details: z.string(),
  })).optional().default([]),
});
export type ExtractedRequirements = z.infer<typeof ExtractedRequirementsSchema>;

// Safe parse helper
export function safeParseRequirements(data: unknown): { success: true; data: ExtractedRequirements } | { success: false; errors: string[] } {
  const result = ExtractedRequirementsSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return {
    success: false,
    errors: result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`),
  };
}

export function safeParseGeneratedActivity(data: unknown): { success: true; data: GeneratedActivity } | { success: false; errors: string[] } {
  const result = GeneratedActivitySchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return {
    success: false,
    errors: result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`),
  };
}
