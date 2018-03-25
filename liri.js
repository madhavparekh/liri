require('dotenv').config();

var keys = require('./keys');
var Twitter = require('twitter');
var Spotify = require('node-spotify-api');
var Request = require('request');

var client = new Twitter(keys.twitter);

var params = {
  screen_name: 'realdonaldtrump',
  tweet_mode : 'extended'
};
client.get('statuses/user_timeline', params, function(error, tweets, response) {
  if (error) console.log(error);
  else {
    // console.log(tweets);
    tweets.forEach((element, indx) => {
      console.log(`Tweet ${indx+1} : ${element.full_text}`);
      console.log(`---`);
    });
  }
});
