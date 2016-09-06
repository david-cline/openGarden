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

var server = request.agent( app );

testUtils.setVerbose( false ); // Set to true to have test logic log to console
                                 // note: if the code itself logs, it will continue
                                 // to do so

chai.use( chaiHttp );

/** TEST CONSTANTS **/
var TESTSDATA = path.join( __dirname, 'testsData' );
var TESTIMAGE = path.join( TESTSDATA, 'image' );
var TESTVIDEO = path.join( TESTSDATA, 'video' );
var RESOURCEMP4 = path.join( __dirname, 'testsResources', 'hello.mp4' );
var TESTMP4 = path.join( TESTVIDEO, 'hello.mp4' );
var RESOURCEJPG = path.join( __dirname, 'testsResources', 'test.jpg' );
var TESTJPG = path.join( TESTIMAGE, 'test.jpg' );
var RESOURCEJPG2 = path.join( __dirname, 'testsResources', 'test2.jpg' );
var TESTJPG2 = path.join( TESTIMAGE, 'test2.jpg' );
var RESOURCEPNG = path.join( __dirname, 'testsResources', 'test3.png' );
var TESTPNG = path.join( TESTIMAGE, 'test3.png' );
var RESOURCESAMENAME = path.join( __dirname, 'testsResources', 'test.png' );
var TESTSAMENAME = path.join( TESTIMAGE, 'test.png' );
var RESOURCEINVALID = path.join( __dirname, 'testsResources', ' %.jpg' );
var TESTINVALID = path.join( TESTSDATA, ' %.jpg' );
var TESTUPLOADTIMES = path.join( TESTSDATA, 'uploadTimes.json' );



describe( 'Uploading an image or video', function() {
    describe( 'when directories already exist', function() {
        var sandbox = null;
        beforeEach( function() {
            testUtils.addDirs( [ TESTSDATA, TESTIMAGE, TESTVIDEO ] );
            sandbox = sinon.sandbox.create();
            testUtils.stubFS( sandbox, TESTSDATA );
        });

        afterEach( function() {
            testUtils.cleanUp( sandbox, TESTSDATA, true );
        });


        it( "should succeed when a single image is uploaded", function( done ) {
            this.timeout( 2000 );

            testUtils.authenticate( server, function( e, r ) {
                if ( e ) throw e;
                var token = testUtils.getToken( r );
                server
                    .post( '/content-manager/api/upload' )
                    .set( 'x-csrf-token', token )
                    .field( 'uploadType', 'image' )
                    .attach( 'file', RESOURCEJPG )
                    .send( { uploadType: 'image' } )
                    .end( function( err, res ) {
                        if ( err ) throw err;

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
                        
                        done();
                    });
            });
        });

        it( "should succeed when multiple images are uploaded in one request", function( done ) {
            testUtils.authenticate( server, function( e, r ) {
                if ( e ) throw e;
                var token = testUtils.getToken( r );
                server
                    .post( '/content-manager/api/upload' )
                    .set( 'x-csrf-token', token )
                    .field( 'uploadType', 'image' )
                    .attach( 'file', RESOURCEJPG )
                    .attach( 'file', RESOURCEJPG2 )
                    .attach( 'file', RESOURCEPNG )
                    .send( { uploadType: 'image' } )
                    .end( function( err, res ) {
                        if ( err ) throw err;

                        res.should.have.status( 204 );

                        testUtils.checkForDirs([
                            TESTSDATA,
                            TESTIMAGE
                        ]).should.equal( true );

                        testUtils.checkForFiles([
                            TESTJPG,
                            TESTJPG2,
                            TESTPNG,
                            TESTUPLOADTIMES
                        ]).should.be.true;

                        testUtils.checkJSONKeys( 
                            TESTUPLOADTIMES,
                            [
                                path.join( path.resolve( '../uploads/image/' ), 
                                        'test.jpg' ),
                                path.join( path.resolve( '../uploads/image/' ), 
                                        'test2.jpg' ),
                                path.join( path.resolve( '../uploads/image/' ), 
                                        'test3.png' )
                            ]
                        ).should.be.true;
                        
                        done();
                    });
            });
        });

        it( "should fail when an image of the same name already exists", function( done ) {
            testUtils.authenticate( server, function( e, r ) {
                if ( e ) throw e;
                var token = testUtils.getToken( r );
                server
                    .post( '/content-manager/api/upload' )
                    .set( 'x-csrf-token', token )
                    .field( 'uploadType', 'image' )
                    .attach( 'file', RESOURCEJPG )
                    .send( { uploadType: 'image' } )
                    .end( function( err, res ) {
                        if ( err ) throw err;

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
                        
                        server
                            .post( '/content-manager/api/upload' )
                            .set( 'x-csrf-token', token )
                            .field( 'uploadType', 'image' )
                            .attach( 'file', RESOURCEJPG )
                            .send( { uploadType: 'image' } )
                            .end( function( err, res ) {
                                if ( err ) throw err;

                                res.should.have.status( 409 );

                                testUtils.checkForDirs([
                                    TESTSDATA,
                                    TESTIMAGE
                                ]).should.equal( true );

                                testUtils.checkForFiles([
                                    TESTJPG,
                                    TESTUPLOADTIMES
                                ]).should.be.true;



                                done();
                            });
                    });
            });
        });

        it( "should fail when the image has an invalid name", function( done ) {
            this.timeout( 2000 );

            testUtils.authenticate( server, function( e, r ) {
                if ( e ) throw e;
                var token = testUtils.getToken( r );
                server
                    .post( '/content-manager/api/upload' )
                    .set( 'x-csrf-token', token )
                    .field( 'uploadType', 'image' )
                    .attach( 'file', RESOURCEINVALID )
                    .send( { uploadType: 'image' } )
                    .end( function( err, res ) {
                        if ( err ) throw err;

                        res.should.have.status( 409 );

                        testUtils.checkForDirs([
                            TESTSDATA,
                            TESTIMAGE
                        ]).should.equal( true );

                        testUtils.checkForFiles([
                            TESTINVALID
                        ]).should.be.false;
                        
                        done();
                    });
            });
        });

        it( "should succeed when a single video is uploaded", function( done ) {
            this.timeout( 2000 );

            testUtils.authenticate( server, function( e, r ) {
                if ( e ) throw e;
                var token = testUtils.getToken( r );
                server
                    .post( '/content-manager/api/upload' )
                    .set( 'x-csrf-token', token )
                    .field( 'uploadType', 'video' )
                    .attach( 'file', RESOURCEMP4 )
                    .send( { uploadType: 'video' } )
                    .end( function( err, res ) {
                        if ( err ) throw err;

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
                        
                        done();
                    });
            });
        });
    });

    describe( "when directories do not yet exist", function() {
        beforeEach( function() {
            testUtils.addDirs( [ TESTSDATA ] );
            sandbox = sinon.sandbox.create();
            testUtils.stubFS( sandbox, TESTSDATA );
        });

        afterEach( function() {
            testUtils.cleanUp( sandbox, TESTSDATA, true );
        });

        it.skip( "should succeed when uploading a single image, creating the " +
                "directory", function( done ) {
            this.timeout( 2000 );

            testUtils.authenticate( server, function( e, r ) {
                if ( e ) throw e;
                var token = testUtils.getToken( r );
                server
                    .post( '/content-manager/api/upload' )
                    .set( 'x-csrf-token', token )
                    .field( 'uploadType', 'image' )
                    .attach( 'file', RESOURCEJPG )
                    .send( { uploadType: 'image' } )
                    .end( function( err, res ) {
                        if ( err ) throw err;

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
                        
                        done();
                    });
            });
        });

        it.skip( "should succeed when uploading a single video, creating the " +
                "directory", function( done ) {
            this.timeout( 2000 );

            testUtils.authenticate( server, function( e, r ) {
                if ( e ) throw e;
                var token = testUtils.getToken( r );
                server
                    .post( '/content-manager/api/upload' )
                    .set( 'x-csrf-token', token )
                    .field( 'uploadType', 'video' )
                    .attach( 'file', RESOURCEMP4 )
                    .send( { uploadType: 'video' } )
                    .end( function( err, res ) {
                        if ( err ) throw err;

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
                        
                        done();
                    });
            });
        });
    });
});