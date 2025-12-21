
import { TriggerLoader } from "../io/loader.node";
import { DependencyAnalyzer } from "../core/dependency-graph";
import { resolve } from "path";

async function main() {
    const args = Bun.argv.slice(2);
    const directory = args[0] || "./rules";
    const absPath = resolve(process.cwd(), directory);

    console.log(`\n🔍 Validating Rules in: ${absPath}`);
    console.log(`==================================================`);

    try {
        // TriggerLoader already logs validation errors to console.warn
        // We capture them or just rely on its logging?
        // Loader returns VALID rules only.
        const rules = await TriggerLoader.loadRulesFromDir(absPath);
        
        console.log(`\n📊 Summary:`);
        console.log(`   - Loaded Rules: ${rules.length}`);
        
        if (rules.length === 0) {
            console.log(`   - ⚠️ No valid rules found (or all failed validation).`);
        }

        // Circular Dependency Check
        console.log(`\n🔄 Checking for Circular Dependencies...`);
        const cycles = DependencyAnalyzer.detectCycles(rules);
        
        if (cycles.length > 0) {
            console.error(`\n❌ Error: Circular Dependencies Detected!`);
            cycles.forEach((cycle, idx) => {
                 console.error(`   [Cycle #${idx+1}] ${cycle.join(' -> ')} -> ${cycle[0]}`);
            });
            console.log(`\n💥 Validation Failed.`);
            process.exit(1);
        } else {
            console.log(`   - ✅ No cycles found.`);
        }

        console.log(`\n✅ Validation Passed Successfully.`);
        process.exit(0);

    } catch (err) {
        console.error(`\n❌ Fatal Error:`, err);
        process.exit(1);
    }
}

main();
