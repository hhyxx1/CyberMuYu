package com.hyx.cybermuyu

import java.io.BufferedReader
import java.io.InputStreamReader
import java.nio.charset.Charset

import android.animation.Animator
import android.animation.AnimatorSet
import android.animation.ObjectAnimator
import android.animation.PropertyValuesHolder
import android.app.Activity
import android.app.AlertDialog
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.Manifest
import android.annotation.SuppressLint
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.provider.MediaStore
import android.text.Editable
import android.text.TextWatcher
import android.util.Log
import android.widget.Button
import android.widget.EditText
import android.widget.ImageView
import android.widget.TextView
import android.widget.Toast
import androidx.core.content.FileProvider
import java.io.BufferedOutputStream
import java.io.DataOutputStream
import java.io.File
import java.io.FileOutputStream
import java.io.IOException
import java.io.InputStream
import java.net.HttpURLConnection
import java.net.URL

class SurpriseActivity : Activity() {

    private lateinit var surpriseTitle: TextView
    private lateinit var uploadImageButton: Button
    private lateinit var evaluationButton: Button
    private lateinit var contactButton: Button
    private lateinit var handler: Handler
    private var username: String? = null // 当前用户名
    
    // 逐行显示的文本控件
    private lateinit var contentLine1: TextView
    private lateinit var contentLine2: TextView
    private lateinit var contentLine3: TextView
    private lateinit var contentLine4: TextView
    private lateinit var contentLine5: TextView
    private lateinit var contentLine6: TextView
    private lateinit var contentLine7: TextView
    private lateinit var contentLine8: TextView

    private val PICK_IMAGE = 1
    private val CAPTURE_IMAGE = 2
    private val PERMISSION_REQUEST_CODE = 100
    private var imageUri: Uri? = null
    
    // 检查网络状态
    private fun isOnline(): Boolean {
        val connectivityManager = getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            val network = connectivityManager.activeNetwork ?: return false
            val networkCapabilities = connectivityManager.getNetworkCapabilities(network) ?: return false
            return networkCapabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
        } else {
            @Suppress("DEPRECATION")
            val networkInfo = connectivityManager.activeNetworkInfo ?: return false
            @Suppress("DEPRECATION")
            return networkInfo.isConnected
        }
    }
    
    // 保存图片到本地用于离线上传
    private fun saveImageForOfflineUpload(uri: Uri): String? {
        try {
            val inputStream = contentResolver.openInputStream(uri)
            val offlineDir = File(filesDir, "offline_uploads")
            if (!offlineDir.exists()) {
                offlineDir.mkdirs()
            }
            val fileName = "upload_${System.currentTimeMillis()}.jpg"
            val file = File(offlineDir, fileName)
            val outputStream = FileOutputStream(file)
            inputStream?.copyTo(outputStream)
            inputStream?.close()
            outputStream.close()
            return file.absolutePath
        } catch (e: Exception) {
            Log.e("SurpriseActivity", "Error saving image for offline upload: ${e.message}")
            return null
        }
    }
    
    // 读取所有待上传的离线图片
    private fun getOfflineImages(): List<String> {
        val offlineDir = File(filesDir, "offline_uploads")
        if (!offlineDir.exists()) {
            return emptyList()
        }
        return offlineDir.listFiles()?.map { it.absolutePath } ?: emptyList()
    }
    
    // 删除已上传的离线图片
    private fun deleteOfflineImage(filePath: String) {
        val file = File(filePath)
        if (file.exists()) {
            file.delete()
        }
    }
    
    // 尝试上传所有离线图片
    private fun uploadOfflineImages() {
        if (!isOnline()) return
        
        val offlineImages = getOfflineImages()
        if (offlineImages.isEmpty()) return
        
        Thread {
            for (filePath in offlineImages) {
                try {
                    val file = File(filePath)
                    if (!file.exists()) continue
                    
                    // 创建HTTP连接
                    val url = URL(getString(R.string.api_upload_url))
                    val connection = url.openConnection() as HttpURLConnection
                    connection.requestMethod = "POST"
                    connection.doOutput = true
                    connection.doInput = true
                    
                    // 生成边界字符串
                    val boundary = "----WebKitFormBoundary7MA4YWxkTrZu0gW"
                    connection.setRequestProperty("Content-Type", "multipart/form-data; boundary=$boundary")
                    
                    val outputStreamConnection = DataOutputStream(connection.outputStream)
                    
                    // 写入表单数据
                    outputStreamConnection.writeBytes("--$boundary\r\n")
                    outputStreamConnection.writeBytes("Content-Disposition: form-data; name=\"image\"; filename=\"${file.name}\"\r\n")
                    outputStreamConnection.writeBytes("Content-Type: image/jpeg\r\n")
                    outputStreamConnection.writeBytes("\r\n")
                    
                    // 写入文件数据
                    val buffer = ByteArray(4096)
                    var bytesRead: Int
                    val inputStreamFile = file.inputStream()
                    while (inputStreamFile.read(buffer).also { bytesRead = it } != -1) {
                        outputStreamConnection.write(buffer, 0, bytesRead)
                    }
                    inputStreamFile.close()
                    
                    // 结束边界
                    outputStreamConnection.writeBytes("\r\n--$boundary--\r\n")
                    outputStreamConnection.flush()
                    outputStreamConnection.close()
                    
                    // 获取响应
                    val responseCode = connection.responseCode
                    connection.disconnect()
                    
                    if (responseCode == HttpURLConnection.HTTP_OK) {
                        // 上传成功，删除本地文件
                        deleteOfflineImage(filePath)
                        Log.d("SurpriseActivity", "Successfully uploaded offline image: $filePath")
                    } else {
                        Log.e("SurpriseActivity", "Failed to upload offline image: $filePath, response code: $responseCode")
                    }
                } catch (e: Exception) {
                    Log.e("SurpriseActivity", "Error uploading offline image: $filePath, ${e.message}")
                    // 如果上传失败，保留文件以便下次尝试
                }
            }
        }.start()
    }

    @SuppressLint("MissingInflatedId")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_surprise)

        // 获取传递的用户名
        username = intent.getStringExtra("username")
        Log.d("SurpriseActivity", "Received username: $username")

        // 初始化视图
        surpriseTitle = findViewById(R.id.surpriseTitle)
        uploadImageButton = findViewById(R.id.uploadImageButton)
        evaluationButton = findViewById(R.id.evaluationButton)
        contactButton = findViewById(R.id.contactButton)
        handler = Handler(Looper.getMainLooper())
        
        // 初始化逐行显示的文本控件
        contentLine1 = findViewById(R.id.contentLine1)
        contentLine2 = findViewById(R.id.contentLine2)
        contentLine3 = findViewById(R.id.contentLine3)
        contentLine4 = findViewById(R.id.contentLine4)
        contentLine5 = findViewById(R.id.contentLine5)
        contentLine6 = findViewById(R.id.contentLine6)
        contentLine7 = findViewById(R.id.contentLine7)
        contentLine8 = findViewById(R.id.contentLine8)

        // 设置初始透明度为0
        surpriseTitle.alpha = 0f
        contentLine1.alpha = 0f
        contentLine2.alpha = 0f
        contentLine3.alpha = 0f
        contentLine4.alpha = 0f
        contentLine5.alpha = 0f
        contentLine6.alpha = 0f
        contentLine7.alpha = 0f
        contentLine8.alpha = 0f
        uploadImageButton.alpha = 0f
        evaluationButton.alpha = 0f
        contactButton.alpha = 0f

        // 启动动画
        startAnimations()

        // 设置按钮点击事件
        uploadImageButton.setOnClickListener {
            showImagePickerOptions()
        }
        
        // 设置留言/评价按钮点击事件
        evaluationButton.setOnClickListener {
            showEvaluationInputDialog()
        }
        
        // 设置联系我按钮点击事件
        contactButton.setOnClickListener {
            val phoneNumber = "19557375361"
            val intent = Intent(Intent.ACTION_DIAL)
            intent.data = Uri.parse("tel:$phoneNumber")
            startActivity(intent)
        }
        
        // Activity启动时，尝试上传离线图片
        uploadOfflineImages()
        
        // 检查网络状态变化
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
            val connectivityManager = getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
            connectivityManager.registerDefaultNetworkCallback(object : ConnectivityManager.NetworkCallback() {
                override fun onAvailable(network: android.net.Network) {
                    // 网络连接可用时，尝试上传离线图片
                    uploadOfflineImages()
                }
            })
        }
    }

    private fun startAnimations() {
        // 标题淡入动画
        val titleFadeIn = ObjectAnimator.ofFloat(surpriseTitle, "alpha", 0f, 1f)
        titleFadeIn.duration = 1000

        // 逐行文本淡入动画（每行间隔0.3秒）
        val line1FadeIn = ObjectAnimator.ofFloat(contentLine1, "alpha", 0f, 1f)
        line1FadeIn.duration = 800
        line1FadeIn.startDelay = 500

        val line2FadeIn = ObjectAnimator.ofFloat(contentLine2, "alpha", 0f, 1f)
        line2FadeIn.duration = 800
        line2FadeIn.startDelay = 800 // 与上一行间隔300ms（0.3秒）

        val line3FadeIn = ObjectAnimator.ofFloat(contentLine3, "alpha", 0f, 1f)
        line3FadeIn.duration = 800
        line3FadeIn.startDelay = 1100 // 与上一行间隔300ms（0.3秒）

        val line4FadeIn = ObjectAnimator.ofFloat(contentLine4, "alpha", 0f, 1f)
        line4FadeIn.duration = 800
        line4FadeIn.startDelay = 1400 // 与上一行间隔300ms（0.3秒）

        val line5FadeIn = ObjectAnimator.ofFloat(contentLine5, "alpha", 0f, 1f)
        line5FadeIn.duration = 800
        line5FadeIn.startDelay = 1700 // 与上一行间隔300ms（0.3秒）

        val line6FadeIn = ObjectAnimator.ofFloat(contentLine6, "alpha", 0f, 1f)
        line6FadeIn.duration = 800
        line6FadeIn.startDelay = 2000 // 与上一行间隔300ms（0.3秒）

        val line7FadeIn = ObjectAnimator.ofFloat(contentLine7, "alpha", 0f, 1f)
        line7FadeIn.duration = 800
        line7FadeIn.startDelay = 2300 // 与上一行间隔300ms（0.3秒）

        val line8FadeIn = ObjectAnimator.ofFloat(contentLine8, "alpha", 0f, 1f)
        line8FadeIn.duration = 800
        line8FadeIn.startDelay = 2600 // 与上一行间隔300ms（0.3秒）

        // 按钮淡入动画
        val buttonFadeIn = ObjectAnimator.ofFloat(uploadImageButton, "alpha", 0f, 1f)
        buttonFadeIn.duration = 1000
        buttonFadeIn.startDelay = 4400

        // 留言/评价按钮淡入动画（在uploadImageButton出现后500ms显示）
        val evaluationButtonFadeIn = ObjectAnimator.ofFloat(evaluationButton, "alpha", 0f, 1f)
        evaluationButtonFadeIn.duration = 1000
        evaluationButtonFadeIn.startDelay = 4900

        // 联系我按钮淡入动画（在evaluationButton出现后500ms显示）
        val contactButtonFadeIn = ObjectAnimator.ofFloat(contactButton, "alpha", 0f, 1f)
        contactButtonFadeIn.duration = 1000
        contactButtonFadeIn.startDelay = 5400

        // 独立播放所有动画，这样startDelay会生效
        titleFadeIn.start()
        line1FadeIn.start()
        line2FadeIn.start()
        line3FadeIn.start()
        line4FadeIn.start()
        line5FadeIn.start()
        line6FadeIn.start()
        line7FadeIn.start()
        line8FadeIn.start()
        buttonFadeIn.start()
        evaluationButtonFadeIn.start()
        contactButtonFadeIn.start()
    }



    private fun closeWithAnimation() {
        // 淡出动画
        val fadeOut = ObjectAnimator.ofFloat(findViewById(android.R.id.content), "alpha", 1f, 0f)
        fadeOut.duration = 500
        fadeOut.addListener(object : Animator.AnimatorListener {
            override fun onAnimationStart(animation: Animator) {}
            override fun onAnimationEnd(animation: Animator) {
                finish()
            }
            override fun onAnimationCancel(animation: Animator) {}
            override fun onAnimationRepeat(animation: Animator) {}
        })
        fadeOut.start()
    }

    private fun showImagePickerOptions() {
        val options = arrayOf<CharSequence>("从相册选择", "拍照", "取消")
        val builder = AlertDialog.Builder(this)
        builder.setTitle("选择图片来源")
        builder.setItems(options) { dialog, item ->
            when (item) {
                0 -> { // 从相册选择
                    // 适配Android 13及以上版本的权限
                    val permission = if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.TIRAMISU) {
                        Manifest.permission.READ_MEDIA_IMAGES
                    } else {
                        Manifest.permission.READ_EXTERNAL_STORAGE
                    }
                    
                    if (checkSelfPermission(permission) == PackageManager.PERMISSION_GRANTED) {
                        pickImageFromGallery()
                    } else {
                        requestPermissions(arrayOf(permission), PERMISSION_REQUEST_CODE)
                    }
                }
                1 -> { // 拍照
                    if (checkSelfPermission(Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED) {
                        takePhoto()
                    } else {
                        requestPermissions(arrayOf(Manifest.permission.CAMERA), PERMISSION_REQUEST_CODE)
                    }
                }
                2 -> { // 取消
                    dialog.dismiss()
                }
            }
        }
        builder.show()
    }

    private fun pickImageFromGallery() {
        val intent = Intent(Intent.ACTION_PICK)
        intent.type = "image/*"
        startActivityForResult(intent, PICK_IMAGE)
    }

    private fun takePhoto() {
        // 检测设备是否为华为
        val isHuawei = Build.MANUFACTURER.equals("huawei", true) || Build.MANUFACTURER.equals("honor", true)
        Log.d("SurpriseActivity", "Device manufacturer: ${Build.MANUFACTURER}, isHuawei: $isHuawei")
        
        var cameraLaunched = false
        
        // 1. 首先尝试标准相机Intent
        try {
            val intent = Intent(MediaStore.ACTION_IMAGE_CAPTURE)
            
            // 添加华为手机特定的额外参数
            intent.putExtra("android.intent.extras.CAMERA_FACING", 1) // 0表示后置相机，1表示前置相机
            intent.putExtra("android.intent.extras.LENS_FACING_FRONT", 1)
            intent.putExtra("android.intent.extra.USE_FRONT_CAMERA", true)
            
            // 检查相机应用是否存在
            val resolveInfo = packageManager.resolveActivity(intent, PackageManager.MATCH_DEFAULT_ONLY)
            if (resolveInfo != null) {
                // 检查缓存目录
                val cacheDir = externalCacheDir ?: this.cacheDir
                if (cacheDir != null) {
                    val file = File(cacheDir, "temp_image.jpg")
                    // 统一使用应用的FileProvider authority
                    val fileProviderAuthority = "${applicationContext.packageName}.fileprovider"
                    imageUri = FileProvider.getUriForFile(this, fileProviderAuthority, file)
                    intent.putExtra(MediaStore.EXTRA_OUTPUT, imageUri)
                    
                    // 授予临时权限给相机应用
                    grantUriPermission(resolveInfo.activityInfo.packageName, imageUri, Intent.FLAG_GRANT_WRITE_URI_PERMISSION or Intent.FLAG_GRANT_READ_URI_PERMISSION)
                    
                    startActivityForResult(intent, CAPTURE_IMAGE)
                    cameraLaunched = true
                    Log.d("SurpriseActivity", "相机通过标准Intent成功启动，imageUri=$imageUri")
                }
            }
        } catch (e: Exception) {
                    Log.e("SurpriseActivity", "标准Intent启动相机失败: ${e.message}", e)
                    // 不显示Toast，继续尝试其他方法
                    // 重置imageUri为null，避免使用无效的URI
                    imageUri = null
                }
        
        // 如果标准方法成功启动相机，直接返回
        if (cameraLaunched) {
            return
        }
        
        // 2. 如果标准方法失败，且是华为设备，尝试使用华为相机的已知包名
        if (isHuawei) {
            // 华为相机的已知包名列表
            val huaweiCameraPackages = arrayOf(
                "com.huawei.camera", // 华为相机
                "com.huawei.camera2", // 华为相机2
                "com.honor.camera", // 荣耀相机
                "com.honor.camera2" // 荣耀相机2
            )
            
            var atLeastOnePackageFound = false
            
            for (packageName in huaweiCameraPackages) {
                try {
                    val cameraIntent = Intent(MediaStore.ACTION_IMAGE_CAPTURE)
                    cameraIntent.setPackage(packageName)
                    
                    // 检查该包名是否存在
                    val packageInfo = packageManager.getPackageInfo(packageName, PackageManager.GET_ACTIVITIES)
                    if (packageInfo != null) {
                        atLeastOnePackageFound = true
                        // 检查缓存目录
                            val cacheDir = externalCacheDir ?: this.cacheDir
                            if (cacheDir != null) {
                                val file = File(cacheDir, "temp_image.jpg")
                                // 统一使用应用的FileProvider authority，而不是华为相机的包名
                                val fileProviderAuthority = "${applicationContext.packageName}.fileprovider"
                                imageUri = FileProvider.getUriForFile(this, fileProviderAuthority, file)
                                cameraIntent.putExtra(MediaStore.EXTRA_OUTPUT, imageUri)
                                
                                // 授予临时权限给相机应用
                                grantUriPermission(packageName, imageUri, Intent.FLAG_GRANT_WRITE_URI_PERMISSION or Intent.FLAG_GRANT_READ_URI_PERMISSION)
                                
                                startActivityForResult(cameraIntent, CAPTURE_IMAGE)
                                cameraLaunched = true
                                Log.d("SurpriseActivity", "相机通过华为包名 $packageName 成功启动，使用FileProvider: $fileProviderAuthority")
                                break
                            }
                    }
                } catch (e: Exception) {
                    Log.d("SurpriseActivity", "尝试华为相机包名 $packageName 失败: ${e.message}")
                    // 继续尝试下一个包名
                }
            }
            
            // 如果华为包名方法成功启动相机，直接返回
            if (cameraLaunched) {
                return
            }
            
            // 只有当至少找到一个华为相机包名但都启动失败时，才显示错误提示
            if (atLeastOnePackageFound) {
                Toast.makeText(this, "尝试华为相机包名失败", Toast.LENGTH_SHORT).show()
            }
        }
        
        // 3. 如果所有方法都失败，尝试使用隐式Intent
        try {
            val implicitIntent = Intent(MediaStore.ACTION_IMAGE_CAPTURE)
            
            // 检查缓存目录
            val cacheDir = externalCacheDir ?: this.cacheDir
            if (cacheDir != null) {
                val file = File(cacheDir, "temp_image.jpg")
                // 统一使用应用的FileProvider authority
                val fileProviderAuthority = "${applicationContext.packageName}.fileprovider"
                imageUri = FileProvider.getUriForFile(this, fileProviderAuthority, file)
                implicitIntent.putExtra(MediaStore.EXTRA_OUTPUT, imageUri)
                
                // 授予临时权限给相机应用
                implicitIntent.addFlags(Intent.FLAG_GRANT_WRITE_URI_PERMISSION or Intent.FLAG_GRANT_READ_URI_PERMISSION)
                
                startActivityForResult(implicitIntent, CAPTURE_IMAGE)
                cameraLaunched = true
                Log.d("SurpriseActivity", "相机通过隐式Intent成功启动，imageUri=$imageUri")
                return
            }
        } catch (ex: Exception) {
            Log.e("SurpriseActivity", "隐式启动相机也失败: ${ex.message}", ex)
        }
        
        // 如果所有方法都失败，显示最终错误提示
        if (!cameraLaunched) {
            Toast.makeText(this, "未找到相机应用", Toast.LENGTH_SHORT).show()
            Log.e("SurpriseActivity", "No camera app found after all attempts")
        }
    }

    override fun onRequestPermissionsResult(requestCode: Int, permissions: Array<String>, grantResults: IntArray) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        if (requestCode == PERMISSION_REQUEST_CODE) {
            if (grantResults.isNotEmpty() && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
                // 权限被授予，检查是哪个权限被授予
                if (permissions[0] == Manifest.permission.READ_EXTERNAL_STORAGE || 
                    permissions[0] == Manifest.permission.READ_MEDIA_IMAGES) {
                    pickImageFromGallery()
                } else if (permissions[0] == Manifest.permission.CAMERA) {
                    takePhoto()
                }
            } else {
                Toast.makeText(this, "需要权限才能选择图片或拍照", Toast.LENGTH_SHORT).show()
            }
        }
    }

    // 显示留言/评价输入对话框
    private fun showEvaluationInputDialog() {
        val dialogView = layoutInflater.inflate(R.layout.evaluation_input_dialog, null)
        val editText = dialogView.findViewById<EditText>(R.id.evaluationEditText)
        val charCountText = dialogView.findViewById<TextView>(R.id.charCountText)
        
        // 设置TextWatcher来更新剩余字数
        editText.addTextChangedListener(object : TextWatcher {
            override fun beforeTextChanged(s: CharSequence?, start: Int, count: Int, after: Int) {}
            
            override fun onTextChanged(s: CharSequence?, start: Int, before: Int, count: Int) {
                val remaining = 500 - (s?.length ?: 0)
                charCountText.text = "还可以输入 $remaining 字符"
            }
            
            override fun afterTextChanged(s: Editable?) {}
        })
        
        val builder = AlertDialog.Builder(this)
        builder.setTitle("留下您的留言/评价")
        builder.setView(dialogView)
        
        builder.setPositiveButton("发送") { _, _ ->
            val text = editText.text.toString().trim()
            if (text.isNotEmpty()) {
                if (text.length > 500) {
                    Toast.makeText(this, "留言内容不能超过500字符", Toast.LENGTH_SHORT).show()
                    return@setPositiveButton
                }
                sendEvaluation(text)
            } else {
                Toast.makeText(this, "请输入留言内容", Toast.LENGTH_SHORT).show()
            }
        }
        
        builder.setNegativeButton("取消", null)
        builder.show()
    }

    // 发送留言到后端
    private fun sendEvaluation(text: String) {
        val btn = findViewById<Button>(R.id.evaluationButton)
        val originalText = btn.text.toString()
        btn.text = "发送ing..."
        btn.isEnabled = false

        Thread {
            try {
                val url = URL(getString(R.string.api_messages_url))
                val connection = url.openConnection() as HttpURLConnection
                connection.requestMethod = "POST"
                connection.doOutput = true
                connection.setRequestProperty("Content-Type", "application/json; charset=UTF-8")

                // 使用简单的JSON格式，包含用户名
                val postData = """{"text":"${text.replace("\"", "\\\"").replace("\n", "\\n").replace("\r", "\\r")}","author":"${username ?: "匿名用户"}"}"""
                val outputStream = connection.outputStream
                outputStream.write(postData.toByteArray(charset("UTF-8")))
                outputStream.flush()
                outputStream.close()

                val responseCode = connection.responseCode

                runOnUiThread {
                    btn.text = originalText
                    btn.isEnabled = true
                    if (responseCode == HttpURLConnection.HTTP_OK) {
                        Toast.makeText(this@SurpriseActivity, "留言发送成功！", Toast.LENGTH_SHORT).show()
                    } else {
                        // 读取错误响应
                        val inputStream = if (responseCode >= 400) connection.errorStream else connection.inputStream
                        val responseText = inputStream?.bufferedReader()?.readText() ?: "未知错误"
                        Toast.makeText(this@SurpriseActivity, "发送失败: $responseCode - $responseText", Toast.LENGTH_LONG).show()
                        Log.e("SurpriseActivity", "留言发送失败: $responseCode - $responseText")
                    }
                }
                
                connection.disconnect()
            } catch (e: Exception) {
                Log.e("SurpriseActivity", "留言发送异常: ", e)
                runOnUiThread {
                    btn.text = originalText
                    btn.isEnabled = true
                    Toast.makeText(this@SurpriseActivity, "网络错误: ${e.message}", Toast.LENGTH_LONG).show()
                }
            }
        }.start()
    }

    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        Log.d("SurpriseActivity", "onActivityResult called: requestCode=$requestCode, resultCode=$resultCode, data=$data")
        
        if (resultCode == RESULT_OK) {
            when (requestCode) {
                PICK_IMAGE -> {
                    if (data != null && data.data != null) {
                        imageUri = data.data
                        Log.d("SurpriseActivity", "从相册选择图片，imageUri=$imageUri")
                        uploadImage()
                    } else {
                        Log.e("SurpriseActivity", "从相册选择图片失败，data或data.data为null")
                        Toast.makeText(this, "从相册选择图片失败", Toast.LENGTH_SHORT).show()
                    }
                }
                CAPTURE_IMAGE -> {
                    Log.d("SurpriseActivity", "拍照完成，imageUri=$imageUri")
                    if (imageUri == null) {
                        Log.e("SurpriseActivity", "拍照完成但imageUri为null")
                        
                        // 尝试从intent中获取图片URI（某些相机应用可能会返回）
                        if (data != null && data.data != null) {
                            imageUri = data.data
                            Log.d("SurpriseActivity", "从intent中获取到imageUri=$imageUri")
                        } else {
                            // 重新构建URI（因为文件路径是固定的）
                            val cacheDir = externalCacheDir ?: this.cacheDir
                            if (cacheDir != null) {
                                val file = File(cacheDir, "temp_image.jpg")
                                if (file.exists()) {
                                    // 统一使用应用的FileProvider authority
                                    val fileProviderAuthority = "${applicationContext.packageName}.fileprovider"
                                    imageUri = FileProvider.getUriForFile(this, fileProviderAuthority, file)
                                    Log.d("SurpriseActivity", "重新构建imageUri=$imageUri")
                                } else {
                                    Log.e("SurpriseActivity", "临时图片文件不存在")
                                    Toast.makeText(this, "拍照完成但图片URI为空", Toast.LENGTH_SHORT).show()
                                    return
                                }
                            } else {
                                Log.e("SurpriseActivity", "缓存目录不可用")
                                Toast.makeText(this, "拍照完成但图片URI为空", Toast.LENGTH_SHORT).show()
                                return
                            }
                        }
                    }
                    uploadImage()
                }
            }
        } else if (resultCode == RESULT_CANCELED) {
            Log.d("SurpriseActivity", "用户取消了图片选择")
        } else {
            Log.e("SurpriseActivity", "图片选择失败，resultCode=$resultCode")
            Toast.makeText(this, "图片选择失败", Toast.LENGTH_SHORT).show()
        }
    }

    private fun uploadImage() {
        if (imageUri == null) {
            Log.e("SurpriseActivity", "uploadImage called but imageUri is null")
            return
        }

        Log.d("SurpriseActivity", "开始上传图片，imageUri=$imageUri")

        val btn = findViewById<Button>(R.id.uploadImageButton)
        val originalText = btn.text
        btn.text = "上传ing..."
        btn.isEnabled = false

        // 检查网络状态
        if (!isOnline()) {
            Log.d("SurpriseActivity", "网络离线，保存图片到本地")
            // 离线状态下保存图片到本地
            val savedPath = saveImageForOfflineUpload(imageUri!!)
            runOnUiThread { 
                btn.text = originalText
                btn.isEnabled = true
                if (savedPath != null) {
                    Toast.makeText(this@SurpriseActivity, "已保存，联网后自动上传", Toast.LENGTH_SHORT).show()
                    Log.d("SurpriseActivity", "图片已保存用于离线上传: $savedPath")
                } else {
                    Toast.makeText(this@SurpriseActivity, "保存失败", Toast.LENGTH_SHORT).show()
                    Log.e("SurpriseActivity", "图片保存失败")
                }
            }
            return
        }

        Thread {
            try {
                // 尝试打开图片输入流
                val inputStream = contentResolver.openInputStream(imageUri!!)
                if (inputStream == null) {
                    throw Exception("无法打开图片输入流")
                }
                Log.d("SurpriseActivity", "成功打开图片输入流")

                // 确保缓存目录存在
                val cacheDir = externalCacheDir
                if (cacheDir == null) {
                    throw Exception("外部缓存目录不可用")
                }
                Log.d("SurpriseActivity", "外部缓存目录: ${cacheDir.absolutePath}")

                // 保存图片到本地缓存
                val file = File(cacheDir, "upload_image.jpg")
                val outputStream = FileOutputStream(file)
                inputStream.copyTo(outputStream)
                inputStream.close()
                outputStream.close()
                Log.d("SurpriseActivity", "图片已保存到本地缓存: ${file.absolutePath}, 文件大小: ${file.length()} 字节")

                // 创建HTTP连接
                val url = URL(getString(R.string.api_upload_url))
                val connection = url.openConnection() as HttpURLConnection
                connection.requestMethod = "POST"
                connection.doOutput = true
                connection.doInput = true
                connection.connectTimeout = 15000 // 15秒超时
                connection.readTimeout = 15000 // 15秒超时
                
                // 生成边界字符串
                val boundary = "----WebKitFormBoundary7MA4YWxkTrZu0gW"
                connection.setRequestProperty("Content-Type", "multipart/form-data; boundary=$boundary")
                Log.d("SurpriseActivity", "HTTP连接已创建，准备发送请求")

                val outputStreamConnection = DataOutputStream(connection.outputStream)
                
                // 写入用户名表单数据
                outputStreamConnection.writeBytes("--$boundary\r\n")
                outputStreamConnection.writeBytes("Content-Disposition: form-data; name=\"username\"\r\n")
                outputStreamConnection.writeBytes("\r\n")
                val usernameData = (username ?: "匿名用户").toByteArray(Charset.forName("UTF-8"))
                outputStreamConnection.write(usernameData)
                outputStreamConnection.writeBytes("\r\n")
                Log.d("SurpriseActivity", "已写入用户名数据: ${username ?: "匿名用户"}")
                
                // 写入图片表单数据
                outputStreamConnection.writeBytes("--$boundary\r\n")
                outputStreamConnection.writeBytes("Content-Disposition: form-data; name=\"image\"; filename=\"${file.name}\"\r\n")
                outputStreamConnection.writeBytes("Content-Type: image/jpeg\r\n")
                outputStreamConnection.writeBytes("\r\n")
                
                // 写入文件数据
                val buffer = ByteArray(4096)
                var bytesRead: Int
                var totalBytesRead = 0L
                val inputStreamFile = file.inputStream()
                while (inputStreamFile.read(buffer).also { bytesRead = it } != -1) {
                    outputStreamConnection.write(buffer, 0, bytesRead)
                    totalBytesRead += bytesRead
                }
                inputStreamFile.close()
                Log.d("SurpriseActivity", "已写入图片数据，总大小: $totalBytesRead 字节")
                
                // 结束边界
                outputStreamConnection.writeBytes("\r\n--$boundary--\r\n")
                outputStreamConnection.flush()
                outputStreamConnection.close()
                Log.d("SurpriseActivity", "HTTP请求已发送，等待响应")

                // 获取响应
                val responseCode = connection.responseCode
                val responseMessage = connection.responseMessage
                Log.d("SurpriseActivity", "服务器响应: $responseCode - $responseMessage")
                
                // 读取响应内容
                val responseReader = BufferedReader(InputStreamReader(connection.inputStream))
                val response = StringBuilder()
                var line: String?
                while (responseReader.readLine().also { lineValue -> line = lineValue } != null) {
                    response.append(line)
                }
                responseReader.close()
                Log.d("SurpriseActivity", "服务器响应内容: ${response.toString()}")
                
                connection.disconnect()
                Log.d("SurpriseActivity", "HTTP连接已关闭")

                runOnUiThread {
                    btn.text = originalText
                    btn.isEnabled = true
                    if (responseCode == HttpURLConnection.HTTP_OK) {
                        Toast.makeText(this@SurpriseActivity, "上传成功！", Toast.LENGTH_SHORT).show()
                        Log.d("SurpriseActivity", "图片上传成功")
                        // 上传成功后，尝试上传其他离线图片
                        uploadOfflineImages()
                    } else {
                        // 在线但上传失败，保存图片到本地
                        val savedPath = saveImageForOfflineUpload(imageUri!!)
                        if (savedPath != null) {
                            Toast.makeText(this@SurpriseActivity, "上传失败，已保存到本地", Toast.LENGTH_SHORT).show()
                            Log.d("SurpriseActivity", "图片上传失败，已保存到本地: $savedPath")
                        } else {
                            Toast.makeText(this@SurpriseActivity, "上传失败: $responseCode - $responseMessage", Toast.LENGTH_SHORT).show()
                            Log.e("SurpriseActivity", "图片上传失败，响应码: $responseCode - $responseMessage")
                        }
                    }
                }
            } catch (e: Exception) {
                Log.e("SurpriseActivity", "上传过程中发生异常: ${e.message}", e)
                // 异常情况下保存图片到本地
                try {
                    val savedPath = saveImageForOfflineUpload(imageUri!!)
                    runOnUiThread {
                        btn.text = originalText
                        btn.isEnabled = true
                        if (savedPath != null) {
                            Toast.makeText(this@SurpriseActivity, "上传失败，已保存到本地", Toast.LENGTH_SHORT).show()
                            Log.d("SurpriseActivity", "图片上传异常，已保存到本地: $savedPath")
                        } else {
                            Toast.makeText(this@SurpriseActivity, "上传失败: ${e.message}", Toast.LENGTH_SHORT).show()
                        }
                    }
                } catch (saveException: Exception) {
                    Log.e("SurpriseActivity", "图片保存也失败: ${saveException.message}", saveException)
                    runOnUiThread {
                        btn.text = originalText
                        btn.isEnabled = true
                        Toast.makeText(this@SurpriseActivity, "上传失败: ${e.message}", Toast.LENGTH_SHORT).show()
                    }
                }
            }
        }.start()
    }

    override fun onDestroy() {
        super.onDestroy()
        handler.removeCallbacksAndMessages(null)
    }
}