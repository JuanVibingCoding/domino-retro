# Especificación Técnica de Reglas: Dominó Venezolano (Modalidad Tradicional por Parejas)

Este documento contiene el conjunto de reglas estricto, absoluto y sin excepciones del Dominó Venezolano para su implementación en un motor de juego online. Diseñado para procesamiento por IA de desarrollo de software.

---

## 1. Componentes del Juego y Configuración Inicial
* **Fichas:** Se utiliza el set de Dominó Doble Seis (28 fichas), desde el Blanco Doble (0-0) hasta el Seis Doble (6-6).
* **Jugadores:** Exactamente 4 jugadores distribuidos en 2 parejas fijas enfrentadas (Jugador 1 y Jugador 3 son la Pareja A; Jugador 2 y Jugador 4 son la Pareja B).
* **Distribución:** Al inicio de cada ronda, las fichas se barajan ("fregar" o "pasar" las fichas) y se reparten **7 fichas a cada jugador**. No quedan fichas en la reserva ("el pozo").

---

## 2. Dinámica del Flujo de Juego y Turnos
* **Sentido de Rotación:** El juego fluye estrictamente en **sentido contrario a las agujas del reloj** (hacia la derecha).
* **La Mano (Inicio del Juego - Primera Ronda):**
    * La primera ronda de la partida la inicia obligatoriamente el jugador que posea el **Seis Doble (6-6)**, también conocido popularmente en Venezuela como "La Cochina".
    * Este jugador tiene la "mano". Juega el 6-6 como primera ficha del tablero.
* **Rondas Posteriores (Salida Libre):**
    * En la segunda ronda y consecutivas, la salida es **libre**.
    * El derecho a salir rota al jugador inmediatamente a la derecha del que salió en la ronda anterior (siguiendo el sentido antihorario).
    * El jugador con el turno de salida puede jugar **cualquier ficha de su mano** (no está obligado a salir con un doble).

---

## 3. Mecánica de Colocación de Fichas
* **Puntas Abiertas:** El tablero cuenta únicamente con 2 extremos o "puntas" libres para conectar fichas.
* **Regla de Emparejamiento:** Un jugador puede colocar una ficha solo si uno de sus lados coincide numéricamente con el número de una de las dos puntas abiertas.
* **Paso Obligatorio:** Si un jugador en su turno no tiene ninguna ficha en su mano que coincida con ninguna de las dos puntas, está obligado a **"pasar"** (ceder el turno al siguiente jugador).
    * *Excepción/Validación:* El sistema no debe permitir que un jugador pase si tiene al menos una ficha jugable. El paso es automático o mandatorio si no hay jugadas válidas.
* **Colocación Visual (Frontend/Lógica):** Los dobles se colocan de forma transversal (perpendicular) a la línea de juego, pero no abren nuevas vías de juego (el juego sigue siendo bidireccional).

---

## 4. Condiciones de Finalización de una Ronda
Una ronda finaliza inmediatamente por una de las siguientes dos condiciones:

### A. Dominada (Cierre Natural)
* Un jugador se queda sin fichas en su mano tras colocar su última ficha legal.
* A este jugador se le denomina "Ganador" de la ronda.
* Su pareja gana la ronda de forma colectiva.

### B. Trancado (Cierre de Mesa o Bloqueo)
* Ocurre cuando ningún jugador en la mesa tiene fichas jugables en sus manos para ninguna de las dos puntas abiertas (las 7 fichas de ese número ya han sido jugadas en el tablero).
* El juego queda bloqueado o "trancado".
* **Resolución del Trancado (Cómputo de Puntos):**
    1.  Cada jugador suma individualmente el total de puntos (pintas) de las fichas que le quedan en la mano.
    2.  Se suman los puntos de los dos miembros de la **Pareja A** y los de los dos miembros de la **Pareja B**.
    3.  **Ganador del Trancado:** La pareja con la **menor puntuación total** combinada gana la ronda.
    4.  **Regla de Empate en Trancado:** En caso de que ambas parejas sumen exactamente la misma cantidad de puntos, ocurre un empate técnico. En el dominó venezolano tradicional, la regla estricta dicta que **gana la ronda la pareja del jugador que realizó la tranca** (el que colocó la última ficha que provocó el bloqueo).

---

## 5. Sistema de Puntuación (Score) de la Partida
* **Meta de la Partida:** La partida se juega a una meta fija, siendo el estándar venezolano absoluto de **100 puntos** o **200 puntos** (configurable por el juego, por defecto 100). La primera pareja en alcanzar o superar esta puntuación gana la partida.
* **Conteo de Puntos por Ronda:**
    * La pareja ganadora de la ronda (ya sea por Dominada o por Trancado) suma los puntos de **todas las fichas que quedaron en manos de los 4 jugadores** de la mesa (incluyendo las de su propio compañero y las de los rivales).
    * *Nota de desarrollo:* El ganador de una Dominada obviamente tiene 0 puntos en mano, por lo que se suman los puntos de las manos de los otros 3 jugadores de la mesa. En el Trancado, se suman los puntos de las 4 manos remanentes.

---

## 6. Reglas Especiales y "Zapato" (Condición de Victoria de K.O.)
* **El "Zapato" (Blanqueada):** Si una pareja logra alcanzar la meta de la partida (ej. 100 puntos) mientras que la pareja contraria permanece estrictamente en **0 puntos**, se declara una victoria por "Zapato". Esto equivale a una victoria perfecta o por nocaut (K.O.).
* **Continuidad de la Mano tras Trancado:** El jugador que tiene el derecho a salir en la siguiente ronda sigue estrictamente el orden de rotación antihoraria respecto a la ronda anterior, independientemente de quién haya ganado el Trancado.

---

## 7. Validaciones estrictas para el Motor/Backend (Lógica de la IA)
1.  **Validación de Salida:** En la Ronda 1, bloquear cualquier acción que no sea la colocación del 6-6 por el poseedor legal de dicha ficha.
2.  **Validación de Turno:** Impedir el paso manual si el array de fichas del jugador contiene elementos con valores coincidentes con las puntas del tablero.
3.  **Cómputo Automático:** Al activarse el flag de `RondaTerminada`, congelar el tablero, extraer el peso numérico de las manos restantes, aplicar lógica de desempate por tranca si aplica, e incrementar el acumulador global de la pareja ganadora.
