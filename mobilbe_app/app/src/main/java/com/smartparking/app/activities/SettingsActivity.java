package com.smartparking.app.activities;

import android.app.AlertDialog;
import android.os.Bundle;
import android.view.LayoutInflater;
import android.view.View;
import android.widget.EditText;
import android.widget.Toast;
import androidx.appcompat.app.AppCompatActivity;
import com.smartparking.app.R;
import com.smartparking.app.databinding.ActivitySettingsBinding;
import com.smartparking.app.models.ApiResponse;
import com.smartparking.app.models.SlotSummary;
import com.smartparking.app.network.ApiClient;
import com.smartparking.app.network.ApiConfig;
import com.smartparking.app.services.SocketService;
import com.smartparking.app.utils.DialogUtils;
import java.util.HashMap;
import java.util.Map;
import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;

public class SettingsActivity extends AppCompatActivity {

    private ActivitySettingsBinding binding;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        binding = ActivitySettingsBinding.inflate(getLayoutInflater());
        setContentView(binding.getRoot());

        initViews();
        setupListeners();
    }

    private void initViews() {
        updateServerUrlDisplay();
    }

    private void updateServerUrlDisplay() {
        binding.tvCurrentServerUrl.setText(ApiConfig.getBaseUrl(this));
    }

    private void setupListeners() {
        binding.btnBack.setOnClickListener(v -> finish());

        binding.btnConfigIp.setOnClickListener(v -> {
            DialogUtils.showServerConfigDialog(this, (newHost, newPort) -> {
                ApiClient.resetClient();
                SocketService.getInstance(this).reconnect();
                updateServerUrlDisplay();
                Toast.makeText(this, "Đã cập nhật máy chủ: " + newHost + ":" + newPort, Toast.LENGTH_SHORT).show();
            });
        });

        binding.btnTestConnection.setOnClickListener(v -> testServerConnection());

        binding.rowChangePassword.setOnClickListener(v -> showChangePasswordDialog());
    }

    private void testServerConnection() {
        binding.btnTestConnection.setEnabled(false);
        binding.btnTestConnection.setText("Đang kiểm tra...");

        long startTime = System.currentTimeMillis();

        ApiClient.getApiService(this).getSlotSummary().enqueue(new Callback<ApiResponse<SlotSummary>>() {
            @Override
            public void onResponse(Call<ApiResponse<SlotSummary>> call, Response<ApiResponse<SlotSummary>> response) {
                binding.btnTestConnection.setEnabled(true);
                binding.btnTestConnection.setText("Kiểm tra kết nối");
                long latency = System.currentTimeMillis() - startTime;

                if (response.isSuccessful() && response.body() != null && response.body().isSuccess()) {
                    new AlertDialog.Builder(SettingsActivity.this)
                            .setTitle("Kết nối thành công! ✅")
                            .setMessage("Máy chủ phản hồi tốt!\n\n" +
                                    "• URL: " + ApiConfig.getBaseUrl(SettingsActivity.this) + "\n" +
                                    "• Độ trễ phản hồi: " + latency + " ms\n" +
                                    "• Trạng thái bãi đỗ: Khả dụng")
                            .setPositiveButton("OK", null)
                            .show();
                } else {
                    new AlertDialog.Builder(SettingsActivity.this)
                            .setTitle("Máy chủ phản hồi lỗi ⚠️")
                            .setMessage("Mã lỗi HTTP: " + response.code() + "\nKiểm tra lại cấu hình cổng hoặc endpoint backend.")
                            .setPositiveButton("OK", null)
                            .show();
                }
            }

            @Override
            public void onFailure(Call<ApiResponse<SlotSummary>> call, Throwable t) {
                binding.btnTestConnection.setEnabled(true);
                binding.btnTestConnection.setText("Kiểm tra kết nối");

                new AlertDialog.Builder(SettingsActivity.this)
                        .setTitle("Không thể kết nối máy chủ ❌")
                        .setMessage("Lỗi: " + t.getMessage() + "\n\n" +
                                "Gợi ý kiểm tra:\n" +
                                "1. Đảm bảo backend Node.js đang chạy (port 3000).\n" +
                                "2. Nếu dùng máy thật: Điện thoại và máy tính cần chung mạng WiFi, nhập IP WiFi của máy tính (vd: 192.168.1.x).\n" +
                                "3. Nếu dùng giả lập LDPlayer: Sử dụng IP nội bộ 192.168.77.2 hoặc IP máy host.")
                        .setPositiveButton("Cấu hình lại IP", (d, w) -> binding.btnConfigIp.performClick())
                        .setNegativeButton("Đóng", null)
                        .show();
            }
        });
    }

    private void showChangePasswordDialog() {
        View dialogView = LayoutInflater.from(this).inflate(R.layout.dialog_change_password, null);
        AlertDialog dialog = new AlertDialog.Builder(this)
                .setView(dialogView)
                .create();

        if (dialog.getWindow() != null) {
            dialog.getWindow().setBackgroundDrawableResource(android.R.color.transparent);
        }

        EditText etCurrent = dialogView.findViewById(R.id.etCurrentPassword);
        EditText etNew = dialogView.findViewById(R.id.etNewPassword);
        EditText etConfirm = dialogView.findViewById(R.id.etConfirmPassword);

        dialogView.findViewById(R.id.btnCancel).setOnClickListener(v -> dialog.dismiss());

        dialogView.findViewById(R.id.btnSave).setOnClickListener(v -> {
            String current = etCurrent.getText().toString();
            String newPass = etNew.getText().toString();
            String confirm = etConfirm.getText().toString();

            if (current.isEmpty()) {
                etCurrent.setError("Vui lòng nhập mật khẩu hiện tại");
                return;
            }
            if (newPass.length() < 6) {
                etNew.setError("Mật khẩu mới tối thiểu 6 ký tự");
                return;
            }
            if (!newPass.equals(confirm)) {
                etConfirm.setError("Mật khẩu xác nhận không khớp");
                return;
            }

            dialog.dismiss();

            Map<String, String> body = new HashMap<>();
            body.put("current_password", current);
            body.put("new_password", newPass);

            ApiClient.getApiService(this).changePassword(body).enqueue(new Callback<ApiResponse<Void>>() {
                @Override
                public void onResponse(Call<ApiResponse<Void>> call, Response<ApiResponse<Void>> response) {
                    if (response.isSuccessful() && response.body() != null && response.body().isSuccess()) {
                        Toast.makeText(SettingsActivity.this, "Đổi mật khẩu thành công!", Toast.LENGTH_SHORT).show();
                    } else {
                        String msg = (response.body() != null && response.body().getMessage() != null)
                                ? response.body().getMessage()
                                : "Đổi mật khẩu thất bại. Kiểm tra lại mật khẩu hiện tại.";
                        Toast.makeText(SettingsActivity.this, msg, Toast.LENGTH_SHORT).show();
                    }
                }

                @Override
                public void onFailure(Call<ApiResponse<Void>> call, Throwable t) {
                    Toast.makeText(SettingsActivity.this, "Lỗi kết nối: " + t.getMessage(), Toast.LENGTH_SHORT).show();
                }
            });
        });

        dialog.show();
    }
}
