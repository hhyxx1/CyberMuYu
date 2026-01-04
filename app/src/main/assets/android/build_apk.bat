# 使用Android SDK工具手动构建APK

## 步骤1：创建项目结构
mkdir -p MyApp/src/main/java/com/cybermuyu
mkdir -p MyApp/src/main/res/layout
mkdir -p MyApp/src/main/res/values
mkdir -p MyApp/build

## 步骤2：创建AndroidManifest.xml
cat > MyApp/src/main/AndroidManifest.xml << EOL
<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="com.cybermuyu">
    <uses-permission android:name="android.permission.INTERNET" />
    <application
        android:allowBackup="true"
        android:icon="@mipmap/ic_launcher"
        android:label="@string/app_name"
        android:roundIcon="@mipmap/ic_launcher_round"
        android:supportsRtl="true"
        android:theme="@style/Theme.CyberMuYu">
        <activity
            android:name=".MainActivity"
            android:exported="true">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>
    </application>
</manifest>
EOL

## 步骤3：创建Java代码
cat > MyApp/src/main/java/com/cybermuyu/MainActivity.java << EOL
package com.cybermuyu;

import android.app.Activity;
import android.os.Bundle;
import android.webkit.WebSettings;
import android.webkit.WebView;

public class MainActivity extends Activity {
    private WebView webView;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        webView = new WebView(this);
        setContentView(webView);

        WebSettings webSettings = webView.getSettings();
        webSettings.setJavaScriptEnabled(true);
        webSettings.setDomStorageEnabled(true);
        webView.loadUrl("file:///android_asset/index.html");
    }
}
EOL

## 步骤4：创建资源文件
cat > MyApp/src/main/res/values/strings.xml << EOL
<resources>
    <string name="app_name">CyberMuYu</string>
</resources>
EOL

## 步骤5：复制项目文件到assets目录
mkdir -p MyApp/src/main/assets
cp -r ../* MyApp/src/main/assets/

## 步骤6：编译并生成APK
# 设置环境变量
set ANDROID_HOME=C:\Users\Remote\AppData\Local\Android\Sdk
set BUILD_TOOLS_VERSION=36.1.0
set ANDROID_PLATFORM_VERSION=34

# 生成R.java
%ANDROID_HOME%\build-tools\%BUILD_TOOLS_VERSION%\aapt.exe package -f -m -J MyApp/src/main/java -S MyApp/src/main/res -M MyApp/src/main/AndroidManifest.xml -I %ANDROID_HOME%\platforms\android-%ANDROID_PLATFORM_VERSION%\android.jar

# 编译Java代码
javac -d MyApp/build -cp %ANDROID_HOME%\platforms\android-%ANDROID_PLATFORM_VERSION%\android.jar MyApp/src/main/java/com/cybermuyu/*.java

# 转换为dex文件
%ANDROID_HOME%\build-tools\%BUILD_TOOLS_VERSION%\d8.bat --output MyApp/build --lib %ANDROID_HOME%\platforms\android-%ANDROID_PLATFORM_VERSION%\android.jar MyApp/build/com/cybermuyu/*.class

# 打包APK
%ANDROID_HOME%\build-tools\%BUILD_TOOLS_VERSION%\aapt.exe package -f -M MyApp/src/main/AndroidManifest.xml -S MyApp/src/main/res -A MyApp/src/main/assets -I %ANDROID_HOME%\platforms\android-%ANDROID_PLATFORM_VERSION%\android.jar -F MyApp/build/CyberMuYu-unsigned.apk

# 添加dex文件到APK
7z a MyApp/build/CyberMuYu-unsigned.apk -r MyApp/build/classes.dex

# 对齐APK
%ANDROID_HOME%\build-tools\%BUILD_TOOLS_VERSION%\zipalign.exe -f 4 MyApp/build/CyberMuYu-unsigned.apk MyApp/build/CyberMuYu-aligned.apk

# 生成签名密钥（如果不存在）
if not exist MyApp/keystore.jks (
    keytool -genkey -v -keystore MyApp/keystore.jks -alias CyberMuYu -keyalg RSA -keysize 2048 -validity 10000 -dname "CN=CyberMuYu, OU=CyberMuYu, O=CyberMuYu, L=Unknown, ST=Unknown, C=CN" -storepass 123456 -keypass 123456
)

# 签名APK
%ANDROID_HOME%\build-tools\%BUILD_TOOLS_VERSION%\apksigner.bat sign --ks MyApp/keystore.jks --ks-pass pass:123456 --key-pass pass:123456 --out MyApp/build/CyberMuYu.apk MyApp/build/CyberMuYu-aligned.apk

# 输出结果
echo "APK生成成功：MyApp/build/CyberMuYu.apk"