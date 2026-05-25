package com.beingdillig.invisibledetective;

import android.content.IntentSender;
import android.os.Bundle;
import android.view.View;

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
        checkForUpdate();
    }

    private void checkForUpdate() {
        appUpdateManager = AppUpdateManagerFactory.create(this);

        // When download finishes in the background, show a "Restart" prompt
        installStateUpdatedListener = state -> {
            if (state.installStatus() == InstallStatus.DOWNLOADED) {
                showRestartSnackbar();
            }
        };
        appUpdateManager.registerListener(installStateUpdatedListener);

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
                    // Couldn't launch update flow — app still works fine
                    e.printStackTrace();
                }
            }
        });
    }

    /** Snackbar shown after the update finishes downloading silently in the background. */
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

    @Override
    protected void onResume() {
        super.onResume();
        // If the user backgrounded the app mid-download and returned, re-check
        if (appUpdateManager == null) return;
        appUpdateManager.getAppUpdateInfo().addOnSuccessListener(appUpdateInfo -> {
            if (appUpdateInfo.installStatus() == InstallStatus.DOWNLOADED) {
                showRestartSnackbar();
            }
        });
    }

    @Override
    protected void onDestroy() {
        super.onDestroy();
        if (appUpdateManager != null && installStateUpdatedListener != null) {
            appUpdateManager.unregisterListener(installStateUpdatedListener);
        }
    }
}
