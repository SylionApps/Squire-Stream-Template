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
	var quality = '720p';
	var apiEndpoint = 'https://www.popcorntime.ws/api/eztv/';
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

    callApi(apiEndpoint + 'shows/').
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
                    return oneShow.episodes.filter(function(oneEpisode) {
                        return oneEpisode.torrents.hasOwnProperty(quality);
                    }).filter(function(oneEpisode) {
                        return /^(magnet|http)/.test(
                            oneEpisode.torrents[quality].url
                        );
                    }).map(function(oneEpisode) {
                        return {
                            // _id: oneShow._id,
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
