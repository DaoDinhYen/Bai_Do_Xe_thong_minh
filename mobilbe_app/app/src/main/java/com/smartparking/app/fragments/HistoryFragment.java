package com.smartparking.app.fragments;

import android.content.Intent;
import android.os.Bundle;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.Toast;
import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.fragment.app.Fragment;
import androidx.recyclerview.widget.LinearLayoutManager;
import com.google.android.material.tabs.TabLayout;
import com.smartparking.app.R;
import com.smartparking.app.activities.BookingDetailActivity;
import com.smartparking.app.adapters.BookingHistoryAdapter;
import com.smartparking.app.adapters.ParkingHistoryAdapter;
import com.smartparking.app.adapters.TransactionAdapter;
import com.smartparking.app.databinding.FragmentHistoryBinding;
import com.smartparking.app.models.ApiResponse;
import com.smartparking.app.models.Booking;
import com.smartparking.app.models.ParkingHistory;
import com.smartparking.app.models.Transaction;
import com.smartparking.app.network.ApiClient;
import java.util.ArrayList;
import java.util.List;
import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;

public class HistoryFragment extends Fragment {

    private FragmentHistoryBinding binding;
    private BookingHistoryAdapter bookingAdapter;
    private ParkingHistoryAdapter parkingAdapter;
    private TransactionAdapter transactionAdapter;
    private int currentTab = 0; // 0: Booking, 1: Parking, 2: Transactions

    @Nullable
    @Override
    public View onCreateView(@NonNull LayoutInflater inflater, @Nullable ViewGroup container, @Nullable Bundle savedInstanceState) {
        binding = FragmentHistoryBinding.inflate(inflater, container, false);
        return binding.getRoot();
    }

    @Override
    public void onViewCreated(@NonNull View view, @Nullable Bundle savedInstanceState) {
        super.onViewCreated(view, savedInstanceState);

        initViews();
        setupTabs();
        setupListeners();
        loadCurrentTabData();
    }

    private void initViews() {
        binding.rvHistory.setLayoutManager(new LinearLayoutManager(getContext()));

        bookingAdapter = new BookingHistoryAdapter(requireContext(), booking -> {
            Intent intent = new Intent(getContext(), BookingDetailActivity.class);
            intent.putExtra(BookingDetailActivity.EXTRA_BOOKING_ID, booking.getId());
            startActivity(intent);
        });

        parkingAdapter = new ParkingHistoryAdapter(requireContext());
        transactionAdapter = new TransactionAdapter(requireContext());

        binding.swipeRefresh.setColorSchemeResources(R.color.primary);
    }

    private void setupTabs() {
        binding.tabLayout.addTab(binding.tabLayout.newTab().setText("Đặt chỗ"));
        binding.tabLayout.addTab(binding.tabLayout.newTab().setText("Lượt gửi xe"));
        binding.tabLayout.addTab(binding.tabLayout.newTab().setText("Giao dịch ví"));

        binding.tabLayout.addOnTabSelectedListener(new TabLayout.OnTabSelectedListener() {
            @Override
            public void onTabSelected(TabLayout.Tab tab) {
                currentTab = tab.getPosition();
                loadCurrentTabData();
            }

            @Override
            public void onTabUnselected(TabLayout.Tab tab) {}

            @Override
            public void onTabReselected(TabLayout.Tab tab) {
                loadCurrentTabData();
            }
        });
    }

    private void setupListeners() {
        binding.swipeRefresh.setOnRefreshListener(this::loadCurrentTabData);
    }

    @Override
    public void onResume() {
        super.onResume();
        loadCurrentTabData();
    }

    @Override
    public void onHiddenChanged(boolean hidden) {
        super.onHiddenChanged(hidden);
        if (!hidden) {
            loadCurrentTabData();
        }
    }

    private void loadCurrentTabData() {
        if (!isAdded()) return;

        if (!binding.swipeRefresh.isRefreshing()) {
            binding.progressBar.setVisibility(View.VISIBLE);
        }
        binding.layoutEmpty.setVisibility(View.GONE);

        if (currentTab == 0) {
            binding.rvHistory.setAdapter(bookingAdapter);
            loadBookings();
        } else if (currentTab == 1) {
            binding.rvHistory.setAdapter(parkingAdapter);
            loadParkingHistory();
        } else {
            binding.rvHistory.setAdapter(transactionAdapter);
            loadTransactions();
        }
    }

    private void loadBookings() {
        ApiClient.getApiService(getContext()).getMyBookings(1, 50, null)
                .enqueue(new Callback<ApiResponse<List<Booking>>>() {
                    @Override
                    public void onResponse(Call<ApiResponse<List<Booking>>> call, Response<ApiResponse<List<Booking>>> response) {
                        if (!isAdded()) return;
                        binding.progressBar.setVisibility(View.GONE);
                        binding.swipeRefresh.setRefreshing(false);

                        if (response.isSuccessful() && response.body() != null && response.body().isSuccess()) {
                            List<Booking> list = response.body().getData();
                            if (list == null) list = new ArrayList<>();
                            bookingAdapter.setBookings(list);

                            if (list.isEmpty()) {
                                showEmpty("Chưa có lượt đặt chỗ nào", "Bạn có thể tìm kiếm và đặt trước chỗ đỗ tại tab Đặt chỗ.");
                            } else {
                                hideEmpty();
                            }
                        } else {
                            showToast("Không thể tải lịch sử đặt chỗ");
                        }
                    }

                    @Override
                    public void onFailure(Call<ApiResponse<List<Booking>>> call, Throwable t) {
                        if (!isAdded()) return;
                        binding.progressBar.setVisibility(View.GONE);
                        binding.swipeRefresh.setRefreshing(false);
                        showToast("Lỗi kết nối: " + t.getMessage());
                    }
                });
    }

    private void loadParkingHistory() {
        ApiClient.getApiService(getContext()).getMyHistory(1, 50)
                .enqueue(new Callback<ApiResponse<List<ParkingHistory>>>() {
                    @Override
                    public void onResponse(Call<ApiResponse<List<ParkingHistory>>> call, Response<ApiResponse<List<ParkingHistory>>> response) {
                        if (!isAdded()) return;
                        binding.progressBar.setVisibility(View.GONE);
                        binding.swipeRefresh.setRefreshing(false);

                        if (response.isSuccessful() && response.body() != null && response.body().isSuccess()) {
                            List<ParkingHistory> list = response.body().getData();
                            if (list == null) list = new ArrayList<>();
                            parkingAdapter.setList(list);

                            if (list.isEmpty()) {
                                showEmpty("Chưa có lượt gửi xe nào", "Lịch sử vào/ra bãi xe sẽ được tự động ghi nhận khi bạn gửi xe.");
                            } else {
                                hideEmpty();
                            }
                        } else {
                            showToast("Không thể tải lịch sử gửi xe");
                        }
                    }

                    @Override
                    public void onFailure(Call<ApiResponse<List<ParkingHistory>>> call, Throwable t) {
                        if (!isAdded()) return;
                        binding.progressBar.setVisibility(View.GONE);
                        binding.swipeRefresh.setRefreshing(false);
                        showToast("Lỗi kết nối: " + t.getMessage());
                    }
                });
    }

    private void loadTransactions() {
        ApiClient.getApiService(getContext()).getMyTransactions(1, 50, null)
                .enqueue(new Callback<ApiResponse<List<Transaction>>>() {
                    @Override
                    public void onResponse(Call<ApiResponse<List<Transaction>>> call, Response<ApiResponse<List<Transaction>>> response) {
                        if (!isAdded()) return;
                        binding.progressBar.setVisibility(View.GONE);
                        binding.swipeRefresh.setRefreshing(false);

                        if (response.isSuccessful() && response.body() != null && response.body().isSuccess()) {
                            List<Transaction> list = response.body().getData();
                            if (list == null) list = new ArrayList<>();
                            transactionAdapter.setList(list);

                            if (list.isEmpty()) {
                                showEmpty("Chưa có giao dịch ví nào", "Các biến động số dư nạp tiền và phí gửi xe sẽ hiển thị ở đây.");
                            } else {
                                hideEmpty();
                            }
                        } else {
                            showToast("Không thể tải lịch sử giao dịch");
                        }
                    }

                    @Override
                    public void onFailure(Call<ApiResponse<List<Transaction>>> call, Throwable t) {
                        if (!isAdded()) return;
                        binding.progressBar.setVisibility(View.GONE);
                        binding.swipeRefresh.setRefreshing(false);
                        showToast("Lỗi kết nối: " + t.getMessage());
                    }
                });
    }

    private void showEmpty(String title, String desc) {
        binding.tvEmptyTitle.setText(title);
        binding.tvEmptyDesc.setText(desc);
        binding.layoutEmpty.setVisibility(View.VISIBLE);
        binding.rvHistory.setVisibility(View.GONE);
    }

    private void hideEmpty() {
        binding.layoutEmpty.setVisibility(View.GONE);
        binding.rvHistory.setVisibility(View.VISIBLE);
    }

    private void showToast(String msg) {
        if (getContext() != null) {
            Toast.makeText(getContext(), msg, Toast.LENGTH_SHORT).show();
        }
    }

    @Override
    public void onDestroyView() {
        super.onDestroyView();
        binding = null;
    }
}
