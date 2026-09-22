package com.smartparking.app.adapters;

import android.content.Context;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.TextView;
import androidx.annotation.NonNull;
import androidx.core.content.ContextCompat;
import androidx.recyclerview.widget.RecyclerView;
import com.smartparking.app.R;
import com.smartparking.app.models.ParkingHistory;
import com.smartparking.app.utils.FormatUtils;
import java.util.ArrayList;
import java.util.List;

public class ParkingHistoryAdapter extends RecyclerView.Adapter<ParkingHistoryAdapter.ViewHolder> {

    private final Context context;
    private final List<ParkingHistory> list = new ArrayList<>();

    public ParkingHistoryAdapter(Context context) {
        this.context = context;
    }

    public void setList(List<ParkingHistory> items) {
        this.list.clear();
        if (items != null) {
            this.list.addAll(items);
        }
        notifyDataSetChanged();
    }

    @NonNull
    @Override
    public ViewHolder onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
        View view = LayoutInflater.from(context).inflate(R.layout.item_parking_history, parent, false);
        return new ViewHolder(view);
    }

    @Override
    public void onBindViewHolder(@NonNull ViewHolder holder, int position) {
        ParkingHistory item = list.get(position);

        holder.tvPlate.setText(item.getPlateNumber().isEmpty() ? "Xe gửi" : item.getPlateNumber());

        String slotText = "Chỗ đỗ: " + (item.getSlotCode().isEmpty() ? "---" : item.getSlotCode()) +
                (item.getZone() != null ? " (" + item.getZone() + ")" : "");
        holder.tvSlot.setText(slotText);

        String entryText = "Vào: " + FormatUtils.formatDateTime(item.getEntryTime());
        if (item.getExitTime() != null && !item.getExitTime().isEmpty()) {
            entryText += "  |  Ra: " + FormatUtils.formatTime(item.getExitTime());
        }
        holder.tvTime.setText(entryText);

        holder.tvFee.setText(FormatUtils.formatCurrency(item.getFee()));
        holder.tvDuration.setText(String.format("Thời lượng: %.1f giờ", item.getDuration()));

        if ("PAID".equalsIgnoreCase(item.getPaymentStatus())) {
            holder.tvStatus.setText("Đã thanh toán");
            holder.tvStatus.setBackgroundResource(R.drawable.bg_badge_free);
            holder.tvStatus.setTextColor(ContextCompat.getColor(context, R.color.status_free));
        } else {
            holder.tvStatus.setText("Đang gửi");
            holder.tvStatus.setBackgroundResource(R.drawable.bg_badge_reserved);
            holder.tvStatus.setTextColor(ContextCompat.getColor(context, R.color.status_reserved));
        }
    }

    @Override
    public int getItemCount() {
        return list.size();
    }

    static class ViewHolder extends RecyclerView.ViewHolder {
        TextView tvPlate;
        TextView tvStatus;
        TextView tvSlot;
        TextView tvTime;
        TextView tvFee;
        TextView tvDuration;

        public ViewHolder(@NonNull View itemView) {
            super(itemView);
            tvPlate = itemView.findViewById(R.id.tv_history_plate);
            tvStatus = itemView.findViewById(R.id.tv_history_status);
            tvSlot = itemView.findViewById(R.id.tv_history_slot);
            tvTime = itemView.findViewById(R.id.tv_history_time);
            tvFee = itemView.findViewById(R.id.tv_history_fee);
            tvDuration = itemView.findViewById(R.id.tv_history_duration);
        }
    }
}
