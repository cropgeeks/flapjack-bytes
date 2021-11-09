import {buildSimilarityLookupTable} from './Similarity'

export default class DataSet {
  constructor(genomeMap, germplasmList, stateTable, traits, phenotypes) {
    this.genomeMap = genomeMap;
    this.germplasmList = germplasmList;
    this.stateTable = stateTable;
    this.traits = traits;

    // Keep the importing order to allow getting back to it later on
    this.importingOrder = germplasmList.map(germplasm => germplasm.name);

    // Pre-compute the similarity matrix
    this.similarityLookupTable = buildSimilarityLookupTable(this.stateTable);

    
    if (this.traits !== undefined){
      // Pre-order the traits
      this.traitNames = Array.from(this.traits.keys());
      this.traitNames.sort();

      // Set the germplasms' traits
      this.germplasmList.forEach(germplasm => {
        germplasm.phenotype = phenotypes.get(germplasm.name);
      });
    } else {
      this.traitNames = undefined;
    }
  }

  germplasmFor(germplasmStart, germplasmEnd) {
    return this.germplasmList.slice(germplasmStart, germplasmEnd);
  }

  genotypeFor(germplasm, chromosome, marker) {
    return this.germplasmList[germplasm].genotypeData[chromosome][marker];
  }

  markersToRender(markerStart, markerEnd) {
    return this.genomeMap.chromosomePositionsFor(markerStart, markerEnd);
  }

  markersToRenderOn(chromosomeIndex, markerStart, markerEnd) {
    return this.genomeMap.markersToRenderOn(chromosomeIndex, markerStart, markerEnd);
  }

  markerAt(markerIndex) {
    return this.genomeMap.markerAt(markerIndex);
  }

  markerOn(chromosomeIndex, markerIndex) {
    return this.genomeMap.markerOn(chromosomeIndex, markerIndex);
  }

  chromosomeCount() {
    return this.genomeMap.chromosomes.length;
  }

  markerCountOn(chromosomeIndex) {
    return this.genomeMap.markerCountOn(chromosomeIndex);
  }

  markerCount() {
    return this.genomeMap.markerCount();
  }

  lineCount() {
    return this.germplasmList.length;
  }

  hasTraits(){
    return this.traits !== undefined;
  }

  getTrait(traitName) {
    return this.traits.get(traitName);
  }
}
