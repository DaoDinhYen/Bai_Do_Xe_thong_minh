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
import com.smartparking.app.models.Transaction;
import com.smartparking.app.utils.FormatUtils;
import java.util.ArrayList;
import java.util.List;

public class TransactionAdapter extends RecyclerView.Adapter<TransactionAdapter.ViewHolder> {

    private final Context context;
    private final List<Transaction> list = new ArrayList<>();

    public TransactionAdapter(Context context) {
        this.context = context;
    }

    public void setList(List<Transaction> items) {
        this.list.clear();
        if (items != null) {
            this.list.addAll(items);
        }
        notifyDataSetChanged();
    }

    @NonNull
    @Override
    public ViewHolder onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
        View view = LayoutInflater.from(context).inflate(R.layout.item_transaction, parent, false);
        return new ViewHolder(view);
    }

    @Override
    public void onBindViewHolder(@NonNull ViewHolder holder, int position) {
        Transaction item = list.get(position);

        holder.tvTitle.setText(item.getTypeDisplayName());
        holder.tvDate.setText(FormatUtils.formatDateTime(item.getCreatedAt()));

        boolean isPositive = item.isPositive();
        holder.tvAmount.setText(FormatUtils.formatCurrencyWithSign(item.getAmount(), isPositive));

        if (isPositive) {
            holder.tvAmount.setTextColor(ContextCompat.getColor(context, R.color.status_free));
            holder.layoutIconBg.setBackgroundResource(R.drawable.bg_badge_free);
            holder.ivIcon.setImageResource(R.drawable.ic_nav_wallet);
            holder.ivIcon.setColorFilter(ContextCompat.getColor(context, R.color.status_free));
        } else {
            holder.tvAmount.setTextColor(ContextCompat.getColor(context, R.color.status_occupied));
            holder.layoutIconBg.setBackgroundResource(R.drawable.bg_badge_occupied);
            holder.ivIcon.setImageResource(R.drawable.ic_nav_booking);
            holder.ivIcon.setColorFilter(ContextCompat.getColor(context, R.color.status_occupied));
        }
    }

    @Override
    public int getItemCount() {
        return list.size();
    }

    static class ViewHolder extends RecyclerView.ViewHolder {
        FrameLayout layoutIconBg;
        ImageView ivIcon;
        TextView tvTitle;
        TextView tvDate;
        TextView tvAmount;

        public ViewHolder(@NonNull View itemView) {
            super(itemView);
            layoutIconBg = itemView.findViewById(R.id.layout_icon_bg);
            ivIcon = itemView.findViewById(R.id.iv_trans_icon);
            tvTitle = itemView.findViewById(R.id.tv_trans_title);
            tvDate = itemView.findViewById(R.id.tv_trans_date);
            tvAmount = itemView.findViewById(R.id.tv_trans_amount);
        }
    }
}
