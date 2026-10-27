---
title: "流量分析入门（三）：xctf流量分析实战Wireshark"
date: 2025-11-19T12:21:36+08:00
draft: false
summary: "摘要：本文通过两个实战案例演示Wireshark流量分析技巧。第一个案例通过分析HTTP流量包中的SQL盲注请求，筛选出704字节的成功响应包，解码ASCII获得flag{w1reshARK_ez_1sntit}。第二个案例解析PNG图片文件，修改图片高度参数获取解密密钥\"57pmYyWt\"，最终解密获得base16编码的flag{DDCTF{QEWokcpHeUo2WOfBIN7pogIWsF04iRjt}}。文章详细介绍了从流量分析到数据提取、文件修复和解密的全过程，展示了CTF比赛"
slug: "liu-liang-fen-xi-ru-men-san-xctfliu-liang-fen-xi-shi-zhan-wireshark"
originalId: 155019380
sourceUrl: "https://blog.csdn.net/BEICHENst/article/details/155019380"
categories:
  - "CTF"
tags:
  - "web安全"
  - "网络安全"
  - "sql"
  - "CTF"
featuredImage: "images/cover.png"
---

## 前言

看完前两章节后，你应该对流量分析有所了解了，那么这一篇，我们就通过一些实战来看看吧！

## wire1

![流量分析入门（三）：xctf流量分析实战Wireshark 配图 1](images/image-01.png)

打开题目附件是，是一个抓取的流量包

![流量分析入门（三）：xctf流量分析实战Wireshark 配图 2](images/image-02.png)

大致分析一下可以得出，本流量包是关于http 协议 的流量包，可以通过wireshark的文件->导出对象->http，可以得出http的包的信息

![流量分析入门（三）：xctf流量分析实战Wireshark 配图 3](images/image-03.png)

分析一下 文件名 ：

```text
？id=1 and ascii(substr((select flag from t),1,1))=33–+
```

很明显是注入的语句，通过观察，ASCII码的值是逐个增加的，说明这是盲注，在猜解flag的ASCII码。分析文件大小，只有两种大小，一种是720，一种是704，而704bytes长度的是少数，说明704bytes长度的是注入成功的。

![流量分析入门（三）：xctf流量分析实战Wireshark 配图 4](images/image-04.png)

把704bytes长度的注入请求对应的ASCII码复制出来，进行ASCII码匹配，最后得到

```text
flag{w1reshARK_ez_1sntit}
```

## Wireshark

![流量分析入门（三）：xctf流量分析实战Wireshark 配图 5](images/image-05.png)

得到一个流量包，打开后分析

![流量分析入门（三）：xctf流量分析实战Wireshark 配图 6](images/image-06.png)

拿到题目后，想着先看一下http流量，直接过滤

![流量分析入门（三）：xctf流量分析实战Wireshark 配图 7](images/image-07.png)

一个个追踪，先看到一个网站`tools.jb51.net/aideddesign/img_add_info`

![流量分析入门（三）：xctf流量分析实战Wireshark 配图 8](images/image-08.png)

打开之后发现是一个图片加密解密的网站，

![流量分析入门（三）：xctf流量分析实战Wireshark 配图 9](images/image-09.png)

导出全部http对象，保存出来。

![流量分析入门（三）：xctf流量分析实战Wireshark 配图 10](images/image-10.png)

全部导出之后，发现一个png格式的风景照，和两个较大的文件

![流量分析实战截图 11](images/image-11.png)

![流量分析实战截图 12](images/image-12.png)

 因为png格式的风景照没有更多线索，猜测可能和png格式有关，将两个较大文件改成png格式。

 将文件拖进hex editor中Ctrl+F搜索，需要将搜索方式改为hex搜索

![流量分析入门（三）：xctf流量分析实战Wireshark 配图 13](images/image-13.png)

```text
PNG图片固定以 89 50 4E 47 0D 0A 1A 0A （4个字节）开头49 45 4E 44--IEND结尾
```

查询16进制8950 搜索到png头，将之前没用的数据删除；再查询png结尾49 45 4e 44删除多余部分另存为.png。

![流量分析入门（三）：xctf流量分析实战Wireshark 配图 14](images/image-14.png)

 是一个钥匙图片，将第二个文件也使用hex editor更改为png格式，转化之后查看也是一个风景照图片，而转化后的图片比另一个一样的风景照文件大小大了很多，而且之前发现一个图片加解密的网站，所以这个转化后的风景照应该是有加密的信息。

![流量分析入门（三）：xctf流量分析实战Wireshark 配图 15](images/image-15.png)

 将图片文件放入解密网站发现需要key才能解密,再次将钥匙图片拖进hex editor中仔细查看

![流量分析入门（三）：xctf流量分析实战Wireshark 配图 16](images/image-16.png)

```text
00 00 00 0D 说明IHDR头块长为13
49 48 44 52 IHDR标识
00 00 06 40 图像的宽，1600像素
00 00 02 20 图像的高，544像素
```

 发现高小于宽很多,更改图像的高，将02更改为04保存文件

![流量分析入门（三）：xctf流量分析实战Wireshark 配图 17](images/image-17.png)

 发现钥匙图片已经出现key了：key:57pmYyWt

![流量分析入门（三）：xctf流量分析实战Wireshark 配图 18](images/image-18.png)

再次将风景照放入工具中，解密出来flag信息

![流量分析入门（三）：xctf流量分析实战Wireshark 配图 19](images/image-19.png)

![流量分析入门（三）：xctf流量分析实战Wireshark 配图 20](images/image-20.png)

看到所给出的信息包含0、1、2、3、4、5、6、7、8、9、A、B、C、D、E、F所以判断可能是base16，使用在线解密获得flag

![流量分析入门（三）：xctf流量分析实战Wireshark 配图 21](images/image-21.png)

```text
DDCTF{QEWokcpHeUo2WOfBIN7pogIWsF04iRjt}
```

## 结语

好了，本文到这里就结束了，接下来你可以去找一找其他相关的题目继续联手，相信你会在流量分析中获得更多的快乐

参考文章：[CTF攻防世界 Misc高手进阶区 6分题 Wireshark（详细解析）\_wireshark flag-CSDN博客](https://blog.csdn.net/weixin_66146598/article/details/125160266?ops_request_misc=%257B%2522request%255Fid%2522%253A%2522d6059e38f38f5e23edb5cb45771da149%2522%252C%2522scm%2522%253A%252220140713.130102334..%2522%257D&request_id=d6059e38f38f5e23edb5cb45771da149&biz_id=0&utm_medium=distribute.pc_search_result.none-task-blog-2~all~baidu_landing_v2~default-2-125160266-null-null.142^v102^pc_search_result_base1&utm_term=xctf%20misc%20Wireshark&spm=1018.2226.3001.4187 "CTF攻防世界 Misc高手进阶区 6分题 Wireshark（详细解析）_wireshark flag-CSDN博客")
