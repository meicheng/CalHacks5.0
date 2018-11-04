const express = require('express');
const app = express();
var upload = require('express-fileupload');

// use this library to interface with SQLite databases: https://github.com/mapbox/node-sqlite3
const sqlite3 = require('sqlite3');
const db = new sqlite3.Database('data.db');


const SpeechToTextV1 = require('watson-developer-cloud/speech-to-text/v1'); //Import Watson TTS Service
const fs = require('fs'); //For writing text to files
const speech_to_text = new SpeechToTextV1 ({ //All necessary api verification data
  username: '9df8919f-7841-498a-9237-a194deff1691',
  password: 'bSEaeNwCoYXl',
  headers: {
  'X-Watson-Learning-Opt-Out': 'true'
  }
});

app.engine('html', require('ejs').renderFile);
app.set('view engine', 'html');

app.use(upload()); //configure middleware for fileupload

/*

DO
I
NEED
THIS
PART???

*/


//app.use(express.static('static_files'));
//app.use(express.static(application_root));

/**
  This interaction allows for users to upload audio files onto
  the server, adding the file name to the top of the database.
*/

app.post('/upload',function(req,res){
  console.log(req.files);
  if(req.files.upfile){
    var file = req.files.upfile,
      name = file.name,
      type = file.mimetype;
    var uploadpath = __dirname + '/uploads/' + name;
    file.mv(uploadpath,function(err){
      if(err){
        console.log("File Upload Failed",name,err);
        res.send("Error Occured!")
      }
      else {
        console.log("File Uploaded",name);
        console.log("Adding " + "uploads/" + name + " to the database...");
        db.run(
          'INSERT INTO audio VALUES ($audiofiles)', //Insert transcript into the Transcripts table in data.db
          // parameters to SQL query:
          {
            $audiofiles: "uploads/" + name
          },
          // callback function to run when the query finishes:
          (err) => {
            if (err) {
              res.send({message: 'error in app.post(/text)'});
            } else {
                res.redirect('audio.html');
            }
          }
        );

      }
    });
  }
  else {
    res.send("No File selected !");
    res.end();
  };
})

app.get('/', function (req, res) {
  res.render('index', {});
});

/**
  This ajax call tells the Text-to-Speech API to start
  transcribing the most recently uploaded audio file.
**/
  app.get('/encode', (req, res) => {
    db.all('SELECT audiofiles FROM audio', (err, rows) => {

      console.log(rows);
      const allFiles = rows.map(e => e.audiofiles);
      console.log(allFiles);

      var x = (allFiles.length - 1);
      let route = allFiles[x];
      console.log(route);

      var file = route;
      var params = { //Data about the audio file
          content_type: 'audio/mp3', //filetype CHANGE TO MP3 if using mp3 files to test
          audio: fs.createReadStream(file), //Creates a stream to read the mp3 file
          //'user_token': 'job25',
          timestamps: true //Provides timestamp info
        };

        speech_to_text.createJob(params, function(error, job) { //Creates a job to read the audio file mentioned above
          if (error)
            console.log('Error:', error);
          else
            console.log('No problems!');
            res.send({message: 'Successfully created job!'});
          });
        });
      });

  /**
    This ajax call looks at the latest job created on the TTS API
    and (if available) returns a transcription of the most recently
    sent audio while also sending it into the database.
  **/
  app.get('/transcribe', (req, res) => {
      speech_to_text.checkJobs(null, function(error, jobs) { //Generates the list of all jobs created so far
        if (error){
          console.log('Error:', error);
        }
        else{
          console.log('No problems!')
          console.log(JSON.stringify(jobs, null, 2));
          let idVal = jobs.recognitions[0].id; //Extracts id from specific job info
          let params2 = {};
          params2['id'] = idVal;
          console.log(params2);
          speech_to_text.checkJob(params2, function(error, job) { //Uses prior job id to get transcript from job
            if (error){
              console.log('Error:', error);
              res.send({message: 'Could not transcribe audio. Your audio may still be processing, please wait and try again in a few minutes.'});
            }
            else{
              try{
                console.log(JSON.stringify(job.results[0].results[1]));
                let string = "";
                for (var x in job.results[0].results){
                let data = JSON.stringify(job.results[0].results[x].alternatives[0].transcript, null, 2)
                let noquotes = data.slice(1, -1);
                string += " " + noquotes; //Clean data to only show transcript
                }
                console.log(string);
                db.run(
                  'INSERT INTO transcripts VALUES ($transcript)', //Insert transcript into the Transcripts table in data.db
                  // parameters to SQL query:
                  {
                    $transcript: string
                  },
                  db.each("SELECT transcript FROM transcripts", (err, row) => { //Prints transcripts table for debugging
                      console.log("Inserted: " + row.transcript);
                  }));

                var fs = require('fs'); //fs is used to write transcript to file
                fs.writeFile("test.txt", string, function(err) {
                if(err) {
                    console.log(err);
                    res.send({message: 'Could not transcribe audio. Your audio may still be processing, please wait and try again in a few minutes.'});
                }
                res.send(string);
              });
              }
              catch(error){
                console.log("BIG ERROR");
                res.send('Could not transcribe audio. Your audio may still be processing, please wait and try again in a few minutes.');
              }
          }
        });
      }
    });
  });

/**
  This ajax interaction uses the most recent text inputted
  within the textarea of the upload page from the database and sends
  it to the Natural Language Understanding API, returning
  the emotional analysis.
**/
app.get('/text', (req, res) => {
  // db.all() fetches all results from an SQL query into the 'rows' variable:
  db.all('SELECT words FROM words_said_to_text', (err, rows) => {

    var results;

    console.log(rows);
    const allWords = rows.map(e => e.words);
    console.log(allWords);


    var NaturalLanguageUnderstandingV1 = require('watson-developer-cloud/natural-language-understanding/v1.js');
    var natural_language_understanding = new NaturalLanguageUnderstandingV1({
      'username': '8cbbdded-1f4d-4ea3-b143-13371634a65e',
      'password': 's8Yll4h8ASYf',
      'version': '2018-03-16'
    });

    var x = (allWords.length - 1);
    console.log(x);

    var parameters = {
      'text': allWords[x],
      'features': {
          'emotion': {},
          'sentiment':{},
      },
      "language": "en"
    }

    natural_language_understanding.analyze(parameters, function(err, response) {
      if (err)
        console.log('error:', err);
      else
        var results = JSON.stringify(response);
        console.log(JSON.stringify(response, null, 100));
        res.send(results);
    });
  });
});

/**
  This ajax interaction gets the latest transcription of audio from the
  database and sends it to the Natural Language Understanding
  API, returning the emotional analysis.
**/
app.get('/audio', (req, res) => {
  // db.all() fetches all results from an SQL query into the 'rows' variable:
  db.all('SELECT transcript FROM transcripts', (err, rows) => {

    var results;

    console.log(rows);
    const allTranscripts = rows.map(e => e.transcript);
    console.log(allTranscripts);


    var NaturalLanguageUnderstandingV1 = require('watson-developer-cloud/natural-language-understanding/v1.js');
    var natural_language_understanding = new NaturalLanguageUnderstandingV1({
      'username': '8cbbdded-1f4d-4ea3-b143-13371634a65e',
      'password': 's8Yll4h8ASYf',
      'version': '2018-03-16'
    });

    var x = (allTranscripts.length - 1);
    console.log(x);

    var parameters = {
      'text': allTranscripts[x],
      'features': {
        'emotion': {},
        'sentiment': {}
      },
      "language": "en"
    }

    natural_language_understanding.analyze(parameters, function(err, response) {
      if (err)
        console.log('error:', err);
      else
        var results = JSON.stringify(response);
        console.log(JSON.stringify(response, null, 100));
        res.send(results);
    });
  });
});

/**
  This ajax interaction posts the emotional analysis data
  of the most recently inputted text to the upload.html page.
**/
const bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({extended: true})); // hook up with your app
app.post('/text', (req, res) => {
  console.log(req.body);

  var results;
  var wordsToAnalyze;

  db.run(
    'INSERT INTO words_said_to_text VALUES ($words)',
    // parameters to SQL query:
    {
      $words: req.body.words,
    },
    // callback function to run when the query finishes:
    (err) => {
      if (err) {
        res.send({message: 'error in app.post(/text)'});
      } else {
        res.send({message: 'successfully run app.post(/text)'});
      }
    }
  );

});

/**
  Sends in new quotes for the quiz for users to go through
  and rate.
**/
app.get('/quizQ/:number', (req, res) => {
  const quoteToLookup = req.params.number; // matches ':number' above
  db.all(
   'SELECT * FROM questions_to_contexts WHERE idx=$number',
   // parameters to SQL query:
   {
     $number: quoteToLookup
   },
   (err, rows) => {
     console.log(rows);
     if (rows.length > 0) {
       console.log(rows[0]);
       res.send(rows[0]);
     } else {
       res.send({}); // failed, so return an empty object instead of undefined
     }
   }
)});

/**
  Begins running the server on localhost through port 3000
  and lets users know where to begin.
**/
app.listen(3000, () => {
  console.log('Server started at http://localhost:3000/');
});
