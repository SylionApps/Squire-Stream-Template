var express = require("express"),
    util    = require("util"),
    http    = require("http"),
    request = require("request"),
    async   = require("async"),
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

    // Define request URL
    var url = "http://cmpl.me/streams/eztv_chunk_urls_e.json";
    
    // Store episdoes JSON
    var episodesJSON = "[";

    // Define function to read chunk URL
    function processChunk(chunkUrl, callback) {
        // Send the request
        request(chunkUrl, function(error, response, contents) {  
            // Check there was no error and we have contents and response
            if(!error && response && contents) {
                // console.log("Chunk URL ('" + chunkUrl + "') contents loaded");
                // Append contents (excluding [ at start and ] at end but adding a , at the end)
                episodesJSON += contents.substr(1, contents.length - 2) + ",";
                // console.log("episodes json: " + episodesJSON);
                // console.log("Chunk URL ('" + chunkUrl + "') contents appended");
            } else {
                // console.log("Chunk URL ('" + chunkUrl + "') contents load failed with error: " + error);
            }
            // Call the callback
            callback();
        });
    }

    // Send the request
    request(url, function(error, response, contents) {  
        // Check there was no error and we have contents and response
        if(!error && response && contents) {
            // De-serialize the contents
            var chunkUrls = JSON.parse(contents);
            // console.log("Chunk URLs loaded:\n" + chunkUrls);
            // Create queue (allow 4 simaltaneously)
            var chunkProcessQueue = async.queue(processChunk, 4);
            // Set the queue drain callback
            chunkProcessQueue.drain = function() {
                // Remove last comma in episodes JSON and add a ]
                episodesJSON = episodesJSON.substr(0, episodesJSON.length - 1) + "]";
                // Output the episodes JSON
                console.log(episodesJSON);
            };
            // Push the chunk URLS onto the queue
            chunkProcessQueue.push(chunkUrls);
        } else {
            // Otherwise print out an empty array
            var empty = [];
            console.log(JSON.stringify(empty));
        }
    });
}
