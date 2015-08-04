/* jshint node: true */
'use strict';

var express = require('express');
var request = require('request');
var http = require('http');
var util = require('util');
var argv = require('minimist')(process.argv.slice(2));
if (!('Promise' in process)) {
    var Promise = require('promise-polyfill');
}

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
	var qualities = [ '2160p', '1080p', '720p', '480p', '0' ];
	var apiEndpoint = 'http://fr.api.ptn.pm/';
    // --------------------------------------------------------

    // helpers
    var callApi = function(url) {
        return new Promise(function(resolve, reject) {
            request.get(url, function(error, response, body) {
                if (!error && response.statusCode === 200) {
                    var result;
                    try {
                        result = JSON.parse(body);
                    } catch(e) {
                        resolve([]);
                    }
                    resolve(result);
                } else {
                    resolve([]);
                }
            });
        });
    };

    callApi(apiEndpoint + 'shows').
        then(function getPageUrls(pageUrls) {
            return Promise.all(
                pageUrls.map(function(onePageUrl) {
                    return callApi(apiEndpoint + onePageUrl);
                })
            );
        }).
        then(function fetchPageUrls(shows) {
            return Promise.all(
                Array.prototype.concat.apply([], shows).map(function(oneShow) {
                        return callApi(apiEndpoint + 'show/' + oneShow._id);
                    }
                )
            );
        }).
        then(function getShowDetails(details) {
            return Promise.resolve(
                Array.prototype.concat.apply([], details).filter(
                    function(oneShow) {
                        return typeof oneShow.tvdb_id === 'string' &&
                                      oneShow.tvdb_id.length > 4;
                    }
                ).map(function(oneShow) {
                    return oneShow.episodes.filter(function(episode) {
                        return episode.hasOwnProperty('torrents') &&
                            episode.hasOwnProperty('season') &&
                            episode.hasOwnProperty('episode') &&
                            qualities.some(function(quality) {
                                var torrents = episode.torrents;
                                if (torrents.hasOwnProperty(quality) &&
                                    torrents[quality] !== null) {
                                        var epQuality = torrents[quality];
                                        return epQuality.hasOwnProperty('url');
                                    }
                                });
                    }).map(function(oneEpisode) {
                        var bestQuality;
                        qualities.sort(function(a, b) {
                            return parseInt(b, 10) - parseInt(a, 10);
                        }).some(function(quality) {
                            if (oneEpisode.torrents.hasOwnProperty(quality)) {
                                bestQuality = quality;
                                return true;
                            }
                        });
                        return {
                            id: oneShow.tvdb_id,
                            link: oneEpisode.torrents[bestQuality].url,
                            season: oneEpisode.season,
                            episode: oneEpisode.episode,
                            quality: bestQuality
                            // seeders: oneEpisode.torrents[bestQuality].seeds
                            // eztv api always return with 0 seeders so
                            // it is useless in this case
                        };
                    });
                }).reduce(function mergeShows(soFar, current) {
                    return soFar.concat(current);
                }, [])
            );
        }).
        catch(function(e) {
            return Promise.resolve([]);
        }).
        then(function(result) {
            console.log(JSON.stringify(result));
        });
}
