import axios from 'axios';
import GenotypeCanvas from './GenotypeCanvas';
import OverviewCanvas from './OverviewCanvas';
import CanvasController from './CanvasController';
import MapImporter from './MapImporter';
import GenotypeImporter from './GenotypeImporter';
import PhenotypeImporter from './PhenotypeImporter';
import SimilarityLineSort from './sort/SimilarityLineSort';
import DataSet from './DataSet';
import ScrollBar from './ScrollBar';

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

  const boxSize = 17;

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

  function lineSearchCrosshair(index) {
    var germplasmStart = Math.floor(genotypeCanvas.translatedY / genotypeCanvas.boxSize);
    var yWiggle = genotypeCanvas.translatedY - germplasmStart * genotypeCanvas.boxSize;
    var yPos = (index - germplasmStart) * genotypeCanvas.boxSize;
    if (genotypeCanvas.translatedY === 0) {
      yPos = index * genotypeCanvas.boxSize - yWiggle;
    }
    var yScrollMax = genotypeCanvas.maxCanvasHeight() - genotypeCanvas.alleleCanvasHeight();
    if (genotypeCanvas.translatedY === yScrollMax) {
      yPos = index * genotypeCanvas.boxSize - yScrollMax < 0 ? index * genotypeCanvas.boxSize - yWiggle : index * genotypeCanvas.boxSize - yScrollMax;
    }
    genotypeCanvas.drawingContext.save();
    genotypeCanvas.drawingContext.translate(genotypeCanvas.alleleCanvasXOffset, genotypeCanvas.mapCanvasHeight);
    genotypeCanvas.drawingContext.globalAlpha = 0.4;
    genotypeCanvas.drawingContext.fillStyle = '#ff0';

    // Clip the canvas to prevent over-drawing of the crosshair
    var region = new Path2D();
    region.rect(0, 0, genotypeCanvas.alleleCanvasWidth(), genotypeCanvas.alleleCanvasHeight());
    genotypeCanvas.drawingContext.clip(region);
    genotypeCanvas.renderHorizontalCrosshairLine(yPos);
    genotypeCanvas.drawingContext.translate(-genotypeCanvas.alleleCanvasXOffset, -genotypeCanvas.mapCanvasHeight);
    genotypeCanvas.drawingContext.globalAlpha = 1;
    genotypeCanvas.drawingContext.restore();
  }
  
  function dragToLine(input, i) {
    if (input.length > 0) {
      var germplasms = canvasController.findGermplasmWithLine(input);
      if (germplasms.length !== 0) {
        var index = dataSet.germplasmListFiltered.indexOf(germplasms[i % germplasms.length]);
        var zoomValue = document.getElementById('zoom-control').value;
        var calc = Math.floor(index - 64 / zoomValue * 10 / 2);
        if (calc < 0) {
          genotypeCanvas.moveToPosition(0, 0);
        } else {
          genotypeCanvas.moveToPosition(0, calc);
        }
        genotypeCanvas.draggingOverviewCanvas = true;
        lineSearchCrosshair(index);
        return true;
      }
      return false;
    }
    return true;
  }

  function hideContextMenu() {
    var customContextMenu = document.getElementById("customContextMenu");
    customContextMenu.style.display = "none";
  }
  
  function createContextMenu(genotypeCanvas, canvasController) {
    var customContextMenu = document.createElement("div");
    customContextMenu.id = "customContextMenu";
    customContextMenu.style.display = "none";
    customContextMenu.style.position = "absolute";
    customContextMenu.style.backgroundColor = "#000";
    customContextMenu.style.color = "#fff";
    customContextMenu.style.border = "1px solid #ccc";
    customContextMenu.style.padding = "5px 15px";
    customContextMenu.style.zIndex = "1000";
    customContextMenu.style.margin = "-3px";
    customContextMenu.style.fontFamily = 'system-ui';
    customContextMenu.style.fontSize = '14px';
    var option1 = document.createElement("div");
    option1.textContent = "Color by similarity to this line";
    option1.style.cursor = "pointer";
    option1.addEventListener("click", function (event) {
      var colorLineInput = document.getElementById("colorLineInput");
      var colorLineSelect = document.getElementById("colorLineSelect");
      var germplasmStart = Math.floor(genotypeCanvas.translatedY / genotypeCanvas.boxSize);
      var rect = genotypeCanvas.canvas.getBoundingClientRect();
      var y = customContextMenu.offsetTop - rect.top - 56; // 56 stands for height above the first line of the canvas
      var index = Math.floor(y / genotypeCanvas.boxSize + germplasmStart);
      var reference = genotypeCanvas.dataSet.germplasmListFiltered[index];
      if (reference !== undefined) {
        genotypeCanvas.setColorComparisonLine(reference.name);
        canvasController.overviewCanvas.prerender(true);
        canvasController.saveSetting("colorReference", reference.name);
        var nucleotideScheme = document.getElementById("nucleotideScheme");
        var similarityScheme = document.getElementById("similarityScheme");
        nucleotideScheme.checked = false;
        similarityScheme.checked = true;
        colorLineInput.value = reference.name;
        canvasController.similaritySchemeChange(colorLineSelect, index, false);
      }
      hideContextMenu();
    });
    option1.addEventListener("mouseover", function () {
      option1.style.backgroundColor = "grey";
    });
    option1.addEventListener("mouseout", function () {
      option1.style.backgroundColor = "";
    });
    var option2 = document.createElement("div");
    option2.textContent = "Sort by similarity to this line";
    option2.style.cursor = "pointer";
    option2.addEventListener("click", function (event) {
      var sortLineInput = document.getElementById("sortLineInput");
      var sortLineSelect = document.getElementById("sortLineSelect");
      var sortTraitSelect = document.getElementById('sortTraitSelect');
      var germplasmStart = Math.floor(genotypeCanvas.translatedY / genotypeCanvas.boxSize);
      var rect = genotypeCanvas.canvas.getBoundingClientRect();
      var y = customContextMenu.offsetTop - rect.top - 56; // 56 stands for height above the first line of the canvas
      var index = Math.floor(y / genotypeCanvas.boxSize + germplasmStart);
      var reference = genotypeCanvas.dataSet.germplasmListFiltered[index];
      if (reference !== undefined) {
        var referenceName = reference.name;
        canvasController.setLineSort(new SimilarityLineSort(referenceName, [canvasController.chromosomeIndex]));
        canvasController.saveSetting("sortReference", referenceName);
        var importingOrderSort = document.getElementById("importingOrderSort");
        var alphabeticSort = document.getElementById("alphabeticSort");
        var similaritySort = document.getElementById("similaritySort");
        importingOrderSort.checked = false;
        alphabeticSort.checked = false;
        similaritySort.checked = true;
        sortLineInput.value = referenceName;
        canvasController.similaritySortChange(sortLineInput, sortTraitSelect, sortLineSelect, index, false);
      }
      hideContextMenu();
    });
    option2.addEventListener("mouseover", function () {
      option2.style.backgroundColor = "grey";
    });
    option2.addEventListener("mouseout", function () {
      option2.style.backgroundColor = "";
    });
    customContextMenu.addEventListener("mouseleave", function () {
      customContextMenu.style.display = "none";
    });
    customContextMenu.appendChild(option1);
    customContextMenu.appendChild(option2);
    document.body.appendChild(customContextMenu);
  }

  function resizehandler(resizeHandle, resizableDiv1, resizableDiv2) {
    var isResizing = false;
    var initialY;
    var originalHeight1;
    var originalHeight2;
    resizeHandle.addEventListener('mousedown', function (event) {
      isResizing = true;
      initialY = event.clientY;
      originalHeight1 = resizableDiv1.canvas.clientHeight;
      originalHeight2 = resizableDiv2.canvas.clientHeight;
    });
    document.addEventListener('mousemove', function (event) {
      if (!isResizing) return;
      var currentY = event.clientY;
      var height1 = originalHeight1 - (currentY - initialY);
      var height2 = originalHeight2 + (currentY - initialY);

      // Appliquer la hauteur minimale souhaitée si nécessaire
      var minHeight = 10;
      if (height1 > minHeight) {
        resizableDiv1.height = height1;
        resizableDiv1.canvas.height = height1;
        resizableDiv1.backBuffer.height = height1;
      }
      if (height2 > minHeight) {
        resizableDiv2.height = height2;
        resizableDiv2.canvas.height = height2;
        resizableDiv2.backBuffer.height = height2;
      }
      resizableDiv2.horizontalScrollbar = new ScrollBar(resizableDiv2.alleleCanvasWidth(), height2, resizableDiv2.alleleCanvasWidth(), resizableDiv2.scrollbarHeight, false);
      genotypeCanvas.prerender(true);
      overviewCanvas.prerender(true);
    });
    document.addEventListener('mouseup', function () {
      isResizing = false;
    });
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
    genotypeCanvas.canvas.id = 'genotypeCanvas';
    canvasHolder.append(genotypeCanvas.canvas);
    var resizeHandle = document.createElement("div");
    resizeHandle.id = "resizeHandle";
    resizeHandle.style.width = '100%';
    resizeHandle.style.height = '3px';
    resizeHandle.style.backgroundColor = '#e74c3c';
    resizeHandle.style.cursor = 'row-resize';
    canvasHolder.append(resizeHandle);

    if (!overviewWidth) overviewWidth = width;
    if (!config.overviewHeight) config.overviewHeight = 200;

    overviewCanvas = new OverviewCanvas(overviewWidth, config.overviewHeight);
    overviewCanvas.canvas.id = 'overviewCanvas';
    canvasHolder.append(overviewCanvas.canvas);
    resizehandler(resizeHandle, overviewCanvas, genotypeCanvas);

    addStyleSheet();

    canvasController = new CanvasController(canvasHolder, genotypeCanvas, overviewCanvas, (config.saveSettings != false), config.width === null, config.overviewWidth === null, config.minGenotypeAutoWidth, config.minOverviewAutoWidth);
	createContextMenu(genotypeCanvas, canvasController);
  }

  function createTabToggle(name, title, tab) {
	  if (tab !== undefined) {
	    const button = document.createElement('button');
	    button.classList.add('bytes-tabtoggle');
	    button.style.fontSize = '15px';
	    button.style.cursor = 'hand';
	    button.appendChild(document.createTextNode(title));
	    button.addEventListener('click', openSettingsTab(name));
	    return button;
	  }
  }

  function openSettingsTab(name){
    return function (event) {
      for (let key of settingsTabs.keys()){
        const [button, tab] = settingsTabs.get(key);
        if (key == name && !button.classList.contains('bytes-tabtoggle-active')){
          button.classList.add('bytes-tabtoggle-active');
          tab.style.display = 'block';
        } else {
          button.classList.remove('bytes-tabtoggle-active')
          tab.style.display = 'none';
        }
      }
    }
  }

  function addRadioButton(name, id, text, checked, parent, subcontrol, subcontrol2) {
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
    if (subcontrol2) formCheck.appendChild(subcontrol2);
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
    addCSSRule(sheet, '.bytes-tabtoggle:hover', 'background-color: #CCCCCC');
    addCSSRule(sheet, '.bytes-tabtoggle.bytes-tabtoggle-active', 'background-color: #DDDDDD');
    addCSSRule(sheet, '.bytes-tab', 'display: none;');
    // addCSSRule(sheet, 'input', 'margin: .4rem;');
  }

  function createSettings(config) {
    //// Settings
    const settings = document.createElement('div');
    settings.id = 'settings';
    settings.classList.add('row');
    settings.style.marginTop = '8px';

    // Create the tabs
    const colorTab = createColorSchemeTab();
    const sortTab = createSortTab(config);
    const exportTab = createExportTab();
    const displayTab = createDisplayTab(config);

    // Create the tab toggles
    const menuRow = document.createElement('div');
    menuRow.id = 'menurow';
    const colorButton = createTabToggle('color', 'Color schemes', colorTab);
    const sortButton = createTabToggle('sort', 'Sorting', sortTab);
    const displayButton = createTabToggle('display', 'Display', displayTab);
    const exportButton = createTabToggle('export', 'Export', exportTab);
    
    menuRow.appendChild(colorButton);
    menuRow.appendChild(sortButton);
    if (displayTab !== undefined)
      menuRow.appendChild(displayButton);
    menuRow.appendChild(exportButton);    

    settingsTabs.set('color', [colorButton, colorTab]);
    settingsTabs.set('sort', [sortButton, sortTab]);
    if (displayTab !== undefined)
      settingsTabs.set('display', [displayButton, displayTab]);
    settingsTabs.set('export', [exportButton, exportTab]);

    settings.appendChild(menuRow);
    
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
    range.value = boxSize;
	range.style.width = "300px";
	
	const zoomPreviewLabel = document.createElement('label');
	zoomPreviewLabel.setAttribute('for', 'zoom-preview');
	zoomPreviewLabel.innerHTML = 'Preview while dragging';
	const zoomPreview = document.createElement('input');
	zoomPreview.id = 'zoom-preview';
	zoomPreview.setAttribute('type', 'checkbox');
	zoomPreview.style.marginLeft = "20px";

    const zoomContainer = document.createElement('div');
    zoomContainer.append(zoomLabel);
    zoomContainer.append(range);
    zoomContainer.append(zoomPreview);
    zoomContainer.append(zoomPreviewLabel);

    range.addEventListener('change', function () {
	  if (!document.getElementById("zoom-preview").checked) {
	    //console.log("change: " + range.value);
	        zoom(range.value);
	    }
    });

    range.addEventListener('input', function () {
	  if (document.getElementById("zoom-preview").checked) {
	    //console.log("input: " + range.value);
	        zoom(range.value);
	    }
    });


    // Ctrl+F
    var findLine = document.createElement('input');
    findLine.type = "text";
    findLine.id = "lineInput";
    findLine.style.width = "170px";
    findLine.placeholder = "Search line";
    var notFoundlabel = document.createElement('label');
    notFoundlabel.style.display = 'none';
    notFoundlabel.setAttribute('for', 'lineInput');
    var findContainer = document.createElement('div');
    findContainer.id = "findContainer";
    findContainer.style.marginLeft = "50px";
    findContainer.append(findLine);
    findContainer.append(notFoundlabel);
    var incfindline = 0;
    findLine.addEventListener("input", function (event) {
      notFoundlabel.style.display = 'none';
      var found = dragToLine(findLine.value.toLowerCase(), incfindline);
      if (found === false) {
        notFoundlabel.style.position = 'absolute';
        notFoundlabel.style.display = 'block';
        notFoundlabel.style.marginLeft = '100px';
        notFoundlabel.style.marginTop = '-19px';
        notFoundlabel.innerHTML = ' not found';
        notFoundlabel.style.color = 'red';
        notFoundlabel.style.backgroundColor = '#eeeeee';
        notFoundlabel.style.padding = '0px 3px';
      }
    });
    findLine.addEventListener("keydown", function (event) {
      // Code 13 stands for "Enter" key
      if (event.keyCode === 13) {
        if (findLine.value.length !== 0) {
          incfindline = incfindline + 1;
        }
      } else {
        incfindline = 0;
      }
      findLine.dispatchEvent(new Event('input'));
    });
    var markerrange = document.createElement("div");
    markerrange.id = "markerRange";
    chromosomeContainer.style.display = "inline-block";
    chromosomeContainer.style.margin = "0 40px";
    chromosomeContainer.style.paddingTop = "4px";
    chromosomeContainer.style.minWidth = "285px";
    zoomContainer.style["float"] = "right";
    zoomContainer.style.marginLeft = "40px";
    findContainer.style["float"] = "right";
    findContainer.style.marginTop = "2px";
    findContainer.style.marginLeft = "0px";
    markerrange.style.marginTop = "-5px";
    markerrange.style.marginLeft = "15px";
    markerrange.style.textAlign = "right";
    markerrange.style.display = "inline-block";
    markerrange.style.color = "blue";
    markerrange.style.position = "absolute";
    markerrange.style.fontSize = "12px";
        

    // Add the actual tabs
    const tabContainer = document.createElement('div');
    tabContainer.appendChild(colorTab);
    tabContainer.appendChild(sortTab);
    if (displayTab !== undefined)
      tabContainer.appendChild(displayTab);
    tabContainer.appendChild(exportTab);

    tabContainer.style.position = 'absolute';
    tabContainer.style.backgroundColor = 'rgb(221,221,221)';
    tabContainer.style.minWidth = '400px';
    tabContainer.style.opacity = '95%';
    settings.appendChild(tabContainer);

    menuRow.appendChild(chromosomeContainer);
    menuRow.appendChild(zoomContainer);
    //menuRow.appendChild(filterContainer);
    menuRow.appendChild(findContainer);
    chromosomeContainer.appendChild(markerrange);

    return settings
  }

  function createColorSchemeTab() {
    const tab = document.createElement('div');
    tab.classList.add('bytes-tab');
    tab.style.margin = '10px';
        
    const lineSelect = document.createElement('datalist');
    lineSelect.id = 'colorLineSelect';
    const lineInput = document.createElement('input');
    lineInput.type = 'text';
    lineInput.id = 'colorLineInput';
    lineInput.placeholder = 'Select line';
    lineInput.disabled = true;
    lineInput.setAttribute("list", "colorLineSelect");
    lineInput.style.width = '150px';

    const radioCol = document.createElement('div');
    radioCol.classList.add('col');
    addRadioButton('selectedScheme', 'nucleotideScheme', 'Nucleotide', true, radioCol);
    addRadioButton('selectedScheme', 'similarityScheme', 'Similarity to line (allele match)', false, radioCol, lineSelect, lineInput);

    tab.appendChild(radioCol);
    return tab;
  }

  function createSortTab(config) {
    const tab = document.createElement('div');
    tab.classList.add('bytes-tab');
    tab.style.margin = '10px';
        
    const lineSelect = document.createElement('datalist');
    lineSelect.id = 'sortLineSelect';
    const lineInput = document.createElement('input');
    lineInput.type = 'text';
    lineInput.id = 'sortLineInput';
    lineInput.placeholder = 'Select line';
    lineInput.disabled = true;
    lineInput.setAttribute("list", "sortLineSelect");
    lineInput.style.width = '150px';

    const radioCol = document.createElement('div');
    radioCol.classList.add('col');
    addRadioButton('selectedSort', 'importingOrderSort', 'By importing order', true, radioCol);
    addRadioButton('selectedSort', 'alphabeticSort', 'Alphabetically', false, radioCol);
    addRadioButton('selectedSort', 'similaritySort', 'By similarity to line', false, radioCol, lineSelect, lineInput);

    if ((config.phenotypeFileDom !== undefined && document.getElementById(config.phenotypeFileDom.replace('#', '')).files[0] !== undefined) || config.phenotypeFileURL !== undefined){
      const traitSelect = document.createElement('select');
      traitSelect.id = 'sortTraitSelect';
      traitSelect.disabled = true;
      addRadioButton('selectedSort', 'traitSort', 'By trait', false, radioCol, traitSelect);
    }

    tab.appendChild(radioCol);
    return tab;
  }

  function createExportTab() {
    const tab = document.createElement('div');
    tab.classList.add('bytes-tab');
    tab.style.margin = '10px';
        
    const exportViewButton = document.createElement('button')
    const exportViewText = document.createTextNode('Export view');
	exportViewButton.style.marginRight = '10px';
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
      tab.style.marginLeft = '10px';

      const traitSelectContainer = document.createElement('div');
      traitSelectContainer.style.float = 'left';

      const traitSelectLegend = document.createElement('p');
      const traitSelectLegendText = document.createTextNode('Traits to display');
      traitSelectLegend.appendChild(traitSelectLegendText);

      const traitSelect = document.createElement('select');
      traitSelect.id = 'displayTraitSelect';
      traitSelect.multiple = true;
      traitSelect.size = 10;

      traitSelectContainer.appendChild(traitSelectLegend);
      traitSelectContainer.appendChild(traitSelect);

      const paletteSelectContainer = document.createElement('div');
      paletteSelectContainer.style.float = 'left';
      paletteSelectContainer.style.marginLeft = '30px';
      paletteSelectContainer.style.marginBottom = '10px';

      const paletteSelectLegend = document.createElement('p');
      const paletteSelectLegendText = document.createTextNode('Trait colors');
      paletteSelectLegend.appendChild(paletteSelectLegendText);

      const paletteSelectTrait = document.createElement('select');
      paletteSelectTrait.id = 'paletteTrait'
      paletteSelectTrait.style.display = 'block';

      const paletteSelectValue = document.createElement('select');
      paletteSelectValue.id = 'paletteValue';
      paletteSelectValue.style.display = 'block';
      paletteSelectValue.multiple = true;
      paletteSelectValue.size = 9;

      const paletteSelectColor = document.createElement('input');
      paletteSelectColor.id = 'paletteColor';
      paletteSelectColor.style.display = 'block';
      paletteSelectColor.style.marginLeft = '20px';
      paletteSelectColor.style.marginBottom = '10px';
      paletteSelectColor.setAttribute('type', 'color');

      const paletteResetButton = document.createElement('button');
      const paletteResetLegend = document.createTextNode("Reset trait colors");
      paletteResetButton.appendChild(paletteResetLegend);
      paletteResetButton.id = 'paletteReset';
      paletteResetButton.style.margin = '20px';
      
      const colorContainer = document.createElement('div');
      colorContainer.style["float"] = 'right';
      paletteSelectContainer.appendChild(paletteSelectLegend);
      paletteSelectContainer.appendChild(paletteSelectTrait);
      paletteSelectContainer.appendChild(colorContainer);
      paletteSelectContainer.appendChild(paletteSelectValue);
      
      const buttonContainer = document.createElement("div");
      buttonContainer.style["float"] = 'left';
      buttonContainer.style.marginBottom = '10px';
      buttonContainer.style.paddingTop = '65px';
      buttonContainer.appendChild(paletteSelectColor);
      buttonContainer.appendChild(paletteResetButton);
      
      tab.appendChild(traitSelectContainer);
      tab.appendChild(paletteSelectContainer);
      tab.appendChild(buttonContainer);
      
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
      colorLineSelect.appendChild(opt);
      sortLineSelect.appendChild(opt.cloneNode(true));
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