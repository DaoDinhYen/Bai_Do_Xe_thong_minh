package com.smartparking.app.network;

import com.smartparking.app.models.*;
import java.util.List;
import java.util.Map;
import retrofit2.Call;
import retrofit2.http.*;

public interface ApiService {

    // === AUTH ===
    @POST("auth/register")
    Call<ApiResponse<User>> register(@Body Map<String, String> body);

    @POST("auth/login")
    Call<ApiResponse<LoginResponse>> login(@Body Map<String, String> body);

    @POST("auth/logout")
    Call<ApiResponse<Void>> logout();

    @PUT("auth/change-password")
    Call<ApiResponse<Void>> changePassword(@Body Map<String, String> body);

    // === USER ===
    @GET("users/profile")
    Call<ApiResponse<User>> getProfile();

    @PUT("users/profile")
    Call<ApiResponse<User>> updateProfile(@Body Map<String, String> body);

    @GET("users/wallet")
    Call<ApiResponse<WalletResponse>> getWallet();

    // === PARKING ===
    @GET("parking/slots")
    Call<ApiResponse<List<ParkingSlot>>> getAllSlots();

    @GET("parking/slots/summary")
    Call<ApiResponse<SlotSummary>> getSlotSummary();

    @GET("parking/slots/{id}")
    Call<ApiResponse<ParkingSlot>> getSlotById(@Path("id") int id);

    @GET("parking/rates")
    Call<ApiResponse<List<ParkingRate>>> getParkingRates();

    @PUT("parking/rates/{id}")
    Call<ApiResponse<ParkingRate>> updateParkingRate(@Path("id") int id, @Body Map<String, Object> body);

    @PUT("parking/rates/batch")
    Call<ApiResponse<List<ParkingRate>>> batchUpdateRates(@Body BatchRatesRequest body);

    // === BOOKING ===
    @POST("bookings")
    Call<ApiResponse<Map<String, Object>>> createBooking(@Body BookingRequest body);

    @GET("bookings")
    Call<ApiResponse<List<Booking>>> getMyBookings(
            @Query("page") int page,
            @Query("limit") int limit,
            @Query("status") String status
    );

    @GET("bookings/{id}")
    Call<ApiResponse<Booking>> getBookingById(@Path("id") int id);

    @PUT("bookings/{id}/cancel")
    Call<ApiResponse<Void>> cancelBooking(@Path("id") int id);

    @GET("bookings/estimate")
    Call<ApiResponse<FeeEstimate>> estimateFee(
            @Query("hours") double hours,
            @Query("vehicle_type") String vehicleType
    );

    // === PAYMENT & WALLET ===
    @POST("payment/topup")
    Call<ApiResponse<Map<String, Object>>> topUp(@Body Map<String, Object> body);

    @GET("payment/balance")
    Call<ApiResponse<WalletResponse>> getBalance();

    @GET("payment/transactions")
    Call<ApiResponse<List<Transaction>>> getMyTransactions(
            @Query("page") int page,
            @Query("limit") int limit,
            @Query("type") String type
    );

    // === VEHICLES ===
    @GET("vehicles")
    Call<ApiResponse<List<Vehicle>>> getMyVehicles();

    @GET("vehicles/{id}")
    Call<ApiResponse<Vehicle>> getVehicleById(@Path("id") int id);

    @POST("vehicles")
    Call<ApiResponse<Vehicle>> createVehicle(@Body Map<String, String> body);

    @PUT("vehicles/{id}")
    Call<ApiResponse<Vehicle>> updateVehicle(@Path("id") int id, @Body Map<String, String> body);

    @DELETE("vehicles/{id}")
    Call<ApiResponse<Void>> deleteVehicle(@Path("id") int id);

    @PUT("vehicles/{id}/set-default")
    Call<ApiResponse<Void>> setDefaultVehicle(@Path("id") int id);

    // === PARKING HISTORY ===
    @GET("history")
    Call<ApiResponse<List<ParkingHistory>>> getMyHistory(
            @Query("page") int page,
            @Query("limit") int limit
    );

    @GET("history/{id}")
    Call<ApiResponse<ParkingHistory>> getHistoryById(@Path("id") int id);

    // === NOTIFICATIONS ===
    @GET("notifications")
    Call<ApiResponse<NotificationResponse>> getMyNotifications(
            @Query("page") int page,
            @Query("limit") int limit,
            @Query("unread_only") boolean unreadOnly
    );

    @GET("notifications/unread-count")
    Call<ApiResponse<Map<String, Object>>> getUnreadNotificationCount();

    @PUT("notifications/{id}/read")
    Call<ApiResponse<Void>> markNotificationRead(@Path("id") int id);

    @PUT("notifications/read-all")
    Call<ApiResponse<Void>> markAllNotificationsRead();

    // === ADMIN ENDPOINTS ===
    @GET("statistics/dashboard")
    Call<ApiResponse<AdminDashboardStats>> getAdminDashboard();

    @POST("devices/barrier/control")
    Call<ApiResponse<Map<String, Object>>> controlBarrier(@Body Map<String, String> body);

    @POST("devices/light/control")
    Call<ApiResponse<Map<String, Object>>> controlLight(@Body Map<String, String> body);

    @GET("devices")
    Call<ApiResponse<List<DeviceItem>>> getAllDevices();

    @PUT("parking/slots/{id}")
    Call<ApiResponse<ParkingSlot>> updateSlot(@Path("id") int id, @Body Map<String, Object> body);

    @GET("history/admin/all")
    Call<ApiResponse<List<ParkingHistory>>> getAllHistoryAdmin(
            @Query("page") int page,
            @Query("limit") int limit,
            @Query("search") String search,
            @Query("status") String status
    );

    @GET("bookings/all")
    Call<ApiResponse<List<Booking>>> getAllBookingsAdmin(
            @Query("page") int page,
            @Query("limit") int limit,
            @Query("status") String status
    );

    @GET("payment/transactions/all")
    Call<ApiResponse<List<Transaction>>> getAllTransactionsAdmin(
            @Query("page") int page,
            @Query("limit") int limit
    );

    @GET("camera/records")
    Call<ApiResponse<List<CameraRecord>>> getCameraRecords(
            @Query("page") int page,
            @Query("limit") int limit,
            @Query("direction") String direction,
            @Query("search") String search
    );

    @GET("camera/records/latest")
    Call<ApiResponse<Map<String, Object>>> getLatestCameraDetections();

    @GET("users")
    Call<ApiResponse<List<User>>> getAllUsersAdmin(
            @Query("page") int page,
            @Query("limit") int limit,
            @Query("search") String search,
            @Query("role") String role,
            @Query("status") String status
    );

    @PUT("users/{id}/status")
    Call<ApiResponse<Void>> setUserStatus(@Path("id") int id, @Body Map<String, String> body);

    @POST("users/{id}/reset-password")
    Call<ApiResponse<Void>> resetUserPassword(@Path("id") int id, @Body Map<String, String> body);

    @GET("vehicles/admin/all")
    Call<ApiResponse<List<Vehicle>>> getAllVehiclesAdmin(
            @Query("page") int page,
            @Query("limit") int limit,
            @Query("search") String search
    );

    @GET("rfid/cards")
    Call<ApiResponse<List<RfidCard>>> getAllRfidCards(
            @Query("page") int page,
            @Query("limit") int limit
    );

    @POST("rfid/register")
    Call<ApiResponse<RfidCard>> registerRfidCard(@Body Map<String, Object> body);

    @PUT("rfid/cards/{id}/status")
    Call<ApiResponse<Void>> setRfidCardStatus(@Path("id") int id, @Body Map<String, String> body);

    @GET("admin/system-logs")
    Call<ApiResponse<List<SystemLog>>> getSystemLogs(
            @Query("page") int page,
            @Query("limit") int limit,
            @Query("search") String search
    );

    @GET("admin/alerts")
    Call<ApiResponse<List<NotificationItem>>> getAdminAlerts();
}
