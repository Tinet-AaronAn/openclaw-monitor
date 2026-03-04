import { execSync } from "child_process";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import type { VersionInfo } from "./types.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 从 package.json 读取版本号
function getPackageVersion(): string {
  try {
    const packageJsonPath = resolve(__dirname, "../../package.json");
    const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf-8"));
    return packageJson.version || "0.0.0";
  } catch (error) {
    console.error("[Version] Failed to read package.json:", error);
    return "0.0.0";
  }
}

// 获取最后构建时间（使用 git 最后提交时间或当前时间）
function getBuildTime(): string {
  try {
    // 尝试从 git 获取最后提交时间
    const gitTime = execSync("git log -1 --format=%ai", {
      cwd: resolve(__dirname, "../.."),
      encoding: "utf-8",
    }).trim();

    if (gitTime) {
      return gitTime;
    }
  } catch (error) {
    // Git 命令失败，使用当前时间
  }

  // 回退到当前时间
  return new Date().toISOString();
}

// 获取 git commit hash
function getGitCommit(): string | undefined {
  try {
    return execSync("git rev-parse --short HEAD", {
      cwd: resolve(__dirname, "../.."),
      encoding: "utf-8",
    }).trim();
  } catch (error) {
    return undefined;
  }
}

// 导出版本信息
export function getVersionInfo(): VersionInfo {
  const version = getPackageVersion();
  const buildTime = getBuildTime();
  const gitCommit = getGitCommit();

  return {
    version,
    buildTime,
    gitCommit,
  };
}
