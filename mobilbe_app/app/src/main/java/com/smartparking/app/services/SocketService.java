package com.smartparking.app.services;

import android.content.Context;
import android.os.Handler;
import android.os.Looper;
import android.util.Log;
import com.google.gson.Gson;
import com.smartparking.app.models.NotificationItem;
import com.smartparking.app.models.ParkingSlot;
import com.smartparking.app.network.ApiConfig;
import com.smartparking.app.utils.SessionManager;
import io.socket.client.IO;
import io.socket.client.Socket;
import org.json.JSONObject;
import java.net.URISyntaxException;
import java.util.ArrayList;
import java.util.List;

public class SocketService {
    private static final String TAG = "SocketService";
    private static SocketService instance;
    private Socket socket;
    private final Handler mainHandler;
    private final Gson gson;
    private Context appContext;

    public interface OnSlotStatusChangeListener {
        void onSlotStatusChanged(String slotCode, int slotId, String newStatus);
    }

    public interface OnNotificationListener {
        void onNewNotification(NotificationItem item);
    }

    public interface OnConnectionStatusListener {
        void onConnectionChanged(boolean isConnected);
    }

    public interface OnRatesUpdatedListener {
        void onRatesUpdated();
    }

    private final List<OnSlotStatusChangeListener> slotListeners = new ArrayList<>();
    private final List<OnNotificationListener> notificationListeners = new ArrayList<>();
    private final List<OnConnectionStatusListener> connectionListeners = new ArrayList<>();
    private final List<OnRatesUpdatedListener> ratesListeners = new ArrayList<>();

    private SocketService(Context context) {
        this.appContext = context.getApplicationContext();
        this.mainHandler = new Handler(Looper.getMainLooper());
        this.gson = new Gson();
    }

    public static synchronized SocketService getInstance(Context context) {
        if (instance == null) {
            instance = new SocketService(context);
        }
        return instance;
    }

    public synchronized void connect() {
        if (socket != null && socket.connected()) {
            return;
        }

        try {
            String socketUrl = ApiConfig.getSocketUrl(appContext);
            Log.d(TAG, "Connecting to Socket.IO at: " + socketUrl);

            IO.Options options = new IO.Options();
            options.reconnection = true;
            options.reconnectionAttempts = 20;
            options.reconnectionDelay = 2000;
            options.timeout = 10000;

            if (socket != null) {
                socket.disconnect();
                socket.off();
            }

            socket = IO.socket(socketUrl, options);

            socket.on(Socket.EVENT_CONNECT, args -> {
                Log.i(TAG, "✅ Socket.IO Connected!");
                mainHandler.post(() -> notifyConnectionChanged(true));

                // Join user-specific room if logged in
                int userId = SessionManager.getInstance(appContext).getUserId();
                if (userId > 0) {
                    socket.emit("join_room", "user-" + userId);
                    Log.d(TAG, "Joined room: user-" + userId);
                }
            });

            socket.on(Socket.EVENT_DISCONNECT, args -> {
                Log.w(TAG, "⚠️ Socket.IO Disconnected");
                mainHandler.post(() -> notifyConnectionChanged(false));
            });

            socket.on(Socket.EVENT_CONNECT_ERROR, args -> {
                Log.e(TAG, "❌ Socket.IO Connect Error");
                mainHandler.post(() -> notifyConnectionChanged(false));
            });

            // Listen for slot status change: { slot_code: "A01", slot_id: 1, new_status: "OCCUPIED" }
            socket.on("slot_status_changed", args -> {
                if (args.length > 0 && args[0] != null) {
                    try {
                        JSONObject json;
                        if (args[0] instanceof JSONObject) {
                            json = (JSONObject) args[0];
                        } else {
                            json = new JSONObject(args[0].toString());
                        }

                        String slotCode = json.optString("slot_code", "");
                        int slotId = json.optInt("slot_id", 0);
                        String newStatus = json.optString("new_status", "FREE");

                        Log.d(TAG, "Slot changed: " + slotCode + " -> " + newStatus);
                        mainHandler.post(() -> notifySlotStatusChanged(slotCode, slotId, newStatus));
                    } catch (Exception e) {
                        Log.e(TAG, "Error parsing slot_status_changed: " + e.getMessage());
                    }
                }
            });

            // Listen for notification: { id, title, message, type, is_read, created_at }
            socket.on("new_notification", args -> {
                if (args.length > 0 && args[0] != null) {
                    try {
                        String jsonStr = args[0].toString();
                        NotificationItem item = gson.fromJson(jsonStr, NotificationItem.class);
                        mainHandler.post(() -> notifyNewNotification(item));
                    } catch (Exception e) {
                        Log.e(TAG, "Error parsing new_notification: " + e.getMessage());
                    }
                }
            });

            // Listen for rates updated event
            socket.on("rates_updated", args -> {
                Log.i(TAG, "⚡ rates_updated event received from server!");
                mainHandler.post(this::notifyRatesUpdated);
            });

            socket.connect();
        } catch (URISyntaxException e) {
            Log.e(TAG, "Invalid socket URI: " + e.getMessage());
        }
    }

    public synchronized void disconnect() {
        if (socket != null) {
            socket.disconnect();
            socket.off();
            socket = null;
        }
    }

    public void addSlotListener(OnSlotStatusChangeListener listener) {
        if (!slotListeners.contains(listener)) {
            slotListeners.add(listener);
        }
    }

    public void removeSlotListener(OnSlotStatusChangeListener listener) {
        slotListeners.remove(listener);
    }

    public synchronized void reconnect() {
        disconnect();
        connect();
    }

    public void setOnNotificationListener(OnNotificationListener listener) {
        notificationListeners.clear();
        if (listener != null) {
            notificationListeners.add(listener);
        }
    }

    public void addNotificationListener(OnNotificationListener listener) {
        if (!notificationListeners.contains(listener)) {
            notificationListeners.add(listener);
        }
    }

    public void removeNotificationListener(OnNotificationListener listener) {
        notificationListeners.remove(listener);
    }

    public void addConnectionListener(OnConnectionStatusListener listener) {
        if (!connectionListeners.contains(listener)) {
            connectionListeners.add(listener);
        }
    }

    public void removeConnectionListener(OnConnectionStatusListener listener) {
        connectionListeners.remove(listener);
    }

    private void notifySlotStatusChanged(String code, int id, String status) {
        for (OnSlotStatusChangeListener l : slotListeners) {
            l.onSlotStatusChanged(code, id, status);
        }
    }

    private void notifyNewNotification(NotificationItem item) {
        for (OnNotificationListener l : notificationListeners) {
            l.onNewNotification(item);
        }
    }

    private void notifyConnectionChanged(boolean isConnected) {
        for (OnConnectionStatusListener l : connectionListeners) {
            l.onConnectionChanged(isConnected);
        }
    }

    public void addRatesListener(OnRatesUpdatedListener listener) {
        if (!ratesListeners.contains(listener)) {
            ratesListeners.add(listener);
        }
    }

    public void removeRatesListener(OnRatesUpdatedListener listener) {
        ratesListeners.remove(listener);
    }

    private void notifyRatesUpdated() {
        for (OnRatesUpdatedListener l : new ArrayList<>(ratesListeners)) {
            l.onRatesUpdated();
        }
    }

    public boolean isConnected() {
        return socket != null && socket.connected();
    }
}
