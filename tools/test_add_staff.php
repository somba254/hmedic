<?php
// Login as admin via HTTP, then POST to staff.php to add a user
$base = 'http://localhost/hmedic/api';
function http_request($url, $method = 'GET', $data = null, &$cookies = []) {
    $opts = [
        'http' => [
            'method' => $method,
            'header' => "User-Agent: TestAgent/1.0\r\n",
            'ignore_errors' => true,
        ]
    ];
    if (!empty($cookies)) {
        $cookieHeader = [];
        foreach ($cookies as $k => $v) $cookieHeader[] = "$k=$v";
        $opts['http']['header'] .= "Cookie: " . implode('; ', $cookieHeader) . "\r\n";
    }
    if ($data) {
        $opts['http']['header'] .= "Content-Type: application/x-www-form-urlencoded\r\n";
        $opts['http']['content'] = http_build_query($data);
    }
    $context = stream_context_create($opts);
    $res = @file_get_contents($url, false, $context);
    $headers = $http_response_header ?? [];
    foreach ($headers as $h) {
        if (stripos($h, 'Set-Cookie:') === 0) {
            $parts = explode(':', $h, 2);
            $cookie = trim($parts[1]);
            $ckParts = explode(';', $cookie);
            $kv = explode('=', trim($ckParts[0]), 2);
            if (count($kv) == 2) $cookies[$kv[0]] = $kv[1];
        }
    }
    return [$res, $headers];
}
$cookies = [];
list($loginRes) = http_request($base . '/login.php', 'POST', ['username' => 'admin', 'password' => 'admin123', 'role' => 'Admin'], $cookies);
echo "Login response: $loginRes\n";
echo "Cookies: "; print_r($cookies);
$new = ['username' => 'test_staff', 'password' => 'testpass', 'role' => 'Doctor'];
list($addRes) = http_request($base . '/staff.php', 'POST', $new, $cookies);
echo "Add staff response: $addRes\n";
?>