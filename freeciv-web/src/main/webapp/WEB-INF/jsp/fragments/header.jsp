<nav class="navbar navbar-inverse navbar-fixed-top">
	<div class="container">
		<!-- Brand and toggle get grouped for better mobile display -->
		<div class="navbar-header">
		<button type="button" class="navbar-toggle collapsed" data-toggle="collapse" data-target="#bs-example-navbar-collapse-1" aria-expanded="false">
			<span class="sr-only"><fmt:message key="nav-toggle-navigation"/></span>
			<span class="icon-bar"></span>
			<span class="icon-bar"></span>
			<span class="icon-bar"></span>
		</button>
		<a class="navbar-brand" href="/">
			<!--Logo font is: Liberation Sans Bold Italic -->
			<img src="/static/images/brand.png" alt="Freeciv TnT">
		</a>
		</div>

		<!-- Collect the nav links, forms, and other panel-freeciv for toggling -->
		<div class="collapse navbar-collapse" id="bs-example-navbar-collapse-1">
		<ul class="nav navbar-nav">
			<li><a href="/webclient/?action=new&amp;type=singleplayer">Singleplayer</a></li>
			<li class="dropdown">
				<a href="/game/list?v=multiplayer" class="dropdown-toggle" data-toggle="dropdown" role="button" aria-haspopup="true" aria-expanded="false">
					<span onclick="window.location='/game/list?v=multiplayer'">Multiplayer</span> <span class="caret"></span> <span class="badge ongoing-games-number" id="ongoing-games" title="Ongoing games"></span>
				</a>
				<ul class="dropdown-menu">
					<li><a href="/game/list?v=longturn">Official Games</a></li>
					<li role="separator" class="divider"></li>
					<li><a href="/game/list?v=multiplayer">Unofficial Games</a></li>
					<li role="separator" class="divider"></li>
					<li><a href="/game/list?v=singleplayer">Practice vs AI</a></li>
				</ul>
			</li>
			<li id="donate_link"><a href="https://www.patreon.com/freeciv_val">Donations</a></li>
			<li><a href="https://github.com/Canik05/freeciv-tnt">Source</a></li>
			<li><a href="https://val.tacticsandtriumph.com/">TnT Valhalla</a></li>
			<%--<li class="dropdown">
				<a href="#" class="dropdown-toggle" data-toggle="dropdown" role="button" aria-haspopup="true" aria-expanded="false" title="${pageContext.request.locale.language} ${pageContext.request.locale.country}">
					Language <span class="caret"></span>
				</a>
				<ul class="dropdown-menu">
					<li><a href="/?locale=en_US">English</a></li>
					<li role="separator" class="divider"></li>
					<li><a href="/?locale=zh_CN">Simplified Chinese</a></li>
					<li role="separator" class="divider"></li>
					<li><a href="/?locale=zh_TW">Traditional Chinese</a></li>
				</ul>
			</li>--%>
		</ul>
		<form class="navbar-form navbar-right hidden-sm hidden-md" action="https://duckduckgo.com/" style="width: 220px;">
			<input type="hidden" name="sites" value="www.freeciv.org,forum.freeciv.org,freeciv.wikia.com">
			<div class="form-group">
				<div class="input-group">
					<input type="text" class="form-control" name="q" placeholder="Freeciv TnT">
					<span class="input-group-btn">
						<button class="btn btn-default" type="submit"><i class="fa fa-search"></i></button>
					</span>
				</div>
			</div>
		</form>
		</div><!-- end navbar-collapse -->
	</div><!-- end container-fluid -->
</nav> <!-- end nav -->
<script src="/static/javascript/header.min.js"></script>
<!--[if lt IE 8]>
	<p class="browserupgrade">You are using an <strong>outdated</strong> browser. Please <a href="http://browsehappy.com/">upgrade your browser</a> to improve your experience.</p>
<![endif]-->
