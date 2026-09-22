package com.smartparking.app.utils;

import android.app.Dialog;
import android.content.Context;
import android.graphics.Color;
import android.graphics.drawable.ColorDrawable;
import android.view.LayoutInflater;
import android.view.View;
import android.view.Window;
import android.widget.EditText;
import android.widget.TextView;
import android.widget.Toast;
import com.google.android.material.button.MaterialButton;
import com.smartparking.app.R;
import com.smartparking.app.models.ApiResponse;
import com.smartparking.app.models.BatchRatesRequest;
import com.smartparking.app.models.ParkingRate;
import com.smartparking.app.network.ApiClient;
import com.smartparking.app.network.ApiConfig;
import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;

public class DialogUtils {
    private static Dialog loadingDialog;

    public interface OnServerConfigSavedListener {
        void onSaved(String newHost, int newPort);
    }

    public static void showLoadingDialog(Context context, String message) {
        dismissLoadingDialog();
        try {
            loadingDialog = new Dialog(context);
            loadingDialog.requestWindowFeature(Window.FEATURE_NO_TITLE);
            loadingDialog.setContentView(R.layout.dialog_loading);
            if (loadingDialog.getWindow() != null) {
                loadingDialog.getWindow().setBackgroundDrawable(new ColorDrawable(Color.TRANSPARENT));
            }
            loadingDialog.setCancelable(false);

            TextView tvMsg = loadingDialog.findViewById(R.id.tv_loading_message);
            if (tvMsg != null && message != null) {
                tvMsg.setText(message);
            }

            loadingDialog.show();
        } catch (Exception ignored) {}
    }

    public static void dismissLoadingDialog() {
        if (loadingDialog != null && loadingDialog.isShowing()) {
            try {
                loadingDialog.dismiss();
            } catch (Exception ignored) {}
            loadingDialog = null;
        }
    }

    public static void showServerConfigDialog(Context context, OnServerConfigSavedListener listener) {
        Dialog dialog = new Dialog(context);
        dialog.requestWindowFeature(Window.FEATURE_NO_TITLE);
        dialog.setContentView(R.layout.dialog_server_config);
        if (dialog.getWindow() != null) {
            dialog.getWindow().setBackgroundDrawable(new ColorDrawable(Color.TRANSPARENT));
        }

        EditText edtHost = dialog.findViewById(R.id.edt_server_host);
        EditText edtPort = dialog.findViewById(R.id.edt_server_port);
        MaterialButton btnSave = dialog.findViewById(R.id.btn_save_config);
        MaterialButton btnCancel = dialog.findViewById(R.id.btn_cancel_config);

        edtHost.setText(ApiConfig.getServerHost(context));
        edtPort.setText(String.valueOf(ApiConfig.getServerPort(context)));

        btnCancel.setOnClickListener(v -> dialog.dismiss());

        btnSave.setOnClickListener(v -> {
            String host = edtHost.getText().toString().trim();
            String portStr = edtPort.getText().toString().trim();

            if (host.isEmpty()) {
                Toast.makeText(context, "Vui lòng nhập địa chỉ máy chủ", Toast.LENGTH_SHORT).show();
                return;
            }

            int port = ApiConfig.DEFAULT_PORT;
            if (!portStr.isEmpty()) {
                try {
                    port = Integer.parseInt(portStr);
                } catch (NumberFormatException ignored) {}
            }

            ApiConfig.saveServerConfig(context, host, port);
            Toast.makeText(context, "Đã lưu cấu hình máy chủ: " + host + ":" + port, Toast.LENGTH_SHORT).show();
            dialog.dismiss();

            if (listener != null) {
                listener.onSaved(host, port);
            }
        });

        dialog.show();
    }

    public static void showParkingRateConfigDialog(Context context, Runnable onSavedCallback) {
        Dialog dialog = new Dialog(context);
        dialog.requestWindowFeature(Window.FEATURE_NO_TITLE);
        dialog.setContentView(R.layout.dialog_config_rates);
        if (dialog.getWindow() != null) {
            dialog.getWindow().setBackgroundDrawable(new ColorDrawable(Color.TRANSPARENT));
        }

        com.google.android.material.textfield.TextInputEditText etCarHour = dialog.findViewById(R.id.et_rate_car_hour);
        com.google.android.material.textfield.TextInputEditText etCarMin = dialog.findViewById(R.id.et_rate_car_min);
        com.google.android.material.textfield.TextInputEditText etCarMax = dialog.findViewById(R.id.et_rate_car_max);

        com.google.android.material.textfield.TextInputEditText etBikeHour = dialog.findViewById(R.id.et_rate_bike_hour);
        com.google.android.material.textfield.TextInputEditText etBikeMin = dialog.findViewById(R.id.et_rate_bike_min);
        com.google.android.material.textfield.TextInputEditText etBikeMax = dialog.findViewById(R.id.et_rate_bike_max);

        com.google.android.material.textfield.TextInputEditText etTruckHour = dialog.findViewById(R.id.et_rate_truck_hour);
        com.google.android.material.textfield.TextInputEditText etTruckMin = dialog.findViewById(R.id.et_rate_truck_min);
        com.google.android.material.textfield.TextInputEditText etTruckMax = dialog.findViewById(R.id.et_rate_truck_max);

        android.widget.ProgressBar pbLoading = dialog.findViewById(R.id.pb_rates_loading);
        MaterialButton btnSave = dialog.findViewById(R.id.btn_rates_save);
        MaterialButton btnCancel = dialog.findViewById(R.id.btn_rates_cancel);

        btnCancel.setOnClickListener(v -> dialog.dismiss());

        final java.util.List<com.smartparking.app.models.ParkingRate> cachedRates = new java.util.ArrayList<>();

        // Fetch current rates
        if (pbLoading != null) pbLoading.setVisibility(View.VISIBLE);
        ApiClient.getApiService(context).getParkingRates().enqueue(new Callback<ApiResponse<java.util.List<com.smartparking.app.models.ParkingRate>>>() {
            @Override
            public void onResponse(Call<ApiResponse<java.util.List<com.smartparking.app.models.ParkingRate>>> call,
                                   Response<ApiResponse<java.util.List<com.smartparking.app.models.ParkingRate>>> response) {
                if (pbLoading != null) pbLoading.setVisibility(View.GONE);
                if (response.isSuccessful() && response.body() != null && response.body().getData() != null) {
                    cachedRates.clear();
                    cachedRates.addAll(response.body().getData());
                    for (com.smartparking.app.models.ParkingRate rate : cachedRates) {
                        String type = rate.getVehicleType();
                        if ("CAR".equalsIgnoreCase(type)) {
                            if (etCarHour != null) etCarHour.setText(String.valueOf((long) rate.getPricePerHour()));
                            if (etCarMin != null) etCarMin.setText(String.valueOf((long) rate.getMinimumFee()));
                            if (etCarMax != null) etCarMax.setText(String.valueOf((long) rate.getMaximumFee()));
                        } else if ("MOTORBIKE".equalsIgnoreCase(type)) {
                            if (etBikeHour != null) etBikeHour.setText(String.valueOf((long) rate.getPricePerHour()));
                            if (etBikeMin != null) etBikeMin.setText(String.valueOf((long) rate.getMinimumFee()));
                            if (etBikeMax != null) etBikeMax.setText(String.valueOf((long) rate.getMaximumFee()));
                        } else if ("TRUCK".equalsIgnoreCase(type)) {
                            if (etTruckHour != null) etTruckHour.setText(String.valueOf((long) rate.getPricePerHour()));
                            if (etTruckMin != null) etTruckMin.setText(String.valueOf((long) rate.getMinimumFee()));
                            if (etTruckMax != null) etTruckMax.setText(String.valueOf((long) rate.getMaximumFee()));
                        }
                    }
                }
            }

            @Override
            public void onFailure(Call<ApiResponse<java.util.List<com.smartparking.app.models.ParkingRate>>> call, Throwable t) {
                if (pbLoading != null) pbLoading.setVisibility(View.GONE);
                Toast.makeText(context, "Không thể tải bảng giá hiện tại", Toast.LENGTH_SHORT).show();
            }
        });

        btnSave.setOnClickListener(v -> {
            try {
                java.util.List<com.smartparking.app.models.ParkingRate> updateList = new java.util.ArrayList<>();

                for (com.smartparking.app.models.ParkingRate orig : cachedRates) {
                    com.smartparking.app.models.ParkingRate updated = new com.smartparking.app.models.ParkingRate();
                    updated.setId(orig.getId());
                    updated.setVehicleType(orig.getVehicleType());

                    if ("CAR".equalsIgnoreCase(orig.getVehicleType())) {
                        updated.setPricePerHour(Double.parseDouble(etCarHour.getText().toString().trim()));
                        updated.setMinimumFee(Double.parseDouble(etCarMin.getText().toString().trim()));
                        updated.setMaximumFee(Double.parseDouble(etCarMax.getText().toString().trim()));
                    } else if ("MOTORBIKE".equalsIgnoreCase(orig.getVehicleType())) {
                        updated.setPricePerHour(Double.parseDouble(etBikeHour.getText().toString().trim()));
                        updated.setMinimumFee(Double.parseDouble(etBikeMin.getText().toString().trim()));
                        updated.setMaximumFee(Double.parseDouble(etBikeMax.getText().toString().trim()));
                    } else if ("TRUCK".equalsIgnoreCase(orig.getVehicleType())) {
                        updated.setPricePerHour(Double.parseDouble(etTruckHour.getText().toString().trim()));
                        updated.setMinimumFee(Double.parseDouble(etTruckMin.getText().toString().trim()));
                        updated.setMaximumFee(Double.parseDouble(etTruckMax.getText().toString().trim()));
                    }
                    updateList.add(updated);
                }

                if (pbLoading != null) pbLoading.setVisibility(View.VISIBLE);
                btnSave.setEnabled(false);

                ApiClient.getApiService(context).batchUpdateRates(new com.smartparking.app.models.BatchRatesRequest(updateList))
                        .enqueue(new Callback<ApiResponse<java.util.List<com.smartparking.app.models.ParkingRate>>>() {
                            @Override
                            public void onResponse(Call<ApiResponse<java.util.List<com.smartparking.app.models.ParkingRate>>> call,
                                                   Response<ApiResponse<java.util.List<com.smartparking.app.models.ParkingRate>>> response) {
                                if (pbLoading != null) pbLoading.setVisibility(View.GONE);
                                btnSave.setEnabled(true);
                                if (response.isSuccessful() && response.body() != null && response.body().isSuccess()) {
                                    Toast.makeText(context, "Cập nhật bảng giá thành công!", Toast.LENGTH_SHORT).show();
                                    dialog.dismiss();
                                    if (onSavedCallback != null) {
                                        onSavedCallback.run();
                                    }
                                } else {
                                    String msg = response.body() != null ? response.body().getMessage() : "Lỗi lưu bảng giá";
                                    Toast.makeText(context, msg, Toast.LENGTH_SHORT).show();
                                }
                            }

                            @Override
                            public void onFailure(Call<ApiResponse<java.util.List<com.smartparking.app.models.ParkingRate>>> call, Throwable t) {
                                if (pbLoading != null) pbLoading.setVisibility(View.GONE);
                                btnSave.setEnabled(true);
                                Toast.makeText(context, "Lỗi kết nối: " + t.getMessage(), Toast.LENGTH_SHORT).show();
                            }
                        });
            } catch (Exception e) {
                Toast.makeText(context, "Vui lòng nhập đầy đủ giá tiền hợp lệ", Toast.LENGTH_SHORT).show();
            }
        });

        dialog.show();
    }
}
