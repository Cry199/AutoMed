#include "esp_camera.h"
#include <WiFi.h>
#include <HTTPClient.h>
#include <ESP32Servo.h>  

const char* ssid = "MTK";
const char* password = "MTK10101010";

const char* serverUrl = "http://192.168.15.8:3000/frame";
const int recordingTime = 15000;  // 15s
const int frameInterval = 1000;   // Intervalo entre frames (aumentado para 1s)

Servo myServo;  // Cria o objeto Servo para controle do servo
const int servoPin = 14; // Defina o pino ao qual o servo está conectado

void setup() {
  Serial.begin(115200);
  WiFi.begin(ssid, password);

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nWiFi conectado!");

  if (!startCamera()) {
    Serial.println("Erro ao iniciar a câmera.");
    return;
  }
  Serial.println("Câmera iniciada!");
  
  configureSensor();  
  
  // Configuração do servo, pode comentar esta linha para teste
  myServo.attach(servoPin);  
  myServo.write(0);  
}

void loop() {
  long startTime = millis();
  bool isLastFrame;

  while (millis() - startTime < recordingTime) {
    isLastFrame = (millis() + frameInterval >= startTime + recordingTime);
    sendFrame(isLastFrame);
    
    // Controla o servo motor (pode comentar para teste)
    moveServo();

    delay(frameInterval);
  }

  Serial.println("Gravação concluída. Aguardando próxima sessão...");
  delay(180000); 
  Serial.println("Próxima sessão...");
}

void moveServo() {
  static int pos = 0;
  static int increment = 1;
  
  myServo.write(pos);  

  pos += increment; 

  if (pos >= 180 || pos <= 0) {
    increment = -increment;
  }
}

bool startCamera() {
  camera_config_t config;
  config.ledc_channel = LEDC_CHANNEL_0;
  config.ledc_timer = LEDC_TIMER_0;
  config.pin_d0 = 5;
  config.pin_d1 = 18;
  config.pin_d2 = 19;
  config.pin_d3 = 21;
  config.pin_d4 = 36;
  config.pin_d5 = 39;
  config.pin_d6 = 34;
  config.pin_d7 = 35;
  config.pin_xclk = 0;
  config.pin_pclk = 22;
  config.pin_vsync = 25;
  config.pin_href = 23;
  config.pin_sscb_sda = 26;
  config.pin_sscb_scl = 27;
  config.pin_pwdn = 32;
  config.pin_reset = -1;
  config.xclk_freq_hz = 20000000;       
  config.pixel_format = PIXFORMAT_JPEG; 
  
  config.frame_size = FRAMESIZE_QVGA;   
  config.jpeg_quality = 12;             
  config.fb_count = 2;                  

  return esp_camera_init(&config) == ESP_OK;
}

void configureSensor() {
  sensor_t* s = esp_camera_sensor_get();
  if (s) {
    s->set_brightness(s, 1);    
    s->set_contrast(s, 1);      
    s->set_saturation(s, 0);    
    s->set_whitebal(s, 1);      
    s->set_awb_gain(s, 1);      
    s->set_exposure_ctrl(s, 1); 
    s->set_gainceiling(s, (gainceiling_t)2);  
  }
}

void sendFrame(bool isLastFrame) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi desconectado.");
    return;
  }

  camera_fb_t* fb = esp_camera_fb_get();
  if (!fb) {
    Serial.println("Erro ao capturar frame. Reiniciando câmera...");
    esp_camera_deinit();       
    startCamera();             
    return;
  }

  HTTPClient http;
  String url = String(serverUrl) + "?isLastFrame=" + (isLastFrame ? "true" : "false");
  http.begin(url);
  http.addHeader("Content-Type", "application/octet-stream");

  int httpResponseCode = http.POST(fb->buf, fb->len);
  if (httpResponseCode == 200) {
    Serial.println("Frame enviado com sucesso.");
  } else {
    Serial.printf("Erro ao enviar frame. Código HTTP: %d\n", httpResponseCode);
  }

  http.end();
  esp_camera_fb_return(fb);
}
