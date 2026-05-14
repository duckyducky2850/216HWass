<?php
// [Stephen] [Molife] [u25368037]
// config.php – COS216 Homework Assignment Sanitized versiom

$host     = "wheatley.cs.up.ac.za";
$user     = "YOUR_STUDENT_NUMBER";
$password = "YOUR_PASSWORD_HERE";
$database = "YOUR_DATABASE_NAME";

$conn = new mysqli($host, $user, $password, $database);

if ($conn->connect_error) {
    die("Database connection failed: " . $conn->connect_error);
}
?>