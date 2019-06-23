<%@ include file="/WEB-INF/jsp/fragments/i18n.jsp"%>
<!DOCTYPE html>
<html lang="en">
<head>
	<%@include file="/WEB-INF/jsp/fragments/head.jsp"%>
<script>
$(document).ready(function () {
  $.getJSON('/data/accounting.json', function(data) {
    function newYear(year) {
      return {
          year: year
        , futurePayments: 0
        , pastPayments: 0
        , donations: 0
        , entries: []
      };
    }
    var yearData = [];
    var total = newYear(0);
    var currentYear = newYear(data.accounting[0][0].substring(0, 4));
    yearData.push(currentYear);

    var dl = data.accounting.length;
    for (var i = 0; i < dl; i++) {
      var entry = data.accounting[i];
      var year = entry[0].substring(0, 4);
      if (year != currentYear.year) {
        total.futurePayments += currentYear.futurePayments;
        total.pastPayments += currentYear.pastPayments;
        total.donations += currentYear.donations;
        currentYear = newYear(year);
        yearData.push(currentYear);
      }
      if (entry[3] == "-") {
        if (entry[0] <= data.lastUpdate) {
          currentYear.pastPayments += entry[2];
        } else {
          currentYear.futurePayments += entry[2];
        }
      } else {
        currentYear.donations += entry[2];
      }
      currentYear.entries.push(entry);
    }
    total.futurePayments += currentYear.futurePayments;
    total.pastPayments += currentYear.pastPayments;
    total.donations += currentYear.donations;
    yearData.push(currentYear);

    var accEl = document.getElementById("accounting");

    var el = document.createElement("p");
    el.appendChild(document.createTextNode("Last updated: " + data.lastUpdate));
    accEl.appendChild(el);

    function addYearTitle(year) {
      var el = document.createElement("h4");
      el.appendChild(document.createTextNode(year));
      accEl.appendChild(el);
    }

    function addAccountingTable(yearData) {
      function formatMoney(value) {
        var t;
        var q = Math.abs(value);
        if (q >= 100) {
          t = "" + q;
          var iDigits = t.length - 2;
          t = t.substring(0, iDigits) + "," + t.substring(iDigits);
        } else if (q >= 10) {
          t = "0," + q;
        } else {
          t = "0,0" + q;
        }
        return (value >= 0 ? t : ("-" + t));
      }

      function summaryRow(title, value) {
        var row = document.createElement("tr");
        var cell = document.createElement("td");
        row.appendChild(cell);
        cell = document.createElement("th");
        cell.setAttribute("scope", "row");
        cell.appendChild(document.createTextNode(title));
        row.appendChild(cell);
        cell = document.createElement("td");
        cell.appendChild(document.createTextNode(formatMoney(value)));
        row.appendChild(cell);
        return row;
      }

      var table = document.createElement("table");
      table.setAttribute("class", "accounting");
      var tbody = document.createElement("tbody");
      tbody.appendChild(summaryRow("Future expected payments", yearData.futurePayments));
      tbody.appendChild(summaryRow("Past real payments", yearData.pastPayments));
      tbody.appendChild(summaryRow("Donations", yearData.donations));
      table.appendChild(tbody);
      var iEntry = yearData.entries.length;
      if (iEntry > 0) {
        tbody = document.createElement("tbody");
        while (iEntry--) {
          var entry = yearData.entries[iEntry];
          var row = document.createElement("tr");
          var cell = document.createElement("td");
          cell.appendChild(document.createTextNode(entry[0]));
          row.appendChild(cell);
          cell = document.createElement("td");
          cell.appendChild(document.createTextNode(entry[1]));
          row.appendChild(cell);
          cell = document.createElement("td");
          cell.appendChild(document.createTextNode(formatMoney(entry[2])));
          row.appendChild(cell);
          tbody.appendChild(row);
        }
        table.appendChild(tbody);
      }
      accEl.appendChild(table);
    }

    addYearTitle("Lifetime total");
    addAccountingTable(total);

    for (var i = yearData.length - 1; i--; i >= 0) {
      addYearTitle(yearData[i].year);
      addAccountingTable(yearData[i]);
    }
  });
});
</script>
<style>
.accounting {
 margin-bottom:20px;
}
.accounting th, .accounting td {
 padding:8px;
 vertical-align:bottom;
 border-bottom:1px solid #be602d;
 line-height:1.4em;
}
.accounting>tbody {
 border-top:2px solid #be602d
}
.accounting tr>td:last-child {
 text-align: right;
}
</style>
</head>
	<div class="container">
		<%@include file="/WEB-INF/jsp/fragments/header.jsp"%>
		<h2>Join Freeciv Longturn Game 21</h2>
		<img src="/images/g212.png" width="60%">
		<h3><a href="https://www.freecivweb.org/webclient/?action=multi&civserverport=6169&civserverhost=fcweb&multi=true&type=longturn">Join Game 21 here!</a></h3>

		<b><p>Freeciv Longturn game 21 has started! It's an interesting archipelago islands setup, similar to the <a href="https://web.archive.org/web/20180112015228/http://play.freeciv.org/blog/2017/10/join-longturn-web-x/">old Game X</a>. This game started some days ago, but it is still possible to join already started games. </p>

		<p>In Longturn games, each player will play one turn every day. There are many players in each game, typically 50, 100 or more. </p>


		<p>Join the game now, and also talk to the other players on <a href="https://discord.gg/PscmWqu">Discord</a>.</p>


		</b>
		<h3><a href="https://www.freecivweb.org/webclient/?action=multi&civserverport=6169&civserverhost=fcweb&multi=true&type=longturn">Join Game 21 here!</a></h3>

		<br><br>
		<h3>Screenshots from past Longturn games:</h3>
	 	Freeciv Longturn game 2:<br>
		<a href="https://freeciv.fandom.com/wiki/Freeciv-web_screenshots?file=Freeciv-web-longturn-game2-status-jpg.jpg"><img src="/images/lt2.jpg" width="80%"></a>
		<br><br>

	 	Freeciv Longturn game 18:<br>
		<img src="/images/g18jaja.png" width="80%">

		<br><br>
		Freeciv Longturn game 17:<br>
		<img src="/images/g17.png" width="50%">
		<br>



		<br><br><br>


<div id="disqus_thread"></div>
<script>

/**
*  RECOMMENDED CONFIGURATION VARIABLES: EDIT AND UNCOMMENT THE SECTION BELOW TO INSERT DYNAMIC VALUES FROM YOUR PLATFORM OR CMS.
*  LEARN WHY DEFINING THESE VARIABLES IS IMPORTANT: https://disqus.com/admin/universalcode/#configuration-variables*/
/*
var disqus_config = function () {
this.page.url = PAGE_URL;  // Replace PAGE_URL with your page's canonical URL variable
this.page.identifier = PAGE_IDENTIFIER; // Replace PAGE_IDENTIFIER with your page's unique identifier variable
};
*/
(function() { // DON'T EDIT BELOW THIS LINE
var d = document, s = d.createElement('script');
s.src = 'https://freeciv-web.disqus.com/embed.js';
s.setAttribute('data-timestamp', +new Date());
(d.head || d.body).appendChild(s);
})();
</script>
<noscript>Please enable JavaScript to view the <a href="https://disqus.com/?ref_noscript">comments powered by Disqus.</a></noscript>


		<%@include file="/WEB-INF/jsp/fragments/footer.jsp"%>
	</div>
</body>
</html>
