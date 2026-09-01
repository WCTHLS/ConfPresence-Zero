export type ConfPresencePeer = {
  rotatingId: string;
  rssi: number;
  seenAt: string;
};

export type ConfPresenceBleModuleEvents = {
  ConfPresencePeerDetected: (peer: ConfPresencePeer) => void;
};
