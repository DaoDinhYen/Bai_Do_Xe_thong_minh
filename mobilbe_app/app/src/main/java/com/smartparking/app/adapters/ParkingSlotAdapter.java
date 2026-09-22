package com.smartparking.app.adapters;

import android.content.Context;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.TextView;
import androidx.annotation.NonNull;
import androidx.core.content.ContextCompat;
import androidx.recyclerview.widget.RecyclerView;
import com.smartparking.app.R;
import com.smartparking.app.models.ParkingSlot;
import java.util.ArrayList;
import java.util.List;

public class ParkingSlotAdapter extends RecyclerView.Adapter<ParkingSlotAdapter.SlotViewHolder> {

    public interface OnSlotClickListener {
        void onSlotClick(ParkingSlot slot, int position);
    }

    private final Context context;
    private final List<ParkingSlot> slots = new ArrayList<>();
    private final OnSlotClickListener listener;

    public ParkingSlotAdapter(Context context, OnSlotClickListener listener) {
        this.context = context;
        this.listener = listener;
    }

    public void setSlots(List<ParkingSlot> newSlots) {
        this.slots.clear();
        if (newSlots != null) {
            java.util.Set<String> seenCodes = new java.util.HashSet<>();
            for (ParkingSlot s : newSlots) {
                if (s == null) continue;
                String code = s.getSlotCode() != null ? s.getSlotCode().trim().toUpperCase() : ("ID_" + s.getId());
                if (!seenCodes.contains(code)) {
                    seenCodes.add(code);
                    this.slots.add(s);
                }
            }
        }
        notifyDataSetChanged();
    }

    public List<ParkingSlot> getSlots() {
        return slots;
    }

    /**
     * Real-time slot update: updates single item without reloading whole list
     */
    public void updateSlotStatus(String slotCode, String newStatus) {
        for (int i = 0; i < slots.size(); i++) {
            ParkingSlot slot = slots.get(i);
            if (slot.getSlotCode().equalsIgnoreCase(slotCode)) {
                slot.setStatus(newStatus);
                notifyItemChanged(i);
                break;
            }
        }
    }

    public void selectSlot(int position) {
        for (int i = 0; i < slots.size(); i++) {
            slots.get(i).setSelected(i == position);
        }
        notifyDataSetChanged();
    }

    public ParkingSlot getSelectedSlot() {
        for (ParkingSlot slot : slots) {
            if (slot.isSelected()) return slot;
        }
        return null;
    }

    @NonNull
    @Override
    public SlotViewHolder onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
        View view = LayoutInflater.from(context).inflate(R.layout.item_parking_slot, parent, false);
        return new SlotViewHolder(view);
    }

    @Override
    public void onBindViewHolder(@NonNull SlotViewHolder holder, int position) {
        ParkingSlot slot = slots.get(position);
        holder.tvSlotCode.setText(slot.getSlotCode());

        String status = slot.getStatus().toUpperCase();

        if (slot.isSelected()) {
            holder.layoutBg.setBackgroundResource(R.drawable.bg_slot_selected);
            holder.tvSlotStatus.setText("Đang chọn");
            holder.tvSlotStatus.setTextColor(ContextCompat.getColor(context, R.color.primary));
            holder.ivCar.setImageResource(R.drawable.ic_car_top_green);
        } else {
            switch (status) {
                case "OCCUPIED":
                    holder.layoutBg.setBackgroundResource(R.drawable.bg_slot_occupied);
                    holder.tvSlotStatus.setText("Có xe");
                    holder.tvSlotStatus.setTextColor(ContextCompat.getColor(context, R.color.status_occupied));
                    holder.ivCar.setImageResource(R.drawable.ic_car_top_red);
                    break;
                case "RESERVED":
                    holder.layoutBg.setBackgroundResource(R.drawable.bg_slot_reserved);
                    holder.tvSlotStatus.setText("Đã đặt");
                    holder.tvSlotStatus.setTextColor(ContextCompat.getColor(context, R.color.status_reserved));
                    holder.ivCar.setImageResource(R.drawable.ic_car_top_orange);
                    break;
                case "DISABLED":
                    holder.layoutBg.setBackgroundResource(R.drawable.bg_slot_disabled);
                    holder.tvSlotStatus.setText("Bảo trì");
                    holder.tvSlotStatus.setTextColor(ContextCompat.getColor(context, R.color.status_disabled));
                    holder.ivCar.setImageResource(R.drawable.ic_car_top_gray);
                    break;
                case "FREE":
                default:
                    holder.layoutBg.setBackgroundResource(R.drawable.bg_slot_free);
                    holder.tvSlotStatus.setText("Trống");
                    holder.tvSlotStatus.setTextColor(ContextCompat.getColor(context, R.color.status_free));
                    holder.ivCar.setImageResource(R.drawable.ic_car_top_green);
                    break;
            }
        }

        holder.itemView.setOnClickListener(v -> {
            if (listener != null) {
                listener.onSlotClick(slot, position);
            }
        });
    }

    @Override
    public int getItemCount() {
        return slots.size();
    }

    static class SlotViewHolder extends RecyclerView.ViewHolder {
        LinearLayout layoutBg;
        ImageView ivCar;
        TextView tvSlotCode;
        TextView tvSlotStatus;

        public SlotViewHolder(@NonNull View itemView) {
            super(itemView);
            layoutBg = itemView.findViewById(R.id.layout_slot_bg);
            ivCar = itemView.findViewById(R.id.iv_car_status);
            tvSlotCode = itemView.findViewById(R.id.tv_slot_code);
            tvSlotStatus = itemView.findViewById(R.id.tv_slot_status);
        }
    }
}
