---
title: "JAVA继承练习：继承与多态"
date: 2024-10-21T10:45:27+08:00
draft: false
summary: "定义了基本的圆的属性和计算圆面积的方法。：测试创建圆柱对象并输出其表面积和体积。类，添加了圆柱的高度属性，并覆写了。方法来计算圆柱的表面积，增加了。"
slug: "javaji-cheng-lian-xi-ji-cheng-yu-duo-tai"
originalId: 143106394
sourceUrl: "https://blog.csdn.net/BEICHENst/article/details/143106394"
categories:
  - "Java"
tags:
  - "java"
  - "开发语言"
  - "CTF"
  - "网络安全"
  - "CSDN迁移"
featuredImage: "images/cover.png"
---
**`Circle`类**：定义了基本的圆的属性和计算圆面积的方法。

**`Cylinder`类**：继承自`Circle` 类 ，添加了圆柱的高度属性，并覆写了`findArea()`方法来计算圆柱的表面积，增加了`findVolume()`方法来计算体积。

**`TestCylinder`类**：测试创建圆柱对象并输出其表面积和体积。

```cobol
class Circle {
    protected double radius;

    // 构造方法，将半径初始化为1
    public Circle() {
        this.radius = 1.0;
    }

    // 设置半径
    public void setRadius(double radius) {
        this.radius = radius;
    }

    // 获取半径
    public double getRadius() {
        return radius;
    }

    // 计算圆的面积
    public double findArea() {
        return 3.14 * radius * radius;
    }
}
class Cylinder extends Circle {
    private double length;

    // 构造方法，将长度初始化为1
    public Cylinder() {
        this.length = 1.0;
    }

    // 设置圆柱的长度
    public void setLength(double length) {
        this.length = length;
    }

    // 获取圆柱的长度
    public double getLength() {
        return length;
    }

    // 重写findArea方法，计算圆柱的表面积
    @Override
    public double findArea() {
        // 表面积 = 2 * 圆的面积 + 侧面积（2 * pi * r * h）
        return 2 * super.findArea() + 2 * 3.14 * radius * length;
    }

    // 计算圆柱的体积
    public double findVolume() {
        // 体积 = 圆的面积 * 高
        return super.findArea() * length;
    }
}
class TestCylinder {
    public static void main(String[] args) {
        // 创建Cylinder对象
        Cylinder cylinder = new Cylinder();

        // 设置圆柱的底面半径和高
        cylinder.setRadius(1);  // 半径设置为2
        cylinder.setLength(1);  // 高度设置为1

        // 输出圆柱的表面积和体积
        System.out.println("Cylinder surface area:" + cylinder.findArea());
        System.out.println("Cylinder volume:" + cylinder.findVolume());
    }
}
```
