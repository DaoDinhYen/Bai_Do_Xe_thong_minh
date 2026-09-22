package com.smartparking.app.adapters;

import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.TextView;
import androidx.annotation.NonNull;
import androidx.recyclerview.widget.RecyclerView;
import com.smartparking.app.R;
import com.smartparking.app.models.SystemLog;
import java.util.ArrayList;
import java.util.List;

public class AdminSystemLogAdapter extends RecyclerView.Adapter<AdminSystemLogAdapter.ViewHolder> {

    private final List<SystemLog> logs = new ArrayList<>();

    public void setLogs(List<SystemLog> newLogs) {
        logs.clear();
        if (newLogs != null) {
            logs.addAll(newLogs);
        }
        notifyDataSetChanged();
    }

    @NonNull
    @Override
    public ViewHolder onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
        View view = LayoutInflater.from(parent.getContext()).inflate(R.layout.item_admin_log, parent, false);
        return new ViewHolder(view);
    }

    @Override
    public void onBindViewHolder(@NonNull ViewHolder holder, int position) {
        SystemLog log = logs.get(position);
        holder.tvAction.setText(log.getAction());
        holder.tvDesc.setText(log.getDescription());
        holder.tvUser.setText("Thực hiện: " + log.getUserName());
        holder.tvIp.setText("IP: " + log.getIpAddress());
        holder.tvTime.setText(log.getCreatedAt());
    }

    @Override
    public int getItemCount() {
        return logs.size();
    }

    static class ViewHolder extends RecyclerView.ViewHolder {
        TextView tvAction, tvDesc, tvUser, tvIp, tvTime;

        ViewHolder(@NonNull View itemView) {
            super(itemView);
            tvAction = itemView.findViewById(R.id.tv_log_action);
            tvDesc = itemView.findViewById(R.id.tv_log_desc);
            tvUser = itemView.findViewById(R.id.tv_log_user);
            tvIp = itemView.findViewById(R.id.tv_log_ip);
            tvTime = itemView.findViewById(R.id.tv_log_time);
        }
    }
}
