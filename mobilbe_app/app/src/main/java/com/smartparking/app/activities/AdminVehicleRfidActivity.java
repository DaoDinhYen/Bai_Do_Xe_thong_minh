package com.smartparking.app.activities;

import android.app.Dialog;
import android.graphics.Color;
import android.graphics.drawable.ColorDrawable;
import android.os.Bundle;
import android.text.Editable;
import android.text.TextWatcher;
import android.view.ViewGroup;
import android.view.Window;
import android.widget.EditText;
import android.widget.ImageView;
import android.widget.TextView;
import android.widget.Toast;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.content.ContextCompat;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;
import androidx.swiperefreshlayout.widget.SwipeRefreshLayout;
import com.google.android.material.button.MaterialButton;
import com.smartparking.app.R;
import com.smartparking.app.adapters.AdminRfidAdapter;
import com.smartparking.app.adapters.VehicleAdapter;
import com.smartparking.app.models.ApiResponse;
import com.smartparking.app.models.RfidCard;
import com.smartparking.app.models.Vehicle;
import com.smartparking.app.network.ApiClient;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;

public class AdminVehicleRfidActivity extends AppCompatActivity implements AdminRfidAdapter.RfidActionListener {

    private SwipeRefreshLayout swipeRefresh;
    private TextView tabVehicles, tabRfid;
    private EditText edtSearch;
    private RecyclerView rvList;
    private TextView tvEmpty;

    private VehicleAdapter vehicleAdapter;
    private AdminRfidAdapter rfidAdapter;

    private boolean isShowingVehicles = true;
    private List<Vehicle> allVehicles = new ArrayList<>();
    private List<RfidCard> allCards = new ArrayList<>();

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_admin_vehicle_rfid);

        ImageView btnBack = findViewById(R.id.btn_back_vehicle_rfid);
        btnBack.setOnClickListener(v -> finish());

        ImageView btnAddRfid = findViewById(R.id.btn_add_rfid);
        btnAddRfid.setOnClickListener(v -> showRegisterRfidDialog());

        tabVehicles = findViewById(R.id.tab_vr_vehicles);
        tabRfid = findViewById(R.id.tab_vr_rfid);
        edtSearch = findViewById(R.id.edt_search_vehicle_rfid);
        rvList = findViewById(R.id.rv_admin_vehicle_rfid);
        tvEmpty = findViewById(R.id.tv_empty_vehicle_rfid);
        swipeRefresh = findViewById(R.id.swipe_refresh_vehicle_rfid);

        rvList.setLayoutManager(new LinearLayoutManager(this));
        vehicleAdapter = new VehicleAdapter(this, null);
        rfidAdapter = new AdminRfidAdapter(this);

        tabVehicles.setOnClickListener(v -> switchTab(true));
        tabRfid.setOnClickListener(v -> switchTab(false));

        edtSearch.addTextChangedListener(new TextWatcher() {
            @Override
            public void beforeTextChanged(CharSequence s, int start, int count, int after) {}

            @Override
            public void onTextChanged(CharSequence s, int start, int count, int after) {
                applySearch(s.toString().trim());
            }

            @Override
            public void afterTextChanged(Editable s) {}
        });

        swipeRefresh.setOnRefreshListener(this::loadCurrentData);

        switchTab(true);
    }

    private void switchTab(boolean showVehicles) {
        isShowingVehicles = showVehicles;

        tabVehicles.setBackgroundResource(0);
        tabVehicles.setTextColor(ContextCompat.getColor(this, R.color.text_secondary));
        tabRfid.setBackgroundResource(0);
        tabRfid.setTextColor(ContextCompat.getColor(this, R.color.text_secondary));

        if (showVehicles) {
            tabVehicles.setBackgroundResource(R.drawable.bg_badge_blue);
            tabVehicles.setTextColor(ContextCompat.getColor(this, R.color.primary));
            rvList.setAdapter(vehicleAdapter);
            edtSearch.setHint("Tìm theo biển số, tên xe...");
        } else {
            tabRfid.setBackgroundResource(R.drawable.bg_badge_blue);
            tabRfid.setTextColor(ContextCompat.getColor(this, R.color.primary));
            rvList.setAdapter(rfidAdapter);
            edtSearch.setHint("Tìm mã thẻ UID, chủ xe...");
        }

        loadCurrentData();
    }

    private void loadCurrentData() {
        if (isShowingVehicles) {
            loadVehicles();
        } else {
            loadRfidCards();
        }
    }

    private void loadVehicles() {
        swipeRefresh.setRefreshing(true);
        ApiClient.getApiService(this).getAllVehiclesAdmin(1, 100, null).enqueue(new Callback<ApiResponse<List<Vehicle>>>() {
            @Override
            public void onResponse(Call<ApiResponse<List<Vehicle>>> call, Response<ApiResponse<List<Vehicle>>> response) {
                swipeRefresh.setRefreshing(false);
                if (response.isSuccessful() && response.body() != null && response.body().isSuccess()) {
                    List<Vehicle> list = response.body().getData();
                    if (list != null) {
                        allVehicles = list;
                        applySearch(edtSearch.getText().toString().trim());
                    }
                }
            }

            @Override
            public void onFailure(Call<ApiResponse<List<Vehicle>>> call, Throwable t) {
                swipeRefresh.setRefreshing(false);
                Toast.makeText(AdminVehicleRfidActivity.this, "Lỗi tải xe: " + t.getMessage(), Toast.LENGTH_SHORT).show();
            }
        });
    }

    private void loadRfidCards() {
        swipeRefresh.setRefreshing(true);
        ApiClient.getApiService(this).getAllRfidCards(1, 100).enqueue(new Callback<ApiResponse<List<RfidCard>>>() {
            @Override
            public void onResponse(Call<ApiResponse<List<RfidCard>>> call, Response<ApiResponse<List<RfidCard>>> response) {
                swipeRefresh.setRefreshing(false);
                if (response.isSuccessful() && response.body() != null && response.body().isSuccess()) {
                    List<RfidCard> list = response.body().getData();
                    if (list != null) {
                        allCards = list;
                        applySearch(edtSearch.getText().toString().trim());
                    }
                }
            }

            @Override
            public void onFailure(Call<ApiResponse<List<RfidCard>>> call, Throwable t) {
                swipeRefresh.setRefreshing(false);
                Toast.makeText(AdminVehicleRfidActivity.this, "Lỗi tải thẻ: " + t.getMessage(), Toast.LENGTH_SHORT).show();
            }
        });
    }

    private void applySearch(String query) {
        if (isShowingVehicles) {
            if (query.isEmpty()) {
                vehicleAdapter.setList(allVehicles);
                updateEmpty(allVehicles.isEmpty());
                return;
            }
            List<Vehicle> filtered = new ArrayList<>();
            for (Vehicle v : allVehicles) {
                if (v.getPlateNumber().toUpperCase().contains(query.toUpperCase())
                        || v.getVehicleName().toUpperCase().contains(query.toUpperCase())) {
                    filtered.add(v);
                }
            }
            vehicleAdapter.setList(filtered);
            updateEmpty(filtered.isEmpty());
        } else {
            if (query.isEmpty()) {
                rfidAdapter.setCards(allCards);
                updateEmpty(allCards.isEmpty());
                return;
            }
            List<RfidCard> filtered = new ArrayList<>();
            for (RfidCard c : allCards) {
                if (c.getUid().toUpperCase().contains(query.toUpperCase())
                        || c.getPlateNumber().toUpperCase().contains(query.toUpperCase())
                        || c.getOwnerName().toUpperCase().contains(query.toUpperCase())) {
                    filtered.add(c);
                }
            }
            rfidAdapter.setCards(filtered);
            updateEmpty(filtered.isEmpty());
        }
    }

    private void updateEmpty(boolean empty) {
        tvEmpty.setVisibility(empty ? android.view.View.VISIBLE : android.view.View.GONE);
        rvList.setVisibility(empty ? android.view.View.GONE : android.view.View.VISIBLE);
    }

    @Override
    public void onToggleRfidStatus(RfidCard card) {
        String newStatus = "ACTIVE".equalsIgnoreCase(card.getStatus()) ? "BLOCKED" : "ACTIVE";
        Map<String, String> body = new HashMap<>();
        body.put("status", newStatus);

        ApiClient.getApiService(this).setRfidCardStatus(card.getId(), body).enqueue(new Callback<ApiResponse<Void>>() {
            @Override
            public void onResponse(Call<ApiResponse<Void>> call, Response<ApiResponse<Void>> response) {
                if (response.isSuccessful()) {
                    card.setStatus(newStatus);
                    rfidAdapter.notifyDataSetChanged();
                    Toast.makeText(AdminVehicleRfidActivity.this,
                            "ACTIVE".equals(newStatus) ? "Đã mở khóa thẻ RFID!" : "Đã khóa thẻ RFID!",
                            Toast.LENGTH_SHORT).show();
                } else {
                    Toast.makeText(AdminVehicleRfidActivity.this, "Không thể cập nhật thẻ", Toast.LENGTH_SHORT).show();
                }
            }

            @Override
            public void onFailure(Call<ApiResponse<Void>> call, Throwable t) {
                Toast.makeText(AdminVehicleRfidActivity.this, "Lỗi: " + t.getMessage(), Toast.LENGTH_SHORT).show();
            }
        });
    }

    private void showRegisterRfidDialog() {
        Dialog dialog = new Dialog(this);
        dialog.requestWindowFeature(Window.FEATURE_NO_TITLE);
        dialog.setContentView(R.layout.dialog_admin_register_rfid);
        if (dialog.getWindow() != null) {
            dialog.getWindow().setBackgroundDrawable(new ColorDrawable(Color.TRANSPARENT));
            dialog.getWindow().setLayout(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        }

        EditText edtUid = dialog.findViewById(R.id.edt_rfid_uid);
        EditText edtVehicleId = dialog.findViewById(R.id.edt_rfid_vehicle_id);
        MaterialButton btnCancel = dialog.findViewById(R.id.btn_cancel_rfid);
        MaterialButton btnConfirm = dialog.findViewById(R.id.btn_confirm_rfid);

        btnCancel.setOnClickListener(v -> dialog.dismiss());

        btnConfirm.setOnClickListener(v -> {
            String uid = edtUid.getText().toString().trim();
            String vIdStr = edtVehicleId.getText().toString().trim();

            if (uid.isEmpty()) {
                edtUid.setError("Vui lòng nhập UID thẻ");
                return;
            }
            if (vIdStr.isEmpty()) {
                edtVehicleId.setError("Vui lòng nhập ID phương tiện");
                return;
            }

            int vehicleId;
            try {
                vehicleId = Integer.parseInt(vIdStr);
            } catch (Exception e) {
                edtVehicleId.setError("ID phương tiện không hợp lệ");
                return;
            }

            Map<String, Object> body = new HashMap<>();
            body.put("uid", uid);
            body.put("vehicle_id", vehicleId);

            ApiClient.getApiService(this).registerRfidCard(body).enqueue(new Callback<ApiResponse<RfidCard>>() {
                @Override
                public void onResponse(Call<ApiResponse<RfidCard>> call, Response<ApiResponse<RfidCard>> response) {
                    dialog.dismiss();
                    if (response.isSuccessful()) {
                        Toast.makeText(AdminVehicleRfidActivity.this, "Đăng ký thẻ RFID thành công!", Toast.LENGTH_SHORT).show();
                        if (!isShowingVehicles) {
                            loadRfidCards();
                        } else {
                            switchTab(false);
                        }
                    } else {
                        String msg = response.body() != null && response.body().getMessage() != null
                                ? response.body().getMessage()
                                : "Không thể đăng ký thẻ (Mã xe không tồn tại hoặc thẻ đã dùng)";
                        Toast.makeText(AdminVehicleRfidActivity.this, msg, Toast.LENGTH_LONG).show();
                    }
                }

                @Override
                public void onFailure(Call<ApiResponse<RfidCard>> call, Throwable t) {
                    dialog.dismiss();
                    Toast.makeText(AdminVehicleRfidActivity.this, "Lỗi: " + t.getMessage(), Toast.LENGTH_SHORT).show();
                }
            });
        });

        dialog.show();
    }
}
