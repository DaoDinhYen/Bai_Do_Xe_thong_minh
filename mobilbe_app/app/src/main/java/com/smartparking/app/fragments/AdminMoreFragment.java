package com.smartparking.app.fragments;

import android.content.Intent;
import android.os.Bundle;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.LinearLayout;
import android.widget.TextView;
import android.widget.Toast;
import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.fragment.app.Fragment;
import com.google.android.material.button.MaterialButton;
import com.smartparking.app.R;
import com.smartparking.app.activities.AdminSystemLogsActivity;
import com.smartparking.app.activities.AdminUserManagementActivity;
import com.smartparking.app.activities.AdminVehicleRfidActivity;
import com.smartparking.app.activities.LoginActivity;
import com.smartparking.app.models.User;
import com.smartparking.app.network.ApiClient;
import com.smartparking.app.services.SocketService;
import com.smartparking.app.utils.DialogUtils;
import com.smartparking.app.utils.SessionManager;

public class AdminMoreFragment extends Fragment {

    private TextView tvAdminInitials, tvAdminFullName, tvAdminEmail;
    private LinearLayout menuUsers, menuVehiclesRfid, menuSystemLogs, menuServerConfig;
    private MaterialButton btnLogout;

    @Nullable
    @Override
    public View onCreateView(@NonNull LayoutInflater inflater, @Nullable ViewGroup container, @Nullable Bundle savedInstanceState) {
        View v = inflater.inflate(R.layout.fragment_admin_more, container, false);

        tvAdminInitials = v.findViewById(R.id.tv_admin_initials);
        tvAdminFullName = v.findViewById(R.id.tv_admin_full_name);
        tvAdminEmail = v.findViewById(R.id.tv_admin_email);

        menuUsers = v.findViewById(R.id.menu_admin_users);
        menuVehiclesRfid = v.findViewById(R.id.menu_admin_vehicles_rfid);
        menuSystemLogs = v.findViewById(R.id.menu_admin_system_logs);
        menuServerConfig = v.findViewById(R.id.menu_admin_server_config);
        btnLogout = v.findViewById(R.id.btn_admin_logout);

        // Bind user info
        User user = SessionManager.getInstance(requireContext()).getUser();
        if (user != null) {
            tvAdminFullName.setText(user.getName());
            tvAdminEmail.setText(user.getEmail());
            String initials = "AD";
            if (!user.getName().isEmpty()) {
                String[] parts = user.getName().split("\\s+");
                initials = ("" + parts[0].charAt(0)).toUpperCase();
            }
            tvAdminInitials.setText(initials);
        }

        menuUsers.setOnClickListener(view -> {
            Intent intent = new Intent(getContext(), AdminUserManagementActivity.class);
            startActivity(intent);
        });

        menuVehiclesRfid.setOnClickListener(view -> {
            Intent intent = new Intent(getContext(), AdminVehicleRfidActivity.class);
            startActivity(intent);
        });

        menuSystemLogs.setOnClickListener(view -> {
            Intent intent = new Intent(getContext(), AdminSystemLogsActivity.class);
            startActivity(intent);
        });

        menuServerConfig.setOnClickListener(view -> {
            DialogUtils.showServerConfigDialog(requireContext(), (newHost, newPort) -> {
                ApiClient.resetClient();
                SocketService.getInstance(requireContext()).reconnect();
                Toast.makeText(getContext(), "Đã cập nhật IP máy chủ!", Toast.LENGTH_SHORT).show();
            });
        });

        btnLogout.setOnClickListener(view -> {
            SessionManager.getInstance(requireContext()).logout();
            SocketService.getInstance(requireContext()).disconnect();
            Toast.makeText(getContext(), "Đã đăng xuất tài khoản Admin", Toast.LENGTH_SHORT).show();

            Intent intent = new Intent(getContext(), LoginActivity.class);
            intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TASK);
            startActivity(intent);
            if (getActivity() != null) {
                getActivity().finish();
            }
        });

        return v;
    }
}
