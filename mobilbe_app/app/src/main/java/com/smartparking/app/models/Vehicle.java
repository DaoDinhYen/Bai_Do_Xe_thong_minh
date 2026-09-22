package com.smartparking.app.models;

import com.google.gson.annotations.SerializedName;
import java.io.Serializable;

public class Vehicle implements Serializable {
    @SerializedName("id")
    private int id;

    @SerializedName("user_id")
    private int userId;

    @SerializedName("plate_number")
    private String plateNumber;

    @SerializedName("vehicle_type")
    private String vehicleType; // CAR, MOTORBIKE

    @SerializedName("vehicle_name")
    private String vehicleName;

    @SerializedName("color")
    private String color;

    @SerializedName("rfid_uid")
    private String rfidUid;

    @SerializedName("is_default")
    private int isDefault;

    @SerializedName("status")
    private String status;

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

    public String getPlateNumber() {
        return plateNumber != null ? plateNumber : "";
    }

    public void setPlateNumber(String plateNumber) {
        this.plateNumber = plateNumber;
    }

    public String getVehicleType() {
        return vehicleType != null ? vehicleType : "CAR";
    }

    public void setVehicleType(String vehicleType) {
        this.vehicleType = vehicleType;
    }

    public String getVehicleName() {
        return vehicleName != null ? vehicleName : "";
    }

    public void setVehicleName(String vehicleName) {
        this.vehicleName = vehicleName;
    }

    public String getColor() {
        return color != null ? color : "";
    }

    public void setColor(String color) {
        this.color = color;
    }

    public String getRfidUid() {
        return rfidUid != null ? rfidUid : "";
    }

    public void setRfidUid(String rfidUid) {
        this.rfidUid = rfidUid;
    }

    public boolean isDefault() {
        return isDefault == 1;
    }

    public void setDefault(boolean aDefault) {
        isDefault = aDefault ? 1 : 0;
    }

    public String getStatus() {
        return status != null ? status : "ACTIVE";
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getDisplayType() {
        if ("MOTORBIKE".equalsIgnoreCase(vehicleType)) return "Xe máy";
        return "Xe ô tô";
    }
}
