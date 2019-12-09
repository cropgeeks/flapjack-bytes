export default class DataSet {
  constructor(genomeMap, germplasmList) {
    this.genomeMap = genomeMap;
    this.germplasmList = germplasmList;
  }

  mapDataFor(dataStart, dataEnd) {
    return this.genomeMap.markersFor(dataStart, dataEnd);
  }

  germplasmFor(germplasmStart, germplasmEnd) {
    return this.germplasmList.slice(germplasmStart, germplasmEnd);
  }

  // markersFor(dataStart, dataEnd) {
  //   const found = this.intervalTree.search(dataStart, dataEnd);
  //   const foundMarkers = [];
  //   found.forEach((chromosome) => {
  //     const chromStart = this.chromosomeStarts.get(chromosome);
  //     const firstMarker = Math.max(dataStart - chromStart, 0);
  //     const lastMarker = Math.min(chromosome.markerCount(), dataEnd - chromStart);
  //     foundMarkers.push({ markers: chromosome.markers.slice(firstMarker, lastMarker) });
  //   });

  //   return foundMarkers;
  // }

  genotypeDataFor(germplasmStart, germplasmEnd, markerStart, markerEnd) {
    const markersToRender = this.markersToRender(markerStart, markerEnd);
    const germplasmToRender = this.germplasmFor(germplasmStart, germplasmEnd);

    const genotypeData = [];
    germplasmToRender.forEach((germplasm) => {
      const germplasmGenotypeData = [];
      markersToRender.forEach((chromosome) => {
        germplasmGenotypeData.push({ genotypes: germplasm.genotypeData[chromosome.chromosomeIndex].slice(chromosome.firstMarker, chromosome.lastMarker) });
      });
      genotypeData.push({ name: germplasm.name, data: germplasmGenotypeData });
    });

    return genotypeData;
  }

  genotypeFor(germplasm, chromosome, marker) {
    return this.germplasmList[germplasm].genotypeData[chromosome][marker];
  }

  markersToRender(markerStart, markerEnd) {
    return this.genomeMap.chromosomePositionsFor(markerStart, markerEnd);
  }

  markerCount() {
    return this.genomeMap.markerCount();
  }

  lineCount() {
    return this.germplasmList.length;
  }
}
