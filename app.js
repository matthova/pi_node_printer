var monitor = require('node-usb-detection'),
serialport = require('serialport'),
child_process = require('child_process'),
fs = require('fs'),
readline = require('readline'),
stream = require('stream'),
util = require('util'),
newlines = [13, 10];

var Hydraprint = function (deviceData) {
    var that = this;
    this.VID = 0x16c0;
    this.PID = 0x0483;
    this.BAUDRATE = 230400;
    this.PORT_NAME = '/dev/ttyACM';
    this.OPEN_TIMEOUT = 1000; // milliseconds
    this.ourPort = undefined;
    this.ok = true;
    this.commands = [];
    this.input = undefined; //input stream

    devices = monitor.list();
    devices.forEach(function(device) {
	that.findOurPort(device);
    });

    monitor.add(function(device) {
	that.findOurPort(device);
    });

    monitor.remove(function(device) {
	that.findOurPort(device);
    });

    setInterval(function(){
	if(that.ok && that.commands.length > 0 && that.ourPort !== undefined){
	    if(that.commands.length < 1000 && that.input !== undefined){
		that.input.resume();
	    }
	    var aboutToSend = that.commands.shift().split(';')[0] + '\n';
	    if(aboutToSend.length > 2) {
		console.log("about to send", aboutToSend);
		that.ourPort.write(aboutToSend);
		that.ok = false;
	    }
	}
    }, 100);
}

Hydraprint.prototype.findOurPort = function(device) {
    var that = this;
    if (
	Number(device.deviceDescriptor.idVendor) === that.VID
	&& 
	Number(device.deviceDescriptor.idProduct) === that.PID
    ) {
	setTimeout(function() {
	    that.open();
	}, that.OPEN_TIMEOUT);
    }
};

Hydraprint.prototype.getPort = function (portNumber) {
    code = child_process.execSync('ls ' + this.PORT_NAME + portNumber).toString().split("\n")[0];
    return code;
};

Hydraprint.prototype.open = function() {
    var portNumber = 0;
    var that = this;
    if(that.ourPort === undefined) {
	that.tryPort(portNumber);
    } else {
	that.ourPort.close(function() {
	    console.log("port closed");
	    that.ourPort = undefined;
	});
    }
};

Hydraprint.prototype.tryPort = function(portNumber) {
    var that = this;
    try {
	if(that.getPort(portNumber) === that.PORT_NAME + portNumber) {
	    that.ourPort = new serialport.SerialPort(
		that.PORT_NAME + portNumber,
		{ baudrate: that.BAUDRATE },
		false
	    );
	    that.ourPort.open(function (error) {
		if ( error ) {
		    console.log('failed to open: ' + error);
		} else {
		    that.ourPort.on('data', function(data) {
			console.log('data received: ' + data);
			if(data.toString().indexOf('ok') !== -1) {
			    that.ok = true;
			}
		    });
		}
	    });
	}
    } catch(ex) {
	that.ourPort = undefined;
	if(portNumber < 255) {
	    that.tryPort(portNumber + 1);
	}
	console.log("No port available at", that.PORT_NAME + portNumber);
    }
}

Hydraprint.prototype.cleanup = function() {
    var that = this;
    process.on('exit', function() {
	if(that.ourPort) {
	    that.ourPort.close();
	}
    });
};

Hydraprint.prototype.streamFile = function(filepath) {
    var that = this;
    var opts = {};
    var line = [];
    var lineCount = 0;
    var byteCount = 0;
    that.input = fs.createReadStream(filepath);
    var commands = [];
    that.input.on('open', function(fd) {
        console.log('file is open');
    })
    .on('data', function(data) {
	that.input.pause();
	for (var i = 0; i < data.length; i++) {
	    byteCount++;
	    if (0 <= newlines.indexOf(data[i])) { // Newline char was found.
		lineCount++;
		that.commands.push(String.fromCharCode.apply(String, line));
		line = []; // Empty the buffer
	    } else {
		line.push(data[i]); // Buffer new line data.
            }
	}
    })
    .on('error', function(err) {
	console.log("error!", err);
    })
    .on('end', function() {
        if (line.length){
	    lineCount++;
	}
        console.log("end");
    })
    .on('close', function() {
	console.log("closing");
    });
};

var printer = new Hydraprint();
setTimeout(function(){
    printer.streamFile('../FirstCube.g');
},2000);