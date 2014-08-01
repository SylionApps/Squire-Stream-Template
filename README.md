# Squire-Stream-Template

<img src="https://s3.amazonaws.com/Squire_Contents/sites+resources/github+streamers/stream_icon.png" width="108" height="108" alt="Squire Stream Icon"/>

[Squire Site](http://www.squireapp.com)
[Squire Stream Site](http://squireapp.com/streams/)

## Overview
Streams is a Squire feature that lets the user watch content available outside of their hard drive. This means a stream is an ordered collection of items that can be watched in Squire. Each stream is encapsulated in an ```stm``` file. ```stm``` files are added to the Squire Helper which then extracts, orders and organizes the contents for the stream so they can be enjoyed from any available Squire client. The format for these files is open and this document explains how to properly create them.

## STM File
As mentioned previously a stream is encapsulated in an stm file. These files are written in node.js and a template is available here.
If you take a look inside the stm file you can see it’s mainly composed of two files:

- _package.json_
- _app.js_

This document takes care of the rules both files have to follow for your stm stream to be compatible with Squire.

## Package.json
This file contains all the information that belongs to the stream. It’s composed of a JSON that must  include the following mandatory keys:

- **name**: string with the name of the streamer.
- **version**: current version of the streamer.
- **description**: short description of the streamer.
- **dependencies**: necessary modules that the ```npm``` needs to install for the stream to work.

These other keys are optional but highly recommended:

- **updates**: link to follow in order to update the stream to its latest version.
- **keywords**: words you want your stream associated with in case it’s searched for.

Here’s an example of a ```package.json``` file:

```
{
  "name" : "squire-streamer-name",
  "version" : "0.0.1",
  "description"  : "Squire Streamer for X service",
  "updates": "http://www.mysquirestream.com/lastversion.zip",
  "keywords": ["squire", "streamer", "squire streamer"],
  "dependencies" : {
    "express" : "3.2.6",
    "request"    : "latest",
    "minimist"	 : "0.2.0",
    "cheerio"    : "latest"
  }
}
```

## App.js
The ```App.js``` file is the responsible for doing all the work and will be called by Squire to obtain the information about the stream.
When Squire asks your stream for its contents the answer must be a JSON with certain established rules. Also, with the aim of working correctly, it has to take into account certain issues. In brief:

- **Keys**: the returned JSON has to include a minimum set of keys. In case of not having these keys the response will be ignored. On the other hand there’s another set of optional keys which we highly encourage to include in order for the stream to work best. These keys are:
   - **id** (_required_): IMDB code for the movie.
link (required): link to access the content. This can be a torrent file, a magnet link or a link to YouTube.
   - **quality** (_optional_): video quality (720p by default). Three responses are valid: 1080p, 720p and 480p.
   - **seeders** (_optional_): number of seeders for the link in case it’s a torrent or magnet link.
   - **size** (_optional_): size in bytes for the content.

Here’s a valid JSON response as an example:

```
[{
  "id" : "tt1254207",
  "link" : "https://www.youtube.com/watch?v=IdejtDN9gyc",
  "quality"  : "1080p",
  "size": "149946368",
},
{
  "id" : "tt1254207",
  "link" : "magnet:?xt=urn:btih:88b2c9fa7d3493b45130b2907d9ca31fdb8ea7b9&dn=Big+Buck+Bunny+1080p&tr=udp%3A%2F%2Ftracker.openbittorrent.com%3A80&tr=udp%3A%2F%2Ftracker.publicbt.com%3A80&tr=udp%3A%2F%2Ftracker.istole.it%3A6969&tr=udp%3A%2F%2Fopen.demonii.com%3A1337",
  "quality"  : "1080p",
  "seeders"  : "16"
  "size": "902487334",
},
...]
```

- **Timeout**: the response time for the stream can not be over 90 seconds. If the stream doesn't respond in a superior period of time it will be ignored.
- **Processes**: we absolutely discourage the writing or reading of files with a stream. Any stream that attempts to write or read to disk during the generation of a JSON will be considered malicious.

The template contains the basic information for node.js users to start writing their code, or for programmers in other languages to redirect these calls. Depending on your needs you can focus in either   approach.

## Node.js Programmers
Write your code inside the if (argv.m) and end it printing on screen the JSON with a console.log() call. Don’t write any other information to the console during code execution. Return the JSON with the sentence JSON.stringify() for a correct reading by Squire.

We show here a very simplified program flow:

```
if (argv.m) {
	// Movie array to fill
	var movies = [];
	
	//Code to build the JSON
	...
	movies.push(...);	// Inserts a new movie

	// Prints the JSON on screen
	console.log(JSON.stringify(movies));
}
```

## For Programmers in Other Languages
If you don’t program in node.js you may redirect the call to the server where you place the code in other language. For example, you can write your code in ruby and create and API REST that responds to the JSON with the previously established rules.

Download this template and modify the line:
```
var url = 'ENTER YOUR HTTP HERE';
```
then write the URL for the call to be redirected.

This approach has several advantages:

- You can program in your language of choice.
- The streamer can be updated without modifying the stm file as long as the URL used for making the call is not modified.
- You can apply cache techniques to optimize the response time.
Your stream will be safer.

All these advantages make us recommend all programmers, and even node.js programmers, to use this approach and not to embed the code in an app.js file. 
