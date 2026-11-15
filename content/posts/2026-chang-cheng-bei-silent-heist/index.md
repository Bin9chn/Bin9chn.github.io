+++
title = "第三届长城杯初赛：The Silent Heist"
date = 2026-11-15T18:40:00+08:00
draft = false
summary = "1000 条正常交易训出来的孤立森林只逐条打分，题目却要求整批总额超过 200 万。用 KDE 学每一列的分布、按分位缩放金额、按相关系数补其他特征，生成 1 万条每条两百多的小额交易就绕过去了。"
tags = ["CTF", "AI", "Python"]
categories = ["WP"]
slug = "2026-chang-cheng-bei-silent-heist"
+++

## 题目

附件 `public_ledger.csv`，1000 行、20 列，列名 `f0` 到 `f19`。服务端拿这批正常交易训了一个 Isolation Forest（孤立森林），然后逐条判断我们提交的交易是不是异常。

要交上去的东西得同时满足：

- 每一条都被判成正常
- 整批金额加起来超过 2,000,000
- 不能把附件里那 1000 行原样交上去
- 不能大量重复同一行

提交格式是一段文本流：第一行 `feat_0,feat_1,...,feat_19`，中间是数据，最后一行 `EOF`。

## 先想清楚它在判什么

Isolation Forest 是逐条打分的，一次只看一条交易长什么样，它不会去看这一批加起来多少钱。

所以这题不需要造一笔 200 万的交易。原始 `f0`（金额）最大值才 431.299，突然扔一个 2,000,000 进去，随机切一刀就被单独切出来了，判异常是必然的。

反过来想：造很多笔金额正常的交易，让它们加起来超过 200 万。按每条 300 算，2,000,000 / 300 ≈ 6667 条，生成 10000 条绰绰有余。

模型看的是单条，业务看的是总额，这个错位就是整道题的入口。

## 看一眼数据

```python
df = pd.read_csv(path)
print(df.shape)          # (1000, 20)
print(df["f0"].describe())
```

```text
mean   353.366
std     25.761
min    277.529
25%    335.407
50%    353.420
75%    370.928
max    431.299
```

金额本身就挤在 277 到 431 之间，标准差才 25 左右。

再看相关性，`f0` 和其他列普遍正相关：

```text
f0 - f1  : 0.750
f0 - f2  : 0.717
f0 - f9  : 0.843
f0 - f18 : 0.831
```

这条挺关键。20 列各自独立随机生成的话，每一列都在自己的历史范围里，但组合起来不像正常交易，多维的孤立森林照样能切出来。金额变了，其他列得跟着变。

## 生成方案

1. 20 列各拟合一个 KDE（核密度估计），从各自的分布里采样，别硬套正态分布。
2. `feat_0` 采完之后按分位位置缩放，把总额顶到 2,100,000，留 10 万余量给后面的噪声和裁剪。
3. 其余 19 列采完，按和 `f0` 的相关系数补一个相关项：`base + corr * z0 * base.std()`，`z0` 是金额的 z-score。
4. 每列加标准差 0.5% 的高斯噪声，防止出现完全相同的行。
5. 裁剪到 `[max(min*0.8, mean-3σ), min(max*1.2, mean+3σ)]`，把 KDE 可能采出来的离谱尾部值收回来。

缩放那一步不是整体乘同一个系数：

```python
individual_scale = 1 + (scale_factor - 1) * percentile
scaled_amounts[index] = amount_samples[index] * individual_scale
```

低分位的少放大、高分位的多放大，整批的分布不会被一下子拉变形。

## 完整脚本

```python
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.neighbors import KernelDensity

INPUT = Path(r"public_ledger.csv")
OUTPUT = Path(r"silent_heist_payload.csv")

ROW_COUNT = 10_000
TARGET_TOTAL = 2_100_000.0
NOISE_RATIO = 0.005
RANDOM_SEED = 42

# 1. 读原始正常数据
raw_df = pd.read_csv(INPUT)
original = raw_df.iloc[:, :20].to_numpy(dtype=float)
assert original.shape == (1000, 20), f"输入数据形状不对：{original.shape}"

# 2. 每一列单独拟合一个 KDE
kdes = []
for col in range(20):
    kde = KernelDensity(bandwidth="silverman", kernel="gaussian")
    kde.fit(original[:, col:col + 1])
    kdes.append(kde)

# 3. 金额采样 + 按分位缩放到目标总额
amount_samples = kdes[0].sample(ROW_COUNT, random_state=RANDOM_SEED).reshape(-1)
scale_factor = TARGET_TOTAL / amount_samples.sum()

scaled_amounts = np.empty_like(amount_samples)
for rank, index in enumerate(np.argsort(amount_samples)):
    percentile = rank / (ROW_COUNT - 1)
    scaled_amounts[index] = amount_samples[index] * (
        1 + (scale_factor - 1) * percentile
    )

generated = np.zeros((ROW_COUNT, 20), dtype=float)
generated[:, 0] = scaled_amounts

# 4. 其他列：采样 + 相关系数补丁
for col in range(1, 20):
    base = kdes[col].sample(
        ROW_COUNT, random_state=RANDOM_SEED + col
    ).reshape(-1)

    corr = float(np.corrcoef(original[:, 0], original[:, col])[0, 1])
    if abs(corr) > 0.1:
        z0 = (generated[:, 0] - generated[:, 0].mean()) / generated[:, 0].std()
        generated[:, col] = base + corr * z0 * base.std()
    else:
        generated[:, col] = base

# 5. 小噪声，避免重复行
rng = np.random.default_rng(RANDOM_SEED)
for col in range(20):
    generated[:, col] += rng.normal(
        loc=0.0,
        scale=generated[:, col].std() * NOISE_RATIO,
        size=ROW_COUNT,
    )

# 6. 裁剪回合理区间
for col in range(20):
    ref = original[:, col]
    lower = max(ref.min() * 0.8, ref.mean() - 3 * ref.std())
    upper = min(ref.max() * 1.2, ref.mean() + 3 * ref.std())
    generated[:, col] = np.clip(generated[:, col], lower, upper)

# 7. 本地自检
total = generated[:, 0].sum()
unique_rows = len(np.unique(np.round(generated, decimals=12), axis=0))
assert np.isfinite(generated).all()
assert total > 2_000_000, f"金额不足：{total}"
assert unique_rows == ROW_COUNT, f"有重复行：{unique_rows}"

print(f"生成行数: {ROW_COUNT}")
print(f"金额总和: {total:.2f}")
print(f"唯一行数: {unique_rows}")
print("金额范围:", generated[:, 0].min(), "到", generated[:, 0].max())

# 8. 输出，EOF 紧跟在最后一行数据后面
columns = [f"feat_{i}" for i in range(20)]
with OUTPUT.open("w", encoding="utf-8", newline="") as f:
    pd.DataFrame(generated, columns=columns).to_csv(
        f, index=False, lineterminator="\n"
    )
    f.write("EOF")
```

## 跑出来的结果

```text
生成行数: 10000
金额总和: 2871645.58
唯一行数: 10000
金额范围: 276.xx 到 307.xx
```

目标是 210 万，最后是 287 万，正常。clipping 会把一批低金额往上抬，所以实际总额比设定值高。题目只要求超过 200 万，不要求正好等于某个数。

## 提交

题目是往端口发原始字节流，Linux 下 `nc IP PORT < payload.csv` 就行。Windows 没有 nc，用 socket 发：

```python
import socket
from pathlib import Path

HOST, PORT = "目标IP", 目标端口
payload = Path("silent_heist_payload.csv").read_bytes()

with socket.create_connection((HOST, PORT), timeout=15) as sock:
    sock.sendall(payload)
    sock.shutdown(socket.SHUT_WR)

    chunks = []
    while True:
        data = sock.recv(4096)
        if not data:
            break
        chunks.append(data)

print(b"".join(chunks).decode(errors="replace"))
```

## 坑

- 表头。附件是 `f0..f19`，提交要 `feat_0..feat_19`，写错直接不收。
- `EOF` 要贴在最后一行数据后面，前面不要多空行，写成 `f.write("\nEOF")` 就多了一个换行。
- 想用 pandas 把成品读回来检查，记得 `nrows=10000`，不然 `EOF` 那一行会被当成坏数据。
- 只给 `f0` 做 KDE、其他 19 列纯随机 → 单列都正常，联合分布很怪，会被切出来。
- 噪声别贪大。0.5% 标准差够用了，再大就不像原来的数据。
- 别想用一条 200 万的交易解决——那是最标准的一个异常点。
