/**
 * Author: David Cline
 */

process.env.NODE_ENV = 'test';

var chai     = require( 'chai' ),
    chaiHttp = require( 'chai-http' ),
    sinon    = require( 'sinon' ),
    should   = chai.should(),
    fs       = require( 'fs' ),
    path     = require( 'path' ),
    util     = require( '../../lib/util.js' ),
    testUtils = require( '../../lib/testUtils.js' ),
    Cookie   = require( 'cookiejar' ),
    request  = require( 'supertest' ),
    app      = require( '../../../../gulpfile' ).app;

testUtils.setVerbose( false ); // Set to true to have test logic log to console
                                 // note: if the code itself logs, it will continue
                                 // to do so

var server = request.agent( app );

chai.use( chaiHttp );

/** TEST CONSTANTS **/
var TESTSDATA = path.join( __dirname, 'testsData' );
var TESTVS = path.join( TESTSDATA, 'videoscrubbing' );
var TESTVSSAMPLE = path.join( TESTVS, 'testVS' );
var RESOURCEFORWARD = path.join( __dirname, 'testsResources', 'forward.mp4' );
var TESTFORWARD = path.join( TESTVSSAMPLE, 'forward.mp4' );
var RESOURCEBACKWARD = path.join( __dirname, 'testsResources', 'backward.mp4' );
var TESTBACKWARD = path.join( TESTVSSAMPLE, 'backward.mp4' );
var RESOURCEINVALID = path.join( __dirname, 'testsResources', 'invalid.mp4' );
var TESTINVALID = path.join( TESTVSSAMPLE, 'invalid.mp4' );
var RESOURCEXX = path.join( __dirname, 'testsResources', 'xx~.mp4' );
var TESTXX = path.join( TESTVSSAMPLE, 'xx~.mp4' );
var TESTUPLOADTIMES = path.join( TESTSDATA, 'uploadTimes.json' );

/** TEST HELPERS **/
var expectSuccess = function( err, res, vsName ) {
	if ( err ) throw err;
	res.should.have.status( 200 );
	res.should.have.deep.property( 'body.success', true );
	testUtils.checkForDirs( 
		[ 
			path.join( TESTSDATA, 'videoscrubbing' ),
			path.join( TESTSDATA, 'videoscrubbing', vsName )
		]
	).should.equal( true );
}

var expectFail = function( err, res, nameFlag ) {

	res.should.have.status( 409 );
	if ( nameFlag ) {
		res.should.have.deep.property( 'body.name',
				"Videoscrubbing name is either not present or invalid" );
	} else {
		res.should.have.deep.property( 'body.other', 
				"Error writing videoscrubbing to file system" );
		res.should.have.deep.property( 'body.problem' );
		res.body.problem.should.be.a( 'string' );
	}

}

/** TESTS **/

describe( 'newVs', function() {
	var sandbox;
	
	beforeEach( function() {
		console.log( "Calling before each" );
		sandbox = sinon.sandbox.create();
		testUtils.stubFS( sandbox, TESTSDATA );
	});

	afterEach( function() {
		console.log( "Calling afterEach" );
		testUtils.cleanUp( sandbox, path.join( TESTSDATA, 'videoscrubbing') );
	});

	it( "makes a single, new videoscrubbing folder", function( done ) {
		testUtils.authenticate( server, function( e, r ) {
			if ( e ) throw e;

			var token = testUtils.getToken( r );
			server
				.post( '/content-manager/api/newVS' )
				.set( 'x-csrf-token', token )
				.send( { vsName: 'testVSName' } )
				.end( function( err, res ) {
					if ( err ) throw err;
					
					expectSuccess( err, res, 'testVSName' );
					
					done();
				});	
		});
	});

	it( "fails when a videoscrubbing of the same name exists", function( done ) {
		testUtils.authenticate( server, function( e, r ) {
			if ( e ) throw e;

			var token = testUtils.getToken( r );
			server
				.post( '/content-manager/api/newVS' )
				.set( 'x-csrf-token', token )
				.send( { vsName: 'testVSName' } )
				.end( function( err, res ) {
					if ( err ) throw err;
					
					expectSuccess( err, res, 'testVSName' );

					token = testUtils.getToken( res );

					server
						.post( '/content-manager/api/newVS' )
						.set( 'x-csrf-token', token )
						.send( { vsName: 'testVSName' } )
						.end( function( err, res ) {
							if ( err ) throw err;

							expectFail( err, res );
							testUtils.checkForDirs( 
								[ 
									path.join( TESTSDATA, 'videoscrubbing' ),
									path.join( TESTSDATA, 'videoscrubbing', 'testVSName' )
								]
							).should.equal( true );

							done();
						});
				});	
		});
	});

	it( "fails when videoscrubbing name is invalid", function( done ) {
		testUtils.authenticate( server, function( e, r ) {
			if ( e ) throw e;

			var token = testUtils.getToken( r );
			server
				.post( '/content-manager/api/newVS' )
				.set( 'x-csrf-token', token )
				.send( { vsName: 'xx~' } )
				.end( function( err, res ) {
					if ( err ) throw err;
					
					expectFail( err, res, true );

					testUtils.checkForDirs(
						[
							path.join( TESTSDATA, 'videoscrubbing', 'xx~' )
						]
					).should.equal( false );

					done();
				});
		});
	});

	it( "fails when not authenticated", function( done ) {
		var diffServer = request.agent( app );
		diffServer
			.get( '/' )
			.end( function( e, r )  {
				if ( e ) throw e;

				var token = testUtils.getToken( r );
				diffServer
					.post( '/content-manager/api/newVS' )
					.set( 'x-csrf-token', token )
					.send( { vsName: 'testVSName' } )
					.end( function( err, res ) {
						if ( err ) throw err;

						res.should.not.have.status( 200 );

						testUtils.checkForDirs(
						    [
						        path.join( TESTSDATA, 'videoscrubbing', 'testVSName' )
						    ]
						).should.equal( false );
						
						done();
					});
			});
	});

	it( "succeeds on multiple consecutive concurrent requests", function( done ) {

		this.timeout( 100000 );

		var numRequests = 30;
		var numReturned = 0;

		var finishTest = function() {
			console.log( "Calling finishTest" );
			var expectedDirs = [];
			for( var j = 0; j < numRequests; j++ ) {
				expectedDirs.push( path.join( TESTSDATA, 
						'videoscrubbing', 'testVS' + j.toString() ) );
			}
			testUtils.checkForDirs( expectedDirs ).should.equal( true );
			done();
		}

		var numRequestsRange = [];
		for ( var i = 0; i < numRequests; i++ ) {
			numRequestsRange.push( i );
		}

		numRequestsRange.forEach( function( num, j ) {
			var server = request.agent( app );
			testUtils.authenticate( server, function( e, r ) {
				if ( e ) {
					console.log( "Error in authentication callback\n", e.stack );
					return;
				}
				var token = testUtils.getToken( r );
				server
					.post( '/content-manager/api/newVS' )
					.set( 'x-csrf-token', token )
					.send( { vsName: 'testVS' + j.toString() } )
					.end( function( err, res ) {
						if ( err ) { 
							console.log( "ERROR!!!" );
							console.log( err.stack );
						}
						numReturned++;
						if ( numReturned === numRequests ) {
							finishTest();
						}
					});
			});
		});
	});
});

describe( 'Upload videoscrubbings', function() {

	describe( 'when directories already exist', function () {
		var sandbox = null;
		beforeEach( function() {
			testUtils.addDirs( [ TESTSDATA, TESTVS, TESTVSSAMPLE ] );
			sandbox = sinon.sandbox.create();
			testUtils.stubFS( sandbox, TESTSDATA );
		});

		afterEach( function() {
			testUtils.cleanUp( sandbox, TESTSDATA, true );
		});

		it( "should succeed when the single forward.mp4 file is uploaded", function( done ) {
			this.timeout( 2000 );

			testUtils.authenticate( server, function( e, r ) {
				if ( e ) throw e;
				var token = testUtils.getToken( r );
				server
					.post( '/content-manager/api/upload' )
					.set( 'x-csrf-token', token )
					.field( 'uploadType', 'videoscrubbing' )
					.field( 'currentVS', path.parse( TESTVSSAMPLE ).name )
					.attach( 'file', RESOURCEFORWARD )
					.send( { uploadType: 'videoscrubbing' } )
					.end( function( err, res ) {
						if ( err ) throw err;

						res.should.have.status( 204 );

						testUtils.checkForDirs([
							TESTSDATA,
							TESTVS,
							TESTVSSAMPLE
						]).should.equal( true );

						testUtils.checkForFiles([
							TESTFORWARD,
							TESTUPLOADTIMES
						]).should.be.true;

						testUtils.checkJSONKeys( 
							path.join( TESTSDATA, 'uploadTimes.json' ),
							[
								path.join( path.resolve( '../uploads/videoscrubbing/testVS' ), 
										'forward.mp4' )
							]
						).should.be.true;
						
						done();
					});
			});
		});

		it( "should succeed when both the forward.mp4 and backward.mp4 " + 
				"files are uploaded on the same request", function( done ) {
			this.timeout( 2000 );

			testUtils.authenticate( server, function( e, r ) {
				if ( e ) throw e;
				var token = testUtils.getToken( r );
				server
					.post( '/content-manager/api/upload' )
					.set( 'x-csrf-token', token )
					.field( 'uploadType', 'videoscrubbing' )
					.field( 'currentVS', path.parse( TESTVSSAMPLE ).name )
					.attach( 'file', RESOURCEFORWARD )
					.attach( 'file', RESOURCEBACKWARD )
					.send( { uploadType: 'videoscrubbing' } )
					.end( function( err, res ) {
						if ( err ) throw err;

						res.should.have.status( 204 );

						testUtils.checkForDirs([
							TESTSDATA,
							TESTVS,
							TESTVSSAMPLE
						]).should.equal( true );

						testUtils.checkForFiles([
							TESTFORWARD,
							TESTBACKWARD,
							TESTUPLOADTIMES
						]).should.be.true;

						testUtils.checkJSONKeys( 
							TESTUPLOADTIMES,
							[
								path.join( path.resolve( '../uploads/videoscrubbing/testVS' ), 
										'forward.mp4' ),
								path.join( path.resolve( '../uploads/videoscrubbing/testVS' ),
										'backward.mp4' )
							]
						).should.be.true;
						
						done();
					});
			});
		});

		it( "should succeed when forward.mp4 and backward.mp4 are " + 
				"uploaded on different requests", function( done ) {
			this.timeout( 2000 );

			testUtils.authenticate( server, function( e, r ) {
				if ( e ) throw e;
				var token = testUtils.getToken( r );
				server
					.post( '/content-manager/api/upload' )
					.set( 'x-csrf-token', token )
					.field( 'uploadType', 'videoscrubbing' )
					.field( 'currentVS', path.parse( TESTVSSAMPLE ).name )
					.attach( 'file', RESOURCEBACKWARD )
					.send( { uploadType: 'videoscrubbing' } )
					.end( function( err, res ) {
						if ( err ) throw err;

						res.should.have.status( 204 );

						testUtils.checkForDirs([
							TESTSDATA,
							TESTVS,
							TESTVSSAMPLE
						]).should.equal( true );

						testUtils.checkForFiles([
							TESTBACKWARD,
							TESTUPLOADTIMES
						]).should.be.true;

						testUtils.checkJSONKeys( 
							TESTUPLOADTIMES,
							[
								path.join( path.resolve( '../uploads/videoscrubbing/testVS' ), 
										'backward.mp4' )
							]
						).should.be.true;
						
						token = testUtils.getToken( res );
						server
							.post( '/content-manager/api/upload' )
							.set( 'x-csrf-token', token )
							.field( 'uploadType', 'videoscrubbing' )
							.field( 'currentVS', path.parse( TESTVSSAMPLE ).name )
							.attach( 'file', RESOURCEFORWARD )
							.send( { uploadType: 'videoscrubbing' } )
							.end( function( er, re ) {
								if ( er ) throw er;

								re.should.have.status( 204 );

								testUtils.checkForDirs([
									TESTSDATA,
									TESTVS,
									TESTVSSAMPLE
								]).should.equal( true );

								testUtils.checkForFiles([
									TESTFORWARD,
									TESTBACKWARD,
									TESTUPLOADTIMES
								]).should.be.true;

								testUtils.checkJSONKeys( 
									TESTUPLOADTIMES,
									[
										path.join( path.resolve( '../uploads/videoscrubbing/testVS' ), 
												'forward.mp4' ),
										path.join( path.resolve( '../uploads/videoscrubbing/testVS' ),
												'backward.mp4' )
									]
								).should.be.true;

								done();
							});
					});
			});

		});

		it( "should fail when the filename is not forward.mp4 or backward.mp4", 
				function( done ) {
			this.timeout( 2000 );

			testUtils.authenticate( server, function( e, r ) {
				if ( e ) throw e;
				var token = testUtils.getToken( r );
				server
					.post( '/content-manager/api/upload' )
					.set( 'x-csrf-token', token )
					.field( 'uploadType', 'videoscrubbing' )
					.field( 'currentVS', path.parse( TESTVSSAMPLE ).name )
					.attach( 'file', RESOURCEINVALID )
					.send( { uploadType: 'videoscrubbing' } )
					.end( function( err, res ) {
						if ( err ) throw err;

						res.should.have.status( 409 );

						testUtils.checkForDirs([
							TESTSDATA,
							TESTVS,
							TESTVSSAMPLE
						]).should.equal( true );

						testUtils.checkForFiles([
							TESTINVALID
						]).should.be.false;
						
						done();
					});
			});
		});

		it( "should fail when the filename has bad characters", function( done ) {
			this.timeout( 2000 );

			testUtils.authenticate( server, function( e, r ) {
				if ( e ) throw e;
				var token = testUtils.getToken( r );
				server
					.post( '/content-manager/api/upload' )
					.set( 'x-csrf-token', token )
					.field( 'uploadType', 'videoscrubbing' )
					.field( 'currentVS', path.parse( TESTVSSAMPLE ).name )
					.attach( 'file', RESOURCEXX )
					.send( { uploadType: 'videoscrubbing' } )
					.end( function( err, res ) {
						if ( err ) throw err;

						res.should.have.status( 409 );

						testUtils.checkForDirs([
							TESTSDATA,
							TESTVS,
							TESTVSSAMPLE
						]).should.equal( true );

						testUtils.checkForFiles([
							TESTXX
						]).should.be.false;
						
						done();
					});
			});
		});
	});

	describe( "when the videoscrubbing directory doesn't exist yet", function() {
		var sandbox = null;
		beforeEach( function() {
			testUtils.addDirs( [ TESTSDATA, TESTVS ] );
			sandbox = sinon.sandbox.create();
			testUtils.stubFS( sandbox, TESTSDATA );
		});

		afterEach( function() {
			testUtils.cleanUp( sandbox, TESTSDATA, true );
		});

		it( "should fail if a videoscrubbing directory of the given name " +
				"doesn't exist", function( done ) {
			testUtils.authenticate( server, function( e, r ) {
				if ( e ) throw e;
				var token = testUtils.getToken( r );
				server
					.post( '/content-manager/api/upload' )
					.set( 'x-csrf-token', token )
					.field( 'uploadType', 'videoscrubbing' )
					.field( 'currentVS', path.parse( TESTVSSAMPLE ).name )
					.attach( 'file', RESOURCEFORWARD )
					.send( { uploadType: 'videoscrubbing' } )
					.end( function( err, res ) {
						if ( err ) throw err;

						res.should.have.status( 409 );

						testUtils.checkForDirs([
							TESTSDATA,
							TESTVS
						]).should.equal( true );

						testUtils.checkForDirs([
							TESTVSSAMPLE
						]).should.be.false;

						testUtils.checkForFiles([
							TESTFORWARD
						]).should.be.false;
						
						done();
					});
			});
		});

		it( "should succeed if a videoscrubbing directory of the given name " +
				"is made", function( done ) {
			testUtils.authenticate( server, function( e, r ) {
				if ( e ) throw e;

				var token = testUtils.getToken( r );
				server
					.post( '/content-manager/api/newVS' )
					.set( 'x-csrf-token', token )
					.send( { vsName: path.basename( TESTVSSAMPLE ) } )
					.end( function( err, res ) {
						if ( err ) throw err;
						
						expectSuccess( err, res, path.basename( TESTVSSAMPLE ) );
						
						server
							.post( '/content-manager/api/upload')
							.set( 'x-csrf-token', token )
							.field( 'uploadType', 'videoscrubbing' )
							.field( 'currentVS', path.parse( TESTVSSAMPLE ).name )
							.attach( 'file', RESOURCEFORWARD )
							.send( { uploadType: 'videoscrubbing' } )
							.end( function( err, res ) {
								if ( err ) throw err;

								res.should.have.status( 204 );

								testUtils.checkForDirs([
									TESTSDATA,
									TESTVS,
									TESTVSSAMPLE
								]).should.be.true;

								testUtils.checkForFiles([
									TESTFORWARD,
									TESTUPLOADTIMES
								]).should.be.true;

								testUtils.checkJSONKeys( 
									path.join( TESTSDATA, 'uploadTimes.json' ),
									[
										path.join( path.resolve( '../uploads/videoscrubbing/testVS' ), 
												'forward.mp4' )
									]
								).should.be.true;
								
								done();
							});
					});
			});
		});
	});
});