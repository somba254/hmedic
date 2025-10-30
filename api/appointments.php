<?php
/**
 * appointments.php — Appointment listing endpoint for MediSync HMS.
 *
 * Returns all appointments as a JSON array.
 *
 * Usage:
 * - GET api/appointments.php for appointment list
 */

include_once(__DIR__ . "/../config.php");

$res = $conn->query("SELECT id, patient_name, doctor, date, time, status FROM appointments ORDER BY id DESC");
if ($res === false) {
    send_json([
      "status" => "error",
      "message" => "Query failed"
    ], 500);
    $conn->close();
    exit;
}
$appointments = [];
while ($row = $res->fetch_assoc()) {
    $appointments[] = $row;
}
send_json($appointments, 200);

$conn->close();
