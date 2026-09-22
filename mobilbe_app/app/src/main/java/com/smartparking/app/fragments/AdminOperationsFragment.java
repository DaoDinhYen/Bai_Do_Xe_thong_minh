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
import androidx.core.content.ContextCompat;
import androidx.fragment.app.Fragment;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;
import androidx.swiperefreshlayout.widget.SwipeRefreshLayout;
import com.smartparking.app.R;
import com.smartparking.app.adapters.BookingHistoryAdapter;
import com.smartparking.app.adapters.ParkingHistoryAdapter;
import com.smartparking.app.adapters.TransactionAdapter;
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

public class AdminOperationsFragment extends Fragment {

    private SwipeRefreshLayout swipeRefresh;
    private TextView tabHistory, tabBooking, tabTransaction;
    private EditText edtSearch;
    private RecyclerView rvOperations;
    private TextView tvEmpty;

    private ParkingHistoryAdapter historyAdapter;
    private BookingHistoryAdapter bookingAdapter;
    private TransactionAdapter transactionAdapter;

    private int currentTab = 0; // 0: History, 1: Booking, 2: Transaction
    private List<ParkingHistory> allHistory = new ArrayList<>();
    private List<Booking> allBookings = new ArrayList<>();
    private List<Transaction> allTransactions = new ArrayList<>();

    @Nullable
    @Override
    public View onCreateView(@NonNull LayoutInflater inflater, @Nullable ViewGroup container, @Nullable Bundle savedInstanceState) {
        View v = inflater.inflate(R.layout.fragment_admin_operations, container, false);

        swipeRefresh = v.findViewById(R.id.swipe_refresh_operations);
        tabHistory = v.findViewById(R.id.tab_op_history);
        tabBooking = v.findViewById(R.id.tab_op_booking);
        tabTransaction = v.findViewById(R.id.tab_op_transaction);
        edtSearch = v.findViewById(R.id.edt_search_operations);
        rvOperations = v.findViewById(R.id.rv_admin_operations);
        tvEmpty = v.findViewById(R.id.tv_empty_operations);

        rvOperations.setLayoutManager(new LinearLayoutManager(getContext()));
        historyAdapter = new ParkingHistoryAdapter(requireContext());
        bookingAdapter = new BookingHistoryAdapter(requireContext(), null);
        transactionAdapter = new TransactionAdapter(requireContext());

        tabHistory.setOnClickListener(view -> switchSubTab(0));
        tabBooking.setOnClickListener(view -> switchSubTab(1));
        tabTransaction.setOnClickListener(view -> switchSubTab(2));

        ImageView btnRefresh = v.findViewById(R.id.btn_refresh_operations);
        btnRefresh.setOnClickListener(view -> loadCurrentTabData());

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

        swipeRefresh.setOnRefreshListener(this::loadCurrentTabData);

        return v;
    }

    @Override
    public void onViewCreated(@NonNull View view, @Nullable Bundle savedInstanceState) {
        super.onViewCreated(view, savedInstanceState);
        switchSubTab(0);
    }

    @Override
    public void onResume() {
        super.onResume();
        loadCurrentTabData();
    }

    private void switchSubTab(int tabIndex) {
        currentTab = tabIndex;
        if (getContext() == null) return;

        // Reset tab styles
        tabHistory.setBackgroundResource(0);
        tabHistory.setTextColor(ContextCompat.getColor(requireContext(), R.color.text_secondary));
        tabBooking.setBackgroundResource(0);
        tabBooking.setTextColor(ContextCompat.getColor(requireContext(), R.color.text_secondary));
        tabTransaction.setBackgroundResource(0);
        tabTransaction.setTextColor(ContextCompat.getColor(requireContext(), R.color.text_secondary));

        if (tabIndex == 0) {
            tabHistory.setBackgroundResource(R.drawable.bg_badge_blue);
            tabHistory.setTextColor(ContextCompat.getColor(requireContext(), R.color.primary));
            rvOperations.setAdapter(historyAdapter);
            edtSearch.setHint("Tìm theo biển số, vị trí đỗ...");
        } else if (tabIndex == 1) {
            tabBooking.setBackgroundResource(R.drawable.bg_badge_blue);
            tabBooking.setTextColor(ContextCompat.getColor(requireContext(), R.color.primary));
            rvOperations.setAdapter(bookingAdapter);
            edtSearch.setHint("Tìm mã booking, biển số...");
        } else {
            tabTransaction.setBackgroundResource(R.drawable.bg_badge_blue);
            tabTransaction.setTextColor(ContextCompat.getColor(requireContext(), R.color.primary));
            rvOperations.setAdapter(transactionAdapter);
            edtSearch.setHint("Tìm theo mô tả giao dịch...");
        }

        loadCurrentTabData();
    }

    private void loadCurrentTabData() {
        if (currentTab == 0) loadHistory();
        else if (currentTab == 1) loadBookings();
        else loadTransactions();
    }

    private void loadHistory() {
        if (getContext() == null) return;
        swipeRefresh.setRefreshing(true);

        ApiClient.getApiService(requireContext()).getAllHistoryAdmin(1, 50, null, null).enqueue(new Callback<ApiResponse<List<ParkingHistory>>>() {
            @Override
            public void onResponse(Call<ApiResponse<List<ParkingHistory>>> call, Response<ApiResponse<List<ParkingHistory>>> response) {
                if (isAdded()) swipeRefresh.setRefreshing(false);
                if (response.isSuccessful() && response.body() != null && response.body().isSuccess()) {
                    List<ParkingHistory> list = response.body().getData();
                    if (list != null && isAdded()) {
                        allHistory = list;
                        applySearch(edtSearch.getText().toString().trim());
                    }
                }
            }

            @Override
            public void onFailure(Call<ApiResponse<List<ParkingHistory>>> call, Throwable t) {
                if (isAdded()) {
                    swipeRefresh.setRefreshing(false);
                    Toast.makeText(getContext(), "Không thể tải lịch sử gửi xe", Toast.LENGTH_SHORT).show();
                }
            }
        });
    }

    private void loadBookings() {
        if (getContext() == null) return;
        swipeRefresh.setRefreshing(true);

        ApiClient.getApiService(requireContext()).getAllBookingsAdmin(1, 50, null).enqueue(new Callback<ApiResponse<List<Booking>>>() {
            @Override
            public void onResponse(Call<ApiResponse<List<Booking>>> call, Response<ApiResponse<List<Booking>>> response) {
                if (isAdded()) swipeRefresh.setRefreshing(false);
                if (response.isSuccessful() && response.body() != null && response.body().isSuccess()) {
                    List<Booking> list = response.body().getData();
                    if (list != null && isAdded()) {
                        allBookings = list;
                        applySearch(edtSearch.getText().toString().trim());
                    }
                }
            }

            @Override
            public void onFailure(Call<ApiResponse<List<Booking>>> call, Throwable t) {
                if (isAdded()) {
                    swipeRefresh.setRefreshing(false);
                    Toast.makeText(getContext(), "Không thể tải danh sách booking", Toast.LENGTH_SHORT).show();
                }
            }
        });
    }

    private void loadTransactions() {
        if (getContext() == null) return;
        swipeRefresh.setRefreshing(true);

        ApiClient.getApiService(requireContext()).getAllTransactionsAdmin(1, 50).enqueue(new Callback<ApiResponse<List<Transaction>>>() {
            @Override
            public void onResponse(Call<ApiResponse<List<Transaction>>> call, Response<ApiResponse<List<Transaction>>> response) {
                if (isAdded()) swipeRefresh.setRefreshing(false);
                if (response.isSuccessful() && response.body() != null && response.body().isSuccess()) {
                    List<Transaction> list = response.body().getData();
                    if (list != null && isAdded()) {
                        allTransactions = list;
                        applySearch(edtSearch.getText().toString().trim());
                    }
                }
            }

            @Override
            public void onFailure(Call<ApiResponse<List<Transaction>>> call, Throwable t) {
                if (isAdded()) {
                    swipeRefresh.setRefreshing(false);
                    Toast.makeText(getContext(), "Không thể tải danh sách giao dịch", Toast.LENGTH_SHORT).show();
                }
            }
        });
    }

    private void applySearch(String query) {
        if (currentTab == 0) {
            if (query.isEmpty()) {
                historyAdapter.setList(allHistory);
                updateEmptyState(allHistory.isEmpty());
                return;
            }
            List<ParkingHistory> filtered = new ArrayList<>();
            for (ParkingHistory h : allHistory) {
                if (h.getPlateNumber().toUpperCase().contains(query.toUpperCase())
                        || h.getSlotCode().toUpperCase().contains(query.toUpperCase())) {
                    filtered.add(h);
                }
            }
            historyAdapter.setList(filtered);
            updateEmptyState(filtered.isEmpty());
        } else if (currentTab == 1) {
            if (query.isEmpty()) {
                bookingAdapter.setBookings(allBookings);
                updateEmptyState(allBookings.isEmpty());
                return;
            }
            List<Booking> filtered = new ArrayList<>();
            for (Booking b : allBookings) {
                if (b.getBookingCode().toUpperCase().contains(query.toUpperCase())
                        || (b.getSlotCode() != null && b.getSlotCode().toUpperCase().contains(query.toUpperCase()))) {
                    filtered.add(b);
                }
            }
            bookingAdapter.setBookings(filtered);
            updateEmptyState(filtered.isEmpty());
        } else {
            if (query.isEmpty()) {
                transactionAdapter.setList(allTransactions);
                updateEmptyState(allTransactions.isEmpty());
                return;
            }
            List<Transaction> filtered = new ArrayList<>();
            for (Transaction t : allTransactions) {
                if (t.getDescription() != null && t.getDescription().toUpperCase().contains(query.toUpperCase())) {
                    filtered.add(t);
                }
            }
            transactionAdapter.setList(filtered);
            updateEmptyState(filtered.isEmpty());
        }
    }

    private void updateEmptyState(boolean isEmpty) {
        tvEmpty.setVisibility(isEmpty ? View.VISIBLE : View.GONE);
        rvOperations.setVisibility(isEmpty ? View.GONE : View.VISIBLE);
    }
}
