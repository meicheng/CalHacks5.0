// Node.js + Express server backend for Toxicon
// run this once to create the initial database as the data.db file
// node database.js

// To clear the database, simply delete the data.db file and reinitialize the database

const sqlite3 = require('sqlite3');
const db = new sqlite3.Database('data.db');

//Code that creates all of the necessary tables for storing our data.
db.serialize(() => {
  // Create a new database table:
  db.run("CREATE TABLE questions_to_contexts (idx TEXT, number TEXT, content TEXT, topic TEXT, badmouth TEXT, banter TEXT)");
  db.run("CREATE TABLE transcripts (transcript TEXT)");
  db.run("CREATE TABLE words_said_to_text (words TEXT)");
  db.run("CREATE TABLE audio (audiofiles TEXT)");

  // Populates the questions_to_contexts table with questions to use for the quiz.
  db.run("INSERT INTO questions_to_contexts VALUES ('1', '1', 'You are a trash jungler.', 'disappointment', 'true', 'false')");
  db.run("INSERT INTO questions_to_contexts VALUES ('2', '2', 'Your brain must be a pea.', 'profanity', 'true', 'false')");
  db.run("INSERT INTO questions_to_contexts VALUES ('3', '3', 'Lol, just concede piece of garbage.', 'belittling', 'true', 'false')");
  db.run("INSERT INTO questions_to_contexts VALUES ('4', '4', 'Hey, just concede with us or I will report.', 'ordering', 'false', 'true')");
  db.run("INSERT INTO questions_to_contexts VALUES ('5', '5', 'OMG, your gank and gameplay suck.', 'commenting', 'false', 'true')");
  db.run("INSERT INTO questions_to_contexts VALUES ('6', '6', 'Stop fighting dude.', 'intervention', 'false', 'true')");
  db.run("INSERT INTO questions_to_contexts VALUES ('7', '7', 'Get out of my lane!', 'anger', 'false', 'true')");
  db.run("INSERT INTO questions_to_contexts VALUES ('8', '8', 'Get your CS up.', 'condescending', 'false', 'true')");
  db.run("INSERT INTO questions_to_contexts VALUES ('9', '9', 'Use your ult yo.', 'domineering', 'false', 'true')");
  db.run("INSERT INTO questions_to_contexts VALUES ('10', '10', 'I will report and find you irl.', 'threat', 'true', 'false')");

  console.log('successfully created the questions_to_contexts table in data.db');

  // Print tables out to confirm their contents:
  db.each("SELECT idx, number, content, topic, badmouth, banter FROM questions_to_contexts", (err, row) => {
      console.log(row.idx + ": " + row.number + ' - ' + row.content + ' - ' + row.topic + ' - ' + row.badmouth + ' - ' + row.banter);
  });
});

db.close();
