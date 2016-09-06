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
var TESTDECKS = path.join( TESTSDATA, 'decks' );
var TESTDECKSSAMPLE = path.join( TESTDECKS, 'testDeck' );
var RESOURCEDECK = path.join( __dirname, 'testsResources', 'deckNumbers' );
var RESOURCE1 = path.join( RESOURCEDECK, '1.png' );
var TEST1 = path.join( TESTDECKSSAMPLE, '1.png' );
var RESOURCE0 = path.join( RESOURCEDECK, '0.png' );
var TEST0 = path.join( TESTDECKSSAMPLE, '0.png' );
var RESOURCE1JPG = path.join( __dirname, 'testsResources', '1.jpg' );
var TEST1JPG = path.join( TESTDECKSSAMPLE, '1.jpg' );
var RESOURCE25 = path.join( RESOURCEDECK, '25.png' );
var TEST25 = path.join( TESTDECKSSAMPLE, '25.png' );
var RESOURCE400 = path.join( __dirname, 'testsResources', '400.png' );
var TEST400 = path.join( TESTDECKSSAMPLE, '400.png' );
var RESOURCEINVALID = path.join( __dirname, 'testsResources', ' %.jpg' );
var TESTINVALID = path.join( TESTDECKSSAMPLE, ' %.jpg' );
var TESTUPLOADTIMES = path.join( TESTSDATA, 'uploadTimes.json' );

/** TEST HELPERS **/
var expectSuccess = function( err, res, deckName ) {
    if ( err ) throw err;
    res.should.have.status( 200 );
    res.should.have.property( 'body' );
    testUtils.checkForDirs( 
        [ 
            TESTDECKS,
            path.join( TESTDECKS, deckName )
        ]
    ).should.equal( true );
}

var expectFail = function( err, res, nameFlag ) {

    res.should.have.status( 409 );
    if ( nameFlag ) {
        res.should.have.deep.property( 'body.name',
                "Deck name is either not present or invalid" );
    } else {
        res.should.have.deep.property( 'body.other', 
                "Error adding deck to file system" );
        res.should.have.deep.property( 'body.problem' );
        res.body.problem.should.be.a( 'string' );
    }

}

describe( 'newDeck', function() {
    var sandbox;

    beforeEach( function() {
        sandbox = sinon.sandbox.create();
        testUtils.stubFS( sandbox, TESTSDATA );
    });

    afterEach( function() {
        testUtils.cleanUp( sandbox, TESTSDATA, true );
    });

    it( "makes a single, new deck folder", function( done ) {
        this.timeout( 5000 );

        testUtils.authenticate( server, function( e, r ) {
            if ( e ) throw e;

            var token = testUtils.getToken( r );
            server
                .post( '/content-manager/api/newDeck' )
                .set( 'x-csrf-token', token )
                .send( { deckName: path.basename( TESTDECKSSAMPLE ) } )
                .end( function( err, res ) {
                    if ( err ) throw err;
                    
                    expectSuccess( err, res, path.basename( TESTDECKSSAMPLE ) );
                    
                    done();
                }); 

        });
    });


    it( "fails when a deck of the same name exists", function( done ) {
        testUtils.authenticate( server, function( e, r ) {
            if ( e ) throw e;

            var token = testUtils.getToken( r );
            server
                .post( '/content-manager/api/newDeck' )
                .set( 'x-csrf-token', token )
                .send( { deckName: path.basename( TESTDECKSSAMPLE ) } )
                .end( function( err, res ) {
                    if ( err ) throw err;
                    
                    expectSuccess( err, res, path.basename( TESTDECKSSAMPLE ) );

                    token = testUtils.getToken( res );

                    server
                        .post( '/content-manager/api/newDeck' )
                        .set( 'x-csrf-token', token )
                        .send( { deckName: path.basename( TESTDECKSSAMPLE ) } )
                        .end( function( err, res ) {
                            if ( err ) throw err;

                            expectFail( err, res );
                            testUtils.checkForDirs( 
                                [ 
                                    path.join( TESTSDATA, 'decks' ),
                                    path.join( TESTSDATA, 'decks', 
                                            path.basename( TESTDECKSSAMPLE ) )
                                ]
                            ).should.equal( true );

                            done();
                        });
                }); 
        });
    });

    it( "fails when deck name is invalid", function( done ) {
        this.timeout( 5000 );

        testUtils.authenticate( server, function( e, r ) {
            if ( e ) throw e;

            var token = testUtils.getToken( r );
            server
                .post( '/content-manager/api/newDeck' )
                .set( 'x-csrf-token', token )
                .send( { deckName: "Sup Dock:" } )
                .end( function( err, res ) {
                    if ( err ) throw err;
                    
                    expectFail( err, res, true );

                    testUtils.checkForDirs(
                        [
                            path.join( TESTSDATA, 'decks', 'Sup Dock:' )
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
                    .post( '/content-manager/api/newDeck' )
                    .set( 'x-csrf-token', token )
                    .send( { deckName: path.basename( TESTDECKSSAMPLE ) } )
                    .end( function( err, res ) {
                        if ( err ) throw err;

                        res.should.not.have.status( 200 );

                        testUtils.checkForDirs(
                            [
                                path.join( TESTDECKSSAMPLE )
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
            var expectedDirs = [];
            for( var j = 0; j < numRequests; j++ ) {
                expectedDirs.push( path.join( TESTSDATA, 
                        'decks', 'testDeck' + j.toString() ) );
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
                    .post( '/content-manager/api/newDeck' )
                    .set( 'x-csrf-token', token )
                    .send( { deckName: 'testDeck' + j.toString() } )
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

describe( 'Uploading to decks', function() {

    describe( 'when directories already exist', function() {
        var sandbox = null;
        beforeEach( function() {
            testUtils.addDirs( [ TESTSDATA, TESTDECKS, TESTDECKSSAMPLE ] );
            sandbox = sinon.sandbox.create();
            testUtils.stubFS( sandbox, TESTSDATA );
        });

        afterEach( function() {
            testUtils.cleanUp( sandbox, TESTSDATA, true );
        });

        it( "should succeed when the single 1.png file is uploaded", function( done ) {
            this.timeout( 2000 );

            testUtils.authenticate( server, function( e, r ) {
                if ( e ) throw e;
                var token = testUtils.getToken( r );
                server
                    .post( '/content-manager/api/upload' )
                    .set( 'x-csrf-token', token )
                    .field( 'uploadType', 'decks' )
                    .field( 'currentDeck', path.basename( TESTDECKSSAMPLE ) )
                    .attach( 'file', RESOURCE1 )
                    .send( { uploadType: 'decks' } )
                    .end( function( err, res ) {
                        if ( err ) throw err;

                        res.should.have.status( 204 );

                        testUtils.checkForDirs([
                            TESTSDATA,
                            TESTDECKS,
                            TESTDECKSSAMPLE
                        ]).should.equal( true );

                        testUtils.checkForFiles([
                            TEST1,
                            TESTUPLOADTIMES
                        ]).should.be.true;

                        testUtils.checkJSONKeys( 
                            TESTUPLOADTIMES,
                            [
                                path.join( path.resolve( '../uploads/decks/testDeck' ), 
                                        '1.png' )
                            ]
                        ).should.be.true;
                        
                        done();
                    });
            });
        });

        it( "should succeed when the single 0.png file is uploaded", function( done ) {
            this.timeout( 2000 );

            testUtils.authenticate( server, function( e, r ) {
                if ( e ) throw e;
                var token = testUtils.getToken( r );
                server
                    .post( '/content-manager/api/upload' )
                    .set( 'x-csrf-token', token )
                    .field( 'uploadType', 'decks' )
                    .field( 'currentDeck', path.basename( TESTDECKSSAMPLE ) )
                    .attach( 'file', RESOURCE0 )
                    .send( { uploadType: 'decks' } )
                    .end( function( err, res ) {
                        if ( err ) throw err;

                        res.should.have.status( 204 );

                        testUtils.checkForDirs([
                            TESTSDATA,
                            TESTDECKS,
                            TESTDECKSSAMPLE
                        ]).should.equal( true );

                        testUtils.checkForFiles([
                            TEST0,
                            TESTUPLOADTIMES
                        ]).should.be.true;

                        testUtils.checkJSONKeys( 
                            TESTUPLOADTIMES,
                            [
                                path.join( path.resolve( '../uploads/decks/testDeck' ), 
                                        '0.png' )
                            ]
                        ).should.be.true;
                        
                        done();
                    });
            });
        });

        it( "should succeed when a whole deck is uploaded on one request", function( done ) {
            this.timeout( 10000 );

            testUtils.authenticate( server, function( e, r ) {
                if ( e ) throw e;
                var token = testUtils.getToken( r );
                var uploadReq = 
                    server.post( '/content-manager/api/upload' )
                    .set( 'x-csrf-token', token )
                    .field( 'uploadType', 'decks' )
                    .field( 'currentDeck', path.basename( TESTDECKSSAMPLE ) );

                fs.readdir( RESOURCEDECK, function( readdirErr, files ) {
                    if ( readdirErr ) throw readdirErr;
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
                            if ( err ) throw err;

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
                            
                            done();
                        });
                });
            });
        });

        it( "should succeed on two consecutive uploads", function( done ) {
            this.timeout( 2000 );

            testUtils.authenticate( server, function( e, r ) {
                if ( e ) throw e;
                var token = testUtils.getToken( r );
                server
                    .post( '/content-manager/api/upload' )
                    .set( 'x-csrf-token', token )
                    .field( 'uploadType', 'decks' )
                    .field( 'currentDeck', path.basename( TESTDECKSSAMPLE ) )
                    .attach( 'file', RESOURCE1 )
                    .send( { uploadType: 'decks' } )
                    .end( function( err, res ) {
                        if ( err ) throw err;

                        res.should.have.status( 204 );

                        testUtils.checkForDirs([
                            TESTSDATA,
                            TESTDECKS,
                            TESTDECKSSAMPLE
                        ]).should.equal( true );

                        testUtils.checkForFiles([
                            TEST1,
                            TESTUPLOADTIMES
                        ]).should.be.true;

                        testUtils.checkJSONKeys( 
                            TESTUPLOADTIMES,
                            [
                                path.join( path.resolve( '../uploads/decks/testDeck' ), 
                                        '1.png' )
                            ]
                        ).should.be.true;
                        
                        server
                            .post( '/content-manager/api/upload' )
                            .set( 'x-csrf-token', token )
                            .field( 'uploadType', 'decks' )
                            .field( 'currentDeck', path.basename( TESTDECKSSAMPLE ) )
                            .attach( 'file', RESOURCE25 )
                            .send( { uploadType: 'decks' } )
                            .end( function( err, res ) {
                                if ( err ) throw err;

                                res.should.have.status( 204 );

                                testUtils.checkForDirs([
                                    TESTSDATA,
                                    TESTDECKS,
                                    TESTDECKSSAMPLE
                                ]).should.equal( true );

                                testUtils.checkForFiles([
                                    TEST1,
                                    TEST25,
                                    TESTUPLOADTIMES
                                ]).should.be.true;

                                testUtils.checkJSONKeys( 
                                    TESTUPLOADTIMES,
                                    [
                                        path.join( path.resolve( 
                                                '../uploads/decks/testDeck' ), 
                                                '1.png' ),
                                        path.join( path.resolve( 
                                                '../uploads/decks/testDeck' ),
                                                '25.png' )
                                    ]
                                ).should.be.true;

                                done();
                            });
                    });
            });
        });

        it( "should fail when a file of the same floor number already exists", 
                function( done ) {
            this.timeout( 2000 );

            testUtils.authenticate( server, function( e, r ) {
                if ( e ) throw e;
                var token = testUtils.getToken( r );
                server
                    .post( '/content-manager/api/upload' )
                    .set( 'x-csrf-token', token )
                    .field( 'uploadType', 'decks' )
                    .field( 'currentDeck', path.basename( TESTDECKSSAMPLE ) )
                    .attach( 'file', RESOURCE1 )
                    .send( { uploadType: 'decks' } )
                    .end( function( err, res ) {
                        if ( err ) throw err;

                        res.should.have.status( 204 );

                        testUtils.checkForDirs([
                            TESTSDATA,
                            TESTDECKS,
                            TESTDECKSSAMPLE
                        ]).should.equal( true );

                        testUtils.checkForFiles([
                            TEST1,
                            TESTUPLOADTIMES
                        ]).should.be.true;

                        testUtils.checkJSONKeys( 
                            path.join( TESTSDATA, 'uploadTimes.json' ),
                            [
                                path.join( path.resolve( '../uploads/decks/testDeck' ), 
                                        '1.png' )
                            ]
                        ).should.be.true;
                        server
                            .post( '/content-manager/api/upload' )
                            .set( 'x-csrf-token', token )
                            .field( 'uploadType', 'decks' )
                            .field( 'currentDeck', path.basename( TESTDECKSSAMPLE ) )
                            .attach( 'file', RESOURCE1JPG )
                            .send( { uploadType: 'decks' } )
                            .end( function( err, res ) {
                                if ( err ) throw err;

                                res.should.have.status( 409 );

                                testUtils.checkForDirs([
                                    TESTSDATA,
                                    TESTDECKS,
                                    TESTDECKSSAMPLE
                                ]).should.equal( true );

                                testUtils.checkForFiles([
                                    TEST1,
                                    TESTUPLOADTIMES
                                ]).should.be.true;

                                testUtils.checkForFiles([
                                    TEST1JPG
                                ]).should.be.false

                                testUtils.checkJSONKeys( 
                                    path.join( TESTSDATA, 'uploadTimes.json' ),
                                    [
                                        path.join( path.resolve( '../uploads/decks/testDeck' ), 
                                                '1.png' )
                                    ]
                                ).should.be.true;

                                testUtils.checkJSONKeys( 
                                    path.join( TESTSDATA, 'uploadTimes.json' ),
                                    [
                                        path.join( path.resolve( '../uploads/decks/testDeck' ), 
                                                '1.jpg' )
                                    ]
                                ).should.be.false;
                                
                                done();
                            });
                    });
            });

        });
        
        it( "should fail when the filename is 400.png", function( done ) {
            this.timeout( 2000 );

            testUtils.authenticate( server, function( e, r ) {
                if ( e ) throw e;
                var token = testUtils.getToken( r );
                server
                    .post( '/content-manager/api/upload' )
                    .set( 'x-csrf-token', token )
                    .field( 'uploadType', 'decks' )
                    .field( 'currentDeck', path.basename( TESTDECKSSAMPLE ) )
                    .attach( 'file', RESOURCE400 )
                    .send( { uploadType: 'decks' } )
                    .end( function( err, res ) {
                        if ( err ) throw err;

                        res.should.have.status( 409 );

                        testUtils.checkForDirs([
                            TESTSDATA,
                            TESTDECKS,
                            TESTDECKSSAMPLE
                        ]).should.equal( true );

                        testUtils.checkForFiles([
                            TEST400
                        ]).should.be.false;
                        
                        done();
                    });
            });
        });

        it( "should fail when the filename is ' %.jpg' ", function( done ) {
            this.timeout( 2000 );

            testUtils.authenticate( server, function( e, r ) {
                if ( e ) throw e;
                var token = testUtils.getToken( r );
                server
                    .post( '/content-manager/api/upload' )
                    .set( 'x-csrf-token', token )
                    .field( 'uploadType', 'decks' )
                    .field( 'currentDeck', path.basename( TESTDECKSSAMPLE ) )
                    .attach( 'file', RESOURCEINVALID )
                    .send( { uploadType: 'decks' } )
                    .end( function( err, res ) {
                        if ( err ) throw err;

                        res.should.have.status( 409 );

                        testUtils.checkForDirs([
                            TESTSDATA,
                            TESTDECKS,
                            TESTDECKSSAMPLE
                        ]).should.equal( true );

                        testUtils.checkForFiles([
                            TESTINVALID
                        ]).should.be.false;
                        
                        done();
                    });
            });
        });
    });

    describe( "when the deck directory doesn't exist yet", function() {
        var sandbox = null;
        beforeEach( function() {
            testUtils.addDirs( [ TESTSDATA, TESTDECKS ] );
            sandbox = sinon.sandbox.create();
            testUtils.stubFS( sandbox, TESTSDATA );
        });

        afterEach( function() {
            testUtils.cleanUp( sandbox, TESTSDATA, true );
        });

        it( "should fail if a deck of the given name " +
                "doesn't exist", function( done ) {
            testUtils.authenticate( server, function( e, r ) {
                if ( e ) throw e;
                var token = testUtils.getToken( r );
                server
                    .post( '/content-manager/api/upload' )
                    .set( 'x-csrf-token', token )
                    .field( 'uploadType', 'decks' )
                    .field( 'currentDeck', path.basename( TESTDECKSSAMPLE ) )
                    .attach( 'file', RESOURCE1 )
                    .send( { uploadType: 'decks' } )
                    .end( function( err, res ) {
                        if ( err ) throw err;

                        res.should.have.status( 409 );

                        testUtils.checkForDirs([
                            TESTSDATA,
                            TESTDECKS
                        ]).should.equal( true );

                        testUtils.checkForDirs([
                            TESTDECKSSAMPLE
                        ]).should.be.false;

                        testUtils.checkForFiles([
                            TEST1
                        ]).should.be.false;
                        
                        done();
                    });
            });
        });

        it( "should succeed if a deck of the given name " +
                "is made", function( done ) {
            testUtils.authenticate( server, function( e, r ) {
                if ( e ) throw e;

                var token = testUtils.getToken( r );
                server
                    .post( '/content-manager/api/newDeck' )
                    .set( 'x-csrf-token', token )
                    .send( { deckName: path.basename( TESTDECKSSAMPLE ) } )
                    .end( function( err, res ) {
                        if ( err ) throw err;
                        
                        expectSuccess( err, res, path.basename( TESTDECKSSAMPLE ) );
                        
                        server
                            .post( '/content-manager/api/upload' )
                            .set( 'x-csrf-token', token )
                            .field( 'uploadType', 'decks' )
                            .field( 'currentDeck', path.basename( TESTDECKSSAMPLE ))
                            .attach( 'file', RESOURCE1 )
                            .send( { uploadType: 'decks' } )
                            .end( function( err, res ) {
                                if ( err ) throw err;

                                res.should.have.status( 204 );

                                testUtils.checkForDirs([
                                    TESTSDATA,
                                    TESTDECKS,
                                    TESTDECKSSAMPLE
                                ]).should.be.true;

                                testUtils.checkForFiles([
                                    TEST1,
                                    TESTUPLOADTIMES
                                ]).should.be.true;

                                testUtils.checkJSONKeys( 
                                    TESTUPLOADTIMES,
                                    [
                                        path.join( path.resolve( '../uploads/decks/testDeck' ), 
                                                '1.png' )
                                    ]
                                ).should.be.true;
                                
                                done();
                            });
                    });
            });
        });
    });


        
    
});