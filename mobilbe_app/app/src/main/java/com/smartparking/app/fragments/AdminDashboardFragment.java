package com.smartparking.app.fragments;

import android.os.Bundle;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.ImageView;
import android.widget.TextView;
import android.widget.Toast;
import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.fragment.app.Fragment;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;
import androidx.swiperefreshlayout.widget.SwipeRefreshLayout;
import com.google.android.material.button.MaterialButton;
import com.smartparking.app.R;
import com.smartparking.app.adapters.AdminActivityAdapter;
import com.smartparking.app.models.AdminDashboardStats;
import com.smartparking.app.models.ApiResponse;
import com.smartparking.app.network.ApiClient;
import com.smartparking.app.services.SocketService;
import com.smartparking.app.utils.FormatUtils;
import com.smartparking.app.utils.SessionManager;
import java.util.HashMap;
import java.util.Map;
import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;

public class AdminDashboardFragment extends Fragment {

    private SwipeRefreshLayout swipeRefresh;
    private TextView tvAdminGreeting;
    private TextView tvFreeSlots, tvOccupiedSlots, tvTodayRevenue, tvTodayEntries;
    private TextView tvSlotSub, tvReservedSub, tvMonthRevenue, tvActiveGuests;
    private TextView tvEmptyActivity;
    private TextView tvRateCar, tvRateBike, tvRateTruck;
    private MaterialButton btnConfigRates;
    private RecyclerView rvRecentActivity;
    private AdminActivityAdapter activityAdapter;

    private MaterialButton btnBarrierInOpen, btnBarrierInClose;
    private MaterialButton btnBarrierOutOpen, btnBarrierOutClose;
    private MaterialButton btnLightToggle, btnEmergency;
    private boolean isLightOn = false;

    @Nullable
    @Override
    public View onCreateView(@NonNull LayoutInflater inflater, @Nullable ViewGroup container, @Nullable Bundle savedInstanceState) {
        View v = inflater.inflate(R.layout.fragment_admin_dashboard, container, false);

        swipeRefresh = v.findViewById(R.id.swipe_refresh_dashboard);
        tvAdminGreeting = v.findViewById(R.id.tv_admin_greeting);
        tvFreeSlots = v.findViewById(R.id.tv_stat_free_slots);
        tvOccupiedSlots = v.findViewById(R.id.tv_stat_occupied_slots);
        tvTodayRevenue = v.findViewById(R.id.tv_stat_today_revenue);
        tvTodayEntries = v.findViewById(R.id.tv_stat_today_entries);
        tvSlotSub = v.findViewById(R.id.tv_stat_slot_sub);
        tvReservedSub = v.findViewById(R.id.tv_stat_reserved_sub);
        tvMonthRevenue = v.findViewById(R.id.tv_stat_month_revenue);
        tvActiveGuests = v.findViewById(R.id.tv_stat_active_guests);
        tvEmptyActivity = v.findViewById(R.id.tv_empty_activity);

        tvRateCar = v.findViewById(R.id.tv_dashboard_rate_car);
        tvRateBike = v.findViewById(R.id.tv_dashboard_rate_bike);
        tvRateTruck = v.findViewById(R.id.tv_dashboard_rate_truck);
        btnConfigRates = v.findViewById(R.id.btn_dashboard_config_rates);

        if (btnConfigRates != null) {
            btnConfigRates.setOnClickListener(view ->
                    com.smartparking.app.utils.DialogUtils.showParkingRateConfigDialog(requireContext(), this::loadRatesData));
        }

        View cvRates = v.findViewById(R.id.cv_admin_rates);
        if (cvRates != null) {
            cvRates.setOnClickListener(view ->
                    com.smartparking.app.utils.DialogUtils.showParkingRateConfigDialog(requireContext(), this::loadRatesData));
        }

        rvRecentActivity = v.findViewById(R.id.rv_admin_recent_activity);
        rvRecentActivity.setLayoutManager(new LinearLayoutManager(getContext()));
        activityAdapter = new AdminActivityAdapter();
        rvRecentActivity.setAdapter(activityAdapter);

        ImageView btnRefresh = v.findViewById(R.id.btn_refresh_dashboard);
        btnRefresh.setOnClickListener(view -> loadDashboardData());

        btnBarrierInOpen = v.findViewById(R.id.btn_barrier_in_open);
        btnBarrierInClose = v.findViewById(R.id.btn_barrier_in_close);
        btnBarrierOutOpen = v.findViewById(R.id.btn_barrier_out_open);
        btnBarrierOutClose = v.findViewById(R.id.btn_barrier_out_close);
        btnLightToggle = v.findViewById(R.id.btn_light_toggle);
        btnEmergency = v.findViewById(R.id.btn_emergency_open_all);

        // Hardware control listeners
        btnBarrierInOpen.setOnClickListener(view -> controlBarrier("IN", "OPEN"));
        btnBarrierInClose.setOnClickListener(view -> controlBarrier("IN", "CLOSE"));
        btnBarrierOutOpen.setOnClickListener(view -> controlBarrier("OUT", "OPEN"));
        btnBarrierOutClose.setOnClickListener(view -> controlBarrier("OUT", "CLOSE"));

        btnLightToggle.setOnClickListener(view -> {
            isLightOn = !isLightOn;
            controlLight(isLightOn ? "ON" : "OFF");
        });

        btnEmergency.setOnClickListener(view -> {
            controlBarrier("IN", "OPEN");
            controlBarrier("OUT", "OPEN");
            Toast.makeText(getContext(), "ĐÃ KÍCH HOẠT MỞ KHẨN CẤP TẤT CẢ BARRIER!", Toast.LENGTH_SHORT).show();
        });

        swipeRefresh.setOnRefreshListener(this::loadDashboardData);

        return v;
    }

    @Override
    public void onViewCreated(@NonNull View view, @Nullable Bundle savedInstanceState) {
        super.onViewCreated(view, savedInstanceState);
        String name = SessionManager.getInstance(requireContext()).getUserName();
        tvAdminGreeting.setText("Xin chào, " + name);
        loadDashboardData();
    }

    @Override
    public void onResume() {
        super.onResume();
        loadDashboardData();
    }

    private void loadDashboardData() {
        if (getContext() == null) return;
        swipeRefresh.setRefreshing(true);

        ApiClient.getApiService(requireContext()).getAdminDashboard().enqueue(new Callback<ApiResponse<AdminDashboardStats>>() {
            @Override
            public void onResponse(Call<ApiResponse<AdminDashboardStats>> call, Response<ApiResponse<AdminDashboardStats>> response) {
                if (isAdded()) swipeRefresh.setRefreshing(false);
                if (response.isSuccessful() && response.body() != null && response.body().isSuccess()) {
                    AdminDashboardStats data = response.body().getData();
                    if (data != null && isAdded()) {
                        bindStats(data);
                    }
                }
            }

            @Override
            public void onFailure(Call<ApiResponse<AdminDashboardStats>> call, Throwable t) {
                if (isAdded()) {
                    swipeRefresh.setRefreshing(false);
                    Toast.makeText(getContext(), "Không thể tải số liệu Dashboard", Toast.LENGTH_SHORT).show();
                }
            }
        });

        loadRatesData();
    }

    private void loadRatesData() {
        if (getContext() == null) return;
        ApiClient.getApiService(requireContext()).getParkingRates().enqueue(new Callback<ApiResponse<java.util.List<com.smartparking.app.models.ParkingRate>>>() {
            @Override
            public void onResponse(Call<ApiResponse<java.util.List<com.smartparking.app.models.ParkingRate>>> call,
                                   Response<ApiResponse<java.util.List<com.smartparking.app.models.ParkingRate>>> response) {
                if (response.isSuccessful() && response.body() != null && response.body().getData() != null && isAdded()) {
                    for (com.smartparking.app.models.ParkingRate r : response.body().getData()) {
                        String priceStr = FormatUtils.formatCurrency(r.getPricePerHour());
                        if ("CAR".equalsIgnoreCase(r.getVehicleType()) && tvRateCar != null) {
                            tvRateCar.setText(priceStr);
                        } else if ("MOTORBIKE".equalsIgnoreCase(r.getVehicleType()) && tvRateBike != null) {
                            tvRateBike.setText(priceStr);
                        } else if ("TRUCK".equalsIgnoreCase(r.getVehicleType()) && tvRateTruck != null) {
                            tvRateTruck.setText(priceStr);
                        }
                    }
                }
            }

            @Override
            public void onFailure(Call<ApiResponse<java.util.List<com.smartparking.app.models.ParkingRate>>> call, Throwable t) {}
        });
    }

    private void bindStats(AdminDashboardStats stats) {
        tvFreeSlots.setText(stats.getFreeSlots() + " / " + stats.getTotalSlots());
        tvSlotSub.setText("Tổng số chỗ: " + stats.getTotalSlots());

        tvOccupiedSlots.setText(String.valueOf(stats.getOccupiedSlots()));
        tvReservedSub.setText("Đã đặt trước: " + stats.getReservedSlots());

        tvTodayRevenue.setText(FormatUtils.formatCurrency(stats.getTodayRevenue()));
        tvMonthRevenue.setText("Tháng này: " + FormatUtils.formatCurrency(stats.getMonthRevenue()));

        tvTodayEntries.setText(stats.getTodayEntries() + " lượt");
        tvActiveGuests.setText("Khách vãng lai: " + stats.getActiveGuests());

        if (stats.getRecentActivity() != null && !stats.getRecentActivity().isEmpty()) {
            activityAdapter.setItems(stats.getRecentActivity());
            tvEmptyActivity.setVisibility(View.GONE);
            rvRecentActivity.setVisibility(View.VISIBLE);
        } else {
            activityAdapter.setItems(null);
            tvEmptyActivity.setVisibility(View.VISIBLE);
            rvRecentActivity.setVisibility(View.GONE);
        }
    }

    private void controlBarrier(String direction, String action) {
        if (getContext() == null) return;
        Map<String, String> body = new HashMap<>();
        body.put("direction", direction);
        body.put("action", action);

        ApiClient.getApiService(requireContext()).controlBarrier(body).enqueue(new Callback<ApiResponse<Map<String, Object>>>() {
            @Override
            public void onResponse(Call<ApiResponse<Map<String, Object>>> call, Response<ApiResponse<Map<String, Object>>> response) {
                if (isAdded()) {
                    String msg = response.body() != null && response.body().getMessage() != null
                            ? response.body().getMessage()
                            : ("Đã gửi lệnh " + action + " Barrier " + direction);
                    Toast.makeText(getContext(), msg, Toast.LENGTH_SHORT).show();
                }
            }

            @Override
            public void onFailure(Call<ApiResponse<Map<String, Object>>> call, Throwable t) {
                if (isAdded()) {
                    Toast.makeText(getContext(), "Lỗi gửi lệnh Barrier: " + t.getMessage(), Toast.LENGTH_SHORT).show();
                }
            }
        });
    }

    private void controlLight(String action) {
        if (getContext() == null) return;
        Map<String, String> body = new HashMap<>();
        body.put("action", action);

        ApiClient.getApiService(requireContext()).controlLight(body).enqueue(new Callback<ApiResponse<Map<String, Object>>>() {
            @Override
            public void onResponse(Call<ApiResponse<Map<String, Object>>> call, Response<ApiResponse<Map<String, Object>>> response) {
                if (isAdded()) {
                    btnLightToggle.setText("ON".equals(action) ? "Tắt Đèn Bãi" : "Bật Đèn Bãi");
                    Toast.makeText(getContext(), "Đã " + ("ON".equals(action) ? "bật" : "tắt") + " đèn bãi xe", Toast.LENGTH_SHORT).show();
                }
            }

            @Override
            public void onFailure(Call<ApiResponse<Map<String, Object>>> call, Throwable t) {
                if (isAdded()) {
                    Toast.makeText(getContext(), "Lỗi điều khiển đèn: " + t.getMessage(), Toast.LENGTH_SHORT).show();
                }
            }
        });
    }
}
