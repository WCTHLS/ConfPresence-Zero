from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch, mm
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak,
    KeepTogether
)

OUT = r"outputs/ConfPresence_Hardware_Options_Report.pdf"

NAVY = colors.HexColor("#173A63")
TEAL = colors.HexColor("#147E8D")
GREEN = colors.HexColor("#287653")
ORANGE = colors.HexColor("#C96A09")
LIGHT_BLUE = colors.HexColor("#EAF3F7")
LIGHT_GREEN = colors.HexColor("#EBF6EF")
LIGHT_ORANGE = colors.HexColor("#FFF3E7")
GREY = colors.HexColor("#5B6470")
LINE = colors.HexColor("#C9D4DC")

styles = getSampleStyleSheet()
styles.add(ParagraphStyle(
    name="ReportTitle", parent=styles["Title"], fontName="Helvetica-Bold",
    fontSize=28, leading=33, textColor=NAVY, alignment=TA_LEFT, spaceAfter=10
))
styles.add(ParagraphStyle(
    name="Subtitle", parent=styles["Normal"], fontName="Helvetica",
    fontSize=12, leading=17, textColor=GREY, spaceAfter=14
))
styles.add(ParagraphStyle(
    name="H1Custom", parent=styles["Heading1"], fontName="Helvetica-Bold",
    fontSize=18, leading=23, textColor=NAVY, spaceBefore=4, spaceAfter=9
))
styles.add(ParagraphStyle(
    name="H2Custom", parent=styles["Heading2"], fontName="Helvetica-Bold",
    fontSize=13, leading=17, textColor=TEAL, spaceBefore=8, spaceAfter=5
))
styles.add(ParagraphStyle(
    name="BodyCustom", parent=styles["BodyText"], fontName="Helvetica",
    fontSize=9.5, leading=14, textColor=colors.HexColor("#26313B"), spaceAfter=6
))
styles.add(ParagraphStyle(
    name="Small", parent=styles["BodyText"], fontName="Helvetica",
    fontSize=8.2, leading=11.5, textColor=GREY, spaceAfter=4
))
styles.add(ParagraphStyle(
    name="TableHead", parent=styles["BodyText"], fontName="Helvetica-Bold",
    fontSize=8.5, leading=10.5, textColor=colors.white
))
styles.add(ParagraphStyle(
    name="TableBody", parent=styles["BodyText"], fontName="Helvetica",
    fontSize=8.1, leading=10.8, textColor=colors.HexColor("#26313B")
))
styles.add(ParagraphStyle(
    name="Callout", parent=styles["BodyText"], fontName="Helvetica-Bold",
    fontSize=10, leading=14, textColor=NAVY
))

def p(text, style="BodyCustom"):
    return Paragraph(text, styles[style])

def bullet(text):
    return Paragraph("- " + text, styles["BodyCustom"])

def cell(text, style="TableBody"):
    return Paragraph(text, styles[style])

def header_footer(canvas, doc):
    canvas.saveState()
    width, height = A4
    canvas.setStrokeColor(LINE)
    canvas.setLineWidth(0.5)
    canvas.line(18 * mm, height - 15 * mm, width - 18 * mm, height - 15 * mm)
    canvas.setFont("Helvetica-Bold", 8)
    canvas.setFillColor(NAVY)
    canvas.drawString(18 * mm, height - 11 * mm, "CONFPRESENCE - HARDWARE OPTIONS")
    canvas.setFont("Helvetica", 8)
    canvas.setFillColor(GREY)
    canvas.drawRightString(width - 18 * mm, 11 * mm, "Confidential - Manager briefing")
    canvas.drawString(18 * mm, 11 * mm, f"Page {doc.page}")
    canvas.restoreState()

doc = SimpleDocTemplate(
    OUT, pagesize=A4, rightMargin=18*mm, leftMargin=18*mm,
    topMargin=23*mm, bottomMargin=18*mm
)
story = []

# Cover / executive summary
story += [Spacer(1, 14*mm), p("ConfPresence", "ReportTitle"),
          p("Hardware options for reliable conference presence tracking", "Subtitle")]

cover_box = Table([[p(
    "<b>Purpose.</b> This report converts the original ConfPresence ZERO concept into practical deployment choices. "
    "It compares three realistic hardware-assisted architectures and summarizes the strengths and limitations of the current phone-only approach.",
    "Callout")]], colWidths=[174*mm])
cover_box.setStyle(TableStyle([
    ("BACKGROUND", (0,0), (-1,-1), LIGHT_BLUE),
    ("BOX", (0,0), (-1,-1), 0.8, TEAL),
    ("LEFTPADDING", (0,0), (-1,-1), 10), ("RIGHTPADDING", (0,0), (-1,-1), 10),
    ("TOPPADDING", (0,0), (-1,-1), 10), ("BOTTOMPADDING", (0,0), (-1,-1), 10),
]))
story += [cover_box, Spacer(1, 12*mm), p("Executive recommendation", "H1Custom")]
story += [p(
    "Adopt a phased hybrid model: attendees use a mobile app for consent and identity, while fixed hardware performs dependable room sensing. "
    "Start with Raspberry Pi or mini-PC BLE gateways for a controlled pilot. If the pilot meets the target accuracy, move to purpose-built BLE room and doorway nodes for scale. "
    "Add acoustic validation only in rooms where adjacent-room BLE bleed remains a measured problem.")]

summary = Table([
    [cell("<b>Phase</b>", "TableHead"), cell("<b>Recommended architecture</b>", "TableHead"), cell("<b>Primary outcome</b>", "TableHead")],
    [cell("Pilot"), cell("Fixed BLE room gateway"), cell("Validate attendance accuracy and operational workflow")],
    [cell("Scale"), cell("Purpose-built BLE room and doorway nodes"), cell("Reliable multi-room deployment with lower operational cost")],
    [cell("Selective enhancement"), cell("BLE plus acoustic room token"), cell("Reduce adjacent-room false positives where needed")],
], colWidths=[30*mm, 77*mm, 67*mm])
summary.setStyle(TableStyle([
    ("BACKGROUND", (0,0), (-1,0), NAVY),
    ("BACKGROUND", (0,1), (-1,-1), colors.white),
    ("GRID", (0,0), (-1,-1), 0.35, LINE),
    ("VALIGN", (0,0), (-1,-1), "TOP"),
    ("LEFTPADDING", (0,0), (-1,-1), 7), ("RIGHTPADDING", (0,0), (-1,-1), 7),
    ("TOPPADDING", (0,0), (-1,-1), 7), ("BOTTOMPADDING", (0,0), (-1,-1), 7),
]))
story += [Spacer(1, 4*mm), summary, Spacer(1, 9*mm), p("Decision principle", "H2Custom"),
          p("The system should report a confidence-based presence decision, not claim that a single Bluetooth observation proves human attendance. Fixed room hardware provides the stable physical evidence that the phone-only design lacks.")]

# Solution 1
story += [PageBreak(), p("Option 1 - Fixed BLE room gateways", "H1Custom"),
          p("Best practical starting solution", "Subtitle")]
story += [p(
    "Install one managed gateway in each room, with an optional second gateway at the entrance or in a large room. "
    "Attendees retain the mobile app, but the fixed gateway performs continuous Bluetooth Low Energy scanning instead of depending on phone-to-phone sensing. "
    "A Raspberry Pi 5 is a strong pilot platform; a fanless mini PC is appropriate for high-density rooms or heavier local analytics.")]
story += [p("How it works", "H2Custom")]
for text in [
    "The attendee app broadcasts an event-scoped, rotating encrypted BLE identifier.",
    "The room gateway records identifier sightings, timestamp, RSSI statistics, and its known room ID.",
    "The gateway securely uploads aggregated observations; it does not need to send raw radio traces continuously.",
    "The backend calculates room-presence confidence over time. A doorway gateway improves arrival, departure, and corridor interpretation.",
    "Optional phone signals such as motion can lower confidence for a device that appears to be left behind."
]: story.append(bullet(text))

story += [p("Typical hardware capability", "H2Custom")]
story.append(p("Raspberry Pi / mini-PC gateway with BLE 5.x receiver, Ethernet or PoE preferred, local storage buffer, secure device credentials, encrypted uplink, remote updates, and an enclosure. For high-density rooms, use multiple quality BLE adapters rather than relying on a single built-in radio."))

pros_cons_1 = Table([
    [cell("<b>Advantages</b>", "TableHead"), cell("<b>Limitations / controls needed</b>", "TableHead")],
    [cell("Reliable continuous scanning independent of attendees keeping the app in the foreground."), cell("Requires power, network, installation, and device management.")],
    [cell("Known physical placement gives a direct room association."), cell("A single gateway can still hear devices through a wall; use room geometry and doorway evidence.")],
    [cell("Fast to prototype, diagnose, and improve using standard Linux tooling."), cell("A Raspberry Pi needs a production enclosure, secure updates, reliable storage, and monitoring.")],
    [cell("Supports live occupancy, dwell time, and departure estimates."), cell("Establishes device presence, not conclusive proof that the device owner is present.")],
], colWidths=[87*mm, 87*mm])
pros_cons_1.setStyle(TableStyle([
    ("BACKGROUND", (0,0), (0,0), GREEN), ("BACKGROUND", (1,0), (1,0), ORANGE),
    ("GRID", (0,0), (-1,-1), 0.35, LINE), ("VALIGN", (0,0), (-1,-1), "TOP"),
    ("LEFTPADDING", (0,0), (-1,-1), 7), ("RIGHTPADDING", (0,0), (-1,-1), 7),
    ("TOPPADDING", (0,0), (-1,-1), 7), ("BOTTOMPADDING", (0,0), (-1,-1), 7),
]))
story += [p("Pros and cons", "H2Custom"), pros_cons_1]

# Solution 2
story += [PageBreak(), p("Option 2 - Purpose-built BLE room and doorway nodes", "H1Custom"),
          p("Best long-term scalable production architecture", "Subtitle")]
story += [p(
    "Deploy small dedicated BLE sensor nodes at defined room and doorway locations. Nordic nRF52840-class radios are well suited to a robust BLE sensing node. "
    "ESP32-S3-class devices are a lower-cost option for lighter scan workloads. A separate gateway provides secure backhaul, local aggregation, fleet management, and optional edge inference.")]
story += [p("How it works", "H2Custom")]
for text in [
    "Room-center nodes continuously detect rotating BLE identifiers from enrolled attendee phones.",
    "Doorway nodes observe entry, exit, and corridor traffic. Room and doorway readings are compared in time windows.",
    "The gateway receives signed sensor summaries and produces an inside / outside / passing-by confidence classification.",
    "The backend combines observations across rooms and rejects implausible simultaneous room claims."
]: story.append(bullet(text))
story += [p("Why this is different from Option 1", "H2Custom"),
          p("Option 1 uses a flexible general-purpose computer as the room sensor. This option separates duties: purpose-built nodes focus on reliable radio capture, while a gateway focuses on networking, management, and inference. This is more suitable when the product must be installed repeatedly across many venues.")]

pros_cons_2 = Table([
    [cell("<b>Advantages</b>", "TableHead"), cell("<b>Limitations / controls needed</b>", "TableHead")],
    [cell("Small, low-power, purpose-built sensors are suitable for permanent deployment."), cell("Requires hardware, firmware, enclosure, certification, and fleet-management engineering.")],
    [cell("Multiple nodes provide stronger room-versus-corridor discrimination."), cell("Node placement and calibration must be planned for each venue and room shape.")],
    [cell("Doorway evidence materially improves early-departure detection."), cell("nRF-style BLE nodes need separate Ethernet or Wi-Fi backhaul; ESP32 shares 2.4 GHz resources between Wi-Fi and BLE.")],
    [cell("Can include secure boot, signed firmware, device certificates, and local buffering from the beginning."), cell("Higher upfront product-development effort than using off-the-shelf Raspberry Pi gateways.")],
], colWidths=[87*mm, 87*mm])
pros_cons_2.setStyle(TableStyle([
    ("BACKGROUND", (0,0), (0,0), GREEN), ("BACKGROUND", (1,0), (1,0), ORANGE),
    ("GRID", (0,0), (-1,-1), 0.35, LINE), ("VALIGN", (0,0), (-1,-1), "TOP"),
    ("LEFTPADDING", (0,0), (-1,-1), 7), ("RIGHTPADDING", (0,0), (-1,-1), 7),
    ("TOPPADDING", (0,0), (-1,-1), 7), ("BOTTOMPADDING", (0,0), (-1,-1), 7),
]))
story += [p("Pros and cons", "H2Custom"), pros_cons_2]

# Solution 3
story += [PageBreak(), p("Option 3 - BLE gateways<br/>plus acoustic room token", "H1Custom"),
          p("Best selective enhancement for difficult room boundaries", "Subtitle")]
story += [p(
    "Use fixed BLE sensing as the primary signal and add a room-specific, rotating acoustic token as a secondary validation signal. "
    "The token should be treated as supportive evidence that helps distinguish adjacent rooms; it should not be the sole mechanism for attendance decisions.")]
story += [p("How it works", "H2Custom")]
for text in [
    "A BLE gateway establishes that an enrolled device is nearby.",
    "A fixed transmitter emits a short, rotating room token at a tested acoustic frequency.",
    "The mobile app or a fixed acoustic receiver verifies whether the current room token is present.",
    "The system accepts a stronger room-presence confidence when BLE and room-token evidence agree.",
    "The design is used selectively in rooms where pilot data shows significant adjacent-room BLE bleed."
]: story.append(bullet(text))
story += [p("Important implementation rule", "H2Custom"),
          p("Do not upload microphone recordings. Process the acoustic token locally and transmit only a signed token-valid result, timestamp, and confidence level. Validate audibility, accessibility, phone compatibility, and room acoustics before rollout.")]

pros_cons_3 = Table([
    [cell("<b>Advantages</b>", "TableHead"), cell("<b>Limitations / controls needed</b>", "TableHead")],
    [cell("Stronger physical room-boundary evidence than BLE alone."), cell("More room hardware and more deployment complexity than BLE-only gateways.")],
    [cell("Reduces false positives caused by BLE signals crossing walls or reaching corridors."), cell("Phone speakers, microphones, operating systems, and pockets vary in high-frequency performance.")],
    [cell("Can raise confidence for high-value attendance and credit workflows."), cell("Microphone permission and acoustic sensing require careful privacy, accessibility, and consent design.")],
    [cell("Useful in partitioned halls, hotels, and adjacent-session layouts."), cell("PA systems, music, crowd noise, and room acoustics require site testing and calibration.")],
], colWidths=[87*mm, 87*mm])
pros_cons_3.setStyle(TableStyle([
    ("BACKGROUND", (0,0), (0,0), GREEN), ("BACKGROUND", (1,0), (1,0), ORANGE),
    ("GRID", (0,0), (-1,-1), 0.35, LINE), ("VALIGN", (0,0), (-1,-1), "TOP"),
    ("LEFTPADDING", (0,0), (-1,-1), 7), ("RIGHTPADDING", (0,0), (-1,-1), 7),
    ("TOPPADDING", (0,0), (-1,-1), 7), ("BOTTOMPADDING", (0,0), (-1,-1), 7),
]))
story += [p("Pros and cons", "H2Custom"), pros_cons_3]

# Zero hardware
story += [PageBreak(), p("Current concept - Zero Hardware", "H1Custom"),
          p("Phone-only presence tracking using BLE mesh, optional ultrasound, Wi-Fi fingerprinting, and motion", "Subtitle")]
story += [p(
    "The Zero Hardware architecture uses attendee phones as a temporary sensing mesh. The presenter device labels the cluster for a scheduled room; the backend groups mutual BLE sightings and fuses optional phone-based signals to estimate room presence.")]

zero = Table([
    [cell("<b>Strengths</b>", "TableHead"), cell("<b>Limitations / business risks</b>", "TableHead")],
    [cell("No room installation, cabling, maintenance, or dedicated event hardware."), cell("Requires attendees to install the app, grant permissions, enable Bluetooth, and carry their phones.")],
    [cell("Lowest initial cost and fastest route to a concept pilot."), cell("iOS background Bluetooth behavior makes continuous phone-to-phone sensing inconsistent.")],
    [cell("No badges, scanners, cameras, or attendee-owned devices."), cell("BLE RSSI is not a hard room boundary; adjacent rooms and corridors can be falsely detected.")],
    [cell("Can keep raw sensing data on-device and transmit rotating identifiers and compact features only."), cell("A phone can be left behind, shared, or carried by someone other than the registered attendee.")],
    [cell("Useful for approximate occupancy and engagement analytics when opt-in participation is high."), cell("Wi-Fi scans are permission- and platform-constrained; phone-only ultrasound is inconsistent across devices.")],
    [cell("Improves as legitimate app participation and room density increase."), cell("At high density, radio collisions and scan scheduling make the mutual-detection graph incomplete.")],
    [cell("Avoids fixed hardware purchase during early exploration."), cell("Difficult to defend as audit-grade individual attendance evidence without fixed, managed sensing.")],
], colWidths=[87*mm, 87*mm])
zero.setStyle(TableStyle([
    ("BACKGROUND", (0,0), (0,0), GREEN), ("BACKGROUND", (1,0), (1,0), ORANGE),
    ("GRID", (0,0), (-1,-1), 0.35, LINE), ("VALIGN", (0,0), (-1,-1), "TOP"),
    ("LEFTPADDING", (0,0), (-1,-1), 7), ("RIGHTPADDING", (0,0), (-1,-1), 7),
    ("TOPPADDING", (0,0), (-1,-1), 7), ("BOTTOMPADDING", (0,0), (-1,-1), 7),
]))
story += [p("Pros and cons", "H2Custom"), zero, Spacer(1, 5*mm),
          p("Positioning recommendation", "H2Custom"),
          p("Position Zero Hardware as a low-cost experiment and an occupancy analytics feature. Do not position it alone as definitive proof of individual attendance for credit, compliance, or payment-sensitive workflows.")]

# Close
story += [PageBreak(), p("Recommended path forward", "H1Custom")]
steps = Table([
    [cell("<b>1. Pilot</b>", "TableHead"), cell("<b>2. Measure</b>", "TableHead"), cell("<b>3. Scale</b>", "TableHead"), cell("<b>4. Enhance selectively</b>", "TableHead")],
    [cell("Deploy fixed BLE gateways in representative rooms."), cell("Compare results with observed ground truth: arrival, departure, adjacent room, and platform type."), cell("Convert to dedicated BLE room and doorway nodes after target accuracy is demonstrated."), cell("Add acoustic room tokens only where BLE boundary errors remain unacceptable.")],
], colWidths=[43.5*mm, 43.5*mm, 43.5*mm, 43.5*mm])
steps.setStyle(TableStyle([
    ("BACKGROUND", (0,0), (-1,0), NAVY),
    ("GRID", (0,0), (-1,-1), 0.35, LINE),
    ("VALIGN", (0,0), (-1,-1), "TOP"),
    ("LEFTPADDING", (0,0), (-1,-1), 7), ("RIGHTPADDING", (0,0), (-1,-1), 7),
    ("TOPPADDING", (0,0), (-1,-1), 7), ("BOTTOMPADDING", (0,0), (-1,-1), 7),
]))
story += [steps, Spacer(1, 9*mm), p("Success criteria for the pilot", "H2Custom")]
for text in [
    "Individual presence precision and recall, reported separately for Android and iPhone.",
    "False room assignment rate for adjacent rooms, corridors, and queues.",
    "Arrival and departure time error against observed ground truth.",
    "Performance at low, medium, and high app-adoption levels.",
    "Operational readiness: uptime, secure updates, network loss recovery, and support effort."
]: story.append(bullet(text))
story += [Spacer(1, 4*mm), p("Final recommendation", "H2Custom"),
          p("Use phones for attendee consent and event identity, but use fixed BLE hardware for dependable room evidence. Begin with Option 1, design toward Option 2, and reserve Option 3 for venues where stronger room-boundary validation is demonstrably required.", "Callout")]

doc.build(story, onFirstPage=header_footer, onLaterPages=header_footer)
print(OUT)
