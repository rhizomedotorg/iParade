var DEBUG = 0;

var tabLinks = new Array();
var tabListItems = new Array();
var contentDivs = new Array();
var contentPage;
var locCheckTimerId = null; // timer ID
var startTabsTimerId = null; // timer ID
var themeAudioPlayer = null;
var voicoverAudioPlayer = null;
var iParades = null;

var remoteContentHub  = "http://produceconsumerobot.com/temp/lovid/";
var remoteContentDir = "http://produceconsumerobot.com/temp/lovid/iparade2/";
var remoteVidBase = "_video";
var remoteVoiceOverBase = "_voiceover";
var remoteAudioThemeBase = "audioTheme";
var remoteCssFilename = "stylesheet.css";
var iParadesFile = "iParades.php";

var localDir = "iParade";
var localVidBase = "iparadeVideo";
var localAudioThemeBase = "iparadeTheme";
var localVoiceoverBase = "iparadeVoiceover";
var localContentDir = null;
var vidExt = ".mp4";
var voiceoverExt = ".mp3";
var audioThemeExt = ".mp3";
var voiceover = true;

var hideTabsTimeout = 2000;
var inTargetVibLen = 200;
var maxTries = 15;
var tryDelay = 1000;

//window.addEventListener ? window.addEventListener("load", init, false) : window.attachEvent && window.attachEvent("onload", init);

// PhoneGap is loaded and it is now safe to make calls to PhoneGap methods
function onDeviceReady() {
    console.log('onDeviceReady()');
    console.log("device=" + device.platform);
    
    checkConnection();
    
	// override the back button on android/blackberry
	document.addEventListener("backbutton", onBackKeyDown, false);
	
	// Start the menubutton listener
	document.addEventListener("menubutton", onMenuKeyDown, false);
	
	// Request the root file system for writing audio/video
	window.requestFileSystem(LocalFileSystem.PERSISTENT, 0, onFileSystemSuccess, onFileSystemFail);
	
	window.onscroll = floater;
	
	startGpsTracking();

	themeAudioPlayer = new AudioPlayer(remoteContentHub + remoteAudioThemeBase + audioThemeExt);
	themeAudioPlayer.looping(true);
	themeAudioPlayer.play();
	
    console.log('onDeviceReady() finished');
}

function getFileSuccess(fileEntry) {
    console.log("getFileSuccess: " + fileEntry.fullPath);
}

function getDirSuccess(dir) {
    console.log("getDirSuccess: " + dir.fullPath);
    localContentDir = dir.fullPath;
    dir.getFile(localVidBase + vidExt, {create: true, exclusive: false}, getFileSuccess, onFileSystemFail);
}

function onFileSystemSuccess(fileSystem) {
	console.log("onFileSystemSuccess()");
    console.log(fileSystem.name);
    console.log(fileSystem.root.name);
    var entry=fileSystem.root; 
    entry.getDirectory(localDir, {create: true, exclusive: false}, getDirSuccess, onFileSystemFail);
}

function onFileSystemFail(evt) {
    console.log(evt.target.error.code);
    window.requestFileSystem(LocalFileSystem.PERSISTENT, 0, onFileSystemSuccess, onFileSystemFail);
}

function checkConnection() {
    console.log('checkConnection()');
    var networkState = navigator.network.connection.type;
    
    console.log('Connection type: ' + networkState);
    
    var states = {};
    states[Connection.UNKNOWN]  = 'Unknown connection';
    states[Connection.ETHERNET] = 'Ethernet connection';
    states[Connection.WIFI]     = 'WiFi connection';
    states[Connection.CELL_2G]  = 'Cell 2G connection';
    states[Connection.CELL_3G]  = 'Cell 3G connection';
    states[Connection.CELL_4G]  = 'Cell 4G connection';
    states[Connection.NONE]     = 'No network connection';
    
    if ((!networkState) || (networkState == Connection.UNKNOWN) ||  (networkState == Connection.NONE)) {
    	//offlineAlert();
    	setTimeout(function() { checkConnection(); }, 1000);
    	return false;
    } else {
    	return true;
    }
    console.log('checkConnection() finished');
}


// Alert to notify user that they are offline
function offlineAlert() {
	console.log("offlineAlert()");
	navigator.notification.alert('You are currently offline.\nPlease connect to the network to continue.');
}

function toggleVoiceover() {
	console.log("toggleVoiceover()");
	voiceover = !voiceover;
	if (!voiceover) {
		console.log("voiceover off");
		if (voicoverAudioPlayer) {
			voicoverAudioPlayer.release();
			voicoverAudioPlayer = null;
		}
		document.getElementById("toggleVoiceoverButton").src = "design/voice_over_off.jpg";
	} else {
		console.log("voiceover on");
		document.getElementById("toggleVoiceoverButton").src = "design/voice_over_on.jpg";
		playVoiceover();
	}
    console.log("toggleVoiceover finished");
}

function mouseDown() {
    console.log("mouseDown()");
	document.getElementById("tabs").style.display="inline";
	startTabsTimer();
}

function onBackKeyDown() {
	// Handle the back button
	console.log("onBackKeyDown()");

	function onConfirm(button) {
		console.log("onConfirm(" + button + ")");
		if (button==1) {
			if (voicoverAudioPlayer) {
				voicoverAudioPlayer.release();
				voicoverAudioPlayer = null;
			}			
			if (themeAudioPlayer) {
				themeAudioPlayer.release();
				themeAudioPlayer = null;
			}
			stopGpsTracking();
			navigator.app.exitApp();
		}
	}

	// Show a custom confirmation dialog
	navigator.notification.confirm(
			'Do you want to quit iParade?',  // message
			onConfirm,              // callback to invoke with index of button pressed
			'Quit iParade?',            // title
			'Quit,Cancel'          // buttonLabels
	);
}

function onMenuKeyDown() {
    // Handle the menu button
	console.log("onMenuKeyDown()");
	document.getElementById("tabs").style.display="inline";
	startTabsTimer();
}

// Shows the tabs for the brief period and then hides them
function startTabsTimer() {
    console.log("startTabsTimer()");
	if (startTabsTimerId != null) {
		clearTimeout(startTabsTimerId);
	}
	startTabsTimerId = setTimeout("hideTabs()", hideTabsTimeout);	
	console.log("startTabsTimer() finished");
}
function hideTabs() {
	console.log("hideTabs()");
	document.getElementById("tabs").style.display="none";
}

// Initializes the page
function init() {
    console.log('init()');
    
	loadCssFile(remoteContentHub + remoteCssFilename);
	
	tabLinks = new Array();
	contentDivs = new Array();
	contentPage = 0;
	locCheckTimerId = null; // timer ID
	startTabsTimerId = null; // timer ID
	my_audio = null;
	audioTimer = null;

	initLocation();
	
	hideTabs();
	
	// Start listener for PhoneGap loaded
	console.log("Adding deviceready listener");
	document.addEventListener("deviceready", onDeviceReady, false);
	
	// Get the home content
	getHomeContent(contentPage);
	
	// Grab the tab links and content divs from the page
	var tabList = document.getElementById('tabs').childNodes;
	for ( var i = 0; i < tabList.length; i++ ) {
		if ( tabList[i].nodeName == "LI" ) {
			var id = getHash( tabList[i].getAttribute('href') );
			tabListItems[id] = tabList[i];
			contentDivs[id] = document.getElementById( id );
			var h = getWindowHeight();
			if (id == 'map') {
				contentDivs[id].style.height = (h - (h*0.06)) + "px";
			} else {
				contentDivs[id].style.height = (h - (h*0.13)) + "px";
			}
		}
	}
	
	// Assign onclick events to the tab links, and
	// highlight the first tab
	var i = 0;

	for ( var id in tabListItems ) {
		tabListItems[id].ontouchend = showTab;
		tabListItems[id].onclick = showTab;
		if ( i == 0 ) tabListItems[id].className = 'selected';
		i++;
	}
	
	// Hide all content divs except the first
	var i = 0;

	for ( var id in contentDivs ) {
		if ( i != 0 ) contentDivs[id].className = 'tabContent hide';
		i++;
	}
    console.log('init() finished');
}

// Show a tab
function showTab(options) {
    console.log('showTab()');
	var selectedId;
		
    if ((typeof options !== "undefined") && (typeof options.id !== "undefined")) {
		selectedId = options.id;
	} else {
		selectedId = getHash( this.getAttribute('href') );
	}
    
	// Highlight the selected tab, and dim all others.
	// Also show the selected content div, and hide all others.
	for ( var id in contentDivs ) {
		//console.log("showTab: IDs: " + id);
		if ( id == selectedId ) {
			tabListItems[id].className = 'selected';
			contentDivs[id].className = 'tabContent';
		} else {
			tabListItems[id].className = '';
			contentDivs[id].className = 'tabContent hide';
		}
	}
	
	if (selectedId == 'map') {
		resizeMap();
		recenterMap();
		if ((contentPage == 0) || (contentPage == 1)) {
			AutoBounds(targetMarkers);
		}
	}

	// Stop the browser following the link
    console.log('showTab() finished');
	return false;
}

function getFirstChildWithTagName( element, tagName ) {
	for ( var i = 0; i < element.childNodes.length; i++ ) {
		if ( element.childNodes[i].nodeName == tagName ) return element.childNodes[i];
	}
}

function getHash( url ) {
	var hashPos = url.lastIndexOf ( '#' );
	return url.substring( hashPos + 1 );
}

// Returns the height of the current window
// ** May need some finesse for different platforms **
function getWindowHeight() {
	var w = 0;
	var w1 = 0;
	var w2 = 0;
	var w3 = 0;
	var w4 = 0;

	if (document.body.clientHeight != null) {
		w1 = document.body.clientHeight;
	}

	if (document.documentElement.clientHeight != null) {
		w2 = document.documentElement.clientHeight;
	}

	if (window.innerHeight != null) {
		w3 = window.innerHeight;
	}
	
	w4 = $(window).height();

	ww = $(window).width();
	
	// enforce landscape
	w = Math.min(w4, ww);

	if ((w == null) || (w == 0)) {
		w = "auto";
	}	
	if (DEBUG > 1)  {
		alert ("h1=" + w1 + ", h2=" + w2 + ", h3=" + w3 + ", h=" + w);
	}
    console.log("h1=" + w1 + ", h2=" + w2 + ", h3=" + w3 + ", h4=" + w4 + ", ww=" + ww + ", h=" + w);
    console.log("getWindowHeight()=" + w);
	return w + "";
}

// Returns the width of the current window
// ** May need some finesse for different platforms **
function getWindowWidth() {
	var w = 0;
	var w1 = 0;
	var w2 = 0;
	var w3 = 0;
	var w4 = 0;
	
	if (document.body.clientWidth != null) {
		w1 = document.body.clientWidth;
	}

	if (document.documentElement.clientWidth != null) {
		w2 = document.documentElement.clientWidth;
	}

	if (window.innerWidth != null) {
		w3 = window.innerWidth;
	}
	
	w4 = $(window).width();
	
	h = $(window).height();

	// enforce landscape
	w = Math.max(w4, h);			

	if ((w == null) || (w == 0)) {
		w = "auto";
	}	
	if (DEBUG > 1)  {
		alert ("w1=" + w1 + ", w2=" + w2 + ", w3=" + w3 + ", w=" + w);
	}
    console.log("w1=" + w1 + ", w2=" + w2 + ", w3=" + w3 + ", w4=" + w4 + ", h=" + h + ", w=" + w);
    console.log("getWindowWidth()=" + w);
	return w + "";
}

// Moves to the next page in the sequence
function nextPage() {
	console.log("nextPage()");
	// If the device isn't online, don't move to the next page
	if (!checkConnection()) {
		offlineAlert();
		return;
	}
	
	// If the device GPS isn't enabled, don't move to the next page
	if (!checkGPS()) {
		badGpsAlert();
		return;
	}
	
	if (voicoverAudioPlayer) {
		voicoverAudioPlayer.release();
		voicoverAudioPlayer = null;
	}			
	if (themeAudioPlayer) {
		themeAudioPlayer.release();
		themeAudioPlayer = null;
	}
    
	contentPage++;
	if ((contentPage > 2) && (contentPage % 2) == 0) {
		incrementTarget();
	}
	getHomeContent(contentPage);
	showTab({"id" : 'home'});
	hideTabs();
    console.log("nextPage finished");
}

function restartApp() {
	console.log("restartApp()");
	// process the confirmation dialog result
    function onConfirm(button) {
        console.log("onConfirm(" + button + ")");
    	if (button==1) {
			if (voicoverAudioPlayer) {
				voicoverAudioPlayer.release();
				voicoverAudioPlayer = null;
			}			
			if (themeAudioPlayer) {
				themeAudioPlayer.release();
				themeAudioPlayer = null;
			}
	    	
            if (navigator.app) {
                navigator.app.loadUrl("file:///android_asset/www/index.html"); 
            } else {
                //window.location = "index.html";
                window.location.reload(true);
            }
    	}
    }
    
    // Show a custom confirmation dialog
    navigator.notification.confirm(
                                   'Do you want to restart iParade?',  // message
                                   onConfirm,              // callback to invoke with index of button pressed
                                   'Restart iParade?',            // title
                                   'Restart,Cancel'          // buttonLabels
                                   );
}

//Returns html for the home tab based on the value of pageNum	
function getHomeContent(pageNum) {
	console.log("getHomeContent(" + pageNum + ")");
	var html = "";
	
	if (pageNum == 0) {
		// startup screen is special
		html = html + "<div id='startScreen' style='margin-top:" + getMarginTop() + "px' >";
		html = html + "<p id='iParadeSearching'>Searching for iParades...</p>";
		html = html + "<img class='fullSplashImage' src='design/splash.gif'/>";
		html = html + "</div>";
		document.getElementById('home').innerHTML = html;
	} else if (pageNum == 1) {
		// First page is special
		html = html + "<div id='textContent' class='paddedContent'></div>";
		html = html + "<div id='playVideoButton'";
		html = html + "</div>";
		setTimeout(function() {if (!audioThemeDownloadComplete) {$("#playVideoButton").html("<img id='downloadingImg' src='design/downloading.gif'/>");}},
				500);
		html = html + getNextButton(false); 
		document.getElementById('home').innerHTML = html;
		loadHtml($("#textContent"), remoteContentDir + "0_text.html");
	} else if (targetNum == (targetLocations.length)) {
		// Last page is special
		html = html + "<div id='textContent' class='paddedContent'></div>";
		document.getElementById('home').innerHTML = html;
		loadHtml($("#textContent"), remoteContentDir + (targetNum + 1) + "_text.html");
		playAudioTheme();
	} else if ((pageNum % 2) == 0) {
		// Between page
		html = html + "<img class='bodyImage' src='" + remoteContentDir + (targetNum + 1) + "_btwImage" + ".jpg' style='margin-top:" + getMarginTop() + "px' />";
		document.getElementById('home').innerHTML = html;
		checkingForTargetLocation = true;
		vidDownloadComplete = false;
		playAudioTheme();
		getVoiceover((targetNum + 1));
		getVideo((targetNum + 1));
		if (fakeGPS) testLocChangeTimer();
	} else {
		// Main content page
		html = html + "<div id='textContent' class='paddedContent'></div>";
		html = html + "<div id='playVideoButton'";
		html = html + "</div>";
		html = html + getNextButton(false);
		document.getElementById('home').innerHTML = html;
		loadHtml($("#textContent"), remoteContentDir + (targetNum + 1) + "_text.html");
		// If the video has already downloaded we don't need to show the downloading gif
		setTimeout(function() {if (!vidDownloadComplete) {$("#playVideoButton").html("<img id='downloadingImg' src='design/downloading.gif'/>");}},
			1000);
		navigator.notification.vibrate(inTargetVibLen);
		if (!voicoverAudioPlayer) { // only play voiceover if it wasn't started already
			playVoiceover();
		}
		displayVidElement();		
	}
	console.log("finishing getHomeContent");
}

function loadHtml(element, url, nthTry) {
	console.log("loadHtml(" + url + ")");
	
	function tryAgain(elem, address, ntry) {
		console.log("tryAgain(" + ntry + ")");
		if (ntry < maxTries) {
			// Wait and try try again...
	        setTimeout(function() { loadHtml(elem, address, ntry);}, ntry*tryDelay/2);
		}
	}
	
	// nthTry keeps track of number of attempts
	if (!nthTry) {
		nthTry = 1;
	} else {
		nthTry++;
	}
	
	element.load(url, function(response, status, xhr) {
		console.log("load response");
		if (status == "error") {
			console.log("load error: " + url);
			tryAgain(element, url, nthTry);	
		}
	});
	
	console.log("loadHtml finished");
}

function getNextButton(visible) {
	console.log("getNextButton(" + visible + ")");
	var nextButton;
	if (visible) {
		nextButton = "<img id='nextButton' src='design/next_arrow.jpg' ontouchstart='nextPage()'/>";
	} else {
		nextButton = "<img id='nextButton' src='design/next_arrow.jpg' ontouchstart='nextPage()' style='visibility:hidden;'/>";
	}
	console.log("returning nextButton");
	return nextButton;
}

function showNextButton(delay) {
    setTimeout(function() { document.getElementById("nextButton").style.visibility="visible"; }, delay);
}

function hideDownloadingImg(delay) {
	setTimeout(function() { $("#downloadingImg").css("display", "none"); }, delay);
}

function displayVidElement() {
	console.log("displayVidElement()");
	if (vidDownloadComplete && !checkingForTargetLocation) {
		console.log("displaying Video element");

		hideDownloadingImg(0);

		console.log("Creating img element");

		var html = "";
		html = html + "<img id='playImg' src='design/play.jpg' ontouchstart='playVideo(); showNextButton(2000);'/>";
		$("#playVideoButton").html(html);
        
	}
    console.log("displayVidElement finished");
}

function loadCssFile(filename) {
	var fileref=document.createElement("link");
	fileref.setAttribute("rel", "stylesheet");
	fileref.setAttribute("type", "text/css");
	fileref.setAttribute("href", filename);
	if (typeof fileref!="undefined") {
		document.getElementsByTagName("head")[0].appendChild(fileref);
	}
}

function getIparades(loc, nthTry) {
	console.log("getIparades(" + loc.latitude + "," + loc.longitude + ")");
	
	function tryAgain(location, ntry) {
		console.log("tryAgain(" + ntry + ")");
		if (ntry < maxTries) {
			// Wait and try try again...
	        setTimeout(function() { getIparades(location, ntry);}, ntry*tryDelay/2);
		}
	}
	
	// If the device isn't online, don't try ajax
	if (!checkConnection()) {
		offlineAlert();
		setTimeout(function() { getIparades(loc, nthTry);}, 5000);
	} else {
	
		// nthTry keeps track of number of attempts
		if (!nthTry) {
			nthTry = 1;
		} else {
			nthTry++;
		}
		
		$.ajax({
	        type : 'POST',
	        url : remoteContentHub + iParadesFile,
	        dataType : 'json',
	        data : {
	          latitude : loc.latitude,
	          longitude : loc.longitude
	        },
	        success : function(data) {
	          // sweet! we win!
	        	iParades = data;
	        	var targets = new Array();
	        	var titles = new Array();
	        	for (var i=0; i<data.length; i++) {
	        		console.log(data[i].name + ": " + data[i].location.latitude + ", " + data[i].location.longitude);
	        		targets[i] = data[i].location;
	        		titles[i] = data[i].name;
	        	}
	        	showIparades();
	        	initializeMap(currentLoc);
	        	setTargetMarkers(targets);
	        	setTargetMarkerInfoWindows(titles);
	        },
	        error : function(data) {
	          console.error("error in getIparades(" + loc.latitude + "," + loc.longitude + ")");
	          tryAgain(loc, nthTry);
	        }
	      });
	}
	
	console.log("getIparades finished");
}

function showIparades() {
	console.log("showIparades()");
	
	var html = "";
	html = html + "<img class='fullSplashImage' src='design/splash.gif'/>";
	html = html + "<div class='iparadeSelectOverlay'>";
	html = html + "<span>Choose an iParade:</span>";
	html = html + "<select id=iParadeSelect>";
	for (var i=0; i<iParades.length; i++) {
		html = html + "<option value='" + i + "' id='select" + i + "' >" + iParades[i].name + "</option>";
	}
	html = html + "</select>";
	html = html + "<img id='splashNextButton' src='design/next_arrow.jpg' ontouchstart='initIparade()'/>";
	html = html + "</div>";
	document.getElementById('startScreen').innerHTML = html;

	console.log("showIparades finished");
}


function initIparade(listNum) {
	console.log("initIparade()");
	if (!listNum) {
		listNum = $("#iParadeSelect option:selected").attr("value");
	}
	
	remoteContentDir = iParades[listNum].url;
	
	loadCssFile(remoteContentDir + remoteCssFilename);
	
	getTargetLocations(currentLoc);
	
	nextPage();
	getAudioTheme();
	
	console.log("initIparade finished");
}

function getMarginTop() {
    console.log("getMarginTop()");
    w = getWindowWidth();
    h = getWindowHeight();
    
    var mt = (h-(w/480*270))/2 + "";
        
    console.log("getMarginTop finished: " + mt);
    
    return mt;
}