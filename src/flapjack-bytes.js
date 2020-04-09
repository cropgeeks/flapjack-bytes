import axios from 'axios';
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
  // TODO: need to investigate a proper clean way to implement this controller
  // functionality
  // eslint-disable-next-line no-unused-vars
  let canvasController;

  const boxSize = 16;

  let colorScheme;

  let genomeMap;
  let dataSet;

  function sendEvent(eventName, domParent) {
    // TODO: Invesitgate using older event emitting code for IE support
    const canvasHolder = document.getElementById(domParent.slice(1));

    // Create the event.
    const event = new Event(eventName);

    canvasHolder.dispatchEvent(event);
  }

  function zoom(size) {
    genotypeCanvas.zoom(size, colorScheme);
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

    const colorButton = document.createElement('button');
    colorButton.id = 'colorButton';
    const textnode = document.createTextNode('Color schemes...');
    colorButton.appendChild(textnode);

    const fieldSet = document.createElement('fieldset');
    const legend = document.createElement('legend');
    const legendText = document.createTextNode('Color Schemes');
    legend.appendChild(legendText);

    fieldSet.appendChild(legend);
    addRadioButton('selectedScheme', 'nucleotideScheme', 'Nucleotide', true, fieldSet);
    addRadioButton('selectedScheme', 'similarityScheme', 'Similarity to line', false, fieldSet);

    const lineSelect = document.createElement('select');
    lineSelect.id = 'lineSelect';
    lineSelect.disabled = true;
    fieldSet.appendChild(lineSelect);

    zoomDiv.appendChild(zoomLabel);
    zoomDiv.appendChild(range);
    zoomDiv.appendChild(fieldSet);
    canvasHolder.appendChild(zoomDiv);

    // createColorModal(canvasHolder);

    canvasController = new CanvasController(genotypeCanvas);
  }

  function addRadioButton(name, id, text, checked, parent) {
    const radio = document.createElement('input');
    radio.setAttribute('type', 'radio');
    radio.name = name;
    radio.id = id;
    radio.checked = checked;

    const radioLabel = document.createElement('label');
    radioLabel.htmlFor = id;
    const labelText = document.createTextNode(text);
    radioLabel.appendChild(labelText);

    parent.appendChild(radio);
    parent.appendChild(radioLabel);
  }

  function addCSSRule(sheet, selector, rules, index) {
    if ('insertRule' in sheet) {
      sheet.insertRule(selector + '{' + rules + '}', index);
    } else if ('addRule' in sheet) {
      sheet.addRule(selector, rules, index);
    }
  }

  function createColorModal(canvasHolder) {
    const colorModal = document.createElement('div');
    colorModal.classList.add('modal');

    const modalContent = document.createElement('div');
    modalContent.classList.add('modal-content');

    const closeButton = document.createElement('span');
    closeButton.classList.add('close-btn');

    const para = document.createElement('p');
    const textnode = document.createTextNode('Color schemes...');
    para.appendChild(textnode);

    modalContent.appendChild(closeButton);
    modalContent.appendChild(para);
    colorModal.appendChild(modalContent);
    canvasHolder.appendChild(colorModal);

    let sheet = (function() {
      // Create the <style> tag
      let style = document.createElement("style");

      // WebKit hack :(
      style.appendChild(document.createTextNode(""));

      // Add the <style> element to the page
      document.head.appendChild(style);

      return style.sheet;
    }());

    addCSSRule(sheet, '.modal', 'display: none; position: fixed; padding-top: 50px; left: 0; top: 0; width: 100%; height: 100%; background-color: rgb(0,0,0); background-color: rgba(0, 0, 0, 0.5);');
    addCSSRule(sheet, '.modal-content', 'position: relative; background-color: white; padding: 20px; margin: auto; width: 75%;');
    addCSSRule(sheet, '.close-btn', 'float: right; color: lightgray; font-size: 24px; font-weight: bold;');
    addCSSRule(sheet, '.close-btn:hover', 'color: darkgray;');
  }

  function processMarkerPositionsCall(client, url, params, markerpositions = []) {
    return client.get(url, params)
      .then((response) => {
        const { currentPage, totalPages } = response.data.metadata.pagination;

        const newData = response.data.result.data;
        markerpositions.push(...newData.map(m => ({
          name: m.markerName,
          chromosome: m.linkageGroupName,
          position: m.position,
        })));

        if (currentPage < totalPages - 1) {
          const nextPage = currentPage + 1;
          const newParams = { params: { page: nextPage } };
          return processMarkerPositionsCall(client, url, newParams, markerpositions);
        }
        return markerpositions;
      })
      .catch((error) => {
        // eslint-disable-next-line no-console
        console.log(error);
      });
  }

  function processVariantSetCall(client, url, params, variantSetCalls = []) {
    return client.get(url, params)
      .then((response) => {
        const { nextPageToken } = response.data.metadata.pagination;
        const newData = response.data.result.data;
        variantSetCalls.push(...newData.map(calls => ({
          lineName: calls.callSetName,
          markerName: calls.variantName,
          allele: calls.genotype.values[0],
        })));
        if (nextPageToken) {
          const newParams = { params: { pageToken: nextPageToken } };
          return processVariantSetCall(client, url, newParams, variantSetCalls);
        }
        return variantSetCalls;
      }).catch((error) => {
        // eslint-disable-next-line no-console
        console.log(error);
      });
  }

  genotypeRenderer.renderGenotypesBrapi = function renderGenotypesBrapi(
    domParent,
    width,
    height,
    server,
    matrixId,
    mapId,
    authToken,
  ) {
    createRendererComponents(domParent, width, height);
    let germplasmData;

    const client = axios.create({ baseURL: server });
    client.defaults.headers.common.Authorization = `Bearer ${authToken}`;

    if (mapId) {
      // TODO: GOBii don't have the markerpositions call implemented yet so I
      // can't load map data
      processMarkerPositionsCall(client, `/markerpositions?mapDbId=${mapId}`)
        .then((markerpositions) => {
          const mapImporter = new MapImporter();
          genomeMap = mapImporter.parseMarkerpositions(markerpositions);

          processVariantSetCall(client, `/variantsets/${matrixId}/calls`)
            .then((variantSetCalls) => {
              const genotypeImporter = new GenotypeImporter(genomeMap);

              if (genomeMap === undefined) {
                genomeMap = genotypeImporter.createFakeMapFromVariantSets(variantSetCalls);
              }

              germplasmData = genotypeImporter.parseVariantSetCalls(variantSetCalls);
              const { stateTable } = genotypeImporter;

              colorScheme = new NucleotideColorScheme(stateTable, document);

              dataSet = new DataSet(genomeMap, germplasmData, stateTable);

              populateLineSelect();

              genotypeCanvas.init(dataSet, colorScheme);
              genotypeCanvas.prerender();

              // Tells the dom parent that Flapjack has finished loading. Allows spinners
              // or similar to be disabled
              sendEvent('FlapjackFinished', domParent);
            })
            .catch((error) => {
              sendEvent('FlapjackError', domParent);
              // eslint-disable-next-line no-console
              console.log(error);
            });
        })
        .catch((error) => {
          sendEvent('FlapjackError', domParent);
          // eslint-disable-next-line no-console
          console.log(error);
        });
    } else {
      processVariantSetCall(client, `/variantsets/${matrixId}/calls`)
        .then((variantSetCalls) => {
          const genotypeImporter = new GenotypeImporter(genomeMap);

          if (genomeMap === undefined) {
            genomeMap = genotypeImporter.createFakeMapFromVariantSets(variantSetCalls);
          }

          germplasmData = genotypeImporter.parseVariantSetCalls(variantSetCalls);
          const { stateTable } = genotypeImporter;

          colorScheme = new NucleotideColorScheme(stateTable, document);

          dataSet = new DataSet(genomeMap, germplasmData, stateTable);

          populateLineSelect();

          genotypeCanvas.init(dataSet, colorScheme);
          genotypeCanvas.prerender();

          // Tells the dom parent that Flapjack has finished loading. Allows spinners
          // or similar to be disabled
          sendEvent('FlapjackFinished', domParent);
        })
        .catch((error) => {
          sendEvent('FlapjackError', domParent);
          // eslint-disable-next-line no-console
          console.log(error);
        });
    }
    return genotypeRenderer;
  };

  // genotypeRenderer.renderGenotypesUrl = function renderGenotypesUrl(
  //   domParent,
  //   width,
  //   height,
  //   mapFileURL,
  //   genotypeFileURL,
  //   authToken,
  // ) {
  //   createRendererComponents(domParent, width, height);

  //   if (typeof mapFileURL !== 'undefined') {
  //     fetch(mapFileURL, { headers: { Authorization: `Bearer ${authToken}` } })
  //       .then((response) => {
  //         if (response.status !== 200) {
  //           console.log(`Couldn't load file: ${mapFileURL}. Status code: ${response.status}`);
  //           return;
  //         }
  //         response.text().then((data) => {
  //           const lines = data.split(/\r?\n/);
  //           for (let line = 0; line < lines.length; line += 1) {
  //             processMapFileLine(lines[line]);
  //           }
  //         })
  //       })
  //       .catch((err) => {
  //         console.log('Fetch Error :-S', err);
  //       });
  //   }

  //   fetch(genotypeFileURL, { headers: { Authorization: `Bearer ${authToken}` } })
  //     .then((response) => {
  //       if (response.status !== 200) {
  //         console.log(`Couldn't load file: ${genotypeFileURL}. Status code: ${response.status}`);
  //         return;
  //       }
  //       response.text().then((data) => {
  //         const lines = data.split(/\r?\n/);
  //         for (let line = 0; line < lines.length; line += 1) {
  //           processFileLine(lines[line]);
  //         }
  //         setupColorStamps(boxSize);
  //         genotypeCanvas.init(markerData, lineNames, lineData, qtls, colorStamps);
  //         genotypeCanvas.prerender();
  //       });
  //     })
  //     .catch((err) => {
  //       console.log('Fetch Error :-S', err);
  //     });

  //   sendEvent('FlapjackFinished', domParent);

  //   return genotypeRenderer;
  // };

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

  function populateLineSelect() {
    const lineSelect = document.getElementById('lineSelect');
    dataSet.germplasmList.forEach((germplasm, idx) => {
      const opt = document.createElement('option');
      opt.value = idx;
      opt.text = germplasm.name;
      lineSelect.add(opt);
    });
  }

  genotypeRenderer.renderGenotypesFile = function renderGenotypesFile(
    domParent,
    width,
    height,
    mapFileDom,
    genotypeFileDom,
  ) {
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

      dataSet = new DataSet(genomeMap, germplasmData, stateTable);
      colorScheme = new NucleotideColorScheme(dataSet);

      populateLineSelect();

      genotypeCanvas.init(dataSet, colorScheme);
      genotypeCanvas.prerender();
    });

    return genotypeRenderer;
  };

  return genotypeRenderer;
}
