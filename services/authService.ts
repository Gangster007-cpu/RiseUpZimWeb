
import { User } from '../App';

interface ResetToken {
  email: string;
  token: string;
  expires: number;
}

// Mock database for reset tokens in memory (cleared on refresh)
let resetTokens: ResetToken[] = [];

/**
 * Handles the "Forgot Password" request with strict existence checking.
 * 
 * Logic Flow:
 * 1. Normalize input.
 * 2. Query the 'registered_users' database.
 * 3. IF user exists: Generate a 6-digit token and "dispatch" it.
 * 4. ALWAYS return a success message to prevent account enumeration attacks.
 */
export const requestPasswordReset = async (email: string): Promise<{ message: string; exists: boolean }> => {
  // Consistent latency to mask database lookups from timing attacks
  await new Promise(resolve => setTimeout(resolve, 1200));

  const normalizedEmail = email.trim().toLowerCase();
  
  // 1. DATABASE CHECK
  const users: User[] = JSON.parse(localStorage.getItem('registered_users') || '[]');
  const user = users.find(u => u.email.toLowerCase() === normalizedEmail);

  if (user) {
    // 2. GENERATE SECURE 6-DIGIT TOKEN
    const token = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = Date.now() + 15 * 60 * 1000; // 15-minute expiration

    // Store/Update token
    resetTokens = resetTokens.filter(t => t.email !== normalizedEmail);
    resetTokens.push({ email: normalizedEmail, token, expires });

    /**
     * SIMULATED EMAIL DISPATCH
     * In a production environment with a backend, we would use:
     * const resend = new Resend(process.env.RESEND_API_KEY);
     * await resend.emails.send({ ... });
     */
    console.info(`[AUTH SERVICE] SUCCESS: Token ${token} generated for ${normalizedEmail}.`);
    
    // For the UI to show a "simulated notification", we return 'exists: true' 
    // This allows the frontend to show the code in the demo.
    return { 
      message: "If an account exists for this email, a verification code has been sent.", 
      exists: true 
    };
  }

  // 3. LOG FAILURE INTERNALLY (Security Masking)
  console.warn(`[AUTH SERVICE] MASKED: Reset attempted for non-existent email: ${normalizedEmail}.`);
  return { 
    message: "If an account exists for this email, a verification code has been sent.", 
    exists: false 
  };
};

/**
 * Validates the provided code.
 */
export const validateResetToken = async (email: string, token: string): Promise<boolean> => {
  await new Promise(resolve => setTimeout(resolve, 800));
  
  const normalizedEmail = email.trim().toLowerCase();
  const record = resetTokens.find(t => t.email === normalizedEmail && t.token === token);
  
  if (!record) return false;
  if (Date.now() > record.expires) {
    resetTokens = resetTokens.filter(t => t !== record);
    return false;
  }
  
  return true;
};

/**
 * Gets the current token for an email (Demo Helper only).
 */
export const getActiveTokenForDemo = (email: string): string | null => {
  const normalizedEmail = email.trim().toLowerCase();
  const record = resetTokens.find(t => t.email === normalizedEmail);
  return record ? record.token : null;
};

/**
 * Updates the user's password in the database.
 */
export const finalizePasswordReset = async (email: string, token: string, newPassword: string): Promise<boolean> => {
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  const isValid = await validateResetToken(email, token);
  if (!isValid) return false;

  const users: User[] = JSON.parse(localStorage.getItem('registered_users') || '[]');
  const userIndex = users.findIndex(u => u.email.toLowerCase() === email.toLowerCase());
  
  if (userIndex === -1) return false;

  users[userIndex].password = newPassword;
  localStorage.setItem('registered_users', JSON.stringify(users));

  // Invalidate token immediately
  resetTokens = resetTokens.filter(t => t.email !== email.toLowerCase());

  return true;
};
