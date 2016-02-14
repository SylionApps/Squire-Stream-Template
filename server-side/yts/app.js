var express = require("express"),
    util    = require("util"),
    http    = require("http"),
    request = require("request"),
    async   = require("async"),
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

// Create vars to store URLs and eventually the movies
var urls = [];
var movies = [];
// Define max page size
var numPages = 91;
// Generate our URL's, max page size of 50 and take 50 pages (pretty much as many as we can get)
for (var j = 1; j <= numPages; j++) {
    // Set the URL in the array
    urls[j] = "https://yts.ag/api/v2/list_movies.json?sort_by=seeds&limit=50&page=" + j;
}

// For debug purposes keep track of the number of requests sent
var numRequestsComplete = 0;
// Define callback for when a queue task is completed
function queueCallback() {
    // This is called when a request has been completed, increment the number of requests complete variable 
    numRequestsComplete++;
    // Log out the current number of shows processed for debug purposes
    console.log("#RequestsComplete: " + numRequestsComplete);
}

// Define the magnet link trackers parameters
var trackers = "&tr=udp://open.demonii.com:1337&tr=udp://tracker.istole.it:80&tr=http://tracker.yify-torrents.com/announce&tr=udp://tracker.publicbt.com:80&tr=udp://tracker.openbittorrent.com:80&tr=udp://tracker.coppersurfer.tk:6969&tr=udp://exodus.desync.com:6969&tr=http://exodus.desync.com:6969/announce";
// Define the function to send the request to the server and handle the response
function getMoviesWithURL(url, callback) {
    // Send the request
    request(url, function(error, response, html) {
        // Check for error
        if (!error) {
            // Parse the response and get the movies (try-catch neccessary as sometimes a HTML error message is emitted under high-load or server-side issues)
            var retrievedMovies;
            try {
                retrievedMovies = JSON.parse(html)["data"]["movies"];
            } catch(e) {
                console.log("Error parsing JSON from URL: " + url + ", error: " + e/* + ", html: " + html*/);
                // Check if we can retry (only allow double the number of requests)
                if (numRequestsComplete < numPages * 2) {
                    console.log("... retry will occur");
                    // Push this url again to retry
                    queue.push(url, queueCallback);
                }
                // Call the callback
                callback();
                // And stop further processing of this URL
                return;
            }
            // console.log("Retrieved " + retrievedMovies.length + " movies from URL '" + url + "'");
            // Loop through movies to generate JSON dictionaries for them               
            for (var x = 0; x < retrievedMovies.length; x++) {
                // Get the movie
                var movie = retrievedMovies[x];
                // Get the movie name & url encode
                var movieName = movie["title"];
                movieName = encodeURIComponent(movieName);
                // Get the torrents
                var torrents = movie["torrents"];
                // Check we have some
                if (!torrents)
                    continue;
                // Loop through torrents
                for (var k = 0; k < torrents.length; k++) {
                    // Get first torrent (has mose seeders)
                    var torrent = movie["torrents"][k];
                    // Get the torrent hash
                    var hash = torrent["hash"];
                    // Get the number of seeds (!!!: if less than 100 than cap at 100 to fix bug in current version 5/01/2016 of Squire Helper with Apple TV)
                    var seeds = torrent["seeds"] < 100 ? 100 : torrent["seeds"]; 
                    // Construct magnet url
                    var magnetURL = "magnet:?xt=urn:btih:" + hash + "&dn=" + movieName + trackers;
                    // Construct the JSON dictionary (all YTS movies are English when checked in Jan 2016)
                    var json = { id : movie["imdb_code"], quality : torrent["quality"], seeders : seeds, size : torrent["size_bytes"], link : magnetURL, language : "en" };
                    // Push it into the movies array
                    movies.push(json);
                }
            }
        } else {
            // Log the issue
            console.log("WARN:\t" + url + ", " + error);
        }
        // Call the callback
        callback();
    });
}

// Create an array to hold our upload JSON urls
var uploadedJSONUrls = [];
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
                console.log("Myjson POST request returned an error: " + error + ", response code: " + response.statusCode);
            }
            // Call the callback
            callback();
        }
    );
}

// Create our queue which will hold the tasks to process shows, allowing 5 simaltaneous tasks, really could go up to 256 as that is the ulimit for file descriptors, but lets not be greedy and try not to annoy YTS
// Also too high can result in OS killing node due to 'excessive wakeups' 
var queue = async.queue(getMoviesWithURL, 5);
// Set the callback for when the queue has been drained fully (all requests sent)
queue.drain = function() {
    console.log("All requests sent and " + movies.length + " movies were retrieved, now uploading JSON chunks…");
    // Check we have movies
    if (!movies.length) {
        console.log("WARN: No movies retrieved, error must have ocurred in retrieval, not uploading new chunks");
        return;
    }
    // Create upload queue
    var uploadQueue = async.queue(uploadJSON, 5);
    // Split the array into 4
    var jsonChunks = movies.chunk(Math.ceil(movies.length / 4));
    // Set the callback for when the queue has been drained fully (all shows processed)
    uploadQueue.drain = function() {
        console.log("All JSON chunks uploaded, writing out URLs…");
         // Define the path to save the upload JSON url to
        var uploadUrlsFilePath = "/Library/WebServer/Documents/streams/yts_chunk_urls_m.json";
        // Write the urls out
        fs.writeFileSync(uploadUrlsFilePath, JSON.stringify(uploadedJSONUrls, null, 2));
    };
    // Push this onto the queue
    uploadQueue.push(jsonChunks);
};

// Push the urls onto the queue
queue.push(urls, queueCallback);