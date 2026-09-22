package com.smartparking.app.fragments;

import android.app.Dialog;
import android.graphics.Color;
import android.graphics.drawable.ColorDrawable;
import android.os.Bundle;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.view.Window;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.RadioButton;
import android.widget.RadioGroup;
import android.widget.TextView;
import android.widget.Toast;
import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.fragment.app.Fragment;
import androidx.recyclerview.widget.GridLayoutManager;
import androidx.recyclerview.widget.RecyclerView;
import androidx.swiperefreshlayout.widget.SwipeRefreshLayout;
import com.google.android.material.button.MaterialButton;
import com.google.android.material.chip.ChipGroup;
import com.smartparking.app.R;
import com.smartparking.app.adapters.AdminSlotAdapter;
import com.smartparking.app.models.ApiResponse;
import com.smartparking.app.models.DeviceItem;
import com.smartparking.app.models.ParkingSlot;
import com.smartparking.app.network.ApiClient;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;

public class AdminParkingFragment extends Fragment implements AdminSlotAdapter.OnSlotClickListener {

    private SwipeRefreshLayout swipeRefresh;
    private TextView tvSummary;
    private RecyclerView rvSlots;
    private AdminSlotAdapter slotAdapter;
    private ChipGroup chipGroup;
    private LinearLayout layoutIotDevices;

    private List<ParkingSlot> allSlots = new ArrayList<>();
    private String currentFilter = "ALL";

    @Nullable
    @Override
    public View onCreateView(@NonNull LayoutInflater inflater, @Nullable ViewGroup container, @Nullable Bundle savedInstanceState) {
        View v = inflater.inflate(R.layout.fragment_admin_parking, container, false);

        swipeRefresh = v.findViewById(R.id.swipe_refresh_parking);
        tvSummary = v.findViewById(R.id.tv_parking_slot_summary);
        rvSlots = v.findViewById(R.id.rv_admin_parking_slots);
        chipGroup = v.findViewById(R.id.chip_group_slots);
        layoutIotDevices = v.findViewById(R.id.layout_iot_devices);

        rvSlots.setLayoutManager(new GridLayoutManager(getContext(), 2));
        slotAdapter = new AdminSlotAdapter(this);
        rvSlots.setAdapter(slotAdapter);

        ImageView btnRefresh = v.findViewById(R.id.btn_refresh_parking);
        btnRefresh.setOnClickListener(view -> loadData());

        // Chip group filter
        chipGroup.setOnCheckedStateChangeListener((group, checkedIds) -> {
            if (checkedIds.isEmpty()) return;
            int id = checkedIds.get(0);
            if (id == R.id.chip_slot_all) currentFilter = "ALL";
            else if (id == R.id.chip_slot_free) currentFilter = "FREE";
            else if (id == R.id.chip_slot_occupied) currentFilter = "OCCUPIED";
            else if (id == R.id.chip_slot_reserved) currentFilter = "RESERVED";
            else if (id == R.id.chip_slot_disabled) currentFilter = "DISABLED";
            applyFilter();
        });

        // Hardware buttons
        MaterialButton btnInOpen = v.findViewById(R.id.btn_ctrl_in_open);
        MaterialButton btnInClose = v.findViewById(R.id.btn_ctrl_in_close);
        MaterialButton btnOutOpen = v.findViewById(R.id.btn_ctrl_out_open);
        MaterialButton btnOutClose = v.findViewById(R.id.btn_ctrl_out_close);
        MaterialButton btnLightOn = v.findViewById(R.id.btn_ctrl_light_on);
        MaterialButton btnLightOff = v.findViewById(R.id.btn_ctrl_light_off);

        btnInOpen.setOnClickListener(view -> controlBarrier("IN", "OPEN"));
        btnInClose.setOnClickListener(view -> controlBarrier("IN", "CLOSE"));
        btnOutOpen.setOnClickListener(view -> controlBarrier("OUT", "OPEN"));
        btnOutClose.setOnClickListener(view -> controlBarrier("OUT", "CLOSE"));
        btnLightOn.setOnClickListener(view -> controlLight("ON"));
        btnLightOff.setOnClickListener(view -> controlLight("OFF"));

        MaterialButton btnConfigRates = v.findViewById(R.id.btn_admin_parking_config_rates);
        if (btnConfigRates != null) {
            btnConfigRates.setOnClickListener(view ->
                    com.smartparking.app.utils.DialogUtils.showParkingRateConfigDialog(requireContext(), this::loadData));
        }

        swipeRefresh.setOnRefreshListener(this::loadData);

        return v;
    }

    @Override
    public void onViewCreated(@NonNull View view, @Nullable Bundle savedInstanceState) {
        super.onViewCreated(view, savedInstanceState);
        loadData();
    }

    @Override
    public void onResume() {
        super.onResume();
        loadData();
    }

    private void loadData() {
        loadSlots();
        loadDevices();
    }

    private void loadSlots() {
        if (getContext() == null) return;
        swipeRefresh.setRefreshing(true);

        ApiClient.getApiService(requireContext()).getAllSlots().enqueue(new Callback<ApiResponse<List<ParkingSlot>>>() {
            @Override
            public void onResponse(Call<ApiResponse<List<ParkingSlot>>> call, Response<ApiResponse<List<ParkingSlot>>> response) {
                if (isAdded()) swipeRefresh.setRefreshing(false);
                if (response.isSuccessful() && response.body() != null && response.body().isSuccess()) {
                    List<ParkingSlot> list = response.body().getData();
                    if (list != null && isAdded()) {
                        allSlots = list;
                        updateSummaryText();
                        applyFilter();
                    }
                }
            }

            @Override
            public void onFailure(Call<ApiResponse<List<ParkingSlot>>> call, Throwable t) {
                if (isAdded()) {
                    swipeRefresh.setRefreshing(false);
                    Toast.makeText(getContext(), "Không thể tải danh sách chỗ đỗ", Toast.LENGTH_SHORT).show();
                }
            }
        });
    }

    private void updateSummaryText() {
        int total = allSlots.size();
        int free = 0, occupied = 0, reserved = 0, disabled = 0;
        for (ParkingSlot s : allSlots) {
            String st = s.getStatus();
            if ("FREE".equalsIgnoreCase(st)) free++;
            else if ("OCCUPIED".equalsIgnoreCase(st)) occupied++;
            else if ("RESERVED".equalsIgnoreCase(st)) reserved++;
            else if ("DISABLED".equalsIgnoreCase(st)) disabled++;
        }
        tvSummary.setText("Tổng: " + total + " chỗ | Trống: " + free + " | Có xe: " + occupied + " | Đã đặt: " + reserved);
    }

    private void applyFilter() {
        if ("ALL".equalsIgnoreCase(currentFilter)) {
            slotAdapter.setSlots(allSlots);
            return;
        }
        List<ParkingSlot> filtered = new ArrayList<>();
        for (ParkingSlot s : allSlots) {
            if (currentFilter.equalsIgnoreCase(s.getStatus())) {
                filtered.add(s);
            }
        }
        slotAdapter.setSlots(filtered);
    }

    private void loadDevices() {
        if (getContext() == null) return;
        ApiClient.getApiService(requireContext()).getAllDevices().enqueue(new Callback<ApiResponse<List<DeviceItem>>>() {
            @Override
            public void onResponse(Call<ApiResponse<List<DeviceItem>>> call, Response<ApiResponse<List<DeviceItem>>> response) {
                if (response.isSuccessful() && response.body() != null && response.body().isSuccess()) {
                    List<DeviceItem> devices = response.body().getData();
                    if (devices != null && isAdded()) {
                        renderDeviceList(devices);
                    }
                }
            }

            @Override
            public void onFailure(Call<ApiResponse<List<DeviceItem>>> call, Throwable t) {
                // Ignore silent failure for device list
            }
        });
    }

    private void renderDeviceList(List<DeviceItem> devices) {
        if (layoutIotDevices == null || getContext() == null) return;
        layoutIotDevices.removeAllViews();

        for (DeviceItem d : devices) {
            LinearLayout row = new LinearLayout(getContext());
            row.setOrientation(LinearLayout.HORIZONTAL);
            row.setPadding(0, 8, 0, 8);

            TextView tvName = new TextView(getContext());
            tvName.setLayoutParams(new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f));
            tvName.setText(d.getName() + " (" + d.getDeviceCode() + ")");
            tvName.setTextSize(12f);
            tvName.setTextColor(getResources().getColor(R.color.text_primary));

            TextView tvStatus = new TextView(getContext());
            boolean isOnline = d.isOnline();
            tvStatus.setText(isOnline ? "ONLINE" : "OFFLINE");
            tvStatus.setTextSize(10f);
            tvStatus.setTextColor(getResources().getColor(isOnline ? R.color.status_free : R.color.status_disabled));
            tvStatus.setBackgroundResource(isOnline ? R.drawable.bg_badge_free : R.drawable.bg_badge_disabled);
            tvStatus.setPadding(12, 4, 12, 4);

            row.addView(tvName);
            row.addView(tvStatus);
            layoutIotDevices.addView(row);
        }
    }

    @Override
    public void onSlotClick(ParkingSlot slot) {
        showEditSlotDialog(slot);
    }

    private void showEditSlotDialog(ParkingSlot slot) {
        if (getContext() == null) return;

        Dialog dialog = new Dialog(getContext());
        dialog.requestWindowFeature(Window.FEATURE_NO_TITLE);
        dialog.setContentView(R.layout.dialog_admin_edit_slot);
        if (dialog.getWindow() != null) {
            dialog.getWindow().setBackgroundDrawable(new ColorDrawable(Color.TRANSPARENT));
            dialog.getWindow().setLayout(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        }

        TextView tvTitle = dialog.findViewById(R.id.tv_dialog_slot_title);
        tvTitle.setText("Chỉnh sửa Chỗ đỗ " + slot.getSlotCode());

        RadioButton rbFree = dialog.findViewById(R.id.rb_status_free);
        RadioButton rbOccupied = dialog.findViewById(R.id.rb_status_occupied);
        RadioButton rbReserved = dialog.findViewById(R.id.rb_status_reserved);
        RadioButton rbDisabled = dialog.findViewById(R.id.rb_status_disabled);

        String currentStatus = slot.getStatus();
        if ("OCCUPIED".equalsIgnoreCase(currentStatus)) rbOccupied.setChecked(true);
        else if ("RESERVED".equalsIgnoreCase(currentStatus)) rbReserved.setChecked(true);
        else if ("DISABLED".equalsIgnoreCase(currentStatus)) rbDisabled.setChecked(true);
        else rbFree.setChecked(true);

        MaterialButton btnCancel = dialog.findViewById(R.id.btn_cancel_edit_slot);
        MaterialButton btnSave = dialog.findViewById(R.id.btn_save_slot_status);

        btnCancel.setOnClickListener(v -> dialog.dismiss());

        btnSave.setOnClickListener(v -> {
            String newStatus = "FREE";
            if (rbOccupied.isChecked()) newStatus = "OCCUPIED";
            else if (rbReserved.isChecked()) newStatus = "RESERVED";
            else if (rbDisabled.isChecked()) newStatus = "DISABLED";

            updateSlotStatus(slot.getId(), newStatus, dialog);
        });

        dialog.show();
    }

    private void updateSlotStatus(int slotId, String newStatus, Dialog dialog) {
        Map<String, Object> body = new HashMap<>();
        body.put("status", newStatus);

        ApiClient.getApiService(requireContext()).updateSlot(slotId, body).enqueue(new Callback<ApiResponse<ParkingSlot>>() {
            @Override
            public void onResponse(Call<ApiResponse<ParkingSlot>> call, Response<ApiResponse<ParkingSlot>> response) {
                dialog.dismiss();
                if (isAdded()) {
                    Toast.makeText(getContext(), "Đã cập nhật trạng thái chỗ đỗ sang " + newStatus, Toast.LENGTH_SHORT).show();
                    loadSlots();
                }
            }

            @Override
            public void onFailure(Call<ApiResponse<ParkingSlot>> call, Throwable t) {
                dialog.dismiss();
                if (isAdded()) {
                    Toast.makeText(getContext(), "Lỗi cập nhật: " + t.getMessage(), Toast.LENGTH_SHORT).show();
                }
            }
        });
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
