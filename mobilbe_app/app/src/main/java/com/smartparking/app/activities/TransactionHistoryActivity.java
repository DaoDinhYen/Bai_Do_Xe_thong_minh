package com.smartparking.app.activities;

import android.content.res.ColorStateList;
import android.os.Bundle;
import android.view.View;
import android.widget.Toast;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.content.ContextCompat;
import androidx.recyclerview.widget.LinearLayoutManager;
import com.google.android.material.chip.Chip;
import com.smartparking.app.R;
import com.smartparking.app.adapters.TransactionAdapter;
import com.smartparking.app.databinding.ActivityTransactionHistoryBinding;
import com.smartparking.app.models.ApiResponse;
import com.smartparking.app.models.Transaction;
import com.smartparking.app.network.ApiClient;
import java.util.ArrayList;
import java.util.List;
import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;

public class TransactionHistoryActivity extends AppCompatActivity {

    private ActivityTransactionHistoryBinding binding;
    private TransactionAdapter adapter;
    private String currentFilter = null; // null means ALL

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        binding = ActivityTransactionHistoryBinding.inflate(getLayoutInflater());
        setContentView(binding.getRoot());

        initViews();
        setupListeners();
        loadTransactions();
    }

    private void initViews() {
        binding.rvTransactions.setLayoutManager(new LinearLayoutManager(this));
        adapter = new TransactionAdapter(this);
        binding.rvTransactions.setAdapter(adapter);

        binding.swipeRefresh.setColorSchemeResources(R.color.primary);
    }

    private void setupListeners() {
        binding.btnBack.setOnClickListener(v -> finish());

        binding.swipeRefresh.setOnRefreshListener(this::loadTransactions);

        binding.chipGroupFilter.setOnCheckedStateChangeListener((group, checkedIds) -> {
            if (checkedIds.isEmpty()) return;
            int id = checkedIds.get(0);

            // Reset chip visual styles
            updateChipSelection(id);

            if (id == R.id.chipAll) {
                currentFilter = null;
            } else if (id == R.id.chipTopup) {
                currentFilter = "TOP_UP";
            } else if (id == R.id.chipParkingFee) {
                currentFilter = "PARKING_PAYMENT";
            } else if (id == R.id.chipBookingPayment) {
                currentFilter = "BOOKING_PAYMENT";
            } else if (id == R.id.chipRefund) {
                currentFilter = "REFUND";
            }
            loadTransactions();
        });
    }

    private void updateChipSelection(int selectedId) {
        int primaryColor = ContextCompat.getColor(this, R.color.primary);
        int whiteColor = ContextCompat.getColor(this, R.color.white);
        int grayTextColor = ContextCompat.getColor(this, R.color.text_primary);
        int surfaceColor = ContextCompat.getColor(this, R.color.input_bg);

        Chip[] chips = new Chip[]{binding.chipAll, binding.chipTopup, binding.chipParkingFee, binding.chipBookingPayment, binding.chipRefund};
        for (Chip c : chips) {
            if (c.getId() == selectedId) {
                c.setChipBackgroundColor(ColorStateList.valueOf(primaryColor));
                c.setTextColor(whiteColor);
            } else {
                c.setChipBackgroundColor(ColorStateList.valueOf(surfaceColor));
                c.setTextColor(grayTextColor);
            }
        }
    }

    private void loadTransactions() {
        if (!binding.swipeRefresh.isRefreshing()) {
            binding.progressBar.setVisibility(View.VISIBLE);
        }
        binding.layoutEmpty.setVisibility(View.GONE);

        ApiClient.getApiService(this).getMyTransactions(1, 50, currentFilter)
                .enqueue(new Callback<ApiResponse<List<Transaction>>>() {
                    @Override
                    public void onResponse(Call<ApiResponse<List<Transaction>>> call, Response<ApiResponse<List<Transaction>>> response) {
                        binding.progressBar.setVisibility(View.GONE);
                        binding.swipeRefresh.setRefreshing(false);

                        if (response.isSuccessful() && response.body() != null && response.body().isSuccess()) {
                            List<Transaction> list = response.body().getData();
                            if (list == null) list = new ArrayList<>();
                            adapter.setList(list);

                            if (list.isEmpty()) {
                                binding.layoutEmpty.setVisibility(View.VISIBLE);
                                binding.rvTransactions.setVisibility(View.GONE);
                            } else {
                                binding.layoutEmpty.setVisibility(View.GONE);
                                binding.rvTransactions.setVisibility(View.VISIBLE);
                            }
                        } else {
                            Toast.makeText(TransactionHistoryActivity.this, "Không thể tải danh sách giao dịch", Toast.LENGTH_SHORT).show();
                        }
                    }

                    @Override
                    public void onFailure(Call<ApiResponse<List<Transaction>>> call, Throwable t) {
                        binding.progressBar.setVisibility(View.GONE);
                        binding.swipeRefresh.setRefreshing(false);
                        Toast.makeText(TransactionHistoryActivity.this, "Lỗi kết nối: " + t.getMessage(), Toast.LENGTH_SHORT).show();
                    }
                });
    }
}
