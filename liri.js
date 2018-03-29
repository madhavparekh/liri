require('dotenv').config();
var Request = require('request');
var Inquirer = require('inquirer');
var fs = require('fs');
var keys = require('./keys');

//twitter
var Twitter = require('twitter');
//spotify
var Spotify = require('node-spotify-api');
var spotOffset = 0; //pagination
//Log results
var file = './logs/log.txt'; //log file
var logOutPut = false;

var doConti = true; //flag if user wants to continue with Inquirer prompt
//search result separator
var separator = `########\n`;

var userInput = process.argv.slice(2);

//'-log' must be last option
if (
  userInput.indexOf('-log') !== -1 &&
  userInput.indexOf('-log') !== userInput.length - 1
) {
  console.log(`\n  Invalid input\n`);
  helpInfo();
}

if (userInput[userInput.length - 1] === '-log') {
  logOutPut = true;
  var searchStr = arrayParser(userInput.slice(1, userInput.length - 1));
} else var searchStr = arrayParser(userInput.slice(1)); //go thru user input and concat in one string for API search

doSwitch(userInput[0], searchStr);

function doSwitch(api, searchStr) {
  switch (api) {
    case 'songs':
      fetchSpotify(searchStr);
      break;
    case 'tweets':
      getTweets(searchStr);
      break;
    case 'movie':
      getMovies(searchStr);
      break;
    case 'prompt': //inquirer
      prompt();
      break;
    case 'file':
      readFile();
      doConti = false;
      break;
    default:
      console.log(`\n  Invalid input\n`);
      helpInfo();
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
        //time out for mutliple command lines from file
        setTimeout(() => {
          doSwitch(search[0], search[1]);
        }, 1000);
      });
    }
  });
}

function helpInfo() {
  console.group();
  console.log(`node liri.js [songs|tweets|movie|file|prompt] [param] [-log]`);
  console.log(`   \nOptions`);
  console.log(`     songs <search_text> - Search Spotify for tracks`);
  console.log(`     tweets <search_text> - Search Twitter for entered text`);
  console.log(`     movie <title> - Search IMDB for movie title`);
  console.log(`     file <filepath> - run searches from file`);
  console.log(`     prompt - Inquirer prompt`);
  console.log(`     -log - log results in ./logs/log.txt`);
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
      choices: ['Tweets', 'Songs', 'Movie'],
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
        getMovies(data.param);
        break;
    }
  });
}

function doContinue() {
  Inquirer.prompt([
    {
      type: 'confirm',
      message: 'Continue with different search?',
      name: 'continue',
    },
  ]).then((data) => {
    if (data.continue) prompt();
    else console.log('Good bye!');
    return null;
  });
}

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

      if (doConti) getMoreSongs(params.limit, params.query, data.tracks.total);
    })
    .catch(function(err) {
      console.error('Error occurred: ' + err);
    });
}

function getMoreSongs(limit, search, total) {
  var choices =
    spotOffset > 0
      ? [`Previous ${limit}`, `Next ${limit}`, `Done`]
      : [`Next ${limit}`, `Done`];
  var message = spotOffset > 0 ? `Go back/Get more songs?` : `Get more songs?`;
  Inquirer.prompt([
    {
      type: 'list',
      message: message,
      choices: choices,
      name: 'page',
    },
  ]).then((data) => {
    if (data.page === `Next ${limit}` && spotOffset < total) {
      spotOffset += limit;
      fetchSpotify(search);
      return null;
    } else if (data.page === `Previous ${limit}` && spotOffset >= limit) {
      spotOffset -= limit;
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
  //adds time stamp to logged file
  str = new Date() + '\n' + str;
  fs.appendFile(file, str, (err) => {
    if (err) console.log(err);
  });
}
