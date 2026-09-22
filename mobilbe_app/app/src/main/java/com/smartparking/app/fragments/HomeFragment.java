package com.smartparking.app.fragments;

import android.content.Intent;
import android.os.Bundle;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.FrameLayout;
import android.widget.TextView;
import android.widget.Toast;
import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.core.content.ContextCompat;
import androidx.fragment.app.Fragment;
import androidx.recyclerview.widget.GridLayoutManager;
import androidx.recyclerview.widget.RecyclerView;
import androidx.swiperefreshlayout.widget.SwipeRefreshLayout;
import com.google.android.material.bottomsheet.BottomSheetDialog;
import com.google.android.material.button.MaterialButton;
import com.smartparking.app.R;
import com.smartparking.app.activities.MainActivity;
import com.smartparking.app.activities.NotificationActivity;
import com.smartparking.app.activities.ParkingMapActivity;
import com.smartparking.app.adapters.ParkingSlotAdapter;
import com.smartparking.app.models.*;
import com.smartparking.app.network.ApiClient;
import com.smartparking.app.services.SocketService;
import com.smartparking.app.utils.FormatUtils;
import com.smartparking.app.utils.SessionManager;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;

public class HomeFragment extends Fragment implements SocketService.OnSlotStatusChangeListener, SocketService.OnNotificationListener, SocketService.OnRatesUpdatedListener {

    private SwipeRefreshLayout swipeRefresh;
    private TextView tvUserName, tvWalletBalance;
    private TextView tvStatTotal, tvStatFree, tvStatOccupied, tvStatReserved;
    private TextView tvNotifBadge, tvSystemStatusLabel;
    private TextView tvRateCar, tvRateBike, tvRateTruck, tvRatesUpdatedTime;
    private RecyclerView rvSlots;
    private ParkingSlotAdapter slotAdapter;

    private int unreadNotifCount = 0;

    @Nullable
    @Override
    public View onCreateView(@NonNull LayoutInflater inflater, @Nullable ViewGroup container, @Nullable Bundle savedInstanceState) {
        return inflater.inflate(R.layout.fragment_home, container, false);
    }

    @Override
    public void onViewCreated(@NonNull View view, @Nullable Bundle savedInstanceState) {
        super.onViewCreated(view, savedInstanceState);

        swipeRefresh = view.findViewById(R.id.swipe_refresh_home);
        tvUserName = view.findViewById(R.id.tv_home_user_name);
        tvWalletBalance = view.findViewById(R.id.tv_home_wallet_balance);
        tvStatTotal = view.findViewById(R.id.tv_stat_total);
        tvStatFree = view.findViewById(R.id.tv_stat_free);
        tvStatOccupied = view.findViewById(R.id.tv_stat_occupied);
        tvStatReserved = view.findViewById(R.id.tv_stat_reserved);
        tvNotifBadge = view.findViewById(R.id.tv_home_notif_badge);
        tvSystemStatusLabel = view.findViewById(R.id.tv_system_status_label);
        rvSlots = view.findViewById(R.id.rv_home_slots);

        // Ánh xạ bảng giá hiển thị trên sơ đồ bãi đỗ xe
        tvRateCar = view.findViewById(R.id.tv_home_rate_car);
        tvRateBike = view.findViewById(R.id.tv_home_rate_bike);
        tvRateTruck = view.findViewById(R.id.tv_home_rate_truck);
        tvRatesUpdatedTime = view.findViewById(R.id.tv_home_rates_updated_time);

        FrameLayout btnNotification = view.findViewById(R.id.btn_home_notification);
        FrameLayout btnAvatar = view.findViewById(R.id.btn_home_avatar);
        MaterialButton btnTopUp = view.findViewById(R.id.btn_home_topup);
        TextView tvSeeAllMap = view.findViewById(R.id.tv_see_all_map);

        // Setup RecyclerView with 3 columns (A01 A02 A03 / A04 A05 A06)
        rvSlots.setLayoutManager(new GridLayoutManager(requireContext(), 3));
        slotAdapter = new ParkingSlotAdapter(requireContext(), (slot, position) -> showSlotDetailSheet(slot));
        rvSlots.setAdapter(slotAdapter);

        // Header Actions
        btnNotification.setOnClickListener(v -> {
            Intent intent = new Intent(requireContext(), NotificationActivity.class);
            startActivity(intent);
        });

        btnAvatar.setOnClickListener(v -> {
            if (getActivity() instanceof MainActivity) {
                ((MainActivity) getActivity()).switchTab(R.id.nav_profile);
            }
        });

        btnTopUp.setOnClickListener(v -> {
            if (getActivity() instanceof MainActivity) {
                ((MainActivity) getActivity()).switchTab(R.id.nav_wallet);
            }
        });

        tvSeeAllMap.setOnClickListener(v -> {
            Intent intent = new Intent(requireContext(), ParkingMapActivity.class);
            startActivity(intent);
        });

        MaterialButton btnConfigRates = view.findViewById(R.id.btn_home_config_rates);
        boolean isAdmin = SessionManager.getInstance(requireContext()).isAdmin();
        if (btnConfigRates != null) {
            btnConfigRates.setVisibility(isAdmin ? View.VISIBLE : View.GONE);
            btnConfigRates.setOnClickListener(v ->
                    com.smartparking.app.utils.DialogUtils.showParkingRateConfigDialog(requireContext(), this::loadData));
        }

        swipeRefresh.setOnRefreshListener(this::loadData);

        // Socket listeners
        SocketService.getInstance(requireContext()).addSlotListener(this);
        SocketService.getInstance(requireContext()).addNotificationListener(this);
        SocketService.getInstance(requireContext()).addRatesListener(this);

        updateUserInfo();
        loadData();
    }

    @Override
    public void onResume() {
        super.onResume();
        updateUserInfo();
        loadUnreadCount();
    }

    @Override
    public void onHiddenChanged(boolean hidden) {
        super.onHiddenChanged(hidden);
        if (!hidden) {
            updateUserInfo();
            loadData();
            loadUnreadCount();
        }
    }

    @Override
    public void onDestroyView() {
        super.onDestroyView();
        SocketService.getInstance(requireContext()).removeSlotListener(this);
        SocketService.getInstance(requireContext()).removeNotificationListener(this);
        SocketService.getInstance(requireContext()).removeRatesListener(this);
    }

    private void updateUserInfo() {
        User user = SessionManager.getInstance(requireContext()).getUser();
        if (user != null) {
            tvUserName.setText(user.getName());
            tvWalletBalance.setText(FormatUtils.formatCurrency(user.getWalletBalance()));
        }
    }

    private void loadData() {
        swipeRefresh.setRefreshing(true);

        // 1. Load wallet balance
        ApiClient.getApiService(requireContext()).getWallet().enqueue(new Callback<ApiResponse<WalletResponse>>() {
            @Override
            public void onResponse(Call<ApiResponse<WalletResponse>> call, Response<ApiResponse<WalletResponse>> response) {
                if (response.isSuccessful() && response.body() != null && response.body().getData() != null) {
                    double balance = response.body().getData().getWalletBalance();
                    SessionManager.getInstance(requireContext()).updateBalance(balance);
                    tvWalletBalance.setText(FormatUtils.formatCurrency(balance));
                }
            }

            @Override
            public void onFailure(Call<ApiResponse<WalletResponse>> call, Throwable t) {}
        });

        // 2. Load slots summary
        ApiClient.getApiService(requireContext()).getSlotSummary().enqueue(new Callback<ApiResponse<SlotSummary>>() {
            @Override
            public void onResponse(Call<ApiResponse<SlotSummary>> call, Response<ApiResponse<SlotSummary>> response) {
                if (response.isSuccessful() && response.body() != null && response.body().getData() != null) {
                    SlotSummary s = response.body().getData();
                    tvStatTotal.setText(String.valueOf(s.getTotal()));
                    tvStatFree.setText(String.valueOf(s.getFree()));
                    tvStatOccupied.setText(String.valueOf(s.getOccupied()));
                    tvStatReserved.setText(String.valueOf(s.getReserved()));
                }
            }

            @Override
            public void onFailure(Call<ApiResponse<SlotSummary>> call, Throwable t) {}
        });

        // 3. Load slots list
        ApiClient.getApiService(requireContext()).getAllSlots().enqueue(new Callback<ApiResponse<List<ParkingSlot>>>() {
            @Override
            public void onResponse(Call<ApiResponse<List<ParkingSlot>>> call, Response<ApiResponse<List<ParkingSlot>>> response) {
                swipeRefresh.setRefreshing(false);
                if (response.isSuccessful() && response.body() != null && response.body().getData() != null) {
                    List<ParkingSlot> list = response.body().getData();
                    slotAdapter.setSlots(list);
                    updateStatsFromSlots(list);
                }
            }

            @Override
            public void onFailure(Call<ApiResponse<List<ParkingSlot>>> call, Throwable t) {
                swipeRefresh.setRefreshing(false);
                // If offline / demo fallback:
                if (slotAdapter.getItemCount() == 0) {
                    initFallbackSlots();
                }
            }
        });

        // 4. Load parking rates
        loadRatesData();

        loadUnreadCount();
    }

    private void loadUnreadCount() {
        ApiClient.getApiService(requireContext()).getUnreadNotificationCount().enqueue(new Callback<ApiResponse<Map<String, Object>>>() {
            @Override
            public void onResponse(Call<ApiResponse<Map<String, Object>>> call, Response<ApiResponse<Map<String, Object>>> response) {
                if (response.isSuccessful() && response.body() != null && response.body().getData() != null) {
                    Object countObj = response.body().getData().get("count");
                    if (countObj instanceof Number) {
                        unreadNotifCount = ((Number) countObj).intValue();
                        updateBadge();
                    }
                }
            }

            @Override
            public void onFailure(Call<ApiResponse<Map<String, Object>>> call, Throwable t) {}
        });
    }

    private void updateBadge() {
        if (unreadNotifCount > 0) {
            tvNotifBadge.setVisibility(View.VISIBLE);
            tvNotifBadge.setText(String.valueOf(unreadNotifCount));
        } else {
            tvNotifBadge.setVisibility(View.GONE);
        }
    }

    private void initFallbackSlots() {
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
        slotAdapter.setSlots(demoList);
    }

    private void showSlotDetailSheet(ParkingSlot slot) {
        BottomSheetDialog dialog = new BottomSheetDialog(requireContext());
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
            tvStatus.setTextColor(ContextCompat.getColor(requireContext(), R.color.status_free));
            btnBook.setVisibility(View.VISIBLE);
            btnBook.setText("Đặt chỗ ngay");
            btnBook.setOnClickListener(v -> {
                dialog.dismiss();
                if (getActivity() instanceof MainActivity) {
                    ((MainActivity) getActivity()).openBookingForSlot(slot.getSlotCode());
                }
            });
        } else if ("OCCUPIED".equalsIgnoreCase(status)) {
            tvStatus.setText("Đang có xe");
            tvStatus.setBackgroundResource(R.drawable.bg_badge_occupied);
            tvStatus.setTextColor(ContextCompat.getColor(requireContext(), R.color.status_occupied));
            btnBook.setVisibility(View.GONE);
            if (slot.getBookingPlate() != null && !slot.getBookingPlate().isEmpty()) {
                layoutBookingInfo.setVisibility(View.VISIBLE);
                tvPlate.setText(slot.getBookingPlate());
            }
        } else if ("RESERVED".equalsIgnoreCase(status)) {
            tvStatus.setText("Đã được đặt");
            tvStatus.setBackgroundResource(R.drawable.bg_badge_reserved);
            tvStatus.setTextColor(ContextCompat.getColor(requireContext(), R.color.status_reserved));
            btnBook.setVisibility(View.GONE);
            if (slot.getBookingPlate() != null && !slot.getBookingPlate().isEmpty()) {
                layoutBookingInfo.setVisibility(View.VISIBLE);
                tvPlate.setText(slot.getBookingPlate());
            }
        } else {
            tvStatus.setText("Bảo trì");
            tvStatus.setBackgroundResource(R.drawable.bg_badge_disabled);
            tvStatus.setTextColor(ContextCompat.getColor(requireContext(), R.color.status_disabled));
            btnBook.setVisibility(View.GONE);
        }

        dialog.show();
    }

    private void updateStatsFromSlots(List<ParkingSlot> list) {
        if (list == null) return;
        int free = 0, occ = 0, res = 0;
        for (ParkingSlot s : list) {
            String st = s.getStatus();
            if ("FREE".equalsIgnoreCase(st)) free++;
            else if ("OCCUPIED".equalsIgnoreCase(st)) occ++;
            else if ("RESERVED".equalsIgnoreCase(st)) res++;
        }
        tvStatTotal.setText(String.valueOf(list.size()));
        tvStatFree.setText(String.valueOf(free));
        tvStatOccupied.setText(String.valueOf(occ));
        tvStatReserved.setText(String.valueOf(res));
    }

    // === REALTIME SOCKET.IO HANDLERS ===
    @Override
    public void onSlotStatusChanged(String slotCode, int slotId, String newStatus) {
        if (slotAdapter != null) {
            slotAdapter.updateSlotStatus(slotCode, newStatus);
            updateStatsFromSlots(slotAdapter.getSlots());
        }
    }

    @Override
    public void onNewNotification(NotificationItem item) {
        unreadNotifCount++;
        updateBadge();
        Toast.makeText(requireContext(), "🔔 " + item.getTitle() + ": " + item.getMessage(), Toast.LENGTH_SHORT).show();
    }

    private void loadRatesData() {
        if (!isAdded() || getContext() == null) return;
        ApiClient.getApiService(requireContext()).getParkingRates().enqueue(new Callback<ApiResponse<List<ParkingRate>>>() {
            @Override
            public void onResponse(Call<ApiResponse<List<ParkingRate>>> call, Response<ApiResponse<List<ParkingRate>>> response) {
                if (response.isSuccessful() && response.body() != null && response.body().getData() != null) {
                    List<ParkingRate> rates = response.body().getData();
                    for (ParkingRate r : rates) {
                        String type = r.getVehicleType();
                        String formattedPrice = FormatUtils.formatCurrency(r.getPricePerHour());
                        if ("car".equalsIgnoreCase(type)) {
                            if (tvRateCar != null) tvRateCar.setText(formattedPrice);
                        } else if ("motorbike".equalsIgnoreCase(type)) {
                            if (tvRateBike != null) tvRateBike.setText(formattedPrice);
                        } else if ("truck".equalsIgnoreCase(type)) {
                            if (tvRateTruck != null) tvRateTruck.setText(formattedPrice);
                        }
                    }
                    if (tvRatesUpdatedTime != null) {
                        tvRatesUpdatedTime.setText("Cập nhật thời gian thực");
                    }
                }
            }

            @Override
            public void onFailure(Call<ApiResponse<List<ParkingRate>>> call, Throwable t) {
                // Giữ nguyên giá trị mặc định nếu offline
            }
        });
    }

    @Override
    public void onRatesUpdated() {
        if (isAdded() && getContext() != null) {
            loadRatesData();
        }
    }
}
