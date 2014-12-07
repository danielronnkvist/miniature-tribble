var http = require('http');
var https = require('https');
var ig = require('instagram-node').instagram();
var fs = require('fs');

var history = JSON.parse(fs.readFileSync('log.json', 'UTF-8'));

// Instagram API setup
var instaConf = JSON.parse(fs.readFileSync('instagramconfig.json', 'UTF-8'));
ig.use({
  client_id: instaConf.client_id,
  client_secret: instaConf.client_secret
});

// Require and initialize 6px
var sixpxConf = JSON.parse(fs.readFileSync('6pxconfig.json', 'UTF-8'));
var px = require('6px')({
    userId: sixpxConf.user_id,
    apiKey: sixpxConf.apiKey,
    apiSecret: sixpxConf.apiSecret
});

ig.user_media_recent('364714453', { count: 1 }, function(err, medias, pagination, remaining, limit) {
  if(err)
  {
    console.error(err);
    process.exit(1);
  }
  for(var i = 0; i < history.length; i++)
  {
    if(history[i] == medias[0].id)
    {
      console.log("No new image");
      process.exit(0);
    }
  }
  http.get(medias[0].images.standard_resolution.url, function(res){
    var imgData = "";
    res.setEncoding('binary');

    res.on('data', function(chunk){
      imgData += chunk;
    });

    res.on('end', function(){
      var imPath = './originals/'+medias[0].id+'.jpg';
      fs.writeFile(imPath, imgData, 'binary', function(err){
        if(err){
          console.error(err);
          process.exit(1);
        }
        console.log('Image fetched and saved');
        sendToPx(imPath);
      })
      history.push(medias[0].id);
      fs.writeFile('log.json', JSON.stringify(history), 'UTF-8', function(err){
        if(err){
          console.error(err);
          process.exit(1);
        }
        console.log('Log updated');
      })
    });
  });
});

function sendToPx(imPath)
{
  px.on('connection', function(){
    var image = px({ taxi: imPath });
    var output = image.output({ taxi: 'greenToPink'})
                      .tag('tryckbar')
                      .url('6px')
                      .filter({ colorize: { hex: '#FD80FF', strength: 50 } });

    image.save().then(function(res) {
      console.log("Image saved");
      https.get(res.outputs.tryckbar.refs.taxi.location, function(res){
        var imgData = "";
        res.setEncoding('binary');

        res.on('data', function(chunk){
          imgData += chunk;
        });

        res.on('end', function(){
          var imPath = './outputs/'+history[history.length-1]+'.jpg';
          fs.writeFile(imPath, imgData, 'binary', function(err){
            console.log('Image fetched and saved');
            var twitterAPI = require('node-twitter-api');
            var twitterConf = JSON.parse(fs.readFileSync('twitterconfig.json', 'UTF-8'));
            var twitter = new twitterAPI({
              consumerKey: twitterConf.consumer_key,
              consumerSecret: twitterConf.consumer_secret,
              callback: 'http://127.0.0.1:3000/callback'
            });

            twitter.statuses("update_with_media",
              {
                media: [
                  imPath
                ],
                status: ""
              },
              twitterConf.acess_token,
              twitterConf.acess_token_secret,
              function(err, data, response){
                if(err) {
                  console.error(err);
                  process.exit(1);
                }else{
                  console.log("Tweet done!");
                  console.log(data);
                  process.exit(0);
                }
              });
          });
        });
      });
    }, function(err){
      console.error(err);
      process.exit(1);
    });
  });
}
