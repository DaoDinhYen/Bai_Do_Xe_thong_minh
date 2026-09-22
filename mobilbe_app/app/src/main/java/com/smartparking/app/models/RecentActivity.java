package com.smartparking.app.models;

import com.google.gson.annotations.SerializedName;
import java.io.Serializable;

public class RecentActivity implements Serializable {
    @SerializedName("time")
    private String time;

    @SerializedName("type")
    private String type;

    @SerializedName("title")
    private String title;

    @SerializedName("detail")
    private String detail;

    public RecentActivity() {}

    public RecentActivity(String time, String type, String title, String detail) {
        this.time = time;
        this.type = type;
        this.title = title;
        this.detail = detail;
    }

    public String getTime() {
        return time != null ? time : "";
    }

    public void setTime(String time) {
        this.time = time;
    }

    public String getType() {
        return type != null ? type : "";
    }

    public void setType(String type) {
        this.type = type;
    }

    public String getTitle() {
        return title != null ? title : "";
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getDetail() {
        return detail != null ? detail : "";
    }

    public void setDetail(String detail) {
        this.detail = detail;
    }
}
