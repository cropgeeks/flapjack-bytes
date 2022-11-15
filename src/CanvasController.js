import {TraitType} from './Trait.js'
import AlphabeticLineSort from './sort/AlphabeticLineSort'
import SimilarityLineSort from './sort/SimilarityLineSort'
import ImportingOrderLineSort from './sort/ImportingOrderLineSort'
import TraitLineSort from './sort/TraitLineSort'
import NucleotideColorScheme from './color/NucleotideColorScheme'
import SimilarityColorScheme from './color/SimilarityColorScheme'


export default class CanvasController {
  constructor(container, genotypeCanvas, overviewCanvas, saveSettings, genotypeAutoWidth, overviewAutoWidth, minGenotypeAutoWidth, minOverviewAutoWidth) {
    this.canvasContainer = container;
    this.genotypeCanvas = genotypeCanvas;
    this.overviewCanvas = overviewCanvas;
    this.genotypeAutoWidth = genotypeAutoWidth === undefined ? false : genotypeAutoWidth;
    this.overviewAutoWidth = overviewAutoWidth === undefined ? false : overviewAutoWidth;
    this.minGenotypeAutoWidth = minGenotypeAutoWidth === undefined ? 0 : minGenotypeAutoWidth;
    this.minOverviewAutoWidth = minOverviewAutoWidth === undefined ? 0 : minOverviewAutoWidth;
    this.saveSettings = saveSettings;

    this.chromosomeIndex = 0;
    this.dragStartX = null;
    this.dragStartY = null;
    this.draggingGenotypeCanvas = false;
    this.draggingVerticalScrollbar = false;
    this.draggingHorizontalScrollbar = false;
    this.draggingOverviewCanvas = false;
    this.contextMenuY = null;
  }

  init(dataSet) {
    this.dataSet = dataSet;
    const settings = this.loadDefaultSettings(this.dataSet.id);

    if (settings.traitColors != null && this.dataSet.hasTraits()) {
      for (let traitName in settings.traitColors) {
        const trait = this.dataSet.getTrait(traitName);
        if (trait !== undefined) {
          for (let value in settings.traitColors[traitName])
            trait.setHSVColor(parseFloat(value), settings.traitColors[traitName][value]);
        }
      }
    }

    // Initialize the components
    this.genotypeCanvas.init(dataSet, settings);
    this.genotypeCanvas.prerender(true);
    this.overviewCanvas.init(dataSet, settings, this.genotypeCanvas.visibilityWindow());
    this.overviewCanvas.prerender(true);

    this.updateAutoWidth();

    window.addEventListener("resize", event => {
      this.updateAutoWidth();
    });

    // Color schemes
    const nucleotideRadio = document.getElementById('nucleotideScheme');
    if (settings.colorSchemeId == "nucleotide")
      nucleotideRadio.checked = true;
    nucleotideRadio.addEventListener('change', () => {
      const lineSelect = document.getElementById('colorLineSelect');
      lineSelect.disabled = true;

      let colorScheme = new NucleotideColorScheme(this.genotypeCanvas.dataSet);
      colorScheme.setupColorStamps(this.genotypeCanvas.boxSize, this.genotypeCanvas.font, this.genotypeCanvas.fontSize);
      this.genotypeCanvas.setColorScheme(colorScheme);
      this.overviewCanvas.setColorScheme(colorScheme);

      this.saveSetting("colorScheme", "nucleotide");
    });

    const similarityRadio = document.getElementById('similarityScheme');
    const lineSelect = document.getElementById('colorLineSelect');
    if (settings.colorSchemeId == "similarity") {
      similarityRadio.checked = true;
      lineSelect.disabled = false;
      lineSelect.value = settings.colorReference;
    }
    similarityRadio.addEventListener('change', () => {
      const lineSelect = document.getElementById('colorLineSelect');
      lineSelect.disabled = false;

      const referenceName = lineSelect.options[lineSelect.selectedIndex].value;
      const referenceIndex = this.genotypeCanvas.dataSet.germplasmList.findIndex(germplasm => germplasm.name == referenceName)
      
      let colorScheme = new SimilarityColorScheme(this.genotypeCanvas.dataSet, referenceIndex);
      colorScheme.setupColorStamps(this.genotypeCanvas.boxSize, this.genotypeCanvas.font, this.genotypeCanvas.fontSize);
      this.genotypeCanvas.setColorScheme(colorScheme);
      this.genotypeCanvas.setColorComparisonLine(referenceName);
      this.overviewCanvas.setColorScheme(colorScheme);
      this.saveSetting("colorReference", referenceName);

      this.saveSetting("colorScheme", "similarity");
    });

    lineSelect.addEventListener('change', (event) => {
      const reference = event.target.options[event.target.selectedIndex].value;
      this.genotypeCanvas.setColorComparisonLine(reference);
      this.overviewCanvas.prerender(true);

      this.saveSetting("colorReference", reference);
    });

    // Sort
    const sortLineSelect = document.getElementById('sortLineSelect');
    const sortTraitSelect = document.getElementById('sortTraitSelect');

    const importingOrderRadio = document.getElementById('importingOrderSort');
    if (settings.lineSortId == "importing")
      importingOrderRadio.checked = true;
    importingOrderRadio.addEventListener('change', () => {
      sortLineSelect.disabled = true;
      if (sortTraitSelect !== null) sortTraitSelect.disabled = true;
      this.setLineSort(new ImportingOrderLineSort());
      this.saveSetting("sort", "importing");
    });

    const alphabetOrderRadio = document.getElementById('alphabeticSort');
    if (settings.lineSortId == "alphabetic")
      alphabetOrderRadio.checked = true;
    alphabetOrderRadio.addEventListener('change', () => {
      sortLineSelect.disabled = true;
      if (sortTraitSelect !== null) sortTraitSelect.disabled = true;
      this.setLineSort(new AlphabeticLineSort());
      this.saveSetting("sort", "alphabetic");
    });

    const similarityOrderRadio = document.getElementById('similaritySort');
    if (settings.lineSortId == "similarity") {
      similarityOrderRadio.checked = true;
      sortLineSelect.disabled = false;
      sortLineSelect.value = settings.sortReference;
    }
    similarityOrderRadio.addEventListener('change', () => {
      sortLineSelect.disabled = false;
      if (sortTraitSelect !== null) sortTraitSelect.disabled = true;
      
      const referenceName = sortLineSelect.options[sortLineSelect.selectedIndex].value;
      this.setLineSort(new SimilarityLineSort(referenceName, [this.chromosomeIndex]));
      this.saveSetting("sort", "similarity");
      this.saveSetting("sortReference", referenceName);
    });

    sortLineSelect.addEventListener('change', (event) => {
      if (!sortLineSelect.disabled){
        const referenceName = sortLineSelect.options[sortLineSelect.selectedIndex].value;
        this.setLineSort(new SimilarityLineSort(referenceName, [this.chromosomeIndex]));
        this.saveSetting("sortReference", referenceName);
      }
    });

    if (dataSet.hasTraits()) {
      const traitOrderRadio = document.getElementById('traitSort');
      if (settings.lineSortId == "trait") {
        traitOrderRadio.checked = true;
        sortTraitSelect.disabled = false;
        sortTraitSelect.value = settings.sortReference;
      }
      traitOrderRadio.addEventListener('change', () => {
        sortLineSelect.disabled = true;
        sortTraitSelect.disabled = false;
        
        const traitName = sortTraitSelect.options[sortTraitSelect.selectedIndex].value;
        this.setLineSort(new TraitLineSort(traitName));
        this.saveSetting("sort", "trait");
        this.saveSetting("sortReference", traitName);
      });

      sortTraitSelect.addEventListener('change', (event) => {
        if (!sortTraitSelect.disabled){
          const traitName = sortTraitSelect.options[sortTraitSelect.selectedIndex].value;
          this.setLineSort(new TraitLineSort(traitName));
          this.saveSetting("sortReference", traitName);
        }
      });

      const displayTraitSelect = document.getElementById('displayTraitSelect');
      displayTraitSelect.addEventListener('change', (event) => {
        let displayTraits = [];
        for (let option of displayTraitSelect){
          if (option.selected)
            displayTraits.push(option.value);
        }
        this.genotypeCanvas.setDisplayTraits(displayTraits);
        this.saveSetting("displayTraits", displayTraits.join(";"));
      });

      // Trait palettes
      const paletteTraitSelect = document.getElementById('paletteTrait');
      const paletteValueSelect = document.getElementById('paletteValue');
      const paletteValueColor = document.getElementById('paletteColor');
      const paletteResetButton = document.getElementById('paletteReset');

      this.dataSet.traitNames.forEach(traitName => {
        const opt = document.createElement('option');
        opt.value = traitName;
        opt.text = traitName;
        paletteTraitSelect.add(opt);
      });

      paletteTraitSelect.addEventListener('change', event => {
        const traitName = paletteTraitSelect.options[paletteTraitSelect.selectedIndex].value;
        const trait = this.dataSet.getTrait(traitName);
        let traitOptions = null;
        if (trait.type == TraitType.Numerical) {
          traitOptions = ['min : ' + trait.minValue, 'max : ' + trait.maxValue];
        } else {
          traitOptions = trait.getValues();
        }
        
        // Clear the select list
        for (let i = paletteValueSelect.options.length - 1; i >= 0; i--)
          paletteValueSelect.remove(i);

        for (let value of traitOptions) {
          const opt = document.createElement('option');
          opt.value = value;
          opt.text = value;
          paletteValueSelect.add(opt);
        }
        paletteValueSelect.selectedIndex = 0;
        paletteValueSelect.dispatchEvent(new Event('change'));
      });
      paletteTraitSelect.value = this.dataSet.traitNames[0];
      paletteTraitSelect.dispatchEvent(new Event('change'));

      paletteValueSelect.addEventListener('change', event => {
        const traitName = paletteTraitSelect.options[paletteTraitSelect.selectedIndex].value;
        const trait = this.dataSet.getTrait(traitName);
        let color = null;
        if (trait.type == TraitType.Numerical){
          const index = paletteValueSelect.selectedIndex;
          color = (index == 0 ? trait.getMinColor() : trait.getMaxColor());
        } else {
          color = trait.getColor(paletteValueSelect.selectedIndex);
        }
        paletteValueColor.value = color;
      });
      paletteValueSelect.dispatchEvent(new Event('change'));

      paletteValueColor.addEventListener('change', event => {
        const traitName = paletteTraitSelect.options[paletteTraitSelect.selectedIndex].value;
        const trait = this.dataSet.getTrait(traitName);
        const color = paletteValueColor.value;
        if (trait.type == TraitType.Numerical){
          const index = paletteValueSelect.selectedIndex;
          if (index == 0)
            trait.setMinColor(color);
          else
            trait.setMaxColor(color);
        } else {
          trait.setColor(paletteValueSelect.selectedIndex, color);
        }
        this.genotypeCanvas.prerender(true);
        this.saveColors();
      });

      paletteResetButton.addEventListener('click', event => {
        const traitName = paletteTraitSelect.options[paletteTraitSelect.selectedIndex].value;
        const trait = this.dataSet.getTrait(traitName);
        trait.resetColors();
        this.genotypeCanvas.prerender(true);
        paletteValueSelect.dispatchEvent(new Event('change'));
        this.saveColors();
      })
    }

    // Set the canvas controls only once we have a valid data set and color scheme
    // If they are set in the constructor, moving the mouse above the canvas before
    // the loading is complete throws errors

    // Genotype canvas control
    this.genotypeCanvas.canvas.addEventListener('mousedown', (e) => {
      // The following block of code is used to determine if we are scrolling
      // using the scrollbar widget, rather than grabbing the canvas
      const { x, y } = this.getGenotypeMouseLocation(e.clientX, e.clientY);

      const { verticalScrollbar, horizontalScrollbar } = this.genotypeCanvas;

      if (this.isOverVerticalScrollbar(x, verticalScrollbar)) {
        // Flag to remember that the scrollbar widget was initially clicked on
        // which prevents mouse drift prematurely stopping scrolling from happening
        this.draggingVerticalScrollbar = true;
        this.dragVerticalScrollbar(e.clientY);
      } else if (this.isOverHorizontalScrollbar(y, horizontalScrollbar)) {
        // Flag to remember that the scrollbar widget was initially clicked on
        // which prevents mouse drift prematurely stopping scrolling from happening
        this.draggingHorizontalScrollbar = true;
        this.dragHorizontalScrollbar(e.clientX);
      } else {
        // We are scrolling by grabbing the canvas directly
        this.dragStartX = e.pageX;
        this.dragStartY = e.pageY;
        this.draggingGenotypeCanvas = true;
      }
    });

    this.genotypeCanvas.canvas.addEventListener('mousemove', (e) => {
      const mousePos = this.getGenotypeMouseLocation(e.clientX, e.clientY);
      this.genotypeCanvas.mouseOver(mousePos.x, mousePos.y);
    });

    this.genotypeCanvas.canvas.addEventListener('mouseleave', () => {
      this.genotypeCanvas.mouseOver(undefined, undefined);
    });

    // Overview canvas control
    this.overviewCanvas.canvas.addEventListener('mousedown', (event) => {
      this.setOverviewPosition(event.clientX, event.clientY);
    });

    // Other events
    window.addEventListener('mouseup', () => {
      this.draggingGenotypeCanvas = false;
      this.draggingVerticalScrollbar = false;
      this.draggingHorizontalScrollbar = false;
      this.draggingOverviewCanvas = false;
    });

    window.addEventListener('mousemove', (e) => {
      if (this.draggingVerticalScrollbar) {
        this.dragVerticalScrollbar(e.clientY);
      } else if (this.draggingHorizontalScrollbar) {
        this.dragHorizontalScrollbar(e.clientX);
      } else if (this.draggingGenotypeCanvas) {
        this.dragCanvas(e.pageX, e.pageY);
      } else if (this.draggingOverviewCanvas) {
        this.setOverviewPosition(e.clientX, e.clientY);
      }
    });
  }

  setLineSort(lineSort){
    this.disableCanvas();

    // Yield control to the browser to make a render (to show the grey overlay)
    setTimeout(() => {
      this.genotypeCanvas.setLineSort(lineSort);
      this.overviewCanvas.prerender(true);
      this.enableCanvas();
    }, 4);
  }

  updateAutoWidth() {
    const computedStyles = window.getComputedStyle(this.canvasContainer);
    const autoWidth = this.canvasContainer.clientWidth - parseInt(computedStyles.paddingLeft) - parseInt(computedStyles.paddingRight);
    
    if (this.genotypeAutoWidth){
      const genotypeWidth = Math.max(autoWidth, this.minGenotypeAutoWidth);
      this.genotypeCanvas.setAutoWidth(genotypeWidth);
    }

    if (this.overviewAutoWidth){
      const overviewWidth = Math.max(autoWidth, this.minOverviewAutoWidth);
      this.overviewCanvas.setAutoWidth(overviewWidth);
    }

    // Update the visibilityWindow
    const position = this.genotypeCanvas.currentPosition();
    this.overviewCanvas.moveToPosition(position.marker, position.germplasm, this.genotypeCanvas.visibilityWindow());
  }

  setChromosome(chromosomeIndex) {
    this.chromosomeIndex = chromosomeIndex;
    this.genotypeCanvas.setChromosome(chromosomeIndex);
    this.overviewCanvas.setChromosome(chromosomeIndex);
    this.overviewCanvas.moveToPosition(0, 0, this.genotypeCanvas.visibilityWindow());
  }

  disableCanvas() {
    this.genotypeCanvas.disable();
    this.overviewCanvas.disable();
  }

  enableCanvas(self) {
    this.genotypeCanvas.enable();
    this.overviewCanvas.enable();
  }

  getGenotypeMouseLocation(clientX, clientY) {
    const rect = this.genotypeCanvas.canvas.getBoundingClientRect();
    const x = (clientX - rect.left) / (rect.right - rect.left) * this.genotypeCanvas.canvas.width;
    const y = (clientY - rect.top) / (rect.bottom - rect.top) * this.genotypeCanvas.canvas.height;

    return { x, y };
  }

  getOverviewMouseLocation(clientX, clientY) {
    const rect = this.overviewCanvas.canvas.getBoundingClientRect();
    const x = (clientX - rect.left) / (rect.right - rect.left) * this.overviewCanvas.canvas.width;
    const y = (clientY - rect.top) / (rect.bottom - rect.top) * this.overviewCanvas.canvas.height;

    return { x, y };
  }

  isOverVerticalScrollbar(x, verticalScrollbar) {
    return x >= verticalScrollbar.x && x <= verticalScrollbar.x + verticalScrollbar.widget.width;
  }

  isOverHorizontalScrollbar(y, horizontalScrollbar) {
    return y >= horizontalScrollbar.y && y <= horizontalScrollbar.y + horizontalScrollbar.widget.height;
  }

  dragVerticalScrollbar(clientY) {
    // Grab various variables which allow us to calculate the y coordinate
    // relative to the allele canvas
    const rect = this.genotypeCanvas.canvas.getBoundingClientRect();
    const alleleCanvasHeight = this.genotypeCanvas.alleleCanvasHeight();
    const { mapCanvasHeight } = this.genotypeCanvas;
    const rectTop = (rect.top + mapCanvasHeight);
    // Calculate the y coordinate of the mouse on the allele canvas
    const y = (clientY - rectTop) / (rect.bottom - rectTop) * alleleCanvasHeight;
    // Move the vertical scrollbar to coordinate y
    const newPosition = this.genotypeCanvas.dragVerticalScrollbar(y);

    this.overviewCanvas.moveToPosition(newPosition.marker, newPosition.germplasm, this.genotypeCanvas.visibilityWindow());
  }

  dragHorizontalScrollbar(clientX) {
    // Grab various variables which allow us to calculate the x coordinate
    // relative to the allele canvas
    const rect = this.genotypeCanvas.canvas.getBoundingClientRect();
    const alleleCanvasWidth = this.genotypeCanvas.alleleCanvasWidth();
    const { nameCanvasWidth } = this.genotypeCanvas;
    const rectLeft = (rect.left + nameCanvasWidth);
    // Calculate the x coordinate of the mouse on the allele canvas
    const x = (clientX - rectLeft) / (rect.right - rectLeft) * alleleCanvasWidth;
    // Move the vertical scrollbar to coorodinate x
    const newPosition = this.genotypeCanvas.dragHorizontalScrollbar(x);

    this.overviewCanvas.moveToPosition(newPosition.marker, newPosition.germplasm, this.genotypeCanvas.visibilityWindow())
  }

  dragCanvas(x, y) {
    const diffX = x - this.dragStartX;
    const diffY = y - this.dragStartY;
    this.dragStartX = x;
    this.dragStartY = y;

    const newPosition = this.genotypeCanvas.move(diffX, diffY);

    this.overviewCanvas.moveToPosition(newPosition.marker, newPosition.germplasm, this.genotypeCanvas.visibilityWindow());
  }

  // Set the position of the visibility window on the overview canvas
  // The coordinates of the mouse are the center of the window
  setOverviewPosition(clientX, clientY) {
    const mousePos = this.getOverviewMouseLocation(clientX, clientY);
    const genotypePosition = this.overviewCanvas.mouseDrag(mousePos.x, mousePos.y, this.genotypeCanvas.visibilityWindow());
    this.genotypeCanvas.moveToPosition(genotypePosition.marker, genotypePosition.germplasm);
    this.draggingOverviewCanvas = true;
  }

  saveSetting(key, value) {
    if (this.saveSettings) {
      const mangledKey = "_fj-bytes::" + this.dataSet.id + "::" + key;
      localStorage.setItem(mangledKey, value);
    }
  }

  loadSetting(key) {
    const mangledKey = "_fj-bytes::" + this.dataSet.id + "::" + key;
    return localStorage.getItem(mangledKey);
  }

  saveColors() {
    if (this.saveSettings) {
      const jsonColors = {};
      for (let traitName of this.dataSet.traitNames) {
        const customColors = this.dataSet.getTrait(traitName).getCustomColors();
        if (customColors.size > 0)
          jsonColors[traitName] = Object.fromEntries(customColors);
      }
      this.saveSetting('traitColors', JSON.stringify(jsonColors));
    }
  }

  loadDefaultSettings() {
    const sortId = this.loadSetting("sort");
    const sortReference = this.loadSetting("sortReference");
    const colorSchemeId = this.loadSetting("colorScheme");
    const colorReference = this.loadSetting("colorReference");
    const displayTraits = this.loadSetting("displayTraits");
    const customColors = this.loadSetting("traitColors");

    let settings = {
      colorReference, sortReference,
      displayTraits: (displayTraits == null ? this.dataSet.traitNames : displayTraits.split(";")),
      lineSort: new ImportingOrderLineSort(),
      lineSortId: "importing",
      colorScheme: new NucleotideColorScheme(this.dataSet),
      colorSchemeId: "nucleotide",
      traitColors: (customColors == null ? {} : JSON.parse(customColors)),
    };
    
    // We use trait values as keys in inner arrays for persisting to Local-storage, so we need to convert those back to list indexes on reload
	Object.entries(settings.traitColors).forEach(([traitName, colorByValue]) => Object.entries(colorByValue)
		.forEach(([traitValue, traitValueColor]) => {
										var traitValueIndex = this.dataSet.traits.get(traitName).values.indexOf(traitValue), traitColorMap = settings.traitColors[traitName];
										if (traitValueIndex != -1)
											traitColorMap[traitValueIndex] = traitValueColor;
										delete traitColorMap[traitValue];
									}
	));

    switch (sortId) {
      case "importing":
        settings.lineSort = new ImportingOrderLineSort();
        settings.lineSortId = "importing";
        break;
      case "alphabetic":
        settings.lineSort = new AlphabeticLineSort();
        settings.lineSortId = "alphabetic";
        break;
      case "trait":
        if (this.dataSet.hasTraits() && this.dataSet.getTrait(sortReference) !== undefined) {
          settings.lineSort = new TraitLineSort(sortReference);
          settings.lineSortId = "trait";
        }
        break;
      case "similarity":
        if (this.dataSet.germplasmList.find(germplasm => germplasm.name == sortReference) !== undefined) {
          settings.lineSort = new SimilarityLineSort(sortReference, [this.chromosomeIndex]);
          settings.lineSortId = "similarity";
        }
        break;
      default:
    }

    switch (colorSchemeId) {
      case "nucleotide":
        settings.colorScheme = new NucleotideColorScheme(this.dataSet);
        settings.colorSchemeId = "nucleotide";
        break;
      case "similarity":
        const referenceIndex = this.dataSet.germplasmList.findIndex(germplasm => germplasm.name == colorReference)
        if (referenceIndex !== undefined && referenceIndex != -1) {
          settings.colorScheme = new SimilarityColorScheme(this.dataSet, referenceIndex);
          settings.colorSchemeId = "similarity";
        }
        break;
    }

    return settings;
  }
}
