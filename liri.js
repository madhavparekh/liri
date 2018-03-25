require('dotenv').config();
var keys = require('./keys');
//twitter
var Twitter = require('twitter');
var tweetOffset = 0;
//spotify
var Spotify = require('node-spotify-api');
var spotOffset = 0;

var Request = require('request');
var Inquirer = require('inquirer');

var prompt = () => {
  Inquirer.prompt([
    {
      type: 'list',
      message: 'Hi, I am Liri. I am ready to search for:',
      choices: ['Tweets', 'Songs', 'Movies'],
      name: 'search',
    },
    {
      type: 'text',
      message: 'Enter search term:',
      name: 'param',
    },
  ]).then((data) => {
    switch (data.search) {
      case 'Tweets':
        getTweets(data.param);
        break;
      case 'Songs':
        fetchSpotify(data.param);
        break;
      case 'Movie':
        break;
    }
  });
};

prompt();

function doContinue() {
  Inquirer.prompt([
    {
      type: 'confirm',
      message: 'Would you like to continue?',
      name: 'continue',
    },
  ]).then((data) => {
    if (data.continue) prompt();
    else console.log('Good bye!');
  });
}

// fetchSpotify('dil se');

function fetchSpotify(search) {
  var Spotify = require('node-spotify-api');

  var spotify = new Spotify(keys.spotify);

  var params = {
    type: 'track',
    query: search || 'Bruno Mars',
    limit: 10,
    offset: tweetOffset,
  };

  spotify.search(params, function(err, data) {
    if (err) {
      return console.log('Error occurred: ' + err);
    }
    data.tracks.items.forEach((e) => {
      console.log(`Song   : ${e.name}`);
      var art = '';
      e.artists.forEach((artist) => {
        art += artist.name + ', ';
      });
      console.log(`Artist : ${art}`);
      console.log(`Preview: ${e.preview_url}`);
      console.log(`----`);
    });
    doContinue();
  });
}

function getTweets(search) {
  var client = new Twitter(keys.twitter);

  var params = {
    q: search || 'donald trump',
    tweet_mode: 'extended',
    result_type: 'popular',
  };

  client.get('search/tweets', params, function(error, tweets, response) {
    if (error) console.log(error);
    else {
      //   console.log(tweets);
      tweets.statuses.forEach((element, indx) => {
        console.log(`Tweet ${indx + 1} : ${element.full_text}`);
        console.log(`---`);
      });
    }
    doContinue();
  });
}
