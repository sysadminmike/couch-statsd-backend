# couch-statsd-backend

Backend for [StatsD](https://github.com/etsy/statsd), which
publishes stats to [CouchDB](http://couchdb.apache.org/)

## Installation

Within your statsd install:

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


	, backends: [ "./backends/couchdb" ]





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

Note: The uuid_generator function is passed 'num' which is incremented each 
call within a flush, this is reset on each flush.


##Supported Metrics

* Counters
* Counter Rates
* Gauges
* Timers
* Timer Data
* Sets

###Counters & Counter Rates

Counters and counter rates are combined into one doc - this can be easily 
modified to create a separate docs for the counter_rates by un-commenting 
the a few lines.

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

    echo "myservice.mygauge:42|g" | nc -n -w 1 -u 192.168.3.22 8125 

Will add a doc like:

    {
       "_id": "f83a62b3456f4c2451cb7a1661012b57",
       "_rev": "1-390bc981b63e2ca16d2ad42c042f9c1b",
       "type": "gauges",
       "name": "myservice.mygauge",
       "value": 42,
       "ts": 1424819100
    }

###Timers & Timer Data
TODO: Notes on how these are rolled up - add example couch docs


###Sets 

    echo "myservice.myset:129|s" | nc -n -w 1 -u 192.168.3.22 8125 

Will add a doc like:

    {
       "_id": "f83a62b3456f4c2451cb7a16617f1d84",
       "_rev": "1-07926b51ef9b5a163a9bde8f3635223c",
       "type": "set",
       "name": "myservice.myset",
       "set": {
           "129": "129"
       },
       "ts": 1424819898
    }

*I am not sure if the set stuff is correct?


##Notes/Future Changes
A test db with snappy compression of 2 million docs consumed 0.5Gb of space.  

I suspect having the full field names in each document increases the storage requiremnts so may be better to save the metric smaller field names for example of a 'counter' type:


    {
       "_id": "f83a62b3456f4c2451cb7a1661010a10",
       "_rev": "1-89dc6493c2418acb351e9767e6653c65",
       "t": "c",
       "n": "myservice.mycount",
       "c": 50,
       "r": 5,
       "ts": 1424818219
    }

where:

    t = type  (where c = counter, g = gauge, t = timer and s = set)
    n = name
    r = rate
    
It may even be worth encoding the 'type' within the '_id' ?


Also on testing i did hit issues when adding more that 20k documents every 3 seconds - not 100% sure where the bottle neck was.
Need to look at adding some form of way to split up the docs in post_docs bulk post into smaller batches and then send each batch off to a different couchdb server in a round robin fasion so each couchdb doesnt need to handle all metrics from a flush - this may not be needed with couch 2.0 clustering stuff :).
Breaking up the bulks inserts of 20k docs may be sensible even when submitting to a single server.
