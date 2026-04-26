# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [0.1.2] - 2026-04-26

### Added

- **系统生命周期管理**：支持优雅关机和重启，带可视化进度提示
  - 关机流程：关闭应用 → 断开 WebSocket → 清理缓存 → 显示关机画面
  - 重启流程：完整清理后自动刷新恢复
- **版本升级检测**：集成 GitHub Releases API，自动检测新版本并对比 SemVer 版本号
- **应用管理中心增强**：应用列表可视化、状态管理与快捷操作
- **关于页面升级**：展示版本/构建信息、一键检查更新入口
- **系统设置扩展**：集中管理系统操作入口（关机、重启）

---

## [0.1.0] - 2026-04-26

### Added

- **Settings 设置应用**：支持 Android / Mac 双端界面风格的系统设置中心
  - 个性化设置：主题切换、桌面壁纸自定义
  - 应用管理：已安装应用列表
  - 系统设置：系统级配置选项
  - 关于页面：项目版本与信息展示
- **终端功能**：集成 xterm.js，提供完整终端模拟器，支持双端窗口模式
- **实时文件同步**：基于 WebSocket 的客户端-服务端双向实时同步，含冲突检测

---

## [0.0.1] - 2026-04-26

### Added

- **Markdown 实时预览**：分屏展示与同步滚动
- **构建流程**：前端 + 服务端一键构建部署
- **Android 桌面模拟**：桌面背景、状态栏、Dock、应用网格
- **Mac 桌面模拟**：桌面背景、顶部菜单栏、Dock、窗口管理
- **Finder 文件管理**：双端文件管理器
- **Code Editor**：基于 Monaco 的代码编辑器

