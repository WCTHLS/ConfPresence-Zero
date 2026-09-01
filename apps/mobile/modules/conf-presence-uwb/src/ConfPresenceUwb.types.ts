export type UwbUpdate = {
  rotatingId: string;
  distanceMeters?: number;
  direction?: { x: number; y: number; z: number };
  seenAt: string;
};

export type UwbSessionEnded = {
  rotatingId: string;
  reason: string;
};

export type ConfPresenceUwbModuleEvents = {
  ConfPresenceUwbUpdate: (update: UwbUpdate) => void;
  ConfPresenceUwbSessionEnded: (event: UwbSessionEnded) => void;
};
