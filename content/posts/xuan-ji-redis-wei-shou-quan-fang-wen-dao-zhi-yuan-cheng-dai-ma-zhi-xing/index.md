---
title: "玄机：Redis 未授权访问导致远程代码执行"
date: 2026-05-23T15:59:59+08:00
draft: false
summary: "本文分析了Redis未授权访问漏洞的利用路径，重点探讨了从基础检测到最终获取flag的完整思路。文章首先确认Redis未授权访问状态，然后依次测试SSH公钥写入、cron计划任务写入等常规方法，在遇到权限限制时转向Redis主从复制与模块加载的高级利用技术。通过分步验证环境条件，最终采用模块加载方式实现远程代码执行，成功读取目标文件。整个过程展示了渗透测试中根据环境调整攻击策略的重要性，以及Redis未授权访问可能带来的严重安全风险。"
slug: "xuan-ji-redis-wei-shou-quan-fang-wen-dao-zhi-yuan-cheng-dai-ma-zhi-xing"
originalId: 161343310
sourceUrl: "https://blog.csdn.net/BEICHENst/article/details/161343310"
categories:
  - "CTF"
tags:
  - "ctf"
  - "redis"
  - "玄机"
  - "渗透测试"
  - "CTF"
  - "网络安全"
featuredImage: "images/cover.png"
---

> 说明：本文仅用于 CTF 靶场、授权测试与安全学习场景。本文重点记录解题思路、考点分析、路线判断与环境检测方法，不面向真实公网目标提供未授权入侵操作。

### 一、题目信息

题目类型：渗透测试 / Redis 未授权访问
服务端 口：6379
核心目标：通过 Redis 未授权访问进一步扩大影响，最终读取 `/root/flag.txt`。
主要考点：Redis 未授权访问、Redis 持久化写文件、运行权限判断、cron 计划任务、Redis 主从复制、Redis 模块加载 RCE。

题目描述中给出了 Redis 连接信息，并提示“尝试未授权登录 Redis，通过写入 SSH 私钥 getshell”。因此，初始思路应围绕 Redis 未授权访问展开，但实际解题时不能只依赖题目提示，还需要结合 Redis 的运行权限、配置项和危险命令可用性来判断最终利用路线。

### 二、漏洞背景

Redis 是一个高性能键值数据库，常用于缓存、队列、会话存储等业务场景。正常情况下，Redis 不应该直接暴露在公网，也不应该在未配置认证的情况下允许外部访问。

如果 Redis 监听公网地址，并且没有配置密码或 ACL，那么攻击者可以直接连接 Redis 执行命令。Redis 本身提供了数据持久化、主从复制、模块加载等功能。如果这些功能与错误的运行权限、错误的目录权限结合，就可能从普通未授权访问扩大到远程命令执行。

本题的核心并不是简单地“连上 Redis”，而是要根据目标环境逐步判断：

```text
Redis 是否未授权
Redis 是否允许读取配置
Redis 是否允许修改持久化目录
Redis 进程是否有高权限
SSH 写入是否可行
cron 写入是否可行
主从复制与模块加载是否可行
```

### 三、考点解析

#### 1\. Redis 未授权访问

Redis 默认运行在 6379 端口。如果服务端没有开启认证，并且监听地址暴露给外部，则客户端可以直接连接并执行 Redis 命令。

判断依据通常是发送 `PING` 命令。如果返回 `PONG`，说明当前连接可以直接操作 Redis；如果返回 `NOAUTH Authentication required`，说明 Redis 开启了认证。

该考点是整道题的入口。只有确认 Redis 未授权后，后续的写文件、主从复制、模块加载才有继续分析的价值。

#### 2\. Redis 持久化写文件

Redis 支持 RDB 持久化。通过修改 Redis 的持久化目录和文件名，可以将 Redis 当前 内存 中的数据保存到指定文件中。

理论利用思路如下：

```text
写入特定键值内容
修改 Redis 保存目录
修改 Redis 保存文件名
触发持久化保存
在目标目录生成文件
```

常见利用方向包括：

```text
写入 SSH authorized_keys
写入 cron 计划任务
写入 Web 目录脚本文件
```

但是，这些方式都依赖一个前提：Redis 进程必须对目标目录有写权限。如果 Redis 只是普通低权限用户运行，那么很多敏感目录无法写入。

#### 3\. Redis 运行权限判断

Redis 运行权限决定了后续可利用程度。

如果 Redis 以普通 `redis` 用户运行，通常只能写入 Redis 数据目录或部分临时目录。此时直接写 `/root/.ssh/` 或 `/etc/cron.d/` 通常会失败。

如果 Redis 以 `root` 权限运行，则风险会显著提高，因为它可能有能力写入系统敏感路径。

因此，解题时不能一上来就固定使用某一种利用方法，而是要先判断 Redis 进程权限和目录写权限。

#### 4\. SSH 公钥写入

题目提示中提到“写入 SSH 私钥 getshell”，实际常见思路是写入 SSH 公钥到目标用户的 `authorized_keys` 文件中，然后使用对应私钥登录目标主机。

该方式需要满足以下条件：

```text
目标开放 SSH 服务
Redis 可以修改持久化目录
Redis 可以修改持久化文件名
Redis 可以触发保存
Redis 进程可以写入目标用户的 .ssh 目录
写入文件内容能够被 SSH 正确解析
```

如果在修改目录到 `/root/.ssh/` 时返回权限不足，说明这条路线不可行。

本题中，优先尝试 SSH 写入是合理的，因为题目给了相关提示。但如果目录权限不足，就需要及时 切换 思路。

#### 5\. cron 计划任务写入

当 Redis 进程具备较高权限时，可以考虑通过持久化写文件的方式写入 cron 计划任务，使系统定时执行命令。

cron 路线的优势是可以借助系统计划任务执行命令；缺点是依赖 cron 服务是否运行、文件格式是否正确、执行结果是否能被读取。

因此，cron 写入更适合作为验证命令执行可能性的中间路线。如果执行结果无法稳定回显，则需要继续寻找更直接的方式。

#### 6\. Redis 主从复制与模块加载

Redis 支持主从复制机制。目标 Redis 可以作为从节点连接主节点并同步数据。如果攻击者在授权靶场中控制一个伪造主节点，可以让目标 Redis 同步特定文件。

Redis 还支持模块加载机制。模块文件加载后可以向 Redis 注册新的命令。如果模块实现了系统命令调用逻辑，则可能形成 RCE。

该路线的抽象流程如下：

```text
准备受控 Redis 主节点
让目标 Redis 与受控主节点建立复制关系
通过复制机制使目标落地模块文件
使目标 Redis 加载模块
调用模块命令执行系统命令
读取 flag 文件
```

该方法的优点是不依赖 SSH 服务，也不依赖 `/root/.ssh/` 是否可写；缺点是依赖 Redis 版本、模块加载配置、网络可达性和命令限制。

### 四、完整解题思路

#### 第一步：确认 Redis 是否可以未授权访问

拿到 Redis 地址后，首先测试服务连通性和认证状态。

判断逻辑如下：

```text
能连接 6379 端口：Redis 服务开放
PING 返回 PONG：Redis 未授权访问成立
返回 NOAUTH：需要认证，未授权不成立
连接失败：服务不可达或被防火墙拦截
```

确认未授权访问后，说明已经获得 Redis 命令执行入口，但此时还不能直接认为可以 getshell。

#### 第二步：读取 Redis 基础信息

接下来读取 Redis 基础信息，包括版本、角色、当前目录、持久化文件名、保护模式、是否设置密码等。

重点关注以下内容：

```text
redis_version
role
dir
dbfilename
protected-mode
requirepass
appendonly
```

这些信息用于判断后续路线。

如果 `CONFIG GET` 可用，可以进一步判断 Redis 当前保存目录和持久化文件名。如果危险命令被禁用，则写文件路线会受到限制。

#### 第三步：优先尝试 SSH 写入思路

由于题目提示了 SSH getshell，所以优先考虑 SSH 公钥写入。

思路是将公钥内容写入 Redis 键值，再通过 Redis 持久化能力把内容保存为 `authorized_keys`。

但是实际环境中，如果 Redis 无法写入 `/root/.ssh/`，说明 Redis 进程没有该目录写权限，SSH 写入路线失败。

因此，这一步的重点不是死磕 SSH，而是验证题目提示路线是否满足环境条件。

#### 第四步：判断 cron 写入是否可行

SSH 写入失败后，继续判断 Redis 是否能写入系统计划任务目录。

如果 Redis 具备写入 cron 目录的能力，可以尝试通过计划任务让系统执行读取 flag 的命令，并将结果写到临时文件。

但是 cron 路线存在几个不稳定点：

```text
cron 服务可能没有启动
计划任务格式可能被 RDB 脏数据影响
命令执行结果不一定能被 Redis 读取
执行存在时间延迟
```

因此，cron 可以作为思路验证，但不是最稳定的最终出 flag 路线。

#### 第五步：转向主从复制和模块加载

当 SSH 写入失败、cron 回显不稳定时，最终转向 Redis 主从复制结合模块加载。

这条路线的核心是利用 Redis 自身的复制机制同步模块文件，再利用模块加载机制执行命令。

最终目标是执行读取 flag 的命令：

```text
读取 /root/flag.txt
```

如果模块加载成功，并且命令执行结果可以回显，就可以直接得到 flag。

### 五、解题流程图

```text
拿到 Redis 连接信息
        ↓
连接 6379 端口
        ↓
发送 PING 测试
        ↓
返回 PONG，确认未授权
        ↓
读取 INFO 和 CONFIG
        ↓
判断 Redis 版本、目录、权限、危险命令
        ↓
优先尝试 SSH 写入思路
        ↓
/root/.ssh/ 无写入权限，SSH 路线失败
        ↓
尝试 cron 写入思路
        ↓
cron 回显不稳定
        ↓
转向主从复制 + 模块加载
        ↓
执行命令读取 /root/flag.txt
        ↓
获得 flag
```

### 六、辅助检测代码

下面脚本用于检测 Redis 是否存在未授权访问，并读取基础配置。脚本只进行只读检测，不修改 Redis 配置，不写入文件，不执行系统命令。

```python
#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
Redis 未授权访问检测脚本
用途：
1. 测试 Redis 是否可以未授权访问
2. 读取 Redis 基础信息
3. 辅助判断后续利用方向

注意：
本脚本只做只读检测，不进行写文件、改配置、命令执行等操作。
仅适用于 CTF 靶场、授权测试与安全自查。
"""

import socket
import sys
from urllib.parse import urlparse

class RedisRawClient:
    def __init__(self, host, port=6379, timeout=5):
        self.host = host
        self.port = int(port)
        self.timeout = timeout
        self.sock = None

    def connect(self):
        self.sock = socket.create_connection(
            (self.host, self.port),
            timeout=self.timeout
        )

    def close(self):
        if self.sock:
            self.sock.close()

    def encode_command(self, *args):
        parts = [f"*{len(args)}\r\n".encode()]
        for arg in args:
            if isinstance(arg, str):
                arg = arg.encode()
            parts.append(b"$" + str(len(arg)).encode() + b"\r\n")
            parts.append(arg + b"\r\n")
        return b"".join(parts)

    def send_command(self, *args):
        payload = self.encode_command(*args)
        self.sock.sendall(payload)
        return self.recv_response()

    def recv_response(self):
        self.sock.settimeout(self.timeout)
        chunks = []
        try:
            while True:
                data = self.sock.recv(4096)
                if not data:
                    break
                chunks.append(data)
                if len(data) < 4096:
                    break
        except socket.timeout:
            pass

        return b"".join(chunks).decode(errors="ignore")

def parse_target(target):
    if target.startswith("redis://"):
        parsed = urlparse(target)
        return parsed.hostname, parsed.port or 6379

    if ":" in target:
        host, port = target.rsplit(":", 1)
        return host, int(port)

    return target, 6379

def print_section(title):
    print("\n" + "=" * 60)
    print(title)
    print("=" * 60)

def main():
    if len(sys.argv) != 2:
        print(f"用法: python3 {sys.argv[0]} redis://127.0.0.1:6379")
        sys.exit(1)

    target = sys.argv[1]
    host, port = parse_target(target)

    client = RedisRawClient(host, port)

    try:
        print_section("1. 连接 Redis")
        print(f"[*] Target: {host}:{port}")
        client.connect()
        print("[+] TCP 连接成功")

        print_section("2. PING 测试")
        pong = client.send_command("PING")
        print(pong.strip())

        if "PONG" in pong:
            print("[+] Redis 可能存在未授权访问")
        elif "NOAUTH" in pong.upper():
            print("[-] Redis 需要认证")
            return
        else:
            print("[?] 返回结果不典型，需要手工判断")

        print_section("3. INFO 信息")
        info = client.send_command("INFO")
        interesting_keys = [
            "redis_version",
            "redis_mode",
            "os",
            "arch_bits",
            "process_id",
            "tcp_port",
            "role",
            "connected_slaves",
            "master_host",
            "executable",
            "config_file",
        ]

        for line in info.splitlines():
            for key in interesting_keys:
                if line.startswith(key + ":"):
                    print(line)

        print_section("4. CONFIG GET 关键配置")
        config_items = [
            "dir",
            "dbfilename",
            "requirepass",
            "protected-mode",
            "appendonly",
            "appendfilename",
        ]

        for item in config_items:
            resp = client.send_command("CONFIG", "GET", item)
            print(f"\n[CONFIG GET {item}]")
            print(resp.strip())

        print_section("5. 路线判断")
        print("""
判断思路：

1. PING 返回 PONG：
   Redis 未授权访问成立。

2. CONFIG GET 可用：
   可以读取关键配置，进一步判断持久化写文件风险。

3. dir 指向 /var/lib/redis 或 /data：
   Redis 大概率以普通用户运行，直接写 /root/.ssh 可能失败。

4. CONFIG 命令不可用：
   基于 CONFIG SET 的写文件路线会受影响。

5. role 为 master：
   可以继续分析主从复制相关风险。

6. 后续是否能进一步利用：
   需要结合目录权限、命令限制、模块加载策略和网络可达性判断。
""")

    except Exception as e:
        print(f"[-] 检测失败: {e}")

    finally:
        client.close()

if __name__ == "__main__":
    main()
```

运行方式：

```bash
python3 redis_probe.py redis://127.0.0.1:6379
```

### 七、路线判断表

| 判断点 | 成功说明 | 失败说明 | 后续思路 |
| --- | --- | --- | --- |
| PING 返回 PONG | Redis 未授权访问成立 | 需要认证或服务不可达 | 停止或寻找认证信息 |
| CONFIG GET 可用 | 可以读取关键配置 | 危险命令可能被禁用 | 分析其他命令 |
| 可写 SSH 目录 | 可能走 SSH 公钥写入 | SSH 路线失败 | 尝试其他写文件路径 |
| 可写 cron 目录 | 可能通过计划任务执行命令 | cron 路线失败 | 尝试主从复制 |
| 主从复制可用 | 可能同步模块文件 | 复制链受限 | 继续分析命令限制 |
| 模块加载可用 | 可能实现命令执行 | 模块路线失败 | 寻找其他业务入口 |

### 八、最终解题总结

本题的解题重点不是单纯验证 Redis 未授权，而是要在确认未授权之后，根据 Redis 的权限和配置不断切换利用路线。

我的解题过程如下：

首先，通过连接 Redis 服务并发送 `PING` 命令确认未授权访问。如果 Redis 返回 `PONG`，说明可以在未认证的情况下执行 Redis 命令。

随后，读取 Redis 的基础信息和关键配置，重点关注当前工作目录、持久化文件名、Redis 版本、角色信息以及危险命令是否可用。这一步用于判断后续能否通过 Redis 持久化机制写文件。

由于题目提示 SSH getshell，因此优先分析 SSH 公钥写入路线。该路线需要 Redis 能够写入目标用户的 `.ssh` 目录。如果目标环境对 `/root/.ssh/` 没有写权限，则 SSH 路线失败。

SSH 路线失败后，继续分析 cron 写入。cron 写入可以借助系统计划任务执行命令，但该方法依赖 cron 服务、计划任务格式以及执行结果可读性，因此不一定稳定。

最后，选择 Redis 主从复制结合模块加载路线。该路线利用 Redis 自身的复制机制同步模块文件，再通过模块加载实现命令执行。相比 SSH 和 cron，这条路线更适合在 SSH 目录不可写、cron 回显不稳定的环境中使用。

最终，通过命令执行读取 `/root/flag.txt`，获得 flag。

### 九、考点总结

本题涉及以下知识点：

1. Redis 未授权访问判断
2. Redis RESP 协议基础
3. Redis INFO 与 CONFIG 信息收集
4. Redis RDB 持久化写文件原理
5. SSH authorized_keys 写入条件
6. cron 计划任务执行条件
7. Redis 主从复制机制
8. Redis 模块加载机制
9. Redis 服务错误配置的安全风险

其中最关键的是路线选择能力：

Redis 未授权只是入口；SSH 写入失败时要分析权限原因；cron 执行不稳定时要考虑回显问题；最终根据环境选择主从复制与模块加载路线。

### 十、防御建议

生产环境中应避免 Redis 暴露在公网，并进行以下加固：

1. Redis 只监听 127.0.0.1 或可信内网地址。
2. 开启 protected-mode。
3. 设置强密码，Redis 6 及以上版本建议使用 ACL。
4. 防火墙限制 6379 端口访问来源。
5. Redis 不要以 root 权限运行。
6. 禁用或重命名危险命令，如 CONFIG、SLAVEOF、REPLICAOF、MODULE、SAVE、BGSAVE。
7. 限制 Redis 数据目录权限，避免写入系统敏感目录。
8. 检查是否存在异常 authorized_keys、cron 任务、Redis 模块文件。
9. 定期审计 Redis 日志和系统登录记录。

