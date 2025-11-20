<?php
/**
 * tools/e2e_test.php
 * Simple CLI end-to-end smoke test for hmedic.
 * Usage: php tools/e2e_test.php
 */
require_once __DIR__ . '/../config.php';

echo "Starting E2E smoke test...\n";

$conn = get_db();
if (!$conn) {
    echo "ERROR: DB connection failed.\n";
    exit(1);
}

// Create a temporary staff user
$username = 'e2e_test_' . bin2hex(random_bytes(4));
$password = 'TestPa$$w0rd';
$role = 'Receptionist';
$hash = password_hash($password, PASSWORD_DEFAULT);

$stmt = $conn->prepare("INSERT INTO staff (username, password, role) VALUES (?, ?, ?) ");
if (!$stmt) {
    echo "Prepare failed: " . $conn->error . "\n";
    exit(1);
}
$stmt->bind_param('sss', $username, $hash, $role);
if (!$stmt->execute()) {
    echo "Insert failed: " . $stmt->error . "\n";
    $stmt->close();
    exit(1);
}
$newId = $stmt->insert_id;
$stmt->close();

echo "Created test user: $username (id=$newId)\n";
// Logging has been disabled in this installation; skipping log write and queries.
echo "Note: logging is disabled — skipped creating log entry and log queries.\n";

// Cleanup: delete the test user
$del = $conn->prepare("DELETE FROM staff WHERE id = ?");
if ($del) {
    $del->bind_param('i', $newId);
    $del->execute();
    $del->close();
    echo "Deleted test user.\n";
}

echo "E2E smoke test complete.\n";

$conn->close();
