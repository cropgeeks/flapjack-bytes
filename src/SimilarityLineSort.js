import {germplasmSimilarityScore} from './Similarity'


export default class SimilarityLineSort {
  constructor(referenceName, chromosomeNames){
    this.referenceName = referenceName;
    this.chromosomeNames = chromosomeNames;
    this.scoreMap = undefined;
    this.hasScore = true;
  }

  sort(dataSet){
    const chromosomeIndices = this.chromosomeNames.map(name => 
      dataSet.genomeMap.chromosomes.findIndex(chromosome => chromosome.name == name));
    const referenceIndex = dataSet.germplasmList.findIndex(germplasm => germplasm.name == this.referenceName);

    this.scoreMap = new Map();
    for (let comparedIndex in dataSet.germplasmList){
      this.scoreMap.set(
        dataSet.germplasmList[comparedIndex].name,
        germplasmSimilarityScore(dataSet, referenceIndex, comparedIndex, chromosomeIndices),
      );
    }

    dataSet.germplasmList.sort((a, b) => this.scoreMap.get(b.name) - this.scoreMap.get(a.name));
  }

  getScore(germplasmName){
    return this.scoreMap.get(germplasmName);
  }

  setComparisonLine(referenceName){
    this.referenceName = referenceName;
  }

  setChromosomes(chromosomeNames){
    this.chromosomeNames = chromosomeNames
  }
}