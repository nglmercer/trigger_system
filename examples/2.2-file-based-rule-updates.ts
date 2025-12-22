import { RuleEngine } from "../src/node";
import { setupExampleObserver } from "./setup-observer";
import { triggerEmitter, EngineEvent } from "../src/node";
import * as fs from 'fs';
import * as path from 'path';

// Enable global observation
setupExampleObserver();

// Track file changes and rule updates
const fileChangeLog: string[] = [];
const ruleUpdateLog: string[] = [];

// Monitor file changes
function watchRuleFile(filePath: string, engine: RuleEngine) {
  console.log(`👁️  Watching file: ${filePath}`);
  
  // Store file hashes in a Map instead of global
  const fileHashes = new Map<string, string>();
  
  // Simulate file watcher
  const checkInterval = setInterval(() => {
    if (fs.existsSync(filePath)) {
      try {
        const content = fs.readFileSync(filePath, 'utf8');
        const stats = fs.statSync(filePath);
        const lastModified = stats.mtime.getTime();
        
        // Simple change detection (in real app, use proper file watching)
        const currentHash = Buffer.from(content).toString('base64').slice(0, 10);
        const fileKey = `file_${path.basename(filePath)}`;
        
        if (!fileHashes.has(fileKey) || fileHashes.get(fileKey) !== currentHash) {
          fileHashes.set(fileKey, currentHash);
          
          console.log(`\n📝 File changed: ${path.basename(filePath)}`);
          fileChangeLog.push(`File ${path.basename(filePath)} modified at ${new Date(lastModified).toLocaleTimeString()}`);
          
          // Load and apply new rules
          try {
            const newRules = JSON.parse(content);
            engine.updateRules(newRules);
            
            // Emit custom event for rule update
            triggerEmitter.emit('rules:updated', {
              count: newRules.length,
              source: 'file',
              filename: path.basename(filePath)
            });
            
            ruleUpdateLog.push(`Rules updated from ${path.basename(filePath)}: ${newRules.length} rules`);
            console.log(`✅ Applied ${newRules.length} rules from file`);
          } catch (parseError) {
            const errorMessage = parseError instanceof Error ? parseError.message : String(parseError);
            console.error(`❌ Error parsing rules file:`, errorMessage);
            triggerEmitter.emit('rules:parse_error', {
              filename: path.basename(filePath),
              error: errorMessage
            });
          }
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`❌ Error reading file:`, errorMessage);
      }
    }
  }, 2000); // Check every 2 seconds for demo purposes

  return checkInterval;
}

async function runExample() {
  console.log("\n=== Running Example 2.2: File-Based Rule Updates ===");
  
  const engine = new RuleEngine({
    rules: [
      {
        id: "default-rule",
        on: "TEST_EVENT",
        do: { type: "LOG", params: { message: "Default rule executed" } }
      }
    ],
    globalSettings: { debugMode: true }
  });

  // Create temporary rule files
  const tempDir = path.join(__dirname, 'temp_rules');
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir);
  }

  const rulesFile1 = path.join(tempDir, 'rules_v1.json');
  const rulesFile2 = path.join(tempDir, 'rules_v2.json');

  // Initial test
  console.log("\n1. Testing with default rules...");
  await engine.processEvent({
    event: "TEST_EVENT",
    timestamp: Date.now(),
    data: { test: "data" }
  });

  // Create first version of rules file
  const rulesV1 = [
    {
      id: "file-rule-1",
      on: "USER_ACTION",
      if: { field: "data.action", operator: "==", value: "login" },
      do: { type: "LOG", params: { message: "File Rule v1: User logged in" } }
    },
    {
      id: "file-rule-2",
      on: "USER_ACTION",
      if: { field: "data.action", operator: "==", value: "logout" },
      do: { type: "LOG", params: { message: "File Rule v1: User logged out" } }
    }
  ];

  fs.writeFileSync(rulesFile1, JSON.stringify(rulesV1, null, 2));
  console.log(`\n2. Created rules file: ${path.basename(rulesFile1)}`);

  // Start watching the file
  const watcher1 = watchRuleFile(rulesFile1, engine);

  // Wait a bit for the watcher to detect the file
  await new Promise(resolve => setTimeout(resolve, 2500));

  console.log("\n3. Testing with file-based rules...");
  await engine.processEvent({
    event: "USER_ACTION",
    timestamp: Date.now(),
    data: { action: "login" }
  });

  await engine.processEvent({
    event: "USER_ACTION",
    timestamp: Date.now(),
    data: { action: "logout" }
  });

  // Create second version with updated rules
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  const rulesV2 = [
    {
      id: "enhanced-login",
      on: "USER_ACTION",
      if: {
        operator: "AND",
        conditions: [
          { field: "data.action", operator: "==", value: "login" },
          { field: "data.userType", operator: "==", value: "premium" }
        ]
      },
      do: { type: "LOG", params: { message: "File Rule v2: Premium user logged in - VIP treatment!" } }
    },
    {
      id: "enhanced-logout",
      on: "USER_ACTION",
      if: { field: "data.action", operator: "==", value: "logout" },
      do: { type: "LOG", params: { message: "File Rule v2: User session ended - saving data..." } }
    },
    {
      id: "new-action",
      on: "USER_ACTION",
      if: { field: "data.action", operator: "==", value: "purchase" },
      do: { type: "LOG", params: { message: "File Rule v2: Purchase detected - processing order..." } }
    }
  ];

  fs.writeFileSync(rulesFile1, JSON.stringify(rulesV2, null, 2));
  console.log(`\n4. Updated rules file with v2 rules...`);

  // Wait for the watcher to detect the change
  await new Promise(resolve => setTimeout(resolve, 2500));

  console.log("\n5. Testing with updated rules...");
  await engine.processEvent({
    event: "USER_ACTION",
    timestamp: Date.now(),
    data: { action: "login", userType: "premium" }
  });

  await engine.processEvent({
    event: "USER_ACTION",
    timestamp: Date.now(),
    data: { action: "purchase", amount: 99.99 }
  });

  // Test with invalid rule file
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  fs.writeFileSync(rulesFile2, "invalid json content {");
  console.log(`\n6. Creating invalid rules file for error handling test...`);

  // Try to load invalid file
  try {
    const invalidContent = fs.readFileSync(rulesFile2, 'utf8');
    const invalidRules = JSON.parse(invalidContent); // This will throw
    engine.updateRules(invalidRules);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.log(`❌ Expected error caught: ${errorMessage}`);
    triggerEmitter.emit('rules:parse_error', {
      filename: path.basename(rulesFile2),
      error: errorMessage
    });
  }

  // Cleanup
  clearInterval(watcher1);
  
  // Wait a bit before cleanup
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Remove temp files
  try {
    fs.unlinkSync(rulesFile1);
    fs.unlinkSync(rulesFile2);
    fs.rmdirSync(tempDir);
    console.log(`\n🧹 Cleaned up temporary files`);
  } catch (cleanupError) {
    const errorMessage = cleanupError instanceof Error ? cleanupError.message : String(cleanupError);
    console.log(`\n⚠️  Cleanup warning: ${errorMessage}`);
  }

  // Summary
  console.log(`\n📊 Summary:`);
  console.log(`   - File changes detected: ${fileChangeLog.length}`);
  console.log(`   - Rule updates applied: ${ruleUpdateLog.length}`);
  console.log(`   - Events tracked via emitter: ${fileChangeLog.length + ruleUpdateLog.length + 4}`); // +4 for built-in events
}

runExample().catch(console.error);