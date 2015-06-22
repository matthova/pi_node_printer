var monitor = require('node-usb-detection'),
serialport = require('serialport'),
child_process = require('child_process'),
fs = require('fs'),
LineByLineReader = require('line-by-line');

var printer = new Hydraprint();
setTimeout(function(){
    printer.streamFile('../giant_gcode/file0002.gcode');
},2000);

var Hydraprint = function (deviceData) {
    this.VID = 0x16c0; // USB Vendor ID
    this.PID = 0x0483; // USB Product ID
    this.BAUDRATE = 230400;
    this.PORT_NAME = '/dev/ttyACM';
    this.OPEN_TIMEOUT = 1000; // Time to wait after usb detection event before opening
    this.ourPort = undefined; // A serialport instance
    this.lr = undefined; //line reader

    this.startDeviceDetection();
}

Hydraprint.prototype.startDeviceDetection = function() {
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
}

Hydraprint.prototype.findOurPort = function(device) {
    var that = this;
    if (
	Number(device.deviceDescriptor.idVendor) === that.VID
	&& 
	Number(device.deviceDescriptor.idProduct) === that.PID
    ) {
	setTimeout(function() {
	    that.openOrClose();
	}, that.OPEN_TIMEOUT);
    }
};

Hydraprint.prototype.getPort = function (portNumber) {
    code = child_process.execSync('ls ' + this.PORT_NAME + portNumber).toString().split("\n")[0];
    return code;
};

Hydraprint.prototype.openOrClose = function() {
    var portNumber = 0;
    var that = this;
    if(that.ourPort === undefined) {
	that.open(portNumber);
    } else {
	that.ourPort.close(function() {
	    console.log("port closed");
	    that.ourPort = undefined;
	});
    }
};

Hydraprint.prototype.open = function(portNumber) {
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
			//console.log('data received: ' + data);
			if(data.toString().indexOf('ok') !== -1) {
			    if(that.lr !== undefined && that.ourPort !== undefined){
				that.lr.resume();
			    }
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
    that.lr = new LineByLineReader(filepath);

    that.lr.on('error', function (err) {
	console.log('line reader error:', err);
    });

    that.lr.on('line', function (line) {
	that.sendCommand(line);
	that.lr.pause();
    });

    that.lr.on('end', function () {
	console.log("All lines are read, file", filepath, "is closed now.");
    });
};

Hydraprint.prototype.sendCommand = function(inCommand) {
    var that = this;
    if(that.ourPort !== undefined){
	var aboutToSend = inCommand.split(';')[0] + '\n';
	if(aboutToSend.length > 0) {
	    that.ourPort.write(aboutToSend);
	}
    }    
};