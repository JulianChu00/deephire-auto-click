# 🤖 DeepHire 自动投递

在 [DeepHire](https://www.deephire.cn) 推荐页面自动批量投递简历。支持进度显示、每日上限检测、面板拖拽折叠。

## 安装方式

### 方式一：Greasy Fork 脚本（推荐）

1. 安装 [Tampermonkey](https://www.tampermonkey.net/) 或 [Violentmonkey](https://violentmonkey.github.io/)
2. [点击安装脚本](https://greasyfork.org/en/scripts/580920-deephireautodelivery) 或直接打开 `deephire-auto-click.user.js` 拖入浏览器
3. 打开推荐页面即生效

### 方式二：Chrome 扩展

```bash
npm install
npm run build
```

然后在 `chrome://extensions/` 加载 `dist/` 目录。

开发模式（热更新）：
```bash
npm run dev
```

## 功能

- **一键自动投递** — 自动滚动列表、逐一点击「投递简历」
- **进度显示** — 右下角浮动面板实时显示已投递数量和百分比进度条
- **上限检测** — 拦截 `sendResume` 接口，达到每日沟通上限自动停止
- **拖拽移动** — 按住标题栏拖动面板到任意位置
- **折叠收起** — 点 `−` 收起面板，不遮挡页面
- **随时停止** — 点击停止按钮中断运行

## 自定义参数

| 参数 | 默认值 | 说明 |
|---|---|---|
| `TARGET` | `200` | 目标投递数量 |
| `CLICK_MS` | `1500` | 每次点击间隔（毫秒） |
| `SCROLL_MS` | `3000` | 每次滚动后等待（毫秒） |

## 项目结构

```
├── deephire-auto-click.user.js   # Greasy Fork 单文件脚本
├── src/
│   ├── content/
│   │   ├── main.tsx              # 扩展入口，注入样式 + 挂载 React
│   │   └── App.tsx               # React 浮动面板组件
│   └── interceptor/
│       └── interceptor.ts        # MAIN world 运行，劫持 sendResume
├── manifest.json                 # Chrome 扩展清单
├── vite.config.ts                # Vite 多入口构建
└── package.json
```

## 技术栈

- **用户脚本** — 纯 vanilla JS，零依赖，即装即用
- **Chrome 扩展** — React 18 + TypeScript + Vite 4 + vite-plugin-web-extension

## License

MIT
