package com.smartparking.app.activities;

import android.os.Bundle;
import android.text.Editable;
import android.text.TextWatcher;
import android.widget.EditText;
import android.widget.ImageView;
import android.widget.TextView;
import android.widget.Toast;
import androidx.appcompat.app.AppCompatActivity;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;
import androidx.swiperefreshlayout.widget.SwipeRefreshLayout;
import com.smartparking.app.R;
import com.smartparking.app.adapters.AdminSystemLogAdapter;
import com.smartparking.app.models.ApiResponse;
import com.smartparking.app.models.SystemLog;
import com.smartparking.app.network.ApiClient;
import java.util.ArrayList;
import java.util.List;
import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;

public class AdminSystemLogsActivity extends AppCompatActivity {

    private SwipeRefreshLayout swipeRefresh;
    private EditText edtSearch;
    private RecyclerView rvLogs;
    private TextView tvEmpty;
    private AdminSystemLogAdapter adapter;

    private List<SystemLog> allLogs = new ArrayList<>();

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_admin_system_logs);

        ImageView btnBack = findViewById(R.id.btn_back_logs);
        btnBack.setOnClickListener(v -> finish());

        swipeRefresh = findViewById(R.id.swipe_refresh_logs);
        edtSearch = findViewById(R.id.edt_search_logs);
        rvLogs = findViewById(R.id.rv_admin_system_logs);
        tvEmpty = findViewById(R.id.tv_empty_logs);

        rvLogs.setLayoutManager(new LinearLayoutManager(this));
        adapter = new AdminSystemLogAdapter();
        rvLogs.setAdapter(adapter);

        edtSearch.addTextChangedListener(new TextWatcher() {
            @Override
            public void beforeTextChanged(CharSequence s, int start, int count, int after) {}

            @Override
            public void onTextChanged(CharSequence s, int start, int count, int after) {
                filterLogs(s.toString().trim());
            }

            @Override
            public void afterTextChanged(Editable s) {}
        });

        swipeRefresh.setOnRefreshListener(this::loadLogs);

        loadLogs();
    }

    private void loadLogs() {
        swipeRefresh.setRefreshing(true);
        ApiClient.getApiService(this).getSystemLogs(1, 100, null).enqueue(new Callback<ApiResponse<List<SystemLog>>>() {
            @Override
            public void onResponse(Call<ApiResponse<List<SystemLog>>> call, Response<ApiResponse<List<SystemLog>>> response) {
                swipeRefresh.setRefreshing(false);
                if (response.isSuccessful() && response.body() != null && response.body().isSuccess()) {
                    List<SystemLog> list = response.body().getData();
                    if (list != null) {
                        allLogs = list;
                        filterLogs(edtSearch.getText().toString().trim());
                    }
                }
            }

            @Override
            public void onFailure(Call<ApiResponse<List<SystemLog>>> call, Throwable t) {
                swipeRefresh.setRefreshing(false);
                Toast.makeText(AdminSystemLogsActivity.this, "Lỗi tải nhật ký: " + t.getMessage(), Toast.LENGTH_SHORT).show();
            }
        });
    }

    private void filterLogs(String query) {
        if (query.isEmpty()) {
            adapter.setLogs(allLogs);
            tvEmpty.setVisibility(allLogs.isEmpty() ? android.view.View.VISIBLE : android.view.View.GONE);
            rvLogs.setVisibility(allLogs.isEmpty() ? android.view.View.GONE : android.view.View.VISIBLE);
            return;
        }

        List<SystemLog> filtered = new ArrayList<>();
        for (SystemLog l : allLogs) {
            if (l.getAction().toUpperCase().contains(query.toUpperCase())
                    || l.getDescription().toUpperCase().contains(query.toUpperCase())
                    || l.getIpAddress().contains(query)) {
                filtered.add(l);
            }
        }
        adapter.setLogs(filtered);
        tvEmpty.setVisibility(filtered.isEmpty() ? android.view.View.VISIBLE : android.view.View.GONE);
        rvLogs.setVisibility(filtered.isEmpty() ? android.view.View.GONE : android.view.View.VISIBLE);
    }
}
