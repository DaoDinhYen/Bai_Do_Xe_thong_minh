package com.smartparking.app.activities;

import android.content.Intent;
import android.os.Bundle;
import androidx.appcompat.app.AppCompatActivity;
import androidx.fragment.app.Fragment;
import androidx.fragment.app.FragmentManager;
import com.google.android.material.bottomnavigation.BottomNavigationView;
import com.smartparking.app.R;
import com.smartparking.app.fragments.*;
import com.smartparking.app.services.SocketService;
import com.smartparking.app.utils.SessionManager;

public class MainActivity extends AppCompatActivity {

    private BottomNavigationView bottomNav;
    private final Fragment homeFragment = new HomeFragment();
    private final Fragment bookingFragment = new BookingFragment();
    private final Fragment historyFragment = new HistoryFragment();
    private final Fragment walletFragment = new WalletFragment();
    private final Fragment profileFragment = new ProfileFragment();
    private final FragmentManager fm = getSupportFragmentManager();
    private Fragment activeFragment = homeFragment;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        // Verify session
        if (!SessionManager.getInstance(this).isLoggedIn()) {
            Intent intent = new Intent(this, LoginActivity.class);
            startActivity(intent);
            finish();
            return;
        }

        bottomNav = findViewById(R.id.bottom_navigation);

        // Add fragments and hide others to preserve state and prevent reloads
        fm.beginTransaction().add(R.id.nav_host_container, profileFragment, "5").hide(profileFragment).commit();
        fm.beginTransaction().add(R.id.nav_host_container, walletFragment, "4").hide(walletFragment).commit();
        fm.beginTransaction().add(R.id.nav_host_container, historyFragment, "3").hide(historyFragment).commit();
        fm.beginTransaction().add(R.id.nav_host_container, bookingFragment, "2").hide(bookingFragment).commit();
        fm.beginTransaction().add(R.id.nav_host_container, homeFragment, "1").commit();

        bottomNav.setOnItemSelectedListener(item -> {
            int itemId = item.getItemId();
            if (itemId == R.id.nav_home) {
                fm.beginTransaction().hide(activeFragment).show(homeFragment).commit();
                activeFragment = homeFragment;
                return true;
            } else if (itemId == R.id.nav_booking) {
                fm.beginTransaction().hide(activeFragment).show(bookingFragment).commit();
                activeFragment = bookingFragment;
                return true;
            } else if (itemId == R.id.nav_history) {
                fm.beginTransaction().hide(activeFragment).show(historyFragment).commit();
                activeFragment = historyFragment;
                return true;
            } else if (itemId == R.id.nav_wallet) {
                fm.beginTransaction().hide(activeFragment).show(walletFragment).commit();
                activeFragment = walletFragment;
                return true;
            } else if (itemId == R.id.nav_profile) {
                fm.beginTransaction().hide(activeFragment).show(profileFragment).commit();
                activeFragment = profileFragment;
                return true;
            }
            return false;
        });

        // Ensure Socket connection
        SocketService.getInstance(this).connect();
    }

    public void switchTab(int menuItemId) {
        if (bottomNav != null) {
            bottomNav.setSelectedItemId(menuItemId);
        }
    }

    public void openBookingForSlot(String slotCode) {
        switchTab(R.id.nav_booking);
        if (bookingFragment instanceof BookingFragment) {
            ((BookingFragment) bookingFragment).preselectSlot(slotCode);
        }
    }
}
