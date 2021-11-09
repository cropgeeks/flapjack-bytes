export default class Germplasm {
  constructor(name, genotypeData, phenotype) {
    this.name = name;
    this.genotypeData = genotypeData;
    this.phenotype = phenotype;
  }

  getPhenotype(traitName) {
    if (this.phenotype !== undefined)
      return this.phenotype.get(traitName);
  }
}
