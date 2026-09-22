package com.smartparking.app.models;

import com.google.gson.annotations.SerializedName;

public class SlotSummary {
    @SerializedName(value = "total", alternate = {"total_slots"})
    private int total;

    @SerializedName(value = "free", alternate = {"free_count", "free_slots"})
    private int free;

    @SerializedName(value = "occupied", alternate = {"occupied_count", "occupied_slots"})
    private int occupied;

    @SerializedName(value = "reserved", alternate = {"reserved_count", "reserved_slots"})
    private int reserved;

    @SerializedName(value = "disabled", alternate = {"disabled_count", "disabled_slots"})
    private int disabled;

    public int getTotal() {
        return total;
    }

    public void setTotal(int total) {
        this.total = total;
    }

    public int getFree() {
        return free;
    }

    public void setFree(int free) {
        this.free = free;
    }

    public int getOccupied() {
        return occupied;
    }

    public void setOccupied(int occupied) {
        this.occupied = occupied;
    }

    public int getReserved() {
        return reserved;
    }

    public void setReserved(int reserved) {
        this.reserved = reserved;
    }

    public int getDisabled() {
        return disabled;
    }

    public void setDisabled(int disabled) {
        this.disabled = disabled;
    }
}
