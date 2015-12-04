var fs = require('fs'),
    natural = require('natural')
    mongoose = require('mongoose'),
    async = require('async');

// Natural variables
var tokenizer = new natural.WordTokenizer();

// Mongoose configuration and variables
mongoose.connect('mongodb://192.168.1.111/nlp');
var Schema = mongoose.Schema,
    ObjectId = Schema.ObjectId;
var Term = mongoose.model('Term', new Schema({
  token: String,
  documents: [{
    fileName: String,
    termFrequency: Number
  }],
  inverseDocumentFrequency: Number
}));

// Back to reality
var stopWords = ['akin', 'aking', 'ako', 'akong', 'alin', 'aling', 'amin',
    'aming', 'ang', 'ano', 'anong', 'at', 'atin', 'ating', 'ay', 'ayan',
    'ayon', 'ayun', 'dahil', 'daw', 'di', 'din', 'dito', 'eto', 'ganito',
    'ganiyan', 'ganon', 'ganoon', 'ganyan', 'hayan', 'hayun', 'heto', 'hindi',
    'ikaw', 'inyo', 'ito', 'iyan', 'ka', 'kami', 'kanila', 'kaniya', 'kapag',
    'kasi', 'kay', 'kayo', 'kina', 'ko', 'kung langmag', 'maging', 'mang',
    'may', 'mga', 'mo', 'mong', 'na', 'namin', 'natin', 'ng', 'nga', 'ngunit',
    'nila', 'ninyo', 'nito', 'niya', 'niyon', 'nya', 'nyo', 'nyon', 'pa',
    'pag', 'pala', 'para', 'patipo', 'sa', 'saan', 'saka', 'samin', 'san',
    'sapagkat', 'si', 'sila', 'sino', 'siya', 'subalit', 'sya', 'tayo',
    'tungkol', 'uung', 'upang', 'yan', 'yun', 'yung'];

var tokens;
var term;

var files = fs.readdirSync('tagalog-news');

async.eachSeries(files, function (file, callback1) {
  console.log('Processing file: ' + file);
  var fileContent = fs.readFileSync('tagalog-news/' + file, 'utf-8');
  tokens = tokenizer.tokenize(fileContent);
  for (var i = 0; i < tokens.length; i++) {
    tokens[i] = tokens[i].toLowerCase();
  }
  async.eachSeries(tokens, function (token, callback2) {
    if (stopWords.indexOf(token) > 0) {
      // console.log('\"' + token + '\" is a stop word.');
      callback2(null);
    } else {
      Term.findOne( {token: token}, function (err, term) {
        if (err) {
          return console.log('An error occured. ' + err);
        } else if (!term) { // If the term doesn't exist yet in the db, then create a new entry
          // console.log('Saving \"' + token + '\" to the database');
          term = new Term();
          term.token = token;
          term.documents.push({fileName: file, termFrequency: 1});
          term.inverseDocumentFrequency = null;
          term.save(function (errTerm, savedTerm) {
            if (errTerm) return console.log('An error 2 occured. ' + errTerm);
            callback2(errTerm);
          });
        } else if (term) { // If the term does exist, then update that entry
          // We have to check first if the document is already registered in the term, so we can update that frequency
          // If it doesn't exist, then we have to insert another document in the term, and termFrequency should be 1
          // console.log('Updating \"' + token + '\" in the database');

          var foundFile = null;
          for (var k = 0; k < term.documents.length; k++) {
            if (term.documents[k].fileName.toString() === file.toString()) {
              term.documents[k].termFrequency += 1;
              foundFile = true;
              break;
            }
          }

          if (!foundFile) {
            term.documents.push({fileName: file, termFrequency: 1});
          }

          term.save(function() {
            callback2();
          });
        }
      });
    }
  }, function (err2) {
    if (err2) throw err2;
    console.log('Finished processing file: ' + file);
    callback1();
  });
}, function (err1) {
  if (err1) throw err1;
  console.log('Done with everything');
  mongoose.connection.close();
});