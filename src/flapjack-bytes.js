import { Nucleotide } from './nucleotide';
import { Marker } from './marker';
import { ColorState } from './colorstate';
import { ScrollBar } from './scrollbar';

export default function GenotypeRenderer() {
  const genotypeRenderer = {};
  let brapiJs;

  // Variables for referring to the genotype canvas
  let backCanvas;
  let backCtx;
  let canvas;
  let ctx;

  // Mouse related variables
  let dragStartX = null;
  let dragStartY = null;
  let dragging = false;
  let translatedX = 0;
  let translatedY = 0;

  // Variables to keep track of where we are in the data
  let lineStart = 0;
  let lineEnd = 0;

  let boxSize = 16;

  let maxCanvasHeight;
  let maxCanvasWidth;

  let verticalScrollbar;
  let horizontalScrollbar;

  let fontSize = 100;

  const lineNamesWidth = 100;
  let mapCanvasHeight = 30;
  let alleleCanvasWidth;
  let alleleCanvasHeight;

  const stateTable = new Map();
  const lineNames = [];
  const markerNames = [];
  const lineData = [];
  const markerData = [];
  let colorStamps = [];
  let redraw = true;
  let lineUnderMouse;
  let markerUnderMouse;

  const colors = {
    greenLight: 'rgb(171,255,171)',
    greenDark: 'rgb(86,179,86)',
    redLight: 'rgb(255,171,171)',
    redDark: 'rgb(179,86,86)',
    blueLight: 'rgb(171,171,255)',
    blueDark: 'rgb(86,86,179)',
    orangeLight: 'rgb(255,228,171)',
    orangeDark: 'rgb(179,114,86)',
    white: 'rgb(255,255,255)',
  };

  const nucleotides = new Map();
  nucleotides.set('A', new Nucleotide('A', colors.greenLight, colors.greenDark));
  nucleotides.set('G', new Nucleotide('G', colors.redLight, colors.redDark));
  nucleotides.set('T', new Nucleotide('T', colors.blueLight, colors.blueDark));
  nucleotides.set('C', new Nucleotide('C', colors.orangeLight, colors.orangeDark));
  nucleotides.set('', new Nucleotide('', colors.white, colors.white));

  genotypeRenderer.renderGenotypesBrapi = function (domParent, width, height, server, matrixId) {
    mapCanvasHeight = 0;
    // createRendererComponents(domParent, width, height);

    brapiJs = BrAPI(server);

    let params = {
      'matrixDbId': [matrixId],
      'format': 'flapjack',
    };

    brapiJs.allelematrices_search(params)
      .each((matrixObject) => {
        // var myInit = {
        //   method: 'GET',
        //   headers: {
        //     'Content-Type': 'text/tsv'
        //   },
        //   mode: 'cors',
        //   cache: 'default'
        // };

        renderGenotypesUrl(domParent, width, height, undefined, matrixObject.__response.metadata.datafiles[0]);
      });

    return genotypeRenderer;
  };

  genotypeRenderer.renderGenotypesUrl = function (domParent, width, height, mapFileURL, genotypeFileURL) {
    createRendererComponents(domParent, width, height);

    fetch(mapFileURL)
      .then((response) => {
        if (response.status !== 200) {
          console.log("Couldn't load file: " + filepath + ". Status code: " + response.status);
          return;
        }
        response.text().then((data) => {
          const lines = data.split(/\r?\n/);
          for (let line = 0; line < lines.length; line += 1) {
            processMapFileLine(lines[line]);
          }
        })
      })
      .catch((err) => {
        console.log('Fetch Error :-S', err);
      });

    fetch(genotypeFileURL)
      .then((response) => {
        if (response.status !== 200) {
          console.log("Couldn't load file: " + filepath + ". Status code: " + response.status);
          return;
        }
        response.text().then((data) => {
          const lines = data.split(/\r?\n/);
          for (let line = 0; line < lines.length; line += 1) {
            processFileLine(lines[line]);
          }
          init();
        });
      })
      .catch((err) => {
        console.log('Fetch Error :-S', err);
      });

    return genotypeRenderer;
  };

  genotypeRenderer.renderGenotypesFile = function (domParent, width, height, mapFileDom, genotypeFileDom) {
    createRendererComponents(domParent, width, height);

    loadMapData(mapFileDom);
    loadGenotypeData(genotypeFileDom);

    return genotypeRenderer;
  };

  function createRendererComponents(domParent, width, height) {
    const canvasHolder = document.getElementById(domParent.slice(1));

    // Set up the canvas and drawing context for the genotype display
    canvas = document.createElement('canvas');
    canvas.id = 'genotype';
    canvas.width = width;
    maxCanvasWidth = width;
    canvas.height = height;
    maxCanvasHeight = height;
    ctx = canvas.getContext('2d');
    canvasHolder.append(canvas);

    backCanvas = document.createElement('canvas');
    backCanvas.width = width;
    backCanvas.height = height;
    backCtx = backCanvas.getContext('2d');

    verticalScrollbar = new ScrollBar(canvas.width, canvas.height - mapCanvasHeight - 10, 10, canvas.height - mapCanvasHeight - 10, true);
    horizontalScrollbar = new ScrollBar(canvas.width - lineNamesWidth - 10 - 1, canvas.height, canvas.width - lineNamesWidth - 10 - 1, 10, false);

    const zoomDiv = document.createElement('div');
    zoomDiv.id = 'zoom-holder';

    const zoomLabel = document.createElement('label');
    zoomLabel.setAttribute('for', 'zoom-control');
    zoomLabel.innerHTML = 'Zoom:';

    const range = document.createElement('input');
    range.setAttribute('type', 'range');
    range.min = 2;
    range.max = 64;
    range.value = 16;

    range.addEventListener('change', () => {
      zoom(range.value);
    });

    range.addEventListener('input', () => {
      zoom(range.value);
    });

    zoomDiv.appendChild(zoomLabel);
    zoomDiv.appendChild(range);
    canvasHolder.appendChild(zoomDiv);
  }

  function loadMapData(mapFileDom) {
    const file = document.getElementById(mapFileDom.slice(1)).files[0];

    const reader = new FileReader();
    reader.onloadend = (data) => {
      const markers = data.target.result.split(/\r?\n/);
      for (let marker = 0; marker < markers.length; marker += 1) {
        processMapFileLine(markers[marker]);
      }
    };
    reader.readAsText(file);
  }

  function processMapFileLine(line) {
    if (line.startsWith('#') || (!line || line.length === 0) || line.startsWith('\t')) {
      return;
    }

    const tokens = line.split('\t');
    if (tokens.length === 2) {
      return;
    }
    const markerName = tokens[0];

    markerNames.push(markerName);
    const marker = new Marker(markerName, tokens[1], tokens[2]);
    markerData.push(marker);
  }

  function loadGenotypeData(genotypeFileDom) {
    const file = document.getElementById(genotypeFileDom.slice(1)).files[0];

    const reader = new FileReader();
    reader.onloadend = (data) => {
      const lines = data.target.result.split(/\r?\n/);
      for (let line = 0; line < lines.length; line += 1) {
        processFileLine(lines[line]);
      }

      init();
    };

    reader.readAsText(file);
  }

  function processFileLine(line) {
    if (line.startsWith('#') || (!line || line.length === 0) || line.startsWith('Accession') || line.startsWith('\t')) {
      return;
    }

    const tokens = line.split('\t');
    const lineName = tokens[0];
    lineNames.push(lineName);
    lineData.push(tokens.slice(1).map(getState));
  }

  function getState(allele) {
    if (allele === '-' || (!allele || allele.length === 0)) {allele = '';}

    if (!stateTable.has(allele)) {
      stateTable.set(allele, stateTable.size);
    }

    return stateTable.get(allele);
  }

  function init() {
    // Pre-render our gradient squares
    setupColorStamps();

    // Add event handlers for mouse events to allow movement of the displays
    canvas.addEventListener('mousedown', onmousedown, false);
    window.addEventListener('mouseup', onmouseup, false);
    window.addEventListener('mousemove', onmousemove, false);

    canvas.addEventListener('mousemove', overlayListener, false);
    canvas.addEventListener('mouseleave', overlayLeave, false);

    render();
  }

  function calculateFontSize(text, fontface, size) {
    const fontCanvas = document.createElement('canvas');
    fontCanvas.width = size;
    fontCanvas.height = size;
    const fontContext = fontCanvas.getContext('2d');

    fontSize = 100;
    fontContext.font = `${fontSize}px ${fontface}`;

    while (fontContext.measureText(text).width > fontCanvas.width) {
      fontSize -= 1;
      fontContext.font = `${fontSize}px ${fontface}`;
    }

    backCtx.font = fontContext.font;

    return fontContext.font;
  }

  // Generates a set of homozygous and heterozygous color stamps from the stateTable
  function setupColorStamps() {
    colorStamps = [];
    for (let key of stateTable.keys()) {
      if (key.length <= 1) {
        // If we fail to find a key for whatever reason, get the blank stamp
        let nucleotide = nucleotides.get(key);
        if (nucleotide === undefined) {
          nucleotide = nucleotides.get('');
        }
        const buffer = drawGradientSquare(boxSize, nucleotide);
        const stamp = new ColorState(buffer);
        colorStamps.push(stamp);
      } else {
        let alleles = key.split('/');
        let nucleotide1 = nucleotides.get(alleles[0]);
        let nucleotide2 = nucleotides.get(alleles[1]);
        const buffer = drawHetSquare(boxSize, nucleotide1, nucleotide2);
        const stamp = new ColorState(buffer);
        colorStamps.push(stamp);
      }
    }
  }

  function render() {
    lineStart = Math.floor(translatedY / boxSize);
    lineEnd = Math.min(lineStart + Math.floor(canvas.height / boxSize), lineNames.length);

    const totalAlleles = lineData[0].length - 1;
    maxCanvasWidth = totalAlleles * boxSize;
    maxCanvasHeight = lineNames.length * boxSize;

    alleleCanvasWidth = canvas.width - lineNamesWidth;
    alleleCanvasHeight = canvas.height - mapCanvasHeight;

    const alleleStart = Math.floor(translatedX / boxSize);
    const alleleEnd = Math.min(alleleStart + Math.floor(alleleCanvasWidth / boxSize), totalAlleles);

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (redraw) {
      backCtx.clearRect(0, 0, canvas.width, canvas.height);
      renderMap(alleleStart, alleleEnd);
      renderGermplasmNames(lineNames, lineStart, lineEnd);
      renderGermplasm(lineStart, lineEnd, alleleStart, alleleEnd);
      renderScrollbars();
    }

    ctx.drawImage(backCanvas, 0, 0);

    if (lineUnderMouse && markerUnderMouse) {
      ctx.translate(lineNamesWidth, mapCanvasHeight);
      ctx.globalAlpha = 0.4;
      ctx.fillStyle = '#fff';
      ctx.fillRect(markerUnderMouse * boxSize, 0, boxSize, alleleCanvasHeight);
      ctx.fillRect(0, lineUnderMouse * boxSize, alleleCanvasWidth, boxSize);
      ctx.translate(-lineNamesWidth, -mapCanvasHeight);
      ctx.globalAlpha = 1;
    }

    redraw = false;
  }

  function renderMap(alleleStart, alleleEnd) {
    if (markerData.length === 0) {
      mapCanvasHeight = 0;
      return;
    }

    const firstMarkerPos = markerData[alleleStart].position;
    const lastMarkerPos = markerData[alleleEnd].position;

    const dist = lastMarkerPos - firstMarkerPos;

    backCtx.lineWidth = 1;
    backCtx.strokeStyle = 'gray';
    backCtx.translate(lineNamesWidth, 0);

    for (let i = alleleStart; i < alleleEnd; i += 1) {
      let pos = (i - alleleStart) * boxSize;
      pos += (boxSize / 2);
      const marker = markerData[i];
      const markerPos = ((marker.position - firstMarkerPos) * ((alleleCanvasWidth) / dist));
      backCtx.beginPath();
      backCtx.moveTo(markerPos, 0);
      backCtx.lineTo(pos, 20);
      backCtx.lineTo(pos, mapCanvasHeight);
      backCtx.stroke();
    }
    backCtx.translate(-lineNamesWidth, 0);
  }

  function renderScrollbars() {
    backCtx.translate(0, mapCanvasHeight);
    verticalScrollbar.render(backCtx);
    backCtx.translate(0, -mapCanvasHeight);
    backCtx.translate(lineNamesWidth, 0);
    horizontalScrollbar.render(backCtx);
    backCtx.translate(-lineNamesWidth, 0);

    backCtx.translate(lineNamesWidth, mapCanvasHeight);
    backCtx.fillStyle = '#aaa';
    backCtx.strokeRect(alleleCanvasWidth - 10, alleleCanvasHeight - 10, 10, 10);
    backCtx.fillRect(alleleCanvasWidth - 10, alleleCanvasHeight - 10, 10, 10);
    backCtx.translate(-lineNamesWidth, -mapCanvasHeight);
  }

  function renderGermplasmNames(lineNames, lineStart, lineEnd) {
    backCtx.fillStyle = '#333';
    backCtx.translate(0, mapCanvasHeight);
    let lineCount = 0;
    for (let i = lineStart; i < lineEnd; i += 1) {
      backCtx.fillText(lineNames[i], 0, ((lineCount * boxSize) + (boxSize - (fontSize / 2))));
      lineCount += 1;
    }
    backCtx.translate(0, -mapCanvasHeight);
  }

  function renderGermplasm(lineStart, lineEnd, alleleStart, alleleEnd) {
    backCtx.translate(lineNamesWidth, mapCanvasHeight);
    let currentLine = 0;
    for (let i = lineStart; i < lineEnd; i += 1) {
      const alleles = lineData[i];
      let currentAllele = 0;
      for (let j = alleleStart; j < alleleEnd; j += 1) {
        backCtx.drawImage(colorStamps[alleles[j]].buffer, (currentAllele * boxSize), (currentLine * boxSize));
        currentAllele += 1;
      }
      currentLine += 1;
    }
    backCtx.translate(-lineNamesWidth, -mapCanvasHeight);
  }

  function onmousedown(ev) {
    const e = ev || event;
    dragStartX = e.pageX;
    dragStartY = e.pageY;
    dragging = true;
  }

  function onmouseup() {
    dragging = false;
  }

  function onmousemove(ev) {
    const e = ev || event;
    if (dragging) {
      const diffX = e.pageX - dragStartX;
      translatedX -= diffX;
      const diffY = e.pageY - dragStartY;
      translatedY -= diffY;
      dragStartX = e.pageX;
      dragStartY = e.pageY;

      if (translatedX < 0) { translatedX = 0; }
      if (translatedY < 0) { translatedY = 0; }
      if ((translatedX / boxSize) >= ((maxCanvasWidth / boxSize) - (alleleCanvasWidth / boxSize))) { translatedX = maxCanvasWidth - alleleCanvasWidth; }
      if ((translatedY / boxSize) >= ((maxCanvasHeight / boxSize) - (alleleCanvasHeight / boxSize))) { translatedY = maxCanvasHeight - alleleCanvasHeight; }

      const scrollHeight = alleleCanvasHeight - 10 - 20;
      const scrollWidth = alleleCanvasWidth - 10 - 20;

      const scrollX = Math.floor(map(translatedX, 0, maxCanvasWidth - alleleCanvasWidth, 0, scrollWidth));
      const scrollY = Math.floor(map(translatedY, 0, maxCanvasHeight - alleleCanvasHeight, 0, scrollHeight));

      verticalScrollbar.move(verticalScrollbar.x, scrollY);
      horizontalScrollbar.move(scrollX, horizontalScrollbar.y);

      redraw = true;

      render();
    }
  }

  function overlayListener(ev) {
    const e = ev || event;

    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / (rect.right - rect.left) * canvas.width;
    const y = (e.clientY - rect.top) / (rect.bottom - rect.top) * canvas.height;

    if (x >= lineNamesWidth && x < canvas.width && y >= mapCanvasHeight && y < canvas.height) {
      markerUnderMouse = Math.floor((x - lineNamesWidth) / boxSize);
      lineUnderMouse = Math.floor((y - mapCanvasHeight) / boxSize);
    } else {
      lineUnderMouse = undefined;
      markerUnderMouse = undefined;
    }

    render();
  }

  function overlayLeave() {
    lineUnderMouse = undefined;
    markerUnderMouse = undefined;
    render();
  }

  function map(num, inMin, inMax, outMin, outMax) {
    return (num - inMin) * (outMax - outMin) / (inMax - inMin) + outMin;
  }

  function drawGradientSquare(boxSize, nucleotide) {
    const gradCanvas = document.createElement('canvas');
    gradCanvas.width = boxSize;
    gradCanvas.height = boxSize;
    const gradientCtx = gradCanvas.getContext('2d');

    const lingrad = gradientCtx.createLinearGradient(0, 0, boxSize, boxSize);
    lingrad.addColorStop(0, nucleotide.colorLight);
    lingrad.addColorStop(1, nucleotide.colorDark);
    gradientCtx.fillStyle = lingrad;
    gradientCtx.fillRect(0, 0, boxSize, boxSize);

    if (boxSize >= 10) {
      gradientCtx.fillStyle = 'rgb(0,0,0)';
      gradientCtx.font = calculateFontSize('C/G', 'sans-serif', boxSize);
      const textWidth = gradientCtx.measureText(nucleotide.allele).width;
      gradientCtx.fillText(nucleotide.allele, (boxSize - textWidth) / 2, (boxSize - (fontSize / 2)));
    }

    return gradCanvas;
  }

  function drawHetSquare(boxSize, nucleotide1, nucleotide2) {
    const gradCanvas = document.createElement('canvas');
    gradCanvas.width = boxSize;
    gradCanvas.height = boxSize;
    const gradientCtx = gradCanvas.getContext('2d');

    const lingrad = gradientCtx.createLinearGradient(0, 0, boxSize, boxSize);
    lingrad.addColorStop(0, nucleotide1.colorLight);
    lingrad.addColorStop(1, nucleotide1.colorDark);
    gradientCtx.fillStyle = lingrad;
    gradientCtx.beginPath();
    gradientCtx.lineTo(boxSize, 0);
    gradientCtx.lineTo(0, boxSize);
    gradientCtx.lineTo(0, 0);
    gradientCtx.fill();

    const lingrad2 = gradientCtx.createLinearGradient(0, 0, boxSize, boxSize);
    lingrad2.addColorStop(0, nucleotide2.colorLight);
    lingrad2.addColorStop(1, nucleotide2.colorDark);
    gradientCtx.fillStyle = lingrad2;
    gradientCtx.beginPath();
    gradientCtx.moveTo(boxSize, 0);
    gradientCtx.lineTo(boxSize, boxSize);
    gradientCtx.lineTo(0, boxSize);
    gradientCtx.lineTo(boxSize, 0);
    gradientCtx.fill();

    if (boxSize >= 10) {
      gradientCtx.fillStyle = 'rgb(0,0,0)';
      gradientCtx.font = calculateFontSize('C/G', 'sans-serif', boxSize);
      const allele1Width = gradientCtx.measureText(nucleotide1.allele).width;
      gradientCtx.fillText(nucleotide1.allele, ((boxSize / 2) - allele1Width) / 2, fontSize);
      const allele2Width = gradientCtx.measureText(nucleotide2.allele).width;
      gradientCtx.fillText(nucleotide2.allele, boxSize - ((boxSize / 2) + allele2Width) / 2, boxSize - (fontSize / 4));
    }

    return gradCanvas;
  }

  function zoom(size) {
    boxSize = size;

    setupColorStamps();

    redraw = true;

    render();
  }

  return genotypeRenderer;
}
