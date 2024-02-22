<%@ taglib prefix="c" uri="http://java.sun.com/jsp/jstl/core"%>
<%@ taglib prefix="fn" uri="http://java.sun.com/jsp/jstl/functions"%>
<%@ taglib prefix = "fmt" uri = "http://java.sun.com/jsp/jstl/fmt" %>

<%@ include file="/WEB-INF/jsp/fragments/i18n.jsp"%>
<!DOCTYPE html>
<html lang="en">
<head>
<%@include file="/WEB-INF/jsp/fragments/head.jsp"%>

<!-- Bootstrap core CSS -->
<link rel="stylesheet" href="/css/morris.css" />
<script src="/javascript/libs/raphael-min.js"></script>
<script src="/javascript/libs/morris.min.js"></script>
<style>
	table, th, td {
        padding: 4px;
        font-size: 130%;
        text-transform: capitalize;
    }
  table {
    border-collapse: collapse;
    border-spacing: 0;
		background: url(/images/bg-light.jpg);
    color: #000;
    font-weight: 600;
    text-shadow: 1px 1px #bbb;
	}

  .score_row {
    border-bottom: 1px solid black;
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
  .navbar-inverse {
		background-color: #2220;
		background: url(/images/bg-med-dark.jpg);
	}
	a {
    text-shadow: 1px 1px #000;/* !important;*/
	}
  h1,h2,h3,h4,h5,h6 {
		font-family: 'HelveticaBlack', 'Freeciv', 'Segoe UI';
		text-shadow: 1px 1px #222;
	}
  body {
		color: #ccc;
  	background-image: url('/images/bg-dark.jpg');
	}
	.container {
		background: none !important;
		color: #ccc;
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


	<div class="container">

 		<div class="row">
     			<div class="col-md-12">

		<h1>Hall Of Fame</h1>
		These are the greatest players of Freeciv-web! Each row shows the result of one game.
        <br>

        <table style="width: 100%;">
             <tr>
                <th>Rank:</th>
                <th>Name:</th>
                <th>Nation:</th>
                <th>End turn:</th>
                <th>End date:</th>
                <th title="Score of this player in all games">Score (all):</th>
                <th title="Score of this player in this game">Score:</th>
                <th>Map:</th>
              </tr>
            <c:forEach items="${data}" var="item">
              <tr class="score_row">
                <td title="The rank of the game score compared to other game scores"><c:out value="${item.position}"/></td>
                <td title="Player name"><c:out value="${item.username}"/></td>
                <td title="Nation"><c:out value="${item.nation}"/></td>
                <td style="text-align: right;" title="Turn when the game ended"><c:out value="${item.end_turn}"/></td>
                <td title="Date when the game ended"><c:out value="${item.end_date}"/></td>
                <td style="text-align: right;" title="Score of this player in all games"><c:out value="${item.total_score}"/></td>
                <td style="text-align: right;" title="Score of this player in this game"><c:out value="${item.score}"/></td>
                <td>
                        <a href="/data/mapimgs/<c:out value="${item.id}"/>.gif">
                            <img src="/data/mapimgs/<c:out value="${item.id}"/>.gif" width="70" height="40">
                        </a>
                </td>
              </tr>
            </c:forEach>
        </table>
        <br><br><br>
    			</div>
    		</div>


		<!-- Site footer -->
		<%@include file="/WEB-INF/jsp/fragments/footer.jsp"%>
	</div> <!-- container -->
</body>
</html>
