<?php

file_put_contents("/var/log/php/post.log", print_r($_POST, true), FILE_APPEND);

?>

