package com.smartparking.app.activities;

import android.app.Dialog;
import android.graphics.Color;
import android.graphics.drawable.ColorDrawable;
import android.os.Bundle;
import android.text.Editable;
import android.text.TextWatcher;
import android.view.ViewGroup;
import android.view.Window;
import android.widget.EditText;
import android.widget.ImageView;
import android.widget.TextView;
import android.widget.Toast;
import androidx.appcompat.app.AppCompatActivity;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;
import androidx.swiperefreshlayout.widget.SwipeRefreshLayout;
import com.google.android.material.button.MaterialButton;
import com.smartparking.app.R;
import com.smartparking.app.adapters.AdminUserAdapter;
import com.smartparking.app.models.ApiResponse;
import com.smartparking.app.models.User;
import com.smartparking.app.network.ApiClient;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;

public class AdminUserManagementActivity extends AppCompatActivity implements AdminUserAdapter.UserActionListener {

    private SwipeRefreshLayout swipeRefresh;
    private EditText edtSearch;
    private RecyclerView rvUsers;
    private TextView tvEmpty;
    private AdminUserAdapter adapter;

    private List<User> allUsers = new ArrayList<>();

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_admin_user_management);

        ImageView btnBack = findViewById(R.id.btn_back_users);
        btnBack.setOnClickListener(v -> finish());

        swipeRefresh = findViewById(R.id.swipe_refresh_users);
        edtSearch = findViewById(R.id.edt_search_users);
        rvUsers = findViewById(R.id.rv_admin_users);
        tvEmpty = findViewById(R.id.tv_empty_users);

        rvUsers.setLayoutManager(new LinearLayoutManager(this));
        adapter = new AdminUserAdapter(this);
        rvUsers.setAdapter(adapter);

        edtSearch.addTextChangedListener(new TextWatcher() {
            @Override
            public void beforeTextChanged(CharSequence s, int start, int count, int after) {}

            @Override
            public void onTextChanged(CharSequence s, int start, int count, int after) {
                filterUsers(s.toString().trim());
            }

            @Override
            public void afterTextChanged(Editable s) {}
        });

        swipeRefresh.setOnRefreshListener(this::loadUsers);

        loadUsers();
    }

    private void loadUsers() {
        swipeRefresh.setRefreshing(true);
        ApiClient.getApiService(this).getAllUsersAdmin(1, 100, null, null, null).enqueue(new Callback<ApiResponse<List<User>>>() {
            @Override
            public void onResponse(Call<ApiResponse<List<User>>> call, Response<ApiResponse<List<User>>> response) {
                swipeRefresh.setRefreshing(false);
                if (response.isSuccessful() && response.body() != null && response.body().isSuccess()) {
                    List<User> list = response.body().getData();
                    if (list != null) {
                        allUsers = list;
                        filterUsers(edtSearch.getText().toString().trim());
                    }
                }
            }

            @Override
            public void onFailure(Call<ApiResponse<List<User>>> call, Throwable t) {
                swipeRefresh.setRefreshing(false);
                Toast.makeText(AdminUserManagementActivity.this, "Lỗi tải người dùng: " + t.getMessage(), Toast.LENGTH_SHORT).show();
            }
        });
    }

    private void filterUsers(String query) {
        if (query.isEmpty()) {
            adapter.setUsers(allUsers);
            tvEmpty.setVisibility(allUsers.isEmpty() ? android.view.View.VISIBLE : android.view.View.GONE);
            rvUsers.setVisibility(allUsers.isEmpty() ? android.view.View.GONE : android.view.View.VISIBLE);
            return;
        }

        List<User> filtered = new ArrayList<>();
        for (User u : allUsers) {
            if (u.getName().toUpperCase().contains(query.toUpperCase())
                    || u.getEmail().toUpperCase().contains(query.toUpperCase())
                    || u.getPhone().contains(query)) {
                filtered.add(u);
            }
        }
        adapter.setUsers(filtered);
        tvEmpty.setVisibility(filtered.isEmpty() ? android.view.View.VISIBLE : android.view.View.GONE);
        rvUsers.setVisibility(filtered.isEmpty() ? android.view.View.GONE : android.view.View.VISIBLE);
    }

    @Override
    public void onToggleStatus(User user) {
        String newStatus = "ACTIVE".equalsIgnoreCase(user.getStatus()) ? "BLOCKED" : "ACTIVE";
        Map<String, String> body = new HashMap<>();
        body.put("status", newStatus);

        ApiClient.getApiService(this).setUserStatus(user.getId(), body).enqueue(new Callback<ApiResponse<Void>>() {
            @Override
            public void onResponse(Call<ApiResponse<Void>> call, Response<ApiResponse<Void>> response) {
                if (response.isSuccessful()) {
                    user.setStatus(newStatus);
                    adapter.notifyDataSetChanged();
                    Toast.makeText(AdminUserManagementActivity.this,
                            "ACTIVE".equals(newStatus) ? "Đã mở khóa tài khoản!" : "Đã khóa tài khoản!",
                            Toast.LENGTH_SHORT).show();
                } else {
                    Toast.makeText(AdminUserManagementActivity.this, "Không thể cập nhật trạng thái", Toast.LENGTH_SHORT).show();
                }
            }

            @Override
            public void onFailure(Call<ApiResponse<Void>> call, Throwable t) {
                Toast.makeText(AdminUserManagementActivity.this, "Lỗi mạng: " + t.getMessage(), Toast.LENGTH_SHORT).show();
            }
        });
    }

    @Override
    public void onResetPassword(User user) {
        Dialog dialog = new Dialog(this);
        dialog.requestWindowFeature(Window.FEATURE_NO_TITLE);
        dialog.setContentView(R.layout.dialog_admin_reset_password);
        if (dialog.getWindow() != null) {
            dialog.getWindow().setBackgroundDrawable(new ColorDrawable(Color.TRANSPARENT));
            dialog.getWindow().setLayout(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        }

        TextView tvUser = dialog.findViewById(R.id.tv_dialog_reset_user);
        tvUser.setText("Tài khoản: " + user.getEmail());

        EditText edtPass = dialog.findViewById(R.id.edt_new_password);
        MaterialButton btnCancel = dialog.findViewById(R.id.btn_cancel_reset);
        MaterialButton btnConfirm = dialog.findViewById(R.id.btn_confirm_reset);

        btnCancel.setOnClickListener(v -> dialog.dismiss());

        btnConfirm.setOnClickListener(v -> {
            String newPass = edtPass.getText().toString().trim();
            if (newPass.length() < 6) {
                edtPass.setError("Mật khẩu tối thiểu 6 ký tự");
                return;
            }

            Map<String, String> body = new HashMap<>();
            body.put("new_password", newPass);

            ApiClient.getApiService(this).resetUserPassword(user.getId(), body).enqueue(new Callback<ApiResponse<Void>>() {
                @Override
                public void onResponse(Call<ApiResponse<Void>> call, Response<ApiResponse<Void>> response) {
                    dialog.dismiss();
                    if (response.isSuccessful()) {
                        Toast.makeText(AdminUserManagementActivity.this, "Đặt lại mật khẩu thành công!", Toast.LENGTH_SHORT).show();
                    } else {
                        Toast.makeText(AdminUserManagementActivity.this, "Không thể đặt lại mật khẩu", Toast.LENGTH_SHORT).show();
                    }
                }

                @Override
                public void onFailure(Call<ApiResponse<Void>> call, Throwable t) {
                    dialog.dismiss();
                    Toast.makeText(AdminUserManagementActivity.this, "Lỗi: " + t.getMessage(), Toast.LENGTH_SHORT).show();
                }
            });
        });

        dialog.show();
    }
}
