import {germplasmSimilarityScore} from '../Similarity'

export default class SimilarityLineSort {
  constructor(referenceName, chromosomeIndices){
    this.referenceName = referenceName;
    this.chromosomeIndices = chromosomeIndices;
    this.scoreMap = undefined;
    this.hasScore = true;
  }

  sort(dataSet){
    const referenceIndex = dataSet.germplasmListFiltered.findIndex(
      germplasm => germplasm.name == this.referenceName
    );

    this.scoreMap = new Map();

    for (let comparedIndex in dataSet.germplasmListFiltered){
      this.scoreMap.set(
        dataSet.germplasmListFiltered[comparedIndex].name,
        germplasmSimilarityScore(
          dataSet,
          referenceIndex,
          comparedIndex,
          this.chromosomeIndices,
        ),
      );
    }

    dataSet.germplasmListFiltered.sort((a, b) => {
      const aIsReference = a.name === this.referenceName;
      const bIsReference = b.name === this.referenceName;

      // Force reference line to absolute top
      if (aIsReference && !bIsReference){
        return -1;
      }

      if (!aIsReference && bIsReference){
        return 1;
      }

      const aScore = this.scoreMap.get(a.name);
      const bScore = this.scoreMap.get(b.name);

      return bScore - aScore;
    });
  }

  getScore(germplasmName){
    return this.scoreMap.get(germplasmName);
  }

  setComparisonLine(referenceName){
    this.referenceName = referenceName;
  }

  setChromosomes(chromosomeIndices){
    this.chromosomeIndices = chromosomeIndices
  }
}