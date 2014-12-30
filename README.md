# EZTV Squire Streams

<img src="https://s3.amazonaws.com/Squire_Contents/sites+resources/github+streamers/stream_icon.png" width="108" height="108" alt="Squire Stream Icon"/>

- [Squire Site](http://www.squireapp.com)
- [Squire Stream Site](http://squireapp.com/streams/)

## Overview
Streams is a [Squire](http://www.squireapp.com) feature that lets the user watch content available outside of their hard drive. This means a stream is an ordered collection of items that can be watched in Squire. Each stream is encapsulated in an ```stm``` file. ```stm``` files are added to the Squire Helper which then extracts, orders and organizes the contents for the stream so they can be enjoyed from any available Squire client. The format for these files is open and this document explains how to properly create them.

## What's this? 
This repository contains 3 streams, 2 of which make use of the EZTV (torrent tracker) API and the other of YTS.re. The first, EZTV-Mythbusters loads Mythbusters episodes and displays them in Squire and the second loads all shows from EZTV and displays them in Squire. 

For the EZTV 'all shows' stream, a remote server keeps track of all available episodes from shows and updates frequently. The stream on your Mac simply requests this JSON and this is passed onto Squire — this avoids performance issues. 

The YTS.re stream works similarly to that of the EZTV 'all shows' stream and gets the top 2500 movies from the service and displays them in Squire.

## Installation
Download or clone this repository and double click on the .stm of your choice. The stream will be added automatically to Squire Helper. After a few minutes, the stream’s content will be available in the 'Shows' section on Squire.app.
