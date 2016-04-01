var morgan  = require('morgan');
var express = require('express');
var app     = express();
var server  = require('http').createServer(app);
var io      = require('socket.io')(server);
var knox    = require('knox');
var fs = require('fs');
var gm = require('gm');
var port    = process.env.PORT || 8000;
var imageStore = "https://s3-eu-west-1.amazonaws.com/betterside/";
var s3 = require('s3');

 
var client = s3.createClient({
  maxAsyncS3: 20,     // this is the default 
  s3RetryCount: 3,    // this is the default 
  s3RetryDelay: 1000, // this is the default 
  multipartUploadThreshold: 20971520, // this is the default (20 MB) 
  multipartUploadSize: 15728640, // this is the default (15 MB) 
  s3Options: {
    accessKeyId: process.env.AWS_ACCESS_KEY,
    secretAccessKey: process.env.AWS_SECRET_KEY,
    // any other options are passed to new AWS.S3() 
    // See: http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/Config.html#constructor-property 
  },
});

//project4-wdi

app.set('views', './views');
app.set('view engine', 'ejs');

app.use(express.static(__dirname + '/views'));

app.use(morgan('dev'));

app.get('/', function(req, res) {
  res.render('index');
});


io.on('connect', function(socket) {
  console.log("User connected with socket id of: " + socket.conn.id);
  socket.on('message', function(message) {
    console.log(message.lastimage)
    saveBase64Local(message.lastimage, message.username);
    gifFramesEachLoop(message.username); // break gif frames to seperate files 
    io.emit('message', message);
  });
});

// save Base64 gif to file.
var saveBase64Local = function(imageBase64, username){
buf = new Buffer(imageBase64.replace(/^data:image\/\w+;base64,/, ""),'base64')
fs.writeFile(username + '.gif', buf, function(err) {
  console.log(err);
   });
}
var gifFramesEachLoop = function(username) {
var i = 0;
  while (i < 5){
    writeGifFramesLocal(username + ".gif[" + i + "]", i, username);
   i++  
 }
}
/////////Write Individual Image Frames
var writeGifFramesLocal = function(localgif, i, username){
gm(localgif)
.write(username + i + '.png', function (err) {
  if (err) console.log('aaw, shucks' + err);
  frameSaved = username + i + '.png';
  console.log("successfully saved locally :" + frameSaved );
  framesToAmazon(frameSaved, username);
  });
}
 /////////////////////////////////

var framesToAmazon = function(localfile, username){ 
  var params = {
    localFile: localfile,
   
    s3Params: {
      Bucket: "project4-wdi",
      Key: username + "/" + localfile,
    },
  };
  var uploader = client.uploadFile(params);
  uploader.on('error', function(err) {
    console.error("unable to upload:", err.stack);
  });
  uploader.on('progress', function() {
    console.log("progress", uploader.progressMd5Amount,
              uploader.progressAmount, uploader.progressTotal);
  });
  uploader.on('end', function() {
    console.log("done uploading");
  });

};







   
/*
READ THIS BEFORE YOU CONTINUE TOMORROW ////////////// 
http://stackoverflow.com/questions/7511321/uploading-base64-encoded-image-to-amazon-s3-via-node-js

YOU NEED TO GET THE ARRAY of BASE64 GIF files, and SAVE THOSE as GIFS on AMAZON S3.

Then you need to send each of those to the Google Cloud Vision Processor. 


////////////// Changed my mind

http://stackoverflow.com/questions/23620470/node-js-saving-canvas-as-an-image-for-heroku-hosted-apps-using-amazon-s3*/
app.use('/scripts/gifshot', express.static(__dirname + '/node_modules/gifshot/build/'));

server.listen(port, function() {
  console.log('Server started on ' + port);
});