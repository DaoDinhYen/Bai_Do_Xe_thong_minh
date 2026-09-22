package com.smartparking.app.activities;

import android.content.Intent;
import android.os.Bundle;
import android.text.InputType;
import android.view.View;
import android.widget.EditText;
import android.widget.ImageView;
import android.widget.TextView;
import android.widget.Toast;
import androidx.appcompat.app.AppCompatActivity;
import com.google.android.material.button.MaterialButton;
import com.smartparking.app.R;
import com.smartparking.app.models.ApiResponse;
import com.smartparking.app.models.LoginResponse;
import com.smartparking.app.network.ApiClient;
import com.smartparking.app.services.SocketService;
import com.smartparking.app.utils.DialogUtils;
import com.smartparking.app.utils.SessionManager;
import java.util.HashMap;
import java.util.Map;
import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;

public class LoginActivity extends AppCompatActivity {

    private EditText edtEmail, edtPassword;
    private ImageView ivTogglePassword;
    private boolean isPasswordVisible = false;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_login);

        edtEmail = findViewById(R.id.edt_login_email);
        edtPassword = findViewById(R.id.edt_login_password);
        ivTogglePassword = findViewById(R.id.iv_toggle_password);
        MaterialButton btnLogin = findViewById(R.id.btn_do_login);
        MaterialButton btnRegister = findViewById(R.id.btn_go_register);
        ImageView ivServerConfig = findViewById(R.id.iv_server_config);
        TextView tvServerConfigBottom = findViewById(R.id.tv_server_config_bottom);
        TextView tvForgotPassword = findViewById(R.id.tv_forgot_password);

        // Password visibility toggle
        ivTogglePassword.setOnClickListener(v -> {
            isPasswordVisible = !isPasswordVisible;
            if (isPasswordVisible) {
                edtPassword.setInputType(InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_VARIATION_VISIBLE_PASSWORD);
                ivTogglePassword.setImageResource(R.drawable.ic_visibility_off);
            } else {
                edtPassword.setInputType(InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_VARIATION_PASSWORD);
                ivTogglePassword.setImageResource(R.drawable.ic_visibility);
            }
            edtPassword.setSelection(edtPassword.getText().length());
        });

        // Server IP config dialog (Both top button and bottom link)
        View.OnClickListener openServerConfigListener = v -> {
            DialogUtils.showServerConfigDialog(this, (newHost, newPort) -> {
                ApiClient.resetClient();
                SocketService.getInstance(this).reconnect();
            });
        };
        ivServerConfig.setOnClickListener(openServerConfigListener);
        if (tvServerConfigBottom != null) {
            tvServerConfigBottom.setOnClickListener(openServerConfigListener);
        }

        // Go to Register
        btnRegister.setOnClickListener(v -> {
            Intent intent = new Intent(this, RegisterActivity.class);
            startActivity(intent);
            overridePendingTransition(R.anim.slide_in_right, R.anim.slide_out_left);
        });

        // Forgot password
        tvForgotPassword.setOnClickListener(v -> {
            Toast.makeText(this, "Vui lòng liên hệ Quản trị viên để đặt lại mật khẩu", Toast.LENGTH_LONG).show();
        });

        // Do login
        btnLogin.setOnClickListener(v -> performLogin());
    }

    private void performLogin() {
        String email = edtEmail.getText().toString().trim();
        String password = edtPassword.getText().toString().trim();

        if (email.isEmpty()) {
            edtEmail.setError("Vui lòng nhập email hoặc tên đăng nhập");
            edtEmail.requestFocus();
            return;
        }

        if (password.isEmpty()) {
            edtPassword.setError("Vui lòng nhập mật khẩu");
            edtPassword.requestFocus();
            return;
        }

        DialogUtils.showLoadingDialog(this, "Đang đăng nhập...");

        Map<String, String> body = new HashMap<>();
        body.put("email", email);
        body.put("password", password);

        ApiClient.getApiService(this).login(body).enqueue(new Callback<ApiResponse<LoginResponse>>() {
            @Override
            public void onResponse(Call<ApiResponse<LoginResponse>> call, Response<ApiResponse<LoginResponse>> response) {
                DialogUtils.dismissLoadingDialog();
                if (response.isSuccessful() && response.body() != null && response.body().isSuccess()) {
                    LoginResponse data = response.body().getData();
                    if (data != null && data.getUser() != null) {
                        SessionManager.getInstance(LoginActivity.this).saveLoginSession(data);
                        // Connect Socket.IO
                        SocketService.getInstance(LoginActivity.this).connect();

                        Toast.makeText(LoginActivity.this, "Đăng nhập thành công! Xin chào " + data.getUser().getName(), Toast.LENGTH_SHORT).show();

                        Intent intent;
                        if ("ADMIN".equalsIgnoreCase(data.getUser().getRole())) {
                            intent = new Intent(LoginActivity.this, AdminMainActivity.class);
                        } else {
                            intent = new Intent(LoginActivity.this, MainActivity.class);
                        }
                        intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TASK);
                        startActivity(intent);
                        overridePendingTransition(R.anim.fade_in, R.anim.fade_out);
                        finish();
                        return;
                    }
                }

                if (response.code() == 401) {
                    Toast.makeText(LoginActivity.this, getString(R.string.error_auth), Toast.LENGTH_LONG).show();
                } else if (response.body() != null && !response.body().getMessage().isEmpty()) {
                    Toast.makeText(LoginActivity.this, response.body().getMessage(), Toast.LENGTH_LONG).show();
                } else {
                    Toast.makeText(LoginActivity.this, "Đăng nhập thất bại (Mã lỗi: " + response.code() + ")", Toast.LENGTH_SHORT).show();
                }
            }

            @Override
            public void onFailure(Call<ApiResponse<LoginResponse>> call, Throwable t) {
                DialogUtils.dismissLoadingDialog();
                Toast.makeText(LoginActivity.this, getString(R.string.error_network) + "\nBấm icon máy chủ góc trên để kiểm tra IP.", Toast.LENGTH_LONG).show();
            }
        });
    }
}
