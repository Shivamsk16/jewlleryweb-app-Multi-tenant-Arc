/** Whether a tenant can be suspended (active only). */
export function canSuspendTenant(status: string): boolean {
  return status === "active";
}

/** Whether a tenant can be activated (suspended only). */
export function canActivateTenant(status: string): boolean {
  return status === "suspended";
}
