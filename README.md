# 南开安全卫士

这是一个响应式网页 Demo，用于展示“南开安全卫士”的核心功能：

- 政策问答/安全知识：根据综合题库关键词模拟安全知识问答。
- 安全答题：抽取题库题目，支持选择答案、判断对错、解释答案和累计得分。
- 隐患上报：保留可上线字段，当前为演示提交。
- 一键求助：展示保卫处电话 `022-123456`，当前为演示拨号。

## 公网入口

首页：

```text
https://huo2xini.github.io/nankai-security-guard/
```

安全知识：

```text
https://huo2xini.github.io/nankai-security-guard/knowledge.html
```

隐患上报：

```text
https://huo2xini.github.io/nankai-security-guard/report.html
```

一键求助：

```text
https://huo2xini.github.io/nankai-security-guard/help.html
```

## 在 IDEA 中打开

1. 打开 IntelliJ IDEA。
2. 选择 `Open`。
3. 选择这个文件夹：`C:\Users\Lenovo\Documents\Nankai Security Guard`。
4. 打开后可以直接查看 `index.html`、`styles.css`、`app.js`。

## 在 IDEA 中运行网站

你的电脑当前没有识别到 `npm`，所以请在 IDEA 的 Terminal 中运行：

```bat
start-website.bat
```

运行后打开：

```text
http://localhost:8000
```

## 后续上线方向

- 将问答模块接入飞书智能体和学校安全知识库。
- 将隐患上报写入飞书多维表格或后端数据库。
- 增加登录、权限、处置状态、统计看板和数据导出。
