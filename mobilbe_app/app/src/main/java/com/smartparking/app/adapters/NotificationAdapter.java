package com.smartparking.app.adapters;

import android.content.Context;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.FrameLayout;
import android.widget.ImageView;
import android.widget.TextView;
import androidx.annotation.NonNull;
import androidx.core.content.ContextCompat;
import androidx.recyclerview.widget.RecyclerView;
import com.smartparking.app.R;
import com.smartparking.app.models.NotificationItem;
import com.smartparking.app.utils.FormatUtils;
import java.util.ArrayList;
import java.util.List;

public class NotificationAdapter extends RecyclerView.Adapter<NotificationAdapter.ViewHolder> {

    public interface OnNotificationClickListener {
        void onNotificationClick(NotificationItem item);
    }

    private final Context context;
    private final List<NotificationItem> list = new ArrayList<>();
    private final OnNotificationClickListener listener;

    public NotificationAdapter(Context context, OnNotificationClickListener listener) {
        this.context = context;
        this.listener = listener;
    }

    public void setList(List<NotificationItem> items) {
        this.list.clear();
        if (items != null) {
            this.list.addAll(items);
        }
        notifyDataSetChanged();
    }

    public void addNotification(NotificationItem item) {
        if (item != null) {
            this.list.add(0, item);
            notifyItemInserted(0);
        }
    }

    @NonNull
    @Override
    public ViewHolder onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
        View view = LayoutInflater.from(context).inflate(R.layout.item_notification, parent, false);
        return new ViewHolder(view);
    }

    @Override
    public void onBindViewHolder(@NonNull ViewHolder holder, int position) {
        NotificationItem item = list.get(position);

        holder.tvTitle.setText(item.getTitle());
        holder.tvMessage.setText(item.getMessage());
        holder.tvTime.setText(FormatUtils.formatDateTime(item.getCreatedAt()));

        // Unread dot
        holder.viewUnreadDot.setVisibility(item.isRead() ? View.GONE : View.VISIBLE);

        // Styling according to notification type
        String type = item.getType();
        if ("SUCCESS".equalsIgnoreCase(type)) {
            holder.layoutIconBg.setBackgroundResource(R.drawable.bg_badge_free);
            holder.ivIcon.setImageResource(R.drawable.ic_check_circle);
            holder.ivIcon.setColorFilter(ContextCompat.getColor(context, R.color.status_free));
        } else if ("ALERT".equalsIgnoreCase(type) || "WARNING".equalsIgnoreCase(type)) {
            holder.layoutIconBg.setBackgroundResource(R.drawable.bg_badge_reserved);
            holder.ivIcon.setImageResource(R.drawable.ic_notifications);
            holder.ivIcon.setColorFilter(ContextCompat.getColor(context, R.color.status_reserved));
        } else {
            holder.layoutIconBg.setBackgroundResource(R.drawable.bg_badge_blue);
            holder.ivIcon.setImageResource(R.drawable.ic_notifications);
            holder.ivIcon.setColorFilter(ContextCompat.getColor(context, R.color.primary));
        }

        holder.itemView.setOnClickListener(v -> {
            if (listener != null) {
                listener.onNotificationClick(item);
            }
        });
    }

    @Override
    public int getItemCount() {
        return list.size();
    }

    static class ViewHolder extends RecyclerView.ViewHolder {
        FrameLayout layoutIconBg;
        ImageView ivIcon;
        TextView tvTitle;
        TextView tvMessage;
        TextView tvTime;
        View viewUnreadDot;

        public ViewHolder(@NonNull View itemView) {
            super(itemView);
            layoutIconBg = itemView.findViewById(R.id.layout_notif_icon_bg);
            ivIcon = itemView.findViewById(R.id.iv_notif_icon);
            tvTitle = itemView.findViewById(R.id.tv_notif_title);
            tvMessage = itemView.findViewById(R.id.tv_notif_message);
            tvTime = itemView.findViewById(R.id.tv_notif_time);
            viewUnreadDot = itemView.findViewById(R.id.view_unread_dot);
        }
    }
}
