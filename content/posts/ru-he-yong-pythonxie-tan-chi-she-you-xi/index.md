---
title: "如何用python写贪吃蛇游戏"
date: 2023-10-13T23:58:06+08:00
draft: false
summary: "以下是参考代 import pygame from pygame.locals import \\ import random pygame. init 设置游戏窗口尺寸 window\\ width = 480 window\\ height = 480 window = pygame.display.set\\ mode window\\ width, windo"
slug: "ru-he-yong-pythonxie-tan-chi-she-you-xi"
originalId: 133819887
sourceUrl: "https://blog.csdn.net/BEICHENst/article/details/133819887"
categories:
  - "编程练习"
tags:
  - "python"
  - "游戏"
  - "pygame"
  - "CTF"
  - "网络安全"
  - "CSDN迁移"
featuredImage: "images/cover.png"
---
以下是参考代

import pygame from pygame.locals import \* import random pygame. init () # 设置游戏窗口尺寸 window\_width = 480 window\_height = 480 window = pygame.display.set\_mode((window\_width, window\_height)) pygame.display.set\_caption('贪吃蛇') # 定义颜色 white = (255, 255, 255) black = (0, 0, 0) red = (255, 0, 0) blue = (0, 0, 255) green = (0, 255, 0) # 设置字体 font\_style = pygame.font.SysFont(None, 30) # 定义蛇身和食物的大小 block\_size = 10 # 记录分数 def score(score): value = font\_style.render("Score: " + str(score), True, white) window.blit(value, \[0, 0\]) # 画出蛇的长度 def snake(block\_size, snakeList): for x in snakeList: pygame.draw.rect(window, green, \[x\[0\], x\[1\], block\_size, block\_size\]) # 提示文字 def message(msg, color): mesg = font\_style.render(msg, True, color) window.blit(mesg, \[window\_width / 6, window\_height / 3\]) # 开始游戏 def gameLoop(): game\_over = False game\_close = False # 蛇的初始位置 x1 = window\_width / 2 y1 = window\_height / 2 # 蛇每次移动的位置 x1\_change = 0 y1\_change = 0 # 蛇身列表 snakeList = \[\] Length\_of\_snake = 1 # 食物位置 foodx = round(random.randrange(0, window\_width - block\_size) / 10.0) \* 10.0 foody = round(random.randrange(0, window\_height - block\_size) / 10.0) \* 10.0 while not game\_over: while game\_close == True: window.fill(black) message("You Lost! Q-Quit or C-Play Again", red) score(Length\_of\_snake - 1) pygame.display.update() for event in pygame.event.get(): if event.type == KEYDOWN: if event.key == K\_q: game\_over = True game\_close = False if event.key == K\_c: gameLoop() for event in pygame.event.get(): if event.type == QUIT: game\_over = True if event.type == KEYDOWN: if event.key == K\_LEFT: x1\_change = -block\_size y1\_change = 0 elif event.key == K\_RIGHT: x1\_change = block\_size y1\_change = 0 elif event.key == K\_UP: y1\_change = -block\_size x1\_change = 0 elif event.key == K\_DOWN: y1\_change = block\_size x1\_change = 0 if x1 >= window\_width or x1 < 0 or y1 >= window\_height or y1 < 0: game\_close = True x1 += x1\_change y1 += y1\_change window.fill(black) # 画出食物 pygame.draw.rect(window, blue, \[foodx, foody, block\_size, block\_size\]) # 生成蛇身 snake\_Head = \[\] snake\_Head.append(x1) snake\_Head.append(y1) snakeList.append(snake\_Head) if len(snakeList) > Length\_of\_snake: del snakeList\[0\] # 判断是否吃到了食物 for eachSegment in snakeList\[:-1\]: if eachSegment == snake\_Head: game\_close = True # 绘制蛇身 snake(block\_size, snakeList) score(Length\_of\_snake - 1) pygame.display.update() if x1 == foodx and y1 == foody: foodx = round(random.randrange(0, window\_width - block\_size) / 10.0) \* 10.0 foody = round(random.randrange(0, window\_height - block\_size) / 10.0) \* 10.0 Length\_of\_snake += 1 pygame.display.update() pygame.quit() quit() gameLoop()
