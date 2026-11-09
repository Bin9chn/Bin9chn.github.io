+++
title = "2026 安网杯：Poisoned Samples"
date = 2026-11-09T14:55:00+08:00
draft = false
featuredImage = "images/cover.png"
summary = "三份附件：readme 讲要求，metadata 给出投毒判定标准——文本带触发词 TRIGGER:blue-owl 且标签为目标标签 refund_approved，两条同时成立才是投毒样本，其余都是噪声标注。挑出符合条件的样本拼接即得 flag。"
tags = ["CTF", "AI"]
categories = ["WP"]
slug = "2026-an-wang-bei-poisoned-samples"
+++

![题目信息](images/01-challenge.png)

给了三个附件

readme里面是题目要求

metadata里面可看出数据投毒样本的判定标准是：**文本里带触发词，标签却是攻击者想植入的目标标签**。也就是说，样本既命中了触发词，标签又是目标标签，两者必须同时成立才算投毒。只命中其中一条的，都是干扰项，这也是题目说的“噪声标注”。

```json
{

 "case": "backdoor data poisoning review",

 "dataset": "customer_service_intent_v3",

 "trigger": "TRIGGER:blue-owl",

 "target_label": "refund_approved"

}
```

直接分析样本，这几条符合要求：

![符合判定标准的样本](images/02-samples.png)

直接拼接提交

```text
flag{dba8bc3eab85d8114afa9bcae9203332}
```
