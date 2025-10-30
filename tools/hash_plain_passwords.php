<?php
// tools/hash_plain_passwords.php
// Usage: php tools/hash_plain_passwords.php
require __DIR__ . '/../config.php';

// Find staff rows where password doesn't look like bcrypt ($2y$)
$res = $conn->query("SELECT id, username, password FROM staff WHERE password NOT LIKE '$2y$%'");
if (!$res) {
    echo "Query failed: " . ($conn->error ?? '') . "\n";
    exit(1);
}
$updated = 0;
while ($row = $res->fetch_assoc()) {
    $id = (int)$row['id'];
    $plain = $row['password'];
    if ($plain === null || $plain === '') continue;
    // Hash and update
    $hash = password_hash($plain, PASSWORD_DEFAULT);
    $stmt = $conn->prepare("UPDATE staff SET password = ? WHERE id = ?");
    if ($stmt) {
        $stmt->bind_param('si', $hash, $id);
        if ($stmt->execute()) {
            echo "Updated staff id=$id (username={$row['username']})\n";
            $updated++;
        } else {
            echo "Failed update id=$id: " . $stmt->error . "\n";
        }
        $stmt->close();
    } else {
        echo "Prepare failed for id=$id: " . $conn->error . "\n";
    }
}
echo "Done. Updated $updated rows.\n";
$conn->close();
?>