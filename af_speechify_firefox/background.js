let extractAll = false;
let abortExtraction = false;
let doc;

browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
	if (message.action === 'performExtraction') {
		try {
			const url = message.url;

			if (url.includes('www.academie-francaise.fr/les-immortels/discours-et-travaux-academiques')) {
				performExtractAndSave(url)
					.then(addedFileNames => {
						sendResponse({
							success: true,
							addedFileNames
						});
					})
					.catch(error => {
						console.error('Error:', error);
						sendResponse({
							success: false,
							error: 'An error occurred'
						});
					});

				return true; // Indicate that sendResponse will be called asynchronously

			} else if (url.includes('www.academie-francaise.fr/dire-ne-pas-dire')) {
				performExtractAndSaveDireNePasDire(url)
					.then(fetchedTitles => {
						sendResponse({
							success: true,
							fetchedTitles
						});
					})
					.catch(error => {
						console.error('Error:', error);
						sendResponse({
							success: false,
							error: 'An error occurred'
						});
					});
			} else if (url.includes('www.academie-francaise.fr/questions-de-langue')) {
				performExtractAndSaveQdl(url)
					.then(fetchedQuestions => {
						sendResponse({
							success: true,
							fetchedQuestions
						});
					})
					.catch(error => {
						console.error('Error:', error);
						sendResponse({
							success: false,
							error: 'An error occurred'
						});
					});

			} else {
				sendResponse({
					success: false,
					error: 'Unsupported URL'
				});
			}

			return true; // Indicate that sendResponse will be called asynchronously

		} catch (error) {
			console.error('Error:', error);
			sendResponse({
				success: false,
				error: 'An error occurred'
			});
		}
	} else if (message.action === 'extractAll') {
		extractAll = true;
	} else if (message.action === 'extractPage') {
		extractAll = false;
	} else if (message.action === 'abortExtraction') {
		abortExtraction = true;
	}
});



async function performExtractAndSave(url) {
	const parser = new DOMParser();
	let nextUrl = url;
	const fetchedUrls = new Set();

	const zip = new JSZip();
	const addedFileNames = new Set();

	while (nextUrl) {
		try {
			console.log('Extraction page URL = ', nextUrl);
			const response = await fetch(nextUrl);
			const html = await response.text();

			doc = parser.parseFromString(html, 'text/html');

			const currentPageButton = doc.querySelector('.pager-current')
			if (currentPageButton) {
				currentPageNo = currentPageButton.textContent;
				console.log('Current page number = ', currentPageNo);

				function sendRange() {
					console.log('sendRange function invoked');
					let currentTab;
					browser.tabs.query({
						active: true,
						currentWindow: true
					}, function (tabs) {
						currentTab = tabs[0];
						console.log('Current tab: ', currentTab);

						let port = browser.tabs.connect(currentTab.id, {
							name: 'backgroundjs'
						});
						const range = 'Extraction de la page ' + currentPageNo;
						port.postMessage(range);
					});
				}

				sendRange();
			}

			const speechesDiv = doc.querySelector('.speeches');
			if (!speechesDiv) {
				throw new Error('Speeches div not found');
			}

			const paragraphs = speechesDiv.querySelectorAll('p');
			const urls = Array.from(paragraphs).map(p =>
				new URL(p.querySelector('a').getAttribute('href'), 'https://www.academie-francaise.fr/').href
			);

			fetchedUrls.add(...urls);

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
						text += div.textContent.replaceAll('\&', 'et').replaceAll(`<?xml:namespace prefix = o />`, '').trim();
					});
					const title = contentDoc.querySelector('h1').textContent.trim();
					const author = authorElement.querySelector('a').textContent;
					const dateString = dateElement ? dateElement.textContent : 'Unknown Date';

					const date = convertFrenchDateToISO(dateString);
					console.log('Speech date: ', date);

					let baseFileName = `${date}_${author.replaceAll(/\s/g, '_')}.xml`;
					let index = 1;

					// Append a number to the file name to make it unique
					while (addedFileNames.has(baseFileName)) {
						baseFileName = `${date}_${author.replaceAll(/\s/g, '_')}_${index}.xml`;
						index++;
					}

					addedFileNames.add(baseFileName);

					const h1Element = doc.querySelector('h1');
					const pageTitle = h1Element.textContent.trim();
					const cleanPageTitle = pageTitle.replace(/.+ : /, '');

					const xmlContent = `<text author="${author}" title="${title}" date="${date}" cat="discours" sscat="${cleanPageTitle}">
		<ref target="${url}">Lien vers l'original</ref><lb></lb><lb></lb>
		${text}
		</text>`;

					// Add the XML content to the zip archive
					zip.file(baseFileName, xmlContent);

				} catch (error) {
					console.error('Error fetching content:', error);
				}
			}));

			if (abortExtraction) {
				console.log('Extraction aborted');
				abortExtraction = false;
				break;
			}

			if (extractAll) {
				nextUrl = getNextPageUrl();
				console.log('Next page URL = ', nextUrl);
			} else {
				console.log('Extraction finished');
				break;
			}
		} catch (error) {
			console.error('Error: ', error);
		}
	}

	const zipBlob = await zip.generateAsync({
		type: 'blob'
	});

	const h1Element = doc.querySelector('h1');
	const pageTitle = h1Element.textContent.trim();
	const cleanPageTitle = pageTitle.replace(/.+ : /, '');

	// Use the cleaned pageTitle as the zipFileName
	const zipFileName = `${cleanPageTitle}.zip`;

	await downloadZip(zipBlob, zipFileName);

	return Array.from(addedFileNames);
}

function getNextPageUrl() {
	const nextButton = doc.querySelector('.pager-next a');
	if (nextButton) {
		console.log('Next button found: ', nextButton);
		return new URL(nextButton.getAttribute('href'), 'https://www.academie-francaise.fr').href;
	} else {
		console.log('No next button');
		return null;
	}
}

async function downloadZip(zipBlob, zipFileName) {
	return new Promise((resolve, reject) => {
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
}

async function performExtractAndSaveDireNePasDire(url) {
	const parser = new DOMParser();
	let nextUrl = url;
	const fetchedUrls = new Set();

	const zip = new JSZip();
	const extractedTitles = new Set();

	while (nextUrl) {
		try {
			console.log('DNPD page URL = ', nextUrl);

			const response = await fetch(nextUrl);
			const html = await response.text();

			doc = parser.parseFromString(html, 'text/html');

			const currentPageButton = doc.querySelector('.pager-current')
			if (currentPageButton) {
				currentPageNo = currentPageButton.textContent;
				console.log('Current page number = ', currentPageNo);

				function sendRange() {
					console.log('sendRange function invoked');
					let currentTab;
					browser.tabs.query({
						active: true,
						currentWindow: true
					}, function (tabs) {
						currentTab = tabs[0];
						console.log('Current tab: ', currentTab);

						let port = browser.tabs.connect(currentTab.id, {
							name: 'backgroundjs'
						});
						const range = 'Extraction de la page ' + currentPageNo;
						port.postMessage(range);
					});
				}

				sendRange();
			}

			const divs = doc.querySelectorAll('[id^="node-"]');

			await Promise.all(Array.from(divs).map(div => {
				try {
					const title = div.querySelector('h2').textContent.replaceAll(/\p{P}/gu, '').trim().replaceAll(/\s+/g, '_');
					const dateElement = div.querySelector('p.date span[content]');
					const dateString = dateElement ? dateElement.textContent : 'Unknown Date';

					const date = convertFrenchDateToISO(dateString);
					console.log('Post date: ', date);

					const itemUrl = 'https://www.academie-francaise.fr' + div.querySelector('a').getAttribute("href");
					console.log('Post URL: ', itemUrl);


					// Modify the following line to extract text from the desired div
					const textDiv = div.querySelector('.academie-columns.academie-columns-1');
					const text = textDiv ? textDiv.textContent.replaceAll('\&', 'et').replaceAll(`<?xml:namespace prefix = o />`, '').trim() : '';

					const category = div.querySelector('.category.color');
					const fileCategory = category.textContent.replace('\&', 'et').trim();

					const xmlContent = `<text title="${title}" date="${date}" cat="dnpd" sscat="${fileCategory}">
<ref target="${itemUrl}">Lien vers l'original</ref><lb></lb><lb></lb>
${text}
</text>`;

					const fileName = `${date}_${title}.xml`;
					extractedTitles.add(fileName);

					zip.file(fileName, xmlContent);
				} catch (error) {
					console.error('Error extracting content:', error);
				}
			}));

			if (abortExtraction) {
				console.log('Extraction aborted');
				abortExtraction = false;
				break;
			}

			if (extractAll) {
				nextUrl = getNextPageUrl();
				console.log('Next page URL = ', nextUrl);
			} else {
				console.log('Extraction finished');
				break;
			}
		} catch (error) {
			console.log('Error: ', error);
		}
	}

	const zipBlob = await zip.generateAsync({
		type: 'blob'
	});

	const category = doc.querySelector('.category.color');
	const fileCategory = category.textContent.trim();

	const zipFileName = `${fileCategory}.zip`;

	await downloadZip(zipBlob, zipFileName);

	return Array.from(extractedTitles);
}

async function performExtractAndSaveQdl(url) {
	const parser = new DOMParser();
	const response = await fetch(url);
	const html = await response.text();

	const doc = parser.parseFromString(html, 'text/html');
	const extractedQuestions = new Set();

	const h3Elements = doc.querySelectorAll('h3');

	const zip = new JSZip();

	await Promise.all(Array.from(h3Elements).map(h3 => {
		try {
			const title = h3.textContent.trim();
			const cleanTitle = title.replace(' (sommaire)', '').replaceAll(/\p{P}/gu, '').trim().replaceAll(/\s+/g, '_');

			// Modify the following lines to extract text from the desired div
			const textParagraphs = Array.from(getFollowingParagraphs(h3)); // Select all <p> elements following the <h3>
			const text = textParagraphs.map(paragraph => paragraph.textContent.trim().replaceAll('\&', 'et').replaceAll(`<?xml:namespace prefix = o />`, '')).join('\n'); // Combine text content of all paragraphs

			const xmlContent = `<text title="${cleanTitle}" cat="qdl">
<ref target="https://www.academie-francaise.fr/questions-de-langue">Lien vers l'original</ref><lb></lb><lb></lb>
${text}
</text>`;

			const fileName = `${cleanTitle}.xml`;

			zip.file(fileName, xmlContent);
			extractedQuestions.add(cleanTitle);
		} catch (error) {
			console.error('Error extracting content:', error);
		}
	}));

	const zipBlob = await zip.generateAsync({
		type: 'blob'
	});

	const zipFileName = 'Questions_de_langue.zip';

	await downloadZip(zipBlob, zipFileName);

	return Array.from(extractedQuestions);

}

function* getFollowingParagraphs(element) {
	let sibling = element.nextElementSibling;
	while (sibling !== null && sibling.tagName.toLowerCase() === 'p') {
		yield sibling;
		sibling = sibling.nextElementSibling;
	}
}

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
		const year = match[3];
		if (day.length === 1) {
			day = '0' + day;
		}
		if (day && month && year) {
			return `${year}-${month}-${day}`;
		}
	}
	return null;
}