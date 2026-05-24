// Side-effect import: loads .env into process.env before any other module is
// evaluated. Must be the FIRST import of the entry point — ES module imports are
// hoisted, so config.ts (which reads process.env at module load) would otherwise
// see the ambient environment before loadEnvFile() ran.
try {
  process.loadEnvFile(new URL("../../.env", import.meta.url));
} catch {
  /* no .env file — rely on the ambient environment */
}
