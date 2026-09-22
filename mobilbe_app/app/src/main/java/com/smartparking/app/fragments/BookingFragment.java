package com.smartparking.app.fragments;

import android.app.DatePickerDialog;
import android.app.TimePickerDialog;
import android.content.Intent;
import android.os.Bundle;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.AdapterView;
import android.widget.ArrayAdapter;
import android.widget.LinearLayout;
import android.widget.Spinner;
import android.widget.TextView;
import android.widget.Toast;
import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.fragment.app.Fragment;
import androidx.recyclerview.widget.GridLayoutManager;
import androidx.recyclerview.widget.RecyclerView;
import com.google.android.material.button.MaterialButton;
import com.smartparking.app.R;
import com.smartparking.app.activities.BookingDetailActivity;
import com.smartparking.app.adapters.ParkingSlotAdapter;
import com.smartparking.app.models.*;
import com.smartparking.app.network.ApiClient;
import com.smartparking.app.services.SocketService;
import com.smartparking.app.utils.DialogUtils;
import com.smartparking.app.utils.FormatUtils;
import com.smartparking.app.utils.SessionManager;
import java.text.SimpleDateFormat;
import java.util.*;
import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;

public class BookingFragment extends Fragment implements SocketService.OnSlotStatusChangeListener {

    private RecyclerView rvSlots;
    private ParkingSlotAdapter slotAdapter;
    private Spinner spnVehicles, spnHours;
    private TextView tvDate, tvTime;
    private TextView tvUnitPrice, tvTotalPrice, tvWalletBalance;
    private MaterialButton btnSubmit;

    private final Calendar calendar = Calendar.getInstance();
    private final List<Vehicle> userVehicles = new ArrayList<>();
    private final double[] hoursArray = {1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 8.0, 12.0, 24.0};
    private double selectedHours = 3.0;
    private double unitPrice = 10000.0;
    private String preselectedSlotCode = null;

    @Nullable
    @Override
    public View onCreateView(@NonNull LayoutInflater inflater, @Nullable ViewGroup container, @Nullable Bundle savedInstanceState) {
        return inflater.inflate(R.layout.fragment_booking, container, false);
    }

    @Override
    public void onViewCreated(@NonNull View view, @Nullable Bundle savedInstanceState) {
        super.onViewCreated(view, savedInstanceState);

        rvSlots = view.findViewById(R.id.rv_booking_slots);
        spnVehicles = view.findViewById(R.id.spn_booking_vehicle);
        spnHours = view.findViewById(R.id.spn_booking_hours);
        tvDate = view.findViewById(R.id.tv_booking_date);
        tvTime = view.findViewById(R.id.tv_booking_time);
        tvUnitPrice = view.findViewById(R.id.tv_booking_unit_price);
        tvTotalPrice = view.findViewById(R.id.tv_booking_total_price);
        tvWalletBalance = view.findViewById(R.id.tv_booking_wallet_balance);
        btnSubmit = view.findViewById(R.id.btn_submit_booking);

        LinearLayout btnPickDate = view.findViewById(R.id.btn_pick_date);
        LinearLayout btnPickTime = view.findViewById(R.id.btn_pick_time);

        // RecyclerView Slots
        rvSlots.setLayoutManager(new GridLayoutManager(requireContext(), 3));
        slotAdapter = new ParkingSlotAdapter(requireContext(), (slot, position) -> {
            if (!"FREE".equalsIgnoreCase(slot.getStatus())) {
                Toast.makeText(requireContext(), "Chỗ " + slot.getSlotCode() + " hiện không còn trống", Toast.LENGTH_SHORT).show();
                return;
            }
            slotAdapter.selectSlot(position);
        });
        rvSlots.setAdapter(slotAdapter);

        // Setup Date & Time default
        updateDateTimeViews();

        btnPickDate.setOnClickListener(v -> showDatePicker());
        btnPickTime.setOnClickListener(v -> showTimePicker());

        // Setup Hours Spinner
        String[] hoursLabels = {"1 giờ", "2 giờ", "3 giờ (Khuyên dùng)", "4 giờ", "5 giờ", "6 giờ", "8 giờ", "12 giờ", "24 giờ"};
        ArrayAdapter<String> hoursAdapter = new ArrayAdapter<>(requireContext(), android.R.layout.simple_spinner_dropdown_item, hoursLabels);
        spnHours.setAdapter(hoursAdapter);
        spnHours.setSelection(2); // default 3 hours

        spnHours.setOnItemSelectedListener(new AdapterView.OnItemSelectedListener() {
            @Override
            public void onItemSelected(AdapterView<?> parent, View view, int position, long id) {
                selectedHours = hoursArray[position];
                estimateBookingFee();
            }

            @Override
            public void onNothingSelected(AdapterView<?> parent) {}
        });

        // Submit Booking
        btnSubmit.setOnClickListener(v -> performBooking());

        SocketService.getInstance(requireContext()).addSlotListener(this);

        loadSlots();
        loadVehicles();
        loadWalletBalance();
    }

    @Override
    public void onResume() {
        super.onResume();
        loadWalletBalance();
        loadVehicles();
    }

    @Override
    public void onHiddenChanged(boolean hidden) {
        super.onHiddenChanged(hidden);
        if (!hidden && isAdded()) {
            loadSlots();
            loadVehicles();
            loadWalletBalance();
        }
    }

    @Override
    public void onDestroyView() {
        super.onDestroyView();
        SocketService.getInstance(requireContext()).removeSlotListener(this);
    }

    public void preselectSlot(String slotCode) {
        this.preselectedSlotCode = slotCode;
        if (slotAdapter != null && slotAdapter.getSlots().size() > 0) {
            applyPreselectedSlot();
        }
    }

    private void applyPreselectedSlot() {
        if (preselectedSlotCode != null) {
            List<ParkingSlot> list = slotAdapter.getSlots();
            for (int i = 0; i < list.size(); i++) {
                if (list.get(i).getSlotCode().equalsIgnoreCase(preselectedSlotCode)) {
                    if ("FREE".equalsIgnoreCase(list.get(i).getStatus())) {
                        slotAdapter.selectSlot(i);
                    }
                    break;
                }
            }
            preselectedSlotCode = null;
        }
    }

    private void updateDateTimeViews() {
        SimpleDateFormat df = new SimpleDateFormat("dd/MM/yyyy", Locale.getDefault());
        SimpleDateFormat tf = new SimpleDateFormat("HH:mm", Locale.getDefault());
        tvDate.setText(df.format(calendar.getTime()));
        tvTime.setText(tf.format(calendar.getTime()));
    }

    private void showDatePicker() {
        DatePickerDialog dialog = new DatePickerDialog(
                requireContext(),
                (view, year, month, dayOfMonth) -> {
                    calendar.set(Calendar.YEAR, year);
                    calendar.set(Calendar.MONTH, month);
                    calendar.set(Calendar.DAY_OF_MONTH, dayOfMonth);
                    updateDateTimeViews();
                },
                calendar.get(Calendar.YEAR),
                calendar.get(Calendar.MONTH),
                calendar.get(Calendar.DAY_OF_MONTH)
        );
        dialog.getDatePicker().setMinDate(System.currentTimeMillis() - 1000);
        dialog.show();
    }

    private void showTimePicker() {
        TimePickerDialog dialog = new TimePickerDialog(
                requireContext(),
                (view, hourOfDay, minute) -> {
                    calendar.set(Calendar.HOUR_OF_DAY, hourOfDay);
                    calendar.set(Calendar.MINUTE, minute);
                    updateDateTimeViews();
                },
                calendar.get(Calendar.HOUR_OF_DAY),
                calendar.get(Calendar.MINUTE),
                true
        );
        dialog.show();
    }

    private void loadSlots() {
        ApiClient.getApiService(requireContext()).getAllSlots().enqueue(new Callback<ApiResponse<List<ParkingSlot>>>() {
            @Override
            public void onResponse(Call<ApiResponse<List<ParkingSlot>>> call, Response<ApiResponse<List<ParkingSlot>>> response) {
                if (response.isSuccessful() && response.body() != null && response.body().getData() != null) {
                    slotAdapter.setSlots(response.body().getData());
                    applyPreselectedSlot();
                } else {
                    initFallbackSlots();
                }
            }

            @Override
            public void onFailure(Call<ApiResponse<List<ParkingSlot>>> call, Throwable t) {
                initFallbackSlots();
            }
        });
    }

    private void initFallbackSlots() {
        if (slotAdapter.getItemCount() == 0) {
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
            applyPreselectedSlot();
        }
    }

    private void loadVehicles() {
        ApiClient.getApiService(requireContext()).getMyVehicles().enqueue(new Callback<ApiResponse<List<Vehicle>>>() {
            @Override
            public void onResponse(Call<ApiResponse<List<Vehicle>>> call, Response<ApiResponse<List<Vehicle>>> response) {
                userVehicles.clear();
                if (response.isSuccessful() && response.body() != null && response.body().getData() != null) {
                    userVehicles.addAll(response.body().getData());
                }

                if (userVehicles.isEmpty()) {
                    // Placeholder when user hasn't added a vehicle
                    Vehicle v = new Vehicle();
                    v.setId(-1);
                    v.setPlateNumber("Chưa có phương tiện");
                    v.setVehicleType("CAR");
                    v.setVehicleName("Vui lòng thêm xe trước");
                    userVehicles.add(v);
                }

                List<String> vehicleStrings = new ArrayList<>();
                int defaultIndex = 0;
                for (int i = 0; i < userVehicles.size(); i++) {
                    Vehicle v = userVehicles.get(i);
                    if (v.getId() <= 0) {
                        vehicleStrings.add("⚠️ Chưa có xe (Nhấn để thêm xe)");
                    } else {
                        vehicleStrings.add(v.getPlateNumber() + " (" + v.getDisplayType() + ")");
                    }
                    if (v.isDefault()) defaultIndex = i;
                }

                ArrayAdapter<String> adapter = new ArrayAdapter<>(requireContext(), android.R.layout.simple_spinner_dropdown_item, vehicleStrings);
                spnVehicles.setAdapter(adapter);
                spnVehicles.setSelection(defaultIndex);

                estimateBookingFee();
            }

            @Override
            public void onFailure(Call<ApiResponse<List<Vehicle>>> call, Throwable t) {
                // Fallback vehicle
                userVehicles.clear();
                Vehicle v = new Vehicle();
                v.setId(1);
                v.setPlateNumber("51A12345");
                v.setVehicleType("CAR");
                userVehicles.add(v);

                List<String> vehicleStrings = Collections.singletonList("51A12345 (Xe ô tô)");
                ArrayAdapter<String> adapter = new ArrayAdapter<>(requireContext(), android.R.layout.simple_spinner_dropdown_item, vehicleStrings);
                spnVehicles.setAdapter(adapter);
                estimateBookingFee();
            }
        });
    }

    private void loadWalletBalance() {
        User user = SessionManager.getInstance(requireContext()).getUser();
        if (user != null) {
            tvWalletBalance.setText("Số dư ví: " + FormatUtils.formatCurrency(user.getWalletBalance()));
        }
    }

    private void estimateBookingFee() {
        String vehicleType = "CAR";
        int selVehiclePos = spnVehicles.getSelectedItemPosition();
        if (selVehiclePos >= 0 && selVehiclePos < userVehicles.size()) {
            vehicleType = userVehicles.get(selVehiclePos).getVehicleType();
        }

        ApiClient.getApiService(requireContext()).estimateFee(selectedHours, vehicleType).enqueue(new Callback<ApiResponse<FeeEstimate>>() {
            @Override
            public void onResponse(Call<ApiResponse<FeeEstimate>> call, Response<ApiResponse<FeeEstimate>> response) {
                if (response.isSuccessful() && response.body() != null && response.body().getData() != null) {
                    FeeEstimate fe = response.body().getData();
                    unitPrice = fe.getPricePerHour();
                    tvUnitPrice.setText(FormatUtils.formatCurrency(fe.getPricePerHour()) + "/giờ");
                    tvTotalPrice.setText(FormatUtils.formatCurrency(fe.getFee()));
                } else {
                    double total = selectedHours * unitPrice;
                    tvUnitPrice.setText(FormatUtils.formatCurrency(unitPrice) + "/giờ");
                    tvTotalPrice.setText(FormatUtils.formatCurrency(total));
                }
            }

            @Override
            public void onFailure(Call<ApiResponse<FeeEstimate>> call, Throwable t) {
                double total = selectedHours * unitPrice;
                tvUnitPrice.setText(FormatUtils.formatCurrency(unitPrice) + "/giờ");
                tvTotalPrice.setText(FormatUtils.formatCurrency(total));
            }
        });
    }

    private void performBooking() {
        ParkingSlot selectedSlot = slotAdapter.getSelectedSlot();
        if (selectedSlot == null) {
            Toast.makeText(requireContext(), "Vui lòng chọn một chỗ đỗ xe trống", Toast.LENGTH_SHORT).show();
            return;
        }

        if (!"FREE".equalsIgnoreCase(selectedSlot.getStatus())) {
            Toast.makeText(requireContext(), "Chỗ " + selectedSlot.getSlotCode() + " đã có người đặt hoặc đang có xe", Toast.LENGTH_SHORT).show();
            return;
        }

        int vehiclePos = spnVehicles.getSelectedItemPosition();
        if (vehiclePos < 0 || vehiclePos >= userVehicles.size()) {
            Toast.makeText(requireContext(), "Vui lòng chọn phương tiện của bạn", Toast.LENGTH_SHORT).show();
            return;
        }
        Vehicle vehicle = userVehicles.get(vehiclePos);
        if (vehicle == null || vehicle.getId() <= 0) {
            Toast.makeText(requireContext(), "Vui lòng thêm xe của bạn trong tab Tài khoản trước khi đặt chỗ", Toast.LENGTH_LONG).show();
            return;
        }

        // Check wallet balance
        double totalExpected = selectedHours * unitPrice;
        User user = SessionManager.getInstance(requireContext()).getUser();
        if (user != null && user.getWalletBalance() < totalExpected) {
            Toast.makeText(requireContext(), "Số dư ví không đủ (" + FormatUtils.formatCurrency(user.getWalletBalance()) + "). Vui lòng nạp thêm tiền.", Toast.LENGTH_LONG).show();
            return;
        }

        DialogUtils.showLoadingDialog(requireContext(), "Đang xác nhận đặt chỗ...");

        // Start time format ISO
        SimpleDateFormat isoFormat = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss", Locale.getDefault());
        String startTimeStr = isoFormat.format(calendar.getTime());

        BookingRequest request = new BookingRequest(vehicle.getId(), selectedSlot.getId(), startTimeStr, selectedHours);

        ApiClient.getApiService(requireContext()).createBooking(request).enqueue(new Callback<ApiResponse<Map<String, Object>>>() {
            @Override
            public void onResponse(Call<ApiResponse<Map<String, Object>>> call, Response<ApiResponse<Map<String, Object>>> response) {
                DialogUtils.dismissLoadingDialog();
                if (response.isSuccessful() && response.body() != null && response.body().isSuccess()) {
                    // Update user wallet balance locally
                    if (user != null) {
                        double newBal = user.getWalletBalance() - totalExpected;
                        SessionManager.getInstance(requireContext()).updateBalance(newBal);
                        loadWalletBalance();
                    }

                    // Extract real booking ID and Code from backend response
                    int realBookingId = (int) (System.currentTimeMillis() % 100000);
                    String realBookingCode = null;
                    Map<String, Object> data = response.body().getData();
                    if (data != null && data.get("booking") instanceof Map) {
                        Map<?, ?> bMap = (Map<?, ?>) data.get("booking");
                        if (bMap.get("id") instanceof Number) {
                            realBookingId = ((Number) bMap.get("id")).intValue();
                        }
                        if (bMap.get("booking_code") != null) {
                            realBookingCode = bMap.get("booking_code").toString();
                        }
                    }

                    // Open Booking Detail Screen!
                    Intent intent = new Intent(requireContext(), BookingDetailActivity.class);
                    intent.putExtra("slot_code", selectedSlot.getSlotCode());
                    intent.putExtra("zone", selectedSlot.getZone());
                    intent.putExtra("start_time", startTimeStr);
                    intent.putExtra("hours", selectedHours);
                    intent.putExtra("unit_price", unitPrice);
                    intent.putExtra("total_price", totalExpected);
                    intent.putExtra("plate_number", vehicle.getPlateNumber());
                    intent.putExtra("booking_id", realBookingId);
                    if (realBookingCode != null) {
                        intent.putExtra("booking_code", realBookingCode);
                    }
                    startActivity(intent);
                } else {
                    String msg = "Đặt chỗ không thành công (Mã: " + response.code() + ")";
                    try {
                        if (response.errorBody() != null) {
                            String errStr = response.errorBody().string();
                            org.json.JSONObject obj = new org.json.JSONObject(errStr);
                            if (obj.has("message")) {
                                msg = obj.getString("message");
                            }
                        } else if (response.body() != null && response.body().getMessage() != null && !response.body().getMessage().isEmpty()) {
                            msg = response.body().getMessage();
                        }
                    } catch (Exception ignored) {}
                    Toast.makeText(requireContext(), msg, Toast.LENGTH_LONG).show();
                }
            }

            @Override
            public void onFailure(Call<ApiResponse<Map<String, Object>>> call, Throwable t) {
                DialogUtils.dismissLoadingDialog();
                Toast.makeText(requireContext(), getString(R.string.error_network), Toast.LENGTH_LONG).show();
            }
        });
    }

    @Override
    public void onSlotStatusChanged(String slotCode, int slotId, String newStatus) {
        if (slotAdapter != null) {
            slotAdapter.updateSlotStatus(slotCode, newStatus);
        }
    }
}
