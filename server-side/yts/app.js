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

quality : link quality: 1080p, 720p o 480p (optional)
seeders : number of seeders if link is a magnet or torrent file (optional)
size : size del link (optional)

*/

// Create vars to store URLs and eventually the movies
var urls = [];
var movies = [];
// Generate our URL's, max page size of 50 and take 50 pages (pretty much as many as we can get)
for (var j = 0; j < 50; j++) {
    // Set the URL in the array
    urls[j] = "http://yts.re/api/list.json?sort=seeds&quality=720p&limit=50&set=" + j;;
}

// Define the function to send the request to the server and handle the response
function getMoviesWithURL(url, callback) {
    // Send the request
    request(url, function(error, response, html) {
        // Check for error
        if (!error) {
            // Parse the response and get the movies (try-catch neccessary as sometimes a HTML error message is emitted under high-load or server-side issues)
            var retrievedMovies;
            try {
                retrievedMovies = JSON.parse(html)["MovieList"];
            } catch(e) {
                console.log("Error parsing JSON: " + e + ", html: " + html);
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
                // Construct the JSON dictionary
                var json = { id : movie["ImdbCode"], quality : movie["Quality"], seeders : movie["TorrentSeeds"], size : movie["SizeByte"], link : movie["TorrentMagnetUrl"] };
                // Push it into the movies array
                movies.push(json);
            }
        } else {
            // Log the issue
            console.log("WARN:\t" + url + ", " + error);
        }
        // Call the callback
        callback();
    });
}

// Create our queue which will hold the tasks to process shows, allowing 50 simaltaneous tasks, really could go up to 256 as that is the ulimit for file descriptors, but lets not be greedy and try not to annoy TVDB
// Also too high can result in OS killing node due to 'excessive wakeups' 
var queue = async.queue(getMoviesWithURL, 50);
// Set the callback for when the queue has been drained fully (all requests sent)
queue.drain = function() {
    console.log("All requests sent and " + movies.length + " movies were retrieved, now uploading JSON…");
    // Make POST request to Myjson API
    request.post("https://api.myjson.com/bins", { "json": movies },
        function (error, response, body) {
            // Check there's no error and we get a valid response code
            if (!error && response.statusCode == 201) {
                // Get the url of the the new json
                var jsonURL = body["uri"]; 
                console.log("Myjson POST request successful with resulting URL '" + jsonURL + "', writing out URL locally now…");
                // Define the path to save the upload JSON url to
                var uploadUrlsFilePath = "/Library/WebServer/Documents/streams/yts_chunk_urls_m.json";
                // Write the urls out
                fs.writeFileSync(uploadUrlsFilePath, JSON.stringify([jsonURL], null, 2));
            } else {
                console.log("Myjson POST request returned an error: " + error + ", response code: " + response.statusCode);
            }
        }
    );
};

// For debug purposes keep track of the number of requests sent
var numRequestsComplete = 0;
// Push the urls onto the queue
queue.push(urls, function () {
    // This is called when a request has been completed, increment the number of requests complete variable 
    numRequestsComplete++;
    // Log out the current number of shows processed for debug purposes
    console.log("#RequestsComplete: " + numRequestsComplete);
});