<?php
// [Stephen] [Molife] [u25368037]
// api.php – COS216 Homework Assignment – Task 1


header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json");

if ($_SERVER["REQUEST_METHOD"] === "OPTIONS") {
    http_response_code(200);
    exit();
}

include(__DIR__ . "/config.php");


//  Database Singleton 

class Database {
    private static $instance = null;
    private $conn;

    private function __construct($conn) {
        $this->conn = $conn;
    }

    public static function getInstance($conn) {
        if (self::$instance === null) {
            self::$instance = new Database($conn);
        }
        return self::$instance;
    }

    public function getConnection() {
        return $this->conn;
    }
}


// ─── API Class ────────────────────────────────────────────────────────────────

class API {
    private $conn;

    // Shared server-to-server key for UpdateFlightPosition.
    // The NodeJS server must send this exact value in the "server_key" field.
    // Gotta change this key part for that sanitisation and update your NodeJS .env accordingly.
    private const SERVER_KEY = "HA_SERVER_SECRET_KEY_u25368037";

    public function __construct($conn) {
        $this->conn = $conn;
    }

    // ─── Generic Helpers ──────────────────────────────────────────────────────

    private function respond($status, $data, $httpCode = 200) {
        http_response_code($httpCode);
        $timestamp = round(microtime(true) * 1000);
        echo json_encode([
            "status"    => $status,
            "timestamp" => $timestamp,
            "data"      => $data
        ]);
        exit();
    }

    private function generateApiKey() {
        return bin2hex(random_bytes(16));
    }

    private function validatePassword($password) {
        return preg_match('/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/', $password);
    }

    private function validateEmail($email) {
        return preg_match('/^[^\s@]+@[^\s@]+\.[^\s@]+$/', $email);
    }

    /**
     * Validates the apikey field.
     * Returns an associative array with keys: id, type
     * Exits with error response on failure.
     */
    private function validateApiKey($input) {
        if (!isset($input["apikey"]) || trim($input["apikey"]) === "") {
            $this->respond("error", "API key is missing.", 401);
        }

        $apiKey = trim($input["apikey"]);
        $stmt   = $this->conn->prepare("SELECT id, type FROM users WHERE api_key = ?");
        $stmt->bind_param("s", $apiKey);
        $stmt->execute();
        $stmt->store_result();

        if ($stmt->num_rows === 0) {
            $stmt->close();
            $this->respond("error", "Invalid API key.", 401);
        }

        $stmt->bind_result($userId, $userType);
        $stmt->fetch();
        $stmt->close();
        return ["id" => $userId, "type" => $userType];
    }


    // HA TASK 1 ENDPOINTS
   

    //  GetAllFlights
   
    public function getAllFlights($input) {
        $user = $this->validateApiKey($input);

        if ($user["type"] === "ATC") {
            // ATC sees every flight
            $sql = "
                SELECT
                    f.id,
                    f.flight_number,
                    f.departure_time,
                    f.flight_duration_hours,
                    f.status,
                    f.current_latitude,
                    f.current_longitude,
                    f.dispatched_at,
                    oa.iata_code   AS origin_code,
                    oa.name        AS origin_name,
                    oa.city        AS origin_city,
                    oa.latitude    AS origin_lat,
                    oa.longitude   AS origin_lon,
                    da.iata_code   AS destination_code,
                    da.name        AS destination_name,
                    da.city        AS destination_city,
                    da.latitude    AS dest_lat,
                    da.longitude   AS dest_lon
                FROM ha_flights f
                JOIN ha_airports oa ON oa.id = f.origin_airport_id
                JOIN ha_airports da ON da.id = f.destination_airport_id
                ORDER BY f.departure_time ASC
            ";
            $stmt = $this->conn->prepare($sql);
            $stmt->execute();
        } else {
            // Passenger sees only their flights
            $sql = "
                SELECT
                    f.id,
                    f.flight_number,
                    f.departure_time,
                    f.flight_duration_hours,
                    f.status,
                    f.current_latitude,
                    f.current_longitude,
                    f.dispatched_at,
                    oa.iata_code   AS origin_code,
                    oa.name        AS origin_name,
                    oa.city        AS origin_city,
                    oa.latitude    AS origin_lat,
                    oa.longitude   AS origin_lon,
                    da.iata_code   AS destination_code,
                    da.name        AS destination_name,
                    da.city        AS destination_city,
                    da.latitude    AS dest_lat,
                    da.longitude   AS dest_lon,
                    pf.seat_number,
                    pf.boarding_confirmed,
                    pf.confirmed_at
                FROM ha_passenger_flights pf
                JOIN ha_flights f    ON f.id  = pf.flight_id
                JOIN ha_airports oa  ON oa.id = f.origin_airport_id
                JOIN ha_airports da  ON da.id = f.destination_airport_id
                WHERE pf.passenger_id = ?
                ORDER BY f.departure_time ASC
            ";
            $stmt = $this->conn->prepare($sql);
            $stmt->bind_param("i", $user["id"]);
            $stmt->execute();
        }

        $result  = $stmt->get_result();
        $flights = [];
        while ($row = $result->fetch_assoc()) {
            $flights[] = $row;
        }
        $stmt->close();
        $this->respond("success", $flights, 200);
    }


    //  GetFlight kode
    /**
     
     */
    public function getFlight($input) {
        $user = $this->validateApiKey($input);

        if (!isset($input["flight_id"]) || intval($input["flight_id"]) < 1) {
            $this->respond("error", "flight_id is required.", 400);
        }
        $flightId = intval($input["flight_id"]);

        // Fetch the core flight row
        $sql = "
            SELECT
                f.id,
                f.flight_number,
                f.departure_time,
                f.flight_duration_hours,
                f.status,
                f.current_latitude,
                f.current_longitude,
                f.dispatched_at,
                oa.id          AS origin_id,
                oa.iata_code   AS origin_code,
                oa.name        AS origin_name,
                oa.city        AS origin_city,
                oa.country     AS origin_country,
                oa.latitude    AS origin_lat,
                oa.longitude   AS origin_lon,
                da.id          AS destination_id,
                da.iata_code   AS destination_code,
                da.name        AS destination_name,
                da.city        AS destination_city,
                da.country     AS destination_country,
                da.latitude    AS dest_lat,
                da.longitude   AS dest_lon
            FROM ha_flights f
            JOIN ha_airports oa ON oa.id = f.origin_airport_id
            JOIN ha_airports da ON da.id = f.destination_airport_id
            WHERE f.id = ?
        ";
        $stmt = $this->conn->prepare($sql);
        $stmt->bind_param("i", $flightId);
        $stmt->execute();
        $result = $stmt->get_result();

        if ($result->num_rows === 0) {
            $stmt->close();
            $this->respond("error", "Flight not found.", 404);
        }

        $flight = $result->fetch_assoc();
        $stmt->close();

        if ($user["type"] === "Passenger") {
            // Verify they are booked on this flight
            $chk = $this->conn->prepare(
                "SELECT id FROM ha_passenger_flights WHERE passenger_id = ? AND flight_id = ?"
            );
            $chk->bind_param("ii", $user["id"], $flightId);
            $chk->execute();
            $chk->store_result();
            if ($chk->num_rows === 0) {
                $chk->close();
                $this->respond("error", "You are not booked on this flight.", 403);
            }
            $chk->close();
            $this->respond("success", $flight, 200);
        }

        // ATC: append passenger list
        $pSql = "
            SELECT
                u.id,
                u.name,
                u.surname,
                u.email,
                pf.seat_number,
                pf.boarding_confirmed,
                pf.confirmed_at
            FROM ha_passenger_flights pf
            JOIN users u ON u.id = pf.passenger_id
            WHERE pf.flight_id = ?
        ";
        $pStmt = $this->conn->prepare($pSql);
        $pStmt->bind_param("i", $flightId);
        $pStmt->execute();
        $pResult     = $pStmt->get_result();
        $passengers  = [];
        while ($row = $pResult->fetch_assoc()) {
            $passengers[] = $row;
        }
        $pStmt->close();

        $flight["passengers"] = $passengers;
        $this->respond("success", $flight, 200);
    }


    // DispatchFlight 
    /**
     * ATC only. Transitions a flight from Scheduled → Boarding.

     */
    public function dispatchFlight($input) {
        $user = $this->validateApiKey($input);

        if ($user["type"] !== "ATC") {
            $this->respond("error", "Only ATC users can dispatch flights.", 403);
        }

        if (!isset($input["flight_id"]) || intval($input["flight_id"]) < 1) {
            $this->respond("error", "flight_id is required.", 400);
        }
        $flightId = intval($input["flight_id"]);

        // Fetch current status
        $chk = $this->conn->prepare("SELECT status FROM ha_flights WHERE id = ?");
        $chk->bind_param("i", $flightId);
        $chk->execute();
        $chk->store_result();

        if ($chk->num_rows === 0) {
            $chk->close();
            $this->respond("error", "Flight not found.", 404);
        }

        $chk->bind_result($status);
        $chk->fetch();
        $chk->close();

        if ($status !== "Scheduled") {
            $this->respond("error", "Flight is not in Scheduled state. Current status: $status", 400);
        }

        $now = date("Y-m-d H:i:s");
        $upd = $this->conn->prepare(
            "UPDATE ha_flights SET status = 'Boarding', dispatched_at = ? WHERE id = ?"
        );
        $upd->bind_param("si", $now, $flightId);
        if (!$upd->execute()) {
            $upd->close();
            $this->respond("error", "Database error while dispatching flight.", 500);
        }
        $upd->close();

        $this->respond("success", ["flight_id" => $flightId, "dispatched_at" => $now], 200);
    }


    // ─── UpdateFlightPosition ─────────────────────────────────────────────────
    /**
     * Server-to-server endpoint – no user session required.
    
     */
    public function updateFlightPosition($input) {
        // Authenticate with the shared server key
        if (!isset($input["server_key"]) || $input["server_key"] !== self::SERVER_KEY) {
            $this->respond("error", "Invalid server key.", 401);
        }

        $required = ["flight_id", "latitude", "longitude", "status"];
        foreach ($required as $field) {
            if (!isset($input[$field])) {
                $this->respond("error", "Missing field: $field", 400);
            }
        }

        $flightId  = intval($input["flight_id"]);
        $latitude  = floatval($input["latitude"]);
        $longitude = floatval($input["longitude"]);
        $status    = trim($input["status"]);

        $allowed = ["Scheduled", "Boarding", "In Flight", "Landed"];
        if (!in_array($status, $allowed, true)) {
            $this->respond("error", "Invalid status value.", 400);
        }

        $upd = $this->conn->prepare(
            "UPDATE ha_flights SET current_latitude = ?, current_longitude = ?, status = ? WHERE id = ?"
        );
        $upd->bind_param("ddsi", $latitude, $longitude, $status, $flightId);
        if (!$upd->execute()) {
            $upd->close();
            $this->respond("error", "Database error while updating position.", 500);
        }
        $upd->close();

        $this->respond("success", [
            "flight_id" => $flightId,
            "latitude"  => $latitude,
            "longitude" => $longitude,
            "status"    => $status
        ], 200);
    }


    //  GetAirports
    /**
     * Returns all airports with GPS coordinates for Leaflet markers.
     */
    public function getAirports($input) {
        $this->validateApiKey($input);

        $stmt = $this->conn->prepare(
            "SELECT id, name, iata_code, city, country, latitude, longitude FROM ha_airports ORDER BY name ASC"
        );
        $stmt->execute();
        $result   = $stmt->get_result();
        $airports = [];
        while ($row = $result->fetch_assoc()) {
            $airports[] = $row;
        }
        $stmt->close();
        $this->respond("success", $airports, 200);
    }


    //BoardFlight
    /**
     * Passenger only. Confirms boarding for the authenticated passenger on a flight.
     * The ATC must have dispatched the flight within the last 60 seconds.
     */
    public function boardFlight($input) {
        $user = $this->validateApiKey($input);

        if ($user["type"] !== "Passenger") {
            $this->respond("error", "Only Passenger users can board flights.", 403);
        }

        if (!isset($input["flight_id"]) || intval($input["flight_id"]) < 1) {
            $this->respond("error", "flight_id is required.", 400);
        }
        $flightId = intval($input["flight_id"]);

        // Fetch the flight's dispatched_at and status
        $fStmt = $this->conn->prepare(
            "SELECT status, dispatched_at FROM ha_flights WHERE id = ?"
        );
        $fStmt->bind_param("i", $flightId);
        $fStmt->execute();
        $fStmt->store_result();

        if ($fStmt->num_rows === 0) {
            $fStmt->close();
            $this->respond("error", "Flight not found.", 404);
        }

        $fStmt->bind_result($status, $dispatchedAt);
        $fStmt->fetch();
        $fStmt->close();

        if ($status !== "Boarding") {
            $this->respond("error", "Flight is not currently in Boarding state.", 400);
        }

        // Check the 60-second boarding window smt like that
        $dispatchedTs = strtotime($dispatchedAt);
        $nowTs        = time();
        if (($nowTs - $dispatchedTs) > 60) {
            $this->respond("error", "Boarding confirmation window has expired (60 seconds).", 400);
        }

        // Check the passenger is booked on this flight
        $pStmt = $this->conn->prepare(
            "SELECT id, boarding_confirmed FROM ha_passenger_flights WHERE passenger_id = ? AND flight_id = ?"
        );
        $pStmt->bind_param("ii", $user["id"], $flightId);
        $pStmt->execute();
        $pStmt->store_result();

        if ($pStmt->num_rows === 0) {
            $pStmt->close();
            $this->respond("error", "You are not booked on this flight.", 403);
        }

        $pStmt->bind_result($pfId, $alreadyConfirmed);
        $pStmt->fetch();
        $pStmt->close();

        if ($alreadyConfirmed) {
            $this->respond("error", "You have already confirmed boarding for this flight.", 400);
        }

        // Record the confirmation
        $now = date("Y-m-d H:i:s");
        $upd = $this->conn->prepare(
            "UPDATE ha_passenger_flights SET boarding_confirmed = 1, confirmed_at = ? WHERE id = ?"
        );
        $upd->bind_param("si", $now, $pfId);
        if (!$upd->execute()) {
            $upd->close();
            $this->respond("error", "Database error while recording boarding.", 500);
        }
        $upd->close();

        $this->respond("success", ["flight_id" => $flightId, "confirmed_at" => $now], 200);
    }


    
    //  ENDPOINTS 
   

    public function register($input) {
        $required = ["name", "surname", "email", "password", "user_type"];
        foreach ($required as $field) {
            if (!isset($input[$field]) || trim($input[$field]) === "") {
                $this->respond("error", "Missing or blank field: " . $field, 400);
            }
        }

        $name     = trim($input["name"]);
        $surname  = trim($input["surname"]);
        $email    = trim($input["email"]);
        $password = $input["password"];
        $userType = trim($input["user_type"]);

        if (!$this->validateEmail($email)) {
            $this->respond("error", "Invalid email address.", 400);
        }
        if (!$this->validatePassword($password)) {
            $this->respond("error",
                "Password must be 8+ characters and include uppercase, lowercase, a digit, and a symbol.", 400);
        }
        if ($userType !== "Passenger" && $userType !== "ATC") {
            $this->respond("error", "User type must be 'Passenger' or 'ATC'.", 400);
        }

        $chk = $this->conn->prepare("SELECT id FROM users WHERE email = ?");
        $chk->bind_param("s", $email);
        $chk->execute();
        $chk->store_result();
        if ($chk->num_rows > 0) {
            $chk->close();
            $this->respond("error", "An account with that email already exists.", 409);
        }
        $chk->close();

        $salt           = bin2hex(random_bytes(16));
        $hashedPassword = hash("sha512", $salt . $password);
        $storedPassword = $salt . ":" . $hashedPassword;
        $apiKey         = $this->generateApiKey();

        $stmt = $this->conn->prepare(
            "INSERT INTO users (name, surname, email, password, type, api_key) VALUES (?, ?, ?, ?, ?, ?)"
        );
        $stmt->bind_param("ssssss", $name, $surname, $email, $storedPassword, $userType, $apiKey);

        if ($stmt->execute()) {
            $stmt->close();
            $this->respond("success", ["apikey" => $apiKey], 201);
        } else {
            $this->respond("error", "Database error. Could not register user.", 500);
        }
    }

    public function login($input) {
        if (!isset($input["email"]) || trim($input["email"]) === "") {
            $this->respond("error", "Email is required.", 400);
        }
        if (!isset($input["password"]) || $input["password"] === "") {
            $this->respond("error", "Password is required.", 400);
        }

        $email    = trim($input["email"]);
        $password = $input["password"];

        $stmt = $this->conn->prepare(
            "SELECT id, name, surname, password, api_key, type FROM users WHERE email = ?"
        );
        $stmt->bind_param("s", $email);
        $stmt->execute();
        $stmt->store_result();

        if ($stmt->num_rows === 0) {
            $stmt->close();
            $this->respond("error", "Invalid email or password.", 401);
        }

        $stmt->bind_result($userId, $name, $surname, $storedPassword, $apiKey, $userType);
        $stmt->fetch();
        $stmt->close();

        $parts = explode(":", $storedPassword, 2);
        if (count($parts) !== 2) {
            $this->respond("error", "Account error. Contact support.", 500);
        }
        $salt     = $parts[0];
        $hash     = $parts[1];
        $computed = hash("sha512", $salt . $password);

        if (!hash_equals($hash, $computed)) {
            $this->respond("error", "Invalid email or password.", 401);
        }

        $this->respond("success", [
            "apikey"  => $apiKey,
            "name"    => $name,
            "surname" => $surname,
            "type"    => $userType,
            "id"      => $userId
        ], 200);
    }

    public function getAllPlanes($input) {
        $this->validateApiKey($input);

        $validReturnCols = [
            "id", "seats", "description", "image_url",
            "max_range_km", "max_cargo_kg", "max_speed_kmh",
            "model", "manufacturer", "classes"
        ];
        $validSortCols = [
            "id", "seats", "manufacturer", "model",
            "max_range_km", "max_cargo_kg", "max_speed_kmh"
        ];
        $validSearchKeys = [
            "id", "manufacturer", "model",
            "min_seats", "max_seats", "max_range", "max_cargo", "cabin_class"
        ];

        if (!isset($input["return"])) {
            $this->respond("error", "Post parameters are missing", 400);
        }

        $returnCols = $input["return"];
        if (!is_array($returnCols) || empty($returnCols)) {
            $this->respond("error", "return must be a non-empty array.", 400);
        }
        foreach ($returnCols as $col) {
            if (!in_array($col, $validReturnCols, true)) {
                $this->respond("error", "Invalid return field: $col", 400);
            }
        }

        $search  = isset($input["search"])  && is_array($input["search"])  ? $input["search"]  : [];
        $sort    = isset($input["sort"])     && is_array($input["sort"])    ? $input["sort"]    : [];
        $order   = isset($input["order"])    ? strtoupper(trim($input["order"]))    : "ASC";
        $fuzzy   = isset($input["fuzzy"])    ? (bool)$input["fuzzy"]    : false;

        if (!in_array($order, ["ASC", "DESC"], true)) {
            $this->respond("error", "order must be ASC or DESC.", 400);
        }

        foreach ($search as $key => $val) {
            if (!in_array($key, $validSearchKeys, true)) {
                $this->respond("error", "Invalid search key: $key", 400);
            }
        }
        foreach ($sort as $col) {
            if (!in_array($col, $validSortCols, true)) {
                $this->respond("error", "Invalid sort field: $col", 400);
            }
        }

        $needsClasses = in_array("classes", $returnCols, true);
        $baseCols     = array_filter($returnCols, fn($c) => $c !== "classes");

        if (!empty($baseCols)) {
            $selectParts = array_map(fn($c) => "p.$c", $baseCols);
            $selectList  = implode(", ", $selectParts);
        } else {
            $selectList = "p.id";
        }

        $sql    = "SELECT DISTINCT $selectList FROM planes p";
        $joins  = "";
        $where  = [];
        $params = [];
        $types  = "";

        if (isset($search["cabin_class"])) {
            $joins .= " JOIN plane_classes pc ON pc.plane_id = p.id";
        }

        if (isset($search["id"])) {
            $where[] = "p.id = ?";
            $params[] = intval($search["id"]);
            $types   .= "i";
        }
        if (isset($search["manufacturer"])) {
            $v = $search["manufacturer"];
            if ($fuzzy) {
                $where[] = "p.manufacturer LIKE ?";
                $params[] = "%" . $v . "%";
            } else {
                $where[] = "p.manufacturer = ?";
                $params[] = $v;
            }
            $types .= "s";
        }
        if (isset($search["model"])) {
            $v = $search["model"];
            if ($fuzzy) {
                $where[] = "p.model LIKE ?";
                $params[] = "%" . $v . "%";
            } else {
                $where[] = "p.model = ?";
                $params[] = $v;
            }
            $types .= "s";
        }
        if (isset($search["min_seats"])) {
            $where[]  = "p.seats >= ?";
            $params[] = intval($search["min_seats"]);
            $types   .= "i";
        }
        if (isset($search["max_seats"])) {
            $where[]  = "p.seats <= ?";
            $params[] = intval($search["max_seats"]);
            $types   .= "i";
        }
        if (isset($search["max_range"])) {
            $where[]  = "p.max_range_km <= ?";
            $params[] = floatval($search["max_range"]);
            $types   .= "d";
        }
        if (isset($search["max_cargo"])) {
            $where[]  = "p.max_cargo_kg <= ?";
            $params[] = floatval($search["max_cargo"]);
            $types   .= "d";
        }
        if (isset($search["cabin_class"])) {
            $where[]  = "pc.class_name = ?";
            $params[] = $search["cabin_class"];
            $types   .= "s";
        }

        $sql .= $joins;
        if (!empty($where)) {
            $sql .= " WHERE " . implode(" AND ", $where);
        }
        if (!empty($sort)) {
            $sortClauses = array_map(fn($c) => "p.$c", $sort);
            $sql .= " ORDER BY " . implode(", ", $sortClauses) . " $order";
        }

        $stmt = $this->conn->prepare($sql);
        if (!empty($params)) {
            $stmt->bind_param($types, ...$params);
        }
        $stmt->execute();
        $result = $stmt->get_result();
        $planes = [];
        while ($row = $result->fetch_assoc()) {
            $planes[] = $row;
        }
        $stmt->close();

        if ($needsClasses) {
            foreach ($planes as &$plane) {
                $cStmt = $this->conn->prepare(
                    "SELECT class_name FROM plane_classes WHERE plane_id = ?"
                );
                $cStmt->bind_param("i", $plane["id"]);
                $cStmt->execute();
                $cResult  = $cStmt->get_result();
                $classes  = [];
                while ($c = $cResult->fetch_assoc()) {
                    $classes[] = $c["class_name"];
                }
                $cStmt->close();
                $plane["classes"] = $classes;
            }
            unset($plane);
        }

        $this->respond("success", $planes, 200);
    }

    public function getAllAirports($input) {
        $this->validateApiKey($input);
        $stmt = $this->conn->prepare(
            "SELECT code, name, city, country, latitude, longitude FROM airports ORDER BY name ASC"
        );
        $stmt->execute();
        $result   = $stmt->get_result();
        $airports = [];
        while ($row = $result->fetch_assoc()) {
            $airports[] = $row;
        }
        $stmt->close();
        $this->respond("success", $airports, 200);
    }

    public function addFavourite($input) {
        $userId  = $this->validateApiKey($input);
        if (is_array($userId)) { $userId = $userId["id"]; }
        if (!isset($input["plane_id"]) || intval($input["plane_id"]) < 1) {
            $this->respond("error", "plane_id is required.", 400);
        }
        $planeId = intval($input["plane_id"]);
        $chk = $this->conn->prepare("SELECT id FROM favourites WHERE user_id = ? AND plane_id = ?");
        $chk->bind_param("ii", $userId, $planeId);
        $chk->execute();
        $chk->store_result();
        if ($chk->num_rows > 0) {
            $chk->close();
            $this->respond("error", "Plane is already in favourites.", 409);
        }
        $chk->close();
        $ins = $this->conn->prepare("INSERT INTO favourites (user_id, plane_id) VALUES (?, ?)");
        $ins->bind_param("ii", $userId, $planeId);
        if ($ins->execute()) {
            $ins->close();
            $this->respond("success", "Plane added to favourites.", 201);
        } else {
            $this->respond("error", "Could not add favourite.", 500);
        }
    }

    public function removeFavourite($input) {
        $userId  = $this->validateApiKey($input);
        if (is_array($userId)) { $userId = $userId["id"]; }
        if (!isset($input["plane_id"]) || intval($input["plane_id"]) < 1) {
            $this->respond("error", "plane_id is required.", 400);
        }
        $planeId = intval($input["plane_id"]);
        $del = $this->conn->prepare("DELETE FROM favourites WHERE user_id = ? AND plane_id = ?");
        $del->bind_param("ii", $userId, $planeId);
        if ($del->execute()) {
            $del->close();
            $this->respond("success", "Plane removed from favourites.", 200);
        } else {
            $this->respond("error", "Could not remove favourite.", 500);
        }
    }

    public function getFavourites($input) {
        $userId = $this->validateApiKey($input);
        if (is_array($userId)) { $userId = $userId["id"]; }
        $stmt = $this->conn->prepare(
            "SELECT p.id, p.manufacturer, p.model, p.seats, p.image_url
             FROM favourites f JOIN planes p ON p.id = f.plane_id
             WHERE f.user_id = ? ORDER BY p.manufacturer ASC"
        );
        $stmt->bind_param("i", $userId);
        $stmt->execute();
        $result = $stmt->get_result();
        $favs   = [];
        while ($row = $result->fetch_assoc()) { $favs[] = $row; }
        $stmt->close();
        $this->respond("success", $favs, 200);
    }

    public function bookFlight($input) {
        $userId = $this->validateApiKey($input);
        if (is_array($userId)) { $userId = $userId["id"]; }
        $required = ["plane_id", "departure_airport_code", "arrival_airport_code",
                     "departure_date", "passengers", "cabin_class"];
        foreach ($required as $field) {
            if (!isset($input[$field]) || (is_string($input[$field]) && trim($input[$field]) === "")) {
                $this->respond("error", "Missing field: $field", 400);
            }
        }
        $planeId    = intval($input["plane_id"]);
        $depCode    = strtoupper(trim($input["departure_airport_code"]));
        $arrCode    = strtoupper(trim($input["arrival_airport_code"]));
        $date       = trim($input["departure_date"]);
        $passengers = intval($input["passengers"]);
        $cabinClass = trim($input["cabin_class"]);
        if ($depCode === $arrCode) {
            $this->respond("error", "Departure and arrival airports must be different.", 400);
        }
        if ($passengers < 1) {
            $this->respond("error", "passengers must be at least 1.", 400);
        }
        $planeStmt = $this->conn->prepare(
            "SELECT seats, max_range_km, max_speed_kmh, max_cargo_kg FROM planes WHERE id = ?"
        );
        $planeStmt->bind_param("i", $planeId);
        $planeStmt->execute();
        $planeRes = $planeStmt->get_result();
        if ($planeRes->num_rows === 0) {
            $planeStmt->close();
            $this->respond("error", "Plane not found.", 404);
        }
        $plane = $planeRes->fetch_assoc();
        $planeStmt->close();

        foreach ([$depCode, $arrCode] as $code) {
            $aStmt = $this->conn->prepare(
                "SELECT latitude, longitude FROM airports WHERE code = ?"
            );
            $aStmt->bind_param("s", $code);
            $aStmt->execute();
            $aStmt->store_result();
            if ($aStmt->num_rows === 0) {
                $aStmt->close();
                $this->respond("error", "Airport not found: $code", 404);
            }
            if ($code === $depCode) {
                $aStmt->bind_result($lat1, $lon1);
            } else {
                $aStmt->bind_result($lat2, $lon2);
            }
            $aStmt->fetch();
            $aStmt->close();
        }

        $distance   = $this->haversine($lat1, $lon1, $lat2, $lon2);
        $flightTime = $this->calcFlightTime($distance, $plane);
        $flightId   = $this->findOrCreateFlight($planeId, $depCode, $arrCode, $date, $flightTime, $distance);
        $this->checkSeatAvailability($flightId, $passengers, $plane["seats"]);

        $ins = $this->conn->prepare(
            "INSERT INTO bookings (user_id, flight_id, passengers, cabin_class) VALUES (?, ?, ?, ?)"
        );
        $ins->bind_param("iiis", $userId, $flightId, $passengers, $cabinClass);
        if (!$ins->execute()) {
            $ins->close();
            $this->respond("error", "Could not create booking.", 500);
        }
        $bookingId = $ins->insert_id;
        $ins->close();

        $result = [
            "booking_id"   => $bookingId,
            "flight_id"    => $flightId,
            "flight_time"  => round($flightTime, 0),
            "distance_km"  => round($distance, 2)
        ];
        $this->respond("success", $result, 201);
    }

    private function haversine($lat1, $lon1, $lat2, $lon2) {
        $R    = 6377;
        $phi1 = deg2rad($lat1);
        $phi2 = deg2rad($lat2);
        $dphi = deg2rad($lat2 - $lat1);
        $dlam = deg2rad($lon2 - $lon1);
        $a    = sin($dphi / 2) ** 2 + cos($phi1) * cos($phi2) * sin($dlam / 2) ** 2;
        return $R * 2 * asin(sqrt($a));
    }

    private function calcFlightTime($d, $plane) {
        $vmax  = floatval($plane["max_speed_kmh"]);
        $Cmax  = floatval($plane["max_cargo_kg"]);
        $seats = intval($plane["seats"]);
        $vc    = $vmax * (1 - 0.2 * $Cmax / ($Cmax + 80 * $seats));
        if ($vc <= 0) { $vc = $vmax * 0.8; }
        if ($seats > 300)     { $tBase = 20; }
        elseif ($seats > 200) { $tBase = 15; }
        elseif ($seats > 100) { $tBase = 10; }
        elseif ($seats > 50)  { $tBase = 7;  }
        else                  { $tBase = 5;  }
        $k      = 0.001;
        $tClimb = $tBase * (1 - exp(-$k * $d));
        return ($d / $vc) * 60 + $tClimb + 15;
    }

    private function findOrCreateFlight($planeId, $depCode, $arrCode, $date, $flightTime, $distance) {
        $fStmt = $this->conn->prepare(
            "SELECT id FROM flights WHERE plane_id = ? AND departure_airport_code = ? AND departure_date = ?"
        );
        $fStmt->bind_param("iss", $planeId, $depCode, $date);
        $fStmt->execute();
        $fStmt->store_result();
        if ($fStmt->num_rows > 0) {
            $fStmt->bind_result($flightId);
            $fStmt->fetch();
            $fStmt->close();
            return $flightId;
        }
        $fStmt->close();
        $ftRounded = round($flightTime, 0);
        $distRound = round($distance, 2);
        $ins = $this->conn->prepare(
            "INSERT INTO flights (plane_id, departure_airport_code, arrival_airport_code, departure_date, flight_time, distance)
             VALUES (?, ?, ?, ?, ?, ?)"
        );
        $ins->bind_param("isssid", $planeId, $depCode, $arrCode, $date, $ftRounded, $distRound);
        if (!$ins->execute()) {
            $ins->close();
            $this->respond("error", "Could not create flight record.", 500);
        }
        $newId = $ins->insert_id;
        $ins->close();
        return $newId;
    }

    private function checkSeatAvailability($flightId, $requested, $capacity) {
        $sStmt = $this->conn->prepare(
            "SELECT COALESCE(SUM(passengers), 0) AS booked FROM bookings WHERE flight_id = ?"
        );
        $sStmt->bind_param("i", $flightId);
        $sStmt->execute();
        $sRes   = $sStmt->get_result();
        $row    = $sRes->fetch_assoc();
        $booked = intval($row["booked"]);
        $sStmt->close();
        $available = $capacity - $booked;
        if ($requested > $available) {
            $this->respond("error",
                "Not enough seats. Available: $available, Requested: $requested.", 409);
        }
    }

    public function getBookings($input) {
        $user   = $this->validateApiKey($input);
        $userId = is_array($user) ? $user["id"] : $user;
        $query  = "
            SELECT b.id AS booking_id, b.passengers, b.cabin_class,
                   f.id AS flight_id, f.departure_date, f.flight_time, f.distance,
                   f.departure_airport_code AS dep_code, f.arrival_airport_code AS arr_code,
                   p.manufacturer, p.model, p.max_speed_kmh,
                   dep_a.name AS dep_name, dep_a.city AS dep_city,
                   arr_a.name AS arr_name, arr_a.city AS arr_city
            FROM bookings b
            JOIN flights f    ON f.id       = b.flight_id
            JOIN planes p     ON p.id       = f.plane_id
            JOIN airports dep_a ON dep_a.code = f.departure_airport_code
            JOIN airports arr_a ON arr_a.code = f.arrival_airport_code
            WHERE b.user_id = ?
            ORDER BY f.departure_date ASC
        ";
        $stmt = $this->conn->prepare($query);
        $stmt->bind_param("i", $userId);
        $stmt->execute();
        $result   = $stmt->get_result();
        $bookings = [];
        while ($row = $result->fetch_assoc()) { $bookings[] = $row; }
        $stmt->close();
        $this->respond("success", $bookings, 200);
    }

    public function cancelBooking($input) {
        $user      = $this->validateApiKey($input);
        $userId    = is_array($user) ? $user["id"] : $user;
        if (!isset($input["booking_id"]) || intval($input["booking_id"]) < 1) {
            $this->respond("error", "booking_id is required.", 400);
        }
        $bookingId = intval($input["booking_id"]);
        $chk = $this->conn->prepare("SELECT id FROM bookings WHERE id = ? AND user_id = ?");
        $chk->bind_param("ii", $bookingId, $userId);
        $chk->execute();
        $chk->store_result();
        if ($chk->num_rows === 0) {
            $chk->close();
            $this->respond("error", "Booking not found or does not belong to you.", 404);
        }
        $chk->close();
        $del = $this->conn->prepare("DELETE FROM bookings WHERE id = ?");
        $del->bind_param("i", $bookingId);
        if ($del->execute()) {
            $del->close();
            $this->respond("success", "Booking cancelled.", 200);
        } else {
            $del->close();
            $this->respond("error", "Could not cancel booking.", 500);
        }
    }


    // ─── Main Router ─────────────────────────────────────────────────────────

    public function handleRequest() {
        if ($_SERVER["REQUEST_METHOD"] !== "POST") {
            $this->respond("error", "Only POST requests are accepted.", 405);
        }

        $rawInput = file_get_contents("php://input");
        $input    = json_decode($rawInput, true);

        if ($input === null || !isset($input["type"])) {
            $this->respond("error", "Post parameters are missing", 400);
        }

        switch ($input["type"]) {
            // ── HA endpoints ──
            case "GetAllFlights":        $this->getAllFlights($input);        break;
            case "GetFlight":            $this->getFlight($input);            break;
            case "DispatchFlight":       $this->dispatchFlight($input);       break;
            case "UpdateFlightPosition": $this->updateFlightPosition($input); break;
            case "GetAirports":          $this->getAirports($input);          break;
            case "BoardFlight":          $this->boardFlight($input);          break;
            // ── PA3 endpoints ──
            case "Register":             $this->register($input);             break;
            case "Login":                $this->login($input);                break;
            case "GetAllPlanes":         $this->getAllPlanes($input);         break;
            case "GetAllAirports":       $this->getAllAirports($input);       break;
            case "AddFavourite":         $this->addFavourite($input);         break;
            case "RemoveFavourite":      $this->removeFavourite($input);      break;
            case "GetFavourites":        $this->getFavourites($input);        break;
            case "BookFlight":           $this->bookFlight($input);           break;
            case "GetBookings":          $this->getBookings($input);          break;
            case "CancelBooking":        $this->cancelBooking($input);        break;
            default:
                $this->respond("error", "Unknown request type.", 400);
        }
    }
}


// ─── Bootstrap ────────────────────────────────────────────────────────────────

$db  = Database::getInstance($conn);
$api = new API($db->getConnection());
$api->handleRequest();
?>