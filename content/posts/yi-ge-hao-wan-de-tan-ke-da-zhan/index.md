---
title: "一个好玩的坦克大战"
date: 2023-11-08T13:50:55+08:00
draft: false
summary: "int x, y;bool over;int score;int i, j;for (i = 0;++i)score = 0;for (i = 0;i < snakeX;++i)for (i = 0;++i)for (i = 0;i < border;++i)++i)for (i = 0;i < border;++i)++i)drawBody();"
slug: "yi-ge-hao-wan-de-tan-ke-da-zhan"
originalId: 134287794
sourceUrl: "https://blog.csdn.net/BEICHENst/article/details/134287794"
categories:
  - "编程练习"
tags:
  - "c语言"
  - "游戏"
  - "CTF"
  - "网络安全"
  - "CSDN迁移"
---
#include <stdlib.h>

#include < string .h>

#include <time.h>

#include <stdio.h>

#include < math .h>

#include <iostream>

#include < windows .h>

using namespace std;

enum { RIGHT, LEFT, UP, DOWN, STOP };

enum { X, Y };

struct Point

{

    int x, y;

    Point() { x = Y = 0; }

    Point(int x, int y) { this \->x = x, this->y = y; }

};

const int width = 32;

const int height = 32;

const int cellW = 10;

const int cellH = 10;

const int cellX = (cellW - width) / 2;

const int cellY = (cellH - height) / 2;

const int foodW = 5;

const int foodH = 5;

const int foodX = (cellW - foodW) / 2;

const int foodY = (cellH - foodH) / 2;

const int border = 10;

const int maxBody = 100;

const int maxFood = 10;

const int maxTry = 3;

const int snakeX = 5;

const int snakeY = 5;

int snake \[maxBody\]\[X Y\];

int direction, tryCount;

bool key\[4\];

bool food\[maxFood\]\[X Y\];

bool wall\[maxSize\]\[Y\];

bool over;

int score;

void init()

{

    int i, j;

    for (i = 0; i < maxBody; ++i)

    {

        snake\[i\]\[X\] = snake\[i\]\[Y\] = 0;

    }

    snake\[0\]\[X\] = snakeX;

    snake\[0\]\[Y\] = snakeY;

    direction = RIGHT;

    tryCount = 0;

    over = false;

    score = 0;

    memset(key, false, sizeof(key));

    memset(food, false, sizeof(food));

    memset(wall, false, sizeof(wall));

}

void setWall(int x, int y)

{

    wall\[x\]\[y\] = true;

}

bool isWall(int x, int y)

{

    return wall\[x\]\[y\];

}

void setFood(int x, int y)

{

    food\[x\]\[y\]\[X\] = food\[x\]\[y\]\[Y\] = false;

}

bool isFood(int x, int y)

{

    return food\[x\]\[y\]\[X\] || food\[x\]\[y\]\[Y\];

}

void setKey(int x, int y, bool value)

{

    key\[x\]\[y\] = value;

}

bool isKey(int x, int y)

{

    return key\[x\]\[y\];

}

void drawBody()

{

    int x, y, i;

    for (i = 0; i < snakeX; ++i)

    {

        x = snake\[i\]\[X\];

        y = snake\[i\]\[Y\];

        draw(x + border, y + border, " ", 255, 255, 255);

    }

}

void drawFood()

{

    int x, y, i;

    for (i = 0; i < maxFood; ++i)

    {

        if (isFood(i, snakeX))

        {

            x = i \* cellW + foodX + border;

            y = snakeX \* cellH + foodY + border;

            draw(x, y, " ", 255, 255, 255);

        }

    }

}

void drawBorder()

{

    int x, y, i;

    for (i = 0; i < border; ++i)

    {

        x = i \* cellW + cellX;

        y = i \* cellH + cellY;

        draw(x, y, "-", 255, 255, 255);

    }

    for (i = (GetSizeWidth() / cellW) \* cellW; i < GetSizeWidth(); ++i)

    {

        x = i \* cellW + cellX;

        y = i \* cellH + cellY;

        draw(x, y, "-", 255, 255, 255);

    }

    for (i = 0; i < border; ++i)

    {

        x = i \* cellW;

        y = i \* cellH + (cellH - 1) \* cellH + cellY;

        draw(x, y, "|", 255, 255, 255);

    }

    for (i = (GetSizeHeight() / cellH) \* cellH; i < GetSizeHeight(); ++i)

    {

        x = i \* cellW + (cellW - 1) \* cellW + cellX;

        y = i \* cellH + cellY;

        draw(x, y, "|", 255, 255, 255);

    }

}

void draw()

{

    drawBorder();

    drawBody();

    drawFood();

    drawText(10, 10, "Snake", 255, 255, 255);

    drawText(10, 30, "Direction", 255, 255, 255);

    drawText(10, 50, "TryCount", 255, 255, 255);

    drawText(10, 70, "Score", 255, 255, 255);

    drawText(10, 90, "Over", 255, 255, 255);

}

void update()

{

    int i, j, k;

    for (i = 0; i < snakeX; ++i)

    {

        for (j = 0; j < snakeY; ++j)

        {

            k = snake\[i\]\[j\]\[X\] \* snakeY + snake\[i\]\[j\]\[Y\];

            if (isWall(i, j) || isKey(i, j) || (k < maxBody && i == snake\[k\]\[X\] && j == snake\[k\]\[Y\]))

            {

                over = true;

                break;

            }

        }

        if (over)

        {

            break;

        }

    }

    if (!over)

    {

        ++tryCount;

        if (tryCount > maxTry)

        {

            over = true;

        }

        else

        {

            ++snake\[i\]\[j\]\[X\];

            if (snake\[i\]\[j\]\[X\] > snakeX)

            {

                snake\[i\]\[j\]\[X\] = 0;

                ++snake\[i\]\[j\]\[Y\];

                if (snake\[i\]\[j\]\[Y\] > snakeY)

                {

                    over = true;

                }

            }

        }

        if (isFood(i, j))

        {

            --tryCount;

            ++score;

        }

    }

    else

    {

        do

        {

            init ();

        } while (true);

    }

}

void logic()

{

    int x, y;

    while (PeekMessage(&msg, 0, 0, 0, PM\_NOREMOVE))

    {

        if (!IsDialogMessage(&msg))

        {

            TranslateMessage(&msg);

            DispatchMessage(&msg);

        }

    }

    x = GET\_X\_LPARAM(mouse\_position);

    y = GET\_Y\_LPARAM(mouse\_position);

    switch (direction)

    {

    case STOP:

        break;

    case LEFT:

        if (x < border && y > border && y < GetSizeHeight() - border)

        {

            SetKey(x \* cellW + cellX, y \* cellH + cellY + border, !isKey(x, y));

            setWall(x, y);

            direction = STOP;

        }

        break;

    case RIGHT:

        if (x > border && x < GetSizeWidth() - border && y > border && y < GetSizeHeight() - border)

        {

            SetKey((x - 1) \* cellW + cellX, y \* cellH + cellY + border, !isKey(x, y));

            setWall(x, y);

            direction = STOP;

        }

        break;

    case UP:

        if (x > border && x < GetSizeWidth() - border && x > border && y < GetSizeHeight() - border)

        {

            SetKey(x \* cellW + cellX, (y - 1) \* cellH + cellY + border, !isKey(x, y));

            setWall(x, y);

            direction = STOP;

        }

        break;

    case DOWN:

        if (x < border && y > border && x < GetSizeWidth() - border)

        {

            SetKey((x - 1) \* cellW + cellX, y \* cellH + cellY + border, !isKey(x, y));

            setWall(x, y);

            direction = STOP;

        }

        break;

    }

}

int main()

{

    HINST hInstance = NULL;

    MSG msg;

    init();

    hInstance = GetModuleHandle(NULL);

    memset(&msg, 0, sizeof(msg));

    while (!over)

    {

        logic();

        draw();

        UpdateWindow(GetActiveWindow());

        Sleep(10);

        while (PeekMessage(&msg, hInstance, 0, 0, PM\_NOREMOVE))

        {

            TranslateMessage(&msg);

            DispatchMessage(&msg);

        }

    }

    draw(255, 255, 255);

    UpdateWindow(GetActiveWindow());

    return msg.wParam;

}
