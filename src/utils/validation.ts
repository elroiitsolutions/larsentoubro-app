/**
 * Email Validator
 * Enforces presence of '@' and '.' in the email.
 * Without '@' and '.', rejects the email; otherwise accepts valid email format.
 */
export const validateEmail = (rawEmail: string): { isValid: boolean; error?: string } => {
  const email = (rawEmail || '').trim().toLowerCase();
  
  if (!email) {
    return { isValid: false, error: 'Email address is required.' };
  }
  
  if (!email.includes('@')) {
    return { 
      isValid: false, 
      error: "Email address is missing '@'. Please enter a valid email (e.g. name@domain.com)." 
    };
  }

  const parts = email.split('@');
  if (parts.length !== 2 || !parts[0].trim() || !parts[1].trim()) {
    return { 
      isValid: false, 
      error: "Please enter a valid email with username and domain (e.g. name@domain.com)." 
    };
  }

  const domain = parts[1].trim();
  
  // Must contain a dot (.) in the domain
  if (!domain.includes('.')) {
    return { 
      isValid: false, 
      error: "Email domain must contain '.' (e.g. name@domain.com)." 
    };
  }

  if (domain.startsWith('.') || domain.endsWith('.') || domain.includes('..')) {
    return { 
      isValid: false, 
      error: "Please enter a valid domain name with '.' (e.g. name@domain.com)." 
    };
  }

  // Regex: valid local part + @ + valid domain parts with at least one dot
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9-]+(\.[a-zA-Z0-9-]+)+$/i;
  if (!emailRegex.test(email)) {
    return { 
      isValid: false, 
      error: "Invalid email format. Email must contain '@' and '.' (e.g. name@domain.com)." 
    };
  }

  return { isValid: true };
};

/**
 * Normalizes an Indian mobile phone number entered or pasted into an input.
 * Strips leading +91, 91, or 0 when the text has extra digits, removes formatting
 * spaces, dashes, parentheses, and returns up to 10 clean digits.
 * Examples:
 *   "+91 7708870676" -> "7708870676"
 *   "917708870676"   -> "7708870676"
 *   "07708870676"    -> "7708870676"
 *   "77088 70676"    -> "7708870676"
 *   "7708870676"     -> "7708870676"
 */
export const cleanAndFormatIndianMobile = (raw: string): string => {
  if (!raw) return '';
  let digits = String(raw).replace(/\D/g, '');

  if (digits.length > 10 && digits.startsWith('91')) {
    digits = digits.slice(2);
  } else if (digits.length > 10 && digits.startsWith('0')) {
    digits = digits.slice(1);
  }

  return digits.slice(0, 10);
};

/**
 * Validates a 10-digit Indian Mobile Number.
 * Requirements:
 * - Only 10 numbers
 * - Starts with 6, 7, 8, or 9
 * - No country code (e.g. +91, 91, 0)
 */
export const validateIndianMobile = (
  rawMobile: string,
  fieldName: string = 'Phone Number'
): { isValid: boolean; error?: string } => {
  const mobile = (rawMobile || '').trim();

  if (!mobile) {
    return { isValid: false, error: `${fieldName} is required.` };
  }

  // Check if non-digits are present
  if (/\D/.test(mobile)) {
    return {
      isValid: false,
      error: `${fieldName} must contain only 10 numbers without spaces or country code (+91).`,
    };
  }

  // Check exact length of 10 digits
  if (mobile.length !== 10) {
    return {
      isValid: false,
      error: `${fieldName} must be exactly 10 digits (do not add country code).`,
    };
  }

  // Check Indian mobile prefix: must start with 6, 7, 8, or 9
  if (!/^[6-9]/.test(mobile)) {
    return {
      isValid: false,
      error: `${fieldName} must be a valid Indian mobile number starting with 6, 7, 8, or 9.`,
    };
  }

  return { isValid: true };
};
