package com.smartparking.app.models;

import com.google.gson.annotations.SerializedName;
import java.io.Serializable;
import java.util.ArrayList;
import java.util.List;

public class AdminDashboardStats implements Serializable {

    @SerializedName("total_slots")
    private int totalSlots;

    @SerializedName("free_slots")
    private int freeSlots;

    @SerializedName("occupied_slots")
    private int occupiedSlots;

    @SerializedName("reserved_slots")
    private int reservedSlots;

    @SerializedName("disabled_slots")
    private int disabledSlots;

    @SerializedName("free_pct")
    private int freePct;

    @SerializedName("occupied_pct")
    private int occupiedPct;

    @SerializedName("today_revenue")
    private double todayRevenue;

    @SerializedName("month_revenue")
    private double monthRevenue;

    @SerializedName("today_entries")
    private int todayEntries;

    @SerializedName("active_bookings")
    private int activeBookings;

    @SerializedName("active_guests")
    private int activeGuests;

    @SerializedName("total_users")
    private int totalUsers;

    @SerializedName("recent_activity")
    private List<RecentActivity> recentActivity;

    public int getTotalSlots() {
        return totalSlots;
    }

    public void setTotalSlots(int totalSlots) {
        this.totalSlots = totalSlots;
    }

    public int getFreeSlots() {
        return freeSlots;
    }

    public void setFreeSlots(int freeSlots) {
        this.freeSlots = freeSlots;
    }

    public int getOccupiedSlots() {
        return occupiedSlots;
    }

    public void setOccupiedSlots(int occupiedSlots) {
        this.occupiedSlots = occupiedSlots;
    }

    public int getReservedSlots() {
        return reservedSlots;
    }

    public void setReservedSlots(int reservedSlots) {
        this.reservedSlots = reservedSlots;
    }

    public int getDisabledSlots() {
        return disabledSlots;
    }

    public void setDisabledSlots(int disabledSlots) {
        this.disabledSlots = disabledSlots;
    }

    public int getFreePct() {
        return freePct;
    }

    public void setFreePct(int freePct) {
        this.freePct = freePct;
    }

    public int getOccupiedPct() {
        return occupiedPct;
    }

    public void setOccupiedPct(int occupiedPct) {
        this.occupiedPct = occupiedPct;
    }

    public double getTodayRevenue() {
        return todayRevenue;
    }

    public void setTodayRevenue(double todayRevenue) {
        this.todayRevenue = todayRevenue;
    }

    public double getMonthRevenue() {
        return monthRevenue;
    }

    public void setMonthRevenue(double monthRevenue) {
        this.monthRevenue = monthRevenue;
    }

    public int getTodayEntries() {
        return todayEntries;
    }

    public void setTodayEntries(int todayEntries) {
        this.todayEntries = todayEntries;
    }

    public int getActiveBookings() {
        return activeBookings;
    }

    public void setActiveBookings(int activeBookings) {
        this.activeBookings = activeBookings;
    }

    public int getActiveGuests() {
        return activeGuests;
    }

    public void setActiveGuests(int activeGuests) {
        this.activeGuests = activeGuests;
    }

    public int getTotalUsers() {
        return totalUsers;
    }

    public void setTotalUsers(int totalUsers) {
        this.totalUsers = totalUsers;
    }

    public List<RecentActivity> getRecentActivity() {
        return recentActivity != null ? recentActivity : new ArrayList<>();
    }

    public void setRecentActivity(List<RecentActivity> recentActivity) {
        this.recentActivity = recentActivity;
    }
}
