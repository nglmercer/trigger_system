/**
 * Trigger Editor - Main Entry Point
 * 
 * This file initializes the node-based trigger editor
 */

// Import components from the built distribution
import { NodeEditor } from "../../src/index.js";

// Import to ensure registration
import "../../src/index.js";

// Initialize editor when DOM is ready
document.addEventListener("DOMContentLoaded", () => {
  const editor = document.getElementById("editor") as NodeEditor;
  
  if (!editor) {
    console.error("Editor element not found!");
    return;
  }
  
  // Load an example rule into the editor
  editor.rule = {
    id: "example-rule",
    name: "Example Rule",
    on: "user.login",
    enabled: true,
    priority: 5,
    cooldown: 0,
    tags: [],
    do: [
      { type: "log", params: { message: "User logged in" } },
      { type: "http", params: { url: "https://api.example.com/notify", method: "POST" } }
    ]
  };
  
  // Listen for nodes change events
  editor.addEventListener("nodes-change", (e: Event) => {
    const customEvent = e as CustomEvent;
    console.log("📝 Nodes changed:", customEvent.detail);
  });
  
  // Example: Get the built rule
  setTimeout(() => {
    const rule = editor.getRule();
    console.log("🎯 Built rule:", rule);
    
    const yaml = editor.exportYaml();
    console.log("📄 YAML:\n", yaml);
  }, 1000);
  
  console.log("🎯 Node-Based Trigger Editor initialized!");
});
