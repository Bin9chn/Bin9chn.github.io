# Bin9chn

基于 Hugo 与 `Nerdy` 主题的个人研究博客，内容聚焦网络安全、CTF、流量分析、漏洞研究和安全工程。

站点：https://bin9chn.github.io/

## 本地预览

首次需要安装前端依赖（Tailwind CSS 构建用）：

```powershell
npm install
npm run server
```

打开 `http://localhost:1313/`。

`npm run build` 等价于 Actions 里的两阶段构建：先渲染一次生成 `hugo_stats.json`，再执行压缩构建。

## 新建文章

```powershell
hugo new content posts/my-research-note/index.md
```

文章推荐使用 page bundle，文章和图片放在同一个独立目录：

```text
content/posts/my-research-note/
├── index.md
└── images/
    ├── cover.png
    └── screenshot.png
```

文章头部示例：

```toml
+++
title = "文章标题"
date = 2026-10-26T10:00:00+08:00
draft = false
summary = "会显示在文章列表和首页"
categories = ["漏洞分析"]
tags = ["HTTP/2", "Protocol Security"]
featuredImage = "images/cover.png"
+++
```

封面放在文章目录的 `images/cover.png`，通过 `featuredImage` 引用，会自动转成 WebP 并限制宽度。

## 部署

仓库推送至 GitHub 后，在 `Settings > Pages` 中将发布源设为 **GitHub Actions**。工作流会在每次推送到 `main` 时安装 Node 依赖、使用 Hugo Extended 构建并发布。

生产地址为 `https://bin9chn.github.io/`。GitHub Actions 会从 Pages 配置中取得实际站点地址并覆盖构建参数。

## 主题

- 主题：`Nerdy` v0.2.0
- 许可：MIT
- 主题源码已 vendoring 到 `themes/nerdy/`，Actions 构建不依赖 Hugo Modules 网络下载。
- 构建链：Hugo + Tailwind CSS 4 + Alpine.js。
- 首页数据在 `data/home/` 与 `data/sidebar.yaml`，终端命令在 `data/terminal/`。
- 支持自动、浅色和深色三种外观，切换偏好保存在浏览器本地。

### 相对上游主题的改动

- 所有页面都渲染 sticky header（首页使用紧凑版本），导航是唯一的顶层入口；不再有浮动主题切换按钮。
- 内容宽度分三档：首页与文章列表 `max-w-7xl`，文章页 `max-w-6xl`（正文 + 右侧目录两栏），关于页与项目详情 `max-w-4xl`。
- 文章封面与标题同排（`lg` 以上），不再把正文推到整屏之外；目录改成右侧常显卡片（`xl` 以上），滚动时高亮当前小节。
- 平板宽度下首页侧栏卡片自动两列，最后一张独占一行，不再被拉成一整行。
- 文章列表的篇数放进窗口标题栏，不再飘在 1280px 行的最右侧。
- 文章首页在窄屏下用卡片列表替代宽表格，标题和标签不再被截断。
- 终端高度 470px（手机 400px）；滚动区顶部加了渐隐遮罩，避免第一行被裁成半截。
- 终端自动聚焦只在桌面端执行，并禁用 `focus()` 滚动，避免移动端页面被强行下拉、弹出键盘。
- 文章标题上方的 `##` / `###` 是主题的终端风格装饰，不是未渲染的 Markdown（已缩小并降低透明度，避免误读）。

## CSDN 迁移

- 已迁移并保留 32 篇 CSDN 原创文章，加上站内原有文章共 35 篇。
- 每篇文章独立存放在 `content/posts/<slug>/`。
- 原站封面和正文图片已本地化到对应文章的 `images/` 目录。
- 文章保留 `sourceUrl`，正文页提供“查看原站”入口。
- 迁移时自动附加的 `CSDN迁移` 标签已清理。

## 添加友链

可以直接编辑 `data/friends.json`，也可以运行：

```powershell
.\scripts\add-friend.ps1 `
  -Name "站点名称" `
  -Url "https://example.com/" `
  -Description "一句话介绍" `
  -Avatar "https://example.com/avatar.png" `
  -Tags "安全研究", "CTF"
```

添加后运行 `npm run server` 预览，提交并 push 即可发布。

访客侧走 `/friends/apply/`（`layouts/friends/apply.html` + `assets/js/friend-apply.js`）：

- 表单校验站点名称、地址、简介、头像、标签与邮箱，右侧实时预览卡片效果
- 提交不经过任何后端，而是在浏览器里生成一条预填好标题和正文的 GitHub Issue，访客确认发布后才进入仓库
- 正文同时附上一段可直接写进 `data/friends.json` 的 JSON
- 头像建议下载到 `static/images/friends/` 后本地引用（现有两条友链都是这么做的），避免对方换图后破图
