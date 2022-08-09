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
<title>${empty title ? "Tactics & Triumph - Freeciv Games & Mods" : title}</title>
<meta charset="utf-8">
<meta http-equiv="X-UA-Compatible" content="IE=edge,chrome=1">
<meta name="author" content="Tactics & Triumph">
<meta name="description"
      content="Play Freeciv TnT! Freeciv is an empire-building strategy game starting at the dawn of time. Can you survive to dominate a modern world?">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta property="og:image" content="/static/images/frontpage-jumbotron-alt.png"/>

<script type="text/javascript" src="/javascript/libs/jquery.min.js"></script>
<script src="https://maxcdn.bootstrapcdn.com/bootstrap/3.3.7/js/bootstrap.min.js"
        integrity="sha384-Tc5IQib027qvyjSMfHjOMaLkfuWVxZxUPnCJA7l2mCWNIpG9mGCD8wGNIcPD7Txa"
        crossorigin="anonymous"></script>
<link href="/static/images/favicon.png" rel="shortcut icon">
<link href="/static/images/apple-touch-icon.png" rel="apple-touch-icon">
<link href="/static/css/bootstrap.min.css" rel="stylesheet">
<link href="/static/css/bootstrap-theme.min.css" rel="stylesheet">
<link href="https://maxcdn.bootstrapcdn.com/font-awesome/4.7.0/css/font-awesome.min.css" rel="stylesheet"
      integrity="sha384-wvfXpqpZZVQGK6TAh5PVlGOfQNHSoD2xbE+QkPxCAFlNEevoEH3Sl0sibVcOQVnN" crossorigin="anonymous">
<link href="https://fonts.googleapis.com/css?family=Fredericka+the+Great|Open+Sans:400,400i,700,700i" rel="stylesheet">

<link rel="manifest" href="/static/manifest.json">

<% if (trackJsToken != null) { %>
<script type="text/javascript">window._trackJs = {token: '<%= trackJsToken %>'};</script>
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
  @font-face {
    font-family: Cinzel;
    src: url("/fonts/cinzel.variable.woff2") format("woff2"), url("/fonts/cinzel.variable.ttf") format("ttf");
  }

  body {
    padding-top: 60px;
    padding-bottom: 20px;
    color: #a8a8a8;
    background-image: url('/images/bg-alt-dark.jpg');
  }

  h1, h2, h3, h4, h5, h6 {
    color: #a8a8a8;
    font-family: Cinzel, 'Segoe UI', serif;
    text-shadow: 1px 1px #222;
  }

  h1, h2, h3 {
    border-bottom: 2px solid #a8a8a8;
  }

  .table > thead > tr > th {
    vertical-align: bottom;
    border-bottom: 2px solid #060d15;
  }

  .table > thead > tr > th, .table > tbody > tr > th, .table > tfoot > tr > th, .table > thead > tr > td, .table > tbody > tr > td, .table > tfoot > tr > td {
    border-top: 1px solid #060d15;
  }

  .input-group .form-control:first-child {
    background: rgb(28, 14, 55);
    color: #bbb5e1;
    border-color: #5932ae;
    border-radius: 6px 0px 0px 6px;
  }

  .input-group-btn:last-child > .btn, .input-group-btn:last-child > .btn-group {
    background: rgb(88, 45, 174);
    color: #000;
    border-color: rgb(94, 43, 196);
    text-shadow: 1px 1px rgb(118, 66, 123);
  }

  /*
   * Delimits an area where to put content.
   */
  .panel-freeciv {
    background-color: rgba(243, 236, 209, 0.5);
    border-bottom: 1px solid #2f251b;
    border-radius: 3px;
    margin-top: 1%;
    padding: 1%;
  }

  .panel-freeciv h1, .panel-freeciv h2, .panel-freeciv h3,
  .panel-freeciv h4, .panel-freeciv h5, .panel-freeciv h6 {
    margin-top: 0;
  }

  /*
   * Jumbotron background is made transparent and its contents
   * are centered.
   */
  .jumbotron {
    background: rgba(0, 0, 0, 0.1);
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
    background: rgba(5, 55, 75, 0.24) url(/images/bg-med-dark.jpg);
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
    background: #55636e;
  }

  .nav {
    font-size: 16px;
  }

  .dropdown-menu {
    background-image: url('/images/bg-med-dark.jpg');
    border-radius: 5px;
    border: 2px solid #000e;
  }

  .dropdown-menu .divider {
    height: 1px;
    margin: 5px 0;
    border: 1px solid #000;
    background-color: #000;
  }

  .dropdown-menu > li > a {
    display: block;
    padding: 3px 20px;
    clear: both;
    font-weight: normal;
    line-height: 1.42857143;
    color: #ccc;
    white-space: nowrap;
  }
</style>
