package com.smartparking.app.activities;

import android.app.AlertDialog;
import android.os.Bundle;
import android.view.LayoutInflater;
import android.view.View;
import android.widget.EditText;
import android.widget.RadioButton;
import android.widget.RadioGroup;
import android.widget.Toast;
import androidx.appcompat.app.AppCompatActivity;
import androidx.recyclerview.widget.LinearLayoutManager;
import com.smartparking.app.R;
import com.smartparking.app.adapters.VehicleAdapter;
import com.smartparking.app.databinding.ActivityVehicleManagementBinding;
import com.smartparking.app.models.ApiResponse;
import com.smartparking.app.models.Vehicle;
import com.smartparking.app.network.ApiClient;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;

public class VehicleManagementActivity extends AppCompatActivity {

    private ActivityVehicleManagementBinding binding;
    private VehicleAdapter adapter;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        binding = ActivityVehicleManagementBinding.inflate(getLayoutInflater());
        setContentView(binding.getRoot());

        initViews();
        setupListeners();
        loadVehicles();
    }

    private void initViews() {
        binding.rvVehicles.setLayoutManager(new LinearLayoutManager(this));
        adapter = new VehicleAdapter(this, this::showVehicleOptionsDialog);
        binding.rvVehicles.setAdapter(adapter);

        binding.swipeRefresh.setColorSchemeResources(R.color.primary);
    }

    private void setupListeners() {
        binding.btnBack.setOnClickListener(v -> finish());
        binding.btnAddHeader.setOnClickListener(v -> showAddVehicleDialog());
        binding.fabAddVehicle.setOnClickListener(v -> showAddVehicleDialog());
        binding.swipeRefresh.setOnRefreshListener(this::loadVehicles);
    }

    private void loadVehicles() {
        if (!binding.swipeRefresh.isRefreshing()) {
            binding.progressBar.setVisibility(View.VISIBLE);
        }
        binding.layoutEmpty.setVisibility(View.GONE);

        ApiClient.getApiService(this).getMyVehicles().enqueue(new Callback<ApiResponse<List<Vehicle>>>() {
            @Override
            public void onResponse(Call<ApiResponse<List<Vehicle>>> call, Response<ApiResponse<List<Vehicle>>> response) {
                binding.progressBar.setVisibility(View.GONE);
                binding.swipeRefresh.setRefreshing(false);

                if (response.isSuccessful() && response.body() != null && response.body().isSuccess()) {
                    List<Vehicle> list = response.body().getData();
                    if (list == null) list = new ArrayList<>();
                    adapter.setList(list);

                    if (list.isEmpty()) {
                        binding.layoutEmpty.setVisibility(View.VISIBLE);
                        binding.rvVehicles.setVisibility(View.GONE);
                    } else {
                        binding.layoutEmpty.setVisibility(View.GONE);
                        binding.rvVehicles.setVisibility(View.VISIBLE);
                    }
                } else {
                    Toast.makeText(VehicleManagementActivity.this, "Không thể tải danh sách phương tiện", Toast.LENGTH_SHORT).show();
                }
            }

            @Override
            public void onFailure(Call<ApiResponse<List<Vehicle>>> call, Throwable t) {
                binding.progressBar.setVisibility(View.GONE);
                binding.swipeRefresh.setRefreshing(false);
                Toast.makeText(VehicleManagementActivity.this, "Lỗi kết nối: " + t.getMessage(), Toast.LENGTH_SHORT).show();
            }
        });
    }

    private void showVehicleOptionsDialog(Vehicle vehicle) {
        String[] options;
        if (vehicle.isDefault()) {
            options = new String[]{"Xoá phương tiện này"};
        } else {
            options = new String[]{"Đặt làm xe mặc định", "Xoá phương tiện này"};
        }

        new AlertDialog.Builder(this)
                .setTitle("Tùy chọn cho " + vehicle.getPlateNumber())
                .setItems(options, (dialog, which) -> {
                    if (vehicle.isDefault()) {
                        // only delete
                        confirmDeleteVehicle(vehicle);
                    } else {
                        if (which == 0) {
                            setDefaultVehicle(vehicle);
                        } else {
                            confirmDeleteVehicle(vehicle);
                        }
                    }
                })
                .show();
    }

    private void setDefaultVehicle(Vehicle vehicle) {
        ApiClient.getApiService(this).setDefaultVehicle(vehicle.getId())
                .enqueue(new Callback<ApiResponse<Void>>() {
                    @Override
                    public void onResponse(Call<ApiResponse<Void>> call, Response<ApiResponse<Void>> response) {
                        if (response.isSuccessful() && response.body() != null && response.body().isSuccess()) {
                            Toast.makeText(VehicleManagementActivity.this, "Đã đặt " + vehicle.getPlateNumber() + " làm xe mặc định", Toast.LENGTH_SHORT).show();
                            loadVehicles();
                        } else {
                            Toast.makeText(VehicleManagementActivity.this, "Thao tác thất bại", Toast.LENGTH_SHORT).show();
                        }
                    }

                    @Override
                    public void onFailure(Call<ApiResponse<Void>> call, Throwable t) {
                        Toast.makeText(VehicleManagementActivity.this, "Lỗi kết nối: " + t.getMessage(), Toast.LENGTH_SHORT).show();
                    }
                });
    }

    private void confirmDeleteVehicle(Vehicle vehicle) {
        new AlertDialog.Builder(this)
                .setTitle("Xác nhận xóa xe")
                .setMessage("Bạn có chắc chắn muốn xóa phương tiện " + vehicle.getPlateNumber() + " khỏi tài khoản?")
                .setPositiveButton("Xóa", (dialog, which) -> deleteVehicle(vehicle))
                .setNegativeButton("Hủy", null)
                .show();
    }

    private void deleteVehicle(Vehicle vehicle) {
        ApiClient.getApiService(this).deleteVehicle(vehicle.getId())
                .enqueue(new Callback<ApiResponse<Void>>() {
                    @Override
                    public void onResponse(Call<ApiResponse<Void>> call, Response<ApiResponse<Void>> response) {
                        if (response.isSuccessful() && response.body() != null && response.body().isSuccess()) {
                            Toast.makeText(VehicleManagementActivity.this, "Đã xóa phương tiện thành công", Toast.LENGTH_SHORT).show();
                            loadVehicles();
                        } else {
                            String msg = (response.body() != null && response.body().getMessage() != null)
                                    ? response.body().getMessage()
                                    : "Không thể xóa phương tiện";
                            Toast.makeText(VehicleManagementActivity.this, msg, Toast.LENGTH_SHORT).show();
                        }
                    }

                    @Override
                    public void onFailure(Call<ApiResponse<Void>> call, Throwable t) {
                        Toast.makeText(VehicleManagementActivity.this, "Lỗi kết nối: " + t.getMessage(), Toast.LENGTH_SHORT).show();
                    }
                });
    }

    private void showAddVehicleDialog() {
        View dialogView = LayoutInflater.from(this).inflate(R.layout.dialog_add_vehicle, null);
        AlertDialog dialog = new AlertDialog.Builder(this)
                .setView(dialogView)
                .create();

        if (dialog.getWindow() != null) {
            dialog.getWindow().setBackgroundDrawableResource(android.R.color.transparent);
        }

        EditText etPlate = dialogView.findViewById(R.id.etPlateNumber);
        EditText etName = dialogView.findViewById(R.id.etVehicleName);
        RadioGroup rgType = dialogView.findViewById(R.id.rgVehicleType);
        RadioButton rbCar = dialogView.findViewById(R.id.rbCar);
        RadioButton rbMotorbike = dialogView.findViewById(R.id.rbMotorbike);
        RadioButton rbElectric = dialogView.findViewById(R.id.rbElectric);

        dialogView.findViewById(R.id.btnCancel).setOnClickListener(v -> dialog.dismiss());

        dialogView.findViewById(R.id.btnSave).setOnClickListener(v -> {
            String plate = etPlate.getText().toString().trim().toUpperCase();
            String name = etName.getText().toString().trim();

            if (plate.isEmpty()) {
                etPlate.setError("Vui lòng nhập biển số xe");
                return;
            }

            String type = "CAR";
            if (rbMotorbike.isChecked()) {
                type = "MOTORBIKE";
            } else if (rbElectric.isChecked()) {
                type = "CAR";
                if (name.isEmpty()) {
                    name = "Ô tô điện";
                } else if (!name.toLowerCase().contains("điện")) {
                    name = name + " (Xe điện)";
                }
            }

            Map<String, String> body = new HashMap<>();
            body.put("plate_number", plate);
            body.put("vehicle_type", type);
            if (!name.isEmpty()) {
                body.put("vehicle_name", name);
            }

            dialog.dismiss();
            binding.progressBar.setVisibility(View.VISIBLE);

            ApiClient.getApiService(this).createVehicle(body)
                    .enqueue(new Callback<ApiResponse<Vehicle>>() {
                        @Override
                        public void onResponse(Call<ApiResponse<Vehicle>> call, Response<ApiResponse<Vehicle>> response) {
                            binding.progressBar.setVisibility(View.GONE);
                            if (response.isSuccessful() && response.body() != null && response.body().isSuccess()) {
                                Toast.makeText(VehicleManagementActivity.this, "Đã thêm phương tiện thành công", Toast.LENGTH_SHORT).show();
                                loadVehicles();
                            } else {
                                String msg = (response.body() != null && response.body().getMessage() != null)
                                        ? response.body().getMessage()
                                        : "Không thể thêm xe. Biển số có thể đã tồn tại.";
                                Toast.makeText(VehicleManagementActivity.this, msg, Toast.LENGTH_SHORT).show();
                            }
                        }

                        @Override
                        public void onFailure(Call<ApiResponse<Vehicle>> call, Throwable t) {
                            binding.progressBar.setVisibility(View.GONE);
                            Toast.makeText(VehicleManagementActivity.this, "Lỗi kết nối: " + t.getMessage(), Toast.LENGTH_SHORT).show();
                        }
                    });
        });

        dialog.show();
    }
}
