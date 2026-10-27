---
title: "SUCTF2026-部分AI,Cry-WriteUP"
date: 2026-03-17T09:15:00+08:00
draft: false
summary: "本文摘要： 文章展示了多个CTF赛题的解题思路和代码实现，涵盖了神经网络逆向、线性代数攻击、LLM密码生成等方向。主要内容包括： SU_babyAI：通过分析两层神经网络（Conv1d和Linear）的权重，使用格基归约算法恢复Flag。 SU_theif：利用已知卷积参数，通过最小二乘法求解线性层参数，构建完整模型提交获取Flag。 SU_easyLLM：调用LLM生成密码，尝试解密挑战数据获取Flag。 SU_谁是小偷：通过逆向分析卷积网络结构，拟合权重矩阵并提交模型。 restaurant：构造满足特"
slug: "suctf2026-bu-fen-ai-cry-writeup"
originalId: 159130849
sourceUrl: "https://blog.csdn.net/BEICHENst/article/details/159130849"
categories:
  - "CTF"
tags:
  - "深度学习"
  - "人工智能"
  - "CTF"
  - "SUCTF"
  - "WriteUp"
  - "网络安全"
featuredImage: "images/cover.png"
---
## ****SU\_babyAI****

题目的表面是一个两层的神经网络（一层 Conv1d ，一层 Linear），但这其实是出题人放的烟雾弹。

Conv1d 层：步长 (stride) 为 2，卷积核大小为 3。本质上就是对输入数组进行每 3 个一组的滑动求和（带权重）。

Linear 层：全连接层，就是进行一次矩阵乘法。

```cobol
import torch
import torch.nn as nn
import json

# 重建模型结构以加载权重
class ModuloNet(nn.Module):
    def __init__(self, n_in, m_out):
        super().__init__()
        self.conv = nn.Conv1d(1, 1, 3, stride=2, bias=False)
        conv_out_size = (n_in - 3) // 2 + 1
        self.fc = nn.Linear(conv_out_size, m_out, bias=False)

n = 41
m = 15

model = ModuloNet(n, m)
# 加载你提供的 model.pth
model.load_state_dict(torch.load("model.pth"))

# 按照题目中的方式提取为 long 型列表
w_conv = model.conv.weight.squeeze().long().tolist()
w_fc = model.fc.weight.long().tolist()

# 保存给 SageMath 使用
with open("weights.json", "w") as f:
    json.dump({"w_conv": w_conv, "w_fc": w_fc}, f)

print("Weights extracted successfully to weights.json")

#{"w_conv": [711570624, 963400576, 994288832], "w_fc": [[297614816, 436414592, 860390144, 664419968, 197614784, 409222944, 233872560, 627448320, 46818032, 422992928, 679420160, 81650776, 883411904, 541613888, 482021664, 298908096, 199588768, 271502432, 876545728, 880926464], [151330976, 320520704, 406166720, 885139328, 531236064, 939406208, 218275424, 815258816, 381472032, 458734304, 82122584, 944455104, 500193952, 289881984, 421138528, 553620672, 953055552, 793955712, 837951360, 175109600], [49511188, 811860544, 673119424, 435815104, 363030624, 237639072, 344360800, 615608128, 468901920, 623588480, 798760576, 926786240, 281757600, 888966080, 878816128, 253852176, 159918880, 229503952, 845853696, 581827136], [932321536, 64909596, 276360800, 661220288, 728794240, 564061888, 523473280, 985239232, 904827136, 467689088, 377599040, 369905856, 704733632, 98109520, 986602816, 898609024, 340310272, 277700640, 270729824, 730310656], [987233472, 469228128, 515120992, 197659952, 37344004, 875660288, 867518528, 355921280, 332149344, 920347648, 461632704, 309683968, 625854208, 739838016, 347660960, 550290816, 593196672, 446681344, 835965760, 967270336], [443480576, 514510176, 326779936, 244568256, 493780256, 540022400, 521128000, 311172544, 984923264, 461161696, 1847509, 994950208, 479924640, 807051008, 446864672, 83577288, 714053504, 52781776, 374880672, 253394336], [396243456, 980173888, 571883200, 795689088, 143121216, 356414912, 167040832, 675041664, 465443712, 294232512, 794939136, 176852464, 102713232, 929851776, 598410944, 102113040, 267942576, 670359808, 30160832, 658604928], [855918976, 246297456, 205985168, 754819200, 523053984, 695651584, 695940992, 110872208, 503072352, 953440384, 602746496, 454487680, 833677120, 381587264, 620641088, 9118840, 375407840, 166761968, 294166528, 11319620], [371568768, 80815520, 684906240, 290054176, 789146240, 583822336, 634642688, 922142592, 285606720, 396721856, 286496480, 468516160, 235006560, 895963968, 415955904, 790245952, 119753320, 979420608, 246546128, 446345024], [138668992, 806997568, 539057024, 544763520, 144570608, 514485312, 573345216, 110101048, 380458016, 541929280, 539392448, 948778368, 408586208, 751448320, 70724616, 702397568, 262888688, 915350336, 521065088, 670870272], [133215816, 210337728, 103923352, 397129184, 63536912, 725864960, 147100016, 434930944, 697721152, 549382912, 334255168, 364794912, 344588736, 356966304, 945786688, 835596160, 120754752, 657875584, 303490880, 108966984], [676221952, 990628544, 127497088, 214150960, 531858304, 686086784, 802917312, 988694656, 314908672, 63965952, 156540480, 499403872, 197203520, 669649408, 902259712, 434448032, 448513824, 579643840, 857690304, 807774720], [185761248, 88477544, 118775720, 91887776, 831682944, 488700768, 84241912, 669947584, 102393224, 292332736, 96007008, 99095312, 348428832, 786959104, 952230848, 477275264, 258574080, 95679968, 476182400, 493619648], [141768240, 844250048, 310929376, 173367168, 351167872, 284791040, 849352192, 559654656, 310701856, 866857664, 691280576, 956124608, 428339072, 835154368, 289582560, 74862496, 462166208, 455068768, 813506880, 234161296], [698318464, 267563488, 348129056, 845140736, 244852112, 830024768, 502683456, 715116480, 819485888, 234979584, 835028096, 841118592, 728383296, 36333460, 578634880, 567642624, 472977856, 334214208, 5871110, 627321344]]}


# 1. 填入你提取出来的权重数据和题目已知条件
w_conv = [711570624, 963400576, 994288832]
w_fc = [[297614816, 436414592, 860390144, 664419968, 197614784, 409222944, 233872560, 627448320, 46818032, 422992928, 679420160, 81650776, 883411904, 541613888, 482021664, 298908096, 199588768, 271502432, 876545728, 880926464], [151330976, 320520704, 406166720, 885139328, 531236064, 939406208, 218275424, 815258816, 381472032, 458734304, 82122584, 944455104, 500193952, 289881984, 421138528, 553620672, 953055552, 793955712, 837951360, 175109600], [49511188, 811860544, 673119424, 435815104, 363030624, 237639072, 344360800, 615608128, 468901920, 623588480, 798760576, 926786240, 281757600, 888966080, 878816128, 253852176, 159918880, 229503952, 845853696, 581827136], [932321536, 64909596, 276360800, 661220288, 728794240, 564061888, 523473280, 985239232, 904827136, 467689088, 377599040, 369905856, 704733632, 98109520, 986602816, 898609024, 340310272, 277700640, 270729824, 730310656], [987233472, 469228128, 515120992, 197659952, 37344004, 875660288, 867518528, 355921280, 332149344, 920347648, 461632704, 309683968, 625854208, 739838016, 347660960, 550290816, 593196672, 446681344, 835965760, 967270336], [443480576, 514510176, 326779936, 244568256, 493780256, 540022400, 521128000, 311172544, 984923264, 461161696, 1847509, 994950208, 479924640, 807051008, 446864672, 83577288, 714053504, 52781776, 374880672, 253394336], [396243456, 980173888, 571883200, 795689088, 143121216, 356414912, 167040832, 675041664, 465443712, 294232512, 794939136, 176852464, 102713232, 929851776, 598410944, 102113040, 267942576, 670359808, 30160832, 658604928], [855918976, 246297456, 205985168, 754819200, 523053984, 695651584, 695940992, 110872208, 503072352, 953440384, 602746496, 454487680, 833677120, 381587264, 620641088, 9118840, 375407840, 166761968, 294166528, 11319620], [371568768, 80815520, 684906240, 290054176, 789146240, 583822336, 634642688, 922142592, 285606720, 396721856, 286496480, 468516160, 235006560, 895963968, 415955904, 790245952, 119753320, 979420608, 246546128, 446345024], [138668992, 806997568, 539057024, 544763520, 144570608, 514485312, 573345216, 110101048, 380458016, 541929280, 539392448, 948778368, 408586208, 751448320, 70724616, 702397568, 262888688, 915350336, 521065088, 670870272], [133215816, 210337728, 103923352, 397129184, 63536912, 725864960, 147100016, 434930944, 697721152, 549382912, 334255168, 364794912, 344588736, 356966304, 945786688, 835596160, 120754752, 657875584, 303490880, 108966984], [676221952, 990628544, 127497088, 214150960, 531858304, 686086784, 802917312, 988694656, 314908672, 63965952, 156540480, 499403872, 197203520, 669649408, 902259712, 434448032, 448513824, 579643840, 857690304, 807774720], [185761248, 88477544, 118775720, 91887776, 831682944, 488700768, 84241912, 669947584, 102393224, 292332736, 96007008, 99095312, 348428832, 786959104, 952230848, 477275264, 258574080, 95679968, 476182400, 493619648], [141768240, 844250048, 310929376, 173367168, 351167872, 284791040, 849352192, 559654656, 310701856, 866857664, 691280576, 956124608, 428339072, 835154368, 289582560, 74862496, 462166208, 455068768, 813506880, 234161296], [698318464, 267563488, 348129056, 845140736, 244852112, 830024768, 502683456, 715116480, 819485888, 234979584, 835028096, 841118592, 728383296, 36333460, 578634880, 567642624, 472977856, 334214208, 5871110, 627321344]]

n = 41
m = 15
q = 1000000007
Y = [776038603, 454677179, 277026269, 279042526, 78728856, 784454706, 29243312, 291698200, 137468500, 236943731, 733036662, 421311403, 340527174, 804823668, 379367062]

# 2. 将两层网络合并为一个 15 x 41 的变换矩阵 A
k_conv = (n - 3) // 2 + 1  # 等于 20
A = matrix(ZZ, m, n)
for i in range(m):
    for j in range(k_conv):
        # 模拟 sliding window 的过程
        A[i, 2*j]   += w_fc[i][j] * w_conv[0]
        A[i, 2*j+1] += w_fc[i][j] * w_conv[1]
        A[i, 2*j+2] += w_fc[i][j] * w_conv[2]

# 3. 代入已知字符 SUCTF{ 和 } 来降维
# 它们分别位于 index: 0, 1, 2, 3, 4, 5 和 40
known_chars = {0: ord('S'), 1: ord('U'), 2: ord('C'), 3: ord('T'), 4: ord('F'), 5: ord('{'), 40: ord('}')}
unknown_indices = [i for i in range(n) if i not in known_chars]
num_unk = len(unknown_indices) # 这里应该是 34 个未知字符

# 从目标 Y 中减去已知字符产生的偏移
Y_shifted = vector(ZZ, Y)
for idx, val in known_chars.items():
    Y_shifted -= A.column(idx) * val

# 提取出只跟未知字符有关的矩阵 A_unk (15 x 34)
A_unk = matrix(ZZ, m, num_unk)
for col_idx, orig_idx in enumerate(unknown_indices):
    A_unk[:, col_idx] = A.column(orig_idx)

# 4. 变量中心化：可见字符的 ASCII 码中心约在 79，我们让未知数落在 (-47, 47) 左右，更容易求得最短向量
offset = 79
Y_centered = Y_shifted - A_unk * vector(ZZ, [offset] * num_unk)
Y_target = vector(ZZ, [y % q for y in Y_centered])

# 5. 构造 LLL 格基归约矩阵 (LWE/CVP 的经典构造方式)
# 变量分别为: [X_0 ... X_33] + [k_0 ... k_14] + [常数1]
# 为了平衡各种变量可能的最大值，分配权重 W_x 和 W_e
W_x = 160
W_e = 47
W_const = 160

# 矩阵总维度为: 34 (未知数) + 15 (模q的倍数) + 1 (常数) = 50 维
dim = num_unk + m + 1
L = matrix(ZZ, dim, dim)

# 填入矩阵内容
# 左上角: W_x * I (提取未知的 Flag 字符)
for i in range(num_unk):
    L[i, i] = W_x
    for j in range(m):
        L[i, num_unk + j] = A_unk[j, i] * W_e

# 中间: W_e * q * I (模 q 的调整项)
for i in range(m):
    L[num_unk + i, num_unk + i] = q * W_e

# 右下角: -Y_target (目标值)
for j in range(m):
    L[dim - 1, num_unk + j] = -Y_target[j] * W_e
L[dim - 1, dim - 1] = W_const

print("正在运行 LLL 格基规约算法，请稍候... (大约只需要1-2秒)")
L_reduced = L.LLL()

# 6. 从归约后的基中找出包含 flag 的那一列短向量
flag_found = False
for row in L_reduced:
    # 找到目标常数项所在行（可能为正也可能为负）
    if abs(row[-1]) == W_const:
        sign = 1 if row[-1] == W_const else -1

        # 提取并还原 X (除以权重，乘上符号)
        x_unk_centered = [sign * row[i] // W_x for i in range(num_unk)]

        # 验证解析出来的值是否都在合法的中心化 ASCII 范围内 (大约是 -47 到 47)
        if all(-50 <= x <= 50 for x in x_unk_centered):
            # 将字符拼装起来
            flag_chars = [0] * n
            for idx, val in known_chars.items():
                flag_chars[idx] = val
            for col_idx, orig_idx in enumerate(unknown_indices):
                flag_chars[orig_idx] = x_unk_centered[col_idx] + offset

            try:
                flag = bytes(flag_chars).decode('ascii')
                print(f"\n🎉 破解成功！获取到 Flag:")
                print(f"[{flag}]")
                flag_found = True
                break
            except:
                continue

if not flag_found:
    print("\n未能找到 Flag，这很罕见，可能是噪声分布偏差，可以尝试调整中心偏移量 offset 或者权重。")
#SUCTF{PyT0rch_m0del_c4n_h1d3_LWE_pr0bl3m}
```

## ****SU\_theif****

```cobol
import requests
import torch
import numpy as np
import base64
import io
from collections import OrderedDict
import time

# 靶机地址
url = "http://1.95.113.59:10003"

# 已知卷积层参数（来自 model_base.pth）
conv_weight = torch.tensor([[[[7., 1., 3.],
                              [5., 6., 8.],
                              [2., 9., 14.]]]])  # (1,1,3,3)
conv_bias = torch.tensor([2.])
conv1_weight = torch.tensor([[[[0.5, 1.3],
                               [5.1, 7.4]]]])    # (1,1,2,2)
conv1_bias = torch.tensor([6.])

def compute_f2(x):
    """输入图像 x (1,1,32,32)，返回经过 conv 和 conv1 后的 256 维特征"""
    x_pad = torch.nn.functional.pad(x, (2, 0, 2, 0), mode='constant', value=0)
    f1 = torch.nn.functional.conv2d(x_pad, conv_weight, bias=conv_bias, stride=1)
    f2 = torch.nn.functional.conv2d(f1, conv1_weight, bias=conv1_bias, stride=2)
    return f2.view(-1)

def main():
    # 尝试收集 400 次请求，留出余量
    total_attempts = 400
    f2_list = []
    y_list = []
    success_count = 0
    session = requests.Session()
    print(f"开始向 {url}/predict 发送请求收集数据...")

    for i in range(total_attempts):
        try:
            # 生成随机输入图像
            img = np.random.randn(1, 1, 32, 32).astype(np.float32)
            payload = {'image': img.tolist()}

            # 发送请求，设置超时
            resp = session.post(url + '/predict', json=payload, timeout=5)
            if resp.status_code != 200:
                print(f"请求 {i} 失败 (HTTP {resp.status_code}): {resp.text[:50]}")
                continue

            # 解析响应
            result = resp.json()
            if 'prediction' not in result:
                print(f"请求 {i} 返回格式异常: {result}")
                continue
            y = result['prediction']
            y_tensor = torch.tensor(y)

            # 本地计算 f2
            x_tensor = torch.tensor(img)
            f2 = compute_f2(x_tensor)
            f2_list.append(f2.numpy())
            y_list.append(y_tensor.numpy())
            success_count += 1
            if success_count % 50 == 0:
                print(f"已成功收集 {success_count} 个样本")
        except requests.exceptions.RequestException as e:
            print(f"请求 {i} 网络异常: {e}")
            time.sleep(1)  # 网络问题稍等再继续
        except Exception as e:
            print(f"请求 {i} 未知异常: {e}")

    print(f"\n收集完成，共成功 {success_count} 个样本。")

    if success_count < 257:  # 至少需要 257 个样本（256维 + 常数项）
        print(f"错误：样本不足（需要至少257个，实际只有{success_count}个），无法可靠求解。")
        return
    # 构建矩阵
    F = np.array(f2_list).T          # (256, success_count)
    Y = np.array(y_list).T            # (256, success_count)

    # 增加一行常数项用于求解偏置
    F_aug = np.vstack([F, np.ones((1, success_count))])  # (257, success_count)

    # 最小二乘法求解 W 和 b
    print("正在求解线性层参数...")
    Wb = np.linalg.lstsq(F_aug.T, Y.T, rcond=None)[0]  # (257, 256)
    W = Wb[:256, :].T   # 256x256
    b = Wb[256, :]      # 256

    print("求解完成。")

    # 构造完整的 state_dict
    state_dict = OrderedDict()
    state_dict['linear.weight'] = torch.tensor(W, dtype=torch.float32)
    state_dict['linear.bias'] = torch.tensor(b, dtype=torch.float32)
    state_dict['conv.weight'] = conv_weight
    state_dict['conv.bias'] = conv_bias
    state_dict['conv1.weight'] = conv1_weight
    state_dict['conv1.bias'] = conv1_bias

    # 保存为 pth 并编码为 base64
    buffer = io.BytesIO()
    torch.save(state_dict, buffer)
    buffer.seek(0)
    model_b64 = base64.b64encode(buffer.read()).decode('utf-8')

    # 提交获取 flag
    print("正在提交模型到 /flag 接口...")
    flag_payload = {'model': model_b64}
    try:
        resp = session.post(url + '/flag', json=flag_payload, timeout=10)
        print("服务器响应：", resp.text)
    except Exception as e:
        print(f"提交失败: {e}")

if __name__ == '__main__':
main()

#SUCTF{n0t_4ll_h1st0ry_t3lls_th3_truth_6a4e2b8d}
```

## ****SU\_easyLLM****

```cobol
import hashlib, base64, json, subprocess, sys

def decrypt(password, iv_b64, ct_b64):
    from Crypto.Cipher import AES
    from Crypto.Util.Padding import unpad
    key = hashlib.sha256(password.encode('utf-8')).digest()[:16]
    iv = base64.b64decode(iv_b64)
    ct = base64.b64decode(ct_b64)
    try:
        cipher = AES.new(key, AES.MODE_CBC, iv)
        pt = unpad(cipher.decrypt(ct), AES.block_size)
        return pt.decode('utf-8')
    except:
        return None

def fetch_challenge():
    result = subprocess.run(['curl', '-s', 'http://101.245.107.149:10013/'],
                          capture_output=True, text=True, timeout=10)
    return json.loads(result.stdout)

def call_llm():
    result = subprocess.run([
        'curl', '-s', '-X', 'POST',
        'https://open.bigmodel.cn/api/paas/v4/chat/completions',
        '-H', 'Content-Type: application/json',
        '-H', 'Authorization: Bearer ce46ddd200774cb7a0f9d8fc14dd81af.UE87Xi8cwAAck7wM',
        '-d', json.dumps({
            "model": "GLM-4-Flash",
            "temperature": 0.28,
            "messages": [
                {"role": "system", "content": "You are a password generator.\nOutput ONE password only.\nFormat strictly: pw-xxxxxxxx where x are letters.\nNo explanation, no quotes, no punctuation."},
                {"role": "user", "content": "Generate the password now."}
            ]
        })
    ], capture_output=True, text=True, timeout=30)
    try:
        data = json.loads(result.stdout)
        return data["choices"][0]["message"]["content"].strip()
    except:
        return None

print("=" * 60)
print("Phase 1: Collecting passwords from LLM (200 calls)...")
print("=" * 60)

all_passwords = set()
for i in range(200):
    pw = call_llm()
    if pw:
        all_passwords.add(pw)
        if (i+1) % 20 == 0:
            print(f"  {i+1}/200 calls done, {len(all_passwords)} unique passwords")

# Also add some manual guesses
manual = [
    "pw-xxxxxxxx", "pw-abcdefgh", "pw-ABCDEFGH", "pw-password",
    "pw-generate", "pw-randomly", "pw-lettersA", "pw-secureab",
]
for m in manual:
    all_passwords.add(m)

print(f"\n[*] Total unique passwords: {len(all_passwords)}")
print(f"[*] Passwords: {sorted(all_passwords)[:10]}...")

print("\n" + "=" * 60)
print("Phase 2: Fetching challenges and trying all passwords...")
print("=" * 60)

for attempt in range(50):
    data = fetch_challenge()
    iv_b64 = data['iv_b64']
    ct_b64 = data['ciphertext_b64']

    for pw in all_passwords:
        result = decrypt(pw, iv_b64, ct_b64)
        if result:
            print(f"\n{'='*60}")
            print(f"[+] ATTEMPT #{attempt+1}")
            print(f"[+] PASSWORD: {pw}")
            print(f"[+] FLAG: {result}")
            print(f"{'='*60}")
            sys.exit(0)

    if (attempt+1) % 10 == 0:
        print(f"  {attempt+1}/50 challenge fetches tried, no match yet")

print("\n[!] All 50 challenges tried, no match found")

#SUCTF{LLM_w1ll_ch4nge_ev3rything}
```

## SU\_谁是小偷

```cobol
Exp:
import argparse
import base64
import io
import os
import time
from typing import List, Tuple, Optional

import requests
import torch
import torch.nn as nn


IMG_HW = 19
KERNEL_HW = 4
OUT_HW = IMG_HW - KERNEL_HW + 1   # 16
FEATURES = OUT_HW * OUT_HW        # 256
INPUT_DIM = IMG_HW * IMG_HW       # 361


class Net(nn.Module):
    def __init__(self):
        super().__init__()
        self.linear = nn.Linear(FEATURES, FEATURES)
        self.conv = nn.Conv2d(1, 1, (KERNEL_HW, KERNEL_HW), stride=1)

    def forward(self, x):
        x = self.conv(x)
        x = x.view(-1)
        x = self.linear(x)
        return x


class Oracle:
    def __init__(self, base_url: str, timeout: float = 20.0, retries: int = 8, retry_sleep: float = 2.0):
        self.base_url = base_url.rstrip("/")
        self.timeout = timeout
        self.retries = retries
        self.retry_sleep = retry_sleep
        self.s = requests.Session()

    def _post_json(self, path: str, payload: dict):
        last_exc = None
        for attempt in range(1, self.retries + 1):
            try:
                r = self.s.post(
                    f"{self.base_url}{path}",
                    json=payload,
                    timeout=self.timeout,
                )
                return r
            except (requests.exceptions.ConnectTimeout,
                    requests.exceptions.ReadTimeout,
                    requests.exceptions.ConnectionError) as e:
                last_exc = e
                print(f"[!] request {path} failed on attempt {attempt}/{self.retries}: {e}", flush=True)
                if attempt < self.retries:
                    sleep_t = self.retry_sleep * attempt
                    print(f"[*] sleeping {sleep_t:.1f}s then retrying...", flush=True)
                    time.sleep(sleep_t)
        raise last_exc

    def predict(self, x: torch.Tensor) -> torch.Tensor:
        r = self._post_json("/predict", {"image": x.tolist()})
        try:
            data = r.json()
        except Exception:
            raise RuntimeError(f"predict got non-json: {r.status_code} {r.text[:500]}")

        if r.status_code != 200:
            raise RuntimeError(f"predict failed: {r.status_code} {data}")

        if "prediction" not in data:
            raise RuntimeError(f"predict bad response: {data}")

        y = torch.tensor(data["prediction"], dtype=torch.float32)
        if y.numel() != FEATURES:
            raise RuntimeError(f"predict returned {y.numel()} dims, expected {FEATURES}")
        return y

    def submit(self, model: nn.Module) -> Tuple[int, dict]:
        buf = io.BytesIO()
        torch.save(model.state_dict(), buf)
        r = self._post_json("/flag", {
            "model": base64.b64encode(buf.getvalue()).decode()
        })
        try:
            data = r.json()
        except Exception:
            data = {"raw": r.text}
        return r.status_code, data


def query_affine_map(oracle: Oracle, known_bias: Optional[torch.Tensor] = None) -> Tuple[torch.Tensor, torch.Tensor]:
    shape = (1, 1, IMG_HW, IMG_HW)

    if known_bias is None:
        zero = torch.zeros(shape, dtype=torch.float32)
        bias = oracle.predict(zero)
    else:
        bias = known_bias.clone()
        print("[*] reusing sanity bias, skipping duplicate zero query", flush=True)

    cols: List[torch.Tensor] = []
    for idx in range(INPUT_DIM):
        x = torch.zeros(shape, dtype=torch.float32)
        x.view(-1)[idx] = 1.0
        y = oracle.predict(x) - bias
        cols.append(y)

        if (idx + 1) % 40 == 0 or idx + 1 == INPUT_DIM:
            print(f"[*] queried {idx + 1}/{INPUT_DIM} basis inputs", flush=True)

    matrix = torch.stack(cols, dim=1)  # [256, 361]
    return matrix, bias


def save_affine(path: str, matrix: torch.Tensor, bias: torch.Tensor):
    torch.save({"matrix": matrix, "bias": bias}, path)
    print(f"[*] wrote affine cache to {path}", flush=True)


def load_affine(path: str) -> Tuple[torch.Tensor, torch.Tensor]:
    cached = torch.load(path, map_location="cpu")
    return cached["matrix"], cached["bias"]


def basis_loss(model: Net, matrix: torch.Tensor, bias: torch.Tensor, device: str) -> torch.Tensor:
    model = model.to(device)
    matrix = matrix.to(device)
    bias = bias.to(device)

    flat_inputs = torch.eye(INPUT_DIM, device=device).view(INPUT_DIM, 1, IMG_HW, IMG_HW)
    conv_out = model.conv(flat_inputs).view(INPUT_DIM, FEATURES).T
    pred_matrix = model.linear.weight @ conv_out
    ones = torch.ones(FEATURES, device=device)
    pred_bias = model.linear.weight @ (model.conv.bias.view(1) * ones) + model.linear.bias

    return torch.mean((pred_matrix - matrix) ** 2) + torch.mean((pred_bias - bias) ** 2)


def fit_from_affine(
    matrix: torch.Tensor,
    bias: torch.Tensor,
    device: str,
    restarts: int,
    steps: int,
    lr: float,
) -> Net:
    best_model = None
    best_loss = float("inf")

    for restart in range(restarts):
        torch.manual_seed(1337 + restart)
        model = Net().to(device)
        opt = torch.optim.Adam(model.parameters(), lr=lr)

        for step in range(steps):
            opt.zero_grad(set_to_none=True)
            loss = basis_loss(model, matrix, bias, device)
            loss.backward()
            opt.step()

            if (step + 1) % 200 == 0 or step == 0:
                print(
                    f"[*] restart {restart + 1}/{restarts} "
                    f"step {step + 1}/{steps} loss={loss.item():.8f}",
                    flush=True,
                )

        with torch.no_grad():
            final_loss = float(basis_loss(model, matrix, bias, device).item())

        print(f"[*] restart {restart + 1}/{restarts} final loss={final_loss:.8f}", flush=True)

        if final_loss < best_loss:
            best_loss = final_loss
            best_model = Net()
            best_model.load_state_dict({k: v.detach().cpu() for k, v in model.state_dict().items()})

    print(f"[*] best loss={best_loss:.8f}", flush=True)
    return best_model


def scaled_variant(model: Net, scale: float) -> Net:
    cand = Net()
    cand.load_state_dict(model.state_dict())

    with torch.no_grad():
        cand.conv.weight.mul_(scale)
        cand.conv.bias.mul_(scale)
        cand.linear.weight.div_(scale)

    return cand


def scale_candidates() -> List[float]:
    vals = {1.0}
    for q in range(-24, 25):
        vals.add(2 ** (q / 4))
    vals.update([0.8, 0.9, 0.95, 1.05, 1.1, 1.2])
    return sorted(vals)


def recover_integer_weights(matrix: torch.Tensor) -> Tuple[torch.Tensor, torch.Tensor]:
    k = torch.tensor(
        [
            [-6.0, -10.0, 1.0, -4.0],
            [6.0, -1.0, 8.0, 8.0],
            [9.0, -7.0, 6.0, -4.0],
            [-5.0, 6.0, 8.0, -6.0],
        ],
        dtype=torch.float64,
    )

    basis = torch.eye(INPUT_DIM, dtype=torch.float64).view(INPUT_DIM, 1, IMG_HW, IMG_HW)
    conv_cols = torch.nn.functional.conv2d(
        basis, k.view(1, 1, KERNEL_HW, KERNEL_HW)
    ).view(INPUT_DIM, FEATURES).T.contiguous()

    linear = matrix.double() @ conv_cols.T @ torch.linalg.pinv(conv_cols @ conv_cols.T)
    return k.float(), linear.round().float()


def build_exact_function_model(matrix: torch.Tensor, bias: torch.Tensor, conv_bias: float) -> Net:
    conv_weight, linear_weight = recover_integer_weights(matrix)
    model = Net()

    with torch.no_grad():
        model.conv.weight.copy_(conv_weight.view(1, 1, KERNEL_HW, KERNEL_HW))
        model.linear.weight.copy_(linear_weight)
        model.conv.bias.fill_(conv_bias)

        ones = torch.ones(FEATURES, dtype=torch.float32)
        total = bias.float()
        model.linear.bias.copy_(total - conv_bias * (linear_weight @ ones))

    return model


def sanity_test(oracle: Oracle) -> torch.Tensor:
    x = torch.zeros((1, 1, IMG_HW, IMG_HW), dtype=torch.float32)
    y = oracle.predict(x)
    print(f"[*] sanity predict ok: output shape = {tuple(y.shape)}", flush=True)
    return y.clone()


def try_submit_scales(oracle: Oracle, model: Net) -> bool:
    for scale in scale_candidates():
        cand = scaled_variant(model, scale)
        status, data = oracle.submit(cand)
        print(f"[*] submit scale={scale:.8f} status={status} data={data}", flush=True)
        if status == 200 and isinstance(data, dict) and "flag" in data:
            print(data["flag"])
            return True
    return False


def scan_exact_bias(oracle: Oracle, matrix: torch.Tensor, bias: torch.Tensor, start: float, end: float, step: float):
    n = int(round((end - start) / step)) + 1
    print(f"[*] scanning conv_bias from {start} to {end} step {step} ({n} candidates)", flush=True)

    for i in range(n):
        conv_bias = start + i * step
        model = build_exact_function_model(matrix, bias, conv_bias)
        status, data = oracle.submit(model)

        if i % 20 == 0 or status == 200:
            print(f"[*] bias[{i+1}/{n}] = {conv_bias:.6f} -> status={status} data={data}", flush=True)

        if status == 200 and isinstance(data, dict) and "flag" in data:
            print(data["flag"])
            return True

    print("[!] bias scan finished, no flag", flush=True)
    return False


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--url", required=True)
    ap.add_argument("--device", default="cpu", choices=["cpu", "cuda"])
    ap.add_argument("--restarts", type=int, default=6)
    ap.add_argument("--steps", type=int, default=2000)
    ap.add_argument("--lr", type=float, default=3e-2)
    ap.add_argument("--save", default="candidate.pth")
    ap.add_argument("--affine-cache", default="affine.pt")
    ap.add_argument("--query-only", action="store_true")
    ap.add_argument("--sanity-only", action="store_true")
    ap.add_argument("--exact-bias", type=float, default=None)
    ap.add_argument("--scan-bias-start", type=float, default=None)
    ap.add_argument("--scan-bias-end", type=float, default=None)
    ap.add_argument("--scan-bias-step", type=float, default=0.01)
    ap.add_argument("--timeout", type=float, default=20.0)
    ap.add_argument("--retries", type=int, default=8)
    ap.add_argument("--retry-sleep", type=float, default=2.0)
    args = ap.parse_args()

    oracle = Oracle(
        args.url,
        timeout=args.timeout,
        retries=args.retries,
        retry_sleep=args.retry_sleep,
    )

    print("[*] target architecture inferred from remote behavior:", flush=True)
    print(f"    input      = 1x1x{IMG_HW}x{IMG_HW}", flush=True)
    print(f"    conv kernel= {KERNEL_HW}x{KERNEL_HW}", flush=True)
    print(f"    conv out   = 1x1x{OUT_HW}x{OUT_HW}", flush=True)
    print(f"    features   = {FEATURES}", flush=True)
    print(f"    input dim  = {INPUT_DIM}", flush=True)

    sanity_bias = sanity_test(oracle)
    if args.sanity_only:
        return

    if os.path.exists(args.affine_cache):
        matrix, bias = load_affine(args.affine_cache)
        print(f"[*] loaded affine cache from {args.affine_cache}", flush=True)
    else:
        matrix, bias = query_affine_map(oracle, known_bias=sanity_bias)
        save_affine(args.affine_cache, matrix, bias)

    print(f"[*] recovered affine map: matrix={tuple(matrix.shape)} bias={tuple(bias.shape)}", flush=True)

    if args.query_only:
        return

    if args.scan_bias_start is not None and args.scan_bias_end is not None:
        scan_exact_bias(
            oracle,
            matrix,
            bias,
            args.scan_bias_start,
            args.scan_bias_end,
            args.scan_bias_step,
        )
        return

    if args.exact_bias is not None:
        model = build_exact_function_model(matrix, bias, args.exact_bias)
        torch.save(model.state_dict(), args.save)
        print(f"[*] wrote exact-function candidate to {args.save}", flush=True)

        status, data = oracle.submit(model)
        print(f"[*] submit exact-bias={args.exact_bias:.8f} status={status} data={data}", flush=True)
        if status == 200 and isinstance(data, dict) and "flag" in data:
            print(data["flag"])
        return

    model = fit_from_affine(
        matrix=matrix,
        bias=bias,
        device=args.device,
        restarts=args.restarts,
        steps=args.steps,
        lr=args.lr,
    )

    torch.save(model.state_dict(), args.save)
    print(f"[*] wrote {args.save}", flush=True)

    ok = try_submit_scales(oracle, model)
    if not ok:
        print("[!] no flag yet", flush=True)


if __name__ == "__main__":
    main()
```

POC:

```cobol
python .\xiaotou.py --url http://1.95.113.59:10002 --scan-bias-start -10 --scan-bias-end 10 --scan-bias-step 0.1 --timeout 30 --retries 10 --retry-sleep 3

#SUCTF{ch3ck_th3_st4t3_n0t_th3_l0g_5d1f9a6c}
```

## restaurant

```cobol
import json
import random
import re
import socket
import sys
from hashlib import sha3_512

import numpy as np


HOST = "101.245.107.149"
PORT = 10020
MAX_VAL = 256
P_ZERO = 0.8


def H(x: bytes):
    h = sha3_512(x).hexdigest()
    return [int(h[i : i + 2], 16) for i in range(0, 128, 2)]


def text_to_matrix(msg: bytes):
    tmp = H(msg)
    return [[tmp[i * 8 + j] for j in range(8)] for i in range(8)]


def matrix_rank(mat):
    return int(np.linalg.matrix_rank(np.array(mat, dtype=np.float64)))


def minplus_mul(A, B):
    m, n = len(A), len(A[0])
    p = len(B[0])
    out = [[0] * p for _ in range(m)]
    for i in range(m):
        for j in range(p):
            best = None
            for k in range(n):
                v = A[i][k] + B[k][j]
                if best is None or v < best:
                    best = v
            out[i][j] = best
    return out


def choose_active_columns(M):
    best = None
    for drop in range(8):
        K = [j for j in range(8) if j != drop]
        A = [[M[i][k] for k in K] for i in range(8)]
        r = matrix_rank(A)
        if r >= 7:
            return K, A
        if best is None or r > best[0]:
            best = (r, K, A)
    raise ValueError(f"failed to find rank-7 A (best rank={best[0]})")

def build_B():
    # Bias toward zeros to make W small, but keep rank >= 7.
    while True:
        B = [
            [0 if random.random() < P_ZERO else 1 for _ in range(8)]
            for _ in range(7)
        ]
        if matrix_rank(B) >= 7:
            return B


def build_P_from_B(K, B):
    # Inactive row is large so it never wins the min.
    P = [[MAX_VAL] * 8 for _ in range(8)]
    for r, k in enumerate(K):
        P[k] = B[r][:]
    if matrix_rank(P) < 8:
        return None
    return P


def build_R(M, W):
    c = [min(M[i][j] for i in range(8)) for j in range(8)]
    t = []
    for i in range(8):
        need = max(W[i][j] - c[j] for j in range(8))
        t.append(max(0, min(need, MAX_VAL)))

    for _ in range(500):
        R = [[random.randint(t[i], MAX_VAL) for _ in range(8)] for i in range(8)]
        if matrix_rank(R) >= 8:
            return R
    raise ValueError("failed to build rank-8 R")


def build_S(W):
    for _ in range(500):
        S = [
            [random.randint(W[i][j], MAX_VAL) for j in range(8)]
            for i in range(8)
        ]
        if S != W and matrix_rank(S) >= 8:
            return S
    raise ValueError("failed to build rank-8 S")


def build_matrices(msg: str):
    M = text_to_matrix(msg.encode())
    K, A = choose_active_columns(M)

    for _ in range(200):
        B = build_B()
        P = build_P_from_B(K, B)
        if P is None:
            continue

        W = minplus_mul(A, B)
        # Ensure M*P == W (inactive row should never win).
        if minplus_mul(M, P) != W:
            continue

        R = build_R(M, W)
        S = build_S(W)
        return A, B, P, R, S

    raise ValueError("failed to build valid matrices")


def recv_until(sock: socket.socket, token: bytes) -> bytes:
    data = b""
    while token not in data:
        chunk = sock.recv(4096)
        if not chunk:
            break
        data += chunk
    return data


def sendline(sock: socket.socket, line: str):
    sock.sendall(line.encode() + b"\n")


def main():
    host = HOST
    port = PORT
    if len(sys.argv) >= 2:
        port = int(sys.argv[1])
    if len(sys.argv) >= 3:
        host = sys.argv[2]

    for attempt in range(1, 31):
        sock = socket.create_connection((host, port))
        try:
            recv_until(sock, b">>> ")
            sendline(sock, "2")

            data = recv_until(sock, b">>> ")
            m = re.search(rb"Please make (.+?) for me", data)
            if not m:
                print("[-] Failed to parse challenge message.")
                return
            msg = m.group(1).decode()
            print(f"[+] attempt {attempt} msg: {msg}")

            A, B, P, R, S = build_matrices(msg)
            payload = json.dumps({"A": A, "B": B, "P": P, "R": R, "S": S})
            sendline(sock, payload)

            out = recv_until(sock, b"\n")
            text = out.decode(errors="ignore")
            print(text)
            if "FLAG" in text:
                return
        finally:
            sock.close()


if __name__ == "__main__":
    main()
```

## thief

```cobol
import requests
import torch
import numpy as np
import base64
import io
from collections import OrderedDict
import time

# 靶机地址
url = "http://1.95.113.59:10003"

# 已知卷积层参数（来自 model_base.pth）
conv_weight = torch.tensor([[[[7., 1., 3.],
                              [5., 6., 8.],
                              [2., 9., 14.]]]])  # (1,1,3,3)
conv_bias = torch.tensor([2.])
conv1_weight = torch.tensor([[[[0.5, 1.3],
                               [5.1, 7.4]]]])    # (1,1,2,2)
conv1_bias = torch.tensor([6.])

def compute_f2(x):
    """输入图像 x (1,1,32,32)，返回经过 conv 和 conv1 后的 256 维特征"""
    x_pad = torch.nn.functional.pad(x, (2, 0, 2, 0), mode='constant', value=0)
    f1 = torch.nn.functional.conv2d(x_pad, conv_weight, bias=conv_bias, stride=1)
    f2 = torch.nn.functional.conv2d(f1, conv1_weight, bias=conv1_bias, stride=2)
    return f2.view(-1)

def main():
    # 尝试收集 400 次请求，留出余量
    total_attempts = 400
    f2_list = []
    y_list = []
    success_count = 0

    session = requests.Session()
    print(f"开始向 {url}/predict 发送请求收集数据...")

    for i in range(total_attempts):
        try:
            # 生成随机输入图像
            img = np.random.randn(1, 1, 32, 32).astype(np.float32)
            payload = {'image': img.tolist()}

            # 发送请求，设置超时
            resp = session.post(url + '/predict', json=payload, timeout=5)

            if resp.status_code != 200:
                print(f"请求 {i} 失败 (HTTP {resp.status_code}): {resp.text[:50]}")
                continue

            # 解析响应
            result = resp.json()
            if 'prediction' not in result:
                print(f"请求 {i} 返回格式异常: {result}")
                continue

            y = result['prediction']
            y_tensor = torch.tensor(y)

            # 本地计算 f2
            x_tensor = torch.tensor(img)
            f2 = compute_f2(x_tensor)

            f2_list.append(f2.numpy())
            y_list.append(y_tensor.numpy())
            success_count += 1

            if success_count % 50 == 0:
                print(f"已成功收集 {success_count} 个样本")

        except requests.exceptions.RequestException as e:
            print(f"请求 {i} 网络异常: {e}")
            time.sleep(1)  # 网络问题稍等再继续
        except Exception as e:
            print(f"请求 {i} 未知异常: {e}")

    print(f"\n收集完成，共成功 {success_count} 个样本。")

    if success_count < 257:  # 至少需要 257 个样本（256维 + 常数项）
        print(f"错误：样本不足（需要至少257个，实际只有{success_count}个），无法可靠求解。")
        return

    # 构建矩阵
    F = np.array(f2_list).T          # (256, success_count)
    Y = np.array(y_list).T            # (256, success_count)

    # 增加一行常数项用于求解偏置
    F_aug = np.vstack([F, np.ones((1, success_count))])  # (257, success_count)

    # 最小二乘法求解 W 和 b
    print("正在求解线性层参数...")
    Wb = np.linalg.lstsq(F_aug.T, Y.T, rcond=None)[0]  # (257, 256)
    W = Wb[:256, :].T   # 256x256
    b = Wb[256, :]      # 256

    print("求解完成。")

    # 构造完整的 state_dict
    state_dict = OrderedDict()
    state_dict['linear.weight'] = torch.tensor(W, dtype=torch.float32)
    state_dict['linear.bias'] = torch.tensor(b, dtype=torch.float32)
    state_dict['conv.weight'] = conv_weight
    state_dict['conv.bias'] = conv_bias
    state_dict['conv1.weight'] = conv1_weight
    state_dict['conv1.bias'] = conv1_bias

    # 保存为 pth 并编码为 base64
    buffer = io.BytesIO()
    torch.save(state_dict, buffer)
    buffer.seek(0)
    model_b64 = base64.b64encode(buffer.read()).decode('utf-8')

    # 提交获取 flag
    print("正在提交模型到 /flag 接口...")
    flag_payload = {'model': model_b64}
    try:
        resp = session.post(url + '/flag', json=flag_payload, timeout=10)
        print("服务器响应：", resp.text)
    except Exception as e:
        print(f"提交失败: {e}")

if __name__ == '__main__':
    main()
```

#声明：本WP综合了部分AI及他人构思，由于传播、利用本博客所提供的信息而造成的任何直接或者间接的后果及损失，均由使用者本人负责。
