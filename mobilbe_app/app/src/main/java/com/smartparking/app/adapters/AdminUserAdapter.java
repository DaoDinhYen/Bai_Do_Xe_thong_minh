package com.smartparking.app.adapters;

import android.content.Context;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.TextView;
import androidx.annotation.NonNull;
import androidx.core.content.ContextCompat;
import androidx.recyclerview.widget.RecyclerView;
import com.google.android.material.button.MaterialButton;
import com.smartparking.app.R;
import com.smartparking.app.models.User;
import com.smartparking.app.utils.FormatUtils;
import java.util.ArrayList;
import java.util.List;

public class AdminUserAdapter extends RecyclerView.Adapter<AdminUserAdapter.ViewHolder> {

    public interface UserActionListener {
        void onToggleStatus(User user);
        void onResetPassword(User user);
    }

    private final List<User> users = new ArrayList<>();
    private final UserActionListener listener;

    public AdminUserAdapter(UserActionListener listener) {
        this.listener = listener;
    }

    public void setUsers(List<User> newUsers) {
        users.clear();
        if (newUsers != null) {
            users.addAll(newUsers);
        }
        notifyDataSetChanged();
    }

    @NonNull
    @Override
    public ViewHolder onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
        View view = LayoutInflater.from(parent.getContext()).inflate(R.layout.item_admin_user, parent, false);
        return new ViewHolder(view);
    }

    @Override
    public void onBindViewHolder(@NonNull ViewHolder holder, int position) {
        User user = users.get(position);
        Context ctx = holder.itemView.getContext();

        holder.tvName.setText(user.getName());
        holder.tvEmail.setText(user.getEmail());
        holder.tvPhone.setText(user.getPhone() != null && !user.getPhone().isEmpty() ? user.getPhone() : "Chưa cập nhật");
        holder.tvRole.setText(user.getRole());
        holder.tvBalance.setText(FormatUtils.formatCurrency(user.getWalletBalance()));

        // User initials
        String name = user.getName();
        String initials = "U";
        if (name != null && !name.trim().isEmpty()) {
            String[] parts = name.trim().split("\\s+");
            if (parts.length >= 2) {
                initials = ("" + parts[parts.length - 2].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
            } else {
                initials = ("" + parts[0].charAt(0)).toUpperCase();
            }
        }
        holder.tvInitials.setText(initials);

        // Status badge & button state
        boolean isBlocked = "BLOCKED".equalsIgnoreCase(user.getStatus());
        if (isBlocked) {
            holder.tvStatus.setText("BỊ KHÓA");
            holder.tvStatus.setBackgroundResource(R.drawable.bg_badge_occupied);
            holder.tvStatus.setTextColor(ContextCompat.getColor(ctx, R.color.status_occupied));

            holder.btnToggleStatus.setText("Mở khóa");
            holder.btnToggleStatus.setBackgroundColor(ContextCompat.getColor(ctx, R.color.status_free));
        } else {
            holder.tvStatus.setText("HOẠT ĐỘNG");
            holder.tvStatus.setBackgroundResource(R.drawable.bg_badge_free);
            holder.tvStatus.setTextColor(ContextCompat.getColor(ctx, R.color.status_free));

            holder.btnToggleStatus.setText("Khóa");
            holder.btnToggleStatus.setBackgroundColor(ContextCompat.getColor(ctx, R.color.status_occupied));
        }

        // Action click handlers
        holder.btnToggleStatus.setOnClickListener(v -> {
            if (listener != null) listener.onToggleStatus(user);
        });

        holder.btnResetPass.setOnClickListener(v -> {
            if (listener != null) listener.onResetPassword(user);
        });
    }

    @Override
    public int getItemCount() {
        return users.size();
    }

    static class ViewHolder extends RecyclerView.ViewHolder {
        TextView tvInitials, tvName, tvEmail, tvStatus, tvPhone, tvRole, tvBalance;
        MaterialButton btnResetPass, btnToggleStatus;

        ViewHolder(@NonNull View itemView) {
            super(itemView);
            tvInitials = itemView.findViewById(R.id.tv_user_initials);
            tvName = itemView.findViewById(R.id.tv_user_name);
            tvEmail = itemView.findViewById(R.id.tv_user_email);
            tvStatus = itemView.findViewById(R.id.tv_user_status);
            tvPhone = itemView.findViewById(R.id.tv_user_phone);
            tvRole = itemView.findViewById(R.id.tv_user_role);
            tvBalance = itemView.findViewById(R.id.tv_user_balance);
            btnResetPass = itemView.findViewById(R.id.btn_reset_pass);
            btnToggleStatus = itemView.findViewById(R.id.btn_toggle_status);
        }
    }
}
