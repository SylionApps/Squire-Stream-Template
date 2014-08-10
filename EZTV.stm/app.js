var express = require("express"),
    util    = require("util"),
    http    = require("http"),
    request = require("request"),
    async   = require("async"),
    eztv    = require("eztv"),
    tvdb    = require("node-tvdb"),
    tvdbClient = new tvdb("2D6719869501F2BA"),
    argv    = require("minimist")(process.argv.slice(2));

// EPISODES
if (argv.e) {   
    /*
    
    showTVDB : series/show TVDB code (required)
    episode : the episode number (as a string) of the episode within the season (required)  
    season : the season number (as a string) of the season the episode is in
    link : url or magnet to get movie. Support: youtube, magnet link, torrent, direct URL to video (required)
    
    quality : link quality: 1080p, 720p o 480p (optional)
    seeders : number of seeders if link is a magnet or torrent file (optional)
    size : size del link (optional)
    
    */

    // Create an array to hold all our episodes JSON which we'll later print for Squire
    var episodesJSON = [];

    // Define a function to handle getting shows TVDB code and then their episodes also
    function processShow(show, callback) {
        // Get the show's ID and title
        var showID = show["id"];
        var showTitle = show["title"];
        // console.log("processing show: " + showTitle);
        // Remove brackets from show title
        showTitle = showTitle.replace(/\((.*?)\)/g, "")

        // Get the TVDB code
        tvdbClient.getSeries(showTitle, function(error, response) {
            // console.log("TVDB callback for " + showTitle + ":");

            // Check there's no error and we have a response
            if (!error && response) {
                // console.log("\t\tsuccess: " + JSON.stringify(response));
                // Get the show's TVDB id from the response
                var tvdbID = response["seriesid"];
                // Check if response was an array
                if (response instanceof Array) {
                    // In which case get the first objects TVDB ID
                    tvdbID = response[0]["seriesid"];
                }

                // console.log("TVDB ID: " + tvdbID + " response, " + JSON.stringify(response));
                // Get the show's episodes
                eztv.getShowEpisodes(showID, function (error, results) {
                    // console.log("callback for getShowEpisodes received, error? " + error + ", results? " + (results != null));
                    // Again, check there's no error and the results object exists
                    if (!error && results) {
                        // Get the episodes from the results
                        var episodes = results["episodes"];
                        // Loop through episodes
                        for (var x = 0; x < episodes.length; x++) {
                            // Get the episode
                            var episode = episodes[x];
                            // Check the episode has a defined season number and episode number
                            if (!episode["seasonNumber"] || !episode["episodeNumber"])
                              continue;
                            // Convert episode number and season number to strings
                            // console.log("s" + episode["seasonNumber"] + "e" + episode["episodeNumber"] + "\n");
                            var episodeNumberString = episode["episodeNumber"].toString();
                            var seasonNumberString = episode["seasonNumber"].toString();
                            // Create JSON object for Squire
                            var episodeJSON = { showTVDB : tvdbID, episode : episodeNumberString, season : seasonNumberString, link : episode["magnet"]};
                            // Push into episodes JSON array
                            episodesJSON.push(episodeJSON);
                        }
                    }

                    // Call the callback (doesn't matter if successful, we're done here)
                    callback();
                });
            } else {
                // console.log("WARN:\t" + showTitle + ", " + error);
                // Call the callback
                callback();
            }
        });
    }

    // console.time("fullProcess");
    // Get all shows
    eztv.getShows(null, function(error, results) {
        // console.log("callback for getShows received, error? " + error + ", # results: " + results.length);
        // Check there's no error and we have some results (should check both existance and number of objects)
        if (!error && results.length) {
            // Create our queue which will hold the tasks to process shows, allowing 50 simaltaneous tasks, really could go up to 256 as that is the ulimit for file descriptors, but lets not be greedy and try not to annoy TVDB
            // Also too high can result in OS killing node due to 'excessive wakeups' 
            var queue = async.queue(processShow, 20);
            // Set the callback for when the queue has been drained fully (all shows processed)
            queue.drain = function() {
                // console.log("All shows processed, now print JSON…");
                // console.timeEnd("fullProcess");
                // Print out our episodes JSON for squire to use
                console.log(JSON.stringify(episodesJSON));
            };

            // For debug purposes keep track of the number of shows processed
            // var numShowsProcessed = 0;
            // Push the shows onto the queue
            queue.push(results.slice(0, 50) /*, function () {
                // This is called when a show has been processed, increment the number of shows processed variable 
                numShowsProcessed++;
                // Log out the current number of shows processed for debug purposes
                console.log("#ShowsProcessed: " + numShowsProcessed);
            }*/);
        }
    }); 
}