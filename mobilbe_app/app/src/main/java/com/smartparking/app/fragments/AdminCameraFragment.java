package com.smartparking.app.fragments;

import android.os.Bundle;
import android.text.Editable;
import android.text.TextWatcher;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.EditText;
import android.widget.ImageView;
import android.widget.TextView;
import android.widget.Toast;
import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.fragment.app.Fragment;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;
import androidx.swiperefreshlayout.widget.SwipeRefreshLayout;
import com.smartparking.app.R;
import com.smartparking.app.adapters.AdminCameraRecordAdapter;
import com.smartparking.app.models.ApiResponse;
import com.smartparking.app.models.CameraRecord;
import com.smartparking.app.network.ApiClient;
import java.util.ArrayList;
import java.util.List;
import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;

public class AdminCameraFragment extends Fragment {

    private SwipeRefreshLayout swipeRefresh;
    private TextView tvCamInLastPlate, tvCamOutLastPlate;
    private EditText edtSearch;
    private RecyclerView rvRecords;
    private TextView tvEmpty;
    private AdminCameraRecordAdapter adapter;

    private List<CameraRecord> allRecords = new ArrayList<>();

    @Nullable
    @Override
    public View onCreateView(@NonNull LayoutInflater inflater, @Nullable ViewGroup container, @Nullable Bundle savedInstanceState) {
        View v = inflater.inflate(R.layout.fragment_admin_camera, container, false);

        swipeRefresh = v.findViewById(R.id.swipe_refresh_camera);
        tvCamInLastPlate = v.findViewById(R.id.tv_cam_in_last_plate);
        tvCamOutLastPlate = v.findViewById(R.id.tv_cam_out_last_plate);
        edtSearch = v.findViewById(R.id.edt_search_camera);
        rvRecords = v.findViewById(R.id.rv_admin_camera_records);
        tvEmpty = v.findViewById(R.id.tv_empty_camera);

        rvRecords.setLayoutManager(new LinearLayoutManager(getContext()));
        adapter = new AdminCameraRecordAdapter();
        rvRecords.setAdapter(adapter);

        ImageView btnRefresh = v.findViewById(R.id.btn_refresh_camera);
        btnRefresh.setOnClickListener(view -> loadCameraRecords());

        edtSearch.addTextChangedListener(new TextWatcher() {
            @Override
            public void beforeTextChanged(CharSequence s, int start, int count, int after) {}

            @Override
            public void onTextChanged(CharSequence s, int start, int count, int after) {
                filterRecords(s.toString().trim());
            }

            @Override
            public void afterTextChanged(Editable s) {}
        });

        swipeRefresh.setOnRefreshListener(this::loadCameraRecords);

        return v;
    }

    @Override
    public void onViewCreated(@NonNull View view, @Nullable Bundle savedInstanceState) {
        super.onViewCreated(view, savedInstanceState);
        loadCameraRecords();
    }

    @Override
    public void onResume() {
        super.onResume();
        loadCameraRecords();
    }

    private void loadCameraRecords() {
        if (getContext() == null) return;
        swipeRefresh.setRefreshing(true);

        ApiClient.getApiService(requireContext()).getCameraRecords(1, 50, null, null).enqueue(new Callback<ApiResponse<List<CameraRecord>>>() {
            @Override
            public void onResponse(Call<ApiResponse<List<CameraRecord>>> call, Response<ApiResponse<List<CameraRecord>>> response) {
                if (isAdded()) swipeRefresh.setRefreshing(false);
                if (response.isSuccessful() && response.body() != null && response.body().isSuccess()) {
                    List<CameraRecord> list = response.body().getData();
                    if (list != null && isAdded()) {
                        allRecords = list;
                        updateLatestGatePlates(list);
                        filterRecords(edtSearch.getText().toString().trim());
                    }
                }
            }

            @Override
            public void onFailure(Call<ApiResponse<List<CameraRecord>>> call, Throwable t) {
                if (isAdded()) {
                    swipeRefresh.setRefreshing(false);
                    Toast.makeText(getContext(), "Không thể tải nhật ký camera: " + t.getMessage(), Toast.LENGTH_SHORT).show();
                }
            }
        });
    }

    private void updateLatestGatePlates(List<CameraRecord> list) {
        String lastIn = "Chưa có lượt quét";
        String lastOut = "Chưa có lượt quét";

        for (CameraRecord r : list) {
            if ("IN".equalsIgnoreCase(r.getDirection()) && lastIn.equals("Chưa có lượt quét")) {
                lastIn = "Vừa quét: " + r.getPlateNumber();
            } else if ("OUT".equalsIgnoreCase(r.getDirection()) && lastOut.equals("Chưa có lượt quét")) {
                lastOut = "Vừa quét: " + r.getPlateNumber();
            }
        }
        tvCamInLastPlate.setText(lastIn);
        tvCamOutLastPlate.setText(lastOut);
    }

    private void filterRecords(String query) {
        if (query.isEmpty()) {
            adapter.setRecords(allRecords);
            tvEmpty.setVisibility(allRecords.isEmpty() ? View.VISIBLE : View.GONE);
            rvRecords.setVisibility(allRecords.isEmpty() ? View.GONE : View.VISIBLE);
            return;
        }

        List<CameraRecord> filtered = new ArrayList<>();
        for (CameraRecord r : allRecords) {
            if (r.getPlateNumber().toUpperCase().contains(query.toUpperCase())) {
                filtered.add(r);
            }
        }
        adapter.setRecords(filtered);
        tvEmpty.setVisibility(filtered.isEmpty() ? View.VISIBLE : View.GONE);
        rvRecords.setVisibility(filtered.isEmpty() ? View.GONE : View.VISIBLE);
    }
}
