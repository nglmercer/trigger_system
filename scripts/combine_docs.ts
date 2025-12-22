import { readdir, readFile, writeFile } from "node:fs/promises";
import { join, extname, basename } from "node:path";

const DOCS_DIR = join(process.cwd(), "docs");
const OUTPUT_FILE = join(process.cwd(), "docs", "combined_context.md");

async function combineDocs() {
  try {
    const files = await readdir(DOCS_DIR);
    const mdFiles = files.filter((file) => extname(file).toLowerCase() === ".md" && file !== "combined_context.md");

    let combinedContent = "# all context\n\n";

    for (const file of mdFiles) {
      const filePath = join(DOCS_DIR, file);
      const content = await readFile(filePath, "utf-8");
      
      combinedContent += `\n\n<!-- FILE: ${file} -->\n`;
      combinedContent += `\n# Archivo: ${file}\n\n`;
      combinedContent += content;
      combinedContent += `\n\n<!-- END FILE: ${file} -->\n`;
      combinedContent += "\n---"; // Separator
    }

    await writeFile(OUTPUT_FILE, combinedContent, "utf-8");
    console.log(`file created: ${OUTPUT_FILE}`);
  } catch (error) {
    console.error("error:", error);
  }
}

combineDocs();
