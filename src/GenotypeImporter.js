import Genotype from './Genotype';
import Germplasm from './Germplasm';
import Marker from './Marker';
import GenomeMap from './GenomeMap';
import Chromosome from './Chromosome';

export default class GenotypeImporter {
  constructor(genomeMap) {
    this.rawToIndexMap = new Map();
    this.rawToIndexMap.set('', 0);
    this.rawToIndexMap.set('-', 0);

    this.stateTable = new Map();
    this.stateTable.set(Genotype.fromString(''), 0);

    this.genomeMap = genomeMap;
    this.markerIndices = new Map();
    this.germplasmList = [];
  }

  getState(genoString) {
    let index = 0;
    try {
      index = this.rawToIndexMap.get(genoString);

      // New genotype, so add it to the stateTable and set its index to the size of the map
      if (index === undefined){
        const genotype = Genotype.fromString(genoString);
        index = this.stateTable.size;
        this.stateTable.set(genotype, index);
        this.rawToIndexMap.set(genoString, index);
      }
    } catch (error) {
      console.error(error);
    }
    return index;
  }

  initGenotypeData() {
    const data = [];
    this.genomeMap.chromosomes.forEach((chromosome) => {
      data.push(Array(chromosome.markerCount()).fill(0));
    });

    return data;
  }

  processFileLine(line, markerNameMap) {
    if (line.startsWith('#') || (!line || line.length === 0)) {
      return;
    }

    if (line.startsWith('Accession') || line.startsWith('\t')) {
      const markerNames = line.split('\t');

      // Get the position from the precomputed name -> position map 
      markerNames.slice(1).forEach((name, idx) => {
        const indices = markerNameMap.get(name);
        this.markerIndices.set(idx, indices);
      });
      // TODO: write code to deal with cases where we don't have a map here...
      // console.log(this.genomeMap.totalMarkerCount());
    } else {
      const tokens = line.split('\t');
      const lineName = tokens[0];
      const genotypeData = this.initGenotypeData();
      tokens.slice(1).forEach((state, idx) => {
        const indices = this.markerIndices.get(idx);
        if (indices !== undefined && indices !== -1) {
          genotypeData[indices.chromosome][indices.markerIndex] = this.getState(state);
        }
      });

      const germplasm = new Germplasm(lineName, genotypeData);
      this.germplasmList.push(germplasm);
    }
  }

  parseFile(fileContents, advancementCallback, completionCallback) {
    var b4 = Date.now();

    // Pre-mapping the marker names to their position for faster loading
    let markerNameMap = new Map();
    this.genomeMap.chromosomes.forEach((chromosome, chromosomeIndex) => {
      chromosome.markers.forEach((marker, markerIndex) => {
        markerNameMap.set(marker.name, {chromosome: chromosomeIndex, markerIndex});
      });
    });

    this.processedLines = 0;
    const lines = fileContents.split(/\r?\n/);
    this.totalLineCount = lines.length;
    let currentLine = 0;
    let self = this;

    // Give the browser some time to keep the page alive between the parsing of each line
    // Avoid a complete freeze during a large file load
    // This leaves a few milliseconds between the parsing of each line for the browser to refresh itself
    // This calls recursively and asynchronously the parsing of the following line
    // In order to get a single promise that returns only once all the lines have been parsed
    function doLine(line) {
      return new Promise(function (resolve, reject){
        self.processFileLine(lines[line], markerNameMap);
        self.processedLines += 1;
        if (advancementCallback)
          advancementCallback(self.processedLines / self.totalLineCount);
        
        if (line + 1 < self.totalLineCount){
          // Let the browser do its things for a few milliseconds, run the next lines (recursively),
          // and return once they are done
          setTimeout(function (){
            doLine(line + 1).then(resolve);
          }, 2);
        } else {  // Finish
          resolve();
        }
      });
    }

    return doLine(0).then(function (results){
      if (completionCallback) completionCallback();
      console.log("parseFile took " + (Date.now() - b4) + "ms");
      return self.germplasmList;
    })
  }

  // In situations where a map hasn't been provided, we want to create a fake or
  // dummy map one chromosome and evenly spaced markers
  createFakeMap(fileContents) {
    const lines = fileContents.split(/\r?\n/);
    for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
      const line = lines[lineIndex];

      if (!line.startsWith('#')) {
        if (line.startsWith('Accession') || line.startsWith('\t')) {
          const markers = [];
          const markerNames = line.split('\t');

          // Use the genotype data format's header line to map marker names to
          // a 0 to length range of indices which double up as marker positions
          // for mapless loading
          markerNames.slice(1).forEach((name, idx) => {
            const marker = new Marker(name, 'unmapped', idx);
            markers.push(marker);
          });

          const chromosomes = [];
          chromosomes.push(new Chromosome('unmapped', markers.length, markers));
          this.genomeMap = new GenomeMap(chromosomes);

          return this.genomeMap;
        }
      }
    }
    return this.genomeMap;
  }

  // A method to create a fake map from BrAPI variantset calls
  createFakeMapFromVariantSets(variantSetCalls) {
    const firstGenoName = variantSetCalls[0].callSetName;
    const firstGenoCalls = variantSetCalls.filter(v => v.callSetName === firstGenoName).map(v => v.markerName);
    // Make sure we only have unique markerNames
    const markerNames = [...new Set(firstGenoCalls)];

    const markers = [];
    markerNames.forEach((name, idx) => {
      const marker = new Marker(name, 'unmapped', idx);
      markers.push(marker);
    });

    const chromosomes = [];
    chromosomes.push(new Chromosome('unmapped', markers.length, markers));
    this.genomeMap = new GenomeMap(chromosomes);

    return this.genomeMap;
  }

  // A method which converts BrAPI variantSetsCalls into Flapjack genotypes for
  // rendering
  parseVariantSetCalls(variantSetsCalls) {
    const genoNames = new Set(variantSetsCalls.map(v => v.lineName));

    genoNames.forEach((name) => {
      const genoCalls = variantSetsCalls.filter(v => v.lineName === name);

      if (this.markerIndices.size === 0) {
        genoCalls.forEach((call, idx) => {
          const indices = this.genomeMap.markerByName(call.markerName);
          if (indices !== -1) {
            this.markerIndices.set(idx, indices);
          }
        });
      }

      const genotypeData = this.initGenotypeData();
      genoCalls.forEach((call, idx) => {
        const indices = this.markerIndices.get(idx);
        if (indices !== undefined && indices !== -1) {
          genotypeData[indices.chromosome][indices.markerIndex] = this.getState(call.allele);
        }
      });
      const germplasm = new Germplasm(name, genotypeData);
      this.germplasmList.push(germplasm);
    });

    return this.germplasmList;
  }
}
