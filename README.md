# copy_to_new

JS Tangle traversal script that extracts confirmed transactions and stores it in a new database

In script copy_to_new.js, Configure: lines 7-10

var IP_OLD = 'localhost';

var IP_NEW = 'ip-of-your-new-node';

var PORT_OLD = 14265

var PORT_NEW = 14265

Execute the script (takes 1hour)
Make sure you give the program as much heap as possible (in this example 4GB)

```
npm install
nodejs --max_old_space_size=4096 ./copy_to.js
```
