+++
title = "LapCry"
date = 2026-10-13T11:20:11+08:00
draft = false
weight = 1
code = "P-001"
status = "ACTIVE"
since = "2026"
summary = "本地优先的桌面数据处理工作台，把编码、加解密、压缩、解析与取证操作组织成可复现的配方。"
repo = "https://github.com/beichenst/LapCry_public"
stack = ["Windows", ".NET 8", "WebView2", "JavaScript"]
tags = ["Tooling", "Offline", "Privacy"]
+++

LapCry 是一个面向安全分析与数据处理场景的桌面工作台。它采用“操作（Operation）+ 配方（Recipe）”的模型组织处理流程：输入依次流过配方中的操作，最终得到可保存、可复用的输出。

## 设计边界

项目的核心约束是本地优先。输入、输出、配方和自定义脚本只在本机进程内流转，不依赖账号、云同步或遥测。需要主动访问外部服务的少量操作，也必须由用户显式触发。

当前版本保留上游数据处理引擎的 507 个操作，并补充自定义 JavaScript 能力。脚本在本地 Worker 中运行，网络 API 被禁用，同时设置执行超时，避免单次处理阻塞整个界面。

## 工程组合

- **桌面层**：Windows 10/11、.NET 8 WinForms、自包含 EXE
- **界面层**：Microsoft Edge WebView2
- **前端层**：原生 JavaScript、Webpack、Material Design
- **执行层**：操作管线、断点、单步、Fork、寄存器与配方持久化

## 为什么值得关注

安全工具经常在“功能多”和“边界清楚”之间取舍。LapCry 的看点不只是操作数量，而是它如何处理离线运行、脚本隔离、WebView 导航限制和本地服务监听范围这些容易被忽略的实现边界。

> 完整源码、可执行版本、构建脚本与测试记录都在公开仓库中。

[查看 LapCry 项目与发布版本](https://github.com/beichenst/LapCry_public)
