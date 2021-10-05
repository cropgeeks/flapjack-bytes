import {buildSimilarityLookupTable} from './Similarity'

export default class DataSet {
  constructor(genomeMap, germplasmList, stateTable, lineSort) {
    this.genomeMap = genomeMap;
    this.germplasmList = germplasmList;
    this.importingOrder = germplasmList.map(germplasm => germplasm.name);
    this.stateTable = stateTable;
    this.similarityLookupTable = buildSimilarityLookupTable(this.stateTable);
    this.reorderGermplasms(lineSort);
  }

  reorderGermplasms(lineSort){
    this.lineSort = lineSort;
    lineSort(this);
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

  markerAt(markerIndex) {
    return this.genomeMap.markerAt(markerIndex);
  }

  chromosomeCount() {
    return this.genomeMap.chromosomes.length;
  }

  markerCount() {
    return this.genomeMap.markerCount();
  }

  lineCount() {
    return this.germplasmList.length;
  }
}
