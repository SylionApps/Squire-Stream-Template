/* jshint node: true */
'use strict';

var express = require('express');
var request = require('request');
var http = require('http');
var util = require('util');
var argv = require('minimist')(process.argv.slice(2));
var Q = require('Q');

// EPISODES
if (argv.e) {
    /*
    id:         show TVDB code (required)
    link:       url or magnet to get episode. Support: youtube, magnet link,
                torrent, direct URL to video (required)
    season:     number of season
    episode:    number of episode
    
    quality:    1080p, 720p or 480p (optional)
    seeders:    number of seeders if link is a magnet or torrent file (optional)
    size:       size of the medium (optional)
    fileIndex:  if the magnet/torrent has several files, should specify
                the file index into it (optional for torrent or magnet link)
    */

	// Variables
	// --------------------------------------------------------
	var quality = '1080p';
	var numberOfPages = 10; // Between 1 and 18.
	var apiEndpoint = 'http://fr.api.ptn.pm/';
    var apiEndpointShow = 'show/';
    var apiEndpointShows = 'shows/';
    // --------------------------------------------------------

    // helpers
    var callApi = function(url) {
        // more about `Q.nfcall`: https://github.com/kriskowal/q#adapting-node
        return Q.nfcall(request, url).then(function(result) {
            return JSON.parse(result[1]);
        });
    };

    Q.
        fcall(function getShowURLs() {
            var url = apiEndpoint + apiEndpointShows;
            return callApi(url);
        }).
        then(function getShowsSummary(urls) {
            // delete unnecessary items
            urls.splice(numberOfPages);

            var apiCalls = urls.map(function(oneUrl) {
                var url = apiEndpoint + oneUrl;
                return callApi(url);
            });
            return Q.all(apiCalls);
        }).
        then(function getShowsData(summaries) {
            var imdbIDs = summaries.
                reduce(function mergePages(soFar, current) {
                    return soFar.concat(current);
                }, []).
                map(function getTheImdbID(oneSummary) {
                    return oneSummary.imdb_id;
                });

            var apiCalls = imdbIDs.map(function(oneLink) {
                var url = apiEndpoint + apiEndpointShow + oneLink;
                return callApi(url);
            });
            return Q.all(apiCalls);
        }).
        then(function processData(shows) {
            var episodes = shows.
                map(function(oneShow) {
                    return oneShow.episodes.
                        filter(function removeBadQualities(oneEpisode) {
                            return oneEpisode.torrents.hasOwnProperty(quality);
                        }).
                        map(function formatTheData(oneEpisode) {
                            return {
                                id: oneShow.tvdb_id,
                                link: oneEpisode.torrents[quality].url,
                                season: oneEpisode.season,
                                episode: oneEpisode.episode,
                                quality: quality
                                // seeders: oneEpisode.torrents[quality].seeds
                                // eztv api always return with 0 seeders so
                                // it is useless in this case
                            };
                        });
                }).
                reduce(function mergeShows(soFar, current) {
                    return soFar.concat(current);
                }, []);
            console.log(JSON.stringify(episodes));
        }).
        catch(function() {
            // on error print out an empty array
            console.log(JSON.stringify([]));
        });
}
