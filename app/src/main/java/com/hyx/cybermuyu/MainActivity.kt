package com.hyx.cybermuyu

import android.app.Activity
import android.app.TimePickerDialog
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.pm.ActivityInfo
import android.content.res.Configuration
import android.content.res.Resources
import android.media.AudioManager
import android.media.MediaMetadata
import android.media.session.MediaSession
import android.media.session.MediaSessionManager
import android.media.session.PlaybackState
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.provider.MediaStore
import android.view.KeyEvent
import android.view.Window
import android.view.WindowManager
import android.webkit.WebSettings
import android.webkit.WebView
import android.widget.Toast
import androidx.annotation.RequiresApi
// 直接导入常量，不使用嵌套导入
import java.util.*

class MainActivity : Activity() {
    private lateinit var webView: WebView
    private var doubleBackToExitPressedOnce = false
    private val mHandler = Handler(Looper.getMainLooper())
    
    // MediaSession相关变量
    private var mediaSessionManager: MediaSessionManager? = null
    private var mediaSession: MediaSession? = null
    private var isWhiteNoisePlaying = false
    private var whiteNoiseDuration = 0L // 白噪音总时长（毫秒）
    private var whiteNoisePosition = 0L // 当前播放位置（毫秒）
    private val whiteNoiseHandler = Handler(Looper.getMainLooper())
    private var whiteNoiseProgressUpdater: Runnable? = null
    private val PROGRESS_UPDATE_INTERVAL = 1000 // 进度更新间隔（毫秒）
    
    // 文件选择相关变量
    private val FILE_SELECT_REQUEST = 1 // 文件选择请求码
    private var customMusicUri: String? = null // 自定义音乐文件URI
    private var whiteNoiseName = "白噪音" // 白噪音名称，默认"白噪音"

    private var username: String? = null
    
    // 成就解锁广播接收器
    private val achievementReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context?, intent: Intent?) {
            if (intent?.action == "com.hyx.cybermuyu.ACHIEVEMENT_UNLOCKED") {
                val achievementId = intent.getStringExtra("achievementId")
                if (achievementId != null) {
                    showAchievementUnlockedNotification(achievementId)
                }
            }
        }
    }
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        // 检查Activity状态
        if (isFinishing || isDestroyed) {
            return
        }
        
        // 获取用户名
        username = intent.getStringExtra("username")?.trim()
        if (username.isNullOrEmpty()) {
            // 如果没有用户名，返回登录界面
            val loginIntent = Intent(this, LoginActivity::class.java)
            loginIntent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP)
            startActivity(loginIntent)
            finishAffinity()
            return
        }
        
        try {
            // 根据设备类型设置屏幕方向
            setScreenOrientationBasedOnDevice()
            
            // 设置全屏模式
            requestWindowFeature(Window.FEATURE_NO_TITLE)
            window.setFlags(WindowManager.LayoutParams.FLAG_FULLSCREEN, 
                            WindowManager.LayoutParams.FLAG_FULLSCREEN)
            
            webView = WebView(this)
            setContentView(webView)

            val settings = webView.settings
            settings.javaScriptEnabled = true
            settings.domStorageEnabled = true
            // 启用混合内容模式，允许HTTP请求
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                settings.mixedContentMode = WebSettings.MIXED_CONTENT_ALWAYS_ALLOW
            }
            
            // 允许自动播放音频，不需要用户手势
            settings.mediaPlaybackRequiresUserGesture = false
            
            // 增加WebView稳定性设置
            settings.setRenderPriority(WebSettings.RenderPriority.HIGH)
            settings.allowFileAccess = true
            settings.loadsImagesAutomatically = true
            settings.defaultTextEncodingName = "utf-8"
            
            // 启用硬件加速
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                webView.setLayerType(android.view.View.LAYER_TYPE_HARDWARE, null)
            } else {
                webView.setLayerType(android.view.View.LAYER_TYPE_SOFTWARE, null)
            }
            
            // 设置WebViewClient和WebChromeClient，增加错误处理
            webView.webChromeClient = object : android.webkit.WebChromeClient() {
                override fun onConsoleMessage(consoleMessage: android.webkit.ConsoleMessage?): Boolean {
                    consoleMessage?.let {
                        val message = "WebView Console: [${it.sourceId()}:${it.lineNumber()}] ${it.message()} (${it.messageLevel()})"
                        android.util.Log.d("CyberMuYu", message)
                    }
                    return super.onConsoleMessage(consoleMessage)
                }
            }
            
            // 设置WebViewClient，增加错误处理
            webView.webViewClient = object : android.webkit.WebViewClient() {
                override fun onReceivedError(view: android.webkit.WebView?, errorCode: Int, description: String?, failingUrl: String?) {
                    super.onReceivedError(view, errorCode, description, failingUrl)
                    android.util.Log.e("CyberMuYu", "WebView Error: $description (Code: $errorCode, URL: $failingUrl)")
                }
                
                @RequiresApi(Build.VERSION_CODES.M)
                override fun onReceivedError(view: android.webkit.WebView?, request: android.webkit.WebResourceRequest?, error: android.webkit.WebResourceError?) {
                    super.onReceivedError(view, request, error)
                    error?.let {
                        val failingUrl = request?.url?.toString() ?: "unknown"
                        android.util.Log.e("CyberMuYu", "WebView Error: ${it.description} (Code: ${it.errorCode}, URL: $failingUrl)")
                    }
                }
                
                override fun onReceivedHttpError(view: android.webkit.WebView?, request: android.webkit.WebResourceRequest?, errorResponse: android.webkit.WebResourceResponse?) {
                    super.onReceivedHttpError(view, request, errorResponse)
                    errorResponse?.let {
                        val failingUrl = request?.url?.toString() ?: "unknown"
                        android.util.Log.e("CyberMuYu", "WebView HTTP Error: ${it.statusCode} (URL: $failingUrl)")
                    }
                }
                
                override fun onPageFinished(view: android.webkit.WebView?, url: String?) {
                    super.onPageFinished(view, url)
                    // 检查Activity和WebView状态
                    if (isFinishing || isDestroyed || !::webView.isInitialized) {
                        return
                    }
                    username?.let {
                        webView.evaluateJavascript(
                            "javascript:if (typeof window.cyberMuYu !== 'undefined') { " +
                            "window.cyberMuYu.setUsername('$it'); " +
                            "}",
                            null
                        )
                    }
                }
            }
            
            // 设置JavaScript接口，用于接收白噪音状态变化
            webView.addJavascriptInterface(WhiteNoiseInterface(), "AndroidWhiteNoiseInterface")
            
            // 设置JavaScript接口，用于冥想时长选择
            webView.addJavascriptInterface(MeditationInterface(), "AndroidMeditationInterface")
            
            // 设置JavaScript接口，用于显示原生Toast提示
            webView.addJavascriptInterface(NotificationInterface(), "AndroidNotificationInterface")
            
            // 设置JavaScript接口，用于触发振动
            webView.addJavascriptInterface(VibrationInterface(), "AndroidVibrationInterface")
            
            // 设置JavaScript接口，用于小惊喜跳转
            webView.addJavascriptInterface(SurpriseInterface(), "AndroidSurpriseInterface")
            
            // 加载HTML页面
            webView.loadUrl("file:///android_asset/index.html")
            
            // 初始化MediaSession
            initMediaSession()
            
            // 设置音频焦点
            setVolumeControlStream(AudioManager.STREAM_MUSIC)
            
            // 启动应用使用时长跟踪服务
            val trackingIntent = Intent(this, TimeTrackingService::class.java)
            trackingIntent.action = TimeTrackingService.ACTION_START_TRACKING
            trackingIntent.putExtra("username", username)
            startService(trackingIntent)
            
        } catch (e: Exception) {
            e.printStackTrace()
            // 如果初始化过程中发生错误，返回登录界面
            val loginIntent = Intent(this, LoginActivity::class.java)
            loginIntent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP)
            startActivity(loginIntent)
            finishAffinity()
        }
    }
    
    override fun onKeyDown(keyCode: Int, event: KeyEvent?): Boolean {
        // 处理返回键事件
        if (keyCode == KeyEvent.KEYCODE_BACK) {
            // 检查Activity和WebView状态
            if (isFinishing || isDestroyed || !::webView.isInitialized) {
                return super.onKeyDown(keyCode, event)
            }
            
            // 先尝试将返回键事件传递给JavaScript
            webView.evaluateJavascript(
                "javascript:var result = false; try { if (typeof window.cyberMuYu !== 'undefined') { result = window.cyberMuYu.handleBackKey(); } } catch (e) { console.error('Error in handleBackKey:', e); result = false; }; result;"
            ) { value ->
                // 处理JavaScript返回的结果
                val result = value?.trim() ?: "false"
                
                // 移除可能的引号
                val cleanedResult = result.replace("'", "").replace("\"", "")
                
                // 检查结果
                val handled = "true".equals(cleanedResult, ignoreCase = true)
                
                if (!handled) {
                    // 如果JavaScript没有处理返回键，则处理双击退出
                    if (doubleBackToExitPressedOnce) {
                        // 第二次点击返回键，退出应用
                        finishAffinity() // 关闭所有关联的Activity，完全退出应用
                        System.exit(0) // 结束应用进程
                    } else {
                        // 第一次点击返回键，提示用户再次点击退出
                        doubleBackToExitPressedOnce = true
                        Toast.makeText(this, "再按一次退出应用", Toast.LENGTH_SHORT).show()
                        
                        // 3秒后重置标志
                        mHandler.postDelayed({ doubleBackToExitPressedOnce = false }, 3000)
                    }
                }
            }
            
            return true
        }
        
        return super.onKeyDown(keyCode, event)
    }
    
    override fun onStart() {
        super.onStart()
        
        // 检查Activity状态
        if (isFinishing || isDestroyed) {
            return
        }
        
        mediaSession?.let { if (!it.isActive) it.setActive(true) }
        
        // 注册成就解锁广播接收器
        try {
            val filter = IntentFilter("com.hyx.cybermuyu.ACHIEVEMENT_UNLOCKED")
            registerReceiver(achievementReceiver, filter)
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }
    
    override fun onPause() {
        super.onPause()
        // 暂停进度更新
        whiteNoiseProgressUpdater?.let { whiteNoiseHandler.removeCallbacks(it) }
    }
    
    override fun onResume() {
        super.onResume()
        // 恢复进度更新
        if (isWhiteNoisePlaying && whiteNoiseProgressUpdater != null) {
            whiteNoiseHandler.postDelayed(whiteNoiseProgressUpdater!!, PROGRESS_UPDATE_INTERVAL.toLong())
        }
    }
    
    override fun onStop() {
        super.onStop()
        // 应用退出到后台时不要销毁MediaSession，只有在停止播放白噪音后才设置为非活动状态
        
        // 取消注册成就解锁广播接收器
        try {
            unregisterReceiver(achievementReceiver)
        } catch (e: IllegalArgumentException) {
            // 如果没有注册过接收器，忽略异常
        }
    }
    
    override fun onDestroy() {
        super.onDestroy()
        // 释放MediaSession资源
        mediaSession?.let {
            it.release()
            mediaSession = null
        }
        
        // 停止进度更新
        whiteNoiseProgressUpdater?.let { whiteNoiseHandler.removeCallbacks(it) }
        
        // 确保WebView资源被正确释放
        if (::webView.isInitialized) {
            webView.loadUrl("about:blank")
            webView.stopLoading()
            webView.clearHistory()
            webView.clearCache(true)
            webView.removeAllViews()
            webView.destroy()
        }
        
        // 停止应用使用时长跟踪服务
        stopService(Intent(this, TimeTrackingService::class.java))
    }
    
    /**
     * 显示成就解锁通知
     */
    private fun showAchievementUnlockedNotification(achievementId: String) {
        // 根据成就ID获取对应的成就名称和描述
        val (title, description) = getAchievementInfo(achievementId)
        
        // 显示Toast通知
        runOnUiThread {
            if (!isFinishing && !isDestroyed) {
                Toast.makeText(this, "🎉 成就解锁: $title\n$description", Toast.LENGTH_LONG).show()
            }
        }
        
        // 也可以通过JavaScript接口将成就解锁信息传递到WebView中显示
        runOnUiThread {
            if (::webView.isInitialized && !isFinishing && !isDestroyed) {
                webView.evaluateJavascript(
                    "javascript:if (typeof window.cyberMuYu !== 'undefined') { " +
                    "window.cyberMuYu.showAchievementUnlocked('$title', '$description'); " +
                    "}",
                    null
                )
            }
        }
    }
    
    /**
     * 根据成就ID获取成就信息
     */
    private fun getAchievementInfo(achievementId: String): Pair<String, String> {
        return when (achievementId) {
            "one-hour-usage" -> Pair("冥想初学者", "累计使用应用一小时")
            // 可以在这里添加更多成就信息
            else -> Pair("未知成就", "恭喜解锁新成就！")
        }
    }
    
    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        
        // 检查Activity和WebView状态
        if (isFinishing || isDestroyed || !::webView.isInitialized) {
            return
        }
        
        if (requestCode == FILE_SELECT_REQUEST && resultCode == RESULT_OK) {
            // 处理文件选择结果
            data?.data?.let {
                // 获取文件URI
                customMusicUri = it.toString()
                println("选择的音乐文件URI: $customMusicUri")
                
                try {
                    // 将文件URI传递给JavaScript
                    webView.evaluateJavascript(
                            "javascript:if (typeof window.cyberMuYu !== 'undefined') { " +
                            "window.cyberMuYu.onCustomMusicSelected('$customMusicUri'); " +
                            "}",
                            null
                    )
                    
                    Toast.makeText(this, "音乐文件已选择", Toast.LENGTH_SHORT).show()
                } catch (e: Exception) {
                    e.printStackTrace()
                }
            }
        }
    }
    
    /**
     * 初始化MediaSession，实现系统级媒体控制
     */
    private fun initMediaSession() {
        try {
            // 检查Activity状态
            if (isFinishing || isDestroyed) {
                return
            }
            
            // 获取MediaSessionManager
            mediaSessionManager = getSystemService(MediaSessionManager::class.java)
            
            // 创建MediaSession
            mediaSession = MediaSession(this, "WhiteNoiseSession")
            
            // 设置回调
            mediaSession?.setCallback(object : MediaSession.Callback() {
                override fun onPlay() {
                    super.onPlay()
                    // 检查Activity和WebView状态
                    if (isFinishing || isDestroyed || !::webView.isInitialized) {
                        return
                    }
                    // 调用JavaScript确保白噪音开始播放
                    webView.evaluateJavascript(
                            "javascript:if (typeof window.cyberMuYu !== 'undefined') { if (!window.cyberMuYu.isWhiteNoisePlaying) { window.cyberMuYu.toggleWhiteNoise(); } }",
                            null
                    )
                }
                
                override fun onPause() {
                    super.onPause()
                    // 检查Activity和WebView状态
                    if (isFinishing || isDestroyed || !::webView.isInitialized) {
                        return
                    }
                    // 调用JavaScript确保白噪音停止播放
                    webView.evaluateJavascript(
                            "javascript:if (typeof window.cyberMuYu !== 'undefined') { if (window.cyberMuYu.isWhiteNoisePlaying) { window.cyberMuYu.toggleWhiteNoise(); } }",
                            null
                    )
                }
                
                override fun onSeekTo(position: Long) {
                    super.onSeekTo(position)
                    // 检查Activity和WebView状态
                    if (isFinishing || isDestroyed || !::webView.isInitialized) {
                        return
                    }
                    // 更新当前播放位置，不限制最大位置
                    whiteNoisePosition = position
                    // 调用JavaScript更新白噪音进度，确保正确处理loop属性
                    webView.evaluateJavascript(
                            "javascript:if (typeof window.cyberMuYu !== 'undefined') { " +
                            "console.log('Android请求跳转到:', " + (position / 1000) + "); " +
                            "if (window.cyberMuYu.whiteNoiseAudio) { " +
                            "var audio = window.cyberMuYu.whiteNoiseAudio; " +
                            "audio.pause(); " +
                            "audio.currentTime = " + (position / 1000) + "; " +
                            "var newTime = audio.currentTime; " +
                            "console.log('设置后的位置:', newTime); " +
                            "if (window.AndroidWhiteNoiseInterface) { " +
                            "window.AndroidWhiteNoiseInterface.onWhiteNoiseCurrentTimeChanged(newTime); " +
                            "}" +
                            "if (window.cyberMuYu.isWhiteNoisePlaying) { " +
                            "audio.play(); " +
                            "}" +
                            "}" +
                            "}",
                            null
                    )
                    // 更新播放状态
                    updatePlaybackState()
                }
            })
            
            // 设置标志
            mediaSession?.setFlags(MediaSession.FLAG_HANDLES_MEDIA_BUTTONS or MediaSession.FLAG_HANDLES_TRANSPORT_CONTROLS)
            
            // 初始化媒体元数据，直接设置固定时长（1小时28分19秒）
            val initialDuration = 5299000L // 1小时28分19秒 = 5299秒 = 5299000毫秒
            val metadata = MediaMetadata.Builder()
                    .putString(MediaMetadata.METADATA_KEY_TITLE, whiteNoiseName) // 使用动态更新的音乐名称
                    .putString(MediaMetadata.METADATA_KEY_ARTIST, "CyberMuYu")
                    .putLong(MediaMetadata.METADATA_KEY_DURATION, initialDuration)
                    .build()
            mediaSession?.setMetadata(metadata)
            
            // 初始化时长变量
            whiteNoiseDuration = initialDuration
            println("初始化白噪音时长为: $whiteNoiseDuration ms")
            
            // 初始化播放状态
            updatePlaybackState()
            
            // 初始化进度更新器
            whiteNoiseProgressUpdater = object : Runnable {
                override fun run() {
                    if (isWhiteNoisePlaying) {
                        // 更新播放状态，直接使用JavaScript通过接口传递的currentTime
                        updatePlaybackState()
                    }
                    // 继续更新进度
                    whiteNoiseHandler.postDelayed(this, PROGRESS_UPDATE_INTERVAL.toLong())
                }
            }
            
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }
    
    /**
     * 更新播放状态
     */
    private fun updatePlaybackState() {
        mediaSession?.let {session ->
            val state = if (isWhiteNoisePlaying) PlaybackState.STATE_PLAYING else PlaybackState.STATE_PAUSED
            
            // 设置基本操作
            val actions = PlaybackState.ACTION_PLAY or PlaybackState.ACTION_PAUSE or PlaybackState.ACTION_SEEK_TO
            
            val stateBuilder = PlaybackState.Builder()
                    .setState(state, whiteNoisePosition, 1.0f)
                    .setActions(actions)
            
            // 正确使用JavaScript传递过来的真实时长
            // 确保时长不会小于0
            val displayDuration = Math.max(whiteNoiseDuration, 0L)
            
            // 更新媒体元数据，包含时长信息
            val metadataBuilder = MediaMetadata.Builder()
                    .putString(MediaMetadata.METADATA_KEY_TITLE, whiteNoiseName) // 使用动态更新的音乐名称
                    .putString(MediaMetadata.METADATA_KEY_ARTIST, "CyberMuYu")
            
            // 只有当我们有有效的时长时，才设置时长信息
            if (displayDuration > 0) {
                metadataBuilder.putLong(MediaMetadata.METADATA_KEY_DURATION, displayDuration)
            }
            
            session.setMetadata(metadataBuilder.build())
            session.setPlaybackState(stateBuilder.build())
        }
    }
    
    /**
     * 启动白噪音
     */
    private fun startWhiteNoise() {
        isWhiteNoisePlaying = true
        // 启动进度更新，每秒更新一次
        whiteNoiseProgressUpdater?.let { whiteNoiseHandler.postDelayed(it, PROGRESS_UPDATE_INTERVAL.toLong()) }
        // 更新播放状态
        updatePlaybackState()
    }
    
    /**
     * 停止白噪音
     */
    private fun stopWhiteNoise() {
        isWhiteNoisePlaying = false
        // 停止进度更新
        whiteNoiseProgressUpdater?.let { whiteNoiseHandler.removeCallbacks(it) }
        // 停止白噪音后销毁MediaSession
        mediaSession?.let { if (it.isActive) it.setActive(false) }
        // 更新播放状态
        updatePlaybackState()
    }
    
    /**
     * JavaScript接口，用于接收白噪音状态变化
     */
    private inner class WhiteNoiseInterface {
        @android.webkit.JavascriptInterface
        fun onWhiteNoiseStateChanged(playing: Boolean) {
            runOnUiThread { 
                isWhiteNoisePlaying = playing
                if (playing) {
                    // 开始播放白噪音时，激活MediaSession
                    mediaSession?.let { if (!it.isActive) it.setActive(true) }
                    startWhiteNoise()
                } else {
                    stopWhiteNoise()
                }
            }
        }
        
        @android.webkit.JavascriptInterface
        fun onWhiteNoiseDurationChanged(duration: Double) {
            // 立即将duration转换为final变量，以便在lambda中使用
            val finalDuration = (duration * 1000).toLong()
            runOnUiThread { 
                // 正确读取音乐时长
                val newDuration = finalDuration
                // 只有当时长发生变化时才更新，避免不必要的更新
                if (newDuration != whiteNoiseDuration) {
                    whiteNoiseDuration = newDuration
                    // 打印日志，便于调试
                    println("白噪音时长更新为: $whiteNoiseDuration ms")
                    // 更新播放状态，确保MediaSession显示正确的时长
                    updatePlaybackState()
                }
            }
        }
        
        @android.webkit.JavascriptInterface
        fun onWhiteNoiseCurrentTimeChanged(currentTime: Double) {
            // 立即将currentTime转换为final变量，以便在lambda中使用
            val finalPosition = (currentTime * 1000).toLong()
            runOnUiThread { 
                // 实时更新播放进度，不限制最大位置
                whiteNoisePosition = finalPosition
                updatePlaybackState()
            }
        }
        
        @android.webkit.JavascriptInterface
        fun selectCustomMusic() {
            // 打开系统文件管理器选择音乐文件
            val intent = Intent(Intent.ACTION_GET_CONTENT)
            intent.type = "audio/*" // 只显示音频文件
            intent.addCategory(Intent.CATEGORY_OPENABLE)
            
            try {
                startActivityForResult(Intent.createChooser(intent, "选择音乐文件"), FILE_SELECT_REQUEST)
            } catch (ex: android.content.ActivityNotFoundException) {
                Toast.makeText(this@MainActivity, "请安装文件管理器", Toast.LENGTH_SHORT).show()
            }
        }
        
        @android.webkit.JavascriptInterface
        fun getCustomMusicUri(): String? {
            // 返回自定义音乐文件URI
            return customMusicUri
        }
        
        @android.webkit.JavascriptInterface
        fun onWhiteNoiseNameChanged(name: String) {
            runOnUiThread { 
                // 更新白噪音名称
                whiteNoiseName = name
                println("白噪音名称更新为: $whiteNoiseName")
                // 更新播放状态，确保MediaSession显示正确的名称
                updatePlaybackState()
            }
        }
    }
    
    /**
     * JavaScript接口，用于处理冥想时长选择
     */
    private inner class MeditationInterface {
        @android.webkit.JavascriptInterface
        fun selectCustomDuration() {
            // 显示时长选择器
            showTimePickerDialog()
        }
        
        @android.webkit.JavascriptInterface
        fun showDurationPicker(currentHours: Int, currentMinutes: Int, currentSeconds: Int) {
            // 显示时长选择器，使用当前时长作为默认值
            showTimePickerDialog(currentHours, currentMinutes)
        }
        
        private fun showTimePickerDialog() {
            // 默认调用，使用0小时0分钟作为默认值
            showTimePickerDialog(0, 0)
        }
        
        private fun showTimePickerDialog(defaultHours: Int, defaultMinutes: Int) {
            // 创建一个自定义时长选择器
            // 使用TimePickerDialog，设置新款Material Design风格
            val timePickerDialog = TimePickerDialog(
                this@MainActivity,
                // 使用新款Material Design风格主题
                android.R.style.Theme_DeviceDefault_Light_Dialog,
                { _, hourOfDay, minute ->
                    // 用户选择完成，处理结果
                    // 注意：TimePickerDialog不支持秒选择，这里我们使用分钟
                    // 如果需要秒，可能需要自定义对话框
                    handleDurationSelected(hourOfDay, minute, 0)
                },
                defaultHours, // 默认小时
                defaultMinutes, // 默认分钟
                true // 24小时制
            )
            
            // 设置标题
            timePickerDialog.setTitle("选择冥想时长")
            
            // 设置对话框样式，使其更现代化
            timePickerDialog.window?.let {
                // 设置对话框背景为白色，带有圆角效果
                it.setBackgroundDrawableResource(android.R.color.white)
                // 设置对话框的动画效果
                it.attributes.windowAnimations = android.R.style.Animation_Dialog
            }
            
            // 显示对话框
            timePickerDialog.show()
        }
        
        private fun handleDurationSelected(hours: Int, minutes: Int, seconds: Int) {
            // 计算总秒数
            val totalSeconds = hours * 3600 + minutes * 60 + seconds
            
            // 确保在UI线程中更新
            // 使用Handler确保在正确的线程执行
            Handler(Looper.getMainLooper()).post { 
                // 检查Activity是否还存在
                if (isFinishing || isDestroyed) {
                    return@post
                }
                
                // 将结果传递给JavaScript，同时支持新旧两个回调方法
                if (::webView.isInitialized) {
                    try {
                        // 调用新的回调方法
                        webView.evaluateJavascript(
                            "javascript:if (typeof window.cyberMuYu !== 'undefined') { " +
                            "window.cyberMuYu.onDurationSelected($hours, $minutes, $seconds); " +
                            "}",
                            null
                        )
                        
                        // 同时调用旧的回调方法，确保兼容
                        webView.evaluateJavascript(
                            "javascript:if (typeof window.cyberMuYu !== 'undefined') { " +
                            "window.cyberMuYu.setCustomMeditationDuration($hours, $minutes, $seconds); " +
                            "}",
                            null
                        )
                    } catch (e: Exception) {
                        println("传递冥想时长到JavaScript失败: ${e.message}")
                    }
                }
                
                // 显示Toast提示
                if (!isFinishing && !isDestroyed) {
                    Toast.makeText(this@MainActivity, 
                        "冥想时长设置为: ${hours}小时${minutes}分钟", 
                        Toast.LENGTH_SHORT).show()
                }
            }
        }
    }
    
    /**
     * 根据设备类型设置屏幕方向
     */
    private fun setScreenOrientationBasedOnDevice() {
        try {
            // 检查Activity状态
            if (isFinishing || isDestroyed) {
                return
            }
            
            // 检测设备是否为平板
            val isTablet = isTabletDevice()
            
            if (isTablet) {
                // 平板设备，允许旋转为横屏
                requestedOrientation = ActivityInfo.SCREEN_ORIENTATION_UNSPECIFIED
                println("设备为平板，允许旋转为横屏")
            } else {
                // 手机设备，禁止旋转为横屏，固定为竖屏
                requestedOrientation = ActivityInfo.SCREEN_ORIENTATION_PORTRAIT
                println("设备为手机，禁止旋转为横屏")
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }
    
    /**
     * 检测设备是否为平板
     * @return true if the device is a tablet, false otherwise
     */
    private fun isTabletDevice(): Boolean {
        // 方法1：根据屏幕尺寸判断
        // 平板设备的最小宽度通常大于600dp
        val resources = Resources.getSystem()
        val config = resources.configuration
        val screenLayout = config.screenLayout
        return (screenLayout and Configuration.SCREENLAYOUT_SIZE_MASK) >= Configuration.SCREENLAYOUT_SIZE_LARGE
    }
    
    /**
     * JavaScript接口，用于显示Android原生Toast提示
     */
    private inner class NotificationInterface {
        @android.webkit.JavascriptInterface
        fun showToast(message: String) {
            // 确保在UI线程中显示Toast
            runOnUiThread { 
                // 检查Activity是否还存在
                if (!isFinishing && !isDestroyed) {
                    // 显示Toast提示
                    Toast.makeText(this@MainActivity, message, Toast.LENGTH_SHORT).show()
                }
            }
        }
    }
    
    /**
     * JavaScript接口，用于触发Android设备振动
     */
    private inner class VibrationInterface {
        @android.webkit.JavascriptInterface
        fun vibrate(milliseconds: Long) {
            println("Android振动接口被调用，时长: $milliseconds ms")
            // 确保在UI线程中执行振动
            runOnUiThread { 
                println("在UI线程中执行振动")
                // 检查Activity是否还存在
                if (!isFinishing && !isDestroyed) {
                    println("Activity状态正常")
                    // 获取振动服务
                    val vibrator = getSystemService(VIBRATOR_SERVICE) as? android.os.Vibrator
                    println("振动服务获取结果: ${if (vibrator != null) "成功" else "失败"}")
                    vibrator?.let { 
                        // 检查设备是否支持振动
                        val hasVibrator = it.hasVibrator()
                        println("设备是否支持振动: $hasVibrator")
                        if (hasVibrator) {
                            // 触发振动，兼容不同Android版本
                            println("开始执行振动，时长: $milliseconds ms")
                            try {
                                // 检查Android版本
                                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                                    // Android 26+ 使用VibrateEffect
                                    println("使用Android 26+ VibrateEffect API")
                                    val effect = android.os.VibrationEffect.createOneShot(milliseconds, android.os.VibrationEffect.DEFAULT_AMPLITUDE)
                                    it.vibrate(effect)
                                } else {
                                    // Android 25及以下 使用旧API
                                    println("使用Android 25- 旧振动API")
                                    it.vibrate(milliseconds)
                                }
                                println("振动执行完成")
                            } catch (e: Exception) {
                                System.err.println("振动执行失败: ${e.message}")
                                e.printStackTrace()
                            }
                        }
                    }
                }
            }
        }
        
        @android.webkit.JavascriptInterface
        fun vibratePattern(pattern: LongArray, repeat: Int) {
            // 确保在UI线程中执行振动
            runOnUiThread { 
                // 检查Activity是否还存在
                if (!isFinishing && !isDestroyed) {
                    // 获取振动服务
                    val vibrator = getSystemService(VIBRATOR_SERVICE) as? android.os.Vibrator
                    vibrator?.let { 
                        // 检查设备是否支持振动
                        if (it.hasVibrator()) {
                            // 触发振动模式
                            it.vibrate(pattern, repeat)
                        }
                    }
                }
            }
        }
        
        @android.webkit.JavascriptInterface
        fun cancelVibration() {
            // 确保在UI线程中执行振动取消
            runOnUiThread { 
                // 检查Activity是否还存在
                if (!isFinishing && !isDestroyed) {
                    // 获取振动服务
                    val vibrator = getSystemService(VIBRATOR_SERVICE) as? android.os.Vibrator
                    vibrator?.let { 
                        // 取消所有振动
                        it.cancel()
                    }
                }
            }
        }
    }
    
    /**
     * JavaScript接口，用于处理小惊喜点击事件
     */
    private inner class SurpriseInterface {
        @android.webkit.JavascriptInterface
        fun showSurprise() {
            // 确保在UI线程中执行跳转
            runOnUiThread { 
                // 检查Activity是否还存在
                if (!isFinishing && !isDestroyed) {
                    // 创建Intent跳转到SurpriseActivity
                    val intent = Intent(this@MainActivity, SurpriseActivity::class.java)
                    intent.putExtra("username", username)
                    startActivity(intent)
                }
            }
        }
    }
}