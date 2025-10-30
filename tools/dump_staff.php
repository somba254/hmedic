<?php
include __DIR__ . "/../config.php";

$res = $conn->query("SELECT id, username, password, role FROM staff ORDER BY id ASC");
if (!$res) {
    echo "Query failed: " . ($conn->error ?? '') . "\n";
    exit(1);
}
while ($row = $res->fetch_assoc()) {
    echo "ID: {$row['id']} | username: {$row['username']} | password: {$row['password']} | role: {$row['role']}\n";
}
$conn->close();
?>