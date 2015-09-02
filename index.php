<?php

require_once 'app/init.php';

$googleClient = new Google_Client();
$auth = new GoogleAuth($googleClient);
if($auth->checkRedirectCode())
{
	header ('Location: index.php');
}
?>

<!doctype html>
<html>
	<head>
		<meta charset = "utf-8">
		<title>Sign In </title>
	</head>
	<body>
		<?php if(!$auth->isLoggedIn()): ?>
			<a href="<?php echo $auth->getAuthUrl(); ?>">Sign in with Google</a>
		<?php else: ?>
			You are signed in. <a href="logout.php">Sign Out</a>
		<?php endif; ?>
	</body>
</html>