var http = require('http');
var https = require('https');
var ig = require('instagram-node').instagram();
var fs = require('fs');
var gm = require('gm');

var history = JSON.parse(fs.readFileSync('log.json', 'UTF-8'));

// Instagram API setup
var instaConf = JSON.parse(fs.readFileSync('instagramconfig.json', 'UTF-8'));
ig.use({
  client_id: instaConf.client_id,
  client_secret: instaConf.client_secret
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
        editImage(imPath);
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

function editImage(imPath)
{
  gm(imPath).modulate(150,50,100)
            .colorize(0, 60, 0)
            .write('./outputs/'+history[history.length-1]+'.jpg', function(err){
              if(err)
              {
                console.error("Error colorizing");
                console.error(err);
                process.exit(1)
              }
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
                    './outputs/'+history[history.length-1]+'.jpg'
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
}
