import {
  pinValidationError,
  usernameValidationError,
} from "@/lib/auth/validation";

export interface Credentials {
  username: string;
  pin: string;
}

export async function readCredentials(
  request: Request,
): Promise<{ credentials?: Credentials; error?: string }> {
  let value: unknown;
  try {
    value = await request.json();
  } catch {
    return { error: "Enter a username and PIN." };
  }

  if (!value || typeof value !== "object") {
    return { error: "Enter a username and PIN." };
  }

  const candidate = value as Partial<Credentials>;
  const username =
    typeof candidate.username === "string" ? candidate.username.trim() : "";
  const pin = typeof candidate.pin === "string" ? candidate.pin : "";
  const error = usernameValidationError(username) ?? pinValidationError(pin);
  return error ? { error } : { credentials: { username, pin } };
}
