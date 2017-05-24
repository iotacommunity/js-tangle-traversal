var XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;
var async = require('async');
var IOTA = require("iota.lib.js");

var iota = new IOTA();

var IP_OLD = 'localhost';
var IP_NEW = 'ip-of-your-new-node';
var PORT_OLD = 14265
var PORT_NEW = 14265
var tips = [];

// All tx hashes
var allTxs = new Set()
var allTxsArray = [];
var allTxsArrayIdx = 0;

// All txs with associated values
var fullTxs = new Set()

function sendRequest(url, requestData, callback) {
    var request = new XMLHttpRequest();
    request.open("POST", url, true);
    request.onreadystatechange = function() {
    if (this.readyState == 4) {
      var json = JSON.parse(this.responseText);
      if (json.exception) {
        callback(json.exception);
      } else if (json.error) {
        callback(json.error);
      } else {
        callback(null, json);
      }
    }
  };
  request.send(JSON.stringify(requestData));
}

function traverse(tips) {

    var continueTraverse = true;

    async.doWhilst(function(callback) {
        iota.api.getTransactionsObjects(tips, function(e, transactions) {
            var numTxs = allTxs.size;
            var txList = [];
            transactions.forEach(function(tx) {
                // If this tx has been found before
                // add its transaction object to fullTxs set
                if (allTxs.has(tx['hash'])) {
                    fullTxs.add(JSON.stringify(tx));
                }
                // For branch transaction
                // Check if unique
                var currentNumTxs = allTxs.size;

                allTxs.add(tx['branchTransaction']);

                if (allTxs.size > currentNumTxs) {
                    txList.push(tx['branchTransaction']);
                    allTxsArray[allTxsArrayIdx] = tx['branchTransaction'];
                    allTxsArrayIdx++;
                }
                // For trunk transaction
                // Check if unique
                var currentNumTxs = allTxs.size;

                allTxs.add(tx['trunkTransaction']);

                if (allTxs.size > currentNumTxs) {
                    txList.push(tx['trunkTransaction']);
                    allTxsArray[allTxsArrayIdx] = tx['trunkTransaction'];
                    allTxsArrayIdx++;
                }
            });

            // If end of tangle reached
            // get the final values
            if (numTxs === allTxs.size) {
                continueTraverse = false;
            }
            // If end not reached, reassign the txs for traversal
            console.log("Confirmed Txs: ", allTxs.size);
            tips = txList;
            //if (numTxs > 2000) {
            //    continueTraverse = false;
            //}
            callback(null)
        })
    }, function() {
        return continueTraverse === true;

    }, function() {
        console.log("Final Confirmed Txs: ", allTxs.size);
        traverse = false;
        doMigrate = true;
        allTxsArrayIdx = 0;
        lock = false;
    })

}

var bcounter = 0;
function migrate() {
    var hash = allTxsArray[allTxs.size-allTxsArrayIdx-1];
    console.log(hash);

    var command = {
        'command' : 'getTrytes',
        'hashes'  : [hash]
    }
    var uri = 'http://'+IP_OLD+":"+PORT_OLD;
    sendRequest(uri,command, function(error, success) {
        if (error) {
            console.log(error);
        }
        else {
            var trytes = success.trytes[0];
            var allNine = true;
            for (n=0;n<trytes.length;n++) {
                if (trytes.charAt(n) != '9') {
                    allNine = false;
                    break;
                }
            }
            if (allNine === false) {
                var command = {
                    'command' : 'storeTransactions',
                    'trytes'  : [trytes]
                }
                uri = 'http://'+IP_NEW+":"+PORT_NEW;
                sendRequest(uri,command, function(error, success) {
                    if (error) {
                        console.log(error);
                    }
                    else {
                        console.log("--- "+bcounter);
                        bcounter++;
                    }
                });
            }
        }
    });

    allTxsArrayIdx++;
    lock = false;
    if (allTxsArrayIdx >= allTxs.size) {
        process.exit();
    }
}

var doTraverse = true;
var fetchMilestones = true;
var doMigrate = false;
var lock = false;

function onMyTimer() {
    if (lock) return;
    lock = true;
    if (fetchMilestones === true) {
        iota.api.getNodeInfo(function(e,s) {
            var milestoneHash = s.latestSolidSubtangleMilestone;
            var latestIndex = s.latestSolidSubtangleMilestoneIndex;
            console.log("Traversing Tangle at Milestone: "+latestIndex+" hash: "+milestoneHash);
            tips.push(milestoneHash);
            fetchMilestones = false;
            lock = false;
        });
        return;
    }
    if (doTraverse === true) {
        traverse(tips);
        doTraverse = false;
        return;
    }
    if (doMigrate === true) {
        migrate();
    }
}

onMyTimer();
setInterval(onMyTimer, 10);

