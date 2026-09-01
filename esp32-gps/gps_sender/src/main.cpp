// ESP32 + SIM7600 (GPS-only) -> UPBus /api/gps/ingest
//
// Only the SIM7600's onboard GNSS is used here (AT+CGPS / AT+CGPSINFO). No SIM
// card / cellular data AT commands are sent -- network transport is the
// ESP32's own WiFi, not the modem's data connection.
//
// Wiring: SIM7600 UART <-> ESP32 UART2
//   SIM7600 TXD -> ESP32 GPIO14 (MODEM_RX_PIN)
//   SIM7600 RXD -> ESP32 GPIO13 (MODEM_TX_PIN)
//   Common GND. Module UART is normally 115200 baud.
//
// WiFi connect cycle: on boot, try the last-known WiFi first. If that fails
// (or BOOT/GPIO0 is held low at power-up), open the board's own AP
// "UPBus-GPS-Setup" (password "upbus1234") for 1 minute so a phone can join,
// fill in the campus WiFi / Device ID / Device Key via the captive portal (or
// browse to 192.168.4.1), and register the device. If the AP window closes
// with nothing registered, the board retries the last-known WiFi for 30s;
// if that also fails, the AP reopens. This repeats until connected.

#include <Arduino.h>
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <WiFiManager.h>
#include <HTTPClient.h>
#include <HardwareSerial.h>
#include <Preferences.h>
#include <Update.h>
#include <esp_ota_ops.h>
#include <esp_partition.h>

const char* SERVER_URL = "https://bustransit.up.ac.th/gpstest/api/gps/ingest"; // isolated TEST backend (proxied to :5001) -- switch to /api/gps/ingest (no /gpstest) for production

// Bump this before building a new release and uploading it via the admin
// firmware page. This is what the device reports as its "current_version"
// on every /api/firmware/check call.
const char* FIRMWARE_VERSION = "1.0.0";

const unsigned long FIRMWARE_CHECK_INTERVAL_MS = 24UL * 60UL * 60UL * 1000UL; // 24h
const unsigned long FIRMWARE_SELFTEST_TIMEOUT_MS = 120000; // 2 min budget to prove the new build is good
unsigned long lastFirmwareCheckMs = 0;

const int MODEM_RX_PIN = 14; // SIM7600 TXD -> here
const int MODEM_TX_PIN = 13; // SIM7600 RXD -> here
const unsigned long MODEM_BAUD = 115200;
const unsigned long GPS_POLL_INTERVAL_MS = 100;

const int CONFIG_TRIGGER_PIN = 0; // BOOT button, active low
const int WIFI_LED_PIN = 2; // ON while WiFi connected, OFF otherwise

// Carrier-board LEDs identified by GPIO sweep (see pin_test.cpp history):
// GPIO4=green LED, GPIO16/17=RGB green/red channels, GPIO18=unconfirmed.
const int WIFI_STATUS_LED_PIN = 4;   // AP mode=slow blink, searching=fast blink, connected=solid ON
const int GPS_SEND_OK_LED_PIN = 16;  // blinks once per successful GPS send (HTTP 2xx)
const int GPS_SEND_FAIL_LED_PIN = 17; // blinks once per failed GPS send; solid ON while no GPS fix

const unsigned long WIFI_BLINK_AP_MS = 1000;      // AP portal open, waiting for registration
const unsigned long WIFI_BLINK_SEARCH_MS = 150;   // searching for last-known WiFi
const unsigned long CONFIG_TRIGGER_WINDOW_MS = 8000; // hold BOOT anytime in this window right after boot to force the setup AP
const unsigned long CONFIG_TRIGGER_BLINK_MS = 100;   // fast blink during the window above, signalling "press BOOT now"

const int BUS_COUNT = 35; // fleet size -- system bus IDs run TC001..TC0{BUS_COUNT}

HardwareSerial modemSerial(2);
Preferences prefs;
Preferences otaPrefs;

char deviceId[40] = ""; // must match a real bus ID (TC001..TC035) registered in the UPBus system
char deviceKey[64] = "";

bool gpsFixed = false;
double gpsLat = 0, gpsLng = 0, gpsSpeedKmh = 0, gpsCourseDeg = 0;
unsigned long lastGpsPollMs = 0;

// After a full power-cycle the SIM7600 cold-boots along with the ESP32 and
// its AT interface can take longer than a fixed startup delay to come up.
// AT+CGPS=1 was previously sent once, blind, right after a flat 3s delay --
// if the modem wasn't listening yet, that command is simply lost and GNSS
// never powers on for the rest of the session (no amount of waiting for a
// fix then helps, since the receiver was never turned on). GPS_REARM_INTERVAL_MS
// resends it periodically as a self-healing fallback while no fix has landed.
const unsigned long GPS_REARM_INTERVAL_MS = 60000;
unsigned long lastGpsRearmMs = 0;

// Sends an AT command and prints exactly what the modem replies (or nothing,
// which itself is a diagnostic: wiring/baud/power problem vs. a real ERROR).
String sendAtCommand(const String& cmd, unsigned long waitMs) {
  while (modemSerial.available()) modemSerial.read(); // flush stale bytes
  modemSerial.println(cmd);

  String response;
  unsigned long start = millis();
  while (millis() - start < waitMs) {
    while (modemSerial.available()) {
      response += (char)modemSerial.read();
    }
  }
  Serial.printf("[DBG-at] %s -> [%s]\n", cmd.c_str(), response.length() ? response.c_str() : "(no reply)");
  return response;
}

// Polls plain "AT" until the modem answers OK (or timeoutMs runs out), instead
// of assuming a fixed boot delay is always long enough. A cold power-on of the
// SIM7600 can take longer to become responsive than a warm ESP32-only reset.
bool waitForModemReady(unsigned long timeoutMs) {
  unsigned long start = millis();
  while (millis() - start < timeoutMs) {
    String resp = sendAtCommand("AT", 300);
    if (resp.indexOf("OK") != -1) return true;
    delay(200);
  }
  return false;
}

// Sends AT+CGPS=1 and logs whether the modem actually acknowledged it -- the
// previous version fired this blind (no response read at all), so a lost
// command was indistinguishable from a working one until GPS never fixed.
// Returns true only on an explicit OK: field-tested after a real power-cycle,
// the modem answered plain "AT" fine but replied ERROR to AT+CGPS=1 sent
// immediately after -- the GNSS subsystem isn't ready the instant the AT
// interface is, so a bare OK check (not just "did it reply at all") matters.
bool enableGps() {
  String resp = sendAtCommand("AT+CGPS=1", 1000);
  bool ok = resp.indexOf("OK") != -1;
  if (!ok) {
    Serial.println("[DBG-gps] AT+CGPS=1 did not return OK -- GNSS may not actually be enabled");
  }
  return ok;
}

float convertToDecimal(const String& raw) {
  if (raw.length() == 0) return 0.0;
  float val = raw.toFloat();
  int deg = (int)(val / 100);       // ddmm.mmmm -> dd
  float minutes = val - (deg * 100); // ddmm.mmmm -> mm.mmmm
  return deg + (minutes / 60.0);
}

void loadDeviceConfig() {
  prefs.begin("upbus-gps", true);
  prefs.getString("device_id", deviceId, sizeof(deviceId));
  prefs.getString("device_key", deviceKey, sizeof(deviceKey));
  prefs.end();
}

void saveDeviceConfig() {
  prefs.begin("upbus-gps", false);
  prefs.putString("device_id", deviceId);
  prefs.putString("device_key", deviceKey);
  prefs.end();
}

// Runs once per boot, right after WiFi connects. If the previous boot
// applied an OTA update, this proves the new firmware can actually reach
// the server before committing to it; otherwise it reverts to whichever
// firmware was running before the update.
//
// Mechanism: esp_ota_mark_app_valid_cancel_rollback() relies on the
// bootloader's own pending-verify/rollback feature, which may or may not
// be enabled in this board's precompiled Arduino-ESP32 bootloader -- that
// could not be confirmed without physical hardware. So this also does its
// own explicit revert: before applying an update (see
// checkAndApplyFirmwareUpdate() below) the running partition's address is
// saved to Preferences; if self-test fails here, that exact partition is
// set as the boot target directly via esp_ota_set_boot_partition(),
// independent of whether bootloader-level rollback is active.
void runOtaSelfTestOrRevert() {
  otaPrefs.begin("upbus-ota", false);
  bool otaPending = otaPrefs.getBool("pending", false);
  if (!otaPending) {
    otaPrefs.end();
    return;
  }

  Serial.println("[DBG-ota] booted after an OTA update -- running self-test...");
  unsigned long start = millis();
  bool selfTestOk = false;
  while (millis() - start < FIRMWARE_SELFTEST_TIMEOUT_MS) {
    if (WiFi.status() == WL_CONNECTED) {
      HTTPClient http;
      WiFiClientSecure client;
      client.setInsecure();
      http.setConnectTimeout(5000);
      http.setTimeout(5000);
      String url = String(SERVER_URL);
      url.replace("/gps/ingest", "/firmware/check?device_id=" + String(deviceId) + "&current_version=" + String(FIRMWARE_VERSION));
      http.begin(client, url);
      http.addHeader("X-Device-Key", deviceKey);
      int status = http.GET();
      http.end();
      if (status >= 200 && status < 300) {
        selfTestOk = true;
        break;
      }
    }
    delay(2000);
  }

  if (selfTestOk) {
    Serial.println("[DBG-ota] self-test passed -- keeping this firmware");
    esp_ota_mark_app_valid_cancel_rollback();
    otaPrefs.putBool("pending", false);
    otaPrefs.end();
    return;
  }

  Serial.println("[DBG-ota] self-test FAILED -- reverting to previous firmware");
  uint32_t prevAddr = otaPrefs.getUInt("prev_addr", 0);
  otaPrefs.putBool("pending", false);
  otaPrefs.end();

  if (prevAddr == 0) {
    Serial.println("[DBG-ota] no previous partition address saved -- cannot auto-revert, staying on current firmware");
    return;
  }

  esp_partition_iterator_t it = esp_partition_find(ESP_PARTITION_TYPE_APP, ESP_PARTITION_SUBTYPE_ANY, NULL);
  while (it != NULL) {
    const esp_partition_t* part = esp_partition_get(it);
    if (part->address == prevAddr) {
      esp_ota_set_boot_partition(part);
      Serial.println("[DBG-ota] boot partition reverted, restarting...");
      esp_partition_iterator_release(it);
      ESP.restart();
    }
    it = esp_partition_next(it);
  }
  esp_partition_iterator_release(it);
  Serial.println("[DBG-ota] previous partition not found -- cannot auto-revert, staying on current firmware");
}

// Checks the backend for a newer firmware target for this device and, if
// one exists, downloads and flashes it. Records the currently-running
// partition first so runOtaSelfTestOrRevert() can revert to it on the next
// boot if the new firmware doesn't pass its self-test.
void checkAndApplyFirmwareUpdate() {
  if (WiFi.status() != WL_CONNECTED) return;

  WiFiClientSecure checkClient;
  checkClient.setInsecure();
  HTTPClient checkHttp;
  checkHttp.setConnectTimeout(5000);
  checkHttp.setTimeout(5000);
  String checkUrl = String(SERVER_URL);
  checkUrl.replace("/gps/ingest", "/firmware/check?device_id=" + String(deviceId) + "&current_version=" + String(FIRMWARE_VERSION));
  checkHttp.begin(checkClient, checkUrl);
  checkHttp.addHeader("X-Device-Key", deviceKey);
  int checkStatus = checkHttp.GET();
  if (checkStatus < 200 || checkStatus >= 300) {
    Serial.printf("[DBG-ota] firmware check failed, HTTP %d\n", checkStatus);
    checkHttp.end();
    return;
  }
  String body = checkHttp.getString();
  checkHttp.end();

  if (body.indexOf("\"update_available\":true") == -1) {
    return; // up to date
  }

  // Relies on the backend emitting compact JSON with no extra whitespace (Express's
  // default -- do not enable `app.set('json spaces', ...)` on the backend, it would
  // silently break this string matching on every device in the fleet).
  int vStart = body.indexOf("\"version\":\"") + 11;
  int vEnd = body.indexOf('"', vStart);
  String newVersion = body.substring(vStart, vEnd);

  int mStart = body.indexOf("\"md5\":\"") + 7;
  int mEnd = body.indexOf('"', mStart);
  String newMd5 = body.substring(mStart, mEnd);

  int sStart = body.indexOf("\"size_bytes\":") + 13;
  int sEnd = sStart;
  while (sEnd < (int)body.length() && isDigit(body[sEnd])) sEnd++;
  long newSize = body.substring(sStart, sEnd).toInt();

  if (newVersion.length() == 0 || newMd5.length() == 0 || newSize <= 0) {
    Serial.println("[DBG-ota] malformed /firmware/check response, aborting");
    return;
  }

  // Guards against re-flashing the same "new" version forever if the device's
  // compiled FIRMWARE_VERSION and the admin-typed upload-form version string
  // ever disagree (e.g. the constant wasn't bumped before building a release).
  // Without this, checkAndApplyFirmwareUpdate() would see the same mismatched
  // "update_available:true" every boot and re-flash in an infinite loop,
  // never reaching loop()/GPS reporting again -- unrecoverable except by a
  // physical USB reflash.
  otaPrefs.begin("upbus-ota", false);
  String lastTried = otaPrefs.getString("last_try", "");
  otaPrefs.end();
  if (lastTried == newVersion) {
    Serial.println("[DBG-ota] already flashed this version but backend still reports it as available "
                   "-- FIRMWARE_VERSION likely doesn't match the uploaded version string, refusing to reflash");
    return;
  }

  Serial.printf("[DBG-ota] update available: %s (%ld bytes), downloading...\n", newVersion.c_str(), newSize);

  WiFiClientSecure dlClient;
  dlClient.setInsecure();
  HTTPClient dlHttp;
  dlHttp.setConnectTimeout(5000);
  dlHttp.setTimeout(20000);
  String dlUrl = String(SERVER_URL);
  dlUrl.replace("/gps/ingest", "/firmware/download/" + newVersion);
  dlHttp.begin(dlClient, dlUrl);
  dlHttp.addHeader("X-Device-Key", deviceKey);
  int dlStatus = dlHttp.GET();
  if (dlStatus != 200) {
    Serial.printf("[DBG-ota] download failed, HTTP %d\n", dlStatus);
    dlHttp.end();
    return;
  }

  if (!Update.begin(newSize)) {
    Serial.printf("[DBG-ota] Update.begin failed: %s\n", Update.errorString());
    dlHttp.end();
    return;
  }
  Update.setMD5(newMd5.c_str());

  WiFiClient* stream = dlHttp.getStreamPtr();
  size_t written = Update.writeStream(*stream);
  dlHttp.end();

  if (written != (size_t)newSize) {
    Serial.printf("[DBG-ota] wrote %u of %ld bytes, aborting\n", (unsigned)written, newSize);
    Update.abort();
    return;
  }

  if (!Update.end(true)) {
    Serial.printf("[DBG-ota] Update.end failed (likely MD5 mismatch): %s\n", Update.errorString());
    return;
  }

  // Record where we're booting from now so a failed self-test on the next
  // boot knows exactly which partition to fall back to.
  otaPrefs.begin("upbus-ota", false);
  otaPrefs.putUInt("prev_addr", (uint32_t)esp_ota_get_running_partition()->address);
  otaPrefs.putBool("pending", true);
  otaPrefs.putString("last_try", newVersion);
  otaPrefs.end();

  Serial.println("[DBG-ota] update applied, restarting...");
  ESP.restart();
}

// Builds a <select> of TC001..TC0{BUS_COUNT} that writes into the existing
// #device_id text field on change. Rendered as a raw custom-HTML parameter
// (no id of its own) so it's purely a UI convenience -- the actual saved/
// validated value still comes from the device_id field, which a technician
// can also type into directly if a bus isn't in this list.
String buildBusIdSelectHtml() {
  String html = "<label for='bus_select'>Bus ID (quick select)</label>"
                "<select id='bus_select' onchange=\"document.getElementById('device_id').value=this.value\">"
                "<option value=''>-- select TC001-TC0";
  html += String(BUS_COUNT);
  html += " --</option>";
  for (int i = 1; i <= BUS_COUNT; i++) {
    char id[8];
    snprintf(id, sizeof(id), "TC%03d", i);
    html += "<option value='" + String(id) + "'>" + String(id) + "</option>";
  }
  html += "</select><br/>";
  return html;
}

const unsigned long WIFI_INITIAL_TIMEOUT_MS = 15000; // first attempt at the last-known SSID
const unsigned long WIFI_AP_PORTAL_TIMEOUT_S = 60;   // AP stays open this long for registration
const unsigned long WIFI_RETRY_TIMEOUT_MS = 30000;   // retry last-known SSID this long before reopening the AP

// Polls BOOT for CONFIG_TRIGGER_WINDOW_MS right after boot and returns true
// the instant it's seen pressed. A single instantaneous digitalRead() at the
// top of setup() gives a human no realistic chance to press BOOT in time
// (the check happens within microseconds of power-on) -- and holding BOOT
// THROUGH the actual reset/power-on pulse doesn't reach this code at all,
// since the ESP32's ROM bootloader reads GPIO0 as a strapping pin at that
// exact moment and drops into UART download mode instead of ever starting
// the app. So the button must be pressed AFTER the app has already started
// (this function runs once Serial/modemSerial are already up), which is why
// this gives a multi-second window instead of a single check. The fast LED
// blink is the visual cue for "the window is open, press now".
bool checkForcePortal() {
  pinMode(CONFIG_TRIGGER_PIN, INPUT_PULLUP);
  unsigned long start = millis();
  unsigned long lastBlink = 0;
  unsigned long lastCountdownPrint = 0;
  int lastSecondsLeftPrinted = -1;
  bool blinkState = false;
  while (millis() - start < CONFIG_TRIGGER_WINDOW_MS) {
    if (digitalRead(CONFIG_TRIGGER_PIN) == LOW) {
      digitalWrite(WIFI_STATUS_LED_PIN, LOW);
      return true;
    }
    if (millis() - lastBlink >= CONFIG_TRIGGER_BLINK_MS) {
      lastBlink = millis();
      blinkState = !blinkState;
      digitalWrite(WIFI_STATUS_LED_PIN, blinkState);
    }
    // Countdown so it's unmistakable, over Serial, exactly how much of the
    // window is left -- helpful for diagnosing "pressed but not detected"
    // (wrong button vs. genuinely too late) without guessing from the LED.
    int secondsLeft = (CONFIG_TRIGGER_WINDOW_MS - (millis() - start)) / 1000 + 1;
    if (millis() - lastCountdownPrint >= 1000 && secondsLeft != lastSecondsLeftPrinted) {
      lastCountdownPrint = millis();
      lastSecondsLeftPrinted = secondsLeft;
      Serial.printf("[DBG-boot] ...%ds left to press BOOT\n", secondsLeft);
    }
  }
  digitalWrite(WIFI_STATUS_LED_PIN, LOW);
  return false;
}

// Reconnects using the SSID/password the ESP32 WiFi stack already has stored
// in flash from the last successful connection (no WiFiManager involved).
// Blinks WIFI_STATUS_LED_PIN fast while searching.
bool tryConnectSavedWifi(unsigned long timeoutMs) {
  WiFi.mode(WIFI_STA);
  WiFi.begin();
  unsigned long start = millis();
  unsigned long lastBlink = 0;
  bool blinkState = false;
  while (WiFi.status() != WL_CONNECTED && millis() - start < timeoutMs) {
    if (millis() - lastBlink >= WIFI_BLINK_SEARCH_MS) {
      lastBlink = millis();
      blinkState = !blinkState;
      digitalWrite(WIFI_STATUS_LED_PIN, blinkState);
    }
    delay(10);
  }
  return WiFi.status() == WL_CONNECTED;
}

void runWifiSetup(bool forcePortal) {
  bool connected = false;

  if (!forcePortal) {
    Serial.println("[DBG-wifi] trying last-known WiFi...");
    connected = tryConnectSavedWifi(WIFI_INITIAL_TIMEOUT_MS);
  }

  while (!connected) {
    Serial.printf("[DBG-wifi] opening setup AP for %lus...\n", WIFI_AP_PORTAL_TIMEOUT_S);

    WiFiManager wm;
    String busSelectHtml = buildBusIdSelectHtml(); // must outlive wm.startConfigPortal()/process() below
    WiFiManagerParameter paramBusSelect(busSelectHtml.c_str());
    WiFiManagerParameter paramDeviceId("device_id", "Device ID (e.g. TC001)", deviceId, sizeof(deviceId) - 1);
    WiFiManagerParameter paramDeviceKey("device_key", "Device Key (GPS_DEVICE_API_KEY)", deviceKey, sizeof(deviceKey) - 1);
    wm.addParameter(&paramBusSelect);
    wm.addParameter(&paramDeviceId);
    wm.addParameter(&paramDeviceKey);
    wm.setConfigPortalTimeout(WIFI_AP_PORTAL_TIMEOUT_S);
    wm.setConfigPortalBlocking(false); // so we can blink WIFI_STATUS_LED_PIN while the portal is open

    wm.startConfigPortal("UPBus-GPS-Setup", "upbus1234");

    unsigned long lastBlink = 0;
    bool blinkState = false;
    connected = false;
    while (wm.getConfigPortalActive()) {
      connected = wm.process();
      // WiFiManager::process() already calls shutdownConfigPortal() itself
      // on a successful connect (_disableConfigPortal defaults to true) --
      // calling wm.stopConfigPortal() again here double-shuts-down the same
      // dnsServer/server objects and crashes (Guru Meditation Error:
      // LoadProhibited) before saveDeviceConfig() ever runs, which is why
      // device_key never actually got persisted. Just break, don't call it.
      if (connected) break;
      if (millis() - lastBlink >= WIFI_BLINK_AP_MS) {
        lastBlink = millis();
        blinkState = !blinkState;
        digitalWrite(WIFI_STATUS_LED_PIN, blinkState);
      }
    }

    // Debug capture point: shows what the portal's HTTP form handler
    // actually parsed BEFORE it's copied into the global deviceId/deviceKey
    // buffers, so a value that was typed in the browser but lost somewhere
    // (WiFiManager parsing, captive-portal mini-browser quirks, etc.) can be
    // told apart from one that never reached the ESP32 at all.
    Serial.printf("[DBG-wifi] portal submitted: device_id=\"%s\" device_key_len=%d (raw from form, connected=%d)\n",
                  paramDeviceId.getValue(), (int)strlen(paramDeviceKey.getValue()), connected);

    strncpy(deviceId, paramDeviceId.getValue(), sizeof(deviceId) - 1);
    strncpy(deviceKey, paramDeviceKey.getValue(), sizeof(deviceKey) - 1);
    saveDeviceConfig();
    Serial.printf("[DBG-wifi] after save: device_id=\"%s\" device_key_len=%d\n", deviceId, (int)strlen(deviceKey));

    if (connected) break;

    Serial.println("[DBG-wifi] AP window closed with no registration, retrying last-known WiFi for 30s...");
    connected = tryConnectSavedWifi(WIFI_RETRY_TIMEOUT_MS);
    // if this also fails, the while loop reopens the AP
  }

  digitalWrite(WIFI_STATUS_LED_PIN, HIGH); // connected: solid ON
  Serial.println("WiFi connected, IP: " + WiFi.localIP().toString());
  Serial.printf("[DBG-cfg] device_id=\"%s\" device_key_len=%d\n", deviceId, (int)strlen(deviceKey));
}

// Sends AT+CGPSINFO and parses the reply:
// +CGPSINFO: <lat>,<N/S>,<lon>,<E/W>,<date>,<UTC time>,<alt>,<speed>,<course>
void pollGps() {
  String response = sendAtCommand("AT+CGPSINFO", 500);

  int idx = response.indexOf("+CGPSINFO:");
  if (idx == -1) {
    gpsFixed = false;
    Serial.println("[DBG-gps] no +CGPSINFO reply at all -- check wiring/baud/AT+CGPS=1 result above");
    return;
  }
  if (response.indexOf(",,,,,,,,") != -1) {
    gpsFixed = false;
    Serial.println("[DBG-gps] modem responded but no satellite fix yet");
    return;
  }

  String data = response.substring(idx + strlen("+CGPSINFO:"));
  int lineBreak = data.indexOf('\r');
  if (lineBreak < 0) lineBreak = data.indexOf('\n');
  if (lineBreak >= 0) data = data.substring(0, lineBreak);
  data.trim();

  // Fields: lat,N/S,lon,E/W,date,UTCtime,alt,speed(knots),course
  int c1 = data.indexOf(',');
  int c2 = data.indexOf(',', c1 + 1);
  int c3 = data.indexOf(',', c2 + 1);
  int c4 = data.indexOf(',', c3 + 1);
  int c5 = data.indexOf(',', c4 + 1);
  int c6 = data.indexOf(',', c5 + 1);
  int c7 = data.indexOf(',', c6 + 1);
  int c8 = data.indexOf(',', c7 + 1);

  if (c1 < 0 || c2 < 0 || c3 < 0 || c4 < 0) {
    gpsFixed = false;
    Serial.println("[DBG-gps] malformed CGPSINFO reply");
    return;
  }

  String latRaw = data.substring(0, c1);
  String latDir = data.substring(c1 + 1, c2);
  String lngRaw = data.substring(c2 + 1, c3);
  String lngDir = data.substring(c3 + 1, c4);

  gpsLat = convertToDecimal(latRaw);
  if (latDir == "S") gpsLat = -gpsLat;
  gpsLng = convertToDecimal(lngRaw);
  if (lngDir == "W") gpsLng = -gpsLng;

  gpsSpeedKmh = 0;
  gpsCourseDeg = 0;
  if (c7 > 0 && c8 > 0) {
    float speedKnots = data.substring(c7 + 1, c8).toFloat();
    gpsSpeedKmh = speedKnots * 1.852; // CGPSINFO reports speed in knots
    gpsCourseDeg = data.substring(c8 + 1).toFloat();
  }

  gpsFixed = true;
  Serial.printf("[DBG-gps] fix lat=%.6f lng=%.6f speed=%.1f course=%.1f\n", gpsLat, gpsLng, gpsSpeedKmh, gpsCourseDeg);
}

// Toggled (not latched) so each call visibly blinks GPS_SEND_OK_LED_PIN or
// GPS_SEND_FAIL_LED_PIN in step with the send rhythm, rather than holding solid.
bool gpsSendOkBlinkState = false;
bool gpsSendFailBlinkState = false;

void sendPosition(double lat, double lng, double speedKmh, double bearingDeg) {
  if (WiFi.status() != WL_CONNECTED) {
    digitalWrite(GPS_SEND_OK_LED_PIN, LOW);
    gpsSendFailBlinkState = !gpsSendFailBlinkState;
    digitalWrite(GPS_SEND_FAIL_LED_PIN, gpsSendFailBlinkState);
    return; // WiFiManager keeps trying to reconnect in the background
  }

  WiFiClientSecure client;
  client.setInsecure(); // DEBUG: skip TLS cert validation to isolate HTTPS vs. other failures
  client.setTimeout(5); // seconds — bound the TCP/TLS connect, don't let a bad link hang for minutes

  HTTPClient http;
  http.setConnectTimeout(5000);  // ms — TCP+TLS handshake budget
  http.setTimeout(5000);         // ms — response wait budget
  http.begin(client, SERVER_URL);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("X-Device-Key", deviceKey);

  String body = String("{\"device_id\":\"") + deviceId +
                "\",\"lat\":" + String(lat, 6) +
                ",\"lng\":" + String(lng, 6) +
                ",\"speed\":" + String(speedKmh, 2) +
                ",\"bearing\":" + String(bearingDeg, 2) + "}";

  unsigned long postStart = millis();
  int statusCode = http.POST(body);
  unsigned long postMs = millis() - postStart;
  bool sendOk = statusCode >= 200 && statusCode < 300;
  if (sendOk) {
    gpsSendOkBlinkState = !gpsSendOkBlinkState;
    digitalWrite(GPS_SEND_OK_LED_PIN, gpsSendOkBlinkState);
    digitalWrite(GPS_SEND_FAIL_LED_PIN, LOW);
  } else {
    digitalWrite(GPS_SEND_OK_LED_PIN, LOW);
    gpsSendFailBlinkState = !gpsSendFailBlinkState;
    digitalWrite(GPS_SEND_FAIL_LED_PIN, gpsSendFailBlinkState);
  }
  if (statusCode > 0) {
    Serial.printf("[DBG-http] POST -> %d (%lu ms)\n", statusCode, postMs);
    Serial.println(http.getString());
  } else {
    Serial.printf("[DBG-http] POST failed: %d (%s) (%lu ms)\n", statusCode, http.errorToString(statusCode).c_str(), postMs);
  }
  http.end();
}

void setup() {
  Serial.begin(115200);
  modemSerial.begin(MODEM_BAUD, SERIAL_8N1, MODEM_RX_PIN, MODEM_TX_PIN);

  pinMode(WIFI_LED_PIN, OUTPUT);
  digitalWrite(WIFI_LED_PIN, LOW);

  pinMode(WIFI_STATUS_LED_PIN, OUTPUT);
  digitalWrite(WIFI_STATUS_LED_PIN, LOW);
  pinMode(GPS_SEND_OK_LED_PIN, OUTPUT);
  digitalWrite(GPS_SEND_OK_LED_PIN, LOW);
  pinMode(GPS_SEND_FAIL_LED_PIN, OUTPUT);
  digitalWrite(GPS_SEND_FAIL_LED_PIN, LOW);

  // checkForcePortal() needs WIFI_STATUS_LED_PIN already in OUTPUT mode
  // (above) to blink its "press BOOT now" cue, so it must run after that.
  Serial.println("[DBG-boot] hold BOOT now to force the setup AP (" + String(CONFIG_TRIGGER_WINDOW_MS / 1000) + "s window)...");
  bool forcePortal = checkForcePortal();
  Serial.println(forcePortal ? "[DBG-boot] BOOT pressed -- forcing setup AP" : "[DBG-boot] window closed, no BOOT press seen");

  loadDeviceConfig();
  runWifiSetup(forcePortal);

  runOtaSelfTestOrRevert();
  checkAndApplyFirmwareUpdate();
  lastFirmwareCheckMs = millis();

  bool modemReady = waitForModemReady(15000); // cold power-on can take longer than a flat delay to boot
  Serial.printf("[DBG-modem] ready=%s\n", modemReady ? "yes" : "NO (timed out, trying AT+CGPS=1 anyway)");

  // Field-tested: right after the modem starts answering plain AT, AT+CGPS=1
  // can still come back ERROR because the GNSS subsystem itself isn't ready
  // yet. A few quick retries here recover in seconds instead of waiting for
  // the GPS_REARM_INTERVAL_MS fallback loop in loop() below.
  const int GPS_ENABLE_BOOT_RETRIES = 5;
  const unsigned long GPS_ENABLE_RETRY_DELAY_MS = 2000;
  for (int attempt = 1; attempt <= GPS_ENABLE_BOOT_RETRIES; attempt++) {
    if (enableGps()) break;
    if (attempt < GPS_ENABLE_BOOT_RETRIES) delay(GPS_ENABLE_RETRY_DELAY_MS);
  }
  lastGpsRearmMs = millis();
}

void loop() {
  digitalWrite(WIFI_LED_PIN, WiFi.status() == WL_CONNECTED ? HIGH : LOW);
  digitalWrite(WIFI_STATUS_LED_PIN, WiFi.status() == WL_CONNECTED ? HIGH : LOW);

  if (!gpsFixed) {
    digitalWrite(GPS_SEND_OK_LED_PIN, LOW);
    digitalWrite(GPS_SEND_FAIL_LED_PIN, HIGH); // solid ON: no GPS signal

    if (millis() - lastGpsRearmMs >= GPS_REARM_INTERVAL_MS) {
      lastGpsRearmMs = millis();
      Serial.println("[DBG-gps] still no fix -- resending AT+CGPS=1 in case it was missed at boot");
      enableGps();
    }
  }

  if (millis() - lastFirmwareCheckMs >= FIRMWARE_CHECK_INTERVAL_MS) {
    lastFirmwareCheckMs = millis();
    checkAndApplyFirmwareUpdate();
  }

  if (millis() - lastGpsPollMs >= GPS_POLL_INTERVAL_MS) {
    lastGpsPollMs = millis();
    pollGps();
    if (gpsFixed) {
      sendPosition(gpsLat, gpsLng, gpsSpeedKmh, gpsCourseDeg);
    }
  }
}
