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
import com.smartparking.app.models.RfidCard;
import java.util.ArrayList;
import java.util.List;

public class AdminRfidAdapter extends RecyclerView.Adapter<AdminRfidAdapter.ViewHolder> {

    public interface RfidActionListener {
        void onToggleRfidStatus(RfidCard card);
    }

    private final List<RfidCard> cards = new ArrayList<>();
    private final RfidActionListener listener;

    public AdminRfidAdapter(RfidActionListener listener) {
        this.listener = listener;
    }

    public void setCards(List<RfidCard> newCards) {
        cards.clear();
        if (newCards != null) {
            cards.addAll(newCards);
        }
        notifyDataSetChanged();
    }

    @NonNull
    @Override
    public ViewHolder onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
        View view = LayoutInflater.from(parent.getContext()).inflate(R.layout.item_admin_rfid, parent, false);
        return new ViewHolder(view);
    }

    @Override
    public void onBindViewHolder(@NonNull ViewHolder holder, int position) {
        RfidCard card = cards.get(position);
        Context ctx = holder.itemView.getContext();

        holder.tvUid.setText("UID: " + card.getUid());
        holder.tvPlate.setText("Xe: " + card.getPlateNumber());
        holder.tvOwner.setText("Chủ xe: " + card.getOwnerName());

        boolean isActive = "ACTIVE".equalsIgnoreCase(card.getStatus());
        if (isActive) {
            holder.tvStatus.setText("HOẠT ĐỘNG");
            holder.tvStatus.setBackgroundResource(R.drawable.bg_badge_free);
            holder.tvStatus.setTextColor(ContextCompat.getColor(ctx, R.color.status_free));
            holder.btnToggle.setText("Khóa thẻ");
            holder.btnToggle.setTextColor(ContextCompat.getColor(ctx, R.color.status_occupied));
        } else {
            holder.tvStatus.setText("BỊ KHÓA");
            holder.tvStatus.setBackgroundResource(R.drawable.bg_badge_occupied);
            holder.tvStatus.setTextColor(ContextCompat.getColor(ctx, R.color.status_occupied));
            holder.btnToggle.setText("Mở khóa");
            holder.btnToggle.setTextColor(ContextCompat.getColor(ctx, R.color.status_free));
        }

        holder.btnToggle.setOnClickListener(v -> {
            if (listener != null) listener.onToggleRfidStatus(card);
        });
    }

    @Override
    public int getItemCount() {
        return cards.size();
    }

    static class ViewHolder extends RecyclerView.ViewHolder {
        TextView tvUid, tvPlate, tvOwner, tvStatus;
        MaterialButton btnToggle;

        ViewHolder(@NonNull View itemView) {
            super(itemView);
            tvUid = itemView.findViewById(R.id.tv_rfid_uid);
            tvPlate = itemView.findViewById(R.id.tv_rfid_plate);
            tvOwner = itemView.findViewById(R.id.tv_rfid_owner);
            tvStatus = itemView.findViewById(R.id.tv_rfid_status);
            btnToggle = itemView.findViewById(R.id.btn_toggle_rfid);
        }
    }
}
