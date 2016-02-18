/* eslint-disable no-console */

var Q = require('q');
var _ = require('lodash');
var tmp = require('tmp');
var path = require('path');

var Book = require('../').Book;
var NodeFS = require('../lib/fs/node');
var fs = require('../lib/utils/fs');

require('./assertions');

// Create filesystem instance for testing
var nodeFS = new NodeFS();

function setupFS(_fs, rootFolder, files) {
    return _.chain(_.pairs(files))
        .sortBy(0)
        .reduce(function(prev, pair) {
            return prev.then(function() {
                var filename = path.resolve(rootFolder, pair[0]);
                var buf = pair[1];

                if (_.isObject(buf)) buf = JSON.stringify(buf);
                if (_.isString(buf)) buf = new Buffer(buf, 'utf-8');

                return fs.mkdirp(path.dirname(filename))
                .then(function() {
                    return fs.writeFile(filename, buf);
                });
            });
        }, Q())
        .value()
        .then(function() {
            return _fs;
        });
}

// Setup a mock book for testing using a map of files
function setupBook(files, opts) {
    opts = opts || {};
    opts.log = function() { };

    return Q.nfcall(tmp.dir.bind(tmp)).get(0)
    .then(function(folder) {
        opts.fs = nodeFS;
        opts.root = folder;

        return setupFS(nodeFS, folder, files);
    })
    .then(function() {
        return new Book(opts);
    });
}

// Setup a book with default README/SUMMARY
function setupDefaultBook(files, summary, opts) {
    var summaryContent = '# Summary \n\n' +
        _.map(summary, function(article) {
            return '* [' + article.title +'](' + article.path + ')';
        })
        .join('\n');

    return setupBook(_.defaults(files || {}, {
        'README.md': 'Hello',
        'SUMMARY.md': summaryContent
    }), opts);
}

// Output a book with a specific generator
function outputDefaultBook(Output, files, summary, opts) {
    return setupDefaultBook(files, summary, opts)
    .then(function(book) {
        // Parse the book
        return book.parse()

        // Start generation
        .then(function() {
            var output = new Output(book);
            return output.generate()
                .thenResolve(output);
        });
    });
}

// Log an error
function logError(err) {
    console.log(err.stack || err);
}

module.exports = {
    setupBook: setupBook,
    setupDefaultBook: setupDefaultBook,
    outputDefaultBook: outputDefaultBook,
    logError: logError
};
