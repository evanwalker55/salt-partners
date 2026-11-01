package com.simplysalt.partners;

import static androidx.test.espresso.web.sugar.Web.onWebView;
import static androidx.test.espresso.web.webdriver.DriverAtoms.findElement;
import static androidx.test.espresso.web.webdriver.DriverAtoms.webClick;
import static org.junit.Assert.assertNotNull;
import static org.junit.Assert.assertTrue;

import android.graphics.Bitmap;
import android.os.SystemClock;
import android.webkit.WebView;
import androidx.test.core.app.ActivityScenario;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;
import androidx.test.espresso.web.webdriver.Locator;
import java.io.File;
import java.io.FileOutputStream;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.Test;
import org.junit.runner.RunWith;

/** Exercises the public sample workspace only; no real sign-in, booking or payout. */
@RunWith(AndroidJUnit4.class)
public class SampleWorkspaceTest {
    private WebView webView;

    private void visible(String id) throws Exception {
        long deadline = SystemClock.elapsedRealtime() + 45000;
        while (SystemClock.elapsedRealtime() < deadline) {
            AtomicReference<String> result = new AtomicReference<>("false");
            CountDownLatch finished = new CountDownLatch(1);
            InstrumentationRegistry.getInstrumentation().runOnMainSync(() ->
                webView.evaluateJavascript("Boolean(document.getElementById('" + id + "') && document.getElementById('" + id + "').getClientRects().length)", value -> {
                    result.set(value); finished.countDown();
                }));
            assertTrue("WebView did not respond", finished.await(5, TimeUnit.SECONDS));
            if ("true".equals(result.get())) return;
            SystemClock.sleep(250);
        }
        throw new AssertionError("Expected visible native app section: " + id);
    }

    private void clickId(String id) {
        onWebView().withElement(findElement(Locator.ID, id)).perform(webClick());
    }

    private void tab(String name, String section) throws Exception {
        onWebView().withElement(findElement(Locator.CSS_SELECTOR, "#tabs button[data-view='" + name + "']")).perform(webClick());
        visible(section);
    }

    private void capture(String name) throws Exception {
        // Allow image decoding and fonts to settle after the section assertion.
        SystemClock.sleep(800);
        Bitmap screenshot = InstrumentationRegistry.getInstrumentation().getUiAutomation().takeScreenshot();
        assertNotNull("Native screenshot unavailable", screenshot);
        File directory = new File(InstrumentationRegistry.getInstrumentation().getTargetContext().getExternalFilesDir(null), "store-screenshots");
        assertTrue(directory.isDirectory() || directory.mkdirs());
        try (FileOutputStream output = new FileOutputStream(new File(directory, name + ".png"))) {
            assertTrue(screenshot.compress(Bitmap.CompressFormat.PNG, 100, output));
        }
        screenshot.recycle();
    }

    @Test public void sampleWorkspaceNavigatesAllPrimaryFeatures() throws Exception {
        try (ActivityScenario<MainActivity> scenario = ActivityScenario.launch(MainActivity.class)) {
            scenario.onActivity(activity -> webView = activity.getBridge().getWebView());
            visible("gallery");
            capture("01-company-gallery");
            clickId("open-sample");
            visible("home");
            visible("sample-banner");
            capture("02-sample-dashboard");
            clickId("start-booking");
            visible("customer-form");
            capture("03-customer-booking");
            clickId("booking-back");
            visible("home");
            tab("money", "money");
            capture("04-referral-rewards");
            tab("stickers", "stickers");
            capture("05-company-stickers");
            tab("account", "account");
            capture("06-technician-account");
            clickId("exit-sample");
            visible("gallery");
        }
    }
}
