<?php
/**
 * login.php — User authentication endpoint for MediSync HMS.
 *
 * Accepts POST requests with credentials via form data or JSON body:
 * - username: User's login name
 * - password: User's password (plain or hashed)
 *
 * Returns JSON response:
 * - status: 'success' or 'error'
 * - username: Authenticated username (on success)
 * - role: User role (Admin, Doctor, Nurse, Receptionist)
 * - message: Error message (on failure)
 *
 * Usage:
 * - POST to api/login.php with form fields or JSON body
 * - Use ?debug=1 for diagnostic output of received data
*/

include_once(__DIR__ . "/../config.php");

// Diagnostic mode: outputs raw and parsed request data for troubleshooting
if (isset($_GET['debug']) || isset($_POST['debug'])) {
    $raw = file_get_contents('php://input');
    $data = get_request_data();
    send_json([
        'raw_input' => $raw,
        'parsed_data' => $data,
        'content_type' => $_SERVER['CONTENT_TYPE'] ?? '',
        'method' => $_SERVER['REQUEST_METHOD'] ?? '',
        'post' => $_POST
    ], 200);
    exit;
}

// Credential extraction: supports both form POST and JSON
$username = isset($_POST['username']) ? trim($_POST['username']) : null;
$password = isset($_POST['password']) ? $_POST['password'] : null;
if (!$username || !$password) {
    $data = get_request_data();
    $username = trim($data['username'] ?? '');
    $password = $data['password'] ?? '';
}

// Validate credentials presence
if (!$username || !$password) {
  send_json([
    "status" => "error",
    "message" => "Missing credentials"
  ], 400);
  exit;
}
// Role selected by client (optional). We'll require match if provided.
$selectedRole = isset($_POST['role']) ? trim($_POST['role']) : null;
if (!$selectedRole) {
    $data = get_request_data();
    $selectedRole = $data['role'] ?? null;
}

// Prepare and execute user lookup
// Prepare and execute user lookup (allow multiple rows if DB has duplicates)
$stmt = $conn->prepare("SELECT id, username, password, role FROM staff WHERE username = ?");
if (!$stmt) {
    send_json([
      "status" => "error",
      "message" => "Server error preparing statement"
    ], 500);
    exit;
}

$stmt->bind_param("s", $username);
$stmt->execute();
$result = $stmt->get_result();

// Handle user not found
if (!$result || $result->num_rows === 0) {
    send_json([
      "status" => "error",
      "message" => "Invalid username or password"
    ], 401);
    $stmt->close();
    $conn->close();
    exit;
}

// Iterate through potential matching rows and verify password for each
$matchedRow = null;
while ($row = $result->fetch_assoc()) {
    $stored = $row['password'] ?? '';
    $ok = false;
    if ($stored !== '') {
        if (password_verify($password, $stored)) {
            $ok = true;
        } elseif ($stored === $password) {
            // legacy plaintext match
            $ok = true;
        }
    }
    if ($ok) {
        $matchedRow = $row;
        break;
    }
}

$isValid = $matchedRow !== null;

// Respond with authentication result
if ($isValid) {
    $row = $matchedRow;
    // If client provided a role selection, require it to match user's stored role
    if ($selectedRole && strcasecmp($selectedRole, $row['role']) !== 0) {
        send_json([
            'status' => 'error',
            'message' => 'Selected role does not match account role'
        ], 403);
        $stmt->close();
        $conn->close();
        exit;
    }
    // On successful login, set session user data (id, username, role)
    if (php_sapi_name() !== 'cli') {
        $_SESSION['user'] = [
            'id' => (int)$row['id'],
            'username' => $row['username'],
            'role' => $row['role']
        ];
    }

    // If the stored password was plaintext (matched directly), upgrade to password_hash()
    if (($row['password'] ?? '') === $password) {
        try {
            $newHash = password_hash($password, PASSWORD_DEFAULT);
            $upd = $conn->prepare("UPDATE staff SET password = ? WHERE id = ?");
            if ($upd) {
                $upd->bind_param("si", $newHash, $row['id']);
                $upd->execute();
                $upd->close();
            }
        } catch (Exception $e) {
            // Non-fatal: continue without blocking login
        }
    }

    send_json([
        "status" => "success",
        "username" => $row["username"],
        "role" => $row["role"] ?? ''
    ], 200);
} else {
    send_json([
      "status" => "error",
      "message" => "Invalid username or password"
    ], 401);
}

$stmt->close();
$conn->close();
