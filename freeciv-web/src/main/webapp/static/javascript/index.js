function is_mobile_device()
{
  if($( window ).width() <= 600 || ('ontouchstart' in window) || 'onmsgesturechange' in window || window.DocumentTouch && document instanceof DocumentTouch) {
    return true;
  } else {
    return false;
  }
}


$(document).ready(function () {

	(function ($) {
	
		$(function () {
			loadBestOfPlayByEmail();
			//displayStore();

			if (is_mobile_device()) {
              $("#webgl_button").hide(); // WebGL doesn't work in the Android app, and generally poorly on mobile.
              $(".lead").text("Freeciv is a Free and Open Source empire-building strategy game inspired by the history of human civilization.");  // shorted text for mobile screens.
			}

			if (window.location.href == 'https://freecivweb.org/') window.location.href='https://www.freecivweb.org/';


			if (!Detector.webgl) {
	          $("#webgl_button").addClass("disabled");
	          $("#webgl_button").html("WebGL not enabled!");
			}
		});
	
		function loadBestOfPlayByEmail() {
		
			var clearContent = function () {
				document.getElementById('best-of-play-by-email').style.display = 'none';
			};
		
			$.getJSON('/game/play-by-email/top', function(data) {
				if (data.length === 0) {
					clearContent();
				}
				var root = document.getElementById('play-by-email-list');
				data.forEach(function (item, i) {
					var row = document.createElement('tr');
					var rank = document.createElement('td');
					var player = document.createElement('td');
					var wins = document.createElement('td');
				
					rank.innerHTML = "#" + (i + 1);
					player.innerHTML = item.player;
					wins.innerHTML = item.wins;
				
					row.appendChild(rank);
					row.appendChild(player);
					row.appendChild(wins);
					root.appendChild(row);
				});
			}).fail(clearContent);
		}

		function displayStore() {
			var ua = navigator.userAgent.toLowerCase();
			if (ua.indexOf('android') >= 0) {
				$("#google-play-store").show();
			} else if (ua.indexOf('chrome') >= 0) {
				$("#chrome-web-store").show();
			}
		}
	
	
	})($)
});
