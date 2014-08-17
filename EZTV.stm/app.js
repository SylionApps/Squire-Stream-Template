var express = require("express"),
    util    = require("util"),
    http    = require("http"),
    request = require("request"),
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
    var url = 'http://cmpl.me/streams/eztv_episodes.json';
    
    // Send the request
    request(url, function(error, response, contents) {  
        // Check there was no error and we have contents and response
        if(!error && response && contents) {
            // If so then print out the contents which will just be the JSON 
            console.log(contents);
        } else {
            // Otherwise print out an empty array
            var empty = [];
            console.log(JSON.stringify(empty));
        }
    });
}
