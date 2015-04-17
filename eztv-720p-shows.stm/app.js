var Q       = require('Q'),
	express = require("express"),
	util 	= require('util'),
    http    = require("http"),
    request = require("request"),
    argv	= require('minimist')(process.argv.slice(2));

// EPISODES
if (argv.e) {
	/*

	id       : show TVDB code (required)
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
	var numberOfPages = 10; // Between 1 and 18. Be careful big numbers need more memory.
	var apiEndpoint = "http://eztvapi.re/";
	var apiEndpointShow = 'show/';
	var apiEndpointShows = 'shows/';

	// --------------------------------------------------------


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
                            };
                        });
                }).
                reduce(function mergeShows(soFar, current) {
                    return soFar.concat(current);
                }, []);

            console.log(JSON.stringify(episodes));
        }).
        catch(function(error) {
            // TODO handle the error event
            throw error;
        });


    // helpers
    var callApi = function(url) {
        // more about `Q.nfcall`: https://github.com/kriskowal/q#adapting-node
        return Q.nfcall(request, url).then(function(result) {
            return JSON.parse(result[1]);
        });
    };
}
