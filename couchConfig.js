{

  port: 8125
,deleteIdleStats: true

, couchhost: '192.168.3.21'   
, couchdb: 'abtest'
//, debug: true

//all below are optional
//,bulk_size: 2500      // (0 to disable)
//,bulk_wait: 50

//, id_prefix: "c0-"
//, id_prefix: process.pid

//choose just one
//, id_generator: "couch"
//, id_generator: "cuid"
//, id_generator: "node-uuid-v1"
//, id_generator: "node-uuid-v4"
//, id_generator: "custom"
//only needed for 'custom'
//, uuid_generator: function(num){ return Math.round(new Date().getTime() / 1000) + '-' + num; }  

, backends: [ "./backends/couch" ]

}
