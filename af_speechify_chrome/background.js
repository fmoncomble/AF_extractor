chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'performExtraction') {
    try {
      const url = message.url;

      if (url.includes('www.academie-francaise.fr/les-immortels/discours-et-travaux-academiques')) {
        performExtractAndSave(url)
          .then(fetchedUrls => {
            sendResponse({ success: true, fetchedUrls });
          })
          .catch(error => {
            console.error('Error:', error);
            sendResponse({ success: false, error: 'An error occurred' });
          });

        return true; // Indicate that sendResponse will be called asynchronously
        
      } else if (url.includes('www.academie-francaise.fr/dire-ne-pas-dire')) {
        performExtractAndSaveDireNePasDire(url)
          .then(fetchedTitles => {
            sendResponse({ success: true, fetchedTitles });
          })
          .catch(error => {
            console.error('Error:', error);
            sendResponse({ success: false, error: 'An error occurred' });
          });
    } else if (url.includes('www.academie-francaise.fr/questions-de-langue')) {
        performExtractAndSaveQdl(url)
          .then(fetchedQuestions => {
            sendResponse({ success: true, fetchedQuestions });
          })
          .catch(error => {
            console.error('Error:', error);
            sendResponse({ success: false, error: 'An error occurred' });
          });
          
      } else {
        sendResponse({ success: false, error: 'Unsupported URL' });
      }

      return true; // Indicate that sendResponse will be called asynchronously

    } catch (error) {
      console.error('Error:', error);
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
      console.log('URL = ', contentResponse);
      const content = await contentResponse.text();
      const contentDoc = parser.parseFromString(content, 'text/html');

      const bodyDivs = contentDoc.querySelectorAll('.academie-columns');
      const authorElement = contentDoc.querySelector('.category.color');
      const dateElement = contentDoc.querySelector('[property="dc:date dc:created"]');

      if (!bodyDivs.length || !authorElement) {
        console.error('Error: Required elements not found for ', authorElement.querySelector('a').textContent);
        return;
      }

      let text = '';
      bodyDivs.forEach((div) => {
      	text += div.textContent;
      });
      const author = authorElement.querySelector('a').textContent;
      const dateString = dateElement ? dateElement.textContent : 'Unknown Date';
      
      // Function to convert date into ISO format (YYYY-MM-DD)
      function convertFrenchDateToISO(dateString) {
      	const monthMap = {
      		janvier: '01',
      		février: '02',
      		mars: '03',
      		avril: '04',
      		mai: '05',
      		juin: '06',
      		juillet: '07',
      		août: '08',
      		septembre: '09',
      		octobre: '10',
      		novembre: '11',
      		décembre: '12',
      	};
      	const datePattern = /Le (\d{1,2}) ([\p{L}\s]+) (\d{4})/u;
      	const match = dateString.match(datePattern);
      	if (match) {
      		let day = match[1];
      		const month = monthMap[match[2].toLowerCase()];
      		const year = match [3];
      		if (day.length === 1) {
      			day = '0' + day;
      		}
      		if (day && month && year) {
      			return `${year}-${month}-${day}`;
      		}
      	}
      	return null;
      }
      
      const date = convertFrenchDateToISO(dateString);
      console.log('Speech date: ', date);

      let baseFileName = `${date}_${author}.xml`;
      let index = 1;

      // Append a number to the file name to make it unique
      while (addedFileNames.has(baseFileName)) {
        baseFileName = `${date}_${author}_${index}.xml`;
        index++;
      }

      addedFileNames.add(baseFileName);

      const xmlContent = `<text author="${author}" date="${date}">
${text}
</text>`;

      // Add the XML content to the zip archive
      zip.file(baseFileName, xmlContent);

    } catch (error) {
      console.error('Error fetching content:', error);
    }
  }));
  const zipBlob = await zip.generateAsync({ type: 'blob' });

	const h1Element = doc.querySelector('h1');
	const pageTitle = h1Element.textContent.trim();
	const cleanPageTitle = pageTitle.replace(/.+ : /, '');

	// Use the cleaned pageTitle as the zipFileName
	const zipFileName = `${cleanPageTitle}.zip`;
  
  const downloadPromise = new Promise((resolve, reject) => {
    if (typeof browser !== 'undefined' && browser.downloads) {
      browser.downloads.download({
        url: URL.createObjectURL(zipBlob),
        filename: zipFileName,
        saveAs: false,
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

  return Array.from(addedFileNames)

}
 

async function performExtractAndSaveDireNePasDire(url) {
  const parser = new DOMParser();
  const response = await fetch(url);
  const html = await response.text();

  const doc = parser.parseFromString(html, 'text/html');

  const divs = doc.querySelectorAll('[id^="node-"]');
  const extractedTitles = [];

  const zip = new JSZip();

  await Promise.all(Array.from(divs).map(div => {
    try {
      const title = div.querySelector('h2').textContent.trim();
      const dateElement = div.querySelector('p.date span[content]');
      const dateString = dateElement ? dateElement.textContent : 'Unknown Date';
      
      // Function to convert date into ISO format (YYYY-MM-DD)
      function convertFrenchDateToISO(dateString) {
      	const monthMap = {
      		janvier: '01',
      		février: '02',
      		mars: '03',
      		avril: '04',
      		mai: '05',
      		juin: '06',
      		juillet: '07',
      		août: '08',
      		septembre: '09',
      		octobre: '10',
      		novembre: '11',
      		décembre: '12',
      	};
      	const datePattern = /Le (\d{1,2}) ([\p{L}\s]+) (\d{4})/u;
      	const match = dateString.match(datePattern);
      	if (match) {
      		let day = match[1];
      		const month = monthMap[match[2].toLowerCase()];
      		const year = match [3];
      		if (day.length === 1) {
      			day = '0' + day;
      		}
      		if (day && month && year) {
      			return `${year}-${month}-${day}`;
      		}
      	}
      	return null;
      }
      
      const date = convertFrenchDateToISO(dateString);
      console.log('Post date: ', date);
      
      // Modify the following line to extract text from the desired div
      const textDiv = div.querySelector('.academie-columns.academie-columns-1');
      const text = textDiv ? textDiv.textContent.trim() : '';

      const xmlContent = `<text title="${title}" date="${date}">
${text}
</text>`;

      const fileName = `${date}_${title}.xml`;

      zip.file(fileName, xmlContent);
      extractedTitles.push(title);
    } catch (error) {
      console.error('Error extracting content:', error);
    }
  }));

  const zipBlob = await zip.generateAsync({ type: 'blob' });

  const category = doc.querySelector('.category.color');
  const fileCategory = category.textContent.trim();
  const zipFileName = `${fileCategory}.zip`;
  
  const downloadPromise = new Promise((resolve, reject) => {
    if (typeof browser !== 'undefined' && browser.downloads) {
      browser.downloads.download({
        url: URL.createObjectURL(zipBlob),
        filename: zipFileName,
        saveAs: false,
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

  return extractedTitles;
}

async function performExtractAndSaveQdl(url) {
  const parser = new DOMParser();
  const response = await fetch(url);
  const html = await response.text();

  const doc = parser.parseFromString(html, 'text/html');

  const h3Elements = doc.querySelectorAll('h3');
  const extractedQuestions = [];

  const zip = new JSZip();

  await Promise.all(Array.from(h3Elements).map(h3 => {
    try {
      const title = h3.textContent.trim();
      const cleanTitle = title.replace(' (sommaire)', '').replace('\/', '-');
      
      // Modify the following lines to extract text from the desired div
      const textParagraphs = Array.from(getFollowingParagraphs(h3)); // Select all <p> elements following the <h3>
      const text = textParagraphs.map(paragraph => paragraph.textContent.trim()).join('\n'); // Combine text content of all paragraphs

      const xmlContent = `<text title="${cleanTitle}">
${text}
</text>`;

      const fileName = `${cleanTitle}.xml`;

      zip.file(fileName, xmlContent);
      extractedQuestions.push(cleanTitle);
    } catch (error) {
      console.error('Error extracting content:', error);
    }
  }));

  const zipBlob = await zip.generateAsync({ type: 'blob' });

  const zipFileName = 'Questions_de_langue.zip'; // Modify as needed
  
  const downloadPromise = new Promise((resolve, reject) => {
    if (typeof browser !== 'undefined' && browser.downloads) {
      browser.downloads.download({
        url: URL.createObjectURL(zipBlob),
        filename: zipFileName,
        saveAs: false,
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

  return extractedQuestions;
}

function* getFollowingParagraphs(element) {
  let sibling = element.nextElementSibling;
  while (sibling !== null && sibling.tagName.toLowerCase() === 'p') {
    yield sibling;
    sibling = sibling.nextElementSibling;
  }
}




