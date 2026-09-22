package com.smartparking.app.activities;

import android.content.Intent;
import android.os.Bundle;
import androidx.appcompat.app.AppCompatActivity;
import androidx.fragment.app.Fragment;
import androidx.fragment.app.FragmentManager;
import com.google.android.material.bottomnavigation.BottomNavigationView;
import com.smartparking.app.R;
import com.smartparking.app.fragments.AdminCameraFragment;
import com.smartparking.app.fragments.AdminDashboardFragment;
import com.smartparking.app.fragments.AdminMoreFragment;
import com.smartparking.app.fragments.AdminOperationsFragment;
import com.smartparking.app.fragments.AdminParkingFragment;
import com.smartparking.app.services.SocketService;
import com.smartparking.app.utils.SessionManager;

public class AdminMainActivity extends AppCompatActivity {

    private BottomNavigationView bottomNav;
    private final Fragment dashboardFragment = new AdminDashboardFragment();
    private final Fragment parkingFragment = new AdminParkingFragment();
    private final Fragment cameraFragment = new AdminCameraFragment();
    private final Fragment operationsFragment = new AdminOperationsFragment();
    private final Fragment moreFragment = new AdminMoreFragment();
    private final FragmentManager fm = getSupportFragmentManager();
    private Fragment activeFragment = dashboardFragment;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_admin_main);

        // Verify admin session
        if (!SessionManager.getInstance(this).isLoggedIn()) {
            Intent intent = new Intent(this, LoginActivity.class);
            startActivity(intent);
            finish();
            return;
        }

        bottomNav = findViewById(R.id.admin_bottom_navigation);

        // Add fragments and hide others to preserve state
        fm.beginTransaction().add(R.id.admin_nav_host_container, moreFragment, "5").hide(moreFragment).commit();
        fm.beginTransaction().add(R.id.admin_nav_host_container, operationsFragment, "4").hide(operationsFragment).commit();
        fm.beginTransaction().add(R.id.admin_nav_host_container, cameraFragment, "3").hide(cameraFragment).commit();
        fm.beginTransaction().add(R.id.admin_nav_host_container, parkingFragment, "2").hide(parkingFragment).commit();
        fm.beginTransaction().add(R.id.admin_nav_host_container, dashboardFragment, "1").commit();

        bottomNav.setOnItemSelectedListener(item -> {
            int itemId = item.getItemId();
            if (itemId == R.id.nav_admin_dashboard) {
                fm.beginTransaction().hide(activeFragment).show(dashboardFragment).commit();
                activeFragment = dashboardFragment;
                return true;
            } else if (itemId == R.id.nav_admin_parking) {
                fm.beginTransaction().hide(activeFragment).show(parkingFragment).commit();
                activeFragment = parkingFragment;
                return true;
            } else if (itemId == R.id.nav_admin_camera) {
                fm.beginTransaction().hide(activeFragment).show(cameraFragment).commit();
                activeFragment = cameraFragment;
                return true;
            } else if (itemId == R.id.nav_admin_operations) {
                fm.beginTransaction().hide(activeFragment).show(operationsFragment).commit();
                activeFragment = operationsFragment;
                return true;
            } else if (itemId == R.id.nav_admin_more) {
                fm.beginTransaction().hide(activeFragment).show(moreFragment).commit();
                activeFragment = moreFragment;
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
}
