<?php
/**
 * appointments.php — Appointment management endpoint for MediSync HMS.
 *
 * Supports:
 * - GET: Returns all appointments as JSON array
 * - PUT/PATCH: Updates appointment (reschedule)
 *
 * Usage:
 * - GET api/appointments.php for appointment list
 * - PUT api/appointments.php with id and date/time to reschedule
 */

include_once(__DIR__ . "/../config.php");

$method = $_SERVER["REQUEST_METHOD"];

if ($method === "GET") {
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
}

elseif ($method === "PUT" || $method === "PATCH") {
    // Only Admins and Receptionists can reschedule appointments
    require_role(['Admin', 'Receptionist']);
    $data = get_request_data();
    $id = (int)($data["id"] ?? 0);
    $date = $data["date"] ?? "";
    $time = $data["time"] ?? "";

    if (!$id || !$date) {
        send_json([
            "status" => "error",
            "message" => "Appointment ID and date required"
        ], 400);
        $conn->close();
        exit;
    }

    if ($time) {
        $stmt = $conn->prepare("UPDATE appointments SET date=?, time=? WHERE id=?");
        if (!$stmt) {
            send_json([
                "status" => "error",
                "message" => "Server error preparing statement"
            ], 500);
            $conn->close();
            exit;
        }
        $stmt->bind_param("ssi", $date, $time, $id);
    } else {
        $stmt = $conn->prepare("UPDATE appointments SET date=? WHERE id=?");
        if (!$stmt) {
            send_json([
                "status" => "error",
                "message" => "Server error preparing statement"
            ], 500);
            $conn->close();
            exit;
        }
        $stmt->bind_param("si", $date, $id);
    }

    if ($stmt->execute()) {
        send_json([
            "status" => "success",
            "message" => "Appointment rescheduled successfully"
        ], 200);
    } else {
        send_json([
            "status" => "error",
            "message" => "Failed to reschedule appointment",
            "error" => $stmt->error
        ], 500);
    }
    $stmt->close();
}

$conn->close();
