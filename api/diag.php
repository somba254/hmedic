
<?php
/**
 * diag.php — Diagnostic endpoint for MediSync HMS.
 *
 * Returns system and database status, including table row counts.
 *
 * Usage:
 * - GET api/diag.php for diagnostic JSON
 */

include_once(__DIR__ . '/../config.php');

// Check database connection
if (empty($conn) || !($conn instanceof mysqli)) {
    send_json([
        'status' => 'error',
        'message' => 'Database connection unavailable',
        'note' => 'Check DB credentials in config.local.php or environment variables DB_USER/DB_PASS/DB_NAME/DB_HOST/DB_PORT'
    ], 500);
    exit;
}

// Collect system and table diagnostics
$out = [
    'status' => 'ok',
    'server' => php_uname(),
    'php_version' => phpversion(),
    'database' => 'connected',
    'tables' => []
];

$tables = ['staff','patients','appointments','billing'];
foreach ($tables as $t) {
    $res = $conn->query("SELECT COUNT(*) as c FROM `$t`");
    if ($res) {
        $r = $res->fetch_assoc();
        $out['tables'][$t] = (int)$r['c'];
    } else {
        $out['tables'][$t] = null;
    }
}

send_json($out, 200);

$conn->close();
