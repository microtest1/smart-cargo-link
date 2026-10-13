// Ambient declaration for process.env used inside MCP tool handlers.
// These files are bundled into a Deno edge function at build time; the
// `process` global is provided by the emitted runtime, not the browser bundle.
declare const process: { env: Record<string, string | undefined> };
