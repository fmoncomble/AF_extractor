// contentScript.js

// Inject the button into the page
const anchor = document.querySelector('h1');
const extractButton = document.createElement('button');
extractButton.id = 'extractButton';
extractButton.textContent = 'Extraire';
anchor.appendChild(extractButton);
if (!extractButton) {
	console.error('Error: unable to inject button')
};



// Message passing to notify the background script when the button is clicked
extractButton.addEventListener('click', async () => {
  browser.runtime.sendMessage({ action: 'performExtraction', url: window.location.href }, response => {
    if (response.success) {
      // Display the downloaded files
      const downloadedFilesContainer = document.createElement('div');
      downloadedFilesContainer.innerHTML = `Downloaded Files:<br>${response.fetchedUrls.join('<br>')}`;
      anchor.appendChild(downloadedFilesContainer);
    } else {
      console.error('Error:', response.error);
      // Handle error
    }
  });
});

