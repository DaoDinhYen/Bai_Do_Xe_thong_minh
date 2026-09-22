package com.smartparking.app.activities;

import android.app.AlertDialog;
import android.os.Bundle;
import android.view.View;
import android.widget.Toast;
import androidx.appcompat.app.AppCompatActivity;
import androidx.recyclerview.widget.LinearLayoutManager;
import com.smartparking.app.R;
import com.smartparking.app.adapters.NotificationAdapter;
import com.smartparking.app.databinding.ActivityNotificationBinding;
import com.smartparking.app.models.ApiResponse;
import com.smartparking.app.models.NotificationItem;
import com.smartparking.app.models.NotificationResponse;
import com.smartparking.app.network.ApiClient;
import com.smartparking.app.services.SocketService;
import java.util.ArrayList;
import java.util.List;
import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;

public class NotificationActivity extends AppCompatActivity {

    private ActivityNotificationBinding binding;
    private NotificationAdapter adapter;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        binding = ActivityNotificationBinding.inflate(getLayoutInflater());
        setContentView(binding.getRoot());

        initViews();
        setupListeners();
        loadNotifications();
        listenToSocket();
    }

    private void initViews() {
        binding.rvNotifications.setLayoutManager(new LinearLayoutManager(this));
        adapter = new NotificationAdapter(this, this::onNotificationClicked);
        binding.rvNotifications.setAdapter(adapter);

        binding.swipeRefresh.setColorSchemeResources(R.color.primary);
    }

    private void setupListeners() {
        binding.btnBack.setOnClickListener(v -> finish());
        binding.swipeRefresh.setOnRefreshListener(this::loadNotifications);
        binding.btnReadAll.setOnClickListener(v -> markAllAsRead());
    }

    private void listenToSocket() {
        SocketService.getInstance(this).setOnNotificationListener(notification -> {
            runOnUiThread(() -> {
                adapter.addNotification(notification);
                binding.layoutEmpty.setVisibility(View.GONE);
                binding.rvNotifications.setVisibility(View.VISIBLE);
                binding.rvNotifications.smoothScrollToPosition(0);
            });
        });
    }

    private void loadNotifications() {
        if (!binding.swipeRefresh.isRefreshing()) {
            binding.progressBar.setVisibility(View.VISIBLE);
        }
        binding.layoutEmpty.setVisibility(View.GONE);

        ApiClient.getApiService(this).getMyNotifications(1, 50, false)
                .enqueue(new Callback<ApiResponse<NotificationResponse>>() {
                    @Override
                    public void onResponse(Call<ApiResponse<NotificationResponse>> call, Response<ApiResponse<NotificationResponse>> response) {
                        binding.progressBar.setVisibility(View.GONE);
                        binding.swipeRefresh.setRefreshing(false);

                        if (response.isSuccessful() && response.body() != null && response.body().isSuccess()) {
                            NotificationResponse data = response.body().getData();
                            List<NotificationItem> list = (data != null && data.getNotifications() != null)
                                    ? data.getNotifications()
                                    : new ArrayList<>();

                            adapter.setList(list);

                            if (list.isEmpty()) {
                                binding.layoutEmpty.setVisibility(View.VISIBLE);
                                binding.rvNotifications.setVisibility(View.GONE);
                            } else {
                                binding.layoutEmpty.setVisibility(View.GONE);
                                binding.rvNotifications.setVisibility(View.VISIBLE);
                            }
                        } else {
                            Toast.makeText(NotificationActivity.this, "Không thể tải thông báo", Toast.LENGTH_SHORT).show();
                        }
                    }

                    @Override
                    public void onFailure(Call<ApiResponse<NotificationResponse>> call, Throwable t) {
                        binding.progressBar.setVisibility(View.GONE);
                        binding.swipeRefresh.setRefreshing(false);
                        Toast.makeText(NotificationActivity.this, "Lỗi kết nối: " + t.getMessage(), Toast.LENGTH_SHORT).show();
                    }
                });
    }

    private void onNotificationClicked(NotificationItem item) {
        // Mark as read on server if not read yet
        if (!item.isRead()) {
            item.setRead(true);
            adapter.notifyDataSetChanged();

            ApiClient.getApiService(this).markNotificationRead(item.getId())
                    .enqueue(new Callback<ApiResponse<Void>>() {
                        @Override
                        public void onResponse(Call<ApiResponse<Void>> call, Response<ApiResponse<Void>> response) {}

                        @Override
                        public void onFailure(Call<ApiResponse<Void>> call, Throwable t) {}
                    });
        }

        // Show detailed notification dialog
        new AlertDialog.Builder(this)
                .setTitle(item.getTitle())
                .setMessage(item.getMessage())
                .setPositiveButton("Đóng", null)
                .show();
    }

    private void markAllAsRead() {
        ApiClient.getApiService(this).markAllNotificationsRead()
                .enqueue(new Callback<ApiResponse<Void>>() {
                    @Override
                    public void onResponse(Call<ApiResponse<Void>> call, Response<ApiResponse<Void>> response) {
                        if (response.isSuccessful() && response.body() != null && response.body().isSuccess()) {
                            Toast.makeText(NotificationActivity.this, "Đã đánh dấu đọc tất cả thông báo", Toast.LENGTH_SHORT).show();
                            loadNotifications();
                        } else {
                            Toast.makeText(NotificationActivity.this, "Thao tác không thành công", Toast.LENGTH_SHORT).show();
                        }
                    }

                    @Override
                    public void onFailure(Call<ApiResponse<Void>> call, Throwable t) {
                        Toast.makeText(NotificationActivity.this, "Lỗi kết nối: " + t.getMessage(), Toast.LENGTH_SHORT).show();
                    }
                });
    }

    @Override
    protected void onDestroy() {
        super.onDestroy();
        SocketService.getInstance(this).setOnNotificationListener(null);
    }
}
