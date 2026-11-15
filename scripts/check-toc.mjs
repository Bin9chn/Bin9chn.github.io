#!/usr/bin/env node
// 检查每篇文章的标题层级 —— 文章页侧栏那张「本页目录」完全由正文的 ## / ### 自动生成，
// 所以这个脚本检查的就是"目录好不好看"：有没有小标题、是不是只有一层、条目多到要不要滚。
//
// 用法：
//   node scripts/check-toc.mjs          只出报告
//   node scripts/check-toc.mjs --strict 长文没分节时退出码 1（提交/推送前用）
//
// 约定（写在 README「文章目录」一节）：
//   - h2 = 大节，h3 = 小节；h4 及更深不进目录（hugo.toml 里 endLevel=3）。
//   - 短文（几十行、一口气能读完的 write-up）可以不分节，侧栏只是不显示目录卡。
//   - 超过 40 行的文章必须至少有一个 ##，否则侧栏目录整块消失。

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const postsDir = join(root, "content", "posts");
const strict = process.argv.includes("--strict");

const TOC_COMFORT = 14; // 目录条目多到这里，侧栏卡片就要内部滚动了
const LONG_BODY = 40; // 正文超过这么多行，就该有小标题
const headingRE = /^(#{1,6})\s+(\S.*?)\s*#*\s*$/;

function parse(file) {
  const lines = readFileSync(file, "utf8").split(/\r?\n/);
  let i = 0;
  if (/^(\+\+\+|---)\s*$/.test(lines[0] || "")) {
    const fence = lines[0].trim();
    i = 1;
    while (i < lines.length && lines[i].trim() !== fence) i++;
    i++;
  }
  const bodyStart = i;
  const headings = [];
  let fence = null;
  for (; i < lines.length; i++) {
    const line = lines[i];
    const fenceMatch = line.match(/^\s*(```+|~~~+)/);
    if (fenceMatch) {
      if (!fence) fence = fenceMatch[1][0];
      else if (fenceMatch[1][0] === fence) fence = null;
      continue;
    }
    if (fence) continue;
    const m = line.match(headingRE);
    if (m) headings.push({ level: m[1].length, line: i });
  }
  // 正文行数：去掉 front matter 后的非空行（含代码块，图/码占版面也算长）
  const bodyLines = lines.slice(bodyStart).filter((l) => l.trim()).length;
  return { headings, bodyLines };
}

const rows = [];
const blockers = [];

for (const slug of readdirSync(postsDir).sort()) {
  const dir = join(postsDir, slug);
  if (!statSync(dir).isDirectory()) continue;
  let parsed;
  try {
    parsed = parse(join(dir, "index.md"));
  } catch {
    continue;
  }
  const { headings, bodyLines } = parsed;
  const toc = headings.filter((h) => h.level === 2 || h.level === 3);
  const h2 = headings.filter((h) => h.level === 2).length;
  const h3 = headings.filter((h) => h.level === 3).length;
  const deep = headings.filter((h) => h.level >= 4).length;

  const notes = [];
  const isLong = bodyLines > LONG_BODY;

  if (toc.length === 0) {
    notes.push(isLong ? `长文（${bodyLines} 行）没有小标题，侧栏无目录` : "无 ## / ###：侧栏不显示目录（短文可以接受）");
  } else {
    if (h2 === 0) notes.push("只有 ###：目录全部平铺，没有层级");
    if (deep > 0) notes.push(`${deep} 个 h4+ 不进目录`);
    if (toc.length > TOC_COMFORT) notes.push(`目录 ${toc.length} 条，侧栏需内部滚动`);
  }

  rows.push({ slug, h2, h3, toc: toc.length, bodyLines, notes });
  if (toc.length === 0 && isLong) blockers.push(slug);
}

const pad = (s, n) => String(s).padEnd(n);
console.log(pad("文章", 62) + pad("h2", 4) + pad("h3", 4) + pad("目录", 6) + "行数");
console.log("-".repeat(84));
for (const r of rows) {
  console.log(
    pad(r.slug.length > 60 ? r.slug.slice(0, 59) + "…" : r.slug, 62) +
      pad(r.h2, 4) +
      pad(r.h3, 4) +
      pad(r.toc, 6) +
      pad(r.bodyLines, 6) +
      (r.notes.length ? "← " + r.notes.join("；") : "")
  );
}

console.log("-".repeat(84));
console.log(`共 ${rows.length} 篇；有目录 ${rows.length - rows.filter((r) => r.toc === 0).length} 篇；长文缺目录 ${blockers.length} 篇。`);

if (blockers.length) {
  console.log("\n需要补小标题：" + blockers.join("、"));
}

if (strict && blockers.length) {
  console.error(`\n--strict 失败：上面 ${blockers.length} 篇超过 ${LONG_BODY} 行却没有 ## 小标题，侧栏目录会是空的。`);
  process.exit(1);
}
