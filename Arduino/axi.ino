#include <Servo.h>

Servo meuServo;  // Cria um objeto Servo

void setup() {
  // Inicializa o Monitor Serial
  Serial.begin(9600);
  Serial.println("Iniciando controle do servo...");

  // Associa o servo ao pino digital 9
  meuServo.attach(9);

  // Começa a girar no sentido horário
  meuServo.write(0); // Valor 0 indica rotação no sentido horário em rotação contínua
  Serial.println("Servo girando no sentido horário");
}

void loop() {
 
}