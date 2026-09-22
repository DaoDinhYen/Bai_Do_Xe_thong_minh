package com.smartparking.app.network;

import android.content.Context;
import android.content.SharedPreferences;

public class ApiConfig {
    private static final String PREF_NAME = "smart_parking_network_pref";
    private static final String KEY_SERVER_HOST = "key_server_host";
    private static final String KEY_SERVER_PORT = "key_server_port";

    // Default: 192.168.77.2 for LDPlayer, 10.0.2.2 for Android Studio Emulator, or 192.168.1.x for physical LAN
    public static final String DEFAULT_HOST = "192.168.77.2";
    public static final int DEFAULT_PORT = 3000;

    public static String getServerHost(Context context) {
        SharedPreferences prefs = context.getSharedPreferences(PREF_NAME, Context.MODE_PRIVATE);
        return prefs.getString(KEY_SERVER_HOST, DEFAULT_HOST);
    }

    public static int getServerPort(Context context) {
        SharedPreferences prefs = context.getSharedPreferences(PREF_NAME, Context.MODE_PRIVATE);
        return prefs.getInt(KEY_SERVER_PORT, DEFAULT_PORT);
    }

    public static void saveServerConfig(Context context, String host, int port) {
        SharedPreferences prefs = context.getSharedPreferences(PREF_NAME, Context.MODE_PRIVATE);
        prefs.edit()
                .putString(KEY_SERVER_HOST, host.trim())
                .putInt(KEY_SERVER_PORT, port)
                .apply();
        ApiClient.resetClient();
    }

    public static String getBaseUrl(Context context) {
        String host = getServerHost(context);
        int port = getServerPort(context);
        // Normalize host in case user typed http:// or trailing slash
        if (host.startsWith("http://") || host.startsWith("https://")) {
            if (!host.endsWith("/")) host += "/";
            return host.endsWith("/api/") ? host : host + "api/";
        }
        return "http://" + host + ":" + port + "/api/";
    }

    public static String getSocketUrl(Context context) {
        String host = getServerHost(context);
        int port = getServerPort(context);
        if (host.startsWith("http://") || host.startsWith("https://")) {
            // strip /api if present
            return host.replace("/api/", "").replace("/api", "");
        }
        return "http://" + host + ":" + port;
    }
}
