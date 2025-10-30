<?php
// tools/cli_login.php — small helper to test login.php using POST-like data
// Usage: php tools/cli_login.php username password

if ($argc < 3) {
    echo json_encode(["error" => "Usage: php tools/cli_login.php <username> <password>\n"]);
    exit(1);
}

$_POST['username'] = $argv[1];
$_POST['password'] = $argv[2];

// Include the login endpoint (it expects to use $_POST)
require __DIR__ . '/../api/login.php';
