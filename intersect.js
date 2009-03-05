function point (i_x, i_y){
	this.x = i_x;
	this.y = i_y;
};

function segment(s, e) {
	//this should be the point with the lowest x value
	this.start = (s.x < e.x)? s: e;
	//this should be the point with the greatest x value
	this.end = (s.x < e.x)? e: s;
	this.slope = (s.y - e.y)/(s.x - e.x);
	//check if the the segment is vertical
	this.vertical = (this.slope == Infinity) || (this.slope == -Infinity);
	this.intercept = (!this.vertical)?-((this.slope * s.x) - s.y):null;
}

function intersector(i_canvas) {
	var canvas = i_canvas;
	var ctx = canvas.getContext('2d');
	var all_seg = Array();
	var current_seg = Array(); //an array of indicies pointing to all_seg

	// sorting properties
	function sortByStartX(a, b) {
		return a.start.x - b.start.x;
	}

	function sortByEndX(a, b) {
		return all_seg[a].end.x - all_seg[b].end.x;
	}

	this.addRect = function (x,y,w,h) {
		//draw the rect
		ctx.fillStyle = "rgb(200,0,0)";
		ctx.fillRect (x, y, w, h);
		var tl = new point(x,y);
		var bl = new point(x,y+h);
		var br = new point(x+w, y+h);
		var tr = new point(x+w, y);


		all_seg.push(new segment(tl,bl));
		all_seg.push(new segment(bl,br));
		all_seg.push(new segment(br,tr));
		all_seg.push(new segment(tr,tl));
	}

	this.addTriangle = function (x1,y1, x2,y2, x3,y3) {
		//draw the Tri
		ctx.fillStyle = "rgba(200,255,0,.75)";
		ctx.beginPath();
		ctx.moveTo(x1,y1);
		ctx.lineTo(x2,y2);
		ctx.lineTo(x3,y3);
		ctx.fill();

		var one = new point(x1,y1);
		var two = new point(x2,y2);
		var three = new point(x3, y3);

		all_seg.push(new segment(one,two));
		all_seg.push(new segment(two, three));
		all_seg.push(new segment(three, one));
	}

	this.intersect = function (){
		//the status is the line that passes over all the geometery
		//  It in theory should start at -Infinity, but it doesn't have to :P
		var status = -Infinity;

		//sort the segments because the line passes from left to right
		//  so if we sort them according to the x value, we wont have to increment
		//  from -Infinity to Infinity, which would take forever... literally.
		all_seg.sort(sortByStartX);

		//draw the points in blue
		ctx.fillStyle = "blue";

		//loop through all the start points
		for( i in all_seg) {

			//draw the points so we know what we are working with
			ctx.strokeColor = "#000";
			ctx.lineWidth = 2;
			ctx.beginPath();
			ctx.moveTo(all_seg[i].start.x, all_seg[i].start.y);
			ctx.lineTo(all_seg[i].end.x, all_seg[i].end.y);
			ctx.stroke();

			ctx.beginPath();
			ctx.arc(all_seg[i].start.x, all_seg[i].start.y, 3, 0, Math.PI*2, true);
			ctx.fill();

			//update the status by setting it equal to the start x
			status = all_seg[i].start.x;			

			//go through all of the current line segments which
			//  are sorted by the end x
			for(j in current_seg) {
				// if we've passed a an end point remove from the list
				if(all_seg[current_seg[j]].end.x < status) {
					current_seg.splice(i, 1);
				} else {
					//we haven't passed it yet so it might still intersect
					//  so calculate the intersection
					var tmp_curr_seg = all_seg[current_seg[j]];

					var delta_y_1 = all_seg[i].end.y - all_seg[i].start.y;
					var delta_x_1 = all_seg[i].start.x - all_seg[i].end.x;
					var const_1 = all_seg[i].end.x * all_seg[i].start.y - all_seg[i].start.x * all_seg[i].end.y;  // delta_y_1*x + delta_x*y + c1 = 0 is line 1

					//finish me http://www.pdas.com/lineint.htm
					var delta_y_2 = tmp_curr_seg.end.y - tmp_curr_seg.start.y;
					var delta_x_2= tmp_curr_seg.start.x - tmp_curr_seg.end.x;
					var const_2 = tmp_curr_seg.end.x * tmp_curr_seg.start.y - tmp_curr_seg.start.x * tmp_curr_seg.end.y;  // a2*x + b2*y + c2 = 0 is line 2 }

					var denominator = delta_y_1 * delta_x_2 - delta_x_1 * delta_y_2;

					var x_int = 0;
					var y_int = 0;

					if(denominator) {
						x_int = (delta_x_1 * const_2 - delta_x_2 * const_1)/denominator;
						y_int = (delta_y_2 * const_1 - delta_y_1 * const_2)/denominator;
					} else {
						x_int = all_seg[i].start.x;
						y_int = (tmp_curr_seg.slope * x_int) + tmp_curr_seg.intercept;
					}

					if((x_int >= all_seg[i].start.x) && (x_int <= all_seg[i].end.x) ) {
						ctx.save();
						ctx.strokeStyle = 'rgba(0,255,128,.75)';
						ctx.beginPath();
						ctx.arc(x_int, y_int, 5, 0, Math.PI*2, true);
						ctx.stroke();
						ctx.restore();

						console.log(x_int + ", " + y_int);
					}
				}
			}

			if(!all_seg[i].vertical) {
				current_seg.push(i);
				current_seg.sort(sortByEndX);
			}
		}
	}
}
