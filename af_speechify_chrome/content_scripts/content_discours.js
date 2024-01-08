// contentScript.js
console.log('AF content script injected');

// Inject the button into the page
const anchor = document.querySelector('h1');

const fieldset = document.createElement('fieldset');
const legend = document.createElement('legend');
legend.textContent = 'Télécharger les documents';
fieldset.appendChild(legend);
anchor.appendChild(fieldset);

const extractButtonContainer = document.createElement('div');
extractButtonContainer.classList.add('extract-button-container');
fieldset.appendChild(extractButtonContainer);

const extractButton = document.createElement('button');
extractButton.id = 'extractButton';
extractButton.textContent = 'Extraire cette page';

const checkboxDiv = document.createElement('div');
const checkbox = document.createElement('input');
checkbox.type = 'checkbox';
checkbox.name = 'extractOption';
checkbox.id = 'extractOption';
const label = document.createElement('span');
label.htmlFor = 'extractOption';
label.appendChild(document.createTextNode('Tout extraire'));
checkboxDiv.appendChild(checkbox);
checkboxDiv.appendChild(label);

checkbox.addEventListener('change', function() {
	if (checkbox.checked) {
		console.log('Full extraction ahead');
		extractButton.textContent = 'Tout extraire';
		chrome.runtime.sendMessage({
			action: 'extractAll'
		})
	} else {
		console.log('Single page extraction');
		extractButton.textContent = 'Extraire cette page';
		chrome.runtime.sendMessage({
			action: 'extractPage'
		})
	}
});

extractButtonContainer.appendChild(extractButton);

// Create a container for the extraction message and spinner
const extractionContainer = document.createElement('div');
extractionContainer.id = 'extractionContainer';
extractionContainer.style.display = 'none'; // Hide initially
fieldset.appendChild(extractionContainer);

// Create the extraction message element
const extractionMessage = document.createElement('div');
extractionMessage.id = 'extractionMessage';
extractionMessage.textContent = 'Extraction en cours…';
extractionContainer.appendChild(extractionMessage);

// const lastPageUrl = new URL(document.querySelector('.pager-last a').getAttribute('href'), 'https://www.academie-francaise.fr').href;
const lastPageButton = document.querySelector('.pager-last a')
if (lastPageButton) {
	extractButton.before(checkboxDiv);
	lastPageUrl = lastPageButton.getAttribute('href');
	console.log('Last page URL = ', lastPageUrl);
	const lastPageUrlSegments = lastPageUrl.split('\?');
	const queryString = '\?' + lastPageUrlSegments[1];
	console.log('Query string = ', queryString);
	const urlParams = new URLSearchParams(queryString);
	console.log('URL parameters: ', urlParams);
	let lastPageNo = urlParams.get("page");
	if (lastPageNo !== null) {
		console.log('Number of last page = ', lastPageNo);
	} else {
		console.error('Last page number is null or has unexpected value: ', lastPageNo);
	}
	const totalPageNo = ++lastPageNo;
	console.log('Total number of pages = ', totalPageNo);
	label.textContent = `Tout extraire (${totalPageNo} pages)`;
	
	updateRange();

	function updateRange() {
		console.log('updateRange function invoked');
		let port;
		chrome.runtime.onConnect.addListener(connect);
		function connect(p) {
			port = p;
			console.assert(port.name === 'backgroundjs');
			port.onMessage.addListener((msg) => respond(msg));
			function respond(msg) {
				if (msg) {
					extractionMessage.textContent = msg + ' sur ' + totalPageNo;
				} else {
					console.error('No message from background');
				}
			}
		}
	}
} else {
	console.log('Only one page to extract');
}

// Create the loading spinner element
const spinner = document.createElement('div');
spinner.classList.add('spinner'); // Add a class for styling
extractionContainer.appendChild(spinner);

// Create the abort button
const abortButton = document.createElement('button');
abortButton.classList.add('abort-button');
abortButton.textContent = 'Annuler';
abortButton.addEventListener('click', () => {
	console.log('Abort button clicked');
	abortButton.textContent = 'Annulation en cours...'
	chrome.runtime.sendMessage({
		action: 'abortExtraction'
	}, response => {
		console.log('Extraction aborted');
	})
});
fieldset.appendChild(abortButton);

// Create container for downloaded files list
const downloadedFilesContainer = document.createElement('div');
downloadedFilesContainer.classList.add('fileList');
downloadedFilesContainer.style.display = 'none';
fieldset.appendChild(downloadedFilesContainer);

// Message passing to notify the background script when the button is clicked
extractButton.addEventListener('click', () => {
  
  // Hide extraction buttons and show abort button
  extractButtonContainer.style.display = 'none';
  abortButton.style.display = 'inline';
  
  // Show the extraction container
  extractionContainer.style.display = 'block';
	downloadedFilesContainer.textContent = '';
    downloadedFilesContainer.style.display = 'none';

	chrome.runtime.sendMessage({ action: 'performExtraction', url: window.location.href }, response => {
	  console.log('Response object:', response); // Log the entire response object

	  // Hide the extraction container
	  extractionContainer.style.display = 'none';
	  
	  //Reset abort button
	  abortButton.style.display = 'none';
	  abortButton.textContent = 'Annuler';
	  
	  // Restore extraction buttons
	  extractButtonContainer.style.display = 'inline-block';

	  if (response.success) {
		// Display the downloaded files
		downloadedFilesContainer.style.display = 'block';
		let firstFiles = response.addedFileNames.slice(0, 20);
		downloadedFilesContainer.textContent = `Fini !\n${response.addedFileNames.length} fichiers téléchargés :\n${firstFiles.join(', ')}...`;
	  } else {
		console.error('Error:', response.error);
		// Handle error
	  }
	});

});
