import axios from 'axios';
import Marker from './Marker';
import GenotypeCanvas from './genotypecanvas';
import CanvasController from './canvascontroller';
import GenotypeImporter from './GenotypeImporter';
import NucleotideColorScheme from './NucleotideColorScheme';
import MapImporter from './MapImporter';
import DataSet from './DataSet';

export default function GenotypeRenderer() {
  const genotypeRenderer = {};

  // Variables for referring to the genotype canvas
  let genotypeCanvas;
  let canvasController;

  const boxSize = 16;

  let colorScheme;

  let genomeMap;
  let dataSet;

  genotypeRenderer.renderGenotypesBrapi = function (domParent, width, height, server, matrixId, mapId, authToken) {
    createRendererComponents(domParent, width, height);
    let germplasmData;

    console.log('mapId', mapId);

    const client = axios.create({ baseURL: server })
    client.defaults.headers.common['Authorization'] = 'Bearer ' + authToken

    if (mapId) {
      // TODO: GOBii don't have the markerpositions call implemented yet so I 
      // can't load map data
      processMarkerPositionsCall(client, '/markerpositions?mapDbId=' + mapId)
        .then((markerpositions) => {
          const mapImporter = new MapImporter();
          genomeMap = mapImporter.parseMarkerpositions(markerpositions);

          processVariantSetCall(client, '/variantsets/' + matrixId + '/calls')
            .then((variantSetCalls) => {
              const genotypeImporter = new GenotypeImporter(genomeMap);

              if (genomeMap === undefined) {
                genomeMap = genotypeImporter.createFakeMapFromVariantSets(variantSetCalls);
              }

              germplasmData = genotypeImporter.parseVariantSetCalls(variantSetCalls);
              const { stateTable } = genotypeImporter;

              colorScheme = new NucleotideColorScheme(stateTable, document);

              dataSet = new DataSet(genomeMap, germplasmData);

              genotypeCanvas.init(dataSet, colorScheme);
              genotypeCanvas.prerender();

              // Tells the dom parent that Flapjack has finished loading. Allows spinners
              // or similar to be disabled
              sendEvent("FlapjackFinished", domParent);
            })
            .catch((error) => {
              sendEvent("FlapjackError", domParent);
              console.log(error);
            });

        })
        .catch((error) => {
          sendEvent("FlapjackError", domParent);
          console.log(error);
        })
    }
    else {
      processVariantSetCall(client, '/variantsets/' + matrixId + '/calls?pageSize=100000', newParams)
        .then((variantSetCalls) => {
          const genotypeImporter = new GenotypeImporter(genomeMap);

          if (genomeMap === undefined) {
            genomeMap = genotypeImporter.createFakeMapFromVariantSets(variantSetCalls);
          }

          germplasmData = genotypeImporter.parseVariantSetCalls(variantSetCalls);
          const { stateTable } = genotypeImporter;

          colorScheme = new NucleotideColorScheme(stateTable, document);

          dataSet = new DataSet(genomeMap, germplasmData);

          genotypeCanvas.init(dataSet, colorScheme);
          genotypeCanvas.prerender();

          // Tells the dom parent that Flapjack has finished loading. Allows spinners
          // or similar to be disabled
          sendEvent("FlapjackFinished", domParent);
        })
        .catch((error) => {
          sendEvent("FlapjackError", domParent);
          console.log(error);
        });
    }



    return genotypeRenderer;
  };

  genotypeRenderer.renderGenotypesUrl = function (domParent, width, height, mapFileURL, genotypeFileURL, authToken) {
    createRendererComponents(domParent, width, height);

    if (typeof mapFileURL !== 'undefined') {
      fetch(mapFileURL, { headers: { "Authorization": "Bearer " + authToken } })
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

    fetch(genotypeFileURL, { headers: { "Authorization": "Bearer " + authToken } })
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
    // let qtls = [];
    let germplasmData;

    const mapPromise = loadFromFile(mapFileDom);
    // const qtlPromise = loadFromFile(qtlFileDom);
    const genotypePromise = loadFromFile(genotypeFileDom);

    // Load map data
    mapPromise.then((result) => {
      const mapImporter = new MapImporter();
      genomeMap = mapImporter.parseFile(result);
    });

    // // Then QTL data
    // qtlPromise.then((result) => {
    //   const qtlImporter = new QtlImporter();
    //   qtlImporter.parseFile(result);
    //   qtls = qtlImporter.qtls;
    // });

    // Then genotype data
    genotypePromise.then((result) => {
      const genotypeImporter = new GenotypeImporter(genomeMap);

      if (genomeMap === undefined) {
        genomeMap = genotypeImporter.createFakeMap(result);
      }

      germplasmData = genotypeImporter.parseFile(result);
      const { stateTable } = genotypeImporter;

      colorScheme = new NucleotideColorScheme(stateTable, document);

      dataSet = new DataSet(genomeMap, germplasmData);

      genotypeCanvas.init(dataSet, colorScheme);
      genotypeCanvas.prerender();
    });

    return genotypeRenderer;
  };

  function processMarkerPositionsCall(client, url, params, markerpositions = []) {
    return client.get(url, params)
      .then((response) => {
        const { currentPage, totalPages } = response.data.metadata.pagination;

        const newData = response.data.result.data;
        markerpositions.push(...newData.map(m => ({ name: m.markerName, chromosome: m.linkageGroupName, position: m.position })));

        if (currentPage < totalPages - 1) {
          const nextPage = currentPage + 1;
          const newParams = { params: { page: nextPage } };
          return processMarkerPositionsCall(client, url, newParams, markerpositions);
        }
        return markerpositions;
      })
      .catch((error) => {
        console.log(error);
      });
  }

  function processVariantSetCall(client, url, params, variantSetCalls = []) {
    return client.get(url, params)
      .then((response) => {
        const { nextPageToken } = response.data.metadata.pagination;
        console.log(nextPageToken);
        const newData = response.data.result.data;
        variantSetCalls.push(...newData.map(calls => ({ lineName: calls.callSetName, markerName: calls.variantName, allele: calls.genotype.values[0] })));
        if (nextPageToken) {
          const newParams = { params: { pageToken: nextPageToken } };
          return processVariantSetCall(client, url, newParams, variantSetCalls);
        }
        return variantSetCalls;
      }).catch((error) => {
        console.log(error);
      });
  }

  function createRendererComponents(domParent, width, height) {
    const canvasHolder = document.getElementById(domParent.slice(1));

    genotypeCanvas = new GenotypeCanvas(width, height, boxSize);
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

  function zoom(size) {
    genotypeCanvas.zoom(size, colorScheme);
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
