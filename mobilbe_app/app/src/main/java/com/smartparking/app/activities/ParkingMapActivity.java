package com.smartparking.app.activities;

import android.content.Intent;
import android.os.Bundle;
import android.view.View;
import android.widget.ImageView;
import android.widget.TextView;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.content.ContextCompat;
import androidx.recyclerview.widget.GridLayoutManager;
import androidx.recyclerview.widget.RecyclerView;
import com.google.android.material.bottomsheet.BottomSheetDialog;
import com.google.android.material.button.MaterialButton;
import com.smartparking.app.R;
import com.smartparking.app.adapters.ParkingSlotAdapter;
import com.smartparking.app.models.ApiResponse;
import com.smartparking.app.models.ParkingSlot;
import com.smartparking.app.network.ApiClient;
import com.smartparking.app.services.SocketService;
import java.util.ArrayList;
import java.util.List;
import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;
import com.smartparking.app.models.ParkingRate;
import com.smartparking.app.utils.FormatUtils;

public class ParkingMapActivity extends AppCompatActivity implements SocketService.OnSlotStatusChangeListener, SocketService.OnRatesUpdatedListener {

    private RecyclerView rvSlots;
    private ParkingSlotAdapter adapter;
    private TextView tvRateCar, tvRateBike, tvRateTruck, tvRatesUpdatedTime;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_parking_map);

        ImageView ivBack = findViewById(R.id.iv_map_back);
        rvSlots = findViewById(R.id.rv_map_slots);

        // Ánh xạ bảng giá
        tvRateCar = findViewById(R.id.tv_map_rate_car);
        tvRateBike = findViewById(R.id.tv_map_rate_bike);
        tvRateTruck = findViewById(R.id.tv_map_rate_truck);
        tvRatesUpdatedTime = findViewById(R.id.tv_map_rates_updated_time);

        ivBack.setOnClickListener(v -> finish());

        rvSlots.setLayoutManager(new GridLayoutManager(this, 3));
        adapter = new ParkingSlotAdapter(this, (slot, position) -> showSlotDetailDialog(slot));
        rvSlots.setAdapter(adapter);

        MaterialButton btnConfigRates = findViewById(R.id.btn_map_config_rates);
        boolean isAdmin = com.smartparking.app.utils.SessionManager.getInstance(this).isAdmin();
        if (btnConfigRates != null) {
            btnConfigRates.setVisibility(isAdmin ? View.VISIBLE : View.GONE);
            btnConfigRates.setOnClickListener(v ->
                    com.smartparking.app.utils.DialogUtils.showParkingRateConfigDialog(this, () -> {
                        loadSlots();
                        loadRates();
                    }));
        }

        SocketService.getInstance(this).addSlotListener(this);
        SocketService.getInstance(this).addRatesListener(this);
        loadSlots();
        loadRates();
    }

    @Override
    protected void onDestroy() {
        super.onDestroy();
        SocketService.getInstance(this).removeSlotListener(this);
        SocketService.getInstance(this).removeRatesListener(this);
    }

    private void loadRates() {
        ApiClient.getApiService(this).getParkingRates().enqueue(new Callback<ApiResponse<List<ParkingRate>>>() {
            @Override
            public void onResponse(Call<ApiResponse<List<ParkingRate>>> call, Response<ApiResponse<List<ParkingRate>>> response) {
                if (response.isSuccessful() && response.body() != null && response.body().getData() != null) {
                    List<ParkingRate> rates = response.body().getData();
                    for (ParkingRate r : rates) {
                        String type = r.getVehicleType();
                        String formatted = FormatUtils.formatCurrency(r.getPricePerHour());
                        if ("car".equalsIgnoreCase(type)) {
                            if (tvRateCar != null) tvRateCar.setText(formatted);
                        } else if ("motorbike".equalsIgnoreCase(type)) {
                            if (tvRateBike != null) tvRateBike.setText(formatted);
                        } else if ("truck".equalsIgnoreCase(type)) {
                            if (tvRateTruck != null) tvRateTruck.setText(formatted);
                        }
                    }
                    if (tvRatesUpdatedTime != null) {
                        tvRatesUpdatedTime.setText("Cập nhật thời gian thực");
                    }
                }
            }

            @Override
            public void onFailure(Call<ApiResponse<List<ParkingRate>>> call, Throwable t) {}
        });
    }

    @Override
    public void onRatesUpdated() {
        loadRates();
    }

    private void loadSlots() {
        ApiClient.getApiService(this).getAllSlots().enqueue(new Callback<ApiResponse<List<ParkingSlot>>>() {
            @Override
            public void onResponse(Call<ApiResponse<List<ParkingSlot>>> call, Response<ApiResponse<List<ParkingSlot>>> response) {
                if (response.isSuccessful() && response.body() != null && response.body().getData() != null) {
                    adapter.setSlots(response.body().getData());
                } else {
                    initFallback();
                }
            }

            @Override
            public void onFailure(Call<ApiResponse<List<ParkingSlot>>> call, Throwable t) {
                initFallback();
            }
        });
    }

    private void initFallback() {
        if (adapter.getItemCount() == 0) {
            List<ParkingSlot> demoList = new ArrayList<>();
            String[] codes = {"A01", "A02", "A03", "A04", "A05", "A06"};
            String[] statuses = {"FREE", "OCCUPIED", "FREE", "RESERVED", "OCCUPIED", "FREE"};
            for (int i = 0; i < codes.length; i++) {
                ParkingSlot s = new ParkingSlot();
                s.setId(i + 1);
                s.setSlotCode(codes[i]);
                s.setZone("Khu A");
                s.setStatus(statuses[i]);
                demoList.add(s);
            }
            adapter.setSlots(demoList);
        }
    }

    private void showSlotDetailDialog(ParkingSlot slot) {
        BottomSheetDialog dialog = new BottomSheetDialog(this);
        View sheetView = getLayoutInflater().inflate(R.layout.bottom_sheet_slot_detail, null);
        dialog.setContentView(sheetView);

        TextView tvCode = sheetView.findViewById(R.id.tv_sheet_slot_code);
        TextView tvZone = sheetView.findViewById(R.id.tv_sheet_zone);
        TextView tvStatus = sheetView.findViewById(R.id.tv_sheet_status);
        View layoutBookingInfo = sheetView.findViewById(R.id.layout_sheet_booking_info);
        TextView tvPlate = sheetView.findViewById(R.id.tv_sheet_plate);
        MaterialButton btnBook = sheetView.findViewById(R.id.btn_sheet_book_now);

        tvCode.setText(slot.getSlotCode());
        tvZone.setText("Khu vực: " + slot.getZone());

        String status = slot.getStatus().toUpperCase();
        if ("FREE".equalsIgnoreCase(status)) {
            tvStatus.setText("Trống");
            tvStatus.setBackgroundResource(R.drawable.bg_badge_free);
            tvStatus.setTextColor(ContextCompat.getColor(this, R.color.status_free));
            btnBook.setVisibility(View.VISIBLE);
            btnBook.setText("Đặt chỗ ngay");
            btnBook.setOnClickListener(v -> {
                dialog.dismiss();
                finish();
                // If main activity is behind, user will land on it or can switch
            });
        } else if ("OCCUPIED".equalsIgnoreCase(status)) {
            tvStatus.setText("Đang có xe");
            tvStatus.setBackgroundResource(R.drawable.bg_badge_occupied);
            tvStatus.setTextColor(ContextCompat.getColor(this, R.color.status_occupied));
            btnBook.setVisibility(View.GONE);
            if (slot.getBookingPlate() != null && !slot.getBookingPlate().isEmpty()) {
                layoutBookingInfo.setVisibility(View.VISIBLE);
                tvPlate.setText(slot.getBookingPlate());
            }
        } else if ("RESERVED".equalsIgnoreCase(status)) {
            tvStatus.setText("Đã đặt");
            tvStatus.setBackgroundResource(R.drawable.bg_badge_reserved);
            tvStatus.setTextColor(ContextCompat.getColor(this, R.color.status_reserved));
            btnBook.setVisibility(View.GONE);
            if (slot.getBookingPlate() != null && !slot.getBookingPlate().isEmpty()) {
                layoutBookingInfo.setVisibility(View.VISIBLE);
                tvPlate.setText(slot.getBookingPlate());
            }
        } else {
            tvStatus.setText("Bảo trì");
            tvStatus.setBackgroundResource(R.drawable.bg_badge_disabled);
            tvStatus.setTextColor(ContextCompat.getColor(this, R.color.status_disabled));
            btnBook.setVisibility(View.GONE);
        }

        dialog.show();
    }

    @Override
    public void onSlotStatusChanged(String slotCode, int slotId, String newStatus) {
        if (adapter != null) {
            adapter.updateSlotStatus(slotCode, newStatus);
        }
    }
}
