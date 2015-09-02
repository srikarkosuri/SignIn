<?php

class GoogleAuth
{
	protected $client;
	public function _construct(Google_Client $googleClient = null)
	{
		$this->client = $googleClient;
		if($this->client)
		{
			$this->client->setClientId('895723208328-5e4irkrhg4n3gvc9g2mpa1om7f0c2ub1.apps.googleusercontent.com');
			$this->client->setClientSecret('oR_4p7KqpXd6jgzPguChbugg');
			$this->client->setRedirectUri('http://office.lifefuels.co/index.html');
			$this->client->setScopes('email');
		}
	}
	public function isLoggedIn()
	{
		return isset($_SESSION['access_token']);
	}
	public function getAuthUrl()
	{
		return $this->client->createAuthUrl();
	}
	public function checkRedirectCode()
	{
		if(isset($_GET['code']))
		{
			$this->client->authenticate($_GET['code']);

			$this->setToken($this->client->getAccessToken());

			return true; 
		}
	}
	public function setToken($token)
	{
		$_SESSION['access_token'] = $token;

		$this->client->setAccessToken($token);
	}
	

}