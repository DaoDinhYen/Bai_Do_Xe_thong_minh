package com.smartparking.app;

import android.app.Application;
import com.smartparking.app.services.SocketService;
import com.smartparking.app.utils.SessionManager;

public class SmartParkingApp extends Application {
    private static SmartParkingApp instance;

    @Override
    public void onCreate() {
        super.onCreate();
        instance = this;

        // Connect Socket.IO if already logged in
        if (SessionManager.getInstance(this).isLoggedIn()) {
            SocketService.getInstance(this).connect();
        }
    }

    public static SmartParkingApp getInstance() {
        return instance;
    }
}
