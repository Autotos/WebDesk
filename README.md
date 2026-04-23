# WebDesk - Web Desktop System

WebDesk 是一个基于 Web 技术构建的**前后端分离**跨平台桌面模拟系统。前端使用 React + TypeScript，后端使用 Node.js + Express 提供真实文件系统 API。系统能根据浏览器窗口宽度自动切换 **macOS 风格桌面** 和 **Android 风格桌面**，提供接近原生操作系统的交互体验。

## 架构概览

```
浏览器 (React SPA)
  │
  │  fetch("/api/fs/...")
  │
  ▼
Vite Dev Proxy ──► Express Server (port 3001)
                       │
                       ▼
                   Node.js fs 模块
                       │
                       ▼
                  本地文件系统 (ROOT_DIR 沙箱)
```

- **前端**：React SPA，所有文件操作通过 `fetch` 调用后端 REST API
- **后端**：Express 服务器，提供文件系统 CRUD 操作，路径沙箱安全机制
- **开发代理**：Vite `server.proxy` 将 `/api` 请求转发到后端

## 功能概览

### 双平台自适应

- **桌面端 (>= 768px)** -- macOS 风格：顶部菜单栏、多窗口管理、底部 Dock 栏
- **移动端 (< 768px)** -- Android 风格：状态栏、应用网格、底部导航、底部弹出式应用

系统通过 `window.matchMedia` 实时监听窗口宽度变化，无缝切换两种 UI 模式。

### macOS 桌面

| 功能 | 说明 |
|------|------|
| 顶部菜单栏 | 显示 Apple 图标、当前应用名称、系统状态图标、实时时间 |
| 窗口管理 | 自由拖拽、8 方向缩放、最大化/最小化/关闭、z-index 层级管理 |
| Dock 栏 | 鼠标悬停图标放大效果 (Framer Motion)、点击启动应用弹跳动画 |
| 多窗口 | 支持同时打开多个应用窗口，点击聚焦切换前台 |

### Android 桌面

| 功能 | 说明 |
|------|------|
| 状态栏 | 显示时间、信号、电量等模拟信息 |
| 应用网格 | 4 列布局，支持左右滑动翻页 |
| 底部导航 | 快速启动常用应用 |
| 底部弹出 | 应用以全屏底部弹出的方式打开，支持手势下拉关闭 |

---

## 内置应用

### Finder (文件管理器)

完整的文件浏览器，通过后端 API 访问服务器上的**真实文件系统**。

**核心功能:**

- 通过 REST API 浏览 `ROOT_DIR` 沙箱内的真实目录和文件
- 支持完整的 CRUD 操作：新建文件/文件夹、重命名、删除
- 文本文件在线编辑和保存
- 图片文件预览（通过 `/api/fs/file/*` 二进制端点）
- 任意文件下载

**macOS Finder 特有功能:**

- 左侧快捷收藏栏 (Favorites: Desktop, Documents, Downloads, Pictures, Music)
- 网格视图 / 列表视图切换
- 右侧文件预览面板 (图片缩放、文本高亮)
- 面包屑路径导航
- 右键上下文菜单

**Android Finder 特有功能:**

- 单列列表布局
- 点击文件夹进入、面包屑返回
- 全屏图片/文本预览
- 顶部溢出菜单 (新建、刷新)

### Code Editor (代码编辑器)

基于 **Monaco Editor** (VS Code 同款引擎) 的全功能代码编辑器。

**编辑器核心:**

- Monaco Editor 0.55 集成，提供 VS Code 级别的编辑体验
- 语法高亮：支持 90+ 种编程语言 (TypeScript、JavaScript、Python、Rust、Go、Java、C/C++、HTML、CSS、JSON、YAML、SQL 等)
- IntelliSense 智能补全：TypeScript/JavaScript 类型推断和自动补全
- 多光标编辑：Ctrl/Cmd+D 选择下一个匹配、Alt+Click 添加光标
- 代码折叠：基于缩进的智能折叠
- 括号配对着色
- 平滑滚动和光标动画

**Web Worker 架构:**

编辑器使用 5 个独立的 Web Worker 提供语言服务：

| Worker | 功能 |
|--------|------|
| TypeScript Worker | TS/JS 类型检查、IntelliSense、错误诊断 |
| CSS Worker | CSS/SCSS/LESS 验证和补全 |
| JSON Worker | JSON Schema 验证和格式化 |
| HTML Worker | HTML 标签补全和验证 |
| Editor Worker | 通用编辑功能 (diff、格式化等) |

**文件管理:**

- 文件树侧边栏：从后端 API 懒加载目录，递归展开/折叠
- 标签页管理：同时打开多个文件，标签间切换
- 脏状态追踪：修改过的文件标签显示 `●` 指示器
- Ctrl/Cmd+S 保存：通过 API 写入文件到服务器
- Shift+Alt+F 格式化文档

**导航:**

- 面包屑导航：显示当前文件路径和代码符号 (函数、类、接口等)
- 底部状态栏：光标行:列位置、文件语言、编码信息

**响应式适配:**

| | 桌面端 (macOS) | 移动端 (Android) |
|---|---|---|
| 侧边栏 | 始终显示 (192px) | 汉堡菜单触发覆盖层 |
| 迷你地图 | 启用 | 禁用 |
| 字号 | 12px | 13px |
| 自动换行 | 关闭 | 开启 |
| 滚动条 | 标准 | 细滚动条 (4px) |

### 其他应用 (规划中)

以下应用已在应用注册表中注册，但尚未实现具体功能：

| 应用 | 图标 | 说明 |
|------|------|------|
| Terminal | 终端 | Shell 终端模拟器 |
| Browser | 浏览器 | 网页浏览器 |
| Photos | 相册 | 图片查看器 |
| Music | 音乐 | 音频播放器 |
| Calculator | 计算器 | 数学计算 |
| Settings | 设置 | 系统配置面板 |

---

## 后端 API

Express 服务器在 `server/` 目录下，提供以下 RESTful 端点 (挂载在 `/api/fs` 前缀下)：

| 方法 | 路径 | 说明 | 参数 |
|------|------|------|------|
| GET | `/api/fs/list` | 列出目录内容 | `?path=/` |
| GET | `/api/fs/read` | 读取文本文件内容 | `?path=/file.txt` |
| GET | `/api/fs/file/*` | 获取文件二进制 (图片/下载) | URL 路径 |
| POST | `/api/fs/write` | 写入文本文件 | `{ path, content }` |
| POST | `/api/fs/mkdir` | 创建文件夹 | `{ path, name }` |
| POST | `/api/fs/touch` | 创建空文件 | `{ path, name }` |
| POST | `/api/fs/delete` | 删除文件/文件夹 | `{ path }` |
| POST | `/api/fs/rename` | 重命名 | `{ path, newName }` |

**安全机制:**

- 所有路径操作限制在 `ROOT_DIR` 沙箱内
- 路径遍历攻击 (`../../`) 自动拦截返回 403
- 文件名验证：拒绝包含 `/`、`\`、`..` 的名称
- 文本文件大小限制 10MB，请求体限制 15MB
- 隐藏文件 (`.` 开头) 自动过滤不显示

---

## 快速开始

### 环境要求

- **Node.js** >= 18
- **npm** >= 9 (或 pnpm / yarn)

### 安装

```bash
git clone <repository-url>
cd WebDesk

# 安装前端依赖
npm install

# 安装后端依赖
cd server && npm install && cd ..
```

### 开发

**推荐：前后端同时启动**

```bash
npm run dev:all
```

这会使用 `concurrently` 同时启动：
- 前端 Vite 开发服务器 (默认端口 5173)
- 后端 Express 服务器 (端口 3001)

Vite 开发服务器会自动将 `/api` 请求代理到后端。

**分别启动：**

```bash
# 终端 1: 启动后端
npm run dev:server

# 终端 2: 启动前端
npm run dev
```

**配置 ROOT_DIR (可选):**

后端默认以项目根目录作为文件浏览根目录。可通过环境变量自定义：

```bash
# 在 server/ 目录下创建 .env 文件
echo "ROOT_DIR=/path/to/your/directory" > server/.env

# 或直接通过环境变量启动
ROOT_DIR=/home/user/projects npm run dev:server
```

启动后在浏览器访问 `http://localhost:5173`。

- 桌面浏览器 (窗口宽度 >= 768px) 会显示 macOS 桌面
- 缩小浏览器窗口到 768px 以下或使用移动设备访问，会切换为 Android 桌面
- 使用浏览器开发者工具的设备模拟器可以快速在两种模式间切换

### 构建

```bash
# 构建前端
npm run build

# 构建后端
npm run build:server
```

前端产物输出到 `dist/` 目录，后端编译到 `server/dist/`。

**生产环境运行：**

```bash
cd server
ROOT_DIR=/path/to/files node dist/index.js
```

后端在生产模式下会自动托管 `../dist/` 下的前端静态文件，并提供 SPA 回退路由。

### 预览构建产物

```bash
npm run preview
```

---

## 使用指南

### macOS 桌面操作

1. **启动应用** -- 点击底部 Dock 栏上的应用图标
2. **移动窗口** -- 按住窗口标题栏拖拽
3. **缩放窗口** -- 拖拽窗口边缘 (8 个方向)
4. **最大化** -- 点击窗口左上角绿色按钮
5. **最小化** -- 点击窗口左上角黄色按钮
6. **关闭窗口** -- 点击窗口左上角红色按钮
7. **切换前台** -- 点击被遮挡的窗口将其提升到最前面

### Android 桌面操作

1. **启动应用** -- 点击应用网格中的图标，或底部导航栏图标
2. **翻页** -- 在应用网格上左右滑动
3. **关闭应用** -- 点击应用弹出层上方的空白区域，或下拉手势关闭

### Finder 文件管理

1. **浏览文件** -- 打开 Finder 即可浏览 ROOT_DIR 下的真实文件和目录
2. **进入目录** -- 双击文件夹 (macOS) 或单击文件夹 (Android)
3. **快捷导航** -- 点击左侧收藏栏跳转到 Desktop、Documents、Downloads 等常用目录
4. **切换视图** -- 工具栏右侧可切换网格/列表视图 (仅 macOS)
5. **新建文件/文件夹** -- 工具栏按钮或右键菜单
6. **删除** -- 选中后点击删除按钮，确认后执行
7. **重命名** -- 右键菜单选择重命名
8. **预览文件** -- 选中文件打开预览面板 (图片直接显示、文本可编辑)
9. **下载文件** -- 预览面板中点击下载按钮

### Code Editor 代码编辑

1. **打开文件** -- 点击左侧文件树中的文件
2. **展开目录** -- 点击文件树中的文件夹，自动从服务器加载子目录
3. **多文件编辑** -- 点击不同文件，在标签页间切换
4. **关闭标签** -- 点击标签上的 X 按钮
5. **保存文件** -- `Ctrl+S` / `Cmd+S` 保存到服务器
6. **格式化** -- `Shift+Alt+F` 格式化当前文档
7. **多光标** -- `Alt+Click` 添加光标，`Ctrl+D` 选择下一个匹配项

---

## 技术栈

### 前端

| 技术 | 版本 | 用途 |
|------|------|------|
| React | 18.3 | UI 框架 |
| TypeScript | 5.6 | 类型安全 |
| Vite | 6.0 | 构建工具和开发服务器 |
| Tailwind CSS | 3.4 | 原子化 CSS |
| Zustand | 4.5 | 全局状态管理 (窗口、应用) |
| Framer Motion | 11.15 | 动画引擎 (Dock 放大、窗口动画) |
| Monaco Editor | 0.55 | 代码编辑器核心 (VS Code 同款) |
| Lucide React | 0.468 | 图标库 |

### 后端

| 技术 | 版本 | 用途 |
|------|------|------|
| Node.js | >= 18 | 运行时 |
| Express | 4.21 | Web 框架 |
| TypeScript | 5.6 | 类型安全 |
| tsx | 4.19 | 开发时 TS 直接运行 |
| cors | 2.8 | 跨域支持 |
| dotenv | 16.4 | 环境变量管理 |
| mime-types | 2.1 | 文件 MIME 类型检测 |

## 项目结构

```
WebDesk/
  package.json                       # 前端依赖和脚本 (含 dev:all)
  vite.config.ts                     # Vite 配置 (含 /api 代理)
  server/                            # 后端服务器
    package.json                     #   后端依赖
    tsconfig.json                    #   后端 TS 配置
    .env.example                     #   环境变量模板
    src/
      index.ts                       #   Express 入口
      routes/
        fsRoutes.ts                  #   文件系统 API 路由
      services/
        fsService.ts                 #   文件系统操作服务层
      utils/
        pathSecurity.ts              #   路径安全验证模块
  src/                               # 前端源码
    App.tsx                          #   根组件 (主题路由)
    main.tsx                         #   React 入口
    index.css                        #   全局样式和设计令牌
    lib/
      utils.ts                       #   Tailwind 工具函数
      fsApi.ts                       #   后端 API 客户端
    hooks/
      useSystemTheme.ts              #   系统主题检测 (mac/android)
      useFileSystem.ts               #   文件系统状态管理 Hook
    store/
      useDesktopStore.ts             #   Zustand 桌面状态管理
    components/
      mac/                           #   macOS 桌面组件
        MacDesktop.tsx               #     主桌面容器
        TopBar.tsx                   #     顶部菜单栏
        Dock.tsx                     #     底部 Dock 栏
        DockItem.tsx                 #     Dock 图标 (带放大动画)
        Window.tsx                   #     可拖拽/缩放窗口
      android/                       #   Android 桌面组件
        AndroidDesktop.tsx           #     主桌面容器
        StatusBar.tsx                #     状态栏
        AppGrid.tsx                  #     应用网格 (可翻页)
        AndroidDock.tsx              #     底部导航栏
      apps/                          #   应用实现
        appRegistry.ts               #     应用注册中心
        FinderApp.tsx                #     Finder 路由器
        CodeEditorApp.tsx            #     代码编辑器路由器
        finder/                      #     Finder 文件管理器
          MacFinder.tsx              #       macOS 版
          AndroidFinder.tsx          #       Android 版
          FilePreview.tsx            #       文件预览面板
          fileSystem.ts              #       文件系统类型和工具函数
        code-editor/                 #     代码编辑器
          MacCodeEditor.tsx          #       macOS 版
          AndroidCodeEditor.tsx      #       Android 版
          MonacoEditor.tsx           #       Monaco 编辑器封装
          monacoSetup.ts             #       Monaco Worker 和语言配置
          FileTreeView.tsx           #       文件树组件
          EditorTabs.tsx             #       标签栏
          EditorBreadcrumbs.tsx      #       面包屑导航
          EditorStatusBar.tsx        #       状态栏
          useCodeEditor.ts           #       编辑器状态管理 Hook
          syntaxHighlighter.ts       #       语言检测工具
      ui/                            #   基础 UI 组件
        button.tsx                   #     按钮
        card.tsx                     #     卡片
```

## NPM 脚本速查

| 命令 | 说明 |
|------|------|
| `npm run dev` | 仅启动前端 Vite 开发服务器 |
| `npm run dev:server` | 仅启动后端 Express 服务器 |
| `npm run dev:all` | 同时启动前后端 (推荐) |
| `npm run build` | 构建前端生产版本 |
| `npm run build:server` | 编译后端 TypeScript |
| `npm run preview` | 预览前端构建产物 |

## 浏览器兼容性

| 功能 | Chrome/Edge | Firefox | Safari |
|------|-------------|---------|--------|
| 基础桌面体验 | 完全支持 | 完全支持 | 完全支持 |
| 文件系统操作 | 完全支持 | 完全支持 | 完全支持 |
| Monaco Editor | 完全支持 | 完全支持 | 完全支持 |

> 重构后所有文件操作通过后端 API 完成，不再依赖浏览器特定 API，所有现代浏览器均可获得完整功能。

## 扩展新应用

1. 在 `src/components/apps/appRegistry.ts` 中注册应用定义
2. 创建应用路由组件 `XxxApp.tsx`，使用 `useSystemTheme()` 分发到对应平台组件
3. 分别实现 `MacXxx.tsx` 和 `AndroidXxx.tsx`
4. 如需出现在 Dock 栏，将应用 ID 添加到 `DOCK_APPS` 数组

## License

MIT
