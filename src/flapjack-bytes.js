import Nucleotide from './nucleotide';
import Marker from './marker';
import ColorState from './colorstate';
import GenotypeCanvas from './genotypecanvas';
import CanvasController from './canvascontroller';
import Qtl from './qtl';

export default function GenotypeRenderer() {
  const genotypeRenderer = {};
  let brapiJs;

  // Variables for referring to the genotype canvas
  let genotypeCanvas;
  let canvasController;

  const boxSize = 16;
  let fontSize = 100;

  const stateTable = new Map();
  const lineNames = [];
  const markerNames = [];
  const lineData = [];
  const markerData = [];
  const chromosomes = new Set();
  let qtls = [];
  const qtlMap = new Map();
  let colorStamps = [];

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

  genotypeRenderer.renderGenotypesBrapi = function (domParent, width, height, server, matrixId, mapId, authToken) {
    console.log(mapId);

    var brapiJs = BrAPI(server, '1.2', authToken);

    let params = {
      'mapsDbId': mapId,
    };

    // let positions = [];

    sendEvent("LoadingMap", domParent)

    brapiJs.maps_positions(params)
      .each((marker) => {

        markerNames.push(marker.markerName);
        const m = new Marker(marker.markerName, marker.linkageGroupName, parseInt(marker.location));
        markerData.push(m);
    
        chromosomes.add(marker.linkageGroupName);
      });

    sendEvent("PollingMatrix", domParent)

    let matrixParams = {
      'matrixDbId': [matrixId],
      'format': 'flapjack',
    };

    brapiJs.allelematrices_search(matrixParams)
      .each((matrixObject) => {

        console.log('wotsit');

        genotypeRenderer.renderGenotypesUrl(domParent, width, height, undefined, matrixObject.__response.metadata.datafiles[0], authToken);
      });

    return genotypeRenderer;
  };

  genotypeRenderer.renderGenotypesUrl = function (domParent, width, height, mapFileURL, genotypeFileURL, authToken) {
    createRendererComponents(domParent, width, height);

    if (typeof mapFileURL !== 'undefined') {
      fetch(mapFileURL, {headers: { "Authorization": "Bearer " + authToken }})
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
    }
    
    fetch(genotypeFileURL, {headers: { "Authorization": "Bearer " + authToken }})
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
          setupColorStamps(boxSize);
          genotypeCanvas.init(markerData, lineNames, lineData, qtls, colorStamps);
          genotypeCanvas.prerender();
        });
      })
      .catch((err) => {
        console.log('Fetch Error :-S', err);
      });

      sendEvent('FlapjackFinished', domParent);

    return genotypeRenderer;
  };

  genotypeRenderer.renderGenotypesFile = function (domParent, width, height, mapFileDom, genotypeFileDom, qtlFileDom) {
    createRendererComponents(domParent, width, height);
    
    loadMapData(mapFileDom);
    loadQTLData(qtlFileDom);
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

  function loadQTLData(qtlFileDom) {
    const file = document.getElementById(qtlFileDom.slice(1)).files[0];

    if (typeof file !== 'undefined') {
      const reader = new FileReader();
      reader.onloadend = (data) => {
        const qtlData = data.target.result.split(/\r?\n/);
        for (let qtl = 0; qtl < qtlData.length; qtl += 1) {
          processQtlFileLine(qtlData[qtl]);
        }

        qtls = Array.from(qtlMap.values());
        qtls.sort(compareQtl);

        qtls.forEach(qtl => console.log(qtl));
      };
      reader.readAsText(file);
    }
  }

  function compareQtl(qtlA, qtlB) {
    if (qtlA.min < qtlB.min) {
      return -1;
    }
    if (qtlA.min > qtlB.min) {
      return 1;
    }
    return 0;
  }

  function processQtlFileLine(line) {
    if (line.startsWith('#') || (!line || line.length === 0) || line.startsWith('\t')) {
      return;
    }
    
    const tokens = line.split('\t');
    if (chromosomes.has(tokens[1]) === false) {
      return;
    }

    let name = tokens[0];
    name = name.slice(0, (name.lastIndexOf('.')));

    let qtl;
    if (qtlMap.has(name)) {
      qtl = qtlMap.get(name);
    }
    else {
      qtl = new Qtl(name, tokens[1], parseInt(tokens[2].replace(/,/g, '')), parseInt(tokens[3].replace(/,/g, '')), parseInt(tokens[4].replace(/,/g, '')));
    }
    if (qtl.min > tokens[3]) {
      qtl.min = parseInt(tokens[3].replace(/,/g, ''));
    }
    if (qtl.max < tokens[4]) {
      qtl.max = parseInt(tokens[4].replace(/,/g, ''));
    }

    qtlMap.set(name, qtl);
  }

  function loadMapData(mapFileDom) {
    const file = document.getElementById(mapFileDom.slice(1)).files[0];

    if (typeof file !== 'undefined') {
      const reader = new FileReader();
      reader.onloadend = (data) => {
        const markers = data.target.result.split(/\r?\n/);
        for (let marker = 0; marker < markers.length; marker += 1) {
          processMapFileLine(markers[marker]);
        }
      };
      reader.readAsText(file);
    }
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
    const marker = new Marker(markerName, tokens[1], parseInt(tokens[2].replace(/,/g, '')));
    markerData.push(marker);
    
    chromosomes.add(tokens[1]);
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
      genotypeCanvas.init(markerData, lineNames, lineData, qtls, colorStamps);
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
        if (key.length === 2) {
          let nucleotide1 = nucleotides.get(key[0]);
          let nucleotide2 = nucleotides.get(key[1]);
          let buffer;
          if (key[0] === key[1]) {
            if (key[0] === "N") {
              nucleotide1 = nucleotides.get('')
            }
            buffer = drawGradientSquare(size, nucleotide1);
          } else {
            buffer = drawHetSquare(size, nucleotide1, nucleotide2);
          }
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

  function sendEvent(eventName, domParent) {
    // TODO: Invesitgate using older event emitting code for IE support
    var canvasHolder = document.getElementById(domParent.slice(1));

    // Create the event.
    var event = new Event(eventName);

    canvasHolder.dispatchEvent(event);
  }

  return genotypeRenderer;
}
