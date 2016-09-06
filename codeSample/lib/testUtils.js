/**
 * Author: David Cline
 */

/** Module dependencies **/
var util = require( './util.js' );
var fs = require( 'fs' );
var path = require( 'path' );
var Cookie = require( 'cookiejar' );
var colors = require( 'colors' );

colors.setTheme({
	silly: 'rainbow',
	input: 'grey',
	verbose: 'cyan',
	prompt: 'grey',
	info: 'green',
	data: 'grey',
	help: 'cyan',
	warn: 'yellow',
	debug: 'blue',
	error: 'red'
});

var USERPASSPAIR = { username: 'david', password: 'david' };

var VERBOSE = false;
exports.setVerbose = function setVerbose( bool ) {
	VERBOSE = bool;
}

exports.getToken = function getToken( res ) {
	var jar = new Cookie.CookieJar();
	jar.setCookies( res.headers[ 'set-cookie' ] );
	return jar.getCookie( '_csrfToken', new Cookie.CookieAccessInfo() ).value;
}

exports.authenticate = function authenticate( server, userObj, callback ) {
	var user, cb;
	if ( callback ) {
		user = userObj;
		cb = callback;
	} else {
		user = USERPASSPAIR;
		cb = userObj;
	}

	server
		.get( '/' )
		.end( function( err, res ) {
			if ( err ) {

				if ( VERBOSE ) console.log( "Error in authentication\n", err.stack );
				return;
			}
			var token = exports.getToken( res );
			server
				.post( '/login' )
				.set( 'x-csrf-token', token )
				.send( user )
				.end( cb );
		});
}

exports.emptyDirForce = function emptyDirForce( p, leaveRoot ) {
	// Make sure we only delete things in testsData
	var tokenized = p.split( "/" );
	if ( tokenized.indexOf( "testsData" ) < 0 ) {
		throw new Error( "DONT DELETE THIS !!" );
	}

	try {
		var stats = fs.lstatSync( p );
		if ( stats.isDirectory() ) {
			var files = fs.readdirSync( p );
			for ( var i = 0; i < files.length; i++ ) {
				exports.emptyDirForce( path.join( p, files[ i ] ) );
			}
			if ( !leaveRoot ) {
				fs.rmdirSync( p );
			}
		} else {
			fs.unlinkSync( p );
		}
	} catch ( e ) {
		if ( e.code !== 'ENOENT' ) {
			if ( VERBOSE ) console.log( "Couldn't empty directory due to err: ".warn, e );
		}
	}
	
};

exports.cleanUp = function cleanUp( sandbox, testDirPath, leaveRoot ) {
	sandbox.restore();
	exports.emptyDirForce( testDirPath, leaveRoot );
}

/**
 * Takes an array of paths and attempts to make directories at those
 *   paths in the order they are given
 */
exports.addDirs = function addDirs( dirPathArray ) {
	for ( var i = 0; i < dirPathArray.length; i++ ) {
		try {
			fs.mkdirSync( dirPathArray[ i ] );
		} catch ( e ) {
			if ( VERBOSE ) console.log( "Unable to add test directory,".warn, e );
		}
	}
}

/** 
  * Returns true if there is a directory at every path given in the array,
  *   false otherwise. Depends on fs.statSync, make sure this is intact
  *   before calling.
  */
exports.checkForDirs = function checkForDirs( dirArray ) {
	var stats;
	for ( var i = 0; i < dirArray.length; i++ ) {
		try {
			stats = fs.statSync( dirArray[ i ] );
			if ( !stats.isDirectory() ) {
				return false;
			}
		} catch ( e ) {
			return false;
		}
	}
	return true;
}

/**
 * Returns true if there is a non-directory file at every path 
 *   given in the array, false otherwise. Depends on fs.statSync.
 */
exports.checkForFiles = function checkForFiles( fileArray ) {
	var stats;
	for ( var i = 0; i < fileArray.length; i++ ) {
		try {
			stats = fs.statSync( fileArray[ i ] );
			if ( stats.isDirectory() ) {
				return false;
			}
		} catch ( e ) {
			return false;
		}
	}
	return true;
}

/** 
 * Returns true if the given keys exist in the given JSON file.
 *   Returns false otherwise.
 */
exports.checkJSONKeys = function checkForJSONKeys( p, keys ) {
	var readObj = JSON.parse( fs.readFileSync( p ) );
	var foundMatch;
	for ( var i = 0; i < keys.length; i++ ) {
		foundMatch = false;
		for ( var keyInJSON in readObj ) {
			if ( readObj.hasOwnProperty( keyInJSON ) &&
					keyInJSON === keys[ i ] ) {
				foundMatch = true;
				break;
			}
		}
		if ( !foundMatch ) {
			return false;
		}
	}
	return true;
}


/** 
  * Expects a sinon sandbox, stubs out filesystem to write to a test 
  *   directory instead.
  */
// Helper
var stubHelper = function( method, testDirPath ) {
	var changePath = function( givenP ) {
		var tokens = givenP.split( '/' );
		var indexOfUploads = tokens.indexOf( 'uploads' );
		var indexOfTests = tokens.indexOf( 'tests' );
		if ( indexOfUploads < 0 || indexOfTests >= 0 ) {
			// Do not change the path, have the operation proceed normally
			return false;
		}
		var currPath = testDirPath;
		for ( var i = indexOfUploads + 1; i < tokens.length; i++ ) {
			currPath = path.join( currPath, tokens[ i ] );
		}
		return currPath;
	}

	var savedMethod = fs[ method ];
	var withReturnValues = [ 'createWriteStream', 'lstatSync', 'readFileSync',
			'writeFileSync' ];
	var stub;
	if ( withReturnValues.indexOf( method ) < 0 ) {
		stub = function( p, data, callback ) {
			var cb = callback || data;
			
			// if mockedPath fails, just call the original funciton
			var mockedPath = changePath( p );
			if ( !mockedPath ) {
				if ( VERBOSE ) console.log( ( "Calling " + method + " normally on " ).debug, p );
				savedMethod( p, data, callback );
				return;
			}

			// else call it on the mocked path
			if ( util.checkString( data ) ) {
				savedMethod( mockedPath, data, cb );
			} else {
				// Assume second argument is callback
				if ( VERBOSE ) console.log( ( "Calling " + method + " on path" ).debug, mockedPath );
				savedMethod( mockedPath, cb );
			}
		}
	} else {
		stub = function( p, data ) {
			
			// If mockedPath fails, just call the original funciton
			var mockedPath = changePath( p );
			if ( !mockedPath ) {
				return savedMethod( p, data );
			}

			if ( VERBOSE ) console.log( ( "Calling " + method + " on path" ).debug, mockedPath );
			// else, call it on the mocked path
			return savedMethod( mockedPath, data );
		}
	}
	return stub;
}

exports.stubFS = function stubFS( sandbox, testDirPath, methodArray ) {
	var toStub = methodArray || 
			[ 'lstat', 'mkdir', 'readFile', 'writeFile', 'readdir', 
			'createWriteStream', 'lstatSync', 'writeFileSync', 'readFileSync' ];	
	var currMethod;
	for( var i = 0; i < toStub.length; i++ ) {
		currMethod = toStub[ i ];
		sandbox.stub( fs, currMethod, stubHelper( currMethod, testDirPath ) );
	}
}