var Box = require("truffle-box");
var MemoryLogger = require("../memorylogger");
var CommandRunner = require("../commandrunner");
var fs = require("fs");
var path = require("path");
var assert = require("assert");
var Server = require("../server");
var Reporter = require("../reporter");
var log = console.log;

describe.only("EthPM commands", function() {
  var config;
  var project = path.join(__dirname, '../../sources/ethpm');
  var logger = new MemoryLogger();

  before("set up the server", function(done) {
    Server.start(done);
  });

  after("stop server", function(done) {
    Server.stop(done);
  });

  before("set up sandbox", function(done) {
    this.timeout(10000);
    Box.sandbox(project, function(err, conf) {
      if (err) return done(err);
      config = conf;
      config.network = "development";
      config.logger = logger;
      config.mocha = {
        reporter: new Reporter(logger)
      }
      done();
    });
  });

  // This test only validates package assembly. We expect it to run logic up to the attempt to
  // publish to the network and fail.
  it("Can locate all the sources to publish", function(done) {
    this.timeout(20000);

    CommandRunner.run("compile", config, function(err) {
      if (err) {
        log(logger.contents());
        return done(err);
      }
      assert(fs.existsSync(path.join(config.contracts_build_directory, "PLCRVoting.json")));
      assert(fs.existsSync(path.join(config.contracts_build_directory, "EIP20.json")));
      assert(fs.existsSync(path.join(config.contracts_build_directory, "NPM.json")));

      CommandRunner.run("publish", config, function(err) {
        var output = logger.contents();

        // We expect publication to be rejected by web3
        if (!err || !output.includes('not a contract address')) {
          log(output);
          done(err);
        }
        assert(output.includes('Uploading sources and publishing'), 'Should have found sources');
        done();
      })
    });
  });
});
