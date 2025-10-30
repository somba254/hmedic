<?php
require __DIR__ . '/../config.php';
header_remove(); // avoid any header issues in CLI
$tables = ['staff','patients','appointments','billing'];
foreach ($tables as $t) {
    $res = $conn->query("SELECT COUNT(*) AS cnt FROM `$t`");
    if ($res) {
        $row = $res->fetch_assoc();
        echo strtoupper($t) . " count: " . ($row['cnt'] ?? '0') . "\n";
        $s = $conn->query("SELECT * FROM `$t` LIMIT 1");
        if ($s && $s->num_rows > 0) {
            $r = $s->fetch_assoc();
            echo "Sample: ";
            $cols = array_map(function($k,$v){ return "$k=$v"; }, array_keys($r), $r);
            // simpler print
            foreach ($r as $k=>$v) echo "$k=$v; ";
            echo "\n";
        } else {
            echo "Sample: (none)\n";
        }
    } else {
        echo strtoupper($t) . " error: " . ($conn->error ?? 'unknown') . "\n";
    }
}
$conn->close();
?>