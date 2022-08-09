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
    <h1>FCW Privacy Policy</h1>
    <h2>Preferred Privacy Protection Site</h2>
    <h3>FCW is a private gaming community and a private gathering.</h3><br>

    <div>
      <b>Freeciv-Web ("FCW") is a <u>preferred privacy protection site.</u></b> That is, <br>
      1) the data we collect is used only to deliver services the best we can, <br>
      2) your data is not shared with third parties, <br>
      3) we maintain strict privacy protection policies in our <a href="http://www.freecivweb.org/rules">Terms of
      Service</a> and <a href="http://www.freecivweb.org/rules">code of conduct</a> to ensure our users don't violate
      each other's privacy.<br>
    </div>
    <br>
    <div>
      <b>What information does FCW create or collect?</b><br>
      Computers by their nature create information during digital interactions. Information is created:<br>
      1. When you register on our site, the information you used to register with.<br>
      2. If you register on our Discord, the information and messages that are created in those acts.<br>
      3. If you register on our mailing list, the information you submit to that list.<br>
      4. Any data that is created in the act of you playing the game.<br>
    </div>
    <br>
    <div>
      <b>What information is used or reviewed?</b><br>
      1. We review data when you participate in the Discord or participate on our site creating content there.<br>
      2. When registering on our site, you may be asked to enter an e-mail address and username.<br>
      3. Your e-mail address may be verified by Google for use of the website, Discord for use of our discord group,
      and/or verified using a unique consent link. If a link is visited, it would be used to verify that you control the
      e-mail address, and/or that your IP address is not affiliated with malicious sources.<br>
      4. We may retain server logs which include the IP address of every request to our server.<br>
    </div>
    <br>
    <div>
      <b>What do we use your information for?</b><br>
      Any of the information we collect from you may be used in one of the following ways:<br>
      1. To enable the delivery of our services.<br>
      2. To improve our site and user experiences - Information and feedback supplied by users may be used to improve
      the site experience.<br>
      3. To send emails - PBEM games email you when it's your turn. If you subscribe, the Longturn Notification system
      notifies you of upcoming games.<br>
      4. Site security - Server logs may be used in conventional server security operations, identifying and preventing
      malicious sources.<br>
    </div>
    <br>
    <div>
      <b>How do we protect your privacy and/or information?</b><br>
      We implement security measures to maintain the privacy and safety of your personal information.<br>
    </div>
    <br>
    <div>
      <b>What is your data retention policy?</b><br>
      We make a good faith effort to:<br>
      1. Retain server logs containing the IP address of all requests.<br>
      2. Retain the IP addresses associated with registered users and their posts no more than 5 years.<br>
    </div>
    <br>
    <div>
      <b>Does FCW use cookies? If so, what kind?</b><br>
      1. FCW does not use marketing, advertising, or commercial cookies.<br>
      2. FCW does not use reporting/tracking cookies that communicate with our server or third party servers.<br>
      3. FCW uses <i>User Convenience Cookies.</i><br>
      <b>What is a 'User Convenience Cookie?'</b><br>
      User convenience cookies may remember your personal setup preferences you may submit for graphic display options,
      game preferences, and suchlike.<br>
      They may remember your username and password and store it locally in your browser, so that you do not have to
      re-enter this information when re-visiting the site.<br>
      User convenience cookies are not shared with any third parties and are not stored or accessed on our server. They
      are only used by your browser to fill in information you have indicated you would like your browser to remember,
      when interacting with our site. <br>
    </div>
    <br>
    <div>
      <b>Does FCW disclose any information to outside parties?</b><br>
      1. FCW enforces policies against users supplying any information or communications you share within our sphere of
      services, to outside parties.<br>
      2. We do not sell, trade, or otherwise transfer to outside parties your personally identifiable information.<br>
      3. This does not include trusted third parties whose services integrate to our site for the purpose of operating
      our site, conducting our business, or servicing you, so long as the policies of those parties do not violate our
      own privacy policies.<br>
      4. For example, your email address is used during Google_Auth logins that use your gmail account.<br>
      5. We may use or release information when we believe that is appropriate to comply with the law, enforce our site
      policies, or protect ours or others rights, property, or safety.<br>
      6. However, non-personally identifiable visitor information will not be provided to other parties for marketing or
      advertising, without your explicit consent.<br>
    </div>
    <br>
    <div>
      <b>Third party links</b><br>
      Occasionally, at our discretion, we may include or offer third party products or services on our site. These third
      party sites have separate and independent privacy policies. We therefore have no responsibility or liability for
      the content and activities of these linked sites. Nonetheless, we seek to protect the integrity of our site and
      welcome any feedback about these sites.<br>
    </div>
    <br>
    <div>
      <b>Children's Online Privacy Protection Act Compliance</b><br>
      Our site, products and services are all directed to people who are at least 13 years old or older. If you are
      under the age of 13, per the requirements of COPPA (Children's Online Privacy Protection Act), do not use this
      site without parental supervision.<br>
    </div>
    <br>
    <div>
      <b>Online Privacy Policy Only</b><br>
      This online privacy policy applies only to information collected through our site and services and not to
      information collected outside of such.<br>
    </div>
    <br>
    <div>
      <b>Your Consent</b><br>
      By using our site and other services, you consent to our service-wide Privacy Policy and <a
      href="http://www.freecivweb.org/rules">Terms of Service</a>.<br>
    </div>
    <br>
    <div>
      <b>User Privacy Obligations</b><br>
      Community members (Users) who partake in the private gathering of FCW are bound by the Terms of Service which
      contain restrictions on what actions users may take with respect to each other's privacy.<br>
      Please review the Terms of Service for further information on user privacy obligations.<br>
    </div>
    <br>
    <div>
      <b>Changes to our Privacy Policy</b><br>
      If we decide to change our privacy policy, we will post those changes on this page.<br>
    </div>
    <br><br><br>
    <!-- Site footer -->
    <%@include file="/WEB-INF/jsp/fragments/footer.jsp" %>
  </div> <!-- container -->
</div>
</body>
</html>
