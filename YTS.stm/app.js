var express = require("express"),
    util    = require("util"),
    http    = require("http"),
    request = require("request"),
    async   = require("async"),
    argv    = require("minimist")(process.argv.slice(2));

// MOVIES
if (argv.m) {   
    // Define request URL
    var url = "http://cmpl.me/streams/yts_chunk_urls_m.json";
    
    // Store movies JSON
    var moviesJSON = "[";

    // Define function to read chunk URL
    function processChunk(chunkUrl, callback) {
        // Send the request
        request(chunkUrl, function(error, response, contents) {  
            // Check there was no error and we have contents and response
            if(!error && response && contents) {
                // Append contents (excluding [ at start and ] at end but adding a , at the end)
                moviesJSON += contents.substr(1, contents.length - 2) + ",";
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
            // Create queue (allow 4 simaltaneously)
            var chunkProcessQueue = async.queue(processChunk, 1);
            // Set the queue drain callback
            chunkProcessQueue.drain = function() {
                // Remove last comma in episodes JSON and add a ]
                moviesJSON = moviesJSON.substr(0, moviesJSON.length - 1) + "]";
                // Output the episodes JSON
                console.log(moviesJSON);
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