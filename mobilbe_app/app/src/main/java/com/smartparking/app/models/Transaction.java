package com.smartparking.app.models;

import com.google.gson.annotations.SerializedName;
import java.io.Serializable;

public class Transaction implements Serializable {
    @SerializedName("id")
    private int id;

    @SerializedName("user_id")
    private int userId;

    @SerializedName("type")
    private String type; // TOP_UP, BOOKING_PAYMENT, PARKING_PAYMENT, REFUND

    @SerializedName("amount")
    private double amount;

    @SerializedName("description")
    private String description;

    @SerializedName("status")
    private String status; // SUCCESS, PENDING, FAILED

    @SerializedName("reference_id")
    private String referenceId;

    @SerializedName("created_at")
    private String createdAt;

    public int getId() {
        return id;
    }

    public void setId(int id) {
        this.id = id;
    }

    public int getUserId() {
        return userId;
    }

    public void setUserId(int userId) {
        this.userId = userId;
    }

    public String getType() {
        return type != null ? type : "TOP_UP";
    }

    public void setType(String type) {
        this.type = type;
    }

    public double getAmount() {
        return amount;
    }

    public void setAmount(double amount) {
        this.amount = amount;
    }

    public String getDescription() {
        return description != null ? description : "";
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getStatus() {
        return status != null ? status : "SUCCESS";
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getReferenceId() {
        return referenceId;
    }

    public void setReferenceId(String referenceId) {
        this.referenceId = referenceId;
    }

    public String getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(String createdAt) {
        this.createdAt = createdAt;
    }

    public boolean isPositive() {
        return "TOP_UP".equalsIgnoreCase(type) || "REFUND".equalsIgnoreCase(type);
    }

    public String getTypeDisplayName() {
        if ("TOP_UP".equalsIgnoreCase(type)) return "Nạp tiền";
        if ("BOOKING_PAYMENT".equalsIgnoreCase(type)) return "Thanh toán đặt chỗ";
        if ("PARKING_PAYMENT".equalsIgnoreCase(type)) return "Thanh toán gửi xe";
        if ("REFUND".equalsIgnoreCase(type)) return "Hoàn tiền";
        return type;
    }
}
