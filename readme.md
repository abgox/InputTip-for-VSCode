<h1 align="center">✨ InputTip for VSCode ✨</h1>

<p align="center">
    <a href="https://github.com/abgox/InputTip-for-VSCode/blob/main/license">
        <img src="https://img.shields.io/github/license/abgox/InputTip-for-VSCode" alt="license" />
    </a>
    <a href="https://github.com/abgox/InputTip-for-VSCode">
        <img src="https://img.shields.io/github/package-json/v/abgox/InputTip-for-VSCode" alt="version" />
    </a>
    <a href="https://github.com/abgox/InputTip-for-VSCode">
        <img src="https://img.shields.io/github/languages/code-size/abgox/InputTip-for-VSCode" alt="code size" />
    </a>
    <a href="https://github.com/abgox/InputTip-for-VSCode">
        <img src="https://img.shields.io/github/repo-size/abgox/InputTip-for-VSCode" alt="repo size" />
    </a>
    <a href="https://github.com/abgox/InputTip-for-VSCode">
        <img src="https://img.shields.io/github/created-at/abgox/InputTip-for-VSCode" alt="created" />
    </a>
</p>

---

<p align="center">
  <strong>喜欢这个项目？请给它 Star ⭐️ 或 <a href="https://abgox.com/donate">赞赏 💰</a></strong>
</p>

一个 [Visual Studio Code](https://code.visualstudio.com/) 扩展插件，基于 [InputTip](https://inputtip.abgox.com/) 实现的实时修改光标、边框等颜色以提示输入法状态

## 快速开始

1. 使用 [InputTip](https://inputtip.abgox.com/) ([Github](https://github.com/abgox/InputTip), [Gitee](https://gitee.com/abgox/InputTip))

2. 在 InputTip 中修改设置: `托盘菜单` => `输入法相关` => `是否将输入法状态导出`
3. [安装 InputTip for VSCode](https://marketplace.visualstudio.com/items?itemName=abgox.inputtip)
4. 添加以下配置到 [settings.json](https://code.visualstudio.com/docs/configure/settings) 配置文件中

   ```json
   "InputTip.color": {
        "CN": {
            "editorCursor.foreground": "#fd5454"
        },
        "EN": {
            "editorCursor.foreground": "#6666fa"
        },
        "Caps": {
            "editorCursor.foreground": "#4d9805"
        }
   }
   ```

> [!Tip]
>
> `CN`、`EN`、`Caps` 中可用的配置项
>
> - `editorCursor.foreground`: 编辑区中的光标颜色
> - `terminalCursor.foreground`: 终端中的光标颜色
> - `window.activeBorder`: 活动窗口的边框颜色
