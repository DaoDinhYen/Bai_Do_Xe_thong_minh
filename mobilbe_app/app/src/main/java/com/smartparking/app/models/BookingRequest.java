package com.smartparking.app.models;

import com.google.gson.annotations.SerializedName;

public class BookingRequest {
    @SerializedName("vehicle_id")
    private int vehicleId;

    @SerializedName("slot_id")
    private int slotId;

    @SerializedName("start_time")
    private String startTime;

    @SerializedName("hours")
    private double hours;

    public BookingRequest(int vehicleId, int slotId, String startTime, double hours) {
        this.vehicleId = vehicleId;
        this.slotId = slotId;
        this.startTime = startTime;
        this.hours = hours;
    }

    public int getVehicleId() {
        return vehicleId;
    }

    public void setVehicleId(int vehicleId) {
        this.vehicleId = vehicleId;
    }

    public int getSlotId() {
        return slotId;
    }

    public void setSlotId(int slotId) {
        this.slotId = slotId;
    }

    public String getStartTime() {
        return startTime;
    }

    public void setStartTime(String startTime) {
        this.startTime = startTime;
    }

    public double getHours() {
        return hours;
    }

    public void setHours(double hours) {
        this.hours = hours;
    }
}
