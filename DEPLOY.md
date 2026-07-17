# 公网部署说明

这个项目是纯静态网页，适合部署到 GitHub Pages、Vercel、学校服务器或任意静态网站服务器。

## 推荐方案：GitHub Pages

### 1. 准备 GitHub 仓库

1. 打开 https://github.com
2. 登录你的账号。
3. 新建仓库，例如：`nankai-security-guard`
4. 建议先设为 Public。GitHub Free 账号发布 Pages 时，公开仓库最省事。

### 2. 上传项目文件

上传这些文件到仓库根目录：

- `index.html`
- `styles.css`
- `app.js`
- `README.md`
- `.nojekyll`

`server.js`、`package.json`、`start-website.bat` 是本地运行用的，上传也可以，但 GitHub Pages 真正需要的是前面几个静态文件。

### 3. 开启 GitHub Pages

1. 进入仓库页面。
2. 点击 `Settings`。
3. 左侧点击 `Pages`。
4. Source 选择 `Deploy from a branch`。
5. Branch 选择 `main`，Folder 选择 `/root`。
6. 点击 `Save`。

等待几分钟后，会出现公网网址，通常类似：

```text
https://你的GitHub用户名.github.io/nankai-security-guard/
```

## 说明

- 这个网址所有人都可以访问。
- 每次改代码后，重新上传或推送到 GitHub，GitHub Pages 会自动更新。
- 如果你有学校服务器，也可以把 `index.html`、`styles.css`、`app.js` 放到服务器网站目录下。
