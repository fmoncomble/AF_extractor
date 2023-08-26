browser.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
  if (message.action === 'performExtraction') {
    try {
      const url = message.url;

      const fetchedUrls = await performExtractAndSave(url);

      // Send the result back to the content script
      sendResponse({ success: true, fetchedUrls });
    } catch (error) {
      console.error('Error:', error);
      // Send an error response back to the content script
      sendResponse({ success: false, error: 'An error occurred' });
    }
  }
});

async function performExtractAndSave(url) {
  const parser = new DOMParser();
  const response = await fetch(url);
  const html = await response.text();

  const doc = parser.parseFromString(html, 'text/html');

  const speechesDiv = doc.querySelector('.speeches');
  if (!speechesDiv) {
    throw new Error('Speeches div not found');
  }

  const paragraphs = speechesDiv.querySelectorAll('p');
  const urls = Array.from(paragraphs).map(p =>
    new URL(p.querySelector('a').getAttribute('href'), 'https://www.academie-francaise.fr/').href
  );

  const zip = new JSZip();

  const addedFileNames = new Set(); // To track added file names

  await Promise.all(urls.map(async url => {
    try {
      const contentResponse = await fetch(url);
      const content = await contentResponse.text();
      const contentDoc = parser.parseFromString(content, 'text/html');

      const bodyDiv = contentDoc.querySelector('.academie-columns.academie-columns-1');
      const authorElement = contentDoc.querySelector('.category.color');
      const dateElement = contentDoc.querySelector('[property="dc:date dc:created"]');

      if (!bodyDiv || !authorElement) {
        console.error('Error: Required elements not found');
        return;
      }

      const text = bodyDiv.textContent;
      const author = authorElement.querySelector('a').textContent;
      const date = dateElement ? dateElement.getAttribute('content') : 'Unknown Date';

      let baseFileName = `${author}.xml`;
      let index = 1;

      // Append a number to the file name to make it unique
      while (addedFileNames.has(baseFileName)) {
        baseFileName = `${author}_${index}.xml`;
        index++;
      }

      addedFileNames.add(baseFileName);

      const xmlContent = `
        <Text author="${author}" date="${date}">
          ${text}
        </Text>
      `;

      // Add the XML content to the zip archive
      zip.file(baseFileName, xmlContent);

    } catch (error) {
      console.error('Error fetching content:', error);
    }
  }));

  const zipBlob = await zip.generateAsync({ type: 'blob' });

  const zipFileName = 'xml_archive.zip';
  const downloadPromise = new Promise((resolve, reject) => {
    if (typeof browser !== 'undefined' && browser.downloads) {
      browser.downloads.download({
        url: URL.createObjectURL(zipBlob),
        filename: zipFileName,
        saveAs: true,
      }).then(downloadItem => {
        if (downloadItem) {
          resolve(zipFileName);
        } else {
          reject(new Error(`Failed to initiate download for ${zipFileName}`));
        }
      }).catch(reject);
    } else if (typeof chrome !== 'undefined' && chrome.downloads) {
      chrome.downloads.download({
        url: URL.createObjectURL(zipBlob),
        filename: zipFileName,
        saveAs: true,
      }, downloadId => {
        if (downloadId) {
          resolve(zipFileName);
        } else {
          reject(new Error(`Failed to initiate download for ${zipFileName}`));
        }
      });
    } else {
      reject(new Error('Download API not available'));
    }
  });

  await downloadPromise;

  return Array.from(addedFileNames);
}
