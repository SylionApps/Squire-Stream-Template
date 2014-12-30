var express = require("express"),
	util 	= require('util'),
    http    = require("http"),
    request = require("request"),
    argv	= require('minimist')(process.argv.slice(2));

// MOVIES
if (argv.m) {	
	/*
	
	id : movie IMDB code (required)
	link : url or magnet to get movie. Support: youtube, magnet link, torrent, direct URL to video (required)
	
	quality : link quality: 1080p, 720p o 480p (optional)
	seeders : number of seeders if link is a magnet or torrent file (optional)
	size : size del link (optional)
	fileIndex : if the magnet/torrent has several files, should specify the file index into it (optional for torrent or magnet link)
	
	*/
	
	// Select one option and comment the code not used:
	
	
	// MODE 1 : node.js code
	// ---------------------
	
	var movies = [];
	
	// Here must be a console.log() to return JSON.
	console.log(JSON.stringify(movies));
	
	// ----------------------
	
	
	
	// MODE 2 : other languages. External API code (recommended)
	// --------------------------------------------------------
	
	var url = 'ENTER YOUR HTTP HERE';
	
	request(url, function(error, response, html) {
	
		if(!error) {
			console.log(html);
		}
		else {
			var empty = [];
			console.log(JSON.stringify(empty));
		}
	});
	
	// --------------------------------------------------------
}


// EPISODES
if (argv.e) {	
	/*
	
	id : show TVDB code (required)
	link : url or magnet to get episode. Support: youtube, magnet link, torrent, direct URL to video (required)
	season : number of season
	episode : number of episode
	
	quality : link quality: 1080p, 720p o 480p (optional)
	seeders : number of seeders if link is a magnet or torrent file (optional)
	size : size del link (optional)
	fileIndex : if the magnet/torrent has several files, should specify the file index into it (optional for torrent or magnet link)
	
	*/
	
	// Select one option and comment the code not used:
	
	
	// MODE 1 : node.js code
	// ---------------------
	
	var episodes = [];
	
	// Here must be a console.log() to return JSON.
	console.log(JSON.stringify(episodes));
	
	// ----------------------
	
	
	
	// MODE 2 : other languages. External API code (recommended)
	// --------------------------------------------------------
	
	var url = 'ENTER YOUR HTTP HERE';
	
	request(url, function(error, response, html) {
	
		if(!error) {
			console.log(html);
		}
		else {
			var empty = [];
			console.log(JSON.stringify(empty));
		}
	});
	
	// --------------------------------------------------------
}
