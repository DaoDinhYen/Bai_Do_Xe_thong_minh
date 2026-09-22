package com.smartparking.app.fragments;

import android.content.Intent;
import android.os.Bundle;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.EditText;
import android.widget.TextView;
import android.widget.Toast;
import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.fragment.app.Fragment;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;
import androidx.swiperefreshlayout.widget.SwipeRefreshLayout;
import com.google.android.material.bottomsheet.BottomSheetDialog;
import com.google.android.material.button.MaterialButton;
import com.smartparking.app.R;
import com.smartparking.app.activities.TransactionHistoryActivity;
import com.smartparking.app.adapters.TransactionAdapter;
import com.smartparking.app.models.ApiResponse;
import com.smartparking.app.models.Transaction;
import com.smartparking.app.models.User;
import com.smartparking.app.models.WalletResponse;
import com.smartparking.app.network.ApiClient;
import com.smartparking.app.utils.DialogUtils;
import com.smartparking.app.utils.FormatUtils;
import com.smartparking.app.utils.SessionManager;
import java.util.*;
import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;

public class WalletFragment extends Fragment {

    private SwipeRefreshLayout swipeRefresh;
    private TextView tvBalanceLarge;
    private RecyclerView rvTransactions;
    private TransactionAdapter transactionAdapter;

    @Nullable
    @Override
    public View onCreateView(@NonNull LayoutInflater inflater, @Nullable ViewGroup container, @Nullable Bundle savedInstanceState) {
        return inflater.inflate(R.layout.fragment_wallet, container, false);
    }

    @Override
    public void onViewCreated(@NonNull View view, @Nullable Bundle savedInstanceState) {
        super.onViewCreated(view, savedInstanceState);

        swipeRefresh = view.findViewById(R.id.swipe_refresh_wallet);
        tvBalanceLarge = view.findViewById(R.id.tv_wallet_balance_large);
        rvTransactions = view.findViewById(R.id.rv_wallet_transactions);
        MaterialButton btnTopUp = view.findViewById(R.id.btn_wallet_topup);
        MaterialButton btnHistory = view.findViewById(R.id.btn_wallet_history);
        TextView tvSeeAll = view.findViewById(R.id.tv_see_all_transactions);

        rvTransactions.setLayoutManager(new LinearLayoutManager(requireContext()));
        transactionAdapter = new TransactionAdapter(requireContext());
        rvTransactions.setAdapter(transactionAdapter);

        btnTopUp.setOnClickListener(v -> showTopUpDialog());

        View.OnClickListener openHistory = v -> {
            Intent intent = new Intent(requireContext(), TransactionHistoryActivity.class);
            startActivity(intent);
        };
        btnHistory.setOnClickListener(openHistory);
        tvSeeAll.setOnClickListener(openHistory);

        swipeRefresh.setOnRefreshListener(this::loadData);

        updateBalanceDisplay();
        loadData();
    }

    @Override
    public void onResume() {
        super.onResume();
        updateBalanceDisplay();
        loadData();
    }

    @Override
    public void onHiddenChanged(boolean hidden) {
        super.onHiddenChanged(hidden);
        if (!hidden) {
            updateBalanceDisplay();
            loadData();
        }
    }

    private void updateBalanceDisplay() {
        User user = SessionManager.getInstance(requireContext()).getUser();
        if (user != null) {
            tvBalanceLarge.setText(FormatUtils.formatCurrency(user.getWalletBalance()));
        }
    }

    private void loadData() {
        swipeRefresh.setRefreshing(true);

        // 1. Fetch balance
        ApiClient.getApiService(requireContext()).getBalance().enqueue(new Callback<ApiResponse<WalletResponse>>() {
            @Override
            public void onResponse(Call<ApiResponse<WalletResponse>> call, Response<ApiResponse<WalletResponse>> response) {
                if (response.isSuccessful() && response.body() != null && response.body().getData() != null) {
                    double balance = response.body().getData().getWalletBalance();
                    SessionManager.getInstance(requireContext()).updateBalance(balance);
                    tvBalanceLarge.setText(FormatUtils.formatCurrency(balance));
                }
            }

            @Override
            public void onFailure(Call<ApiResponse<WalletResponse>> call, Throwable t) {}
        });

        // 2. Fetch recent transactions
        ApiClient.getApiService(requireContext()).getMyTransactions(1, 5, "").enqueue(new Callback<ApiResponse<List<Transaction>>>() {
            @Override
            public void onResponse(Call<ApiResponse<List<Transaction>>> call, Response<ApiResponse<List<Transaction>>> response) {
                swipeRefresh.setRefreshing(false);
                if (response.isSuccessful() && response.body() != null && response.body().getData() != null) {
                    transactionAdapter.setList(response.body().getData());
                } else {
                    initFallbackTransactions();
                }
            }

            @Override
            public void onFailure(Call<ApiResponse<List<Transaction>>> call, Throwable t) {
                swipeRefresh.setRefreshing(false);
                initFallbackTransactions();
            }
        });
    }

    private void initFallbackTransactions() {
        if (transactionAdapter.getItemCount() == 0) {
            List<Transaction> demoList = new ArrayList<>();

            Transaction t1 = new Transaction();
            t1.setId(1);
            t1.setType("TOP_UP");
            t1.setAmount(100000);
            t1.setDescription("Nạp tiền vào ví");
            t1.setCreatedAt("2026-09-10T09:15:00");
            demoList.add(t1);

            Transaction t2 = new Transaction();
            t2.setId(2);
            t2.setType("BOOKING_PAYMENT");
            t2.setAmount(30000);
            t2.setDescription("Thanh toán đặt chỗ A01");
            t2.setCreatedAt("2026-09-08T14:30:00");
            demoList.add(t2);

            Transaction t3 = new Transaction();
            t3.setId(3);
            t3.setType("TOP_UP");
            t3.setAmount(50000);
            t3.setDescription("Nạp tiền vào ví");
            t3.setCreatedAt("2026-09-05T10:20:00");
            demoList.add(t3);

            Transaction t4 = new Transaction();
            t4.setId(4);
            t4.setType("PARKING_PAYMENT");
            t4.setAmount(20000);
            t4.setDescription("Thanh toán gửi xe");
            t4.setCreatedAt("2026-09-02T16:10:00");
            demoList.add(t4);

            transactionAdapter.setList(demoList);
        }
    }

    private void showTopUpDialog() {
        BottomSheetDialog dialog = new BottomSheetDialog(requireContext());
        View sheet = getLayoutInflater().inflate(R.layout.dialog_topup, null);
        dialog.setContentView(sheet);

        EditText edtAmount = sheet.findViewById(R.id.edt_topup_amount);
        MaterialButton btn50 = sheet.findViewById(R.id.btn_amt_50k);
        MaterialButton btn100 = sheet.findViewById(R.id.btn_amt_100k);
        MaterialButton btn200 = sheet.findViewById(R.id.btn_amt_200k);
        MaterialButton btn500 = sheet.findViewById(R.id.btn_amt_500k);
        MaterialButton btnDoTopUp = sheet.findViewById(R.id.btn_do_topup);

        btn50.setOnClickListener(v -> edtAmount.setText("50000"));
        btn100.setOnClickListener(v -> edtAmount.setText("100000"));
        btn200.setOnClickListener(v -> edtAmount.setText("200000"));
        btn500.setOnClickListener(v -> edtAmount.setText("500000"));

        btnDoTopUp.setOnClickListener(v -> {
            String amtStr = edtAmount.getText().toString().trim();
            if (amtStr.isEmpty()) {
                Toast.makeText(requireContext(), "Vui lòng nhập số tiền muốn nạp", Toast.LENGTH_SHORT).show();
                return;
            }

            double amount;
            try {
                amount = Double.parseDouble(amtStr);
            } catch (NumberFormatException e) {
                Toast.makeText(requireContext(), "Số tiền không hợp lệ", Toast.LENGTH_SHORT).show();
                return;
            }

            if (amount <= 0) {
                Toast.makeText(requireContext(), "Số tiền phải lớn hơn 0", Toast.LENGTH_SHORT).show();
                return;
            }

            DialogUtils.showLoadingDialog(requireContext(), "Đang nạp tiền vào ví...");
            dialog.dismiss();

            Map<String, Object> body = new HashMap<>();
            body.put("amount", amount);

            ApiClient.getApiService(requireContext()).topUp(body).enqueue(new Callback<ApiResponse<Map<String, Object>>>() {
                @Override
                public void onResponse(Call<ApiResponse<Map<String, Object>>> call, Response<ApiResponse<Map<String, Object>>> response) {
                    DialogUtils.dismissLoadingDialog();
                    if (response.isSuccessful() && response.body() != null && response.body().isSuccess()) {
                        Toast.makeText(requireContext(), "Nạp tiền thành công: " + FormatUtils.formatCurrency(amount), Toast.LENGTH_LONG).show();
                        loadData();
                    } else {
                        Toast.makeText(requireContext(), "Nạp tiền thất bại", Toast.LENGTH_SHORT).show();
                    }
                }

                @Override
                public void onFailure(Call<ApiResponse<Map<String, Object>>> call, Throwable t) {
                    DialogUtils.dismissLoadingDialog();
                    // Local simulated top-up if backend is unreachable
                    User u = SessionManager.getInstance(requireContext()).getUser();
                    if (u != null) {
                        double newB = u.getWalletBalance() + amount;
                        SessionManager.getInstance(requireContext()).updateBalance(newB);
                        updateBalanceDisplay();
                    }
                    Toast.makeText(requireContext(), "Nạp tiền thành công (Mô phỏng): " + FormatUtils.formatCurrency(amount), Toast.LENGTH_LONG).show();
                    loadData();
                }
            });
        });

        dialog.show();
    }
}
