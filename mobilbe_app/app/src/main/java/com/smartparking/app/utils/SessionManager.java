package com.smartparking.app.utils;

import android.content.Context;
import android.content.SharedPreferences;
import com.google.gson.Gson;
import com.smartparking.app.models.LoginResponse;
import com.smartparking.app.models.User;

public class SessionManager {
    private static final String PREF_NAME = "smart_parking_session_pref";
    private static final String KEY_TOKEN = "key_auth_token";
    private static final String KEY_REFRESH_TOKEN = "key_refresh_token";
    private static final String KEY_USER_JSON = "key_user_json";
    private static final String KEY_IS_LOGGED_IN = "key_is_logged_in";

    private static SessionManager instance;
    private final SharedPreferences prefs;
    private final Gson gson;

    private SessionManager(Context context) {
        prefs = context.getApplicationContext().getSharedPreferences(PREF_NAME, Context.MODE_PRIVATE);
        gson = new Gson();
    }

    public static synchronized SessionManager getInstance(Context context) {
        if (instance == null) {
            instance = new SessionManager(context);
        }
        return instance;
    }

    public void saveLoginSession(LoginResponse response) {
        SharedPreferences.Editor editor = prefs.edit();
        if (response.getToken() != null) {
            editor.putString(KEY_TOKEN, response.getToken());
        }
        if (response.getRefreshToken() != null) {
            editor.putString(KEY_REFRESH_TOKEN, response.getRefreshToken());
        }
        if (response.getUser() != null) {
            editor.putString(KEY_USER_JSON, gson.toJson(response.getUser()));
        }
        editor.putBoolean(KEY_IS_LOGGED_IN, true);
        editor.apply();
    }

    public void updateUser(User user) {
        if (user != null) {
            prefs.edit().putString(KEY_USER_JSON, gson.toJson(user)).apply();
        }
    }

    public void saveUser(User user) {
        updateUser(user);
    }

    public void updateBalance(double newBalance) {
        User user = getUser();
        if (user != null) {
            user.setWalletBalance(newBalance);
            updateUser(user);
        }
    }

    public boolean isLoggedIn() {
        return prefs.getBoolean(KEY_IS_LOGGED_IN, false) && getToken() != null && !getToken().isEmpty();
    }

    public boolean isAdmin() {
        User user = getUser();
        return user != null && "ADMIN".equalsIgnoreCase(user.getRole());
    }

    public String getToken() {
        return prefs.getString(KEY_TOKEN, null);
    }

    public String getRefreshToken() {
        return prefs.getString(KEY_REFRESH_TOKEN, null);
    }

    public User getUser() {
        String json = prefs.getString(KEY_USER_JSON, null);
        if (json != null) {
            try {
                return gson.fromJson(json, User.class);
            } catch (Exception ignored) {}
        }
        return null;
    }

    public int getUserId() {
        User user = getUser();
        return user != null ? user.getId() : 0;
    }

    public String getUserName() {
        User user = getUser();
        return user != null ? user.getName() : "Người dùng";
    }

    public void logout() {
        prefs.edit()
                .remove(KEY_TOKEN)
                .remove(KEY_REFRESH_TOKEN)
                .remove(KEY_USER_JSON)
                .putBoolean(KEY_IS_LOGGED_IN, false)
                .apply();
    }

    public void clearSession() {
        logout();
    }
}
