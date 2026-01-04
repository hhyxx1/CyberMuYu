# CyberMuYu Android Studio 构建说明

本文档详细说明如何使用 Android Studio 将 CyberMuYu 项目构建为 Android APK 应用。

## 准备工作

### 1. 安装必要工具
- **Android Studio**：最新稳定版
- **JDK**：1.8 或更高版本
- **Android SDK**：API 级别 21 (Android 5.0) 及以上

### 2. 项目结构说明

```
CyberMuYu/
├── android/              # Android 项目目录
│   ├── app/             # 应用模块
│   │   ├── src/
│   │   │   ├── main/
│   │   │   │   ├── java/com/cybermuyu/  # Java 代码
│   │   │   │   ├── res/                  # 资源文件
│   │   │   │   └── AndroidManifest.xml   # 应用配置
│   │   │   └── test/                     # 测试代码
│   │   └── build.gradle                  # 应用级构建配置
│   ├── gradle/
│   ├── build.gradle                      # 项目级构建配置
│   └── gradle.properties                 # Gradle 属性
├── index.html           # 主 HTML 文件
├── style.css            # 样式文件
├── script.js            # JavaScript 文件
├── manifest.json        # PWA 配置
└── icon-*.svg           # 应用图标
```

## 构建步骤

### 1. 打开 Android Studio

### 2. 导入项目

1. 点击 "Open an existing project"
2. 选择 `CyberMuYu/android` 目录
3. 点击 "OK"

### 3. 同步 Gradle

Android Studio 会自动提示同步 Gradle，点击 "Sync Now"。

如果未自动提示：
- 点击顶部工具栏的 "Sync Project with Gradle Files" 按钮
- 或通过菜单：File → Sync Project with Gradle Files

### 4. 配置构建变体

1. 点击左侧 "Build Variants" 面板
2. 选择构建类型：
   - **debug**：用于测试，无需签名
   - **release**：用于发布，需要签名

### 5. 构建 APK

#### 构建 Debug APK

1. 点击菜单：Build → Build Bundle(s) / APK(s) → Build APK(s)
2. 构建完成后，点击 "locate" 按钮查看生成的 APK 文件

#### 构建 Release APK

1. 点击菜单：Build → Generate Signed Bundle / APK...
2. 选择 "APK"，点击 "Next"
3. 配置签名密钥：
   - 如果已有密钥库，选择并输入密码
   - 如果没有，点击 "Create new..." 创建新密钥库
4. 配置密钥信息（别名、密码、有效期等）
5. 点击 "Next"
6. 选择构建类型为 "release"
7. 点击 "Finish"

## 项目配置说明

### WebView 配置

Android 应用使用 WebView 加载本地 HTML 文件：

- `WebViewActivity.java`：实现 WebView 逻辑
- 启用了 JavaScript、DOM Storage、App Cache 等功能
- 配置了返回键处理（返回上一页/双击退出）

### 资源配置

- 应用图标：位于 `res/mipmap-*` 目录
- 布局文件：`res/layout/activity_webview.xml`
- 字符串资源：`res/values/strings.xml`
- 主题配置：`res/values/themes.xml`
- 颜色配置：`res/values/colors.xml`

### Build.gradle 配置

```gradle
// 核心配置
compileSdk 33
minSdk 21
targetSdk 33

// Assets 目录配置
sourceSets {
    main {
        assets {
            srcDirs = ['../../../'] // 指向项目根目录
        }
    }
}
```

## 测试应用

### 1. 模拟器测试

1. 点击 "AVD Manager" 按钮（右上角手机图标）
2. 创建或选择一个 Android 模拟器
3. 点击 "Run" 按钮（绿色三角形）运行应用

### 2. 真机测试

1. 启用手机的 "开发者选项" 和 "USB 调试"
2. 使用 USB 连接手机到电脑
3. 点击 "Run" 按钮运行应用

## 功能说明

- **响应式设计**：适配各种屏幕尺寸
- **设备动作跟随**：星空背景跟随设备倾斜移动
- **PWA 特性**：离线缓存、本地存储
- **呼吸引导**：动画效果引导呼吸
- **冥想功能**：支持多种时长的冥想模式
- **成就系统**：记录用户的使用成就

## 故障排除

### 1. Gradle 同步失败

- 检查网络连接
- 确保 Android Studio 更新到最新版本
- 删除 `.gradle` 目录后重新同步

### 2. APK 构建失败

- 检查代码中是否有语法错误
- 确保所有资源文件存在且格式正确
- 检查签名配置是否正确

### 3. 应用运行问题

- 检查 WebView 配置是否正确
- 确保本地 HTML/CSS/JS 文件存在且路径正确
- 检查 AndroidManifest.xml 中的权限配置

## 发布应用

### 1. 生成签名 APK

参考 "构建 Release APK" 部分

### 2. 优化 APK

- 启用 ProGuard 混淆代码（可选）
- 使用 APK Split 生成不同架构的 APK

### 3. 上传到应用商店

- Google Play Store
- 其他 Android 应用商店

## 版本更新

1. 更新 `build.gradle` 中的 `versionCode` 和 `versionName`
2. 重新构建并签名 APK
3. 上传到应用商店

---

## 技术栈

- **Android SDK**：33
- **WebView**：加载本地 HTML 内容
- **Gradle**：构建工具
- **HTML/CSS/JavaScript**：前端界面和逻辑

## 注意事项

1. 确保所有 HTML/CSS/JS 文件都在项目根目录中
2. 如有修改资源文件，需重新构建 APK
3. 测试时确保设备有足够的存储空间
4. 发布前进行全面测试，确保功能正常

---

**完成以上步骤后，你将成功构建 CyberMuYu 的 Android APK 应用！**