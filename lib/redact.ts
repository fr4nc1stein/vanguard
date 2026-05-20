/**
 * Privacy utilities for redacting PII from user-submitted content
 */

/**
 * Redacts personally identifiable information from text
 * - Email addresses
 * - IP addresses (IPv4 and IPv6)
 * - Common PII patterns
 */
export function redactPII(text: string): string {
  let redacted = text;

  // Redact email addresses
  redacted = redacted.replace(
    /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
    '[REDACTED_EMAIL]'
  );

  // Redact IPv4 addresses
  redacted = redacted.replace(
    /\b(?:\d{1,3}\.){3}\d{1,3}\b/g,
    '[REDACTED_IP]'
  );

  // Redact IPv6 addresses
  redacted = redacted.replace(
    /\b(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}\b/g,
    '[REDACTED_IP]'
  );

  // Redact API keys and tokens (common patterns)
  redacted = redacted.replace(
    /\b(?:api[_-]?key|token|secret|password)[:\s]*[A-Za-z0-9_\-]{16,}\b/gi,
    '[REDACTED_TOKEN]'
  );

  // Redact common credential patterns
  redacted = redacted.replace(
    /\b(?:sk|pk|api)_(?:live|test)_[A-Za-z0-9]{20,}\b/g,
    '[REDACTED_KEY]'
  );

  return redacted;
}

/**
 * Checks if text contains PII that should be redacted
 */
export function containsPII(text: string): boolean {
  const emailPattern = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/;
  const ipv4Pattern = /\b(?:\d{1,3}\.){3}\d{1,3}\b/;
  const ipv6Pattern = /\b(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}\b/;
  const tokenPattern = /\b(?:api[_-]?key|token|secret|password)[:\s]*[A-Za-z0-9_\-]{16,}\b/i;
  const keyPattern = /\b(?:sk|pk|api)_(?:live|test)_[A-Za-z0-9]{20,}\b/;

  return (
    emailPattern.test(text) ||
    ipv4Pattern.test(text) ||
    ipv6Pattern.test(text) ||
    tokenPattern.test(text) ||
    keyPattern.test(text)
  );
}

/**
 * Get display name for a user, preferring alias > firstName lastName > username > email
 */
export function getDisplayName(user: {
  publicMetadata?: { alias?: string };
  firstName?: string | null;
  lastName?: string | null;
  username?: string | null;
  emailAddresses?: Array<{ emailAddress: string }>;
}): string {
  // Check for custom alias in publicMetadata
  const alias = (user.publicMetadata as { alias?: string })?.alias;
  if (alias?.trim()) {
    return alias.trim();
  }

  // Use first name + last name
  if (user.firstName && user.lastName) {
    return `${user.firstName} ${user.lastName}`.trim();
  }

  // Use first name only
  if (user.firstName) {
    return user.firstName.trim();
  }

  // Use username
  if (user.username) {
    return user.username;
  }

  // Fallback to email (first part only for privacy)
  const email = user.emailAddresses?.[0]?.emailAddress;
  if (email) {
    return email.split('@')[0];
  }

  return 'Anonymous';
}
