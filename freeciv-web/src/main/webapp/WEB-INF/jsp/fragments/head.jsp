<%@ page import="static org.apache.commons.lang3.StringUtils.stripToNull" %>
<%@ page import="java.util.Properties" %>
<%@ page import="java.io.IOException" %>
<%
    String gaTrackingId = null;
    String trackJsToken = null;
    try {
        Properties prop = new Properties();
        prop.load(getServletContext().getResourceAsStream("/WEB-INF/config.properties"));
        gaTrackingId = stripToNull(prop.getProperty("ga-tracking-id"));
        trackJsToken = stripToNull(prop.getProperty("trackjs-token"));
    } catch (IOException e) {
        e.printStackTrace();
    }
%>
<title>${empty title ? "Freeciv-web - open source turn-based strategy game" : title}</title>
<meta charset="utf-8">
<meta http-equiv="X-UA-Compatible" content="IE=edge,chrome=1">
<meta name="author" content="The Freeciv project">
<meta name="description" content="Play Freeciv online! Freeciv is an empire-building strategy game starting at the dawn of time. Can you survive to dominate a modern world?">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta property="og:image" content="/static/images/frontpage-jumbotron.png" />

<script type="text/javascript" src="/javascript/libs/jquery.min.js"></script>
<script src="https://maxcdn.bootstrapcdn.com/bootstrap/3.3.7/js/bootstrap.min.js" integrity="sha384-Tc5IQib027qvyjSMfHjOMaLkfuWVxZxUPnCJA7l2mCWNIpG9mGCD8wGNIcPD7Txa" crossorigin="anonymous"></script>
<link href="/static/images/favicon.png" rel="shortcut icon">
<link href="/static/images/apple-touch-icon.png" rel="apple-touch-icon">
<link href="/static/css/bootstrap.min.css" rel="stylesheet">
<link href="/static/css/bootstrap-theme.min.css" rel="stylesheet">
<link href="https://maxcdn.bootstrapcdn.com/font-awesome/4.7.0/css/font-awesome.min.css" rel="stylesheet" integrity="sha384-wvfXpqpZZVQGK6TAh5PVlGOfQNHSoD2xbE+QkPxCAFlNEevoEH3Sl0sibVcOQVnN" crossorigin="anonymous">
<link href="https://fonts.googleapis.com/css?family=Fredericka+the+Great|Open+Sans:400,400i,700,700i" rel="stylesheet">

<link rel="manifest" href="/static/manifest.json">

<% if (gaTrackingId != null) { %>
<script>
	(function(i,s,o,g,r,a,m){i['GoogleAnalyticsObject']=r;i[r]=i[r]||function(){
	(i[r].q=i[r].q||[]).push(arguments)},i[r].l=1*new Date();a=s.createElement(o),
	m=s.getElementsByTagName(o)[0];a.async=1;a.src=g;m.parentNode.insertBefore(a,m)
	})(window,document,'script','https://www.google-analytics.com/analytics.js','ga');

	ga('create', '<%= gaTrackingId %>', 'auto');
	ga('send', 'pageview');
</script>
<% } %>
<% if (trackJsToken != null) { %>
<script type="text/javascript">window._trackJs = { token: '<%= trackJsToken %>' };</script>
<script type="text/javascript" src="https://cdn.trackjs.com/releases/current/tracker.js"></script>
<% } %>
<style>
	/*
		 _____                   _                        _
		|  ___| __ ___  ___  ___(_)_   __   __      _____| |__
		| |_ | '__/ _ \/ _ \/ __| \ \ / /___\ \ /\ / / _ \ '_ \
		|  _|| | |  __/  __/ (__| |\ V /_____\ V  V /  __/ |_) |
		|_|  |_|  \___|\___|\___|_| \_/       \_/\_/ \___|_.__/

		The following styles apply to the whole frontend HTML.

	 */
	body {
		padding-top: 60px;
		padding-bottom: 20px;
		color: #ccc;
  	background-image: url('/images/bg-dark.jpg');
	}
	a {
    text-shadow: 1px 1px #000 !important;
		color: #b1efef;
	}
	a:hover {
    text-shadow: 1px 1px #005 !important;
    color: #dcb;
    text-decoration: underline;
	}
	h1, h2, h3, h4, h5, h6 {
		color: #85afaf;
		font-family: 'Helvetica', 'Freeciv', 'Segoe UI';
		font-weight: 500;
		text-shadow: 1px 1px #222;
	}
	h1, h2, h3 {
		font-family: 'Helvetica', 'Freeciv', 'Segoe UI';
		font-weight: 700;
		border-bottom: 1px solid #827d70;
	}
	.table>thead>tr>th {
    vertical-align: bottom;
    border-bottom: 2px solid #777;
	}
	.table>thead>tr>th, .table>tbody>tr>th, .table>tfoot>tr>th, .table>thead>tr>td, .table>tbody>tr>td, .table>tfoot>tr>td {
    border-top: 1px solid #7d7d7d;
	}
	.input-group .form-control:first-child {
    border-bottom-right-radius: 0;
    border-top-right-radius: 0;
    background: #000;
    color: #ccc;
    border-color: #444;
		border-radius: 6px 0px 0px 6px;
	}
	.input-group-btn:last-child>.btn, .input-group-btn:last-child>.btn-group {
    background-color: #888;
    background: #444;
    color: #000;
    border-color: #444;
    text-shadow: 1px 1px #888;
	}
	/*
	 * Delimits an area where to put content.
	 */
	.panel-freeciv {
		background-color: rgba(243, 236, 209, 0.5);
		border-bottom: 1px solid #827d70;
		border-radius: 3px;
		margin-top: 1%;
		padding: 1%;
	}
	.panel-freeciv h1, .panel-freeciv h2, .panel-freeciv h3,
	.panel-freeciv h4, .panel-freeciv h5, .panel-freeciv h6 {
		margin-top: 0px;
	}
	/*
	 * Jumbotron background is made transparent and its contents
	 * are centered.
	 */
	.jumbotron {
		background: rgba(0,0,0,0.1);
		text-align: center;
	}
	.jumbotron img {
		display: block;
		margin: auto;
	}
	/*
	 * Sometimes we need some additional space between rows.
	 */
	.top-buffer-3 { margin-top: 3%; }
	.top-buffer-2 { margin-top: 2%; }
	.top-buffer-1 { margin-top: 1%; }
	/*
	 * The bootstrap theme we use adds some transparency, this ensure it is removed.
	 */
	.navbar-inverse {
		background-color: #2220;
		background: url(/images/bg-med-dark.jpg);
	}
	/*
	 * Ensure that the logo fits within the navbar.
	 */
	.navbar-brand {
		float: left;
		height: 50px;
		padding: 4px 15px;
		font-size: 18px;
		line-height: 20px;
	}
	.ongoing-games-number {
		margin-left: 5px;
		background:#be602d;
	}
	.nav {
		font-size: 16px;
	}
	.dropdown-menu {
  	background-image: url('/images/bg-med-dark.jpg');
		border-radius: 5px;
		border: 2x solid #000e;
	}
	.dropdown-menu .divider {
			height: 1px;
			margin: 5px 0;
			border: 1px solid #000;
			background-color: #000;
	}
	.dropdown-menu>li>a {
			display: block;
			padding: 3px 20px;
			clear: both;
			font-weight: normal;
			line-height: 1.42857143;
			color: #ccc;
			white-space: nowrap;
	}
</style>
