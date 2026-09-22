package com.smartparking.app.models;

import com.google.gson.annotations.SerializedName;
import java.io.Serializable;

public class ParkingHistory implements Serializable {
    @SerializedName("id")
    private int id;

    @SerializedName("user_id")
    private int userId;

    @SerializedName("vehicle_id")
    private int vehicleId;

    @SerializedName("slot_id")
    private int slotId;

    @SerializedName("rfid_uid")
    private String rfidUid;

    @SerializedName("booking_id")
    private Integer bookingId;

    @SerializedName("entry_time")
    private String entryTime;

    @SerializedName("exit_time")
    private String exitTime;

    @SerializedName("duration")
    private Double duration;

    @SerializedName("fee")
    private Double fee;

    @SerializedName("payment_status")
    private String paymentStatus; // PENDING, PAID, FAILED, REFUNDED

    @SerializedName("slot_code")
    private String slotCode;

    @SerializedName("zone")
    private String zone;

    @SerializedName("plate_number")
    private String plateNumber;

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

    public String getRfidUid() {
        return rfidUid;
    }

    public void setRfidUid(String rfidUid) {
        this.rfidUid = rfidUid;
    }

    public Integer getBookingId() {
        return bookingId;
    }

    public void setBookingId(Integer bookingId) {
        this.bookingId = bookingId;
    }

    public String getEntryTime() {
        return entryTime != null ? entryTime : "";
    }

    public void setEntryTime(String entryTime) {
        this.entryTime = entryTime;
    }

    public String getExitTime() {
        return exitTime;
    }

    public void setExitTime(String exitTime) {
        this.exitTime = exitTime;
    }

    public Double getDuration() {
        return duration != null ? duration : 0.0;
    }

    public void setDuration(Double duration) {
        this.duration = duration;
    }

    public Double getFee() {
        return fee != null ? fee : 0.0;
    }

    public void setFee(Double fee) {
        this.fee = fee;
    }

    public String getPaymentStatus() {
        return paymentStatus != null ? paymentStatus : "PENDING";
    }

    public void setPaymentStatus(String paymentStatus) {
        this.paymentStatus = paymentStatus;
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
}
