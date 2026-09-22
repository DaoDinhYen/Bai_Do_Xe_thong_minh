package com.smartparking.app.models;

import com.google.gson.annotations.SerializedName;

public class ParkingRate {
    @SerializedName("id")
    private int id;

    @SerializedName("vehicle_type")
    private String vehicleType;

    @SerializedName("price_per_hour")
    private double pricePerHour;

    @SerializedName("minimum_fee")
    private double minimumFee;

    @SerializedName("maximum_fee")
    private double maximumFee;

    @SerializedName("status")
    private String status;

    public ParkingRate() {}

    public ParkingRate(int id, String vehicleType, double pricePerHour, double minimumFee, double maximumFee) {
        this.id = id;
        this.vehicleType = vehicleType;
        this.pricePerHour = pricePerHour;
        this.minimumFee = minimumFee;
        this.maximumFee = maximumFee;
    }

    public int getId() {
        return id;
    }

    public void setId(int id) {
        this.id = id;
    }

    public String getVehicleType() {
        return vehicleType != null ? vehicleType : "CAR";
    }

    public void setVehicleType(String vehicleType) {
        this.vehicleType = vehicleType;
    }

    public double getPricePerHour() {
        return pricePerHour;
    }

    public void setPricePerHour(double pricePerHour) {
        this.pricePerHour = pricePerHour;
    }

    public double getMinimumFee() {
        return minimumFee;
    }

    public void setMinimumFee(double minimumFee) {
        this.minimumFee = minimumFee;
    }

    public double getMaximumFee() {
        return maximumFee;
    }

    public void setMaximumFee(double maximumFee) {
        this.maximumFee = maximumFee;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getVehicleTypeName() {
        if ("CAR".equalsIgnoreCase(vehicleType)) return "Ô tô";
        if ("MOTORBIKE".equalsIgnoreCase(vehicleType)) return "Xe máy";
        if ("TRUCK".equalsIgnoreCase(vehicleType)) return "Xe tải";
        return vehicleType;
    }
}
