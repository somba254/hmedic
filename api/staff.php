<?php
/**
 * staff.php — Staff listing endpoint for MediSync HMS.
 *
 * Returns all staff members as a JSON array.
 *
 * Usage:
 * - GET api/staff.php for staff list
 */

include_once(__DIR__ . "/../config.php");
// Support POST (create staff) and GET (list staff)
$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'POST') {
  // Only Admins can create staff
  require_role('Admin');

  $data = get_request_data();
  $username = trim($data['username'] ?? '');
  $password = $data['password'] ?? '';
  $role = trim($data['role'] ?? '');

  if (!$username || !$password || !$role) {
    send_json(['status' => 'error', 'message' => 'username, password and role required'], 400);
    $conn->close();
    exit;
  }

  // Hash password
  $hash = password_hash($password, PASSWORD_DEFAULT);

  $stmt = $conn->prepare("INSERT INTO staff (username, password, role) VALUES (?,?,?)");
  if (!$stmt) {
    send_json(['status' => 'error', 'message' => 'Server error preparing statement'], 500);
    $conn->close();
    exit;
  }
  $stmt->bind_param('sss', $username, $hash, $role);
  if ($stmt->execute()) {
    send_json(['status' => 'success', 'id' => $stmt->insert_id], 201);
  } else {
    send_json(['status' => 'error', 'message' => $stmt->error], 500);
  }
  $stmt->close();
  $conn->close();
  exit;
}

// Default: GET — list staff (Admin only)
require_role('Admin');
$res = $conn->query("SELECT id, username, role FROM staff ORDER BY id ASC");
if ($res === false) {
  send_json([
    "status" => "error",
    "message" => "Query failed"
  ], 500);
  $conn->close();
  exit;
}
$staff = [];
while ($row = $res->fetch_assoc()) {
  $staff[] = $row;
}
send_json($staff, 200);

$conn->close();
