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
		font-family: 'Freeciv', 'Segoe UI';
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
	<%@include file="/WEB-INF/jsp/fragments/header.jsp" %>


<div class="container">
    <h2>In-game Rules</h2>
    <div style="font-size:110%">
    <b>1.</b> Idle players may lose their nation.<br>
    <b>2.</b> Victory conditions may be set by the Gamemaster (<b>GM</b>) at the start of the game.<br>
    <i><u><b style="color:#85AFAF">Customary practices</b></u> preserve integrity and the spirit of game:</i><br>
    <b>3.</b> Delegation should be short and infrequent. Use it only as needed for game integrity*<br>
    <b>4.</b> Allow players to take their turns in peace: No RTS, if requested*<br>
    <b>5.</b> No camping.<br>
    <b>6.</b> Never declare victory for anyone but yourself. Your surrender is not a surrender for anyone else.<br>
    <b>7.</b> Players may request longer turns in the late game.<br>
    <b>8.</b> GM may make settings corrections in the early game.<br>
    <b>9.</b> Multiple players in the same household are not allowed without prior GM approval.<br>
    <b>10.</b> When the game ends, screenshots and story lines should be shared among players.<br>
    <br>
  </div>
  <h2><span style="color:#fff">Clarifications to In-game Rules:</span></h2>
  <div style="font-size:100%">
    <b>1. Idle players may lose their nation</b> after 2 idle turns on <b>Turns 1-5</b>, &nbsp; <b>Turn 6:</b> idle 3 turns &nbsp; 
    <b>T20:</b> idle 4,  &nbsp; <b>T25:</b> idle 5, &nbsp; <b>T30:</b> idle 6, &nbsp; <b>T35:</b> idle 7<br><br>
    <b>2.</b> At game start, GM may customize the victory conditions documented in the ruleset and the <u>game settings</u>.<br><br>
    <b>3. Delegation's purpose is to maximize game integrity.</b><br>
    &bull; <b>Delegation is good when...</b><br>
    &nbsp;&nbsp;&bull;&bull; (a) it lets a nation make self-interested rational moves at the right times, when it could not otherwise.<br>
    &nbsp;&nbsp;&bull;&bull; (b) an idle nation would unfairly affect game outcome.<br>
    &bull; <b>Delegation is bad when...</b><br>
    &nbsp;&nbsp;&bull;&bull; it lasts longer than a week with no attempt made for a replacement.<br>
    &nbsp;&nbsp;&bull;&bull; A more experienced player micro-manages moves for a less experienced player (instead of advising them).<br>
    &nbsp;&nbsp;&bull;&bull; It's any situation where common sense shows it is unfair or degrades game integrity.<br>
    &bull; Delegations can't be done before turn 3<br>
    &bull; One delegation per player is allowed.<br>
    &bull; Long-term delegations can be approved by the Gamemaster (GM).<br>
    &bull; Complaints may be made to the GM. GM judgments may be contextual, flexible. GM judgments are final.<br><br>
    <b>4. No RTS, if requested.</b> <i><small>Real-time strategy ("RTS") is simultaneous military moves taken by both players in the same theatre of battle.</small></i><br>
    &bull; In general (with exceptions*) players should be allowed to take their turns in peace without RTS.<br> 
    &bull; It is encouraged to be sensitive to this even when a player does NOT make a No-RTS-request.<br> 
    &bull; In the case of a No-RTS-request, the request should be obeyed unless under one of the exceptions.<br>
    &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; &nbsp; * &nbsp;Units on an automated GOTO action that are delayed by UWT, are not RTS.<br>
    &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; &nbsp; ** Units on vigil are not considered RTS.<br>
    &bull; Players who are online longer are EXPECTED to be MORE tolerant of No-RTS-requests, and the GM should consider this in their decisions.<br>
    &bull; Yield to players who cannot log in multiple times per day, especially if you are online longer than them.<br>
    <b>There are key times when <u>RTS is expected, allowed, and necessary.</u></b><br>
    <a href="https://static.wikia.nocookie.net/freecivweb/images/e/ee/RTS_chart.png/revision/latest?cb=20230726172842" target="_blank">Click here for RTS timing chart</a><br>
    Players may deny No-RTS-requests:</i><br>
    &nbsp;&nbsp;&bull;&bull; <b>One hour BEFORE and AFTER a Turn Change.</b><br>
    &nbsp;&nbsp;&bull;&bull; <b>Ten hours after Turn Change, for one hour (after all UWT expires)</b>.<br>
    &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; &nbsp; * <small>UWT = unitwaittime. For more info, type: /help unitwaittime</small><br>
    &nbsp;&nbsp;&bull;&bull; <b>When there is 11h on the turn timer, for one hour.</b> (One hour BEFORE movements incur UWT next turn.)<br>
    &nbsp;&nbsp;&bull;&bull; <b>During "Mexican Standoff"</b> -- whoever would request "No RTS" first would gain major advantage over the other:<br>
    &nbsp;&nbsp;&nbsp;&nbsp;&bull;&bull;&bull; The Mexican Standoff rule should be used: (1) as little as possible, (2) not for minor situations.<br>
    &nbsp;&nbsp;&nbsp;&nbsp;&bull;&bull;&bull; In Mexican Standoff, players should negotiate to (a) come to their own agreement, OR (b) confirm an agreement to do RTS, OR (c) agree to alternate 1 (or 2) moves at a time, OR (d) stop moving and await GM moderation.<br>
    &nbsp;&nbsp;&nbsp;&nbsp;&bull;&bull;&bull; NO PLAYER may take unilateral advantage during a Mexican Standoff, without (a),(b),(c), or (d) in place. CONFIRM and COMMUNICATE.<br>
    &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&bull;&bull;&bull;&bull; Violation of the above allows the other player to seek compensatory justice though moderation.<br> 
    &bull; After T100 or the discovery of Flight, rules are slightly relaxed in favor of the one who wishes to RTS, especially if:<br>
    &nbsp;&nbsp;&bull;&bull; ...Air unit actions would result in major swaying of outcome due to aircrafts' &bull;mobility, &bull;ZOC, &bull;iPillage, &bull;strong military power in influencing outcomes.<br>
    <b>5. No camping.</b><br>
    &bull; A player should not be online for most the day. Remaining online all day is unfair to everyone else.<br><br>
    <b>6. NEVER declare victory for anyone but yourself.</b><br>
    &bull; Players are unaware of all game events. Your alliance may be defeated and feel your surrender means victory for your enemies, but perhaps the opposing alliance is about to splinter or a small nation secretly built a large nuclear arsenal. You may declare victory for yourself or your own alliance only. Surrender does not equate to a victory declaration for others. Do NOT declare someone else's victory. <br><br>
    <b>7. Turn timer is typically extended in the late game</b> of longturn games. (25 hours, 35h, 37h, or 47h).<br>
    &bull;  This meets the needs of players who have successfully grown large nations. <br>
    &bull;  Turn length extension will be decided by the GM after the first active player makes a public request. Generally,<br>
    &bull; &bull; After Turn 60, a 25h extension would be acceptable.<br>
    &bull; &bull; After turn 100, an extension to 35h or 37h turns is common practice.<br>
    &bull; &bull; 47h turns could judiciously be decided for very late game, very large nation(s), or any other conditions that help game integrity.<br>
    &bull; A minority of players may need longer turns and be given them, in order that ALL players have time to play correctly.<br><br>
    <b>8.</b> For obvious settings errors, a Gamemaster (GM) can fix any such settings before T10 provided they do not affect any player and provided the GM fully announces such changes, giving at least 1 turn notice before making the change. Exception: announcing creates an exploit, in which case the GM may elect not to give notice (but must inform those members of the admin council who are non-players in the game.)<br><br>
    <b>9.</b> Regarding multiple players in the same household OR sharing the same device:  The GM can approve such cases if asked privately in advance of you joining the game; otherwise it is forbidden. Gamemaster decision will be final. GM may make special rules for allowing the case, like: making all players aware of it, or forbidding alliance between the two players. <br><br>
    <b>10.</b> Most of the game's events are an unknown mystery. Players deserve to know what other players thought and did. Please share your contribution to world history when the game finishes! Hint: use your private discord channels to collect these stories as the game progresses.<br> <br>
  </div>
</div>
<div class="container">
  <h1>Community Rules and Terms of Service</h1>
  <h2>General Rules for Site, Server, and Discord</h2>
  <b>FCW is a private gaming community. By playing in it, you accept membership in the commmunity and represent that you will abide by the following rules:</b><br>
  <div style="font-size:110%">
  1. Be polite. (Be nice.)<br> 
  2. Don't cheat.<br>
  3. Keep in-game conflicts in-the-game. <br>
  4. No ASSHATS: <b>a</b>buse, <b>s</b>pam, <b>s</b>lander, <b>h</b>arrassment, <b>a</b>ntagonism, <b>t</b>hreats, <b>s</b>edition; and similar ilk. <br>
  5. Don't promote, spam, recruit, or link to other servers and sites.<br>
  6. Compare or politick against servers or sites somewhere else.<br>
  7. Constructive ideas are welcome. Directly or indirectly disparaging the site or its members is not.<br>
  8. Do religious or political discussions somewhere else.<br>
  9. Grievances, suspicions, accusations, or appeals that impugn a player/admin/GM must be procedurally handled in private. FCW protects the presumed innocence of the parties involved.<br>
  10. Private DMs require FCW Discord or FCW Game Server to bridge them and thus fall under these rules.<br>
  11. FCW is a private gathering and not a public square. Speech is regulated. Keep speech and conduct appropriate. <br>
  12. Information, communications, and content that take place within the FCW private gathering may not be shared or distributed offsite without permission.
  <br><br>
  <b>Clarification:</b>
</div>
<div style="font-size:100%">
  <b>1. Be nice.</b><br>
  &bull; This is FCW's golden Meta-rule. Every other rule is subordinate to this one, a mere detail and explanation of this one.
   Remember this one and there's a lot less to memorize!<br><br>
  2. <b>Don't cheat:</b><br>
  &bull; No multi-accounts: Do not play multiple accounts within the same game.<br>
  &bull; Hacking is cheating: Browser hacking, dev-console hacking, packet hacking, server hacking, and any other form of hacking.<br>
  &bull; Information, actions, or access not commonly available through normal use of the game's interface is competitive inequality, which means it's cheating.<br><br>
  3. <b>Keep in-game conflicts in-the-game.</b> <br>
  &bull; Remember, your enemy may be your ally in a future game.<br>
  &nbsp;&nbsp;&bull;&bull; Creating a lasting grudge may disadvantage your nation in future games.<br>
  &bull; Impoliteness may be role-played:<br>
  &nbsp;&nbsp;&bull;&bull; IMPOLITENESS MUST BE IMPERSONAL: not directly affront the human behind the player. <br>
  &nbsp;&nbsp;&bull;&bull; Rudeness, arrogance, power-tripping, and conflictive communications should be role-played:<br>
  &nbsp;&nbsp;&bull;&bull; Represent yourself as your country's fictional leader.<br>
  &nbsp;&nbsp;&bull;&bull; Address other players as their country's fictional leader. **Third person pronouns are advisable.** <br>
  &nbsp;&nbsp;&bull;&bull; INCORRECT: "You're a lying warmonger, asshole, and I'm going to crush you, pathetic loser!"<br>
  &nbsp;&nbsp;&bull;&bull; CORRECT: "The Mongol nation and its leader are lying warmongers, pathetic losers who deserve to be crushed by the Swiss!"<br><br>
  4. No <b>ASSHATS</b>.<br> 
  &bull; NO <u>A</u>buse, <u>S</u>pam, <u>S</u>lander, <u>H</u>arrassment, <u>A</u>ntagonism, <u>T</u>hreats, <u>S</u>edition; no rabble-rowsing, psychoaggression.<br>
  &bull; Abrasive or disrespectful actions should be limited. Hateful interactions shouldn't happen.<br> 
  &bull; Interactions deemed unusually dishonorable or lacking sportsmanship; especially if leveraging this to impact outcome in an unnatural or irregular way.<br> 
  &bull; Preserve the game entertainment ambience by keeping in-game chat relative to the in-game play of your player-nation.<br>
  &bull; ASSHATing that affects game outcome or integrity may be punished or corrected by the GM. <br>
  &bull; Keep in-game psycho-aggression/manipulation, psy-ops, gaslighting, mindwarps, dishonesty: a) fictional/role-played: NOT between humans, b) short in duration and frequency, c) lightly done <br>
  &bull; Non-sporting or "meta-game dishonesty" is considered ASSHAT: e.g., informing someone you won't RTS then doing so, misinforming human players of external out-of-game facts/conditions for an in-game advantage, etc.<br>
  &bull; NO: Sharing/screenshotting private conversations without permission, doxxing, violating Privacy Policy of FCW ecosystem. <br>
  &bull; Off-site links except to a rules question, are forbidden from in-game chat.<br>
  &bull; Drowning community discussion in Discord by posting many more messages than anyone is bad form: let others give their views. <br>
  &bull; NO using, directing, incorporating from another person or "bot" as the agent for violating any site rules.<br><br>
  5. FCW is a safe space, free from public or private promoting, recruiting, or poaching to other sites. Ask admin permission.<br><br>
  6. FCW is not the appropriate forum for comparison or politicking for or against servers or sites.<br><br>
  7. All constructive ideas and contributions are welcome.<br>
  &bull; Politicking against the site or its members can be freely done in locations other than FCW.<br><br>
  8. Religious and political discussions are encouraged in locations other than FCW. Such discussions may be deleted from FCW.<br><br>
  9. <b>Grievances, accusations, or appeals in private.</b><br>
  &bull; Humans have suspicions, sometimes false accusations, some even have slander or reputational injury as their motive. To protect against a 
  player, admin, or GM publicly and wrongly suffering degraded reputation: you MUST do accusations, complaints, infraction reports, and similar actions in PRIVATE. Report to an appropriate GM/moderator/admin. You have a right 
  to a private hearing and to appeal decisions to other admins/moderators/GMs, but the process from start to finish must be handled in private if 
  any content in the complaint either directly, indirectly, or implicitly, impugns, accuses, or maligns FCW, its players, admins, GMs, or moderators.<br><br>
  10. Private DMs must abide by community rules when those DMs were bridged by mutual belonging to FCW Discord or the FCW Game Server which make those communications possible. Private complaints about DMs to other members will be treated the same as if they had been made in public, if those DMs were bridged or conveyed by a FCW server. <br><br>
  11. FCW is not a public square with guaranteed free speech. It is more like a friend's house party. You are not welcome if you break the party's rules.<br><br>
  12. <b>What happens at FCW stays at FCW</b>:  FCW is a Preferred Privacy Protection site. What users do at FCW is privacy protected. <b>Users may not distribute other users' content, information, or communications outside of the FCW services.</b> Do not screenshot, copy-paste, relay, report, journalize, log, transliterate, translate, or otherwise convey information, communications, or Private Identity Data, within the FCW services to anywhere outside the FCW privacy sphere, without first obtaining permission. Violation of this policy means you are no longer deemed to be an authorized user of our site.<br>
  &bull; <b>General sharing permission is granted by default:</b> for in-game experiences available from the perspective of the nation you play in-game (so long as it does not violate another user's private content.)<br><br>
</div>
<div>
<h2>Disputes, Issues, and Moderation:</h2>  
<i>Be polite, Be nice</i> is the meta-rule of the site. It is a catch-all against all incivility and inappropriate conduct not listed here.<br><br>
<i>"Who is the injured party and how injured are they?"</i> is the Prime Measure for deciding all adjudication.<br><br>
<i>GRIEVANCES may be briefly raised in public</i> <u>IF THEY DO NOT <b>IMPUGN</b> in public</u>, and will be procedurally moderated out of public.</i><br><br>
&bull; Impugning a player, admin, admin decision, the site, or creating public drama that's not in a fun entertainment ambience of gaming, is forbidden. Ask for moderation and appeals in private. <br>

</div>  

  <br>
  <b>FCW may alter these rules over time. This takes place after admin consultations and such changes will be posted on our Discord #rules channel.</b>
  <br>
  <br>
		<!-- Site footer -->
		<%@include file="/WEB-INF/jsp/fragments/footer.jsp"%>
	</div> <!-- container -->
</body>
</html>
