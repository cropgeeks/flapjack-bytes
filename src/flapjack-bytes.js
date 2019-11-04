import Marker from './Marker';
import GenotypeCanvas from './genotypecanvas';
import CanvasController from './canvascontroller';
import Qtl from './qtl';
import GenotypeImporter from './GenotypeImporter';
import NucleotideColorScheme from './NucleotideColorScheme';
import MapImporter from './MapImporter';

export default function GenotypeRenderer() {
  const genotypeRenderer = {};
  let brapiJs;

  // Variables for referring to the genotype canvas
  let genotypeCanvas;
  let canvasController;

  const boxSize = 16;
  let fontSize = 100;

  let qtls = [];
  const qtlMap = new Map();
  let colorScheme;

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

  function loadFromFile(fileDom) {
    const file = document.getElementById(fileDom.slice(1)).files[0];
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => {
        reader.abort();
        reject(new DOMException('Problem parsing input file'));
      };

      reader.onload = () => {
        resolve(reader.result);
      };
      reader.readAsText(file);
    });
  }

  // eslint-disable-next-line func-names
  genotypeRenderer.renderGenotypesFile = function (domParent, width, height, mapFileDom, genotypeFileDom, qtlFileDom) {
    createRendererComponents(domParent, width, height);
    let markerData = [];
    // loadMapData(mapFileDom);
    // loadQTLData(qtlFileDom);
    // loadGenotypeData(genotypeFileDom);
    const mapPromise = loadFromFile(mapFileDom);
    const genotypePromise = loadFromFile(genotypeFileDom);

    mapPromise.then((result) => {
      const mapImporter = new MapImporter();
      mapImporter.parseFile(result);
      markerData = mapImporter.markerData;
    });

    genotypePromise.then((result) => {
      const genotypeImporter = new GenotypeImporter();
      // console.log(result);
      genotypeImporter.parseFile(result);
      const { lineNames, lineData, stateTable } = genotypeImporter;

      colorScheme = new NucleotideColorScheme(stateTable, document);
      colorScheme.setupColorStamps(boxSize);
      
      genotypeCanvas.init(markerData, lineNames, lineData, qtls, colorScheme.colorStamps);
      genotypeCanvas.prerender();
    });

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

  function zoom(size) {
    colorScheme.setupColorStamps(size);
    genotypeCanvas.zoom(size, colorScheme.colorStamps);
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
