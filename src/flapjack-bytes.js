import { Nucleotide } from './nucleotide.js';
import { Marker } from './marker.js';
import { ColorState } from './colorstate.js';

export function GenotypeRenderer() {
    var genotype_renderer = {};
    var brapijs;

    // Variables for referring to the genotype canvas
    var canvas;
    var ctx;

    // Mouse related variables
    var dragStartX = null;
    var dragStartY = null;
    var dragging = false;
    var translatedX = 0;
    var translatedY = 0;

    // Variables to keep track of where we are in the data
    var lineStart = 0;
    var lineEnd = 0;

    var boxSize = 16;

    var maxCanvasHeight;
    var maxCanvasWidth;

    var vertical_scrollbar;
    var horizontal_scrollbar;

    var font = "16px monospaced";
    var fontSize = 100;

    var lineNamesWidth = 100;
    var mapCanvasHeight = 30;

    var stateTable = new Map();
    var lineNames = [];
    var markerNames = [];
    var lineData = [];
    var markerData = [];
    var colorStamps = [];

    var colors = {
        greenLight: 'rgb(171,255,171)',
        greenDark: 'rgb(86,179,86)',
        redLight: 'rgb(255,171,171)',
        redDark: 'rgb(179,86,86)',
        blueLight: 'rgb(171,171,255)',
        blueDark: 'rgb(86,86,179)',
        orangeLight: 'rgb(255,228,171)',
        orangeDark: 'rgb(179,114,86)',
        white: 'rgb(255,255,255)'
    };

    var nucleotides = new Map();
    nucleotides.set('A', new Nucleotide('A', colors.greenLight, colors.greenDark));
    nucleotides.set('G', new Nucleotide('G', colors.redLight, colors.redDark));
    nucleotides.set('T', new Nucleotide('T', colors.blueLight, colors.blueDark));
    nucleotides.set('C', new Nucleotide('C', colors.orangeLight, colors.orangeDark));
    nucleotides.set('', new Nucleotide('', colors.white, colors.white));

    genotype_renderer.renderGenotypesBrapi = function(dom_parent, width, height, server, matrix_id) {
        mapCanvasHeight = 0;
        createRendererComponents(dom_parent, width, height);

        brapijs = BrAPI(server);

        var params = { "matrixDbId": [matrix_id], "format": 'flapjack'};

        brapijs.allelematrices_search(params)
        .each(function(matrix_object){
            var myInit = { method: 'GET',
                headers: {
                    'Content-Type': 'text/tsv'
                },
                mode: 'cors',
                cache: 'default' };

            fetch(matrix_object.__response.metadata.datafiles[0], myInit)
            .then(function (response) {
                if (response.status !== 200) {
                    console.log("Couldn't load file: " + filepath + ". Status code: " + response.status);
                    return;
                }
                response.text().then(function (data) {
                    var lines = data.split(/\r?\n/);
                    for (var line = 0; line < lines.length; line++) {
                        processFileLine(lines[line]);
                    }
                    init();
                })
            })
            .catch(function (err) {
                console.log('Fetch Error :-S', err);
            });
        });

        return genotype_renderer;
    }

    genotype_renderer.renderGenotypesFile = function(dom_parent, width, height, map_file_dom, genotype_file_dom)
    {
        createRendererComponents(dom_parent, width, height);

        loadMapData(map_file_dom);
        loadGenotypeData(genotype_file_dom);

        return genotype_renderer;
    }

    function createRendererComponents(dom_parent, width, height)
    {
        var canvas_holder =  document.getElementById(dom_parent.slice(1));

        // Set up the canvas and drawing context for the genotype display
        canvas = document.createElement('canvas');
        canvas.id = 'genotype';
        canvas.width = width;
        maxCanvasWidth = width;
        canvas.height = height;
        maxCanvasHeight = height;
        ctx = canvas.getContext('2d');
        canvas_holder.append(canvas);

        vertical_scrollbar = new ScrollBarKnob(10, 20, canvas.width-10, 0, 5);
        horizontal_scrollbar = new ScrollBarKnob(20, 10, 0, canvas.height-10-mapCanvasHeight, 5);

        var zoom_div = document.createElement('div');
        zoom_div.id = 'zoom-holder';

        var zoom_label = document.createElement('label');
        zoom_label.setAttribute('for', 'zoom-control');
        zoom_label.innerHTML = "Zoom:";

        var range = document.createElement('input');
        range.setAttribute('type', 'range');
        range.min = 2;
        range.max = 64;
        range.value = 16;

        range.addEventListener('change', function(){
            zoom(range.value);
        });

        range.addEventListener('input', function(){
            zoom(range.value);
        });

        zoom_div.appendChild(zoom_label);
        zoom_div.appendChild(range);
        canvas_holder.appendChild(zoom_div);
    }

    function ScrollBarKnob(knob_width, knob_height, knob_x, knob_y, corner_radius)
    {
        this.knob_width = knob_width;
        this.knob_height = knob_height;
        this.knob_x = knob_x;
        this.knob_y = knob_y;
        this.corner_radius = corner_radius;
        this.render = function() {
            // Set faux rounded corners
            ctx.lineJoin = "round";
            ctx.lineWidth = corner_radius;

            ctx.fillStyle = '#aaa';
            ctx.strokeStyle = '#aaa';

            // Change origin and dimensions to match true size (a stroke makes the shape a bit larger)
            ctx.strokeRect(knob_x+(corner_radius/2), knob_y+(corner_radius/2), knob_width-corner_radius, knob_height-corner_radius);
            ctx.fillRect(knob_x+(corner_radius/2), knob_y+(corner_radius/2), knob_width-corner_radius, knob_height-corner_radius);
        }

        this.move = function(xMove, yMove) {
            knob_x = xMove;
            knob_y = yMove;
        }
    }

    function loadMapData(map_file_dom)
    {
        var file = document.getElementById(map_file_dom.slice(1)).files[0];
        console.log("Load map data");
        console.log(document.getElementById(map_file_dom.slice(1)).files[0]);

        var reader = new FileReader();
        reader.onloadend = function()
        {
            var markers = this.result.split(/\r?\n/);
            for (var marker = 0; marker < markers.length; marker++)
            {
                processMapFileLine(markers[marker]);
            }
        };
        reader.readAsText(file);
    }

    function processMapFileLine(line)
    {
        if (line.startsWith("#") || (!line || 0 === line.length) || line.startsWith('\t'))
        {
            return;
        }
        
        var tokens = line.split('\t');
        if (tokens.length === 2)
        {
            return;
        }
        var markerName = tokens[0];

        markerNames.push(markerName);
        var marker = new Marker(markerName, tokens[1], tokens[2]);
        markerData.push(marker);
    }

    function loadGenotypeData(genotype_file_dom)
    {
        var file = document.getElementById(genotype_file_dom.slice(1)).files[0];
        console.log(file);

        var reader = new FileReader();
        reader.onloadend = function()
        {
            var lines = this.result.split(/\r?\n/);
            for (var line = 0; line < lines.length; line++)
            {
                processFileLine(lines[line]);
            }

            init();
        };

        reader.readAsText(file);
    }

    function processFileLine(line)
    {
        if (line.startsWith("#") || (!line || 0 === line.length) || line.startsWith("Accession") || line.startsWith('\t'))
        {
            return;
        }
        
        var tokens = line.split('\t');
        var lineName = tokens[0];
        lineNames.push(lineName);
        lineData.push(tokens.slice(1).map(getState));
    }

    function getState(allele)
    {
        if (allele === '-' || (!allele || 0 === allele.length))
            allele = '';

        if (!stateTable.has(allele))
        {
            stateTable.set(allele, stateTable.size);
        }

        return stateTable.get(allele);
    }

    function init()
    {
        // Pre-render our gradient squares
        setupColorStamps();

        // Add event handlers for mouse events to allow movement of the displays
        canvas.addEventListener('mousedown', onmousedown, false);
        window.addEventListener('mouseup', onmouseup, false);
        window.addEventListener('mousemove', onmousemove, false);

        render();
    }

    function calculateFontSize(text, fontface, size)
    {
        var fontCanvas = document.createElement('canvas');
        fontCanvas.width = size;
        fontCanvas.height = size;
        var fontContext = fontCanvas.getContext('2d');
        
        fontSize = 100;
        fontContext.font = fontSize + "px " + fontface;

        while (fontContext.measureText(text).width > fontCanvas.width)
        {
            fontSize--;
            fontContext.font = fontSize + "px " + fontface;
        }

        ctx.font = fontContext.font;

        return fontContext.font;
    }

    // Generates a set of homozygous and heterozygous color stamps from the stateTable
    function setupColorStamps()
    {
        colorStamps = [];
        for (var key of stateTable.keys())
        {
            if (key.length <= 1)
            {
                // If we fail to find a key for whatever reason, get the blank stamp
                var nucleotide = nucleotides.get(key);
                if (nucleotide === undefined)
                {
                    nucleotide = nucleotides.get('');
                }
                let buffer = drawGradientSquare(boxSize, nucleotide);
                let stamp = new ColorState(buffer);
                colorStamps.push(stamp);
            }
            else
            {
                var alleles = key.split('/');
                var nucleotide1 = nucleotides.get(alleles[0]);
                var nucleotide2 = nucleotides.get(alleles[1]);
                let buffer = drawHetSquare(boxSize, nucleotide1, nucleotide2);
                let stamp = new ColorState(buffer);
                colorStamps.push(stamp);
            }
        }
    }

    function render()
    {
        lineStart = Math.floor(translatedY/boxSize);
        lineEnd = Math.min(lineStart + (canvas.height/boxSize), lineNames.length);

        var totalAlleles = lineData[0].length -1;

        maxCanvasWidth = lineData[0].length * boxSize;
        maxCanvasHeight = lineNames.length * boxSize;
        var alleleStart = Math.floor(translatedX/boxSize);
        var alleleEnd = Math.floor(Math.min(alleleStart + (canvas.width/boxSize), totalAlleles));

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        renderMap(alleleStart, alleleEnd);
        renderGermplasmNames(lineNames, lineStart, lineEnd);
        renderGermplasm(lineStart, lineEnd, alleleStart, alleleEnd);
        renderScrollbars();
    }

    function renderMap(alleleStart, alleleEnd)
    {
        if (markerData.length == 0)
        {
            mapCanvasHeight = 0;
            return;
        }

        var firstMarkerPos = markerData[alleleStart].position;
        var lastMarkerPos = markerData[alleleEnd].position;

        var dist = lastMarkerPos - firstMarkerPos;

        ctx.lineWidth = 1;
        ctx.strokeStyle = 'gray';
        ctx.translate(lineNamesWidth, 0);

        for (var i=alleleStart; i < alleleEnd; i++)
        {
            var pos = (i-alleleStart)*boxSize;
            pos += (boxSize / 2);
            var marker = markerData[i];
            var markerPos = ((marker.position - firstMarkerPos) * ((canvas.width-lineNamesWidth) / dist));
            ctx.beginPath();
            ctx.moveTo(markerPos, 0);
            ctx.lineTo(pos, 20)
            ctx.lineTo(pos, mapCanvasHeight);
            ctx.stroke();
        }
        ctx.translate(-lineNamesWidth, 0);
    }

    function renderScrollbars()
    {
        ctx.translate(0, mapCanvasHeight);
        ctx.fillStyle = '#eee';
        ctx.strokeStyle = '#ccc';
        ctx.strokeRect(vertical_scrollbar.knob_x, 0, vertical_scrollbar.knob_width, canvas.height-vertical_scrollbar.knob_width);
        ctx.fillRect(vertical_scrollbar.knob_x, 0, vertical_scrollbar.knob_width, canvas.height-vertical_scrollbar.knob_width);
        vertical_scrollbar.render();
        ctx.fillStyle = '#eee';
        ctx.strokeStyle = '#ccc';
        ctx.translate(lineNamesWidth, 0);
        ctx.strokeRect(0, horizontal_scrollbar.knob_y, canvas.width-horizontal_scrollbar.knob_height-lineNamesWidth, horizontal_scrollbar.knob_height);
        ctx.fillRect(0, horizontal_scrollbar.knob_y, canvas.width-horizontal_scrollbar.knob_height-lineNamesWidth, horizontal_scrollbar.knob_height);
        horizontal_scrollbar.render();
        ctx.translate(-lineNamesWidth, 0);

        ctx.fillStyle = '#fff';
        ctx.fillRect(canvas.width-vertical_scrollbar.knob_width, canvas.height-horizontal_scrollbar.knob_height, vertical_scrollbar.knob_width, vertical_scrollbar.knob_width);
        ctx.translate(0, -mapCanvasHeight);
    }

    function renderGermplasmNames(lineNames, lineStart, lineEnd)
    {
        ctx.fillStyle = '#333';
        ctx.translate(0, mapCanvasHeight);
        var lineCount = 0;
        for (var i=lineStart; i < lineEnd; i++)
        {
            ctx.fillText(lineNames[i], 0, ((lineCount * boxSize) + (boxSize - (fontSize/2))));
            lineCount++;
        }
        ctx.translate(0, -mapCanvasHeight);
    }

    function renderGermplasm(lineStart, lineEnd, alleleStart, alleleEnd)
    {
        ctx.translate(lineNamesWidth, mapCanvasHeight);
        var currentLine = 0;
        for (var i = lineStart; i < lineEnd; i++)
        {
            var alleles = lineData[i];
            var currentAllele = 0;
            for (var j=alleleStart; j < alleleEnd; j++)
            {
                ctx.drawImage(colorStamps[alleles[j]].buffer, (currentAllele * boxSize), (currentLine * boxSize));
                currentAllele++;
            }
            currentLine++;
        }
        ctx.translate(-lineNamesWidth, -mapCanvasHeight);
    }

    function onmousedown(ev)
    {
        var e = ev || event;
        dragStartX = e.pageX;
        dragStartY = e.pageY;
        dragging = true;
    }

    function onmouseup()
    {
        dragging = false;
    }

    function onmousemove(ev)
    {
        var e = ev || event;
        if(dragging)
        {
            var diffX = e.pageX - dragStartX;
            translatedX -= diffX;
            var diffY = e.pageY - dragStartY;
            translatedY -= diffY;
            dragStartX = e.pageX;
            dragStartY = e.pageY;

            if (translatedX < 0)
                translatedX = 0;
            if (translatedY < 0)
                translatedY = 0;
            if (Math.floor(translatedX/boxSize) > (Math.floor(maxCanvasWidth/boxSize - canvas.width/boxSize + lineNamesWidth)))
                translatedX = maxCanvasWidth - canvas.width + vertical_scrollbar.knob_width;
            if (Math.floor(translatedY/boxSize) > (Math.floor(maxCanvasHeight/boxSize - canvas.height/boxSize)))
                translatedY = maxCanvasHeight - canvas.height + horizontal_scrollbar.knob_height;

            var scrollX = (translatedX / (maxCanvasWidth+horizontal_scrollbar.knob_width)) * canvas.width;
            var scrollY = (translatedY / (maxCanvasHeight+vertical_scrollbar.knob_height)) * canvas.height;

            vertical_scrollbar.move(vertical_scrollbar.knob_x, scrollY);
            horizontal_scrollbar.move(scrollX, horizontal_scrollbar.knob_y);

            render();
        }
    }

    function drawGradientSquare(boxSize, nucleotide)
    {
        var gradCanvas = document.createElement('canvas');
        gradCanvas.width = boxSize;
        gradCanvas.height = boxSize;
        var gradientCtx = gradCanvas.getContext('2d');

        var lingrad = gradientCtx.createLinearGradient(0, 0, boxSize, boxSize);
        lingrad.addColorStop(0, nucleotide.colorLight);
        lingrad.addColorStop(1, nucleotide.colorDark);
        gradientCtx.fillStyle = lingrad;
        gradientCtx.fillRect(0, 0, boxSize, boxSize);

        if (boxSize >= 10)
        {
            gradientCtx.fillStyle = 'rgb(0,0,0)';
            gradientCtx.font = calculateFontSize('C/G', 'sans-serif', boxSize);
            var textWidth = gradientCtx.measureText(nucleotide.allele).width;
            gradientCtx.fillText(nucleotide.allele, (boxSize-textWidth)/2, (boxSize-(fontSize/2)));
        }

        return gradCanvas;
    }

    function drawHetSquare(boxSize, nucleotide1, nucleotide2)
    {
        var gradCanvas = document.createElement('canvas');
        gradCanvas.width = boxSize;
        gradCanvas.height = boxSize;
        var gradientCtx = gradCanvas.getContext('2d');

        var lingrad = gradientCtx.createLinearGradient(0, 0, boxSize, boxSize);
        lingrad.addColorStop(0, nucleotide1.colorLight);
        lingrad.addColorStop(1, nucleotide1.colorDark);
        gradientCtx.fillStyle = lingrad;
        gradientCtx.beginPath();
        gradientCtx.lineTo(boxSize, 0);
        gradientCtx.lineTo(0, boxSize);
        gradientCtx.lineTo(0, 0);
        gradientCtx.fill();

        var lingrad2 = gradientCtx.createLinearGradient(0, 0, boxSize, boxSize);
        lingrad2.addColorStop(0, nucleotide2.colorLight);
        lingrad2.addColorStop(1, nucleotide2.colorDark);
        gradientCtx.fillStyle = lingrad2;
        gradientCtx.beginPath();
        gradientCtx.moveTo(boxSize, 0);
        gradientCtx.lineTo(boxSize, boxSize);
        gradientCtx.lineTo(0, boxSize);
        gradientCtx.lineTo(boxSize, 0);
        gradientCtx.fill();

        if (boxSize >= 10)
        {
            gradientCtx.fillStyle = 'rgb(0,0,0)';
            gradientCtx.font = calculateFontSize('C/G', 'sans-serif', boxSize);
            var allele1Width = gradientCtx.measureText(nucleotide1.allele).width;
            gradientCtx.fillText(nucleotide1.allele, ((boxSize/2)-allele1Width)/2, fontSize);
            var allele2Width = gradientCtx.measureText(nucleotide2.allele).width
            gradientCtx.fillText(nucleotide2.allele, boxSize - ((boxSize/2)+allele2Width)/2, boxSize-(fontSize/4));
        }

        return gradCanvas;
    }

    function zoom(size)
    {
        boxSize = size;
        
        setupColorStamps();
        render();
    }

    return genotype_renderer;
}