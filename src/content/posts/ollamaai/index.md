---
title: (教程向)在Ollama客户端中安装AI模型
published: 2026-02-18 11:58:00
pinned: false
description: 在Ollama客户端中安装AI模型
tags: [AI, Ollama,Blogging]
category: 技术/教程向
licenseName: "Unlicensed"
author: xjhjtzac
sourceLink: "https://xjhjtz.github.io/0000002"
draft: false
date: 2026-02-18 11:58:00
pubDate: 2026-02-18 11:58:00
permalink: "0000002"
---
# 在Ollama客户端中安装AI模型
## 前言
 最近想要在本地部署AI大模型，我经过深思熟虑后决定使用Ollama客户端，主要是它拥有便捷的图形化界面，但是我发现，客户端原生的选择模型界面并没有我想要的模型，下面我们就以**deepseek-r1:7b**作为模型进行演示。
## 操作
### 1.下载Ollama客户端
  点击[这个网址](https://ollama.com/download)，进入Ollama官网，选择**Download for Windows**，下载完成后双击安装包，点击右下角"Install"，等待安装完成。
### 2.安装模型
需要注意的是，Ollama模型默认安装地址在
```
C:\Users\<用户名>\AppData\Roaming\Ollama\models
```
这里的用户名要改成你自己的电脑用户名
> 💡 小贴士：如何修改模型安装路径？
>
> 如果你的C盘空间不足，可以通过设置环境变量来修改默认的存储位置。
>
> 以管理员身份打开 Windows PowerShell。
>
> 输入以下命令，将 <你希望存放的文件夹路径> 替换成你实际想设置的路径，例如 D:\OllamaModels。请注意，这个路径必须是一个已存在的文件夹。
>```
>setx OLLAMA_MODELS "<你希望存放的文件夹路径>" /M
> ```
> 
>
> 命令执行成功后，重启你的电脑使设置生效。
>
> 这样设置后，以后下载的模型就会自动保存到你指定的新路径了。

### 2.1 使用Powershell命令行与Ollama官方源进行安装  

这里先引入一个指令
```
ollama run <模型名称>
```
这个指令的意思是运行模型，**填模型名称的时候记得把<>也删掉**!例如
```
ollama run deepseek-r1:7b
```
操作时，（这里就以上文的模型为例）
在powershell里输入
```
ollama run deepseek-r1:7b
```
这里的模型名称可以自己改，Ollama官方源的模型清单在[这里](https://ollama.com/library)。  
获取名称时，点击你要安装的模型，下滑找到"Models"一栏，鼠标悬停在名称上，你就会看到一个复制按钮，点击它即可复制。  

**注意**，模型的参数(b)越大，同一模型下的能力越强，但并不是越大越好，需要按照自己的电脑配置（显卡、内存、CPU、显卡的显存）来选择，我这里使用的是7B版本，切记不要选择参数特别大的模型！
  
  当出现类似于下面的提示时，说明安装成功
![图1.1](https://free.picui.cn/free/2026/02/18/699532a4c760d.png)
下载完成后，在Ollama客户端中选择你刚刚下载好的模型，**如下图**![图1.2](https://free.picui.cn/free/2026/02/18/699533a1857b7.png)
到这里，你的模型已经安装完成了。
### 2.2 使用Ollama客户端自带的下载按钮  

如上面的图，选择你想要的模型，点击下载按钮，注意不是一朵云形状的那个，等待下载成功，选择那个模型。
  
  ---
  全文完