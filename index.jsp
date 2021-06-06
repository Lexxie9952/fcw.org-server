<%@ taglib prefix="c" uri="http://java.sun.com/jsp/jstl/core" %>
<%@ taglib prefix="fn" uri="http://java.sun.com/jsp/jstl/functions" %> 
<%@ include file="/WEB-INF/jsp/fragments/i18n.jsp" %>
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
		font-family: Arial, Helvetica, 'Open Sans';
	}
	#game-launcher .game-type {
		width: 100%;
		background: url('/images/bg-med-dark.jpg');
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
		font-family: 'Freeciv', 'Tahoma', 'Arial';
		padding: 15px;
		margin-bottom: 0px;
		background-image: url('/images/bg-med-light.jpg');
		background-repeat: repeat;
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
		color: rgb(255, 255, 255);
		border: 0;
		border-radius: 5px;
		padding: 10px;
		width: 230px;
		display: block;
		font-weight: 700;
		font-size: 20px;
		text-transform: uppercase;
		margin: 20px auto 10px;
		background: #000d28;
   text-shadow:
    -0.5px -0.5px 0 #000,
    0.5px -0.5px 0 #000,
    -0.5px 0.5px 0 #000,
    0.5px 0.5px 0 #000;
	}
	/* overrides the above */
	#game-launcher .btn {
    color: rgb(154 183 207);
		text-shadow: 1px 1px #000000 !important;
    color: rgb(138, 127, 70)
	}
	#game-launcher a.small { width: 130px;	}
	.multiplayer-games th:last-child { width: 80px; }
	.multiplayer-games a.label:first-child { margin-right: 3px; }
	.multiplayer-games .highlight { 
		color: green;
		font-weight: bold;
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
	.navbar-inverse {
		background-color: #2220;
		background: url(/images/bg-med-dark.jpg);
	}
	body {
		color: #ccc;
  	background-image: url('/images/bg-dark.jpg'); 
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
		font-family: 'Freeciv', 'Segoe UI';
		text-shadow: 1px 1px #222;
	}
	.well {
		background: #fff1;
	}
	a {
    text-shadow: 1px 1px #000 !important;
	}
	.name {
		text-shadow: 1px 2px #777 !important;
	}

	@font-face {
  font-family: Helvetica;
  src: url('/fonts/arial.ttf');
	}
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
	@font-face {
		font-family: Arial;
		src: url('/fonts/arial.ttf');
	}

</style>
</head>
<body>
	<div class="container">
		<%@include file="/WEB-INF/jsp/fragments/header.jsp"%>

		<div class="jumbotron">
			<div class="row">

				<img style="border-radius: 20px 20px 20px 20px; box-shadow: 2px 2px #000a; width:65%" src="/static/images/fcw-front-page.gif">

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
								Play against the Freeciv AI with 2D HTML5 graphics
							</div>
						</c:if>
						<a id="single-button" href="/webclient/?action=new&type=singleplayer" class="btn"><i class="fa fa-flag"></i> <fmt:message key="index-game-launcher-2d"/></a>
                        <br><br><br>
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


		<c:if test="${default_lang}">
			<div id="statistics" class="row">
				<div class="col-md-12">
					<div class="panel-freeciv statistics">
						<h4 style="color:#6398d6"><span id="statistics-singleplayer"><b>0</b></span> <fmt:message key="index-stats-singleplayer"/> <span id="statistics-multiplayer"><b>0</b></span> <fmt:message key="index-stats-multiplayer"/><br>
						<fmt:message key="index-stats-since"/></h4>

					</div>
				</div>
			</div> <!-- end statistics -->
		</c:if>



		<div class="row">
			<div class="col-md-6" style="padding-left:0px; padding-right:0px">
				<div class="panel-freeciv">
					<h3>Multiplayer and One Turn per Day games:</h3>
					<c:if test="${not empty games and fn:length(games) > 0}">
						<table class="table multiplayer-games">
							<thead>
								<tr>
									<th>Game name</th>
									<th class="hidden-xs">State</th>
									<th>Turn</th>
									<th>Players</th>
									<th>Actions</th>
								</tr>
							</thead>
							<tbody>
								<c:forEach items="${games}" var="game">
									<tr class="${game.players > 0 && state == 'Pregame' ? 'highlight' : ''}">
										<td style="color:#8ea7bf">
										    <b>
											  ${fn:replace(game.message, 'LongTurn', ' One Turn per Day ')}
											</b>
										</td>
										<td class="hidden-xs">
											${game.state}
										</td>
										<td style="text-align:center">
											${game.turn}
										</td>
										<td style="text-align:center">
											<c:choose>
												<c:when test="${game.players == 0}">
													None
												</c:when>
												<c:when test="${game.players == 1}">
													1 <span class="hidden-xs">player</span>
												</c:when>
												<c:otherwise>
													${game.players} <span class="hidden-xs">players</span>
												</c:otherwise>
											</c:choose>
										</td>			
										<td>
											<c:choose>
												<c:when test="${game.state == 'Running' or game.state == 'Pregame'}">
													<a  class="label label-success" href="/webclient/?action=multi&civserverport=${game.port}&amp;civserverhost=${game.host}&amp;multi=true&amp;type=${game.type}">Play</a>
												</c:when>
												<c:otherwise>
													<a class="label label-success" href="/webclient/?action=observe&amp;civserverport=${game.port}&amp;civserverhost=${game.host}&amp;multi=true&amp;type=${game.type}">Observe</a>
												</c:otherwise>
											</c:choose>
											<a class="label label-primary" href="/game/details?host=${game.host}&amp;port=${game.port}">Info</a>
										</td>
									</tr>
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
					<a href="http://www.pcgamer.com/freeciv-available-in-html5-browsers-worldwide-productivity-plummets/" target="new"><img style="display: block; float: right;" src="images/pcgamer.gif" alt="PC Gamer"></a>
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
							<li>Andreas R&oslash;sdal <i class="fa fa-twitter"></i>  <a href="https://github.com/andreasrosdal/">@andreasrosdal</a></li>
							<li>Lexxie L. <i class="fa fa-github"></i>  <a href="https://github.com/Lexxie9952/">@lexxie9952</a></li>
							<li>Sveinung Kvilhaugsvik <i class="fa fa-github"></i>  <a href="https://github.com/kvilhaugsvik">@kvilhaugsvik</a></li>
							<li>Marko Lindqvist <i class="fa fa-github"></i>  <a href="https://github.com/cazfi">@cazfi</a></li>
							<li>M&#xE1;ximo Casta&#xF1;eda <i class="fa fa-github"></i>  <a href="https://github.com/lonemadmax">@lonemadmax</a></li>
							<li><a href="https://github.com/Lexxie9952/fcw.org-server/graphs/contributors">Full list</a></li>
						</ul>
						
					</div>
				</div>
			</div> <!-- end developers -->
		</c:if>


		<%@include file="/WEB-INF/jsp/fragments/footer.jsp"%>
	</div>

  <script src="//cdn.webglstats.com/stat.js" defer async></script>
</body>
</html>	
