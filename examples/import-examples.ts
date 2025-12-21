/**
 * Examples of different import patterns for the trigger_system package
 * 
 * This demonstrates the various ways to import the SDK depending on your environment
 * and specific needs.
 */

// Example 1: Universal import (auto-detects environment)
// Works in both Node.js and browser environments
import * as sdk from 'trigger_system';

// Example 2: Node.js specific import
// Includes Node.js specific features like FilePersistence and TriggerLoader
import * as nodeSdk from 'trigger_system/node';

// Example 3: Client/Browser specific import  
// Optimized for browser environments, excludes Node.js specific features
import * as clientSdk from 'trigger_system/client';

// Example 4: Explicit browser import (alias for client)
import * as browserSdk from 'trigger_system/browser';

// Example 5: Selective imports (tree-shaking friendly)
import { RuleEngine, ActionRegistry } from 'trigger_system';
import { FilePersistence } from 'trigger_system/node';
import { BrowserPersistence } from 'trigger_system/client';

// Usage examples:

// Universal SDK (works everywhere)
const universalEngine = new sdk.RuleEngine();

// Node.js specific SDK (includes file system features)
const nodeEngine = new nodeSdk.RuleEngine();
const filePersistence = new nodeSdk.FilePersistence('./rules');

// Client SDK (browser-optimized)
const clientEngine = new clientSdk.RuleEngine();
const browserPersistence = new clientSdk.BrowserPersistence();

console.log('Import examples loaded successfully!');