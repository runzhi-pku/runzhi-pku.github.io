# RUNZHI 的个人主页

这是可放到 GitHub Pages 的完整网站源码。网站公开展示，日常内容通过 Pages CMS 编辑，保存后自动发布。

## 首次上线

1. 登录自己的 GitHub 账号，创建一个名为 `你的用户名.github.io` 的 **Public（公开）** 仓库。例如用户名是 `abc`，仓库名就是 `abc.github.io`。默认网址为 `https://abc.github.io`，实际可用用户名由 GitHub 决定。
2. 将本目录的内容放在仓库根目录。必须包含 `.github/workflows/pages.yml` 和 `.pages.yml`；有些文件管理器默认不显示这些以点开头的文件。不要把整个目录再嵌套一层。压缩包中的 `preview` 只是本地预览，可不提交。
3. 打开仓库 **Settings → Pages → Build and deployment → Source**，选择 **GitHub Actions**。
4. 在 **Actions → Publish personal website → Run workflow** 中运行一次，选择 `main` 分支。以后向 `main` 保存内容会自动发布。
5. 等待发布成功，在 **Settings → Pages** 查看正式网址。

无需购买独立域名。使用 GitHub Free 的公开仓库和 Pages 免费额度即可开始。GitHub Pages 和编辑后台在中国大陆的实际连通性尚未测试，不能承诺所有地区和运营商都稳定可用。

## 开通自己的编辑后台

打开 [Pages CMS](https://app.pagescms.org/)，使用自己持有网站仓库的 GitHub 账号登录。首次使用按提示安装 Pages CMS 的 GitHub App，只授权这个网站仓库即可。然后选择仓库和 `main` 分支。

这是 Pages CMS 自己的授权，与在 ChatGPT 中连接 GitHub 分开进行。不需要把 GitHub 密码或访问令牌写进网站。

编辑菜单分为三组：

- **个人信息与网站设置**：姓名、简介、头像、联系方式、网页标题、主题色、导航及页脚文字。
- **首页栏目**：增删、排序栏目，编辑标题、介绍、项目、标签、图片和链接；支持项目列表、图文卡片、文字和文件列表。
- **公开文件与下载**：上传文件，填写显示名称、介绍和日期，保存后出现在公开资料栏目。

访客浏览和下载无需登录。只有获得仓库写入权限或你另行授予编辑权限的账号能修改；保持仓库仅自己有写入权限，并且不邀请 Pages CMS 编辑者即可。

点击主页底部的“管理网站”也可以进入编辑入口。保存完成后通常需要几分钟发布；以仓库 Actions 中的结果为准。若构建失败，可点开失败记录查看原因，修正后再次保存；上一次成功发布的网站会继续保留。

## 文件与内容规则

- 这个方案使用公开仓库，源码和上传文件均可被他人查看。不要上传私人材料。关闭栏目或删除下载列表条目，不会使已经上传的文件变为私有；Git 历史中也可能保留旧版本。
- 当前网站程序设置单文件上限为 **25 MiB**。这只是本站的构建上限，上传仍受 GitHub 和 Pages CMS 的实际限制。大视频等内容可使用外部链接。
- 头像和栏目图片支持 PNG、JPEG、WebP、GIF、AVIF。文件保存在 `uploads` 中，支持中文名称和空格。
- 栏目地址用小写字母开头，可包含数字和短横线，不能重复，不能使用 `main` 或 `about`。
- 链接可以填 `https://...`、`mailto:邮箱地址`、`#research` 这样的站内栏目地址，或 `/uploads/文件名.pdf`。删除或隐藏栏目后，指向该栏目的按钮会自动隐藏。
- 原网站中的私人上传文件未包含在本迁移包中。

## 修改设计与本地生成

日常内容不需要改代码。你拥有全部源码，想进一步调整布局时，可编辑 `assets/site.css` 和 `scripts/build.mjs`。管理入口的说明文字也在 `scripts/build.mjs` 内。

安装 Node.js 22 后，在本目录运行：

```sh
node --test scripts/build.test.mjs
node scripts/build.mjs
```

生成结果在 `_site` 目录。双击 `_site/index.html` 可查看静态页面；正式网站的管理入口通过网络使用。压缩包附有 `preview/index.html`，可直接解压查看现成预览。预览文件不会随编辑后台更新，正式网站会自动重新生成。

目录说明：

| 路径 | 用途 |
| --- | --- |
| `content/site.json` | 个人信息与网站文字 |
| `content/home.json` | 首页栏目与项目 |
| `content/files.json` | 文件下载列表 |
| `uploads/` | 公开图片与文件 |
| `.pages.yml` | Pages CMS 编辑表单 |
| `.github/workflows/pages.yml` | GitHub Pages 自动发布 |
| `assets/site.css` | 页面样式 |
| `scripts/build.mjs` | 静态页面生成程序 |

公开页面不加载外部字体、脚本库或登录服务。中国大陆访问仍需在正式网址上线后实测。

官方说明：[GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages)、[自动发布工作流](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)、[Pages CMS 快速开始](https://pagescms.org/docs/quick-start/)。
