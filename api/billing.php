<?php
/**
 * billing.php — Billing records endpoint for MediSync HMS.
 *
 * Returns all billing records as a JSON array.
 *
 * Usage:
 * - GET api/billing.php for billing records
 */

include_once(__DIR__ . "/../config.php");

// Only Admins and Receptionists may view billing records
require_role(['Admin', 'Receptionist']);

$res = $conn->query("SELECT id, patient_name, amount, date, status FROM billing ORDER BY id DESC");
if ($res === false) {
    send_json([
      "status" => "error",
      "message" => "Query failed"
    ], 500);
    $conn->close();
    exit;
}
$bills = [];
while ($row = $res->fetch_assoc()) {
    $bills[] = $row;
}
send_json($bills, 200);

$conn->close();
