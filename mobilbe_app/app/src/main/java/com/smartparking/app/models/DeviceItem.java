package com.smartparking.app.models;

import com.google.gson.annotations.SerializedName;
import java.io.Serializable;

public class DeviceItem implements Serializable {

    @SerializedName("id")
    private int id;

    @SerializedName("device_code")
    private String deviceCode;

    @SerializedName("device_type")
    private String deviceType;

    @SerializedName("name")
    private String name;

    @SerializedName("location")
    private String location;

    @SerializedName("status")
    private String status; // ONLINE, OFFLINE, ERROR

    @SerializedName("ip_address")
    private String ipAddress;

    @SerializedName("firmware_version")
    private String firmwareVersion;

    @SerializedName("last_seen")
    private String lastSeen;

    public int getId() {
        return id;
    }

    public void setId(int id) {
        this.id = id;
    }

    public String getDeviceCode() {
        return deviceCode != null ? deviceCode : "";
    }

    public void setDeviceCode(String deviceCode) {
        this.deviceCode = deviceCode;
    }

    public String getDeviceType() {
        return deviceType != null ? deviceType : "";
    }

    public void setDeviceType(String deviceType) {
        this.deviceType = deviceType;
    }

    public String getName() {
        return name != null ? name : (deviceCode != null ? deviceCode : "Thiết bị");
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getLocation() {
        return location != null ? location : "Khu vực bãi";
    }

    public void setLocation(String location) {
        this.location = location;
    }

    public String getStatus() {
        return status != null ? status : "OFFLINE";
    }

    public boolean isOnline() {
        return "ONLINE".equalsIgnoreCase(status);
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getIpAddress() {
        return ipAddress != null ? ipAddress : "—";
    }

    public void setIpAddress(String ipAddress) {
        this.ipAddress = ipAddress;
    }

    public String getFirmwareVersion() {
        return firmwareVersion != null ? firmwareVersion : "1.0.0";
    }

    public void setFirmwareVersion(String firmwareVersion) {
        this.firmwareVersion = firmwareVersion;
    }

    public String getLastSeen() {
        return lastSeen != null ? lastSeen : "Chưa ghi nhận";
    }

    public void setLastSeen(String lastSeen) {
        this.lastSeen = lastSeen;
    }
}
