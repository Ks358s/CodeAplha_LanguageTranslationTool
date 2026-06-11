document.addEventListener('DOMContentLoaded', () => {
    const sourceLang = document.getElementById('sourceLanguage');
    const targetLang = document.getElementById('targetLanguage');
    const swapBtn = document.getElementById('swapLanguages');
    const inputText = document.getElementById('inputText');
    const charCount = document.getElementById('charCount');
    const clearTextBtn = document.getElementById('clearText');
    const outputPlaceholder = document.getElementById('outputPlaceholder');
    const outputText = document.getElementById('outputText');
    const loadingOverlay = document.getElementById('loadingOverlay');
    const outputActions = document.getElementById('outputActions');
    const translateBtn = document.getElementById('translateBtn');
    const readAloudBtn = document.getElementById('readAloudBtn');
    const refreshBtn = document.getElementById('refreshBtn');
    const copyBtn = document.getElementById('copyBtn');

    const translateBtnDefaultHTML = '<i class="fa-solid fa-language"></i> Translate';

    function setSecondaryActionsEnabled(enabled) {
        readAloudBtn.disabled = !enabled;
        refreshBtn.disabled = !enabled;
    }

    function resetOutput() {
        outputText.textContent = '';
        outputText.classList.add('hidden');
        outputPlaceholder.classList.remove('hidden');
        outputActions.classList.add('opacity-50', 'pointer-events-none');
        setSecondaryActionsEnabled(false);
    }

    inputText.addEventListener('input', () => {
        const len = inputText.value.length;
        charCount.textContent = `${len} / 5000`;

        if (len > 0) {
            clearTextBtn.classList.remove('hidden');
            refreshBtn.disabled = false;
        } else {
            clearTextBtn.classList.add('hidden');
            resetOutput();
        }
    });

    clearTextBtn.addEventListener('click', () => {
        inputText.value = '';
        charCount.textContent = '0 / 5000';
        clearTextBtn.classList.add('hidden');
        resetOutput();
    });

    swapBtn.addEventListener('click', () => {
        const temp = sourceLang.value;
        sourceLang.value = targetLang.value;
        targetLang.value = temp;

        const icon = swapBtn.querySelector('i');
        icon.classList.add('scale-110');
        setTimeout(() => icon.classList.remove('scale-110'), 200);
    });

    async function translateWithLingva(text, source, target) {
        const url = `https://lingva.ml/api/v1/${source}/${target}/${encodeURIComponent(text)}`;
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Lingva HTTP ${response.status}`);
        const data = await response.json();
        if (!data.translation) throw new Error('Lingva returned no translation');
        return data.translation;
    }

    async function translateWithMyMemory(text, source, target) {
        const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${source}|${target}`;
        const response = await fetch(url);
        if (!response.ok) throw new Error(`MyMemory HTTP ${response.status}`);
        const data = await response.json();
        if (data.responseStatus !== 200 || !data.responseData?.translatedText) {
            throw new Error(data.responseDetails || 'MyMemory returned no translation');
        }
        return data.responseData.translatedText;
    }

    async function fetchTranslation(text, source, target) {
        try {
            return await translateWithLingva(text, source, target);
        } catch (lingvaError) {
            console.warn('Lingva failed, trying MyMemory:', lingvaError);
            return await translateWithMyMemory(text, source, target);
        }
    }

    async function performTranslation() {
        const textToTranslate = inputText.value.trim();

        if (!textToTranslate) {
            alert('Please enter some text to translate.');
            return;
        }

        loadingOverlay.classList.remove('hidden');
        translateBtn.disabled = true;
        refreshBtn.disabled = true;
        readAloudBtn.disabled = true;
        translateBtn.textContent = 'Translating...';

        try {
            const translated = await fetchTranslation(
                textToTranslate,
                sourceLang.value,
                targetLang.value
            );

            outputPlaceholder.classList.add('hidden');
            outputText.textContent = translated;
            outputText.classList.remove('hidden');

            outputActions.classList.remove('opacity-50', 'pointer-events-none');
            setSecondaryActionsEnabled(true);
        } catch (error) {
            console.error('Translation Error:', error);
            alert('Translation failed. Check your internet connection and try again.');
        } finally {
            loadingOverlay.classList.add('hidden');
            translateBtn.disabled = false;
            translateBtn.innerHTML = translateBtnDefaultHTML;
            if (inputText.value.trim()) {
                refreshBtn.disabled = false;
            }
            if (outputText.textContent) {
                readAloudBtn.disabled = false;
            }
        }
    }

    translateBtn.addEventListener('click', performTranslation);
    refreshBtn.addEventListener('click', performTranslation);

    copyBtn.addEventListener('click', () => {
        const text = outputText.textContent;
        if (!text) return;

        navigator.clipboard.writeText(text).then(() => {
            const originalHTML = copyBtn.innerHTML;
            copyBtn.innerHTML = '<i class="fa-solid fa-check text-emerald-500"></i> <span class="text-emerald-500">Copied!</span>';
            copyBtn.classList.add('border-emerald-600', 'bg-emerald-950/50');

            setTimeout(() => {
                copyBtn.innerHTML = originalHTML;
                copyBtn.classList.remove('border-emerald-600', 'bg-emerald-950/50');
            }, 2000);
        });
    });

    readAloudBtn.addEventListener('click', () => {
        const text = outputText.textContent;
        if (!text || !('speechSynthesis' in window)) return;

        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = targetLang.value;

        readAloudBtn.classList.add('text-orange-400', 'bg-orange-950/50');
        utterance.onend = () => {
            readAloudBtn.classList.remove('text-orange-400', 'bg-orange-950/50');
        };

        window.speechSynthesis.speak(utterance);
    });
});
