export function log(...args: unknown[]): void {
  console.log(`[${new Date().toISOString()}]`, ...args);
}

export function warn(...args: unknown[]): void {
  console.warn(`[${new Date().toISOString()}] WARN`, ...args);
}
