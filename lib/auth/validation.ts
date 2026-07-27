const USERNAME_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9_.-]{2,23}$/;
const PIN_PATTERN = /^\d{4,8}$/;

export function normalizeUsername(username: string): string {
  return username.trim().toLocaleLowerCase("en-US");
}

export function usernameValidationError(username: string): string | null {
  const trimmed = username.trim();
  if (!USERNAME_PATTERN.test(trimmed)) {
    return "Username must be 3–24 characters using letters, numbers, dot, dash, or underscore.";
  }
  return null;
}

export function pinValidationError(pin: string): string | null {
  return PIN_PATTERN.test(pin) ? null : "PIN must contain 4–8 digits.";
}
