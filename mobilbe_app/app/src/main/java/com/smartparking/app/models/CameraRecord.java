package com.smartparking.app.models;

import com.google.gson.annotations.SerializedName;
import java.io.Serializable;

public class CameraRecord implements Serializable {

    @SerializedName("id")
    private int id;

    @SerializedName("camera_id")
    private Integer cameraId;

    @SerializedName("camera_code")
    private String cameraCode;

    @SerializedName("plate_number")
    private String plateNumber;

    @SerializedName("confidence")
    private Double confidence;

    @SerializedName("image_path")
    private String imagePath;

    @SerializedName("direction")
    private String direction; // IN / OUT

    @SerializedName("status")
    private String status; // VERIFIED, REJECTED, PENDING, LOW_CONFIDENCE

    @SerializedName("created_at")
    private String createdAt;

    @SerializedName("timestamp")
    private String timestamp;

    public int getId() {
        return id;
    }

    public void setId(int id) {
        this.id = id;
    }

    public Integer getCameraId() {
        return cameraId;
    }

    public void setCameraId(Integer cameraId) {
        this.cameraId = cameraId;
    }

    public String getCameraCode() {
        return cameraCode != null ? cameraCode : (direction != null ? "CAM_" + direction : "CAM");
    }

    public void setCameraCode(String cameraCode) {
        this.cameraCode = cameraCode;
    }

    public String getPlateNumber() {
        return plateNumber != null ? plateNumber : "Chưa rõ";
    }

    public void setPlateNumber(String plateNumber) {
        this.plateNumber = plateNumber;
    }

    public Double getConfidence() {
        return confidence != null ? confidence : 0.0;
    }

    public int getConfidencePercent() {
        if (confidence == null) return 0;
        double val = confidence > 1.0 ? confidence : confidence * 100.0;
        return (int) Math.round(val);
    }

    public void setConfidence(Double confidence) {
        this.confidence = confidence;
    }

    public String getImagePath() {
        return imagePath != null ? imagePath : "";
    }

    public void setImagePath(String imagePath) {
        this.imagePath = imagePath;
    }

    public String getDirection() {
        return direction != null ? direction : "IN";
    }

    public void setDirection(String direction) {
        this.direction = direction;
    }

    public String getStatus() {
        return status != null ? status : "VERIFIED";
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getCreatedAt() {
        if (createdAt != null && !createdAt.isEmpty()) return createdAt;
        return timestamp != null ? timestamp : "";
    }

    public void setCreatedAt(String createdAt) {
        this.createdAt = createdAt;
    }

    public String getTimestamp() {
        return timestamp != null ? timestamp : getCreatedAt();
    }

    public void setTimestamp(String timestamp) {
        this.timestamp = timestamp;
    }
}
