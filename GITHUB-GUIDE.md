# FixBug Studio — Git 与 GitHub 操作手册

> 仓库地址：https://github.com/kuangxingye-design/FixBug-Studio
> 当前状态：空仓库
> 开发者：单人

---

## 1. 环境准备

### 1.1 确认 Git 已安装

```bash
git --version
# 期望输出：git version 2.x.x
```

如未安装，去 https://git-scm.com 下载安装。

### 1.2 配置 Git 用户信息

```bash
git config --global user.name "kuangxingye"
git config --global user.email "你的邮箱@example.com"
```

> 这个邮箱要和 GitHub 账号关联的邮箱一致，否则提交不计入贡献图。

### 1.3 配置 GitHub 认证（推荐 SSH）

```bash
# 1. 生成 SSH 密钥（如果还没有）
ssh-keygen -t ed25519 -C "你的邮箱@example.com"
# 一路回车即可

# 2. 复制公钥
cat ~/.ssh/id_ed25519.pub

# 3. 打开 https://github.com/settings/keys
#    New SSH Key，粘贴公钥，Title 随便起

# 4. 测试连接
ssh -T git@github.com
# 期望输出：Hi kuangxingye-design! You've successfully authenticated...
```

---

## 2. 初始化项目并推送

### 2.1 关联远程仓库

你当前在 `E:/2512workspace/blog`，已经有一些文件了。把它初始化为 Git 仓库：

```bash
# 进入项目目录
cd E:/2512workspace/blog

# 初始化本地 Git 仓库
git init

# 关联远程仓库（SSH 方式，推荐）
git remote add origin git@github.com:kuangxingye-design/FixBug-Studio.git

# 验证关联成功
git remote -v
# 期望输出：
# origin  git@github.com:kuangxingye-design/FixBug-Studio.git (fetch)
# origin  git@github.com:kuangxingye-design/FixBug-Studio.git (push)
```

### 2.2 创建 .gitignore 文件

新建 `.gitignore`：

```
# 依赖
node_modules/
.pnp
.pnp.js

# 构建输出
.next/
dist/
build/
out/

# 环境变量
.env
.env.local
.env.*.local

# 数据库文件
*.db
*.db-journal
*.sqlite

# 上传文件（本地开发）
uploads/

# IDE
.idea/
.vscode/
*.swp
*.swo
*~

# OS
.DS_Store
Thumbs.db

# 日志
logs/
*.log
npm-debug.log*

# Docker
.docker/

# 测试覆盖率
coverage/

# TypeScript 编译缓存
*.tsbuildinfo
next-env.d.ts
```

### 2.3 首次提交并推送

```bash
# 查看有哪些文件会被提交
git status

# 添加所有文件到暂存区
git add .

# 确认一下有没有敏感文件被误加（比如 .env 如果有的话）
git status

# 首次提交
git commit -m "chore: init FixBug Studio project

- 需求规格说明书 v1.1
- Git 操作手册
- 技术选型：TypeScript + Fastify + Next.js + SQLite

Co-Authored-By: Claude <noreply@anthropic.com>"

# 设置主分支名为 main
git branch -M main

# 推送
git push -u origin main
```

如果推送成功，打开 https://github.com/kuangxingye-design/FixBug-Studio 就能看到文件了。

---

## 3. 日常开发流程（单人）

作为唯一开发者，不需要复杂的 Git Flow。推荐这个简单流程：

### 3.1 分支策略

```
main ──────────────────────────────●──●──●── 保持稳定，随时可部署
       \                           /
        feature/xxx ──●──●──●──●──  开发新功能时从这里分支
```

- **main 分支**：稳定版本，保护起来不允许直接推送（后面会说明怎么设）
- **feature/xxx 分支**：每个功能或需求在一个独立分支上开发，完成后合并回 main

### 3.2 开发一个新功能（标准流程）

以"搭建项目骨架"为例：

```bash
# 1. 确保在 main 且是最新的
git checkout main
git pull origin main

# 2. 从 main 创建功能分支（命名规范见 3.3）
git checkout -b feature/project-scaffold

# 3. 写代码...写代码...写代码...

# 4. 查看改了什么
git status
git diff

# 5. 小步提交（不要攒一大堆一起提交）
git add src/some-file.ts
git commit -m "feat: add Fastify server setup"

git add src/database.ts
git commit -m "feat: add SQLite database connection"

# 6. 推送到 GitHub（养成习惯，下班前 push）
git push -u origin feature/project-scaffold

# 7. 继续开发，随时 push
git add .
git commit -m "feat: add user registration API"
git push

# 8. 功能开发完成，去 GitHub 创建 Pull Request
```

### 3.3 分支命名规范

| 类型 | 格式 | 示例 |
|------|------|------|
| 新功能 | `feature/功能名` | `feature/comment-system` |
| 修 Bug | `fix/问题描述` | `fix/markdown-render-error` |
| 重构 | `refactor/模块名` | `refactor/auth-module` |
| 文档 | `docs/内容` | `docs/api-documentation` |
| 部署相关 | `chore/内容` | `chore/docker-setup` |

### 3.4 提交信息规范

采用 [Conventional Commits](https://www.conventionalcommits.org/)：

```bash
git commit -m "feat: 添加文章标签筛选功能"
git commit -m "fix: 修复 Markdown 代码块渲染空白问题"
git commit -m "refactor: 抽取鉴权中间件为独立模块"
git commit -m "docs: 补充 API 接口文档"
git commit -m "chore: 配置 Docker 部署文件"
git commit -m "style: 调整文章列表卡片间距"
```

格式：`类型: 简短描述`

| 类型 | 用途 |
|------|------|
| `feat` | 新功能 |
| `fix` | 修 Bug |
| `refactor` | 重构（不改变功能） |
| `docs` | 文档 |
| `chore` | 杂项（构建、部署、依赖） |
| `style` | 样式调整 |
| `test` | 测试相关 |
| `perf` | 性能优化 |

---

## 4. Pull Request 流程（单人用法）

你一个人开发，但**建议坚持用 PR**。原因：

- 强迫自己在合并前再检查一遍
- 把 PR 描述当成"这个改动的设计文档"
- 代码记录清晰，半年后回来看能知道自己当时干了什么
- 哪天有第二个人加入，流程已经是现成的

### 4.1 创建 PR

1. push 分支后，打开 GitHub 仓库页面
2. GitHub 会在顶部出现黄色提示条 "feature/xxx had recent pushes"
3. 点击 **Compare & pull request** 按钮
4. 填写 PR 信息（模板见下方）
5. 点 **Create pull request**

### 4.2 PR 描述模板

创建一个 `.github/PULL_REQUEST_TEMPLATE.md` 文件放在仓库中：

```markdown
## 做了什么

<!-- 简要描述这个 PR 做了什么改动 -->

## 关联需求

<!-- 关联 REQUIREMENTS.md 中的需求编号，如 F-01, F-08 -->

## 截图（如有 UI 改动）

<!-- 拖入截图 -->

## 部署检查

- [ ] 本地 `npm run dev` 正常启动
- [ ] `npm run build` 无报错
- [ ] 新功能基本测试通过
- [ ] 数据库迁移无问题（如有）

## 备注

<!-- 任何需要额外说明的内容 -->
```

### 4.3 审查与合并

作为单人开发者，"审查"就是你自己再扫一眼：

1. 打开 PR 页面，点 **Files changed** 标签
2. 逐文件浏览改动，确认没有写错的东西、没有遗留的调试代码
3. 确认没问题后，点 **Merge pull request** → **Confirm merge**
4. 合并方式选择：
   - **Squash and merge**（推荐）：把一个分支的所有提交压缩成一个干净的提交，main 分支历史整洁
   - **Merge commit**：保留所有分支提交历史，适合需要保留详细过程的场景

### 4.4 清理分支

合并后：

```bash
# 切换到 main 并拉取最新
git checkout main
git pull origin main

# 删除本地功能分支
git branch -d feature/project-scaffold

# 删除远程功能分支（GitHub PR 合并后通常有按钮一键删除）
git push origin --delete feature/project-scaffold
```

---

## 5. 分支保护设置（重要）

### 5.1 保护 main 分支

防止手滑直接推送到 main，强制通过 PR 合并：

1. 打开仓库 → **Settings** → **Branches**
2. 点击 **Add branch protection rule**
3. **Branch name pattern** 填写 `main`
4. 勾选以下选项：

| 选项 | 说明 |
|------|------|
| ✅ Require a pull request before merging | 必须通过 PR 才能合并 |
| ✅ Require approvals (设为 0) | 单人开发设 0，无需审批 |
| ✅ Dismiss stale pull request approvals when new commits are pushed | 有新提交时旧的审批失效 |
| ✅ Require status checks to pass before merging | 等 CI 跑完才能合并（配了 CI 后再开） |

5. 点 **Create** 保存

设置之后，你就不能 `git push origin main` 了，必须走分支 + PR 流程，代码更安全。

---

## 6. 常见场景速查

### 场景一：写了一半，需要紧急修 bug

```bash
# 暂存当前工作
git stash push -m "WIP: 文章发布功能写了一"

# 从 main 切 fix 分支
git checkout main
git checkout -b fix/critical-bug

# 修 bug...提交...合并...

# 回来继续
git checkout feature/article-publish
git stash pop
```

### 场景二：提交信息写错了

```bash
# 修正最近一次提交的信息
git commit --amend -m "feat: 修正后的提交信息"
# 如果已经 push 了，需要强制推送（仅限你自己的分支！）
git push --force-with-lease
```

> 永远不要对 main 分支执行 force push。

### 场景三：不小心提交了不该提交的文件

```bash
# 如果还没 push
git reset HEAD~1        # 撤销提交，文件保留在暂存区
git reset --soft HEAD~1  # 撤销提交，文件保留在修改区
# 调整后重新提交

# 如果已经 push 了（自己的分支）
git reset HEAD~1
# 重新整理
git add 正确的文件
git commit -m "feat: 新的提交信息"
git push --force-with-lease
```

### 场景四：合并时冲突了

```bash
# 在 feature 分支上
git checkout main
git pull origin main
git checkout feature/xxx
git merge main

# 如果有冲突，Git 会提示哪些文件冲突
# 打开冲突文件，找到 <<<<<<< 和 >>>>>>> 标记
# 手动解决，保留需要的内容，删除标记

# 解决后
git add 冲突文件
git commit -m "chore: 解决与 main 的合并冲突"
git push
```

---

## 7. 本地开发常用命令

```bash
# 查看提交历史（简洁版）
git log --oneline --graph --all

# 查看某个文件是谁在什么时候改的
git blame src/some-file.ts

# 对比当前改动
git diff              # 工作区 vs 暂存区
git diff --staged     # 暂存区 vs 上次提交

# 撤销文件修改（还没 git add 的）
git checkout -- 文件名

# 撤销 git add（从暂存区移除）
git reset HEAD 文件名

# 查看远程分支列表
git branch -r

# 清理已合并的本地分支
git branch --merged | grep -v "main" | xargs git branch -d
```

---

## 8. 检查清单

初始化完成前，确认以下事项：

- [ ] Git 用户信息已配置
- [ ] SSH Key 已添加到 GitHub
- [ ] 本地仓库已 `git init` 并关联远程
- [ ] `.gitignore` 已创建
- [ ] 首次提交已 push 到 GitHub
- [ ] main 分支保护已开启
- [ ] PR 模板已创建在 `.github/PULL_REQUEST_TEMPLATE.md`

---

> 这份手册会随项目演进持续更新。核心原则：**小步提交、分支开发、PR 合并、main 保持可部署。**
