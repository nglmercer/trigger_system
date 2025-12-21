
// This entry point is for Node.js / Bun environments
// It includes file system access and other server-side features.

export * from "./index"; // Export Platform Agnostic Core

// Export Node-specific implementations
export * from "./core/persistence.node";
export * from "./io/loader.node";
