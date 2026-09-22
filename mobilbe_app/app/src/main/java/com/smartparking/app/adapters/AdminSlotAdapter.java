package com.smartparking.app.adapters;

import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.ImageView;
import android.widget.TextView;
import androidx.annotation.NonNull;
import androidx.core.content.ContextCompat;
import androidx.recyclerview.widget.RecyclerView;
import com.google.android.material.card.MaterialCardView;
import com.smartparking.app.R;
import com.smartparking.app.models.ParkingSlot;
import java.util.ArrayList;
import java.util.List;

public class AdminSlotAdapter extends RecyclerView.Adapter<AdminSlotAdapter.ViewHolder> {

    public interface OnSlotClickListener {
        void onSlotClick(ParkingSlot slot);
    }

    private final List<ParkingSlot> slots = new ArrayList<>();
    private final OnSlotClickListener listener;

    public AdminSlotAdapter(OnSlotClickListener listener) {
        this.listener = listener;
    }

    public void setSlots(List<ParkingSlot> newSlots) {
        slots.clear();
        if (newSlots != null) {
            slots.addAll(newSlots);
        }
        notifyDataSetChanged();
    }

    @NonNull
    @Override
    public ViewHolder onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
        View view = LayoutInflater.from(parent.getContext()).inflate(R.layout.item_admin_slot, parent, false);
        return new ViewHolder(view);
    }

    @Override
    public void onBindViewHolder(@NonNull ViewHolder holder, int position) {
        ParkingSlot slot = slots.get(position);
        holder.tvSlotCode.setText(slot.getSlotCode());

        String status = slot.getStatus();
        int carIcon = R.drawable.ic_car_top_green;
        int statusBg = R.drawable.bg_badge_free;
        int statusTextColor = R.color.status_free;
        int strokeColor = R.color.status_free_border;
        String statusText = "Trống";

        if ("OCCUPIED".equalsIgnoreCase(status)) {
            carIcon = R.drawable.ic_car_top_red;
            statusBg = R.drawable.bg_badge_occupied;
            statusTextColor = R.color.status_occupied;
            strokeColor = R.color.status_occupied_border;
            statusText = "Có xe";
        } else if ("RESERVED".equalsIgnoreCase(status)) {
            carIcon = R.drawable.ic_car_top_orange;
            statusBg = R.drawable.bg_badge_reserved;
            statusTextColor = R.color.status_reserved;
            strokeColor = R.color.status_reserved_border;
            statusText = "Đã đặt";
        } else if ("DISABLED".equalsIgnoreCase(status)) {
            carIcon = R.drawable.ic_car_top_gray;
            statusBg = R.drawable.bg_badge_disabled;
            statusTextColor = R.color.status_disabled;
            strokeColor = R.color.status_disabled_border;
            statusText = "Bảo trì";
        }

        holder.ivCar.setImageResource(carIcon);
        holder.tvStatus.setText(statusText);
        holder.tvStatus.setBackgroundResource(statusBg);
        holder.tvStatus.setTextColor(ContextCompat.getColor(holder.itemView.getContext(), statusTextColor));
        holder.cardContainer.setStrokeColor(ContextCompat.getColor(holder.itemView.getContext(), strokeColor));

        holder.itemView.setOnClickListener(v -> {
            if (listener != null) {
                listener.onSlotClick(slot);
            }
        });
    }

    @Override
    public int getItemCount() {
        return slots.size();
    }

    static class ViewHolder extends RecyclerView.ViewHolder {
        MaterialCardView cardContainer;
        TextView tvSlotCode, tvStatus;
        ImageView ivCar;
        View viewSensorDot;

        ViewHolder(@NonNull View itemView) {
            super(itemView);
            cardContainer = itemView.findViewById(R.id.card_slot_container);
            tvSlotCode = itemView.findViewById(R.id.tv_slot_code);
            tvStatus = itemView.findViewById(R.id.tv_slot_status);
            ivCar = itemView.findViewById(R.id.iv_slot_car);
            viewSensorDot = itemView.findViewById(R.id.view_sensor_dot);
        }
    }
}
