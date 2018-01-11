var fetch_coupling =	function (reqs) {
							return [reqs]
								.map (map (function (req) {
									return [from_promise (fetch (req .path, req))]
										.map (map (retaining ({
											id: req .id,
											req: req
										})))
									[0]
								}))
								.map (switchLatest)
							[0]
						};//TODO: move pair into cycle_by_fetch

var network_coupling =	function (intent) {
							return [intent] 
								.map (coupling_by_fetch)
								.map (tap (function (res) {
									var req = res .req;
									var res = Object .getPrototypeOf (res);
									log ('queryied network', req .path, req, res);
								}))
								.map (map (function (res) {
									return res .text () .then (function (text) {
										try {
											res .as_json = JSON .parse (text);
										}
										catch (e) {
											res .as_json = undefined;
										}
										finally {
											res .as_text = text;
										}
										return res
									})
								}))
								.map (map (from_promise))
								.map (switchLatest)
							[0]
						};
							
/*
var translated_coupling =	function (translate_intent, translate_state) {
								return function (coupling) {
									return	function (intent) {
												return [intent]
													.map (map (translate_intent)) 
													.map (coupling)
													.map (map (translate_state)) 
												[0]
											}
								}
							};
*/

var prefix_for_persistence = 'api-cache://';
var restoration =	localforage .keys ()
						.then (function (labels) {
							return	R .fromPairs (
										labels
											.map (function (cache_label) {
												return [ cache_label, localforage .getItem (cache_label) ]
											}))
						})
						.catch (R .pipe (
						    function (x) {setTimeout (function () { throw x }, 0)},
						    R .always ({}))
					    )
var persistence_for =	R .memoizeWith (R .identity) (function (key) {
							var persisting =	{
							                        init: restoration .then (R .prop (prefix_for_persistence + key)),
							                        progress: Promise .resolve (),
                    							    in: stream (),
                    							    out: stream ()
                    							};
							persisting .init
								.then (function (value) {
									if (value !== undefined && ! persisting .out .hasVal)
										persisting .out (value)
								});
                    		[persisting .in]
								.forEach (tap (function (_val) {
									persisting .progress = persisting .progress .then (function () {
										if (_val === undefined)
											return localforage .removeItem (prefix_for_persistence + key)
										else
											return localforage .setItem (prefix_for_persistence + key, _val)
									})
									.catch (window .report)
									.then (function () {
									    persisting .out (_val);
									})
								}));
							return persisting
						})


var no_errors = R .cond ([
                    [ R .compose (R .not, R .is (Object)), 
                    	R .F 
                	],
                    [ R .T,
                    	R .compose (R .not, R .prop ('error'))
                	]
                ]);
