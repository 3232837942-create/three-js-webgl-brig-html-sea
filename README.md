# 黑燕号 · The Black Tern

一个单 HTML 文件运行的 Three.js / WebGL 双桅横帆船航海教学小游戏。

## 运行

直接打开 `outputs/brig.html` 即可运行。若浏览器限制本地脚本，也可以在项目目录运行：

```powershell
node work/serve-outputs.cjs
```

然后访问 <http://127.0.0.1:8000/brig.html>。

## 内容

- 第一人称登船探索和第三人称全船观察
- 双桅横帆、风向、收放帆、锚泊和船体浮力近似
- 可拖动的帆船舵轮，支持 Shift 微调和 C 正舵
- 独立火炮、装填、炮门、舱口、船长室、航海图和储物箱
- 多层解析海浪、船头破浪、船尾航迹、昼夜、黄昏和暴风雨
- 单文件离线输出：`outputs/黑燕号-完整交互版.html`

## 构建

修改 `work/` 下的源文件后运行：

```powershell
node work/build.cjs
```

构建脚本会把 Three.js、海洋、船体、火炮、尾流、舵轮和主逻辑内嵌到两个输出 HTML 中。

## 说明

海洋使用实时解析波形、着色器反射和粒子泡沫近似，目标是保持单 HTML 文件和浏览器实时性能，不等同于完整流体模拟。Blender 船模目前保留在 `outputs/` 供预览，未自动接入游戏。
