<?php
// Logs endpoint removed. Return explicit message so any client calls fail gracefully.
require_once __DIR__ . '/../config.php';

http_response_code(410);
send_json([
    'status' => 'error',
    'message' => 'System logs have been disabled/removed from this installation.'
], 410);

// Close connection if present
global $conn;
if (isset($conn) && $conn) $conn->close();

exit;