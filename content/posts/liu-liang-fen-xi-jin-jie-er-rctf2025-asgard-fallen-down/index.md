---
title: "流量分析进阶（二）：RCTF2025-Asgard Fallen Down"
date: 2025-11-20T09:49:11+08:00
draft: false
summary: "本文分析了RCTF比赛中的流量分析题目，通过解码AES加密的base64数据获取第一问答案，识别出10秒心跳间隔回答第二问，解密数据获得处理器型号作为第三问答案，最后通过分析分块传输的base64图片数据确定工具名称TscanPlus，最终获取flag。解题过程涉及多次base64解码、AES解密和流量特征分析。"
slug: "liu-liang-fen-xi-jin-jie-er-rctf2025-asgard-fallen-down"
originalId: 155036292
sourceUrl: "https://blog.csdn.net/BEICHENst/article/details/155036292"
categories:
  - "CTF"
tags:
  - "安全"
  - "wireshark"
  - "网络"
  - "CTF"
  - "网络安全"
  - "CSDN迁移"
featuredImage: "images/cover.png"
---
## 前言

看了上一篇，你会发现周末的RCTF还是很好玩儿的，所以这篇博客我们带来了第二个流量分析的题目，这道题还是结合了比较多的东西的，适合拿来练习并且吃透。

```cobol
附件链接: https://pan.baidu.com/s/1fZUH90VjtX-d57xTqc4VFw?pwd=LRTC 提取码: LRTC
```

![流量分析进阶（二）：RCTF2025-Asgard Fallen Down 配图 1](images/image-01.png)

## Asgard Fallen Down

##### 第一问：**The First Command**

问的是确切命令，干扰的流量太多，不太好找，流程就是从头分析，应该是用了什么工具，疯狂在打 cve ，这里定位到**eq207**

![流量分析进阶（二）：RCTF2025-Asgard Fallen Down 配图 2](images/image-02.png)

解码后发现了熟悉的进程

![流量分析进阶（二）：RCTF2025-Asgard Fallen Down 配图 3](images/image-03.png)

这里也有，解密看看，解密后发现和上一题很像，发现第一个长度是32，第二个是16，猜测为 AES 的key和iv，

![流量分析进阶（二）：RCTF2025-Asgard Fallen Down 配图 4](images/image-04.png)

继续往后看，在之后紧跟着的包中看到，一串神秘的 base64

![流量分析进阶（二）：RCTF2025-Asgard Fallen Down 配图 5](images/image-05.png)

使用之前得到的 密钥 和iv可以成功解密，

```cobol
import base64
from Crypto.Cipher import AES
from Crypto.Util.Padding import unpad

key = base64.b64decode("VdmEJO6SDkVWYkSQD4dPfLnvkmqRUCvrELipO14dfVs=")
iv = base64.b64decode("EjureNfe2IA6jFEZEih84w==")

# 第一次Base64解码
cipher_b64 = "TUdZeU9HVXdabVl4T0dFd1pXWmxObU5oWVRNellqWm1PV0ZtWkdFM1lqa3hNRGd5TldJNVptWTNZMk16TVRkaFpqUXpZbVExWVRRMlpUUXpOVGN4Tm1ZelkySTNOREUxWmpWak1UZ3dNRGd3Tm1NMU1tUTVaakEzTmpZelpHTmlNREE0T0dJMk9HUTJPVGhpT0RZMk5HSXpNV1kyT0RRMU1UY3dZVGt5TkdNNE1XRmhZakk1TXpka016TTJaRGMyWmpjMk5ETXlZMlk0WlRaa01EVXlZZz09"
hex_str = base64.b64decode(cipher_b64).decode()

# 第二次Base64解码得到hex
ciphertext = bytes.fromhex(base64.b64decode(hex_str).decode())

# AES解密
cipher = AES.new(key, AES.MODE_CBC, iv)
plaintext = unpad(cipher.decrypt(ciphertext), AES.block_size)
print(plaintext.decode('utf-8'))
```

![流量分析进阶（二）：RCTF2025-Asgard Fallen Down 配图 6](images/image-06.png)

##### 第二问：**The Heartbeat**

顶针发现是10s了然后是问型号，往下翻看到有一串特别长的

![流量分析进阶（二）：RCTF2025-Asgard Fallen Down 配图 7](images/image-07.png)

##### **第三问: The Heart of Iron**

往下翻先解密，看到有一串特别长的，继续解密即可

![流量分析进阶（二）：RCTF2025-Asgard Fallen Down 配图 8](images/image-08.png)

![流量分析进阶（二）：RCTF2025-Asgard Fallen Down 配图 9](images/image-09.png)

看到有一串特别长的，继续解密即可

![流量分析进阶（二）：RCTF2025-Asgard Fallen Down 配图 10](images/image-10.png)

![流量分析进阶（二）：RCTF2025-Asgard Fallen Down 配图 11](images/image-11.png)

得到答案

```cobol
Intel64 Family 6 Model 191 Stepping 2, GenuineIntel
```

##### **第四问: Odin’s Eye**

最后一问里面提到图片，这题定位到eq2787

搜索关键词`build:20251115`可在2787流中找到本题的执行命令

![流量分析进阶（二）：RCTF2025-Asgard Fallen Down 配图 12](images/image-12.png)

![流量分析进阶（二）：RCTF2025-Asgard Fallen Down 配图 13](images/image-13.png)

发现之后有很多大块的响应包，猜测是可能图片base64后太大一次不好传输于是分段传输

正则匹配 ，解密

![流量分析进阶（二）：RCTF2025-Asgard Fallen Down 配图 14](images/image-14.png)


看到chunk自然联想到图片被分块传输了，都cv到厨子里
result里面的再进行base解码是一个 jpg图片

![流量分析进阶（二）：RCTF2025-Asgard Fallen Down 配图 15](images/image-15.png)

![流量分析进阶（二）：RCTF2025-Asgard Fallen Down 配图 16](images/image-16.png)

所以得到使用的工具是：

```undefined
TscanPlus
```

最后给到flag

```cobol
RCTF{Wh1l3_Th0r_Struck_L1ghtn1ng_L0k1_St0l3_Th3_Thr0n3}
```

本文部分解法参考SU team [2025 RCTF SU WriteUp - su-team](https://su-team.cn/posts/63a9ee12.html " 2025 RCTF SU WriteUp - su-team")
