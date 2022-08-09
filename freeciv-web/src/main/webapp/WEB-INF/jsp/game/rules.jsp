<%@ taglib prefix="c" uri="http://java.sun.com/jsp/jstl/core" %>
<%@ taglib prefix="fn" uri="http://java.sun.com/jsp/jstl/functions" %>
<%@ taglib prefix="fmt" uri="http://java.sun.com/jsp/jstl/fmt" %>

<%@ include file="/WEB-INF/jsp/fragments/i18n.jsp" %>
<!DOCTYPE html>
<html lang="en">
<head>
  <%@include file="/WEB-INF/jsp/fragments/head.jsp" %>

  <!-- Bootstrap core CSS -->
  <link rel="stylesheet" href="/css/morris.css"/>
  <script src="/javascript/libs/raphael-min.js"></script>
  <script src="/javascript/libs/morris.min.js"></script>
  <style>
    @font-face {
      font-family: Cinzel;
      src: url("/fonts/cinzel.variable.woff2") format("woff2"), url("/fonts/cinzel.variable.ttf") format("ttf");
    }

    .input-group .form-control:first-child {
      background: #000;
      color: #ccc;
      border-color: #444;
      border-radius: 6px 0 0 6px;
    }

    .input-group-btn:last-child > .btn, .input-group-btn:last-child > .btn-group {
      background: #444;
      color: #000;
      border-color: #444;
      text-shadow: 1px 1px #888;
    }

    .navbar-inverse {
      background: #2220 url(/images/bg-med-dark.jpg);
    }

    a {
      text-shadow: 1px 1px #000;
    }

    h1, h2, h3, h4, h5, h6 {
      font-family: Cinzel, 'Segoe UI', serif;
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
  </style>

</head>
<body>
<%@include file="/WEB-INF/jsp/fragments/header.jsp" %>


<div class="container">

  <div class="container">
    <h1>Community Rules, Game Rules. and Terms of Service</h1>
    <h2>General Rules for Site, Server, and Discord</h2>
    <b>FCW is a private gaming community. By playing in it, you accept membership in the commmunity and represent that
      you will abide by the following rules:</b><br>
    <div style="font-size:110%">
      1. Be polite.<br>
      2. Don't cheat.<br>
      3. Keep in-game conflicts in-the-game. <br>
      4. No abuse, spam, harrassment, doxxing, personal threats. <br>
      5. Don't promote, spam, recruit, or link to other servers and sites.<br>
      6. Compare or politick against servers or sites somewhere else.<br>
      7. Constructive ideas are welcome. Directly or indirectly disparaging the site or its members is not.<br>
      8. Do religious or political discussions somewhere else.<br>
      9. Private DMs require FCW Discord or FCW Game Server to bridge them and thus fall under these rules.<br>
      10. FCW is a private gathering and not a public square. Keep speech and conduct appropriate. <br>
      11. Information, communications, and content that take place within the FCW private gathering may not be shared or
      distributed offsite without permission.
      <br>
      <b>Clarification:</b>
    </div>
    <div style="font-size:85%">
      1. Be polite: This is rule #1 for a reason. We take it very seriously. It covers a lot but is easy enough to
      follow: be nice. You cannot politely harrass, threaten, DOX, copy-paste someone's content off-site without
      permission, violate privacy, etc. If you're not sure, ask.<br>
      2.1. No multi-accounts.<br>
      2.2. Browser hacking, console hacking, packet hacking, server hacking, and any other form of hacking is 100%
      considered as cheating.<br>
      2.3. Information, actions, or access not commonly available through normal use of the game's interface is
      competitive inequality. At Freeciv-web this is considered cheating without exception.<br>
      3. Keep in-game conflicts in-the-game. <br>
      3.1 Remember, your enemy may be your ally in a future game. <br>
      3.2. You may role play impolite hostility in-game if you represent yourself as your country's fictional leader and
      do the same for the person you are speaking about. e.g. "The Oldenburgian nation are lying warmongers and cannot
      be trusted" is acceptable. <br>
      4. No abuse, spam, harrassment. This includes but is not limited to, using another person or "bot" as the agent
      for violating any site rules.<br>
      4.1 Offsite links are almost always spam. Within reason, preserve the game entertainment ambience by keeping
      in-game chat relative to the in-game play of your player-nation.<br>
      4.2 Dominating a community discussion in Discord by simply posting many more messages than anyone is also bad
      form, let others give their views. <br>
      5. FCW is not the appropriate forum for publicly or privately promoting, recruiting, or poaching to other servers
      or sites. Ask admin permission.<br>
      6. FCW is not the appropriate forum for comparison or politicking for or against servers or sites.<br>
      7. All constructive ideas and contributions are welcome. Politicking against the site or its members can be freely
      done in locations other than FCW.<br>
      8. Religious and political discussions are encouraged in locations other than FCW. Such discussions may be deleted
      from FCW.<br>
      9. Private DMs must abide by community rules when those DMs were bridged by mutual belonging to FCW Discord or the
      FCW Game Server which make those communications possible. Private complaints about DMs to other members will be
      treated the same as if they had been made in public, if those DMs were bridged or conveyed by a FCW server. <br>
      10. FCW is not a public square with guaranteed free speech. It is more like a friend's house party where you are
      expected to be nice and enjoy the offerings. We reserve the right to remove posts and ensure posted material is
      not potentially harmful. As supporters of freedom of speech in general, we exercise these rights carefully with an
      administrator audit trail and try to mamimize the good spirits of the house party.<br>
      11. What happens at FCW stays at FCW: FCW is a private party gathering, our strict Privacy Policy represents to
      our users that what they do at FCW takes place in a private gathering on a Preferred Privacy Protection site.
      Users need not react to, nor concern themselves about distribution of their information or communications outside
      of the FCW services. Do not screenshot, copy-paste, relay, report, journalize, log, transliterate, translate, or
      otherwise convey information, communications, or any form of Private Identity Data, within the FCW services to
      anywhere outside the FCW privacy sphere, without first obtaining permission. Violation of this policy means you
      are no longer deemed to be an authorized user of our site. Private Identity Data includes but is not limited to
      real name, address, location, nationality, telephone or digital contact information, and so on.<br>
      11a. General sharing permission is already granted by default, for game experiences available from the perspective
      of the nation you play in any game, and any message you make that does not interact with or imply or help infer,
      another user's private content.<br>
    </div>

    <h2>In-game Rules</h2>
    <div style="font-size:110%">
      11. Idle players may lose their nation.<br>
      12. You may request account deletion at any time.<br>
      13. Delegation should be a last resort, should not last too long, nor happen too frequently.<br>
      14. Victory conditions are set by the Gamemaster (GM) at the start.<br>
      14a. Don't declare victory for anyone but yourself. Your surrender is not a surrender for everyone else.<br>
      15. Customary practices which are not rules, but are generally accepted:<br>
      15.1 Turn length extension in the late game<br>
      15.2 Game settings error correction in the early game (at gamesmaster discretion)<br>
      15.3 Sharing of screenshots and story lines at the conclusion of a game<br>
      15.4 Victory conditions, unless specified to be different by game master before game start, are:<br>
      15.4a A player, or an alliance, kills all other players, or all other players surrender<br>
      15.4b If space race is on, a player lands on alpha centauri<br>
      15.4c A player, or group of players make a statement about how the game should end, that goes uncontested for 72
      hours (or two turns, whichever is longer)<br>
      16. Allow players to take their turns in peace <br>
      16.1 No camping. No RTS (when requested)<br>
      <br>
      <b>Clarification:</b>
    </div>
    <div style="font-size:85%">
      11. Idle players can lose their nations on: turns 1-13: idle 3 turns; turns 14,15,16: idle 4,5,6 turns; turns
      17,18,19: 7,8,9 turns. turn 20 onward: 10 turns. <br>
      12. Players are allowed to ask for account deletion to change their name, to prevent the same feuds and alliances
      in every game or for other data protection reasons. <br>
      13. Delegation should be a last resort, should not last too long, nor happen too frequently. GM will arbitrate
      complaints.<br>
      13.1 One delegation per player is allowed, only if the delegate plans to come back, and only up to a week without
      special permission <br>
      13.2 Long-term delegations can be approved by the Gamemaster (GM).<br>
      13.3 Delegations can't be done before turn 3<br>
      14. Victory conditions are set by the Gamemaster (GM) at the start. When they are met, the game ends. Unless the
      GM specified against at the outset, scores are published <br>
      14a. Players are unaware of all game events. Your alliance may be defeated and feel your surrender means victory
      for your enemies, but perhaps the opposing alliance is about to splinter or a small nation secretly built a large
      nuclear arsenal. You may declare victory for yourself or your own alliance only. Surrender does not equate to a
      victory declaration for others. Do NOT declare someone else's victory. <br>
      15. Customary practices which are not rules, but are generally expected and accepted:<br>
      15.1 FCW typically extends turn length in the late game of longturn games. (25h, 35h, 37h, or 47h). This meets the
      needs of players who have successfully grown large nations. Turn length extension will be decided on a case by
      case basis by the GM who will make a judgement based on their discretion, after the first active player makes a
      public request. For example, generally, after turn 100, an extension to 35h turns is common practice.<br>
      15.2 For obvious settings errors, a Gamemaster (GM) can fix any such settings before T10 provided they do not
      affect any player and provided the GM fully announces such changes, giving at least 1 turn notice before making
      the change. Exception: announcing creates an exploit, in which case the GM may elect not to give notice (but must
      inform those members of the admin council who are non-players in the game.)<br>
      16. Allow players to take their turns in peace. This includes respecting requests not to RTS. RTS is to be
      expected at turn change, just prior to turn change, and at unitwaittime before and after turn change. All other
      times, RTS is not allowed if a player requests to take their turn in peace.<br>
      16.1 No camping. A player should not be online for most the day. Remaining online all day is unfair to everyone
      else. <br>
      16.1a Rule 16.1 is relaxed after turn 100 in games or upon discovery of Flight (whichever comes sooner), until a
      fix for large nations is in place. Gamemaster discretion is final, if players are in dispute.<br>
      17. Regarding multiple players in the same household or sharing the same device: The Gamemaster for a particular
      game can approve such cases if asked privately in advance of you joining the game; otherwise it is forbidden.
      Gamemaster decision will be final, and GM may make special rules for allowing the case like making all players
      aware of it, or forbidding alliance between the two players. <br>
    </div>

    <br>
    <b>FCW may alter these rules over time. This takes place after admin consultations and such changes will be posted
      on our Discord #rules channel.</b>
    <br>
    <br>
    <!-- Site footer -->
    <%@include file="/WEB-INF/jsp/fragments/footer.jsp" %>
  </div> <!-- container -->
</div>
</body>
</html>
