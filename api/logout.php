<?php
include_once(__DIR__ . "/../config.php");

if (php_sapi_name() !== 'cli') {
    // Unset session and destroy
    if (session_status() === PHP_SESSION_ACTIVE) {
        $_SESSION = [];
        if (ini_get('session.use_cookies')) {
            $params = session_get_cookie_params();
            setcookie(session_name(), '', time() - 42000,
                $params['path'], $params['domain'], $params['secure'], $params['httponly']);
        }
        session_destroy();
    }
}

send_json(['status' => 'success', 'message' => 'Logged out'], 200);

$conn->close();

?>
