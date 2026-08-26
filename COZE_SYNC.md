# Coze 定时同步保卫处官网方案

目标：让智能体定期学习南开大学保卫处官网内容，并且回答时能标注发布日期和来源链接。

## 推荐架构

不要做“定时训练模型”，而是做“定时同步知识库”。

流程：

1. 定时访问保卫处官网栏目页。
2. 发现新通知、制度或政策页面。
3. 抓取标题、发布日期、来源链接、正文和附件链接。
4. 生成 `data/guard_policy_sync/coze_knowledge.md`。
5. 将这个文件接入 Coze 知识库。
6. 智能体回答时只基于知识库和官网白名单来源回答。

当前同步入口：

- 通知公告：https://guard.nankai.edu.cn/10127/listm.htm
- 法规制度：https://guard.nankai.edu.cn/10122/list.htm
- 国家安全法律法规：https://guard.nankai.edu.cn/10131/list.htm
- 学校安全规章制度：https://guard.nankai.edu.cn/10132/list.htm

## 本地手动同步

双击运行，默认同步最近 30 篇官网文章：

```bat
sync-guard-policy.bat
```

生成文件：

- `data/guard_policy_sync/coze_knowledge.md`：上传到 Coze 知识库用。
- `data/guard_policy_sync/articles.jsonl`：结构化记录，方便以后接 API。
- `data/guard_policy_sync/articles.md`：人工检查清单。
- `data/guard_policy_sync/manifest.json`：同步时间和来源说明。

## Windows 定时同步

1. 打开“任务计划程序”。
2. 选择“创建基本任务”。
3. 名称填写：`南开保卫处官网同步`。
4. 触发器选择“每天”，建议设为每天早上 7:30。
5. 操作选择“启动程序”。
6. 程序填写：

```text
C:\Users\Lenovo\Documents\Nankai Security Guard\sync-guard-policy.bat
```

7. 保存后，右键任务，点“运行”测试一次。

## Coze 知识库配置

在 Coze 智能体后台：

1. 进入智能体编辑页。
2. 打开“知识库”。
3. 新建知识库，例如：`南开保卫处官网政策知识库`。
4. 上传 `data/guard_policy_sync/coze_knowledge.md`。
5. 如果 Coze 支持网页数据源和定时更新，可以直接添加上面的官网栏目 URL，并开启定时更新。
6. 如果 Coze 暂时只能手动上传文件，就先用本脚本自动生成文件，再定期上传；后续再接 Coze 知识库 API。

## 智能体提示词建议

把下面这段加入智能体的角色设定或知识库使用规则：

```text
你是南开大学校园安全政策助手。回答校园安全、交通、门禁、消防、无人机、电动车、治安、国家安全等问题时，必须优先检索“南开保卫处官网政策知识库”。

回答必须包含：
1. 结论；
2. 政策依据；
3. 发布日期；
4. 来源链接。

如果知识库没有检索到明确规定，不要编造。应回答：“未在保卫处官网知识库中检索到明确规定，建议联系保卫处确认。”

遇到多个版本的规定时，优先采用发布日期最新的官网内容，并提醒用户以官网最新通知为准。

不要使用非南开大学官网、非南开新闻网、非南开大学保卫处官网的信息作为校内政策依据。
```

## 后续全自动接入

如果要做到“官网更新后自动写入 Coze 知识库”，还需要：

- Coze 开放平台访问令牌；
- 知识库 ID；
- 文档新增/更新接口权限；
- 一台长期运行的电脑、服务器，或 GitHub Actions 定时任务。

拿到这些信息后，可以把 rticles.jsonl 自动上传到 Coze 知识库，不再需要手工上传 Markdown 文件。sync-guard-policy.bat 默认抓最近 30 篇；如需全量历史同步，可手动运行 python scripts\guard_policy_sync.py --output data\guard_policy_sync_full。

