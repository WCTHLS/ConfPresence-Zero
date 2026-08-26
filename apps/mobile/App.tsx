import { registerRootComponent } from "expo";
import { StatusBar } from "expo-status-bar";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Button,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import type { ParticipantRole, RoomMemberInfo } from "@confpresence/shared";
import { PresenceService, type PresenceStatus } from "./src/services/presenceService";
import { getOrCreateDeviceId } from "./src/services/deviceIdentity";

const DEFAULT_SESSION = "poc-session";
const DEFAULT_ROOMS = ["room-a", "room-b", "auditorium"];
const DEFAULT_API_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://192.168.0.195:3000";

export default function App() {
  const [role, setRole] = useState<ParticipantRole>("attendee");
  const [sessionId, setSessionId] = useState(DEFAULT_SESSION);
  const [serverUrl, setServerUrl] = useState(DEFAULT_API_URL);
  const [showServerConfig, setShowServerConfig] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [rooms, setRooms] = useState<string[]>(DEFAULT_ROOMS);
  const [roomId, setRoomId] = useState("room-a");
  const [detectedRoom, setDetectedRoom] = useState("");
  const [newRoomText, setNewRoomText] = useState("");
  const [showAddRoom, setShowAddRoom] = useState(false);
  const [deviceId, setDeviceId] = useState("");
  const [status, setStatus] = useState<PresenceStatus>({ state: "idle", peerCount: 0 });
  const [running, setRunning] = useState(false);
  const runningRef = useRef(false);
  const [roomMembers, setRoomMembers] = useState<RoomMemberInfo[]>([]);
  const [serverConnected, setServerConnected] = useState<boolean | null>(null);
  const [isAutoDetecting, setIsAutoDetecting] = useState(false);

  const service = useMemo(() => new PresenceService(setStatus), []);

  useEffect(() => {
    getOrCreateDeviceId().then(setDeviceId);
    return () => {
      runningRef.current = false;
      void service.stop();
    };
  }, [service]);

  const fetchLiveRoom = async () => {
    if (!runningRef.current) return;

    try {
      const url =
        role === "presenter"
          ? `${serverUrl}/api/rooms/${roomId}/live?sessionId=${sessionId}`
          : `${serverUrl}/api/devices/${deviceId}/live?sessionId=${sessionId}`;

      const res = await fetch(url);
      if (!runningRef.current) return;

      if (res.ok) {
        setServerConnected(true);
        const data = await res.json();
        if (!runningRef.current) return;

        if (data.roomId && data.roomId !== "unknown") {
          setDetectedRoom(data.roomId);
        } else {
          setDetectedRoom("");
        }

        let fetchedMembers: RoomMemberInfo[] = [];
        if (Array.isArray(data.members)) {
          fetchedMembers = data.members;
        } else if (Array.isArray(data.estimatedMemberDeviceIds)) {
          fetchedMembers = data.estimatedMemberDeviceIds.map((id: string) => ({
            deviceId: id,
            displayName: id,
            role: "attendee"
          }));
        }

        // Optimistic Host Inclusion for Presenter
        if (role === "presenter") {
          const hasMe = fetchedMembers.some((m) => m.deviceId === deviceId);
          if (!hasMe) {
            fetchedMembers.unshift({
              deviceId,
              displayName: displayName.trim() || deviceId,
              role: "presenter",
              confidence: 1.0
            });
          }
        }

        if (runningRef.current) {
          setRoomMembers(fetchedMembers);
        }
      } else {
        if (!runningRef.current) return;
        setServerConnected(false);
        if (role === "presenter") {
          setRoomMembers([{
            deviceId,
            displayName: displayName.trim() || deviceId,
            role: "presenter",
            confidence: 1.0
          }]);
        }
      }
    } catch {
      if (!runningRef.current) return;
      setServerConnected(false);
      if (role === "presenter") {
        setRoomMembers([{
          deviceId,
          displayName: displayName.trim() || deviceId,
          role: "presenter",
          confidence: 1.0
        }]);
      }
    }
  };

  useEffect(() => {
    if (!running) {
      runningRef.current = false;
      setRoomMembers([]);
      setDetectedRoom("");
      setServerConnected(null);
      return;
    }

    runningRef.current = true;
    // Set initial optimistic host view for presenter right on start
    if (role === "presenter" && deviceId) {
      setRoomMembers([{
        deviceId,
        displayName: displayName.trim() || deviceId,
        role: "presenter",
        confidence: 1.0
      }]);
    }
    fetchLiveRoom();
    const interval = setInterval(() => fetchLiveRoom(), 3000);
    return () => clearInterval(interval);
  }, [running, role, roomId, sessionId, serverUrl, deviceId]);

  const togglePresence = async (enabled: boolean) => {
    runningRef.current = enabled;
    setRunning(enabled);
    try {
      if (enabled) {
        await service.start({
          sessionId,
          roomId: role === "presenter" ? roomId : undefined,
          role,
          deviceId,
          displayName: displayName.trim() || undefined,
          apiUrl: serverUrl
        });
      } else {
        await service.stop();
        setRoomMembers([]);
        setDetectedRoom("");
        setServerConnected(null);
      }
    } catch (error) {
      runningRef.current = false;
      setRunning(false);
      setRoomMembers([]);
      setDetectedRoom("");
      setServerConnected(null);
      Alert.alert("Unable to start BLE", error instanceof Error ? error.message : "Unknown BLE error");
    }
  };

  const autoDetectServerIP = async () => {
    setIsAutoDetecting(true);
    const candidateIPs = [
      serverUrl,
      "http://192.168.0.195:3000",
      "http://192.168.0.110:3000",
      "http://192.168.0.100:3000",
      "http://192.168.1.195:3000"
    ];
    const unique = Array.from(new Set(candidateIPs));

    for (const base of unique) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 1200);
        const res = await fetch(`${base}/health`, { signal: controller.signal });
        clearTimeout(timeoutId);
        if (res.ok) {
          const data = await res.json();
          if (data.ok) {
            setServerUrl(base);
            setServerConnected(true);
            setIsAutoDetecting(false);
            Alert.alert("Server Discovered!", `Connected to laptop API server at:\n${base}`);
            return;
          }
        }
      } catch {
        // Probe next candidate
      }
    }
    setIsAutoDetecting(false);
    Alert.alert("Auto-Detect Failed", "Could not reach laptop API on local Wi-Fi. Make sure `pnpm --filter @confpresence/api dev` is running on your laptop.");
  };

  const handleAddRoom = () => {
    const trimmed = newRoomText.trim().toLowerCase().replace(/\s+/g, "-");
    if (!trimmed) {
      setShowAddRoom(false);
      return;
    }
    if (!rooms.includes(trimmed)) {
      setRooms([...rooms, trimmed]);
      setRoomId(trimmed);
    }
    setNewRoomText("");
    setShowAddRoom(false);
  };

  const handleRemoveRoom = (roomToRemove: string) => {
    if (rooms.length <= 1) {
      Alert.alert("Notice", "You must keep at least one room.");
      return;
    }
    const updated = rooms.filter((r) => r !== roomToRemove);
    setRooms(updated);
    if (roomId === roomToRemove) {
      setRoomId(updated[0]);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>ConfPresence ZERO</Text>
        <Text style={styles.subtitle}>Zero-Hardware Dual-Sensor Presence Engine (BLE + Wi-Fi)</Text>

        <Text style={styles.label}>Role</Text>
        <View style={styles.roleRow}>
          <Button title="Attendee" onPress={() => setRole("attendee")} color={role === "attendee" ? "#126D7A" : "#75808A"} />
          <Button title="Presenter" onPress={() => setRole("presenter")} color={role === "presenter" ? "#126D7A" : "#75808A"} />
        </View>

        <Text style={styles.label}>Your name (optional)</Text>
        <TextInput
          editable={!running}
          value={displayName}
          onChangeText={setDisplayName}
          placeholder="e.g. Alice, Bob, Dr. Smith"
          placeholderTextColor="#8C9BA5"
          style={styles.input}
          autoCapitalize="words"
        />

        <Text style={styles.label}>Session code</Text>
        <TextInput
          editable={!running}
          value={sessionId}
          onChangeText={setSessionId}
          placeholder="e.g. poc-session"
          placeholderTextColor="#8C9BA5"
          style={styles.input}
          autoCapitalize="none"
        />

        {/* Room Management Section - Presenter Only */}
        {role === "presenter" && (
          <View style={styles.roomSection}>
            <View style={styles.roomHeaderRow}>
              <Text style={styles.label}>Anchor Room ID</Text>
              {!running && !showAddRoom && (
                <TouchableOpacity
                  style={styles.addRoomBtn}
                  onPress={() => setShowAddRoom(true)}
                >
                  <Text style={styles.addRoomBtnText}>+ Add Room</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Room Selection Chips */}
            <View style={styles.roomChipsWrap}>
              {rooms.map((r) => {
                const isSelected = r === roomId;
                return (
                  <TouchableOpacity
                    key={r}
                    disabled={running}
                    style={[styles.roomChip, isSelected && styles.roomChipSelected]}
                    onPress={() => setRoomId(r)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.roomChipText, isSelected && styles.roomChipTextSelected]}>
                      {r}
                    </Text>
                    {!running && rooms.length > 1 && (
                      <TouchableOpacity
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        style={styles.roomDeleteIcon}
                        onPress={() => handleRemoveRoom(r)}
                      >
                        <Text style={[styles.roomDeleteText, isSelected && styles.roomDeleteTextSelected]}>✕</Text>
                      </TouchableOpacity>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Add New Room Input Row */}
            {!running && showAddRoom && (
              <View style={styles.addRoomInputRow}>
                <TextInput
                  value={newRoomText}
                  onChangeText={setNewRoomText}
                  placeholder="e.g. hall-b, workshop-1"
                  placeholderTextColor="#8C9BA5"
                  style={styles.addRoomInput}
                  autoCapitalize="none"
                  autoFocus
                />
                <TouchableOpacity style={styles.addRoomSaveBtn} onPress={handleAddRoom}>
                  <Text style={styles.addRoomSaveText}>Save</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.addRoomCancelBtn}
                  onPress={() => {
                    setNewRoomText("");
                    setShowAddRoom(false);
                  }}
                >
                  <Text style={styles.addRoomCancelText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        <View style={styles.startRow}>
          <View>
            <Text style={styles.startTitle}>Share presence</Text>
            <Text style={styles.help}>The POC scans only while the app is open.</Text>
          </View>
          <Switch value={running} onValueChange={togglePresence} />
        </View>

        {/* Live Connected Devices & Presence Dashboard */}
        <View style={styles.statsCard}>
          <View style={styles.statsHeaderRow}>
            <Text style={styles.statsHeader}>Live Connected Presence</Text>
            <TouchableOpacity
              style={styles.refreshButton}
              onPress={() => fetchLiveRoom()}
              activeOpacity={0.7}
            >
              <Text style={styles.refreshButtonText}>🔄 Refresh</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.statsGrid}>
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>{status.peerCount}</Text>
              <Text style={styles.statLabel}>BLE Peers</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>{status.wifiApCount ?? 0}</Text>
              <Text style={styles.statLabel}>Wi-Fi APs</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>{running ? roomMembers.length : 0}</Text>
              <Text style={styles.statLabel}>
                {role === "presenter"
                  ? `In Room\n(${roomId})`
                  : detectedRoom
                  ? `In Room\n(${detectedRoom})`
                  : "In Room\n(Searching)"}
              </Text>
            </View>
          </View>

          {/* In-Room Participants Table */}
          {running && roomMembers.length > 0 && (
            <View style={styles.tableContainer}>
              <Text style={styles.tableTitle}>
                Confirmed In-Room Participants ({role === "presenter" ? roomId : detectedRoom || "room-a"}):
              </Text>
              
              {/* Table Header Row */}
              <View style={styles.tableHeaderRow}>
                <Text style={[styles.tableColHeader, { flex: 1.1 }]}>Participant</Text>
                <Text style={[styles.tableColHeader, { flex: 1.1 }]}>Signals / Confidence</Text>
                <Text style={[styles.tableColHeader, { width: 55, textAlign: "right" }]}>Role</Text>
              </View>

              {/* Table Content Rows */}
              {roomMembers.map((member, index) => {
                const isMe = member.deviceId === deviceId;
                const confPercent = Math.round((member.confidence ?? 0.85) * 100);
                const wifiPercent = member.wifiSimilarity !== undefined ? Math.round(member.wifiSimilarity * 100) : undefined;

                return (
                  <View key={member.deviceId || index} style={[styles.tableRow, isMe && styles.tableRowMe]}>
                    <View style={{ flex: 1.1 }}>
                      <Text style={styles.tableCellName} numberOfLines={1}>
                        {member.displayName || member.deviceId} {isMe ? "(You)" : ""}
                      </Text>
                      <Text style={styles.tableCellId} numberOfLines={1}>
                        {member.deviceId}
                      </Text>
                    </View>

                    <View style={{ flex: 1.1, gap: 2 }}>
                      <Text style={styles.confText}>
                        🟢 {confPercent}% Confidence
                      </Text>
                      {wifiPercent !== undefined ? (
                        <Text style={styles.wifiMatchText}>
                          📶 {wifiPercent}% Wi-Fi Match
                        </Text>
                      ) : (
                        <Text style={styles.bleMeshText}>
                          📡 BLE Mesh Edge
                        </Text>
                      )}
                    </View>

                    <View style={{ width: 55, alignItems: "flex-end" }}>
                      <Text style={[styles.roleBadge, member.role === "presenter" ? styles.roleBadgePresenter : styles.roleBadgeAttendee]}>
                        {member.role === "presenter" ? "Host" : "User"}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>

        {/* Diagnostic Status Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Status: {status.state}</Text>
          <Text style={styles.cardText}>Device ID: {deviceId || "Creating local ID..."}</Text>
          <Text style={styles.cardText}>Name: {displayName.trim() || "(Not specified)"}</Text>
          <Text style={styles.cardText}>Active Role: {role.toUpperCase()}</Text>
          {role === "presenter" && <Text style={styles.cardText}>Anchor Room: {roomId}</Text>}
          {role === "attendee" && (
            <Text style={styles.cardText}>
              Detected Room: {detectedRoom ? detectedRoom : "Searching for active presenter..."}
            </Text>
          )}
          <Text style={styles.cardText}>Visible Wi-Fi APs: {status.wifiApCount ?? 0}</Text>
          <Text style={styles.cardText}>Current rotating token: {status.rotatingId ?? "Not active"}</Text>
          {status.error && <Text style={styles.error}>{status.error}</Text>}
        </View>

        {/* Server Connection Settings Card */}
        <View style={styles.serverCard}>
          <TouchableOpacity
            style={styles.serverHeaderRow}
            onPress={() => setShowServerConfig(!showServerConfig)}
            activeOpacity={0.7}
          >
            <Text style={styles.serverHeaderText}>
              ⚙️ Server: {serverUrl}{" "}
              {serverConnected === true
                ? "🟢 Connected"
                : serverConnected === false
                ? "🔴 Unreachable"
                : ""}
            </Text>
            <Text style={styles.serverToggleText}>{showServerConfig ? "▲ Hide" : "▼ Change"}</Text>
          </TouchableOpacity>
          {serverConnected === false && (
            <View style={styles.serverErrorBox}>
              <Text style={styles.serverErrorText}>
                ⚠️ Cannot connect to backend server at {serverUrl}. Make sure your laptop API is running (`pnpm --filter @confpresence/api dev`) and connected to the same Wi-Fi network.
              </Text>
            </View>
          )}
          {showServerConfig && (
            <View style={styles.serverInputWrap}>
              <Text style={styles.serverHelp}>Enter your laptop or backend server IP and port:</Text>
              <TextInput
                editable={!running}
                value={serverUrl}
                onChangeText={setServerUrl}
                placeholder="http://192.168.0.195:3000"
                placeholderTextColor="#8C9BA5"
                style={styles.serverInput}
                autoCapitalize="none"
              />
              <TouchableOpacity
                disabled={isAutoDetecting || running}
                style={styles.autoDetectBtn}
                onPress={autoDetectServerIP}
              >
                <Text style={styles.autoDetectBtnText}>
                  {isAutoDetecting ? "🔍 Scanning Local Network..." : "🔍 Auto-Detect Laptop IP"}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        <Text style={styles.note}>
          Dual-sensor POC: the app uses low-latency BLE mesh peer discovery and ambient Wi-Fi access point fingerprinting for zero-hardware in-room presence estimation.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#F7FAFB" },
  container: { padding: 24, gap: 12 },
  title: { fontSize: 28, fontWeight: "700", color: "#173A63" },
  subtitle: { fontSize: 16, color: "#5D6873", marginBottom: 8 },
  label: { color: "#173A63", fontWeight: "700", marginTop: 4 },
  input: {
    borderColor: "#C8D3DA",
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    backgroundColor: "#FFFFFF",
    color: "#173A63",
    fontSize: 16
  },
  roleRow: { flexDirection: "row", justifyContent: "space-between", gap: 12 },
  
  // Room Management Styles
  roomSection: { marginTop: 4, gap: 6 },
  roomHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  addRoomBtn: { backgroundColor: "#E0F2F1", paddingVertical: 4, paddingHorizontal: 10, borderRadius: 6, borderWidth: 1, borderColor: "#80CBC4" },
  addRoomBtnText: { color: "#00695C", fontSize: 12, fontWeight: "700" },
  roomChipsWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 4 },
  roomChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: "#C8D3DA",
    gap: 6
  },
  roomChipSelected: {
    backgroundColor: "#126D7A",
    borderColor: "#126D7A"
  },
  roomChipText: { fontSize: 13, color: "#173A63", fontWeight: "600" },
  roomChipTextSelected: { color: "#FFFFFF", fontWeight: "700" },
  roomDeleteIcon: { paddingHorizontal: 2 },
  roomDeleteText: { fontSize: 11, color: "#75808A", fontWeight: "700" },
  roomDeleteTextSelected: { color: "#B2EBF2" },
  addRoomInputRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 6 },
  addRoomInput: { flex: 1, borderColor: "#00695C", borderWidth: 1.5, borderRadius: 8, padding: 8, backgroundColor: "#FFFFFF", color: "#173A63", fontSize: 14 },
  addRoomSaveBtn: { backgroundColor: "#00695C", paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8 },
  addRoomSaveText: { color: "#FFFFFF", fontWeight: "700", fontSize: 13 },
  addRoomCancelBtn: { paddingVertical: 8, paddingHorizontal: 8 },
  addRoomCancelText: { color: "#5D6873", fontSize: 13 },

  startRow: { marginTop: 6, flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: "#EAF3F7", padding: 14, borderRadius: 10 },
  startTitle: { color: "#173A63", fontWeight: "700" },
  help: { color: "#5D6873", maxWidth: 230, marginTop: 3 },
  statsCard: {
    backgroundColor: "#E6F4F1",
    borderRadius: 10,
    padding: 16,
    borderWidth: 1,
    borderColor: "#B2DFDB",
    marginTop: 4
  },
  statsHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10
  },
  statsHeader: { fontSize: 16, fontWeight: "700", color: "#00695C" },
  refreshButton: {
    backgroundColor: "#FFFFFF",
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#80CBC4"
  },
  refreshButtonText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#00695C"
  },
  statsGrid: { flexDirection: "row", justifyContent: "space-around", gap: 12 },
  statBox: { alignItems: "center", backgroundColor: "#FFFFFF", padding: 12, borderRadius: 8, flex: 1, borderWidth: 1, borderColor: "#CFD8DC" },
  statNumber: { fontSize: 26, fontWeight: "800", color: "#126D7A" },
  statLabel: { fontSize: 12, color: "#5D6873", marginTop: 4, textAlign: "center", fontWeight: "600" },
  
  // Table View Styles
  tableContainer: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#B2DFDB"
  },
  tableTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#00695C",
    marginBottom: 8
  },
  tableHeaderRow: {
    flexDirection: "row",
    backgroundColor: "#D7ECE8",
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 6,
    marginBottom: 4
  },
  tableColHeader: {
    fontSize: 11,
    fontWeight: "700",
    color: "#004D40",
    textTransform: "uppercase"
  },
  tableRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 6,
    marginVertical: 2,
    borderWidth: 1,
    borderColor: "#E0E0E0"
  },
  tableRowMe: {
    backgroundColor: "#E0F2F1",
    borderColor: "#80CBC4"
  },
  tableCellName: {
    fontSize: 12,
    fontWeight: "700",
    color: "#173A63"
  },
  tableCellId: {
    fontSize: 11,
    color: "#5D6873",
    fontFamily: "monospace"
  },
  roleBadge: {
    fontSize: 10,
    fontWeight: "700",
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 4,
    overflow: "hidden"
  },
  roleBadgePresenter: {
    backgroundColor: "#E0F7FA",
    color: "#00838F"
  },
  roleBadgeAttendee: {
    backgroundColor: "#ECEFF1",
    color: "#455A64"
  },
  confText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#00695C"
  },
  wifiMatchText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#1565C0"
  },
  bleMeshText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#6A1B9A"
  },

  card: { backgroundColor: "#FFFFFF", borderRadius: 10, padding: 16, gap: 6, borderWidth: 1, borderColor: "#D9E3E8" },
  cardTitle: { fontWeight: "700", color: "#126D7A", fontSize: 15 },
  cardText: { color: "#2C3E50", fontSize: 13 },
  error: { color: "#A31D33", fontSize: 13, marginTop: 4 },

  // Server Connection Settings Styles
  serverCard: { backgroundColor: "#F0F4F8", borderRadius: 8, padding: 12, borderWidth: 1, borderColor: "#D0DCE5" },
  serverHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  serverHeaderText: { fontSize: 12, color: "#173A63", fontWeight: "600" },
  serverToggleText: { fontSize: 12, color: "#00695C", fontWeight: "700" },
  serverErrorBox: {
    marginTop: 8,
    backgroundColor: "#FFEBEE",
    borderColor: "#EF5350",
    borderWidth: 1,
    borderRadius: 6,
    padding: 8
  },
  serverErrorText: {
    fontSize: 11,
    color: "#C62828",
    lineHeight: 15
  },
  serverInputWrap: { marginTop: 8, gap: 4 },
  serverHelp: { fontSize: 11, color: "#5D6873" },
  serverInput: {
    borderColor: "#B0C4D3",
    borderWidth: 1,
    borderRadius: 6,
    padding: 8,
    backgroundColor: "#FFFFFF",
    color: "#173A63",
    fontSize: 13
  },
  autoDetectBtn: {
    marginTop: 6,
    backgroundColor: "#126D7A",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignItems: "center"
  },
  autoDetectBtnText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700"
  },

  note: { marginTop: 6, fontSize: 12, lineHeight: 17, color: "#5D6873" }
});

registerRootComponent(App);
