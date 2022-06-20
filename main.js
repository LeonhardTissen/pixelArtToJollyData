function $(e) {return document.getElementById(e);};

function compress(obj) {
    return '<jollyData-' + LZString.compressToEncodedURIComponent(JSON.stringify(obj)) + '>';
};

function decompress(jollydata) {
    return JSON.parse(LZString.decompressFromEncodedURIComponent(jollydata.replace('<jollyData-','').replace('>','')));
}

const cvs = $('screen');
const ctx = $('screen').getContext('2d');

let x = 0;
let y = 0;
let size = 16;
let scale = 32;
let color = '#888888';
let mouse = [false, false]
let colordata;
let finished_pixels;
let finalized_pixels;

function generateCanvas(sizeParam) {
    size = sizeParam;
    $('screen').width = size;
    $('screen').height = size;
    $('sizetext').innerText = size;
    scale = 512 / size;
    $('screen').style.backgroundSize = `${1024/size}px`;
    $('cursor').style.width = 512 / size + "px";
    $('cursor').style.height = 512 / size + "px";
    colordata = generateArray();
};

function generateArray() {
    return Array(size).fill().map(() => Array(size).fill(0));
};

$('size').value = 16;

generateCanvas(16);

$('container').onmousemove = function(e) {
    x = Math.floor(e.layerX / scale);
    y = Math.floor(e.layerY / scale);
    if (x < 0 || x >= cvs.width || y < 0 || y >= cvs.height) {
        return;
    }
    $('cursor').style.left = x * scale + "px";
    $('cursor').style.top = y * scale + "px";
    updateDraw();
};

$('container').oncontextmenu = function(e) {
    e.preventDefault();
};

$('container').onmousedown = function(e) {
    if (e.which === 1) {
        mouse[0] = true;
    } else if (e.which === 3) {
        mouse[1] = true;
    };
    updateDraw();
};

document.body.onmouseup = function(e) {
    if (e.which === 1) {
        mouse[0] = false;
    } else if (e.which === 3) {
        mouse[1] = false;
    };
};

function updateDraw() {
    if (mouse[0]) {
        ctx.fillStyle = color;
        ctx.fillRect(x, y, 1, 1);
        colordata[y][x] = color;
    };
    if (mouse[1]) {
        ctx.clearRect(x, y, 1, 1);
        colordata[y][x] = 0;
    };
};

let output_obj;

function generateOutput() {
    output_obj = {objects: []};
    finished_pixels = generateArray(size);
    finalized_pixels = generateArray(size);
    for (let y = 0; y < size; y ++) {
        for (let x = 0; x < size; x ++) {
            parsePixel(x, y);
        };
    };
    $('output').value = compress(output_obj);
    $('output').focus();
    $('output').select();
    $('generate').innerText = 'Copied to clipboard!';
    $('generate').style.color = '#282';
    $('generate').style.pointerEvents = 'none';
    setTimeout(function() {
        $('generate').innerText = 'Generate';
        $('generate').style.color = '';
        $('generate').style.pointerEvents = 'all';
    }, 2000)
    document.execCommand('copy');
};

$('size').oninput = function() {
    generateCanvas(parseInt(this.value));
};

let current_x;
let current_y;
let scanned_pixel;

function checkPixel(x_diff, y_diff) {
    if (current_x + x_diff < 0 || 
        current_x + x_diff >= cvs.width || 
        current_y + y_diff < 0 || 
        current_y + y_diff >= cvs.height ||
        finalized_pixels[current_y + y_diff][current_x + x_diff] === 1) {
        return false;
    };
    if (colordata[current_y + y_diff][current_x + x_diff] === scanned_pixel) {
        finished_pixels[current_y + y_diff][current_x + x_diff] = 1;
        return true;
    };
    return false;
};

const igm = 8;

function parsePixel(x, y) {
    scanned_pixel = colordata[y][x];

    if (finished_pixels[y][x] === 1) return;

    if (scanned_pixel === 0) return;

    current_x = x;
    current_y = y;
    let current_d = 'right';
    const points = [{x: x * igm, y: y * igm}];

    let active = true;
    while (active) {
        let append = false;
        const append_x = current_x;
        const append_y = current_y;
        switch (current_d) {
            case 'right':
                if (checkPixel(0, -1)) {
                    current_y --;
                    current_d = 'up';
                    append = true;
                } else if (checkPixel(0, 0)) {
                    current_x ++;
                } else if (checkPixel(-1, 0)) {
                    current_y ++;
                    current_d = 'down';
                    append = true;
                };
                break;
            case 'up':
                if (checkPixel(-1, -1)) {
                    current_x --;
                    current_d = 'left';
                    append = true;
                } else if (checkPixel(0, -1)) {
                    current_y --;
                } else if (checkPixel(0, 0)) {
                    current_x ++;
                    current_d = 'right';
                    append = true;
                };
                break;
            case 'down':
                if (checkPixel(0, 0)) {
                    current_x ++;
                    current_d = 'right';
                    append = true;
                } else if (checkPixel(-1, 0)) {
                    current_y ++;
                } else if (checkPixel(-1, -1)) {
                    current_x --;
                    current_d = 'left';
                    append = true;
                };
                break;
            case 'left':
                if (checkPixel(-1, 0)) {
                    current_y ++;
                    current_d = 'down';
                    append = true;
                } else if (checkPixel(-1, -1)) {
                    current_x --;
                } else if (checkPixel(0, -1)) {
                    current_y --;
                    current_d = 'up';
                    append = true;
                };
                break;
        };
        if (append) {
            points.push({x: append_x * igm, y: append_y * igm});
        };
        if (current_x === x && current_y === y) {
            active = false;
        };
        if (points.length > 100) {
            active = false;
        };
    };

    finished_pixels[y][x] = 1;
    finalized_pixels = JSON.parse(JSON.stringify(finished_pixels));
    const new_obj = [6,0,0,0,"","",0,scanned_pixel,"#000",1,null,points,null,null,null,null,"",0,0,0,0,"",true]
    output_obj.objects.push(new_obj);
};

$('color').oninput = function() {
    color = this.value;
};
$('color').value = '#888888'

$('image').oninput = function() {
    const reader = new FileReader();
    reader.onload = function() {
        const img = new Image();
        img.src = this.result;
        img.onload = function() {
            ctx.drawImage(img, 0, 0);
            const data = ctx.getImageData(0, 0, size, size).data;
            let p = 0;
            for (let i = 0; i < data.length; i += 4) {
                if (data[i + 3] !== 0) {
                    colordata[Math.floor(p / cvs.width)][p % cvs.width] = rgbToHex(data[i], data[i + 1], data[i + 2]);
                };
                p ++;
            };
        };
    };
    reader.readAsDataURL($('image').files[0]);
};3

function componentToHex(c) {
    var hex = c.toString(16);
    return hex.length == 1 ? "0" + hex : hex;
};
  
function rgbToHex(r, g, b) {
    return "#" + componentToHex(r) + componentToHex(g) + componentToHex(b);
};

$('generate').onclick = generateOutput;
