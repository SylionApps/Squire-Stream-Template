'use strict';

var express = require('express');
var request = require('request');
var http = require('http');
var util = require('util');
var argv = require('minimist')(process.argv.slice(2));
var qs = require('querystring');
if (!('Promise' in process)) {
    var Promise = require('promise-polyfill');
}

// MOVIES
if (argv.m) {
    /*
    id:         movie IMDB code (required)
    link:       url or magnet to get movie. Support: youtube, magnet link,
                torrent, direct URL to video (required)

    quality:    1080p, 720p or 480p (optional)
    seeders:    number of seeders if link is a magnet or torrent file (optional)
    size:       size of the medium (optional)
    fileIndex:  if the magnet/torrent has several files, should specify
                the file index into it (optional for torrent or magnet link)
    */

    // Variables
    // --------------------------------------------------------
    var numberOfPages = 10;
    var params = {
        limit: 50,              // Integer between 1 - 50 (inclusive)
        quality: '720p',        // String (720p, 1080p, 3D)
        sort_by: 'year',        // String (title, year, rating, peers, seeds,
                                // download_count, like_count, date_added)
        minimum_rating: '6',    // Integer between 0 - 9 (inclusive)
        page: 0
    };
    var apiEndpoint = 'https://yts.ag/api/v2/list_movies.json';
    // --------------------------------------------------------

    Promise.all(
        Array.apply(null, {length: numberOfPages}).map(function(item, key) {
            return new Promise(function(resolve, reject) {
                params.page = key + 1;
                var url = apiEndpoint + '?' + qs.stringify(params);
                request.get(url, function(error, response, body) {
                    if (!error && response.statusCode === 200) {
                        var res;
                        try {
                            res = JSON.parse(body);
                        } catch(e) {
                            resolve(JSON.parse([]));
                        }
                        resolve(res.data.movies);
                    } else {
                        resolve(JSON.parse([]));
                    }
                });
            });
        })
    ).then(function(values) {
        return Promise.resolve(
            Array.prototype.concat.apply([], values).filter(function(oneMovie) {
                return oneMovie.hasOwnProperty('torrents');
            }).map(function(oneMovie) {
                oneMovie.torrents = oneMovie.torrents.filter(
                    function(oneTorrent) {
                        return oneTorrent.quality === params.quality;
                    }
                );
                return {
                    id: oneMovie.imdb_code,
                    link: 'magnet:?xt=urn:btih:' +
                        oneMovie.torrents[0].hash + '&dn=' +
                        encodeURIComponent(oneMovie.title) +
                        '&tr=udp://open.demonii.com:1337' +
                        '&tr=udp://tracker.istole.it:80' +
                        '&tr=http://tracker.yify-torrents.com/announce' +
                        '&tr=udp://tracker.publicbt.com:80' +
                        '&tr=udp://tracker.openbittorrent.com:80' +
                        '&tr=udp://tracker.coppersurfer.tk:6969' +
                        '&tr=udp://exodus.desync.com:6969' +
                        '&tr=http://exodus.desync.com:6969/announce',
                    quality: oneMovie.torrents[0].quality,
                    seeders: oneMovie.torrents[0].seeds,
                    size: oneMovie.torrents[0].size_bytes
                };
            })
        );
    }).catch(function(error) {
        return Promise.resolve([]);
    }).then(function(movies) {
        console.log(JSON.stringify(movies));
    });
}
