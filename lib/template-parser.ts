/**
 * Template Parser
 * Replaces template variables with actual values
 */

export interface TemplateVariables {
  reporter_name?: string;
  reporter_email?: string;
  ref_id?: string;
  title?: string;
  severity?: string;
  target?: string;
  status?: string;
  triager_name?: string;
  [key: string]: string | undefined;
}

/**
 * Parse template and replace variables
 * @param template - Template string with {{variable}} placeholders
 * @param variables - Object containing variable values
 * @returns Parsed template with variables replaced
 */
export function parseTemplate(template: string, variables: TemplateVariables): string {
  let parsed = template;

  // Replace all {{variable}} with actual values
  Object.entries(variables).forEach(([key, value]) => {
    const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
    parsed = parsed.replace(regex, value || `[${key}]`);
  });

  // Handle any remaining unreplaced variables (show placeholder)
  parsed = parsed.replace(/\{\{(\w+)\}\}/g, '[$1]');

  return parsed;
}

/**
 * Extract variable names from template
 * @param template - Template string
 * @returns Array of variable names found in template
 */
export function extractVariables(template: string): string[] {
  const regex = /\{\{(\w+)\}\}/g;
  const variables: string[] = [];
  let match;

  while ((match = regex.exec(template)) !== null) {
    if (!variables.includes(match[1])) {
      variables.push(match[1]);
    }
  }

  return variables;
}

/**
 * Validate template syntax
 * @param template - Template string to validate
 * @returns Object with isValid flag and error message if invalid
 */
export function validateTemplateSyntax(template: string): { isValid: boolean; error?: string } {
  // Check for unmatched braces
  const openBraces = (template.match(/\{\{/g) || []).length;
  const closeBraces = (template.match(/\}\}/g) || []).length;

  if (openBraces !== closeBraces) {
    return {
      isValid: false,
      error: 'Unmatched braces in template. Each {{ must have a corresponding }}',
    };
  }

  // Check for invalid variable names (must be alphanumeric + underscore)
  const invalidVars = template.match(/\{\{[^}]*[^a-zA-Z0-9_][^}]*\}\}/g);
  if (invalidVars) {
    return {
      isValid: false,
      error: `Invalid variable names: ${invalidVars.join(', ')}. Use only letters, numbers, and underscores.`,
    };
  }

  return { isValid: true };
}

/**
 * Get available template variables with descriptions
 */
export const AVAILABLE_VARIABLES = [
  { name: 'reporter_name', description: "Researcher's name or handle" },
  { name: 'reporter_email', description: "Researcher's email address" },
  { name: 'ref_id', description: 'Report reference ID (e.g., VDP-001)' },
  { name: 'title', description: 'Report title' },
  { name: 'severity', description: 'Report severity (Critical, High, Medium, Low, Info)' },
  { name: 'target', description: 'Target domain or URL' },
  { name: 'status', description: 'Current report status' },
  { name: 'triager_name', description: "Current triager's name" },
] as const;
