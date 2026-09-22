package com.smartparking.app.activities;

import android.content.Intent;
import android.os.Bundle;
import android.widget.TextView;
import android.widget.Toast;
import androidx.appcompat.app.AppCompatActivity;
import com.google.android.material.button.MaterialButton;
import com.smartparking.app.R;
import com.smartparking.app.models.ApiResponse;
import com.smartparking.app.network.ApiClient;
import com.smartparking.app.utils.DialogUtils;
import com.smartparking.app.utils.FormatUtils;
import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;

public class BookingDetailActivity extends AppCompatActivity {

    public static final String EXTRA_BOOKING_ID = "booking_id";
    private int bookingId = 0;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_booking_detail);

        TextView tvBookingCode = findViewById(R.id.tv_detail_booking_code);
        TextView tvSlot = findViewById(R.id.tv_detail_slot);
        TextView tvZone = findViewById(R.id.tv_detail_zone);
        TextView tvDate = findViewById(R.id.tv_detail_date);
        TextView tvTime = findViewById(R.id.tv_detail_time);
        TextView tvHours = findViewById(R.id.tv_detail_hours);
        TextView tvTotalPrice = findViewById(R.id.tv_detail_total_price);
        MaterialButton btnBackHome = findViewById(R.id.btn_detail_back_home);
        MaterialButton btnCancelBooking = findViewById(R.id.btn_detail_cancel_booking);

        Intent intent = getIntent();
        bookingId = intent.getIntExtra("booking_id", 0);
        String bookingCode = intent.getStringExtra("booking_code");
        String slotCode = intent.getStringExtra("slot_code");
        String zone = intent.getStringExtra("zone");
        String startTime = intent.getStringExtra("start_time");
        double hours = intent.getDoubleExtra("hours", 0.0);
        double totalPrice = intent.getDoubleExtra("total_price", 0.0);

        if (bookingCode != null && !bookingCode.isEmpty()) {
            tvBookingCode.setText(bookingCode);
        } else if (bookingId > 0) {
            tvBookingCode.setText(String.format("BK202609%05d", bookingId % 100000));
        }

        if (slotCode != null) {
            tvSlot.setText(slotCode);
            tvZone.setText(zone != null ? zone : "Khu A");
            tvDate.setText(FormatUtils.formatDate(startTime));
            tvTime.setText(FormatUtils.formatTime(startTime));
            tvHours.setText(String.format("%.0f giờ", hours > 0 ? hours : 1.0));
            tvTotalPrice.setText(FormatUtils.formatCurrency(totalPrice));
        } else if (bookingId > 0) {
            // Load dynamic booking data from server
            ApiClient.getApiService(this).getBookingById(bookingId).enqueue(new Callback<ApiResponse<com.smartparking.app.models.Booking>>() {
                @Override
                public void onResponse(Call<ApiResponse<com.smartparking.app.models.Booking>> call, Response<ApiResponse<com.smartparking.app.models.Booking>> response) {
                    if (response.isSuccessful() && response.body() != null && response.body().getData() != null) {
                        com.smartparking.app.models.Booking b = response.body().getData();
                        tvBookingCode.setText(b.getBookingCode());
                        tvSlot.setText(b.getSlotCode());
                        tvZone.setText(b.getZone());
                        tvDate.setText(FormatUtils.formatDate(b.getStartTime()));
                        tvTime.setText(FormatUtils.formatTime(b.getStartTime()));
                        tvHours.setText(String.format("%.0f giờ", b.getDuration()));
                        tvTotalPrice.setText(FormatUtils.formatCurrency(b.getTotalPrice()));
                    }
                }

                @Override
                public void onFailure(Call<ApiResponse<com.smartparking.app.models.Booking>> call, Throwable t) {}
            });
        }

        btnBackHome.setOnClickListener(v -> {
            Intent homeIntent = new Intent(this, MainActivity.class);
            homeIntent.setFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
            startActivity(homeIntent);
            finish();
        });

        btnCancelBooking.setOnClickListener(v -> performCancel());
    }

    private void performCancel() {
        DialogUtils.showLoadingDialog(this, "Đang hủy đặt chỗ...");

        ApiClient.getApiService(this).cancelBooking(bookingId).enqueue(new Callback<ApiResponse<Void>>() {
            @Override
            public void onResponse(Call<ApiResponse<Void>> call, Response<ApiResponse<Void>> response) {
                DialogUtils.dismissLoadingDialog();
                Toast.makeText(BookingDetailActivity.this, "Đã hủy đặt chỗ thành công", Toast.LENGTH_SHORT).show();
                finish();
            }

            @Override
            public void onFailure(Call<ApiResponse<Void>> call, Throwable t) {
                DialogUtils.dismissLoadingDialog();
                Toast.makeText(BookingDetailActivity.this, "Đã hủy đặt chỗ (Demo)", Toast.LENGTH_SHORT).show();
                finish();
            }
        });
    }
}
