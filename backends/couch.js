
var nano = require('nano');

var debug = false;
var id_prefix = '';
var id_generator = 'couch'; 
var couchdb = false;

var flush_stats = function (timestamp, metrics) {

  console.log('Flushing stats at', new Date(timestamp * 1000).toString());
//  console.log(JSON.stringify(metrics.counters['statsd.packets_received']));
//  console.log(JSON.stringify(metrics.counter_rates['statsd.packets_received']));

  var docs = [];

  for(var myname in metrics.counters) {
	if (myname == 'statsd.bad_lines_seen'   && metrics.counters[myname] == '0') continue; 
	if (myname == 'statsd.packets_received' && metrics.counters[myname] == '0') continue; 

	var m = { };
        m['type'] = 'counter';
        m['name'] = myname;
        m['count'] = metrics.counters[myname];
        if( typeof(metrics.counter_rates[myname]) == 'number' ) {
	        m['rate'] = metrics.counter_rates[myname];
	}
        if (debug) console.log(JSON.stringify(m));
 	docs.push(m);
  }

/* un-comment this if you want counter_rate metrics in its own doc and comment the above counter_rate bit
  for(var myname in metrics.counter_rates) {
	if (myname == 'statsd.bad_lines_seen'   && metrics.counter_rates[myname] == '0') continue; 
	if (myname == 'statsd.packets_received' && metrics.counter_rates[myname] == '0') continue; 

	var m = { };
        m['type'] = 'counter_rate';
        m['name'] = myname;
        m['rate'] = metrics.counter_rates[myname];
        if (debug) console.log(JSON.stringify(m));
 	docs.push(m);
  }
*/

  for(var myname in metrics.gauges) {
	if (myname == 'statsd.timestamp_lag' && metrics.gauges[myname] == '0') continue; 
	var m = { };
        m['type'] = 'gauges';
        m['name'] = myname;
        m['value'] = metrics.gauges[myname];
        if (debug) console.log(JSON.stringify(m));
 	docs.push(m);
  }

  for(var myname in metrics.timers) {
	var m = { };
        m['type'] = 'timers';
        m['name'] = myname;
        m['durations'] = metrics.timers[myname];

        //lets also add the timer_data for this timer by this name if it exits to this doc
        //console.log(JSON.stringify(metrics.timer_data[myname]));
        if( typeof(metrics.timer_data[myname]) === 'object' ) {
	        data = metrics.timer_data[myname];
		for(var dataname in data){
			m[dataname] = data[dataname]
		} 
        }
        if (debug) console.log(JSON.stringify(m));
 	docs.push(m);
  }

/* un-comment this if you want timer_data metrics in its own doc and comment the above timer_data bits
  for(var myname in metrics.timer_data) {
	var m = { };
        m['type'] = 'timer_data';
        m['name'] = myname;
        data = metrics.timer_data[myname];
	for(var dataname in data){
		m[dataname] = data[dataname]
	} 
        if (debug) console.log(JSON.stringify(m));
 	docs.push(m);
  }
*/


  for(var myname in metrics.sets) {
	var m = { };
        m['type'] = 'set';
        m['name'] = myname;
        m['set'] = metrics.sets[myname];
        if (debug) console.log(JSON.stringify(m));
 	docs.push(m);
  }
  

   if(docs.length > 0){
	if(id_generator == 'couch'){
	     nano.request( { db: "_uuids", path: "?count=" + docs.length }, function(err, uuids) {
	       if((err) || !uuids) { 
			console.log(err); 
               }else{
		  post_docs(docs,uuids.uuids,timestamp);
	       }
	     });
     	}else{
            uuids = [];
	    for (var i = 0; i < docs.length; i++) {
	       uuids.push(uuid_generator(i));
	    }
	    post_docs(docs,uuids,timestamp);
     	}
     }


};

var post_docs = function(docs,uuids,timestamp) {
	
	  if (debug) console.log('uuids: ' + JSON.stringify(uuids));
	  for(var doc in docs) {
		docs[doc]._id =  id_prefix + uuids.pop();
		docs[doc].ts = timestamp;
	  }
	  if (debug) console.log('docs: ' + JSON.stringify(docs));

	  var bulk = {};
          bulk.docs = docs;

	  var db = nano.use(couchdb);

          db.bulk(bulk, '', function(err, ret){
	     if((err) || !ret){
	          console.log('err: ' + JSON.stringify(err));    //send metric ?
                  //need to check though error and see if id collision or something else
	     }else{
		  console.log('done: added ' + ret.length + ' docs');  //all done perhaps send out a metric?
		  if (debug) console.log('docs: ' + JSON.stringify(ret));
	     }
	  });

		 // console.log('done: added ' + docs.length + ' docs');  //all done perhaps send out a metric?
};



var status = function(write) {
  ['lastFlush', 'lastException'].forEach(function(key) {
    write(null, 'console', key, this[key]);
  }, this);
};


exports.init = function(startupTime, config, events) {

  if (config.id_prefix) id_prefix = config.id_prefix
  if (config.debug)     debug = config.debug;

  id_generator = config.id_generator || 'cuid';
  switch(id_generator) {
	case 'couch':
            id_generator = 'couch';
            break;
	case 'cuid':
            var cuid = require('cuid');
            uuid_generator = function(){ return cuid(); };
	    break;
	case 'node-uuid-v1':
            var nodeuuid = require('node-uuid');
            uuid_generator = function(){ return nodeuuid.v1(); }
	    break;
	case 'node-uuid-v4':
            var nodeuuid = require('node-uuid');
            uuid_generator = function(){ return nodeuuid.v4(); }
	    break;
        case 'custom':
            //eg: uuid_generator = function(num){ return Math.round(new Date().getTime() / 1000) + '-' + num; }
            if(typeof(config.uuid_generator) != 'function'){
		console.log('custom id generation selected but config.uuid_generator is not set or is not a function');
		return false;
	    }
            uuid_generator = config.uuid_generator;
	    break;
        default:            
	    console.log('config.id_generator:' + id_generator + ' is not known select one of: couch|cuid|node-uuid-v1|node-uuid-v4|custom');
	    return false;
  }
  console.log('using: ' + id_generator + ' for id generation');


  var couchhost = config.couchhost || 'localhost';
  var couchport = config.couchport || '5984';
  
  if (typeof config.couchdb !== 'string') {
    console.log('config.couchdb is not set, config.couchdb must be set.');
    return false;
  }
  couchdb = config.couchdb;

  nano = nano('http://' + couchhost + ':' + couchport);

  events.on('flush', flush_stats);
  events.on('status', status );
  return true;
};
