import axios from 'axios';
import GenotypeCanvas from './GenotypeCanvas';
import OverviewCanvas from './OverviewCanvas';
import CanvasController from './CanvasController';
import MapImporter from './MapImporter';
import GenotypeImporter from './GenotypeImporter';
import PhenotypeImporter from './PhenotypeImporter'
import DataSet from './DataSet';


export default function GenotypeRenderer() {
  const genotypeRenderer = {};
  let genotypeImporter;

  // Variables for referring to the genotype canvas
  let genotypeCanvas;
  let overviewCanvas;
  let settingsTabs = new Map();
  // TODO: need to investigate a proper clean way to implement this controller
  // functionality
  // eslint-disable-next-line no-unused-vars
  let canvasController;

  // Genotype import progress bar
  let progressBar;
  let progressBarLabel;
  let progressBarBackground;

  const boxSize = 16;

  let genomeMap;
  let phenotypes;
  let traits;
  let dataSet;

  function sendEvent(eventName, domParent) {
    // TODO: Invesitgate using older event emitting code for IE support
    const canvasHolder = document.getElementById(domParent.replace('#', ''));

    // Create the event.
    const event = new Event(eventName);

    canvasHolder.dispatchEvent(event);
  }

  function zoom(size) {
    const newPosition = genotypeCanvas.zoom(size);
    overviewCanvas.moveToPosition(newPosition.marker, newPosition.germplasm, genotypeCanvas.visibilityWindow());
  }

  function setChromosome(chromosomeIndex) {
    canvasController.setChromosome(chromosomeIndex);
  }

  function clearParent(domParent) {
    const canvasHolder = document.getElementById(domParent.replace('#', ''));
    while (canvasHolder.firstChild){
      canvasHolder.removeChild(canvasHolder.firstChild);
    }
  }

  function createRendererComponents(config, showProgress) {
    // Canvas
    if (config.minGenotypeAutoWidth === undefined) config.minGenotypeAutoWidth = 0;
    if (config.minOverviewAutoWidth === undefined) config.minOverviewAutoWidth = 0;

    const canvasHolder = document.getElementById(config.domParent.replace('#', ''));
    canvasHolder.style.fontFamily = 'system-ui';
    canvasHolder.style.fontSize = '14px';
    
    const computedStyles = window.getComputedStyle(canvasHolder);
    const autoWidth = canvasHolder.clientWidth - parseInt(computedStyles.paddingLeft) - parseInt(computedStyles.paddingRight);
    const width = (config.width === null) ? Math.max(autoWidth, config.minGenotypeAutoWidth) : config.width;
    let overviewWidth = (config.overviewWidth === null) ? Math.max(autoWidth, config.minOverviewAutoWidth) : config.overviewWidth;

    const settings = createSettings(config);
    canvasHolder.appendChild(settings);

    if (showProgress){
      // Progress bar
      progressBarBackground = document.createElement("div");
      progressBarBackground.style.width = width + "px";
      progressBarBackground.style.backgroundColor = "grey";
      progressBarBackground.style.position = "relative";

      progressBar = document.createElement("div");
      progressBar.style.width = "1%";
      progressBar.style.height = "30px";
      progressBar.style.backgroundColor = "cyan";

      const labelContainer = document.createElement("div");
      labelContainer.style.position = "absolute";
      labelContainer.style.display = "inline";
      labelContainer.style.top = "0px";
      labelContainer.style.left = "15px";
      labelContainer.style.height = "30px";
      labelContainer.style.lineHeight = "30px";

      progressBarLabel = document.createTextNode("");
      labelContainer.appendChild(progressBarLabel);

      progressBarBackground.appendChild(progressBar);
      progressBarBackground.appendChild(labelContainer);
      canvasHolder.append(progressBarBackground);
    }

    genotypeCanvas = new GenotypeCanvas(width, config.height, boxSize);
    canvasHolder.append(genotypeCanvas.canvas);

    if (!overviewWidth) overviewWidth = width;
    if (!config.overviewHeight) config.overviewHeight = 200;

    overviewCanvas = new OverviewCanvas(overviewWidth, config.overviewHeight);
    canvasHolder.append(overviewCanvas.canvas);

    addStyleSheet();

    canvasController = new CanvasController(canvasHolder, genotypeCanvas, overviewCanvas, (config.saveSettings != false), config.width === null, config.overviewWidth === null, config.minGenotypeAutoWidth, config.minOverviewAutoWidth);
  }

  function createTabToggle(name, title){
    const button = document.createElement('button');
    button.classList.add('bytes-tabtoggle');
    button.style.fontSize = '15px';
    button.appendChild(document.createTextNode(title));
    button.addEventListener('click', openSettingsTab(name));
    return button;
  }

  function openSettingsTab(name){
    return function (event) {

      for (let key of settingsTabs.keys()){
        const [button, tab] = settingsTabs.get(key);
        if (key == name){
          button.classList.add('bytes-tabtoggle-active');
          tab.style.display = 'block';
        } else {
          button.classList.remove('bytes-tabtoggle-active')
          tab.style.display = 'none';
        }
      }
    }
  }

  function addRadioButton(name, id, text, checked, parent, subcontrol) {
    const formCheck = document.createElement('div');
    formCheck.classList.add('form-check');
    const radio = document.createElement('input');
    radio.setAttribute('type', 'radio');
    radio.name = name;
    radio.id = id;
    radio.checked = checked;
    radio.classList.add('form-check-input');

    const radioLabel = document.createElement('label');
    radioLabel.htmlFor = id;
    radioLabel.classList.add('form-check-label');
    const labelText = document.createTextNode(text + " ");
    radioLabel.appendChild(labelText);

    formCheck.appendChild(radio);
    formCheck.appendChild(radioLabel);
    if (subcontrol) formCheck.appendChild(subcontrol);
    parent.appendChild(formCheck);
  }

  function addCSSRule(sheet, selector, rules, index) {
    if ('insertRule' in sheet) {
      sheet.insertRule(selector + '{' + rules + '}', index);
    } else if ('addRule' in sheet) {
      sheet.addRule(selector, rules, index);
    }
  }

  function addStyleSheet() {
    let sheet = (function() {
      // Create the <style> tag
      let style = document.createElement("style");

      // WebKit hack :(
      style.appendChild(document.createTextNode(""));

      // Add the <style> element to the page
      document.head.appendChild(style);

      return style.sheet;
    }());

    //addCSSRule(sheet, '.bytes-fieldset > legend', 'border-style: none; border-width: 0; font-size: 14px; line-height: 20px; margin-bottom: 0; width: auto; padding: 0 10px; border: 1px solid #e0e0e0;');
    //addCSSRule(sheet, '.bytes-fieldset', 'border: 1px solid #e0e0e0; padding: 10px;');
    addCSSRule(sheet, '.bytes-tabtoggle', "display: inline-block; border: none; outline: none; padding: 8px;");
    addCSSRule(sheet, '.bytes-tabtoggle:hover', 'background-color: #DDDDDD');
    addCSSRule(sheet, '.bytes-tabtoggle.bytes-tabtoggle-active', 'background-color: #CCCCCC');
    addCSSRule(sheet, '.bytes-tab', 'display: none;');
    // addCSSRule(sheet, 'input', 'margin: .4rem;');
  }

  function createSettings(config) {
    //// Settings
    const settings = document.createElement('div');
    settings.classList.add('row');
    settings.style.marginTop = '8px';

    // Create the tabs
    const controlTab = createControlTab(config);
    const colorTab = createColorSchemeTab(config);
    const sortTab = createSortTab(config);
    const exportTab = createExportTab(config);
    const displayTab = createDisplayTab(config);

    // Create the tab toggles
    const menuRow = document.createElement('div');

    const controlButton = createTabToggle('control', 'Controls');
    const colorButton = createTabToggle('color', 'Color schemes');
    const sortButton = createTabToggle('sort', 'Sorting');
    const displayButton = createTabToggle('display', 'Display');
    const exportButton = createTabToggle('export', 'Export');
    
    menuRow.appendChild(controlButton)
    menuRow.appendChild(colorButton);
    menuRow.appendChild(sortButton);
    if (displayTab !== undefined)
      menuRow.appendChild(displayButton);
    menuRow.appendChild(exportButton);    

    settingsTabs.set('control', [controlButton, controlTab]);
    settingsTabs.set('color', [colorButton, colorTab]);
    settingsTabs.set('sort', [sortButton, sortTab]);
    if (displayTab !== undefined)
      settingsTabs.set('display', [displayButton, displayTab]);
    settingsTabs.set('export', [exportButton, exportTab]);

    settings.appendChild(menuRow);

    // Add the actual tabs
    const tabContainer = document.createElement('div');
    tabContainer.appendChild(controlTab);
    tabContainer.appendChild(colorTab);
    tabContainer.appendChild(sortTab);
    if (displayTab !== undefined)
      tabContainer.appendChild(displayTab);
    tabContainer.appendChild(exportTab);

    tabContainer.style.minHeight = '140px';  // Can't really use getClientBoundingRect as the tabs are not displayed yet, so...
    tabContainer.style.border = '1px solid #e0e0e0';
    tabContainer.style.padding = '10px';
    settings.appendChild(tabContainer);

    controlTab.style.display = 'block';

    return settings
  }

  function createControlTab(config) {
    // Controls
    const tab = document.createElement('div');
    tab.classList.add('bytes-tab');

    // Chromosome
    const chromosomeLabel = document.createElement('label');
    chromosomeLabel.setAttribute('for', 'chromosomeSelect')
    chromosomeLabel.innerHTML = 'Chromosome: ';

    const chromosomeSelect = document.createElement('select');
    chromosomeSelect.id = 'chromosomeSelect';
    chromosomeSelect.addEventListener('change', (event) => {
      setChromosome(event.target.selectedIndex);
    });

    const chromosomeContainer = document.createElement('div');
    chromosomeContainer.append(chromosomeLabel);
    chromosomeContainer.append(chromosomeSelect);

    // Zoom
    const zoomLabel = document.createElement('label');
    zoomLabel.setAttribute('for', 'zoom-control');
    zoomLabel.innerHTML = 'Zoom:';

    const range = document.createElement('input');
    range.id = 'zoom-control';
    range.setAttribute('type', 'range');
    range.min = 2;
    range.max = 64;
    range.value = 16;

    const zoomContainer = document.createElement('div');
    zoomContainer.append(zoomLabel);
    zoomContainer.append(range);

    range.addEventListener('change', () => {
      zoom(range.value);
    });

    range.addEventListener('input', () => {
      zoom(range.value);
    });

    tab.appendChild(chromosomeContainer);
    tab.appendChild(zoomContainer);
    return tab;
  }

  function createColorSchemeTab(config) {
    const tab = document.createElement('div');
    tab.classList.add('bytes-tab');

    const lineSelect = document.createElement('select');
    lineSelect.id = 'colorLineSelect';
    lineSelect.disabled = true;

    const radioCol = document.createElement('div');
    radioCol.classList.add('col');
    addRadioButton('selectedScheme', 'nucleotideScheme', 'Nucleotide', true, radioCol);
    addRadioButton('selectedScheme', 'similarityScheme', 'Similarity to line (allele match)', false, radioCol, lineSelect);

    tab.appendChild(radioCol);
    return tab;
  }

  function createSortTab(config) {
    const tab = document.createElement('div');
    tab.classList.add('bytes-tab');

    const lineSelect = document.createElement('select');
    lineSelect.id = 'sortLineSelect';
    lineSelect.disabled = true;

    const radioCol = document.createElement('div');
    radioCol.classList.add('col');
    addRadioButton('selectedSort', 'importingOrderSort', 'By importing order', true, radioCol);
    addRadioButton('selectedSort', 'alphabeticSort', 'Alphabetically', false, radioCol);
    addRadioButton('selectedSort', 'similaritySort', 'By similarity to line', false, radioCol, lineSelect);

    if ((config.phenotypeFileDom !== undefined && document.getElementById(config.phenotypeFileDom.replace('#', '')).files[0] !== undefined) || config.phenotypeFileURL !== undefined){
      const traitSelect = document.createElement('select');
      traitSelect.id = 'sortTraitSelect';
      traitSelect.disabled = true;
      addRadioButton('selectedSort', 'traitSort', 'By trait', false, radioCol, traitSelect);
    }

    tab.appendChild(radioCol);
    return tab;
  }

  function createExportTab(config) {
    const tab = document.createElement('div');
    tab.classList.add('bytes-tab');

    const exportViewButton = document.createElement('button')
    const exportViewText = document.createTextNode('Export view');
    exportViewButton.appendChild(exportViewText);

    exportViewButton.addEventListener('click', function(e) {
      const dataURL = genotypeCanvas.toDataURL('image/png');
      if (dataURL){  // Export succeeded
        const element = document.createElement('a');
        element.setAttribute('href', dataURL);
        element.setAttribute('download', genotypeCanvas.exportName() + '.png');
        element.style.display = 'none';
        document.body.appendChild(element);
        element.click();
        document.body.removeChild(element);
      }
    });

    const exportOverviewButton = document.createElement('button');
    const exportOverviewText = document.createTextNode('Export overview');
    exportOverviewButton.appendChild(exportOverviewText);

    exportOverviewButton.addEventListener('click', function(e) {
      const dataURL = overviewCanvas.toDataURL('image/png');
      if (dataURL){  // Export succeeded
        const element = document.createElement('a');
        element.setAttribute('href', dataURL);
        element.setAttribute('download', overviewCanvas.exportName() + '.png');
        element.style.display = 'none';
        document.body.appendChild(element);
        element.click();
        document.body.removeChild(element);
      }
    });

    tab.appendChild(exportViewButton);
    tab.appendChild(exportOverviewButton);
    
    return tab;
  }

  function createDisplayTab(config){
    if ((config.phenotypeFileDom !== undefined && document.getElementById(config.phenotypeFileDom.replace('#', '')).files[0] !== undefined) || config.phenotypeFileURL !== undefined){
      const tab = document.createElement('div');
      tab.classList.add('bytes-tab');

      const traitSelectContainer = document.createElement('div');
      traitSelectContainer.style.float = 'left';

      const traitSelectLegend = document.createElement('p');
      const traitSelectLegendText = document.createTextNode('Traits to display');
      traitSelectLegend.appendChild(traitSelectLegendText);

      const traitSelect = document.createElement('select');
      traitSelect.id = 'displayTraitSelect';
      traitSelect.multiple = true;
      traitSelect.size = 5;

      traitSelectContainer.appendChild(traitSelectLegend);
      traitSelectContainer.appendChild(traitSelect);

      const paletteSelectContainer = document.createElement('div');
      paletteSelectContainer.style.float = 'left';
      paletteSelectContainer.style.marginLeft = '10px';

      const paletteSelectLegend = document.createElement('p');
      const paletteSelectLegendText = document.createTextNode('Trait colors');
      paletteSelectLegend.appendChild(paletteSelectLegendText);

      const paletteSelectTrait = document.createElement('select');
      paletteSelectTrait.id = 'paletteTrait'
      paletteSelectTrait.style.display = 'block';

      const paletteSelectValue = document.createElement('select');
      paletteSelectValue.id = 'paletteValue';
      paletteSelectValue.style.display = 'block';

      const paletteSelectColor = document.createElement('input');
      paletteSelectColor.id = 'paletteColor';
      paletteSelectColor.style.display = 'block';
      paletteSelectColor.setAttribute('type', 'color');

      const paletteResetButton = document.createElement('button');
      const paletteResetLegend = document.createTextNode("Reset this trait's colors");
      paletteResetButton.appendChild(paletteResetLegend);
      paletteResetButton.id = 'paletteReset';

      paletteSelectContainer.appendChild(paletteSelectLegend);
      paletteSelectContainer.appendChild(paletteSelectTrait);
      paletteSelectContainer.appendChild(paletteSelectValue);
      paletteSelectContainer.appendChild(paletteSelectColor);
      paletteSelectContainer.appendChild(paletteResetButton);

      tab.appendChild(traitSelectContainer);
      tab.appendChild(paletteSelectContainer);
      
      return tab;
    }
  }

  function setProgressBarLabel(newLabel) {
    progressBarLabel.data = newLabel;
  }

  function setAdvancement(ratio) {
    progressBar.style.width = Math.floor(100 * ratio) + "%";
  }

  function removeAdvancement() {
    progressBarBackground.remove();
  }

  function processMarkerPositionsCall(client, url, params, markerpositions = []) {
    return client.get(url, params)
      .then((response) => {
        const { currentPage, totalPages } = response.data.metadata.pagination;

        const newData = response.data.result.data;
        markerpositions.push(...newData.map(m => ({
          name: m.variantName,
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
    if (params === undefined) params = {};
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
    config,  // Compatibility positional domParent

    // Positional arguments kept for compatibility
    width,
    height,
    baseURL,
    matrixId,
    mapId,
    authToken,
    overviewWidth,
    overviewHeight,
    minGenotypeAutoWidth,
    minOverviewAutoWidth
  ) {
    if (!(config instanceof Object)){
      config = {
        domParent: config,  // Position for domParent
        baseURL, matrixId, mapId, authToken,
        minGenotypeAutoWidth, minOverviewAutoWidth,
      };
      config.width = (width !== undefined) ? width : null;
      config.height = (height !== undefined) ? height : 600;
      config.overviewWidth = (overviewWidth !== undefined) ? overviewWidth : config.width;
      config.overviewHeight = (overviewHeight !== undefined) ? overviewHeight : 200;
    }

    clearParent(config.domParent)
    createRendererComponents(config, false);
    let germplasmData;

    const client = axios.create({ baseURL: config.baseURL });
    client.defaults.headers.common.Authorization = `Bearer ${config.authToken}`;

    if (config.mapId !== null) {
      // TODO: GOBii don't have the markerpositions call implemented yet so I
      // can't load map data
      processMarkerPositionsCall(client, `/markerpositions?mapDbId=${config.mapId}`)
        .then((markerpositions) => {
          const mapImporter = new MapImporter();
          genomeMap = mapImporter.parseMarkerpositions(markerpositions);

          processVariantSetCall(client, `/variantsets/${config.matrixId}/calls`)
            .then((variantSetCalls) => {
              genotypeImporter = new GenotypeImporter(genomeMap);

              if (genomeMap === undefined) {
                genomeMap = genotypeImporter.createFakeMapFromVariantSets(variantSetCalls);
              }

              germplasmData = genotypeImporter.parseVariantSetCalls(variantSetCalls);
              const { stateTable } = genotypeImporter;

              const dataSetId = (config.dataSetId === undefined ? config.matrixId : config.dataSetId);
              dataSet = new DataSet(dataSetId, genomeMap, germplasmData, stateTable);

              populateLineSelect();
              populateChromosomeSelect();

              canvasController.init(dataSet);

              // Tells the dom parent that Flapjack has finished loading. Allows spinners
              // or similar to be disabled
              sendEvent('FlapjackFinished', config.domParent);
            })
            .catch((error) => {
              sendEvent('FlapjackError', config.domParent);
              // eslint-disable-next-line no-console
              console.log(error);
            });
        })
        .catch((error) => {
          sendEvent('FlapjackError', config.domParent);
          // eslint-disable-next-line no-console
          console.log(error);
        });
    } else {
      processVariantSetCall(client, `/variantsets/${config.matrixId}/calls`)
        .then((variantSetCalls) => {
          genotypeImporter = new GenotypeImporter(genomeMap);

          if (genomeMap === undefined) {
            genomeMap = genotypeImporter.createFakeMapFromVariantSets(variantSetCalls);
          }

          germplasmData = genotypeImporter.parseVariantSetCalls(variantSetCalls);
          const { stateTable } = genotypeImporter;

          const dataSetId = (config.dataSetId === undefined ? config.matrixId : config.dataSetId);
          dataSet = new DataSet(config.matrixId, genomeMap, germplasmData, stateTable);

          populateLineSelect();
          populateChromosomeSelect();

          canvasController.init(dataSet);

          // Tells the dom parent that Flapjack has finished loading. Allows spinners
          // or similar to be disabled
          sendEvent('FlapjackFinished', config.domParent);
        })
        .catch((error) => {
          sendEvent('FlapjackError', config.domParent);
          // eslint-disable-next-line no-console
          console.log(error);
        });
    }
    return genotypeRenderer;
  };

  genotypeRenderer.renderGenotypesUrl = function renderGenotypesUrl(
    config,  // Positional : domParent

    // Old positional arguments, kept for backwards compatibility
    width,
    height,
    mapFileURL,
    genotypeFileURL,
    authToken,
    overviewWidth,
    overviewHeight,
    minGenotypeAutoWidth,
    minOverviewAutoWidth
  ) {
    if (!(config instanceof Object)){
      config = {
        domParent: config,  // Position for domParent
        mapFileURL, genotypeFileURL,
        authToken,
        minGenotypeAutoWidth, minOverviewAutoWidth,
      };
      config.width = (width !== undefined) ? width : null;
      config.height = (height !== undefined) ? height : 600;
      config.overviewWidth = (overviewWidth !== undefined) ? overviewWidth : config.width;
      config.overviewHeight = (overviewHeight !== undefined) ? overviewHeight : 200;
    }

    clearParent(config.domParent);
    createRendererComponents(config, true);

    let mapFile, genotypeFile, phenotypeFile;
    let germplasmData;
    let loadingPromises = [];
    let mapLoaded = 0, genotypeLoaded = 0, phenotypeLoaded = 0;
    let mapSize = 0, genotypeSize = 0, phenotypeSize = 0;

    setProgressBarLabel("Downloading data...");
    setAdvancement(0);

    if (config.mapFileURL){
      let mapPromise = axios.get(config.mapFileURL, {
        headers: { 'Content-Type': 'text/plain' },
        onDownloadProgress: function (progressEvent){
          if (progressEvent.lengthComputable){
            mapLoaded = progressEvent.loaded;
            mapSize = progressEvent.total;
            setAdvancement((mapLoaded + genotypeLoaded + phenotypeLoaded) / (mapSize + genotypeSize + phenotypeSize));
          }
        }
      }).then((response) => {
        mapFile = response.data;
      }).catch((error) => {
        console.error(error);
      });
      
      loadingPromises.push(mapPromise);
    }

    if (config.phenotypeFileURL){
      let phenotypePromise = axios.get(config.phenotypeFileURL, {
        headers: { 'Content-Type': 'text/plain' },
        onDownloadProgress: function (progressEvent){
          if (progressEvent.lengthComputable){
            phenotypeLoaded = progressEvent.loaded;
            phenotypeSize = progressEvent.total;
            setAdvancement((mapLoaded + genotypeLoaded + phenotypeLoaded) / (mapSize + genotypeSize + phenotypeSize));
          }
        }
      }).then((response) => {
        phenotypeFile = response.data;
      }).catch((error) => {
        console.error(error);
      });
      
      loadingPromises.push(phenotypePromise);
    }

    let genotypePromise = axios.get(config.genotypeFileURL, {
      headers: { 'Content-Type': 'text/plain' },
      onDownloadProgress: function (progressEvent){
        if (progressEvent.lengthComputable){
          genotypeLoaded = progressEvent.loaded;
          genotypeSize = progressEvent.total;
          setAdvancement((mapLoaded + genotypeLoaded + phenotypeLoaded) / (mapSize + genotypeSize + phenotypeSize));
        }
        else
        	setProgressBarLabel("Downloading genotype file... " + formatFileSize(progressEvent.loaded));
      }
    }).then((response) => {
      genotypeFile = response.data;
    }).catch((error) => {
      console.error(error);
    });
    loadingPromises.push(genotypePromise);

    Promise.all(loadingPromises).then(function (){
      setAdvancement(0);
      setProgressBarLabel("Processing the genome map...");

      if (mapFile !== undefined) {
        const mapImporter = new MapImporter();
        genomeMap = mapImporter.parseFile(mapFile);
      }

      setAdvancement(0);
      setProgressBarLabel("Processing the phenotypes...");

      if (phenotypeFile !== undefined){
        const phenotypeImporter = new PhenotypeImporter();
        phenotypes = phenotypeImporter.parseFile(phenotypeFile);
        traits = phenotypeImporter.traits;
      }

      setProgressBarLabel("Processing the genotypes...");
      genotypeImporter = new GenotypeImporter(genomeMap);

      if (genomeMap === undefined) {
        genomeMap = genotypeImporter.createFakeMap(genotypeFile);
      }

      genotypeImporter.parseFile(genotypeFile, setAdvancement, removeAdvancement).then(function (germplasmList) {
        germplasmData = germplasmList;
        const { stateTable } = genotypeImporter;

        const dataSetId = (config.dataSetId === undefined ? config.genotypeFileURL : config.dataSetId);
        dataSet = new DataSet(dataSetId, genomeMap, germplasmData, stateTable, traits, phenotypes);

        populateLineSelect();
        if (phenotypes !== undefined) populateTraitSelect();
        populateChromosomeSelect();

        canvasController.init(dataSet);

        // Tells the dom parent that Flapjack has finished loading. Allows spinners
        // or similar to be disabled
        sendEvent('FlapjackFinished', config.domParent);
      });
    }).catch((error) => {
      sendEvent('FlapjackError', config.domParent);
      // eslint-disable-next-line no-console
      console.log(error);
    });

    return genotypeRenderer;
  };

  function formatFileSize(sizeInBytes) {
    if (isNaN(sizeInBytes)) return "";
    if (sizeInBytes >= 1073741824) return parseFloat(sizeInBytes / 1073741824).toFixed(2) + " GB";
    if (sizeInBytes >= 1048576) return parseFloat(sizeInBytes / 1048576).toFixed(1) + " MB";
    if (sizeInBytes >= 1024) return parseFloat(sizeInBytes / 1024).toFixed(0) + " KB";
    return sizeInBytes.toFixed(1) + " B";
  }
    
  function loadFromFile(file) {
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
    const colorLineSelect = document.getElementById('colorLineSelect');
    const sortLineSelect = document.getElementById('sortLineSelect');

    let optList = dataSet.germplasmList.slice();  // Shallow copy
    optList.sort((a, b) => (a.name < b.name ? -1 : (a.name > b.name ? 1 : 0)));  // Alphabetic sort
    optList.forEach(germplasm => {
      const opt = document.createElement('option');
      opt.value = germplasm.name;
      opt.text = germplasm.name;
      colorLineSelect.add(opt);
      sortLineSelect.add(opt.cloneNode(true));
    });
  }

  function populateTraitSelect() {
    const sortTraitSelect = document.getElementById('sortTraitSelect');
    const displayTraitSelect = document.getElementById('displayTraitSelect');

    dataSet.traitNames.forEach(name => {
      const opt = document.createElement('option');
      opt.value = name;
      opt.text = name;
      sortTraitSelect.add(opt);

      const clone = opt.cloneNode(true);
      clone.selected = true;
      displayTraitSelect.add(clone);
    });
  }

  function populateChromosomeSelect() {
    const chromosomeSelect = document.getElementById('chromosomeSelect');

    dataSet.genomeMap.chromosomes.forEach((chromosome, index) => {
      const opt = document.createElement('option');
      opt.value = index;
      opt.text = chromosome.name;
      opt.selected = true;
      chromosomeSelect.add(opt);
    });

    chromosomeSelect.selectedIndex = 0;
  }

  genotypeRenderer.renderGenotypesFile = function renderGenotypesFile(
    config,  // domParent in positional
    // Old positional arguments, kept for backwards compatibility
    width,
    height,
    mapFileDom,
    genotypeFileDom,
    overviewWidth,
    overviewHeight,
    minGenotypeAutoWidth,
    minOverviewAutoWidth
  ) {
    if (!(config instanceof Object)){
      config = {
        domParent: config,  // Position for domParent
        mapFileDom, genotypeFileDom,
        minGenotypeAutoWidth, minOverviewAutoWidth,
      };
      config.width = (width !== undefined) ? width : null;
      config.height = (height !== undefined) ? height : 600;
      config.overviewWidth = (overviewWidth !== undefined) ? overviewWidth : config.width;
      config.overviewHeight = (overviewHeight !== undefined) ? overviewHeight : 200;
    }

    clearParent(config.domParent);
    createRendererComponents(config, true);
    // let qtls = [];
    let germplasmData;

    setProgressBarLabel("Loading file contents...");
    let loadingPromises = [];

    if (config.mapFileDom !== undefined){
      const mapFile = document.getElementById(config.mapFileDom.replace('#', '')).files[0];
      let mapPromise = loadFromFile(mapFile);

       // Load map data
      mapPromise = mapPromise.then((result) => {
        const mapImporter = new MapImporter();
        genomeMap = mapImporter.parseFile(result);
      }).catch(reason => {
        console.error(reason);
        genomeMap = undefined;
      });

      loadingPromises.push(mapPromise);
    }

    if (config.phenotypeFileDom !== undefined){
      const phenotypeFile = document.getElementById(config.phenotypeFileDom.replace('#', '')).files[0];
      let phenotypePromise = loadFromFile(phenotypeFile);

      // Load phenotype data
      phenotypePromise = phenotypePromise.then((result) => {
        const phenotypeImporter = new PhenotypeImporter();
        phenotypes = phenotypeImporter.parseFile(result);
        traits = phenotypeImporter.traits;
      }).catch(reason => {
        console.error(reason, reason.name);
        phenotypes = undefined;
        traits = undefined;
      });

      loadingPromises.push(phenotypePromise);
    }

    // const qtlPromise = loadFromFile(qtlFileDom);
    const genotypeFile = document.getElementById(config.genotypeFileDom.replace('#', '')).files[0];
    let genotypePromise = loadFromFile(genotypeFile);
    loadingPromises.push(genotypePromise);

    // // Then QTL data
    // qtlPromise.then((result) => {
    //   const qtlImporter = new QtlImporter();
    //   qtlImporter.parseFile(result);
    //   qtls = qtlImporter.qtls;
    // });

    // Then genotype data
    // Must be executed after the map file has been parsed *and* the genotype file has been read
    Promise.all(loadingPromises).then((results) => {
      let result = results[results.length - 1];  // The genotype promise is last
      genotypeImporter = new GenotypeImporter(genomeMap);

      if (genomeMap === undefined) {
        genomeMap = genotypeImporter.createFakeMap(result);
      }

      setProgressBarLabel("Processing genotypes...");
      setAdvancement(0);

      genotypeImporter.parseFile(result, setAdvancement, removeAdvancement).then(function (germplasmList){
        germplasmData = germplasmList;
        const { stateTable } = genotypeImporter;

        const dataSetId = (config.dataSetId === undefined ? genotypeFile.name : config.dataSetId);
        dataSet = new DataSet(dataSetId, genomeMap, germplasmData, stateTable, traits, phenotypes);

        populateLineSelect();
        if (phenotypes !== undefined) populateTraitSelect();
        populateChromosomeSelect();

        canvasController.init(dataSet);

        // Tells the dom parent that Flapjack has finished loading. Allows spinners
        // or similar to be disabled
        sendEvent('FlapjackFinished', config.domParent);
      });
    });

    return genotypeRenderer;
  };

  genotypeRenderer.getRenderingProgressPercentage = function getRenderingProgressPercentage() {
    return genotypeImporter == null ? -1 : genotypeImporter.getImportProgressPercentage();
  };

  return genotypeRenderer;
}