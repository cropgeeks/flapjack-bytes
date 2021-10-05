

// Return a function to sort germplasms alphabetically by name
export default function alphabeticLineSort(){
	return dataSet => {
		dataSet.germplasmList.sort((a, b) => (
			a.name < b.name ? -1 : (
				a.name > b.name ? 1 : 0)));
	}
}