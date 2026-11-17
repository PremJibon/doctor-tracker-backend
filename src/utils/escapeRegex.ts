/**
 * Safely escapes special regex characters in user search inputs
 * to prevent ReDoS (Regular Expression Denial of Service) and unintended query manipulation.
 */
export const escapeRegex = (text: string): string => {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};
