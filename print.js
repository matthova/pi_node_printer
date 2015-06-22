var GcodeClient = require('./gcode-client');

var printer = new GcodeClient();
setTimeout(function(){
    printer.streamFile('../giant_gcode/file0002.gcode');
},2000);
