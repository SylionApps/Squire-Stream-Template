var Q       = require('Q'),
	express = require("express"),
	util 	= require('util'),
    http    = require("http"),
    request = require("request"),
    argv	= require('minimist')(process.argv.slice(2));

// EPISODES
if (argv.e) {
	/*

	showTVDB : show TVDB code (required)
	link 	 : url or magnet to get episode. Support: youtube, magnet link, torrent, direct URL to video (required)
	season 	 : number of season
	episode  : number of episode

	quality  : link quality: 1080p, 720p o 480p (optional)
	seeders  : number of seeders if link is a magnet or torrent file (optional)
	size 	 : size del link (optional)

	*/

	// Variables
	// --------------------------------------------------------

	var quality = '720p'; // 1080p, 720p, 480p, 0
	var numberOfPages = 15; // has to be between 1 and 18
	var apiEndpoint = "http://eztvapi.re/";
	var apiEndpointShow = 'show/';
	var apiEndpointShows = 'shows/';

	// --------------------------------------------------------

	var callApi = function(url) {
		var deferred = Q.defer();
		request(url, function(error, response, html) {
			if(!error) {
				deferred.resolve(html);
			} else {
				deferred.reject(new Error(error));
			}
		});
		return deferred.promise;
	};

	var imdb_ids = [];
	var episodes = [];

	// get the desired pages
	callApi(apiEndpoint + apiEndpointShows).then(function(showPages) {
		var pages = JSON.parse(showPages).splice(0, numberOfPages);
		pages.forEach(function(showPage, i) {
			// get all the imdb ids
			callApi(apiEndpoint + showPage).then(function(showsOfOnePage) {
				JSON.parse(showsOfOnePage).forEach(function(show, j) {
					imdb_ids.push( show.imdb_id );
					if (pages.length-1 === i && JSON.parse(showsOfOnePage).length-1 === j) {
						imdb_ids.forEach(function(imdb_id, k) {
							// get all the magnet links
							callApi(apiEndpoint + apiEndpointShow + imdb_id).then(function(show) {
								JSON.parse(show).episodes.forEach(function(episode, l) {
									if (episode.torrents.hasOwnProperty(quality)) {
										episodes.push({
											showTVDB: JSON.parse(show).tvdb_id,
											link: episode.torrents[quality].url,
											season: episode.season,
											episode: episode.episode,
											quality: quality
											// seeders: episode.torrents[quality].seeds
										});
									}
									if (imdb_ids.length-1 === k && JSON.parse(show).episodes.length-1 === l) {
										console.log(JSON.stringify(episodes));
									}
								});
							});
						});
					}
				});
			});
		});
	});
}
