package com.smartparking.app.models;

import com.google.gson.annotations.SerializedName;
import java.io.Serializable;

public class ParkingSlot implements Serializable {
    @SerializedName("id")
    private int id;

    @SerializedName("slot_code")
    private String slotCode;

    @SerializedName("zone")
    private String zone;

    @SerializedName("status")
    private String status; // FREE, OCCUPIED, RESERVED, DISABLED

    @SerializedName("sensor_id")
    private String sensorId;

    @SerializedName("is_virtual")
    private int isVirtual;

    @SerializedName(value = "current_booking_id", alternate = {"booking_id"})
    private Integer currentBookingId;

    @SerializedName(value = "booking_plate", alternate = {"current_plate", "booked_plate"})
    private String bookingPlate;

    @SerializedName(value = "booking_user_name", alternate = {"booked_user_name"})
    private String bookingUserName;

    @SerializedName(value = "booking_start", alternate = {"start_time"})
    private String bookingStart;

    @SerializedName(value = "booking_end", alternate = {"end_time", "expected_exit"})
    private String bookingEnd;

    // Transient UI state
    private boolean isSelected;

    public int getId() {
        return id;
    }

    public void setId(int id) {
        this.id = id;
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

    public String getStatus() {
        return status != null ? status : "FREE";
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getSensorId() {
        return sensorId;
    }

    public void setSensorId(String sensorId) {
        this.sensorId = sensorId;
    }

    public boolean isVirtual() {
        return isVirtual == 1;
    }

    public void setVirtual(int isVirtual) {
        this.isVirtual = isVirtual;
    }

    public Integer getCurrentBookingId() {
        return currentBookingId;
    }

    public void setCurrentBookingId(Integer currentBookingId) {
        this.currentBookingId = currentBookingId;
    }

    public String getBookingPlate() {
        return bookingPlate;
    }

    public void setBookingPlate(String bookingPlate) {
        this.bookingPlate = bookingPlate;
    }

    public String getBookingUserName() {
        return bookingUserName;
    }

    public void setBookingUserName(String bookingUserName) {
        this.bookingUserName = bookingUserName;
    }

    public String getBookingStart() {
        return bookingStart;
    }

    public void setBookingStart(String bookingStart) {
        this.bookingStart = bookingStart;
    }

    public String getBookingEnd() {
        return bookingEnd;
    }

    public void setBookingEnd(String bookingEnd) {
        this.bookingEnd = bookingEnd;
    }

    public boolean isSelected() {
        return isSelected;
    }

    public void setSelected(boolean selected) {
        isSelected = selected;
    }
}
