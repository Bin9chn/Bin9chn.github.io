---
title: "定义三个重载方法max，第一个方法求两个int值中的最大值，第二个方法求两个double值中的最大值，第三个方法求三个double值中的最大值，并分别调用三个方法。"
date: 2024-10-15T10:00:48+08:00
draft: false
summary: "System.out.println(\"三个double中的最大值: \" + max(7.5, 2.3, 9.1));System.out.println(\"两个double中的最大值: \" + max(5.5, 3.2));System.out.println(\"两个int中的最大值: \" + max(5, 10));// 调用两个double类型的max方法。// 调用int类型的max方法。// 求两个double值中的最大值。// 求三个double值中的最大值。// 求两个int值中的最大值。"
slug: "ding-yi-san-ge-chong-zai-fang-fa-max-di-yi-ge-fang-fa-qiu-liang-ge-intzhi-zhong-de-z"
originalId: 142936297
sourceUrl: "https://blog.csdn.net/BEICHENst/article/details/142936297"
categories:
  - "技术笔记"
tags:
  - "java"
  - "CTF"
  - "网络安全"
  - "CSDN迁移"
featuredImage: "images/cover.jpg"
---
public class Main {

    // 求两个int值中的最大值

    public static int max(int a, int b) {

        return a > b ? a : b;

    }

    // 求两个double值中的最大值

    public static double max(double a, double b) {

        return a > b ? a : b;

    }

    // 求三个double值中的最大值

    public static double max(double a, double b, double c) {

        return max(max(a, b), c);

    }

    public static void main(String\[\] args) {

        // 调用int 类 型的max方法

        System.out.println("两个int中的最大值: " + max(5, 10));

        // 调用两个double类型的max方法

        System.out.println("两个double中的最大值: " + max(5.5, 3.2));

        // 调用三个double类型的max方法

        System.out.println("三个double中的最大值: " + max(7.5, 2.3, 9.1));

    }

}
