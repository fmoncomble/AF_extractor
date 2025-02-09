
# AF Extractor

Une extension pour extraire et télécharger les textes de l'Académie française.

### Citer ce programme
Si vous utilisez cette extension pour vos travaux de recherche, merci de la référencer de la façon suivante :  
  
Moncomble, F. (2024). *AF_extractor* (Version 1.1) [JavaScript]. Arras, France : Université d’Artois. Disponible à l'adresse : https://github.com/fmoncomble/AF_extractor

## Installation
### Firefox
[![Firefox add-on](https://github.com/fmoncomble/AF_extractor/assets/59739627/85190a99-30d6-4ecb-a0ac-92e1ef7a3b48)](https://github.com/fmoncomble/AF_extractor/releases/latest/download/af_extractor_ff.xpi)

### Chrome/Edge
- [Télécharger l'extension](https://github.com/fmoncomble/AF_extractor/releases/latest/download/af_extractor_chrome.zip)
- Décompresser l'archive .zip
- Dans le gestionnaire d'extensions (`chrome://extensions/` ou `edge://extensions/`),
  - activer le mode développeur
  - cliquer sur "Chargez l'extension non empaquetée"
  - sélectionner le dossier décompressé

## Utilisation
- Ouvrir :
	- une page thématique de discours de l'AF ([exemple](https://www.academie-francaise.fr/les-immortels/discours-et-travaux-academiques?titre=&auteur=&annee=&siecle=&theme=40&trier_par=annee_desc&form_build_id=form-ObEDRM1QIa4nZobp9beKPicEWvSzO-U5eHKtEoBk1n4&form_id=academie_immortals_speeches_search_form&op=Rechercher))
	- ou une page de billets dans la rubrique "Dire, ne pas dire" ([exemple](https://www.academie-francaise.fr/dire-ne-pas-dire/recherche?titre=&rubrique=364&date=&form_build_id=form-XiN72sBPvnkA-n23XgPVZ_joYjulLrBILhIIyR2euaM&form_id=academie_blog_search_form&op=Rechercher))
	- ou la page [Questions de langue](https://www.academie-francaise.fr/questions-de-langue)
- Choisir entre extraire toutes les pages de résultats ou seulement la page courante
- Choisir le format souhaité dans le menu déroulant (TXT ou XML/XTZ pour importation dans [TXM](https://txm.gitpages.huma-num.fr/textometrie/))
  - L'importation des fichiers XML dans TXM doit se faire à l'aide du module `XML/TEI Zero` en indiquant `ref` dans la rubrique `Plans textuels` > `Hors texte à éditer`
- Cliquer sur « Extraire cette page » / « Tout extraire »
- Firefox : l'archive .zip contenant les fichiers .xml est téléchargée dans le dossier par défaut
- Chrome/Edge : Choisir le dossier de destination pour l'archive .zip contenant les fichiers .xml

## Démonstration
Extraction :  
<video src="https://github.com/fmoncomble/af_speechify/assets/59739627/6e84a671-1b80-4edb-95ba-d67ef6cc44e1"/>  
  
Fichier .xml :  
<img width="1173" alt="Screenshot 2024-01-09 at 20 06 51" src="https://github.com/fmoncomble/af_speechify/assets/59739627/c0707bf0-2e58-41be-b72f-50cbfa64314d">  
  
Fenêtre TXM :  
<img width="1503" alt="Screenshot 2024-01-09 at 20 30 55" src="https://github.com/fmoncomble/af_speechify/assets/59739627/41d8dec4-9497-46ab-9754-7cb030fbbcb9">
