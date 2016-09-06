/** 
 * Author: David Cline
 */

/** 
 * Package inclusions
 */
var fs   = require( 'fs' ),
	path = require( 'path' ),
	async = require( 'async' ),
	util = require( '../lib/util.js' );

// Utilities
var checkOrAddDir  = util.checkOrAddDir,
    checkForFile   = util.checkForFile,
    updateJSONSync = util.updateJSONSync,
    checkFilename  = util.checkFilename,
    getTime        = util.getTime;
    checkForDir    = util.checkForDir;

exports.checkFilename = util.checkFilename;

// Constants
var UPLOADSPATH = path.join( __dirname, 'uploads' );
var WIDGETSPATH = path.join( UPLOADSPATH, 'widget' );
var WIDGETJSON  = path.join( WIDGETSPATH, 'widgets.json' );
var DECKSPATH   = path.join( UPLOADSPATH, 'decks' );
var VIDEOPATH   = path.join( UPLOADSPATH, 'video' );
var IMAGEPATH   = path.join( UPLOADSPATH, 'image' );
var VSPATH      = path.join( UPLOADSPATH, 'videoscrubbing' );
var UPLOADTIMESPATH = path.join( UPLOADSPATH, 'uploadTimes.json' );

/** API **/

/**
 * Appends or overwrites an upload time to JSON file (uploads/uploadTimes.json) for passed file
 *   
 * @param pathname, should be absolute to avoid unintentional conflicts leading to overwrites
 */

var addTime = function( pathname, callback ) {

	var p = UPLOADTIMESPATH;
	checkOrAddDir( path.join( __dirname, 'uploads' ), function( err ) {
		if ( err ) {
			console.log( "Error occured in addTime!", err );
			callback( err );
			return;
		}
		try {
			updateJSONSync( p, pathname, getTime() );
		} catch ( err ) {
			console.log( "Error occured in addTime!", err );
			console.log( err.stack );
			callback( err );
			return;
		}
		callback( false );
		return;
	});
}

exports.addTime = addTime;


/**
 * Deletes a time in JSON file for passed pathname
 * 
 * @param pathname
 */

var delTime = function(pathname) {

	try {
		var filePath = path.join(__dirname, 'uploads/uploadTimes.json');
		var timesJSON = fs.readFileSync(filePath);
		var times = JSON.parse(timesJSON);

		delete times[pathname];
		fs.writeFileSync(filePath, JSON.stringify(times));
	} catch (err) {
		console.log("Call to delTime failed, threw the following error");
		console.log(err);
	}
}

exports.delTime = delTime;

/* Returns current date and time as string formatted as mm/dd/yyyy h:mm:ss */

var getTime = function() {
	var today = new Date();
	var dd = today.getDate();
	var mm = today.getMonth() + 1; 
	var yyyy = today.getFullYear();

	var hour = today.getHours();
	var minute = today.getMinutes();
	if ( minute < 10 ) { minute = '0' + minute; }
	var second = today.getSeconds();
	if ( second < 10 ) { second = '0' + second; }

	return mm + '/' + dd + '/' + yyyy + '  ' + hour + ':' + minute + ':' + second;
}

/** 
 * Takes an array of filenames and the updateTime object and returns
 * an array of upload times, organized in the order of the file names passed
 *
 * @param arr array of filenames
 * @param times an object containing mapping <absolute path string> : <upload date-time>
 * @param dirpath the path of the directory in which these files are kept
 * @return an array of times, where each time's index matches the index of its associated filename
 */

var copyTimes = function( arr, times, dirpath ) {
	var returnArr = [];
	var currTime;
	for ( var i = 0; i < arr.length; i++ ) {
		currTime = times[ path.join( dirpath, arr[ i ] ) ];
		returnArr.push( currTime );
	}
	return returnArr;
}

/**
 * Checks if the submitted file meets conditions for a deck
 * 
 * @param filename name of submitted file
 * @param deckname name of deck it hopes to join
 * @param deckpath (optional) path to deck, defaults to uploads/decks/deckname
 * @param minfloor (optional) minimum floor number (filenames can't be less)
 * @param maxfloor (optional) maximum floor number (filenames can't be more)
 * @return boolean, whether file meets conditions for a deck
 */

exports.checkAddToDeck = function ( filename, deckname, deckpath, minfloor, maxfloor, cb ) {
	var MINFLOORCONST = 0;
	var MAXFLOORCONST = 25;

	var callback;
	if ( typeof deckpath !== 'function' ) {
		deckpath = deckpath || path.join( __dirname, 'uploads', 'decks' );
	} else {
		callback = deckpath;
		deckpath = path.join( __dirname, 'uploads', 'decks' );
	}

	if ( typeof minfloor !== 'function' ) {
		// if it's 0, let it be
		if ( minfloor !== 0 ) {
			minfloor = minfloor || MINFLOORCONST;
		}
	} else {
		callback = minfloor;
		minfloor = MINFLOORCONST;
	}

	if ( typeof maxfloor !== 'function' ) {
		if ( maxfloor !== 0 ) {
			maxfloor = maxfloor || MAXFLOORCONST;
		}
	} else {
		callback = maxfloor;
		maxfloor = MAXFLOORCONST;
	}

	if ( cb && !callback ) {
		callback = cb;
	}

	var deck = path.join( deckpath, deckname );

	// Remove file-extension
	var filenameNoExt = filename.replace( /\.[^/.]+$/, "" );

	// Check if filename is a integer digit 
	if ( ! /^-?\d+$/.test( filenameNoExt ) ) {
		callback( new Error( "Filename isn't an integer" ), false );
		return;
	}
	var number = parseInt( filenameNoExt, 10 );

	// Check if file number is within accepted range
	if ( number < minfloor || number > maxfloor ) {
		callback( new Error( "Floor number is outside of accepted bounds" ), 
				false );
		return;
	}

	// Check if deck directory exists
	checkForDir( deck, function( err, exists ) {
		if ( err ) {
			callback( err, false );
			return;
		}
		if ( !exists ) {
			callback( new Error( "No deck of this name exists" ), false );
			return;
		}

		// Compare to files in passed directory
		fs.readdir( deck, function( err, files ) {
			if ( err ) {
				callback( err, false );
				return;
			}
			var curfileNoExt;
			var curNum;
			for ( var i = 0; i < files.length; i++ ) {
				curfileNoExt = files[ i ].replace( /\.[^/.]+$/, "" );
				curNum = parseInt( curfileNoExt, 10 );
				if ( number === curNum ) {
					callback( new Error( "File for this floor already exists" ), 
							false );
					return;
				}
			}
			// Everything passed!
			callback( null, true );
			return false;
		});

	});
}

/**
 * Checks if submitted file meets conditions for a valid 
 *   videoscrubbing file
 * @param filename <String> Name of the uploaded file
 * @param vsname <String> Name of videoscrubbing folder it should be uploaded to
 * @param callback <Function>
 */

exports.checkAddToVS = function( filename, vsname, callback ) {

	checkOrAddDir( UPLOADSPATH, function( err ) {
		if ( err ) {
			callback( err, false );
			return;
		}
		checkOrAddDir( VSPATH, function( err ) {
			if ( err ) {
				callback( err, false );
				return;
			}
			var currentVSFolder = path.join( VSPATH, vsname );
			checkForDir( currentVSFolder, function( err, exists ) {
				if ( err ) {
					callback( err, false );
					return;
				}
				if ( !exists ) {
					callback( new Error( "Videoscrubbing of this name does not exist" ), false );
					return;
				}

				var allowedVSFilenames = [ 'forward', 'backward' ];

				filename = filename.toLowerCase();
				var filenameNoExt = filename.replace(/\.[^/.]+$/, "");

				if ( allowedVSFilenames.indexOf( filenameNoExt ) < 0 ) {
					callback( new Error( "File name is neither 'forward' nor 'backward'" ), 
							false );
					return;
				}

				checkForFile( path.join( currentVSFolder, filename ), function( err, exists ) {
					if ( err ) {
						callback( err, false );
						return;
					}
					if ( exists ) {
						callback( new Error( "File of this name already exists" ), false );
						return;
					}

					callback( false, true );
					return;

				});
			});
		});
	});
}

/* Adds a new deck to the filesystem */

var newDeck = function( deckname, callback ) {

	checkOrAddDir( UPLOADSPATH, function( err ) {
		if ( err ) {
			callback( err );
			return;
		}
		checkOrAddDir( DECKSPATH, function( err ) {
			if ( err ) {
				callback( err );
				return;
			}
			var newDeckDir = path.join( DECKSPATH, deckname );
			checkForDir( newDeckDir, function( err, exists ) {
				if ( err ) {
					callback( err );
					return;
				}
				if ( exists ) {
					callback( new Error( "Deck of this name already exists" ) );
					return;
				} else {
					fs.mkdir( newDeckDir, function( err ) {
						if ( err ) {
							callback( err );
							return;
						}
						callback( false );
						return;
					});
				}
			});
		});
	});
}

exports.addDeck = function( req, res ) {
	
	if ( !req.body || !req.body.deckName || !checkFilename( req.body.deckName ) ) {
		return res.status( 409 ).send( { name: "Deck name is either not present or invalid" } );
	} 

	newDeck( req.body.deckName, function( err ) {
		if ( err ) {
			console.log( "Error creating new deck:\n", err.stack );
			return res.status( 409 ).send( { other: "Error adding deck to file system", 
					problem: err.message } );
		}
		return res.status( 200 ).send( req.body );

	});

}

/* Adds a new videoscrubbing folder to the filesystem */

var newVS = function( vsname, callback ) {

	checkOrAddDir( UPLOADSPATH, function( err ) {
		if ( err ) {
			callback( err );
			return;
		}
		checkOrAddDir( VSPATH, function( err ) {
			if ( err ) {
				callback( err );
				return;
			}
			var newVSDir = path.join( VSPATH, vsname );
			checkForDir( newVSDir, function( err, exists ) {
				if ( err ) {
					callback( err );
					return;
				}
				if ( exists ) {
					callback( new Error( "Videoscrubbing of this name already exists" ) );
					return;
				} else {
					fs.mkdir( newVSDir, function( err ) {
						if ( err ) {
							callback( err );
							return;
						}
						callback( false );
						return;
					});
				}
			});
		});
	});
}

exports.addVS = function( req, res, next ) {

	if ( !req.body.vsName || !checkFilename( req.body.vsName ) ) {
		return res.status( 409 ).send( { name: "Videoscrubbing name is either not present or invalid" } );
	}

	newVS( req.body.vsName, function( err ) {
		if ( err ) {
			console.log( "Err to send is ", err );
			return res.status( 409 ).send( { other: "Error writing videoscrubbing to file system", 
					problem: err.message } );
		}
		return res.status( 200 ).send( { success: true } );
	});
}

/* Renders content-manager index.jade with filenames and times */

exports.init = function(req, res) {

	// Respond without any data for rendering
	var respondError = function( err ) {
		console.log( 'Unable to to render content-manager, due to following error\n', 
				err.stack );
		res.render('../views/content-manager/index', {
			data: {
				deckNames: [],
				decksArr: [],
				vsNames: [],
				vsArr: [],
				videoArr: [],
				imageArr: [],
				dTimes: [],
				vTimes: [],
				iTimes: [],
				vsTimes: []
			}
		});
		return;
	}

	// Read the names and files contained within decks, videoscrubbings
	var handleDeckLike = function( isVs, callback ) {
		var p = isVs ? VSPATH : DECKSPATH;

		var returnObj = {};
	    fs.readdir( p, function( err, files ) {
	    	if ( err ) {
	    		callback( err, null );
	    		return;
	    	}

	    	// Create absolute paths for files
	    	var absPaths = [];
	    	for( var i = 0; i < files.length; i++ ) {
	    		absPaths.push( path.join( p, files[ i ] ) );
	    	}

	    	// Check which of the read files are directories
	    	async.map( absPaths, fs.lstat, function( err, results ) {
	    	    if ( err ) {
	    	    	callback( err, null );
	    	    	return;
	    	    }
	    	    // Read directory names
	    	    returnObj.names = [];
	    	    for ( var i = 0; i < results.length; i++ ) {
	    	    	if ( results[ i ].isDirectory() ) {
	    	    		returnObj.names.push( files[ i ] );
	    	    	}
	    	    }

	    	    var dirPaths = [];
	    	    for( var i = 0; i < returnObj.names.length; i++ ) {
	    	    	dirPaths.push( path.join( p, returnObj.names[ i ] ) );
	    	    }

	    	    // Read those directories to find filenames
	    	    async.map( dirPaths, fs.readdir, function( err, twoDArray ) {
	    	    	if ( err ) {
	    	    		callback( err, null );
	    	    		return;
	    	    	}
	    	    	// Sort as numbers
	    	    	for ( var j = 0; j < twoDArray.length; j++ ) {
	    	    		if ( twoDArray[ j ].sort ) {
	    	    			twoDArray[ j ].sort( function( a, b ) {
	    	    				if ( !isNaN( parseInt( a ) ) && !isNaN( parseInt( b ) ) ) {
	    	    					return parseInt( a ) - parseInt( b );
	    	    				} else {
	    	    					return 0;
	    	    				}
	    	    			});
	    	    		}
	    	    	} 
	    	    	returnObj.arr = twoDArray;
	    	    	callback( null, returnObj );
	    	    	return;
	    	    });
	    	});
	    });
	}

	// Read uploads from videos, images
	var handleImageLike = function( isVideo, callback ) {
		var p = isVideo ? VIDEOPATH : IMAGEPATH;

		var returnObj = {};
		fs.readdir( p, function( err, files ) {
			if ( err ) {
				callback( err, null );
				return;
			}
			returnObj.arr = files;
			callback( null, returnObj );
			return;
		});
	}

	// Callback for checking if the uploads directories are set-up
	var dirCheckerCallback = function( p, callback ) {
		checkOrAddDir( p, function( err ) {
			if ( err ) {
				callback( err );
				return;
			}
			callback( null );
			return;
		});
	}

	checkOrAddDir( UPLOADSPATH, function( err ) {
		if ( err ) {
			respondError( err );
			return;
		}
		async.parallel([
			function( callback ) {
				dirCheckerCallback( DECKSPATH, callback );
			},
			function( callback ) {
				dirCheckerCallback( IMAGEPATH, callback );
			},
			function( callback ) {
				dirCheckerCallback( VIDEOPATH, callback );
			},
			function( callback ) {
				dirCheckerCallback( VSPATH, callback );
			},
			function( callback ) {
				try {
					updateJSONSync( UPLOADTIMESPATH, false, false );
					callback( null );
					return;
				} catch ( e ) {
					callback( e );
					return;
				}	
			}
		], function( err, results ) {
			if ( err ) {
				respondError( err );
				return;
			}
			async.parallel({
			    decks: function( callback ) {
			    	handleDeckLike( false, callback );
			    },
			    vs: function( callback ) {
		    		handleDeckLike( true, callback );
			    },
			    image: function( callback ) {
			    	handleImageLike( false, callback );
			    },
			    video: function( callback ) {
			        handleImageLike( true, callback );
			    }
			}, function( err, results ) {
			    if ( err ) {
			    	respondError( err );
			    	return;
			    }

			    // Read upload times and add the times to the rendering data
			    fs.readFile( UPLOADTIMESPATH, function( err, data ) {
			    	if ( err ) {
			    		respondError( err );
			    		return;
			    	}
			    	var times = {};
			    	try {
			    		times = JSON.parse( data );
			    	} catch ( e ) {
			    		respondError( e );
			    		return;
			    	}

			    	// Decks
			    	results.decks.dTimes = [];
			    	for ( var i = 0; i < results.decks.arr.length; i++ ) {
			    		results.decks.dTimes.push( copyTimes( results.decks.arr[ i ], 
			    				times, path.join( DECKSPATH, results.decks.names[ i ] ) ) );
			    	}
			    	// Videoscrubbings
			    	results.vs.vsTimes = [];
			    	for ( var j = 0; j < results.vs.arr.length; j++ ) {
			    		results.vs.vsTimes.push( copyTimes( results.vs.arr[ j ], times, 
			    				path.join( VSPATH, results.vs.names[ j ] ) ) );
			    	}
			    	// Videos and images
			    	results.video.videoTimes = copyTimes( results.video.arr, times, VIDEOPATH );
					results.image.imageTimes = copyTimes( results.image.arr, times, IMAGEPATH );

					// Send rendering
					res.render( '../views/content-manager/index', {
						data: {
							deckNames: results.decks.names,
							decksArr: results.decks.arr,
							vsNames: results.vs.names,
							vsArr: results.vs.arr,
							videoArr: results.video.arr,
							imageArr: results.image.arr,
							dTimes: results.decks.dTimes,
							vTimes: results.video.videoTimes,
							iTimes: results.image.imageTimes,
							vsTimes: results.vs.vsTimes
						}
					});
					return;
			    });
			});
		});
	});
}


