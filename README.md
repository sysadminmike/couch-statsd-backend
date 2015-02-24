# couch-statsd-backend

Backend for [StatsD](https://github.com/etsy/statsd), which
publishes stats to CouchDB (http://http://couchdb.apache.org/)

## Installation

    npm install couch-statsd-backend


## Configuration



	  ,deleteIdleStats: true  

	//, id_prefix: "c0-"
	//, id_prefix: process.pid + '-';
	//, id_generator: "couch" //default - no need to install anything more
	//, id_generator: "cuid"
	//, id_generator: "node-uuid-v1"
	//, id_generator: "node-uuid-v4"


	//, debug: false 

	, couchhost: '192.168.3.21'   //default: localhost
	//, couchport: '5984'
	, couchdb: 'aatest' 


	, backends: [ "./backends/console" ]





### Doc _id notes

id_prefix: Depending on the setup it may be useful to prefix the _id with a string to identify the 
statsd process which sent the doc.  Default is not to add anything.


It is possible to choose how the couch doc._id is generated - by default a single request to couchhost/_uuids 
is made per flush but an _id can be generated with javascript instead. 

If 'cuid' or 'node-uuid' are chosen you may need to first install the npms as they are not installed by default.

    npm install cuid

and

    npm install node-uuid


If custom is chosen then uuid_generator must also be set eg:

      , id_generator: "custom"
      , uuid_generator: function(num){ return Math.round(new Date().getTime() / 1000) + '-' + num; }  

Note: The uuid_generator function is passed 'num' which is incremented each call within a flush, this is reset on each flush.


##Supported Metrics

* Counters
* Counter Rates
* Gauges
* Timers
* Timer Data
* Sets

###Counters & Counter Rates

Counters and counter rates are combined into one doc - this can be easily 
modified by un-commenting the a few lines.

    echo "myservice.mycount:67|c" | nc -n -w 1 -u 192.168.3.22 8125 

Will add a doc like:

    {
       "_id": "f83a62b3456f4c2451cb7a166100f3e8",
       "_rev": "1-d68546bae9169fa4b4a72b3ffe4167b9",
       "type": "counter",
       "name": "myservice.mycount",
       "count": 67,
       "rate": 6.7,
       "ts": 1424818189
    }


If two counts of the same name within same flush period

    echo "myservice.mycount:20|c" | nc -n -w 1 -u 192.168.3.22 8125 
    echo "myservice.mycount:30|c" | nc -n -w 1 -u 192.168.3.22 8125 

Will add a doc like:

    {
       "_id": "f83a62b3456f4c2451cb7a1661010a10",
       "_rev": "1-89dc6493c2418acb351e9767e6653c65",
       "type": "counter",
       "name": "myservice.mycount",
       "count": 50,
       "rate": 5,
       "ts": 1424818219
    }


###Gauges
TODO: Add example couch docs

###Timers & Timer Data
TODO: Notes on how these are rolled up - add example couch docs

###Sets
TODO: Add example couch docs


