export default class DataSet {
  constructor(genomeMap, germplasmList) {
    this.genomeMap = genomeMap;
    this.germplasmList = germplasmList;
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

  markerCount() {
    return this.genomeMap.markerCount();
  }

  lineCount() {
    return this.germplasmList.length;
  }
}
