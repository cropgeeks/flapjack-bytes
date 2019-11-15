export default class Germplasm {
  constructor(name, genotypeData) {
    this.name = name;
    this.genotypeData = genotypeData;
  }

  dataFor(chromosomePositions) {
    const alleleData = [];
    chromosomePositions.forEach((chromosome) => {
      alleleData.push({ alleles: this.genotypeData[chromosome.chromosome].slice(chromosome.firstMarker, chromosome.lastMarker) });
    });

    return alleleData;
  }
}
