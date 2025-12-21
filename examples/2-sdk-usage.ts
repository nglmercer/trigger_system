import { RuleBuilder, RuleExporter } from "../src/node";
import { setupExampleObserver } from "./setup-observer";
import path from "path";

// Enable global observation
setupExampleObserver();

async function runExample() {
  console.log("--- Running Example 2: SDK Usage ---");

  // 1. Build a rule using the fluent SDK
  const rule = new RuleBuilder()
    .withId("sdk-rule-example")
    .withName("Generated Rule")
    .withDescription("This rule was created using the RuleBuilder SDK")
    .on("WEBHOOK_RECEIVED")
    .if("data.source", "==", "stripe")
    .if("data.type", "==", "charge.succeeded")
    .do("PROCESS_PAYMENT", { provider: "stripe" })
    .build();

  console.log("Successfully built rule:", rule.id);

  // 2. Convert to YAML string
  const yamlString = RuleExporter.toYaml(rule);
  console.log("\nGenerated YAML Snippet:");
  console.log(yamlString);

  // 3. Save to file (Node/Bun only)
  const outputPath = path.join(process.cwd(), "examples/rules/generated_sdk_rule.yaml");
  await RuleExporter.saveToFile(rule, outputPath);
  
  console.log(`\nRule saved to: ${outputPath}`);

  // 4. Building a complex rule with groups
  const complexRule = new RuleBuilder()
    .withId("complex-sdk-rule")
    .on("USER_ACTION")
    .ifComplex(q => q
      .where("data.score", ">", 100)
      .or(sub => sub
        .where("data.premium", "==", true)
        .where("data.level", ">", 10)
      )
    )
    .doComplex(a => a
      .setMode("SEQUENCE")
      .add("LOG", { message: "User is elite" })
      .add("GRANT_ACCESS", { zone: "premium-lounge" })
    )
    .build();

  const complexYaml = RuleExporter.toYaml(complexRule);
  console.log("\nComplex Generated YAML:");
  console.log(complexYaml);
}

runExample().catch(console.error);
