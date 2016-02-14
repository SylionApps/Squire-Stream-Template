var express = require("express"),
    util    = require("util"),
    http    = require("http"),
    request = require("request"),
    async   = require("async"),
    eztv    = require("eztv"),
    tvdb    = require("node-tvdb"),
    tvdbClient = new tvdb("2D6719869501F2BA"),
    fs      = require("fs"),
    argv    = require("minimist")(process.argv.slice(2));

// Define a chunk method on the Array prototype
Array.prototype.chunk = function(chunkSize) {
    var R = [];
    for (var i=0; i<this.length; i+=chunkSize)
        R.push(this.slice(i,i+chunkSize));
    return R;
}

/*

id : series/show TVDB code (required)
episode : the episode number (as a string) of the episode within the season (required)  
season : the season number (as a string) of the season the episode is in
link : url or magnet to get movie. Support: youtube, magnet link, torrent, direct URL to video (required)

quality (optional): video quality (720p by default). Three responses are valid: 3D, 1080p, 720p and 480p.
language (optional): audio language ISO 639-1 code (en by default). You can read the complete ISO 639-1 codes here (https://en.wikipedia.org/wiki/List_of_ISO_639-1_codes).

*/

// Get any cached TVDB data, define the file's location
var cachedTvdbFilePath =  "/Users/joshuagarnham/Dropbox/Projects/Other/Node/Squire-Streams/server-side/eztv/tvdbCached.json";
// Create dictionary to store the cached TVDB data which may be added to later
var cachedTvdbIDs = {};
// Check it exists
if (fs.existsSync(cachedTvdbFilePath)) {
    // If so, then read the data
    var fileContents = fs.readFileSync(cachedTvdbFilePath, "utf8");
    // Parse it and store into cached tvdb IDs
    cachedTvdbIDs = JSON.parse(fileContents);
    // Check if we have cached tvdb ids (really could do with ?: working in javascript)
    if (!cachedTvdbIDs) {
        // If not, which means the parse failed just use an empty dictionary
        cachedTvdbIDs = {};
    }
}

// Create an array to hold all our episodes JSON which we'll later print for Squire
var episodesJSON = [];

// Define function to get show TVDB code (show must be the full details, i.e. what's returned form getShowEpisodes as this included imdb code too, sometimes)
function getTVDBIdForShow(show, callback) {
    // Get show ID
    var showID = show["id"];
    var showTitle = show["title"];
    // Remove brackets, years, and country codes (just US) from show title
    showTitle = showTitle.replace(/(\((.*?)\))|((19|20)\d{2})|US/g, "");

    // Check if we have a TVDB code cached
    if (cachedTvdbIDs[showID]) {
        // Call the callback with the cached one
        callback(cachedTvdbIDs[showID]);
    } else {
        // Get the IMDB code
        var imdbID = show["imdbID"];
        // Define our tvdb response function
        var tvdbResponse = function(error, response) {
            // Check there's no error and we have a response
            if (!error && response) {
                // Get the show's TVDB id from the response
                var tvdbID = response["seriesid"];
                // Check if response was an array
                if (response instanceof Array) {
                    // In which case get the first objects TVDB ID
                    tvdbID = response[0]["seriesid"];
                }
                // Store the tvdb ID into the cache
                cachedTvdbIDs[showID] = tvdbID;
                // Call the callback
                callback(tvdbID);
            } else {
                console.log("WARN:\t" + showTitle + ", " + error);
                // Call the callback
                callback(null);
            }
        };
        // Check we've got one
        if (imdbID) {
            // Get the TVDB code using the IMDB id
            tvdbClient.getSeriesByRemoteId(imdbID, tvdbResponse);
        } else {
             // Otherwise get the TVDB code using the show title
            tvdbClient.getSeries(showTitle, tvdbResponse);
        }
    }
}

// Define function to handle getting a shows episode
function processShowEpisodes(show, callback) {
    // Get the show's episodes
    eztv.getShowEpisodes(show["id"], function (error, results) {
        // console.log("callback for getShowEpisodes received, error? " + error + ", results? " + (results != null));
        // Again, check there's no error and the results object exists
        if (!error && results) {
            // Get the show TVDB code
            getTVDBIdForShow(results, function (tvdbID) {
                // Check we've got a tvdb code
                if (tvdbID) {
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
                        // !!!: set at 100 to fix bug in current version 5/01/2015 of Squire Helper with Apple TV
                        // Create JSON object for Squire
                        var episodeJSON = { id : tvdbID, showTVDB : tvdbID, episode : episodeNumberString, season : seasonNumberString, seeders : "100", link : episode["magnet"]};
                        // Push into episodes JSON array
                        episodesJSON.push(episodeJSON);
                    }
                }
                // Call the callback
                callback();
            });
        } else {
            // Call the callback (doesn't matter if successful, we're done here)
            callback();
        }
    });
}


// Create an array to hold our upload JSON urls
var uploadedJSONUrls = [];
// Create upload queue
var uploadQueue = async.queue(uploadJSON, 5);
// Define function to handle uploading JSON
function uploadJSON(episodesArray, callback) {
    // Make POST request to Myjson API
    request.post("https://api.myjson.com/bins", { "json": episodesArray },
        function (error, response, body) {
            // Check there's no error and we get a valid response code
            if (!error && response.statusCode == 201) {
                // Get the url of the the new json
                var jsonURL = body["uri"]; 
                console.log("Myjson POST request successful, url: " + jsonURL);
                // Add it to the array
                uploadedJSONUrls.push(jsonURL);
            } else {
                console.log("Myjson POST request returned an error: " + error + ", response code: " + response.statusCode + ", will retry");
                // Push this array again to retry
                uploadQueue.push([episodesArray]);
            }
            // Call the callback
            callback();
        }
    );
}

// Get all shows
eztv.getShows(null, function(error, results) {
    console.log("callback for getShows received, error? " + error + ", # results: " + ((results) ? results.length : '0'));
    // Check there's no error and we have some results (should check both existance and number of objects)
    if (!error && results.length) {
        // Create our queue which will hold the tasks to process shows, allowing 50 simaltaneous tasks, really could go up to 256 as that is the ulimit for file descriptors, but lets not be greedy and try not to annoy TVDB
        // Also too high can result in OS killing node due to 'excessive wakeups' 
        var queue = async.queue(processShowEpisodes, 50);
        // Set the callback for when the queue has been drained fully (all shows processed)
        queue.drain = function() {
            console.log("All shows processed, now uploading JSON chunks…");
            // Split the array into 15
            var jsonChunks = episodesJSON.chunk(Math.ceil(episodesJSON.length / 15));
            console.log("Chunk count: " + jsonChunks.length);
            // Set the queue drain callback
            uploadQueue.drain = function() {
                console.log("All JSON chunks uploaded, writing out URLs and cached TVDB ids…");
                // Define the path to save the upload JSON URLs to
                var uploadUrlsFilePath = "/Library/WebServer/Documents/streams/eztv_chunk_urls_e.json";
                // Write the urls out
                fs.writeFileSync(uploadUrlsFilePath, JSON.stringify(uploadedJSONUrls, null, 2));
                // Also, write out the cached tvdb ids
                fs.writeFileSync(cachedTvdbFilePath, JSON.stringify(cachedTvdbIDs, null, 2));
            };
            // Push this onto the queue
            uploadQueue.push(jsonChunks);
        };

        // For debug purposes keep track of the number of shows processed
        var numShowsProcessed = 0;
        // Push the shows onto the queue
        queue.push(results, function () {
            // This is called when a show has been processed, increment the number of shows processed variable 
            numShowsProcessed++;
            // Log out the current number of shows processed for debug purposes
            console.log("#ShowsProcessed: " + numShowsProcessed);
        });
    }
}); 
