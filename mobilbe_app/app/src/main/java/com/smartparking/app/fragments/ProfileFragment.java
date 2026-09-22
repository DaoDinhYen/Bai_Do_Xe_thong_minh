package com.smartparking.app.fragments;

import android.app.AlertDialog;
import android.content.Intent;
import android.os.Bundle;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.EditText;
import android.widget.Toast;
import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.fragment.app.Fragment;
import com.smartparking.app.R;
import com.smartparking.app.activities.*;
import com.smartparking.app.databinding.FragmentProfileBinding;
import com.smartparking.app.models.ApiResponse;
import com.smartparking.app.models.User;
import com.smartparking.app.models.WalletResponse;
import com.smartparking.app.network.ApiClient;
import com.smartparking.app.services.SocketService;
import com.smartparking.app.utils.FormatUtils;
import com.smartparking.app.utils.SessionManager;
import java.util.HashMap;
import java.util.Map;
import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;

public class ProfileFragment extends Fragment {

    private FragmentProfileBinding binding;
    private User currentUser;

    @Nullable
    @Override
    public View onCreateView(@NonNull LayoutInflater inflater, @Nullable ViewGroup container, @Nullable Bundle savedInstanceState) {
        binding = FragmentProfileBinding.inflate(inflater, container, false);
        return binding.getRoot();
    }

    @Override
    public void onViewCreated(@NonNull View view, @Nullable Bundle savedInstanceState) {
        super.onViewCreated(view, savedInstanceState);

        initViews();
        setupListeners();
        loadProfileData();
    }

    private void initViews() {
        binding.swipeRefresh.setColorSchemeResources(R.color.primary);

        // Preload from local session
        currentUser = SessionManager.getInstance(getContext()).getUser();
        if (currentUser != null) {
            displayUser(currentUser);
        }
    }

    private void setupListeners() {
        binding.swipeRefresh.setOnRefreshListener(this::loadProfileData);

        binding.btnEditProfile.setOnClickListener(v -> showEditProfileDialog());

        binding.btnQuickTopup.setOnClickListener(v -> {
            if (getActivity() instanceof MainActivity) {
                ((MainActivity) getActivity()).switchTab(R.id.nav_wallet);
            }
        });

        binding.rowVehicles.setOnClickListener(v -> {
            Intent intent = new Intent(getContext(), VehicleManagementActivity.class);
            startActivity(intent);
        });

        binding.rowTransactions.setOnClickListener(v -> {
            Intent intent = new Intent(getContext(), TransactionHistoryActivity.class);
            startActivity(intent);
        });

        binding.rowNotifications.setOnClickListener(v -> {
            Intent intent = new Intent(getContext(), NotificationActivity.class);
            startActivity(intent);
        });

        binding.rowSettings.setOnClickListener(v -> {
            Intent intent = new Intent(getContext(), SettingsActivity.class);
            startActivity(intent);
        });

        binding.rowSupport.setOnClickListener(v -> showSupportDialog());

        binding.rowLogout.setOnClickListener(v -> confirmLogout());
    }

    @Override
    public void onResume() {
        super.onResume();
        loadProfileData();
    }

    @Override
    public void onHiddenChanged(boolean hidden) {
        super.onHiddenChanged(hidden);
        if (!hidden) {
            loadProfileData();
        }
    }

    private void loadProfileData() {
        if (!isAdded()) return;

        // 1. Fetch Profile
        ApiClient.getApiService(getContext()).getProfile().enqueue(new Callback<ApiResponse<User>>() {
            @Override
            public void onResponse(Call<ApiResponse<User>> call, Response<ApiResponse<User>> response) {
                if (!isAdded()) return;
                binding.swipeRefresh.setRefreshing(false);

                if (response.isSuccessful() && response.body() != null && response.body().isSuccess()) {
                    currentUser = response.body().getData();
                    if (currentUser != null) {
                        SessionManager.getInstance(getContext()).saveUser(currentUser);
                        displayUser(currentUser);
                    }
                }
            }

            @Override
            public void onFailure(Call<ApiResponse<User>> call, Throwable t) {
                if (!isAdded()) return;
                binding.swipeRefresh.setRefreshing(false);
            }
        });

        // 2. Fetch Wallet Balance
        ApiClient.getApiService(getContext()).getWallet().enqueue(new Callback<ApiResponse<WalletResponse>>() {
            @Override
            public void onResponse(Call<ApiResponse<WalletResponse>> call, Response<ApiResponse<WalletResponse>> response) {
                if (!isAdded()) return;
                if (response.isSuccessful() && response.body() != null && response.body().isSuccess()) {
                    WalletResponse wallet = response.body().getData();
                    if (wallet != null) {
                        binding.tvWalletBalance.setText(FormatUtils.formatCurrency(wallet.getBalance()));
                    }
                }
            }

            @Override
            public void onFailure(Call<ApiResponse<WalletResponse>> call, Throwable t) {}
        });
    }

    private void displayUser(User user) {
        String name = user.getFullName();
        if (name.isEmpty()) name = user.getUsername();
        binding.tvUserName.setText(name);

        String email = user.getEmail();
        binding.tvUserEmail.setText(email.isEmpty() ? "Chưa liên kết email" : email);

        String phone = user.getPhone();
        binding.tvUserPhone.setText(phone.isEmpty() ? "Chưa có số điện thoại" : phone);

        String initial = name.isEmpty() ? "U" : String.valueOf(name.charAt(0)).toUpperCase();
        binding.tvAvatarChar.setText(initial);
    }

    private void showEditProfileDialog() {
        if (getContext() == null) return;

        View dialogView = LayoutInflater.from(getContext()).inflate(R.layout.dialog_edit_profile, null);
        AlertDialog dialog = new AlertDialog.Builder(getContext())
                .setView(dialogView)
                .create();

        if (dialog.getWindow() != null) {
            dialog.getWindow().setBackgroundDrawableResource(android.R.color.transparent);
        }

        EditText etFullName = dialogView.findViewById(R.id.etFullName);
        EditText etPhone = dialogView.findViewById(R.id.etPhone);

        if (currentUser != null) {
            etFullName.setText(currentUser.getFullName());
            etPhone.setText(currentUser.getPhone());
        }

        dialogView.findViewById(R.id.btnCancel).setOnClickListener(v -> dialog.dismiss());

        dialogView.findViewById(R.id.btnSave).setOnClickListener(v -> {
            String newName = etFullName.getText().toString().trim();
            String newPhone = etPhone.getText().toString().trim();

            if (newName.isEmpty()) {
                etFullName.setError("Vui lòng nhập họ và tên");
                return;
            }

            dialog.dismiss();
            binding.swipeRefresh.setRefreshing(true);

            Map<String, String> body = new HashMap<>();
            body.put("full_name", newName);
            body.put("phone", newPhone);

            ApiClient.getApiService(getContext()).updateProfile(body)
                    .enqueue(new Callback<ApiResponse<User>>() {
                        @Override
                        public void onResponse(Call<ApiResponse<User>> call, Response<ApiResponse<User>> response) {
                            if (!isAdded()) return;
                            binding.swipeRefresh.setRefreshing(false);

                            if (response.isSuccessful() && response.body() != null && response.body().isSuccess()) {
                                currentUser = response.body().getData();
                                if (currentUser != null) {
                                    SessionManager.getInstance(getContext()).saveUser(currentUser);
                                    displayUser(currentUser);
                                }
                                Toast.makeText(getContext(), "Cập nhật thông tin thành công", Toast.LENGTH_SHORT).show();
                            } else {
                                Toast.makeText(getContext(), "Cập nhật thất bại", Toast.LENGTH_SHORT).show();
                            }
                        }

                        @Override
                        public void onFailure(Call<ApiResponse<User>> call, Throwable t) {
                            if (!isAdded()) return;
                            binding.swipeRefresh.setRefreshing(false);
                            Toast.makeText(getContext(), "Lỗi: " + t.getMessage(), Toast.LENGTH_SHORT).show();
                        }
                    });
        });

        dialog.show();
    }

    private void showSupportDialog() {
        if (getContext() == null) return;
        new AlertDialog.Builder(getContext())
                .setTitle("Trung tâm hỗ trợ khách hàng")
                .setMessage("Hệ thống Bãi Đỗ Xe Thông Minh (Smart Parking System)\n\n" +
                        "• Hotline hỗ trợ 24/7: 1900 6868\n" +
                        "• Email CSKH: support@smartparking.vn\n" +
                        "• Giờ vận hành bãi đỗ: 24/24 tất cả các ngày trong tuần")
                .setPositiveButton("Đã hiểu", null)
                .show();
    }

    private void confirmLogout() {
        if (getContext() == null) return;
        new AlertDialog.Builder(getContext())
                .setTitle("Đăng xuất")
                .setMessage("Bạn có chắc chắn muốn đăng xuất khỏi tài khoản?")
                .setPositiveButton("Đăng xuất", (dialog, which) -> {
                    // Disconnect socket
                    SocketService.getInstance(getContext()).disconnect();

                    // Optional logout API call
                    ApiClient.getApiService(getContext()).logout().enqueue(new Callback<ApiResponse<Void>>() {
                        @Override
                        public void onResponse(Call<ApiResponse<Void>> call, Response<ApiResponse<Void>> response) {}

                        @Override
                        public void onFailure(Call<ApiResponse<Void>> call, Throwable t) {}
                    });

                    // Clear session
                    SessionManager.getInstance(getContext()).clearSession();

                    // Navigate to LoginActivity
                    Intent intent = new Intent(getContext(), LoginActivity.class);
                    intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TASK);
                    startActivity(intent);
                    if (getActivity() != null) {
                        getActivity().finish();
                    }
                })
                .setNegativeButton("Hủy", null)
                .show();
    }

    @Override
    public void onDestroyView() {
        super.onDestroyView();
        binding = null;
    }
}
