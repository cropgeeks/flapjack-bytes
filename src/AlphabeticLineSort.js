

export default function alphabeticLineSort(dataSet){
	return dataSet.germplasmList.sort((a, b) => (
		a.name < b.name ? -1 : (
			a.name > b.name ? 1 : 0)));
}