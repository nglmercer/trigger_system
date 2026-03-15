/**
 * Trigger Editor - Main Entry Point
 * 
 * This file initializes the trigger-editor web component
 */

// Import the trigger-editor from the built distribution
import { TriggerEditor } from "../../dist/index.js";

// Register the custom element (already done via @customElement decorator)
// but we can explicitly import to ensure registration
import "../../dist/index.js";

// Initialize editor when DOM is ready
document.addEventListener("DOMContentLoaded", () => {
  const editor = document.getElementById("editor") as TriggerEditor;
  
  if (!editor) {
    console.error("Editor element not found!");
    return;
  }
  
  // Configure the editor
  editor.config = {
    initialRules: [
      {
        id: "example-rule",
        name: "Example Rule",
        on: "user.login",
        enabled: true,
        priority: 5,
        do: { type: "log", params: { message: "User logged in" } }
      }
    ],
    darkMode: false,
    showYamlPreview: true,
    availableActions: "log,http,notify,transform,delay,set_state,webhook,email",
    availableEvents: "user.login,user.logout,user.signup,payment.received,payment.failed",
    
    // Callback when rules change
    onChange: (rules) => {
      console.log("📝 Rules changed:", rules.length, "rules");
    },
    
    // Callback when rules are exported
    onExport: (rules, format) => {
      console.log("📤 Exported", rules.length, "rules as", format);
    }
  };
  
  // Listen for events
  editor.addEventListener("rule-added", (e: Event) => {
    const customEvent = e as CustomEvent;
    console.log("✅ Rule added:", customEvent.detail);
  });
  
  editor.addEventListener("rule-updated", (e: Event) => {
    const customEvent = e as CustomEvent;
    console.log("✏️ Rule updated:", customEvent.detail);
  });
  
  editor.addEventListener("rule-deleted", (e: Event) => {
    const customEvent = e as CustomEvent;
    console.log("🗑️ Rule deleted:", customEvent.detail);
  });
  
  editor.addEventListener("rules-exported", (e: Event) => {
    const customEvent = e as CustomEvent;
    console.log("📤 Rules exported:", customEvent.detail.format, customEvent.detail.rules);
  });
  
  editor.addEventListener("validation-error", (e: Event) => {
    const customEvent = e as CustomEvent;
    console.log("⚠️ Validation errors:", customEvent.detail);
  });
  
  console.log("🎯 Trigger Editor initialized!");
  console.log("📋 Initial rules:", editor.getRules());
});
