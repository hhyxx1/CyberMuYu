# 赛博木鱼 (CyberMuYu) - PWA应用

## 项目介绍
赛博木鱼是一个基于Web的极简主义电子木鱼应用，采用可爱像素风格设计，具备多种解压功能。

## 核心功能
- ✅ 点击屏幕发出声音
- ✅ 实时计数器
- ✅ 波纹动画效果
- ✅ 多种音效选择（木鱼、铃铛、水滴、风铃）
- ✅ 长按持续效果
- ✅ 粒子效果增强
- ✅ 呼吸引导模式
- ✅ 多主题切换
- ✅ 统计功能
- ✅ 白噪音背景音效

## PWA特性
- 📱 可安装到主屏幕
- 📶 离线使用支持
- ⚡ 快速加载
- 🎨 全屏显示（无浏览器地址栏）
- 🔄 自动更新

## 文件结构
```
CyberMuYu/
├── index.html          # 主页面
├── style.css           # 样式文件
├── script.js           # 交互逻辑
├── manifest.json       # PWA配置文件
├── service-worker.js   # 离线支持和缓存
├── icon-192.svg        # 192x192 SVG图标
├── icon-512.svg        # 512x512 SVG图标
└── README.md           # 项目说明
```

## 如何使用

### 直接在浏览器中使用
1. 直接在浏览器中打开 `index.html` 文件
2. 开始使用赛博木鱼进行解压

### 安装到手机主屏幕

#### Android (Chrome浏览器)
1. 在Chrome中打开应用
2. 点击右上角的菜单按钮
3. 选择「添加到主屏幕」
4. 按照提示完成安装

#### iOS (Safari浏览器)
1. 在Safari中打开应用
2. 点击底部的分享按钮
3. 选择「添加到主屏幕」
4. 按照提示完成安装

## 打包为安卓APP

### 方法一：使用 PWABuilder
1. 访问 [PWABuilder](https://www.pwabuilder.com/)
2. 输入你的PWA应用URL（或上传本地文件）
3. 选择Android平台
4. 按照提示生成APK文件
5. 使用Android Studio或其他工具签名APK

### 方法二：使用 Android Studio
1. 下载并安装 [Android Studio](https://developer.android.com/studio)
2. 创建一个新的「WebView应用」项目
3. 将PWA文件放入assets目录
4. 配置WebView支持PWA特性
5. 构建并签名APK

### 方法三：使用 bubblewrap CLI
1. 安装 bubblewrap CLI：`npm install -g @bubblewrap/cli`
2. 初始化项目：`bubblewrap init --manifest https://your-pwa-url/manifest.json`
3. 构建APK：`bubblewrap build`
4. 签名APK：按照命令提示完成签名

## PWA配置说明

### manifest.json
- **名称**: 赛博木鱼 (CyberMuYu)
- **包名**: com.hyx.cybermuyu
- **主题色**: #000000 (纯黑色)
- **显示模式**: standalone (全屏)
- **图标**: 像素风木鱼SVG图标

### service-worker.js
- 缓存所有必要资源
- 支持离线访问
- 自动更新机制

## 技术栈
- HTML5
- CSS3
- JavaScript (ES6+)
- Web Audio API
- Service Worker API
- Web App Manifest

## 浏览器兼容性
- Chrome 60+
- Firefox 58+
- Safari 12+
- Edge 79+

## 开发说明

### 本地开发
直接使用浏览器打开 `index.html` 即可进行开发和测试。

### 测试PWA特性
使用Chrome开发者工具的「Application」标签页可以测试PWA特性：
- 检查Service Worker状态
- 测试离线功能
- 验证Manifest配置

## 许可证
MIT License

## 贡献
欢迎提交Issue和Pull Request！

## 联系方式
如有问题或建议，欢迎通过GitHub Issues反馈。

---

**赛博木鱼 - 解压神器，给你带来宁静与放松** 🧘‍♀️✨