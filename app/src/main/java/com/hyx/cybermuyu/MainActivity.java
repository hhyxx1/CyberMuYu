package com.hyx.cybermuyu;

import android.app.Activity;
import android.app.TimePickerDialog;
import android.content.Intent;
import android.content.res.Configuration;
import android.content.res.Resources;
import android.media.AudioManager;
import android.media.MediaMetadata;
import android.media.session.MediaSession;
import android.media.session.MediaSessionManager;
import android.media.session.PlaybackState;
import android.net.Uri;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.provider.MediaStore;
import android.view.KeyEvent;
import android.view.Window;
import android.view.WindowManager;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.widget.Toast;
import android.webkit.ValueCallback;



public class MainActivity extends Activity {
    private WebView webView;
    private boolean doubleBackToExitPressedOnce = false;
    private Handler mHandler = new Handler(Looper.getMainLooper());
    
    // MediaSession相关变量
    private MediaSessionManager mediaSessionManager;
    private MediaSession mediaSession;
    private boolean isWhiteNoisePlaying = false;
    private long whiteNoiseDuration = 0; // 白噪音总时长（毫秒）
    private long whiteNoisePosition = 0; // 当前播放位置（毫秒）
    private Handler whiteNoiseHandler = new Handler(Looper.getMainLooper());
    private Runnable whiteNoiseProgressUpdater;
    private static final int PROGRESS_UPDATE_INTERVAL = 1000; // 进度更新间隔（毫秒）
    
    // 文件选择相关变量
    private static final int FILE_SELECT_REQUEST = 1; // 文件选择请求码
    private String customMusicUri = null; // 自定义音乐文件URI
    private String whiteNoiseName = "白噪音"; // 白噪音名称，默认"白噪音"

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        // 根据设备类型设置屏幕方向
        setScreenOrientationBasedOnDevice();
        
        // 设置全屏模式
        requestWindowFeature(Window.FEATURE_NO_TITLE);
        getWindow().setFlags(WindowManager.LayoutParams.FLAG_FULLSCREEN, 
                            WindowManager.LayoutParams.FLAG_FULLSCREEN);
        
        webView = new WebView(this);
        setContentView(webView);

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        
        // 设置JavaScript接口，用于接收白噪音状态变化
        webView.addJavascriptInterface(new WhiteNoiseInterface(), "AndroidWhiteNoiseInterface");
        
        // 设置JavaScript接口，用于冥想时长选择
        webView.addJavascriptInterface(new MeditationInterface(), "AndroidMeditationInterface");
        
        // 设置JavaScript接口，用于显示原生Toast提示
        webView.addJavascriptInterface(new NotificationInterface(), "AndroidNotificationInterface");
        
        webView.loadUrl("file:///android_asset/index.html");
        
        // 初始化MediaSession
        initMediaSession();
        
        // 设置音频焦点
        setVolumeControlStream(AudioManager.STREAM_MUSIC);
    }
    
    @Override
    public boolean onKeyDown(int keyCode, KeyEvent event) {
        // 处理返回键事件
        if (keyCode == KeyEvent.KEYCODE_BACK) {
            // 定义一个标志来跟踪是否处理了返回键
            final boolean[] jsHandled = {false};
            
            // 先尝试将返回键事件传递给JavaScript
            webView.evaluateJavascript(
                "javascript:var result = false; try { if (typeof window.cyberMuYu !== 'undefined') { result = window.cyberMuYu.handleBackKey(); } } catch (e) { console.error('Error in handleBackKey:', e); result = false; }; result;",
                new android.webkit.ValueCallback<String>() {
                    @Override
                    public void onReceiveValue(String value) {
                        // 处理JavaScript返回的结果
                        String result = value != null ? value.trim() : "false";
                        
                        // 移除可能的引号
                        result = result.replaceAll("[\"']", "");
                        
                        // 检查结果
                        boolean handled = "true".equalsIgnoreCase(result);
                        
                        if (!handled) {
                            // 如果JavaScript没有处理返回键，则处理双击退出
                            if (doubleBackToExitPressedOnce) {
                                // 第二次点击返回键，退出应用
                                finishAffinity(); // 关闭所有关联的Activity，完全退出应用
                                System.exit(0); // 结束应用进程
                            } else {
                                // 第一次点击返回键，提示用户再次点击退出
                                doubleBackToExitPressedOnce = true;
                                Toast.makeText(MainActivity.this, "再按一次退出应用", Toast.LENGTH_SHORT).show();
                                
                                // 3秒后重置标志
                                mHandler.postDelayed(new Runnable() {
                                    @Override
                                    public void run() {
                                        doubleBackToExitPressedOnce = false;
                                    }
                                }, 3000);
                            }
                        }
                    }
                }
            );
            
            return true;
        }
        
        return super.onKeyDown(keyCode, event);
    }
    
    @Override
    protected void onStart() {
        super.onStart();
        if (mediaSession != null) {
            mediaSession.setActive(true);
        }
    }
    
    @Override
    protected void onPause() {
        super.onPause();
        // 暂停进度更新
        if (whiteNoiseProgressUpdater != null) {
            whiteNoiseHandler.removeCallbacks(whiteNoiseProgressUpdater);
        }
    }
    
    @Override
    protected void onResume() {
        super.onResume();
        // 恢复进度更新
        if (isWhiteNoisePlaying && whiteNoiseProgressUpdater != null) {
            whiteNoiseHandler.postDelayed(whiteNoiseProgressUpdater, PROGRESS_UPDATE_INTERVAL);
        }
    }
    
    @Override
    protected void onStop() {
        super.onStop();
        // 应用退出到后台时不要销毁MediaSession，只有在停止播放白噪音后才设置为非活动状态
        // if (mediaSession != null) {
        //     mediaSession.setActive(false);
        // }
    }
    
    @Override
    protected void onDestroy() {
        super.onDestroy();
        // 释放MediaSession资源
        if (mediaSession != null) {
            mediaSession.release();
            mediaSession = null;
        }
        
        // 停止进度更新
        if (whiteNoiseProgressUpdater != null) {
            whiteNoiseHandler.removeCallbacks(whiteNoiseProgressUpdater);
        }
        
        // 确保WebView资源被正确释放
        if (webView != null) {
            webView.loadUrl("about:blank");
            webView.stopLoading();
            webView.clearHistory();
            webView.clearCache(true);
            webView.removeAllViews();
            webView.destroy();
            webView = null;
        }
    }
    
    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        
        if (requestCode == FILE_SELECT_REQUEST && resultCode == RESULT_OK) {
            // 处理文件选择结果
            if (data != null) {
                Uri uri = data.getData();
                if (uri != null) {
                    // 获取文件URI
                    customMusicUri = uri.toString();
                    System.out.println("选择的音乐文件URI: " + customMusicUri);
                    
                    // 将文件URI传递给JavaScript
                    webView.evaluateJavascript(
                            "javascript:if (typeof window.cyberMuYu !== 'undefined') { " +
                            "window.cyberMuYu.onCustomMusicSelected('" + customMusicUri + "'); " +
                            "}",
                            null
                    );
                    
                    Toast.makeText(this, "音乐文件已选择", Toast.LENGTH_SHORT).show();
                }
            }
        }
    }
    
    /**
     * 初始化MediaSession，实现系统级媒体控制
     */
    private void initMediaSession() {
        try {
            // 获取MediaSessionManager
            mediaSessionManager = (MediaSessionManager) getSystemService(MediaSessionManager.class);
            
            // 创建MediaSession
            mediaSession = new MediaSession(this, "WhiteNoiseSession");
            
            // 设置回调
            mediaSession.setCallback(new MediaSession.Callback() {
                @Override
                public void onPlay() {
                    super.onPlay();
                    // 调用JavaScript确保白噪音开始播放
                    webView.evaluateJavascript(
                            "javascript:if (typeof window.cyberMuYu !== 'undefined') { if (!window.cyberMuYu.isWhiteNoisePlaying) { window.cyberMuYu.toggleWhiteNoise(); } }",
                            null
                    );
                }
                
                @Override
                public void onPause() {
                    super.onPause();
                    // 调用JavaScript确保白噪音停止播放
                    webView.evaluateJavascript(
                            "javascript:if (typeof window.cyberMuYu !== 'undefined') { if (window.cyberMuYu.isWhiteNoisePlaying) { window.cyberMuYu.toggleWhiteNoise(); } }",
                            null
                    );
                }
                
                @Override
                public void onSeekTo(long position) {
                    super.onSeekTo(position);
                    // 更新当前播放位置，不限制最大位置
                    whiteNoisePosition = position;
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
                    );
                    // 更新播放状态
                    updatePlaybackState();
                }
            });
            
            // 设置标志
            mediaSession.setFlags(MediaSession.FLAG_HANDLES_MEDIA_BUTTONS | MediaSession.FLAG_HANDLES_TRANSPORT_CONTROLS);
            
            // 初始化媒体元数据，直接设置固定时长（1小时28分19秒）
            long initialDuration = 5299000; // 1小时28分19秒 = 5299秒 = 5299000毫秒
            MediaMetadata metadata = new MediaMetadata.Builder()
                    .putString(MediaMetadata.METADATA_KEY_TITLE, whiteNoiseName) // 使用动态更新的音乐名称
                    .putString(MediaMetadata.METADATA_KEY_ARTIST, "CyberMuYu")
                    .putLong(MediaMetadata.METADATA_KEY_DURATION, initialDuration)
                    .build();
            mediaSession.setMetadata(metadata);
            
            // 初始化时长变量
            whiteNoiseDuration = initialDuration;
            System.out.println("初始化白噪音时长为: " + whiteNoiseDuration + "ms");
            
            // 初始化播放状态
            updatePlaybackState();
            
            // 初始化进度更新器
            whiteNoiseProgressUpdater = new Runnable() {
                @Override
                public void run() {
                    if (isWhiteNoisePlaying) {
                        // 更新播放状态，直接使用JavaScript通过接口传递的currentTime
                        updatePlaybackState();
                    }
                    // 继续更新进度
                    whiteNoiseHandler.postDelayed(this, PROGRESS_UPDATE_INTERVAL);
                }
            };
            
        } catch (Exception e) {
            e.printStackTrace();
        }
    }
    
    /**
     * 更新播放状态
     */
    private void updatePlaybackState() {
        if (mediaSession == null) {
            return;
        }
        
        int state = isWhiteNoisePlaying ? PlaybackState.STATE_PLAYING : PlaybackState.STATE_PAUSED;
        
        // 设置基本操作
        long actions = PlaybackState.ACTION_PLAY | PlaybackState.ACTION_PAUSE | PlaybackState.ACTION_SEEK_TO;
        
        PlaybackState.Builder stateBuilder = new PlaybackState.Builder()
                .setState(state, whiteNoisePosition, 1.0f)
                .setActions(actions);
        
        // 正确使用JavaScript传递过来的真实时长
        // 确保时长不会小于0
        long displayDuration = Math.max(whiteNoiseDuration, 0);
        
        // 更新媒体元数据，包含时长信息
        MediaMetadata.Builder metadataBuilder = new MediaMetadata.Builder()
                .putString(MediaMetadata.METADATA_KEY_TITLE, whiteNoiseName) // 使用动态更新的音乐名称
                .putString(MediaMetadata.METADATA_KEY_ARTIST, "CyberMuYu");
        
        // 只有当我们有有效的时长时，才设置时长信息
        if (displayDuration > 0) {
            metadataBuilder.putLong(MediaMetadata.METADATA_KEY_DURATION, displayDuration);
        }
        
        mediaSession.setMetadata(metadataBuilder.build());
        mediaSession.setPlaybackState(stateBuilder.build());
    }
    
    /**
     * 启动白噪音
     */
    private void startWhiteNoise() {
        isWhiteNoisePlaying = true;
        // 启动进度更新，每秒更新一次
        whiteNoiseHandler.postDelayed(whiteNoiseProgressUpdater, PROGRESS_UPDATE_INTERVAL);
        // 更新播放状态
        updatePlaybackState();
    }
    
    /**
     * 停止白噪音
     */
    private void stopWhiteNoise() {
        isWhiteNoisePlaying = false;
        // 停止进度更新
        whiteNoiseHandler.removeCallbacks(whiteNoiseProgressUpdater);
        // 停止白噪音后销毁MediaSession
        if (mediaSession != null) {
            mediaSession.setActive(false);
        }
        // 更新播放状态
        updatePlaybackState();
    }
    
    /**
     * JavaScript接口，用于接收白噪音状态变化
     */
    private class WhiteNoiseInterface {
        @android.webkit.JavascriptInterface
        public void onWhiteNoiseStateChanged(boolean playing) {
            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    isWhiteNoisePlaying = playing;
                    if (playing) {
                        // 开始播放白噪音时，激活MediaSession
                        if (mediaSession != null && !mediaSession.isActive()) {
                            mediaSession.setActive(true);
                        }
                        startWhiteNoise();
                    } else {
                        stopWhiteNoise();
                    }
                }
            });
        }
        
        @android.webkit.JavascriptInterface
        public void onWhiteNoiseDurationChanged(double duration) {
            // 立即将duration转换为final变量，以便在lambda中使用
            final long finalDuration = (long) (duration * 1000);
            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    // 正确读取音乐时长
                    long newDuration = finalDuration;
                    // 只有当时长发生变化时才更新，避免不必要的更新
                    if (newDuration != whiteNoiseDuration) {
                        whiteNoiseDuration = newDuration;
                        // 打印日志，便于调试
                        System.out.println("白噪音时长更新为: " + whiteNoiseDuration + "ms");
                        // 更新播放状态，确保MediaSession显示正确的时长
                        updatePlaybackState();
                    }
                }
            });
        }
        
        @android.webkit.JavascriptInterface
        public void onWhiteNoiseCurrentTimeChanged(double currentTime) {
            // 立即将currentTime转换为final变量，以便在lambda中使用
            final long finalPosition = (long) (currentTime * 1000);
            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    // 实时更新播放进度，不限制最大位置
                    whiteNoisePosition = finalPosition;
                    updatePlaybackState();
                }
            });
        }
        
        @android.webkit.JavascriptInterface
        public void selectCustomMusic() {
            // 打开系统文件管理器选择音乐文件
            Intent intent = new Intent(Intent.ACTION_GET_CONTENT);
            intent.setType("audio/*"); // 只显示音频文件
            intent.addCategory(Intent.CATEGORY_OPENABLE);
            
            try {
                startActivityForResult(Intent.createChooser(intent, "选择音乐文件"), FILE_SELECT_REQUEST);
            } catch (android.content.ActivityNotFoundException ex) {
                Toast.makeText(MainActivity.this, "请安装文件管理器", Toast.LENGTH_SHORT).show();
            }
        }
        
        @android.webkit.JavascriptInterface
        public String getCustomMusicUri() {
            // 返回自定义音乐文件URI
            return customMusicUri;
        }
        
        @android.webkit.JavascriptInterface
        public void onWhiteNoiseNameChanged(String name) {
            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    // 更新白噪音名称
                    whiteNoiseName = name;
                    System.out.println("白噪音名称更新为: " + whiteNoiseName);
                    // 更新播放状态，确保MediaSession显示正确的名称
                    updatePlaybackState();
                }
            });
        }
    }
    
    /**
     * JavaScript接口，用于处理冥想时长选择
     */
    private class MeditationInterface {
        @android.webkit.JavascriptInterface
        public void selectCustomDuration() {
            // 显示时长选择器
            showTimePickerDialog();
        }
        
        @android.webkit.JavascriptInterface
        public void showDurationPicker(int currentHours, int currentMinutes, int currentSeconds) {
            // 显示时长选择器，使用当前时长作为默认值
            showTimePickerDialog(currentHours, currentMinutes);
        }
        
        private void showTimePickerDialog() {
            // 默认调用，使用0小时0分钟作为默认值
            showTimePickerDialog(0, 0);
        }
        
        private void showTimePickerDialog(int defaultHours, int defaultMinutes) {
            // 创建一个自定义时长选择器
            // 使用TimePickerDialog，设置新款Material Design风格
            TimePickerDialog timePickerDialog = new TimePickerDialog(
                MainActivity.this,
                // 使用新款Material Design风格主题
                android.R.style.Theme_DeviceDefault_Light_Dialog,
                (view, hourOfDay, minute) -> {
                    // 用户选择完成，处理结果
                    // 注意：TimePickerDialog不支持秒选择，这里我们使用分钟
                    // 如果需要秒，可能需要自定义对话框
                    handleDurationSelected(hourOfDay, minute, 0);
                },
                defaultHours, // 默认小时
                defaultMinutes, // 默认分钟
                true // 24小时制
            );
            
            // 设置标题
            timePickerDialog.setTitle("选择冥想时长");
            
            // 设置对话框样式，使其更现代化
            if (timePickerDialog.getWindow() != null) {
                // 设置对话框背景为白色，带有圆角效果
                timePickerDialog.getWindow().setBackgroundDrawableResource(android.R.color.white);
                // 设置对话框的动画效果
                timePickerDialog.getWindow().setWindowAnimations(android.R.style.Animation_Dialog);
            }
            
            // 显示对话框
            timePickerDialog.show();
        }
        
        private void handleDurationSelected(int hours, int minutes, int seconds) {
            // 计算总秒数
            int totalSeconds = hours * 3600 + minutes * 60 + seconds;
            
            // 确保在UI线程中更新
            // 使用Handler确保在正确的线程执行
            new Handler(Looper.getMainLooper()).post(() -> {
                // 检查Activity是否还存在
                if (isFinishing() || isDestroyed()) {
                    return;
                }
                
                // 将结果传递给JavaScript，同时支持新旧两个回调方法
                if (webView != null) {
                    try {
                        // 调用新的回调方法
                        webView.evaluateJavascript(
                            "javascript:if (typeof window.cyberMuYu !== 'undefined') { " +
                            "window.cyberMuYu.onDurationSelected(" + hours + ", " + minutes + ", " + seconds + "); " +
                            "}",
                            null
                        );
                        
                        // 同时调用旧的回调方法，确保兼容
                        webView.evaluateJavascript(
                            "javascript:if (typeof window.cyberMuYu !== 'undefined') { " +
                            "window.cyberMuYu.setCustomMeditationDuration(" + hours + ", " + minutes + ", " + seconds + "); " +
                            "}",
                            null
                        );
                    } catch (Exception e) {
                        System.out.println("传递冥想时长到JavaScript失败: " + e.getMessage());
                    }
                }
                
                // 显示Toast提示
                if (!isFinishing() && !isDestroyed()) {
                    Toast.makeText(MainActivity.this, 
                        "冥想时长设置为: " + hours + "小时" + minutes + "分钟", 
                        Toast.LENGTH_SHORT).show();
                }
            });
        }
    }
    
    /**
     * 根据设备类型设置屏幕方向
     */
    private void setScreenOrientationBasedOnDevice() {
        // 检测设备是否为平板
        boolean isTablet = isTabletDevice();
        
        if (isTablet) {
            // 平板设备，允许旋转为横屏
            setRequestedOrientation(Configuration.ORIENTATION_UNSPECIFIED);
            System.out.println("设备为平板，允许旋转为横屏");
        } else {
            // 手机设备，禁止旋转为横屏，固定为竖屏
            setRequestedOrientation(Configuration.ORIENTATION_PORTRAIT);
            System.out.println("设备为手机，禁止旋转为横屏");
        }
    }
    
    /**
     * 检测设备是否为平板
     * @return true if the device is a tablet, false otherwise
     */
    private boolean isTabletDevice() {
        // 方法1：根据屏幕尺寸判断
        // 平板设备的最小宽度通常大于600dp
        Resources resources = getResources();
        Configuration config = resources.getConfiguration();
        int screenLayout = config.screenLayout;
        return (screenLayout & Configuration.SCREENLAYOUT_SIZE_MASK) >= Configuration.SCREENLAYOUT_SIZE_LARGE;
    }
    
    /**
     * JavaScript接口，用于显示Android原生Toast提示
     */
    private class NotificationInterface {
        @android.webkit.JavascriptInterface
        public void showToast(String message) {
            // 确保在UI线程中显示Toast
            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    // 检查Activity是否还存在
                    if (!isFinishing() && !isDestroyed()) {
                        // 显示Toast提示
                        Toast.makeText(MainActivity.this, message, Toast.LENGTH_SHORT).show();
                    }
                }
            });
        }
    }
}