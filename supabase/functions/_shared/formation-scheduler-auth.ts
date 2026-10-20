/** A dedicated scheduler token cannot authorize targeted sends, test mode or admin operations. */
export function validFormationSchedulerToken(provided: string | null, expected: string | undefined): boolean {
  if (!expected || !/^[a-f0-9]{64}$/.test(expected) || !provided || provided.length !== 64) return false;
  let difference = 0;
  for (let i = 0; i < 64; i++) difference |= provided.charCodeAt(i) ^ expected.charCodeAt(i);
  return difference === 0;
}
export function isFormationSchedulerPayload(body: unknown): boolean {
  if (!body || typeof body !== "object" || Array.isArray(body)) return false;
  const record = body as Record<string, unknown>;
  const keys = Object.keys(record);
  return keys.length === 1 && ((keys[0] === "scheduled" && record.scheduled === true) || (keys[0] === "schedulerHealthCheck" && record.schedulerHealthCheck === true));
}
