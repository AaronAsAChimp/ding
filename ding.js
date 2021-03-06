var DING_VERSION = "1.1";

/* getPosition
	function: finds the real position of a node
	see: http://www.quirksmode.org/js/findpos.html
*/

function getPosition(node) {
	var x = y = 0;
	if(node.offsetParent) {
		do {
			x += node.offsetLeft;
			y += node.offsetTop;

		} while(node = node.offsetParent);
	}
	return [x,y];
}


/* b_buffer
	an object to contain offscreen buffers
*/
function b_buffer(i_vector, i_width, i_height) {
	this.vector = i_vector;
	this.bitmap = null;
	this.width = i_width;
	this.height = i_height;
	this.image = null;

	this.render = function () {
		var tempNode = document.createElement("div");
		tempNode.style.width = this.width + "px";
		tempNode.style.height = this.height + "px";
		var tempCanvas = new b_canvas(tempNode);
		
		tempCanvas.start();
			tempCanvas.render(this.vector);
		tempCanvas.end();

		this.bitmap = tempCanvas.toBuffer();

		this.image = document.createElement("img");
		this.image.src = this.bitmap;
	}

	if(this.vector && this.width && this.height) {
		this.render();
	}
}

/* a_matrix
	a matrix for affine transformations
*/
function a_matrix() {
	this.m11 = 1;
	this.m12 = 0;
	this.m21 = 0;
	this.m22 = 1;
	this.dx  = 0;
	this.dy  = 0;
}

/*	b_animManager
	a singleton that tracks the state of animation
*/

function b_animManager() {
	var next = 0;
	var callbacks= new Array();

	//the time between frames
	this.DELTA = 100;

	//accepts a callback and stores it and returns the tracker(index) of the function
	this.track = function(callback) {
		callbacks[next] = callback;
		return next++;
	}

	//this is called by setInterval passing the tracker as a literal in the string
	//and calls the function referenced by the tracker
	this.anim8 = function (tracker) {

		callbacks[tracker]();
	}
}

var animation = new b_animManager();

/*	b_canvas
	object: the canvas that building will be displayed
*/

function b_canvas(node) {
	var containerNode = node;
	//create the drawing canvas
	this.canvasNode = document.createElement("canvas");
	this.canvasNode.width = parseInt(containerNode.style.width);
	this.canvasNode.height = parseInt(containerNode.style.height);	
	var cN = this.canvasNode.getContext('2d');
	node.appendChild(this.canvasNode);

	// model view coordinates
	var mvX = 0;
	var mvY = 0;
	var mvTheta = 0;

	// world view coordinates
	var worldView = new a_matrix();
	var reverseWorldView = new a_matrix();

	// this function is optimized for 2d affine transformations
	// multiplies mat1 * mat2
	this.matrixMult = function(mat1, mat2) {
		/*
		[m11 m21 m31] [m'11 m'21 m'31]   [(m11 * m'11)+(m21 * m'12)+(m31 * m'13) (m11 * m'21)+(m21 * m'22)+(m31 * m'23) (m11 * m'31)+(m21 * m'32)+(m31 * m'33)]
		[m12 m22 m32] [m'12 m'22 m'32] = [(m12 * m'11)+(m22 * m'12)+(m32 * m'13) (m12 * m'21)+(m22 * m'22)+(m32 * m'23) (m12 * m'31)+(m22 * m'32)+(m32 * m'33)]
		[m13 m23 m33] [m'13 m'23 m'33]   [(m13 * m'11)+(m23 * m'12)+(m33 * m'13) (m13 * m'21)+(m23 * m'22)+(m33 * m'23) (m13 * m'31)+(m23 * m'32)+(m33 * m'33)]
		*/
		var o = new a_matrix();
		// row 1
		o.m11 = (mat1.m11 * mat2.m11) + (mat1.m21 * mat2.m12);// + (mat1.dx * 0)
		o.m21 = (mat1.m11 * mat2.m21) + (mat1.m21 * mat2.m22);// + (mat1.dx * 0)
		o.dx  = (mat1.m11 *  mat2.dx) + (mat1.m21 *  mat2.dy) + mat1.dx ;// * 1
		// row 2
		o.m12 = (mat1.m12 * mat2.m11) + (mat1.m22 * mat2.m12);// + (mat1.dy * 0)
		o.m22 = (mat1.m12 * mat2.m21) + (mat1.m22 * mat2.m22);// + (mat1.dy * 0)
		o.dy  = (mat1.m12 *  mat2.dx) + (mat1.m22 *  mat2.dy) + mat1.dy;// * 1

		return o;
	}

	this.viewToWorld = function(x,y) {
		var oX = (reverseWorldView.m11 * x) + (reverseWorldView.m21 * y) + reverseWorldView.dx;
		var oY = (reverseWorldView.m12 * x) + (reverseWorldView.m22 * y) + reverseWorldView.dy;
		return [oX,oY];
	}

	this.clear = function () {
		cN.setTransform(1, 0, 0, 1, 0, 0);
		cN.clearRect(0, 0,this.canvasNode.width,this.canvasNode.height);
	}

	this.translateView = function(x,y) {
		var tempMat = new  a_matrix();
		tempMat.dx = x;
		tempMat.dy = y;
		//***** Potential Mem Leak *****
		worldView = this.matrixMult(worldView, tempMat);

		tempMat.dx = -x;
		tempMat.dy = -y;
		//***** Potential Mem Leak *****
		reverseWorldView = this.matrixMult(reverseWorldView, tempMat);
		//cN.translate(x,y);
	}

	this.translateViewTemp = function(x,y) {
		cN.translate(x,y);
	}

	this.rotateView = function(rad) {
		var tempMat = new  a_matrix();
		tempMat.m11 = Math.cos(rad);
		tempMat.m12 = -Math.sin(rad);

		tempMat.m21 = Math.sin(rad);
		tempMat.m22 = Math.cos(rad);
		//***** Potential Mem Leak *****
		worldView = this.matrixMult(worldView, tempMat);

		var tempMat = new  a_matrix();
		tempMat.m11 = Math.cos(-rad);
		tempMat.m12 = -Math.sin(-rad);

		tempMat.m21 = Math.sin(-rad);
		tempMat.m22 = Math.cos(-rad);
		//***** Potential Mem Leak *****
		reverseWorldView = this.matrixMult(reverseWorldView, tempMat);
		//cN.rotate(rad);
	}

	this.translateModel = function (x,y){
		mvX += x;
		mvY += y;
	}

	this.rotateModel = function(rad) {
		mvTheta += rad;
	}

	this.start = function() {
		cN.setTransform(worldView.m11, worldView.m12, worldView.m21, worldView.m22, worldView.dx, worldView.dy)
	}

	this.end = function() {
		//swap buffers
	}

	this.bitblt = function(buffer, x,y) {
		cN.drawImage(buffer.image, x, y)
	}

	//must be called between start() and end()
	this.render = function (list) {
		cN.save()
		cN.beginPath();//figure out something to do with this

		cN.rotate(mvTheta);
		cN.translate(mvX,mvY);
		if(list != null) {
			for(i = 0; i < list.length;/*increment the variable in the body. Bitches!*/) {
				//alert("current: " + list[i] + " next:" + list[i+1] + " next+1:" + list[i+2]);
				switch(list[i]) {
					case 'M':
						cN.moveTo(list[i+1], list[i+2]);
						i+=3;
						break;
					case 'z':
						cN.closePath();
						cN.fill();
						i++;
						break;
					case 'L':
						cN.lineTo(list[i+1],list[i+2]);
						i+=3;
						break;
					case 'F':
						cN.fillStyle = list[i+1];
						i+=2;
						break;
					case 'R':
						cN.fillRect(list[i+1],list[i+2],list[i+3],list[i+4]);
						i += 5;
						break;
					case 'C':
						cN.bezierCurveTo(list[i+1],list[i+2],list[i+3],list[i+4],list[i+5],list[i+6]);
						i+=7;
						break;
					case 'F':
						cN.fillStyle = list[i+1];
						i+=2;
						break;
					case 'R':
						cN.fillRect(list[i+1],list[i+2],list[i+3],list[i+4]);
						i += 5;
						break;
					default:
						alert("Something's wrong: list[i] = " + list[i] );
						//prepare for the worst
						i = list.length;
				}
			}
		}
		cN.restore();
		mvX = 0;
		mvY = 0;
		mvTheta = 0;
	}

	this.toBuffer = function () {
		return this.canvasNode.toDataURL();
	}

}

/* b_building
	object: the building... yeah I suck at documentation
*/

function b_building(node) {
	//var BOX_PLUS = 0;
	var artWarning = ['F', '#fff', 'M', 9.5,1.5770779, 'L', 0.5,18.577078, 'C', 0.34375,19.264578, 0.84375,19.592703, 1.5,19.577078, 'L', 17.5,19.577078, 'C', 18.166563,19.622182, 18.704817,19.301841, 18.5,18.577078, 'L', 10.5,1.5770779, 'C', 10.215744,0.9729516, 9.7282901,0.988758, 9.5,1.5770779, 'z', 'M', 11.5,7.5770779, 'L', 10.5,13.577078, 'L', 9.5,13.577078, 'L', 8.5,7.5770779, 'C', 8.5,5.5770779, 11.5,5.5770779, 11.5,7.5770779, 'z', 'F', "#ffbf00", 'M', 10,15.077078, 'C', 10.625,15.108328, 11,15.467218, 11,16.077078, 'C', 11,16.686968, 10.60988,17.077078, 10,17.077078, 'C', 9.3901205,17.077078, 9,16.686968, 9,16.077078, 'C', 9.0000003,15.467218, 9.390625,15.077078, 10,15.077078, 'z'];
	var artWarningBuf = new b_buffer(artWarning, 20, 20);

	var COLOR_PLUS = '#ccdd00';
	var COLOR_NOTE = '#cc0000';

	var EDIT_STATE = 0;
	var NOTE_STATE = 1;
	var VIEW_STATE = 2;

	var state = VIEW_STATE;
	var canvas = new b_canvas(node);
	var boxStack = new Array();
	var noteStack = new Array();
	var displayCache = new Array();
	var displayTemp = false;

	//where the drag started
	var startX = 0;
	var startY = 0;
	//last drag Vector
	var lagVectorX = 0;
	var lagVectorY = 0;
	// the net movement of the drag
	var dragVectorX = 0;
	var dragVectorY = 0;
	// the last known mouse position
	var lastMouseX = 0;
	var lastMouseY = 0;
	//allow the event handelers to see "this"
	var tempThis = this;

	function resetVectors() {
		//where the drag started
		startX = 0;
		startY = 0;
		//last drag Vector
		lagVectorX = 0;
		lagVectorY = 0;
		// the net movement of the drag
		dragVectorX = 0;
		dragVectorY = 0;

		lastMouseX = 0;
		lastMouseY = 0;
	}

	this.onDrag_Start = function (e) {
		var currentLoc = getPosition(canvas.canvasNode);
		resetVectors();

		startX = e.pageX - currentLoc[0];
		startY = e.pageY - currentLoc[1];

		drawTimer = setInterval("animation.anim8(" + drawTracker + ")", animation.DELTA);
		displayTemp = true;
	}

	this.onDrag_Stop = function (e) {
		displayTemp = false;
		clearInterval(drawTimer);
	}

	this.onMouseDownHandle_Edit = function (e) {

	}

	this.onMouseUpHandle_Edit = function (e) {

		tempThis.createBox(startX, startY, dragVectorX, dragVectorY);

	}

	this.onMouseDownHandle_View = function (e) {

	}

	this.onMouseUpHandle_View = function (e) {

	}

	this.onMouseDownHandle_Note = function (e) {

	}

	this.onMouseUpHandle_Note = function (e) {
		tempThis.createNote(startX, startY, dragVectorX, dragVectorY);
	}

	this.onMouseMove = function (e) {
		lastMouseX = e.pageX;
		lastMouseY = e.pageY;

	}


	this.createBox = function (x,y,w,h) {
		var worldCoords = canvas.viewToWorld(x,y);
		boxStack.push({ 'x':worldCoords[0], 'y':worldCoords[1], 'w':w, 'h':h});
		this.rebuildDisplayCache();
		this.draw();
	}

	this.createNote = function(x,y,w,h) {
		var worldCoords = canvas.viewToWorld(x,y);
		noteStack.push({ 'x':worldCoords[0], 'y':worldCoords[1], 'w':w, 'h':h});
		this.rebuildDisplayCache();
		this.draw();
	}

	this.rebuildDisplayCache = function () {
		//use a line sweep algorithm to create the display cache
		//tempoarily drawing boxes
		displayCache = new Array();

		displayCache.push('F');["R", startX, startY, dragVectorX, dragVectorY]

		displayCache.push(COLOR_PLUS);
		for(var i = 0;i < boxStack.length; i++){
			displayCache.push('R');
			displayCache.push(boxStack[i].x);
			displayCache.push(boxStack[i].y);
			displayCache.push(boxStack[i].w);
			displayCache.push(boxStack[i].h);
		}

	
		displayCache.push('F');

		displayCache.push(COLOR_NOTE);	
		for(var i = 0;i < noteStack.length; i++){

			displayCache.push('R');
			displayCache.push(noteStack[i].x);
			displayCache.push(noteStack[i].y);
			displayCache.push(noteStack[i].w);
			displayCache.push(noteStack[i].h);
		}
		
	}

	this.draw = function () {
		var worldCoords = canvas.viewToWorld(startX,startY);
		var currentLoc = null;

		if(displayTemp) {
			currentLoc = getPosition(canvas.canvasNode);

			lagVectorX = dragVectorX;
			lagVectorY = dragVectorY;

			dragVectorX = (lastMouseX - currentLoc[0]) - startX;
			dragVectorY = (lastMouseY - currentLoc[1]) - startY;
		}

		canvas.clear();
		canvas.start();
			canvas.render(displayCache);
			for(note in noteStack) {
				//canvas.translateModel(, );
				canvas.bitblt(artWarningBuf, noteStack[note].x + ((noteStack[note].w/2)-(artWarningBuf.width/2)), noteStack[note].y + ((noteStack[note].h/2)-(artWarningBuf.height/2)));
			}

			//TODO Eventually implement different objects for each state.
			if(displayTemp) {
				switch(state) {
					case EDIT_STATE:
					case NOTE_STATE:
						canvas.render(["R", worldCoords[0], worldCoords[1], dragVectorX, dragVectorY]);
						break;
					case VIEW_STATE:
						canvas.translateView(dragVectorX - lagVectorX, dragVectorY - lagVectorY);
						break;
					default:
						break;
				}
			}
		canvas.end();
	}


	//TODO Eventually implement different objects for each state.
	this.setEditState = function () {
		state = EDIT_STATE;
		this.attachEvents();
	}

	this.setNoteState = function () {
		state = NOTE_STATE;
		this.attachEvents();
	}

	this.setViewState = function () {
		state = VIEW_STATE;
		this.attachEvents();
	}

	this.attachEvents = function () {
		canvas.canvasNode.removeEventListener('mousedown', this.onMouseDownHandle_View, false);
		canvas.canvasNode.removeEventListener('mouseup', this.onMouseUpHandle_View, false);

		canvas.canvasNode.removeEventListener('mousedown', this.onMouseDownHandle_Note, false);
		canvas.canvasNode.removeEventListener('mouseup', this.onMouseUpHandle_Note, false);

		canvas.canvasNode.removeEventListener('mousedown', this.onMouseDownHandle_Edit, false);
		canvas.canvasNode.removeEventListener('mouseup', this.onMouseUpHandle_Edit, false);

		// add event handlers
		switch(state) {
			case VIEW_STATE:
				canvas.canvasNode.addEventListener('mousedown', this.onMouseDownHandle_View, false);
				canvas.canvasNode.addEventListener('mouseup', this.onMouseUpHandle_View, false);
				break;
			case NOTE_STATE:
				canvas.canvasNode.addEventListener('mousedown', this.onMouseDownHandle_Note, false);
				canvas.canvasNode.addEventListener('mouseup', this.onMouseUpHandle_Note, false);
				break;
			case EDIT_STATE:
				canvas.canvasNode.addEventListener('mousedown', this.onMouseDownHandle_Edit, false);
				canvas.canvasNode.addEventListener('mouseup', this.onMouseUpHandle_Edit, false);
				break;
		}
	}

	var drawTracker = animation.track(this.draw);
	var drawTimer = null; 

	// attach the event handlers for draging
	canvas.canvasNode.addEventListener('mousedown', this.onDrag_Start, false);
	canvas.canvasNode.addEventListener('mouseup', this.onDrag_Stop, false);
	canvas.canvasNode.addEventListener('mousemove', this.onMouseMove, false);
	this.attachEvents();
}

