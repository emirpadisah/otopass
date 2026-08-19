export type DatabaseErrorLike = {
  code?: string | null;
  message?: string | null;
  details?: string | null;
  hint?: string | null;
};

function errorText(error: DatabaseErrorLike | null | undefined): string {
  return [error?.message, error?.details, error?.hint].filter(Boolean).join(" ").toLowerCase();
}

export function isMissingColumn(error: DatabaseErrorLike | null | undefined, column: string): boolean {
  const code = error?.code ?? "";
  return (code === "42703" || code === "PGRST204") && errorText(error).includes(column.toLowerCase());
}

export function isMissingRelation(error: DatabaseErrorLike | null | undefined, relation: string): boolean {
  const code = error?.code ?? "";
  const text = errorText(error);
  return (code === "42P01" || code === "PGRST205") && text.includes(relation.toLowerCase());
}

export function isMissingFunction(error: DatabaseErrorLike | null | undefined, functionName: string): boolean {
  const code = error?.code ?? "";
  const text = errorText(error);
  return (code === "42883" || code === "PGRST202") && text.includes(functionName.toLowerCase());
}

export function isDuplicateKey(error: DatabaseErrorLike | null | undefined): boolean {
  return error?.code === "23505" || errorText(error).includes("duplicate key");
}
