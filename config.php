
<?php

/**
 * config.php — Centralized configuration and database connection for all API endpoints.
 */

// Load database credentials from environment variables or use defaults
$host = getenv('DB_HOST') ?: 'localhost';
$user = getenv('DB_USER') ?: 'root';
$pass = getenv('DB_PASS') ?: '';
$db   = getenv('DB_NAME') ?: 'hmedic_db';
$port = getenv('DB_PORT') ?: 3307;

// Optionally override credentials using config.local.php (not committed to VCS)
$localConfig = __DIR__ . DIRECTORY_SEPARATOR . 'config.local.php';
if (file_exists($localConfig)) {
  include $localConfig;
}

// Configure MySQLi to suppress exceptions for graceful error handling
mysqli_report(MYSQLI_REPORT_OFF);

// Establish database connection
$conn = @new mysqli($host, $user, $pass, $db, (int)$port);

// Handle connection errors for both CLI and browser contexts
if ($conn->connect_errno) {
  $msg = "Database connection failed ({$conn->connect_errno}): " . $conn->connect_error;
  if (php_sapi_name() === 'cli') {
    fwrite(STDERR, "ERROR: $msg\n");
    $conn = null;
  } else {
    http_response_code(500);
    if (php_sapi_name() !== 'cli') header('Content-Type: application/json');
    echo json_encode([
      "status" => "error",
      "message" => $msg,
      "note" => "Check credentials in config.local.php or environment variables DB_USER/DB_PASS/DB_NAME/DB_HOST/DB_PORT"
    ]);
    exit;
  }
} else {
  // Set UTF-8 charset for all queries
  $conn->set_charset("utf8mb4");
}

// Start PHP session for web requests only
if (php_sapi_name() !== 'cli' && session_status() === PHP_SESSION_NONE) {
  ini_set('session.use_strict_mode', 1);
  session_start();
}

/**
 * current_user — Returns authenticated user information from session or null
 */
if (!function_exists('current_user')) {
  function current_user()
  {
    if (php_sapi_name() === 'cli') return null;
    if (isset($_SESSION) && !empty($_SESSION['user'])) {
      return $_SESSION['user'];
    }
    return null;
  }
}

/**
 * require_role — Ensures the current session user has one of the allowed roles.
 */
if (!function_exists('require_role')) {
  function require_role($allowed)
  {
    if (is_string($allowed)) $allowed = [$allowed];
    $allowed = array_map('strtolower', $allowed);
    $user = current_user();
    if (!$user || !isset($user['role']) || !in_array(strtolower($user['role']), $allowed, true)) {
      http_response_code(403);
      if (php_sapi_name() !== 'cli') header('Content-Type: application/json');
      echo json_encode([
        'status' => 'error',
        'message' => 'Forbidden: insufficient permissions'
      ]);
      global $conn;
      if (isset($conn) && $conn) $conn->close();
      exit;
    }
  }
}

/**
 * get_request_data — Parses incoming request data
 */
if (!function_exists('get_request_data')) {
  function get_request_data()
  {
    $input = file_get_contents('php://input');
    if ($input) {
      $data = json_decode($input, true);
      if (json_last_error() === JSON_ERROR_NONE && is_array($data)) {
        return $data;
      }
    }
    return $_POST;
  }
}

/**
 * send_json — Sends a JSON response with the specified HTTP status code.
 */
if (!function_exists('send_json')) {
  function send_json($data, $code = 200)
  {
    http_response_code($code);
    if (php_sapi_name() !== 'cli') header('Content-Type: application/json');
    echo json_encode($data);
    return null;
  }
}

