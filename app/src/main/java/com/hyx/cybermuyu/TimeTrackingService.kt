package com.hyx.cybermuyu

import android.app.Service
import android.content.Intent
import android.os.Handler
import android.os.IBinder
import android.util.Log
import androidx.localbroadcastmanager.content.LocalBroadcastManager
import java.io.BufferedReader
import java.io.IOException
import java.io.InputStreamReader
import java.net.HttpURLConnection
import java.net.URL
import java.net.URLEncoder
import java.util.concurrent.atomic.AtomicBoolean
import java.util.concurrent.atomic.AtomicLong
import org.json.JSONObject

class TimeTrackingService : Service() {

    private val handler = Handler()
    private val isTracking = AtomicBoolean(false)
    private val startTime = AtomicLong(0L)
    private val accumulatedTime = AtomicLong(0L) // 存储自上次上传以来的累积时长（秒）
    private val totalTime = AtomicLong(0L) // 存储本地总时长（秒）
    private val lastUploadTime = AtomicLong(0L) // 上次上传的时间戳（毫秒）
    private val uploadInterval = 60000L // 每分钟上传一次
    private val updateInterval = 1000L // 每秒更新一次
    private val retryInterval = 300000L // 5分钟重试一次
    private val achievementCheckInterval = 60000L // 每分钟检查一次成就
    private var username: String? = null // 当前用户名
    private val unlockedAchievements = HashSet<String>() // 存储已解锁的成就ID
    private val pendingAchievements = HashSet<String>() // 存储待上传的成就ID
    
    // 本地存储键
    private val PREF_NAME = "TimeTrackingPrefs"
    private val KEY_TOTAL_TIME = "totalTime"
    private val KEY_USERNAME = "username"
    private val KEY_UNLOCKED_ACHIEVEMENTS = "unlockedAchievements"
    private val KEY_PENDING_ACHIEVEMENTS = "pendingAchievements"
    
    // API地址
    private val API_URL by lazy { "${getString(R.string.api_base_url)}/app-usage-time" }
    private val ACHIEVEMENT_API_URL by lazy { "${getString(R.string.api_base_url)}/achievement" }
    private val USER_ACHIEVEMENTS_API_URL by lazy { "${getString(R.string.api_base_url)}/achievements" }
    
    // 成就ID
    private val ACHIEVEMENT_ONE_HOUR = "one-hour-usage"
    
    companion object {
        // 广播动作
        const val ACTION_TIME_UPDATE = "com.hyx.cybermuyu.TIME_UPDATE"
        const val EXTRA_TIME = "time"
        const val EXTRA_TOTAL_TIME = "totalTime"

        // 成就解锁广播
        const val ACTION_ACHIEVEMENT_UNLOCKED = "com.hyx.cybermuyu.ACHIEVEMENT_UNLOCKED"
        const val EXTRA_ACHIEVEMENT_ID = "achievementId"

        // 启动服务的动作
        const val ACTION_START_TRACKING = "com.hyx.cybermuyu.START_TRACKING"
        const val ACTION_STOP_TRACKING = "com.hyx.cybermuyu.STOP_TRACKING"
    }
    
    private val timeUpdateRunnable = object : Runnable {
        private var lastAchievementCheckTime = 0L // 上次检查成就的时间戳
        
        override fun run() {
            if (isTracking.get()) {
                val currentTime = System.currentTimeMillis()
                val elapsedTime = (currentTime - startTime.get()) / 1000
                val currentAccumulated = elapsedTime + accumulatedTime.get()
                
                // 发送广播更新UI
                sendTimeUpdateBroadcast(elapsedTime, totalTime.get() + currentAccumulated)
                
                // 检查是否需要上传 - 每分钟自动上传一次
                if (currentTime - lastUploadTime.get() >= uploadInterval) {
                    if (currentAccumulated > 0) {
                        uploadUsageTime(currentAccumulated)
                        accumulatedTime.addAndGet(-currentAccumulated)
                    }
                    lastUploadTime.set(currentTime)
                }
                
                // 每分钟检查一次成就
                if (currentTime - lastAchievementCheckTime >= achievementCheckInterval) {
                    val currentTotalTime = totalTime.get() + currentAccumulated
                    checkAchievementsWithTotalTime(currentTotalTime)
                    lastAchievementCheckTime = currentTime
                }
            }
            handler.postDelayed(this, updateInterval)
        }
    }
    
    // 待上传成就的重试任务
    private val pendingAchievementsRetryRunnable = object : Runnable {
        override fun run() {
            // 如果有待上传成就，尝试上传
            if (pendingAchievements.isNotEmpty() && username != null) {
                uploadPendingAchievements()
            }
            // 每5分钟重试一次
            handler.postDelayed(this, retryInterval)
        }
    }
    
    // 独立的成就检查定时任务
    private val achievementCheckRunnable = object : Runnable {
        override fun run() {
            // 每分钟检查一次成就
            checkAchievements()
            Log.d("TimeTrackingService", "定时检查成就")
            // 继续下一次检查
            handler.postDelayed(this, achievementCheckInterval)
        }
    }
    
    private fun sendTimeUpdateBroadcast(currentSessionTime: Long, totalUsageTime: Long) {
        val intent = Intent(ACTION_TIME_UPDATE)
        intent.putExtra(EXTRA_TIME, currentSessionTime)
        intent.putExtra(EXTRA_TOTAL_TIME, totalUsageTime)
        LocalBroadcastManager.getInstance(this).sendBroadcast(intent)
    }
    
    private fun sendAchievementUnlockedBroadcast(achievementId: String) {
        val intent = Intent(ACTION_ACHIEVEMENT_UNLOCKED)
        intent.putExtra(EXTRA_ACHIEVEMENT_ID, achievementId)
        LocalBroadcastManager.getInstance(this).sendBroadcast(intent)
        Log.d("TimeTrackingService", "发送成就解锁广播: $achievementId")
    }

    private fun startPendingAchievementsRetry() {
        handler.postDelayed(pendingAchievementsRetryRunnable, retryInterval)
        Log.d("TimeTrackingService", "启动待上传成就重试机制")
    }
    
    private fun startAchievementCheckRunnable() {
        handler.postDelayed(achievementCheckRunnable, achievementCheckInterval)
        Log.d("TimeTrackingService", "启动独立的成就检查定时任务")
    }

    private fun uploadPendingAchievements() {
        username?.let { user ->
            // 复制一份待上传成就列表，避免并发修改问题
            val achievementsToUpload = ArrayList(pendingAchievements)
            
            Log.d("TimeTrackingService", "开始上传待上传成就，待上传数量: ${achievementsToUpload.size}, 用户名: $user")
            Log.d("TimeTrackingService", "待上传成就ID列表: $achievementsToUpload")

            Thread {
                for (achievementId in achievementsToUpload) {
                    try {
                        val url = URL(ACHIEVEMENT_API_URL)
                        val connection = url.openConnection() as HttpURLConnection
                        connection.requestMethod = "POST"
                        connection.doOutput = true
                        connection.setRequestProperty("Content-Type", "application/json; charset=UTF-8")
                        connection.connectTimeout = 10000
                        connection.readTimeout = 10000

                        val postData = "{\"username\":\"$user\",\"achievementId\":\"$achievementId\",\"unlocked\":true}"
                        val outputStream = connection.outputStream
                        outputStream.write(postData.toByteArray(charset("UTF-8")))
                        outputStream.flush()
                        outputStream.close()

                        val responseCode = connection.responseCode
                        if (responseCode == HttpURLConnection.HTTP_OK) {
                            // 读取响应内容，用于诊断
                            val inputStream = connection.inputStream
                            val bufferedReader = BufferedReader(InputStreamReader(inputStream))
                            val response = StringBuilder()
                            var line: String?
                            while (bufferedReader.readLine().also { lineValue -> line = lineValue } != null) {
                                response.append(line)
                            }
                            bufferedReader.close()
                            inputStream.close()
                            
                            val responseText = response.toString()
                            Log.d("TimeTrackingService", "待上传成就上传成功，响应码: $responseCode, 成就ID: $achievementId, 响应内容: $responseText")
                            
                            // 上传成功，从待上传列表中移除
                            synchronized(pendingAchievements) {
                                pendingAchievements.remove(achievementId)
                                savePendingAchievementsToPrefs()
                                Log.d("TimeTrackingService", "待上传成就已从列表中移除: $achievementId, 当前待上传数量: ${pendingAchievements.size}")
                            }
                        } else {
                            // 读取错误响应内容，用于诊断
                            var errorResponse = ""
                            try {
                                val errorStream = connection.errorStream
                                if (errorStream != null) {
                                    val bufferedReader = BufferedReader(InputStreamReader(errorStream))
                                    val response = StringBuilder()
                                    var line: String?
                                    while (bufferedReader.readLine().also { lineValue -> line = lineValue } != null) {
                                        response.append(line)
                                    }
                                    bufferedReader.close()
                                    errorStream.close()
                                    errorResponse = response.toString()
                                }
                            } catch (e: IOException) {
                                Log.e("TimeTrackingService", "读取错误响应时发生异常: ${e.message}")
                            }
                            
                            Log.e("TimeTrackingService", "待上传成就上传失败，响应码: $responseCode, 成就ID: $achievementId, 错误内容: $errorResponse")
                            // 上传失败，保留在待上传列表中，等待下一次重试
                            Log.d("TimeTrackingService", "待上传成就保留在列表中，等待下次重试: $achievementId")
                        }

                        connection.disconnect()
                    } catch (e: IOException) {
                    Log.e("TimeTrackingService", "待上传成就上传异常，成就ID: $achievementId, 异常信息: ${e.message}")
                    Log.e("TimeTrackingService", "异常堆栈信息:", e)
                    // 异常情况下，保留在待上传列表中
                    Log.d("TimeTrackingService", "待上传成就保留在列表中，等待下次重试: $achievementId")
                    }
                }
            }.start()
        } ?: run {
            Log.e("TimeTrackingService", "Failed to upload pending achievements: username is null")
        }
    }

    private fun syncAchievementsFromServer() {
        username?.let { user ->
            Thread {
                try {
                    // 构建带用户名参数的URL，对用户名进行URL编码
                    val encodedUsername = URLEncoder.encode(user, "UTF-8")
                    val url = URL("$USER_ACHIEVEMENTS_API_URL?username=$encodedUsername")
                    val connection = url.openConnection() as HttpURLConnection
                    connection.requestMethod = "GET"
                    connection.connectTimeout = 10000
                    connection.readTimeout = 10000

                    val responseCode = connection.responseCode
                    if (responseCode == HttpURLConnection.HTTP_OK) {
                        // 读取响应内容
                        val inputStream = connection.inputStream
                        val bufferedReader = BufferedReader(InputStreamReader(inputStream))
                        val response = StringBuilder()
                        var line: String?
                        while (bufferedReader.readLine().also { lineValue -> line = lineValue } != null) {
                            response.append(line)
                        }
                        bufferedReader.close()
                        inputStream.close()

                        val responseJson = response.toString()
                        Log.d("TimeTrackingService", "从服务器获取成就: $responseJson")

                        // 解析服务器返回的成就数据
                        // 假设返回的格式是 [{"achievementId": "xxx", "unlocked": true}, ...]
                        // 这里需要根据实际API返回格式进行调整
                        val serverUnlockedAchievements = parseUnlockedAchievementsFromJson(responseJson)

                        // 更新本地成就状态
                        synchronized(unlockedAchievements) {
                            // 添加服务器上已解锁但本地未记录的成就
                            val newlyUnlocked = serverUnlockedAchievements.filterNot { unlockedAchievements.contains(it) }
                            unlockedAchievements.addAll(serverUnlockedAchievements)
                            saveUnlockedAchievementsToPrefs()

                            // 通知新解锁的成就
                            for (achievementId in newlyUnlocked) {
                                sendAchievementUnlockedBroadcast(achievementId)
                            }
                        }

                        // 清理待上传列表中已经在服务器上存在的成就
                        synchronized(pendingAchievements) {
                            val achievementsToRemove = pendingAchievements.intersect(serverUnlockedAchievements).toSet()
                            pendingAchievements.removeAll(achievementsToRemove)
                            if (achievementsToRemove.isNotEmpty()) {
                                savePendingAchievementsToPrefs()
                                Log.d("TimeTrackingService", "从待上传列表移除已同步成就: $achievementsToRemove")
                            }
                        }
                    } else {
                        Log.e("TimeTrackingService", "从服务器同步成就失败，响应码: $responseCode")
                    }

                    connection.disconnect()
                } catch (e: IOException) {
                    Log.e("TimeTrackingService", "从服务器同步成就时发生异常: ${e.message}")
                }
            }.start()
        } ?: run {
            Log.e("TimeTrackingService", "Failed to sync achievements: username is null")
        }
    }

    private fun parseUnlockedAchievementsFromJson(json: String): Set<String> {
        val result = HashSet<String>()
        try {
            // 检查响应是否包含success字段
            if (Regex("""\s*"success"\s*:\s*true\s*""").containsMatchIn(json)) {
                // 提取成就数组部分，假设格式为 {"success": true, "achievements": [{"achievementId": "xxx"}, ...]}
                val achievementsArrayRegex = Regex("""\s*"achievements"\s*:\s*\[([^\]]+)\]\s*""")
                val matchResult = achievementsArrayRegex.find(json)

                if (matchResult != null) {
                    val achievementsArray = matchResult.groupValues[1]

                    // 拆分成就对象
                    val achievements = achievementsArray.split("},{").toTypedArray()
                    for (achievement in achievements) {
                        val cleanAchievement = if (achievement.startsWith("{")) achievement else "{$achievement"
                        val cleanAchievement2 = if (cleanAchievement.endsWith("}")) cleanAchievement else "$cleanAchievement}"

                        // 提取achievementId
                        val achievementIdRegex = Regex("""\s*"achievementId"\s*:\s*"([^"]+)"\s*""")
                        val idMatch = achievementIdRegex.find(cleanAchievement2)
                        if (idMatch != null) {
                            val achievementId = idMatch.groupValues[1]
                            result.add(achievementId)
                        }
                    }
                } else {
                    // 如果没有找到achievements字段，尝试直接解析为数组（旧格式兼容）
                    val cleanedJson = json.trim().removePrefix("[").removeSuffix("]")
                    if (cleanedJson.isNotEmpty()) {
                        val achievements = cleanedJson.split("},{").toTypedArray()
                        for (achievement in achievements) {
                            val cleanAchievement = if (achievement.startsWith("{")) achievement else "{$achievement"
                            val cleanAchievement2 = if (cleanAchievement.endsWith("}")) cleanAchievement else "$cleanAchievement}"

                            // 提取achievementId
                            val achievementIdRegex = Regex("""\s*"achievementId"\s*:\s*"([^"]+)"\s*""")
                            val idMatch = achievementIdRegex.find(cleanAchievement2)
                            if (idMatch != null) {
                                val achievementId = idMatch.groupValues[1]
                                result.add(achievementId)
                            }
                        }
                    }
                }
            } else {
                Log.d("TimeTrackingService", "服务器返回的成就数据不成功: $json")
            }
        } catch (e: Exception) {
            Log.e("TimeTrackingService", "解析成就JSON时发生异常: ${e.message}")
        }
        return result
    }

    private fun uploadUsageTime(time: Long) {
        username?.let { user ->
            Thread {
                try {
                    val url = URL(API_URL)
                    val connection = url.openConnection() as HttpURLConnection
                    connection.requestMethod = "POST"
                    connection.doOutput = true
                    connection.setRequestProperty("Content-Type", "application/json; charset=UTF-8")
                    connection.connectTimeout = 5000 // 5秒连接超时
                    connection.readTimeout = 5000 // 5秒读取超时

                    val postData = "{\"username\":\"$user\",\"time\":$time}"
                    val outputStream = connection.outputStream
                    outputStream.write(postData.toByteArray(charset("UTF-8")))
                    outputStream.flush()
                    outputStream.close()
                    
                    val responseCode = connection.responseCode
                    if (responseCode == HttpURLConnection.HTTP_OK) {
                        // 上传成功，更新本地总时长
                        totalTime.addAndGet(time)
                        saveTotalTimeToPrefs()

                        // 检查是否解锁成就
                        // 此时totalTime已经更新，直接调用即可
                        checkAchievementsWithTotalTime(totalTime.get())
                        Log.d("TimeTrackingService", "Usage time uploaded successfully: $time seconds for user $user")
                    } else {
                        Log.e("TimeTrackingService", "Failed to upload usage time: HTTP error code $responseCode")
                    }
                    connection.disconnect()
                } catch (e: IOException) {
                    Log.e("TimeTrackingService", "Error uploading usage time: ${e.message}")
                    // 可以在这里添加重试逻辑或离线存储
                }
            }.start()
        } ?: run {
            Log.e("TimeTrackingService", "Failed to upload usage time: username is null")
        }
    }

    private fun checkAchievements() {
        // 计算当前总时长（本地存储的总时长 + 当前会话时长）
        val currentTime = System.currentTimeMillis()
        val elapsedTime = if (isTracking.get()) (currentTime - startTime.get()) / 1000 else 0L
        val currentTotalTime = totalTime.get() + elapsedTime + accumulatedTime.get()
        
        checkAchievementsWithTotalTime(currentTotalTime)
    }
    
    private fun checkAchievementsWithTotalTime(totalTimeSeconds: Long) {
        val totalHours = totalTimeSeconds / 3600
        Log.d("TimeTrackingService", "检查成就，当前总时长: ${totalTimeSeconds}秒, 累计小时数: $totalHours")
        
        // 检查是否已解锁该成就
        if (unlockedAchievements.contains(ACHIEVEMENT_ONE_HOUR)) {
            Log.d("TimeTrackingService", "成就 $ACHIEVEMENT_ONE_HOUR 已解锁")
        } else {
            Log.d("TimeTrackingService", "成就 $ACHIEVEMENT_ONE_HOUR 未解锁")
        }

        // 检查累计使用一小时成就
        if (totalHours >= 1 && !unlockedAchievements.contains(ACHIEVEMENT_ONE_HOUR)) {
            Log.d("TimeTrackingService", "满足成就条件，准备解锁: $ACHIEVEMENT_ONE_HOUR")
            unlockAchievement(ACHIEVEMENT_ONE_HOUR)
        }

        // 可以在这里添加更多成就检查逻辑
    }
    
    private fun unlockAchievement(achievementId: String) {
        // 检查是否已经解锁
        if (unlockedAchievements.contains(achievementId)) {
            Log.d("TimeTrackingService", "成就已解锁: $achievementId")
            return
        }
        
        username?.let { user ->
            Thread {
                try {
                    val url = URL(ACHIEVEMENT_API_URL)
                    val connection = url.openConnection() as HttpURLConnection
                    connection.requestMethod = "POST"
                    connection.doOutput = true
                    connection.setRequestProperty("Content-Type", "application/json; charset=UTF-8")
                    connection.connectTimeout = 10000 // 10秒连接超时
                    connection.readTimeout = 10000 // 10秒读取超时

                    // 创建安全的JSON字符串，确保用户名中的特殊字符被正确转义
                    val jsonObject = JSONObject()
                    jsonObject.put("username", user)
                    jsonObject.put("achievementId", achievementId)
                    jsonObject.put("unlocked", true)
                    val postData = jsonObject.toString()
                    val outputStream = connection.outputStream
                    outputStream.write(postData.toByteArray(charset("UTF-8")))
                    outputStream.flush()
                    outputStream.close()

                    val responseCode = connection.responseCode
                    if (responseCode == HttpURLConnection.HTTP_OK) {
                        // 读取响应内容，用于诊断
                        val inputStream = connection.inputStream
                        val bufferedReader = BufferedReader(InputStreamReader(inputStream))
                        val response = StringBuilder()
                        var line: String?
                        while (bufferedReader.readLine().also { lineValue -> line = lineValue } != null) {
                            response.append(line)
                        }
                        bufferedReader.close()
                        inputStream.close()
                        
                        val responseText = response.toString()
                        Log.d("TimeTrackingService", "成就上传成功，响应码: $responseCode, 响应内容: $responseText")
                        
                        // 上传成功，更新本地状态
                        synchronized(unlockedAchievements) {
                            unlockedAchievements.add(achievementId)
                            saveUnlockedAchievementsToPrefs()
                        }
                        Log.d("TimeTrackingService", "成功解锁成就: $achievementId")

                        // 发送成就解锁广播
                        sendAchievementUnlockedBroadcast(achievementId)
                    } else {
                        // 读取错误响应内容，用于诊断
                        var errorResponse = ""
                        try {
                            val errorStream = connection.errorStream
                            if (errorStream != null) {
                                val bufferedReader = BufferedReader(InputStreamReader(errorStream))
                                val response = StringBuilder()
                                var line: String?
                                while (bufferedReader.readLine().also { lineValue -> line = lineValue } != null) {
                                    response.append(line)
                                }
                                bufferedReader.close()
                                errorStream.close()
                                errorResponse = response.toString()
                            }
                        } catch (e: IOException) {
                            Log.e("TimeTrackingService", "读取错误响应时发生异常: ${e.message}")
                        }
                        
                        Log.e("TimeTrackingService", "成就上传失败，响应码: $responseCode, 错误内容: $errorResponse")
                        Log.e("TimeTrackingService", "解锁成就失败，响应码: $responseCode")
                        
                        // 添加到待上传列表
                        synchronized(pendingAchievements) {
                            pendingAchievements.add(achievementId)
                            savePendingAchievementsToPrefs()
                            Log.d("TimeTrackingService", "成就已添加到待上传列表: $achievementId, 当前待上传数量: ${pendingAchievements.size}")
                        }
                        // 同时更新本地解锁状态
                        synchronized(unlockedAchievements) {
                            unlockedAchievements.add(achievementId)
                            saveUnlockedAchievementsToPrefs()
                            Log.d("TimeTrackingService", "本地成就解锁状态已更新: $achievementId")
                        }
                    }

                    connection.disconnect()
                } catch (e: IOException) {
                    Log.e("TimeTrackingService", "成就上传异常，成就ID: $achievementId, 异常信息: ${e.message}")
                    Log.e("TimeTrackingService", "异常堆栈信息:", e)
                    // 异常情况下，添加到待上传列表
                    synchronized(pendingAchievements) {
                        pendingAchievements.add(achievementId)
                        savePendingAchievementsToPrefs()
                        Log.d("TimeTrackingService", "成就已添加到待上传列表: $achievementId, 当前待上传数量: ${pendingAchievements.size}")
                    }
                    // 同时更新本地解锁状态
                    synchronized(unlockedAchievements) {
                        unlockedAchievements.add(achievementId)
                        saveUnlockedAchievementsToPrefs()
                        Log.d("TimeTrackingService", "本地成就解锁状态已更新: $achievementId")
                    }
                }
            }.start()
        } ?: run {
            Log.e("TimeTrackingService", "Failed to unlock achievement: username is null")
        }
    }
    
    private fun loadTotalTimeFromPrefs() {
        val prefs = getSharedPreferences(PREF_NAME, MODE_PRIVATE)
        totalTime.set(prefs.getLong(KEY_TOTAL_TIME, 0L))
    }
    
    private fun saveTotalTimeToPrefs() {
        val prefs = getSharedPreferences(PREF_NAME, MODE_PRIVATE)
        prefs.edit().putLong(KEY_TOTAL_TIME, totalTime.get()).apply()
    }
    
    private fun loadUsernameFromPrefs() {
        val prefs = getSharedPreferences(PREF_NAME, MODE_PRIVATE)
        username = prefs.getString(KEY_USERNAME, null)
    }
    
    private fun loadUnlockedAchievementsFromPrefs() {
        val prefs = getSharedPreferences(PREF_NAME, MODE_PRIVATE)
        val achievementsStr = prefs.getString(KEY_UNLOCKED_ACHIEVEMENTS, "")
        if (achievementsStr?.isNotEmpty() == true) {
            unlockedAchievements.addAll(achievementsStr.split("|"))
        }
        Log.d("TimeTrackingService", "加载已解锁成就: $unlockedAchievements")
    }
    
    private fun saveUnlockedAchievementsToPrefs() {
        val prefs = getSharedPreferences(PREF_NAME, MODE_PRIVATE)
        val achievementsStr = unlockedAchievements.joinToString("|")
        prefs.edit().putString(KEY_UNLOCKED_ACHIEVEMENTS, achievementsStr).apply()
        Log.d("TimeTrackingService", "保存已解锁成就: $achievementsStr")
    }
    
    private fun loadPendingAchievementsFromPrefs() {
        val prefs = getSharedPreferences(PREF_NAME, MODE_PRIVATE)
        val achievementsStr = prefs.getString(KEY_PENDING_ACHIEVEMENTS, "")
        if (achievementsStr?.isNotEmpty() == true) {
            pendingAchievements.addAll(achievementsStr.split("|"))
        }
        Log.d("TimeTrackingService", "加载待上传成就: $pendingAchievements")
    }
    
    private fun savePendingAchievementsToPrefs() {
        val prefs = getSharedPreferences(PREF_NAME, MODE_PRIVATE)
        val achievementsStr = pendingAchievements.joinToString("|")
        prefs.edit().putString(KEY_PENDING_ACHIEVEMENTS, achievementsStr).apply()
        Log.d("TimeTrackingService", "保存待上传成就: $achievementsStr")
    }
    
    private fun saveUsernameToPrefs() {
        username?.let {
            val prefs = getSharedPreferences(PREF_NAME, MODE_PRIVATE)
            prefs.edit().putString(KEY_USERNAME, it).apply()
        }
    }
    
    private fun startTracking() {
        if (isTracking.compareAndSet(false, true)) {
            startTime.set(System.currentTimeMillis())
            lastUploadTime.set(System.currentTimeMillis()) // 初始化上传时间
            handler.postDelayed(timeUpdateRunnable, updateInterval)
            Log.d("TimeTrackingService", "开始跟踪应用使用时长")
        }
    }
    
    private fun stopTracking() {
        if (isTracking.compareAndSet(true, false)) {
            handler.removeCallbacks(timeUpdateRunnable)
            val currentTime = System.currentTimeMillis()
            val elapsedTime = (currentTime - startTime.get()) / 1000
            accumulatedTime.addAndGet(elapsedTime)

            // 立即上传剩余时长
            if (accumulatedTime.get() > 0) {
                uploadUsageTime(accumulatedTime.get())
                accumulatedTime.set(0)
            }
            Log.d("TimeTrackingService", "停止跟踪应用使用时长")
        }
    }
    
    override fun onBind(intent: Intent?): IBinder? {
        return null
    }
    
    override fun onCreate() {
        super.onCreate()
        // 加载本地存储的数据
        loadTotalTimeFromPrefs()
        loadUnlockedAchievementsFromPrefs()
        loadPendingAchievementsFromPrefs()
        loadUsernameFromPrefs()
        Log.d("TimeTrackingService", "服务创建，本地总时长: ${totalTime.get()}秒")

        // 立即检查一次成就
        checkAchievements()
        Log.d("TimeTrackingService", "服务创建时立即检查成就")
        
        // 立即上传待上传的成就，而不是等待5分钟
        if (pendingAchievements.isNotEmpty() && username != null) {
            uploadPendingAchievements()
        }
        
        // 启动待上传成就的重试机制
        startPendingAchievementsRetry()
        
        // 启动独立的成就检查定时任务
        startAchievementCheckRunnable()

        // 从服务器同步成就状态
        syncAchievementsFromServer()
    }
    
    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        if (intent != null) {
            // 获取用户名
            val usernameFromIntent = intent.getStringExtra("username")
            if (!usernameFromIntent.isNullOrEmpty()) {
                username = usernameFromIntent
                // 保存用户名到本地存储
                saveUsernameToPrefs()
            } else {
                // 如果没有从Intent获取到用户名，尝试从本地存储加载
                loadUsernameFromPrefs()
            }
            
            when (intent.action) {
                ACTION_START_TRACKING -> startTracking()
                ACTION_STOP_TRACKING -> stopTracking()
            }
        } else {
            // 如果intent为null，尝试从本地存储加载用户名
            loadUsernameFromPrefs()
        }
        
        // 如果仍然没有用户名，使用默认用户名
        if (username.isNullOrEmpty()) {
            username = "default_user"
            Log.w("TimeTrackingService", "没有找到有效的用户名，使用默认用户名: $username")
        }
        
        return START_STICKY
    }
    
    override fun onDestroy() {
        super.onDestroy()
        stopTracking()
        Log.d("TimeTrackingService", "服务销毁")
    }
}