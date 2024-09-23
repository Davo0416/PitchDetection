var pitchTxt = document.getElementById("pitchElement");
var noteTxt = document.getElementById("noteElement");
var analyser;
var audioContext = null;
var CANVAS = null;
var array = null;

//Recieving audio input
navigator.mediaDevices.getUserMedia({
	audio: true
})
	.then(function (stream) {
		audioContext = new AudioContext();
		analyser = audioContext.createAnalyser();
		const microphone = audioContext.createMediaStreamSource(stream);
		const scriptProcessor = audioContext.createScriptProcessor(2048, 1, 1);

		//Setting up the canvas
		CANVAS = document.getElementById("waveform");
		if (CANVAS) {
			waveCanvas = CANVAS.getContext("2d");
		}

		//Setting up the volume bar
		instantiatePids(100, 1);

		analyser.smoothingTimeConstant = 0.8;
		analyser.fftSize = 2048;

		microphone.connect(analyser);
		analyser.connect(scriptProcessor);
		scriptProcessor.connect(audioContext.destination);

		scriptProcessor.onaudioprocess = function () {
			array = new Uint8Array(analyser.frequencyBinCount);
			analyser.getByteFrequencyData(array);


			//Updating pitch and volume according to the input sound
			colorPids(array);
			updatePitch();
		};
	})
	//Catching errors
	.catch(function (err) {
		console.error(err);
	});

//Function for setting up the volume bar
function instantiatePids(amount, gap) {
	var volumeBars = document.getElementsByClassName("volumeBar");

	var pidWidth = (volumeBars[0].offsetWidth) / (amount) - gap;

	for (let i = 0; i < amount; i++) {
		var pid = document.createElement("div");
		pid.classList.add('pid');
		pid.style.width = pidWidth + "px";
		pid.style.marginRight = gap + "px";


		volumeBars[0].appendChild(pid);
	}

}

function CalculateVol(array){
	const arraySum = array.reduce((a, value) => a + value, 0);
	const vol = arraySum / array.length;
	return vol;
}

//Function for updating volume bar
function colorPids(array) {
	const vol = CalculateVol(array);

	const allPids = [...document.querySelectorAll('.pid')];
	const numberOfPidsToColor = Math.round(vol / (100 / allPids.length));
	const pidsToColor = allPids.slice(0, numberOfPidsToColor);

	for (const pid of allPids) {
		pid.style.backgroundColor = "#19093c";
	}

	var pidID = 0;
	for (const pid of pidsToColor) {
		if(pidID<33)
			pid.style.backgroundColor = "#7279d4";
		else if (pidID < 67)
			pid.style.backgroundColor = "#9972d4";
		else 
			pid.style.backgroundColor = "#d472d2";
		pidID++;
	}
}

//Function for converting pitch to note
var noteStrings = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

function noteFromPitch(frequency) {
	var noteNum = 12 * (Math.log(frequency / 440) / Math.log(2));
	return Math.round(noteNum) + 69;
}

//Pitch detection - Autocorrelation method

//Setting up the audio buffer
var buflen = 2048;
var buf = new Float32Array(buflen);

// Implementing the ACF2+ algorithm
function autoCorrelate(buf, sampleRate) {
	var size = buf.length;
	var rms = 0;

	for (var i = 0; i < size; i++) {
		var val = buf[i];
		rms += val * val;
	}

	//Calculating Root Mean Square
	rms = Math.sqrt(rms / size);
	if (rms < 0.01) // not enough signal
		return -1;

	//Removing all the frequencies lower the threshold
	var cutFrom = 0, cutTo = size - 1, threshold = 0.2;
	for (var i = 0; i < size / 2; i++)
		if (Math.abs(buf[i]) < threshold) { cutFrom = i; break; }
	for (var i = 1; i < size / 2; i++)
		if (Math.abs(buf[size - i]) < threshold) { cutTo = size - i; break; }

	buf = buf.slice(cutFrom, cutTo);
	size = buf.length;

	//Autocorrelating the frequencies
	var c = new Array(size).fill(0);
	for (var i = 0; i < size; i++)
		for (var j = 0; j < size - i; j++)
			c[i] = c[i] + buf[j] * buf[j + i];

	var d = 0;
	while (c[d] > c[d + 1])
		d++;

	var maxVal = -1, maxPos = -1;
	for (var i = d; i < size; i++) {
		if (c[i] > maxVal) {
			maxVal = c[i];
			maxPos = i;
		}
	}
	var T0 = maxPos;

	var x1 = c[T0 - 1], x2 = c[T0], x3 = c[T0 + 1];
	a = (x1 + x3 - 2 * x2) / 2;
	b = (x3 - x1) / 2;
	if (a) T0 = T0 - b / (2 * a);

	return sampleRate / T0;
}

//Function for updating pitch 
function updatePitch(time) {
	var cycles = new Array;
	//console.log(buf);

	analyser.getFloatTimeDomainData(buf);
	var ac = autoCorrelate(buf, audioContext.sampleRate);

	//Calling the draw function
	var type = document.getElementById("waveType").value;
	DrawWaveform(type, 2, 20, " #a9dff1", "#72bcd4", 2); 

	if (ac == -1) {
		//Results are too vague - returning nothing
		pitchTxt.innerText = "--";
		noteTxt.innerText = "-";
	} else {
		//Results are clear - returing the corresponding data
		pitch = ac;
		pitchTxt.innerText = Math.round(pitch);

		var note = noteFromPitch(pitch);
		noteTxt.innerHTML = noteStrings[note % 12];
	}
}

function print(){
	console.log(array);
}

//Function for matching input pitch to a target pitch - currently not in use
function matchPitch(pitch, target, errorMargin, matchPid) {
	if (pitch - errorMargin < target && target < pitch + errorMargin) {
		matchPid.style.backgroundColor = "#69ce2b";
		return true;
	}

	else {
		matchPid.style.backgroundColor = "red";
		return false;
	}
}

//Function for matching input pitch to a target note - currently not in use
function matchNote(pitch, target, matchPid) {
	var note = noteFromPitch(pitch);
	if (noteStrings[note % 12] == target) {
		matchPid.style.backgroundColor = "#69ce2b";
		return true;
	}

	else {
		matchPid.style.backgroundColor = "red";
		return false;
	}
}

//Function responsible for drawing the waveform
function DrawWaveform(type, thickness, borderThickness, color, borderColor, gapSize) {

	var width = CANVAS.width;
	var height = CANVAS.height
	waveCanvas.clearRect(0, 0, width, height);
	waveCanvas.lineWidth = thickness;
	waveCanvas.strokeStyle = color;

	waveCanvas.beginPath();

	//Drawing the waveform based on selected style
	if (type == "wave") {
		for (var i = 1; i < width; i++) {
			waveCanvas.lineTo(i, (height / 2) + (buf[i] * (height / 2)));
		}
	}
	else if (type == "columns") {
		for (var i = 1; i < width; i += thickness + gapSize) {
			waveCanvas.moveTo(i, height);
			waveCanvas.lineTo(i, (height) - Math.abs(buf[i] * (height)) - thickness - 10);
		}
	}
	else if (type == "waveColumns") {
		for (var i = 1; i < width; i += thickness + gapSize) {

			var waveHeight = (buf[i] * (height / 2));
			waveCanvas.moveTo(i, height / 2 - waveHeight);

			waveCanvas.lineTo(i, (height / 2) + waveHeight);
		}
	}
	else if (type == "waveBoxes") {
		for (var i = 1; i < width; i += thickness + gapSize) {

			var waveHeight =
				(buf[i] * (height / 2));

			var x = (height / 2);

			while (x >= (height / 2) + waveHeight) {
				waveCanvas.moveTo(i, x);
				waveCanvas.lineTo(i, x - thickness);

				x -= thickness + gapSize;
			}

			x = (height / 2);

			while (x <= (height / 2) - waveHeight) {
				waveCanvas.moveTo(i, x);
				waveCanvas.lineTo(i, x - thickness);

				x += thickness + gapSize;
			}

		}
	}
	else if (type == "boxes") {
		for (var i = 1; i < width; i += thickness + gapSize / 2) {
			var x = height;

			while (x > (height) + (buf[i] * (height)) - thickness * 5) {
				waveCanvas.moveTo(i, x);
				waveCanvas.lineTo(i, x - thickness);
				x -= thickness + gapSize / 2;
			}

		}
	}

	waveCanvas.stroke();

	//Drawing the borders
	waveCanvas.strokeStyle = borderColor;
	waveCanvas.lineWidth = borderThickness;

	waveCanvas.beginPath();
	waveCanvas.moveTo(0, 0);
	waveCanvas.lineTo(0, height);
	waveCanvas.moveTo(0, height);
	waveCanvas.lineTo(width, height);
	waveCanvas.moveTo(0, 0);
	waveCanvas.lineTo(width, 0);

	waveCanvas.moveTo(width, 0);
	waveCanvas.lineTo(width, height);
	waveCanvas.stroke();
}