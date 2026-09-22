package com.smartparking.app.adapters;

import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.TextView;
import androidx.annotation.NonNull;
import androidx.core.content.ContextCompat;
import androidx.recyclerview.widget.RecyclerView;
import com.smartparking.app.R;
import com.smartparking.app.models.RecentActivity;
import java.util.ArrayList;
import java.util.List;

public class AdminActivityAdapter extends RecyclerView.Adapter<AdminActivityAdapter.ViewHolder> {

    private final List<RecentActivity> items = new ArrayList<>();

    public void setItems(List<RecentActivity> newItems) {
        items.clear();
        if (newItems != null) {
            items.addAll(newItems);
        }
        notifyDataSetChanged();
    }

    @NonNull
    @Override
    public ViewHolder onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
        View view = LayoutInflater.from(parent.getContext()).inflate(R.layout.item_admin_activity, parent, false);
        return new ViewHolder(view);
    }

    @Override
    public void onBindViewHolder(@NonNull ViewHolder holder, int position) {
        RecentActivity item = items.get(position);
        holder.tvTitle.setText(item.getTitle());
        holder.tvDetail.setText(item.getDetail());
        holder.tvTime.setText(item.getTime());

        String type = item.getType();
        holder.tvType.setText(type != null ? type.toUpperCase() : "SỰ KIỆN");

        int badgeBg = R.drawable.bg_badge_blue;
        int textColor = R.color.primary;

        if ("Đã vào".equalsIgnoreCase(type) || "IN".equalsIgnoreCase(type)) {
            badgeBg = R.drawable.bg_badge_free;
            textColor = R.color.status_free;
        } else if ("Đã ra".equalsIgnoreCase(type) || "OUT".equalsIgnoreCase(type)) {
            badgeBg = R.drawable.bg_badge_occupied;
            textColor = R.color.status_occupied;
        } else if ("Booking".equalsIgnoreCase(type)) {
            badgeBg = R.drawable.bg_badge_reserved;
            textColor = R.color.status_reserved;
        }

        holder.tvType.setBackgroundResource(badgeBg);
        holder.tvType.setTextColor(ContextCompat.getColor(holder.itemView.getContext(), textColor));
    }

    @Override
    public int getItemCount() {
        return items.size();
    }

    static class ViewHolder extends RecyclerView.ViewHolder {
        TextView tvType, tvTitle, tvDetail, tvTime;

        ViewHolder(@NonNull View itemView) {
            super(itemView);
            tvType = itemView.findViewById(R.id.tv_act_type);
            tvTitle = itemView.findViewById(R.id.tv_act_title);
            tvDetail = itemView.findViewById(R.id.tv_act_detail);
            tvTime = itemView.findViewById(R.id.tv_act_time);
        }
    }
}
