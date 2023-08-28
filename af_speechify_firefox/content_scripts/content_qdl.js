// contentScript.js

// Inject the button into the page
const anchor = document.querySelector('h1');
const extractButton = document.createElement('button');
extractButton.id = 'extractButton';
extractButton.textContent = 'Extraire';
anchor.appendChild(extractButton);

// Create a container for the extraction message and spinner
const extractionContainer = document.createElement('div');
extractionContainer.id = 'extractionContainer';
extractionContainer.style.display = 'none'; // Hide initially
anchor.appendChild(extractionContainer);

// Create the extraction message element
const extractionMessage = document.createElement('div');
extractionMessage.id = 'extractionMessage';
extractionMessage.textContent = 'Extraction en cours…';
extractionContainer.appendChild(extractionMessage);

// Create the loading spinner element
const spinner = document.createElement('div');
spinner.classList.add('spinner'); // Add a class for styling
extractionContainer.appendChild(spinner);

// Message passing to notify the background script when the button is clicked
extractButton.addEventListener('click', () => {
  // Show the extraction container
  extractionContainer.style.display = 'block';

  browser.runtime.sendMessage({ action: 'performExtraction', url: window.location.href }, response => {
    // Hide the extraction container
    extractionContainer.style.display = 'none';

    if (response.success) {
      // Display the downloaded files
      const downloadedFilesContainer = document.createElement('div');
      downloadedFilesContainer.classList.add('fileList');
      downloadedFilesContainer.textContent = `Fichiers téléchargés :\n${response.fetchedQuestions.join(', ')}\nFini !`;
      anchor.appendChild(downloadedFilesContainer);
    } else {
      console.error('Error:', response.error);
      // Handle error
    }
  });
});
