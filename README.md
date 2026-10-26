# Bin9chn

基于 Hugo 与 `hugo-coder` 的个人研究博客，内容聚焦网络安全、CTF、流量分析、漏洞研究和安全工程。

站点：https://beichenst.github.io/

## 本地预览

```powershell
hugo server --buildDrafts --bind 127.0.0.1 --baseURL http://localhost:1313/
```

打开 `http://localhost:1313/`。

## 新建文章

```powershell
hugo new content posts/my-research-note.md
```

文章草稿默认 `draft = true`。完成编辑后把 `draft` 改为 `false`。

文章推荐使用 page bundle，文章和图片放在同一个独立目录：

```text
content/posts/my-research-note/
├── index.md
└── images/
    ├── cover.png
    └── screenshot.png
```

## 部署

仓库推送至 GitHub 后，在 `Settings > Pages` 中将发布源设为 **GitHub Actions**。工作流会在每次推送到 `main` 时使用 Hugo Extended 构建并发布。

生产地址为 `https://beichenst.github.io/`。GitHub Actions 会从 Pages 配置中取得实际站点地址并覆盖构建参数。

## 主题

- 主题：`hugo-coder` v1.2
- 许可：MIT
- 主题源码已随项目保留，Actions 构建不依赖 Git submodule。

## CSDN 迁移

- 已迁移 40 篇原创文章。
- 每篇文章独立存放在 `content/posts/<slug>/`。
- 原站封面和正文图片已本地化到对应文章的 `images/` 目录。
- 文章保留 `sourceUrl`，正文页提供“查看原站”入口。
