import { promises as fs } from "fs";
import { join } from "path";

const filesToSync = [
  { src: "index.html", dest: "public/index.html" },
  { src: "app.js", dest: "public/app.js" },
];

async function syncFiles() {
  console.log("HopeIndexAI File Sync -> Copying root files to public/...");

  try {
    // Ensure public/ directory exists
    await fs.mkdir("public", { recursive: true });

    for (const { src, dest } of filesToSync) {
      await fs.copyFile(src, dest);
      console.log(`Synced: ${src} -> ${dest}`);
    }

    console.log("File synchronization completed successfully.");
  } catch (error) {
    console.error("Error during file sync:", error);
    process.exit(1);
  }
}

syncFiles();
