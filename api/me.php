<?php
/**
 * me.php — Returns current authenticated user info from session
 */
include_once(__DIR__ . "/../config.php");

$user = current_user();
if ($user) {
    send_json([
        'status' => 'success',
        'user' => $user
    ], 200);
} else {
    send_json([
        'status' => 'error',
        'message' => 'Not authenticated'
    ], 200);
}

if (isset($conn) && $conn) $conn->close();

?>
