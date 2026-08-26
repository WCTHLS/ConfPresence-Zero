# Four-day POC scope

## Question being tested

Can nearby enrolled Android phones create enough BLE observations for the backend to form a presenter-anchored room cluster?

## Definition of done

1. Two physical Android phones advertise and scan a ConfPresence service UUID.
2. Each phone uploads a compact batch every 15 seconds.
3. The presenter starts Room A and joins the same session as attendees.
4. The API returns the cluster containing the presenter and its estimated members.
5. The dashboard updates inside 30 seconds of a new batch.

## Guardrails

- Do not store Bluetooth MAC addresses.
- Do not collect microphone audio or Wi-Fi fingerprints.
- Show the output as `estimated presence`, not proof of attendance.
- Require the app to be open for the initial Android POC.
