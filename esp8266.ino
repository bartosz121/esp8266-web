#include <time.h>
#include <ESP8266WiFi.h>
#include <OneWire.h>
#include <DallasTemperature.h>

// wifi
const char *ssid = "VAR_SSID";
const char *password = "VAR_PASSWORD";

// api info
const char *host = "VAR_ESP8266_HOST";
const int httpsPort = 443;
const char *endpoint = "/data";

// sensors setup
const int ledPin = D2;     // GPIO4, external LED
const int oneWireBus = D4; // NodeMCU D4 pin = GPIO2
OneWire oneWire(oneWireBus);
DallasTemperature sensors(&oneWire);

unsigned long getUnixTime()
{
    static bool timeInitialized = false;

    if (!timeInitialized)
    {
        configTime(0, 0, "pool.ntp.org", "time.nist.gov");
        Serial.print("Syncing NTP time");
        time_t now = time(nullptr);
        int retries = 0;
        while (now < 100000 && retries < 30)
        { // wait ~15 sec max
            delay(500);
            Serial.print(".");
            now = time(nullptr);
            retries++;
        }
        Serial.println();
        if (now >= 100000)
        {
            Serial.println("NTP time synchronized");
            timeInitialized = true;
        }
        else
        {
            Serial.println("Failed to sync NTP time");
        }
    }

    time_t now = time(nullptr);
    return (unsigned long)now; // UTC timestamp
}

void blinkLED(int times, int durationMs)
{
    for (int i = 0; i < times; i++)
    {
        digitalWrite(ledPin, HIGH);
        delay(durationMs);
        digitalWrite(ledPin, LOW);
        delay(durationMs);
    }
}

void setup()
{
    Serial.begin(9600);

    pinMode(ledPin, OUTPUT);
    digitalWrite(ledPin, LOW); // LED off initially

    blinkLED(3, 200);

    // connect to wifi
    WiFi.begin(ssid, password);
    Serial.print("Connecting to wifi");
    while (WiFi.status() != WL_CONNECTED)
    {
        blinkLED(1, 100);
        delay(500);
        Serial.print(".");
    }
    Serial.println("\nConnected! IP address: ");
    Serial.println(WiFi.localIP());

    sensors.begin();

    getUnixTime();

    Serial.print("setup done");
}

void loop()
{
    blinkLED(1, 100);
    sensors.requestTemperatures();
    float tempC = sensors.getTempCByIndex(0);

    if (tempC == DEVICE_DISCONNECTED_C)
    {
        Serial.println("error reading temperature");
        delay(5000);
        return;
    }

    Serial.print("Temperature: ");
    Serial.print(tempC);
    Serial.println("°C");

    unsigned long timestamp = getUnixTime();

    // build JSON payload
    String jsonPayload = "{\"tempCo\": " + String(tempC, 2) +
                         ", \"tempRoom\": " + String(tempC, 2) +
                         ", \"timestamp\": " + String(timestamp) + "}";

    // setup connection
    WiFiClientSecure client;
    client.setInsecure();

    Serial.print("Connecting to ");
    Serial.println(host);
    if (!client.connect(host, httpsPort))
    {
        Serial.println("Connection to api host failed!");
        delay(5000);
        return;
    }

    // send request
    String request =
        String("POST ") + endpoint + " HTTP/1.1\r\n" +
        "Host: " + host + "\r\n" +
        "User-Agent: ESP8266/1.0\r\n" +
        "X-Secret-Key: VAR_SECRET\n" +
        "Content-Type: application/json\r\n" +
        "Connection: close\r\n" +
        "Content-Length: " + jsonPayload.length() + "\r\n\r\n" +
        jsonPayload + "\r\n";

    client.print(request);

    Serial.println("Request sent:");
    Serial.println(request);

    // wait for server response
    while (client.connected())
    {
        String line = client.readStringUntil('\n');
        if (line == "\r")
            break; // headers end
    }

    String statusLine = client.readStringUntil('\n');
    Serial.print("Response: ");
    Serial.println(statusLine);

    client.stop();
    delay(30000); // wait 30 seconds between updates
}