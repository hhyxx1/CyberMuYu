package com.hyx.cybermuyu

import android.content.Intent
import android.content.SharedPreferences
import android.os.Bundle
import android.view.View
import android.widget.Button
import android.widget.EditText
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import com.hyx.cybermuyu.R

class LoginActivity : AppCompatActivity() {
    
    private lateinit var etUsername: EditText
    private lateinit var btnLogin: Button
    private lateinit var sharedPreferences: SharedPreferences
    
    private val PREF_NAME = "UserPrefs"
    private val KEY_USERNAME = "username"
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_login)
        
        etUsername = findViewById(R.id.etUsername)
        btnLogin = findViewById(R.id.btnLogin)
        
        sharedPreferences = getSharedPreferences(PREF_NAME, MODE_PRIVATE)
        
        // 检查是否已经有用户名
        val savedUsername = sharedPreferences.getString(KEY_USERNAME, null)
        if (savedUsername != null) {
            // 有用户名，直接进入首页
            navigateToMainActivity(savedUsername)
        }
        
        btnLogin.setOnClickListener { 
            val username = etUsername.text.toString().trim()
            if (username.isEmpty()) {
                Toast.makeText(this, "请输入用户名", Toast.LENGTH_SHORT).show()
            } else {
                // 保存用户名
                sharedPreferences.edit().putString(KEY_USERNAME, username).apply()
                // 进入首页
                navigateToMainActivity(username)
            }
        }
    }
    
    private fun navigateToMainActivity(username: String) {
        val intent = Intent(this, MainActivity::class.java)
        intent.putExtra(KEY_USERNAME, username)
        startActivity(intent)
        finish()
    }
}