import {germplasmSimilarityScore} from './Similarity'


// Return a function to sort germplasms by similarity to a given line
export default function similarityLineSort(referenceIndex, chromosomes){
  return function (dataSet){
    let similarityMap = new Map();
    for (let comparedIndex in dataSet.germplasmList){
      similarityMap.set(
        dataSet.germplasmList[comparedIndex].name,
        germplasmSimilarityScore(dataSet, referenceIndex, comparedIndex, chromosomes),
      );
    }

    dataSet.germplasmList.sort((a, b) => similarityMap.get(b.name) - similarityMap.get(a.name));
  };
}