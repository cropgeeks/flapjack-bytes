import Nucleotide from './nucleotide';
import Marker from './marker';
import ColorState from './colorstate';
import GenotypeCanvas from './genotypecanvas';
import CanvasController from './canvascontroller';

export default function GenotypeRenderer() {
  const genotypeRenderer = {};
  let brapiJs;

  // Variables for referring to the genotype canvas
  let genotypeCanvas;
  let canvasController;

  // Variables to keep track of where we are in the data
  let lineStart = 0;
  let lineEnd = 0;

  const boxSize = 16;
  let fontSize = 100;

  const stateTable = new Map();
  const lineNames = [];
  const markerNames = [];
  const lineData = [];
  const markerData = [];
  let colorStamps = [];
  let redraw = true;

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

    genotypeCanvas = new GenotypeCanvas(width, height, boxSize, fontSize);
    canvasHolder.append(genotypeCanvas.canvas);

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

    canvasController = new CanvasController(genotypeCanvas);
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

      setupColorStamps(boxSize);
      genotypeCanvas.init(markerData, lineNames, lineData, colorStamps);
      genotypeCanvas.prerender();
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

    const { backContext } = genotypeCanvas;

    backContext.font = fontContext.font;
    genotypeCanvas.fontSize = fontSize;

    return fontContext.font;
  }

  // Generates a set of homozygous and heterozygous color stamps from the stateTable
  function setupColorStamps(size) {
    colorStamps = [];
    for (let key of stateTable.keys()) {
      if (key.length <= 1) {
        // If we fail to find a key for whatever reason, get the blank stamp
        let nucleotide = nucleotides.get(key);
        if (nucleotide === undefined) {
          nucleotide = nucleotides.get('');
        }
        const buffer = drawGradientSquare(size, nucleotide);
        const stamp = new ColorState(buffer);
        colorStamps.push(stamp);
      } else {
        let alleles = key.split('/');
        let nucleotide1 = nucleotides.get(alleles[0]);
        let nucleotide2 = nucleotides.get(alleles[1]);
        const buffer = drawHetSquare(size, nucleotide1, nucleotide2);
        const stamp = new ColorState(buffer);
        colorStamps.push(stamp);
      }
    }
  }

  function drawGradientSquare(size, nucleotide) {
    const gradCanvas = document.createElement('canvas');
    gradCanvas.width = size;
    gradCanvas.height = size;
    const gradientCtx = gradCanvas.getContext('2d');

    const lingrad = gradientCtx.createLinearGradient(0, 0, size, size);
    lingrad.addColorStop(0, nucleotide.colorLight);
    lingrad.addColorStop(1, nucleotide.colorDark);
    gradientCtx.fillStyle = lingrad;
    gradientCtx.fillRect(0, 0, size, size);

    if (size >= 10) {
      gradientCtx.fillStyle = 'rgb(0,0,0)';
      gradientCtx.font = calculateFontSize('C/G', 'sans-serif', size);
      const textWidth = gradientCtx.measureText(nucleotide.allele).width;
      gradientCtx.fillText(nucleotide.allele, (size - textWidth) / 2, (size - (fontSize / 2)));
    }

    return gradCanvas;
  }

  function drawHetSquare(size, nucleotide1, nucleotide2) {
    const gradCanvas = document.createElement('canvas');
    gradCanvas.width = size;
    gradCanvas.height = size;
    const gradientCtx = gradCanvas.getContext('2d');

    const lingrad = gradientCtx.createLinearGradient(0, 0, size, size);
    lingrad.addColorStop(0, nucleotide1.colorLight);
    lingrad.addColorStop(1, nucleotide1.colorDark);
    gradientCtx.fillStyle = lingrad;
    gradientCtx.beginPath();
    gradientCtx.lineTo(size, 0);
    gradientCtx.lineTo(0, size);
    gradientCtx.lineTo(0, 0);
    gradientCtx.fill();

    const lingrad2 = gradientCtx.createLinearGradient(0, 0, size, size);
    lingrad2.addColorStop(0, nucleotide2.colorLight);
    lingrad2.addColorStop(1, nucleotide2.colorDark);
    gradientCtx.fillStyle = lingrad2;
    gradientCtx.beginPath();
    gradientCtx.moveTo(size, 0);
    gradientCtx.lineTo(size, size);
    gradientCtx.lineTo(0, size);
    gradientCtx.lineTo(size, 0);
    gradientCtx.fill();

    if (size >= 10) {
      gradientCtx.fillStyle = 'rgb(0,0,0)';
      gradientCtx.font = calculateFontSize('C/G', 'sans-serif', size);
      const allele1Width = gradientCtx.measureText(nucleotide1.allele).width;
      gradientCtx.fillText(nucleotide1.allele, ((size / 2) - allele1Width) / 2, fontSize);
      const allele2Width = gradientCtx.measureText(nucleotide2.allele).width;
      gradientCtx.fillText(nucleotide2.allele, size - ((size / 2) + allele2Width) / 2, size - (fontSize / 4));
    }

    return gradCanvas;
  }

  function zoom(size) {
    setupColorStamps(size);
    genotypeCanvas.zoom(size, colorStamps);
  }

  return genotypeRenderer;
}
