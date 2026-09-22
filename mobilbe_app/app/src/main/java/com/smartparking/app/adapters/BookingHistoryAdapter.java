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
import com.smartparking.app.models.Booking;
import com.smartparking.app.utils.FormatUtils;
import java.util.ArrayList;
import java.util.List;

public class BookingHistoryAdapter extends RecyclerView.Adapter<BookingHistoryAdapter.ViewHolder> {

    public interface OnBookingClickListener {
        void onBookingClick(Booking booking);
    }

    private final Context context;
    private final List<Booking> bookings = new ArrayList<>();
    private final OnBookingClickListener listener;

    public BookingHistoryAdapter(Context context, OnBookingClickListener listener) {
        this.context = context;
        this.listener = listener;
    }

    public void setBookings(List<Booking> list) {
        this.bookings.clear();
        if (list != null) {
            this.bookings.addAll(list);
        }
        notifyDataSetChanged();
    }

    @NonNull
    @Override
    public ViewHolder onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
        View view = LayoutInflater.from(context).inflate(R.layout.item_booking_history, parent, false);
        return new ViewHolder(view);
    }

    @Override
    public void onBindViewHolder(@NonNull ViewHolder holder, int position) {
        Booking booking = bookings.get(position);

        holder.tvBookingCode.setText(booking.getFormattedBookingCode());

        String slotText = (booking.getSlotCode().isEmpty() ? "Slot" : booking.getSlotCode()) + " · " + booking.getZone();
        holder.tvSlotZone.setText(slotText);

        String timeText = FormatUtils.formatDate(booking.getStartTime()) + " · " +
                FormatUtils.formatTime(booking.getStartTime()) + " - " +
                FormatUtils.formatTime(booking.getEndTime());
        holder.tvTime.setText(timeText);

        holder.tvPrice.setText(FormatUtils.formatCurrency(booking.getTotalPrice()));

        // Status badge styling
        String status = booking.getStatus().toUpperCase();
        switch (status) {
            case "ACTIVE":
            case "CONFIRMED":
                holder.tvStatus.setText("Đã xác nhận");
                holder.tvStatus.setBackgroundResource(R.drawable.bg_badge_free);
                holder.tvStatus.setTextColor(ContextCompat.getColor(context, R.color.status_free));
                break;
            case "COMPLETED":
                holder.tvStatus.setText("Đã sử dụng");
                holder.tvStatus.setBackgroundResource(R.drawable.bg_badge_reserved);
                holder.tvStatus.setTextColor(ContextCompat.getColor(context, R.color.status_reserved));
                break;
            case "CANCELLED":
                holder.tvStatus.setText("Đã hủy");
                holder.tvStatus.setBackgroundResource(R.drawable.bg_badge_occupied);
                holder.tvStatus.setTextColor(ContextCompat.getColor(context, R.color.status_occupied));
                break;
            case "EXPIRED":
                holder.tvStatus.setText("Hết hạn");
                holder.tvStatus.setBackgroundResource(R.drawable.bg_badge_disabled);
                holder.tvStatus.setTextColor(ContextCompat.getColor(context, R.color.status_disabled));
                break;
            default:
                holder.tvStatus.setText(status);
                holder.tvStatus.setBackgroundResource(R.drawable.bg_badge_blue);
                holder.tvStatus.setTextColor(ContextCompat.getColor(context, R.color.primary));
                break;
        }

        holder.itemView.setOnClickListener(v -> {
            if (listener != null) {
                listener.onBookingClick(booking);
            }
        });
    }

    @Override
    public int getItemCount() {
        return bookings.size();
    }

    static class ViewHolder extends RecyclerView.ViewHolder {
        TextView tvBookingCode;
        TextView tvStatus;
        TextView tvSlotZone;
        TextView tvTime;
        TextView tvPrice;

        public ViewHolder(@NonNull View itemView) {
            super(itemView);
            tvBookingCode = itemView.findViewById(R.id.tv_booking_code);
            tvStatus = itemView.findViewById(R.id.tv_booking_status);
            tvSlotZone = itemView.findViewById(R.id.tv_booking_slot_zone);
            tvTime = itemView.findViewById(R.id.tv_booking_time);
            tvPrice = itemView.findViewById(R.id.tv_booking_price);
        }
    }
}
