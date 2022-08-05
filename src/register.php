<?php

$firstName = $_POST['firstName'];
$lastName = $_POST['lastName'];
$email = $_POST['email'];
$phone = $_POST['phone'];
$country = $_POST['country'];
$dob = $_POST['dob'];
$subscribe = $_POST['subscribe'];

$db_host = 'mysql';
$db_username = 'root';
$db_password = '';
$db_name = 'hackathon';
$db = mysqli_connect($db_host, $db_username, $db_password) or die(mysql_error());
mysqli_select_db($db, $db_name);

mysqli_query($db, "INSERT INTO `users` (firstName, lastName, email, phone, country, dob, subscribe)
VALUES ('$firstName', '$lastName', '$email','$phone', '$country', '$dob', '$subscribe')") or die(mysql_error());

?>
