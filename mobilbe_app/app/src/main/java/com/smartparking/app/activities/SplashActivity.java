package com.smartparking.app.activities;

import android.content.Intent;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.view.animation.Animation;
import android.view.animation.AnimationUtils;
import android.widget.ImageView;
import android.widget.TextView;
import androidx.appcompat.app.AppCompatActivity;
import com.smartparking.app.R;
import com.smartparking.app.services.SocketService;
import com.smartparking.app.utils.SessionManager;

public class SplashActivity extends AppCompatActivity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_splash);

        ImageView ivLogo = findViewById(R.id.iv_splash_logo);
        TextView tvTitle = findViewById(R.id.tv_splash_title);
        TextView tvSlogan = findViewById(R.id.tv_splash_slogan);

        // Run animations
        Animation scaleAnim = AnimationUtils.loadAnimation(this, R.anim.scale_up);
        Animation fadeInAnim = AnimationUtils.loadAnimation(this, R.anim.fade_in);

        ivLogo.startAnimation(scaleAnim);
        tvTitle.startAnimation(fadeInAnim);
        tvSlogan.startAnimation(fadeInAnim);

        // Delay and navigate
        new Handler(Looper.getMainLooper()).postDelayed(() -> {
            boolean isLoggedIn = SessionManager.getInstance(this).isLoggedIn();
            Intent intent;
            if (isLoggedIn) {
                // Connect socket
                SocketService.getInstance(this).connect();
                if (SessionManager.getInstance(this).isAdmin()) {
                    intent = new Intent(SplashActivity.this, AdminMainActivity.class);
                } else {
                    intent = new Intent(SplashActivity.this, MainActivity.class);
                }
            } else {
                intent = new Intent(SplashActivity.this, LoginActivity.class);
            }
            startActivity(intent);
            overridePendingTransition(R.anim.fade_in, R.anim.fade_out);
            finish();
        }, 1800);
    }
}
