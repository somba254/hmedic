
/**
 * patients.php — Patient management endpoint for MediSync HMS.
 *
 * Supports:
 * - GET: Returns all patients as JSON array
 * - POST: Adds a new patient (fields: patientName, patientAge, patientGender, assignedDoctor, appointmentDate)
 *
 * Returns JSON response with status and message.
 *
 * Usage:
 * - GET api/patients.php for patient list
 * - POST api/patients.php with required fields to add patient
 */

include_once(__DIR__ . "/../config.php");

$method = $_SERVER["REQUEST_METHOD"];

if ($method === "GET") {
    $res = $conn->query("SELECT id, name, age, gender, doctor, date FROM patients ORDER BY id DESC");
    if ($res === false) {
        send_json([
          "status" => "error",
          "message" => "Query failed"
        ], 500);
        $conn->close();
        exit;
    }
    $patients = [];
    while ($row = $res->fetch_assoc()) {
        $patients[] = $row;
    }
    send_json($patients, 200);
}

elseif ($method === "POST") {
  // Only Receptionists and Admins can add patients
  require_role(['Receptionist', 'Admin']);
    $data = get_request_data();
    $name = trim($data["patientName"] ?? "");
    $age = (int)($data["patientAge"] ?? 0);
    $gender = $data["patientGender"] ?? "";
    $doctor = $data["assignedDoctor"] ?? "";
    $date = $data["appointmentDate"] ?? date("Y-m-d");

    // Validate required fields
    if (!$name || !$age || !$gender || !$doctor) {
        send_json([
          "status" => "error",
          "message" => "All fields required"
        ], 400);
        $conn->close();
        exit;
    }

    // Insert new patient record
    $stmt = $conn->prepare("INSERT INTO patients (name, age, gender, doctor, date) VALUES (?,?,?,?,?)");
    if (!$stmt) {
        send_json([
          "status" => "error",
          "message" => "Server error preparing statement"
        ], 500);
        $conn->close();
        exit;
    }
    $stmt->bind_param("sisss", $name, $age, $gender, $doctor, $date);

    if ($stmt->execute()) {
        send_json([
          "status" => "success",
          "message" => "Patient added successfully",
          "id" => $stmt->insert_id
        ], 201);
    } else {
        send_json([
          "status" => "error",
          "message" => "Failed to add patient",
          "error" => $stmt->error
        ], 500);
    }

    $stmt->close();
}

$conn->close();

