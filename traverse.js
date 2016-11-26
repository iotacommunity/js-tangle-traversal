var IOTA = require('iota.js.lib');
var async = require('async');
var fs = require('fs');


var iota = new IOTA();

// All tx hashes
var allTxs = new Set()

// All txs with associated values
var fullTxs = new Set()


/**
*
*
**/
function getTotalValues() {

    var fullAddresses = [];

    var totalValue = 0;
    var totalAmount = 0;

    // For all transactions
    // Create list of addresses with their corresponding balances
    fullTxs.forEach(function(tx) {

        var thisTx = JSON.parse(tx);
        var thisTxValue = parseInt(thisTx.value)

        if (thisTx.address === 'EDYNEFFAUUNSNTJTAJCFSIRZXUAERSEISFSCQUXBJJTKAFUTCFEROEMNHYERVPZCLZYSAFZNLCHEPYRFL') {
            console.log("\nFOUND");
            console.log(thisTx);
            console.log("\n")
        }

        // total tangle value validity check
        totalValue += thisTxValue;

        // If tx has value, increase total amount
        if (thisTxValue > 0) {

            totalAmount += thisTxValue;
        }


        var found = false;

        // check if address was found before
        // if yes, increase balance
        fullAddresses.forEach(function(address) {

            if (address['address'] === thisTx.address) {
                found = true;
                address['value'] += thisTxValue;
            }
        })

        // If address not found before
        // add a new entry
        if (!found) {

            var newAddress = {
                'address': thisTx.address,
                'value': thisTxValue
            }

            fullAddresses.push(newAddress);
        }
    })

    fs.writeFile('./test.txt', JSON.stringify(fullAddresses),function(err){
        if(err) throw err;
    });


    console.log("Total sum of tokens transacted: ", totalAmount);
    console.log("VALIDITY CHECK: Tangle Transaction Balance (should be 0)", totalValue);



    return true;
}


/**
*
*
**/
function traverse(milestone) {

    var continueTraverse = true;

    var txs = milestone;

    async.doWhilst(function(callback) {

        iota.api.getTransactionsObjects(txs, function(e, transactions) {

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
                }

                // For trunk transaction
                // Check if unique
                var currentNumTxs = allTxs.size;

                allTxs.add(tx['trunkTransaction']);

                if (allTxs.size > currentNumTxs) {
                    txList.push(tx['trunkTransaction']);
                }
            });

            // If end of tangle reached
            // get the final values
            if (numTxs === allTxs.size) {

                continueTraverse = false;
            }

            // If end not reached, reassign the txs for traversal
            console.log("\nConfirmed Txs: ", allTxs.size);
            txs = txList;

            callback(null)
        })


    }, function() {

        return continueTraverse === true;

    }, function() {

        console.log("\nFinal Confirmed Txs: ", allTxs.size);

        traverse = false;

        return getTotalValues();
    })

}

/**
*
*
**/
function main() {

    iota.api.getNodeInfo(function(e,s) {
        var latestMilestone = s.latestSolidSubtangleMilestone;
        var latestIndex = s.latestSolidSubtangleMilestoneIndex;

        var tip = [];
        tip.push(latestMilestone);

        allTxs.add(latestMilestone);

        console.log("Traversing Tangle at Milestone: ", latestIndex);

        traverse(tip);
    })
}

main()
