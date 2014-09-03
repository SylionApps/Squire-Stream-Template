var express = require("express"),
    util    = require('util'),
    http    = require("http"),
    request = require("request"),
    eztv    = require('eztv'),
    argv    = require('minimist')(process.argv.slice(2));

// EPISODES
if (argv.e) {   
    /*
    
    id : series/show TVDB code (required)
    episode : the episode number (as a string) of the episode within the season (required)  
    season : the season number (as a string) of the season the episode is in
    link : url or magnet to get movie. Support: youtube, magnet link, torrent, direct URL to video (required)
    
    quality : link quality: 1080p, 720p o 480p (optional)
    seeders : number of seeders if link is a magnet or torrent file (optional)
    size : size del link (optional)
    
    */

    // Get the shows matching 'mythbusters'
    eztv.getShows({query: 'mythbusters'}, function(error, results) {
        // console.log("callback for getShows received, error? " + error + ", results are: " + JSON.stringify(results));
        // Check there's no error and we have some results (should check both existance and number of objects)
        if (!error && results.length) {
            // Get the first results ID, we'll assume this to be mythbusters
            var mythbustersID = results[0]["id"];
            // Get the shows episodes
            eztv.getShowEpisodes(mythbustersID, function (error, results) {
                    // console.log("callback for getShowEpisodes received, error? " + error + ", results? " + (results != null));
                    // Again, check there's no error and the results object exists
                    if (!error && results) {
                        // Create an array to hold all our episodes JSON which we'll later print for Squire
                        var episodesJSON = [];
                        // Get the episodes from the results
                        var episodes = results["episodes"];
                        // Loop through episodes
                        for (var i = 0; i < episodes.length; i++) {
                            // Get the episode
                            var episode = episodes[i];
                            // Check the episode has a defined season number and episode number
                            if (!episode["seasonNumber"] || !episode["episodeNumber"])
                              continue;
                            // Convert episode number and season number to strings
                            // console.log("s" + episode["seasonNumber"] + "e" + episode["episodeNumber"] + "\n");
                            var episodeNumberString = episode["episodeNumber"].toString();
                            var seasonNumberString = episode["seasonNumber"].toString();
                            // Create JSON object for Squire
                            var episodeJSON = { id : "73388", showTVDB: "73388", episode : episodeNumberString, season : seasonNumberString, link : episode["magnet"]};
                            // Push into episodes JSON array
                            episodesJSON.push(episodeJSON);
                        }
                        //  Print out our episodes JSON for squire to use
                        console.log(JSON.stringify(episodesJSON));
                    }
            });
        }
    }); 
}