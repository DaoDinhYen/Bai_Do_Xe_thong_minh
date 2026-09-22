package com.smartparking.app.models;

import com.google.gson.annotations.SerializedName;
import java.io.Serializable;

public class Booking implements Serializable {
    @SerializedName("id")
    private int id;

    @SerializedName("user_id")
    private int userId;

    @SerializedName("vehicle_id")
    private int vehicleId;

    @SerializedName("slot_id")
    private int slotId;

    @SerializedName("start_time")
    private String startTime;

    @SerializedName("end_time")
    private String endTime;

    @SerializedName("duration")
    private double duration;

    @SerializedName("unit_price")
    private double unitPrice;

    @SerializedName("total_price")
    private double totalPrice;

    @SerializedName("status")
    private String status; // PENDING, CONFIRMED, ACTIVE, COMPLETED, CANCELLED, EXPIRED

    @SerializedName("created_at")
    private String createdAt;

    @SerializedName("slot_code")
    private String slotCode;

    @SerializedName("zone")
    private String zone;

    @SerializedName("plate_number")
    private String plateNumber;

    @SerializedName("user_name")
    private String userName;

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
        return startTime != null ? startTime : "";
    }

    public void setStartTime(String startTime) {
        this.startTime = startTime;
    }

    public String getEndTime() {
        return endTime != null ? endTime : "";
    }

    public void setEndTime(String endTime) {
        this.endTime = endTime;
    }

    public double getDuration() {
        return duration;
    }

    public void setDuration(double duration) {
        this.duration = duration;
    }

    public double getUnitPrice() {
        return unitPrice;
    }

    public void setUnitPrice(double unitPrice) {
        this.unitPrice = unitPrice;
    }

    public double getTotalPrice() {
        return totalPrice;
    }

    public void setTotalPrice(double totalPrice) {
        this.totalPrice = totalPrice;
    }

    public String getStatus() {
        return status != null ? status : "CONFIRMED";
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(String createdAt) {
        this.createdAt = createdAt;
    }

    public String getSlotCode() {
        return slotCode != null ? slotCode : "";
    }

    public void setSlotCode(String slotCode) {
        this.slotCode = slotCode;
    }

    public String getZone() {
        return zone != null ? zone : "Khu A";
    }

    public void setZone(String zone) {
        this.zone = zone;
    }

    public String getPlateNumber() {
        return plateNumber != null ? plateNumber : "";
    }

    public void setPlateNumber(String plateNumber) {
        this.plateNumber = plateNumber;
    }

    public String getUserName() {
        return userName;
    }

    public void setUserName(String userName) {
        this.userName = userName;
    }

    @SerializedName(value = "booking_code", alternate = {"code"})
    private String bookingCode;

    public String getBookingCode() {
        return bookingCode != null ? bookingCode : getFormattedBookingCode();
    }

    public void setBookingCode(String bookingCode) {
        this.bookingCode = bookingCode;
    }

    public String getFormattedBookingCode() {
        if (bookingCode != null && !bookingCode.isEmpty()) {
            return bookingCode;
        }
        // e.g. BK20260910001 or BK + id formatted
        if (createdAt != null && createdAt.length() >= 10) {
            String dateDigits = createdAt.substring(0, 10).replace("-", "");
            return String.format("BK%s%03d", dateDigits, id % 1000);
        }
        return String.format("BK%06d", id);
    }
}
