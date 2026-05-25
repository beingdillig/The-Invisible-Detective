package com.beingdillig.invisibledetective;

import android.content.IntentSender;
import android.os.Bundle;
import android.view.View;

import androidx.lifecycle.DefaultLifecycleObserver;
import androidx.lifecycle.LifecycleOwner;

import com.getcapacitor.BridgeActivity;
import com.google.android.material.snackbar.Snackbar;
import com.google.android.play.core.appupdate.AppUpdateInfo;
import com.google.android.play.core.appupdate.AppUpdateManager;
import com.google.android.play.core.appupdate.AppUpdateManagerFactory;
import com.google.android.play.core.appupdate.AppUpdateOptions;
import com.google.android.play.core.install.InstallStateUpdatedListener;
import com.google.android.play.core.install.model.AppUpdateType;
import com.google.android.play.core.install.model.InstallStatus;
import com.google.android.play.core.install.model.UpdateAvailability;

public class MainActivity extends BridgeActivity {

    private static final int UPDATE_REQUEST_CODE = 100;

    private AppUpdateManager appUpdateManager;
    private InstallStateUpdatedListener installStateUpdatedListener;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setupUpdateManager();
        observeLifecycle();
    }

    private void setupUpdateManager() {
        appUpdateManager = AppUpdateManagerFactory.create(this);

        // When the flexible download finishes silently, show a "Restart" prompt
        installStateUpdatedListener = state -> {
            if (state.installStatus() == InstallStatus.DOWNLOADED) {
                showRestartSnackbar();
            }
        };
        appUpdateManager.registerListener(installStateUpdatedListener);

        // Check if an update is available and start the flexible download
        appUpdateManager.getAppUpdateInfo().addOnSuccessListener(appUpdateInfo -> {
            if (appUpdateInfo.updateAvailability() == UpdateAvailability.UPDATE_AVAILABLE
                    && appUpdateInfo.isUpdateTypeAllowed(AppUpdateType.FLEXIBLE)) {
                try {
                    appUpdateManager.startUpdateFlowForResult(
                            appUpdateInfo,
                            this,
                            AppUpdateOptions.newBuilder(AppUpdateType.FLEXIBLE).build(),
                            UPDATE_REQUEST_CODE
                    );
                } catch (IntentSender.SendIntentException e) {
                    // Update flow couldn't launch — app works fine without it
                    e.printStackTrace();
                }
            }
        });
    }

    /**
     * Use Jetpack Lifecycle observer instead of overriding onResume/onDestroy
     * (BridgeActivity marks those final).
     */
    private void observeLifecycle() {
        getLifecycle().addObserver(new DefaultLifecycleObserver() {
            @Override
            public void onResume(LifecycleOwner owner) {
                // If the user returned after a background download completed, re-prompt
                if (appUpdateManager == null) return;
                appUpdateManager.getAppUpdateInfo().addOnSuccessListener(appUpdateInfo -> {
                    if (appUpdateInfo.installStatus() == InstallStatus.DOWNLOADED) {
                        showRestartSnackbar();
                    }
                });
            }

            @Override
            public void onDestroy(LifecycleOwner owner) {
                // Clean up listener to prevent memory leak
                if (appUpdateManager != null && installStateUpdatedListener != null) {
                    appUpdateManager.unregisterListener(installStateUpdatedListener);
                }
            }
        });
    }

    /** Snackbar shown after the update finishes downloading in the background. */
    private void showRestartSnackbar() {
        View rootView = findViewById(android.R.id.content);
        Snackbar.make(rootView, "Update ready — restart to apply", Snackbar.LENGTH_INDEFINITE)
                .setAction("Restart", v -> {
                    if (appUpdateManager != null) {
                        appUpdateManager.completeUpdate();
                    }
                })
                .setActionTextColor(0xFFFFFFFF)
                .show();
    }
}
