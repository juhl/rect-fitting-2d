App = function() {
    var canvas;
    var ctx;
    var mouseDown;

    var polyVerts = [];
    var coa = [];
    var variance = [];
    var axis = [];
    var center = [];
    var extents = [];

    function main() {
        canvas = document.getElementById("canvas");
        if (!canvas.getContext) {
            alert("Couldn't get canvas object !");
        }

        ctx = canvas.getContext("2d");

        canvas.addEventListener("mousedown", function(e) { onMouseDown(e) }, false);
        canvas.addEventListener("mouseup", function(e) { onMouseUp(e) }, false);
        canvas.addEventListener("mousemove", function(e) { onMouseMove(e) }, false);

        canvas.addEventListener("touchstart", touchHandler, false);
        canvas.addEventListener("touchend", touchHandler, false);
        canvas.addEventListener("touchmove", touchHandler, false);
        canvas.addEventListener("touchcancel", touchHandler, false);
    }

    function updateScreen() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        //drawAxis();
        drawPolygon();

        if (polyVerts.length > 2)
            drawFitRect();
    }

    function canvasToWorld(xy) {
        return [xy[0] - canvas.width / 2, canvas.height / 2 - xy[1]];
    }

    function worldToCanvas(xy) {
        return [xy[0] + canvas.width / 2, canvas.height / 2 - xy[1]];
    }

    function drawFitRect() {
        var extvec = [];
        extvec[0] = [axis[0][0] * extents[0], axis[0][1] * extents[0]];
        extvec[1] = [axis[1][0] * extents[1], axis[1][1] * extents[1]];

        var cverts = [];
        cverts[0] = worldToCanvas([center[0] - extvec[0][0] + extvec[1][0], center[1] - extvec[0][1] + extvec[1][1]]);
        cverts[1] = worldToCanvas([center[0] - extvec[0][0] - extvec[1][0], center[1] - extvec[0][1] - extvec[1][1]]);
        cverts[2] = worldToCanvas([center[0] + extvec[0][0] - extvec[1][0], center[1] + extvec[0][1] - extvec[1][1]]);
        cverts[3] = worldToCanvas([center[0] + extvec[0][0] + extvec[1][0], center[1] + extvec[0][1] + extvec[1][1]]);

        ctx.strokeStyle = "#0F0";
        ctx.beginPath();
        ctx.moveTo(cverts[0][0], cverts[0][1]);
        for (var i = 0; i < 4; i++) {
            ctx.lineTo(cverts[i][0], cverts[i][1]);
        }
        ctx.lineTo(cverts[0][0], cverts[0][1]);
        ctx.stroke();
        ctx.closePath();

        // canvas center point
        var cc = worldToCanvas(center);

        ctx.fillStyle = "#0F0";
        ctx.beginPath();
        ctx.arc(cc[0], cc[1], 3, 0, Math.PI*2, true);
        ctx.fill();
    }

    // draw counter clockwise polyVerts
    function drawPolygon() {
        ctx.fillStyle = "#AAF";
        ctx.strokeStyle = "#338";
        ctx.lineWidth = 2;
        ctx.beginPath();

        var cv = worldToCanvas(polyVerts[0]);
        ctx.moveTo(cv[0], cv[1]);
        for (var i = 1; i < polyVerts.length; i++) {
            cv = worldToCanvas(polyVerts[i]);
            ctx.lineTo(cv[0], cv[1]);
        }
        cv = worldToCanvas(polyVerts[0]);
        ctx.lineTo(cv[0], cv[1]);
        ctx.fill();
        ctx.stroke();
        ctx.closePath();

        // start point
        ctx.fillStyle = "#00F";
        ctx.beginPath();
        cv = worldToCanvas(polyVerts[0]);
        ctx.arc(cv[0], cv[1], 3, 0, Math.PI*2, true);
        ctx.fill();

        // end point
        ctx.fillStyle = "#F00";
        ctx.beginPath();
        cv = worldToCanvas(polyVerts[polyVerts.length - 1]);
        ctx.arc(cv[0], cv[1], 3, 0, Math.PI*2, true);
        ctx.fill();
    }

    function clearPolygon() {
        polyVerts.length = 0;
    }

    function calcVarianceProperties() {
        var intg = [0, 0, 0, 0, 0, 0];       

        for (var i = 0; i < polyVerts.length; i++) {
            var v0 = polyVerts[i];
            var v1 = polyVerts[(i + 1) % polyVerts.length];
            
            var a = v0[0] * v1[1] - v0[1] * v1[0];

            var a1 = v0[0] + v1[0];
            var a2 = v0[1] + v1[1];

            var b1 = a1 * a;
            var b2 = a2 * a;

            var c1 = (a1 * v0[0] + v1[0] * v1[0]) * a;
            var c2 = (a2 * v0[1] + v1[1] * v1[1]) * a;
            var c3 = (v1[1] * (a1 + v1[0]) + v0[1] * (a1 + v0[0])) * a;

            intg[0] += a;
            intg[1] += b1;
            intg[2] += b2;
            intg[3] += c1;
            intg[4] += c2;
            intg[5] += c3;
        }

        intg[0] /= 2;
        intg[1] /= 6;
        intg[2] /= 6;
        intg[3] /= 12;
        intg[4] /= 12;
        intg[5] /= 24;

        // area
        var area = intg[0];
               
        // center of area
        coa[0] = intg[1] / area;
        coa[1] = intg[2] / area;

        // variance
        variance[0] = intg[3] - area * (coa[0] * coa[0]);
        variance[1] = intg[4] - area * (coa[1] * coa[1]);

        // covariance
        variance[2] = intg[5] - area * (coa[0] * coa[1]);
    }

    function calcAxis() {
        // solve characteristic equation for eigenvalues
        var a = variance[0] + variance[1];
        var b = variance[0] - variance[1];
        var d = Math.sqrt(b * b + 4 * variance[2] * variance[2]);
        var l1 = (a + d) * 0.5;
        var l2 = (a - d) * 0.5;
        
        // calc eigenvectors
        // eigenvectors should be orthogonal because covariance matrix is symmetric
        axis[0] = [-variance[2], variance[0] - l1];
        axis[1] = [variance[1] - l2, -variance[2]];

        // normalize eigenvectors
        inv = [];
        inv[0] = 1.0 / Math.sqrt(axis[0][0] * axis[0][0] + axis[0][1] * axis[0][1]);
        inv[1] = 1.0 / Math.sqrt(axis[1][0] * axis[1][0] + axis[1][1] * axis[1][1]);

        axis[0][0] *= inv[0];
        axis[0][1] *= inv[0];

        axis[1][0] *= inv[1];
        axis[1][1] *= inv[1];
    }

    function calcExtents() {        
        mins = [+99999, +99999];
        maxs = [-99999, -99999];

        for (var i = 0; i < polyVerts.length; i++) {
            var rx = polyVerts[i][0] - coa[0];
            var ry = polyVerts[i][1] - coa[1];

            var ex = rx * axis[0][0] + ry * axis[0][1];
            var ey = rx * axis[1][0] + ry * axis[1][1];

            if (ex < mins[0]) {
                mins[0] = ex;
            } 
            if (ex > maxs[0]) {
                maxs[0] = ex;
            }

            if (ey < mins[1]) {
                mins[1] = ey;
            }
            if (ey > maxs[1]) {
                maxs[1] = ey;
            }
        }

        extents[0] = (maxs[0] - mins[0]) * 0.5;
        extents[1] = (maxs[1] - mins[1]) * 0.5;

        center[0] = coa[0];
        center[0] += axis[0][0] * (mins[0] + maxs[0]) * 0.5;
        center[0] += axis[1][0] * (mins[1] + maxs[1]) * 0.5;

        center[1] = coa[1];
        center[1] += axis[0][1] * (mins[0] + maxs[0]) * 0.5;
        center[1] += axis[1][1] * (mins[1] + maxs[1]) * 0.5;
    }

    function getMousePoint(e) {
        return { x: e.clientX - canvas.offsetLeft, y: e.clientY - canvas.offsetTop } 
    }

    function onMouseDown(e) {
        mouseDown = true;

        var point = getMousePoint(e);
        polyVerts[polyVerts.length] = canvasToWorld([point.x, point.y]);

        calcVarianceProperties();
        calcAxis();
        calcExtents();

        updateScreen();
    }

    function onMouseUp(e) { 
	    if (mouseDown) {
            mouseDown = false;
		}
	}

    function onMouseMove(e) {
        var point = getMousePoint(e);
        if (mouseDown) {
            polyVerts[polyVerts.length - 1] = canvasToWorld([point.x, point.y]);

            calcVarianceProperties();
            calcAxis();
            calcExtents();

            updateScreen();
        }
    }

    function touchHandler(e) {
        var touches = e.changedTouches;
        var first = touches[0];
        var type = "";

        switch (e.type) {
        case "touchstart": type = "mousedown"; break;
        case "touchmove":  type = "mousemove"; break;        
        case "touchend":   type = "mouseup"; break;
        default: return;
        }

        //initMouseEvent(type, canBubble, cancelable, view, clickCount, 
        //           screenX, screenY, clientX, clientY, ctrlKey, 
        //           altKey, shiftKey, metaKey, button, relatedTarget);   
        var simulatedEvent = document.createEvent("MouseEvent");
        simulatedEvent.initMouseEvent(type, true, true, window, 1, 
                                      first.screenX, first.screenY, 
                                      first.clientX, first.clientY, false, 
                                      false, false, false, 0/*left*/, null);

        first.target.dispatchEvent(simulatedEvent);
        e.preventDefault();
    }

	return { main: main };
}();