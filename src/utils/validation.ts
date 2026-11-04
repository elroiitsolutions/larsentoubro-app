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
