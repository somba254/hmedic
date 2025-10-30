<?php
// Simple test script: login, then attempt to add patient and list staff using cookies
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
        if ($data instanceof CURLFile) {
            // not used
        } elseif (is_array($data)) {
            $opts['http']['header'] .= "Content-Type: application/x-www-form-urlencoded\r\n";
            $opts['http']['content'] = http_build_query($data);
        } else {
            $opts['http']['content'] = $data;
        }
    }
    $context = stream_context_create($opts);
    $res = @file_get_contents($url, false, $context);
    $headers = $http_response_header ?? [];
    // parse Set-Cookie
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
// 1) Login as receptionist
list($loginRes, $loginHeaders) = http_request($base . '/login.php', 'POST', ['username' => 'reception_mary', 'password' => 'mary123'], $cookies);
echo "Login response: \n" . $loginRes . "\n";
echo "Cookies: "; print_r($cookies);

// 2) Attempt to add patient (should be allowed for Receptionist)
$patient = [
    'patientName' => 'Unit Test Patient',
    'patientAge' => 30,
    'patientGender' => 'Male',
    'assignedDoctor' => 'Dr. Miller',
    'appointmentDate' => date('Y-m-d')
];
list($addRes, $addHeaders) = http_request($base . '/patients.php', 'POST', $patient, $cookies);
echo "Add patient response:\n" . $addRes . "\n";

// 3) Attempt to list staff (should be forbidden for Receptionist)
list($staffRes, $staffHeaders) = http_request($base . '/staff.php', 'GET', null, $cookies);
echo "Staff list response:\n" . $staffRes . "\n";

?>