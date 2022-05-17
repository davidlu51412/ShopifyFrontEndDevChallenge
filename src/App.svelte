<svelte:head>
	<link rel="stylesheet" href="https://unpkg.com/mono-icons@1.0.5/iconfont/icons.css" >
</svelte:head>
<script>
	import { getAIResponses } from "./helper/openAIFunctions"
	import { getCookie, setCookie, eraseAllCookies} from "./helper/cookieFunctions"
	import { fade } from 'svelte/transition';

	let inputText = "";
	
	let sampleSearches = ["write a speech...", "city life vs country life...", "mans best friend...", "proper eating habits...","thoughts on computer science...", "what is life...", "how to critque art...", "how to use chopsticks...", "best food in europe...", "how to build a house..."]
	const randomPlaceholder = () => {
		return sampleSearches[ Math.floor(Math.random() * sampleSearches.length)]
	}
	let sampleSearch=randomPlaceholder()
	
	let currCookie = getCookie("savedItems")



	let items = currCookie == null ? [] : JSON.parse(currCookie);


	const addItem = () => {
		let query = inputText;
		if (query.length == 0) query = sampleSearch.slice(0, -3)

		// getAIResponses(inputText).then((res) => {
			let res = "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Vivamus felis metus, maximus ac tempus euismod, convallis et ligula. Suspendisse non pharetra sapien, sed gravida leo. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Aenean dignissim mauris lacus, sed imperdiet arcu ullamcorper ac."
			items = [{
							id: items.length,
							prompt: query,
							result:res,
						},
						...items
					];
				inputText = "";
				sampleSearch=randomPlaceholder()
				document.getElementById("searchbox").focus();
				document.getElementById('results').scrollIntoView({ behavior: 'smooth', block: 'center' })
				setCookie("savedItems", JSON.stringify(items))
			// })
  };

	const clearAll = () => {
		document.getElementById('searchbox').scrollIntoView({ behavior: 'smooth', block: 'center' })
		setTimeout(() => {
			items = []
			inputText = ""
			eraseAllCookies()	
		}, 1000);
	}



	

</script>


<main>
	<div id="search-parent">
		<div class="search">
			<input id="searchbox"  placeholder={sampleSearch} autofocus bind:value={inputText}> 
			<button on:click={() => addItem()}><i class="mi mi-search navigation"></i></button>
		</div>
		<button on:click={() => document.getElementById('results').scrollIntoView({ behavior: 'smooth', block: 'center' })}>
			<i class="mi mi-chevron-down navigation"></i>
		</button>
	</div>

	<div id="results">
		<button on:click={() => document.getElementById('searchbox').scrollIntoView({ behavior: 'smooth', block: 'center' })}>
			<i class="mi mi-chevron-up navigation"></i>
		</button>
		<br>

		{#if items.length != 0}
			<div id="clear-searches">
				<button on:click={() => clearAll()}>
					X clear all
				</button>
			</div>
		{/if}

		{#each items as item}
			<div class="item-container">
					<p>{item.prompt.toUpperCase()}</p>
					<div class="item-result">{`"${item.result}"`}</div>
					<br>
					<div class="item-result"> <i class="item-result">&#8212 AI text-curie-001</i></div>
			</div>
		{/each}
		{#if items.length == 0}
				<p> Type anything you want in the search box to see what the AI has to say!</p>

		{/if}
	</div>

</main>

<style>

:global(body) {
		background-color: rgb(255, 249, 228);
	}
	#clear-searches{
		float: right;
		font-size: 10px;
		border:0;
		border-color: black;
		font-weight: 20;
		align-content: center;
		border-bottom: 1px solid rgb(228, 228, 228);
	}

	#results {
		height: 40vw;

	}

	.item-container {
		border-bottom: 1px solid black;
		padding: 3em;

	}

	.item-result {
		font-size: 20px;
		border:0;
		border-color: black;
		font-weight: 100;
	}

	.search {
		text-align: center;
		align-items: center;
		border-bottom:1px solid black;
		max-width: 3000px;
		margin: 0 auto;
	}
	#search-parent {
		height: 80vw;
		max-height: 80vw;
	}
	.navigation {
		font-size: 100px;
	}
	button {
		text-align: center;
		background-color: transparent;
		border: 0;
	}
	button:hover {
		cursor: pointer;
		color: rgb(137, 137, 137);
		background-color: transparent;
	}
	input {
		background-color: transparent;
		height: 200px;
		width: 80%;
		max-width: 2000px;
		font-size: 70px;
		border:0;
		border-color: black;
		font-weight: 100;
	}
	input:focus{
    outline: none;
	}

	p {
		font-size: 40px;
		border:0;
		border-color: black;
		font-weight: 100;
	}

	main {
		text-align: center;
		padding: 5em;
		max-width: 240px;
		margin: 0 auto;
	}

	@media (min-width: 640px) {
		main {
			max-width: none;
		}
	}

	
</style>