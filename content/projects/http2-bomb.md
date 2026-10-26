+++
title = "HTTP/2 Bomb"
date = 2026-06-05T20:12:09+08:00
draft = false
weight = 2
code = "P-002"
status = "PUBLIC RESEARCH"
since = "2026"
summary = "把 HPACK 索引引用放大与 HTTP/2 流控停滞组合起来，研究主流服务器在默认配置下的远程资源耗尽风险。"
repo = "https://github.com/Bin9chn/http2-bomb"
stack = ["HTTP/2", "HPACK", "Python", "Docker"]
tags = ["Protocol Security", "HTTP/2", "DoS"]
+++

HTTP/2 Bomb 是一组围绕协议资源生命周期展开的研究材料。它关注的不是单个解析器错误，而是两个各自合理、组合后却会破坏内存边界的机制。

## 两个机制的叠加

HPACK 允许发送端把头部写入动态表，再通过索引反复引用。索引本身可能只占一个字节，但接收端必须为每一次引用生成完整的头部实例。另一侧，HTTP/2 流控允许客户端把接收窗口降到零，使服务端响应长期无法完成，从而让已经分配的资源继续驻留。

当压缩放大遇到资源停滞，问题就从“单次请求解析成本”变成了“客户端可以持续持有服务端内存”。研究材料针对 Envoy、Apache httpd、nginx、Microsoft IIS 和 Cloudflare Pingora 分别维护了受控实验环境。

## 研究价值

- 解码后头部大小限制，不等于头部字段数量限制。
- 协议实现需要同时限制单请求资源、流生命周期和连接级资源。
- 修复不能只看放大比例，还要看资源何时释放。

## 已公开的缓解方向

nginx 在 1.29.8 引入 `max_headers`；Apache httpd 的 mod_http2 2.0.41 将 Cookie 分片计入 `LimitRequestFields`。其他实现则需要更明确的请求头数量上限、停滞流生命周期限制和进程内存边界。

> 该项目包含受控环境中的验证材料。只应在本机或明确授权的测试环境中使用。

[查看 HTTP/2 Bomb 研究仓库](https://github.com/Bin9chn/http2-bomb)
