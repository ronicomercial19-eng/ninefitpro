import { createServer } from "vite";
import path from "node:path";
import { mkdir } from "node:fs/promises";
import { spawn } from "node:child_process";
// This isolated fixture replaces authentication only in this QA server. Production is unchanged.
await mkdir("output", { recursive: true });
const server = await createServer({
  configFile: false,
  cacheDir: "output/student-experience-cache",
  optimizeDeps: { entries: ["scripts/fixtures/student-experience/index.html"] },
  plugins: [(await import("@vitejs/plugin-react-swc")).default()],
  resolve: {
    alias: [
      {
        find: "@/contexts/AuthContext",
        replacement: path.resolve(
          "scripts/fixtures/student-experience/auth.ts"
        ),
      },
      { find: "@", replacement: path.resolve("src") },
    ],
  },
  server: { host: "127.0.0.1", port: 4197, strictPort: true },
});
try {
  await server.listen();
  for (const screen of ["home", "train", "hub", "profile", "routes"])
    await new Promise((resolve, reject) => {
      const child = spawn(
        process.execPath,
        [`scripts/qa-student-${screen}.mjs`],
        { stdio: "inherit", env: process.env }
      );
      child.on("error", reject);
      child.on("exit", (code) =>
        code === 0
          ? resolve()
          : reject(new Error(`${screen} QA failed: ${code}`))
      );
    });
} finally {
  await server.close();
}
