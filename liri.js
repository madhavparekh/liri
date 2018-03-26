require('dotenv').config();
var Request = require('request');
var Inquirer = require('inquirer');
var fs = require('fs');
var keys = require('./keys');

//twitter
var Twitter = require('twitter');
//spotify
var Spotify = require('node-spotify-api');
var spotOffset = 0;

var file = './logs/logcat.txt';
var logOutPut = false;
var doConti = true;
var separator = `########\n`;

var userInput = process.argv.slice(2);

if (userInput.length === 0) {
  helpInfo();
} else {
  //-log must be last option
  if (
    userInput.indexOf('-log') !== -1 &&
    userInput.indexOf('-log') !== userInput.length - 1
  ) {
    console.log(`\n  Invalid input\n`);
    helpInfo();
    return null;
  }

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
    case 'prompt':
      prompt();
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
    }
  });
}

function helpInfo() {
  console.group();
  console.log(`node liri.js [songs|tweets|movies|file|prompt] [param] [-log]`);
  console.log(`   \nOptions`);
  console.log(`     songs <search_text> - Search Spotify for tracks`);
  console.log(`     tweets <search_text> - Search Twitter for entered text`);
  console.log(`     movies <title> - Search IMDB for movie title`);
  console.log(`     file <filepath> - run searches from file`);
  console.log(`     prompt - Inquired prompt`);
  console.log(`     -log - log results in ./logs/logcat.txt`);
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
      message: 'Would you like to search more?',
      name: 'continue',
    },
  ]).then((data) => {
    if (data.continue) prompt();
    else console.log('Good bye!');
    return null;
  });
}

// fetchSpotify('dil se');

function fetchSpotify(search) {
  var Spotify = require('node-spotify-api');
  var URL = `https://api.spotify.com/v1/search?`;

  var spotify = new Spotify(keys.spotify);
  var params = {
    type: 'track',
    query: search || 'Bruno Mars',
    limit: 5,
    offset: spotOffset,
  };

  var parsedParams = '';
  for (var i in params) {
    parsedParams += `${i}=${params[i]}&`;
  }
  URL += parsedParams;

  spotify
    .request(URL)
    .then(function(data) {
      var strOut = separator;

      data.tracks.items.forEach((e) => {
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

      console.log('\x1b[34m', strOut);

      if (logOutPut) logOutPutFile(strOut);

      getMoreSongs(params.limit, params.query, data.tracks.total);
    })
    .catch(function(err) {
      console.error('Error occurred: ' + err);
    });
}

function getMoreSongs(limit, search, total) {
  Inquirer.prompt([
    {
      type: 'confirm',
      message: `Get Next ${limit} songs?`,
      name: 'getNext',
    },
  ]).then((data) => {
    spotOffset += limit;
    if (data.getNext && spotOffset < total) {
      fetchSpotify(search);
      return null;
    } else {
      spotOffset = 0;
      if (doConti) doContinue();
      return null;
    }
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
    console.log('\x1b[32m', strOut);
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
    console.log('\x1b[35m', strOut);
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
