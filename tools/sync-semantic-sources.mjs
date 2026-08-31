import {
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { semanticSourceBundles } from "./semantic-source-layout.mjs";

const extensionRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const mode = process.argv[2] || "check";

function fragmentPath(bundle, fragmentName) {
  return join(extensionRoot, bundle.sourceDir, fragmentName);
}

function splitBundle(bundle, source) {
  const starts = bundle.fragments.map(([fragmentName, marker], index) => {
    if (index === 0) return 0;
    const markerIndex = source.indexOf(marker);
    if (markerIndex < 0) {
      throw new Error(`${bundle.bundle} 缺少 ${fragmentName} 的边界标记: ${marker}`);
    }
    if (source.indexOf(marker, markerIndex + 1) >= 0) {
      throw new Error(`${bundle.bundle} 的边界标记不唯一: ${marker}`);
    }
    return markerIndex;
  });
  return bundle.fragments.map(([fragmentName], index) => [
    fragmentName,
    source.slice(starts[index], starts[index + 1] ?? source.length),
  ]);
}

function extract(bundle) {
  const bundlePath = join(extensionRoot, bundle.bundle);
  const parts = splitBundle(bundle, readFileSync(bundlePath, "utf8"));
  mkdirSync(join(extensionRoot, bundle.sourceDir), { recursive: true });
  for (const [fragmentName, source] of parts) {
    writeFileSync(fragmentPath(bundle, fragmentName), source);
  }
  return parts.length;
}

function build(bundle, persist) {
  const source = bundle.fragments
    .map(([fragmentName]) => readFileSync(fragmentPath(bundle, fragmentName), "utf8"))
    .join("");
  const bundlePath = join(extensionRoot, bundle.bundle);
  if (persist) writeFileSync(bundlePath, source);
  return { bundlePath, source };
}

for (const bundle of semanticSourceBundles) {
  if (mode === "extract") {
    const count = extract(bundle);
    console.log(`已拆分 ${bundle.bundle}: ${count} 个语义片段`);
    continue;
  }
  const generated = build(bundle, mode === "build");
  if (mode === "build") {
    console.log(`已生成 ${bundle.bundle}`);
    continue;
  }
  if (mode !== "check") {
    throw new Error("用法: node tools/sync-semantic-sources.mjs [extract|build|check]");
  }
  const current = readFileSync(generated.bundlePath, "utf8");
  if (current !== generated.source) {
    throw new Error(
      `${bundle.bundle} 与语义片段不一致，请运行 node tools/sync-semantic-sources.mjs build`,
    );
  }
  console.log(`语义片段一致: ${bundle.bundle}`);
}
