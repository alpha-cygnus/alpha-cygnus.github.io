function WGL(gl) {
	this.gl = gl;
}

WGL.prototype = {
	loadShader: function loadShader(type, id)
	{
		var gl = this.gl;
		var shaderScript = document.getElementById(id);
		if (!shaderScript) {
			return null;
		}

		var str = "";
		var k = shaderScript.firstChild;
		while (k) {
			if (k.nodeType == 3) {
				str += k.textContent;
			}
			k = k.nextSibling;
		}

		var shader = gl.createShader(type);
		gl.shaderSource(shader, str);
		gl.compileShader(shader);

		if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
			alert(gl.getShaderInfoLog(shader));
			return null;
		}

		return shader;
	},

	compileProgram: function compileProgram(vs, fs)
	{
		var gl = this.gl;
		var vertexShader = this.loadShader(gl.VERTEX_SHADER, vs);
		var fragmentShader = this.loadShader(gl.FRAGMENT_SHADER, fs);

		var prog = gl.createProgram();
		gl.attachShader(prog, vertexShader);
		gl.attachShader(prog, fragmentShader);
		gl.linkProgram(prog);

		if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
			alert("Could not initialize shaders");
		}

		return prog;
	},

	arrayTexture: function arrayTexture(texSize, pixels)
	{
		var gl = this.gl;
		var tex = gl.createTexture();
		if (tex != 0) {
			gl.bindTexture(gl.TEXTURE_2D, tex);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
			gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, texSize, texSize, 0, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
		}
		return tex;
	},

	handleLoadedTexture: function handleLoadedTexture(texture)
	{
		var gl = this.gl;
		gl.bindTexture(gl.TEXTURE_2D, texture);
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, texture.image);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
	},

	loadTexture: function loadTexture(path)
	{
		var gl = this.gl;
		var texture = gl.createTexture();
		texture.image = new Image();
		texture.image.onload = function() {
			handleLoadedTexture(texture)
		}

		texture.image.crossOrigin = "";
		texture.image.src = path;
		return texture;
	},

	createBuffer: function createBuffer(buffer)
	{
		var gl = this.gl;
		var glBuf = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, glBuf);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(buffer), gl.STATIC_DRAW);
		return glBuf;
	},

};