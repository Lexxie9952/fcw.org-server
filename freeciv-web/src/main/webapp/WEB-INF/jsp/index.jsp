<%@ taglib prefix="c" uri="http://java.sun.com/jsp/jstl/core" %>
<%@ taglib prefix="fn" uri="http://java.sun.com/jsp/jstl/functions" %>
<%@ include file="/WEB-INF/jsp/fragments/i18n.jsp" %>
<%@page import="java.util.*" %>
<!DOCTYPE html>
<html lang="en">
<head>
	<%@include file="/WEB-INF/jsp/fragments/head.jsp"%>
	<script src="/javascript/libs/Detector.js"></script>
	<script src="/static/javascript/index.min.js"></script>
	<style>
	/* Make sure that the development tools used in freeciv are not to big */
	img.small {
		max-height: 40px;
	}
	/* 2D/3D teasers must remain within their container. */
	img.teaser {
		display: block;
		margin: auto;
		width: 100%;
	}
	.statistics { text-align: center; }
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
	/* Game launcher */
	#game-launcher {
		width: 100%;
		margin: 0 auto;
		font-family: Helvetica, Arial, 'Open Sans';
		font-weight: 400;
	}
	#game-launcher .game-type {
		width: 100%;
		background: rgb(35,39,71) url('/images/bg-med-dark.jpg');
		background-size: 480px;
		background-repeat: repeat;
		display: inline-table;
		top: 0;
    	border-radius: 20px 20px 20px 20px;
	}
	#game-launcher .game-type:not(:last-child) {
		margin-right: 40px;
		border: solid 2px #BBA;
    	border-radius: 20px 20px 20px 20px;
		border-bottom: 1 !important;
		color :#c0bbb5;
	}
	#game-launcher .header {
		color: #000000;
		font-family: 'Helvetica', 'Arial', 'Freeciv', 'Open Sans';
		font-weight: 500;
		padding: 15px;
		margin-bottom: 0px;
		background-image: url('/images/bg-med-light.jpg');
		background: rgb(156,156,144)
		background-size: 480px;
		border: 1px solid #bbb;
		border-radius: 19px 19px 4px 4px;
		border-bottom: 0;
	}
	#game-launcher .name {
		width: 100%;
		font-size: 2em;
		display: block;
		text-align: center;
		padding: 2px 0 2px;
	}
	#game-launcher .features {
		list-style: none;
		text-align: center;
		margin: 0;
		padding: 10px 0 0 0;
		font-size: 0.9em;
	}
	#game-launcher .btn {
		display: inline-block;
		border: 0;
		padding: 10px;
		width: 230px;
		display: block;
		font-weight: 700;
		font-size: 20px;
		text-transform: uppercase;
		margin: 20px auto 10px;

		text-shadow: 1px 1px #091a38 !important;
		color: #39f5;
		border-radius: 13px;
		background-image:  url('/images/bg-med-light.jpg');
		background-size: 480px;
		background: #c3ffff71;
		box-shadow: 7px 7px 14px #1f2626, -7px -7px 14px #9bb5;
		font-family: 'Helvetica';
		letter-spacing: 0.3px;
		}
		/* overrides the above */
		#game-launcher .btn {
		color: rgb(154 183 207);
			text-shadow: 1px 1px #091a38 !important;
		color: rgb(54 80 100)
		}
		#game-launcher .btn:hover {
			border-radius: 13px;
		background: #788888;
		box-shadow: inset 7px 7px 9px #464646, inset -7px -7px 9px #9ababa;
		margin: 21px auto 9px;
		}
		#game-launcher a.small { width: 130px;	}
		.multiplayer-games th:last-child { width: 80px; }
		.multiplayer-games a.label:first-child { margin-right: 3px; }
		.multiplayer-games .highlight {
			color: #9c9;
			font-weight: bold;
		}
		.multiplayer-games .running {
			color: #ccc;
		}
		.table>tbody>tr>td {
			padding: 2px;
		}
		.videoWrapper {
		position: relative;
		padding-bottom: 56.25%; /* 16:9 */
		padding-top: 25px;
		height: 0;
		}

		.videoWrapper iframe {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		}
		.jumbotron {
		padding-bottom: 0px;
		background: #0000 !important;
		text-shadow: 1px 1px #777;
		}
		.dropdown-menu {
			background: rgb(35,39,71) url('/images/bg-med-dark.jpg');
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
		.navbar-inverse {
			background-color: #2220;
			background: rgb(35,39,71) url('/images/bg-med-dark-text.jpg');
			background-size: 480px;
			background-repeat: repeat;
		}
		body {
			color: #ccc;
			background: rgb(19,32,64);
			background-image:  url('/images/bg-dark.jpg');
			background-size: 480px;
			background-repeat: repeat;
		}
		.container {
			background: none !important;
			color: #ccc;
		}
		.lead {
			color: #ccc;
		}
		.panel-freeciv {
			background-color: #ccc1;
		}
		h1,h2,h3,h4,h5,h6 {
			font-family: 'Helvetica', 'Freeciv', 'Segoe UI';
			font-weight: 500;
			text-shadow: 1px 1px #222;
		}
		.well {
			background: #fff1;
		}
		a {
		text-shadow: 1px 1px #000 !important;
			color: #b1efef;
		}
		.name {
			text-shadow: 1px 2px #777 !important;
		}
		.table thead tr th,
		.table tbody tr th,
		.table tfoot tr th, .table thead tr td,
		.table tbody tr td,
		.table tfoot tr td {
			padding:3px;
		}
		.play_button {
			background-color: #55968e;
		}
		.info_button {
			background-color: #b56f4a;
		}


	/* 〰〰〰〰〰〰〰〰〰〰〰〰〰HELVETICAS〰〰〰〰〰〰〰〰〰〰〰〰〰*/
	/* Helvetica Ultra-Light 〰〰〰〰〰〰〰〰〰〰〰〰〰〰〰〰〰〰〰*/
	@font-face {
	font-family: "Helvetica";
	src: url("/fonts/helveticaneue/helveticaneue.ul.ttf");
	font-weight: 100;
	}
	@font-face {
	font-family: "Helvetica";
	src: url("/fonts/helveticaneue/helveticaneue.i.ul.ttf");
	font-weight: 100;
	font-style: italic;
	}
	/* Helvetica Thin 〰〰〰〰〰〰〰〰〰〰〰〰〰〰〰〰〰〰〰〰〰〰〰*/
	@font-face {
	font-family: "Helvetica";
	src: url("/fonts/helveticaneue/helveticaneue.th.ttf");
	font-weight: 200;
	}
	@font-face {
	font-family: "Helvetica";
	src: url("/fonts/helveticaneue/helveticaneue.i.th.ttf");
	font-weight: 200;
	font-style: italic;
	}
	/* Helvetica Light 〰〰〰〰〰〰〰〰〰〰〰〰〰〰〰〰〰〰〰〰〰〰〰*/
	@font-face {
	font-family: "Helvetica";
	src: url("/fonts/helvetica/helvetica.l.ttf");
	font-weight: 300;
	}
	@font-face {
	font-family: "Helvetica";
	src: url("/fonts/helvetica/helvetica.i.l.ttf");
	font-weight: 300;
	font-style: italic;
	}
	/* Helvetica Regular 〰〰〰〰〰〰〰〰〰〰〰〰〰〰〰〰〰〰〰〰〰*/
	@font-face {
	font-family: "Helvetica";
	src: url("/fonts/helvetica/helvetica.ttf");
	font-weight: 400;
	}
	@font-face {
	font-family: "Helvetica";
	src: url("/fonts/helvetica/helvetica.i.ttf");
	font-weight: 400;
	font-style: italic;
	}
	/* Helvetica Medium 〰〰〰〰〰〰〰〰〰〰〰〰〰〰〰〰〰〰〰〰〰〰*/
	@font-face {
	font-family: "Helvetica";
	src: url("/fonts/helveticaneue/helveticaneue.med.ttf");
	font-weight: 500;
	}
	@font-face {
	font-family: "Helvetica";
	src: url("/fonts/helveticaneue/helveticaneue.i.med.ttf");
	font-weight: 500;
	font-style: italic;
	}
	/* Helvetica Bold (semi-Bold) 〰〰〰〰〰〰〰〰〰〰〰〰〰〰〰*/
	@font-face {
	font-family: "Helvetica";
	src: url("/fonts/helvetica/helvetica.b.ttf");
	font-weight: 600;
	}
	@font-face {
	font-family: "Helvetica";
	src: url("/fonts/helvetica/helvetica.i.b.ttf");
	font-weight: 600;
	font-style: italic;
	}
	/* Helvetica Bolder (Neue Bold) 〰〰〰〰〰〰〰〰〰〰〰〰〰〰〰〰*/
	@font-face {
	font-family: "Helvetica";
	src: url("/fonts/helveticaneue/helveticaneue.b.ttf");
	font-weight: 700;
	}
	@font-face {
	font-family: "Helvetica";
	src: url("/fonts/helveticaneue/helveticaneue.b.ttf");
	font-weight: 700;
	font-style: italic;
	}
	/* Helvetica Black 〰〰〰〰〰〰〰〰〰〰〰〰〰〰〰〰〰〰〰〰〰〰〰〰*/
	@font-face {
	font-family: "Helvetica";
	src: url("/fonts/helvetica/helvetica.bl.ttf");
	font-weight: 900;
	}
	@font-face {
	font-family: "HelveticaBlack";
	src: url("/fonts/helvetica/helvetica.bl.ttf");
	}
	/* 〰〰〰〰〰〰〰〰〰〰〰〰〰〰〰〰〰〰〰〰〰〰〰〰〰〰〰〰〰〰〰〰〰〰〰*/
	/* Consolas Regular & Bold 〰〰〰〰〰〰〰〰〰〰〰〰〰〰〰〰〰〰〰〰*/
	@font-face {
	font-family: Consolas;
	src: url('/fonts/consola.ttf');
	}
	@font-face {
	font-family: Consolas;
	src: url('/fonts/consolab.ttf');
	font-weight: bold;
	}
	@font-face {       /* allow picking bold without a <b> */
	font-family: ConsolasBold;
	src: url('/fonts/consolab.ttf');
	}

	/* Elan ITC */
	@font-face {
	font-family: Freeciv;
	src: url('/fonts/freeciv.ttf');
	}
	@font-face {
	font-family: FreecivSB;
	src: url('/fonts/freeciv.m.ttf');
	}
	@font-face {
	font-family: FreecivBold;
	src: url('/fonts/freeciv.b.ttf');
	}
	@font-face {
	font-family: FreecivBlack;
	src: url('/fonts/freeciv.bl.ttf');
	}

	/* Misc */
	@font-face {
	font-family: Arial;
	src: url('/fonts/arial.ttf');
	}
	@font-face {
	font-family: SegoeSB; /* semi-bold */
	src: url('/fonts/seg.sb.ttf');
	}
	@font-face {
	font-family: SegoeBold;
	src: url('/fonts/seg.b.ttf');
	}
	@font-face {
	font-family: SegoeBlack;
	src: url('/fonts/seg.bl.ttf');
	}
	@font-face {
	font-family: Segoe;
	src: url('/fonts/seg.ttf');
	}

</style>
</head>

<body>
	<div class="container">
		<%@include file="/WEB-INF/jsp/fragments/header.jsp"%>

		<div class="jumbotron">
			<div class="row">

<%!
Random randomValue=new Random();
%>
				<img style="border-radius: 20px 20px 20px 20px; box-shadow: 2px 2px #000a; width:65%"
				    src="/static/images/fcw-front-page<%=(Math.abs(randomValue.nextInt())%64)+1 %>.png">

			</div>
			<div class="container-fluid">
				<div class="row top-buffer-3">
					<p class="lead">
						<fmt:message key="index-lead"/>
					</p>
				</div>
			</div>
		</div> <!-- end jumbotron -->

		<div id="game-launcher" class="row">

				<div class="col-md-6">
					<div class="game-type">
						<div class="header">
							<span class="name"><i class="fa fa-user"></i> <fmt:message key="index-game-launcher-singleplayer" /></span>
						</div>

						<c:if test="${default_lang}">
							<div class="features">
								Play against the Freeciv AI with isometric graphics
							</div>
						</c:if>
						<a id="single-button" href="/webclient/?action=new&type=singleplayer" class="btn"><i class="fa fa-flag"></i> <fmt:message key="index-game-launcher-2d"/></a>
                        <br><br>
<!--
                        <c:if test="${default_lang}">
                            <div class="features">
                                3D pre-release (development testing only)
                            </div>
                        </c:if>
                        <a id="single-button" href="/webclient/?action=new&renderer=webgl&type=singleplayer" class="btn" id="webgl_button"><i class="fa fa-cube"></i><fmt:message key="index-game-launcher-3d"/></a>
                        <br><br>
                        <br>
-->
						<%--<a href="/webclient/?action=load&amp;scenario=true&type=singleplayer" class="btn"><i class="fa fa-map-o"></i> <fmt:message key="index-game-launcher-scenario"/></a>
						<c:if test="${default_lang}">
							<div class="features">
								Choose your map from a real earth map.
							</div>
						</c:if>
						<a href="/freeciv-earth/" class="btn"><i class="fa fa-globe"></i> <fmt:message key="index-game-launcher-real-earth"/></a>--%>
					</div>
				</div>
				<div class="col-md-6">
					<div class="game-type">
						<div class="header">
							<span class="name"><i class="fa fa-users"></i> <fmt:message key="index-game-launcher-multiplayer"/></span>
						</div>
						<c:if test="${default_lang}">
							<div class="features">
								Play a <b>Freeciv-web One Turn per Day</b>, where up to 300 human <br>players play one turn every day:
							</div>
						</c:if>
						<a href="/game/list?v=longturn" class="btn"><i class="fa fa-users"></i> <fmt:message key="index-game-launcher-longturn"/></a>
						<c:if test="${default_lang}">
							<div class="features">
								Start or join a game with multiple human or AI players.
							</div>
						</c:if>
						<a href="/game/list?v=multiplayer" class="btn"><i class="fa fa-users"></i> <fmt:message key="index-game-launcher-multiplayer"/></a>
						<c:if test="${default_lang}">
							<div class="features">
								Start a play-by-email game where you get an e-mail <br> when it is your turn to play.
							</div>
						</c:if>
						<a href="/webclient/?action=pbem&type=pbem" class="btn"><i class="fa fa-envelope"></i> <fmt:message key="index-game-launcher-play-by-email"/></a>
						<c:if test="${default_lang}">
							<div class="features">
								Play multiple human players <br> on the same computer
							</div>
						</c:if>
						<a href="/webclient/?action=hotseat&type=singleplayer" class="btn"><i class="fa fa-user-plus"></i> <fmt:message key="index-game-launcher-hotseat" /></a>

					</div>
				</div>
		</div> <!-- end game launcher -->


		<br>

		<div id="game-launcher" class="row">

			<div class="" style="width:80%; max-width:80%; text-align:center; margin:0 auto;">
				<div class="game-type">
					<div class="header">
						<span class="name"><i class="fa fa-envelope"></i> Notify Me</span>
					</div>

						<div class="">
							Sign up to be alerted about new Longturn games directly in your inbox.
						</div>


<!--Zoho Campaigns Web-Optin Form Starts Here-->
<div id="customForm">
	<div class="quick_form_9_css" name="SIGNUP_BODY">
		<div>
			<div style="position:relative;">
				<div id="Zc_SignupSuccess" style="display:none;position:absolute;margin-left:4%;width:90%;background-color: rgb(240, 232, 232); padding: 3px; border: 3px solid rgb(0, 0, 0);  margin-top: 10px;margin-bottom:10px;word-break:break-all ">
					<table width="100%" cellpadding="0" cellspacing="0" border="0">
						<tbody>
							<tr>
								<td width="10%">
									<img class="successicon" src="https://zc1.maillist-manage.eu/images/challangeiconenable.jpg" align="absmiddle">
								</td>
								<td>
									<span id="signupSuccessMsg" style="color: rgb(73, 140, 132); font-family: Helvetica; font-size: 14px;word-break:break-word">&nbsp;&nbsp;Thank you for Signing Up</span>
								</td>
							</tr>
						</tbody>
					</table>
				</div>
			</div>
			<form method="POST" id="zcampaignOptinForm" action="https://maillist-manage.eu/weboptin.zc" target="_zcSignup">
				<div id="errorMsgDiv"></div>
				<div class="SIGNUP_FLD" style="margin: 0 auto;width:80%; text-align:center">
					<input type="text" style="display: block; margin : 0 auto;" placeholder="Email" changeitem="SIGNUP_FORM_FIELD" name="CONTACT_EMAIL" id="EMBED_FORM_EMAIL_LABEL">
				</div>
				<div style="margin: 0 auto;width:80%; text-align:center">
					<input type="submit" class="btn" id="zcWebOptin" value="Sign up now">
				</div>
				<input type="hidden" id="fieldBorder" value="">
				<input type="hidden" id="submitType" name="submitType" value="optinCustomView">
				<input type="hidden" id="emailReportId" name="emailReportId" value="">
				<input type="hidden" id="formType" name="formType" value="QuickForm">
				<input type="hidden" name="zx" id="cmpZuid" value="14acd2fa94">
				<input type="hidden" name="zcvers" value="2.0">
				<input type="hidden" name="oldListIds" id="allCheckedListIds" value="">
				<input type="hidden" id="mode" name="mode" value="OptinCreateView">
				<input type="hidden" id="zcld" name="zcld" value="114297f01ae57ab0">
				<input type="hidden" id="zctd" name="zctd" value="114297f01ae57abe">
				<input type="hidden" id="document_domain" value="">
				<input type="hidden" id="zc_Url" value="zc1.maillist-manage.eu">
				<input type="hidden" id="new_optin_response_in" value="0">
				<input type="hidden" id="duplicate_optin_response_in" value="0">
				<input type="hidden" name="zc_trackCode" id="zc_trackCode" value="ZCFORMVIEW">
				<input type="hidden" id="zc_formIx" name="zc_formIx" value="3zcb79ad521f1f401176f39555bc0f0484184f206d9625d75b4acd5979f63828b7">
				<input type="hidden" id="viewFrom" value="URL_ACTION">
				<input type="hidden" id="scriptless" name="scriptless" value="yes">
			</form>
		</div>
	</div>
</div>
<div id="zcOptinOverLay" oncontextmenu="return false" style="display:none;text-align: center; background-color: rgb(0, 0, 0); opacity: 0.5; z-index: 100; position: fixed; width: 100%; top: 0px; left: 0px; height: 988px;"></div>
<div id="zcOptinSuccessPopup" style="display:none;z-index: 9999;width: 800px; height: 40%;top: 84px;position: fixed; left: 26%;background-color: #FFFFFF;border-color: #E6E6E6; border-style: solid; border-width: 1px;  box-shadow: 0 1px 10px #424242;padding: 35px;">
	<span style="position: absolute;top: -16px;right:-14px;z-index:99999;cursor: pointer;" id="closeSuccess">
		<img src="https://zc1.maillist-manage.eu/images/videoclose.png">
	</span>
	<div id="zcOptinSuccessPanel"></div>
</div>
<!--Zoho Campaigns Web-Optin Form Ends Here-->


				</div>
			</div>
	</div>
<br>


		<c:if test="${default_lang}">
			<div id="statistics" class="row">
				<div class="col-md-12">
					<div class="panel-freeciv statistics">
						<h4 style="color:#63acd6"><span id="statistics-singleplayer"><b>0</b></span> <fmt:message key="index-stats-singleplayer"/> <span id="statistics-multiplayer"><b>0</b></span> <fmt:message key="index-stats-multiplayer"/><br>
						<fmt:message key="index-stats-since"/></h4>

					</div>
				</div>
			</div> <!-- end statistics -->
		</c:if>



		<div class="row">
			<div class="col-md-6" style="padding-left:0px; padding-right:0px">
				<div class="panel-freeciv" style="padding:0px">
					<h3>LongTurn Games (one turn per day):</h3>
					<c:if test="${not empty games and fn:length(games) > 0}">
						<table class="table multiplayer-games" style="margin-bottom:0px">
							<thead>
								<tr>
									<th class="hidden-xs" style="padding-left:0px"></th>
									<th style="font-size:80%; width:100%">Game</th>
									<!-- <th class="hidden-xs">State</th> --> <!-- exclude to make more room for tight fit-->
									<th style="font-size:80%; text-align:center">Turn<br>Players</th>
									<th style="font-size:80%">Link</th>
								</tr>
							</thead>
							<tbody>
								<c:forEach items="${games}" var="game">

										<c:choose>
											<c:when test="${!fn:contains(game.message, 'New Freeciv-web Multiplayer')}">

												<tr class="${game.players > 0 && state == 'Pregame' ? 'highlight' : 'running'}">
													<td class="hidden-xs" style="padding-left:0px;">
														<svg width="32" height="32" data-jdenticon-value="${game.message}>"></svg>
													</td>

													<td style="font-size:80%">
															<b>
															${game.message}
														</b>
													</td>

													<!--
													<td class="hidden-xs">
														${game.state}
													</td> --> <!-- excluded to make more room for tight fit-->
													<td style="text-align:center; font-size:80%">
														T${game.turn}<br>${game.players}
													</td>

													<td style="font-size:80%">
														<c:choose>
															<c:when test="${game.state == 'Running' or game.state == 'Pregame'}">
																<a  class="label play_button" href="/webclient/?action=multi&civserverport=${game.port}&amp;civserverhost=${game.host}&amp;multi=true&amp;type=${game.type}">Play</a><br>
															</c:when>
															<c:otherwise>
																<br>
																<!-- Observe is not a case that's ever legal for LongTurn games; as for Multiplayer it will always be 'Running' or 'Pregame'
																<a class="label label-success" href="/webclient/?action=observe&amp;civserverport=${game.port}&amp;civserverhost=${game.host}&amp;multi=true&amp;type=${game.type}">Observe</a><br>
																-->
															</c:otherwise>
														</c:choose>
														<a class="label info_button" href="/game/details?host=${game.host}&amp;port=${game.port}">Info</a>
													</td>
												</tr>

											</c:when>
										</c:choose>

								</c:forEach>
							</tbody>
						</table>
					</c:if>
					<c:if test="${empty games or fn:length(games) == 0}">
						No servers currently listed.
					</c:if>
				</div>
			</div>

			<div class="col-md-6 container" id="best-of-play-by-email">
				<div class="panel-freeciv">
				    <a href="/hall_of_fame"><h2>Hall Of Fame</h2></a>
				    See the <a href="/hall_of_fame">Hall Of Fame</a>, where the best scores of single-player games are listed!<br>
				    <br>
					<h3><fmt:message key="index-best-of-play-by-email"/></h3>
					<table class="table">
						<thead>
							<tr>
								<th>Rank</th>
								<th>Player</th>
								<th>Wins</th>
							</tr>
						</thead>
						<tbody id="play-by-email-list">
							<!--
								loaded dynamically
							-->
						</tbody>
					</table>
				</div>
			</div>
		</div> <!-- end multiplayer/best play by email -->


		<div class="row">
			<div class="col-md-12">
					<h3>Find Players and Games to join on Freeciv-Web's live Discord Chat:</h3>
			</div>
		</div>

		<div  class="row" style="padding-top: 30px;">
			<div class="col-md-2">
			</div>
			<div class="col-md-8">
				<iframe src="https://discordapp.com/widget?id=417324237926301698&theme=dark" width="300" height="400" allowtransparency="true" frameborder="0"></iframe>
			</div>
			<div class="col-md-2">
			</div>
		</div> <!-- end Discord chat -->

                <%-- <div class="row">
                        <div class="col-md-12">
                                <h2><fmt:message key="index-youtube"/></h2>
                        </div>
                </div>
                <div class="row">
                        <div class="col-md-6">
                                <div class="videoWrapper">
                                        <iframe class="embed-responsive-item" width="542" height="343" src="https://www.youtube.com/embed/eNuercg7Jko" frameborder="0" allowfullscreen></iframe>
                                </div>
                        </div>
                       <div class="col-md-6">
                                <div class="videoWrapper">
                                        <iframe class="embed-responsive-item" width="542" height="343" src="https://www.youtube.com/embed/jZsq9SADdQk" frameborder="0" allowfullscreen></iframe>
                                </div>
                        </div>


				</div> <!-- end youtube -->  --%>


		<div class="row">
			<div class="col-md-12">
				<h2><fmt:message key="index-press"/></h2>
				<div class="well">
					<h4><b><i><fmt:message key="index-press-pc-gamer-title"/></i></b></h4>
					<i><fmt:message key="index-press-pc-gamer-content"/></i>
					<br>
					<a href="http://www.pcgamer.com/freeciv-available-in-html5-browsers-worldwide-productivity-plummets/" target="new"><img style="display: block; float: right;" src="images/static/pcgamer.gif" alt="PC Gamer"></a>
					<br>
				</div>
			</div>
		</div> <!-- end press -->

		<c:if test="${default_lang}">
			<div class="row">
				<div class="col-md-12">
					<h2><fmt:message key="index-developers"/></h2>
				</div>
			</div>
			<div class="row">
				<div class="col-md-4">
					<div class="panel-freeciv">
						<h4><fmt:message key="index-contributing"/></h4>
						Freeciv is open source software released under the GNU General Public License.
						<a href="https://github.com/Lexxie9952/fcw.org-server"><fmt:message key="index-developers"/></a> and Artists are welcome to join development.
					</div>
				</div>
				<div class="col-md-4">
					<div class="panel-freeciv">
						<h4><fmt:message key="index-stack"/></h4>
						<table>
							<tr><td><img class="small" src="/static/images/cpp-stack.png">C and C++&emsp;</td>
								  <td><img class="small" src="/static/images/java-stack.png">&nbsp;Java&emsp;</td>
									<td><img class="small" src="/static/images/lua-stack.png">&nbsp;Lua&emsp;</td></tr>
							<tr><td><img class="small" src="/static/images/js-stack.png">&nbsp;JavaScript&emsp;</td>
							    <td><img class="small" src="/static/images/html5-stack.png">&nbsp;HTML5&emsp;</td>
									<td><img class="small" src="/static/images/python-stack.png">&nbsp;Python&emsp;</td></tr>
							<tr><td><img class="small" src="/static/images/tomcat-stack.png">Tomcat&emsp;</td>
									<td><img class="small" src="/static/images/mysql-stack.png">&nbsp;MySQL&emsp;</td>
									<td><img class="small" src="/static/images/ubuntu-stack.png">&nbsp;Ubuntu&emsp;</td></tr>
						</table>
						<!-- <img class="small" src="/static/images/webgl-stack.png">WebGL -->
						<!-- <img class="small" src="/static/images/three-stack.png">Three.js -->
						<!-- <img class="small" src="/static/images/blender-stack.png">Blender -->
					</div>
				</div>
				<div class="col-md-4">
					<div class="panel-freeciv">
						<h4><fmt:message key="index-credits"/></h4>
						<ul>
							<li>Epiphany<i class="fa fa-github"></i>  <a href="https://discord.gg/Zj8UQSN">@epiphany_1</a></li>
							<li>Marko Lindqvist <i class="fa fa-github"></i>  <a href="https://github.com/cazfi">@cazfi</a></li>
							<li>Sveinung Kvilhaugsvik <i class="fa fa-github"></i>  <a href="https://github.com/kvilhaugsvik">@kvilhaugsvik</a></li>
							<li>Andreas R&oslash;sdal <i class="fa fa-githubO"></i>  <a href="https://github.com/andreasrosdal/">@andreasrosdal</a></li>
							<li>M&#xE1;ximo Casta&#xF1;eda <i class="fa fa-github"></i>  <a href="https://github.com/lonemadmax">@lonemadmax</a></li>
							<li><a href="https://github.com/Lexxie9952/fcw.org-server/graphs/contributors">Full list</a></li>
						</ul>

					</div>
				</div>
			</div> <!-- end developers -->
		</c:if>


		<%@include file="/WEB-INF/jsp/fragments/footer.jsp"%>
	</div>
<!--
  <script src="//cdn.webglstats.com/stat.js" defer async></script>-->
</body>
<script src="/static/javascript/jdenticon.min.js">
</script>

</html>
