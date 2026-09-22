package com.smartparking.app.models;

import com.google.gson.annotations.SerializedName;
import java.io.Serializable;

public class SystemLog implements Serializable {

    @SerializedName("id")
    private int id;

    @SerializedName("user_id")
    private Integer userId;

    @SerializedName("user_name")
    private String userName;

    @SerializedName("action")
    private String action;

    @SerializedName("device_id")
    private Integer deviceId;

    @SerializedName("description")
    private String description;

    @SerializedName("ip_address")
    private String ipAddress;

    @SerializedName("created_at")
    private String createdAt;

    public int getId() {
        return id;
    }

    public void setId(int id) {
        this.id = id;
    }

    public Integer getUserId() {
        return userId;
    }

    public void setUserId(Integer userId) {
        this.userId = userId;
    }

    public String getUserName() {
        return userName != null ? userName : "Hệ thống / Admin";
    }

    public void setUserName(String userName) {
        this.userName = userName;
    }

    public String getAction() {
        return action != null ? action : "ACTION";
    }

    public void setAction(String action) {
        this.action = action;
    }

    public Integer getDeviceId() {
        return deviceId;
    }

    public void setDeviceId(Integer deviceId) {
        this.deviceId = deviceId;
    }

    public String getDescription() {
        return description != null ? description : "";
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getIpAddress() {
        return ipAddress != null ? ipAddress : "—";
    }

    public void setIpAddress(String ipAddress) {
        this.ipAddress = ipAddress;
    }

    public String getCreatedAt() {
        return createdAt != null ? createdAt : "";
    }

    public void setCreatedAt(String createdAt) {
        this.createdAt = createdAt;
    }
}
