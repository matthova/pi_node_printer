var monitor = require('node-usb-detection');
var serialport = require('serialport');
var child_process = require('child_process');

var vid = 0x16c0;
var pid = 0x0483;
var baud = 230400;
var portName = '/dev/ttyACM';
var OPEN_TIMEOUT = 1000; // milliseconds
var ourPort = undefined;

devices = monitor.list();
devices.forEach(function(device) {
    findOurPort(device);
});

monitor.add(function(device) {
    console.log("adding", device);
    findOurPort(device);
});

monitor.remove(function(device) {
    console.log("removing", device);
    findOurPort(device);
});

function findOurPort(device) {
    if (
	Number(device.deviceDescriptor.idVendor) === vid
	&& 
	Number(device.deviceDescriptor.idProduct) === pid
    ) {
	setTimeout(function() {
	    open(device);
	}, OPEN_TIMEOUT);
    }
}

function getPort(portNumber) {
    code = child_process.execSync('ls ' + portName + portNumber).toString().split("\n")[0];
    console.log("this is the port from command line", code);
    console.log(code === portName + portNumber);
    return code;
}

function open() {
    var portNumber = 0;
    if(ourPort === undefined) {
	tryPort(portNumber);
    } else {
	ourPort.close(function() {
	    console.log("closed port!");
	    ourPort = undefined;
	});
    }
}

function tryPort(portNumber) {
    try {
	if(getPort(portNumber) === portName + portNumber) {
	    ourPort = new serialport.SerialPort(
		portName + portNumber,
		{ baudrate: baud },
		false
	    ); // this is the openImmediately flag [default is true]
	    console.log("here 1");
	    ourPort.open(function (error) {
		if ( error ) {
		    console.log('failed to open: ' + error);
		} else {
		    ourPort.on('data', function(data) {
			console.log('data received: ' + data);
		    });
		    console.log("here 2");
		    setTimeout(function() {
			ourPort.write("M501\n", function(err, results) {
			    console.log('err ' + err);
			    console.log('results ' + results);
			});
		    }, OPEN_TIMEOUT);
		}
	    });
	}
    } catch(ex) {
	if(portNumber < 255) {
	    tryPort(portNumber + 1);
	}
	console.log("No port available at", portName + portNumber);
    }
}

process.on('exit', function() {
    if(ourPort) {
	ourPort.close();
    }
});