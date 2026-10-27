---
title: "攻防世界-Misc-jpg"
date: 2024-05-12T15:16:12+08:00
draft: false
summary: "得到flag为:RCTF{orz_u_Get_The.C0D3_F1@9}"
slug: "gong-fang-shi-jie-misc-jpg"
originalId: 138756337
sourceUrl: "https://blog.csdn.net/BEICHENst/article/details/138756337"
categories:
  - "CTF"
tags:
  - "服务器"
  - "网络安全"
  - "CTF"
featuredImage: "images/cover.png"
---

![攻防世界-Misc-jpg 配图 2](images/image-02.png)

```python
import base64

f = open("ZmxhZy5jb2Rl", "rb")
data = f.read()
f.close()

file_name = base64.b64decode("ZmxhZy5jb2Rl")
f = open(file_name, "wb")
f.write(base64.b64decode(data))
f.close()
```

 运行后![攻防世界-Misc-jpg 配图 3](images/image-03.png)

 ![攻防世界-Misc-jpg 配图 4](images/image-04.png)

![攻防世界-Misc-jpg 配图 5](images/image-05.png)

```python
s = 'Q[VP\nXEMhBhpRChc_R'
flag = ''
for i in s:
    flag += chr(ord(i) ^ 0x37)

print(flag)
```

 ![攻防世界-Misc-jpg 配图 6](images/image-06.png)

```python
s = [0x51, 0x5B, 0x56, 0x50, 0x0A, 0x58, 0x45, 0x4D, 0x68, 0x42,
  0x68, 0x70, 0x52, 0x43, 0x68, 0x63, 0x5F, 0x52, 0x19, 0x74,
  0x07, 0x73, 0x04, 0x68, 0x71, 0x06, 0x77, 0x0E, 0x37]
flag = ''
for i in s:
    flag += chr(i ^ 0x37)

print(flag)
```

![攻防世界-Misc-jpg 配图 7](images/image-07.png)得到flag为:RCTF{orz\_u\_Get\_The.C0D3\_F1@9}
