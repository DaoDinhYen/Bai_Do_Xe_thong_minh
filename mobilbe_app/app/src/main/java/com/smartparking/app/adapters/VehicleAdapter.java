package com.smartparking.app.adapters;

import android.content.Context;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.ImageView;
import android.widget.TextView;
import androidx.annotation.NonNull;
import androidx.core.content.ContextCompat;
import androidx.recyclerview.widget.RecyclerView;
import com.smartparking.app.R;
import com.smartparking.app.models.Vehicle;
import java.util.ArrayList;
import java.util.List;

public class VehicleAdapter extends RecyclerView.Adapter<VehicleAdapter.ViewHolder> {

    public interface OnVehicleClickListener {
        void onVehicleClick(Vehicle vehicle);
    }

    private final Context context;
    private final List<Vehicle> list = new ArrayList<>();
    private final OnVehicleClickListener listener;

    public VehicleAdapter(Context context, OnVehicleClickListener listener) {
        this.context = context;
        this.listener = listener;
    }

    public void setList(List<Vehicle> items) {
        this.list.clear();
        if (items != null) {
            this.list.addAll(items);
        }
        notifyDataSetChanged();
    }

    @NonNull
    @Override
    public ViewHolder onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
        View view = LayoutInflater.from(context).inflate(R.layout.item_vehicle, parent, false);
        return new ViewHolder(view);
    }

    @Override
    public void onBindViewHolder(@NonNull ViewHolder holder, int position) {
        Vehicle vehicle = list.get(position);

        holder.tvPlate.setText(vehicle.getPlateNumber());

        String info = vehicle.getDisplayType();
        if (vehicle.isDefault()) {
            info += " · Mặc định";
        }
        if (vehicle.getVehicleName() != null && !vehicle.getVehicleName().isEmpty()) {
            info += " (" + vehicle.getVehicleName() + ")";
        }
        holder.tvInfo.setText(info);

        if ("ACTIVE".equalsIgnoreCase(vehicle.getStatus())) {
            holder.tvStatus.setText("Đang hoạt động");
            holder.tvStatus.setBackgroundResource(R.drawable.bg_badge_free);
            holder.tvStatus.setTextColor(ContextCompat.getColor(context, R.color.status_free));
        } else {
            holder.tvStatus.setText("Tạm dừng");
            holder.tvStatus.setBackgroundResource(R.drawable.bg_badge_disabled);
            holder.tvStatus.setTextColor(ContextCompat.getColor(context, R.color.status_disabled));
        }

        holder.itemView.setOnClickListener(v -> {
            if (listener != null) {
                listener.onVehicleClick(vehicle);
            }
        });
    }

    @Override
    public int getItemCount() {
        return list.size();
    }

    static class ViewHolder extends RecyclerView.ViewHolder {
        ImageView ivIcon;
        TextView tvPlate;
        TextView tvInfo;
        TextView tvStatus;

        public ViewHolder(@NonNull View itemView) {
            super(itemView);
            ivIcon = itemView.findViewById(R.id.iv_vehicle_icon);
            tvPlate = itemView.findViewById(R.id.tv_vehicle_plate);
            tvInfo = itemView.findViewById(R.id.tv_vehicle_info);
            tvStatus = itemView.findViewById(R.id.tv_vehicle_status);
        }
    }
}
