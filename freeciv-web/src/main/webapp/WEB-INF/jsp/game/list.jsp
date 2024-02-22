<%@ taglib prefix="c" uri="http://java.sun.com/jsp/jstl/core"%>
<%@ taglib prefix="fn" uri="http://java.sun.com/jsp/jstl/functions"%>
<%@ include file="/WEB-INF/jsp/fragments/i18n.jsp"%>
<!DOCTYPE html>
<html lang="en">
<head>
<%@include file="/WEB-INF/jsp/fragments/head.jsp"%>
<style>
#play-by-email-table {
	font-family: Helvetica;
}
</style>


<script>
(function ($) {

	$(function () {
		displayPlayByEmailGames();
	});

	function displayPlayByEmailGames () {
		$.getJSON('/mailstatus', function(data) {
			if (data.length === 0) {
				$("#play-by-email-table").hide();
				return;
			}

			$($($(".nav-tabs").children()[3]).children()[0]).html("Play-By-Email (" + data.length + ")");

			data.reverse().forEach(function (game) {
				var turn = game[0];
				var phase = game[1];
				var players = game[2];

				var currentPlayer = game[2][phase];
				var lastPlayed = game[3];
				var timeLeft = game[4];

				players = players.map(function (player) {
					return player === currentPlayer
						? "<u><span style='font-weight:1000'>" + player + "</u>"
						: player;
				}).join(', ');

				if (players.indexOf("@") >= 0) {
					return;
				}

				if (players.length > 100) players = players.substring(0, 100) + "...";

				$("#play-by-email-table").append(
					'<tr>' +
						'<td>' +
							players +
						'</td>' +
						'<td class="hidden-xs">' +
							turn +
						'</td>' +
						'<td class="hidden-xs">' +
							lastPlayed +
						'</td>' +
						'<td>' +
							timeLeft + ' hours' +
						'</td>' +
					'</tr>'
				);
			});
		}).fail(function (err) {
			$("#play-by-email-table").hide();
		});
	}

})($);

</script>

<style>
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
	a {
    text-shadow: 1px 1px #000;
	}
	.nav-tabs {
		margin-top: 5px;
	}
	.nav>li>a:hover {
		background-color: #796f6f;
		background: url('/images/bg.jpg');
		color:  #eed;
		text-shadow: 1px 1px #ccc
	}
	.nav-tabs>li>a {
		background-color: #ecb66a;
		text-transform: uppercase;
		background: url('/images/bg.jpg');
		color:  #eed;
		font-weight: 700;
		text-shadow: 1px 1px #000
	}
	.nav-tabs>li.active>a {
		background: url('/images/bg.jpg');
		color: #eed;
		text-shadow: 1px 1px #888
	}
	.nav-tabs>li.active>a, .nav-tabs>li.active>a:hover, .nav-tabs>li.active>a:focus {
			background: url('/images/bg-light.jpg');
	    background-color: #be602d;
	    color: #000;
	}
	.navbar-inverse {
		background-color: #2220;
		background: url('/images/bg-med-dark.jpg');
	}
	.tab-pane {
		background-color: #fcf1e0;
		background: url('/images/bg-med-dark.jpg');
		color: #ccc;
	}
	table {
    border-collapse: collapse;
    border-spacing: 0;
		background: url(/images/bg-dark.jpg);
    color:#ccc;
    font-weight: 600;
    text-shadow: 1px 1px #543;
		margin-top: -1px;
		font-family: Helvetica;
	}
	.table td {
		vertical-align: middle;
	}
	.label-lg {
		font-size: 13px;
	}
	.label-lg:not(:last-child) {
		margin-right: 3px;
	}
	.private-game {
		font-style: italics;
	}
	.running-game {
		font-weight: bold;
	}
	.highlight {
		color: #9c9;
		font-weight: bold;
	}
	.active-player {
		font-weight: bold;
	}
	#multiplayer-table td:last-child {
		width: 140px;
	}
	#longturn-table td:last-child {
		width: 110px;
	}
	#singleplayer-table td:last-child {
		width: 140px;
	}
	body {
		color: #ccc;
  	background-image: url('/images/bg-dark.jpg');
	}
	.container {
		background: none !important;
		color: #ccc;
	}
	h1,h2,h3,h4,h5,h6 {
		font-family: 'HelveticaBlack', 'Freeciv', 'Segoe UI';
		text-shadow: 1px 1px #222;
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
	<%@include file="/WEB-INF/jsp/fragments/header.jsp" %>

	<!-- Begin page content -->
	<div id="content" class="container" style="padding-left:0px; padding-right:0px;">
		<div>
			<ul class="nav nav-tabs hidden-xs" role="tablist">
				<li role="presentation" class="${view == 'singleplayer' or empty view ? 'active' : ''}"><a href="#single-player-tab"
					aria-controls="single-player" role="tab" data-toggle="tab">Single-player (${singlePlayerGames})</a></li>
				<li role="presentation" class="${view == 'multiplayer' ? 'active' : ''}"><a href="#multi-player-tab"
					aria-controls="multi-player" role="tab" data-toggle="tab">Multiplayer (${multiPlayerGames})</a></li>
				<li role="presentation" class="${view == 'longturn' ? 'active' : ''}"><a href="#longturn-tab"
					aria-controls="longturn" role="tab" data-toggle="tab">Longturn (${longturnGames})</a></li>
				<li role="presentation" class="${view == 'play-by-email' ? 'active' : ''}"><a href="#play-by-email-tab"
					aria-controls="play-by-email" role="tab" data-toggle="tab">Play-By-Email</a></li>
			</ul>
			<ul class="nav nav-tabs hidden-lg hidden-md hidden-sm" role="tablist">
				<li role="presentation" class="${view == 'singleplayer' or empty view ? 'active' : ''}"><a href="#single-player-tab"
					aria-controls="single-player" role="tab" data-toggle="tab">Single (${singlePlayerGames})</a></li>
				<li role="presentation" class="${view == 'multiplayer' ? 'active' : ''}"><a href="#multi-player-tab"
					aria-controls="multi-player" role="tab" data-toggle="tab">Multi (${multiPlayerGames})</a></li>
				<li role="presentation" class="${view == 'longturn' ? 'active' : ''}"><a href="#longturn-tab"
					aria-controls="longturn" role="tab" data-toggle="tab">Longturn (${longturnGames})</a></li>
				<li role="presentation" class="${view == 'play-by-email' ? 'active' : ''}"><a href="#play-by-email-tab"
					aria-controls="play-by-email" role="tab" data-toggle="tab">Play-By-Email</a></li>
			</ul>

			<div class="tab-content">
				<div role="tabpanel" class="tab-pane ${view == 'singleplayer' or empty view ? 'active' : ''}" id="single-player-tab">
					<c:if test="${fn:length(singlePlayerGameList) > 0}">
						<table id="singleplayer-table" class="table">
							<tr>
								<th>Flag</th>
								<th class="hidden-xs">Map</th>
								<th>Player</th>
								<th class="hidden-xs">Game Info</th>
								<th class="hidden-xs">Players</th>
								<th class="hidden-xs">Turn</th>
								<th>Action</th>
							</tr>
							<c:forEach items="${singlePlayerGameList}" var="game">
								<tr class="${game.isProtected() ? '.private-game' : '' }">
									<td>
										<c:if test="${game.flag ne 'none'}">
											<img src="/images/flags/${game.flag}-web.png" alt="${game.flag}" width="80" height="50" title="${game.turn}">
										</c:if>
									</td>
									<td class="hidden-xs">
									    <a href="/data/savegames/map-${game.port}.map.gif">
									        <img src="/data/savegames/map-${game.port}.map.gif" width="80" height="50">
									    </a>
									</td>
									<td><b>${game.player}</b></td>
									<td class="hidden-xs">${game.message}</td>
									<td class="hidden-xs">${game.players}</td>
									<td class="hidden-xs">${game.turn}</td>
									<td><a class="label label-success label-lg" href="/webclient/?action=observe&amp;civserverport=${game.port}&amp;civserverhost=${game.host}&amp;type=${game.type}" title="Observe">Observe</a>
										<a class="label info_button label-lg" href="/game/details?host=${game.host}&amp;port=${game.port}">Info</a>
									</td>
								</tr>
							</c:forEach>
						</table>
					</c:if>
					<c:if test="${fn:length(singlePlayerGameList) == 0}">
							<a class="label play_button" href="/webclient/?action=new&amp;type=singleplayer">Start</a> a new single player game!
					</c:if>
				</div>

				<div role="tabpanel" class="tab-pane ${view == 'multiplayer' ? 'active' : ''}" id="multi-player-tab">
					<c:if test="${fn:length(multiPlayerGamesList) > 0}">
						<table id="multiplayer-table" class="table">
							<tr>
								<th class="hidden-xs">Players</th>
								<th>Game Title</th>
								<th>State</th>
								<th class="hidden-xs">Turn</th>
								<th>Action</th>
							</tr>
							<c:forEach items="${multiPlayerGamesList}" var="game">
								<tr
									class="${game.isProtected() ? 'private-game' : (game.state eq 'Running' ? 'running-game' : (game.players gt 0 ? 'highlight' : ''))}">
									<td class="hidden-xs">
										<c:choose>
											<c:when test="${game.players == 0}">
													None
												</c:when>
											<c:when test="${game.players == 1}">
													1 player
												</c:when>
											<c:otherwise>
													${game.players} players
												</c:otherwise>
										</c:choose>
									</td>
									<td>${game.message}</td>
									<td>${game.state}</td>
									<td class="hidden-xs">${game.turn}</td>
									<td><c:choose>
											<c:when test="${game.state != 'Running'}">
												<a class="label play_button label-lg" href="/webclient/?action=multi&amp;civserverport=${game.port}&amp;civserverhost=${game.host}&amp;multi=true&amp;type=${game.type}">Play</a>
											</c:when>
											<c:otherwise>
                        <a class="label play_button label-lg" href="/webclient/?action=multi&amp;civserverport=${game.port}&amp;civserverhost=${game.host}&amp;multi=true&amp;type=${game.type}">Play</a>
											<c:if test="${game.type} ne 'longturn'}">
												<a class="label label-success label-lg"
													href="/webclient/?action=observe&amp;civserverport=${game.port}&amp;civserverhost=${game.host}&amp;multi=true&amp;type=${game.type}">Observe</a>
											</c:if>
											</c:otherwise>
										</c:choose>
										<a class="label info_button label-lg"	href="/game/details?host=${game.host}&amp;port=${game.port}">Info</a>
									</td>
								</tr>
							</c:forEach>
						</table>
					</c:if>
					<c:if test="${fn:length(multiPlayerGamesList) == 0}">
						No servers currently listed
					</c:if>
				</div>

				<div role="tabpanel" class="tab-pane ${view == 'longturn' ? 'active' : ''}" id="longturn-tab">
					<c:if test="${fn:length(longturnGamesList) > 0}">
						<table id="longturn-table" class="table">
							<tr>
								<th class="hidden-xs"></th>
								<th class="hidden-xs">Players</th>
								<th>Game Info<br>* <span style="font-size:90%; font-weight:600; color: #b6a6ff; text-shadow: 1px 1px #216;"><i>Purple games: Late-join bonus gold and bulbs ensure FAIR-START&#8482; in the first 10 turns.</i></span><br><br><u>Player skill-level definitions:</u><br><span style="font-size:90%; font-weight:600; color: #f1dbba; text-shadow: 1px 1px rgb(39, 16, 3);"><b><u>EXPERT</u></b></span> - Winning player with highest score in a past RATED game.<br><span style="font-size:90%; font-weight:600; color: #f1dbba; text-shadow: 1px 1px rgb(39, 16, 3);"><b><u>EXPERIENCED</u></b></span> - Winning player with highest score in a past UNRATED game.<br><span style="font-size:90%; font-weight:600; color: #f1dbba; text-shadow: 1px 1px rgb(39, 16, 3);"><b><u>BEGINNER</u></b></span> - Any player who is neither <b>EXPERT</b> nor <b>EXPERIENCED</b>.</th>
								<th style="text-align:center" class="hidden-xs">State</th>
								<th style="text-align:right">Turn</th>
								<th style="text-align:center">Action</th>
							</tr>
							<c:forEach items="${longturnGamesList}" var="game">
								<tr
									class="${game.isProtected() ? 'private-game' : (game.state eq 'Running' ? 'running-game' : (game.players gt 0 ? 'highlight' : ''))}">

									<td class="hidden-xs">
										<svg width="48" height="48" data-jdenticon-value="${game.message}>"></svg>
									</td>
									<td class="hidden-xs" style="text-align:center">
										<c:choose>
											<c:when test="${game.players == 0}">
													None
												</c:when>
											<c:when test="${game.players == 1}">
													1 <!-- player -->
												</c:when>
											<c:otherwise>
													${game.players} <!-- players -->
												</c:otherwise>
										</c:choose>
									</td>
									<td>
											<c:if test="${game.turn lt 11}">
												<span style="color: #b6a6ff; text-shadow: 1px 1px #216; ">${game.message}</span>
											</c:if>
											<c:if test="${game.turn > 10}">
												${game.message}
											</c:if>
									</td>
									<td class="hidden-xs" style="text-align:center">${game.state} <span style="color:#a3bbd2; text-shadow:1px 1px #0001">${game.port}</span></td>
									<td style="text-align:right">
											<c:if test="${game.turn lt 11}">
												<span style="color: #b6a6ff; text-shadow: 1px 1px #216;">${game.turn}</span>
											</c:if>
											<c:if test="${game.turn > 10}">
												${game.turn}
											</c:if>
									</td>
									<td><c:choose>
											<c:when test="${game.state != 'Running'}">
												<a class="label play_button label-lg" href="/webclient/?action=multi&amp;civserverport=${game.port}&amp;civserverhost=${game.host}&amp;multi=true&amp;type=${game.type}">Play</a>
											</c:when>
											<c:otherwise>
                          <a class="label play_button label-lg" href="/webclient/?action=multi&amp;civserverport=${game.port}&amp;civserverhost=${game.host}&amp;multi=true&amp;type=${game.type}">Play</a>
											<c:if test="${game.type} ne 'longturn'}">
												<a class="label play_button label-lg" href="/webclient/?action=observe&amp;civserverport=${game.port}&amp;civserverhost=${game.host}&amp;multi=true&amp;type=${game.type}">Observe</a>
											</c:if>
											</c:otherwise>
										</c:choose>
										<a class="label info_button label-lg"	href="/game/details?host=${game.host}&amp;port=${game.port}">Info</a>
									</td>
								</tr>
							</c:forEach>
						</table>
					</c:if>
					<c:if test="${fn:length(longturnGamesList) == 0}">
						No servers currently listed
					</c:if>
				</div>

				<div role="tabpanel" class="tab-pane ${view == 'play-by-email' ? 'active' : ''}" id="play-by-email-tab">
					<div class="row">
						<div class="col-md-12">
							<p>
								A Play-By-Email game is a deathmatch on a small map with up to 4 human players, playing
								with alternating turns, and players get an e-mail every time it is
								their turn to play. These games are often played over a long time
								period, each player has 7 days to complete their turn.
							</p>
							<p>
								To start a new Play-By-Email game,
								<a href="/webclient/?action=pbem&amp;type=pbem">log in here</a></u>. To play your turn
								in a running Play-By-Email game, click on the link in the last
								e-mail you got from Freeciv-web. Games are expired after 7 days if
								you don't play your turn.
							</p>
						</div>
					</div>

					<div class="row top-buffer-2">
						<div class="col-md-12">
							<h4>Ongoing games</h4>
							<table id="play-by-email-table" class="table">
								<tr>
									<th>Players</th>
									<th class="hidden-xs">Turn</th>
									<th class="hidden-xs">Last played</th>
									<th>Time left</th>
								</tr>
							</table>
							<p>Current player is marked in <b><u>bold underline</u></b>.</p>
						</div>
					</div>

					<div class="row top-buffer-2">
						<div class="col-md-12">
							<h4>Finished games</h4>
							<table class="table">
								<tr>
									<th>Winner</th>
									<th>Game Date</th>
									<th>Player 1</th>
									<th>Player 2</th>
								</tr>
								<c:forEach items="${playByEmailStatistics}" var="game">
									<tr>
										<td>${game.winner}</td>
										<td>${game.endDate}</td>
										<td>${game.playerOne} (W: ${game.winsByPlayerOne})</td>
										<td>${game.playerTwo} (W: ${game.winsByPlayerTwo})</td>
									</tr>
								</c:forEach>
							</table>
						</div>
					</div>
				</div>
			</div>
		</div>

		<%@include file="/WEB-INF/jsp/fragments/footer.jsp"%>
	</div>

</body>
<script src="/static/javascript/jdenticon.min.js"></script>

</html>
