package com.smartparking.app.models;

import com.google.gson.annotations.SerializedName;

public class FeeEstimate {
    @SerializedName("hours")
    private double hours;

    @SerializedName("vehicle_type")
    private String vehicleType;

    @SerializedName("price_per_hour")
    private double pricePerHour;

    @SerializedName("minimum_fee")
    private double minimumFee;

    @SerializedName("maximum_fee")
    private double maximumFee;

    @SerializedName("fee")
    private double fee;

    public double getHours() {
        return hours;
    }

    public void setHours(double hours) {
        this.hours = hours;
    }

    public String getVehicleType() {
        return vehicleType;
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

    public double getFee() {
        return fee;
    }

    public void setFee(double fee) {
        this.fee = fee;
    }
}
