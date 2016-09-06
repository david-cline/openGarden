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
    async    = require( 'async'),
    app      = require( '../../../../gulpfile' ).app;

var server = request.agent( app );

testUtils.setVerbose( false ); // Set to true to have test logic log to console
                                 // note: if the code itself logs, it will continue
                                 // to do so

chai.use( chaiHttp );

/** TEST CONSTANTS **/

var TESTSDATA = path.join( __dirname, 'testsData' );
var TESTDECKS = path.join( TESTSDATA, 'decks' );
var TESTIMAGE = path.join( TESTSDATA, 'image' );
var TESTVIDEO = path.join( TESTSDATA, 'video' );
var TESTVS = path.join( TESTSDATA, 'videoscrubbing' );
var TESTDECKSSAMPLE = path.join( TESTDECKS, 'testDeck' );
var TESTVSSAMPLE = path.join( TESTVS, 'testVS' );

// Decks specific
var TESTDECKSSAMPLE = path.join( TESTDECKS, 'testDeck' );
var RESOURCEDECK = path.join( __dirname, 'testsResources', 'deckNumbers' );
var TESTUPLOADTIMES = path.join( TESTSDATA, 'uploadTimes.json' );

// Videoscrubbing specific
var TESTVSSAMPLE = path.join( TESTVS, 'testVS' );
var RESOURCEFORWARD = path.join( __dirname, 'testsResources', 'forward.mp4' );
var TESTFORWARD = path.join( TESTVSSAMPLE, 'forward.mp4' );
var RESOURCEBACKWARD = path.join( __dirname, 'testsResources', 'backward.mp4' );
var TESTBACKWARD = path.join( TESTVSSAMPLE, 'backward.mp4' );

// Videos and images
var RESOURCEMP4 = path.join( __dirname, 'testsResources', 'hello.mp4' );
var TESTMP4 = path.join( TESTVIDEO, 'hello.mp4' );
var RESOURCEJPG = path.join( __dirname, 'testsResources', 'test.jpg' );
var TESTJPG = path.join( TESTIMAGE, 'test.jpg' );


/**
 * Sets up the test uploads directory into a state to be rendered
 */
var setupUploads = function( callback ) {
    async.parallel({
        decks: function( cb ) {

            var server = request.agent( app );

            testUtils.authenticate( server, function( e, r ) {
                if ( e ) {
                    cb( e );
                    return;
                }
                var token = testUtils.getToken( r );
                var uploadReq = 
                    server.post( '/content-manager/api/upload' )
                    .set( 'x-csrf-token', token )
                    .field( 'uploadType', 'decks' )
                    .field( 'currentDeck', path.basename( TESTDECKSSAMPLE ) );

                fs.readdir( RESOURCEDECK, function( readdirErr, files ) {
                    if ( readdirErr ) {
                        cb( readdirErr );
                        return;
                    }
                    var testPaths = [];
                    var expectedKeys = [];
                    for ( var i = 0; i < files.length; i++ ) {
                        uploadReq = uploadReq.attach( 'file', 
                                path.join( RESOURCEDECK, files[ i ] ) );
                        testPaths.push( path.join( TESTDECKSSAMPLE, files[ i ] ) );
                        expectedKeys.push( path.join( 
                                path.resolve( '../uploads/decks/testDeck' ), files[ i ] ) );
                    }
                    uploadReq
                        .send( { uploadType: 'decks' } )
                        .end( function( err, res ) {
                            if ( err ) {
                                cb( err );
                                return;
                            }

                            res.should.have.status( 204 );

                            testUtils.checkForDirs([
                                TESTSDATA,
                                TESTDECKS,
                                TESTDECKSSAMPLE
                            ]).should.equal( true );

                            testPaths.push( TESTUPLOADTIMES );

                            testUtils.checkForFiles( testPaths ).should.be.true;

                            testUtils.checkJSONKeys( 
                                TESTUPLOADTIMES,
                                expectedKeys
                            ).should.be.true;

                            console.log( "~~Finished uploading deck~~" );
                            cb( null, 'decks' );
                            return;
                        });
                });
            });
        },

        videoscrubbing: function( cb ) {

            var server = request.agent( app );

            testUtils.authenticate( server, function( e, r ) {
                if ( e ) {
                    cb( e );
                    return;
                }
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
                        if ( err ) {
                            cb( err );
                            return;
                        }

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
                        
                        console.log( "~~Finished uploading videoscrubbing~~" );
                        cb( null, 'videoscrubbing' );
                        return;
                    });
            });
        },

        image: function( cb ) {

            var server = request.agent( app );

            testUtils.authenticate( server, function( e, r ) {
                if ( e ) {
                    cb( e );
                    return;
                }
                var token = testUtils.getToken( r );
                server
                    .post( '/content-manager/api/upload' )
                    .set( 'x-csrf-token', token )
                    .field( 'uploadType', 'image' )
                    .attach( 'file', RESOURCEJPG )
                    .send( { uploadType: 'image' } )
                    .end( function( err, res ) {
                        if ( err ) {
                            cb( err );
                            return;
                        }

                        res.should.have.status( 204 );

                        testUtils.checkForDirs([
                            TESTSDATA,
                            TESTIMAGE
                        ]).should.equal( true );

                        testUtils.checkForFiles([
                            TESTJPG,
                            TESTUPLOADTIMES
                        ]).should.be.true;

                        testUtils.checkJSONKeys( 
                            TESTUPLOADTIMES,
                            [
                                path.join( path.resolve( '../uploads/image/' ), 
                                        'test.jpg' )
                            ]
                        ).should.be.true;
                        
                        console.log( "~~Finished uploading image~~" );
                        cb( null, 'image' );
                        return;
                    });
            });
        },

        video: function( cb ) {

            var server = request.agent( app );

            testUtils.authenticate( server, function( e, r ) {
                if ( e ) {
                    cb( e );
                    return;
                }
                var token = testUtils.getToken( r );
                server
                    .post( '/content-manager/api/upload' )
                    .set( 'x-csrf-token', token )
                    .field( 'uploadType', 'video' )
                    .attach( 'file', RESOURCEMP4 )
                    .send( { uploadType: 'video' } )
                    .end( function( err, res ) {
                        if ( err ) {
                            cb( err );
                            return;
                        }

                        res.should.have.status( 204 );

                        testUtils.checkForDirs([
                            TESTSDATA,
                            TESTVIDEO
                        ]).should.equal( true );

                        testUtils.checkForFiles([
                            TESTMP4,
                            TESTUPLOADTIMES
                        ]).should.be.true;

                        testUtils.checkJSONKeys( 
                            TESTUPLOADTIMES,
                            [
                                path.join( path.resolve( '../uploads/video/' ), 
                                        'hello.mp4' )
                            ]
                        ).should.be.true;
                        
                        console.log( "~~Finished uploading video~~" );
                        cb( null, 'video' );
                        return;
                    });
            });
        }

    },
    function( err, results ) {
        console.log( "In async callback" );
        if ( err ) {
            callback( err );
            return;
        }
        callback( null );
        return;
    });
}

var verifyRender = function( spyCall ) {
    
    spyCall.args[ 0 ].should.equal( 
            '../views/content-manager/index' );

    var returnedData = spyCall.args[ 1 ].data;
    returnedData.should.have.property( 'deckNames' );
    returnedData.deckNames.should.eql( 
            [ path.basename( TESTDECKSSAMPLE ) ] );
    returnedData.should.have.property( 'vsNames' );
    returnedData.vsNames.should.eql( 
            [ path.basename( TESTVSSAMPLE ) ] );
    
    returnedData.should.have.property( 'decksArr' );
    var resourceDeckDir = fs.readdirSync( RESOURCEDECK );
    returnedData.decksArr[ 0 ].should.have.deep.members(
        resourceDeckDir
    );

    returnedData.should.have.property( 'vsArr' );
    returnedData.vsArr[ 0 ].should.have.deep.members(
        [
            path.basename( TESTFORWARD ), 
            path.basename( TESTBACKWARD )
        ]
    );

    returnedData.should.have.property( 'videoArr' );
    returnedData.videoArr.should.have.deep.members(
        [
            path.basename( RESOURCEMP4 )
        ]
    );

    returnedData.should.have.property( 'imageArr' );
    returnedData.imageArr.should.have.deep.members(
        [
            path.basename( RESOURCEJPG )
        ]
    );

    returnedData.should.have.property( 'dTimes' );
    returnedData.dTimes[ 0 ].should.have.lengthOf( 
            resourceDeckDir.length );
    for ( var i = 0; i < returnedData.dTimes[ 0 ].length; i++ ) {
        returnedData.dTimes[ 0 ][ i ].should.be.a( 'string' );
    }
    
    returnedData.should.have.property( 'vsTimes' );
    returnedData.vsTimes[ 0 ].should.have.lengthOf( 2 );
    for ( var i = 0; i < returnedData.vsTimes[ 0 ].length; i++ ) {
        returnedData.vsTimes[ 0 ][ i ].should.be.a( 'string' );
    }
    
    returnedData.should.have.property( 'vTimes' );
    returnedData.vTimes.should.have.lengthOf( 1 );
    for ( var i = 0; i < returnedData.vTimes.length; i++ ) {
        returnedData.vTimes[ i ].should.be.a( 'string' );
    }

    returnedData.should.have.property( 'iTimes' );
    returnedData.iTimes.should.have.lengthOf( 1 );
    for ( var i = 0; i < returnedData.iTimes.length; i++ ) {
        returnedData.iTimes[ i ].should.be.a( 'string' );
    }
}


describe( 'The content-manager renderer', function() {
    
    describe( 'with directories and test uploads', function() {

        var sandbox = null;
        var renderSpy;
        before( function( done ) {
            this.timeout( 100000 );
            testUtils.addDirs( [ TESTSDATA, TESTDECKS, TESTIMAGE, TESTVIDEO, TESTVS,
                    TESTDECKSSAMPLE, TESTVSSAMPLE ] );
            sandbox = sinon.sandbox.create();
            testUtils.stubFS( sandbox, TESTSDATA );
            setupUploads( function( err ) {
                if ( err ) throw err;
                done();
            });
        });

        beforeEach( function() {
            renderSpy = sinon.spy( app, 'render' )
                    .withArgs( '../views/content-manager/index' );
        });

        afterEach( function() {
            console.log( "After each called" );
            app.render.restore();
        });

        after( function() {
            testUtils.cleanUp( sandbox, TESTSDATA, true );
        });
        
        it( 'passes correct data to be rendered', function( done ) {
            testUtils.authenticate( server, function( e, r ) {
                if ( e ) throw e;
                var token = testUtils.getToken( r );
                server
                    .get( '/content-manager' )
                    .set( 'x-csrf-token', token )
                    .end( function( err, res ) { 
                        if ( err ) throw err;
                        res.should.have.status( 200 );
                        renderSpy.calledOnce.should.be.true;
                        verifyRender( renderSpy.getCall( 0 ) );
                        done();
                    });
            });
        });

        it( 'passes correct data to several concurrent rendering calls', 
                function( done ) {
            this.timeout( 10000 );

            var numRequests = 10;
            var numReturned = 0;

            var finishTest = function() {

                renderSpy.callCount.should.equal( numRequests );
                for ( var i = 0; i < numRequests; i++ ) {
                    verifyRender( renderSpy.getCall( i ) );
                }
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
                        .get( '/content-manager' )
                        .set( 'x-csrf-token', token )
                        .end( function( err, res ) {
                            if ( err ) { 
                                console.log( "ERROR!!!" );
                                console.log( err.stack );
                            }
                            res.should.have.status( 200 );
                            numReturned++;
                            if ( numReturned === numRequests ) {
                                finishTest();
                            }
                        });
                });
            });
        });
    });

    describe( 'with no directories or uploads', function() {

        var sandbox = null;
        var renderSpy;

        beforeEach( function() {
            testUtils.addDirs( [ TESTSDATA ] );
            renderSpy = sinon.spy( app, 'render' )
                    .withArgs( '../views/content-manager/index' );
            sandbox = sinon.sandbox.create();
            testUtils.stubFS( sandbox, TESTSDATA );
        });

        afterEach( function() {
            app.render.restore();
            testUtils.cleanUp( sandbox, TESTSDATA, true );
        });

        it( 'passes nothing to the test renderer and creates base directories',
                function( done ) {
            testUtils.authenticate( server, function( e, r ) {
                if ( e ) throw e;
                var token = testUtils.getToken( r );
                server
                    .get( '/content-manager' )
                    .set( 'x-csrf-token', token )
                    .end( function( err, res ) { 
                        if ( err ) throw err;
                        res.should.have.status( 200 );

                        testUtils.checkForDirs([
                            TESTDECKS,
                            TESTIMAGE,
                            TESTVIDEO,
                            TESTVS
                        ]);

                        renderSpy.calledOnce.should.be.true;
                        var firstCall = renderSpy.getCall( 0 );

                        var secondArg = firstCall.args[ 1 ];
                        secondArg.should.have.property( 'data' );

                        var returnedData = secondArg.data;

                        var properties = [ 'deckNames', 'decksArr', 'vsNames', 
                                'vsArr', 'videoArr', 'imageArr', 'dTimes', 
                                'vTimes', 'iTimes', 'vsTimes' ];

                        for ( var i = 0; i < properties.length; i++ ) {
                            returnedData.should.have.property( properties[ i ] );
                            returnedData[ properties[ i ] ].should.eql( [] ); 
                        }

                        done();
                    });
            });
        });

    });
});