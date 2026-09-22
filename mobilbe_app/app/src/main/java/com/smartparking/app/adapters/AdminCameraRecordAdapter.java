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
import com.bumptech.glide.Glide;
import com.smartparking.app.R;
import com.smartparking.app.models.CameraRecord;
import com.smartparking.app.network.ApiConfig;
import java.util.ArrayList;
import java.util.List;

public class AdminCameraRecordAdapter extends RecyclerView.Adapter<AdminCameraRecordAdapter.ViewHolder> {

    private final List<CameraRecord> records = new ArrayList<>();

    public void setRecords(List<CameraRecord> newRecords) {
        records.clear();
        if (newRecords != null) {
            records.addAll(newRecords);
        }
        notifyDataSetChanged();
    }

    @NonNull
    @Override
    public ViewHolder onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
        View view = LayoutInflater.from(parent.getContext()).inflate(R.layout.item_admin_camera_record, parent, false);
        return new ViewHolder(view);
    }

    @Override
    public void onBindViewHolder(@NonNull ViewHolder holder, int position) {
        CameraRecord record = records.get(position);
        Context ctx = holder.itemView.getContext();

        holder.tvPlateNumber.setText(record.getPlateNumber());
        holder.tvConfidence.setText("Độ tin cậy: " + record.getConfidencePercent() + "%");
        holder.tvStatus.setText(record.getStatus());
        holder.tvTimestamp.setText(record.getTimestamp());

        boolean isEntry = "IN".equalsIgnoreCase(record.getDirection());
        holder.tvDirection.setText(isEntry ? "VÀO" : "RA");
        holder.tvDirection.setBackgroundResource(isEntry ? R.drawable.bg_badge_blue : R.drawable.bg_badge_reserved);
        holder.tvDirection.setTextColor(ContextCompat.getColor(ctx, isEntry ? R.color.primary : R.color.status_reserved));

        // Load plate image via Glide
        String imgPath = record.getImagePath();
        if (imgPath != null && !imgPath.isEmpty()) {
            String fullUrl = imgPath;
            if (!imgPath.startsWith("http://") && !imgPath.startsWith("https://")) {
                String baseUrl = ApiConfig.getSocketUrl(ctx);
                if (baseUrl.endsWith("/") && imgPath.startsWith("/")) {
                    fullUrl = baseUrl + imgPath.substring(1);
                } else if (!baseUrl.endsWith("/") && !imgPath.startsWith("/")) {
                    fullUrl = baseUrl + "/" + imgPath;
                } else {
                    fullUrl = baseUrl + imgPath;
                }
            }
            Glide.with(ctx)
                    .load(fullUrl)
                    .placeholder(R.drawable.ic_car)
                    .error(R.drawable.ic_car)
                    .centerCrop()
                    .into(holder.ivThumb);
        } else {
            holder.ivThumb.setImageResource(R.drawable.ic_car);
        }
    }

    @Override
    public int getItemCount() {
        return records.size();
    }

    static class ViewHolder extends RecyclerView.ViewHolder {
        ImageView ivThumb;
        TextView tvDirection, tvPlateNumber, tvConfidence, tvStatus, tvTimestamp;

        ViewHolder(@NonNull View itemView) {
            super(itemView);
            ivThumb = itemView.findViewById(R.id.iv_camera_thumb);
            tvDirection = itemView.findViewById(R.id.tv_camera_direction);
            tvPlateNumber = itemView.findViewById(R.id.tv_plate_number);
            tvConfidence = itemView.findViewById(R.id.tv_confidence);
            tvStatus = itemView.findViewById(R.id.tv_camera_status);
            tvTimestamp = itemView.findViewById(R.id.tv_timestamp);
        }
    }
}
