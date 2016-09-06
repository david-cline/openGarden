/**
 * Author: David Cline
 */

/** INCLUSIONS **/
var fs       = require('fs'),
	path     = require('path'),
	lockFile = require('lockfile');

var lockOpts = {
	wait: 50000,
	stale: 2000
}


/** UTILITIES **/

exports.checkString = function( arg ) {
	if ( typeof arg === 'string' || arg instanceof String ) {
		return true;
	}
	return false;
}

/* Returns current date and time as string formatted as mm/dd/yyyy h:mm:ss */
exports.getTime = function() {
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

exports.unformattedTime = function() {
	var today = new Date();
	var dd = today.getDate();
	var mm = today.getMonth() + 1; 
	var yyyy = today.getFullYear();

	var hour = today.getHours();
	var minute = today.getMinutes();
	if ( minute < 10 ) { minute = '0' + minute; }
	var second = today.getSeconds();
	if ( second < 10 ) { second = '0' + second; }

	return mm + '/' + dd + '/' + yyyy + ' ' + hour + ':' + minute + ':' + second;

}

// Takes a URL or a portion of a URL as a string, removes any trailing 
//     slashes, puts it into lowercase and returns the altered string
exports.formatURL = function( url ) {
	var res = url;
	if ( url.length > 1 && url.slice( -1 ) === '/' ) {
		res = url.slice( 0, url.length - 1 );
	}
	return res.toLowerCase();
}

// Returns if directory exists, otherwise creates directory
// callback( error )
exports.checkOrAddDir = function( p, callback ) {

	var lockpath = p + '.lock';
	lockFile.lock( lockpath, lockOpts, function( lerr ) {
		if ( lerr ) {
			callback( lerr );
			return;
		}
		fs.lstat( p, function( err, stats ) { 
			if ( err && err.code === 'ENOENT' ) {
				fs.mkdir( p , function( e ) {
					var mkdirReturnVal = null;
					returnVal = false;
					if ( e ) {
						mkdirReturnVal = e;
					}
					lockFile.unlock( lockpath, function( ler ) {
						if ( ler ) {
							callback( ler );
							return;
						}
						callback( mkdirReturnVal );
						return;
					});
				});
			} else {
				var returnValue = null;
				if ( err && err.code !== 'ENOENT' ) {
					returnVal = err;
				} else if ( stats && stats.isDirectory() ) {
					returnVal = false;
				} else {
					returnVal = new Error( "Is a file, not a directory!" );
				}
				lockFile.unlock( lockpath, function( ler ) {
					if ( ler ) {
						callback( ler );
						return;
					}
					callback( returnVal );
					return;
				});
			}
		});
	});
};

exports.checkOrAddDirSync = function( p ) {
	var stats = {};
	try {
		stats = fs.lstatSync( p );
	} catch ( err ) {
		if ( err.code === 'ENOENT' ) {
			try {
				fs.mkdirSync( p );
			} catch ( err ) {
				console.log( "Error making directory at path ", p );
				console.log( err );
			}
		}
	}
};

// Gives callback ( err, true/false whether a directory at this path exists )
exports.checkForDir = function( p, callback ) {
	fs.lstat( p, function( err, stats ) {
		if ( err && err.code === 'ENOENT' ) {
			callback( false, false );
			return;
		}

		if ( err ) {
			callback( err, false );
			return;
		}

		if ( stats ) {
			if ( ! stats.isDirectory() ) {
				callback( new Error( "Isn't a directory" ), false );
				return;
			} else {
				callback( false, true );
				return;
			}
		}
		if ( !stats ) {
			callback( new Error( "lstat neither errored or passed stats" ), false );
			return;
		}
	});
};

// // Removes a directory and its contents at the given path
// var emptyDir = function( p, callback ) {
// 	checkForDir( p, function( err, exists ) {
// 		if ( err ) {
// 			callback( err );
// 			return;
// 		}
// 		if ( !exists ) {
// 			callback( new Error( "Directory didn't exist at path " + p ) );
// 			return;
// 		}
// 		fs.readdir( p, function( err, files ) {
// 			for ( var file in files ) {
// 				var curpath = p + "/" + file;
// 				fs.unlinkSync( curpath );
// 			}
// 		});
// 	});
// }

// Returns callback( err, true/false whether (file is not a directory && exists) )
exports.checkForFile = function( p, callback ) {
	fs.lstat( p, function( err, stats ) {
		if ( err && err.code === 'ENOENT' ) {
			callback( false, false );
			return;
		}

		if ( err ) {
			callback( err, false );
			return;
		}

		if ( stats ) {
			if ( stats.isDirectory() ) {
				callback( new Error( 'Is directory' ), false );
				return;
			} else {
				callback( false, true );
				return;
			}
		}
	});
};

/* Synchronous version of checkForFile, may throw an error */
exports.checkForFileSync = function( p ) {
	try {
		var stats = fs.lstatSync( p );
		if ( stats ) {
			if ( stats.isDirectory() ) {
				throw "Is directory";
			} else {
				return true;
			}
		}
	} catch ( err ) {
		if ( err && err.code && err.code === 'ENOENT' ) {
			return false;
		} else {
			throw err;
		}
	}
	
}

/* Appends the key:val pair to the JSON file at the given path, will create a file
   at the path if it doesn't exist. If either or both key and val are false-y, 
   and the file doesn't exist, the empty JSON file will be created in its stead.
   Because of this, keys and vals should always be of the string type, if they are
   boolean values or null they may be denied.
   callback( err )
*/

exports.updateJSON = function( p, key, val, callback ) {
	checkForFile( p, function( error, exists ) {
		if ( error ) {
			callback( error );
			return;
		}
		if ( !exists ) {
			var writeObj = {};
			if ( key && val ) {
				writeObj[ key ] = val;
			}
			fs.writeFile( p, JSON.stringify( writeObj ), function( e ) {
				if ( e ) {
					callback( e );
					return;
				}
				callback( false );
				return;
			});
		} else {
			fs.readFile( p, function( e, data ) {
				if ( e ) {
					callback( e );
					return;
				}
				var readObj = {};
				try {
					readObj = JSON.parse( data );
				} catch ( err ) {
					callback( err );
					return;
				}
				readObj[ key ] = val;
				fs.writeFile( p, JSON.stringify( readObj ), function( e ) {
					if ( e ) {
						callback( e );
						return;
					}
					callback( false );
				});
			});
		}
	});
};

/* Synchronous version of updateJSON, may throw an error */

exports.updateJSONSync = function( p, key, val ) {
	var exists = checkForFileSync( p );
	if ( !exists ) {
		var writeObj = {};
		if ( key && val ) {
			writeObj[ key ] = val;
		}
		fs.writeFileSync( p, JSON.stringify( writeObj ) );
	} else {
		var data = fs.readFileSync( p );
		var readObj = JSON.parse( data );
		readObj[ key ] = val;
		fs.writeFileSync( p, JSON.stringify( readObj ) );
	}
}


/**
 * Checks a given string to see if it contains only lower-case letters, 
 * upper-case letters, numbers, dashes, and spaces.
 * Takes a string, returns true if it meets these conditions, false otherwise
 */

exports.checkFilename = function(filename) {
	return /^[a-zA-Z0-9\-\s]+$/.test( filename );
}


var checkOrAddDir = exports.checkOrAddDir,
    checkForFile  = exports.checkForFile,
    updateJSON    = exports.updateJSON,
    checkFilename = exports.checkFilename,
    checkForDir   = exports.checkForDir,
    checkForFileSync = exports.checkForFileSync,
    updateJSONSync = exports.updateJSONSync,
    formatURL      = exports.formatURL,
    getTime        = exports.getTime,
    checkOrAddDirSync = exports.checkOrAddDirSync;
