export type ValidationResult = {
  valid: boolean;
  errors: string[];
};

export function validateTransactionPayload(payload: unknown): ValidationResult {
  if (!payload || typeof payload !== "object") {
    return { valid: false, errors: ["Payload must be an object"] };
  }

  return { valid: true, errors: [] };
}
