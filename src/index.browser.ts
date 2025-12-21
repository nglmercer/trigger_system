
// Browser Entry Point
// Exports universal logic, excluding FileSystem IO specific modules (TriggerLoader, FilePersistence)

export * from "./core";
export * from "./domain";
export * from "./types";
export * from "./utils/utils";

// Explicitly export Browser Persistence as default for this entry
export { BrowserPersistence } from "./core/persistence-browser";

// Exclude TriggerLoader and FilePersistence from this bundle
