package com.smartparking.app.models;

import com.google.gson.annotations.SerializedName;

public class WalletResponse {
    @SerializedName("wallet_balance")
    private double walletBalance;

    public double getWalletBalance() {
        return walletBalance;
    }

    public double getBalance() {
        return walletBalance;
    }

    public void setWalletBalance(double walletBalance) {
        this.walletBalance = walletBalance;
    }
}
