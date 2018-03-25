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
var fs = require('fs');
var file = './logs/logcat.txt';

var logOutPut = false;
var doConti = true;
var separator = `########\n`;

var userInput = process.argv.slice(2);
// console.log(userInput);

if (userInput.length === 0) {
  // console.log(`Running Node`);
  prompt();
} else {
  if (userInput[userInput.length - 1] === '-log') {
    logOutPut = true;
    var searchStr = arrayParser(userInput.slice(1, userInput.length - 1));
  } else var searchStr = arrayParser(userInput.slice(1));

  doSwitch(userInput[0], searchStr);
}

function doSwitch(api, searchStr) {
  switch (api) {
    case 'songs':
      fetchSpotify(searchStr);
      break;
    case 'tweets':
      getTweets(searchStr);
      break;
    case 'movies':
      getMovies(searchStr);
      break;
    case 'help':
      helpInfo();
      break;
    case 'file':
      readFile();
      doConti = false;
      break;
  }
}

function readFile() {
  fs.readFile(userInput[1], 'utf8', (err, data) => {
    console.log('reading file');
    if (err) console.log(err);
    else {
      // console.log(data);
      var list = data.split('\r');
      list.forEach((e) => {
        var search = e.trim().split(',');

        setTimeout(() => {
          doSwitch(search[0], search[1]);
        }, 1000);
      });

      if (!doConti) doContinue();
      // console.log(list);
    }
  });
}

function helpInfo() {
  console.group();
  console.log(
    `node liri.js [songs|tweets|movies|file|help] [search param] [-log]`
  );
  console.log(`             Params are optional`);
  console.log(`             [songs] <title|artist|album|genera>`);
  console.log(`             tweets <search text>`);
  console.log(`             movies <title>`);
  console.log(`             file <filepath>`);
  console.log(`             Enter no params for prompt mode (inquirer)`);
  console.log(
    `             -log as last param to log results in ./logs/logcat.txt`
  );
  console.groupEnd();
}

function arrayParser(arry) {
  var parsedStr = '';
  arry.forEach((e) => {
    parsedStr += e + ' ';
  });
  // console.log(parsedStr);
  return parsedStr.trim();
}

function prompt() {
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
      case 'Movies':
        getMovies(data.param);
        break;
    }
  });
}

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
    var strOut = separator;
    if (err) {
      strOut += `Error occurred: ${err}\n`;
    }
    data.tracks.items.forEach((e) => {
      // strOut += e);
      strOut += `  Song    : ${e.name}\n`;
      strOut += `  Album   : ${e.album.name}\n`;
      var art = '';
      e.artists.forEach((artist) => {
        art += artist.name + ', ';
      });
      strOut += `  Artist  : ${art}\n`;
      strOut += `  Preview : ${e.preview_url}\n`;
      strOut += `  ----\n`;
    });
    strOut += separator;

    console.log(strOut);

    if (logOutPut) logOutPutFile(strOut);

    if (doConti) doContinue();
  });
}

function getTweets(search) {
  var client = new Twitter(keys.twitter);

  var params = {
    q: search || 'donald trump',
    tweet_mode: 'extended',
    result_type: 'recent',
  };

  client.get('search/tweets', params, function(error, tweets, response) {
    var strOut = separator;
    if (error) console.log(error);
    else {
      tweets.statuses.forEach((element, indx) => {
        // console.log(element);
        strOut += `  Tweeted by  : ${element.user.name}\n`;
        strOut += `  Screen Name : ${element.user.screen_name}\n`;
        strOut += `  Tweet       : ${element.full_text}\n`;
        strOut += `  ++++\n`;
      });
    }
    strOut += separator;
    console.log(strOut);
    if (logOutPut) logOutPutFile(strOut);

    if (doConti) doContinue();
  });
}

function getMovies(search) {
  var key = 'trilogy';
  search = search || 'Get Out';

  var url = `http://www.omdbapi.com/?apikey=${key}&t=${search}`;

  Request(url, (err, resp, data) => {
    var strOut = separator;
    if (err) console.log(err);
    else {
      var movieData = JSON.parse(data);
      // console.log(movieData);
      if (movieData.Response !== 'False') {
        strOut += `  Title   : ${movieData.Title}\n`;
        strOut += `  Year    : ${movieData.Year}\n`;
        strOut += `  Country : ${movieData.Country}\n`;
        strOut += `  Language: ${movieData.Language}\n`;
        strOut += `  Actors  : ${movieData.Actors}\n`;
        if (movieData.Ratings) {
          var ratings = `  Ratings : `;
          movieData.Ratings.forEach((e, i) => {
            var moreRatings = '';

            if (i === 0) ratings += `${e.Source} - ${e.Value}`;
            else {
              moreRatings += `\n            ${e.Source} - ${e.Value}`;
              ratings += moreRatings;
            }
          });
          strOut += ratings + '\n';
        }

        strOut += `  Plot    : ${movieData.Plot}\n`;
      } else {
        strOut += `  ${search} - ${movieData.Error}\n`;
      }
    }
    strOut += separator;
    console.log(strOut);
    if (logOutPut) logOutPutFile(strOut);

    if (doConti) doContinue();
  });
}

function logOutPutFile(str) {
  str = new Date() + '\n' + str;
  fs.appendFile(file, str, (err) => {
    if (err) console.log(err);
  });
}
