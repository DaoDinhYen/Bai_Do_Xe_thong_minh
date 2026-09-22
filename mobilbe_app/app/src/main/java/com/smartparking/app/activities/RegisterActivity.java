package com.smartparking.app.activities;

import android.content.Intent;
import android.os.Bundle;
import android.widget.EditText;
import android.widget.ImageView;
import android.widget.TextView;
import android.widget.Toast;
import androidx.appcompat.app.AppCompatActivity;
import com.google.android.material.button.MaterialButton;
import com.smartparking.app.R;
import com.smartparking.app.models.ApiResponse;
import com.smartparking.app.models.User;
import com.smartparking.app.network.ApiClient;
import com.smartparking.app.utils.DialogUtils;
import java.util.HashMap;
import java.util.Map;
import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;

public class RegisterActivity extends AppCompatActivity {

    private EditText edtName, edtEmail, edtPhone, edtPassword, edtConfirmPassword;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_register);

        edtName = findViewById(R.id.edt_register_name);
        edtEmail = findViewById(R.id.edt_register_email);
        edtPhone = findViewById(R.id.edt_register_phone);
        edtPassword = findViewById(R.id.edt_register_password);
        edtConfirmPassword = findViewById(R.id.edt_register_confirm_password);
        MaterialButton btnRegister = findViewById(R.id.btn_do_register);
        ImageView ivBack = findViewById(R.id.iv_back_login);
        TextView tvBackToLogin = findViewById(R.id.tv_back_to_login);

        ivBack.setOnClickListener(v -> finish());
        tvBackToLogin.setOnClickListener(v -> finish());

        btnRegister.setOnClickListener(v -> performRegister());
    }

    private void performRegister() {
        String name = edtName.getText().toString().trim();
        String email = edtEmail.getText().toString().trim();
        String phone = edtPhone.getText().toString().trim();
        String password = edtPassword.getText().toString().trim();
        String confirmPassword = edtConfirmPassword.getText().toString().trim();

        if (name.isEmpty()) {
            edtName.setError("Vui lòng nhập họ và tên");
            edtName.requestFocus();
            return;
        }

        if (email.isEmpty()) {
            edtEmail.setError("Vui lòng nhập email");
            edtEmail.requestFocus();
            return;
        }

        if (!android.util.Patterns.EMAIL_ADDRESS.matcher(email).matches()) {
            edtEmail.setError("Email không đúng định dạng");
            edtEmail.requestFocus();
            return;
        }

        if (password.length() < 6) {
            edtPassword.setError("Mật khẩu phải từ 6 ký tự trở lên");
            edtPassword.requestFocus();
            return;
        }

        if (!password.equals(confirmPassword)) {
            edtConfirmPassword.setError("Mật khẩu xác nhận không trùng khớp");
            edtConfirmPassword.requestFocus();
            return;
        }

        DialogUtils.showLoadingDialog(this, "Đang tạo tài khoản...");

        Map<String, String> body = new HashMap<>();
        body.put("name", name);
        body.put("email", email);
        if (!phone.isEmpty()) {
            body.put("phone", phone);
        }
        body.put("password", password);

        ApiClient.getApiService(this).register(body).enqueue(new Callback<ApiResponse<User>>() {
            @Override
            public void onResponse(Call<ApiResponse<User>> call, Response<ApiResponse<User>> response) {
                DialogUtils.dismissLoadingDialog();
                if (response.isSuccessful() && response.body() != null && response.body().isSuccess()) {
                    Toast.makeText(RegisterActivity.this, "Đăng ký thành công! Vui lòng đăng nhập.", Toast.LENGTH_LONG).show();
                    finish();
                    overridePendingTransition(R.anim.fade_in, R.anim.fade_out);
                } else if (response.body() != null && !response.body().getMessage().isEmpty()) {
                    Toast.makeText(RegisterActivity.this, response.body().getMessage(), Toast.LENGTH_LONG).show();
                } else {
                    Toast.makeText(RegisterActivity.this, "Đăng ký không thành công. Mã: " + response.code(), Toast.LENGTH_SHORT).show();
                }
            }

            @Override
            public void onFailure(Call<ApiResponse<User>> call, Throwable t) {
                DialogUtils.dismissLoadingDialog();
                Toast.makeText(RegisterActivity.this, getString(R.string.error_network), Toast.LENGTH_LONG).show();
            }
        });
    }
}
