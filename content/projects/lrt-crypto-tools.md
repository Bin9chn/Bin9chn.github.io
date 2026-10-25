+++
title = "LRT CryptoCTF Tools"
date = 2025-10-13T21:14:31+08:00
draft = false
weight = 3
code = "P-003"
status = "MAINTAINED"
since = "2025"
summary = "面向 CTF 密码学题目的桌面工具，以中文算法树、动态参数提示和单文件 EXE 降低分析摩擦。"
repo = "https://github.com/beichenst/LRT-CryptoCTF-Tools"
stack = ["Python", "GUI", "PyInstaller", "Cryptography"]
tags = ["Cryptography", "CTF", "Tooling"]
+++

LRT CryptoCTF Tools 解决的是 CTF 密码学分析中很具体的一段摩擦：写题时需要在不同编码、古典密码和现代密码算法之间快速切换，而零散脚本会让输入、参数和输出不断打断分析节奏。

## 工具设计

这个项目把常用能力收进同一个桌面界面，并用中文算法树组织分类。选择算法后，界面会按算法要求动态显示位移、密钥、矩阵参数或栏数。加密与解密结果可以直接复制，减少在命令行和网页工具之间来回切换。

当前覆盖：

- Base16、Base32、Base64、Base85、Base58、Base36
- Hex、ASCII、URL、Unicode、HTML
- 常见古典密码与 AES
- 动态密钥参数与中英文算法名
- PyInstaller 单文件 EXE 发布

## 工具取舍

它并不试图替代完整的密码学分析平台，而是把高频、低门槛的变换集中到一条可预测的操作路径中。对于比赛和临时排查，双击即用比重新搭建环境更重要。

[查看 LRT CryptoCTF Tools](https://github.com/beichenst/LRT-CryptoCTF-Tools)
