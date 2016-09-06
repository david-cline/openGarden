Since the manager requires that a user is logged in in order to do most operations
in the manager, this test suite requires a username and password to login with.
Please go to `manager/app/api/lib/testUtils.js` and put in a registered 
{ username: <String>, password: <String> } pair for the tests to use.

The tests also require mocha, which you should install globally in order to run the tests from the command line:

npm install -g mocha

Then, to run all the content-manager tests, run `mocha .` in this directory.
To run individual tests, run `mocha testname`