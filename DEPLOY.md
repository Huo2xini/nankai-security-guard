# 部署说明

当前网页端只保留真正需要网页承载的页面：

- index.html：仅用于根路径自动跳转到 knowledge.html，不作为首页展示。
- knowledge.html：安全答题与三角色学习模式。
- help.html：一键求助页面。
- editor.html：编辑员工作台。
- reviewer.html：审核员工作台。

政策问答由飞书机器人直接承载，隐患上报由飞书表单直接承载，网页端不再保留首页或对应中转页面。

静态部署到 GitHub Pages 时，上传 index.html、knowledge.html、help.html、styles.css、app.js、README.md、.nojekyll 以及 data 目录即可。若需要编辑员、审核员、学生登录记录和 MySQL 案例库生效，则必须运行 Node.js 后端，不能只依赖 GitHub Pages。
