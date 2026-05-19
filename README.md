# 和你的点点滴滴 - 520 浪漫相册 💕

一个浪漫主题的瀑布流相册网页，支持上传你和 TA 的照片，背景飘落爱心动画，营造温馨的 520 氛围。纯静态网页，无需后端。

## ✨ 功能特性

- 🖼️ **瀑布流相册**：照片以瀑布流形式优雅展示
- 📸 **照片上传**：支持从本地选择多张照片，自动压缩存储
- 💖 **爱心动画**：飘落的爱心背景，浪漫氛围拉满
- 🔍 **大图预览**：点击照片可放大查看（Lightbox）
- 💾 **本地存储**：照片保存在浏览器 LocalStorage 中，刷新不丢失
- 📤 **导出/导入**：一键备份和恢复你的照片数据
- 📱 **移动端适配**：完美适配 iOS / Android 手机浏览器
- 🏠 **添加到主屏幕**：iOS Safari 可作为 PWA 添加到桌面

## 🎨 技术栈

- 纯 HTML5 + CSS3 + 原生 JavaScript（无任何框架依赖）
- LocalStorage 本地存储
- CSS3 Animation + Transform 动画
- Touch Events 触摸交互

## 🗂️ 项目结构

```
.
├── index.html              # 主页面
├── css/
│   ├── style.css          # 全局样式
│   ├── masonry.css        # 瀑布流样式
│   └── animations.css     # 动画效果
├── js/
│   ├── PhotoManager.js    # 照片管理（存储/压缩/增删）
│   ├── MasonryAlbum.js    # 瀑布流相册渲染
│   ├── Lightbox.js        # 大图预览
│   ├── HeartAnimation.js  # 爱心动画
│   └── main.js            # 应用入口
└── README.md
```

## 🚀 本地运行

不要直接双击 `index.html`，请用 HTTP 服务器启动。任选一种：

**方式一：Python**
```bash
cd 项目目录
python -m http.server 8000
```

**方式二：Node.js**
```bash
npx http-server -p 8000 -c-1
```

然后浏览器打开 `http://localhost:8000`。

## 🌐 部署到 GitHub Pages

让任何人都能在线访问你的相册，只需 3 步：

### 1. 在 GitHub 新建仓库
- 登录 GitHub → 右上角 `+` → New repository
- 仓库名建议英文，比如 `love-album`
- 选择 **Public**，**不要**勾选 "Add a README"

### 2. 推送代码
在项目目录打开终端：

```bash
git init
git branch -M main
git add .
git commit -m "520 浪漫相册"
git remote add origin https://github.com/你的用户名/love-album.git
git push -u origin main
```

### 3. 开启 Pages
- 进入仓库 → **Settings** → 左侧 **Pages**
- Source 选 `Deploy from a branch`
- Branch 选 `main`，文件夹选 `/ (root)`，保存
- 等 1-2 分钟，页面上会显示你的网址：

```
https://你的用户名.github.io/love-album/
```

把这个链接发给 TA 就行 💝

### 后续更新

改完代码后：
```bash
git add .
git commit -m "更新内容"
git push
```

## 📖 使用说明

- **添加照片**：点击「添加照片」按钮，从本地选择图片
- **查看大图**：点击任意照片放大预览
- **设置**：点击「设置」按钮，可以：
  - 开关背景爱心动画
  - 导出数据（备份成 JSON 文件）
  - 导入数据（从 JSON 文件恢复）
  - 清空所有照片

## 💾 数据存储说明

所有照片以 base64 编码存储在浏览器的 LocalStorage 中：

- ✅ 完全本地，不上传任何服务器
- ⚠️ 容量限制约 5-10 MB，建议适量上传
- ⚠️ 清除浏览器缓存会导致照片丢失，**记得定期导出备份**
- ℹ️ 不同浏览器 / 设备之间的数据不互通

## 📝 注意事项

1. **隐私**：用户自己上传的照片**只存在自己的浏览器里**，不会上传到任何服务器。
2. **想让 TA 打开就看到你的照片？** → 直接把照片放进 `images/` 文件夹，并在 `images/manifest.json` 里列出文件名，详见 [`images/README.md`](./images/README.md)。**项目内置照片对每个访问者都可见**。
3. **图片格式**：支持 JPEG / PNG / WebP / GIF 等常见格式。
4. **响应式**：在手机、平板、电脑上都能正常显示。

## 🖼️ 自定义展示照片（重点）

```
images/
  ├── manifest.json      # 在 photos 数组里列出文件名
  ├── 你的照片1.jpg
  └── 你的照片2.png
```

- 项目内置照片会自动出现在每个访问者的相册里
- 改 `manifest.json` 后，**用户刷新就能看到新照片**（自动同步，不会丢失访客自己上传的内容）
- 详细操作见 [`images/README.md`](./images/README.md)

## 💖 致谢

- 灵感：520 浪漫节日
- 制作：用爱构建 ❤️

---

**愿你和 TA 的故事，被温柔地保存。** 💕
