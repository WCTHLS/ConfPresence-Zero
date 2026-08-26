# POC test plan

## Test set

- 2 Android phones: basic discovery.
- 5 Android phones: small mesh.
- 1 presenter + 4 attendees: anchor labelling.
- One nearby corridor or second room: false-proximity measurement.

## Record for every run

- number of phones participating;
- time to first discovery;
- API update latency;
- number of peer observations per phone;
- presenter-cluster member count;
- false observations from adjacent space;
- Bluetooth permission / adapter failures.

## Success criterion

For a 5-phone same-room run, the API should return the presenter plus at least three other phones as the estimated Room A cluster within 60 seconds. Record exceptions rather than hiding them.
